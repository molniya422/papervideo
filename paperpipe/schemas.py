"""paperpipe.schemas — 产物结构谓词（2026-11-05 体检 Batch 2 谓词化基座）。

contracts.yaml 的 acceptance 是给人读的散文；本模块把可机器判定的部分落成谓词：
  - JSON 产物：结构校验（shots/examples/dataviz/enriched/shot_plan/model_manifest）
  - 文本产物：必填小节 + 占位符黑名单（deep-read / design-intake / brief）
由各阶段 check() 与缓存复验路径统一调用 —— 文件存在 ≠ 内容合格。
原则：零第三方依赖（不引 jsonschema）；v1 历史产物的兼容口在各自规则里显式写明。
"""
from __future__ import annotations
import re

def _num(x) -> bool:
    return isinstance(x, (int, float)) and not isinstance(x, bool)

def _lst(x) -> bool:
    return isinstance(x, list) and len(x) > 0

# ────────────────────── JSON 产物 ──────────────────────
def v_narration(data) -> list:
    p = []
    shots = data.get("shots") if isinstance(data, dict) else None
    if not _lst(shots):
        return ["缺非空 shots 数组（字幕/时间轴不可为空）"]
    total = 0.0
    for i, s in enumerate(shots):
        if not isinstance(s, dict):
            p.append(f"shots[{i}] 非对象"); continue
        if not isinstance(s.get("chapter"), int):
            p.append(f"shots[{i}].chapter 非整数")
        d = s.get("duration")
        if not _num(d) or d <= 0:
            p.append(f"shots[{i}].duration 非正数")
        else:
            total += d
        sents = s.get("sentences")
        if not _lst(sents):
            p.append(f"shots[{i}].sentences 空（每章至少一句字幕）"); continue
        for j, x in enumerate(sents):
            if not isinstance(x, dict):
                p.append(f"shots[{i}].sentences[{j}] 非对象"); continue
            if not str(x.get("text") or "").strip():
                p.append(f"shots[{i}].sentences[{j}].text 空")
            if not _num(x.get("start")) or x["start"] < 0:
                p.append(f"shots[{i}].sentences[{j}].start 非法")
            if not _num(x.get("seconds")) or x["seconds"] <= 0:
                p.append(f"shots[{i}].sentences[{j}].seconds 非法")
    if total <= 0:
        p.append("总时长为 0")
    return p

def v_examples(data) -> list:
    p = []
    items = data.get("examples") if isinstance(data, dict) else data
    if not _lst(items):
        return ["缺非空 examples 数组"]
    for i, e in enumerate(items):
        if not isinstance(e, dict):
            p.append(f"examples[{i}] 非对象"); continue
        if not isinstance(e.get("chapter"), int):
            p.append(f"examples[{i}].chapter 非整数")
        if not str(e.get("mechanism") or "").strip():
            p.append(f"examples[{i}].mechanism 空")
        if len(str(e.get("scene_desc") or "")) < 16:
            p.append(f"examples[{i}].scene_desc 过短（<16 字，空间描述不足）")
        if not str(e.get("narration_text") or "").strip():
            p.append(f"examples[{i}].narration_text 空")
        if not isinstance(e.get("is_3d"), bool):
            p.append(f"examples[{i}].is_3d 非布尔")
        # 3D 豁免留痕谓词（Round 6，WORKFLOW §10.6"缺豁免记录 → figures waiting_for_agent"）：
        # 视频目标下 is_3d=false 的例子必须写明豁免理由（抽象数学等），不得静默降级为表格读数
        if e.get("is_3d") is False and not str(e.get("exempt_reason") or "").strip():
            p.append(f"examples[{i}] is_3d=false 但缺 exempt_reason（3D 豁免必须留痕，"
                     "抽象数学例在 route-decision/规格里写明理由）")
    return p

def v_dataviz(data) -> list:
    items = data if isinstance(data, list) else (
        data.get("specs") or data.get("items") or data.get("components") or data.get("dataviz") or [])
    if not _lst(items):
        return ["缺非空数据组件数组"]
    p = []
    known = {"bars3d", "gauge3d", "heatColumns", "lossSurface", "tubeFromPoints"}
    for i, e in enumerate(items):
        if not isinstance(e, dict):
            p.append(f"dataviz[{i}] 非对象"); continue
        if not isinstance(e.get("chapter"), int):
            p.append(f"dataviz[{i}].chapter 非整数")
        if e.get("component") not in known:
            p.append(f"dataviz[{i}].component 非法: {e.get('component')}")
        if not _lst(e.get("values")):
            p.append(f"dataviz[{i}].values 空")
        # ch18 教训谓词（Round 5）：归一基准必须与轴刻度同基准——原始值 + axis_max 双字段，
        # 禁止按组内最大值预先归一（提示词 data_viz_builder 铁律 2 的机器门）
        am = e.get("axis_max")
        if isinstance(am, bool) or not _num(am) or am <= 0:
            p.append(f"dataviz[{i}].axis_max 缺失或非法（原始值+轴满量程双字段，"
                     "归一基准与轴刻度同基准——ch18 教训）")
    return p

def v_enriched(data) -> list:
    p = []
    scenes = data.get("enriched_scenes") if isinstance(data, dict) else None
    if not _lst(scenes):
        return ["缺非空 enriched_scenes 数组"]
    for i, sc in enumerate(scenes):
        if not isinstance(sc, dict):
            p.append(f"enriched_scenes[{i}] 非对象"); continue
        if not isinstance(sc.get("chapter"), int):
            p.append(f"enriched_scenes[{i}].chapter 非整数")
        cp = sc.get("camera_path")
        if cp is not None:
            if not isinstance(cp, list):
                p.append(f"enriched_scenes[{i}].camera_path 非数组")
            else:
                for j, cue in enumerate(cp):
                    if isinstance(cue, dict) and not _num(cue.get("t")):
                        p.append(f"enriched_scenes[{i}].camera_path[{j}].t 非法")
        if not isinstance(sc.get("style_ref"), (dict, str)):
            p.append(f"enriched_scenes[{i}].style_ref 缺失（风格未落章，spec_enricher 职责）")
    return p

def v_shot_plan(data) -> list:
    p = []
    shots = data.get("shots") if isinstance(data, dict) else None
    if not _lst(shots):
        return ["缺非空 shots 数组（visual_planner 镜头规划）"]
    for i, s in enumerate(shots):
        if not isinstance(s, dict):
            p.append(f"shot_plan.shots[{i}] 非对象"); continue
        if not isinstance(s.get("chapter"), int):
            p.append(f"shot_plan.shots[{i}].chapter 非整数")
        if s.get("verdict") not in ("pass", "retime", "cut", "return"):
            p.append(f"shot_plan.shots[{i}].verdict 非法: {s.get('verdict')}")
    if not isinstance(data.get("pacing"), dict):
        p.append("缺 pacing 裁定段")
    return p

def v_manifest(data) -> list:
    p = []
    scenes = data.get("scenes") if isinstance(data, dict) else None
    if not _lst(scenes):
        return ["缺非空 scenes 数组（model_builder 场景清单）"]
    for i, sc in enumerate(scenes):
        if not isinstance(sc, dict):
            p.append(f"scenes[{i}] 非对象"); continue
        if not isinstance(sc.get("chapter"), int):
            p.append(f"scenes[{i}].chapter 非整数")
        if not (str(sc.get("module_js") or "").strip() or str(sc.get("body_html") or "").strip()):
            p.append(f"scenes[{i}] module_js/body_html 均空")
    if "fidelity" not in data:
        p.append("缺 fidelity 字段（建模精度四项自检，model_builder 职责）")
    elif not isinstance(data["fidelity"], dict):
        p.append("fidelity 非对象")
    else:
        # 精度四项的机器可判部分（Round 4）：①环境反射 ②真接触阴影 ③结构细节≥4
        # （④玻璃/透光件非裸 Box 属逐模型审查，进导演小样/评审，不进通用谓词）
        fid = data["fidelity"]
        if fid.get("envMap") is not True:
            p.append("fidelity.envMap 未置 true（精度①场景挂环境反射）")
        if fid.get("shadows") is not True:
            p.append("fidelity.shadows 未置 true（精度②真接触阴影）")
        dc = fid.get("detailCount")
        if isinstance(dc, bool) or not isinstance(dc, (int, float)) or dc < 4:
            p.append("fidelity.detailCount 缺失或 <4（精度③结构细节≥4处）")
    return p

def v_asset_registry(data) -> list:
    p = []
    assets = data.get("assets") if isinstance(data, dict) else None
    if not isinstance(assets, list) or not assets:
        return ["缺非空 assets 数组"]
    for i, a in enumerate(assets):
        if not isinstance(a, dict):
            p.append(f"assets[{i}] 非对象"); continue
        for k in ("name", "brief", "source", "license", "route"):
            if not str(a.get(k) or "").strip():
                p.append(f"assets[{i}].{k} 缺失")
        if a.get("route") not in ("R1", "R2", "R3"):
            p.append(f"assets[{i}].route 非法: {a.get('route')}")
    return p

JSON_BY_NAME = [
    ("asset_registry.json", v_asset_registry),
    ("narration.json", v_narration), ("examples_spec.json", v_examples),
    ("dataviz_spec.json", v_dataviz), ("enriched_spec.json", v_enriched),
    ("shot_plan.json", v_shot_plan), ("model_manifest.json", v_manifest),
]

def validate_json(path: str, data) -> list:
    for suffix, fn in JSON_BY_NAME:
        if path.endswith(suffix):
            try:
                return fn(data)
            except Exception as e:
                return [f"校验器异常: {e}"]
    return []

# ────────────────────── 文本产物 ──────────────────────
def _sect_follows(txt: str, heading_pat: str, min_len: int = 8) -> bool:
    m = re.search(heading_pat, txt, re.M)
    if not m:
        return False
    rest = txt[m.end():].lstrip()
    return len(rest.splitlines()[0] if rest.splitlines() else "") >= min_len

def v_deep_read(txt: str) -> list:
    p = []
    if "机制点" not in txt:
        p.append("缺机制点清单")
    for bad in ("请按 paper-xray 技能完成", "TODO", "待填写", "待补充"):
        if bad in txt:
            p.append(f"占位符残留: {bad}")
    if txt.count("会怎么坏") < 3:
        p.append(f"『会怎么坏』仅 {txt.count('会怎么坏')} 处（机制点覆盖不足，≥3）")
    return p

def v_design_intake(txt: str) -> list:
    p = []
    if not _sect_follows(txt, r"^#{2,3}[^\n]*风格内核[^\n]*$", 8):
        p.append("缺『风格内核』小节或其内容为空（<8 字）")
    return p

def v_brief(txt: str) -> list:
    p = []
    if "<acceptance>" not in txt:
        p.append("缺 <acceptance> 段")
    for bad in ("待 xray 产出机制点后回填", "TODO", "__/10"):
        if bad in txt:
            p.append(f"占位符残留: {bad}")
    return p

def v_technical_qa(txt: str) -> list:
    p = []
    if "[PASS]" not in txt and "[FAIL]" not in txt:
        p.append("缺 [PASS]/[FAIL] 判定行（每项必须带判定+命令+实测值）")
    if "ffprobe" not in txt and "ffmpeg" not in txt:
        p.append("缺实测命令证据（ffprobe/ffmpeg 原文）")
    return p

def v_visual_qa(txt: str) -> list:
    p = []
    if not re.search(r"\[\d{2}:\d{2}", txt):
        p.append("问题清单缺时间码（每条必须 [mm:ss-ss] 起止）")
    if "误解" not in txt:
        p.append("缺『观众会怎么误解』栏（观看验收核心）")
    return p

def v_asset_brief(txt: str) -> list:
    """资产建模 brief 谓词（model-asset-brief 强制网关）：12 字段小节齐 + 无占位符。"""
    p = []
    need = ["一句话身份", "AI 生成提示词", "三视图 turnaround", "比例数值表", "材质与表面",
            "色彩表", "朝向与坐标", "结构细节清单", "来源策略", "拒绝项", "验收清单", "复用计划"]
    miss = [k for k in need if k not in txt]
    if miss:
        p.append("缺小节: " + ", ".join(miss))
    for bad in ("TODO", "待填写", "待补充", "默认材质", "一只狗", "一个人", "一辆车"):
        if bad in txt:
            p.append(f"占位/笼统残留: {bad}")
    return p

# 注意：asset_brief.md 必须排在 brief.md 之前——validate_text 按 endswith 先到先得
TEXT_BY_NAME = [
    ("asset_brief.md", v_asset_brief),
    ("deep-read.md", v_deep_read), ("design-intake.md", v_design_intake), ("brief.md", v_brief),
    ("technical_qa.md", v_technical_qa), ("visual_qa.md", v_visual_qa),
]

def validate_text(path: str, txt: str) -> list:
    for suffix, fn in TEXT_BY_NAME:
        if path.endswith(suffix):
            return fn(txt or "")
    return []
