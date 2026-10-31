"""paperpipe.state — 运行状态机（schema: paperpipe-state/3）。

每个 run 一个 pipeline-state.json，是唯一状态源。
8 种阶段状态，waiting/failed 细分，warn 降级为独立 warnings 列表：
  pending → running → passed
                    → waiting_for_agent   （等 agent 按技能产出内容）
                    → waiting_for_human   （人审门：复盘/发布确认）
                    → failed_retryable    （transient 重试耗尽，可 retry）
                    → failed_permanent    （permanent，需修配置/内容）
  not_applicable                        （target 不含此阶段）
下游启动前置：所有 requires ∈ {passed, not_applicable}（检查在 runner）。
旧 schema（paperpipe-state/1、/2）→ is_legacy：status 只读，变更命令拒绝。
"""
from __future__ import annotations
import json, os

from .registry import stage_names

STAGES = stage_names()
STATUSES = ["pending", "running", "waiting_for_agent", "waiting_for_human",
            "passed", "not_applicable", "failed_retryable", "failed_permanent"]
SCHEMA = "paperpipe-state/3"
LEGACY_SCHEMAS = ("paperpipe-state/1", "paperpipe-state/2")
STATE_FILE = "pipeline-state.json"
LOCK_FILE = "paperpipe.lock"
LOG_FILE = "run.log.jsonl"

# 需要人工/agent 补内容才能 passed 的阶段（自动 ≠ 全自动生成的显式声明）
HUMAN_GATES = {"xray": "deep-read 需 agent 按 paper-xray 技能填写",
               "figures": "图解产物需 agent 制作并登记",
               "retrospective": "复盘评分与证据需人工填写"}

def new_stage(name: str) -> dict:
    return {"stage": name, "status": "pending", "attempts": 0, "max_attempts": 3,
            "input_hash": None, "cached": False,
            "human_gate": HUMAN_GATES.get(name),
            "artifacts": [], "commands": [],
            "error": None, "warnings": [], "data": {}, "history": [],
            "started_at": None, "finished_at": None}

def new_state(run_id: str, source: str, target: str, config: dict) -> dict:
    return {
        "schema": SCHEMA,
        "run_id": run_id,
        "source": source,
        "target": target,
        "title": None,
        "created_at": utcnow(),
        "updated_at": utcnow(),
        "config": config,
        "stages": {s: new_stage(s) for s in STAGES},
        "artifacts": [],
        "review": {"confirmed": False, "confirmed_by": None, "confirmed_at": None,
                   "hashes": {}, "invalidated_reason": None},
        "publish": {"enabled": bool(config.get("publish", {}).get("enabled", False)),
                    "dry_run": bool(config.get("publish", {}).get("dry_run", True)),
                    "upload_ready": False, "uploading": False, "uploaded": False,
                    "confirmed_run_id": None, "receipt": None},
    }

def utcnow():
    from .util import utcnow as _u
    return _u()

class RunState:
    def __init__(self, run_dir: str):
        self.run_dir = os.path.abspath(run_dir)
        self.path = os.path.join(self.run_dir, STATE_FILE)
        self.data = json.load(open(self.path, encoding="utf-8")) if os.path.exists(self.path) else None

    @classmethod
    def create(cls, run_dir: str, run_id: str, source: str, target: str, config: dict, title: str | None = None) -> "RunState":
        rs = cls(run_dir)
        rs.data = new_state(run_id, source, target, config)
        rs.data["title"] = title
        rs.save()
        return rs

    @property
    def is_legacy(self) -> bool:
        return bool(self.data) and self.data.get("schema") in LEGACY_SCHEMAS

    def save(self):
        self.data["updated_at"] = utcnow()
        from .util import atomic_write_json
        atomic_write_json(self.path, self.data)

    def stage(self, name: str) -> dict:
        return self.data["stages"][name]

    def set_status(self, name: str, status: str, error: dict | None = None):
        assert status in STATUSES, status
        st = self.stage(name)
        st["status"] = status
        if status == "running":
            st["started_at"] = utcnow()
            st["attempts"] += 1
        if status in ("passed", "waiting_for_agent", "waiting_for_human",
                      "failed_retryable", "failed_permanent", "not_applicable"):
            st["finished_at"] = utcnow()
        st["error"] = error
        if status in ("failed_retryable", "failed_permanent") and error:
            st["history"].append({"ts": utcnow(), "attempt": st["attempts"],
                                  "class": error.get("cls"), "message": error.get("message")})
        self.save()

    def record_warning(self, name: str, message: str):
        """普通警告单独入 warnings 列表，不占用状态位。"""
        st = self.stage(name)
        if message not in st["warnings"]:
            st["warnings"].append(message)
        self.save()

    def record_audit(self, event: str, detail: dict):
        self.data.setdefault("audit", []).append({"ts": utcnow(), "event": event, **detail})
        self.save()

    def register_artifact(self, stage: str, path: str, kind: str = "file") -> dict:
        """登记产物到统一清单。拒绝运行目录外的文件（路径安全）。"""
        from .util import sha256_file
        ap = os.path.realpath(path)
        base = os.path.realpath(self.run_dir)
        if os.path.commonpath([ap, base]) != base:
            raise ValueError(f"产物越界：{path} 不在运行目录 {self.run_dir} 内")
        if not os.path.exists(ap):
            raise FileNotFoundError(ap)
        rel = os.path.relpath(ap, base).replace("\\", "/")
        entry = {"path": rel, "sha256": sha256_file(ap), "kind": kind,
                 "bytes": os.path.getsize(ap), "stage": stage, "registered_at": utcnow()}
        gl = self.data["artifacts"]
        old = next((a for a in gl if a["path"] == entry["path"]), None)
        if old:
            if old["sha256"] == entry["sha256"]:
                entry["registered_at"] = old["registered_at"]
            gl.remove(old)
        gl.append(entry)
        st = self.stage(stage)
        if not any(a["path"] == entry["path"] for a in st["artifacts"]):
            st["artifacts"].append({"path": entry["path"], "sha256": entry["sha256"], "kind": kind})
        self.save()
        return entry

    def artifacts_of(self, stage: str) -> list:
        return [a for a in self.data["artifacts"] if a.get("stage") == stage]

    def invalidate_review(self, reason: str):
        self.data["review"]["confirmed"] = False
        self.data["review"]["invalidated_reason"] = reason
        self.save()

    def summary(self) -> dict:
        st = self.data["stages"]
        return {
            "run_id": self.data["run_id"], "source": self.data["source"], "target": self.data["target"],
            "title": self.data.get("title"), "schema": self.data.get("schema"),
            "legacy": self.is_legacy, "updated_at": self.data["updated_at"],
            "stages": {k: {"status": v["status"], "attempts": v["attempts"],
                           "human_gate": v["human_gate"], "cached": v["cached"],
                           "warnings": len(v.get("warnings", [])),
                           "error": (v["error"] or {}).get("message") if v["error"] else None}
                       for k, v in st.items()},
            "artifacts_count": len(self.data["artifacts"]),
            "review": self.data["review"],
            "publish": self.data["publish"],
        }
