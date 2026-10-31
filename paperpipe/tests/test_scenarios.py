"""paperpipe v2 · 14 场景端到端验收（python -X utf8 -m paperpipe.tests.test_scenarios）。

S1 只要论文解读          S2 只画机制图          S3 快速讲解视频        S4 定制 Remotion 视频
S5 组会幻灯片            S6 只要封面            S7 发布到 B 站         S8 已有 run 续跑
S9 xray 失败后的重试     S10 缺 brief 时渲染    S11 QA 失败时发布      S12 receipt 缺失但文档提名字
S13 真实上传命令失败     S14 旧产物被修改后的发布
每场景验证：目标/阶段/技能/子智能体/状态/产物/停止位置。
"""
from __future__ import annotations
import json, os, sys, tempfile, shutil, subprocess

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from paperpipe import registry, receipts, handoff
from paperpipe.config import DEFAULTS
from paperpipe.state import RunState, SCHEMA
from paperpipe.util import atomic_write_text

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
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
def make_ctx(files=None, target="video"):
    _N[0] += 1
    rd = os.path.join(tempfile.gettempdir(), f"pp-sc-{_N[0]}-{os.getpid()}")
    rs = RunState.create(rd, "t", "1706.03762", target, dict(DEFAULTS))
    files = dict(files or {})
    files.setdefault("4-video/final.mp4", b"\x00" * 1024)
    for rel, content in files.items():
        p = os.path.join(rd, rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        if isinstance(content, bytes):
            open(p, "wb").write(content)
        else:
            atomic_write_text(p, content)
    from paperpipe.adapters import RuntimeCtx
    return RuntimeCtx(ROOT, rd, dict(DEFAULTS), rs)

def route(id_) -> dict:
    return next(r for r in registry.routes() if r["id"] == id_)

def main():
    from paperpipe import runner

    print("S1 只要论文解读 → explain-only / md / terminal=xray")
    r = route("explain-only")
    check("target=md 终止 xray", r["target"] == "md" and registry.terminal_stage("md") == "xray")
    check("不触发 render/qa 技能", "remotion-video" not in r["skills"] and "video-qa-frameproof" not in r["skills"])
    check("主技能 paper-xray", "paper-xray" in r["skills"])
    ctx = make_ctx(target="md")
    check("md 阶段集不含 render", "render" not in registry.target_stages("md"))
    shutil.rmtree(ctx.run_dir, ignore_errors=True)

    print("S2 只画机制图 → mechanism-figure / figures / 主图解二选一")
    r = route("mechanism-figure")
    check("target=figures", r["target"] == "figures" and registry.terminal_stage("figures") == "figures")
    conds = {e["skill"]: e for e in registry.conditional_skills("figures")}
    check("图解技能组全部 optional（二选一非全强制）",
          all(conds[s].get("optional") for s in ("flowchart", "visual-explainer", "dynamic-archify", "anatomy")))

    print("S3 快速讲解视频 → quick-video / 路线 A")
    r = route("quick-video")
    check("路线 A 主技能 knowledge-explainer-skill", "knowledge-explainer-skill" in r["skills"])
    check("仍必须过 QA", "video-qa-frameproof" in r["skills"])

    print("S4 定制 Remotion 视频 → custom-video / publish 全链")
    r = route("custom-video")
    check("target=publish 终止 publish", r["target"] == "publish" and registry.terminal_stage("publish") == "publish")
    check("含 design-intake/prompt-forge/retrospective",
          {"design-intake", "prompt-forge", "video-retrospective"} <= set(r["skills"]))

    print("S5 组会幻灯片 → seminar-slides / 路线 B")
    r = route("seminar-slides")
    check("beamer 技能", "paper-to-beamer" in r["skills"] and "paper-slides-to-video" in r["skills"])

    print("S6 只要封面 → cover-only，不建整条流水线")
    r = route("cover-only")
    check("只含 paper-video-cover", r["skills"] == ["paper-video-cover"])
    conds = {e["skill"]: e for e in registry.conditional_skills("publish")}
    check("封面触发条件=用户要求发布或平台要求封面",
          "用户要求发布" in conds["paper-video-cover"]["trigger"], conds["paper-video-cover"]["trigger"])

    print("S7 发布到 B 站 → 完整门禁链")
    r = route("publish-bilibili")
    check("QA+封面+上传三技能", {"video-qa-frameproof", "paper-video-cover", "paper-bilibili-uploader"} <= set(r["skills"]))
    conds = {e["skill"]: e for e in registry.conditional_skills("publish")}
    check("上传触发条件含人工确认语义", "publish --confirm" in conds["paper-bilibili-uploader"]["trigger"]
          or "真实上传" in conds["paper-bilibili-uploader"]["trigger"])
    check("retrospective 是 publish 前置", "retrospective" in registry.requires("publish"))

    print("S8 已有 run 续跑（指纹缓存）")
    ctx = make_ctx({"2-xray/deep-read.md": "# 深读\n## 机制点\n1. A —— 会坏于 X\n内容 v1"})
    ctx.rs.stage("acquire")["status"] = "passed"
    ctx.rs.stage("acquire")["input_hash"] = runner.fingerprint(ctx, "acquire")
    receipts.write_skill_receipt(ctx, "xray", "paper-xray", "t", ["2-xray/deep-read.md"])
    res = runner.run_stage(ctx, "xray")
    check("首次 passed", res == "passed", res)
    res2 = runner.run_stage(ctx, "xray")  # 指纹未变 → check 复核 cache_hit
    check("续跑 cache_hit 仍 passed", res2 == "passed", res2)
    check("cache_hit 有审计", "cache_hit" in open(ctx.out("run.log.jsonl"), encoding="utf-8").read())
    shutil.rmtree(ctx.run_dir, ignore_errors=True)

    print("S9 xray 失败后的重试")
    ctx = make_ctx()
    ctx.rs.stage("acquire")["status"] = "passed"
    ctx.rs.stage("acquire")["input_hash"] = runner.fingerprint(ctx, "acquire")
    ctx.rs.stage("xray")["status"] = "failed_retryable"
    res = runner.retry_stage(ctx, "xray")  # 骨架生成 → waiting_for_agent（重试放行到等待）
    check("retry 后到 waiting_for_agent（骨架）", res == "waiting_for_agent", res)
    handoff_id = f"t-xray-researcher"
    check("handoff 信封已建", os.path.exists(ctx.out("handoffs", handoff_id, "request.json")))
    # 前置不满足时 retry 拒绝
    try:
        runner.retry_stage(ctx, "render")
        check("前置不满足 retry 拒绝", False)
    except SystemExit:
        check("前置不满足 retry 拒绝", True)
    shutil.rmtree(ctx.run_dir, ignore_errors=True)

    print("S10 缺 brief 时尝试渲染 → 前置拦截")
    ctx = make_ctx()
    try:
        runner.check_prerequisites(ctx, "render")
        check("render 被 brief/figures 前置拦截", False)
    except SystemExit as e:
        check("render 被 brief/figures 前置拦截", "brief" in str(e) or "figures" in str(e), str(e))
    shutil.rmtree(ctx.run_dir, ignore_errors=True)

    print("S11 QA 失败时尝试发布")
    ctx = make_ctx({"6-review/retrospective.md": "占位（填写）", "6-review/lessons.md": "# L\n- [x] r —— s\n"})
    ctx.rs.stage("qa")["status"] = "failed_permanent"
    ok, problems, _ = __import__("paperpipe.adapters", fromlist=["validate_review"]).validate_review(ctx)
    check("QA failed → validate_review 拒绝", not ok and any("QA" in p for p in problems), str(problems))
    res = runner.run_stage(ctx, "publish") if "publish" in registry.target_stages("video") else None
    check("publish 未到 passed", res != "passed")
    shutil.rmtree(ctx.run_dir, ignore_errors=True)

    print("S12 receipt 缺失但文档提到技能名")
    ctx = make_ctx({"2-xray/deep-read.md":
                    "# 深读\n## 机制点\n1. A —— 会坏于 X\n"
                    "本文档多处提到 paper-xray 与 motion-doctrine 等技能名"})
    ctx.rs.stage("acquire")["status"] = "passed"
    ctx.rs.stage("acquire")["input_hash"] = runner.fingerprint(ctx, "acquire")
    res = runner.run_stage(ctx, "xray")
    check("提到名字 ≠ 凭据 → waiting_for_agent", res == "waiting_for_agent", res)
    check("停机原因写明凭据", "凭据" in (ctx.rs.stage("xray")["error"] or {}).get("message", ""),
          str(ctx.rs.stage("xray")["error"]))
    shutil.rmtree(ctx.run_dir, ignore_errors=True)

    print("S13 真实上传命令失败（CLI 级双门）")
    # CLI：未 review --confirm 直接 publish --confirm → 拒绝（run 目录必须在 output/ 内——设计如此）
    rd = os.path.join(ROOT, "output", f"pipe-sc-cli-{os.getpid()}")
    rs = RunState.create(rd, "t", "1706.03762", "video", dict(DEFAULTS))
    out = subprocess.run([sys.executable, "-X", "utf8", "-m", "paperpipe", "publish", "--confirm", "t",
                          "--run-dir", rd], capture_output=True, text=True, cwd=ROOT, env={
                              **os.environ, "PYTHONPATH": ROOT})
    check("未 review 先 confirm → 拒绝", out.returncode != 0 and "review" in (out.stderr + out.stdout),
          out.stderr[-200:] + out.stdout[-200:])
    shutil.rmtree(rd, ignore_errors=True)

    print("S14 旧产物被修改后的发布")
    from paperpipe.adapters import validate_review, PublishAdapter
    ctx = make_ctx({"6-review/retrospective.md":
                    "# R\n## 一句话结论\n好\n## 六维打分\n| 维度 | 分 | 证据 |\n|---|---|---|\n"
                    "| 解释力 | 9 | a |\n| 视觉表现 | 9 | b |\n| 音画同步 | 9 | c |\n"
                    "| 技术卫生 | 9 | d |\n| 内容密度 | 9 | e |\n| 节奏 | 8 | f |\n",
                    "6-review/lessons.md": "# L\n- [x] 规则 —— 来源\n",
                    "5-video-final/cover.png": "cover"})
    write_passing_receipts(ctx)
    ctx.rs.stage("qa")["status"] = "passed"
    ok, _, hashes = validate_review(ctx)
    ctx.rs.data["review"].update({"confirmed": True, "hashes": hashes})
    ctx.rs.save()
    # 确认后替换 final.mp4
    open(ctx.out("4-video/final.mp4"), "wb").write(b"\xff" * 2048)
    ok2, problems2, _ = validate_review(ctx)
    check("final 被换 → 审核失效", not ok2 and any("final" in p or "变更" in p for p in problems2), str(problems2))
    res = PublishAdapter().run(ctx)
    check("publish 停在 waiting_for_human", res.status == "waiting_for_human", res.status)
    check("未 upload_ready", not ctx.rs.data["publish"]["upload_ready"])
    shutil.rmtree(ctx.run_dir, ignore_errors=True)

    print(f"\n结果: {PASS} 通过 / {FAIL} 失败")
    sys.exit(1 if FAIL else 0)

def write_passing_receipts(ctx):
    receipts.write_skill_receipt(ctx, "retrospective", "video-retrospective", "video_delivered",
                                 ["6-review/retrospective.md", "6-review/lessons.md"], agent_id="human")

if __name__ == "__main__":
    main()
