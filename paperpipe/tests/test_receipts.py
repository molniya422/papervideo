"""paperpipe v2 receipt 凭据测试（批次 3）。

R1 写入+验证闭环：write_skill_receipt → verify_stage 通过
R2 字符串匹配不再被接受：brief 提及技能名但无 receipt → verify_stage 仍报缺失
R3 receipt 声称的产物缺失 → 验证失败
R4 条件技能：optional 技能有 route-decision(skipped+理由) → 通过；两者都无 → 失败
R5 未注册 skill_id 拒绝写入
R6 非条件技能缺 receipt → 阶段不能 passed（runner 集成）
R7 route-decision 合法性（decision 枚举 / skill_id 注册）
"""
from __future__ import annotations
import json, os, sys, tempfile, shutil

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from paperpipe import receipts
from paperpipe.config import DEFAULTS
from paperpipe.state import RunState


def _pass_handoffs(ctx, stage):
    """测试辅助：创建并直通该阶段全部 handoff（跳过子智能体执行）。"""
    from paperpipe import handoff as _ho
    from paperpipe import registry as _reg
    plan = _reg.stage_contract(stage).get("handoff_plan") or []
    rid = ctx.rs.data["run_id"]
    for i, h in enumerate(plan):
        hid = f"{rid}-{stage}-{h['role']}-{i + 1:02d}"
        try:
            if _ho.get_state(ctx, hid) == "passed":
                continue
        except Exception:
            pass
        _ho.create(ctx, hid, h["role"], stage, h["task"], h.get("input_paths", []))
        _ho.start(ctx, hid)
        ops = [p.replace("<id>", hid) for p in h.get("output_paths", [])]
        for op in ops:
            fp = ctx.out(op)
            os.makedirs(os.path.dirname(fp) or ".", exist_ok=True)
            if not os.path.exists(fp):
                from paperpipe.util import atomic_write_text as _awt
                _awt(fp, json.dumps({"verdict": "pass"}, ensure_ascii=False))
        _ho.submit_response(ctx, hid, {"verdict": "pass", "corrections": []}, ops)
        _ho.verify(ctx, hid)

PASS, FAIL = 0, 0
def check(name, cond, detail=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  [OK] {name}")
    else:
        FAIL += 1
        print(f"  [FAIL] {name} {detail}")

_N = [0]
def make_ctx(tmp, files=None):
    _N[0] += 1
    rd = os.path.join(tmp, f"run{_N[0]}")
    rs = RunState.create(rd, "t", "1706.03762", "video", dict(DEFAULTS))
    for rel, content in (files or {}).items():
        p = os.path.join(rd, rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        if isinstance(content, bytes):
            open(p, "wb").write(content)
        else:
            from paperpipe.util import atomic_write_text
            atomic_write_text(p, content)
    from paperpipe.adapters import RuntimeCtx
    return RuntimeCtx(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                      rd, dict(DEFAULTS), rs)

def main():
    tmp = tempfile.mkdtemp(prefix="paperpipe-receipts-")
    try:
        from paperpipe.util import atomic_write_text
        print("R1 写入+验证闭环")
        ctx = make_ctx(tmp, {"2-xray/deep-read.md": "# 深度解读\n## 机制点\n1. 机制A——它会怎么坏：条件不满足时失效。\n2. B——它会怎么坏：参数越界时失效。\n3. C——它会怎么坏：分布偏移时失效。\n"})
        p = receipts.write_skill_receipt(ctx, "xray", "paper-xray", "paper_facts_needed",
                                         ["2-xray/deep-read.md"], agent_id="fact-checker-01")
        check("receipt 落盘", os.path.exists(os.path.join(ctx.run_dir, p)))
        problems = receipts.verify_stage(ctx, "xray")
        check("verify_stage 通过", problems == [], str(problems))
        r = receipts.skill_receipts(ctx, "xray", "paper-xray")[0]
        check("receipt 字段齐全", r["schema"] == "paperpipe-receipt/1" and r["agent_id"] == "fact-checker-01"
              and r["output_paths"] == ["2-xray/deep-read.md"] and r["status"] == "passed", json.dumps(r, ensure_ascii=False)[:200])

        print("R2 字符串匹配不再被接受")
        ctx2 = make_ctx(tmp, {"2-xray/deep-read.md": "补全完成（提到 paper-xray 这个词）"})
        problems2 = receipts.verify_stage(ctx2, "xray")
        check("deep-read 提及技能名 ≠ 调用凭据", any("paper-xray" in p for p in problems2), str(problems2))

        print("R3 receipt 产物缺失（写入侧硬拒 + 验证侧兜底）")
        ctx3 = make_ctx(tmp)
        try:
            receipts.write_skill_receipt(ctx3, "xray", "paper-xray", "trigger", ["2-xray/nonexistent.md"])
            check("write 拒绝声称不存在的产物", False, "未抛异常")
        except FileNotFoundError:
            check("write 拒绝声称不存在的产物", True)
        # 兜底：磁盘上的 receipt 被篡改 output_paths → verify_stage 必须识别
        os.makedirs(ctx3.out("2-xray"), exist_ok=True)
        atomic_write_text(ctx3.out("2-xray/real.md"), "真产物")
        rp = receipts.write_skill_receipt(ctx3, "xray", "paper-xray", "trigger", ["2-xray/real.md"])
        full = ctx3.out(rp)
        rj = json.load(open(full, encoding="utf-8"))
        rj["output_paths"].append("2-xray/ghost.md")
        atomic_write_text(full, json.dumps(rj, ensure_ascii=False))
        problems3 = receipts.verify_stage(ctx3, "xray")
        check("被篡改的产物声称被识别", any("ghost.md" in p for p in problems3), str(problems3))

        print("R4 条件技能：route-decision 替代 receipt")
        ctx4 = make_ctx(tmp, {"3-figures/README.md": "| 图1 | 机制A | flowchart | 3-figures/a.html |"})
        problems4 = receipts.verify_stage(ctx4, "figures")
        check("多个条件技能缺凭据被列出", sum(1 for p in problems4 if "route-decision" in p or "缺" in p) >= 5,
              str(problems4))
        receipts.record_route_decision(ctx4, "figures", "visual-explainer", "skipped",
                                       "内容形态为 AI/ML 模型 → 选 flowchart；通用图解不需要")
        receipts.record_route_decision(ctx4, "figures", "dynamic-archify", "skipped", "无工程架构内容")
        problems4b = receipts.verify_stage(ctx4, "figures")
        check("visual-explainer/dynamic-archify 凭 route-decision 豁免",
              not any("visual-explainer" in p or "dynamic-archify" in p for p in problems4b), str(problems4b))

        print("R5 未注册 skill_id 拒绝")
        ctx5 = make_ctx(tmp, {"x.txt": "x"})
        try:
            receipts.write_skill_receipt(ctx5, "qa", "not-a-skill", "t", ["x.txt"])
            check("未注册 skill_id 被拒", False, "未抛异常")
        except ValueError as e:
            check("未注册 skill_id 被拒", "未注册" in str(e), str(e))

        print("R6 runner 集成：缺 receipt → waiting_for_agent 不 passed")
        from paperpipe import runner
        ctx6 = make_ctx(tmp, {"2-xray/deep-read.md": "# 深度解读\n## 机制点\n1. 机制A——它会怎么坏：条件不满足时失效。\n2. B——它会怎么坏：参数越界时失效。\n3. C——它会怎么坏：分布偏移时失效。\n"})
        ctx6.rs.stage("acquire")["status"] = "passed"
        ctx6.rs.stage("acquire")["input_hash"] = runner.fingerprint(ctx6, "acquire")
        _pass_handoffs(ctx6, "xray")
        res6 = runner.run_stage(ctx6, "xray")
        check("deep-read 完成但无 paper-xray receipt → waiting_for_agent",
              res6 == "waiting_for_agent", res6)
        receipts.write_skill_receipt(ctx6, "xray", "paper-xray", "paper_facts_needed",
                                     ["2-xray/deep-read.md"], agent_id="fact-checker-01")
        res6b = runner.run_stage(ctx6, "xray")
        check("补 receipt 后 → passed", res6b == "passed", res6b)

        print("R7 route-decision 合法性")
        try:
            receipts.record_route_decision(ctx4, "figures", "flowchart", "maybe", "理由")
            check("非法 decision 被拒", False, "未抛异常")
        except ValueError:
            check("非法 decision 被拒", True)
        try:
            receipts.record_route_decision(ctx4, "figures", "ghost-skill", "skipped", "理由")
            check("未注册 skill 的 decision 被拒", False, "未抛异常")
        except ValueError:
            check("未注册 skill 的 decision 被拒", True)

    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print(f"\n结果: {PASS} 通过 / {FAIL} 失败")
    sys.exit(1 if FAIL else 0)

if __name__ == "__main__":
    main()
