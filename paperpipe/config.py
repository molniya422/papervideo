"""paperpipe.config — 配置加载（内嵌默认 + 项目 paperpipe.yaml 覆盖）。"""
from __future__ import annotations
import json, os

DEFAULTS = {
    "mode": "auto",
    "target": "video",
    "audience": "general-tech",
    "defaults": {
        "visual_language": "blueprint",
        "accent": "cold-blue",
        "motion": "precise",
        "voice": "zh-male",
        "duration": "5-7m",
        "aspect": "16:9",
    },
    "reader_profile": {"math": "basic", "hands_on": "basic"},
    "route": "auto",
    "publish": {"enabled": False, "dry_run": True},
    "limits": {"retries": 3, "paper_concurrency": 2, "tts_concurrency": 4},
}

def _deep_merge(base: dict, over: dict) -> dict:
    out = dict(base)
    for k, v in (over or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _deep_merge(out[k], v)
        else:
            out[k] = v
    return out

def load_config(root: str, run_dir: str | None = None, overrides: dict | None = None) -> dict:
    cfg = dict(DEFAULTS)
    for cand in [os.path.join(root, "paperpipe.yaml"), os.path.join(root, "paperpipe.json"),
                 os.path.join(run_dir or "", "paperpipe.yaml"), os.path.join(run_dir or "", "paperpipe.json")]:
        if cand and os.path.exists(cand):
            with open(cand, "r", encoding="utf-8") as f:
                txt = f.read()
            if cand.endswith(".yaml"):
                cfg = _deep_merge(cfg, _mini_yaml(txt))
            else:
                cfg = _deep_merge(cfg, json.loads(txt))
    if overrides:
        cfg = _deep_merge(cfg, overrides)
    return cfg

def _mini_yaml(txt: str) -> dict:
    """极简 YAML：仅支持两层嵌套映射与标量（够 defaults 用，避免引依赖）。"""
    out: dict = {}
    stack = [(-1, out)]
    for raw in txt.splitlines():
        line = raw.split("#", 1)[0].rstrip()
        if not line.strip():
            continue
        indent = len(line) - len(line.lstrip())
        key, _, val = line.strip().partition(":")
        val = val.strip()
        while stack and indent <= stack[-1][0]:
            stack.pop()
        parent = stack[-1][1]
        if val == "":
            parent[key] = {}
            stack.append((indent, parent[key]))
        else:
            if val.startswith('"') and val.endswith('"'):
                val = val[1:-1]
            elif val.replace(".", "", 1).isdigit():
                val = float(val) if "." in val else int(val)
            elif val.lower() in ("true", "false"):
                val = val.lower() == "true"
            parent[key] = val
    return out
