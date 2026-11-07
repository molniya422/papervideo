"""paperpipe.preview — 渲染前人工预览包 + 分类修改意见（成片预览门）。

预览包（output/<run>/4-video/preview/）：
  index.html              预览工作台：逐章 iframe 播放 + 每章元信息（时长/运镜/转场/字幕句）
  storyboard.md           逐章表：标题/时长/转场/相机 cue 数/3D 对象/数据组件/字幕句数
  narration.md            逐章逐句文稿（含秒数）——文稿审在这里
  revisions.json          分类修改意见（open/resolved，带 id 可跟踪）
  preview_confirmed.json  过审凭据 —— RenderAdapter 的渲染人工门凭证（preview --confirm 写入）

修改意见十类（category → 唯一责任产物/角色，路由修复用）：
  script 文稿 | camera 运镜 | transition 转场 | model 建模 | motion 动效 |
  layout 布局 | pacing 节奏 | audio 声音 | dataviz 数据 | caption 字幕

纪律：preview --confirm 是硬门 —— 意见未全 resolved 不许渲成片（RenderAdapter 检查）；
minor 意见可由编排方（导演）直接改产物，major 意见必须重派责任角色。
"""
from __future__ import annotations
import json, os, re

from .util import atomic_write_text, atomic_write_json, utcnow

REV_SCHEMA = "paperpipe-revisions/1"

# 分类 → (标签, 责任产物, 责任角色, 修复方式)
CATEGORIES = {
    "script":    ("文稿",   "4-video/narration.json / 3-figures/examples_spec.json", "example_writer", "改句子→重跑 captions/字幕"),
    "camera":    ("运镜",   "3-figures/enriched_spec.json camera_path",              "spec_enricher",  "改相机 cue→重合成该章"),
    "transition": ("转场",  "enriched_spec transition_in / aggregator 章节包装",      "aggregator",     "换转场类型→重合成"),
    "model":     ("建模",   "4-video/hf/compositions/chXX.html / blender/",          "model_builder",  "改模型→重渲该章"),
    "motion":    ("动效",   "style_refs.json + 章节 tweens",                          "model_builder",  "改动效→重渲该章"),
    "layout":    ("布局",   "章节布局 / lib3d 标注层",                                "aggregator",     "改布局→重跑布局审计"),
    "pacing":    ("节奏",   "narration.json 时长 / 章节 duration",                    "spec_enricher",  "改持时→重排时间轴"),
    "audio":     ("声音",   "bgm/sfx 配置 / audio_master.wav",                        "render_worker",  "改音频→重混母带"),
    "dataviz":   ("数据",   "3-figures/dataviz_spec.json / 数据组件",                 "data_viz_builder", "改数据组件→重渲该章"),
    "caption":   ("字幕",   "4-video/hf/compositions/captions.html",                  "aggregator",     "改字幕→重渲字幕层"),
}

def _prev_dir(ctx) -> str:
    d = ctx.out("4-video", "preview")
    os.makedirs(d, exist_ok=True)
    return d

def _rev_file(ctx) -> str:
    return os.path.join(_prev_dir(ctx), "revisions.json")

def _load_revs(ctx) -> dict:
    p = _rev_file(ctx)
    if os.path.exists(p):
        return json.load(open(p, encoding="utf-8"))
    return {"schema": REV_SCHEMA, "items": []}

def _save_revs(ctx, rev: dict) -> str:
    atomic_write_json(_rev_file(ctx), rev)
    return _rev_file(ctx)

# ── 修改意见 CRUD ──────────────────────────────────────────────
def revise_add(ctx, category: str, wanted: str, target: str = "", chapter=None,
               severity: str = "major", note: str = "") -> dict:
    if category not in CATEGORIES:
        raise ValueError(f"未知意见类别: {category}（可选: {'/'.join(CATEGORIES)}）")
    rev = _load_revs(ctx)
    n = len(rev["items"]) + 1
    item = {"id": f"R{n:03d}", "category": category, "label": CATEGORIES[category][0],
            "chapter": chapter, "target": target, "wanted": wanted,
            "severity": severity if severity in ("major", "minor") else "major",
            "note": note, "status": "open", "created_at": utcnow()}
    rev["items"].append(item)
    _save_revs(ctx, rev)
    return item

def revise_list(ctx, status: str | None = None) -> list:
    items = _load_revs(ctx)["items"]
    return [i for i in items if status is None or i["status"] == status]

def revise_resolve(ctx, rid: str, note: str = "") -> dict:
    rev = _load_revs(ctx)
    for it in rev["items"]:
        if it["id"].lower() == rid.lower():
            it["status"] = "resolved"
            it["resolved_at"] = utcnow()
            if note:
                it["note"] = (it.get("note", "") + " | 修复: " + note).strip(" |")
            _save_revs(ctx, rev)
            return it
    raise ValueError(f"意见不存在: {rid}")

# ── 预览包生成 ─────────────────────────────────────────────────
def _sources(ctx) -> tuple[list, list, dict]:
    """返回 (shots, scenes_by_chapter, compositions 相对目录)。"""
    shots = []
    np = ctx.out("4-video", "narration.json")
    if os.path.exists(np):
        shots = json.load(open(np, encoding="utf-8")).get("shots", [])
    scenes = {}
    ep = ctx.out("3-figures", "enriched_spec.json")
    if os.path.exists(ep):
        for sc in json.load(open(ep, encoding="utf-8")).get("enriched_scenes", []):
            scenes[sc.get("chapter")] = sc
    rcfg = ctx.cfg.get("render") or {}
    comp_rel = "compositions"
    if rcfg.get("cwd"):
        comp_rel = rcfg["cwd"].replace("\\", "/").strip("/") + "/compositions"
    comp_dir = ctx.out(comp_rel)
    return shots, scenes, comp_dir

def _chapters(ctx) -> list:
    shots, scenes, comp_dir = _sources(ctx)
    files = sorted(f for f in os.listdir(comp_dir) if re.fullmatch(r"ch\d+\.html", f)) \
        if os.path.isdir(comp_dir) else []
    chs, seen = [], set()
    for f in files:                       # 有合成文件的章为主序
        n = int(f[2:-5])
        seen.add(n)
        chs.append(n)
    for s in shots:                       # 无合成文件的章（数据章）补齐
        n = s.get("chapter")
        if n is not None and n not in seen:
            chs.append(n); seen.add(n)
    return sorted(chs)

def generate(ctx, chapters: list | None = None) -> dict:
    d = _prev_dir(ctx)
    shots, scenes, comp_dir = _sources(ctx)
    shot_by = {s.get("chapter"): s for s in shots}
    want = chapters if chapters else _chapters(ctx)
    meta_rows, sb_rows, narr_lines = [], [], ["# 旁白文稿（逐章逐句，含秒数）", ""]
    for n in want:
        s, sc = shot_by.get(n), scenes.get(n, {})
        sentences = (s or {}).get("sentences", [])
        cues = sc.get("camera_path") or []
        obj_names = [o.get("fn", "?") for o in (sc.get("objects") or [])]
        meta_rows.append({
            "chapter": n, "title": (s or sc).get("title", f"章 {n}"),
            "file": f"ch{n:02d}.html" if os.path.exists(os.path.join(comp_dir, f"ch{n:02d}.html")) else None,
            "duration": (s or {}).get("duration") or sc.get("duration_s"),
            "transition": (s or sc).get("transition_in"), "is_3d": (s or sc).get("is_3d"),
            "camera_cues": len(cues), "objects": obj_names,
            "data_overlays": sc.get("data_overlays") or [],
            "sentences": [{"text": x.get("text"), "start": x.get("start"), "seconds": x.get("seconds")}
                          for x in sentences]})
        sb_rows.append("| {ch} | {t} | {dur} | {tr} | {cc} | {ob} | {dv} | {ns} |".format(
            ch=n, t=meta_rows[-1]["title"], dur=meta_rows[-1]["duration"] or "—",
            tr=meta_rows[-1]["transition"] or "—", cc=len(cues),
            ob=", ".join(obj_names) or "—",
            dv=", ".join(o.get("component", "?") for o in meta_rows[-1]["data_overlays"]) or "—",
            ns=len(sentences)))
        narr_lines += [f"## 章 {n} · {meta_rows[-1]['title']}（{meta_rows[-1]['duration'] or '?'}s）", ""]
        for x in sentences:
            narr_lines.append(f"- [{x.get('start', '?')}s +{x.get('seconds', '?')}s] {x.get('text', '')}")
        narr_lines.append("")
    atomic_write_json(os.path.join(d, "preview_meta.json"),
                      {"generated_at": utcnow(), "chapters": meta_rows})
    atomic_write_text(os.path.join(d, "storyboard.md"),
                      "# 分镜表（预览审核用）\n\n| 章 | 标题 | 时长s | 转场 | 相机cue | 3D对象 | 数据组件 | 字幕句 |\n"
                      "|---|---|---|---|---|---|---|---|\n" + "\n".join(sb_rows) + "\n")
    atomic_write_text(os.path.join(d, "narration.md"), "\n".join(narr_lines) + "\n")
    if not os.path.exists(_rev_file(ctx)):
        _save_revs(ctx, {"schema": REV_SCHEMA, "items": []})
    comp_from_preview = os.path.relpath(comp_dir, d).replace("\\", "/")   # 预览页 iframe 的相对根
    _write_index(ctx, d, meta_rows, comp_from_preview)
    try:
        ctx.rs.register_artifact("render", os.path.join(d, "index.html"), "preview-pack")
    except (ValueError, FileNotFoundError, KeyError):
        pass    # 阶段未初始化时跳过登记（预览包本身已落盘）
    return {"dir": os.path.relpath(d, ctx.run_dir).replace("\\", "/"),
            "chapters": len(meta_rows), "has_compositions": os.path.isdir(comp_dir)}

def _write_index(ctx, d: str, rows: list, comp_rel: str = "../hf/compositions") -> None:
    data = json.dumps(rows, ensure_ascii=False).replace("</", "<\\/")
    html = """<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8">
<title>预览工作台</title><style>
body{margin:0;font-family:"Microsoft YaHei",sans-serif;background:#0a0a12;color:#f5ede2;display:flex;height:100vh}
nav{width:230px;overflow-y:auto;border-right:1px solid #333;padding:8px}
nav button{display:block;width:100%;text-align:left;margin:3px 0;padding:7px 9px;background:#16161f;color:#f5ede2;
border:1px solid #2c2c3a;border-radius:6px;cursor:pointer;font-size:13px}
nav button:hover{border-color:#ff8c42} nav button.on{background:#2a1c10;border-color:#ff8c42}
main{flex:1;display:flex;flex-direction:column}
#stage{flex:1;position:relative;background:#000}
#stage iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
#meta{max-height:34vh;overflow-y:auto;padding:10px 14px;border-top:1px solid #333;font-size:13px;line-height:1.7}
#meta b{color:#ff8c42}
#reload{position:absolute;top:8px;right:10px;z-index:2;background:#ff8c42;border:0;color:#0a0a12;
padding:6px 12px;border-radius:5px;cursor:pointer;font-weight:700}
small{color:#8ab4c8}
</style></head><body>
<nav id="nav"></nav>
<main><div id="stage"><button id="reload" onclick="play(cur)">▶ 重播本章</button>
<iframe id="fr" title="chapter"></iframe></div><div id="meta"></div></main>
<script>
const CH = %s; let cur = null;
const nav = document.getElementById('nav');
CH.forEach((c, i) => {
  const b = document.createElement('button');
  b.textContent = (c.file ? '' : '〔无合成〕') + 'ch' + String(c.chapter).padStart(2, '0') + ' ' + c.title;
  b.onclick = () => play(i); nav.appendChild(b);
});
function play(i){ cur = i; const c = CH[i];
  [...nav.children].forEach((b, j) => b.classList.toggle('on', j === i));
  const fr = document.getElementById('fr');
  fr.src = c.file ? ('%COMP%' + '/' + c.file + '?t=' + Date.now()) : 'about:blank';
  const sen = (c.sentences || []).map(s => '<div><small>[' + s.start + 's +' + s.seconds + 's]</small> ' + s.text + '</div>').join('');
  document.getElementById('meta').innerHTML =
    '<b>章 ' + c.chapter + ' · ' + c.title + '</b>　' + (c.duration || '?') + 's　转场:' + (c.transition || '—') +
    '　3D:' + (c.is_3d ? '是' : '否') + '　相机cue:' + c.camera_cues +
    '　对象:' + (c.objects.join(', ') || '—') + '<br>' + sen +
    '<br><small>审看后用 paperpipe revise add 登记意见；全部 resolved 后 preview --confirm 过审。</small>';
}
if (CH.length) play(0);
</script></body></html>"""
    atomic_write_text(os.path.join(d, "index.html"),
                      html.replace("%s", data).replace("%COMP%", comp_rel))

# ── 过审门 ─────────────────────────────────────────────────────

def gate(ctx) -> tuple[bool, str]:
    """渲染人工门的真谓词（体检 C4）：confirmed 文件存在 ≠ 过审。
    绑定意见账本计数 —— confirm 后再 add 意见 → 计数失配 → 门自动关闭。"""
    st = status(ctx)
    if not st["generated"]:
        return False, "预览包未生成（先 python -m paperpipe preview）"
    if not st["confirmed"]:
        return False, "预览包未过审（preview --confirm）"
    if st["open"] > 0:
        return False, "修改意见 open %d/%d" % (st["open"], st["total"])
    if not os.path.exists(ctx.out("4-video", "narration.json")):
        return False, "4-video/narration.json 缺失"
    try:
        conf = json.load(open(os.path.join(_prev_dir(ctx), "preview_confirmed.json"), encoding="utf-8"))
    except Exception:
        return False, "过审凭据损坏（重新 preview --confirm）"
    if conf.get("revisions_total") != st["total"]:
        return False, "confirm 后账本已变更（confirm 时 %s 条，现 %d 条）→ 重新 --confirm" % (
            conf.get("revisions_total"), st["total"])
    if st["total"] > 0 and conf.get("revisions_resolved") != st["resolved"]:
        return False, "resolved 计数与过审凭据不符 → 重新 --confirm"
    return True, "ok"

def status(ctx) -> dict:
    d = _prev_dir(ctx)
    conf = os.path.exists(os.path.join(d, "preview_confirmed.json"))
    items = _load_revs(ctx)["items"]
    return {"generated": os.path.exists(os.path.join(d, "index.html")),
            "confirmed": conf, "total": len(items),
            "open": sum(1 for i in items if i["status"] == "open"),
            "resolved": sum(1 for i in items if i["status"] == "resolved")}

def confirm(ctx, by: str = "user") -> dict:
    st = status(ctx)
    problems = []
    if not st["generated"]:
        problems.append("预览包未生成（先 python -m paperpipe preview）")
    if st["open"] > 0:
        problems.append(f"修改意见未全 resolved（open {st['open']}/{st['total']}）")
    if not os.path.exists(ctx.out("4-video", "narration.json")):
        problems.append("4-video/narration.json 缺失")
    if problems:
        return {"ok": False, "problems": problems}
    from . import receipts
    info = {"confirmed_at": utcnow(), "by": by,
            "revisions_total": st["total"], "revisions_resolved": st["resolved"]}
    atomic_write_json(os.path.join(_prev_dir(ctx), "preview_confirmed.json"), info)
    receipts.write_tool_receipt(ctx, "render", "preview-confirm", [by, "preview_review"],
                                0, output_paths=["4-video/preview/preview_confirmed.json"],
                                note=f"导演过审：意见 {st['resolved']}/{st['total']} resolved")
    return {"ok": True, **info}
