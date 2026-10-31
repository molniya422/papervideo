"""paperpipe v2 handoff 交接测试（批次 4）。

H1 create → request + input-manifest 落盘，状态 pending
H2 状态流 pending → running → waiting_for_review
H3 submit_response + verify → receipts/agents/<id>.json，状态 passed，哈希一致
H4 产出哈希被改动 → verify 失败
H5 fail → failure.json + 状态 failed
H6 未注册角色拒绝
H7 未注册的 handoff_id 字符拒绝（路径安全）
"""
from __future__ import annotations
import json, os, sys, tempfile, shutil

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from paperpipe import handoff
from paperpipe.config import DEFAULTS
from paperpipe.state import RunState
from paperpipe.util import atomic_write_text

PASS, FAIL = 0, 0
def check(name, cond, detail=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  [OK] {name}")
    else:
        FAIL += 1
        print(f"  [FAIL] {name} {detail}")

def make_ctx(tmp):
    rd = os.path.join(tmp, "run")
    rs = RunState.create(rd, "t", "1706.03762", "video", dict(DEFAULTS))
    atomic_write_text(os.path.join(rd, "2-xray/deep-read.md"), "输入快照内容")
    from paperpipe.adapters import RuntimeCtx
    return RuntimeCtx(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                      rd, dict(DEFAULTS), rs)

def main():
    tmp = tempfile.mkdtemp(prefix="paperpipe-handoff-")
    try:
        print("H1 create 落盘")
        ctx = make_ctx(tmp)
        rel = handoff.create(ctx, "t-xray-fc1", "fact_checker", "xray",
                             "核对 deep-read 数字与公式", ["2-xray/deep-read.md"],
                             {"output": "handoffs/t-xray-fc1/response.json"})
        check("request.json 存在", os.path.exists(ctx.out(rel, "request.json")))
        im = json.load(open(ctx.out(rel, "input-manifest.json"), encoding="utf-8"))
        check("input-manifest 有哈希", "2-xray/deep-read.md" in im and len(im["2-xray/deep-read.md"]) == 64, str(im))
        check("初始状态 pending", handoff.get_state(ctx, "t-xray-fc1") == "pending")

        print("H2 状态流")
        handoff.start(ctx, "t-xray-fc1")
        check("running", handoff.get_state(ctx, "t-xray-fc1") == "running")
        atomic_write_text(ctx.out("2-xray/fact-check-report.json"),
                          json.dumps({"corrections": []}, ensure_ascii=False))
        handoff.submit_response(ctx, "t-xray-fc1",
                                {"verdict": "15/20 正确, 5 处修正", "corrections": []},
                                ["2-xray/fact-check-report.json"])
        check("waiting_for_review", handoff.get_state(ctx, "t-xray-fc1") == "waiting_for_review")

        print("H3 verify → agent receipt")
        ok, problems, outputs = handoff.verify(ctx, "t-xray-fc1")
        check("verify 通过", ok and not problems, str(problems))
        check("状态 passed", handoff.get_state(ctx, "t-xray-fc1") == "passed")
        rp = ctx.out("receipts", "agents", "t-xray-fc1.json")
        check("agent receipt 落盘", os.path.exists(rp))
        rj = json.load(open(rp, encoding="utf-8"))
        check("receipt 指向产出", rj["output_paths"] == ["2-xray/fact-check-report.json"], str(rj))

        print("H4 哈希被改动 → 失败")
        rel2 = handoff.create(ctx, "t-xray-fc2", "fact_checker", "xray", "again", ["2-xray/deep-read.md"])
        handoff.start(ctx, "t-xray-fc2")
        handoff.submit_response(ctx, "t-xray-fc2", {"v": 1}, ["2-xray/fact-check-report.json"])
        # manifest 已定，产出随后被改 → verify 必须识别
        atomic_write_text(ctx.out("2-xray/fact-check-report.json"), '{"corrections": ["被改"]}')
        ok2, problems2, _ = handoff.verify(ctx, "t-xray-fc2")
        check("改动后哈希不符被拒", not ok2 and any("哈希" in p for p in problems2), str(problems2))

        print("H5 fail 路径")
        handoff.fail(ctx, "t-xray-fc2", "上游输入被替换")
        check("failed 状态", handoff.get_state(ctx, "t-xray-fc2") == "failed")
        check("failure.json", os.path.exists(ctx.out("handoffs", "t-xray-fc2", "failure.json")))

        print("H6/H7 非法输入")
        try:
            handoff.create(ctx, "t-bad1", "ghost_role", "xray", "t", [])
            check("未注册角色被拒", False, "未抛异常")
        except ValueError:
            check("未注册角色被拒", True)
        try:
            handoff.create(ctx, "../evil", "fact_checker", "xray", "t", [])
            check("路径穿越被拒", False, "未抛异常")
        except ValueError:
            check("路径穿越被拒", True)

        print("H8 list_handoffs")
        ls = handoff.list_handoffs(ctx)
        check("清点 2 个 handoff", len(ls) == 2 and all("state" in x for x in ls), str(ls))

    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print(f"\n结果: {PASS} 通过 / {FAIL} 失败")
    sys.exit(1 if FAIL else 0)

if __name__ == "__main__":
    main()
