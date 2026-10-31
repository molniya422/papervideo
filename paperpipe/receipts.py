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
    """写入技能调用凭据。agent/paperpipe-auto 在真实调用（或按技能政策自动生成默认假设）后调用。"""
    if not registry.is_skill(skill_id):
        raise ValueError(f"skill_id 未注册: {skill_id}（见 paperpipe/registry/skills.yaml）")
    missing = [p for p in output_paths if not os.path.exists(ctx.out(p))]
    if missing:
        raise FileNotFoundError(f"receipt 必需产物不存在: {missing}")
    receipt = {
        "schema": RECEIPT_SCHEMA,
        "kind": "skill",
        "skill_id": skill_id,
        "skill_version": (registry.skills().get(skill_id) or {}).get("version", "1"),
        "stage": stage,
        "trigger": trigger,
        "input_hashes": {p: sha256_file(ctx.out(p)) for p in (input_paths or []) if os.path.exists(ctx.out(p))},
        "output_paths": list(output_paths),
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
                       note: str | None = None) -> str:
    receipt = {"schema": RECEIPT_SCHEMA, "kind": "tool", "tool": tool, "stage": stage,
               "command": command, "exit_code": exit_code, "output_paths": list(output_paths or []),
               "seconds": seconds, "started_at": utcnow(), "finished_at": utcnow(),
               "status": "passed" if exit_code == 0 else "failed", "note": note}
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

# ────────────────────────── 阶段级验证 ──────────────────────────
def verify_stage(ctx, stage: str) -> list:
    """按 contracts.yaml 验证该阶段的技能凭据；返回问题列表（空=通过）。"""
    problems = []
    contract = registry.stage_contract(stage)
    for entry in contract.get("conditional_skills", []) or []:
        sid = entry["skill"]
        optional = bool(entry.get("optional"))
        has_receipt = any(r.get("status") == "passed" for r in skill_receipts(ctx, stage, sid))
        if has_receipt:
            continue
        dec = route_decision(ctx, stage, sid)
        if dec and dec.get("decision") == "skipped" and dec.get("reason"):
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
    return problems
