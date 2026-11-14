import React from "react";
import {AbsoluteFill, useCurrentFrame} from "remotion";
import {ThreeCanvas} from "@remotion/three";

/* ─────────── 蓝图主题 ─────────── */
export const C = {
  bg: "#0a2038",
  bgDeep: "#061527",
  paper: "#0c2742",
  grid: "rgba(120,190,255,0.10)",
  gridMajor: "rgba(120,190,255,0.18)",
  line: "#cfe8ff",
  lineDim: "#7fb0d8",
  lineFaint: "#3f6f96",
  text: "#e8f2ff",
  muted: "#8fb0cc",
  accent: "#ff8c42",
  mint: "#5eead4",
  amber: "#fbbf24",
  purple: "#a78bfa",
  green: "#34d399",
};

export const FONT = '"Noto Sans SC", "Microsoft YaHei", "PingFang SC", system-ui, sans-serif';
export const MONO = '"JetBrains Mono", "Cascadia Code", Consolas, monospace';

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const easeInOut = (v: number) => {
  const t = clamp01(v);
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};
export const easeOut = (v: number) => 1 - Math.pow(1 - clamp01(v), 3);
export const rnd = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/* ─────────── 版面 ─────────── */
export const SPINE_W = 420;
export const STAGE_X = SPINE_W;
export const STAGE_W = 1920 - SPINE_W; // 1500
export const STAGE_H = 960;
export const CAPTION_H = 120;

/* 图纸台：CSS 方格纸 + 角标 */
export const Stage: React.FC<{
  children: React.ReactNode;
  fov?: number;
  position?: [number, number, number];
  full?: boolean;
  grid?: boolean;
}> = ({children, fov = 42, position = [0, 0, 14], full = false, grid = true}) => {
  const x = full ? 0 : STAGE_X;
  const w = full ? 1920 : STAGE_W;
  const h = full ? 1080 : STAGE_H;

  const bg = grid
    ? [
        `linear-gradient(${C.gridMajor} 1px, transparent 1px)`,
        `linear-gradient(90deg, ${C.gridMajor} 1px, transparent 1px)`,
        `linear-gradient(${C.grid} 1px, transparent 1px)`,
        `linear-gradient(90deg, ${C.grid} 1px, transparent 1px)`,
      ].join(",")
    : "none";

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: 0,
        width: w,
        height: h,
        overflow: "hidden",
        background: `radial-gradient(ellipse 75% 70% at 55% 45%, #0e2c4a 0%, ${C.bg} 55%, ${C.bgDeep} 100%)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: bg,
          backgroundSize: "200px 200px, 200px 200px, 40px 40px, 40px 40px",
          opacity: 0.75,
        }}
      />
      <ThreeCanvas
        width={w}
        height={h}
        camera={{fov, near: 0.1, far: 200, position}}
        gl={{antialias: true, alpha: true}}
        style={{position: "absolute", inset: 0, background: "transparent"}}
      >
        {children}
      </ThreeCanvas>
    </div>
  );
};

/* ─────────── 论证脊柱 ─────────── */
export const SPINE_NODES = [
  {id: "c02", label: "问题", sub: "RNN 的两个代价"},
  {id: "c03", label: "查询", sub: "把传递换成提问"},
  {id: "c04", label: "计算", sub: "Q K V 与点积"},
  {id: "c05", label: "稳定", sub: "除以 √dk"},
  {id: "c06", label: "读取", sub: "加权求和"},
  {id: "c07", label: "容量", sub: "多头"},
  {id: "c08", label: "顺序", sub: "位置编码"},
  {id: "c09", label: "深度", sub: "残差与归一化"},
  {id: "c10", label: "装配", sub: "编码器 · 解码器"},
  {id: "c11", label: "证据", sub: "28.4 BLEU"},
];

export const Spine: React.FC<{
  shotId: string;
  sheet: number;
  total: number;
  title: string;
  kicker: string;
  bullets: string[];
  bulletAt: number[];
  accent: string;
  hero?: boolean;
  localFrame?: number;
}> = ({shotId, sheet, total, title, kicker, bullets, bulletAt, accent, hero, localFrame}) => {
  const f = useCurrentFrame();
  const frame = localFrame === undefined ? f : localFrame;
  const activeIdx = SPINE_NODES.findIndex((n) => n.id === shotId);
  const titleOp = Math.min(1, frame / 14);

  const top = 188;
  const gap = 46;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: SPINE_W,
        height: STAGE_H,
        boxSizing: "border-box",
        padding: "54px 40px 0 44px",
        fontFamily: FONT,
        background: `linear-gradient(180deg, ${C.paper} 0%, ${C.bgDeep} 100%)`,
        borderRight: `1px solid ${C.lineFaint}`,
      }}
    >
      {/* 图签 */}
      <div style={{display: "flex", alignItems: "baseline", justifyContent: "space-between"}}>
        <div style={{fontFamily: MONO, fontSize: 13, letterSpacing: 4, color: C.lineDim}}>BLUEPRINT</div>
        <div style={{fontFamily: MONO, fontSize: 11, letterSpacing: 2, color: C.lineFaint}}>No.1706.03762</div>
      </div>
      <div style={{height: 1, background: C.lineFaint, marginTop: 12, opacity: 0.7}} />

      {/* 论证脊柱 */}
      <div style={{position: "absolute", left: 44, top, width: 2, height: SPINE_NODES.length * gap + 10, background: C.lineFaint, opacity: 0.5}} />
      <div style={{position: "absolute", left: 44, top, width: 2, height: Math.max(0, activeIdx) * gap, background: accent, opacity: 0.9}} />

      {SPINE_NODES.map((n, i) => {
        const done = activeIdx >= 0 && i < activeIdx;
        const active = i === activeIdx;
        const y = top + i * gap;
        return (
          <div key={n.id} style={{position: "absolute", left: 0, top: y - 9, width: "100%"}}>
            <div
              style={{
                position: "absolute",
                left: 39,
                top: 0,
                width: 12,
                height: 12,
                borderRadius: 999,
                background: active ? accent : done ? C.lineDim : C.bgDeep,
                border: `1.5px solid ${active ? accent : done ? C.lineDim : C.lineFaint}`,
                boxShadow: active ? `0 0 0 4px rgba(255,140,66,.18)` : "none",
              }}
            />
            <div style={{position: "absolute", left: 68, top: -3, fontFamily: MONO, fontSize: 10, color: C.lineFaint, letterSpacing: 1}}>
              {String(i + 1).padStart(2, "0")}
            </div>
            <div
              style={{
                position: "absolute",
                left: 100,
                top: -4,
                fontSize: 17,
                letterSpacing: 2,
                color: active ? C.text : done ? C.muted : C.lineFaint,
                fontWeight: active ? 700 : 400,
              }}
            >
              {n.label}
              {active ? <span style={{fontSize: 12, color: C.muted, marginLeft: 10, letterSpacing: 0}}>{n.sub}</span> : null}
            </div>
          </div>
        );
      })}

      {/* 当前章节 */}
      <div style={{position: "absolute", left: 44, right: 34, top: 700, opacity: titleOp}}>
        <div style={{fontFamily: MONO, fontSize: 11, letterSpacing: 2.5, color: accent}}>{kicker}</div>
        <div style={{fontSize: hero ? 34 : 27, lineHeight: 1.3, fontWeight: 800, color: "#fff", marginTop: 10}}>{title}</div>
        <div style={{marginTop: 18, display: "flex", flexDirection: "column", gap: 10}}>
          {bullets.map((b, i) => {
            const at = bulletAt[i] ?? 0;
            const op = Math.min(1, Math.max(0, (frame - at) / 16));
            return (
              <div
                key={i}
                style={{
                  opacity: op,
                  fontSize: 16.5,
                  lineHeight: 1.5,
                  color: "#c3d8ea",
                  borderLeft: `2px solid ${op > 0.3 ? accent : C.lineFaint}`,
                  paddingLeft: 10,
                }}
              >
                {b}
              </div>
            );
          })}
        </div>
      </div>

      {/* 图号 */}
      <div
        style={{
          position: "absolute",
          left: 44,
          bottom: 26,
          right: 34,
          display: "flex",
          justifyContent: "space-between",
          fontFamily: MONO,
          fontSize: 11,
          letterSpacing: 2,
          color: C.lineFaint,
        }}
      >
        <span>ATTENTION IS ALL YOU NEED</span>
        <span>
          SHEET {String(sheet).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
};

/* ─────────── 字幕带 ─────────── */
export const Caption: React.FC<{text: string; accent: string; total: number}> = ({text, accent, total}) => {
  const frame = useCurrentFrame();
  const op = Math.min(1, frame / 7, (total - frame) / 7);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        bottom: 0,
        width: 1920,
        height: CAPTION_H,
        background: "#04101e",
        borderTop: `1px solid ${C.lineFaint}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT,
        opacity: Math.max(0, op),
      }}
    >
      <div style={{display: "flex", alignItems: "center", gap: 16, maxWidth: 1620}}>
        <div style={{width: 22, height: 1.5, background: accent, flexShrink: 0}} />
        <div style={{fontSize: 32, color: "#eaf3ff", letterSpacing: 0.4, lineHeight: 1.4}}>{text}</div>
      </div>
    </div>
  );
};
