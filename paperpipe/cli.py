"""paperpipe.cli — 命令行入口（8 个子命令）。

  paperpipe init <PDF|arXiv> [--target video]   # 建 run（--force 清空重建）
  paperpipe run  [--auto] [--target video]      # 执行 DAG 到人审门/失败处
  paperpipe resume                              # 按输入指纹决定重跑范围（不清零失败历史）
  paperpipe retry <stage>                       # 显式重试单个失败阶段（清该阶段尝试计数）
  paperpipe status [--json]
  paperpipe validate [--target video]           # 按路线检查组件/引擎/技能文件
  paperpipe review --confirm [--by NAME]        # 可验证人审门（QA/复盘/占位符/lessons 核对）
  paperpipe publish --dry-run | --confirm       # 真实上传需 review + publish.command
"""
from __future__ import annotations
import argparse, json, os, re, shutil, sys

from .adapters import ADAPTERS, RuntimeCtx, VERSION
from .config import load_config
from .runner import run_all, run_stage
from .state import RunState
from .util import atomic_write_text, atomic_append_jsonl, env_summary, utcnow, sha256_file

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUTS = os.path.join(ROOT, "output")

def _safe_run_dir(run_id: str) -> str:
    """run_id 白名单 + 运行目录必须落在 output/ 内（路径安全）。"""
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
                         "env": env_summary(ROOT), "run_id": args.run_id, "source": args.source})
    print(json.dumps(rs.summary(), ensure_ascii=False, indent=2))

def cmd_run(args):
    run_dir = _resolve_run_dir(args.run_dir)
    ctx = _ctx(run_dir, {"mode": "auto"} if args.auto else None)
    if args.target:
        ctx.rs.data["target"] = args.target
        ctx.rs.save()
    only = args.stage.split(",") if args.stage else None
    results = run_all(ctx, only=only)
    print(json.dumps(results, ensure_ascii=False, indent=2))

def cmd_resume(args):
    run_dir = _resolve_run_dir(args.run_dir)
    ctx = _ctx(run_dir)
    # 按输入指纹决定重跑范围：指纹变化或 pending → 重跑（attempts 清零，新输入新预算）；
    # 失败但指纹未变 → 保留 attempts 与历史（用 retry 显式重试）
    from .runner import fingerprint
    reset = []
    for name in ADAPTERS:
        st = ctx.rs.stage(name)
        fp = fingerprint(ctx, name)
        if st["status"] == "passed" and st["input_hash"] == fp:
            continue  # 缓存命中，交给 run 的 check 复核
        if st["input_hash"] is not None and st["input_hash"] != fp and st["status"] != "failed":
            st["status"] = "pending"; st["attempts"] = 0; st["error"] = None
            reset.append(name)
        elif st["status"] == "pending":
            st["attempts"] = 0
            reset.append(name)
        # failed 且指纹未变：保留（retry 处理）
    ctx.rs.save()
    if reset:
        print("指纹变化，重跑范围:", ", ".join(reset))
    results = run_all(ctx)
    print(json.dumps(results, ensure_ascii=False, indent=2))

def cmd_retry(args):
    run_dir = _resolve_run_dir(args.run_dir)
    ctx = _ctx(run_dir)
    if args.stage not in ADAPTERS:
        sys.exit(f"未知阶段: {args.stage}（可选: {', '.join(ADAPTERS)}）")
    st = ctx.rs.stage(args.stage)
    st["status"] = "pending"
    st["attempts"] = 0
    st["error"] = None
    ctx.rs.save()
    results = run_stage(ctx, args.stage)
    print(json.dumps({args.stage: results}, ensure_ascii=False, indent=2))

def cmd_status(args):
    run_dir = _resolve_run_dir(args.run_dir)
    s = _ctx(run_dir).rs.summary()
    print(json.dumps(s, ensure_ascii=False, indent=2) if args.json else
          "\n".join(f"{k:<14} {v['status']:<8} attempts={v['attempts']}"
                    f"{' [人审门]' if v['human_gate'] else ''}{' ERR:' + v['error'] if v['error'] else ''}"
                    for k, v in s["stages"].items())
          + f"\nrun_id={s['run_id']} target={s['target']} review_confirmed={s['review']['confirmed']} "
            f"publish={ {k: s['publish'][k] for k in ('upload_ready','uploading','uploaded')} }")

def cmd_validate(args):
    target = args.target or "video"
    env = env_summary(ROOT)
    ok, bad = [], []
    for k in ("python", "platform", "paperpipe_root"):
        ok.append(f"{k}={env[k]}")
    for k in ("ffmpeg", "ffprobe", "node", "uv"):
        (ok if env[k] != "MISSING" else bad).append(f"{k}={env[k]}")
    # 技能：不只数数量，核对关键技能文件存在
    skills_dir = os.path.join(ROOT, ".zcode", "skills")
    required = ["paper-explain", "paper-xray", "design-intake", "prompt-forge", "humanize-writing",
                "video-production-guide", "video-retrospective", "video-qa-frameproof"]
    route_skills = {"video": ["remotion-video", "motion-lab", "wise-motion", "paper-video-cover"],
                    "md": ["visual-explainer", "flowchart"], "slides": ["paper-to-beamer", "paper-slides-to-video"]}
    for s in required + route_skills.get(target, []):
        p = os.path.join(skills_dir, s, "SKILL.md")
        (ok if os.path.isfile(p) else bad).append(f"skill:{s}={'OK' if os.path.isfile(p) else 'MISSING'}")
    ok.append(f"skills_total={len(os.listdir(skills_dir)) if os.path.isdir(skills_dir) else 0}")
    # video 路线附加：remotion-studio、合成配置
    if target in ("video", "slides"):
        studio = os.path.join(ROOT, "remotion-studio", "package.json")
        (ok if os.path.isfile(studio) else bad).append(f"remotion-studio={'OK' if os.path.isfile(studio) else 'MISSING'}")
        if os.path.isdir(OUTPUTS):
            for d in _run_dirs():
                rs = RunState(d)
                if rs.data and rs.data.get("target") == "video" and                         os.path.isfile(os.path.join(d, "4-video", "narration.json")):
                    # 只对真正进入渲染输入阶段的 run 要求配置合成
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
    if not args.confirm:
        print("人审清单（逐项确认后加 --confirm；确认时会程序化核对）：\n"
              "  1) QA 阶段 passed\n  2) 解释力/视觉叙事/听审\n"
              "  3) 事实确认（数字/结论 vs 论文）\n  4) retrospective.md 已填写（评分+证据，无占位符）\n"
              "  5) lessons.md 含具体规则")
        sys.exit(2)
    from .adapters import validate_review
    ok, problems, hashes = validate_review(ctx)
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
    if args.confirm:
        if ctx.rs.data["run_id"] != args.confirm:
            sys.exit(f"run_id 不匹配: 期望 {ctx.rs.data['run_id']}")
        # 人审门 + 哈希有效期
        from .adapters import validate_review
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
        ctx.rs.data["publish"].update({"enabled": True, "dry_run": False, "confirmed_run_id": args.confirm})
        ctx.rs.save()
    ctx.rs.data["publish"]["dry_run"] = not bool(args.confirm)
    ctx.rs.save()
    results = run_stage(ctx, "publish")
    print(json.dumps({"stage": "publish", "status": results}, ensure_ascii=False, indent=2))
    pub = ctx.rs.data["publish"]
    print(f"状态: upload_ready={pub['upload_ready']} uploading={pub['uploading']} uploaded={pub['uploaded']}")

def main(argv=None):
    ap = argparse.ArgumentParser(prog="paperpipe", description=f"paperpipe {VERSION} — 论文讲解流水线执行器")
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
    args = ap.parse_args(argv)
    args.fn(args)

if __name__ == "__main__":
    main()
