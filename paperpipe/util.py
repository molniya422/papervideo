"""paperpipe.util — 原子写入 / 文件锁（带心跳）/ 哈希 / JSONL 事件日志。"""
from __future__ import annotations
import hashlib, json, os, socket, sys, tempfile, threading, time
from datetime import datetime, timezone

def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")

def sha256_file(path: str, chunk: int = 1 << 20) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            b = f.read(chunk)
            if not b:
                break
            h.update(b)
    return h.hexdigest()

def sha256_obj(obj) -> str:
    return hashlib.sha256(json.dumps(obj, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()

def atomic_write_text(path: str, text: str, encoding: str = "utf-8") -> None:
    """先写 .partial 再原子替换，中断不会留下半截产物。"""
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=os.path.basename(path) + ".", suffix=".partial", dir=os.path.dirname(os.path.abspath(path)))
    with os.fdopen(fd, "w", encoding=encoding, newline="") as f:
        f.write(text)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)

def atomic_write_json(path: str, obj) -> None:
    atomic_write_text(path, json.dumps(obj, ensure_ascii=False, indent=2) + "\n")

def atomic_append_jsonl(path: str, event: dict) -> None:
    """JSONL 追加走临时文件+替换，避免并发交错写坏。"""
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    line = json.dumps(event, ensure_ascii=False) + "\n"
    old = ""
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            old = f.read()
    tmp = path + ".partial"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(old + line)
    os.replace(tmp, path)

class FileLock:
    """文件锁 + 心跳：持锁期间每 heartbeat 秒 touch 一次 mtime；
    持锁进程崩溃后心跳停止，超过 stale_seconds 的锁可被抢占。"""
    def __init__(self, path: str, stale_seconds: int = 90, heartbeat: float = 15.0):
        self.path = path
        self.stale = stale_seconds
        self.heartbeat = heartbeat
        self._fd = None
        self._hb_stop = threading.Event()
        self._hb_thread = None

    def acquire(self, wait: float = 0.0) -> bool:
        deadline = time.time() + wait
        while True:
            try:
                self._fd = os.open(self.path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                os.write(self._fd, json.dumps({"pid": os.getpid(), "host": socket.gethostname(),
                                               "ts": utcnow()}).encode())
                self._start_heartbeat()
                return True
            except FileExistsError:
                try:
                    age = time.time() - os.path.getmtime(self.path)
                    if age > self.stale:
                        os.unlink(self.path)  # 心跳停止的过期锁，抢占
                        continue
                except OSError:
                    continue
                if time.time() >= deadline:
                    return False
                time.sleep(0.3)

    def _start_heartbeat(self):
        def beat():
            while not self._hb_stop.wait(self.heartbeat):
                try:
                    os.utime(self.path, None)
                except OSError:
                    return
        self._hb_stop.clear()
        self._hb_thread = threading.Thread(target=beat, daemon=True)
        self._hb_thread.start()

    def release(self):
        self._hb_stop.set()
        if self._hb_thread:
            self._hb_thread.join(timeout=2)
            self._hb_thread = None
        if self._fd is not None:
            try:
                os.close(self._fd)
            finally:
                try: os.unlink(self.path)
                except OSError: pass
                self._fd = None

def _cmd_version(cmd: str):
    try:
        import subprocess
        out = subprocess.run([cmd, "--version"], capture_output=True, text=True, timeout=10)
        return out.stdout.strip().splitlines()[0] if out.returncode == 0 else "MISSING"
    except Exception:
        return "MISSING"

def find_ffmpeg(root: str):
    """ffmpeg 解析：优先 tools 全量构建（Remotion 捆绑版缺 f32le 混流器，loudnorm/混音会崩，
    见 WORKFLOW §11 故障排查），其次 remotion-studio 捆绑版，最后 PATH。"""
    cand = os.path.join(root, "tools", "node_modules", "@ffmpeg-installer", "win32-x64", "ffmpeg.exe")
    if os.path.exists(cand):
        return cand
    cand = os.path.join(root, "remotion-studio", "node_modules", "@remotion",
                        "compositor-win32-x64-msvc", "ffmpeg.exe")
    if os.path.exists(cand):
        return cand
    from shutil import which
    return which("ffmpeg")

def source_kind(src: str) -> str:
    """输入源类型（acquire 触发谓词与 AcquireAdapter.plan 共用，避免两处判定漂移）。"""
    import re as _re
    if _re.fullmatch(r"\d{4}\.\d{4,5}(v\d+)?", src or ""):
        return "arxiv"
    if (src or "").lower().endswith(".pdf"):
        return "pdf"
    return "dir"

def safe_rel_path(base: str, p: str) -> str:
    """把 p 归一为 base 内的 posix 相对路径；绝对路径/越界（..）/盘符 → ValueError。
    handoff 信封与 receipt 的产物路径一律 run 目录相对——绝对路径会让 manifest/溯源
    语义失效（Round 7 穿透测试证实绝对路径曾被接受）。"""
    raw = (p or "").replace("\\", "/").strip()
    if not raw:
        raise ValueError("空路径")
    if os.path.isabs(raw) or os.path.splitdrive(raw)[0]:
        raise ValueError(f"拒绝绝对路径（须为运行目录相对）: {p}")
    norm = os.path.normpath(raw).replace("\\", "/")
    if norm == ".." or norm.startswith("../") or norm.startswith("/") or ":" in norm.split("/")[0]:
        raise ValueError(f"路径越界运行目录: {p}")
    full = os.path.abspath(os.path.join(base, norm))
    base_abs = os.path.abspath(base)
    if os.path.commonpath([full, base_abs]) != base_abs:
        raise ValueError(f"路径越界运行目录: {p}")
    return norm

def env_summary(root: str) -> dict:
    ff = find_ffmpeg(root)
    return {
        "python": sys.version.split()[0],
        "platform": sys.platform,
        "paperpipe_root": root,
        "ffmpeg": ff or "MISSING",
        "ffprobe": (ff.replace("ffmpeg", "ffprobe") if ff and os.path.exists(ff.replace("ffmpeg", "ffprobe")) else "MISSING"),
        "node": _cmd_version("node"),
        "uv": _cmd_version("uv"),
    }
