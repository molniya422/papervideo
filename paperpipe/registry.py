"""paperpipe.registry — 单一注册表（routes/skills/agents/contracts.yaml）。

所有路由、技能合法性、阶段合同（requires/技能/产物/机器门/人工门/子智能体）、
target 终止阶段都以本目录四份 YAML 为唯一事实源；文档与 validate 从这里读取。

YAML 解析为自研子集（零第三方依赖）：支持嵌套映射、`- ` 列表（标量/映射）、
行内列表 `[a, b]`、引号、# 注释。缩进必须用空格。
"""
from __future__ import annotations
import functools, os, re

REG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "registry")

# ────────────────────────── YAML 子集解析 ──────────────────────────
def _scalar(v: str):
    v = v.strip()
    if v.startswith("[") and v.endswith("]"):
        inner = v[1:-1].strip()
        return [_scalar(x) for x in _split_inline(inner)] if inner else []
    if v.startswith("{") and v.endswith("}"):
        inner = v[1:-1].strip()
        out = {}
        for part in _split_inline(inner):
            k, _, val = part.partition(":")
            out[k.strip()] = _scalar(val)
        return out
    if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
        return v[1:-1]
    if v.lower() in ("true", "false"):
        return v.lower() == "true"
    if v in ("null", "~", ""):
        return None
    if re.fullmatch(r"-?\d+", v):
        return int(v)
    if re.fullmatch(r"-?\d+\.\d+", v):
        return float(v)
    return v

def _split_inline(s: str) -> list:
    out, buf, q = [], "", None
    for ch in s:
        if q:
            buf += ch
            if ch == q:
                q = None
        elif ch in "\"'":
            q = ch; buf += ch
        elif ch == ",":
            out.append(buf.strip()); buf = ""
        else:
            buf += ch
    if buf.strip():
        out.append(buf.strip())
    return out

def _strip_comment(line: str) -> str:
    out, q = "", None
    for ch in line:
        if q:
            out += ch
            if ch == q:
                q = None
        elif ch in "\"'":
            q = ch; out += ch
        elif ch == "#":
            break
        else:
            out += ch
    return out.rstrip()

def _parse_block(lines: list[tuple[int, str]], i: int, indent: int):
    """解析 indent 层的块（映射或列表），返回 (obj, next_i)。"""
    if i < len(lines) and lines[i][0] == indent and lines[i][1].startswith("- "):
        lst = []
        while i < len(lines) and lines[i][0] == indent and lines[i][1].startswith("- "):
            item = lines[i][1][2:].strip()
            i += 1
            m = re.match(r"^([\w.\-]+):(.*)$", item)
            if m and m.group(2).strip() == "":
                d, sub = {}, _parse_block(lines, i, indent + 2)[0] if i < len(lines) and lines[i][0] > indent else None
                if sub is not None:
                    d[m.group(1)] = sub
                    i = _skip_subtree(lines, i, indent)
                else:
                    d[m.group(1)] = None
                # 同一条目的后续键（缩进 > indent 的映射行）
                while i < len(lines) and lines[i][0] > indent and not lines[i][1].startswith("- "):
                    ind2, txt2 = lines[i]
                    k2, _, v2 = txt2.partition(":")
                    if v2.strip() == "":
                        sub2, i = _parse_block(lines, i + 1, ind2 + 1)
                        d[k2] = sub2
                    else:
                        d[k2.strip()] = _scalar(v2)
                        i += 1
                lst.append(d)
            elif m:
                d = {m.group(1): _scalar(m.group(2))}
                while i < len(lines) and lines[i][0] > indent and not lines[i][1].startswith("- "):
                    ind2, txt2 = lines[i]
                    k2, _, v2 = txt2.partition(":")
                    if v2.strip() == "":
                        sub2, i = _parse_block(lines, i + 1, ind2 + 1)
                        d[k2] = sub2
                    else:
                        d[k2.strip()] = _scalar(v2)
                        i += 1
                lst.append(d)
            else:
                lst.append(_scalar(item))
        return lst, i
    mp: dict = {}
    while i < len(lines) and lines[i][0] == indent and not lines[i][1].startswith("- "):
        key, _, val = lines[i][1].partition(":")
        key, val = key.strip(), val.strip()
        i += 1
        if val == "":
            if i < len(lines) and lines[i][0] > indent:
                sub, i = _parse_block(lines, i, lines[i][0])
                mp[key] = sub
            else:
                mp[key] = None
        else:
            mp[key] = _scalar(val)
    return mp, i

def _skip_subtree(lines, i, indent) -> int:
    while i < len(lines) and lines[i][0] > indent:
        i += 1
    return i

def parse_yaml(text: str):
    lines = []
    for raw in text.splitlines():
        line = _strip_comment(raw.replace("\t", "  "))
        if not line.strip():
            continue
        indent = len(line) - len(line.lstrip(" "))
        lines.append((indent, line.strip()))
    obj, _ = _parse_block(lines, 0, 0)
    return obj

# ────────────────────────── 加载与查询 ──────────────────────────
@functools.lru_cache(maxsize=1)
def _raw() -> dict:
    out = {}
    for name in ("routes", "skills", "agents", "contracts"):
        p = os.path.join(REG_DIR, f"{name}.yaml")
        with open(p, encoding="utf-8") as f:
            out[name] = parse_yaml(f.read())
    return out

def routes() -> list:
    return _raw()["routes"]["routes"]

def skills() -> dict:
    """id -> 技能条目（pipeline 全字段条目与 catalog 简条目合并）。"""
    s = _raw()["skills"]
    merged = {}
    for grp in ("pipeline", "catalog"):
        for e in s.get(grp, []) or []:
            merged[e["id"]] = {**e, "group": grp if grp == "catalog" else e.get("group", grp)}
    return merged

def skill_ids() -> set:
    return set(skills())

def is_skill(sid: str) -> bool:
    return sid in skill_ids()

def agents() -> list:
    return _raw()["agents"]["agents"]

def agent_roles() -> set:
    return {a["id"] for a in agents()}

def targets() -> dict:
    return _raw()["contracts"]["targets"]

def target_stages(target: str) -> list:
    t = targets().get(target)
    if not t:
        raise KeyError(f"未知 target: {target}（可选: {', '.join(targets())}）")
    return list(t["stages"])

def terminal_stage(target: str) -> str:
    return targets()[target]["terminal"]

def stage_names() -> list:
    """全序（拓扑序）= contracts.stages 键序。"""
    return list(_raw()["contracts"]["stages"].keys())

def stage_contract(stage: str) -> dict:
    return _raw()["contracts"]["stages"][stage]

def requires(stage: str) -> list:
    return list(stage_contract(stage).get("requires", []))

def conditional_skills(stage: str) -> list:
    return list(stage_contract(stage).get("conditional_skills", []) or [])

def primary_skill(stage: str) -> str | None:
    return stage_contract(stage).get("primary_skill")

def validate_registry(root: str | None = None) -> list:
    """注册表自检：阶段引用/requires 合法、技能 id 已注册、agent 角色合法、
    target 终止阶段在集合内；root 给定时额外做 skills.yaml ↔ 本地技能目录双向差集。"""
    problems = []
    stages = set(stage_names())
    for t, spec in targets().items():
        if spec["terminal"] not in spec["stages"]:
            problems.append(f"target {t}: 终止阶段 {spec['terminal']} 不在阶段集合内")
        for s in spec["stages"]:
            if s not in stages:
                problems.append(f"target {t}: 未知阶段 {s}")
    for name in stage_names():
        c = stage_contract(name)
        for r in c.get("requires", []):
            if r not in stages:
                problems.append(f"stage {name}: requires 未知阶段 {r}")
            elif stage_names().index(r) >= stage_names().index(name):
                problems.append(f"stage {name}: requires {r} 不是前置（拓扑序错误）")
        sid = c.get("primary_skill")
        if sid and not is_skill(sid):
            problems.append(f"stage {name}: primary_skill {sid} 未注册")
        for e in c.get("conditional_skills", []) or []:
            if not is_skill(e["skill"]):
                problems.append(f"stage {name}: 条件技能 {e['skill']} 未注册")
            for f in ("trigger", "required_output", "acceptance", "on_fail"):
                if not e.get(f):
                    problems.append(f"stage {name}: 条件技能 {e['skill']} 缺字段 {f}")
        for a in c.get("subagents", []) or []:
            if a not in agent_roles():
                problems.append(f"stage {name}: 子智能体 {a} 未注册")
    for r in routes():
        if r["target"] not in targets():
            problems.append(f"route {r['id']}: 未知 target {r['target']}")
        for sid in r.get("skills", []) or []:
            if not is_skill(sid):
                problems.append(f"route {r['id']}: 技能 {sid} 未注册")
    if root:
        cand1 = os.path.join(root, ".zcode", "skills")
        cand2 = os.path.join(root, "skills")   # 工作区包安装布局
        skills_dir = cand1 if os.path.isdir(cand1) else cand2
        local = set(os.listdir(skills_dir)) if os.path.isdir(skills_dir) else set()
        reg = skill_ids()
        for miss in sorted(local - reg):
            problems.append(f"本地技能未注册进 skills.yaml: {miss}")
        for extra in sorted(reg - local):
            problems.append(f"skills.yaml 注册了但本地缺失: {extra}")
    return problems
