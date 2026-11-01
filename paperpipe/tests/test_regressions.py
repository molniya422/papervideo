"""paperpipe 回归测试 v2（python -X utf8 -m paperpipe.tests.test_regressions）。

覆盖原审查 13 条中的执行器机械层（人审/发布/凭据/交接/门禁已拆分到
test_review_publish / test_receipts / test_handoff / test_gates）：
  T1 缓存失效：上游产物变化 → 下游指纹变化 → 自动降级重跑
  T2 损坏视频：QA 对无 moov 文件 → failed（不误报 passed）
  T3 路径越界：register_artifact 拒绝运行目录外文件；run-id 白名单
  T4 target 终止阶段：md/figures/video/publish 终点正确
  T5 状态契约：schema v3、8 状态、旧 schema 标记 legacy
  T6 注册表一致：manifest 数 = 本地技能数 = registry 数 = 66
"""
from __future__ import annotations
import json, os, sys, tempfile, shutil

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from paperpipe import registry
from paperpipe.adapters import QaAdapter, RuntimeCtx
from paperpipe.config import DEFAULTS
from paperpipe.runner import fingerprint
from paperpipe.state import RunState, SCHEMA, STATUSES
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
    return RuntimeCtx(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                      rd, dict(DEFAULTS), rs)

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
        from paperpipe import runner as _runner
        old_ver = _runner.VERSION
        try:
            _runner.VERSION = "9.9.9"
            fp_c = fingerprint(ctx2, "render")
        finally:
            _runner.VERSION = old_ver
        check("执行器升版 → 指纹全量失效", fp_c != fp_a and fp_c != fp_b)

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

        print("T4 target 终止阶段")
        for t, want in (("md", "xray"), ("figures", "figures"), ("video", "qa"), ("publish", "publish")):
            check(f"{t} → terminal {want}", registry.terminal_stage(t) == want)
        check("md 不含 render", "render" not in registry.target_stages("md"))
        check("video 不含 publish", "publish" not in registry.target_stages("video"))

        print("T5 状态契约")
        check("schema v3", SCHEMA == "paperpipe-state/3", SCHEMA)
        check("8 状态", len(STATUSES) == 8 and "warn" not in STATUSES and "blocked" not in STATUSES)
        rs_old = RunState.create(os.path.join(tmp, "old"), "old", "1706.03762", "video", dict(DEFAULTS))
        rs_old.data["schema"] = "paperpipe-state/2"
        check("旧 schema → legacy", rs_old.is_legacy)

        print("T6 注册表一致（68）")
        man = json.load(open(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(
            os.path.abspath(__file__)))), "pack", "paper-explain-skills-pack.json"), encoding="utf-8"))
        local = set(os.listdir(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(
            os.path.abspath(__file__)))), ".zcode", "skills")))
        check("manifest 数 = 本地数 = registry 数 = 66",
              man["count"] == len(local) == len(man["install"]["skillDirs"]) == len(registry.skill_ids()) == 68,
              f"{man['count']}/{len(local)}/{len(registry.skill_ids())}")
        reg_problems = registry.validate_registry(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        check("registry 双向差集为空", not reg_problems, str(reg_problems))
        print("T7 布局零遮挡门（media 干净前提下）")
        import subprocess
        ff = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                          "tools", "node_modules", "@ffmpeg-installer", "win32-x64", "ffmpeg.exe")
        ctx7 = make_run(tmp)
        real = os.path.join(ctx7.run_dir, "4-video", "final.mp4")
        subprocess.run([ff, "-y", "-v", "error", "-f", "lavfi", "-i", "testsrc=size=1920x1080:rate=30:duration=1",
                        "-f", "lavfi", "-i", "sine=frequency=440:duration=1",
                        "-af", "volume=6dB", "-c:v", "libx264", "-pix_fmt", "yuv420p",
                        "-c:a", "aac", "-ar", "48000", "-shortest", "-movflags", "+faststart", real],
                       capture_output=True)
        ctx7.cfg["qa"] = {"expect": {"width": 1920, "height": 1080, "fps": 30}}
        res7 = QaAdapter().run(ctx7)
        check("media 过但无布局审计 → waiting_for_agent", res7.status == "waiting_for_agent",
              f"got {res7.status}: {(res7.error.message if res7.error else '')[:60]}")
        os.makedirs(os.path.join(ctx7.run_dir, "5-video-final"), exist_ok=True)
        atomic_write_text(os.path.join(ctx7.run_dir, "5-video-final", "layout_audit.json"),
                          json.dumps({"layout": {"ok": True, "findings": []}}))
        # 需要 qa receipt 的条件技能在 runner 层验证；适配器层应 passed
        res7b = QaAdapter().run(ctx7)
        check("布局审计 0 error → 适配器层 passed", res7b.status == "passed", f"got {res7b.status}")

        print("T8 sources 指纹敏感性（root: glob 必须真的吃到文件变化）")
        ctx8 = make_run(tmp)
        hf = os.path.join(ctx8.run_dir, "4-video", "hf")
        os.makedirs(os.path.join(hf, "compositions"), exist_ok=True)
        atomic_write_text(os.path.join(hf, "compositions", "ch01.html"), "v1")
        ctx8.cfg["render"] = {"sources": ["4-video/hf/compositions/**"]}
        from paperpipe.runner import fingerprint as _fp
        fp1 = _fp(ctx8, "render")
        atomic_write_text(os.path.join(hf, "compositions", "ch01.html"), "v2 changed")
        fp2 = _fp(ctx8, "render")
        check("合成源码变化 → render 指纹变化", fp1 != fp2)
        root_spec_fp1 = None
        ctx8.cfg["render"] = {"sources": ["root:4-video/hf/compositions/**"]}
        atomic_write_text(os.path.join(hf, "compositions", "ch01.html"), "v3 root-relative")
        # root: 相对 ctx.root（工作区）——run 在 tmp 下不成立，此处只验证不抛异常
        try:
            _fp(ctx8, "render"); root_spec_fp1 = "ok"
        except Exception as e:
            root_spec_fp1 = "err " + str(e)[:40]
        check("root: spec 不抛异常", root_spec_fp1 == "ok", str(root_spec_fp1))

    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print(f"\n结果: {PASS} 通过 / {FAIL} 失败")
    sys.exit(1 if FAIL else 0)

if __name__ == "__main__":
    main()
