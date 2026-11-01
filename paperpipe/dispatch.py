"""paperpipe.dispatch — 子智能体调度规划器（调用流程的唯一入口）。

给定一个阶段，回答四个问题：
  1. 这个阶段要派哪些 subagent？（plan）
  2. 按什么顺序派？（topo_order —— depends_on 拓扑排序）
  3. 现在能派谁？（next_actionable —— 依赖已 passed 且自身未 passed）
  4. 卡在谁身上？（blockers —— 依赖未 passed 的角色）

纪律：调度器只读状态与注册表，不写 pipeline-state.json、不创建 handoff。
handoff 信封由 runner 的 ensure_stage_handoffs 创建；调度器只做决策建议。
"""
from __future__ import annotations

import os
from . import handoff, registry


def plan(stage: str) -> list:
    """该阶段的 handoff_plan（含 role/depends_on/task/inputs/outputs/system_prompt）。"""
    return list(registry.stage_contract(stage).get("handoff_plan") or [])


def topo_order(stage: str) -> list:
    """按 depends_on 拓扑排序；同层按 plan 中声明顺序（稳定）。循环依赖 → ValueError。"""
    items = plan(stage)
    by_role = {h["role"]: h for h in items}
    order, seen, visiting = [], set(), set()

    def visit(role: str):
        if role in seen:
            return
        if role in visiting:
            raise ValueError(f"handoff_plan 存在循环依赖: {stage}/{role}")
        visiting.add(role)
        for dep in by_role[role].get("depends_on") or []:
            if dep not in by_role:
                raise ValueError(f"{stage}/{role} 依赖未声明的角色: {dep}")
            visit(dep)
        visiting.discard(role)
        seen.add(role)
        order.append(role)

    for h in items:
        visit(h["role"])
    return order


def _handoff_id(ctx, stage: str, role: str) -> str:
    """按 runner 的命名规则推导 handoff_id。"""
    items = plan(stage)
    idx = next(i for i, h in enumerate(items) if h["role"] == role) + 1
    return f"{ctx.rs.data['run_id']}-{stage}-{role}-{idx:02d}"


def states(ctx, stage: str) -> dict:
    """role -> 状态（passed/running/waiting_for_review/pending/failed/missing）。"""
    out = {}
    for h in plan(stage):
        hid = _handoff_id(ctx, stage, h["role"])
        try:
            out[h["role"]] = handoff.get_state(ctx, hid)
        except (FileNotFoundError, KeyError, ValueError):
            out[h["role"]] = "missing"
    return out


def next_actionable(ctx, stage: str) -> list:
    """现在可以派发的角色：自身非 passed/running，且所有 depends_on 已 passed。"""
    st = states(ctx, stage)
    ready = []
    for h in plan(stage):
        role = h["role"]
        if st.get(role) in ("passed", "running", "waiting_for_review"):
            continue
        deps = h.get("depends_on") or []
        if all(st.get(d) == "passed" for d in deps):
            ready.append(role)
    return ready


def blockers(ctx, stage: str) -> dict:
    """role -> 未满足的依赖列表（仅针对非 passed 的 handoff）。"""
    st = states(ctx, stage)
    out = {}
    for h in plan(stage):
        role = h["role"]
        if st.get(role) == "passed":
            continue
        unmet = [d for d in (h.get("depends_on") or []) if st.get(d) != "passed"]
        if unmet:
            out[role] = unmet
    return out


def report(ctx, stage: str) -> dict:
    """调度报告：顺序、状态、下一步可派、卡点、批次数（同层可并行的组）。"""
    order = topo_order(stage)
    st = states(ctx, stage)
    # 分层（同层 = 可并行）
    items = {h["role"]: h for h in plan(stage)}
    depth = {}
    for role in order:
        deps = items[role].get("depends_on") or []
        depth[role] = 0 if not deps else max(depth[d] + 1 for d in deps)
    waves: dict[int, list] = {}
    for role in order:
        waves.setdefault(depth[role], []).append(role)
    strips = []
    for h in plan(stage):
        rp = registry.agents() and next(
            (a for a in registry.agents() if a["id"] == h["role"]), {})
        strips.append({
            "role": h["role"],
            "depends_on": h.get("depends_on") or [],
            "state": st.get(h["role"], "missing"),
            "system_prompt": (rp or {}).get("system_prompt"),
            "outputs": h.get("output_paths") or [],
        })
    return {
        "stage": stage,
        "order": order,
        "waves": [waves[k] for k in sorted(waves)],
        "states": st,
        "next_actionable": next_actionable(ctx, stage),
        "blockers": blockers(ctx, stage),
        "all_passed": all(v == "passed" for v in st.values()) if st else False,
        "handoffs": strips,
    }


def format_report(rep: dict) -> str:
    """人类可读的调度报告（终端输出）。"""
    lines = [f"stage={rep['stage']}  all_passed={rep['all_passed']}", "派发波次（同波次可并行）:"]
    for i, wave in enumerate(rep["waves"], 1):
        lines.append(f"  wave {i}: {' | '.join(wave)}")
    lines.append("状态:")
    for h in rep["handoffs"]:
        dep = f" ← {', '.join(h['depends_on'])}" if h["depends_on"] else ""
        sp = h["system_prompt"] or "—"
        lines.append(f"  {h['role']:18s} {h['state']:18s} prompt={sp}{dep}")
    if rep["next_actionable"]:
        lines.append("现在可派: " + ", ".join(rep["next_actionable"]))
    if rep["blockers"]:
        lines.append("卡在: " + "; ".join(f"{r}←{','.join(d)}" for r, d in rep["blockers"].items()))
    return "\n".join(lines)
