import React, {useEffect, useMemo, useRef} from "react";
import {AbsoluteFill, useCurrentFrame} from "remotion";

/* ───────────────────────── 调色与常量 ───────────────────────── */

export const PAL = {
  bg: "#0a0a0b",
  ink: "#ffd21e",
  warm: "#ff3d00",
  dim: "#6b6b63",
  line: "#2a2a26",
  paper: "#0f0f10",
};

export const W = 1920;
export const H = 1080;
export const GAP = 8;
export const SHADES = 12;

export const FONT_HEAVY = '"Arial Black", "Noto Sans SC", "Microsoft YaHei", sans-serif';
export const FONT_UI = '"Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif';
export const MONO = '"JetBrains Mono", "Cascadia Code", Consolas, monospace';

const TAU = Math.PI * 2;

/* ───────────────────────── 工具 ───────────────────────── */

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const easeOut = (v: number) => 1 - Math.pow(1 - clamp01(v), 3);
export const easeInOut = (v: number) => {
  const t = clamp01(v);
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};
export const rnd = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/* ───────────────────────── 圆点精灵（避免逐点 arc） ───────────────────────── */

let SPRITE_CACHE: HTMLCanvasElement[] | null = null;

function buildSprites() {
  const ink = hexToRgb(PAL.ink);
  const warm = hexToRgb(PAL.warm);
  const size = 40;
  const arr: HTMLCanvasElement[] = [];
  for (let i = 0; i <= SHADES; i++) {
    const t = i / SHADES;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const x = c.getContext("2d")!;
    const r = Math.round(ink[0] + (warm[0] - ink[0]) * t);
    const g = Math.round(ink[1] + (warm[1] - ink[1]) * t);
    const b = Math.round(ink[2] + (warm[2] - ink[2]) * t);
    const grad = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, `rgb(${r},${g},${b})`);
    grad.addColorStop(0.86, `rgb(${r},${g},${b})`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    x.fillStyle = grad;
    x.beginPath();
    x.arc(size / 2, size / 2, size / 2, 0, TAU);
    x.fill();
    arr.push(c);
  }
  return arr;
}

const sprites = () => {
  if (!SPRITE_CACHE) SPRITE_CACHE = buildSprites();
  return SPRITE_CACHE;
};

/* ───────────────────────── 静态层（网格 / 刻度 / 扫描线） ───────────────────────── */

let STATIC_CACHE: HTMLCanvasElement | null = null;

function buildStatic() {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d")!;

  // 细网格
  x.lineWidth = 0.5;
  x.strokeStyle = "rgba(255,210,30,0.055)";
  x.beginPath();
  for (let gx = 32; gx < W; gx += 32) {
    x.moveTo(gx + 0.5, 0);
    x.lineTo(gx + 0.5, H);
  }
  for (let gy = 32; gy < H; gy += 32) {
    x.moveTo(0, gy + 0.5);
    x.lineTo(W, gy + 0.5);
  }
  x.stroke();

  // 左右刻度
  const pad = 18;
  x.strokeStyle = "rgba(255,210,30,0.26)";
  x.lineWidth = 1;
  x.beginPath();
  for (let gy = 8; gy < H; gy += 12) {
    const long = gy % 60 === 0;
    const len = long ? 10 : 4;
    x.moveTo(pad - len, gy + 0.5);
    x.lineTo(pad, gy + 0.5);
    x.moveTo(W - pad, gy + 0.5);
    x.lineTo(W - pad + len, gy + 0.5);
  }
  x.stroke();
  x.strokeStyle = "rgba(255,210,30,0.14)";
  x.beginPath();
  x.moveTo(pad + 0.5, 0);
  x.lineTo(pad + 0.5, H);
  x.moveTo(W - pad - 0.5, 0);
  x.lineTo(W - pad - 0.5, H);
  x.stroke();

  // CRT 扫描线
  x.fillStyle = "rgba(0,0,0,0.16)";
  for (let gy = 0; gy < H; gy += 3) x.fillRect(0, gy, W, 1);

  return c;
}

const staticLayer = () => {
  if (!STATIC_CACHE) STATIC_CACHE = buildStatic();
  return STATIC_CACHE;
};

/* ───────────────────────── 颗粒 ───────────────────────── */

let GRAIN_CACHE: HTMLCanvasElement | null = null;
function grainTile() {
  if (GRAIN_CACHE) return GRAIN_CACHE;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const x = c.getContext("2d")!;
  const id = x.createImageData(256, 256);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = Math.random() * 255;
    id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
    id.data[i + 3] = Math.random() < 0.5 ? 0 : 255;
  }
  x.putImageData(id, 0, 0);
  GRAIN_CACHE = c;
  return c;
}

/* ───────────────────────── 点模型 ───────────────────────── */

export type Dot = {x: number; y: number; r: number};

/** 文字 → 点阵（按 text/font/size/crop 缓存） */
const TEXT_CACHE = new Map<string, Dot[]>();

export function textDots(
  text: string,
  opts: {
    weight?: number;
    font?: string;
    size?: number;
    fitWidth?: number;
    crop?: number;
    y?: number;
    gap?: number;
    minCov?: number;
  } = {},
): Dot[] {
  const weight = opts.weight ?? 900;
  const font = opts.font ?? FONT_HEAVY;
  const gap = opts.gap ?? GAP;
  const crop = opts.crop ?? 0.22;
  const yOff = opts.y ?? 0;
  const minCov = opts.minCov ?? 0.06;
  const key = [text, weight, font, opts.size, opts.fitWidth, crop, yOff, gap].join("|");
  const hit = TEXT_CACHE.get(key);
  if (hit) return hit;

  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d", {willReadFrequently: true})!;
  x.fillStyle = "#fff";
  x.textBaseline = "alphabetic";

  let size = opts.size ?? 300;
  x.font = `${weight} ${size}px ${font}`;
  if (opts.fitWidth) {
    const measured = x.measureText(text).width || 1;
    size = (opts.fitWidth / measured) * size;
    x.font = `${weight} ${size}px ${font}`;
  }
  const box = x.measureText(text);
  const cap = box.actualBoundingBoxAscent || size * 0.72;
  x.fillText(text, (W - box.width) / 2, H + cap * crop + yOff);

  const img = x.getImageData(0, 0, W, H).data;
  const cols = Math.ceil(W / gap);
  const rows = Math.ceil(H / gap);
  const out: Dot[] = [];

  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      let sum = 0;
      for (let sy = 0; sy < 3; sy++) {
        for (let sx = 0; sx < 3; sx++) {
          const px = Math.min(W - 1, Math.floor(gx * gap + ((sx + 0.5) * gap) / 3));
          const py = Math.min(H - 1, Math.floor(gy * gap + ((sy + 0.5) * gap) / 3));
          sum += img[(py * W + px) * 4 + 3];
        }
      }
      const cov = sum / (9 * 255);
      if (cov < minCov) continue;
      out.push({
        x: gx * gap + gap / 2 + Math.sin(gy * 0.6) * gap * 0.1,
        y: gy * gap + gap / 2,
        r: Math.sqrt(cov) * gap * 0.56,
      });
    }
  }
  TEXT_CACHE.set(key, out);
  return out;
}

/* ───────────────────────── 点阵生成器 ───────────────────────── */

export function gridDots(o: {
  x: number;
  y: number;
  w: number;
  h: number;
  cols: number;
  rows: number;
  value: (i: number, j: number) => number;
  maxR?: number;
}): Dot[] {
  const {x, y, w, h, cols, rows, value, maxR = GAP * 0.52} = o;
  const sx = w / cols;
  const sy = h / rows;
  const out: Dot[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const v = clamp01(value(i, j));
      if (v < 0.03) continue;
      out.push({x: x + i * sx + sx / 2, y: y + j * sy + sy / 2, r: Math.sqrt(v) * maxR});
    }
  }
  return out;
}

export function lineDots(x1: number, y1: number, x2: number, y2: number, spacing = 9, r = 2.2): Dot[] {
  const d = Math.hypot(x2 - x1, y2 - y1);
  const n = Math.max(1, Math.floor(d / spacing));
  const out: Dot[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push({x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t, r});
  }
  return out;
}

export function waveDots(o: {
  x0: number;
  x1: number;
  y: number;
  amp: number;
  freq: number;
  phase: number;
  spacing?: number;
  r?: number;
}): Dot[] {
  const {x0, x1, y, amp, freq, phase, spacing = 8, r = 2.4} = o;
  const out: Dot[] = [];
  for (let x = x0; x <= x1; x += spacing) {
    out.push({x, y: y + Math.sin((x - x0) * freq + phase) * amp, r});
  }
  return out;
}

export function circleDots(cx: number, cy: number, R: number, spacing = 10, r = 2.2): Dot[] {
  const out: Dot[] = [];
  const steps = Math.max(12, Math.floor((TAU * R) / spacing));
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * TAU;
    out.push({x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, r});
  }
  return out;
}

/* ───────────────────────── 绘制 ───────────────────────── */

export type DrawOpts = {
  frame: number;
  /** 扫描波中心 y，-999 表示关闭 */
  sweepY?: number;
  /** 光标位置（用于方块化与升温） */
  cursor?: {x: number; y: number} | null;
  /** 冲击环 */
  shock?: {x: number; y: number; age: number} | null;
  /** 基础色阶 0..1（越大越暖） */
  warmth?: number;
  /** 透明度 */
  alpha?: number;
  /** 扰动强度 0..1，决定方块化比例 */
  chaos?: number;
};

/** 把点画到画布：扫描波升温、光标附近方块化、冲击环推开 */
export function paintDots(ctx: CanvasRenderingContext2D, dots: Dot[], o: DrawOpts) {
  const {frame, sweepY = -999, cursor = null, shock = null, warmth = 0, chaos = 1} = o;
  const alpha = Math.max(0, Math.min(1, o.alpha ?? 1));
  if (alpha <= 0.01) return;
  const sp = sprites();
  const ringR = shock ? Math.min(420, shock.age * 0.7) : -1;
  const ringFade = shock ? 1 - clamp01(shock.age / 600) : 0;
  ctx.globalAlpha = alpha;

  for (let i = 0; i < dots.length; i++) {
    const d = dots[i];
    let x = d.x;
    let y = d.y;
    let k = 0;

    // 冲击环：环形带内的点被向外推
    if (shock && shock.age < 600) {
      const dx = x - shock.x;
      const dy = y - shock.y;
      const dist = Math.hypot(dx, dy) + 0.001;
      const band = 1 - Math.min(1, Math.abs(dist - ringR) / 30);
      if (band > 0) {
        const f = band * 12 * ringFade;
        x += (dx / dist) * f;
        y += (dy / dist) * f;
        k = Math.max(k, band * ringFade);
      }
    }

    // 光标推力
    let kn = 0;
    if (cursor) {
      const dx = x - cursor.x;
      const dy = y - cursor.y;
      const dist = Math.hypot(dx, dy);
      const R = 120;
      if (dist < R) {
        const f = (1 - dist / R) * 10;
        x += (dx / (dist + 0.001)) * f;
        y += (dy / (dist + 0.001)) * f;
        kn = (1 - dist / R) * chaos;
        k = Math.max(k, kn * 0.8);
      }
    }

    // 扫描波
    let sweep = 0;
    if (sweepY > -500) {
      const dyS = Math.abs(y - sweepY);
      if (dyS < 70) sweep = 1 - dyS / 70;
    }

    const heat = clamp01(warmth + k * 0.9 + sweep * 0.55);
    const idx = Math.round(heat * SHADES);
    const rr = d.r * (1 + k * 0.55 + sweep * 0.5);

    if (kn > 0.22) {
      // 机械方块：朝光标方向旋转
      const a = Math.atan2((cursor!.y - y), (cursor!.x - x)) * 0.6 + kn * 1.1;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.fillStyle = ["#ffd21e", "#ffb01a", "#ff8c12", "#ff3d00"][Math.min(3, Math.floor(heat * 4))];
      const s = rr * 1.35;
      ctx.fillRect(-s, -s, s * 2, s * 2);
      ctx.restore();
    } else {
      ctx.drawImage(sp[idx], x - rr, y - rr, rr * 2, rr * 2);
    }
  }
  ctx.globalAlpha = 1;
}

/* ───────────────────────── HUD ───────────────────────── */

export function drawHud(
  ctx: CanvasRenderingContext2D,
  o: {
    frame: number;
    sweepY: number;
    cursor: {x: number; y: number} | null;
    shock: {x: number; y: number; age: number} | null;
    hudLabel?: string;
  },
) {
  const {frame, sweepY, cursor, shock} = o;

  // 扫描光带
  if (sweepY > -500) {
    const g = ctx.createLinearGradient(0, sweepY - 72, 0, sweepY + 72);
    g.addColorStop(0, "rgba(255,61,0,0)");
    g.addColorStop(0.5, "rgba(255,61,0,0.10)");
    g.addColorStop(1, "rgba(255,61,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, sweepY - 72, W, 144);
    ctx.strokeStyle = "rgba(255,61,0,0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, Math.round(sweepY) + 0.5);
    ctx.lineTo(W, Math.round(sweepY) + 0.5);
    ctx.stroke();
  }

  // 冲击环
  if (shock && shock.age < 600) {
    const p = shock.age / 600;
    const e = 1 - Math.pow(1 - p, 3);
    const R = e * 420;
    ctx.save();
    ctx.globalAlpha = (1 - p) * 0.38;
    ctx.strokeStyle = PAL.warm;
    ctx.lineWidth = 2.5 * (1 - p) + 0.4;
    ctx.beginPath();
    ctx.arc(shock.x, shock.y, R, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = (1 - p) * 0.3;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(shock.x, shock.y, R * 0.72, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  // 瞄准环
  if (cursor) {
    const R = 94;
    const rot = frame * 0.02;
    ctx.save();
    ctx.translate(cursor.x, cursor.y);

    ctx.strokeStyle = "rgba(255,210,30,0.5)";
    ctx.lineWidth = 1;
    ctx.setLineDash([1, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = "rgba(255,61,0,0.9)";
    ctx.beginPath();
    for (let i = 0; i < 24; i++) {
      const a = rot + (i / 24) * TAU;
      const long = i % 6 === 0;
      const r1 = R * 0.92;
      const r2 = R * (long ? 0.74 : 0.83);
      ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
    }
    ctx.stroke();

    const gap = R * 0.38;
    ctx.strokeStyle = "rgba(255,210,30,0.65)";
    ctx.beginPath();
    ctx.moveTo(-R * 1.25, 0);
    ctx.lineTo(-gap, 0);
    ctx.moveTo(gap, 0);
    ctx.lineTo(R * 1.25, 0);
    ctx.moveTo(0, -R * 1.25);
    ctx.lineTo(0, -gap);
    ctx.moveTo(0, gap);
    ctx.lineTo(0, R * 1.25);
    ctx.stroke();

    ctx.fillStyle = PAL.warm;
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

/* ───────────────────────── 舞台 ───────────────────────── */

export const HalftoneStage: React.FC<{
  draw: (ctx: CanvasRenderingContext2D, frame: number) => void;
  cursor?: {x: number; y: number} | null;
  shock?: {x: number; y: number; age: number} | null;
  sweep?: boolean;
  hudLabel?: string;
}> = ({draw, cursor = null, shock = null, sweep = true}) => {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PAL.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(staticLayer(), 0, 0);

    draw(ctx, frame);

    // 颗粒
    const g = ctx.createPattern(grainTile(), "repeat");
    if (g) {
      ctx.globalAlpha = 0.055;
      ctx.globalCompositeOperation = "overlay";
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }

    const sweepY = sweep ? ((frame * 2.4) % (H + 280)) - 140 : -999;
    drawHud(ctx, {frame, sweepY, cursor, shock});
  }, [frame, draw, cursor, shock, sweep]);

  return (
    <AbsoluteFill style={{background: PAL.bg}}>
      <canvas ref={ref} width={W} height={H} style={{width: "100%", height: "100%"}} />
    </AbsoluteFill>
  );
};

/* ───────────────────────── DOM 顶栏 ───────────────────────── */

export const HudBar: React.FC<{
  chapter: string;
  index: number;
  total: number;
  time: string;
  coord: string;
}> = ({chapter, index, total, time, coord}) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: 0,
      width: W,
      height: 92,
      padding: "18px 40px 0",
      boxSizing: "border-box",
      display: "flex",
      alignItems: "flex-start",
      gap: 28,
      fontFamily: MONO,
      color: PAL.ink,
      pointerEvents: "none",
    }}
  >
    <div style={{display: "flex", alignItems: "center", gap: 10}}>
      <span
        style={{
          width: 6,
          height: 6,
          background: PAL.warm,
          boxShadow: `0 0 10px ${PAL.warm}`,
          animation: "led 2.4s ease-in-out infinite",
        }}
      />
      <span style={{fontSize: 11, letterSpacing: 3, opacity: 0.6}}>SYS.ONLINE</span>
    </div>
    <div style={{fontSize: 12, letterSpacing: 3, opacity: 0.85}}>{chapter}</div>
    <div style={{flex: 1}} />
    <div style={{fontSize: 11, letterSpacing: 2, opacity: 0.55}}>{coord}</div>
    <div style={{fontSize: 11, letterSpacing: 2, opacity: 0.55}}>
      {String(index).padStart(2, "0")}/{String(total).padStart(2, "0")}
    </div>
    <div style={{fontSize: 11, letterSpacing: 2, opacity: 0.55}}>{time}</div>
  </div>
);

export const HazardStrip: React.FC<{top?: boolean}> = ({top}) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      [top ? "top" : "bottom"]: 0,
      height: 5,
      opacity: 0.6,
      background: `repeating-linear-gradient(-45deg, ${PAL.warm} 0 8px, transparent 8px 18px)`,
      pointerEvents: "none",
    }}
  />
);

export const Caption: React.FC<{text: string; total: number}> = ({text, total}) => {
  const frame = useCurrentFrame();
  const op = Math.min(1, frame / 7, (total - frame) / 7);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        bottom: 26,
        width: W,
        height: 96,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: Math.max(0, op),
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          maxWidth: 1500,
          padding: "12px 26px",
          background: "rgba(10,10,11,.82)",
          borderLeft: `3px solid ${PAL.warm}`,
          fontFamily: FONT_UI,
          fontSize: 31,
          lineHeight: 1.45,
          color: "#f4f1e6",
          letterSpacing: 0.4,
        }}
      >
        {text}
      </div>
    </div>
  );
};
