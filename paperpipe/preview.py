"""paperpipe.preview — 渲染前人工预览包 + 分类修改意见（成片预览门）。

预览包（output/<run>/4-video/preview/）：
  index.html              图像审批工作台：逐章实渲帧 + 每资产转台预览图 + 页面内反馈表单
  frames/chXX_fK.png      每章 3 帧真实渲染快照（hyperframes snapshot，单帧单跑）
  storyboard.md           逐章表：标题/时长/转场/相机 cue 数/3D 对象/数据组件/字幕句数
  narration.md            逐章逐句文稿（含秒数）——文稿审在这里
  assetview/              资产转台迷你 hyperframes 项目（每 GLB 一个 3s 转台组合）
  revisions.json          分类修改意见（open/resolved，带 id 可跟踪）
  preview_confirmed.json  过审凭据 —— RenderAdapter 的渲染人工门凭证（preview --confirm 写入）

资产预览图（output/<run>/3-figures/asset_previews/<asset>/a1..a3.png）：
  3d-asset-pipeline S4 资产层质检的落盘证据——每个建模必须有用户可审的预览图；
  figures 门与预览门双重检查（`preview --assets-only` 单独生成）。

修复记录（2026-11-07）：旧预览包只有 iframe 播放页 + 两张 md 表——file:// 下模块脚本与
GLB 全被浏览器拦死，用户实际什么都看不到（审批系统从未起作用的根因）。现在：
  ① 每章 3 帧真实渲染 PNG（根组合挂载偏移 + --at 单帧单跑，多帧同跑有共享画布瞬态）
  ② 每资产 3 机位转台 PNG（assetview 迷你项目，lib3d loadGLB + Box3 自适应取景）
  ③ 工作台以图为核心 + 反馈表单；--serve 起本地服务后页面内直接提交意见（写 revisions.json）
  ④ 预览门/过审凭据绑定图像证据：无图不许 confirm，confirm 后删图门自动关闭

修改意见十类（category → 唯一责任产物/角色，路由修复用）：
  script 文稿 | camera 运镜 | transition 转场 | model 建模 | motion 动效 |
  layout 布局 | pacing 节奏 | audio 声音 | dataviz 数据 | caption 字幕

纪律：preview --confirm 是硬门 —— 意见未全 resolved 不许渲成片（RenderAdapter 检查）；
minor 意见可由编排方（导演）直接改产物，major 意见必须重派责任角色。
"""
from __future__ import annotations
import json, os, re, glob, shutil, subprocess

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

# ── 图像证据参数 ────────────────────────────────────────────────
SNAP_FRACS = (0.25, 0.55, 0.85)     # 每章 3 帧（章内时长的 25/55/85%）
VIEWER_SEC = 3.0                    # 每资产转台时长
VIEWER_AT = (0.75, 1.5, 2.25)       # 转台三机位时刻（0.25/0.5/0.75 圈）

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
               severity: str = "major", note: str = "", source: str = "cli") -> dict:
    if category not in CATEGORIES:
        raise ValueError(f"未知意见类别: {category}（可选: {'/'.join(CATEGORIES)}）")
    rev = _load_revs(ctx)
    n = len(rev["items"]) + 1
    item = {"id": f"R{n:03d}", "category": category, "label": CATEGORIES[category][0],
            "chapter": chapter, "target": target, "wanted": wanted,
            "severity": severity if severity in ("major", "minor") else "major",
            "note": note, "source": source, "status": "open", "created_at": utcnow()}
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

# ── snapshot 基础设施（单帧单跑）────────────────────────────────
def _hf_dir(ctx) -> str:
    rcfg = ctx.cfg.get("render") or {}
    return ctx.out((rcfg.get("cwd") or "4-video/hf").replace("\\", "/").strip("/"))

def _npx() -> str:
    return shutil.which("npx") or shutil.which("npx.cmd") or "npx"

def _snap_one(hf_dir: str, at: float, out_png: str, timeout: int = 240) -> None:
    """hyperframes snapshot 单帧单跑——一次 run 跨章 seek 有共享画布瞬态（3D 空帧，
    2026-11-07 批量代理实测），单帧逐跑不复现。输出确定性命名 at-<t>s.png。"""
    scratch = out_png + ".snap"
    shutil.rmtree(scratch, ignore_errors=True)
    os.makedirs(scratch, exist_ok=True)
    cmd = [_npx(), "hyperframes", "snapshot", ".", "--at", f"{at}", "--no-end",
           "--output", scratch, "--timeout", "90000"]
    try:
        r = subprocess.run(cmd, cwd=hf_dir, capture_output=True, text=True, timeout=timeout,
                           shell=False)
    except subprocess.TimeoutExpired as e:
        raise RuntimeError(f"snapshot 超时 {timeout}s（at={at}）") from e
    pngs = sorted(glob.glob(os.path.join(scratch, "**", "*.png"), recursive=True))
    if not pngs:
        tail = ((r.stderr or "") + (r.stdout or ""))[-300:].strip()
        raise RuntimeError(f"snapshot 无输出（at={at}）: {tail}")
    os.makedirs(os.path.dirname(out_png), exist_ok=True)
    shutil.copyfile(pngs[0], out_png)
    shutil.rmtree(scratch, ignore_errors=True)

_TAG_RE = re.compile(r'<div\b[^>]*>', re.S)

def _attr(tag: str, name: str) -> str | None:
    m = re.search(rf'{name}="([^"]*)"', tag)
    return m.group(1) if m else None

def _root_mounts(ctx) -> dict:
    """解析根组合 index.html 的章节挂载：{章号: {start, dur}}（aggregator 组装产物）。"""
    p = os.path.join(_hf_dir(ctx), "index.html")
    if not os.path.exists(p):
        return {}
    mounts = {}
    for tag in _TAG_RE.findall(open(p, encoding="utf-8").read()):
        cid = _attr(tag, "data-composition-id")
        if not cid or _attr(tag, "data-composition-src") is None:
            continue
        m = re.fullmatch(r"ch(\d+)", cid)
        try:
            if m:
                mounts[int(m.group(1))] = {"start": float(_attr(tag, "data-start") or 0),
                                           "dur": float(_attr(tag, "data-duration") or 0)}
        except ValueError:
            continue
    return mounts

def _snapshot_frames(ctx, rows: list, runner=None) -> list:
    """逐章实渲 3 帧 → preview/frames/chXX_fK.png；写回 rows[n]["frames"]（预览相对路径）。
    delta：仅重渲早于合成源 mtime 的帧。"""
    frames_dir = os.path.join(_prev_dir(ctx), "frames")
    comp_dir = _sources(ctx)[2]
    os.makedirs(frames_dir, exist_ok=True)
    mounts = _root_mounts(ctx)
    hf = _hf_dir(ctx)
    problems = []
    if rows and not mounts:
        return ["根组合挂载缺失: render.cwd 下 index.html 无 chXX 挂载"
                "（aggregator 未组装）→ 逐章预览帧无法定位"]
    for row in rows:
        n = row["chapter"]
        if not row.get("file"):
            row["frames"] = []
            continue
        m = mounts.get(n)
        if not m:
            problems.append(f"章 {n} 未挂载于根组合（index.html 缺 ch{n:02d} 挂载）→ 无预览帧")
            row["frames"] = []
            continue
        dur = row.get("duration") or m["dur"] or 0
        comp_src = os.path.join(comp_dir, row["file"]) if row.get("file") else None
        rels = []
        for k, frac in enumerate(SNAP_FRACS):
            at = round(m["start"] + max(dur, 0.1) * frac, 2)
            out = os.path.join(frames_dir, f"ch{n:02d}_f{k+1}.png")
            # delta：合成源未比已存帧新 → 跳过重渲（瞬时失败补拍/局部修订只动该章）
            if os.path.exists(out) and (not comp_src or not os.path.exists(comp_src)
                                        or os.path.getmtime(out) >= os.path.getmtime(comp_src)):
                rels.append("frames/" + os.path.basename(out))
                continue
            try:
                if runner is not None:
                    runner(n, at, out)
                else:
                    _snap_one(hf, at, out)
            except Exception as e:
                problems.append(f"章 {n} 预览帧 f{k+1} 渲染失败: {e}")
                continue
            rels.append("frames/" + os.path.basename(out))
        row["frames"] = rels
        if len(rels) < len(SNAP_FRACS):
            problems.append(f"章 {n} 预览帧不全（{len(rels)}/{len(SNAP_FRACS)}）")
    return problems

# ── 资产转台预览（assetview 迷你项目）──────────────────────────
_VIEWER_TMPL = """<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8">
<script src="assets/vendor/gsap.min.js"></script>
<script src="assets/vendor/three3d.global.js"></script>
</head><body>
<template>
  <style>
  *{margin:0;box-sizing:border-box}
  #rv__ID__{position:absolute;inset:0;background:#f2ecdf;font-family:'Microsoft YaHei',sans-serif;overflow:hidden}
  #s3d__ID__{position:absolute;left:0;top:0;width:1280px;height:720px}
  .tag{position:absolute;left:28px;top:20px;font-size:28px;color:#1a1a1a;font-weight:700;letter-spacing:2px}
  .tag small{font-weight:400;color:#8a7a63;margin-left:14px;font-size:17px;letter-spacing:0}
  .foot{position:absolute;left:28px;bottom:16px;font-size:14px;color:#8a7a63;letter-spacing:1px}
  .badge{position:absolute;right:28px;top:24px;font-size:14px;color:#15803d;border:1px solid #15803d;
  border-radius:4px;padding:3px 12px;letter-spacing:3px}
  .err{position:absolute;left:28px;top:66px;font-size:17px;color:#c0392b;font-weight:700;max-width:1150px}
  </style>
  <div id="rv__ID__">
    <div id="s3d__ID__"></div>
    <div class="tag">__NAME__<small>资产转台预览 · 三机位</small></div>
    <div class="badge">ASSET PREVIEW</div>
    <div class="foot">3d-asset-pipeline S4 资产层质检 · 原生材质 · 转台 3s</div>
    <div class="err" id="err__ID__"></div>
  </div>
  <script>
  (function(){
    var E=document.getElementById('err__ID__');
    window.addEventListener('error', function(e){ if(E) E.textContent='ERR: '+e.message; });
    window.addEventListener('unhandledrejection', function(e){
      if(E) E.textContent='REJ: '+((e.reason&&e.reason.message)||e.reason); });
    var L3=window.__lib3d, THREE=window.THREE;
    if(!L3||!THREE) throw new Error('[viewer __NAME__] three3d.global.js not loaded');
    var V3=L3.initScene(document.getElementById('s3d__ID__'),1280,720,{fov:36,bg:0xf2ecdf});
    var spin=new THREE.Group(); V3.scene.add(spin);
    var ground=new THREE.Mesh(new THREE.CircleGeometry(16,48),
      new THREE.MeshStandardMaterial({color:0xe7dfcc,roughness:0.95,metalness:0}));
    ground.rotation.x=-Math.PI/2; ground.position.y=-0.005; ground.receiveShadow=true; V3.scene.add(ground);
    var ring=new THREE.Mesh(new THREE.RingGeometry(4.6,4.72,64),
      new THREE.MeshBasicMaterial({color:0xb8a88c}));
    ring.rotation.x=-Math.PI/2; ring.position.y=0.004; V3.scene.add(ring);
    var TGT=new THREE.Vector3(0,0.6,0), cam={az:0.85,elv:0.4,r:8};
    function fit(){ L3.orbitCam(V3.camera,TGT,cam.az,cam.elv,cam.r); }
    fit(); V3.render();
    var tl=gsap.timeline({paused:true});
    tl.to(spin.rotation,{y:Math.PI*2,duration:3,ease:'none'},0);
    var mixer=null, clipDur=0;
    tl.eventCallback('onUpdate',function(){
      if(mixer && clipDur>0) mixer.setTime(tl.time()%clipDur);   // clipDur=0 → NaN 防护
      V3.render(); });
    window.__hf=window.__hf||{}; window.__hf.buildReady=window.__hf.buildReady||{};
    window.__hf.buildReady['v__NAME__'] =
      L3.loadGLB('assets/models/__NAME__.glb',{material:null,scale:1,pos:[0,0,0],rotY:0})
        .then(function(root){
      spin.add(root);
      // 首个动画（Idle 优先）驱动展示姿态——静止 bind pose 不代表成片观感
      var anims=root.userData.animations||[];
      if(anims.length){
        var clip=null;
        for(var i=0;i<anims.length;i++){ if(/idle/i.test(anims[i].name)){ clip=anims[i]; break; } }
        clip=clip||anims[0];
        mixer=new THREE.AnimationMixer(root); mixer.clipAction(clip).play(); clipDur=clip.duration||1;
      }
      // 自适应取景：渲染包围盒（蒙皮网格在当前 pose 下实测，非退化 bind bbox）
      var box=new THREE.Box3().setFromObject(root);
      var size=box.getSize(new THREE.Vector3()), c=box.getCenter(new THREE.Vector3());
      var maxD=Math.max(size.x,size.y,size.z)||1;
      spin.position.set(-c.x,-box.min.y,-c.z);          // 落地居中：转台绕自身竖轴
      TGT.set(0, size.y*0.55, 0);
      cam.r=Math.min(Math.max(maxD*1.75,2),60);
      fit(); V3.render();
      if(E) E.parentNode.removeChild(E);                // 载入成功 → 撤掉诊断行（错误陷阱仅在失败时现身）
    }).catch(function(e){ console.error('[viewer __NAME__] GLB load failed',e); throw e; });
    window.__timelines=window.__timelines||{};
    window.__timelines['v__NAME__']=tl;
  })();
  </script>
</template>
</body></html>"""

def _build_viewer_project(ctx, name: str) -> str:
    """4-video/preview/assetview/<name>/：单资产转台迷你项目。
    每资产一个项目（而非多资产挂同一根组合）——initScene 共享渲染器画布在多组合
    间搬移，无头捕获时画布落在最后渲染者手里（与批量代理'共享画布瞬态'同类故障，
    2026-11-07 实测 dog/car 空白而 person 幸存），单项目单组合彻底隔离。"""
    hf = _hf_dir(ctx)
    av = os.path.join(_prev_dir(ctx), "assetview", name)
    os.makedirs(os.path.join(av, "compositions"), exist_ok=True)
    os.makedirs(os.path.join(av, "assets", "vendor"), exist_ok=True)
    os.makedirs(os.path.join(av, "assets", "models"), exist_ok=True)
    for f in ("gsap.min.js", "three3d.global.js"):
        src = os.path.join(hf, "assets", "vendor", f)
        dst = os.path.join(av, "assets", "vendor", f)
        if os.path.exists(src) and (not os.path.exists(dst)
                                    or os.path.getsize(src) != os.path.getsize(dst)):
            shutil.copyfile(src, dst)
    src = os.path.join(hf, "assets", "models", name + ".glb")
    dst = os.path.join(av, "assets", "models", name + ".glb")
    if os.path.exists(src) and (not os.path.exists(dst)
                                or os.path.getsize(src) != os.path.getsize(dst)):
        shutil.copyfile(src, dst)
    atomic_write_text(os.path.join(av, "compositions", "v_" + name + ".html"),
                      _VIEWER_TMPL.replace("__ID__", name).replace("__NAME__", name))
    atomic_write_text(os.path.join(av, "index.html"),
        '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8">'
        '<meta name="viewport" content="width=1280, height=720">'
        # 根组合必须自带 3D 包——子组合 head 里的脚本在 snapshot 内联时不可依赖（hf 同款结构）
        '<script src="assets/vendor/gsap.min.js"></script>'
        '<script src="assets/vendor/three3d.global.js"></script></head><body>\n'
        '<div id="root" data-composition-id="main" data-start="0" '
        f'data-duration="{VIEWER_SEC:g}" data-width="1280" data-height="720">\n'
        f'  <div id="v_{name}" data-composition-id="v_{name}" '
        f'data-composition-src="compositions/v_{name}.html" '
        f'data-start="0" data-duration="{VIEWER_SEC:g}" data-track-index="1" '
        f'data-width="1280" data-height="720" data-track-kind="graphics"></div>\n'
        '</div>\n<script>window.__timelines = window.__timelines || {};\n'
        'window.__timelines["main"] = gsap.timeline({ paused: true });</script>\n</body></html>')
    return av

def generate_asset_previews(ctx, runner=None) -> tuple[list, list]:
    """3d-asset-pipeline S4 资产层预览：每 GLB 三机位转台 PNG →
    3-figures/asset_previews/<name>/a1..a3.png。幂等（已齐三图跳过）。"""
    reg_p = ctx.out("3-figures", "asset_registry.json")
    if not os.path.exists(reg_p):
        return [], []
    try:
        reg = json.load(open(reg_p, encoding="utf-8"))
    except Exception:
        return [], ["asset_registry.json 损坏，无法生成资产预览"]
    assets = [a for a in (reg.get("assets") or [])
              if isinstance(a, dict) and str(a.get("name") or "").strip()
              and str(a.get("glb") or "").strip()]
    if not assets:
        return [], []
    for a in assets:
        if not os.path.exists(ctx.out(a["glb"])):
            return [], [f"资产 {a['name']} 的 GLB 缺失: {a['glb']}（预览无从渲染）"]
    done, problems = [], []
    for a in assets:
        name = a["name"]
        outdir = ctx.out("3-figures", "asset_previews", name)
        os.makedirs(outdir, exist_ok=True)
        if all(os.path.exists(os.path.join(outdir, f"a{k+1}.png")) for k in range(3)):
            done.append(name)
            continue
        vp = _build_viewer_project(ctx, name)
        ok = 0
        for k, frac in enumerate(VIEWER_AT):
            out = os.path.join(outdir, f"a{k+1}.png")
            try:
                if runner is not None:
                    runner(name, frac, out)
                else:
                    _snap_one(vp, frac, out)
                ok += 1
            except Exception as e:
                problems.append(f"资产 {name} 预览 a{k+1} 渲染失败: {e}")
        if ok == 3:
            done.append(name)
    return done, problems

def _registry_assets_meta(ctx) -> list:
    reg_p = ctx.out("3-figures", "asset_registry.json")
    if not os.path.exists(reg_p):
        return []
    try:
        reg = json.load(open(reg_p, encoding="utf-8"))
    except Exception:
        return []
    out = []
    for a in (reg.get("assets") or []):
        if not isinstance(a, dict) or not str(a.get("name") or "").strip():
            continue
        name = a["name"]
        previews = [f"../../3-figures/asset_previews/{name}/a{k}.png"
                    if os.path.exists(ctx.out("3-figures", "asset_previews", name, f"a{k}.png"))
                    else None for k in (1, 2, 3)]
        out.append({"name": name, "route": a.get("route"), "license": a.get("license"),
                    "glb": a.get("glb"), "palette": a.get("palette"),
                    "quality_gate": a.get("quality_gate"), "used_in": a.get("used_in") or [],
                    "brief": a.get("brief"), "previews": previews})
    return out

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
    # 与 _hf_dir 同源默认——render.cwd 未配置时 hf 项目就在 4-video/hf
    comp_rel = (rcfg.get("cwd") or "4-video/hf").replace("\\", "/").strip("/") + "/compositions"
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

def generate(ctx, chapters: list | None = None, snap_runner=None) -> dict:
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
            "camera_cues": len(cues), "objects": obj_names, "frames": [],
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
    # ① 逐章实渲帧 + ② 每资产转台预览图——图像证据先于一切文本产物（2026-11-07 修复）
    problems = []
    problems += _snapshot_frames(ctx, meta_rows, snap_runner)
    previews, aproblems = generate_asset_previews(ctx, snap_runner)
    problems += aproblems
    assets_meta = _registry_assets_meta(ctx)
    atomic_write_json(os.path.join(d, "preview_meta.json"),
                      {"generated_at": utcnow(), "chapters": meta_rows, "assets": assets_meta})
    atomic_write_text(os.path.join(d, "storyboard.md"),
                      "# 分镜表（预览审核用）\n\n| 章 | 标题 | 时长s | 转场 | 相机cue | 3D对象 | 数据组件 | 字幕句 |\n"
                      "|---|---|---|---|---|---|---|---|\n" + "\n".join(sb_rows) + "\n")
    atomic_write_text(os.path.join(d, "narration.md"), "\n".join(narr_lines) + "\n")
    if not os.path.exists(_rev_file(ctx)):
        _save_revs(ctx, {"schema": REV_SCHEMA, "items": []})
    comp_from_preview = os.path.relpath(comp_dir, d).replace("\\", "/")   # 预览页 iframe 的相对根
    run_rel = os.path.relpath(ctx.run_dir, os.path.dirname(ctx.run_dir)).replace("\\", "/")
    _write_index(ctx, d, meta_rows, comp_from_preview, assets_meta, run_rel)
    try:
        ctx.rs.register_artifact("render", os.path.join(d, "index.html"), "preview-pack")
    except (ValueError, FileNotFoundError, KeyError):
        pass    # 阶段未初始化时跳过登记（预览包本身已落盘）
    return {"dir": os.path.relpath(d, ctx.run_dir).replace("\\", "/"),
            "chapters": len(meta_rows),
            "frames_rendered": sum(len(r.get("frames") or []) for r in meta_rows),
            "asset_previews": previews, "problems": problems,
            "has_compositions": os.path.isdir(comp_dir)}

# ── 图像证据谓词（预览门/过审凭据共用）─────────────────────────
def frame_problems(ctx) -> list:
    p = os.path.join(_prev_dir(ctx), "preview_meta.json")
    if not os.path.exists(p):
        return ["预览包未生成（preview_meta.json 缺失）"]
    try:
        meta = json.load(open(p, encoding="utf-8"))
    except Exception:
        return ["preview_meta.json 损坏（重新 preview）"]
    probs = []
    for row in meta.get("chapters", []):
        if not row.get("file"):
            continue
        fr = row.get("frames") or []
        if len(fr) < len(SNAP_FRACS):
            probs.append(f"章 {row.get('chapter')} 预览帧不全（{len(fr)}/{len(SNAP_FRACS)}）"
                         "——逐章实渲帧是预览门的图像证据（重新 preview）")
        for rel in fr:
            if not os.path.exists(os.path.join(_prev_dir(ctx), rel.replace("/", os.sep))):
                probs.append(f"章 {row.get('chapter')} 预览帧文件丢失: {rel}")
    return probs

def asset_preview_problems(ctx) -> list:
    reg_p = ctx.out("3-figures", "asset_registry.json")
    if not os.path.exists(reg_p):
        return []
    try:
        reg = json.load(open(reg_p, encoding="utf-8"))
    except Exception:
        return []
    probs = []
    for a in (reg.get("assets") or []):
        if not isinstance(a, dict):
            continue
        name = str(a.get("name") or "").strip()
        glb = str(a.get("glb") or "").strip()
        if not name or not glb:
            continue    # 程序化资产（无 GLB）不要求预览图——brief 即出处
        if not os.path.exists(ctx.out(glb)):
            probs.append(f"资产 {name} 的 GLB 缺失: {glb}")
            continue
        for k in (1, 2, 3):
            if not os.path.exists(ctx.out("3-figures", "asset_previews", name, f"a{k}.png")):
                probs.append(f"资产 {name} 预览图缺失: 3-figures/asset_previews/{name}/a{k}.png"
                             "（python -m paperpipe preview --assets-only 生成——"
                             "每个建模必须有用户可审的预览图）")
                break
    return probs

def _write_index(ctx, d: str, rows: list, comp_rel: str = "../hf/compositions",
                 assets: list | None = None, run_rel: str = "") -> None:
    data = json.dumps({"chapters": rows, "assets": assets or [],
                       "cats": {k: v[0] for k, v in CATEGORIES.items()},
                       "runRel": run_rel}, ensure_ascii=False).replace("</", "<\\/")
    html = """<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8">
<title>预览审批工作台</title><style>
body{margin:0;font-family:"Microsoft YaHei",sans-serif;background:#0a0a12;color:#f5ede2;display:flex;height:100vh}
nav{width:240px;overflow-y:auto;border-right:1px solid #333;padding:8px;flex-shrink:0}
nav h4{margin:10px 4px 4px;color:#8ab4c8;font-size:12px;letter-spacing:2px}
nav button{display:block;width:100%;text-align:left;margin:3px 0;padding:7px 9px;background:#16161f;color:#f5ede2;
border:1px solid #2c2c3a;border-radius:6px;cursor:pointer;font-size:13px}
nav button:hover{border-color:#ff8c42} nav button.on{background:#2a1c10;border-color:#ff8c42}
main{flex:1;display:flex;flex-direction:column;overflow:hidden}
#stage{flex:1;overflow-y:auto;padding:14px 18px}
.frames{display:flex;gap:10px;flex-wrap:wrap}
.frames img{width:32%;min-width:300px;border:1px solid #3a3a4a;border-radius:6px;cursor:zoom-in;background:#000}
#meta{padding:8px 2px;font-size:13px;line-height:1.8}
#meta b{color:#ff8c42}
.frm{border:1px solid #2c2c3a;border-radius:8px;padding:10px 12px;margin:10px 0;background:#12121c;max-width:860px}
.frm select,.frm textarea,.frm input{background:#0a0a12;color:#f5ede2;border:1px solid #3a3a4a;border-radius:5px;
padding:5px 8px;font-size:13px;font-family:inherit}
.frm textarea{width:100%;min-height:44px;margin:6px 0}
.frm button{background:#ff8c42;border:0;color:#0a0a12;padding:6px 16px;border-radius:5px;cursor:pointer;font-weight:700}
.frm .cmd{display:none;margin-top:8px;background:#05050a;border:1px dashed #ff8c42;border-radius:5px;
padding:7px 9px;font-family:Consolas,monospace;font-size:12px;color:#ffd9a8;word-break:break-all;user-select:all}
#ledger{max-width:860px;font-size:13px}
#ledger .it{border-left:3px solid #e5484d;padding:4px 10px;margin:6px 0;background:#12121c;border-radius:0 6px 6px 0}
#ledger .it.res{border-left-color:#2ea043;color:#9fd8a8}
#ledger .it button{float:right;background:none;border:1px solid #2ea043;color:#2ea043;border-radius:4px;
cursor:pointer;font-size:11px;padding:1px 7px}
#topbar{padding:8px 18px;border-bottom:1px solid #333;font-size:13px;display:flex;gap:18px;align-items:center}
#topbar .st{color:#ff8c42;font-weight:700}
#lb{display:none;position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:9;cursor:zoom-out}
#lb img{max-width:96vw;max-height:96vh;margin:2vh auto;display:block}
#play{display:block;border:1px solid #3a3a4a;border-radius:6px;margin-top:10px;width:100%;background:#000;padding:8px}
#play img.big{width:100%;display:block;background:#000}
small{color:#8ab4c8}
</style></head><body>
<nav id="nav"></nav>
<main>
<div id="topbar"><span style="font-weight:700;color:#ff8c42">预览审批工作台</span>
<span class="st" id="stat"></span>
<small id="hint"></small></div>
<div id="stage"></div></main>
<div id="lb" onclick="this.style.display='none'"><img id="lbi" alt=""></div>
<script>
var D = %s; var SRVD = location.protocol.indexOf('http') === 0;
var CH = D.chapters, AS = D.assets;
var nav = document.getElementById('nav'), stage = document.getElementById('stage');
function el(t, cls, parent){ var e = document.createElement(t); if (cls) e.className = cls;
  if (parent) parent.appendChild(e); return e; }
function secTitle(t, parent){ var h = el('h4', '', parent); h.textContent = t; return h; }
secTitle('章节（逐章实渲帧）', nav);
CH.forEach(function (c, i) {
  var b = el('button', '', nav);
  b.textContent = (c.file ? '' : '〔无合成〕') + 'ch' + String(c.chapter).padStart(2, '0') + ' ' + c.title;
  b.onclick = function () { show('c', i); };
});
if (AS.length) {
  secTitle('资产建模（转台三机位）', nav);
  AS.forEach(function (a, i) {
    var b = el('button', '', nav);
    b.textContent = (a.previews && a.previews[0] ? '' : '〔无预览图〕') + a.name + ' · ' + (a.route || '?');
    b.onclick = function () { show('a', i); };
  });
}
secTitle('修改意见账本', nav);
var lb2 = el('button', '', nav); lb2.textContent = '意见账本（open/总）'; lb2.onclick = function () { show('l', 0); };
function imgRow(paths, parent) {
  var w = el('div', 'frames', parent);
  paths.forEach(function (p) {
    if (!p) return;
    var im = el('img', '', w); im.src = p + '?t=' + Date.now();
    im.onclick = function () { document.getElementById('lbi').src = im.src;
      document.getElementById('lb').style.display = 'block'; };
  });
  return w;
}
function form(ctx, parent, defCat, chap) {
  var f = el('div', 'frm', parent);
  var row = el('div', '', f);
  var sel = el('select', '', row);
  Object.keys(D.cats).forEach(function (k) {
    var o = el('option', '', sel); o.value = k;
    o.textContent = D.cats[k] + ' ' + k; if (k === defCat) o.selected = true;
  });
  var sev = el('select', '', row);
  ['major', 'minor'].forEach(function (s) { var o = el('option', '', sev); o.value = s;
    o.textContent = s === 'major' ? 'major 必须重派责任角色' : 'minor 导演可直接改'; });
  var ta = el('textarea', '', f); ta.placeholder = '具体意见（改什么、为什么、期望什么样）…';
  var btn = el('button', '', f); btn.textContent = '提交意见';
  var out = el('div', 'cmd', f);
  btn.onclick = function () {
    if (!ta.value.trim()) { out.style.display = 'block'; out.textContent = '请先填写意见内容'; return; }
    if (SRVD) {
      fetch('/api/revise', { method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: sel.value, wanted: ta.value.trim(),
          chapter: chap, severity: sev.value, target: ctx }) })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j.ok) { ta.value = ''; refreshStat(); ledger(); out.style.display = 'none'; }
          else { out.style.display = 'block'; out.textContent = '提交失败: ' + (j.error || '?'); }
        })
        .catch(function (e) { out.style.display = 'block'; out.textContent = '提交失败: ' + e; });
    } else {
      out.style.display = 'block';
      out.textContent = 'python -m paperpipe revise add ' + sel.value + ' "' +
        ta.value.trim().replace(/"/g, "'") + '"' +
        (chap === null || chap === undefined ? '' : ' --chapter ' + chap) +
        ' --severity ' + sev.value + ' --run-dir ' + D.runRel;
    }
  };
  return f;
}
function buildPlayer(c, frames, host) {
  c._strip = frames;
  var pl = el('div', '', host); pl.id = 'play';
  var big = el('img', '', pl); big.src = frames[0]; big.style.cssText =
    'width:100%;display:block;background:#000;cursor:zoom-in';
  big.onclick = function () { document.getElementById('lbi').src = big.src;
    document.getElementById('lb').style.display = 'block'; };
  var bar = el('div', '', pl); bar.style.cssText =
    'display:flex;gap:8px;align-items:center;padding:8px 2px';
  var tgl = el('button', '', bar); tgl.textContent = '⏸ 暂停';
  tgl.style.cssText = 'background:#ff8c42;border:0;color:#0a0a12;padding:5px 14px;' +
    'border-radius:5px;cursor:pointer;font-weight:700';
  var pos = el('span', '', bar); pos.style.cssText = 'color:#8ab4c8;font-size:12px';
  var strip = el('div', '', pl); strip.style.cssText =
    'display:flex;gap:6px;overflow-x:auto;padding-bottom:6px';
  var idx = 0, timer = null;
  var step = Math.max((c.duration || 30) * 1000 / frames.length, 350);
  function show(k) {
    idx = (k + frames.length) % frames.length;
    big.src = frames[idx] + '?v=' + idx;
    pos.textContent = '帧 ' + (idx + 1) + '/' + frames.length;
    [].forEach.call(strip.children, function (im, j) {
      im.style.outline = j === idx ? '2px solid #ff8c42' : 'none';
    });
  }
  function play() { if (timer) return; timer = setInterval(function () { show(idx + 1); }, step);
    tgl.textContent = '⏸ 暂停'; }
  function pause() { clearInterval(timer); timer = null; tgl.textContent = '▶ 播放'; }
  tgl.onclick = function () { timer ? pause() : play(); };
  frames.forEach(function (p, k) {
    var im = el('img', '', strip);
    im.src = p; im.style.cssText = 'height:76px;border-radius:4px;cursor:pointer;background:#000';
    im.onclick = function () { pause(); show(k); };
  });
  show(0); play();          // 加载完自动连播（每帧约 duration/9 秒）
}
function show(kind, i) {
  [].forEach.call(nav.querySelectorAll('button'), function (b) { b.classList.remove('on'); });
  stage.innerHTML = '';
  if (kind === 'c') {
    var c = CH[i]; nav.children[i + 1].classList.add('on');
    var h = el('div', '', stage);
    h.innerHTML = '<div id="meta"><b>章 ' + c.chapter + ' · ' + c.title + '</b>　' + (c.duration || '?') +
      's　转场:' + (c.transition || '—') + '　3D:' + (c.is_3d ? '是' : '否') +
      '　相机cue:' + c.camera_cues + '　对象:' +
      ([...new Set(c.objects)].join(', ') || '—') + '</div>';
    if (c.frames && c.frames.length) imgRow(c.frames, h);
    else el('p', '', h).innerHTML = '<small>本章无实渲帧（合成缺失或未挂载）——预览门不会放行</small>';
    (c.sentences || []).forEach(function (s) {
      var p = el('div', '', h); p.innerHTML = '<small>[' + s.start + 's +' + s.seconds + 's]</small> ' + s.text;
    });
    if (c.file) {
      var pb = el('button', '', h); pb.textContent = '▶ 加载本章动态条（9 帧连播 · 首次约 1 分钟）';
      pb.onclick = function () {
        pb.disabled = true; pb.textContent = '正在渲染本章动态条…（约 1 分钟，别关页）';
        fetch('/api/filmstrip?chapter=' + c.chapter)
          .then(function (r) { return r.json(); })
          .then(function (j) {
            pb.disabled = false; pb.style.display = 'none';
            if (j.error) { pb.textContent = j.error; pb.style.display = 'block'; return; }
            buildPlayer(c, j.frames, h);
          })
          .catch(function (e) { pb.disabled = false; pb.style.display = 'block';
            pb.textContent = '动态条加载失败: ' + e; });
      };
      if (c._strip) buildPlayer(c, c._strip, h);   // 同一会话内已加载过 → 直接复用
    }
    form('chapter ' + c.chapter, h, 'motion', c.chapter);
  } else if (kind === 'a') {
    var a = AS[i]; nav.children[CH.length + 2 + i].classList.add('on');
    var h2 = el('div', '', stage);
    h2.innerHTML = '<div id="meta"><b>资产 ' + a.name + '</b>　路线:' + (a.route || '?') +
      '　授权:' + (a.license || '—') + '　质检:' + (a.quality_gate || '—') +
      '　用于章:' + (a.used_in.join(', ') || '—') + '</div>';
    var ps = (a.previews || []).filter(Boolean);
    if (ps.length) imgRow(ps, h2);
    else el('p', '', h2).innerHTML = '<small>无预览图——preview --assets-only 生成（门不放行）</small>';
    if (a.palette) el('p', '', h2).innerHTML = '<small>色板/材质: ' + a.palette + '</small>';
    if (a.brief) el('p', '', h2).innerHTML = '<small>brief: ' + a.brief + '</small>';
    form('asset ' + a.name, h2, 'model', null);
  } else { nav.children[nav.children.length - 1].classList.add('on'); ledger(); }
}
function ledger() {
  stage.innerHTML = '<h3 style="margin:4px 0 10px">意见汇总与过审</h3><div id="ledform"></div><div id="ledger"></div>';
  // 汇总页补提意见（不挂章节的全片级意见也在这里提）
  var lf = document.getElementById('ledform');
  form('全片', lf, 'motion', null);
  // 过审按钮：意见全 resolved 后点它写过审凭据（有 open 项会列出挡门的意见）
  if (SRVD) {
    var cb = el('button', '', lf); cb.style.margin = '2px 0 12px';
    cb.textContent = '✅ 审看完成 · 申请过审';
    cb.style.cssText += ';background:#2ea043;color:#fff;border:0;border-radius:6px;' +
      'padding:8px 18px;font-weight:700;cursor:pointer;font-size:14px';
    var msg = el('div', '', lf); msg.style.cssText = 'font-size:13px;color:#8ab4c8;min-height:18px;white-space:pre-wrap';
    cb.onclick = function () {
      cb.disabled = true; cb.textContent = '核验中…';
      fetch('/api/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ by: 'user' }) })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          cb.disabled = false; cb.textContent = '✅ 审看完成 · 申请过审';
          refreshStat();
          if (j.ok) { msg.style.color = '#2ea043';
            msg.textContent = '已过审：过审凭据已写入（' + (j.revisions_resolved || 0) + ' 条意见已解决）。'
              + '渲染门放行，等待编排方渲成片。'; }
          else { msg.style.color = '#e5484d';
            msg.textContent = '暂不能过审：\\n- ' + (j.problems || []).join('\\n- '); }
        })
        .catch(function (e) { cb.disabled = false;
          msg.style.color = '#e5484d'; msg.textContent = '请求失败: ' + e; });
    };
  } else {
    var hint = el('div', '', lf);
    hint.innerHTML = '<small>file:// 模式只读——用 python -m paperpipe preview --serve 起本地服务后可在此页直接提交/解决意见并申请过审。</small>';
  }
  render([]);
  if (SRVD) fetch('/api/revisions').then(function (r) { return r.json(); })
    .then(function (j) { render(j.items || []); });
  function render(items) {
    var w = document.getElementById('ledger');
    items.slice().reverse().forEach(function (it) {
      var d = el('div', 'it' + (it.status === 'resolved' ? ' res' : ''), w);
      d.innerHTML = '<b>' + it.id + '</b> [' + it.label + '/' + it.severity + ']' +
        (it.chapter !== null && it.chapter !== undefined ? ' ch' + it.chapter : '') + ' ' +
        it.wanted + (it.note ? ' <small>' + it.note + '</small>' : '');
      if (it.status === 'open' && SRVD) {
        var b = el('button', '', d); b.textContent = 'resolve';
        b.onclick = function () {
          fetch('/api/resolve', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: it.id }) }).then(refreshStat).then(ledger);
        };
      }
    });
    if (!items.length && SRVD) w.innerHTML = '<small>暂无意见。</small>';
  }
}
function refreshStat() {
  if (!SRVD) { document.getElementById('stat').textContent = 'file:// 只读模式';
    document.getElementById('hint').textContent =
      'python -m paperpipe preview --serve 后可在页面内直接提交意见'; return; }
  fetch('/api/status').then(function (r) { return r.json(); }).then(function (s) {
    document.getElementById('stat').textContent =
      '意见 open ' + s.open + '/' + s.total + (s.confirmed ? ' · 已过审' : ' · 未过审');
  });
}
refreshStat(); if (CH.length) show('c', 0); else if (AS.length) show('a', 0); else ledger();
</script></body></html>"""
    atomic_write_text(os.path.join(d, "index.html"),
                      html.replace("%s", data).replace("%COMP%", comp_rel))

def filmstrip(ctx, chapter: int, n: int = 9, runner=None) -> dict:
    """本章动态条：n 帧均匀采样（8%..92%）→ preview/frames/chXX_sK.png。
    供工作台"交互播放"做帧循环播放器（静态服务无法跑引擎，快照连播即播放）。"""
    mounts = _root_mounts(ctx)
    m = mounts.get(chapter)
    if not m:
        return {"error": f"章 {chapter} 未挂载于根组合"}
    shots, scenes, comp_dir = _sources(ctx)
    dur = 0.0
    for s in shots:
        if s.get("chapter") == chapter:
            dur = s.get("duration") or 0
            break
    dur = dur or m["dur"] or 1.0
    frames_dir = os.path.join(_prev_dir(ctx), "frames")
    os.makedirs(frames_dir, exist_ok=True)
    rels = []
    for k in range(n):
        frac = 0.08 + k * (0.92 - 0.08) / max(n - 1, 1)
        at = round(m["start"] + dur * frac, 2)
        out = os.path.join(frames_dir, f"ch{chapter:02d}_s{k+1}.png")
        if not os.path.exists(out):
            try:
                if runner is not None:
                    runner(chapter, at, out)
                else:
                    _snap_one(_hf_dir(ctx), at, out)
            except Exception as e:
                return {"error": f"章 {chapter} 动态条第 {k+1} 帧渲染失败: {e}"}
        rels.append(f"frames/ch{chapter:02d}_s{k+1}.png")
    return {"chapter": chapter, "frames": rels, "duration": dur}

# ── 本地服务：页面内直接提交/解决意见 ──────────────────────────
def serve(ctx, port: int = 8765) -> None:
    """起本地只读静态服务 + 意见 API（POST /api/revise、/api/resolve）。
    服务根 = run 目录：/4-video/preview/index.html 为工作台，组合 iframe 与
    3-figures/asset_previews 相对路径均可达。仅绑定 127.0.0.1。"""
    import http.server, socketserver
    root = ctx.run_dir

    class H(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **kw):
            super().__init__(*a, directory=root, **kw)

        def send_error(self, code, message=None, explain=None):
            # 404 页直接给出工作台入口（用户手滑改路径时的自愈提示）
            if code == 404:
                body = ("<!DOCTYPE html><html lang=zh><meta charset=utf-8>"
                        "<title>404</title><body style=\"font-family:sans-serif;padding:40px\">"
                        f"<h2>404 · {message or 'File not found'}</h2>"
                        f"<p>访问路径: <code>{self.path}</code></p>"
                        "<p>审批工作台入口: <a href=\"/4-video/preview/index.html\">"
                        "http://127.0.0.1:8765/4-video/preview/index.html</a></p></body>")
                b = body.encode("utf-8")
                self.send_response(404)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(b)))
                self.end_headers()
                self.wfile.write(b)
                return
            return super().send_error(code, message, explain)

        def _json(self, obj, code=200):
            b = json.dumps(obj, ensure_ascii=False).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(b)))
            self.end_headers()
            self.wfile.write(b)

        def do_GET(self):
            if self.path in ("/", "/index.html"):
                self.send_response(302)
                self.send_header("Location", "/4-video/preview/index.html")
                self.end_headers()
                return
            # URL 带尾巴自愈：/4-video/preview/index.html<多余字符> → 规范地址
            # （用户从聊天文本复制时易粘上后续中文/标点，如 %EF%BC%8811 = （11）
            if self.path.split("?")[0].startswith("/4-video/preview/index.html") \
                    and self.path.split("?")[0] != "/4-video/preview/index.html":
                self.send_response(302)
                self.send_header("Location", "/4-video/preview/index.html")
                self.end_headers()
                return
            if self.path == "/api/revisions":
                return self._json(_load_revs(ctx))
            if self.path == "/api/status":
                return self._json(status(ctx))
            if self.path.startswith("/api/filmstrip"):
                from urllib.parse import urlparse, parse_qs
                q = parse_qs(urlparse(self.path).query)
                try:
                    ch = int((q.get("chapter") or ["0"])[0])
                except ValueError:
                    return self._json({"error": "chapter 参数非法"}, 400)
                return self._json(filmstrip(ctx, ch))
            return super().do_GET()

        def do_POST(self):
            ln = int(self.headers.get("Content-Length") or 0)
            try:
                body = json.loads(self.rfile.read(ln) or b"{}")
            except Exception:
                return self._json({"ok": False, "error": "请求体不是合法 JSON"}, 400)
            try:
                if self.path == "/api/revise":
                    item = revise_add(ctx, str(body.get("category") or ""),
                                      str(body.get("wanted") or ""),
                                      target=str(body.get("target") or ""),
                                      chapter=body.get("chapter"),
                                      severity=str(body.get("severity") or "major"),
                                      source="preview-ui")
                    return self._json({"ok": True, "item": item})
                if self.path == "/api/resolve":
                    return self._json({"ok": True,
                                       "item": revise_resolve(ctx, str(body.get("id") or ""))})
                if self.path == "/api/confirm":
                    res = confirm(ctx, by=str(body.get("by") or "user"))
                    return self._json(res, 200 if res.get("ok") else 400)
                return self._json({"ok": False, "error": "未知端点"}, 404)
            except Exception as e:
                return self._json({"ok": False, "error": str(e)}, 400)

        def log_message(self, fmt, *a):
            # 请求日志进 stdout（后台任务可查）——用户遇到的 404 可直接定位路径
            import sys
            sys.stdout.write("[preview-serve] " + (fmt % a) + "\n")
            sys.stdout.flush()

    class Srv(socketserver.ThreadingTCPServer):
        allow_reuse_address = True
        daemon_threads = True

    with Srv(("127.0.0.1", port), H) as srv:
        print(f"预览审批服务: http://127.0.0.1:{srv.server_address[1]}/4-video/preview/index.html",
              flush=True)
        print("页面内提交意见直接写 revisions.json；Ctrl+C 停止。", flush=True)
        try:
            srv.serve_forever()
        except KeyboardInterrupt:
            pass

# ── 过审门 ─────────────────────────────────────────────────────
def gate(ctx) -> tuple[bool, str]:
    """渲染人工门的真谓词（体检 C4）：confirmed 文件存在 ≠ 过审。
    绑定意见账本计数与图像证据 —— confirm 后再 add 意见/删图 → 门自动关闭。"""
    st = status(ctx)
    if not st["generated"]:
        return False, "预览包未生成（先 python -m paperpipe preview）"
    if not st["confirmed"]:
        return False, "预览包未过审（preview --confirm）"
    if st["open"] > 0:
        return False, "修改意见 open %d/%d" % (st["open"], st["total"])
    if not os.path.exists(ctx.out("4-video", "narration.json")):
        return False, "4-video/narration.json 缺失"
    fp = frame_problems(ctx)
    if fp:
        return False, "预览帧证据缺失: " + fp[0]
    ap = asset_preview_problems(ctx)
    if ap:
        return False, "资产预览图缺失: " + ap[0]
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
    problems += frame_problems(ctx)
    problems += asset_preview_problems(ctx)
    if problems:
        return {"ok": False, "problems": problems}
    from . import receipts
    info = {"confirmed_at": utcnow(), "by": by,
            "revisions_total": st["total"], "revisions_resolved": st["resolved"]}
    atomic_write_json(os.path.join(_prev_dir(ctx), "preview_confirmed.json"), info)
    receipts.write_tool_receipt(ctx, "render", "preview-confirm", [by, "preview_review"],
                                0, output_paths=["4-video/preview/preview_confirmed.json"],
                                note=f"导演过审：意见 {st['resolved']}/{st['total']} resolved；"
                                     "图像证据（逐章帧+资产预览图）核验通过")
    return {"ok": True, **info}
