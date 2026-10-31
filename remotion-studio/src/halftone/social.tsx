import React from "react";
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {PAL, W, H, GAP, MONO, paintDots, textDots, gridDots, type Dot} from "./core";
import {plate, gauge, isoBox, hazardBar, ringTicks, gearDots} from "./mech";
import {camAt, type Cue} from "./camera";
import {SHOTS, type Shot} from "./social-timeline.generated";
import {S, SFONT, SMONO, sClamp01, sEase, sLine, sDot, sRnd, glowText, C_MINT, C_DIM, worldTransform} from "./social-core";

/* ───────── 社媒版时间轴：钩子停留 +2s、结论卡停留 +5s ───────── */
const HOLDS: Record<string, number> = {k1: 36, k8: 100};
const SHOTS2 = SHOTS.map((s) => ({...s, frames: s.frames + (HOLDS[s.id] ?? 0)}));
const STARTS: number[] = (() => {
  const arr: number[] = [];
  let acc = 0;
  for (const s of SHOTS2) {
    arr.push(acc);
    acc += s.frames;
  }
  return arr;
})();
const TOTAL = SHOTS2.reduce((a, b) => a + b.frames, 0);

const WORDS = ["The", "cat", "sat", "because", "it", "was"];
const WORD_X = (i: number) => 330 + i * 250;
const SCORES = [0.28, 0.62, 0.86, 0.34, 0.18];
const PLATE_FILL = "rgba(13,22,38,.94)";

/* ───────── 镜头机位：推拉 / 摇移（世界坐标） ───────── */
const CAMS: Cue[][] = [
  [{t: 0, x: 960, y: 520, s: 1.16}, {t: 0.55, x: 960, y: 545, s: 1.0}],
  [{t: 0, x: 850, y: 560, s: 1.1}, {t: 1, x: 1150, y: 560, s: 1.04}],
  [{t: 0, x: 960, y: 540, s: 1.0}, {t: 0.33, x: 640, y: 540, s: 1.1}, {t: 0.62, x: 960, y: 540, s: 1.08}, {t: 1, x: 1300, y: 540, s: 1.02}],
  [{t: 0, x: 480, y: 560, s: 1.12}, {t: 0.45, x: 900, y: 550, s: 1.08}, {t: 0.78, x: 1100, y: 545, s: 1.12}, {t: 1, x: 1000, y: 545, s: 1.04}],
  [{t: 0, x: 760, y: 620, s: 1.04}, {t: 0.55, x: 740, y: 610, s: 1.14}, {t: 1, x: 780, y: 600, s: 1.08}],
  [{t: 0, x: 620, y: 600, s: 1.12}, {t: 0.5, x: 940, y: 580, s: 1.06}, {t: 1, x: 1250, y: 560, s: 0.96}],
  [{t: 0, x: 900, y: 430, s: 1.2}, {t: 0.42, x: 960, y: 450, s: 1.0}, {t: 0.72, x: 960, y: 640, s: 1.04}, {t: 1, x: 960, y: 600, s: 1.0}],
  [{t: 0, x: 960, y: 520, s: 1.09}, {t: 1, x: 960, y: 540, s: 1.0}],
];

/* ───────── 小工具 ───────── */
const NOGLOW = "rgba(0,0,0,0)";

const arc = (
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  bow: number, color: string, alpha: number, w: number,
) => {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(mx - (dy / len) * bow, my + (dx / len) * bow, x2, y2);
  ctx.stroke();
  ctx.restore();
};

const arcPoint = (x1: number, y1: number, x2: number, y2: number, bow: number, u: number) => {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const cx = mx - (dy / len) * bow, cy = my + (dx / len) * bow;
  const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
  return {x: a * x1 + b * cx + c * x2, y: a * y1 + b * cy + c * y2};
};

const bboxOf = (dots: Dot[]) => {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const d of dots) {
    x0 = Math.min(x0, d.x); y0 = Math.min(y0, d.y);
    x1 = Math.max(x1, d.x); y1 = Math.max(y1, d.y);
  }
  return {cx: (x0 + x1) / 2, cy: (y0 + y1) / 2};
};

/** 点阵大字幽灵（背景层） */
const drawGhost = (
  ctx: CanvasRenderingContext2D, text: string,
  cx: number, cy: number, fitW: number,
  alpha: number, warmth: number, f: number,
) => {
  const dots = textDots(text, {fitWidth: fitW, font: SFONT, weight: 900});
  const b = bboxOf(dots);
  ctx.save();
  ctx.translate(cx - b.cx, cy - b.cy);
  paintDots(ctx, dots, {frame: f, warmth, alpha});
  ctx.restore();
};

/* ───────── 背景：点阵场 + 网格 + CRT 扫描 ───────── */
const drawBG = (ctx: CanvasRenderingContext2D, f: number, cw: number, ch: number) => {
  ctx.save();
  ctx.strokeStyle = "rgba(140,190,255,.07)";
  ctx.lineWidth = 1;
  for (let x = 48; x < cw; x += 48) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ch); ctx.stroke();
  }
  for (let y = 48; y < ch; y += 48) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke();
  }
  ctx.restore();
  for (let x = 24; x < cw; x += 48)
    for (let y = 24; y < ch; y += 48)
      sDot(ctx, x, y, 1.4, PAL.ink, 0.05 + 0.05 * sRnd(x * 0.13 + y));
  const sy = ((f * 1.1) % (ch + 300)) - 150;
  ctx.save();
  ctx.globalAlpha = 0.045;
  ctx.fillStyle = C_MINT;
  ctx.fillRect(0, sy, cw, 90);
  ctx.restore();
};

/* ───────── HUD 边框（屏幕空间，不随机位） ───────── */
const drawChrome = (
  ctx: CanvasRenderingContext2D, f: number,
  shot: Shot, index: number, frame: number, cw: number, ch: number,
) => {
  const m = 24, L = 40;
  // 四角装甲角标
  ctx.save();
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.55;
  [[m, m, 1, 1], [cw - m, m, -1, 1], [m, ch - m, 1, -1], [cw - m, ch - m, -1, -1]].forEach(([x, y, sx, sy]) => {
    ctx.beginPath();
    ctx.moveTo(x + sx * L, y); ctx.lineTo(x, y); ctx.lineTo(x, y + sy * L);
    ctx.stroke();
  });
  ctx.restore();
  // 左上：REC + 频道
  if (Math.sin(f * 0.21) > -0.2) sDot(ctx, m + 22, m + 22, 4, PAL.warm, 0.9);
  glowText(ctx, "PAPERVIDEO // ATTENTION · EP01", m + 30, m + 26, 16, S.muted, {font: SMONO, alpha: 0.8, weight: 600, glow: NOGLOW});
  // 右上：章节代号 + 帧计数
  glowText(ctx, `SEC 0${index + 1} · ${shot.kicker}`, cw - m - 12, m + 26, 17, S.muted, {font: SFONT, align: "right", alpha: 0.85, weight: 700, glow: NOGLOW});
  glowText(ctx, `F ${String(Math.floor(frame)).padStart(4, "0")}`, cw - m - 12, m + 48, 13, C_DIM, {font: SMONO, align: "right", alpha: 0.9, weight: 500, glow: NOGLOW});
  // 底部危险条纹 + 左侧标尺
  hazardBar(ctx, m + L, ch - m - 5, cw - 2 * (m + L), 5, {alpha: 0.4});
  for (let y = m + 64; y < ch - m - 40; y += 44) {
    const long = ((y / 44) | 0) % 4 === 0;
    sLine(ctx, m + 2, y, m + (long ? 16 : 8), y, 1.4, PAL.ink, long ? 0.4 : 0.22);
  }
};

/* ───────── 机械快门转场（屏幕空间） ───────── */
const SHUTTER = 9;
const drawShutter = (
  ctx: CanvasRenderingContext2D, cover: number, label: string, cw: number, ch: number,
) => {
  if (cover <= 0.001) return;
  const e = sEase(sClamp01(cover));
  const half = (ch / 2) * e;
  ctx.save();
  ctx.fillStyle = "#0a1322";
  ctx.fillRect(0, 0, cw, half);
  ctx.fillRect(0, ch - half, cw, half);
  if (half > 16) {
    hazardBar(ctx, 0, half - 12, cw, 12, {alpha: 0.85});
    hazardBar(ctx, 0, ch - half, cw, 12, {alpha: 0.85});
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, half - 20); ctx.lineTo(cw, half - 20);
    ctx.moveTo(0, ch - half + 20); ctx.lineTo(cw, ch - half + 20);
    ctx.stroke();
  }
  ctx.restore();
  if (e > 0.45)
    glowText(ctx, label, cw / 2, ch / 2 + 8, 30, PAL.ink, {align: "center", font: SFONT, weight: 700, alpha: sClamp01((e - 0.45) / 0.2), glow: NOGLOW});
};

/* ════════ k1 · 钩子：注意力全连接 + 幽灵大字 ════════ */
const drawK1 = (ctx: CanvasRenderingContext2D, f: number) => {
  const n = WORDS.length;
  drawGhost(ctx, "为什么", 960, 460, 1000, 0.09 + 0.045 * (0.5 + 0.5 * Math.sin(f * 0.05)), 0.12, f);
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const bow = ((i + j) % 2 ? 1 : -1) * (70 + 60 * sRnd(i * 7 + j * 3));
      arc(ctx, WORD_X(i), 560, WORD_X(j), 560, bow, C_MINT, 0.16 + 0.3 * sRnd(i * 7 + j), 1.6);
    }
  // 五条因果脉冲沿线流动
  for (let p = 0; p < 5; p++) {
    const i = Math.floor(sRnd(p * 11 + 2) * (n - 1));
    const j = i + 1 + Math.floor(sRnd(p * 13 + 1) * (n - i - 1));
    const bow = ((i + j) % 2 ? 1 : -1) * (70 + 60 * sRnd(i * 7 + j * 3));
    const u = (f * 0.012 + sRnd(p * 17) * 3) % 1;
    const pt = arcPoint(WORD_X(i), 560, WORD_X(j), 560, bow, u);
    sDot(ctx, pt.x, pt.y, 5, PAL.warm, 0.9);
  }
  WORDS.forEach((w, i) => {
    const hot = i === 4;
    plate(ctx, WORD_X(i) - 92, 512, 184, 96, {
      alpha: hot ? 1 : 0.82, fill: PLATE_FILL,
      stroke: hot ? PAL.warm : PAL.ink, line: hot ? 2.6 : 1.5,
    });
    if (hot) hazardBar(ctx, WORD_X(i) - 92, 512, 184, 8, {alpha: 0.9});
    ctx.save();
    ctx.font = `700 30px ${SFONT}`;
    ctx.fillStyle = hot ? "#ffb38a" : "#dfe9ff";
    ctx.textAlign = "center";
    ctx.fillText(w, WORD_X(i), 574);
    ctx.restore();
    if (hot) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = PAL.warm;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(WORD_X(i), 560, 116 + 6 * Math.sin(f * 0.15), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  });
};

/* ════════ k2 · 例句：词 → 等距向量塔 ════════ */
const drawK2 = (ctx: CanvasRenderingContext2D, f: number) => {
  WORDS.forEach((w, i) => {
    const x = WORD_X(i);
    const hot = i === 4;
    const a = hot ? 1 : 0.35;
    plate(ctx, x - 92, 300, 184, 80, {alpha: a, fill: PLATE_FILL, stroke: hot ? PAL.warm : PAL.ink, line: hot ? 2.4 : 1.4});
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `700 28px ${SFONT}`;
    ctx.fillStyle = "#dfe9ff";
    ctx.textAlign = "center";
    ctx.fillText(w, x, 350);
    ctx.restore();
    sLine(ctx, x, 386, x, 446, 1.4, PAL.ink, 0.4 * a);
    const dots = gridDots({
      x: x - 18, y: 470, w: 36, h: 330, cols: 3, rows: 9,
      value: (r, c) => 0.35 + 0.65 * sRnd(i * 9 + r * 3 + c),
    });
    paintDots(ctx, dots, {frame: f, warmth: hot ? 0.88 : 0.18, alpha: a});
    isoBox(ctx, x, 640, 76, 374, 9, {alpha: 0.25 + 0.5 * a, color: hot ? PAL.warm : PAL.ink});
  });
  plate(ctx, 1150, 842, 268, 50, {alpha: 0.96, fill: "rgba(30,10,6,.95)", stroke: PAL.warm});
  glowText(ctx, "it 发出提问", 1284, 876, 26, PAL.warm, {align: "center", weight: 800, glow: NOGLOW});
  sLine(ctx, 1284, 840, 1330, 824, 2, PAL.warm, 0.8);
  glowText(ctx, "EMBED · d_model 512", 1640, 250, 17, S.muted, {align: "right", font: SMONO, alpha: 0.7, weight: 600, glow: NOGLOW});
};

/* ════════ k3 · Q K V 装甲舱（其他压暗） ════════ */
const MODS = [
  {x: 420, name: "Q", en: "QUERY", zh: "提问", color: PAL.warm},
  {x: 960, name: "K", en: "KEY", zh: "挂标签", color: PAL.ink},
  {x: 1500, name: "V", en: "VALUE", zh: "带内容", color: C_MINT},
];

const drawK3 = (ctx: CanvasRenderingContext2D, f: number, t: number) => {
  const step = Math.min(2, Math.floor(t * 3));
  WORDS.forEach((w, i) => {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = "#dfe9ff";
    ctx.font = `700 26px ${SFONT}`;
    ctx.textAlign = "center";
    ctx.fillText(w, WORD_X(i), 250);
    ctx.restore();
  });
  MODS.forEach((m, i) => {
    const on = i <= step;
    const pop = sEase(sClamp01((t * 3 - i) / 0.6));
    const a = on ? 0.95 : 0.34;
    const g = 0.72 + 0.28 * pop;
    isoBox(ctx, m.x, 510, 300 * g, 260 * g, 26 * pop, {alpha: a, color: m.color, fill: on && i === step && pop > 0.5});
    if (on && pop > 0.3)
      paintDots(ctx, gearDots(m.x, 510, 62, 10, f * 0.02 * (i % 2 ? -1 : 1) + i, 2), {frame: f, warmth: i === 2 ? 0.15 : 0.5, alpha: 0.16 * a});
    glowText(ctx, m.name, m.x, 500 + 40 * (1 - pop), 84, m.color, {alpha: a, align: "center", glow: `${m.color}88`});
    glowText(ctx, m.zh, m.x, 648 + 30 * (1 - pop), 26, "#c3d8ea", {alpha: a, align: "center", weight: 700, glow: NOGLOW});
    glowText(ctx, m.en, m.x, 348 - 20 * (1 - pop), 16, S.muted, {alpha: 0.7, align: "center", font: SMONO, weight: 600, glow: NOGLOW});
    if (i < 2 && i < step) {
      sLine(ctx, m.x + 150, 510, MODS[i + 1].x - 150, 510, 1.6, PAL.ink, 0.4);
      const u = (f * 0.015 + i * 0.5) % 1;
      sDot(ctx, m.x + 150 + (MODS[i + 1].x - m.x - 300) * u, 510, 4.5, PAL.warm, 0.8);
    }
  });
};

/* ════════ k4 · 点积：仪表盘 Q → K 节点 ════════ */
const drawK4 = (ctx: CanvasRenderingContext2D, f: number, t: number) => {
  const qx = 380, qy = 560;
  const ks = SCORES.map((s, i) => ({x: 1180 + i * 170, y: 300 + i * 130, s}));
  const gv = 15 + 71 * sEase(sClamp01((t - 0.05) / 0.3));
  gauge(ctx, qx, qy, 84, gv, {alpha: 0.96, label: "Q · it", max: 100});
  ringTicks(ctx, qx, qy, 108, 24, f * 0.004, {alpha: 0.28});
  ks.forEach((k, i) => {
    const reveal = sClamp01((t - 0.1 - i * 0.1) / 0.25);
    if (reveal <= 0) return;
    const hot = k.s > 0.7;
    ctx.save();
    if (!hot) ctx.setLineDash([9, 7]);
    sLine(ctx, qx + 26, qy, qx + 26 + (k.x - qx - 46) * reveal, qy + (k.y - qy) * reveal,
      hot ? 5 : 1.8, hot ? PAL.warm : PAL.ink, hot ? 0.95 : 0.5);
    ctx.restore();
    sDot(ctx, k.x, k.y, 10, hot ? PAL.warm : PAL.ink, reveal);
    if (hot) ringTicks(ctx, k.x, k.y, 27, 12, f * 0.01, {alpha: reveal * 0.8, color: PAL.warm, len: 8});
    const last = i === ks.length - 1;
    glowText(ctx, (k.s * 100).toFixed(0), last ? k.x - 26 : k.x + 26, k.y + 8, 22, hot ? PAL.warm : PAL.ink,
      {alpha: reveal, weight: 700, font: SMONO, glow: NOGLOW, align: last ? "right" : "left"});
  });
  // 热点线上的流动脉冲 + 标签装甲片
  const hotK = ks[2];
  if (t > 0.3) {
    const u = (f * 0.02) % 1;
    sDot(ctx, qx + 26 + (hotK.x - qx - 46) * u, qy + (hotK.y - qy) * u, 6, "#ffd9c9", 0.9);
  }
  const hotA = sClamp01((t - 0.55) / 0.2);
  if (hotA > 0) {
    plate(ctx, hotK.x - 128, hotK.y - 112, 200, 44, {alpha: hotA, fill: "rgba(30,10,6,.94)", stroke: PAL.warm});
    glowText(ctx, "最强：cat", hotK.x - 28, hotK.y - 82, 24, PAL.warm, {align: "center", alpha: hotA, weight: 800, glow: NOGLOW});
  }
  glowText(ctx, "score = Q · Kᵀ", 300, 215, 20, S.muted, {font: SMONO, alpha: 0.75, weight: 600, glow: NOGLOW});
};

/* ════════ k5 · softmax：点阵柱 morph ════════ */
const drawK5 = (ctx: CanvasRenderingContext2D, f: number, t: number) => {
  const ex = SCORES.map((v) => Math.exp(v * 3));
  const sum = ex.reduce((a, b) => a + b, 0);
  const probs = ex.map((e) => e / sum);
  const morph = sEase(sClamp01((t - 0.35) / 0.4));
  sLine(ctx, 280, 862, 1280, 862, 3, PAL.ink, 0.6);
  for (let x = 280; x <= 1280; x += 50) sLine(ctx, x, 862, x, 871, 1.4, PAL.ink, 0.4);
  SCORES.forEach((v, i) => {
    const x = 320 + i * 150;
    const hRaw = v * 300;
    const hSoft = probs[i] * 620;
    if (morph < 1) {
      const dRaw = gridDots({x: x - 23, y: 858 - hRaw, w: 46, h: hRaw, cols: 3, rows: Math.max(2, Math.round(hRaw / 26)), value: () => 0.75});
      paintDots(ctx, dRaw, {frame: f, warmth: 0.2, alpha: 0.3 * (1 - morph)});
    }
    const hot = probs[i] > 0.25;
    if (morph > 0) {
      const hh = Math.max(3, hSoft * morph);
      const dSoft = gridDots({x: x - 23, y: 858 - hh, w: 46, h: hh, cols: 3, rows: Math.max(2, Math.round(hh / 24)), value: () => 0.95});
      paintDots(ctx, dSoft, {frame: f, warmth: hot ? 0.92 : 0.3, alpha: morph});
    }
    glowText(ctx, (probs[i] * 100).toFixed(0) + "%", x, 900, 20, hot ? PAL.warm : S.muted, {alpha: morph, align: "center", weight: 700, font: SMONO, glow: NOGLOW});
  });
  plate(ctx, 1310, 816, 130, 52, {alpha: morph, fill: PLATE_FILL, stroke: C_MINT});
  glowText(ctx, "Σ = 1", 1375, 852, 28, C_MINT, {align: "center", alpha: morph, weight: 800, glow: NOGLOW});
  glowText(ctx, "softmax(QKᵀ/√d)", 320, 300, 20, S.muted, {font: SMONO, alpha: 0.75, weight: 600, glow: NOGLOW});
  // 图例：分数 → 权重
  plate(ctx, 300, 396, 128, 46, {alpha: 0.8, fill: PLATE_FILL, stroke: PAL.ink, line: 1.4});
  glowText(ctx, "分数", 364, 428, 24, PAL.ink, {align: "center", weight: 800, glow: NOGLOW});
  sLine(ctx, 438, 419, 502, 419, 2, PAL.ink, 0.5);
  sDot(ctx, 470 + 30 * Math.sin(f * 0.06), 419, 4.5, PAL.warm, 0.85);
  plate(ctx, 512, 396, 128, 46, {alpha: 0.8, fill: "rgba(30,10,6,.92)", stroke: PAL.warm, line: 1.4});
  glowText(ctx, "权重", 576, 428, 24, PAL.warm, {align: "center", weight: 800, glow: NOGLOW});
};

/* ════════ k6 · 加权求和 → 输出向量舱 ════════ */
const drawK6 = (ctx: CanvasRenderingContext2D, f: number, t: number) => {
  const ex = SCORES.map((v) => Math.exp(v * 3));
  const sum = ex.reduce((a, b) => a + b, 0);
  const probs = ex.map((e) => e / sum);
  const morph = sEase(sClamp01(t / 0.5));
  sLine(ctx, 260, 822, 800, 822, 2.4, PAL.ink, 0.5);
  probs.forEach((p, i) => {
    const x = 300 + i * 90;
    const hh = Math.max(3, p * 640);
    const d = gridDots({x: x - 13, y: 818 - hh, w: 26, h: hh, cols: 2, rows: Math.max(2, Math.round(hh / 24)), value: () => 0.9});
    paintDots(ctx, d, {frame: f, warmth: p > 0.25 ? 0.92 : 0.3, alpha: 0.9});
  });
  glowText(ctx, "weights", 300, 872, 20, S.muted, {font: SMONO, alpha: 0.8, weight: 600, glow: NOGLOW});
  for (let r = 0; r < 3; r++) {
    const x = 840 + r * 64;
    const hotCol = r === 1;
    isoBox(ctx, x, 520, 54, 250, 8, {alpha: 0.3 + 0.3 * (hotCol ? 1 : 0), color: hotCol ? PAL.warm : PAL.ink});
    if (hotCol && t > 0.35) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = PAL.warm;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, 520, 44 + 5 * Math.sin(f * 0.18), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    for (let i = 0; i < 8; i++) {
      const v = 0.35 + 0.5 * sRnd(r * 9 + i);
      sDot(ctx, x, 420 + i * 27, 4.4, hotCol ? PAL.warm : PAL.ink, (0.35 + 0.5 * v) * morph);
    }
    glowText(ctx, `V${r + 1}·w${r + 1}`, x, 686, 17, hotCol ? "#ffb38a" : S.muted, {align: "center", font: SMONO, alpha: 0.75 * morph, weight: 600, glow: NOGLOW});
  }
  const t2 = sClamp01((t - 0.45) / 0.4);
  for (let i = 0; i < 24; i++) {
    const p = sClamp01(t2 * 1.3 - sRnd(i) * 0.4);
    if (p <= 0 || p >= 1) continue;
    const x = 1000 + (1430 - 1000) * sEase(p);
    const y = 520 - Math.sin(p * Math.PI) * 80 + (sRnd(i + 40) - 0.5) * 44;
    sLine(ctx, x - 26, y, x, y, 2, i % 2 ? S.green : "#d8ffe9", 0.5);
    sDot(ctx, x, y, 5.5, i % 2 ? S.green : "#d8ffe9", 0.9);
  }
  const oa = sClamp01((t - 0.5) / 0.3);
  isoBox(ctx, 1480, 520, 130, 310, 20, {alpha: oa, color: S.green});
  ctx.save();
  ctx.globalAlpha = oa * 0.9;
  ctx.fillStyle = S.green;
  for (let i = 0; i < 8; i++) ctx.fillRect(1436, 396 + i * 30, 88 * (0.4 + 0.5 * sRnd(i + 3)), 14);
  ctx.restore();
  glowText(ctx, "新表示", 1480, 730, 30, S.green, {align: "center", alpha: sClamp01((t - 0.6) / 0.25), weight: 800, glow: NOGLOW});
  glowText(ctx, "out = Σ wᵢ·Vᵢ", 620, 300, 20, S.muted, {font: SMONO, alpha: 0.7, weight: 600, glow: NOGLOW});
};

/* ════════ k7 · 多头装甲板 + 位置波形 ════════ */
const MP = [
  (i: number, j: number) => (i === j ? 0.95 : 0.06),
  (i: number, j: number) => (i === 0 ? 0.85 : 0.08),
  (i: number, j: number) => (Math.abs(i - j) <= 1 ? 0.8 : 0.05),
  (i: number, j: number) => (i >= j ? 0.7 : 0.04),
  (i: number, j: number) => (i + j === 4 ? 0.9 : 0.05),
  (i: number, j: number) => (j === 2 ? 0.8 : 0.06),
  (i: number, j: number) => (Math.abs(i - j) === 2 ? 0.7 : 0.06),
  (i: number, j: number) => (Math.abs(i - 2) + Math.abs(j - 2) < 2 ? 0.85 : 0.05),
];

const HEAD_TAGS: Record<number, string> = {1: "只看首词", 2: "看相邻", 3: "只看前文"};

const drawK7 = (ctx: CanvasRenderingContext2D, f: number, t: number) => {
  for (let k = 0; k < 8; k++) {
    const pop = sEase(sClamp01(t * 2 - k * 0.12));
    if (pop <= 0) continue;
    const x = 160 + k * 210, y = 360;
    const a = 0.92 * pop;
    plate(ctx, x - 78, y - 78, 156, 156, {alpha: a, fill: PLATE_FILL, stroke: PAL.ink, line: 1.5});
    const dots: Dot[] = [];
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 5; c++) {
        const v = MP[k](r, c);
        if (v < 0.2) continue;
        dots.push({x: x - 62 + c * 31, y: y - 62 + r * 31, r: 4 + v * 8});
      }
    paintDots(ctx, dots, {frame: f, warmth: k % 2 ? 0.22 : 0.88, alpha: a});
    glowText(ctx, "H" + (k + 1), x, y + 110, 18, S.muted, {alpha: 0.7 * pop, align: "center", weight: 700, font: SMONO, glow: NOGLOW});
    const tag = HEAD_TAGS[k];
    if (tag) {
      ctx.save();
      ctx.globalAlpha = 0.85 * pop * sClamp01((t - 0.45) / 0.25);
      ctx.fillStyle = C_MINT;
      ctx.font = `700 19px ${SFONT}`;
      ctx.textAlign = "center";
      ctx.fillText(tag, x, y + 138);
      ctx.restore();
    }
  }
  for (let r = 0; r < 3; r++) {
    const pts: Dot[] = [];
    for (let i = 0; i <= 90; i++) {
      const x = 180 + i * 17.5;
      const freq = Math.pow(10000, -(r / 3)) * 0.9;
      pts.push({x, y: 700 + r * 90 + Math.sin((x - 180) * 0.6 * freq + f * 0.03) * 26, r: 2.6});
    }
    paintDots(ctx, pts, {frame: f, warmth: 0.15 + r * 0.18, alpha: sClamp01((t - 0.45) / 0.3)});
  }
  glowText(ctx, "sin / cos · 波长 2π → 10000·2π", 180, 640, 24, C_MINT, {alpha: sClamp01((t - 0.5) / 0.3), weight: 700, glow: NOGLOW});
};

/* ════════ k8 · 结论装甲卡 ════════ */
const drawK8 = (ctx: CanvasRenderingContext2D, f: number) => {
  for (let i = 0; i < 90; i++)
    sDot(ctx, sRnd(i * 3.3) * W, sRnd(i * 7.7) * H, 1.6 + sRnd(i) * 2, PAL.ink, 0.12);
  const pr = (f * 1.6) % 230;
  ctx.save();
  ctx.globalAlpha = 0.25 * (1 - pr / 230);
  ctx.strokeStyle = PAL.warm;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(W / 2, 440, 150 + pr, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  plate(ctx, 545, 320, 830, 130, {alpha: 1, fill: "rgba(10,16,28,.95)", stroke: PAL.warm, line: 2.2});
  hazardBar(ctx, 545, 452, 830, 8, {alpha: 0.8});
  glowText(ctx, "Attention 的核心", W / 2, 408, 62, "#ffffff", {align: "center", glow: "rgba(255,61,0,.6)"});
  glowText(ctx, "根据上下文，重新计算每个词的重要性", W / 2, 575, 52, PAL.ink, {align: "center", weight: 800});
  glowText(ctx, "下一集：Multi-Head Attention", W / 2, 700, 34, C_MINT, {align: "center", weight: 700});
  glowText(ctx, "收藏 · 之后复习 Transformer", W / 2, 775, 26, S.muted, {align: "center", weight: 500, glow: NOGLOW});
  glowText(ctx, "@PaperVideo · EP01", W / 2, 855, 20, C_DIM, {align: "center", weight: 500, font: SMONO, glow: NOGLOW});
};

/* ═════════════ 场景分发 ═════════════ */
const DRAW: ((ctx: CanvasRenderingContext2D, f: number, t: number) => void)[] = [
  drawK1, drawK2, drawK3, drawK4, drawK5, drawK6, drawK7, drawK8,
];

/* ═════════════ 大字幕（底部安全区） ═════════════ */
const BigCaption: React.FC<{text: string; total: number; accent: string; bottom: number}> = ({text, total, accent, bottom}) => {
  const frame = useCurrentFrame();
  const op = Math.min(1, frame / 6, (total - frame) / 6);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        bottom,
        width: "100%",
        display: "flex",
        justifyContent: "center",
        opacity: Math.max(0, op),
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          maxWidth: 1500,
          padding: "16px 34px",
          background: "rgba(8,16,24,.78)",
          borderLeft: `5px solid ${accent}`,
          fontFamily: SFONT,
          fontSize: 42,
          lineHeight: 1.4,
          color: "#f4f1e6",
          letterSpacing: 0.5,
          textShadow: "0 2px 14px rgba(0,0,0,.9)",
        }}
      >
        {text}
      </div>
    </div>
  );
};

/* ═════════════ 主合成 ═════════════ */

const ShotShell: React.FC<{shot: Shot; index: number; vertical: boolean}> = ({shot, index, vertical}) => {
  const frame = useCurrentFrame();
  const draw = DRAW[index];
  return (
    <AbsoluteFill style={{background: S.bg}}>
      <CanvasLayer vertical={vertical} shot={shot} index={index} frame={frame} draw={draw} />
      {shot.sentences.map((s, k) => (
        <Sequence key={k} from={s.start} durationInFrames={s.frames} name={`${shot.id}-${k + 1}`}>
          <Audio src={staticFile(`audio5/${s.audio}.mp3`)} volume={1} />
          <BigCaption text={s.text} total={s.frames} accent={shot.accent} bottom={vertical ? 260 : 70} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

const CanvasLayer: React.FC<{
  vertical: boolean;
  shot: Shot;
  index: number;
  frame: number;
  draw: (ctx: CanvasRenderingContext2D, f: number, t: number) => void;
}> = ({vertical, shot, index, frame, draw}) => {
  const ref = React.useRef<HTMLCanvasElement | null>(null);
  const t = frame / shot.frames;

  React.useLayoutEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const cw = cv.width, ch = cv.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = S.bg;
    ctx.fillRect(0, 0, cw, ch);
    drawBG(ctx, frame, cw, ch);

    ctx.save();
    worldTransform(ctx, vertical, camAt(CAMS[index] ?? [], t));
    draw(ctx, Math.floor(frame), t);
    ctx.restore();

    drawChrome(ctx, frame, shot, index, frame, cw, ch);
    const cover = frame < SHUTTER ? 1 - frame / SHUTTER
      : frame > shot.frames - SHUTTER ? (frame - (shot.frames - SHUTTER)) / SHUTTER : 0;
    drawShutter(ctx, cover, `▸ SEC 0${index + 1} · ${shot.kicker}`, cw, ch);
  }, [frame, draw, vertical, shot, index, t]);

  return <canvas ref={ref} width={vertical ? 1080 : 1920} height={vertical ? 1920 : 1080} style={{width: "100%", height: "100%"}} />;
};

export const SocialAttention: React.FC<{vertical?: boolean}> = ({vertical}) => {
  return (
    <AbsoluteFill style={{background: S.bg}}>
      <Audio src={staticFile("audio3/bgm.wav")} volume={0.12} />
      {SHOTS2.map((shot, i) => (
        <Sequence key={shot.id} from={STARTS[i]} durationInFrames={shot.frames} name={`${shot.id} ${shot.chapter}`}>
          <ShotShell shot={shot} index={i} vertical={!!vertical} />
        </Sequence>
      ))}
      <StepTitleGlobal vertical={!!vertical} />
    </AbsoluteFill>
  );
};

/** 步骤大标题：常驻顶层，随章节切换（k8 结尾卡自带标题，跳过） */
const StepTitleGlobal: React.FC<{vertical: boolean}> = ({vertical}) => {
  const frame = useCurrentFrame();
  let acc = 0;
  let cur = SHOTS2[0];
  let curIdx = 0;
  let local = frame;
  for (let i = 0; i < SHOTS2.length; i++) {
    if (frame >= STARTS[i]) {
      cur = SHOTS2[i];
      curIdx = i;
      local = frame - STARTS[i];
    }
  }
  if (cur.id === "k8") return null;
  const op = Math.min(1, local / 10, (cur.frames - local) / 10);
  return (
    <AbsoluteFill style={{pointerEvents: "none"}}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: vertical ? 110 : 70,
          textAlign: "center",
          opacity: Math.max(0, Math.min(1, op)),
        }}
      >
        <div style={{fontFamily: SMONO, fontSize: vertical ? 18 : 19, letterSpacing: 5, color: cur.accent, opacity: 0.9, marginBottom: 8, fontWeight: 700}}>
          {`SEC 0${curIdx + 1} · ${cur.kicker}`}
        </div>
        <div
          style={{
            fontFamily: SFONT,
            fontSize: vertical ? 52 : 62,
            fontWeight: 900,
            color: "#fff",
            textShadow: `0 0 26px ${cur.accent}aa, 0 4px 30px rgba(0,0,0,.9)`,
            letterSpacing: 1,
          }}
        >
          {cur.title}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const SOCIAL_FRAMES = TOTAL;
