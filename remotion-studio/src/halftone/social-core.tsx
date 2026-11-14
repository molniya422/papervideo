import React from "react";
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from "remotion";
import {PAL, W, H} from "./core";

/* 社媒版调色：黑位抬到深蓝灰，黄=结构，红=当前动作 */
export const S = {
  bg: "#0b1220",
  bgDeep: "#081018",
  panel: "#101a2c",
  ink: "#ffd21e",
  warm: "#ff3d00",
  text: "#f4f1e6",
  muted: "#9fb0cc",
  dim: "#42506b",
  mint: "#5eead4",
  blue: "#4ea8ff",
  purple: "#a78bfa",
  green: "#34d399",
};

export const C_MINT = S.mint;
export const C_DIM = S.dim;

export const SFONT = '"Noto Sans SC", "Microsoft YaHei", "PingFang SC", system-ui, sans-serif';
export const SMONO = '"JetBrains Mono", "Cascadia Code", Consolas, monospace';

export const sClamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const sEase = (v: number) => {
  const t = sClamp01(v);
  return t * t * (3 - 2 * t);
};
export const sRnd = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export const sLine = (
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  w: number, color: string, alpha = 0.85,
) => {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
};

export const sDot = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha = 1) => {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

/** 大字 + 发光描边（黑位抬亮后保证可读） */
export const glowText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
  o: {alpha?: number; weight?: number; font?: string; glow?: string; align?: CanvasTextAlign} = {},
) => {
  const {alpha = 1, weight = 900, font = SFONT, glow = "rgba(255,61,0,.55)", align = "left"} = o;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.shadowColor = glow;
  ctx.shadowBlur = 22;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
  ctx.restore();
};

/* ───────────── 画布尺寸 ───────────── */

export const LAND = {w: 1920, h: 1080};
export const VERT = {w: 1080, h: 1920};

/** 世界坐标 1920×1080 → 画布。竖版时缩放 0.56 并上移，底部留给大字幕 */
export function worldTransform(ctx: CanvasRenderingContext2D, vertical: boolean, cam: {x: number; y: number; s: number}) {
  if (!vertical) {
    ctx.translate(W / 2, H / 2);
    ctx.scale(cam.s, cam.s);
    ctx.translate(-cam.x, -cam.y);
  } else {
    // 竖版无法平移补偿，机位缩放封顶保证最宽内容（k4 节点+标签 1886）不出画
    const s = 0.64 * Math.min(cam.s, 0.9);
    ctx.translate(VERT.w / 2, 830);
    ctx.scale(s, s);
    ctx.translate(-960, -540);
  }
}


