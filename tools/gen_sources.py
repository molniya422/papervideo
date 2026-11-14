# -*- coding: utf-8 -*-
"""gen_sources.py — 扫描 hf 目录实际引用，生成 render.sources 白名单（体检 P2 白名单漂移）。
用法: python tools/gen_sources.py <run_dir> [hf_subdir]
输出 YAML 片段到 stdout（粘贴进 paperpipe.yaml 的 render.sources）。
规则：本地 src/href/字符串引用的 wav|mp3|png|jpg|woff2|json|js|css 全收；收敛到目录级 glob 保持稳健。
"""
import os, re, sys

def main():
    run = sys.argv[1].rstrip("/\\")
    sub = sys.argv[2] if len(sys.argv) > 2 else "4-video/hf"
    hf = os.path.join(run, sub)
    refs = set()
    pats = [re.compile('src="([^"]+)"'), re.compile('href="([^"]+)"'),
            re.compile('["\']([\\w./\\-]+\\.(?:wav|mp3|png|jpg|jpeg|woff2?|json|js|css))["\']')]
    for root, _, files in os.walk(hf):
        for f in files:
            if not f.endswith((".html", ".js", ".css")):
                continue
            t = open(os.path.join(root, f), encoding="utf-8", errors="ignore").read()
            for pat in pats:
                for m in pat.finditer(t):
                    u = m.group(1)
                    if u.startswith(("http", "data:", "blob:", "#", "//")):
                        continue
                    refs.add(os.path.normpath(os.path.join(root, u.split("?")[0])))
    lines = ["# render.sources（相对 run 目录，按实际引用生成——粘贴进 paperpipe.yaml）", "  sources:"]
    seen = set()
    for r in sorted(refs):
        if not os.path.isfile(r):
            print("# MISSING(引用但磁盘无):", os.path.relpath(r, run), file=sys.stderr)
            continue
        rel = os.path.relpath(r, run).replace("\\", "/")
        parts = rel.split("/")
        # 目录级收敛：4-video/hf/assets/** 与 4-video/hf/compositions/**
        if len(parts) > 3 and parts[0] == "4-video":
            key = "/".join(parts[:3] if parts[2] != "hf" else parts[:4]) + "/**"
        else:
            key = rel
        if key not in seen:
            seen.add(key)
            lines.append('    - "%s"' % key)
    print("\n".join(lines))

if __name__ == "__main__":
    main()
