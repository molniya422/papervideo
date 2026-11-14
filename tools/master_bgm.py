# -*- coding: utf-8 -*-
"""master_bgm.py — BGM 母带处理（体检 Batch 4）：结尾淡出 + -1dBFS 限制 + 48kHz 对齐。
背景：yolo-v5 审计发现 bgm.wav 末 2s RMS 高 21dB 且 0dBFS 戛然而止（成片最后一声爆切）。
用法: python tools/master_bgm.py <bgm.wav> [out.wav] [--fade 3]
"""
import sys, subprocess, os, re

FF = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                  "node_modules", "@ffmpeg-installer", "win32-x64", "ffmpeg.exe")

def duration_of(src):
    r = subprocess.run([FF, "-i", src], capture_output=True, text=True)
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", r.stderr)
    if not m:
        raise SystemExit("无法解析时长: " + r.stderr[:200])
    h, mi, s = m.groups()
    return int(h) * 3600 + int(mi) * 60 + float(s)

def main():
    src = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith("--") else \
        os.path.splitext(src)[0] + "_master.wav"
    fade = 3.0
    if "--fade" in sys.argv:
        fade = float(sys.argv[sys.argv.index("--fade") + 1])
    dur = duration_of(src)
    cmd = [FF, "-y", "-v", "error", "-i", src,
           "-af", "afade=t=out:st=%.2f:d=%.2f,alimiter=limit=0.891:level=false" % (max(0, dur - fade), fade),
           "-ar", "48000", "-c:a", "pcm_s16le", out]
    subprocess.run(cmd, check=True)
    print("mastered: %s (%.1fs, fade %.1fs, limit -1dBFS, 48kHz)" % (out, dur, fade))

if __name__ == "__main__":
    main()
