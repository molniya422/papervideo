"""paperpipe 门禁穿透测试（体检 Batch 2 验收）：注入坏产物，机器门必须全拦。

X1 空壳 narration.json（{"shots":[]}）→ render waiting_for_agent
X2 过审后再加意见 → 预览门自动关闭（计数失配 + open>0）
X3 figures passed 后清空登记表 → 缓存复验降级重跑（check() 生效）
X4 receipt 输入被改 → 凭据过期（input_hashes 重验）
X5 伪造过审凭据（空 {}）→ 预览门拒绝
X6 publish --confirm 改 state → 指纹必须变化（缓存空转修复）
X7 音轨比画面短 2s → QA failed（音画时长差）
X8 空 JSON 规格产物 → figures check 拦截
"""
from __future__ import annotations
import json, os, sys, tempfile, shutil, subprocess

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from paperpipe import preview as P, receipts as RC
from paperpipe.adapters import QaAdapter, RenderAdapter, RuntimeCtx
from paperpipe.config import DEFAULTS
from paperpipe.runner import fingerprint
from paperpipe.state import RunState
from paperpipe.util import atomic_write_text, atomic_write_json

PASS, FAIL = 0, 0
def check(name, cond, detail=""):
    global PASS, FAIL
    if cond:
        PASS += 1; print(f"  [OK] {name}")
    else:
        FAIL += 1; print(f"  [FAIL] {name} {detail}")

FF = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                  "tools", "node_modules", "@ffmpeg-installer", "win32-x64", "ffmpeg.exe")

def make_ctx(tmp, name="run"):
    rd = os.path.join(tmp, name)
    RunState.create(rd, "t", "1506.02640", "video", dict(DEFAULTS))
    atomic_write_text(os.path.join(rd, "4-video", "narration.json"), json.dumps({
        "schema": "narration/1", "total_seconds": 10, "shots": [
            {"id": "k00", "chapter": 0, "title": "开场", "transition_in": "iris",
             "is_3d": True, "start": 0, "duration": 4.0, "frames": 120,
             "sentences": [{"text": "这一眼里有几辆车？", "start": 0.5, "seconds": 3.0, "audio": None}]}]}))
    for n in (0, 1):
        atomic_write_text(os.path.join(rd, "4-video", "hf", "compositions", f"ch{n:02d}.html"), f"<html>ch{n}</html>")
    ctx = RuntimeCtx(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                     rd, dict(DEFAULTS), RunState(rd))
    ctx.cfg["render"] = {"mode": "hyperframes", "cwd": "4-video/hf",
                         "command": ["npx", "hyperframes", "render", "-o", "out.mp4"],
                         "sources": ["4-video/hf/compositions/**"]}
    return ctx

def main():
    tmp = tempfile.mkdtemp(prefix="paperpipe-pen-")
    try:
        print("X1 空壳 narration.json")
        ctx = make_ctx(tmp, "x1")
        atomic_write_text(ctx.out("4-video", "narration.json"), json.dumps({"shots": []}))
        res = RenderAdapter().run(ctx)
        check("空 shots → waiting_for_agent（谓词拦截）", res.status == "waiting_for_agent"
              and "谓词" in (res.error.message if res.error else ""), str(res.status))

        print("X2 过审后再加意见 → 门自动关闭")
        ctx = make_ctx(tmp, "x2")
        P.generate(ctx); P.confirm(ctx, by="导演")
        ok, why = P.gate(ctx)
        check("刚过审 → 门开", ok, why)
        P.revise_add(ctx, "camera", "第 0 章环绕太快")
        ok, why = P.gate(ctx)
        check("confirm 后加意见 → 门关（open>0）", not ok and "open" in why, why)
        P.revise_resolve(ctx, "R001", note="修了")
        ok, why = P.gate(ctx)
        check("resolve 后计数失配仍拦（需重新 confirm）", not ok and "重新 --confirm" in why, why)
        P.confirm(ctx, by="导演")
        ok, why = P.gate(ctx)
        check("重新 confirm → 门开", ok, why)

        print("X3 figures passed 后清空登记表 → 缓存复验降级")
        from paperpipe import runner as R
        ctx = make_ctx(tmp, "x3")
        ctx.rs.stage("acquire")["status"] = "passed"
        ctx.rs.stage("acquire")["input_hash"] = fingerprint(ctx, "acquire")
        ctx.rs.stage("xray")["status"] = "passed"
        P_VALID_README = ("| 章 | 标题 | 形式 | 产物 |\n|---|---|---|---|\n"
                          "| k1 | A | visual-explainer | 4-video/narration.json |")
        atomic_write_text(ctx.out("3-figures/README.md"), P_VALID_README)
        atomic_write_text(ctx.out("3-figures/shot_plan.json"), json.dumps(
            {"shots": [{"chapter": 0, "verdict": "pass"}], "pacing": {"flagged": []}}))
        atomic_write_text(ctx.out("3-figures/model_manifest.json"), json.dumps(
            {"scenes": [{"chapter": 0, "module_js": "x"}], "fidelity": {"envMap": True}}))
        res = R.run_stage(ctx, "figures")
        # xray 深读谓词会先拦（夹具深读太短）——为其补一份合格深读
        if res == "waiting_for_agent":
            dr = ctx.out("2-xray/deep-read.md")
            atomic_write_text(dr, "# 深读\n## 机制点\n1. 网格化——它会怎么坏：格太粗漏检小目标。\n"
                                  "2. 单次回归——它会怎么坏：多目标场景中心坍缩。\n"
                                  "3. 端到端训练——它会怎么坏：定位与分类梯度互相打架。\n")
            res = R.run_stage(ctx, "figures")
        # 先写与真实产物同构的规格，再 pass_role（finish 记录当前哈希 → 溯源一致）
        P_VALID = {
            "3-figures/examples_spec.json": json.dumps(
                {"examples": [{"chapter": 0, "mechanism": "M",
                               "scene_desc": "三辆车在路口排成一行，相机从东南侧俯视",
                               "narration_text": "示例", "is_3d": True, "objects": ["car"]}]}, ensure_ascii=False),
            "3-figures/dataviz_spec.json": json.dumps(
                [{"chapter": 0, "component": "bars3d", "values": [1], "labels": ["a"]}], ensure_ascii=False),
            "3-figures/style_refs.json": json.dumps(
                {"library": "cap", "enabled": True, "refs": []}, ensure_ascii=False),
            "3-figures/enriched_spec.json": json.dumps(
                {"enriched_scenes": [{"chapter": 0, "camera_path": [{"t": 0.2, "az": 0.3, "elv": 0.2, "r": 10}],
                                      "objects": [{"fn": "carMesh"}], "style_ref": {"style_id": "A3"}}]},
                ensure_ascii=False),
            "3-figures/model_manifest.json": json.dumps(
                {"scenes": [{"chapter": 0, "module_js": "x"}], "fidelity": {"envMap": True}}, ensure_ascii=False),
            "3-figures/shot_plan.json": json.dumps(
                {"shots": [{"chapter": 0, "verdict": "pass"}], "pacing": {"flagged": []}}, ensure_ascii=False),
        }
        for rel, content in P_VALID.items():
            fp = ctx.out(rel)
            os.makedirs(os.path.dirname(fp), exist_ok=True)
            atomic_write_text(fp, content)
        # 六角色 handoff 全部过审（figures passed 的前提）——真实内容随 finish 落 manifest
        from paperpipe.tests.test_dispatch import pass_role
        for role in ("example_writer", "data_viz_builder", "style_director",
                     "spec_enricher", "model_builder", "visual_planner"):
            pass_role(ctx, "figures", role, payloads=P_VALID)
        # 未触发的条件技能一律显式 route-decision（verify_stage 设计纪律）
        from paperpipe import registry as RG
        for entry in RG.conditional_skills("figures"):
            sid = entry["skill"]
            if not any(r.get("status") == "passed" for r in RC.skill_receipts(ctx, "figures", sid)):
                RC.record_route_decision(ctx, "figures", sid, "skipped", "夹具：触发条件不满足")
        res = R.run_stage(ctx, "figures")
        check("figures passed（六 handoff 过审 + 谓词合格）", res == "passed",
              res + " | " + json.dumps(ctx.rs.stage("figures").get("error"), ensure_ascii=False)[:260])

        print("X10 已触发条件技能但产物缺失 → 拦截")
        from paperpipe import receipts as _RC
        from paperpipe.adapters import FiguresAdapter
        _RC.write_skill_receipt(ctx, "figures", "blender-visual", "high_fidelity_chapter",
                                ["3-figures/README.md"], agent_id="test")  # 声称触发但无 blender 产物
        res = FiguresAdapter().check(ctx)
        check("blender 已触发但帧序列缺失 → 拦截", res.status == "waiting_for_agent"
              and "blender" in (res.error.message if res.error else ""), str(res.status))
        atomic_write_text(ctx.out("3-figures/README.md"), "# 空登记\n")  # 通过后清空
        res = R.run_stage(ctx, "figures")
        check("缓存复验发现登记表被清 → 重跑拦下（不得 passed）", res == "waiting_for_agent", res)

        print("X9 通过后篡改产物内容 → 溯源拦截")
        # 恢复登记表，但篡改 examples_spec 内容（哈希 ≠ handoff 核验值）
        atomic_write_text(ctx.out("3-figures/README.md"), P_VALID_README)
        tampered = json.loads(P_VALID["3-figures/examples_spec.json"])
        tampered["examples"][0]["narration_text"] = "被编排方悄悄改过的句子"
        atomic_write_text(ctx.out("3-figures/examples_spec.json"), json.dumps(tampered, ensure_ascii=False))
        res = R.run_stage(ctx, "figures")
        err = (ctx.rs.stage("figures").get("error") or {}).get("message", "")
        check("篡改产物 → 溯源拦截（不得 passed）", res == "waiting_for_agent" and "不一致" in err,
              res + " | " + err[:120])

        print("X4 receipt 输入被改 → 凭据过期")
        ctx = make_ctx(tmp, "x4")
        RC.write_skill_receipt(ctx, "render", "humanize-writing", "narration_ready",
                               ["4-video/narration.json"], input_paths=["4-video/narration.json"],
                               agent_id="test")
        atomic_write_text(ctx.out("4-video", "narration.json"),
                          json.dumps({"schema": "narration/1", "total_seconds": 9, "shots": [
                              {"id": "k00", "chapter": 0, "title": "改", "transition_in": "iris", "is_3d": True,
                               "start": 0, "duration": 4.0, "frames": 120,
                               "sentences": [{"text": "改写后的句子。", "start": 0.5, "seconds": 3.0}]}]}))
        probs = RC.verify_stage(ctx, "render")
        check("narration 重写后 humanize 凭据被判过期", any("输入已变更" in x for x in probs), str(probs)[:100])

        print("X5 伪造过审凭据（空 {}）")
        ctx = make_ctx(tmp, "x5")
        P.generate(ctx)
        atomic_write_json(ctx.out("4-video", "preview", "preview_confirmed.json"), {})
        ok, why = P.gate(ctx)
        check("空壳凭据被拒（计数绑定）", not ok, why)

        print("X6 publish confirm → 指纹变化（缓存空转修复）")
        ctx = make_ctx(tmp, "x6")
        fp_before = fingerprint(ctx, "publish")
        ctx.rs.data["review"]["confirmed"] = True
        fp_after = fingerprint(ctx, "publish")
        check("review.confirmed 改变 publish 指纹", fp_before != fp_after)

        print("X7 音轨比画面短 2s → QA failed")
        ctx = make_ctx(tmp, "x7")
        final = ctx.out("4-video", "final.mp4")
        subprocess.run([FF, "-y", "-v", "error",
                        "-f", "lavfi", "-i", "testsrc=size=320x240:rate=30:duration=3",
                        "-f", "lavfi", "-i", "sine=frequency=440:duration=1",
                        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac",
                        "-shortest", "-movflags", "+faststart", final], capture_output=True)
        os.makedirs(ctx.out("5-video-final"), exist_ok=True)
        atomic_write_text(ctx.out("5-video-final", "layout_audit.json"),
                          json.dumps({"layout": {"ok": True, "findings": []}}))
        ctx.cfg["qa"] = {"expect": {"width": 320, "height": 240, "fps": 30}}
        res = QaAdapter().run(ctx)
        check("音画时长差 2s → failed", res.status == "failed"
              and "音画时长差" in (res.error.message if res.error else ""), str(res.status))

        print("X8 空 JSON 规格产物 → figures check 拦截")
        ctx = make_ctx(tmp, "x8")
        from paperpipe.adapters import FiguresAdapter
        atomic_write_text(ctx.out("3-figures/README.md"),
                          "| 章 | 标题 | 形式 | 产物 |\n|---|---|---|---|\n| k1 | A | visual-explainer | 4-video/narration.json |")
        atomic_write_text(ctx.out("3-figures/examples_spec.json"), json.dumps({}))
        res = FiguresAdapter().check(ctx)
        check("空 examples_spec → 谓词拦截", res.status == "waiting_for_agent"
              and "examples_spec" in (res.error.message if res.error else ""), str(res.status))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print(f"\n结果: {PASS} 通过 / {FAIL} 失败")
    sys.exit(1 if FAIL else 0)

if __name__ == "__main__":
    main()
