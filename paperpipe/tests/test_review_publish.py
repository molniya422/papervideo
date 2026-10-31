"""paperpipe v2 人审与发布门禁测试（批次 5）。

P1 复盘六维：缺项/无证据/评分<8 任一 → validate_review 拒绝
P2 publish --confirm 前必须有 review --confirm（双门）
P3 确认后产物变更 → 审核哈希失效
P4 无封面 → 不置 upload_ready
P5 上传命令 exit≠0 → 不 uploaded、回执保留、failed_retryable
P6 dry-run 永不 uploaded
P7 全门齐备 + 上传命令 exit=0 → uploaded 且回执存在
"""
from __future__ import annotations
import json, os, sys, tempfile, shutil

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from paperpipe import receipts
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

_N = [0]
def make_ctx(files=None, confirmed=False):
    _N[0] += 1
    rd = os.path.join(tempfile.gettempdir(), f"pp-pub-{_N[0]}-{os.getpid()}")
    rs = RunState.create(rd, "t", "1706.03762", "video", dict(DEFAULTS))
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
    return RuntimeCtx(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                      rd, dict(DEFAULTS), rs)

def write_passing_review(ctx):
    atomic_write_text(ctx.out("6-review/retrospective.md"),
        "# Retrospective\n## 一句话结论\n好\n## 六维打分\n"
        "| 维度 | 分 | 证据 |\n|---|---|---|\n"
        "| 解释力 | 9 | 推导完整 |\n| 视觉表现 | 9 | 风格统一 |\n| 音画同步 | 9 | 逐句对齐 |\n"
        "| 技术卫生 | 9 | faststart 达标 |\n| 内容密度 | 9 | 全覆盖 |\n| 节奏 | 8 | 语速实测 |\n")
    atomic_write_text(ctx.out("6-review/lessons.md"), "# Lessons\n- [语速] 语速改动先测样句 —— EP03\n")
    atomic_write_text(ctx.out("5-video-final/qa_report.json"), "{}")
    receipts.write_skill_receipt(ctx, "retrospective", "video-retrospective", "video_delivered",
                                 ["6-review/retrospective.md", "6-review/lessons.md"],
                                 agent_id="human")
    ctx.rs.stage("qa")["status"] = "passed"

def cleanup(ctx):
    shutil.rmtree(ctx.run_dir, ignore_errors=True)

def main():
    from paperpipe.adapters import validate_review, PublishAdapter

    print("P1 复盘六维校验")
    ctx = make_ctx(); write_passing_review(ctx)
    ok, problems, hashes = validate_review(ctx)
    check("全齐 → 通过且哈希含 final", ok and "final" in hashes and "retrospective" in hashes,
          str(problems))
    ctx.rs.data["review"]["confirmed"] = True
    ctx.rs.data["review"]["hashes"] = hashes
    ctx.rs.save()
    # 缺证据
    atomic_write_text(ctx.out("6-review/retrospective.md"),
        open(ctx.out("6-review/retrospective.md"), encoding="utf-8").read().replace("| 解释力 | 9 | 推导完整 |", "| 解释力 | 9 | |"))
    ok2, problems2, _ = validate_review(ctx)
    check("缺证据被拒", not ok2 and any("解释力" in p for p in problems2), str(problems2))
    # 评分 <8
    atomic_write_text(ctx.out("6-review/retrospective.md"),
        open(ctx.out("6-review/retrospective.md"), encoding="utf-8").read().replace("| 解释力 | 9 | |", "| 解释力 | 6 | 有证据 |"))
    ok3, problems3, _ = validate_review(ctx)
    check("评分 <8 被拒", not ok3 and any("< 8" in p for p in problems3), str(problems3))
    # 缺一项
    txt = open(ctx.out("6-review/retrospective.md"), encoding="utf-8").read().replace("| 节奏 | 8 | 语速实测 |", "")
    atomic_write_text(ctx.out("6-review/retrospective.md"), txt)
    ok4, problems4, _ = validate_review(ctx)
    check("缺评分项被拒", not ok4 and any("节奏" in p for p in problems4), str(problems4))
    # 缺 video-retrospective receipt
    shutil.rmtree(ctx.out("receipts", "skills"), ignore_errors=True)
    ok5, problems5, _ = validate_review(ctx)
    check("缺 video-retrospective receipt 被拒", not ok5 and any("video-retrospective" in p for p in problems5),
          str(problems5))
    cleanup(ctx)

    print("P2 publish --confirm 需要 review --confirm 先行")
    ctx6 = make_ctx(); write_passing_review(ctx6)
    ok6, problems6, _ = validate_review(ctx6)
    res6 = PublishAdapter().run(ctx6)
    pub6 = ctx6.rs.data["publish"]
    check("未确认 review → 不 upload_ready", not pub6["upload_ready"] and not pub6["uploaded"], str(pub6))
    check("阻塞原因含'未确认'", any("未确认" in p or "review" in p for p in (problems6 or ["review 未确认（先 paperpipe review --confirm）"])) or
          (res6.error and "review" in str(res6.error.message)), str(problems6))
    cleanup(ctx6)

    print("P3 确认后产物变更 → 失效")
    ctx7 = make_ctx(); write_passing_review(ctx7)
    ok7, _, hashes7 = validate_review(ctx7)
    ctx7.rs.data["review"].update({"confirmed": True, "hashes": hashes7})
    ctx7.rs.save()
    atomic_write_text(ctx7.out("6-review/lessons.md"), "# Lessons\n- [节奏] 新规则 —— 改动\n- [语速] 另一条 —— 改动\n")
    ok7b, problems7, _ = validate_review(ctx7)
    check("lessons 变更 → 旧审核失效", not ok7b, str(problems7))
    cleanup(ctx7)

    print("P4 无封面 → 不 upload_ready")
    ctx8 = make_ctx(); write_passing_review(ctx8)
    ctx8.rs.data["review"].update({"confirmed": True, "hashes": validate_review(ctx8)[2]})
    ctx8.rs.save()
    res8 = PublishAdapter().run(ctx8)
    check("封面缺失 → waiting_for_human 且不 upload_ready",
          res8.status == "waiting_for_human" and not ctx8.rs.data["publish"]["upload_ready"],
          f"{res8.status} {(res8.error.message if res8.error else '')[:80]}")
    cleanup(ctx8)

    print("P5 上传命令失败 → 不 uploaded")
    ctx9 = make_ctx(); write_passing_review(ctx9)
    atomic_write_text(ctx9.out("5-video-final/cover.png"), "fake-png")
    ctx9.rs.data["review"].update({"confirmed": True, "hashes": validate_review(ctx9)[2]})
    ctx9.rs.save()
    ctx9.cfg["publish"] = {"enabled": True, "dry_run": False, "command": [sys.executable, "-c", "import sys; sys.exit(3)"]}
    ctx9.rs.data["publish"].update({"enabled": True, "dry_run": False})
    ctx9.rs.save()
    try:
        res9 = PublishAdapter().run(ctx9)
        status9 = res9.status
    except Exception as e:
        status9 = f"raised:{type(e).__name__}"
    pub9 = ctx9.rs.data["publish"]
    check("exit=3 → 不 uploaded", not pub9["uploaded"] and pub9["uploading"] is False, str(pub9))
    check("回执保留（审计不丢）", os.path.exists(ctx9.out("5-video-final/upload_receipt.json"))
          and json.load(open(ctx9.out("5-video-final/upload_receipt.json"), encoding="utf-8"))["exit"] == 3)
    cleanup(ctx9)

    print("P6 dry-run 永不 uploaded")
    ctx10 = make_ctx(); write_passing_review(ctx10)
    atomic_write_text(ctx10.out("5-video-final/cover.png"), "fake-png")
    ctx10.rs.data["review"].update({"confirmed": True, "hashes": validate_review(ctx10)[2]})
    ctx10.rs.save()
    res10 = PublishAdapter().run(ctx10)
    pub10 = ctx10.rs.data["publish"]
    check("dry-run → passed 但 uploaded=False",
          res10.status == "passed" and not pub10["uploaded"] and pub10["upload_ready"], str(pub10))
    cleanup(ctx10)

    print("P7 全门齐备 + 上传成功 → uploaded")
    ctx11 = make_ctx(); write_passing_review(ctx11)
    atomic_write_text(ctx11.out("5-video-final/cover.png"), "fake-png")
    ctx11.rs.data["review"].update({"confirmed": True, "hashes": validate_review(ctx11)[2]})
    ctx11.rs.save()
    ctx11.cfg["publish"] = {"enabled": True, "dry_run": False, "command": [sys.executable, "-c", "import sys; sys.exit(0)"]}
    ctx11.rs.data["publish"].update({"enabled": True, "dry_run": False})
    ctx11.rs.save()
    res11 = PublishAdapter().run(ctx11)
    pub11 = ctx11.rs.data["publish"]
    check("exit=0 → uploaded 且回执存在", res11.status == "passed" and pub11["uploaded"]
          and pub11["receipt"] == "5-video-final/upload_receipt.json", f"{res11.status} {pub11}")
    cleanup(ctx11)

    print(f"\n结果: {PASS} 通过 / {FAIL} 失败")
    sys.exit(1 if FAIL else 0)

if __name__ == "__main__":
    main()
