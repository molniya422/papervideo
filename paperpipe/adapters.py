"""paperpipe.adapters — 阶段适配器协议与 9 阶段实现。

协议：每个适配器实现 plan(ctx) / inputs(ctx) / run(ctx) / check(ctx) / repair(ctx, err)。
- inputs(ctx)：声明该阶段依赖的文件（glob，相对运行目录或以 "root:" 前缀相对工作区根），
  供 runner 计算输入指纹 —— 上游产物或配置变化时自动失效并重跑。
- 自动执行 vs 自动生成：intake/brief/acquire/render/qa/publish 可程序化全自动；
  xray/figures/retrospective 是**人审门**（生成骨架，等待 agent/人工补全，见 HUMAN_GATES），
  本状态机不调用模型 —— 这是显式边界，不是缺陷。
"""
from __future__ import annotations
import glob as globmod
import json, os, re, shutil, subprocess
import urllib.request, urllib.error

from .util import atomic_write_text, atomic_write_json, env_summary, utcnow
from .state import RunState

VERSION = "1.1.0"

class StageError(Exception):
    def __init__(self, cls: str, message: str):
        super().__init__(message)
        self.cls = cls      # transient | permanent | gate
        self.message = message

class RuntimeCtx:
    def __init__(self, root: str, run_dir: str, cfg: dict, rs: RunState):
        self.root = root
        self.run_dir = run_dir
        self.cfg = cfg
        self.rs = rs

    def out(self, *parts) -> str:
        return os.path.join(self.run_dir, *parts)

    def tool(self, *parts) -> str:
        return os.path.join(self.root, *parts)

class StageResult:
    def __init__(self, status: str, data: dict | None = None, error: StageError | None = None):
        self.status = status
        self.data = data or {}
        self.error = error

TARGET_MAP = {
    "md":      ["intake", "brief", "acquire", "xray"],
    "figures": ["intake", "brief", "acquire", "xray", "figures"],
    "video":   ["intake", "brief", "acquire", "xray", "figures", "render", "qa", "retrospective", "publish"],
    "slides":  ["intake", "brief", "acquire", "xray", "figures", "render", "qa", "retrospective", "publish"],
}

def _write(ctx: RuntimeCtx, relpath: str, text: str) -> str:
    p = ctx.out(relpath)
    atomic_write_text(p, text)
    return p

def _read(ctx: RuntimeCtx, relpath: str) -> str | None:
    p = ctx.out(relpath)
    return open(p, encoding="utf-8").read() if os.path.exists(p) else None

class Adapter:
    name = "base"
    inputs_spec: list = []   # 例如 ["0-brief/design-intake.md", "root:render.sources"]

    def plan(self, ctx: RuntimeCtx) -> dict:
        return {"stage": self.name}

    def inputs(self, ctx: RuntimeCtx) -> list:
        """返回 glob 列表；"root:" 前缀相对工作区根，其余相对运行目录。"""
        return list(self.inputs_spec)

    def run(self, ctx: RuntimeCtx) -> StageResult:
        raise NotImplementedError

    def check(self, ctx: RuntimeCtx) -> StageResult:
        return StageResult("passed")

    def repair(self, ctx: RuntimeCtx, err: StageError) -> StageResult:
        return StageResult("failed", error=StageError("permanent", f"{self.name}: 无修复策略: {err.message}"))

    def for_target(self, ctx: RuntimeCtx) -> bool:
        return self.name in TARGET_MAP.get(ctx.rs.data["target"], TARGET_MAP["video"])

# ════════════════ intake ════════════════
class IntakeAdapter(Adapter):
    name = "intake"
    def run(self, ctx: RuntimeCtx) -> StageResult:
        p = ctx.out("0-brief/design-intake.md")
        if os.path.exists(p):
            return StageResult("passed", {"source": "existing"})
        if ctx.cfg.get("mode") != "auto":
            raise StageError("gate", "mode!=auto：设计访谈需人工回答；用 paperpipe review 或手写 design-intake.md")
        d = ctx.cfg["defaults"]
        rp = ctx.cfg["reader_profile"]
        assums = [
            f"- 视觉语言: {d['visual_language']}（默认）",
            f"- 主色: {d['accent']}（默认）",
            f"- 运动性格: {d['motion']}（默认）",
            f"- 旁白: {d['voice']}（默认）",
            f"- 时长: {d['duration']}（默认）",
            f"- 画幅: {d['aspect']}（默认）",
            f"- 受众: {ctx.cfg.get('audience')}（默认）",
            f"- 阅读画像: math={rp.get('math','basic')}, hands_on={rp.get('hands_on','basic')}（默认）",
        ]
        text = (f"# 设计访谈（auto 模式自动生成）\n\n"
                f"> 来源: paperpipe intake @ {VERSION}；所有假设来自 paperpipe.yaml defaults，可手工修订后重跑。\n\n"
                f"## 一句话风格内核\n工程蓝图式的克制精确：结构线稿 + 冷蓝强调，动效只服务解释。\n\n"
                f"## 选择\n" + "\n".join(assums) + "\n\n## 与上一版差异\n（首次运行，无）\n")
        p = _write(ctx, "0-brief/design-intake.md", text)
        ctx.rs.register_artifact("intake", p, "design")
        return StageResult("passed", {"auto_assumptions": len(assums)})

    def check(self, ctx: RuntimeCtx) -> StageResult:
        txt = _read(ctx, "0-brief/design-intake.md")
        if not txt:
            return StageResult("failed", error=StageError("permanent", "design-intake.md 缺失"))
        if "风格内核" not in txt:
            return StageResult("warn", error=StageError("gate", "缺一句话风格内核，请人工补"))
        return StageResult("passed")

# ════════════════ brief ════════════════
class BriefAdapter(Adapter):
    name = "brief"
    inputs_spec = ["0-brief/design-intake.md"]
    def run(self, ctx: RuntimeCtx) -> StageResult:
        p = ctx.out("0-brief/brief.md")
        if os.path.exists(p):
            return StageResult("passed", {"source": "existing"})
        d = ctx.cfg["defaults"]
        forbid = ["深色底居中大字当默认页", "无动机粒子爆炸", "匀速运动",
                  "3D 上叠长文", "AI 套话（赋能/助力/引领）", "截断坐标轴不标注"]
        text = (f'<brief schema="paperpipe-brief/1">\n  <role>论文讲解动画导演</role>\n'
                f'  <subject>{ctx.rs.data.get("title") or ctx.rs.data["source"]}</subject>\n'
                f'  <audience>{ctx.cfg.get("audience")}</audience>\n  <duration>{d["duration"]}</duration>\n'
                f'  <style>{d["visual_language"]} / {d["accent"]} / {d["motion"]} / {d["voice"]}</style>\n'
                f'  <forbidden>\n' + "\n".join(f"    - {x}" for x in forbid) +
                '\n  </forbidden>\n  <storyboard>待 xray 产出机制点后回填</storyboard>\n'
                f'  <tech>route={ctx.cfg.get("route")}</tech>\n  <pitfalls>字幕与音频同源；三区隔离；单镜头一个点</pitfalls>\n'
                '  <acceptance>\n    - 前2秒有钩子: __/10\n    - 可读性: __/10\n    - 解释力: __/10\n'
                '    - 运动质量: __/10\n    - 音画同步: __/10\n    - 技术卫生: __/10\n  </acceptance>\n</brief>\n')
        p = _write(ctx, "0-brief/brief.md", text)
        ctx.rs.register_artifact("brief", p, "brief")
        return StageResult("passed")

    def check(self, ctx: RuntimeCtx) -> StageResult:
        txt = _read(ctx, "0-brief/brief.md") or ""
        if "<acceptance>" not in txt:
            return StageResult("failed", error=StageError("permanent", "brief 缺 <acceptance>"))
        if "待 xray 产出机制点后回填" in txt:
            return StageResult("warn", error=StageError("gate", "storyboard 未回填（xray 后回填）"))
        return StageResult("passed")

# ════════════════ acquire ════════════════
class AcquireAdapter(Adapter):
    name = "acquire"
    ARXIV_PDF = "https://arxiv.org/pdf/{id}"
    def plan(self, ctx: RuntimeCtx) -> dict:
        src = ctx.rs.data["source"]
        kind = "arxiv" if re.fullmatch(r"\d{4}\.\d{4,5}(v\d+)?", src) else "pdf" if src.lower().endswith(".pdf") else "local"
        return {"stage": self.name, "kind": kind}
    def run(self, ctx: RuntimeCtx) -> StageResult:
        plan = self.plan(ctx)
        src = ctx.rs.data["source"]
        dst_dir = ctx.out("paper_src")
        os.makedirs(dst_dir, exist_ok=True)
        if plan["kind"] == "arxiv":
            pdf = os.path.join(dst_dir, f"{src}.pdf")
            if not os.path.exists(pdf):
                try:
                    req = urllib.request.Request(self.ARXIV_PDF.format(id=src), headers={"User-Agent": "paperpipe/1.1"})
                    with urllib.request.urlopen(req, timeout=60) as r, open(pdf + ".partial", "wb") as f:
                        shutil.copyfileobj(r, f)
                    os.replace(pdf + ".partial", pdf)
                except (urllib.error.URLError, TimeoutError, OSError) as e:
                    if os.path.exists(pdf + ".partial"):
                        os.unlink(pdf + ".partial")
                    raise StageError("transient", f"arXiv 下载失败: {e}")
            meta = _write(ctx, "paper_src/arxiv_meta.json", json.dumps(
                {"id": src, "abs": f"https://arxiv.org/abs/{src}", "pdf": os.path.relpath(pdf, ctx.run_dir)}, ensure_ascii=False))
            ctx.rs.register_artifact("acquire", pdf, "paper-pdf")
            ctx.rs.register_artifact("acquire", meta, "meta")
            return StageResult("passed", {"kind": "arxiv"})
        if os.path.isdir(src):
            n = 0
            for fn in os.listdir(src):
                s = os.path.join(src, fn)
                if os.path.isfile(s):
                    shutil.copy2(s, dst_dir); n += 1
            return StageResult("passed", {"kind": "local-dir", "files": n})
        if os.path.isfile(src):
            shutil.copy2(src, dst_dir)
            ctx.rs.register_artifact("acquire", os.path.join(dst_dir, os.path.basename(src)), "paper-pdf")
            return StageResult("passed", {"kind": "pdf"})
        raise StageError("permanent", f"source 不存在: {src}")
    def check(self, ctx: RuntimeCtx) -> StageResult:
        d = ctx.out("paper_src")
        if not os.path.isdir(d) or not os.listdir(d):
            return StageResult("failed", error=StageError("permanent", "paper_src 为空"))
        return StageResult("passed")

# ════════════════ xray（人审门：骨架 → agent/人工补全） ════════════════
class XrayAdapter(Adapter):
    name = "xray"
    inputs_spec = ["paper_src/**"]
    def run(self, ctx: RuntimeCtx) -> StageResult:
        p = ctx.out("2-xray/deep-read.md")
        if os.path.exists(p):
            return StageResult("passed")
        tpl = """# 深度解读（paper-xray 产物骨架）

> 由 paperpipe 生成骨架。请按 paper-xray 技能完成：还原作者思路、每个公式给可手算例子、
> 怀疑式核对数字、标注【文中有据/推断/猜测】。完成后删除本行提示。
> 注意：这是人审门——本状态机不调用模型，内容由 agent/人工产出。

## 机制点（每条驱动一个图解/镜头）
1. 【文中有据】机制 A —— 它会怎么坏：…

## 可手算例子
- 例 1: …

## 数字核对
| 论文数值 | 来源 | 核对 |
|---|---|---|
"""
        _write(ctx, "2-xray/deep-read.md", tpl)
        return StageResult("warn", error=StageError("gate", "deep-read.md 为骨架（人审门），需 agent/人工补全后重跑"))
    def check(self, ctx: RuntimeCtx) -> StageResult:
        txt = _read(ctx, "2-xray/deep-read.md") or ""
        if not txt:
            return StageResult("failed", error=StageError("permanent", "deep-read.md 缺失"))
        if "请按 paper-xray 技能完成" in txt:
            return StageResult("warn", error=StageError("gate", "deep-read.md 仍是骨架（人审门）"))
        if "机制点" not in txt:
            return StageResult("warn", error=StageError("gate", "缺机制点清单"))
        return StageResult("passed")

# ════════════════ figures（人审门） ════════════════
class FiguresAdapter(Adapter):
    name = "figures"
    inputs_spec = ["2-xray/deep-read.md"]
    ROUTE = [("AI/ML 模型机制", "flowchart"), ("工程系统架构", "dynamic-archify"),
             ("通用概念", "visual-explainer"), ("物理直觉", "anatomy"), ("笔记页", "scholar-notes")]
    def run(self, ctx: RuntimeCtx) -> StageResult:
        p = ctx.out("3-figures/README.md")
        if not os.path.exists(p):
            routes = "\n".join(f"- {k} → `{v}`" for k, v in self.ROUTE)
            _write(ctx, "3-figures/README.md",
                   f"# 图解路由（paperpipe figures @ {VERSION}）\n\n按内容形态选技能：\n{routes}\n\n"
                   f"每张图必须对应 deep-read.md 的一个机制点。完成后在此登记：\n\n"
                   f"| 图 | 对应机制点 | 技能 | 产物路径 |\n|---|---|---|---|\n")
        readme = _read(ctx, "3-figures/README.md") or ""
        rows = [ln for ln in readme.splitlines()
                if ln.strip().startswith("|") and "对应机制点" not in ln and not re.match(r"^\|[\s\-|]*$", ln)]
        if not rows:
            return StageResult("warn", error=StageError("gate", "图解登记表为空（人审门），需 agent 产出并登记"))
        return StageResult("passed", {"figures": len(rows)})

# ════════════════ render ════════════════
class RenderAdapter(Adapter):
    name = "render"
    def inputs(self, ctx: RuntimeCtx) -> list:
        spec = ["4-video/narration.json", "3-figures/README.md"]
        rcfg = ctx.cfg.get("render") or {}
        for g in rcfg.get("sources", []):
            spec.append("root:" + g)
        return spec
    def plan(self, ctx: RuntimeCtx) -> dict:
        rcfg = ctx.cfg.get("render") or {}
        return {"stage": self.name, "route": ctx.cfg.get("route"),
                "composition": rcfg.get("composition"), "script": rcfg.get("script")}
    def run(self, ctx: RuntimeCtx) -> StageResult:
        rcfg = ctx.cfg.get("render") or {}
        script = rcfg.get("script")
        composition = rcfg.get("composition")
        narration = ctx.out("4-video/narration.json")
        if not os.path.exists(narration):
            _write(ctx, "4-video/narration.README.md",
                   "# 渲染输入\n\n需要 agent 依据 deep-read.md 与 brief 产出：\n"
                   "1. `4-video/narration.json`（shots[].sentences[] 结构，样例见既有项目）\n"
                   "2. 在 paperpipe.yaml 配置 render.composition / render.script / render.sources\n\n"
                   "就绪后重跑：`paperpipe resume` —— TTS/时间轴/渲染自动执行并按输入指纹缓存。\n")
            return StageResult("warn", error=StageError("gate", "缺 4-video/narration.json（agent 产出后 resume 自动渲染）"))
        if not script or not os.path.exists(os.path.join(ctx.root, script) if not os.path.isabs(script) else script):
            raise StageError("gate", f"render.script 未配置或不存在（拒绝拿示例工程代跑）：{script}")
        if not composition:
            raise StageError("gate", "render.composition 未配置（Remotion 合成 ID）")
        script_path = script if os.path.isabs(script) else os.path.join(ctx.root, script)
        studio = ctx.tool(*(rcfg.get("studio", "remotion-studio").split("/")))
        cmds = []
        from shutil import which
        npx = which("npx") or which("npx.cmd")
        def run_cmd(cmd, timeout=3600, cwd=None):
            if cmd and cmd[0] == "npx" and npx:
                cmd = [npx] + cmd[1:]
            cmds.append(" ".join(cmd))
            ctx.rs.stage("render")["commands"] = cmds
            ctx.rs.save()
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, cwd=cwd or ctx.root)
            if r.returncode != 0:
                raise StageError("transient", f"命令失败({r.returncode}): {' '.join(cmd)}\n{r.stderr[-800:]}")
        # 1) TTS + 时间轴（脚本自带重试与 mp3 级缓存）
        run_cmd(["uv", "run", "--no-project", "--with", "edge-tts", "python", script_path])
        # 2) 渲染
        out_raw = ctx.out("4-video", "render-raw.mp4")
        run_cmd(["npx", "remotion", "render", composition, os.path.relpath(out_raw, studio), "--log=error"],
                timeout=14400, cwd=studio)
        if not os.path.exists(out_raw):
            raise StageError("permanent", "渲染命令成功但产物缺失")
        ctx.rs.register_artifact("render", out_raw, "video-raw")
        return StageResult("passed", {"composition": composition})
    def check(self, ctx: RuntimeCtx) -> StageResult:
        raw = ctx.out("4-video", "render-raw.mp4")
        final = ctx.out("4-video", "final.mp4")
        narr = ctx.out("4-video", "narration.json")
        if os.path.exists(final):
            return StageResult("passed")
        if not os.path.exists(narr):
            return StageResult("warn", error=StageError("gate", "等待 4-video/narration.json（人审门）"))
        if os.path.exists(raw):
            return StageResult("warn", error=StageError("gate", "raw 已渲，缺 final.mp4（配置 encode 或用 encode_final.py 后重跑）"))
        return StageResult("warn", error=StageError("gate", "narration 就绪但尚未渲染（resume 继续或配置 render.composition）"))

# ════════════════ qa（硬校验：任何不达标 → failed） ════════════════
class QaAdapter(Adapter):
    name = "qa"
    inputs_spec = ["4-video/final.mp4"]
    def run(self, ctx: RuntimeCtx) -> StageResult:
        final = ctx.out("4-video", "final.mp4")
        if not os.path.exists(final):
            return StageResult("warn", error=StageError("gate", "缺 final.mp4（先完成渲染+编码）"))
        env = env_summary(ctx.root)
        ff, fp = env["ffmpeg"], env["ffprobe"]
        if ff == "MISSING" or fp == "MISSING":
            raise StageError("permanent", "找不到 ffmpeg/ffprobe")
        issues = []
        # 1) ffprobe 退出码 + 流 + 规格
        r = subprocess.run([fp, "-v", "error", "-print_format", "json", "-show_format", "-show_streams", final],
                           capture_output=True, text=True, timeout=120)
        if r.returncode != 0:
            issues.append(f"ffprobe 失败(退出码 {r.returncode})：文件损坏或非媒体")
        info = json.loads(r.stdout or "{}") if r.returncode == 0 else {}
        streams = info.get("streams", [])
        v = next((s for s in streams if s.get("codec_type") == "video"), None)
        a = next((s for s in streams if s.get("codec_type") == "audio"), None)
        if v is None: issues.append("缺视频流")
        if a is None: issues.append("缺音轨（讲解片必须有音轨）")
        fmt = info.get("format", {})
        try:
            dur = float(fmt.get("duration", 0))
            if dur <= 0: issues.append(f"时长异常: {dur}")
        except (TypeError, ValueError):
            issues.append("时长不可解析")
        expect = (ctx.cfg.get("qa") or {}).get("expect", {})
        if v:
            if v.get("codec_name") != "h264": issues.append(f"视频编码 {v.get('codec_name')} != h264")
            if v.get("pix_fmt") != "yuv420p": issues.append(f"像素格式 {v.get('pix_fmt')} != yuv420p")
            for key, exp in (("width", expect.get("width", 1920)), ("height", expect.get("height", 1080))):
                if int(v.get(key, 0) or 0) != exp: issues.append(f"{key}={v.get(key)} != {exp}")
            rate = v.get("avg_frame_rate", "0/1")
            try:
                num, den = rate.split("/"); fps = float(num) / float(den or 1)
                if abs(fps - float(expect.get("fps", 30))) > 0.5: issues.append(f"帧率 {fps:.2f} != {expect.get('fps', 30)}")
            except Exception:
                issues.append(f"帧率不可解析: {rate}")
        if a:
            if a.get("codec_name") != "aac": issues.append(f"音频编码 {a.get('codec_name')} != aac")
            if str(a.get("sample_rate")) not in ("48000", "44100"): issues.append(f"采样率 {a.get('sample_rate')} 异常")
        # 2) faststart
        with open(final, "rb") as f:
            head = f.read(300000)
        faststart = 0 <= head.find(b"moov") < (head.find(b"mdat") if b"mdat" in head else 1 << 60)
        if not faststart: issues.append("faststart 不达标（moov 不在 mdat 前）")
        # 3) 响度（目标 I=-16±1.5 / TP≤-1.0）
        r = subprocess.run([ff, "-i", final, "-vn", "-af",
                            "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                           capture_output=True, text=True, timeout=3600)
        if r.returncode != 0:
            issues.append(f"响度测量失败(退出码 {r.returncode})")
        loud = {}
        m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", r.stderr, re.S)
        if m:
            loud = json.loads(m.group(0))
            try:
                i_val, tp_val = float(loud["input_i"]), float(loud["input_tp"])
                if not (-18.0 <= i_val <= -14.0): issues.append(f"响度 I={i_val} 超出 [-18,-14]")
                if tp_val > -1.0: issues.append(f"真峰值 TP={tp_val} > -1.0")
            except (KeyError, ValueError):
                issues.append("响度字段不可解析")
        else:
            issues.append("未获得响度数据")
        report = {"duration": fmt.get("duration"), "faststart": faststart,
                  "loudness": loud, "streams": {"video": (v or {}).get("codec_name"), "audio": (a or {}).get("codec_name")},
                  "pix_fmt": (v or {}).get("pix_fmt"), "issues": issues}
        rp = _write(ctx, "5-video-final/qa_report.json", json.dumps(report, ensure_ascii=False, indent=2))
        ctx.rs.register_artifact("qa", rp, "qa-report")
        if issues:
            return StageResult("failed", data={"issues": issues},
                               error=StageError("permanent", "QA 不达标: " + "; ".join(issues)))
        return StageResult("passed", {"checks": ["ffprobe", "streams", "specs", "faststart", "loudness"]})

# ════════════════ retrospective（人审门） ════════════════
class RetroAdapter(Adapter):
    name = "retrospective"
    inputs_spec = ["4-video/final.mp4", "5-video-final/qa_report.json"]
    PLACEHOLDERS = ["待人工填写", "__/10", "…\n"]
    def run(self, ctx: RuntimeCtx) -> StageResult:
        tpl_dir = ctx.out("6-review")
        os.makedirs(tpl_dir, exist_ok=True)
        retro = os.path.join(tpl_dir, "retrospective.md")
        if not os.path.exists(retro):
            atomic_write_text(retro, f"""# Retrospective（paperpipe @ {VERSION}）

> 人工/agent 填写。完成后 `paperpipe review --confirm`——确认会核对评分、证据与占位符。

## 一句话结论
（填写）
## 六维打分（每项必须填分并给证据）
| 维度 | 分 | 证据 |
|---|---|---|
| 解释力 | | |
| 视觉表现 | | |
| 音画同步 | | |
| 技术卫生 | | |
| 内容密度 | | |
| 节奏 | | |
## 有效做法 / 无效做法
- [无效] 现象→根因→修复→固化为规则
## 写回技能
- 至少 1 条硬规则写回 prompt-forge / remotion-video / paper-explain
""")
        lessons = os.path.join(tpl_dir, "lessons.md")
        if not os.path.exists(lessons):
            atomic_write_text(lessons, "# Lessons（可迁移规则，格式 `- [类别] 规则 —— 来源`）\n")
        if ctx.rs.data["review"].get("confirmed"):
            return StageResult("passed", {"review_confirmed": True})
        return StageResult("warn", error=StageError("gate", "复盘模板已生成（人审门），填写后 `paperpipe review --confirm`"))

# ════════════════ publish ════════════════
def validate_review(ctx: RuntimeCtx) -> tuple[bool, list, dict]:
    """可验证的人审门：QA 必须 passed；复盘已填（无占位符、评分有值）；lessons 有具体规则。
    返回 (ok, problems, hashes)。"""
    problems = []
    if ctx.rs.stage("qa")["status"] != "passed":
        problems.append("QA 阶段未 passed")
    retro = ctx.out("6-review", "retrospective.md")
    lessons = ctx.out("6-review", "lessons.md")
    if not os.path.exists(retro):
        problems.append("retrospective.md 缺失")
    if not os.path.exists(lessons):
        problems.append("lessons.md 缺失")
    hashes = {}
    if problems:
        return False, problems, hashes
    rtxt = open(retro, encoding="utf-8").read()
    ltxt = open(lessons, encoding="utf-8").read()
    for ph in ("待人工填写", "__/10"):
        if ph in rtxt:
            problems.append(f"复盘仍含占位符: {ph}")
    if "| 解释力 |" not in rtxt or re.search(r"\|\s*解释力\s*\|\s*\|", rtxt):
        problems.append("解释力评分未填写")
    rules = [ln for ln in ltxt.splitlines() if re.match(r"^- \[.+?\]", ln)]
    if not rules:
        problems.append("lessons.md 无具体规则（需 ≥1 条 `- [类别] …`）")
    from .util import sha256_file
    hashes = {"retrospective": __import__("paperpipe.util", fromlist=["sha256_file"]).sha256_file(retro),
              "lessons": __import__("paperpipe.util", fromlist=["sha256_file"]).sha256_file(lessons),
              "final": __import__("paperpipe.util", fromlist=["sha256_file"]).sha256_file(ctx.out("4-video", "final.mp4"))}
    return (not problems), problems, hashes

class PublishAdapter(Adapter):
    name = "publish"
    inputs_spec = ["4-video/final.mp4"]
    def _review_valid(self, ctx: RuntimeCtx) -> tuple[bool, list]:
        ok, problems, hashes = validate_review(ctx)
        # 产物变更后旧审核失效
        saved = ctx.rs.data["review"].get("hashes") or {}
        if ok and saved:
            for k, h in hashes.items():
                if saved.get(k) and saved[k] != h:
                    ok = False
                    problems.append(f"确认后产物已变更: {k}（重新 review --confirm）")
        return ok, problems
    def run(self, ctx: RuntimeCtx) -> StageResult:
        pub = ctx.rs.data["publish"]
        ok, problems = self._review_valid(ctx)
        if not ctx.rs.stage("qa")["status"] == "passed" or not ok:
            plan = {"mode": "dry-run", "video": "4-video/final.mp4" if os.path.exists(ctx.out("4-video", "final.mp4")) else None,
                    "blocked_by": problems or ["QA 未通过"]}
            _write(ctx, "5-video-final/publish_plan.json", json.dumps(plan, ensure_ascii=False, indent=2))
            return StageResult("warn", error=StageError("gate", "发布计划已生成；被门禁挡住: " + "; ".join(problems or ["QA 未通过"])))
        pub["upload_ready"] = True
        ctx.rs.save()
        cmd = (ctx.cfg.get("publish") or {}).get("command")
        if pub.get("dry_run") or not pub.get("enabled") or not cmd:
            plan = {"mode": "dry-run", "video": "4-video/final.mp4", "upload_ready": True,
                    "uploader": cmd or "未配置 publish.command（真实上传需要显式接入上传适配器）",
                    "next": f"paperpipe publish --confirm {ctx.rs.data['run_id']}"}
            _write(ctx, "5-video-final/publish_plan.json", json.dumps(plan, ensure_ascii=False, indent=2))
            ctx.rs.register_artifact("publish", ctx.out("5-video-final/publish_plan.json"), "publish-plan")
            return StageResult("passed", {"mode": "dry-run", "note": "未上传；真实上传需 --confirm + publish.command"})
        # 真实上传：执行配置的上传命令，产出回执；失败保留可重试状态
        pub["uploading"] = True
        ctx.rs.save()
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=7200, cwd=ctx.root)
            receipt = {"ts": utcnow(), "exit": r.returncode,
                       "stdout": r.stdout[-2000:], "stderr": r.stderr[-2000:]}
            _write(ctx, "5-video-final/upload_receipt.json", json.dumps(receipt, ensure_ascii=False, indent=2))
            ctx.rs.register_artifact("publish", ctx.out("5-video-final/upload_receipt.json"), "upload-receipt")
            if r.returncode != 0:
                raise StageError("transient", f"上传命令失败({r.returncode})，可 retry")
            pub["uploading"] = False
            pub["uploaded"] = True
            pub["receipt"] = "5-video-final/upload_receipt.json"
            ctx.rs.save()
            return StageResult("passed", {"mode": "confirmed-upload"})
        except StageError:
            pub["uploading"] = False
            ctx.rs.save()
            raise

ADAPTERS = {a.name: a for a in (IntakeAdapter(), BriefAdapter(), AcquireAdapter(), XrayAdapter(),
                                FiguresAdapter(), RenderAdapter(), QaAdapter(), RetroAdapter(), PublishAdapter())}

