"""paperpipe Round 4 谓词测试：触发条件求值 / 硬触发 / 占位符产物 / 风格帧门 / 精度四项 / 渲染后处理。

T1 trigger_when 求值（input/route/target/file/cfg 原子 + 语法错 fail-closed）
T2 触发条件决定凭据要求：本地 PDF 不再被 arXiv 技能凭据卡死；dry-run 发布不再被上传凭据卡死
T3 硬触发（hard:true）：route-decision 豁免被拒，只认真实 receipt
T4 verify_chosen_artifacts 占位符归一（<chapter> / {a,b,c} 此前提取出坏路径）
T5 三张风格帧小样门：model_manifest 存在 → 三帧必须存在 + preview-review 过审凭据
T6 精度四项 fidelity 键校验（envMap/shadows/detailCount≥4）
T7 brief 落点谓词（video-production-guide 指南要点摘录 ≥5）
T8 Blender 帧序列丢帧检测 + 混合管线 remux 凭据
T9 decide CLI：硬触发技能拒绝登记豁免
T10 final.mp4 路径统一（5-video-final 优先）
"""
from __future__ import annotations
import json, os, sys, tempfile, shutil

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from paperpipe import receipts as RC, registry as RG
from paperpipe.adapters import FiguresAdapter, RenderAdapter, RuntimeCtx, _final_mp4, _blender_frame_problems
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

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def make_ctx(tmp, name, source="1506.02640", cfg=None):
    rd = os.path.join(tmp, name)
    RunState.create(rd, name, source, "video", dict(DEFAULTS))
    ctx = RuntimeCtx(ROOT, rd, dict(DEFAULTS), RunState(rd))
    if cfg:
        ctx.cfg.update(cfg)
    return ctx

def main():
    tmp = tempfile.mkdtemp(prefix="paperpipe-trig-")
    try:
        print("T1 trigger_when 求值")
        ctx = make_ctx(tmp, "t1", source="paper.pdf")
        check("input=arxiv 对 PDF 源不触发", not RC.evaluate_trigger(ctx, "input=arxiv"))
        check("input=pdf 对 PDF 源触发", RC.evaluate_trigger(ctx, "input=pdf"))
        check("route!=remotion 默认 route=auto 触发", RC.evaluate_trigger(ctx, "route!=remotion"))
        check("cfg 未配置项 = false", not RC.evaluate_trigger(ctx, "cfg:publish.enabled=true"))
        ctx.cfg["publish"] = {"enabled": True}
        check("cfg 配置 true 触发", RC.evaluate_trigger(ctx, "cfg:publish.enabled=true"))
        try:
            RC.evaluate_trigger(ctx, "bogus=1")
            check("未知原子 fail-closed 抛错", False)
        except ValueError:
            check("未知原子 fail-closed 抛错", True)
        for bad in ("input=pdf input=", "route=", "cfg:foo"):
            try:
                RG.parse_trigger(bad)
                check(f"语法校验拒绝 {bad!r}", False)
            except ValueError:
                check(f"语法校验拒绝 {bad!r}", True)

        print("T2 触发条件决定凭据要求")
        ctx = make_ctx(tmp, "t2a", source="paper.pdf")   # 本地 PDF
        probs = RC.verify_stage(ctx, "acquire")
        check("PDF 输入不再被 arXiv 技能凭据卡死", not any("paper-download" in x for x in probs), str(probs))
        check("pdf-to-markdown 触发条件成立（本地 PDF）→ 仍要求凭据/决策",
              any("pdf-to-markdown" in x for x in probs), str(probs))
        RC.record_route_decision(ctx, "acquire", "pdf-to-markdown", "skipped",
                                 "无 GPU 环境，回退直接读 PDF（contracts on_fail）", decided_by="director")
        probs = RC.verify_stage(ctx, "acquire")
        check("decide 豁免后不再卡", not probs, str(probs))
        ctx = make_ctx(tmp, "t2b", source="1706.03762")  # arXiv 源
        probs = RC.verify_stage(ctx, "acquire")
        check("arXiv 输入仍要求 paper-download 凭据", any("paper-download" in x for x in probs), str(probs))
        ctx = make_ctx(tmp, "t2c")                        # publish dry-run
        probs = RC.verify_stage(ctx, "publish")
        check("dry-run 发布不被上传凭据卡死", not any("paper-bilibili-uploader" in x for x in probs), str(probs))
        ctx = make_ctx(tmp, "t2d")
        ctx.cfg["publish"] = {"enabled": True}
        probs = RC.verify_stage(ctx, "publish")
        check("真实上传（enabled=true）要求上传凭据", any("paper-bilibili-uploader" in x for x in probs), str(probs))
        ctx = make_ctx(tmp, "t2e")
        ctx.cfg["route"] = "hyperframes"
        probs = RC.verify_stage(ctx, "render")
        check("route=hyperframes 时 remotion-video 未触发不卡", not any("remotion-video" in x for x in probs), str(probs))
        check("route=hyperframes 时 hyperframes 仍要求凭据", any("hyperframes" in x for x in probs), str(probs))

        print("T3 硬触发 hard:true：physics_sim 声明驱动的不可豁免门")
        ctx = make_ctx(tmp, "t3")
        os.makedirs(ctx.out("3-figures"), exist_ok=True)
        atomic_write_text(ctx.out("3-figures/README.md"), "# 登记表\n")
        check("未声明 physics_sim → 不要求 Blender 产物",
              not any("blender-visual" in x for x in RC.verify_stage(ctx, "figures")))
        atomic_write_text(ctx.out("3-figures/enriched_spec.json"), json.dumps(
            {"enriched_scenes": [{"chapter": 3, "physics_sim": True}]}))
        probs = RC.verify_stage(ctx, "figures")
        check("声明 physics_sim → 要求真实凭据", any("blender-visual" in x for x in probs), str(probs)[:160])
        RC.record_route_decision(ctx, "figures", "blender-visual", "skipped", "没有物理模拟镜头", decided_by="director")
        probs = RC.verify_stage(ctx, "figures")
        check("声明后 skipped 决策不豁免硬触发", any("不接受 route-decision 豁免" in x for x in probs), str(probs)[:160])
        RC.write_skill_receipt(ctx, "figures", "blender-visual", "physics_chapter",
                               ["3-figures/README.md"], agent_id="test")   # 真实凭据（产物另查 T4/T8）
        probs = RC.verify_stage(ctx, "figures")
        check("真实 receipt 放行硬触发（产物存在性由 verify_chosen_artifacts 另查）",
              not any("blender-visual" in x and "豁免" in x for x in probs), str(probs)[:160])

        print("T4 verify_chosen_artifacts 占位符归一")
        ctx = make_ctx(tmp, "t4")
        os.makedirs(ctx.out("3-figures"), exist_ok=True)
        atomic_write_text(ctx.out("3-figures/README.md"), "# 登记表\n")
        RC.write_skill_receipt(ctx, "figures", "blender-visual", "physics_chapter",
                               ["3-figures/README.md"], agent_id="test")
        probs = RC.verify_chosen_artifacts(ctx, "figures")
        check("blender 已触发→按 4-video/blender/*/frame_*.png 查产物",
              any("4-video/blender" in x for x in probs), str(probs))
        os.makedirs(ctx.out("4-video", "blender", "ch01"), exist_ok=True)
        for i in range(1, 4):
            atomic_write_text(ctx.out("4-video", "blender", "ch01", f"frame_{i:04d}.png"), "f")
        probs = RC.verify_chosen_artifacts(ctx, "figures")
        check("帧序列存在后 blender 产物谓词通过", not any("blender" in x for x in probs), str(probs))

        print("T5 三张风格帧小样门")
        ctx = make_ctx(tmp, "t5")
        os.makedirs(ctx.out("3-figures"), exist_ok=True)
        atomic_write_text(ctx.out("3-figures/model_manifest.json"), json.dumps(
            {"scenes": [{"chapter": 0, "module_js": "x"}],
             "fidelity": {"envMap": True, "shadows": True, "detailCount": 6}}))
        atomic_write_text(ctx.out("3-figures/README.md"),
                          "| 章 | 标题 | 形式 | 产物 |\n|---|---|---|---|\n| k1 | A | visual-explainer | 3-figures/model_manifest.json |")
        res = FiguresAdapter().check(ctx)
        check("manifest 已产出但无风格帧 → 拦截",
              res.status == "waiting_for_agent" and "风格帧小样门" in (res.error.message if res.error else ""),
              str(res.status) + " " + str(res.error and res.error.message)[:120])
        for f in ("entity", "mechanism", "data"):
            atomic_write_text(ctx.out("3-figures", "style_frames", f + ".png"), "frame")
        res = FiguresAdapter().check(ctx)
        check("三帧在但缺过审凭据 → 仍拦截",
              res.status == "waiting_for_agent" and "preview-review" in (res.error.message if res.error else ""),
              str(res.status) + " " + str(res.error and res.error.message)[:120])
        RC.write_skill_receipt(ctx, "figures", "preview-review", "style_frames_approved",
                               ["3-figures/style_frames/entity.png", "3-figures/style_frames/mechanism.png",
                                "3-figures/style_frames/data.png"], agent_id="director")
        probs = RC.verify_chosen_artifacts(ctx, "figures")
        check("preview-review 产物谓词按 {三帧} 组要求 ≥3 命中通过", not any("preview-review" in x for x in probs), str(probs))
        os.unlink(ctx.out("3-figures", "style_frames", "data.png"))
        probs = RC.verify_chosen_artifacts(ctx, "figures")
        check("少一帧 → 组谓词拦截（≥3）", any("preview-review" in x and "≥3" in x for x in probs), str(probs))

        print("T6 精度四项 fidelity 键校验 + dataviz axis_max（ch18 教训谓词）")
        from paperpipe import schemas as S
        base = {"scenes": [{"chapter": 0, "module_js": "x"}]}
        check("缺 fidelity 拦", len(S.v_manifest(dict(base))) == 1)
        check("fidelity 缺键拦（仅 envMap）", any("shadows" in x or "detailCount" in x
                                                  for x in S.v_manifest({**base, "fidelity": {"envMap": True}})))
        ok = S.v_manifest({**base, "fidelity": {"envMap": True, "shadows": True, "detailCount": 6}})
        check("全键通过", not ok, str(ok))
        low = S.v_manifest({**base, "fidelity": {"envMap": True, "shadows": True, "detailCount": 2}})
        check("detailCount<4 拦（精度③）", any("detailCount" in x for x in low), str(low))
        dv_ok = S.v_dataviz([{"chapter": 18, "component": "bars3d", "values": [52.7, 71.8],
                              "axis_max": 80, "labels": ["a", "b"]}])
        check("dataviz 原始值+axis_max 通过", not dv_ok, str(dv_ok))
        dv_bad = S.v_dataviz([{"chapter": 18, "component": "bars3d", "values": [0.7, 0.9], "labels": ["a", "b"]}])
        check("缺 axis_max 拦（按最大值归一的旧写法）", any("axis_max" in x for x in dv_bad), str(dv_bad))

        print("T7 brief 落点谓词")
        ctx = make_ctx(tmp, "t7")
        atomic_write_text(ctx.out("0-brief/brief.md"), "<acceptance>\n  - 前2秒有钩子\n</acceptance>\n")
        RC.write_skill_receipt(ctx, "brief", "video-production-guide", "video_target",
                               ["0-brief/brief.md"], agent_id="test")
        probs = RC.verify_triggered_acceptance(ctx, "brief")
        check("指南已读但 brief 无摘录 → 拦截", any("指南要点摘录" in x for x in probs), str(probs))
        brief = ctx.out("0-brief/brief.md")
        atomic_write_text(brief, open(brief, encoding="utf-8").read() +
                          "## 指南要点摘录\n- 要点一\n- 要点二\n- 要点三\n- 要点四\n- 要点五\n")
        probs = RC.verify_triggered_acceptance(ctx, "brief")
        check("≥5 条摘录通过", not probs, str(probs))

        print("T8 Blender 丢帧检测 + remux 凭据")
        ctx = make_ctx(tmp, "t8")
        os.makedirs(ctx.out("4-video", "blender", "ch02"), exist_ok=True)
        for i in (1, 2, 4):
            atomic_write_text(ctx.out("4-video", "blender", "ch02", f"frame_{i:04d}.png"), "f")
        probs = _blender_frame_problems(ctx)
        check("丢帧（1,2,4）被检出", any("丢帧" in x and "ch02" in x for x in probs), str(probs))
        ctx2 = make_ctx(tmp, "t8b")
        os.makedirs(ctx2.out("4-video", "blender", "ch02"), exist_ok=True)
        for i in (1, 2, 3):
            atomic_write_text(ctx2.out("4-video", "blender", "ch02", f"frame_{i:04d}.png"), "f")
        check("连续帧通过", not _blender_frame_problems(ctx2))
        res = RenderAdapter().check(ctx2)
        check("混合管线缺 remux 凭据 → 拦截", res.status == "waiting_for_agent"
              and "remux" in (res.error.message if res.error else ""),
              str(res.status) + " " + str(res.error and res.error.message)[:120])
        RC.write_tool_receipt(ctx2, "render", "remux", ["ffmpeg"], 0,
                              output_paths=["5-video-final/final.mp4"])
        os.makedirs(ctx2.out("5-video-final"), exist_ok=True)
        with open(ctx2.out("5-video-final", "final.mp4"), "wb") as f:
            f.write(b"\x00")
        res = RenderAdapter().check(ctx2)
        check("remux 凭据 + final 存在 → passed", res.status == "passed", str(res.status))

        print("T9 decide CLI 拒绝硬触发豁免")
        import subprocess
        rd = os.path.join(ROOT, "output", f"pipe-trig-cli-{os.getpid()}")
        RunState.create(rd, "t", "1706.03762", "video", dict(DEFAULTS))
        out = subprocess.run([sys.executable, "-X", "utf8", "-m", "paperpipe", "decide",
                              "figures", "blender-visual", "--reason", "无物理模拟",
                              "--run-dir", rd], capture_output=True, text=True, cwd=ROOT,
                             env={**os.environ, "PYTHONPATH": ROOT})
        check("硬触发技能 decide 被拒", out.returncode != 0 and "硬触发" in (out.stderr + out.stdout),
              out.stderr[-200:] + out.stdout[-200:])
        out = subprocess.run([sys.executable, "-X", "utf8", "-m", "paperpipe", "decide",
                              "figures", "wise-motion", "--reason", "route 非 remotion，动效走 motion-lab",
                              "--run-dir", rd], capture_output=True, text=True, cwd=ROOT,
                             env={**os.environ, "PYTHONPATH": ROOT})
        check("普通条件技能 decide 落盘", out.returncode == 0, out.stderr[-200:])
        dec = RC.route_decision(RuntimeCtx(ROOT, rd, dict(DEFAULTS), RunState(rd)), "figures", "wise-motion")
        check("决策可查回（decision=skipped+理由）", bool(dec) and dec.get("decision") == "skipped"
              and "motion-lab" in (dec.get("reason") or ""), str(dec))
        shutil.rmtree(rd, ignore_errors=True)

        print("T10 final.mp4 路径统一")
        ctx = make_ctx(tmp, "t10")
        os.makedirs(ctx.out("4-video"), exist_ok=True)
        with open(ctx.out("4-video", "final.mp4"), "wb") as f:
            f.write(b"\x00")
        check("仅 4-video/final 兼容命中", _final_mp4(ctx) == ctx.out("4-video", "final.mp4"))
        os.makedirs(ctx.out("5-video-final"), exist_ok=True)
        with open(ctx.out("5-video-final", "final.mp4"), "wb") as f:
            f.write(b"\x00")
        check("5-video-final 优先", _final_mp4(ctx) == ctx.out("5-video-final", "final.mp4"))

        print("T11 3D 豁免留痕 + lessons 写回目标谓词")
        ex_ok = S.v_examples([{"chapter": 2, "mechanism": "M", "scene_desc": "三辆车在路口排成一行，相机从东南侧俯视",
                               "narration_text": "n", "is_3d": False, "exempt_reason": "纯抽象数学推导，无具象对象"}])
        check("is_3d=false + 豁免理由通过", not ex_ok, str(ex_ok))
        ex_bad = S.v_examples([{"chapter": 2, "mechanism": "M", "scene_desc": "三辆车在路口排成一行，相机从东南侧俯视",
                                "narration_text": "n", "is_3d": False}])
        check("is_3d=false 无豁免理由 → 拦截（不得静默降级为表格读数）",
              any("exempt_reason" in x for x in ex_bad), str(ex_bad))
        from paperpipe.adapters import validate_review
        ctx = make_ctx(tmp, "t11")
        os.makedirs(ctx.out("6-review"), exist_ok=True)
        atomic_write_text(ctx.out("6-review/retrospective.md"),
                          "# R\n## 一句话结论\n好\n## 六维打分\n| 维度 | 分 | 证据 |\n|---|---|---|\n"
                          "| 解释力 | 9 | a |\n| 视觉表现 | 9 | b |\n| 音画同步 | 9 | c |\n"
                          "| 技术卫生 | 9 | d |\n| 内容密度 | 9 | e |\n| 节奏 | 8 | f |\n")
        atomic_write_text(ctx.out("6-review/lessons.md"), "# L\n- [节奏] 无技能名的规则 —— 来源\n")
        os.makedirs(ctx.out("5-video-final"), exist_ok=True)
        with open(ctx.out("5-video-final", "final.mp4"), "wb") as f:
            f.write(b"\x00")
        ctx.rs.stage("qa")["status"] = "passed"
        RC.write_skill_receipt(ctx, "retrospective", "video-retrospective", "video_delivered",
                               ["6-review/retrospective.md", "6-review/lessons.md"], agent_id="human")
        ok, problems, _ = validate_review(ctx)
        check("lessons 无写回目标技能 → 拒绝", not ok and any("写回目标" in x for x in problems), str(problems))
        atomic_write_text(ctx.out("6-review/lessons.md"), "# L\n- [节奏] 结论时长压缩，写回 remotion-video 铁律 —— 来源\n")
        ok, problems, _ = validate_review(ctx)
        check("lessons 指向已注册技能 → 通过", ok, str(problems))

        print("T12 产物路径加固 + 无 handoff 阶段调度语义")
        from paperpipe import handoff as H, dispatch as DP
        ctx = make_ctx(tmp, "t12")
        H.create(ctx, "t12-xray-researcher-01", "researcher", "xray", "t", [])
        H.start(ctx, "t12-xray-researcher-01")
        outside = os.path.join(tmp, "outside.json")
        with open(outside, "w", encoding="utf-8") as f:
            f.write("{}")
        for bad in (outside, "../escape.json", "C:/Windows/evil.json"):
            try:
                H.submit_response(ctx, "t12-xray-researcher-01", {"verdict": "pass"}, [bad])
                check(f"越界产出被拒: {os.path.basename(bad)}", False, "未拒绝")
            except (ValueError, FileNotFoundError):
                check(f"越界产出被拒: {os.path.basename(bad)}", True)
        check("信封转 failed（防伪造留痕）", H.get_state(ctx, "t12-xray-researcher-01") == "failed",
              H.get_state(ctx, "t12-xray-researcher-01"))
        rel = "2-xray/deep-read.md"
        os.makedirs(ctx.out("2-xray"), exist_ok=True)
        atomic_write_text(ctx.out(rel), "# 深读\n")
        H.submit_response(ctx, "t12-xray-researcher-01", {"verdict": "pass"}, [rel])
        om = json.load(open(ctx.out("handoffs", "t12-xray-researcher-01", "output-manifest.json"),
                            encoding="utf-8"))
        check("相对产出 manifest 以 posix 相对路径为键", rel in om, str(list(om)))
        try:
            RC.write_skill_receipt(ctx, "xray", "paper-xray", "t", [outside])
            check("receipt 产物越界在写凭据前被拒", False)
        except ValueError:
            check("receipt 产物越界在写凭据前被拒", True)
        check("无 handoff_plan 阶段 all_passed vacuous=True（不误报 exit 2）",
              DP.report(ctx, "intake")["all_passed"] is True)

        print("T13 receipt CLI（编排方侧技能的合法凭据入口）")
        import subprocess
        rd = os.path.join(ROOT, "output", f"pipe-rcpt-cli-{os.getpid()}")
        RunState.create(rd, "t", "1706.03762", "video", dict(DEFAULTS))
        os.makedirs(os.path.join(rd, "5-video-final"), exist_ok=True)
        with open(os.path.join(rd, "5-video-final", "technical_qa.md"), "w", encoding="utf-8") as f:
            f.write("[PASS] ffprobe h264 1920x1080\n")
        def rcpt(*extra):
            return subprocess.run([sys.executable, "-X", "utf8", "-m", "paperpipe", "receipt", *extra],
                                  capture_output=True, text=True, cwd=ROOT,
                                  env={**os.environ, "PYTHONPATH": ROOT})
        r = rcpt("qa", "video-technical-review", "--output", "5-video-final/technical_qa.md",
                 "--evidence", "PASS/FAIL+命令+实测值", "--by", "technical_qa", "--run-dir", rd)
        check("合法凭据落盘", r.returncode == 0, r.stderr[-200:])
        rctx = RuntimeCtx(ROOT, rd, dict(DEFAULTS), RunState(rd))
        check("凭据可被 verify_stage 消费（qa 该项不再缺）",
              not any("video-technical-review" in x for x in RC.verify_stage(rctx, "qa")),
              str(RC.verify_stage(rctx, "qa"))[:180])

        print("T14 run() 门停不被 check() 兜底覆写（Round 12 修复）")
        ctx = make_ctx(tmp, "t14")
        atomic_write_text(ctx.out("4-video", "narration.json"), json.dumps({
            "schema": "narration/1", "total_seconds": 4.0, "shots": [
                {"chapter": 0, "duration": 4.0,
                 "sentences": [{"text": "网格如何切分图像。", "start": 0.5, "seconds": 3.0, "audio": None}]}]}))
        ctx.cfg["render"] = {"mode": "hyperframes", "cwd": "4-video/hf",
                             "command": ["npx", "hyperframes", "render", "-o", "out.mp4"],
                             "sources": ["4-video/hf/**"]}
        # narration 就绪 + 预览包未过审 → run() 应停在 waiting_for_human（预览门），
        # 不得被 check 的"尚未渲染"覆写成 waiting_for_agent
        res = RenderAdapter().run(ctx)
        check("预览门 waiting_for_human 由 run() 返回",
              res.status == "waiting_for_human" and "预览门" in (res.error.message if res.error else ""),
              str(res.status) + " " + str(res.error and res.error.message)[:100])
        r = rcpt("qa", "video-technical-review", "--output", "5-video-final/不存在.md", "--run-dir", rd)
        check("产物不存在 → 拒绝", r.returncode != 0, r.stderr[-160:])
        r = rcpt("qa", "未注册技能", "--output", "5-video-final/technical_qa.md", "--run-dir", rd)
        check("未注册技能 → 拒绝", r.returncode != 0, r.stderr[-160:])
        r = rcpt("xray", "design-intake", "--output", "5-video-final/technical_qa.md", "--run-dir", rd)
        check("非该阶段条件技能 → 拒绝", r.returncode != 0, r.stderr[-160:])
        shutil.rmtree(rd, ignore_errors=True)

        print("T15-R13 渲染缓存命中同样过预览门 / 后处理 / 预算语义")
        ctx = make_ctx(tmp, "t15")
        ctx.cfg["render"] = {"mode": "hyperframes", "cwd": "4-video/hf",
                             "command": ["npx", "hyperframes", "render", "-o", "out.mp4"],
                             "sources": ["4-video/hf/**"]}
        atomic_write_text(ctx.out("4-video", "narration.json"), json.dumps({
            "schema": "narration/1", "total_seconds": 4.0, "shots": [
                {"chapter": 0, "duration": 4.0,
                 "sentences": [{"text": "网格如何切分图像。", "start": 0.5, "seconds": 3.0, "audio": None}]}]}))
        os.makedirs(ctx.out("4-video"), exist_ok=True)
        with open(ctx.out("4-video", "render-raw.mp4"), "wb") as f:
            f.write(b"\x00")
        import hashlib as _hl
        from paperpipe.adapters import RenderAdapter as _RA
        src = _hl.sha256()
        for spec in sorted(_RA().inputs(ctx)):
            base = ctx.root if spec.startswith("root:") else ctx.run_dir
            pat = spec[5:] if spec.startswith("root:") else spec
            import glob as _g2
            ms = sorted(_g2.glob(os.path.join(base, pat), recursive=True)) if any(c in pat for c in "*?[") else [os.path.join(base, pat)]
            for p in ms:
                if os.path.isfile(p):
                    from paperpipe.util import sha256_file as _sf2
                    src.update(p.encode()); src.update(_sf2(p).encode())
        RC.write_tool_receipt(ctx, "render", "hyperframes-render", ["npx"], 0,
                              output_paths=["4-video/render-raw.mp4"], extra={"src_fp": src.hexdigest()})
        res = _RA().run(ctx)
        check("缓存命中但预览门未过 → waiting_for_human（不绕门）",
              res.status == "waiting_for_human" and "缓存命中同门" in (res.error.message if res.error else ""),
              str(res.status) + " " + str(res.error and res.error.message)[:90])
        from paperpipe import preview as P
        P.generate(ctx)
        P.confirm(ctx, by="导演")
        os.makedirs(ctx.out("5-video-final"), exist_ok=True)
        with open(ctx.out("5-video-final", "final.mp4"), "wb") as f:
            f.write(b"\x00")
        res = _RA().run(ctx)
        check("门过 + final 已在 → 缓存 passed", res.status == "passed"
              and res.data.get("cached") is True, str(res.status) + str(res.data))

        print("T16-R13 loudnorm 参数符号归一")
        from paperpipe.adapters import _loudnorm_args
        check("默认为负", _loudnorm_args({}) == "I=-16:TP=-1.5:LRA=11", _loudnorm_args({}))
        check("正数自动取负", _loudnorm_args({"I": 14, "TP": 2}) == "I=-14:TP=-2:LRA=11",
              _loudnorm_args({"I": 14, "TP": 2}))
        check("字符串原样", _loudnorm_args({"I": "-14.3", "TP": "-3.7"}) == "I=-14.3:TP=-3.7:LRA=11",
              _loudnorm_args({"I": "-14.3", "TP": "-3.7"}))

        print("T17-R13 预算耗尽保持原状态（不被改判 unknown permanent）")
        from paperpipe import runner as R13
        ctx = make_ctx(tmp, "t17")
        ctx.cfg["render"] = {"mode": "hyperframes", "cwd": "4-video/hf",
                             "command": ["npx", "hyperframes", "render", "-o", "out.mp4"],
                             "sources": ["4-video/hf/**"]}
        st = ctx.rs.stage("render")
        st["status"] = "failed_retryable"
        st["attempts"] = 3
        st["error"] = {"cls": "transient", "message": "上次的原始失败信息"}
        st["input_hash"] = R13.fingerprint(ctx, "render")
        ctx.rs.save()
        res = R13.run_stage(ctx, "render")
        check("预算耗尽+指纹未变 → 保持 failed_retryable 与原消息", res == "failed_retryable"
              and "上次的原始失败信息" in (ctx.rs.stage("render")["error"] or {}).get("message", ""),
              res + " " + str(ctx.rs.stage("render")["error"]))
        check("video target 含 retrospective（没有复盘不算交付）",
              "retrospective" in RG.target_stages("video"))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print(f"\n结果: {PASS} 通过 / {FAIL} 失败")
    sys.exit(1 if FAIL else 0)

if __name__ == "__main__":
    main()
