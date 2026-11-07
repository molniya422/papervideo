"""paperpipe.adapters — 阶段适配器协议与 9 阶段实现（v2）。

协议：每个适配器实现 plan(ctx) / inputs(ctx) / run(ctx) / check(ctx) / repair(ctx, err)。
状态语义（v2）：
- run()/check() 返回 passed / waiting_for_agent / waiting_for_human；
- StageError.cls: transient（退避重试）/ permanent（需改内容或配置）/ agent（等 agent）/ human（等人工）；
- 自动执行 vs 自动生成：intake/brief/acquire/render/qa/publish 可程序化全自动；
  xray/figures 是 waiting_for_agent（骨架+handoff 信封，等 agent 按技能补全），
  retrospective 是 waiting_for_human —— 本执行器不调用模型，技能由上层编排器调用并落 receipt。
- 阶段级技能凭据在 runner 中用 receipts.verify_stage() 验证（替换旧的字符串匹配）。
"""
from __future__ import annotations
import glob as globmod
import json, os, re, shutil, subprocess
import urllib.request, urllib.error

from . import registry, receipts, handoff
from . import schemas as _schemas
from .util import atomic_write_text, atomic_write_json, env_summary, utcnow
from .state import RunState

VERSION = "2.0.0"


def ensure_stage_handoffs(ctx: RuntimeCtx, stage: str) -> list:
    """按 contracts.yaml handoff_plan 创建该阶段全部子智能体 handoff 信封。
    已存在（同名）的信封跳过 —— 幂等。返回 handoff_id 列表。"""
    plan = registry.stage_contract(stage).get("handoff_plan") or []
    run_id = ctx.rs.data["run_id"]
    created = []
    for i, h in enumerate(plan):
        hid = f"{run_id}-{stage}-{h['role']}-{i + 1:02d}"
        try:
            handoff.get_state(ctx, hid)
        except (FileNotFoundError, json.JSONDecodeError, KeyError):
            handoff.create(ctx, hid, h["role"], stage, h["task"],
                           h.get("input_paths", []),
                           {"output": h.get("output_paths", [""])[0] if h.get("output_paths") else ""})
        created.append(hid)
    return created


def stage_handoffs_passed(ctx: RuntimeCtx, stage: str) -> tuple[bool, list]:
    """按 depends_on 拓扑序检查：每个 handoff 自身 passed 且其依赖也 passed。返回 (all_passed, 问题列表)。"""
    plan = registry.stage_contract(stage).get("handoff_plan") or []
    run_id = ctx.rs.data["run_id"]
    states = {}
    for i, h in enumerate(plan):
        hid = f"{run_id}-{stage}-{h['role']}-{i + 1:02d}"
        try:
            states[h["role"]] = handoff.get_state(ctx, hid)
        except (FileNotFoundError, json.JSONDecodeError, KeyError):
            states[h["role"]] = "missing"
    bad = []
    for h in plan:
        role = h["role"]
        state = states.get(role, "missing")
        if state == "passed":
            continue
        # 依赖尚未 passed 的 handoff 标 blocked_by —— 编排方据此决定分派顺序
        unmet = [d for d in (h.get("depends_on") or []) if states.get(d) != "passed"]
        bad.append(f"{role}=blocked_by({', '.join(unmet)})" if unmet else f"{role}={state}")
    return (not bad), bad

class StageError(Exception):
    def __init__(self, cls: str, message: str):
        super().__init__(message)
        self.cls = cls      # transient | permanent | agent | human
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
        self.status = status    # passed | waiting_for_agent | waiting_for_human | failed
        self.data = data or {}
        self.error = error

def _write(ctx: RuntimeCtx, relpath: str, text: str) -> str:
    p = ctx.out(relpath)
    atomic_write_text(p, text)
    return p

def _read(ctx: RuntimeCtx, relpath: str) -> str | None:
    p = ctx.out(relpath)
    return open(p, encoding="utf-8").read() if os.path.exists(p) else None

class Adapter:
    name = "base"
    inputs_spec: list = []

    def plan(self, ctx: RuntimeCtx) -> dict:
        return {"stage": self.name}

    def inputs(self, ctx: RuntimeCtx) -> list:
        return list(self.inputs_spec)

    def run(self, ctx: RuntimeCtx) -> StageResult:
        raise NotImplementedError

    def check(self, ctx: RuntimeCtx) -> StageResult:
        return StageResult("passed")

    def repair(self, ctx: RuntimeCtx, err: StageError) -> StageResult:
        return StageResult("failed", error=StageError("permanent", f"{self.name}: 无修复策略: {err.message}"))

    def for_target(self, ctx: RuntimeCtx) -> bool:
        return self.name in registry.target_stages(ctx.rs.data["target"])

# ════════════════ intake ════════════════
class IntakeAdapter(Adapter):
    name = "intake"
    def run(self, ctx: RuntimeCtx) -> StageResult:
        p = ctx.out("0-brief/design-intake.md")
        if os.path.exists(p):
            return StageResult("passed", {"source": "existing"})
        if ctx.cfg.get("mode") != "auto":
            raise StageError("agent", "mode!=auto：设计访谈需人工回答；用 AskUserQuestion 或手写 design-intake.md")
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
        # 明确默认假设路径也落 receipt（触发条件"有视频目标"的可验证凭据）
        receipts.write_skill_receipt(ctx, "intake", "design-intake", "video_target",
                                     ["0-brief/design-intake.md"], agent_id="paperpipe-auto",
                                     note="用户不在线：defaults 显式假设（见文件逐项'默认'标注）")
        return StageResult("passed", {"auto_assumptions": len(assums)})

    def check(self, ctx: RuntimeCtx) -> StageResult:
        txt = _read(ctx, "0-brief/design-intake.md")
        if not txt:
            return StageResult("failed", error=StageError("permanent", "design-intake.md 缺失"))
        probs = _schemas.validate_text("design-intake.md", txt)
        if probs:
            return StageResult("waiting_for_human",
                               error=StageError("human", "design-intake 谓词未过: " + "; ".join(probs)))
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
        receipts.write_skill_receipt(ctx, "brief", "prompt-forge", "any_visual_generation",
                                     ["0-brief/brief.md"], agent_id="paperpipe-auto",
                                     note="骨架合同：三套方案与 storyboard 由 agent 回填后定稿")
        return StageResult("passed")

    def check(self, ctx: RuntimeCtx) -> StageResult:
        txt = _read(ctx, "0-brief/brief.md") or ""
        if "<acceptance>" not in txt:
            return StageResult("failed", error=StageError("permanent", "brief 缺 <acceptance>"))
        probs = _schemas.validate_text("brief.md", txt)
        if probs:
            return StageResult("waiting_for_agent",
                               error=StageError("agent", "brief 谓词未过（修后 resume）: " + "; ".join(probs)))
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
            t0 = utcnow()
            if not os.path.exists(pdf):
                try:
                    req = urllib.request.Request(self.ARXIV_PDF.format(id=src), headers={"User-Agent": f"paperpipe/{VERSION}"})
                    with urllib.request.urlopen(req, timeout=60) as r, open(pdf + ".partial", "wb") as f:
                        shutil.copyfileobj(r, f)
                    os.replace(pdf + ".partial", pdf)
                except (urllib.error.URLError, TimeoutError, OSError) as e:
                    if os.path.exists(pdf + ".partial"):
                        os.unlink(pdf + ".partial")
                    raise StageError("transient", f"arXiv 下载失败: {e}")
            receipts.write_tool_receipt(ctx, "acquire", "arxiv-download",
                                        ["urllib", self.ARXIV_PDF.format(id=src)], 0,
                                        output_paths=[_rel(ctx, pdf)], note=f"t0={t0}")
            receipts.write_skill_receipt(ctx, "acquire", "paper-download-arxiv-paper-source",
                                         "arxiv_input", [_rel(ctx, pdf)], agent_id="paperpipe-auto",
                                         note="执行器内置下载（与技能脚本同策略）；本地 PDF 输入时由编排器补 pdf-to-markdown 决策")
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

def _rel(ctx, p: str) -> str:
    return os.path.relpath(os.path.realpath(p), os.path.realpath(ctx.run_dir)).replace("\\", "/")

# ════════════════ xray（waiting_for_agent：骨架 + handoff → agent 补全） ════════════════
class XrayAdapter(Adapter):
    name = "xray"
    inputs_spec = ["paper_src/**"]
    def run(self, ctx: RuntimeCtx) -> StageResult:
        p = ctx.out("2-xray/deep-read.md")
        if os.path.exists(p):
            return StageResult("passed")
        tpl = """# 深度解读（paper-xray 产物骨架）

> 由 paperpipe 生成骨架。请按 paper-xray 技能完成：还原作者思路、每个公式给可手算例子、
> 怀疑式核对数字、标注【文中有据/推断/猜测】。完成后删除本行提示，并写 paper-xray 的 skill receipt。
> 注意：这是 waiting_for_agent——本状态机不调用模型，内容由 agent/人工产出。

## 机制点（每条驱动一个图解/镜头）
1. 【文中有据】机制 A —— 它会怎么坏：…

## 可手算例子
- 例 1: …

## 数字核对
| 论文数值 | 来源 | 核对 |
|---|---|---|
"""
        _write(ctx, "2-xray/deep-read.md", tpl)
        try:
            from . import handoff
            handoff.create(ctx, f"{ctx.rs.data['run_id']}-xray-researcher", "researcher", "xray",
                           "按 paper-xray 技能补全 deep-read.md；完成后 submit_response 并由整合方 verify",
                           ["paper_src/"], {"output": "2-xray/deep-read.md"})
        except Exception:
            pass  # handoff 是增强物，不阻塞骨架落盘
        return StageResult("waiting_for_agent",
                           error=StageError("agent", "deep-read.md 为骨架（waiting_for_agent），需 agent 补全 + paper-xray receipt"))
    def check(self, ctx: RuntimeCtx) -> StageResult:
        txt = _read(ctx, "2-xray/deep-read.md") or ""
        if not txt:
            return StageResult("failed", error=StageError("permanent", "deep-read.md 缺失"))
        if "请按 paper-xray 技能完成" in txt:
            return StageResult("waiting_for_agent", error=StageError("agent", "deep-read.md 仍是骨架"))
        probs = _schemas.validate_text("deep-read.md", txt)
        if probs:
            return StageResult("waiting_for_agent", error=StageError("agent",
                               "deep-read 谓词未过（修后 resume）: " + "; ".join(probs)))
        return StageResult("passed")

# ════════════════ figures（waiting_for_agent） ════════════════
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
                   f"每张图必须对应 deep-read.md 的一个机制点；Remotion 动效先查 wise-motion，"
                   f"HTML/CSS 动效先查 motion-lab（命中导出、缺口写 route-decision）。完成后在此登记：\n\n"
                   f"| 图 | 对应机制点 | 技能 | 产物路径 |\n|---|---|---|---|\n")
            try:
                from . import handoff
                handoff.create(ctx, f"{ctx.rs.data['run_id']}-figures-planner", "visual_planner", "figures",
                               "按注册表条件技能完成图解与动效匹配登记；产出登记表后 submit_response",
                               ["2-xray/deep-read.md", "0-brief/brief.md"],
                               {"output": "3-figures/README.md"})
            except Exception:
                pass
        readme = _read(ctx, "3-figures/README.md") or ""
        rows = [ln for ln in readme.splitlines()
                if ln.strip().startswith("|") and "对应机制点" not in ln and not re.match(r"^\|[\s\-|]*$", ln)]
        if not rows:
            return StageResult("waiting_for_agent",
                               error=StageError("agent", "图解登记表为空（waiting_for_agent），需 agent 产出并登记"))
        return StageResult("passed", {"figures": len(rows)})

    def check(self, ctx: RuntimeCtx) -> StageResult:
        import json as _json
        reg_ids = registry.skill_ids()
        readme = _read(ctx, "3-figures/README.md") or ""
        rows = [ln for ln in readme.splitlines()
                if ln.strip().startswith("|") and not re.match(r"^[\s\-|]*$", ln.strip())]
        rows = [ln for ln in rows if "对应机制点" not in ln]
        if not rows:
            return StageResult("waiting_for_agent", error=StageError("agent", "登记表为空（复验）"))
        cwd = (ctx.cfg.get("render") or {}).get("cwd") or "4-video/hf"
        for ln in rows:
            cells = [c.strip() for c in ln.strip().strip("|").split("|")]
            if len(cells) >= 2 and cells[0] in ("图", "章", "ID", "No", "序号"):
                continue  # 表头行（v5 用"章"，模板用"图"——按首列标记识别）
            if len(cells) < 4:
                return StageResult("failed", error=StageError("permanent", "登记表行列数<4: " + ln[:60]))
            if not any(c in reg_ids for c in cells):
                return StageResult("failed", error=StageError("permanent", "登记表行无已注册技能: " + ln[:60]))
            cand = cells[-1]
            if cand and not any(os.path.exists(ctx.out(x)) for x in
                                (cand, cwd + "/" + cand, "4-video/hf/" + cand)):
                return StageResult("failed", error=StageError("permanent", "登记表产物不存在: " + cand))
        probs = []
        for rel in ("3-figures/examples_spec.json", "3-figures/dataviz_spec.json", "3-figures/enriched_spec.json"):
            fp2 = ctx.out(rel)
            if os.path.exists(fp2):
                try:
                    data = _json.load(open(fp2, encoding="utf-8"))
                except _json.JSONDecodeError as e:
                    probs.append(rel.split("/")[-1] + ": JSON 损坏 " + str(e)); continue
                pr = _schemas.validate_json(rel, data)
                if rel.endswith("enriched_spec.json") and any("style_ref" in x for x in pr)                         and os.path.exists(ctx.out("3-figures/style_refs.json")):
                    pr = [x for x in pr if "style_ref" not in x]  # 兼容口：style_refs.json 整体落章（v1 产物）
                probs += [rel.split("/")[-1] + ": " + x for x in pr]
        sp = ctx.out("3-figures", "shot_plan.json")
        if not os.path.exists(sp):
            probs.append("shot_plan.json 缺失（visual_planner 镜头规划层）")
        else:
            try:
                spd = _json.load(open(sp, encoding="utf-8"))
                probs += ["shot_plan: " + x for x in _schemas.validate_json("shot_plan.json", spd)]
                for fl in (spd.get("pacing") or {}).get("flagged") or []:
                    if isinstance(fl, dict) and not str(fl.get("decision") or "").strip():
                        probs.append("shot_plan.flagged[%s] 缺导演裁定 decision" % fl.get("chapter"))
            except _json.JSONDecodeError as e:
                probs.append("shot_plan.json: JSON 损坏 " + str(e))
        mm = ctx.out("3-figures", "model_manifest.json")
        if os.path.exists(mm):
            try:
                probs += ["manifest: " + x for x in _schemas.validate_json(
                    "model_manifest.json", _json.load(open(mm, encoding="utf-8")))]
            except _json.JSONDecodeError as e:
                probs.append("model_manifest.json: JSON 损坏 " + str(e))
        else:
            probs.append("model_manifest.json 缺失（model_builder 场景清单）")
        tprobs = handoff.trace_check(ctx, "figures", [
            "3-figures/examples_spec.json", "3-figures/dataviz_spec.json", "3-figures/style_refs.json",
            "3-figures/enriched_spec.json", "3-figures/shot_plan.json", "3-figures/model_manifest.json"])
        probs += ["溯源: " + x for x in tprobs]
        if probs:
            return StageResult("waiting_for_agent",
                               error=StageError("agent", "figures 产物谓词未过（修后 resume）: " + "; ".join(probs[:6])))
        return StageResult("passed")



# ════════════════ render ════════════════
class RenderAdapter(Adapter):
    name = "render"
    def inputs(self, ctx: RuntimeCtx) -> list:
        spec = ["4-video/narration.json", "3-figures/README.md"]
        rcfg = ctx.cfg.get("render") or {}
        for g in rcfg.get("sources", []):
            # sources 原样使用：root: 前缀=工作区根相对，无前缀=运行目录相对（调用方自己定）
            spec.append(g)
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
                   "1. `4-video/narration.json`（shots[].sentences[] 结构，样例见既有项目；"
                   "旁白先过 humanize-writing，产 receipt；无旁白纯音乐片也用本文件承载逐句字幕时间轴）\n"
                   "2. 在 paperpipe.yaml 配置 render.composition / render.script / render.sources"
                   "（或路线 D：render.mode=hyperframes + render.command/cwd）\n\n"
                   "就绪后重跑：`paperpipe resume` —— 渲染自动执行并按输入指纹缓存。\n")
            return StageResult("waiting_for_agent",
                               error=StageError("agent", "缺 4-video/narration.json（agent 产出 + humanize-writing receipt 后 resume 自动渲染）"))
        try:
            _nd = json.load(open(narration, encoding="utf-8"))
        except Exception as e:
            return StageResult("waiting_for_agent",
                               error=StageError("agent", f"narration.json 解析失败: {e}"))
        _nprobs = _schemas.validate_json("narration.json", _nd)
        if _nprobs:
            return StageResult("waiting_for_agent",
                               error=StageError("agent", "narration.json 谓词未过（体检 P1-2，修后 resume）: "
                                                + "; ".join(_nprobs[:4])))
        # 路线 D：render.mode=hyperframes —— 通用命令模式（执行器只跑命令+写 tool receipt+断言产物）
        if rcfg.get("mode") == "hyperframes" or rcfg.get("command"):
            if not rcfg.get("sources"):
                raise StageError("agent", "render.sources 未配置——指纹白名单为空会让源码改动不触发重渲（体检 C2）。"
                                         "在 paperpipe.yaml render.sources 声明合成/资产/音频/字体 glob 后 resume")
            cmd = rcfg.get("command")
            if not cmd:
                raise StageError("agent", "render.mode=hyperframes 需配置 render.command（如 npx hyperframes render -o …）")
            cwd = ctx.out(rcfg.get("cwd", ".")) if not os.path.isabs(rcfg.get("cwd", ".")) else rcfg["cwd"]
            from shutil import which
            npx = which("npx") or which("npx.cmd")
            run_cmd = [npx] + cmd[1:] if cmd[0] == "npx" and npx else cmd
            # 幂等：渲染产物 + 带相同源码指纹的 tool receipt → 跳过重渲
            out_raw = ctx.out("4-video", "render-raw.mp4")
            import hashlib as _hl
            src_fp = _hl.sha256()
            for spec in sorted(self.inputs(ctx)):
                base = ctx.root if spec.startswith("root:") else ctx.run_dir
                pat = spec[5:] if spec.startswith("root:") else spec
                root = base if not any(c in pat for c in "*?[") else base
                import glob as _gm
                for p in sorted(_gm.glob(os.path.join(root, pat), recursive=True)) if any(c in pat for c in "*?[") else [os.path.join(root, pat)]:
                    if os.path.isfile(p):
                        from .util import sha256_file as _sf
                        src_fp.update(p.encode()); src_fp.update(_sf(p).encode())
            src_fp = src_fp.hexdigest()
            cached_ok = False
            if os.path.exists(out_raw):
                for rc in receipts.list_tool_receipts(ctx, "render", "hyperframes-render"):
                    if rc.get("status") == "passed" and rc.get("src_fp") == src_fp:
                        cached_ok = True
                        break
            if cached_ok:
                ctx.rs.register_artifact("render", out_raw, "video-raw")
                return StageResult("passed", {"mode": "hyperframes", "cached": True})
            # 渲染前人工预览门（hyperframes 路线）：预览包过审 + 分类意见全 resolved 才许渲成片
            from . import preview as _prev
            pok, preason = _prev.gate(ctx)
            if not pok:
                return StageResult(
                    "waiting_for_human",
                    error=StageError(
                        "human",
                        "渲染预览门未过：" + preason + "。流程：python -m paperpipe preview → 用户逐章审看 → "
                        "revise add 登记意见 → 修复 → revise resolve → preview --confirm 过审"))
            import time as _t
            t0 = _t.time()
            r = subprocess.run(run_cmd, capture_output=True, text=True, timeout=21600, cwd=cwd)
            receipts.write_tool_receipt(ctx, "render", "hyperframes-render", run_cmd, r.returncode,
                                        seconds=round(_t.time() - t0, 1), note=(r.stderr or "")[-300:],
                                        extra={"src_fp": src_fp})
            if r.returncode != 0:
                raise StageError("transient", f"hyperframes 渲染失败({r.returncode}): {(r.stderr or r.stdout or '')[-600:]}")
            out_raw = ctx.out("4-video", "render-raw.mp4")
            if not os.path.exists(out_raw):
                raise StageError("permanent", "渲染命令成功但 4-video/render-raw.mp4 缺失")
            ctx.rs.register_artifact("render", out_raw, "video-raw")
            return StageResult("passed", {"mode": "hyperframes", "cwd": rcfg.get("cwd")})
        if not script or not os.path.exists(os.path.join(ctx.root, script) if not os.path.isabs(script) else script):
            raise StageError("agent", f"render.script 未配置或不存在（拒绝拿示例工程代跑）：{script}")
        if not composition:
            raise StageError("agent", "render.composition 未配置（Remotion 合成 ID）")
        script_path = script if os.path.isabs(script) else os.path.join(ctx.root, script)
        studio = ctx.tool(*(rcfg.get("studio", "remotion-studio").split("/")))
        cmds = []
        from shutil import which
        npx = which("npx") or which("npx.cmd")
        def run_cmd(cmd, timeout=3600, cwd=None, tool=""):
            if cmd and cmd[0] == "npx" and npx:
                cmd = [npx] + cmd[1:]
            cmds.append(" ".join(cmd))
            ctx.rs.stage("render")["commands"] = cmds
            ctx.rs.save()
            import time as _t
            t0 = _t.time()
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, cwd=cwd or ctx.root)
            receipts.write_tool_receipt(ctx, "render", tool or os.path.basename(cmd[0]), cmd, r.returncode,
                                        seconds=round(_t.time() - t0, 1),
                                        note=(r.stderr or "")[-300:])
            if r.returncode != 0:
                raise StageError("transient", f"命令失败({r.returncode}): {' '.join(cmd)}\n{r.stderr[-800:]}")
        # 1) TTS + 时间轴（脚本自带重试与 mp3 级缓存）
        run_cmd(["uv", "run", "--no-project", "--with", "edge-tts", "python", script_path], tool="tts-build")
        # 2) 渲染
        out_raw = ctx.out("4-video", "render-raw.mp4")
        run_cmd(["npx", "remotion", "render", composition, os.path.relpath(out_raw, studio), "--log=error"],
                timeout=14400, cwd=studio, tool="remotion-render")
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
            return StageResult("waiting_for_agent", error=StageError("agent", "等待 4-video/narration.json"))
        if os.path.exists(raw):
            return StageResult("waiting_for_agent",
                               error=StageError("agent", "raw 已渲，缺 final.mp4（配置 encode 或用 encode_final.py 后重跑）"))
        return StageResult("waiting_for_agent",
                           error=StageError("agent", "narration 就绪但尚未渲染（resume 继续或配置 render.composition）"))

# ════════════════ qa（硬校验：任何不达标 → failed_permanent） ════════════════
class QaAdapter(Adapter):
    name = "qa"
    inputs_spec = ["4-video/final.mp4", "4-video/audio_master.wav"]
    def run(self, ctx: RuntimeCtx) -> StageResult:
        final = ctx.out("4-video", "final.mp4")
        if not os.path.exists(final):
            return StageResult("waiting_for_agent", error=StageError("agent", "缺 final.mp4（先完成渲染+编码）"))
        env = env_summary(ctx.root)
        ff, fp = env["ffmpeg"], env["ffprobe"]
        if ff == "MISSING" or fp == "MISSING":
            raise StageError("permanent", "找不到 ffmpeg/ffprobe")
        issues = []
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
        with open(final, "rb") as f:
            head = f.read(300000)
        faststart = 0 <= head.find(b"moov") < (head.find(b"mdat") if b"mdat" in head else 1 << 60)
        if not faststart: issues.append("faststart 不达标（moov 不在 mdat 前）")
        # 响度/TP 以音频母带（WAV）为基准 —— 转码器（aac 版本/实现）的真峰行为不参与验收
        loud_src = final
        master = ctx.out("4-video", "audio_master.wav")
        if os.path.exists(master):
            loud_src = master
        r = subprocess.run([ff, "-i", loud_src, "-vn", "-af",
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
        # 音画一致性四项（体检 P1-3）：时长差 / 容器偏移 / 码率下限 / 帧数一致
        if v:
            try:
                vd = float(v.get("duration") or fmt.get("duration") or 0)
                adur = float(a.get("duration") or fmt.get("duration") or 0) if a else vd
                if vd > 0 and adur > 0 and abs(vd - adur) > 0.5:
                    issues.append("音画时长差 %.2fs > 0.5s（音轨截断或垫底）" % abs(vd - adur))
                vs0 = float(v.get("start_time") or 0)
                as0 = float(a.get("start_time") or 0) if a else vs0
                if abs(vs0 - as0) > 0.05:
                    issues.append("容器级音画偏移 %.3fs > 0.05s" % abs(vs0 - as0))
                br = int(fmt.get("bit_rate") or v.get("bit_rate") or 0)
                if br and br < 500000 and vd >= 5:
                    issues.append("总码率 %dkbps < 500kbps 下限（低码率花屏风险）" % (br // 1000))
                nf = v.get("nb_frames")
                try:
                    _n, _d2 = (v.get("avg_frame_rate") or "0/1").split("/")
                    fps_v = float(_n) / float(_d2 or 1)
                except Exception:
                    fps_v = 0.0
                if nf and fps_v > 0 and vd > 0 and abs(int(nf) - vd * fps_v) > max(2, vd * fps_v * 0.01):
                    issues.append("帧数不一致 nb_frames=%s vs duration×fps=%.0f" % (nf, vd * fps_v))
            except (TypeError, ValueError):
                pass
        if issues:
            return StageResult("failed", data={"issues": issues},
                               error=StageError("permanent", "QA 不达标: " + "; ".join(issues)))
        # 布局审计零遮挡硬门槛（媒体检查全过后才生效；hyperframes check 产物或 layout_audit.json）
        layout_report = None
        cand = ctx.out("5-video-final", "layout_audit.json")
        if os.path.exists(cand):
            layout_report = json.load(open(cand, encoding="utf-8"))
        else:
            cwd = (ctx.cfg.get("render") or {}).get("cwd")
            base = ctx.out(cwd) if cwd and not os.path.isabs(cwd) else (cwd or "")
            checks = os.path.join(base, ".hyperframes", "artifacts", "checks") if base else ""
            if checks and os.path.isdir(checks):
                newest = max((os.path.join(checks, f) for f in os.listdir(checks) if f.endswith(".json")),
                             key=os.path.getmtime, default=None)
                if newest:
                    layout_report = json.load(open(newest, encoding="utf-8"))
        layout_errors = []
        if layout_report is None:
            return StageResult("waiting_for_agent",
                               error=StageError("agent", "缺布局审计报告：跑 hyperframes check --json 或 layout-safety-review，"
                                                "并将含 layout 段的报告落至 5-video-final/layout_audit.json（零遮挡硬门槛）"))
        lay = (layout_report.get("layout") or {})
        layout_errors = [f for f in (lay.get("findings") or []) if f.get("severity") == "error"]
        if layout_errors:
            issues.append("布局审计 %d 处 error（遮挡/溢出，零遮挡硬门槛）: %s" % (
                len(layout_errors), "; ".join((f.get("message", "")[:46]) for f in layout_errors[:3])))
        # 帧级检查真实执行（video-qa-frameproof 的帧级部分）：黑帧 blackdetect + 冻结帧 freezedetect
        frame_ev = {"blackdetect": [], "freezedetect": []}
        r = subprocess.run([ff, "-i", final, "-an", "-vf", "blackdetect=d=0.5:pix_th=0.10",
                            "-f", "null", "-"], capture_output=True, text=True, timeout=1800)
        for m in re.finditer(r"black_start:([\d.]+)[^\n]*black_end:([\d.]+)", r.stderr or ""):
            frame_ev["blackdetect"].append({"start": round(float(m.group(1)), 2),
                                            "end": round(float(m.group(2)), 2)})
        r = subprocess.run([ff, "-i", final, "-an", "-vf", "freezedetect=n=0.003:d=3",
                            "-f", "null", "-"], capture_output=True, text=True, timeout=1800)
        fz_start = None
        for line in (r.stderr or "").splitlines():
            m = re.search(r"freeze_start:([\d.]+)", line)
            if m:
                fz_start = float(m.group(1))
            m = re.search(r"freeze_duration:([\d.]+)", line)
            if m and fz_start is not None:
                frame_ev["freezedetect"].append({"start": round(fz_start, 2),
                                                 "duration": round(float(m.group(1)), 2)})
                fz_start = None
        if frame_ev["blackdetect"]:
            issues.append(f"黑帧 {len(frame_ev['blackdetect'])} 段（≥0.5s，帧级检查）: "
                          + str(frame_ev["blackdetect"][:3]))
        if frame_ev["freezedetect"]:
            issues.append(f"冻结帧 {len(frame_ev['freezedetect'])} 段（≥3s，帧级检查）: "
                          + str(frame_ev["freezedetect"][:3]))
        # 内容验收（三验收分离）：数值→图形映射核对必须实际发生并落 receipt，缺失则等编排器补
        if not (receipts.skill_receipts(ctx, "qa", "content-mapping-review")
                or receipts.skill_receipts(ctx, "qa", "qa-content-mapping-review")):
            return StageResult("waiting_for_agent", error=StageError(
                "agent", "缺内容验收 receipt：核对每个数据组件数值→几何映射与轴刻度同基准"
                "（含教学示意标注），然后写 receipts/skills/qa-content-mapping-review-*.json"))
        report = {"duration": fmt.get("duration"), "faststart": faststart,
                  "loudness": loud, "loudness_source": "audio_master.wav" if os.path.exists(master) else "final.mp4", "streams": {"video": (v or {}).get("codec_name"), "audio": (a or {}).get("codec_name")},
                  "pix_fmt": (v or {}).get("pix_fmt"),
                  "layout_audit": {"errors": len(layout_errors),
                                   "messages": [f.get("message", "")[:80] for f in layout_errors[:6]]},
                  "frame_checks": frame_ev,
                  "issues": issues}
        rp = _write(ctx, "5-video-final/qa_report.json", json.dumps(report, ensure_ascii=False, indent=2))
        ctx.rs.register_artifact("qa", rp, "qa-report")
        if issues:
            # 布局/帧级缺陷属于内容不合格 —— 写完报告后必须 failed，不得带病 passed
            return StageResult("failed", data={"issues": issues},
                               error=StageError("permanent", "QA 不达标（布局/帧级）: " + "; ".join(issues)))
        if os.path.exists(master):
            try:
                ctx.rs.register_artifact("qa", master, "audio-master")
            except (ValueError, FileNotFoundError):
                pass
        receipts.write_tool_receipt(ctx, "qa", "ffprobe", [fp, "show_format/show_streams"], 0,
                                    output_paths=["5-video-final/qa_report.json"])
        receipts.write_skill_receipt(ctx, "qa", "video-qa-frameproof", "video_rendered",
                                     ["5-video-final/qa_report.json"], agent_id="paperpipe-auto",
                                     evidence=[f"blackdetect 0 段", f"freezedetect 0 段",
                                               f"layout error 0", f"I={loud.get('input_i')} TP={loud.get('input_tp')}"],
                                     note="技术验收真实执行：流/规格/faststart/响度/布局审计/黑帧/冻结帧；"
                                          "内容验收（数值→图形映射）看 qa-content-mapping-review receipt；"
                                          "观看验收由导演与用户完成（带时间码问题清单）")
        return StageResult("passed", {"checks": ["ffprobe", "streams", "specs", "faststart", "loudness",
                                                 "layout", "blackdetect", "freezedetect"]})

    def check(self, ctx: RuntimeCtx) -> StageResult:
        rep = ctx.out("5-video-final", "qa_report.json")
        if not os.path.exists(rep):
            return StageResult("waiting_for_agent", error=StageError("agent", "qa_report.json 缺失（复验）"))
        try:
            data = json.load(open(rep, encoding="utf-8"))
        except Exception:
            return StageResult("failed", error=StageError("permanent", "qa_report.json 损坏（复验）"))
        if data.get("issues"):
            return StageResult("failed", error=StageError("permanent", "qa_report 含未清 issues（复验）: "
                                                          + "; ".join(map(str, data["issues"][:3]))))
        tprobs = handoff.trace_check(ctx, "render", ["4-video/narration.json"])
        if tprobs:
            return StageResult("failed", error=StageError("permanent", "narration 溯源失败（复验）: "
                                                          + "; ".join(tprobs)))
        if not os.path.exists(ctx.out("4-video", "final.mp4")):
            return StageResult("failed", error=StageError("permanent", "final.mp4 缺失（passed 后被删？复验失败）"))
        return StageResult("passed")

# ════════════════ retrospective（waiting_for_human） ════════════════
class RetroAdapter(Adapter):
    name = "retrospective"
    inputs_spec = ["4-video/final.mp4", "5-video-final/qa_report.json"]
    def check(self, ctx: RuntimeCtx) -> StageResult:
        retro = ctx.out("6-review", "retrospective.md")
        lessons = ctx.out("6-review", "lessons.md")
        if not os.path.exists(retro) or not os.path.exists(lessons):
            return StageResult("waiting_for_human", error=StageError("human", "复盘文件缺失（复验）"))
        rtxt = open(retro, encoding="utf-8").read()
        for ph in ("待人工填写", "（填写）", "__/10"):
            if ph in rtxt:
                return StageResult("failed", error=StageError("permanent", "复盘占位符残留: " + ph + "（复验）"))
        return StageResult("passed")
    def run(self, ctx: RuntimeCtx) -> StageResult:
        tpl_dir = ctx.out("6-review")
        os.makedirs(tpl_dir, exist_ok=True)
        retro = os.path.join(tpl_dir, "retrospective.md")
        if not os.path.exists(retro):
            atomic_write_text(retro, f"""# Retrospective（paperpipe @ {VERSION}）

> 人工/agent 填写。完成后运行 video-retrospective 技能并写 receipt，再 `paperpipe review --confirm`。

## 一句话结论
（填写）
## 六维打分（每项必须填分（≥8）并给证据）
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
        return StageResult("waiting_for_human",
                           error=StageError("human", "复盘模板已生成（waiting_for_human）：填写评分+证据，"
                                            "跑 video-retrospective 技能落 receipt 后 review --confirm"))

# ════════════════ 人审与发布（收紧版） ════════════════
SIX_DIMS = ["解释力", "视觉表现", "音画同步", "技术卫生", "内容密度", "节奏"]
COVER_EXTS = (".png", ".jpg", ".jpeg", ".webp")

def _find_cover(ctx: RuntimeCtx) -> str | None:
    d = ctx.out("5-video-final")
    if not os.path.isdir(d):
        return None
    for fn in sorted(os.listdir(d)):
        if fn.startswith("cover") and fn.lower().endswith(COVER_EXTS):
            return _rel(ctx, os.path.join(d, fn))
    return None

def validate_review(ctx: RuntimeCtx, compare_saved: bool = True) -> tuple[bool, list, dict]:
    """可验证人审门（v2 收紧）：QA passed；复盘六维全部有分且有证据（低分合法但须附整改决定，
    不强制作者给高分）；无占位符；lessons ≥1 条规则；video-retrospective receipt 存在；
    已确认过的哈希与当前产物一致。返回 (ok, problems, hashes)。"""
    problems = []
    from .util import sha256_file
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
    for ph in ("待人工填写", "（填写）", "__/10"):
        if ph in rtxt:
            problems.append(f"复盘仍含占位符: {ph}")
    for dim in SIX_DIMS:
        m = re.search(rf"\|\s*{dim}\s*\|\s*([^|]*)\|\s*([^|]*)\|", rtxt)
        if not m:
            problems.append(f"评分项缺失: {dim}")
            continue
        score, ev = m.group(1).strip(), m.group(2).strip()
        if not re.fullmatch(r"\d+", score):
            problems.append(f"{dim} 评分未填数字")
        elif int(score) < 8 and not re.search(r"整改|退回|拒收|删除|重做", ev):
            # 低分合法（不诱导作者自证合格），但低分项必须带整改决定：退回哪/删哪/怎么改
            problems.append(f"{dim} 评分 {score} < 8 且无整改决定（证据列须写明 整改/退回/拒收/删除/重做）")
        if not ev or ev in ("证据", "—", "-"):
            problems.append(f"{dim} 缺证据")
    rules = [ln for ln in ltxt.splitlines() if re.match(r"^- \[.+?\]", ln)]
    if not rules:
        problems.append("lessons.md 无具体规则（需 ≥1 条 `- [类别] …`）")
    if not any(r.get("status") == "passed" for r in receipts.skill_receipts(ctx, "retrospective", "video-retrospective")):
        problems.append("缺 video-retrospective 技能 receipt（复盘须实际按技能执行）")
    if not problems:
        hashes = {"retrospective": sha256_file(retro),
                  "lessons": sha256_file(lessons),
                  "final": sha256_file(ctx.out("4-video", "final.mp4"))}
        if os.path.exists(ctx.out("5-video-final", "qa_report.json")):
            hashes["qa_report"] = sha256_file(ctx.out("5-video-final", "qa_report.json"))
        # 已生效确认的哈希与当前产物比对：publish 门传 compare_saved=True 强制哈希绑定；
        # review --confirm 传 False —— 重新确认=重建基线（否则旧哈希会永久死锁重确认）
        if compare_saved:
            saved = ctx.rs.data["review"].get("hashes") or {}
            for k, h in hashes.items():
                if saved.get(k) and saved[k] != h:
                    problems.append(f"确认后产物已变更: {k}（重新 review --confirm）")
    return (not problems), problems, hashes

class PublishAdapter(Adapter):
    name = "publish"
    inputs_spec = ["4-video/final.mp4"]
    def check(self, ctx: RuntimeCtx) -> StageResult:
        pub = ctx.rs.data["publish"]
        if pub.get("uploaded") and not pub.get("upload_ready"):
            return StageResult("failed", error=StageError("permanent", "状态矛盾: uploaded 但未 upload_ready（复验）"))
        if pub.get("upload_ready") and not ctx.rs.data["review"].get("confirmed"):
            return StageResult("failed", error=StageError("permanent", "状态矛盾: upload_ready 但 review 未确认（复验）"))
        if pub.get("upload_ready") and not _find_cover(ctx):
            return StageResult("failed", error=StageError("permanent", "封面缺失（passed 后被删？复验）"))
        return StageResult("passed")
    def run(self, ctx: RuntimeCtx) -> StageResult:
        pub = ctx.rs.data["publish"]
        ok, problems, _ = validate_review(ctx)
        if not ctx.rs.data["review"].get("confirmed"):
            problems.append("review 未确认（先 paperpipe review --confirm）")
        cover = _find_cover(ctx)
        if not cover:
            problems.append("封面缺失（paper-video-cover 产物 5-video-final/cover.*）")
        if not ok or problems:
            plan = {"mode": "dry-run", "video": "4-video/final.mp4" if os.path.exists(ctx.out("4-video", "final.mp4")) else None,
                    "cover": cover, "blocked_by": problems}
            _write(ctx, "5-video-final/publish_plan.json", json.dumps(plan, ensure_ascii=False, indent=2))
            return StageResult("waiting_for_human",
                               error=StageError("human", "发布计划已生成；被门禁挡住: " + "; ".join(problems)))
        pub["upload_ready"] = True
        ctx.rs.save()
        cmd = (ctx.cfg.get("publish") or {}).get("command")
        if pub.get("dry_run") or not pub.get("enabled") or not cmd:
            plan = {"mode": "dry-run", "video": "4-video/final.mp4", "cover": cover, "upload_ready": True,
                    "uploader": cmd or "未配置 publish.command（真实上传需要显式接入上传适配器）",
                    "next": f"paperpipe publish --confirm {ctx.rs.data['run_id']}"}
            _write(ctx, "5-video-final/publish_plan.json", json.dumps(plan, ensure_ascii=False, indent=2))
            ctx.rs.register_artifact("publish", ctx.out("5-video-final/publish_plan.json"), "publish-plan")
            return StageResult("passed", {"mode": "dry-run", "note": "未上传；真实上传需 --confirm + publish.command"})
        # 真实上传：执行配置的上传命令，产出回执；失败 → failed_retryable
        pub["uploading"] = True
        ctx.rs.save()
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=7200, cwd=ctx.root)
            receipt = {"ts": utcnow(), "exit": r.returncode,
                       "stdout": r.stdout[-2000:], "stderr": r.stderr[-2000:]}
            _write(ctx, "5-video-final/upload_receipt.json", json.dumps(receipt, ensure_ascii=False, indent=2))
            ctx.rs.register_artifact("publish", ctx.out("5-video-final/upload_receipt.json"), "upload-receipt")
            receipts.write_tool_receipt(ctx, "publish", "upload-command", cmd, r.returncode,
                                        output_paths=["5-video-final/upload_receipt.json"])
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
