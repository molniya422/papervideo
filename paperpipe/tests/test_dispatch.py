"""paperpipe v2 · 调度规划器测试（T9）。

D1 拓扑序：figures 必须 example_writer/data_viz_builder → spec_enricher → model_builder
D2 波次分组：同波次可并行（wave1 两人、wave2 一人、wave3 两人）
D3 next_actionable：初始只有 wave1 可派；wave1 全 passed 后 spec_enricher 可派
D4 blockers：依赖未满足的角色被标 blocked_by
D5 循环依赖检测
D6 system_prompt 注入：request.json 含任务提示词全文
D7 阶段门禁：handoff 未全 passed → waiting_for_agent 且消息含角色名
"""
from __future__ import annotations
import json, os, sys, tempfile, shutil

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from paperpipe import dispatch, handoff, registry
from paperpipe.config import DEFAULTS
from paperpipe.state import RunState
from paperpipe.util import atomic_write_text

PASS, FAIL = 0, 0
def check(name, cond, detail=""):
    global PASS, FAIL
    if cond:
        PASS += 1; print(f"  [OK] {name}")
    else:
        FAIL += 1; print(f"  [FAIL] {name} {detail}")

def make_ctx(tmp):
    rd = os.path.join(tmp, "run")
    rs = RunState.create(rd, "t", "1506.02640", "video", dict(DEFAULTS))
    atomic_write_text(os.path.join(rd, "2-xray/deep-read.md"), "# 深读\n## 机制点\n1. A")
    from paperpipe.adapters import RuntimeCtx
    return RuntimeCtx(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                      rd, dict(DEFAULTS), rs)

def pass_role(ctx, stage, role):
    items = dispatch.plan(stage)
    idx = next(i for i, h in enumerate(items) if h["role"] == role) + 1
    hid = f"{ctx.rs.data['run_id']}-{stage}-{role}-{idx:02d}"
    try:
        if handoff.get_state(ctx, hid) == "passed":
            return hid
    except Exception:
        pass
    h = items[idx - 1]
    handoff.create(ctx, hid, role, stage, h["task"], h.get("input_paths", []))
    handoff.start(ctx, hid)
    ops = [p.replace("<id>", hid) for p in h.get("output_paths", [])]
    for op in ops:
        fp = ctx.out(op)
        os.makedirs(os.path.dirname(fp) or ".", exist_ok=True)
        if not os.path.exists(fp):
            atomic_write_text(fp, json.dumps({"verdict": "pass"}, ensure_ascii=False))
    handoff.submit_response(ctx, hid, {"verdict": "pass"}, ops)
    handoff.verify(ctx, hid)
    return hid

def main():
    tmp = tempfile.mkdtemp(prefix="paperpipe-dispatch-")
    try:
        print("D1 拓扑序")
        order = dispatch.topo_order("figures")
        check("figures 顺序正确",
              order == ["example_writer", "data_viz_builder", "style_director",
                        "spec_enricher", "model_builder", "visual_planner"], str(order))
        check("spec_enricher 在两个创作角色之后、建模之前",
              order.index("spec_enricher") > order.index("example_writer")
              and order.index("spec_enricher") > order.index("data_viz_builder")
              and order.index("spec_enricher") < order.index("model_builder"))

        print("D2 波次分组（同波可并行）")
        ctx = make_ctx(tmp)
        rep = dispatch.report(ctx, "figures")
        check("wave1 = 三个创作角色（可并行）",
              set(rep["waves"][0]) == {"example_writer", "data_viz_builder", "style_director"}, str(rep["waves"]))
        check("wave2 = spec_enricher（串行熔炼）", rep["waves"][1] == ["spec_enricher"], str(rep["waves"]))
        check("wave3 = model_builder + visual_planner", set(rep["waves"][2]) == {"model_builder", "visual_planner"},
              str(rep["waves"]))

        print("D3 next_actionable 随依赖推进")
        check("初始只有 wave1 可派",
              set(dispatch.next_actionable(ctx, "figures")) == {"example_writer", "data_viz_builder", "style_director"},
              str(dispatch.next_actionable(ctx, "figures")))
        pass_role(ctx, "figures", "example_writer")
        check("只 passed 一个创作角色 → 仍剩 data_viz_builder + style_director 可派",
              set(dispatch.next_actionable(ctx, "figures")) == {"data_viz_builder", "style_director"},
              str(dispatch.next_actionable(ctx, "figures")))
        pass_role(ctx, "figures", "data_viz_builder")
        pass_role(ctx, "figures", "style_director")
        check("三个创作角色都 passed → spec_enricher 可派",
              dispatch.next_actionable(ctx, "figures") == ["spec_enricher"],
              str(dispatch.next_actionable(ctx, "figures")))

        print("D4 blockers 标注")
        rep2 = dispatch.report(ctx, "figures")
        check("model_builder 卡在 spec_enricher",
              rep2["blockers"].get("model_builder") == ["spec_enricher"], str(rep2["blockers"]))
        check("visual_planner 卡在 spec_enricher",
              rep2["blockers"].get("visual_planner") == ["spec_enricher"], str(rep2["blockers"]))
        check("spec_enricher 无卡点（依赖已满足）", "spec_enricher" not in rep2["blockers"])

        print("D5 循环依赖检测")
        import paperpipe.registry as R
        orig = R.stage_contract
        R.stage_contract = lambda s: ({"handoff_plan": [
            {"role": "a", "depends_on": ["b"], "task": "", "input_paths": [], "output_paths": []},
            {"role": "b", "depends_on": ["a"], "task": "", "input_paths": [], "output_paths": []},
        ]} if s == "fake" else orig(s))
        try:
            dispatch.topo_order("fake")
            check("循环依赖被拒", False, "未抛异常")
        except ValueError as e:
            check("循环依赖被拒", "循环依赖" in str(e), str(e))
        finally:
            R.stage_contract = orig

        print("D6 system_prompt 注入")
        ctx2 = make_ctx(tmp)
        hid = pass_role(ctx2, "figures", "example_writer")
        req = json.load(open(ctx2.out("handoffs", hid, "request.json"), encoding="utf-8"))
        sp = req.get("system_prompt") or ""
        check("request.json 含提示词全文", len(sp) > 500, f"len={len(sp)}")
        check("提示词含角色身份", "example_writer" in sp)
        check("提示词文件路径已登记", req.get("system_prompt_file") == "prompts/example_writer.md",
              str(req.get("system_prompt_file")))

        print("D7 阶段门禁：handoff 未全 passed → waiting_for_agent")
        ctx3 = make_ctx(tmp)
        ctx3.cfg["render"] = {}
        from paperpipe import runner
        ctx3.rs.stage("acquire")["status"] = "passed"
        ctx3.rs.stage("acquire")["input_hash"] = runner.fingerprint(ctx3, "acquire")
        ctx3.rs.stage("xray")["status"] = "passed"
        atomic_write_text(ctx3.out("3-figures/README.md"), "| 图 | 机制点 | 技能 | 路径 |\n|---|---|---|---|\n| k1 | A | visual-explainer | x.html |")
        res = runner.run_stage(ctx3, "figures")
        check("figures 因 handoff 未完成 → waiting_for_agent", res == "waiting_for_agent", res)
        err = (ctx3.rs.stage("figures")["error"] or {}).get("message", "")
        check("错误消息列明未完成角色（含 blocked_by）", "blocked_by" in err or "pending" in err, err[:120])

    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print(f"\n结果: {PASS} 通过 / {FAIL} 失败")
    sys.exit(1 if FAIL else 0)

if __name__ == "__main__":
    main()
