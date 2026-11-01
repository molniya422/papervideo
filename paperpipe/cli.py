"""paperpipe.cli — 命令行入口（8 个子命令，v2）。

  paperpipe init <PDF|arXiv> --run-id ID [--target video]   # 建 run（--force 清空重建）
  paperpipe run  [--auto] [--target video] [--stage a,b]    # 执行 DAG 到等待/失败处（--stage 按拓扑序）
  paperpipe resume                                          # 按输入指纹决定重跑范围（不清零失败历史）
  paperpipe retry <stage>                                   # 显式重试（同样过前置门禁）
  paperpipe status [--json]
  paperpipe validate [--target video]                       # 注册表驱动：组件/引擎/技能/差集
  paperpipe review --confirm [--by NAME]                    # 人审门（六维评分+证据+receipt 程序化核对）
  paperpipe publish --dry-run | --confirm <run_id>          # 双门：review --confirm 之后才可 --confirm
"""
from __future__ import annotations
import argparse, json, os, re, shutil, sys

from . import registry
from .adapters import ADAPTERS, RuntimeCtx, VERSION
from .config import load_config
from .runner import run_all, retry_stage, refuse_legacy, topo_sort, check_prerequisites
from .state import RunState
from .util import atomic_write_text, atomic_append_jsonl, env_summary, utcnow

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUTS = os.path.join(ROOT, "output")

def _safe_run_dir(run_id: str) -> str:
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,63}", run_id):
        raise SystemExit(f"非法 run_id: {run_id}（只允许字母数字._-，≤64 字符）")
    run_dir = os.path.realpath(os.path.join(OUTPUTS, run_id))
    base = os.path.realpath(OUTPUTS)
    if os.path.commonpath([run_dir, base]) != base:
        raise SystemExit(f"run 越界: {run_dir}")
    return run_dir

def _resolve_run_dir(run_dir_arg: str | None) -> str:
    rd = run_dir_arg or _latest_run() or sys.exit("没有运行目录；先 paperpipe init")
    rd = os.path.realpath(rd)
    base = os.path.realpath(OUTPUTS)
    if os.path.commonpath([rd, base]) != base:
        raise SystemExit(f"--run-dir 越界（必须在 output/ 内）: {rd}")
    return rd

def _latest_run() -> str | None:
    ds = _run_dirs()
    return ds[-1] if ds else None

def _run_dirs() -> list[str]:
    if not os.path.isdir(OUTPUTS):
        return []
    return [os.path.join(OUTPUTS, d) for d in sorted(os.listdir(OUTPUTS))
            if os.path.isfile(os.path.join(OUTPUTS, d, "pipeline-state.json"))]

def _ctx(run_dir: str, cfg_over: dict | None = None) -> RuntimeCtx:
    rs = RunState(run_dir)
    if rs.data is None:
        sys.exit(f"不是 paperpipe 运行目录（缺 pipeline-state.json）: {run_dir}")
    cfg = load_config(ROOT, run_dir, cfg_over)
    return RuntimeCtx(ROOT, run_dir, cfg, rs)

def cmd_init(args):
    run_dir = _safe_run_dir(args.run_id)
    if os.path.exists(os.path.join(run_dir, "pipeline-state.json")):
        if not args.force:
            sys.exit(f"run 已存在: {run_dir}（--force = 清空重建，旧产物将删除）")
        shutil.rmtree(run_dir)
        print(f"已清空重建: {run_dir}")
    os.makedirs(run_dir, exist_ok=True)
    cfg = load_config(ROOT, run_dir, {"target": args.target})
    title = args.title or None
    rs = RunState.create(run_dir, args.run_id, args.source, args.target, cfg, title)
    atomic_write_text(os.path.join(run_dir, "paperpipe.yaml"),
                      f"# paperpipe 运行级配置（覆盖全局默认）\ntarget: {args.target}\nmode: {cfg['mode']}\n"
                      "render:\n"
                      "  composition: \"\"          # Remotion 合成 ID（如 MechLong）\n"
                      "  script: \"\"               # TTS/时间轴构建脚本路径（相对工作区根）\n"
                      "  sources: []              # 参与指纹的合成源码 glob（相对工作区根）\n"
                      "  studio: remotion-studio\n"
                      "publish:\n"
                      "  enabled: false\n"
                      "  dry_run: true\n"
                      "  command: []              # 真实上传命令（未配置时 --confirm 只置 upload_ready）\n")
    atomic_append_jsonl(os.path.join(run_dir, "run.log.jsonl"),
                        {"ts": utcnow(), "level": "info", "stage": "init", "event": "created",
                         "env": env_summary(ROOT), "run_id": args.run_id, "source": args.source,
                         "executor": f"paperpipe/{VERSION}"})
    print(json.dumps(rs.summary(), ensure_ascii=False, indent=2))

def cmd_run(args):
    run_dir = _resolve_run_dir(args.run_dir)
    ctx = _ctx(run_dir, {"mode": "auto"} if args.auto else None)
    refuse_legacy(ctx.rs, "run")
    if args.target:
        if args.target not in registry.targets():
            sys.exit(f"未知 target: {args.target}（可选: {', '.join(registry.targets())}）")
        ctx.rs.data["target"] = args.target
        ctx.rs.save()
    only = topo_sort(args.stage.split(",")) if args.stage else None
    if only:
        for s in only:  # 单跑/子集同样过前置门禁
            check_prerequisites(ctx, s)
    results = run_all(ctx, only=only)
    print(json.dumps(results, ensure_ascii=False, indent=2))

def cmd_resume(args):
    run_dir = _resolve_run_dir(args.run_dir)
    ctx = _ctx(run_dir)
    refuse_legacy(ctx.rs, "resume")
    from .runner import fingerprint
    reset = []
    for name in ADAPTERS:
        st = ctx.rs.stage(name)
        if st["status"] == "not_applicable":
            continue
        fp = fingerprint(ctx, name)
        if st["status"] == "passed" and st["input_hash"] == fp:
            continue
        if st["input_hash"] is not None and st["input_hash"] != fp and \
                st["status"] not in ("failed_retryable", "failed_permanent"):
            st["status"] = "pending"; st["attempts"] = 0; st["error"] = None
            reset.append(name)
        elif st["status"] == "pending":
            st["attempts"] = 0
            reset.append(name)
    ctx.rs.save()
    if reset:
        print("指纹变化，重跑范围:", ", ".join(reset))
    results = run_all(ctx)
    print(json.dumps(results, ensure_ascii=False, indent=2))

def cmd_retry(args):
    run_dir = _resolve_run_dir(args.run_dir)
    ctx = _ctx(run_dir)
    refuse_legacy(ctx.rs, "retry")
    results = {args.stage: retry_stage(ctx, args.stage)}
    print(json.dumps(results, ensure_ascii=False, indent=2))

def cmd_status(args):
    run_dir = _resolve_run_dir(args.run_dir)
    s = _ctx(run_dir).rs.summary()
    if args.json:
        print(json.dumps(s, ensure_ascii=False, indent=2))
        return
    legacy = " [LEGACY——变更命令已拒绝，见 docs/baseline §4]" if s["legacy"] else ""
    print("\n".join(f"{k:<14} {v['status']:<20} attempts={v['attempts']}"
                    f"{' [人审门]' if v['human_gate'] else ''}"
                    f"{' WARN:' + str(v['warnings']) if v['warnings'] else ''}"
                    f"{' ERR:' + v['error'] if v['error'] else ''}"
                    for k, v in s["stages"].items())
          + f"\nrun_id={s['run_id']} target={s['target']} schema={s['schema']}{legacy} "
            f"review_confirmed={s['review']['confirmed']} "
            f"publish={ {k: s['publish'][k] for k in ('upload_ready','uploading','uploaded')} }")

def _skills_dir() -> str:
    """技能目录：工作区布局 .zcode/skills 优先；工作区包安装布局 skills/ 兜底。"""
    c1 = os.path.join(ROOT, ".zcode", "skills")
    c2 = os.path.join(ROOT, "skills")
    return c1 if os.path.isdir(c1) else c2

def cmd_validate(args):
    target = args.target or "video"
    if target not in registry.targets():
        sys.exit(f"未知 target: {target}（可选: {', '.join(registry.targets())}）")
    env = env_summary(ROOT)
    ok, bad = [], []
    for k in ("python", "platform", "paperpipe_root"):
        ok.append(f"{k}={env[k]}")
    # ffmpeg/ffprobe 只有音视频 target 才必需（md/figures 不需要）
    if target in ("video", "slides", "publish"):
        for k in ("ffmpeg", "ffprobe"):
            (ok if env[k] != "MISSING" else bad).append(f"{k}={env[k]}")
    for k in ("node", "uv"):
        (ok if env[k] != "MISSING" else bad).append(f"{k}={env[k]}")
    # 注册表自检（含与本地技能目录双向差集）
    reg_problems = registry.validate_registry(ROOT)
    ok.append(f"registry=stages:{len(registry.stage_names())} skills:{len(registry.skill_ids())} "
              f"agents:{len(registry.agent_roles())} routes:{len(registry.routes())}")
    bad.extend(reg_problems)
    # 技能文件存在性（注册表声明的每个技能必须有 SKILL.md）
    skills_dir = _skills_dir()
    for s in sorted(registry.skill_ids()):
        if not os.path.isfile(os.path.join(skills_dir, s, "SKILL.md")):
            bad.append(f"skill:{s}=MISSING SKILL.md")
    # target 终止阶段与路线组件
    ok.append(f"target={target} terminal={registry.terminal_stage(target)} "
              f"stages={','.join(registry.target_stages(target))}")
    route_skills = {"video": ["remotion-video", "motion-lab", "wise-motion", "paper-video-cover"],
                    "md": ["visual-explainer", "flowchart"],
                    "slides": ["paper-to-beamer", "paper-slides-to-video"]}
    for s in route_skills.get(target, []):
        p = os.path.join(skills_dir, s, "SKILL.md")
        (ok if os.path.isfile(p) else bad).append(f"skill:{s}={'OK' if os.path.isfile(p) else 'MISSING'}")
    if target in ("video", "slides"):
        studio = os.path.join(ROOT, "remotion-studio", "package.json")
        (ok if os.path.isfile(studio) else bad).append(f"remotion-studio={'OK' if os.path.isfile(studio) else 'MISSING'}")
        if os.path.isdir(OUTPUTS):
            for d in _run_dirs():
                rs = RunState(d)
                if rs.is_legacy:
                    ok.append(f"run:{rs.data['run_id']}=LEGACY({rs.data.get('schema')})")
                    continue
                if rs.data and rs.data.get("target") == "video" and \
                        os.path.isfile(os.path.join(d, "4-video", "narration.json")):
                    comp = (rs.data.get("config", {}).get("render") or {}).get("composition")
                    if not comp:
                        bad.append(f"run:{rs.data['run_id']} 未配置 render.composition")
    print("OK:\n  " + "\n  ".join(ok))
    if bad:
        print("PROBLEM:\n  " + "\n  ".join(bad))
        sys.exit(1)

def cmd_review(args):
    run_dir = _resolve_run_dir(args.run_dir)
    ctx = _ctx(run_dir)
    refuse_legacy(ctx.rs, "review")
    if not args.confirm:
        print("人审清单（逐项确认后加 --confirm；确认时程序化核对）：\n"
              "  1) QA 阶段 passed\n"
              "  2) 复盘六维全部有分且 ≥8、每项有证据、无占位符\n"
              "  3) lessons.md ≥1 条具体规则\n"
              "  4) video-retrospective 技能 receipt 存在\n"
              "  5) 事实确认（数字/结论 vs 论文）与听审（人工责任）")
        sys.exit(2)
    from .adapters import validate_review
    ok, problems, hashes = validate_review(ctx, compare_saved=False)   # 重新确认=重建基线
    if not ok:
        print("人审门未通过，拒绝确认：")
        for p in problems:
            print("  -", p)
        sys.exit(1)
    ctx.rs.data["review"] = {"confirmed": True, "confirmed_by": args.by or "human",
                             "confirmed_at": utcnow(), "hashes": hashes, "invalidated_reason": None}
    ctx.rs.save()
    print(json.dumps(ctx.rs.data["review"], ensure_ascii=False, indent=2))

def cmd_publish(args):
    run_dir = _resolve_run_dir(args.run_dir)
    ctx = _ctx(run_dir)
    refuse_legacy(ctx.rs, "publish")
    if args.confirm:
        if ctx.rs.data["run_id"] != args.confirm:
            sys.exit(f"run_id 不匹配: 期望 {ctx.rs.data['run_id']}")
        # 双门 1：人审必须已确认
        if not ctx.rs.data["review"].get("confirmed"):
            sys.exit("真实上传被门禁拦下：review 未确认（先 paperpipe review --confirm）")
        # 双门 2：哈希有效期（确认后产物变更 → 失效）
        from .adapters import validate_review, _find_cover
        ok, problems, _ = validate_review(ctx)
        if not ok:
            print("真实上传被门禁拦下：")
            for p in problems:
                print("  -", p)
            sys.exit(1)
        saved = ctx.rs.data["review"].get("hashes") or {}
        _, _, now_hashes = validate_review(ctx)
        for k, h in now_hashes.items():
            if saved.get(k) and saved[k] != h:
                sys.exit(f"确认后产物已变更（{k}），旧审核失效；重新 review --confirm")
        if not _find_cover(ctx):
            sys.exit("真实上传被门禁拦下：封面缺失（先跑 paper-video-cover 产出 5-video-final/cover.*）")
        ctx.rs.data["publish"].update({"enabled": True, "dry_run": False, "confirmed_run_id": args.confirm})
        ctx.rs.save()
    ctx.rs.data["publish"]["dry_run"] = not bool(args.confirm)
    ctx.rs.save()
    results = retry_stage(ctx, "publish") if ctx.rs.stage("publish")["status"] in (
        "failed_retryable", "failed_permanent") else run_all(ctx, only=["publish"])
    print(json.dumps({"stage": "publish", "status": results}, ensure_ascii=False, indent=2))
    pub = ctx.rs.data["publish"]
    print(f"状态: upload_ready={pub['upload_ready']} uploading={pub['uploading']} uploaded={pub['uploaded']}")

def cmd_agents(args):
    """子智能体调度报告：派发波次 / 状态 / 下一步可派 / 卡点。"""
    from . import dispatch
    run_dir = _resolve_run_dir(args.run_dir)
    ctx = _ctx(run_dir)
    stages = [args.stage] if args.stage else [s for s in registry.stage_names()
                                              if registry.stage_contract(s).get("handoff_plan")]
    reps = [dispatch.report(ctx, s) for s in stages]
    if args.json:
        print(json.dumps(reps, ensure_ascii=False, indent=2))
    else:
        print("\n\n".join(dispatch.format_report(r) for r in reps))
    if any(not r["all_passed"] for r in reps):
        sys.exit(2)     # 有未完成 handoff：编排方据此决定是否继续派发

def main(argv=None):
    ap = argparse.ArgumentParser(prog="paperpipe", description=f"paperpipe {VERSION} — 论文讲解流水线执行器（v2：registry/8 态/receipt/handoff）")
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("init"); p.add_argument("source"); p.add_argument("--target", default="video")
    p.add_argument("--run-id", required=True); p.add_argument("--title")
    p.add_argument("--force", action="store_true", help="清空重建（旧产物删除）")
    p.set_defaults(fn=cmd_init)
    p = sub.add_parser("run"); p.add_argument("--auto", action="store_true")
    p.add_argument("--target"); p.add_argument("--stage"); p.add_argument("--run-dir"); p.set_defaults(fn=cmd_run)
    p = sub.add_parser("resume"); p.add_argument("--run-dir"); p.set_defaults(fn=cmd_resume)
    p = sub.add_parser("retry"); p.add_argument("stage"); p.add_argument("--run-dir"); p.set_defaults(fn=cmd_retry)
    p = sub.add_parser("status"); p.add_argument("--json", action="store_true"); p.add_argument("--run-dir"); p.set_defaults(fn=cmd_status)
    p = sub.add_parser("validate"); p.add_argument("--target", default="video"); p.set_defaults(fn=cmd_validate)
    p = sub.add_parser("review"); p.add_argument("--confirm", action="store_true"); p.add_argument("--by"); p.add_argument("--run-dir"); p.set_defaults(fn=cmd_review)
    p = sub.add_parser("publish"); p.add_argument("--dry-run", action="store_true"); p.add_argument("--confirm"); p.add_argument("--run-dir"); p.set_defaults(fn=cmd_publish)
    p = sub.add_parser("agents"); p.add_argument("--stage"); p.add_argument("--json", action="store_true"); p.add_argument("--run-dir"); p.set_defaults(fn=cmd_agents)
    args = ap.parse_args(argv)
    args.fn(args)

if __name__ == "__main__":
    main()
