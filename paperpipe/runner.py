"""paperpipe.runner — DAG 执行：输入指纹缓存 / 重试退避 / 锁心跳 / 事件日志。

指纹 = sha256(阶段名 + 执行器版本 + 配置切片 + 阶段输入文件实时哈希 + 上游阶段指纹)。
- 缓存命中：status==passed 且 saved input_hash == 当前指纹 → 只重跑 check() 复核；
- 下游失效：任一输入文件变化或上游指纹变化 → 指纹不同 → 自动降级 pending 重跑；
- 历史保留：失败原因追加进 stage.history，resume 不清零（retry 命令才显式重置单阶段）。
"""
from __future__ import annotations
import glob as globmod
import os, time, traceback
from .adapters import ADAPTERS, RuntimeCtx, StageError, VERSION
from .state import RunState, LOCK_FILE, LOG_FILE
from .util import FileLock, atomic_append_jsonl, utcnow, sha256_file, sha256_obj, env_summary

def log(rs: RunState, level: str, stage: str, event: str, **data):
    atomic_append_jsonl(os.path.join(rs.run_dir, LOG_FILE),
                        {"ts": utcnow(), "level": level, "stage": stage, "event": event, **data})

def _glob_hash(ctx: RuntimeCtx, pattern: str) -> dict:
    """pattern 相对运行目录；"root:" 前缀相对工作区根。返回 {路径: sha256}。"""
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
    # 上游阶段指纹（保存值；上游重跑后会更新，从而级联失效下游）
    up = {u: ctx.rs.stage(u)["input_hash"] for u in _UPSTREAM.get(name, [])}
    # 配置切片：publish 阶段只看 publish；render 只看 render；其余看除 publish 外的配置
    cfg = ctx.cfg
    if name == "publish":
        cfg_slice = {"publish": cfg.get("publish")}
    elif name == "render":
        cfg_slice = {"render": cfg.get("render"), "target": ctx.rs.data["target"]}
    else:
        cfg_slice = {k: v for k, v in cfg.items() if k != "publish"}
    return sha256_obj({"stage": name, "ver": VERSION, "source": ctx.rs.data["source"],
                       "inputs": inputs, "upstream": up, "cfg": cfg_slice})

_UPSTREAM = {
    "brief": ["intake"], "acquire": ["brief"], "xray": ["acquire"], "figures": ["xray"],
    "render": ["figures"], "qa": ["render"], "retrospective": ["qa"], "publish": ["qa", "retrospective"],
}

def run_stage(ctx: RuntimeCtx, name: str) -> str:
    ad = ADAPTERS[name]
    rs = ctx.rs
    fp = fingerprint(ctx, name)
    st = rs.stage(name)
    if not ad.for_target(ctx):
        rs.set_status(name, "blocked", {"class": "gate", "message": f"target={rs.data['target']} 不含此阶段"})
        log(rs, "info", name, "skipped_by_target", target=rs.data["target"])
        return "blocked"
    # 缓存：passed 且指纹一致 → 只重跑 check() 复核
    if st["status"] == "passed" and st["input_hash"] == fp:
        chk = ad.check(ctx)
        if chk.status == "passed":
            log(rs, "info", name, "cache_hit")
            return "passed"
        log(rs, "warn", name, "stale_pass_downgrade", check=chk.status,
            message=(chk.error.message if chk.error else None))
        st["status"] = "pending"
        rs.save()
    # 指纹变化（含上游变化）→ 自动失效重跑；失败历史保留
    if st["input_hash"] is not None and st["input_hash"] != fp and st["status"] in ("passed", "warn", "failed"):
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
            rs.set_status(name, "failed", {"class": "transient", "message": "获取锁超时（有界退出），稍后 resume"})
            return "failed"
        try:
            rs.set_status(name, "running")
            log(rs, "info", name, "plan", plan=ad.plan(ctx))
            result = ad.run(ctx)
            log(rs, "info", name, "run", status=result.status, data=result.data)
            chk = ad.check(ctx)
            log(rs, "info", name, "check", status=chk.status, error=(chk.error.message if chk.error else None))
            final = chk if chk.status != "passed" else result
            if final.status in ("passed", "warn"):
                st = rs.stage(name)
                st["input_hash"] = fp
                st["cached"] = False
                rs.save()
                errd = {"cls": final.error.cls, "message": final.error.message} if final.error else None
                rs.set_status(name, final.status, errd)
                return final.status
            last_err = final.error or StageError("permanent", "check failed")
        except StageError as e:
            last_err = e
            log(rs, "error", name, "stage_error", cls=e.cls, message=e.message)
            if e.cls == "gate":
                rs.set_status(name, "blocked", {"class": "gate", "message": e.message})
                return "blocked"

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
    rs.set_status(name, "failed", err)
    return "failed"

def run_all(ctx: RuntimeCtx, only: list[str] | None = None, stop_on_fail: bool = True) -> dict:
    log(ctx.rs, "info", "runner", "env", env=env_summary(ctx.root))
    results = {}
    for name in [s for s in ADAPTERS if (not only or s in only)]:
        results[name] = run_stage(ctx, name)
        if stop_on_fail and results[name] == "failed":
            log(ctx.rs, "warn", name, "stop_on_fail")
            break
    log(ctx.rs, "info", "runner", "done", results=results)
    return results
