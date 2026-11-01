"""paperpipe.runner — DAG 执行 v2：前置门禁 / 输入指纹缓存 / 新状态停机规则 / receipt 验证。

停机规则（不可越过的门）：
- 阶段启动前：所有 requires ∈ {passed, not_applicable}，否则 skipped_by_prerequisite 审计事件并停止；
- waiting_for_agent / waiting_for_human / failed_retryable / failed_permanent 一律停止下游；
- target 不含的阶段 → not_applicable（一次性，含审计事件）；
- 阶段 passed 前：receipts.verify_stage() 验证技能凭据，缺失 → waiting_for_agent（补凭据后 resume）。
指纹 = sha256(阶段名 + 执行器版本 + 配置切片 + 阶段输入文件实时哈希 + 上游阶段指纹)。
"""
from __future__ import annotations
import glob as globmod
import os, time, traceback

from . import registry, receipts
from .adapters import ADAPTERS, RuntimeCtx, StageError, VERSION
from .state import RunState, LOCK_FILE, LOG_FILE
from .util import FileLock, atomic_append_jsonl, utcnow, sha256_file, sha256_obj, env_summary

def log(rs: RunState, level: str, stage: str, event: str, **data):
    atomic_append_jsonl(os.path.join(rs.run_dir, LOG_FILE),
                        {"ts": utcnow(), "level": level, "stage": stage, "event": event, **data})

def _glob_hash(ctx: RuntimeCtx, pattern: str) -> dict:
    base = ctx.root if pattern.startswith("root:") else ctx.run_dir
    pat = pattern[5:] if pattern.startswith("root:") else pattern
    out = {}
    matches = sorted(globmod.glob(os.path.join(base, pat), recursive=True)) if any(c in pat for c in "*?[") else (
        [os.path.join(base, pat)] if os.path.exists(os.path.join(base, pat)) else [])
    for p in matches:
        if os.path.isfile(p):
            rel = os.path.relpath(p, ctx.run_dir).replace("\\", "/")
            out[rel] = sha256_file(p)
    return out

def fingerprint(ctx: RuntimeCtx, name: str) -> str:
    ad = ADAPTERS[name]
    inputs = {}
    for pat in ad.inputs(ctx):
        inputs.update(_glob_hash(ctx, pat))
    up = {u: ctx.rs.stage(u)["input_hash"] for u in registry.requires(name)}
    cfg = ctx.cfg
    if name == "publish":
        cfg_slice = {"publish": cfg.get("publish")}
    elif name == "render":
        cfg_slice = {"render": cfg.get("render"), "target": ctx.rs.data["target"]}
    else:
        cfg_slice = {k: v for k, v in cfg.items() if k != "publish"}
    return sha256_obj({"stage": name, "ver": VERSION, "source": ctx.rs.data["source"],
                       "inputs": inputs, "upstream": up, "cfg": cfg_slice})

def topo_sort(stages: list[str]) -> list[str]:
    """按注册表拓扑序重排（忽略用户传入顺序）。"""
    order = registry.stage_names()
    known = [s for s in order if s in set(stages)]
    unknown = [s for s in stages if s not in order]
    if unknown:
        raise KeyError(f"未知阶段: {', '.join(unknown)}（可选: {', '.join(order)}）")
    return known

def check_prerequisites(ctx: RuntimeCtx, name: str) -> None:
    """前置必须全部 passed/not_applicable，否则 SystemExit（retry/单跑共用）。"""
    unmet = []
    for r in registry.requires(name):
        st = ctx.rs.stage(r)["status"]
        if st not in ("passed", "not_applicable"):
            unmet.append(f"{r}={st}")
    if unmet:
        raise SystemExit(f"阶段 {name} 前置不满足（requires {registry.requires(name)}）: {', '.join(unmet)}；"
                         f"先完成前置或 resume")

def refuse_legacy(rs: RunState, command: str):
    if rs.is_legacy:
        raise SystemExit(
            f"拒绝执行 {command}：这是旧 schema（{rs.data.get('schema')}）的 legacy run，"
            f"缺少 receipt/handoff 数据，无法满足 v2 门禁。"
            f"展示保留不动；需要继续时用 `paperpipe init --force` 重建（见 docs/baseline-2026-10-31.md §4）。")

def run_stage(ctx: RuntimeCtx, name: str) -> str:
    ad = ADAPTERS[name]
    rs = ctx.rs
    st = rs.stage(name)
    if not ad.for_target(ctx):
        if st["status"] != "not_applicable":
            rs.set_status(name, "not_applicable", {"class": "gate", "message": f"target={rs.data['target']} 不含此阶段"})
            rs.record_audit("not_applicable", {"stage": name, "target": rs.data["target"]})
            log(rs, "info", name, "not_applicable", target=rs.data["target"])
        return "not_applicable"
    fp = fingerprint(ctx, name)
    if st["status"] == "passed" and st["input_hash"] == fp:
        chk = ad.check(ctx)
        if chk.status == "passed":
            log(rs, "info", name, "cache_hit")
            return "passed"
        log(rs, "warn", name, "stale_pass_downgrade", check=chk.status,
            message=(chk.error.message if chk.error else None))
        st["status"] = "pending"
        rs.save()
    if st["input_hash"] is not None and st["input_hash"] != fp and \
            st["status"] in ("passed", "waiting_for_agent", "waiting_for_human",
                             "failed_retryable", "failed_permanent"):
        st["history"].append({"ts": utcnow(), "event": "invalidated",
                              "old_hash": st["input_hash"], "new_hash": fp})
        st["status"] = "pending"
        st["attempts"] = 0
        st["error"] = None
        rs.save()
        log(rs, "info", name, "invalidated_by_input_change")
    retries = int(ctx.cfg["limits"].get("retries", 3))
    last_err: StageError | None = None
    while st["attempts"] < retries:
        lock = FileLock(os.path.join(rs.run_dir, LOCK_FILE), stale_seconds=90, heartbeat=15)
        if not lock.acquire(wait=10):
            log(rs, "warn", name, "locked_busy_bounded_exit")
            rs.set_status(name, "failed_retryable", {"class": "transient", "message": "获取锁超时（有界退出），稍后 resume"})
            return "failed_retryable"
        try:
            rs.set_status(name, "running")
            log(rs, "info", name, "plan", plan=ad.plan(ctx))
            from .adapters import ensure_stage_handoffs
            ensure_stage_handoffs(ctx, name)
            result = ad.run(ctx)
            log(rs, "info", name, "run", status=result.status, data=result.data)
            chk = ad.check(ctx)
            log(rs, "info", name, "check", status=chk.status, error=(chk.error.message if chk.error else None))
            final = chk if chk.status != "passed" else result
            if final.status == "passed":
                # 子智能体 handoff 门（handoff_plan 里的全部信封必须 passed）
                from .adapters import stage_handoffs_passed
                hok, hbad = stage_handoffs_passed(ctx, name)
                if not hok:
                    log(rs, "warn", name, "handoff_pending", bad=hbad)
                    st = rs.stage(name)
                    st["input_hash"] = fp
                    rs.save()
                    rs.set_status(name, "waiting_for_agent",
                                  {"class": "agent", "message": "子智能体 handoff 未完成: " + "; ".join(hbad)})
                    return "waiting_for_agent"
                # 技能凭据验证（替换旧字符串匹配）；缺失 → waiting_for_agent
                rproblems = receipts.verify_stage(ctx, name)
                if rproblems:
                    for p in rproblems:
                        log(rs, "warn", name, "receipt_missing", message=p)
                    st = rs.stage(name)
                    st["input_hash"] = fp
                    rs.save()
                    rs.set_status(name, "waiting_for_agent",
                                  {"class": "agent", "message": "技能凭据缺失: " + "; ".join(rproblems)})
                    return "waiting_for_agent"
                st = rs.stage(name)
                st["input_hash"] = fp
                st["cached"] = False
                rs.save()
                rs.set_status(name, "passed")
                return "passed"
            if final.status in ("waiting_for_agent", "waiting_for_human"):
                st = rs.stage(name)
                st["input_hash"] = fp if final.status == "waiting_for_agent" else st["input_hash"]
                rs.save()
                errd = {"cls": final.error.cls, "message": final.error.message} if final.error else None
                rs.set_status(name, final.status, errd)
                return final.status
            last_err = final.error or StageError("permanent", "check failed")
        except StageError as e:
            last_err = e
            log(rs, "error", name, "stage_error", cls=e.cls, message=e.message)
            if e.cls == "agent":
                rs.set_status(name, "waiting_for_agent", {"class": "agent", "message": e.message})
                return "waiting_for_agent"
            if e.cls == "human":
                rs.set_status(name, "waiting_for_human", {"class": "human", "message": e.message})
                return "waiting_for_human"
        except Exception as e:
            last_err = StageError("transient", f"{type(e).__name__}: {e}")
            log(rs, "error", name, "unhandled", message=str(e), trace=traceback.format_exc()[-1500:])
        finally:
            lock.release()
        st = rs.stage(name)
        if last_err and last_err.cls == "transient" and st["attempts"] < retries:
            wait = 2 ** st["attempts"]
            log(rs, "warn", name, "retry_backoff", wait_s=wait)
            time.sleep(wait)
        else:
            break
    err = (last_err.__dict__ if last_err else {"cls": "permanent", "message": "unknown"})
    if err.get("cls") == "permanent":
        try:
            rep = ad.repair(ctx, StageError(err["cls"], err["message"]))
            if rep.status == "passed":
                rs.set_status(name, "passed")
                return "passed"
        except Exception as e:
            log(rs, "warn", name, "repair_failed", message=str(e))
    final_status = "failed_retryable" if err.get("cls") == "transient" else "failed_permanent"
    rs.set_status(name, final_status, err)
    return final_status

def _prereq_ok(ctx: RuntimeCtx, name: str) -> tuple[bool, list]:
    unmet = [f"{r}={ctx.rs.stage(r)['status']}" for r in registry.requires(name)
             if ctx.rs.stage(r)["status"] not in ("passed", "not_applicable")]
    return (not unmet), unmet

def run_all(ctx: RuntimeCtx, only: list[str] | None = None, stop_on_fail: bool = True) -> dict:
    log(ctx.rs, "info", "runner", "env", env=env_summary(ctx.root))
    results = {}
    stages = topo_sort(only) if only else registry.stage_names()
    for name in stages:
        ok, unmet = _prereq_ok(ctx, name)
        if not ok:
            ctx.rs.record_audit("skipped_by_prerequisite", {"stage": name, "unmet": unmet})
            log(ctx.rs, "warn", name, "skipped_by_prerequisite", unmet=unmet)
            results[name] = "skipped_by_prerequisite"
            if stop_on_fail:
                log(ctx.rs, "warn", "runner", "stop_by_prerequisite", blocked_stage=name)
            break
        results[name] = run_stage(ctx, name)
        if results[name] in ("waiting_for_agent", "waiting_for_human",
                             "failed_retryable", "failed_permanent"):
            log(ctx.rs, "warn", name, "runner_stop_on_state", state=results[name])
            break
    log(ctx.rs, "info", "runner", "done", results=results)
    return results

def retry_stage(ctx: RuntimeCtx, name: str) -> str:
    """显式重试：同样过前置门禁；只重置目标阶段。"""
    if name not in ADAPTERS:
        raise SystemExit(f"未知阶段: {name}（可选: {', '.join(ADAPTERS)}）")
    check_prerequisites(ctx, name)
    st = ctx.rs.stage(name)
    st["status"] = "pending"
    st["attempts"] = 0
    st["error"] = None
    ctx.rs.save()
    return run_stage(ctx, name)
