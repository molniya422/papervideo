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
    return p

def v_dataviz(data) -> list:
    items = data if isinstance(data, list) else (
        data.get("specs") or data.get("items") or data.get("components") or [])
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
    return p

JSON_BY_NAME = [
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

TEXT_BY_NAME = [
    ("deep-read.md", v_deep_read), ("design-intake.md", v_design_intake), ("brief.md", v_brief),
    ("technical_qa.md", v_technical_qa), ("visual_qa.md", v_visual_qa),
]

def validate_text(path: str, txt: str) -> list:
    for suffix, fn in TEXT_BY_NAME:
        if path.endswith(suffix):
            return fn(txt or "")
    return []
