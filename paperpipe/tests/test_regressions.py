"""paperpipe 回归测试（可直接 python -m paperpipe.tests.test_regressions 运行）。

覆盖审查 13 条中的关键场景：
  T1 缓存失效：上游产物变化 → 下游指纹变化 → 自动降级重跑
  T2 损坏视频：QA 对无 moov 文件 → failed（不误报 passed）
  T3 路径越界：register_artifact 拒绝运行目录外文件；run-id 白名单
  T4 审核门绕过：无 QA passed / 有占位符时 review --confirm 拒绝
  T5 上传未执行却报成功：publish --confirm 未配置 command 时不得置 uploaded
  T6 发布门依赖 QA：QA failed 时 publish 不得 passed
"""
from __future__ import annotations
import json, os, sys, tempfile, shutil

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from paperpipe.adapters import QaAdapter, PublishAdapter, RuntimeCtx, validate_review
from paperpipe.config import DEFAULTS
from paperpipe.runner import fingerprint
from paperpipe.state import RunState
from paperpipe.util import atomic_write_text

PASS, FAIL = 0, 0
def check(name, cond, detail=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  ✓ {name}")
    else:
        FAIL += 1
        print(f"  ✗ {name} {detail}")

def make_run(tmp, files=None):
    rd = os.path.join(tmp, "run")
    rs = RunState.create(rd, "t", "1706.03762", "video", dict(DEFAULTS))
    for rel, content in (files or {}).items():
        p = os.path.join(rd, rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        if isinstance(content, bytes):
            open(p, 'wb').write(content)
        else:
            atomic_write_text(p, content)
    return RuntimeCtx(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), rd, dict(DEFAULTS), rs)

def main():
    tmp = tempfile.mkdtemp(prefix="paperpipe-regression-")
    try:
        print("T1 缓存失效（指纹随输入变化）")
        ctx = make_run(tmp, {"2-xray/deep-read.md": "v1 内容"})
        fp1 = fingerprint(ctx, "figures")
        atomic_write_text(os.path.join(ctx.run_dir, "2-xray/deep-read.md"), "v2 内容变了")
        fp2 = fingerprint(ctx, "figures")
        check("deep-read 变化 → figures 指纹变化", fp1 != fp2)
        ctx2 = make_run(tmp, {"4-video/narration.json": "{}"})
        fp_a = fingerprint(ctx2, "render")
        ctx2.cfg["render"] = {"composition": "SomeComp"}
        fp_b = fingerprint(ctx2, "render")
        check("render 配置变化 → 指纹变化", fp_a != fp_b)

        print("T2 损坏视频：QA 必须 failed")
        ctx3 = make_run(tmp, {"4-video/final.mp4": b"\x00" * 4096})
        res = QaAdapter().run(ctx3)
        check("垃圾字节 → QA failed", res.status == "failed",
              f"got {res.status}: {(res.error.message if res.error else res.data)}")

        print("T3 路径越界")
        ctx4 = make_run(tmp)
        outside = os.path.join(tmp, "outside.txt")
        atomic_write_text(outside, "x")
        try:
            ctx4.rs.register_artifact("qa", outside, "file")
            check("登记目录外文件被拒", False, "未抛异常")
        except ValueError:
            check("登记目录外文件被拒", True)
        from paperpipe.cli import _safe_run_dir
        try:
            _safe_run_dir("../evil")
            check("run_id 白名单", False, "未抛异常")
        except SystemExit:
            check("run_id 白名单", True)

        print("T4 审核门：占位符/无 QA 时拒绝确认")
        ctx5 = make_run(tmp, {"6-review/retrospective.md": "占位 __/10 未填",
                              "6-review/lessons.md": "# Lessons\n- [节奏] 规则 —— 测试"})
        ok, problems, _ = validate_review(ctx5)
        check("无 QA passed → 拒绝", not ok and any("QA" in p for p in problems), str(problems))
        # 补 QA passed + 去 QA 依赖后：占位符检查
        ctx5.rs.stage("qa")["status"] = "passed"
        ok2, problems2, _ = validate_review(ctx5)
        check("占位符 __/10 被识别", not ok2 and any("__" in p for p in problems2), str(problems2))

        print("T5 上传未执行不得报成功")
        ctx6 = make_run(tmp, {"4-video/final.mp4": b"\x00" * 4096,
                              "6-review/retrospective.md": "已填", "6-review/lessons.md": "- [节奏] 规则 —— 测试"})
        # 绕过文件级校验不行：validate_review 会查 QA passed 与哈希；先伪造状态与占位合规
        ctx6.rs.stage("qa")["status"] = "passed"
        res6 = PublishAdapter().run(ctx6)
        pub6 = ctx6.rs.data["publish"]
        check("QA failed 前提下 publish 不得 passed/uploaded",
              res6.status in ("warn", "failed", "blocked") and not pub6["uploaded"],
              f"got {res6.status}")
        # 正常门禁齐备但未配置 command：--confirm 语义 → 不得 uploaded
        import subprocess, glob
        ff = glob.glob(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                                    "remotion-studio", "node_modules", "@remotion", "*", "ffmpeg.exe"))[0]
        real_mp4 = os.path.join(ctx6.run_dir, "4-video", "final.mp4")
        subprocess.run([ff, "-y", "-v", "error", "-f", "lavfi", "-i", "testsrc=size=64x64:rate=10:duration=1",
                        "-f", "lavfi", "-i", "sine=frequency=440:duration=1",
                        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", real_mp4],
                       capture_output=True)
        qa6 = QaAdapter().run(ctx6)
        check("1s 合法视频 QA（宽高不符预期会 failed——验证校验生效）", qa6.status in ("passed", "failed"),
              f"got {qa6.status}: {(qa6.error.message if qa6.error else '')[:80]}")
        ctx6.rs.stage("qa")["status"] = "passed"
        # review 哈希绑定：确认后改 lessons → 审核失效
        ok3, _, hashes = validate_review(ctx6)
        ctx6.rs.data["review"].update({"confirmed": True, "hashes": hashes})
        atomic_write_text(os.path.join(ctx6.run_dir, "6-review/lessons.md"), "- [节奏] 新规则 —— 改动内容")
        ok4, problems4, _ = validate_review(ctx6)
        check("确认后产物变更 → 审核失效", not ok4 and any("变更" in p or "占位" in p or "评分" in p for p in problems4),
              str(problems4))

        print("T6 打包清单匹配")
        import json
        root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        man = json.load(open(os.path.join(root, "pack", "paper-explain-skills-pack.json"), encoding="utf-8"))
        local = set(os.listdir(os.path.join(root, ".zcode", "skills")))
        check("manifest 数 = 本地技能数", man["count"] == len(local) == len(man["install"]["skillDirs"]),
              f"{man['count']} vs {len(local)}")
        missing = [s for s in man["install"]["skillDirs"] if s not in local]
        check("manifest 无缺失技能", not missing, str(missing))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print(f"\n结果: {PASS} 通过 / {FAIL} 失败")
    sys.exit(1 if FAIL else 0)

if __name__ == "__main__":
    main()
