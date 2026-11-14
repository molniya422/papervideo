"""paperpipe.receipts — 机器可验证的调用凭据。

每次 skill / tool / agent 调用落一份 JSON receipt；阶段通过前 verify_stage() 验证：
  - receipt 存在且 schema 合法；
  - skill_id 在注册表（registry.skills.yaml）中；
  - 必需产物（output_paths）文件存在；
  - 条件技能（optional）没有 receipt 时必须有 route-decision（含理由）；
  - 非条件技能缺 receipt → 阶段不得 passed。

目录约定：
  receipts/skills/<stage>-<skill_id>-<n>.json
  receipts/tools/<stage>-<tool>-<n>.json
  receipts/agents/<handoff_id>.json
  receipts/route-decisions.json   # 路由器记录"选了什么/为什么跳过"
"""
from __future__ import annotations
import json, os, re

from . import registry
from .util import atomic_write_json, utcnow, sha256_file

RECEIPT_SCHEMA = "paperpipe-receipt/1"
ROUTE_DECISIONS = os.path.join("receipts", "route-decisions.json")

def _receipt_path(ctx, kind: str, stage: str, subject: str) -> str:
    d = ctx.out("receipts", kind)
    os.makedirs(d, exist_ok=True)
    n = 1
    pat = re.compile(rf"^{re.escape(stage)}-{re.escape(subject)}-(\d+)\.json$")
    for fn in os.listdir(d):
        if pat.match(fn):
            n = max(n, int(pat.match(fn).group(1)) + 1)
    return os.path.join(d, f"{stage}-{subject}-{n}.json")

def _rel(ctx, p: str) -> str:
    return os.path.relpath(os.path.realpath(p), os.path.realpath(ctx.run_dir)).replace("\\", "/")

def write_skill_receipt(ctx, stage: str, skill_id: str, trigger: str, output_paths: list,
                        evidence: list | None = None, agent_id: str | None = None,
                        input_paths: list | None = None, status: str = "passed",
                        note: str | None = None) -> str:
    """写入技能调用凭据。agent/paperpipe-auto 在真实调用（或按技能政策自动生成默认假设）后调用。
    产物路径必须为运行目录相对（绝对/越界在写凭据前即拒——Round 7 加固）。"""
    from .util import safe_rel_path
    if not registry.is_skill(skill_id):
        raise ValueError(f"skill_id 未注册: {skill_id}（见 paperpipe/registry/skills.yaml）")
    rels = [safe_rel_path(ctx.run_dir, p) for p in (output_paths or [])]
    input_paths = [safe_rel_path(ctx.run_dir, p) for p in (input_paths or [])]
    missing = [p for p in rels if not os.path.exists(ctx.out(p))]
    if missing:
        raise FileNotFoundError(f"receipt 必需产物不存在: {missing}")
    receipt = {
        "schema": RECEIPT_SCHEMA,
        "kind": "skill",
        "skill_id": skill_id,
        "skill_version": (registry.skills().get(skill_id) or {}).get("version", "1"),
        "stage": stage,
        "trigger": trigger,
        "input_hashes": {p: sha256_file(ctx.out(p)) for p in input_paths if os.path.exists(ctx.out(p))},
        "output_paths": rels,
        "agent_id": agent_id or "orchestrator",
        "started_at": utcnow(),
        "finished_at": utcnow(),
        "status": status,
        "note": note,
        "evidence": list(evidence or output_paths),
    }
    p = _receipt_path(ctx, "skills", stage, skill_id)
    atomic_write_json(p, receipt)
    ctx.rs.register_artifact(stage, p, "skill-receipt")
    return _rel(ctx, p)

def write_tool_receipt(ctx, stage: str, tool: str, command: list, exit_code: int,
                       output_paths: list | None = None, seconds: float | None = None,
                       note: str | None = None, extra: dict | None = None) -> str:
    receipt = {"schema": RECEIPT_SCHEMA, "kind": "tool", "tool": tool, "stage": stage,
               "command": command, "exit_code": exit_code, "output_paths": list(output_paths or []),
               "seconds": seconds, "started_at": utcnow(), "finished_at": utcnow(),
               "status": "passed" if exit_code == 0 else "failed", "note": note}
    if extra:
        receipt.update(extra)
    p = _receipt_path(ctx, "tools", stage, re.sub(r"[^\w.-]", "_", tool))
    atomic_write_json(p, receipt)
    ctx.rs.register_artifact(stage, p, "tool-receipt")
    return _rel(ctx, p)

def write_agent_receipt(ctx, stage: str, handoff_id: str, role: str, output_paths: list,
                        status: str = "passed", note: str | None = None) -> str:
    d = ctx.out("receipts", "agents")
    os.makedirs(d, exist_ok=True)
    receipt = {"schema": RECEIPT_SCHEMA, "kind": "agent", "agent_id": handoff_id, "role": role,
               "stage": stage, "output_paths": list(output_paths), "status": status,
               "finished_at": utcnow(), "note": note}
    p = os.path.join(d, f"{handoff_id}.json")
    atomic_write_json(p, receipt)
    ctx.rs.register_artifact(stage, p, "agent-receipt")
    return _rel(ctx, p)

# ────────────────────────── route decisions ──────────────────────────
def _decisions_path(ctx) -> str:
    return ctx.out(ROUTE_DECISIONS)

def record_route_decision(ctx, stage: str, skill_id: str, decision: str, reason: str,
                          decided_by: str = "router"):
    """decision: chosen | skipped。条件技能未调用时必须有 skipped+理由。"""
    if decision not in ("chosen", "skipped"):
        raise ValueError(decision)
    if not registry.is_skill(skill_id):
        raise ValueError(f"skill_id 未注册: {skill_id}")
    p = _decisions_path(ctx)
    data = {"schema": "paperpipe-route-decisions/1", "decisions": []}
    if os.path.exists(p):
        data = json.load(open(p, encoding="utf-8"))
    data["decisions"] = [d for d in data["decisions"]
                         if not (d["stage"] == stage and d["skill_id"] == skill_id)]
    data["decisions"].append({"stage": stage, "skill_id": skill_id, "decision": decision,
                              "reason": reason, "decided_by": decided_by, "decided_at": utcnow()})
    atomic_write_json(p, data)

def route_decision(ctx, stage: str, skill_id: str) -> dict | None:
    p = _decisions_path(ctx)
    if not os.path.exists(p):
        return None
    data = json.load(open(p, encoding="utf-8"))
    return next((d for d in data.get("decisions", [])
                 if d["stage"] == stage and d["skill_id"] == skill_id), None)

def skill_receipts(ctx, stage: str, skill_id: str) -> list:
    d = ctx.out("receipts", "skills")
    if not os.path.isdir(d):
        return []
    pat = re.compile(rf"^{re.escape(stage)}-{re.escape(skill_id)}-(\d+)\.json$")
    out = []
    for fn in sorted(os.listdir(d)):
        if pat.match(fn):
            out.append(json.load(open(os.path.join(d, fn), encoding="utf-8")))
    return out

# ────────────────────────── 触发条件求值（Round 4：条件触发从散文变机器可判） ──────────────────────────
def evaluate_trigger(ctx, expr) -> bool:
    """求值 contracts 条件技能的 trigger_when 表达式（全部原子满足才触发）。
    原子语法见 registry.parse_trigger；未知原子/语法错抛 ValueError（fail-closed，
    由 verify_stage 转成问题暴露——写错谓词必须修，不能静默放行）。"""
    from .util import source_kind
    for atom in registry.parse_trigger(expr):
        if atom == "always":
            continue
        if atom == "video_target":
            # 有视频交付目标 = target 含 render 阶段（md/figures 不触发"视频目标"类条件技能）
            from . import registry as _rg
            if "render" not in _rg.target_stages(ctx.rs.data.get("target", "")):
                return False
            continue
        if atom == "physics_sim":
            # 物理模拟声明：enriched_spec 任一场景 physics_sim truthy（声明的 spec 本身受溯源锁定）
            hit = False
            ep = ctx.out("3-figures", "enriched_spec.json")
            if os.path.exists(ep):
                try:
                    data = json.load(open(ep, encoding="utf-8"))
                    hit = any(bool(sc.get("physics_sim")) for sc in (data.get("enriched_scenes") or [])
                              if isinstance(sc, dict))
                except Exception:
                    hit = False
            if not hit:
                return False
            continue
        if atom.startswith("cfg:"):
            dotted, _, want = atom[4:].partition("=")
            node = ctx.cfg
            for part in dotted.split("."):
                node = node.get(part) if isinstance(node, dict) else None
                if node is None:
                    break
            if isinstance(want, str) and want.lower() in ("true", "false"):
                hit = node is (want.lower() == "true")
            elif re.fullmatch(r"-?\d+(\.\d+)?", want):
                hit = node == (float(want) if "." in want else int(want))
            else:
                hit = node == want
        else:
            neg = "!=" in atom
            key, val = atom.split("!=", 1) if neg else atom.split("=", 1)
            if key == "input":
                eq = source_kind(ctx.rs.data.get("source", "")) == val
            elif key == "route":
                eq = str(ctx.cfg.get("route", "")) == val
            elif key == "target":
                eq = ctx.rs.data.get("target") == val
            elif key == "file":
                eq = os.path.exists(ctx.out(val))
            else:
                raise ValueError(f"trigger_when 原子不可求值: {atom}")
            hit = (not eq) if neg else eq
        if not hit:
            return False
    return True

def verify_stage(ctx, stage: str) -> list:
    """按 contracts.yaml 验证该阶段的技能凭据；返回问题列表（空=通过）。
    trigger_when 存在时先求值：未触发 → 不要求凭据（Round 4 前"条件触发"只实现了一半，
    所有条件技能不分触发与否一律要凭据）；语法错 fail-closed 暴露。"""
    problems = []
    contract = registry.stage_contract(stage)
    for entry in contract.get("conditional_skills", []) or []:
        sid = entry["skill"]
        optional = bool(entry.get("optional"))
        tw = entry.get("trigger_when")
        if tw:
            try:
                fired = evaluate_trigger(ctx, tw)
            except ValueError as ve:
                problems.append(f"{sid} trigger_when 求值失败（修 contracts）: {ve}")
                continue
            if not fired:
                continue    # 触发条件不成立：不要求凭据，也不要求决策
        has_receipt = any(r.get("status") == "passed" for r in skill_receipts(ctx, stage, sid))
        if has_receipt:
            continue
        dec = route_decision(ctx, stage, sid)
        if dec and dec.get("decision") == "skipped" and dec.get("reason"):
            if entry.get("hard"):
                problems.append(f"硬触发技能 {sid} 不接受 route-decision 豁免（contracts hard:true）——"
                                f"必须真实产出并写 receipt: {entry.get('required_output')}")
            continue
        if optional:
            problems.append(f"条件技能 {sid}（触发: {entry.get('trigger')}）缺 receipt 且无 route-decision 理由")
        else:
            problems.append(f"技能 {sid} 缺调用凭据（触发: {entry.get('trigger')}；"
                            f"产物: {entry.get('required_output')}）")
    # 产物存在性：receipt 声称的 output_paths 必须真实存在
    d = ctx.out("receipts", "skills")
    if os.path.isdir(d):
        for fn in sorted(os.listdir(d)):
            if not fn.startswith(f"{stage}-"):
                continue
            r = json.load(open(os.path.join(d, fn), encoding="utf-8"))
            for op in r.get("output_paths", []):
                if not os.path.exists(ctx.out(op)):
                    problems.append(f"receipt {fn} 声称的产物缺失: {op}")
            # input_hashes 重验（体检 P1-4）：凭据所依据的输入被改 → 凭据失效
            for ip, ih in (r.get("input_hashes") or {}).items():
                ipf = ctx.out(ip)
                if not os.path.exists(ipf):
                    problems.append(f"receipt {fn} 的输入已不存在: {ip}")
                elif sha256_file(ipf) != ih:
                    problems.append(f"receipt {fn} 的输入已变更（凭据过期）: {ip}——重跑该技能再 resume")
    return problems

_REQ_TOKEN = re.compile(r"([\w./\-*,<>{}]+\.(?:json|md|mp4|png|html|wav))")

def _required_globs(req: str) -> list:
    """从 required_output 散文提取 (glob, 最少命中数)。
    占位符归一（Round 4 修复：此前 <chapter> / {entity,mechanism,data} 会提取出
    "/frame_*.png" 或 "data}.png" 这类坏路径，已触发即误报缺产物）：
      {a,b,c} → * 且最少命中 = 组内元素数；<chapter> / <x> → *。"""
    out = []
    for tok in _REQ_TOKEN.findall(req or ""):
        if tok.startswith("receipts/"):
            continue
        min_hits = 1
        m = re.match(r"^(.*?)\{([^{}]*)\}(.*)$", tok)
        if m:
            names = [g.strip() for g in m.group(2).split(",") if g.strip()]
            tok = (m.group(1) or "") + "*" + (m.group(3) or "")
            min_hits = max(1, len(names))
        tok = re.sub(r"<[^<>]+>", "*", tok)   # <chapter>/<asset>/<x> → 占位符整体归一（"*asset*" 曾匹配不到 dog.md）
        out.append((tok, min_hits))
    return out

def verify_chosen_artifacts(ctx, stage: str) -> list:
    """Round 2 通用谓词：条件技能已触发（passed receipt）→ required_output 必须真实存在。
    Round 4：占位符归一（见 _required_globs）；{a,b,c} 组占位按组内元素数要求最少命中。"""
    import glob as _g
    problems = []
    for entry in registry.stage_contract(stage).get("conditional_skills", []) or []:
        sid = entry["skill"]
        if not any(r.get("status") == "passed" for r in skill_receipts(ctx, stage, sid)):
            continue
        for token, min_hits in _required_globs(entry.get("required_output") or ""):
            full = ctx.out(token)
            hits = _g.glob(full, recursive=True) if any(c in token for c in "*?[") else (
                [full] if os.path.exists(full) else [])
            if len(hits) < min_hits:
                need = "" if min_hits <= 1 else f"（≥{min_hits} 个）"
                problems.append(f"{sid} 已触发但产物缺失{need}: {token}")
    return problems

# 已触发技能的 brief 落点谓词（acceptance 散文中可机器判定的部分，Round 4）：
# skill → (brief.md 必含小节标题, 最少条目数)
BRIEF_SECTION_PROBES = {
    "video-production-guide": ("指南要点摘录", 5),   # ≥5 条影响本片的要点
    "design-taste-frontend": ("审美清单", 3),        # 拒绝模板脸的落点
    "motion-doctrine": ("动效法则", 3),              # Vector Law 等读后摘要
}

def _section_items(txt: str, heading: str) -> int:
    """brief 中 heading 小节下的条目数（列表行）；到下一个标题为止；无小节 = 0。"""
    m = re.search(rf"^#+[^\n]*{re.escape(heading)}[^\n]*$", txt, re.M)
    if not m:
        return 0
    n = 0
    for ln in txt[m.end():].splitlines():
        if re.match(r"^#{1,6}\s", ln):
            break
        if re.match(r"^\s*(?:[-*•·]|\d+[.、)])\s*\S", ln):
            n += 1
    return n

def verify_triggered_acceptance(ctx, stage: str) -> list:
    """已触发（passed receipt）技能的 brief 落点谓词：BRIEF_SECTION_PROBES 声明的小节
    必须在 0-brief/brief.md 实际存在且条目数达标——"读了技能"必须留下可检查的痕迹。"""
    problems = []
    brief = ctx.out("0-brief", "brief.md")
    txt = open(brief, encoding="utf-8").read() if os.path.exists(brief) else ""
    for entry in registry.stage_contract(stage).get("conditional_skills", []) or []:
        sid = entry["skill"]
        if not any(r.get("status") == "passed" for r in skill_receipts(ctx, stage, sid)):
            continue
        spec = BRIEF_SECTION_PROBES.get(sid)
        if not spec:
            continue
        heading, min_items = spec
        n = _section_items(txt, heading)
        if n < min_items:
            problems.append(f"{sid} 已触发但 brief.md 缺『{heading}』小节或条目不足"
                            f"（现 {n}，需 ≥{min_items}）")
    return problems

def list_tool_receipts(ctx, stage: str, tool: str) -> list:
    """列出某阶段某工具的全部 tool receipt（供幂等缓存判断）。"""
    d = ctx.out("receipts", "tools")
    if not os.path.isdir(d):
        return []
    import re as _re
    pat = _re.compile(rf"^{re.escape(stage)}-{re.escape(tool)}-(\d+)\.json$")
    out = []
    for fn in sorted(os.listdir(d)):
        if pat.match(fn):
            out.append(json.load(open(os.path.join(d, fn), encoding="utf-8")))
    return out
