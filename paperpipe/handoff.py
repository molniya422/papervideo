"""paperpipe.handoff — 子智能体交接信封（任务 4）。

每个 handoff 一个目录：handoffs/<handoff_id>/
  request.json          # 角色、阶段、任务说明、输出要求
  input-manifest.json   # {相对路径: sha256} 输入快照（防止读的过程中输入漂移）
  state.json            # pending → running → waiting_for_review → passed/failed
  response.json         # 子智能体回传（结构化结论，不是自然语言聊天）
  output-manifest.json  # {相对路径: sha256} 产出清单
  failure.json          # 失败原因（failed 时）

纪律：整合方把 response 转成标准产物并写 receipts/agents/<id>.json；
不得把子智能体的自然语言回复直接当阶段通过。
"""
from __future__ import annotations
import json, os, re

from . import registry
from .util import atomic_write_json, utcnow, sha256_file

HANDOFF_SCHEMA = "paperpipe-handoff/1"
STATES = ("pending", "running", "waiting_for_review", "passed", "failed")

def _dir(ctx, handoff_id: str) -> str:
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,63}", handoff_id):
        raise ValueError(f"非法 handoff_id: {handoff_id}")
    d = ctx.out("handoffs", handoff_id)
    os.makedirs(d, exist_ok=True)
    return d

def _manifest(ctx, paths: list) -> dict:
    out = {}
    for p in paths:
        ap = ctx.out(p)
        if os.path.isfile(ap):
            out[p.replace("\\", "/")] = sha256_file(ap)
    return out

def create(ctx, handoff_id: str, role: str, stage: str, task: str,
           input_paths: list, output_requirement: dict | None = None) -> str:
    if role not in registry.agent_roles():
        raise ValueError(f"未注册的子智能体角色: {role}（见 registry/agents.yaml）")
    d = _dir(ctx, handoff_id)
    atomic_write_json(os.path.join(d, "request.json"), {
        "schema": HANDOFF_SCHEMA, "handoff_id": handoff_id, "role": role, "stage": stage,
        "task": task, "output_requirement": output_requirement or {},
        "created_at": utcnow(), "state": "pending"})
    atomic_write_json(os.path.join(d, "input-manifest.json"), _manifest(ctx, input_paths))
    _set_state(d, "pending")
    return os.path.join("handoffs", handoff_id)

def start(ctx, handoff_id: str) -> None:
    d = _dir(ctx, handoff_id)
    _set_state(d, "running")

def submit_response(ctx, handoff_id: str, response: dict, output_paths: list) -> None:
    """子智能体回传结构化结论 + 产出清单；状态转 waiting_for_review（等整合方核验）。"""
    d = _dir(ctx, handoff_id)
    atomic_write_json(os.path.join(d, "response.json"), {
        "schema": HANDOFF_SCHEMA, "handoff_id": handoff_id,
        "response": response, "submitted_at": utcnow()})
    missing = [p for p in output_paths if not os.path.exists(ctx.out(p))]
    if missing:
        fail(ctx, handoff_id, f"声明的产出不存在: {missing}")
        raise FileNotFoundError(f"声明的产出不存在: {missing}")
    atomic_write_json(os.path.join(d, "output-manifest.json"), _manifest(ctx, output_paths))
    _set_state(d, "waiting_for_review")

def fail(ctx, handoff_id: str, reason: str) -> None:
    d = _dir(ctx, handoff_id)
    atomic_write_json(os.path.join(d, "failure.json"), {"reason": reason, "failed_at": utcnow()})
    _set_state(d, "failed")

def verify(ctx, handoff_id: str) -> tuple[bool, list, list]:
    """整合方核验：response 存在、output-manifest 哈希与磁盘一致。
    通过 → 写 receipts/agents/<id>.json，状态 passed。返回 (ok, problems, outputs)。"""
    d = _dir(ctx, handoff_id)
    req = json.load(open(os.path.join(d, "request.json"), encoding="utf-8"))
    problems, outputs = [], []
    resp_p = os.path.join(d, "response.json")
    om_p = os.path.join(d, "output-manifest.json")
    if not os.path.exists(resp_p):
        problems.append("response.json 缺失（子智能体未回传）")
    if not os.path.exists(om_p):
        problems.append("output-manifest.json 缺失")
    if not problems:
        om = json.load(open(om_p, encoding="utf-8"))
        for p, h in om.items():
            ap = ctx.out(p)
            if not os.path.exists(ap):
                problems.append(f"产出缺失: {p}")
            elif sha256_file(ap) != h:
                problems.append(f"产出哈希不符（交接后被改动）: {p}")
            else:
                outputs.append(p)
    if problems:
        return False, problems, outputs
    from .receipts import write_agent_receipt
    write_agent_receipt(ctx, req["stage"], handoff_id, req["role"], outputs,
                        note=f"handoff verified @ {utcnow()}")
    _set_state(d, "passed")
    return True, [], outputs

def get_state(ctx, handoff_id: str) -> str:
    return json.load(open(os.path.join(_dir(ctx, handoff_id), "state.json"), encoding="utf-8"))["state"]

def list_handoffs(ctx) -> list:
    d = ctx.out("handoffs")
    if not os.path.isdir(d):
        return []
    out = []
    for hid in sorted(os.listdir(d)):
        p = os.path.join(d, hid, "state.json")
        if os.path.isfile(p):
            out.append({"handoff_id": hid, "state": json.load(open(p, encoding="utf-8"))["state"]})
    return out

def _set_state(d: str, state: str):
    assert state in STATES, state
    atomic_write_json(os.path.join(d, "state.json"), {"state": state, "updated_at": utcnow()})
