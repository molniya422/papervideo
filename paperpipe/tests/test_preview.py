"""paperpipe 预览门测试（python -X utf8 -m paperpipe.tests.test_preview）。

P1 revise add/list/resolve + 类别白名单
P2 preview 生成预览包（index.html/storyboard.md/narration.md/revisions.json）
P3 意见未 resolved → confirm 拒绝；resolved → confirm 过审 + tool receipt
P4 RenderAdapter 渲染人工门：未过审 → waiting_for_human（hyperframes 路线）
"""
from __future__ import annotations
import json, os, sys, tempfile, shutil

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from paperpipe import preview as P
from paperpipe.adapters import RenderAdapter, RuntimeCtx
from paperpipe.config import DEFAULTS
from paperpipe.state import RunState
from paperpipe.util import atomic_write_text

PASS, FAIL = 0, 0
def check(name, cond, detail=""):
    global PASS, FAIL
    if cond:
        PASS += 1; print(f"  [OK] {name}")
    else:
        FAIL += 1; print(f"  [FAIL] {name} {detail}")

def make_ctx(tmp, name="run"):
    rd = os.path.join(tmp, name)
    rs = RunState.create(rd, "t", "1506.02640", "video", dict(DEFAULTS))
    atomic_write_text(os.path.join(rd, "4-video", "narration.json"), json.dumps({
        "schema": "narration/1", "total_seconds": 10, "shots": [
            {"id": "k00", "chapter": 0, "title": "开场", "transition_in": "iris",
             "is_3d": True, "start": 0, "duration": 4.0, "frames": 120,
             "sentences": [{"text": "这一眼里有几辆车？", "start": 0.5, "seconds": 3.0, "audio": None}]},
            {"id": "k01", "chapter": 1, "title": "检测", "transition_in": "shutter",
             "is_3d": True, "start": 4, "duration": 6.0, "frames": 180,
             "sentences": [{"text": "网格化整图", "start": 4.5, "seconds": 3.0, "audio": None}]}]}))
    for n in (0, 1):
        atomic_write_text(os.path.join(rd, "4-video", "hf", "compositions", f"ch{n:02d}.html"),
                          f"<html>ch{n}</html>")
    ctx = RuntimeCtx(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                     rd, dict(DEFAULTS), rs)
    ctx.cfg["render"] = {"mode": "hyperframes", "cwd": "4-video/hf",
                         "command": ["npx", "hyperframes", "render", "-o", "out.mp4"],
                         "sources": ["4-video/hf/compositions/**"]}
    return ctx

def main():
    tmp = tempfile.mkdtemp(prefix="paperpipe-preview-")
    try:
        print("P1 revise CRUD")
        ctx = make_ctx(tmp)
        try:
            P.revise_add(ctx, "不存在的类别", "x")
            check("未知类别被拒", False)
        except ValueError:
            check("未知类别被拒", True)
        it = P.revise_add(ctx, "camera", "第 5 章环绕太快，改成停 2s 再转", chapter=5, severity="minor")
        check("add 生成自增 id", it["id"] == "R001", str(it))
        P.revise_add(ctx, "script", "开场句改成疑问句")
        check("list 全量", len(P.revise_list(ctx)) == 2)
        check("list 按 status 过滤", len(P.revise_list(ctx, "open")) == 2)

        print("P2 预览包生成")
        res = P.generate(ctx)
        d = ctx.out("4-video", "preview")
        for f in ("index.html", "storyboard.md", "narration.md", "revisions.json"):
            check(f"产物 {f}", os.path.exists(os.path.join(d, f)))
        html = open(os.path.join(d, "index.html"), encoding="utf-8").read()
        check("index 含两章入口", "ch00" in html and "ch01" in html)
        check("index 的 iframe 相对路径指向 compositions", "../hf/compositions" in html)
        sb = open(os.path.join(d, "storyboard.md"), encoding="utf-8").read()
        check("分镜表含相机列与对象列", "相机cue" in sb and "3D对象" in sb)

        print("P3 过审门")
        res = P.confirm(ctx)
        check("意见未 resolved → confirm 拒绝", not res["ok"] and any("resolved" in p for p in res["problems"]),
              str(res))
        P.revise_resolve(ctx, "R001", note="改了相机 cue")
        P.revise_resolve(ctx, "R002", note="改了开场句")
        res = P.confirm(ctx, by="导演")
        check("resolved → confirm 过审", res.get("ok"), str(res))
        check("过审凭据落盘", os.path.exists(ctx.out("4-video", "preview", "preview_confirmed.json")))
        from paperpipe import receipts
        check("过审写 tool receipt",
              any(r.get("tool") == "preview-confirm" for r in receipts.list_tool_receipts(ctx, "render", "preview-confirm")))

        print("P4 渲染人工门")
        ctx2 = make_ctx(tmp, "run2")
        res = RenderAdapter().run(ctx2)
        check("未过审 → waiting_for_human", res.status == "waiting_for_human",
              f"got {res.status}: {(res.error.message if res.error else '')[:70]}")
        P.generate(ctx2)
        P.confirm(ctx2, by="导演")
        st = P.status(ctx2)
        check("过审后 status.confirmed", st["confirmed"] and st["open"] == 0, str(st))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print(f"\n结果: {PASS} 通过 / {FAIL} 失败")
    sys.exit(1 if FAIL else 0)

if __name__ == "__main__":
    main()
