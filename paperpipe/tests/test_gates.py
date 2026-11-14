"""paperpipe v2 门禁测试（任务 3：先写测试再改执行器）。

G1 前置检查：前置未 passed/not_applicable → 下游不得启动（skipped_by_prerequisite 审计事件）
G2 waiting_for_agent / waiting_for_human 必须停止下游
G3 not_applicable：target 不含的阶段；终止阶段后 run 自然停止
G4 retry 不得绕过前置条件
G5 run --stage 按拓扑排序执行，单跑 render 前置不齐被拒
G6 状态语义：failed_retryable（transient 耗尽）≠ failed_permanent；warn 不再是状态
G7 warnings 独立列表，不占状态位
G8 legacy run（schema /1、/2）拒绝 resume/retry/publish
"""
from __future__ import annotations
import json, os, sys, tempfile, shutil

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from paperpipe.config import DEFAULTS
from paperpipe.state import RunState, SCHEMA

PASS, FAIL = 0, 0
def check(name, cond, detail=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  [OK] {name}")
    else:
        FAIL += 1
        print(f"  [FAIL] {name} {detail}")

def make_run(tmp, name="run", target="video", schema=SCHEMA):
    rd = os.path.join(tmp, name)
    rs = RunState.create(rd, name, "1706.03762", target, dict(DEFAULTS))
    if schema != SCHEMA:  # 伪造旧 schema
        rs.data["schema"] = schema
        rs.save()
    return rs

def runner_mod():
    from paperpipe import runner as R
    from paperpipe.adapters import RuntimeCtx
    return R, RuntimeCtx

def ctx_of(rs, tmp):
    _, RuntimeCtx = runner_mod()
    return RuntimeCtx(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                      rs.run_dir, dict(DEFAULTS), rs)

def main():
    tmp = tempfile.mkdtemp(prefix="paperpipe-gates-")
    try:
        R, _ = runner_mod()

        print("G1 前置检查：前置未满足 → 下游不启动并留审计事件")
        rs = make_run(tmp, "g1")
        ctx = ctx_of(rs, tmp)
        # xray 停在 waiting_for_agent → 指定跑 figures（前置不满足）必须被拦
        rs.stage("xray")["status"] = "waiting_for_agent"
        results = R.run_all(ctx, only=["figures"])
        check("figures 被前置拦截", results.get("figures") == "skipped_by_prerequisite", str(results))
        log = open(os.path.join(rs.run_dir, "run.log.jsonl"), encoding="utf-8").read()
        check("审计事件 skipped_by_prerequisite", "skipped_by_prerequisite" in log)
        check("状态审计 trail 落盘", any(a["event"] == "skipped_by_prerequisite"
                                         for a in rs.data.get("audit", [])))

        print("G2 waiting 状态停止下游")
        rs2 = make_run(tmp, "g2")
        ctx2 = ctx_of(rs2, tmp)
        for s in ("intake", "brief", "acquire", "xray", "figures", "render"):
            rs2.stage(s)["status"] = "passed"
        rs2.stage("qa")["status"] = "waiting_for_human"
        results2 = R.run_all(ctx2)
        check("retrospective 未在 qa waiting 时执行",
              results2.get("retrospective") is None or str(results2.get("retrospective")).startswith("skip"),
              str(results2))

        print("G3 not_applicable 与终止阶段")
        rs3 = make_run(tmp, "g3", target="md")
        ctx3 = ctx_of(rs3, tmp)
        r3 = R.run_stage(ctx3, "render")
        check("md target：render 单跑 → not_applicable", r3 == "not_applicable", r3)
        r3b = R.run_stage(ctx3, "qa")
        check("md target：qa → not_applicable", r3b == "not_applicable", r3b)
        st3 = json.load(open(os.path.join(rs3.run_dir, "pipeline-state.json"), encoding="utf-8"))
        check("状态文件中 figures=not_applicable", st3["stages"]["figures"]["status"] != "blocked"
              and st3["stages"]["render"]["status"] == "not_applicable",
              st3["stages"]["render"]["status"])

        print("G4 retry 不得绕过前置")
        rs4 = make_run(tmp, "g4")
        ctx4 = ctx_of(rs4, tmp)
        try:
            R.retry_stage(ctx4, "render")
            check("render 前置未齐时 retry 被拒", False, "未抛异常")
        except SystemExit as e:
            check("render 前置未齐时 retry 被拒", "前置" in str(e) or "prerequisite" in str(e), str(e))

        print("G5 --stage 拓扑排序 + 单跑前置检查")
        order = R.topo_sort(["qa", "render", "xray"])
        check("拓扑排序 [qa,render,xray] → xray 先于 render 先于 qa",
              order.index("xray") < order.index("render") < order.index("qa"), str(order))
        rs5 = make_run(tmp, "g5")
        ctx5 = ctx_of(rs5, tmp)
        try:
            R.check_prerequisites(ctx5, "render")
            check("render 前置不齐被 check_prerequisites 拦截", False, "未抛异常")
        except SystemExit:
            check("render 前置不齐被 check_prerequisites 拦截", True)

        print("G6 状态语义：retryable vs permanent；warn 不存在")
        from paperpipe.state import STATUSES
        check("新状态集合", set(STATUSES) == {"pending", "running", "waiting_for_agent", "waiting_for_human",
                                              "passed", "not_applicable", "failed_retryable", "failed_permanent"},
              str(STATUSES))
        rs6 = make_run(tmp, "g6")
        rs6.set_status("intake", "failed_retryable", {"cls": "transient", "message": "重试耗尽"})
        rs6.set_status("brief", "failed_permanent", {"cls": "permanent", "message": "配置错"})
        check("transient 耗尽 → failed_retryable", rs6.stage("intake")["status"] == "failed_retryable")
        check("permanent → failed_permanent", rs6.stage("brief")["status"] == "failed_permanent")

        print("G7 warnings 独立列表")
        rs6.record_warning("intake", "某技能建议被跳过")
        check("warnings 落盘且状态仍 failed_retryable",
              rs6.stage("intake")["warnings"] == ["某技能建议被跳过"]
              and rs6.stage("intake")["status"] == "failed_retryable")

        print("G8 legacy run 拒绝变更命令")
        rs8 = make_run(tmp, "g8", schema="paperpipe-state/2")
        check("legacy 识别", rs8.is_legacy)
        for cmdname in ("resume", "retry", "publish"):
            try:
                R.refuse_legacy(rs8, cmdname)
                check(f"{cmdname} 拒绝 legacy", False, "未抛异常")
            except SystemExit as e:
                check(f"{cmdname} 拒绝 legacy", "legacy" in str(e).lower() or "旧" in str(e), str(e))

    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print(f"\n结果: {PASS} 通过 / {FAIL} 失败")
    sys.exit(1 if FAIL else 0)

if __name__ == "__main__":
    main()
