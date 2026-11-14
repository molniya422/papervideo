"""preview 图像证据测试（2026-11-07 审批系统修复）：无图不许过审。

V1 根组合挂载解析（属性乱序也认）
V2 generate 逐章实渲 3 帧 + meta 落盘（runner 替身）
V3 资产转台预览：registry 有 GLB 无图 → 拦；补三图 → 过；GLB 缺失 → 拦
V4 confirm 门四查：删帧门关 / 缺资产图门关 / 补齐恢复
V5 --serve 页面内反馈：POST /api/revise 写账本、/api/resolve 解决、GET status
"""
from __future__ import annotations
import json, os, sys, tempfile, shutil, socket, threading, time, urllib.request, urllib.error

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from paperpipe import preview as P
from paperpipe.adapters import RuntimeCtx
from paperpipe.config import DEFAULTS
from paperpipe.state import RunState
from paperpipe.util import atomic_write_text, atomic_write_json

PASS, FAIL = 0, 0
def check(name, cond, detail=""):
    global PASS, FAIL
    if cond:
        PASS += 1; print(f"  [OK] {name}")
    else:
        FAIL += 1; print(f"  [FAIL] {name} {detail}")

PNG = b"\x89PNG\r\n\x1a\nfake"
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def fake_snap(n_or_name, at, out):
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "wb") as f:
        f.write(PNG)

def make_ctx(tmp, name="v"):
    rd = os.path.join(tmp, name)
    RunState.create(rd, "t", "1506.02640", "video", dict(DEFAULTS))
    atomic_write_text(os.path.join(rd, "4-video", "narration.json"), json.dumps({
        "schema": "narration/1", "total_seconds": 4, "shots": [
            {"id": "k00", "chapter": 0, "title": "开场", "transition_in": "iris",
             "is_3d": True, "start": 0, "duration": 4.0, "frames": 120,
             "sentences": [{"text": "这一眼里有几辆车？", "start": 0.5, "seconds": 3.0, "audio": None}]}]}))
    atomic_write_text(os.path.join(rd, "4-video", "hf", "compositions", "ch00.html"), "<html>ch0</html>")
    atomic_write_text(os.path.join(rd, "4-video", "hf", "index.html"),
                      '<div id="root" data-composition-id="main" data-start="0" data-duration="4">'
                      '<div data-composition-id="ch00" data-composition-src="compositions/ch00.html" '
                      'data-start="0" data-duration="4"></div></div>')
    ctx = RuntimeCtx(ROOT, rd, dict(DEFAULTS), RunState(rd))
    ctx.cfg["render"] = {"mode": "hyperframes", "cwd": "4-video/hf",
                         "command": ["npx", "hyperframes", "render", "-o", "out.mp4"],
                         "sources": ["4-video/hf/compositions/**"]}
    return ctx

def main():
    tmp = tempfile.mkdtemp(prefix="paperpipe-pvi-")
    try:
        print("V1 根组合挂载解析（属性乱序）")
        ctx = make_ctx(tmp, "v1")
        atomic_write_text(os.path.join(ctx.out("4-video", "hf"), "index.html"),
                          '<div data-duration="4" data-start="0" '
                          'data-composition-src="compositions/ch00.html" '
                          'data-composition-id="ch00"></div>')
        m = P._root_mounts(ctx)
        check("乱序属性解析出 ch00 偏移", m.get(0) == {"start": 0.0, "dur": 4.0}, str(m))

        print("V2 generate 逐章实渲 3 帧")
        ctx = make_ctx(tmp, "v2")
        res = P.generate(ctx, snap_runner=fake_snap)
        check("无 problems", res["problems"] == [], str(res["problems"])[:200])
        check("frames_rendered==3", res["frames_rendered"] == 3, str(res["frames_rendered"]))
        fr1 = ctx.out("4-video", "preview", "frames", "ch00_f1.png")
        check("帧文件在盘", os.path.exists(fr1) and open(fr1, "rb").read() == PNG)
        meta = json.load(open(ctx.out("4-video", "preview", "preview_meta.json"), encoding="utf-8"))
        check("meta 携带帧清单", meta["chapters"][0]["frames"] == [
            "frames/ch00_f1.png", "frames/ch00_f2.png", "frames/ch00_f3.png"],
            str(meta["chapters"][0].get("frames")))

        print("V3 资产转台预览门")
        ctx = make_ctx(tmp, "v3")
        P.generate(ctx, snap_runner=fake_snap)
        atomic_write_json(ctx.out("3-figures", "asset_registry.json"), {"assets": [
            {"name": "car", "brief": "3-figures/asset_briefs/car.md", "route": "R1",
             "license": "CC0", "glb": "4-video/hf/assets/models/car.glb", "used_in": ["ch00"]}]})
        atomic_write_text(ctx.out("4-video", "hf", "assets", "models", "car.glb"), "glb")
        probs = P.asset_preview_problems(ctx)
        check("GLB 有登记无预览图 → 拦", any("预览图缺失" in x for x in probs), str(probs)[:160])
        res_c = P.confirm(ctx, by="导演")
        check("confirm 被缺图拦", not res_c.get("ok")
              and any("预览图" in p for p in res_c.get("problems", [])), str(res_c)[:200])
        P.generate_asset_previews(ctx, runner=fake_snap)
        check("补三机位图后过", P.asset_preview_problems(ctx) == [],
              str(P.asset_preview_problems(ctx))[:160])
        ap1 = ctx.out("3-figures", "asset_previews", "car", "a1.png")
        check("资产图落 3-figures", os.path.exists(ap1) and open(ap1, "rb").read() == PNG)
        ctx2 = make_ctx(tmp, "v3b")
        P.generate(ctx2, snap_runner=fake_snap)
        atomic_write_json(ctx2.out("3-figures", "asset_registry.json"), {"assets": [
            {"name": "car", "brief": "b", "route": "R1", "license": "CC0",
             "glb": "4-video/hf/assets/models/missing.glb"}]})
        probs2 = P.asset_preview_problems(ctx2)
        check("GLB 文件缺失 → 拦", any("GLB 缺失" in x for x in probs2), str(probs2)[:160])

        print("V4 confirm 门四查（删帧/删图自动关门）")
        ctx = make_ctx(tmp, "v4")
        P.generate(ctx, snap_runner=fake_snap)
        ok, why = P.gate(ctx)
        check("未过审 → 门关", not ok and "未过审" in why, why)
        P.confirm(ctx, by="导演")
        ok, why = P.gate(ctx)
        check("过审+图齐 → 门开", ok, why)
        os.remove(ctx.out("4-video", "preview", "frames", "ch00_f2.png"))
        ok, why = P.gate(ctx)
        check("confirm 后删帧 → 门自动关", not ok and "预览帧" in why, why)
        fake_snap(0, 1.0, ctx.out("4-video", "preview", "frames", "ch00_f2.png"))
        ok, why = P.gate(ctx)
        check("帧恢复 → 门开", ok, why)
        atomic_write_json(ctx.out("3-figures", "asset_registry.json"), {"assets": [
            {"name": "car", "brief": "b", "route": "R1", "license": "CC0",
             "glb": "4-video/hf/assets/models/car.glb"}]})
        atomic_write_text(ctx.out("4-video", "hf", "assets", "models", "car.glb"), "glb")
        ok, why = P.gate(ctx)
        check("confirm 后加未审资产 → 门自动关", not ok and "资产预览图" in why, why)

        print("V5 --serve 页面内反馈")
        ctx = make_ctx(tmp, "v5")
        P.generate(ctx, snap_runner=fake_snap)
        P.confirm(ctx, by="导演")               # 先过审，再验证页面意见会自动关门
        s = socket.socket(); s.bind(("127.0.0.1", 0)); port = s.getsockname()[1]; s.close()
        t = threading.Thread(target=P.serve, args=(ctx, port), daemon=True)
        t.start()
        time.sleep(0.6)
        base = f"http://127.0.0.1:{port}"
        body = json.dumps({"category": "camera", "wanted": "环绕太快",
                           "chapter": 0, "severity": "minor", "target": "ch00"}).encode()
        req = urllib.request.Request(base + "/api/revise", data=body,
                                     headers={"Content-Type": "application/json"})
        r = json.loads(urllib.request.urlopen(req, timeout=5).read())
        check("POST /api/revise 写账本", r.get("ok") and r["item"]["id"] == "R001"
              and r["item"]["source"] == "preview-ui", str(r)[:160])
        revs = json.loads(urllib.request.urlopen(base + "/api/revisions", timeout=5).read())
        check("GET /api/revisions 可读", len(revs["items"]) == 1)
        st = json.loads(urllib.request.urlopen(base + "/api/status", timeout=5).read())
        check("status open 1/1", st["open"] == 1 and st["total"] == 1, str(st))
        ok, why = P.gate(ctx)
        check("过审后页面又提意见 → 门自动关（open>0 拒渲）", not ok and "open" in why, why)
        body = json.dumps({"id": "R001"}).encode()
        req = urllib.request.Request(base + "/api/resolve", data=body,
                                     headers={"Content-Type": "application/json"})
        r = json.loads(urllib.request.urlopen(req, timeout=5).read())
        check("POST /api/resolve 解决", r.get("ok") and r["item"]["status"] == "resolved")
        body = json.dumps({"by": "user"}).encode()
        req = urllib.request.Request(base + "/api/confirm", data=body,
                                     headers={"Content-Type": "application/json"})
        r = json.loads(urllib.request.urlopen(req, timeout=5).read())
        check("页面申请过审 → 凭据写入", r.get("ok") and r.get("revisions_resolved") == 1
              and os.path.exists(ctx.out("4-video", "preview", "preview_confirmed.json")))
        ok, why = P.gate(ctx)
        check("页面过审后渲染门放行", ok, why)
        bad = json.dumps({"category": "nope", "wanted": "x"}).encode()
        req = urllib.request.Request(base + "/api/revise", data=bad,
                                     headers={"Content-Type": "application/json"})
        try:
            resp = urllib.request.urlopen(req, timeout=5)
            code = resp.getcode()
        except urllib.error.HTTPError as e:
            code = e.code
        check("非法类别 400", code == 400, str(code))
        idx = urllib.request.urlopen(base + "/4-video/preview/index.html", timeout=5).read()
        check("工作台可经服务访问", len(idx) > 1000 and "预览审批工作台".encode() in idx, str(len(idx)))

        print("V6 无挂载根组合 → 明确失败（不静默出空预览）")
        ctx = make_ctx(tmp, "v6")
        os.remove(ctx.out("4-video", "hf", "index.html"))
        res = P.generate(ctx, snap_runner=fake_snap)
        check("problems 指出挂载缺失", any("挂载" in x for x in res["problems"])
              and res["frames_rendered"] == 0, str(res["problems"])[:160])

        print("V7 动态条（帧循环播放器的数据面）")
        ctx = make_ctx(tmp, "v7")
        P.generate(ctx, snap_runner=fake_snap)
        real_snap = P._snap_one
        P._snap_one = lambda hf, at, out, timeout=240: fake_snap(0, at, out)
        try:
            r = P.filmstrip(ctx, 0)
        finally:
            P._snap_one = real_snap
        check("9 帧均匀采样", len(r.get("frames", [])) == 9, str(r)[:160])
        check("帧文件在盘", all(os.path.exists(ctx.out("4-video", "preview", rel))
                                for rel in r["frames"]))
        r2 = P.filmstrip(ctx, 0)
        check("幂等（第二次直接复用）", len(r2.get("frames", [])) == 9)
        r3 = P.filmstrip(ctx, 7)
        check("未挂载章 → error", "error" in r3, str(r3)[:120])
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print(f"\n结果: {PASS} 通过 / {FAIL} 失败")
    sys.exit(1 if FAIL else 0)

if __name__ == "__main__":
    main()
