import React from "react";
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from "remotion";
import {W, H, MONO, FONT_UI, FONT_HEAVY} from "./core";
import {camAt, type Cue} from "./camera";
import {SHOTS, TOTAL_FRAMES} from "./ep03-timeline.generated";
import {sClamp01, sEase, sRnd} from "./social-core";

/* ═════════ EP03 · NEON ORBIT（完整讲解 · 21 章 · 电影运镜最大化） ═════════
   视差星场（3 层）/ 每章 7 机位 cue / 辉光公式逐符号装配 / 粒子流 / 真曲线。 */

const C = {
  bg0: "#070a1a", bg1: "#0a0e22", bg2: "#101636",
  ink: "#f2f6ff", cyan: "#46e6ff", violet: "#8b5cf6",
  amber: "#ffc247", red: "#ff5470", dim: "#7c88b8",
  panel: "rgba(16,22,54,.72)", panelStroke: "rgba(70,230,255,.55)",
};
const NOGLOW = "rgba(0,0,0,0)";

type ShotT = {id: string; title: string; kicker: string; accent: string};

/* ───────── 文字/图形小件（辉光允许） ───────── */
function glow(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number,
              color: string, o: {align?: CanvasTextAlign; glow?: string; weight?: number; font?: string; alpha?: number} = {}) {
  const {align = "left", glow = `rgba(70,230,255,.45)`, weight = 900, font = FONT_UI, alpha = 1} = o;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.shadowColor = glow;
  ctx.shadowBlur = size * 0.35;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
               o: {alpha?: number; stroke?: string; lw?: number; glow?: string} = {}) {
  const {alpha = 1, stroke = C.panelStroke, lw = 2, glow = "rgba(70,230,255,.35)"} = o;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = glow;
  ctx.shadowBlur = 18;
  ctx.fillStyle = C.panel;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lw;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

function orb(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha = 1, ringGlow = 26) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.6);
  g.addColorStop(0, color);
  g.addColorStop(0.55, color + "66");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function neonLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number,
                  color: string, w: number, alpha: number, glow = 12) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.restore();
}

function flowDots(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number,
                  f: number, color: string, n = 3, speed = 0.02) {
  for (let i = 0; i < n; i++) {
    const u = (f * speed + i / n) % 1;
    const x = x1 + (x2 - x1) * u, y = y1 + (y2 - y1) * u;
    ctx.save();
    ctx.globalAlpha = 0.9 * Math.sin(u * Math.PI);
    ctx.fillStyle = color;
    ctx.shadowColor = color; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

/* ───────── 视差星场（3 层） ───────── */
const STARS = (() => {
  const arr: {x: number; y: number; r: number; d: number}[] = [];
  for (let i = 0; i < 220; i++) {
    arr.push({x: sRnd(i * 1.7) * 2600 - 340, y: sRnd(i * 3.1) * 1700 - 310,
              r: 0.6 + sRnd(i * 5.3) * 2.2, d: [0.3, 0.55, 1.0][i % 3]});
  }
  return arr;
})();

function starfield(ctx: CanvasRenderingContext2D, f: number, cam: {x: number; y: number; s: number}) {
  for (const st of STARS) {
    const px = 960 + (st.x + f * 0.12 * st.d - cam.x) * cam.s * st.d;
    const py = 540 + (st.y - cam.y) * cam.s * st.d;
    if (px < -20 || px > W + 20 || py < -20 || py > H + 20) continue;
    ctx.save();
    ctx.globalAlpha = 0.25 + st.d * 0.5;
    ctx.fillStyle = st.d > 0.9 ? C.cyan : C.ink;
    ctx.beginPath(); ctx.arc(px, py, st.r * st.d, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

/* ───────── 章节机位：7 cue 编排 ───────── */
function cuesFor(i: number): Cue[] {
  const shot = SHOTS[i];
  const fx = 960, fy = 520;
  const dir = i % 2 === 0 ? -1 : 1;
  const zoom = 1 + (i % 3) * 0.04;
  return [
    {t: 0.0, x: fx + dir * 280, y: fy + 30, s: 1.55},
    {t: 0.05, x: fx, y: fy, s: 1.0 * zoom},
    {t: 0.25, x: fx - dir * 70, y: fy + 24, s: 1.07 * zoom},
    {t: 0.45, x: fx, y: fy - 14, s: 1.08 * zoom},
    {t: 0.62, x: fx + dir * 60, y: fy + 12, s: 1.05 * zoom},
    {t: 0.82, x: fx, y: fy, s: 1.10 * zoom},
    {t: 1.0, x: fx + dir * 120, y: fy - 30, s: 1.42},
  ];
}
const CAMS = SHOTS.map((_, i) => cuesFor(i));

/* ───────── chrome ───────── */
function chrome(ctx: CanvasRenderingContext2D, f: number, i: number, local: number) {
  const shot = SHOTS[i];
  big(ctx, "EP03 // ATTENTION IS ALL YOU NEED · 完全讲解", 40, 64, 19, C.dim, "left", MONO, 700);
  big(ctx, `SEC ${String(i + 1).padStart(2, "0")}/21 · ${shot.kicker}`, W - 40, 64, 21, shot.accent, "right", MONO, 800);
  // 进度
  ctx.fillStyle = "rgba(70,230,255,.18)";
  ctx.fillRect(0, H - 6, W, 6);
  ctx.fillStyle = C.cyan;
  ctx.fillRect(0, H - 6, W * ((f + 1) / TOTAL_FRAMES), 6);
  // 章节标题（小，左下）
  glow(ctx, `${shot.title}`, 40, H - 28, 24, shot.accent, {glow: "rgba(0,0,0,0)", weight: 800});
  glow(ctx, `F ${String(local).padStart(4, "0")}`, W - 40, H - 28, 18, C.dim, {align: "right", font: MONO, weight: 600, glow: NOGLOW});
  // 章节巨号
  glow(ctx, String(i + 1).padStart(2, "0"), 1870, 950, 360, "rgba(139,92,246,.14)", {align: "right", glow: "rgba(0,0,0,0)"});
  ctx.strokeStyle = "rgba(70,230,255,.2)"; ctx.lineWidth = 1;
  ctx.strokeRect(30, 96, W - 60, H - 156);
}

/* ───────── 文字节拍 ───────── */
function sentIdx(shot: {sentences: {start: number}[]}, f: number) {
  let si = 0;
  for (let i = 0; i < shot.sentences.length; i++) if (f >= shot.sentences[i].start) si = i;
  return si;
}
const pop = (shot: any, f: number, si: number, dur = 16) => sEase(sClamp01((f - shot.sentences[Math.min(si, shot.sentences.length - 1)].start) / dur));
const barP = (f: number, at: number, dur = 14) => sEase(sClamp01((f - at) / dur));

function big(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number,
             color: string, align: CanvasTextAlign = "left", font = MONO, weight = 900) {
  ctx.save();
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/* ═════════ k01 · 冷开场 ═════════ */
function k01(ctx: CanvasRenderingContext2D, f: number, shot: any) {
  const si = sentIdx(shot, f);
  // 8 GPU 网格
  for (let g = 0; g < 8; g++) {
    const p = barP(f, 60 + g * 12, 14);
    if (p <= 0) continue;
    const x = 520 + (g % 4) * 240, y = 300 + Math.floor(g / 4) * 150;
    ctx.save();
    ctx.globalAlpha = p * (0.75 + 0.25 * Math.sin(f * 0.08 + g));
    ctx.fillStyle = C.panel;
    ctx.strokeStyle = B3(g);
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, 180, 100); ctx.strokeRect(x, y, 180, 100);
    ctx.fillStyle = B3(g);
    for (let k = 0; k < 3; k++) ctx.fillRect(x + 24 + k * 50, y + 30, 34, 40);
    big(ctx, `GPU ${g + 1}`, x + 90, y + 88, 18, C.dim, "center", MONO, 600);
    ctx.restore();
  }
  if (si >= 1) {
    const p = pop(shot, f, 1, 20);
    glow(ctx, "28.4 BLEU", 960, 640, 110, C.amber, {align: "center", glow: "rgba(255,194,71,.6)", alpha: p});
    glow(ctx, "前所未见的翻译分数", 960, 720, 32, C.ink, {align: "center", alpha: p, glow: "rgba(0,0,0,0)"});
  }
  if (si >= 2) {
    const p = pop(shot, f, 2, 20);
    glow(ctx, "Attention Is All You Need", 960, 170, 54, C.ink, {align: "center", alpha: p, glow: "rgba(70,230,255,.6)"});
  }
  if (si >= 4) {
    const p = pop(shot, f, 4, 20);
    glow(ctx, "整篇论文 · 一次讲透", 960, 830, 40, C.cyan, {align: "center", alpha: p, glow: "rgba(70,230,255,.6)"});
  }
}
const B3 = (g: number) => [C.cyan, C.violet, C.amber][g % 3];

/* ═════════ k02 · 翻译之困（传送带） ═════════ */
function k02(ctx: CanvasRenderingContext2D, f: number, shot: any) {
  const si = sentIdx(shot, f);
  const WORDS = ["Der", "Zug", "fuhr", "langsam", "durch", "den", "Nachtzug"];
  neonLine(ctx, 240, 620, 1780, 620, C.dim, 3, 0.6, 0);
  WORDS.forEach((wd, i) => {
    const x = 1900 - ((f * 2.4 + i * 240) % 2150);
    if (x < 400) return;
    panel(ctx, x - 70, 560, 140, 60, {alpha: 0.95});
    glow(ctx, wd, x, 600, 26, C.ink, {align: "center", alpha: 0.95, glow: NOGLOW});
  });
  // RNN 漏斗
  ctx.save();
  ctx.strokeStyle = C.red; ctx.lineWidth = 3;
  ctx.shadowColor = C.red; ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.moveTo(220, 470); ctx.lineTo(380, 540); ctx.lineTo(380, 700); ctx.lineTo(220, 770);
  ctx.closePath(); ctx.stroke();
  ctx.restore();
  glow(ctx, "RNN", 300, 640, 44, C.red, {align: "center"});
  // 记忆衰减条
  const memP = pop(shot, f, 3, 16);
  if (memP > 0) {
    WORDS.slice(0, 4).forEach((wd, i) => {
      const enter = 300 + i * 200;
      const age = f - enter;
      if (age < 0) return;
      const a = Math.max(0.12, 1 - age / 300);
      panel(ctx, 480 + i * 160, 760, 130, 70, {alpha: a, stroke: a > 0.5 ? C.cyan : C.dim, glow: NOGLOW});
      glow(ctx, wd, 545 + i * 160, 805, 22, a > 0.5 ? C.ink : C.dim, {align: "center", alpha: a, glow: NOGLOW});
    });
    glow(ctx, "读远了会忘", 1500, 500, 36, C.red, {align: "center", alpha: memP, glow: "rgba(255,84,112,.5)"});
  }
  if (si >= 5) {
    const p = pop(shot, f, 5, 16);
    glow(ctx, "训练无法并行 · 速度卡死规模", 960, 930, 34, C.amber, {align: "center", alpha: p, glow: "rgba(255,194,71,.4)"});
  }
}

/* ═════════ k03 · 2017 宣言 ═════════ */
function k03(ctx: CanvasRenderingContext2D, f: number, shot: any) {
  const si = sentIdx(shot, f);
  panel(ctx, 260, 300, 1400, 220, {stroke: C.cyan, lw: 3});
  glow(ctx, "Attention Is All You Need", 960, 400, 64, C.ink, {align: "center", glow: "rgba(70,230,255,.55)"});
  glow(ctx, "NeurIPS 2017 · Google Brain · 8 位作者", 960, 465, 24, C.dim, {align: "center", glow: NOGLOW});
  // 划掉 RNN / CNN
  const p2 = barP(f, 420, 18);
  if (p2 > 0) {
    const items: [string, string][] = [["循环网络", "RNN"], ["卷积网络", "CNN"]];
    items.forEach(([zh, en], i) => {
      const x = 420 + i * 560;
      panel(ctx, x, 590, 440, 110, {alpha: p2, stroke: C.red});
      glow(ctx, zh, x + 220, 650, 40, C.ink, {align: "center", alpha: p2, glow: NOGLOW});
      ctx.save();
      ctx.globalAlpha = p2;
      ctx.strokeStyle = C.red; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(x + 30, 680); ctx.lineTo(x + 410, 610); ctx.stroke();
      ctx.restore();
      glow(ctx, en + " ✗", x + 220, 740, 22, C.red, {align: "center", alpha: p2, font: MONO, glow: NOGLOW});
    });
  }
  if (si >= 3) {
    const p = pop(shot, f, 3, 20);
    glow(ctx, "只留下注意力", 960, 880, 56, C.cyan, {align: "center", alpha: p, glow: "rgba(70,230,255,.6)"});
    // 轨道环
    ctx.save();
    ctx.globalAlpha = p * 0.5;
    ctx.strokeStyle = C.violet; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(960, 880, 420 + 10 * Math.sin(f * 0.04), 40, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

/* ═════════ k04 · 全景双塔 ═════════ */
function k04(ctx: CanvasRenderingContext2D, f: number, shot: any) {
  const si = sentIdx(shot, f);
  glow(ctx, "ENCODER × 6", 400, 220, 30, C.cyan, {align: "center", glow: "rgba(70,230,255,.5)"});
  glow(ctx, "DECODER × 6", 1520, 220, 30, C.amber, {align: "center", glow: "rgba(255,194,71,.5)"});
  for (let i = 0; i < 6; i++) {
    const p = barP(f, 100 + i * 60, 14);
    if (p <= 0) continue;
    panel(ctx, 240, 300 + i * 100, 320, 78, {alpha: p, stroke: C.cyan});
    glow(ctx, `ENC ${6 - i}`, 400, 350 + i * 100, 24, C.ink, {align: "center", alpha: p, glow: NOGLOW});
    panel(ctx, 1360, 300 + i * 100, 320, 78, {alpha: pop(shot, f, 4, 14 + i * 5), stroke: C.amber});
    glow(ctx, `DEC ${6 - i}`, 1520, 350 + i * 100, 24, C.ink, {align: "center", alpha: p, glow: NOGLOW});
  }
  // 输入流
  const p1 = pop(shot, f, 2, 16);
  if (p1 > 0) {
    const words = ["猫", "坐", "因为", "它", "累"];
    words.forEach((wd, i) => {
      panel(ctx, 40, 330 + i * 92, 130, 58, {alpha: p1, stroke: C.violet, glow: NOGLOW});
      glow(ctx, wd, 105, 368 + i * 92, 24, C.ink, {align: "center", alpha: p1, glow: NOGLOW});
    });
    glow(ctx, "+ 位置", 105, 850, 22, C.violet, {align: "center", alpha: p1, glow: "rgba(139,92,246,.5)"});
  }
  // 桥：注意力之桥
  if (si >= 6) {
    const p = pop(shot, f, 6, 18);
    neonLine(ctx, 560, 560, 1360, 560, C.cyan, 3, 0.8 * p, 16);
    flowDots(ctx, 560, 560, 1360, 560, f, C.cyan, 4);
    glow(ctx, "注意力之桥", 960, 530, 30, C.cyan, {align: "center", alpha: p, glow: "rgba(70,230,255,.6)"});
  }
  // 输出
  const p2 = pop(shot, f, 7, 16);
  if (p2 > 0) {
    panel(ctx, 1720, 690, 160, 74, {alpha: p2, stroke: C.violet});
    glow(ctx, "softmax", 1800, 735, 24, C.ink, {align: "center", alpha: p2, glow: NOGLOW});
    glow(ctx, "→ 下一个词", 1800, 810, 22, C.violet, {align: "center", alpha: p2, glow: "rgba(139,92,246,.5)"});
  }
}

/* ═════════ k05 · 编码器层 ═════════ */
function k05(ctx: CanvasRenderingContext2D, f: number, shot: any) {
  const si = sentIdx(shot, f);
  // 两个子层 + 残差弧
  const p1 = pop(shot, f, 1, 18);
  panel(ctx, 300, 330, 600, 150, {alpha: p1, stroke: C.cyan, lw: 3});
  glow(ctx, "自注意力", 600, 390, 40, C.cyan, {align: "center", alpha: p1});
  glow(ctx, "Multi-Head Self-Attention", 600, 440, 22, C.dim, {align: "center", alpha: p1, glow: NOGLOW});
  const p2 = pop(shot, f, 3, 18);
  panel(ctx, 300, 620, 600, 150, {alpha: p2, stroke: C.violet, lw: 3});
  glow(ctx, "前馈网络", 600, 680, 40, C.violet, {align: "center", alpha: p2});
  glow(ctx, "Position-wise FFN", 600, 730, 22, C.dim, {align: "center", alpha: p2, glow: NOGLOW});
  // 残差弧
  const pr = pop(shot, f, 4, 18);
  if (pr > 0) {
    ctx.save();
    ctx.globalAlpha = pr;
    ctx.strokeStyle = C.amber; ctx.lineWidth = 3;
    ctx.shadowColor = C.amber; ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(260, 690); ctx.bezierCurveTo(140, 620, 140, 400, 260, 330);
    ctx.stroke();
    glow(ctx, "+x 残差", 130, 500, 24, C.amber, {align: "center", alpha: pr, glow: "rgba(255,194,71,.5)"});
    ctx.restore();
  }
  const pn = pop(shot, f, 5, 16);
  if (pn > 0) {
    panel(ctx, 980, 620, 240, 150, {alpha: pn, stroke: C.amber});
    glow(ctx, "LayerNorm", 1100, 680, 26, C.ink, {align: "center", alpha: pn, glow: NOGLOW});
    glow(ctx, "稳定数值", 1100, 730, 20, C.dim, {align: "center", alpha: pn, glow: NOGLOW});
  }
  if (si >= 6) {
    const p = pop(shot, f, 6, 18);
    glow(ctx, "残差高速路：信息与梯度直通深层", 1200, 400, 34, C.amber, {align: "center", alpha: p, glow: "rgba(255,194,71,.5)"});
  }
}

/* ═════════ k06 · 解码器层 ═════════ */
function k06(ctx: CanvasRenderingContext2D, f: number, shot: any) {
  const si = sentIdx(shot, f);
  const mods: [string, string, string][] = [
    ["Masked Self-Attention", "带掩码自注意力", C.cyan],
    ["Cross-Attention", "交叉注意力", C.amber],
    ["FFN", "前馈网络", C.violet],
  ];
  mods.forEach(([en, zh, color], i) => {
    const p = pop(shot, f, i === 0 ? 0 : i === 1 ? 3 : 5, 18);
    if (p <= 0) return;
    panel(ctx, 280, 260 + i * 200, 640, 150, {alpha: p, stroke: color, lw: 3});
    glow(ctx, zh, 600, 320 + i * 200, 34, color, {align: "center", alpha: p});
    glow(ctx, en, 600, 368 + i * 200, 20, C.dim, {align: "center", alpha: p, font: MONO, glow: NOGLOW});
  });
  // 掩码三角
  const p1 = pop(shot, f, 1, 18);
  if (p1 > 0) {
    for (let r = 0; r < 6; r++)
      for (let c = 0; c < 6; c++) {
        const ok = c <= r;
        ctx.save();
        ctx.globalAlpha = p1 * (ok ? 0.85 : 0.12);
        ctx.fillStyle = ok ? C.cyan : C.dim;
        ctx.fillRect(1020 + c * 60, 240 + r * 60, 50, 50);
        ctx.restore();
      }
    glow(ctx, "未来 = 负无穷", 1350, 640, 26, C.red, {align: "center", alpha: p1, glow: "rgba(255,84,112,.5)"});
  }
  // 交叉注意力桥
  const p2 = pop(shot, f, 3, 16);
  if (p2 > 0) {
    neonLine(ctx, 600, 560, 1560, 500, C.amber, 3, 0.8 * p2, 14);
    flowDots(ctx, 600, 560, 1560, 500, f, C.amber, 3);
    glow(ctx, "Q ← 解码器 · K,V ← 编码器", 1420, 460, 24, C.amber, {align: "center", alpha: p2, glow: "rgba(255,194,71,.5)"});
  }
}

/* ═════════ k07 · 注意力内核 ═════════ */
function k07(ctx: CanvasRenderingContext2D, f: number, shot: any) {
  const si = sentIdx(shot, f);
  // 图书馆：查询卡 + 标签架 + 内容架
  const p1 = pop(shot, f, 1, 16);
  if (p1 > 0) {
    panel(ctx, 140, 400, 300, 200, {alpha: p1, stroke: C.red, lw: 3});
    glow(ctx, "Q", 290, 500, 72, C.red, {align: "center", alpha: p1});
    glow(ctx, "查询 · 我指的是谁？", 290, 560, 22, C.ink, {align: "center", alpha: p1, glow: NOGLOW});
  }
  const p2 = pop(shot, f, 3, 16);
  if (p2 > 0) {
    for (let i = 0; i < 5; i++) {
      panel(ctx, 640 + i * 150, 420, 110, 140, {alpha: p2 * (i === 1 ? 1 : 0.7), stroke: C.cyan});
      ctx.save();
      ctx.globalAlpha = p2;
      ctx.translate(695 + i * 150, 490); ctx.rotate(-Math.PI / 2);
      glow(ctx, ["冠词", "动物", "动作", "连词", "代词"][i], 0, 8, 18, C.ink, {align: "center", glow: NOGLOW});
      ctx.restore();
    }
    glow(ctx, "K · 键", 1090, 380, 28, C.cyan, {align: "center", alpha: p2});
  }
  const p3 = pop(shot, f, 4, 16);
  if (p3 > 0) {
    panel(ctx, 1440, 400, 340, 200, {alpha: p3, stroke: C.violet, lw: 3});
    glow(ctx, "V", 1610, 500, 72, C.violet, {align: "center", alpha: p3});
    glow(ctx, "内容 · 被取回的信息", 1610, 560, 22, C.ink, {align: "center", alpha: p3, glow: NOGLOW});
  }
  // 匹配光束
  if (si >= 2) {
    neonLine(ctx, 300, 500, 640, 490, C.red, 3, 0.7, 14);
    flowDots(ctx, 300, 500, 640, 490, f, C.red, 3);
    neonLine(ctx, 820, 490, 1440, 500, C.cyan, 3, 0.6, 14);
    flowDots(ctx, 820, 490, 1440, 500, f, C.cyan, 3);
  }
  if (si >= 4) {
    const p = pop(shot, f, 4, 20);
    glow(ctx, "Attention(Q, K, V)", 960, 880, 58, C.ink, {align: "center", alpha: p, glow: "rgba(70,230,255,.6)"});
  }
}

/* ═════════ k08 · 缩放点积（公式装配） ═════════ */
function k08(ctx: CanvasRenderingContext2D, f: number, shot: any) {
  const tokens: [string, string][] = [
    ["Attention(Q, K, V)", C.ink], [" = ", C.dim], ["softmax", C.orange ?? C.cyan],
    ["(", C.ink], ["QKᵀ", C.amber], [" / √dk", C.red], [")", C.ink], ["·V", C.ink],
  ];
  ctx.save();
  ctx.font = `900 58px ${MONO}`;
  const widths = tokens.map(([t]) => ctx.measureText(t).width);
  const total = widths.reduce((a, b) => a + b, 0) + (tokens.length - 1) * 14;
  let x = 960 - total / 2;
  ctx.restore();
  tokens.forEach(([t, color], i) => {
    const p = barP(f, 60 + i * 45, 18);
    if (p <= 0) { x += widths[i] + 14; return; }
    ctx.save();
    ctx.globalAlpha = p;
    ctx.translate(x + widths[i] / 2, 400);
    const s = 0.8 + 0.2 * p;
    ctx.scale(s, s);
    glow(ctx, t, 0, 0, 58, color, {align: "center", glow: `rgba(70,230,255,.5)`, font: MONO});
    ctx.restore();
    x += widths[i] + 14;
  });
  // 数值实验（压缩版）
  const p1 = pop(shot, f, 3, 18);
  if (p1 > 0) {
    panel(ctx, 200, 560, 700, 200, {alpha: p1, stroke: C.red, lw: 3});
    glow(ctx, "不缩放：logits [8, 0]", 260, 630, 26, C.dim, {alpha: p1, glow: NOGLOW});
    glow(ctx, "softmax → [0.99966, 0.00034]", 260, 700, 34, C.red, {alpha: p1});
    glow(ctx, "雅可比 ≈ 0.0003 · 梯度消失", 260, 745, 24, C.ink, {alpha: p1, glow: NOGLOW});
  }
  const p2 = pop(shot, f, 5, 18);
  if (p2 > 0) {
    panel(ctx, 1020, 560, 700, 200, {alpha: p2, stroke: C.cyan, lw: 3});
    glow(ctx, "÷√64=8：logits [1, 0]", 1080, 630, 26, C.dim, {alpha: p2, glow: NOGLOW});
    glow(ctx, "softmax → [0.731, 0.269]", 1080, 700, 34, C.cyan, {alpha: p2});
    glow(ctx, "雅可比 ≈ 0.197 · 梯度 600 倍", 1080, 745, 24, C.ink, {alpha: p2, glow: NOGLOW});
  }
  const p3 = pop(shot, f, 6, 18);
  if (p3 > 0) glow(ctx, "一个除法，救活整层梯度", 960, 880, 40, B10(), {align: "center", alpha: p3, glow: "rgba(70,230,255,.5)"});
}
const B10 = () => C.amber;

/* ═════════ k09 · 多头 ═════════ */
function k09(ctx: CanvasRenderingContext2D, f: number, shot: any) {
  big(ctx, "MultiHead = Concat(head₁…head₈) · Wᴼ", 120, 240, 42, C.ink, "left", FONT_UI, 900);
  for (let i = 0; i < 8; i++) {
    const p = barP(f, 120 + i * 45, 14);
    if (p <= 0) continue;
    const x = 170 + i * 205;
    panel(ctx, x, 360, 150, 190, {alpha: p, stroke: i % 2 ? C.violet : C.cyan});
    glow(ctx, `H${i + 1}`, x + 75, 420, 26, C.ink, {align: "center", alpha: p, glow: NOGLOW});
    glow(ctx, "64", x + 75, 490, 48, i % 2 ? C.violet : C.cyan, {align: "center", alpha: p});
    glow(ctx, "子空间", x + 75, 530, 16, C.dim, {align: "center", alpha: p, glow: NOGLOW});
    ctx.save();
    ctx.globalAlpha = p * 0.7;
    ctx.strokeStyle = C.dim; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + 75, 550); ctx.lineTo(940, 680); ctx.stroke();
    ctx.restore();
  }
  const p2 = barP(f, 560, 16);
  if (p2 > 0) {
    panel(ctx, 780, 680, 360, 90, {alpha: p2, stroke: C.orange ?? C.cyan, lw: 4});
    glow(ctx, "Concat → 512", 960, 738, 38, C.ink, {align: "center", alpha: p2});
  }
  const p3 = barP(f, 800, 16);
  if (p3 > 0) {
    neonLine(ctx, 1140, 725, 1400, 725, C.cyan, 3, 0.8 * p3, 14);
    panel(ctx, 1400, 680, 260, 90, {alpha: p3, stroke: C.ink, lw: 4});
    glow(ctx, "Wᴼ 512×512", 1530, 738, 28, C.ink, {align: "center", alpha: p3, glow: NOGLOW});
  }
  const p4 = barP(f, 1050, 18);
  if (p4 > 0) {
    glow(ctx, "每头降维 → 总算力 ≈ 全维单头", 960, 900, 32, C.cyan, {align: "center", alpha: p4, glow: "rgba(70,230,255,.4)"});
    glow(ctx, "消融：8 头比单头高 0.9 BLEU（25.8 vs 24.9）", 960, 955, 26, C.amber, {align: "center", alpha: p4, glow: "rgba(255,194,71,.4)"});
  }
}

/* ═════════ k10 · 三种用法（三分屏） ═════════ */
function k10(ctx: CanvasRenderingContext2D, f: number, shot: any) {
  const panels: [string, string, string][] = [
    ["Self-Attention", "自注意力", "Q=K=V 同源 · 互相看"],
    ["Cross-Attention", "交叉注意力", "Q 来自解码器 · K,V 来自编码器"],
    ["Masked Self-Attention", "带掩码自注意力", "只许看过去 · 未来=负无穷"],
  ];
  panels.forEach(([en, zh, desc], i) => {
    const p = pop(shot, f, i, 18);
    if (p <= 0) return;
    const x = 120 + i * 580;
    panel(ctx, x, 280, 540, 440, {alpha: p, stroke: [C.cyan, C.amber, C.violet][i], lw: 3});
    glow(ctx, zh, x + 270, 350, 36, [C.cyan, C.amber, C.violet][i], {align: "center", alpha: p});
    glow(ctx, en, x + 270, 395, 18, C.dim, {align: "center", font: MONO, alpha: p, glow: NOGLOW});
    // 图示
    if (i === 0) {
      for (let k = 0; k < 5; k++) {
        orb(ctx, x + 270 + Math.cos(f * 0.04 + k) * 130, 520 + Math.sin(f * 0.04 + k) * 70, 10, C.cyan, p);
        for (let j = 0; j < 5; j++) if (j !== k)
          neonLine(ctx, x + 270 + Math.cos(f * 0.04 + k) * 130, 520 + Math.sin(f * 0.04 + k) * 70,
                   x + 270 + Math.cos(f * 0.04 + j) * 130, 520 + Math.sin(f * 0.04 + j) * 70, C.cyan, 1, 0.25 * p, 0);
      }
    } else if (i === 1) {
      for (let k = 0; k < 4; k++) orb(ctx, x + 120 + k * 100, 500, 12, C.cyan, p);
      for (let k = 0; k < 3; k++) orb(ctx, x + 170 + k * 100, 620, 12, C.amber, p);
      for (let k = 0; k < 3; k++) neonLine(ctx, x + 170 + k * 100, 620, x + 120 + (k + 1) * 100, 500, C.amber, 2, 0.7 * p, 8);
    } else {
      for (let r = 0; r < 5; r++)
        for (let c = 0; c < 5; c++) {
          const ok = c <= r;
          ctx.save();
          ctx.globalAlpha = p * (ok ? 0.9 : 0.1);
          ctx.fillStyle = ok ? C.violet : C.dim;
          ctx.fillRect(x + 130 + c * 58, 460 + r * 44, 48, 34);
          ctx.restore();
        }
    }
    glow(ctx, desc, x + 270, 690, 24, C.ink, {align: "center", alpha: p, glow: NOGLOW});
  });
  const p4 = barP(f, 1000, 18);
  if (p4 > 0) glow(ctx, "同一公式 · 三种用法 · 只差输入来源与约束", 960, 880, 36, C.ink, {align: "center", alpha: p4, glow: "rgba(70,230,255,.4)"});
}

/* ═════════ k11 · FFN ═════════ */
function k11(ctx: CanvasRenderingContext2D, f: number, shot: any) {
  big(ctx, "FFN(x) = max(0, xW₁+b₁)W₂+b₂", 120, 260, 44, C.ink, "left", FONT_UI, 900);
  // 膨胀漏斗
  const p1 = barP(f, 160, 20);
  if (p1 > 0) {
    ctx.save();
    ctx.globalAlpha = p1;
    ctx.fillStyle = "rgba(70,230,255,.12)";
    ctx.strokeStyle = C.cyan; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(400, 400); ctx.lineTo(760, 330); ctx.lineTo(760, 750); ctx.lineTo(400, 680);
    ctx.closePath(); ctx.stroke(); ctx.fill();
    ctx.fillStyle = "rgba(139,92,246,.12)";
    ctx.strokeStyle = C.violet;
    ctx.beginPath();
    ctx.moveTo(1160, 330); ctx.lineTo(1520, 400); ctx.lineTo(1520, 680); ctx.lineTo(1160, 750);
    ctx.closePath(); ctx.stroke(); ctx.fill();
    ctx.restore();
    glow(ctx, "512", 380, 550, 40, C.cyan, {align: "center", alpha: p1});
    glow(ctx, "2048", 960, 550, 56, C.amber, {align: "center", alpha: p1});
    glow(ctx, "ReLU", 960, 640, 30, C.red, {align: "center", alpha: p1, glow: "rgba(255,84,112,.5)"});
    glow(ctx, "512", 1560, 550, 40, C.violet, {align: "center", alpha: p1});
    big(ctx, "膨胀 → 非线性 → 压缩", 960, 830, 32, B10(), {align: "center", FONT_UI: undefined, weight: undefined} as never);
  }
  const p2 = pop(shot, f, 4, 18);
  if (p2 > 0) {
    panel(ctx, 260, 880, 1400, 90, {alpha: p2, stroke: C.violet});
    glow(ctx, "直觉【推断】：注意力搬运信息 · 前馈加工并记忆模式（键值存储假设）", 960, 935, 26, C.ink, {align: "center", alpha: p2, glow: NOGLOW});
  }
}

/* ═════════ k12 · 嵌入与输出 ═════════ */
function k12(ctx: CanvasRenderingContext2D, f: number, shot: any) {
  big(ctx, "入口与出口共享一份权重", 120, 250, 48, C.ink, "left", FONT_UI, 900);
  const p1 = barP(f, 120, 18);
  if (p1 > 0) {
    panel(ctx, 200, 330, 480, 130, {alpha: p1, stroke: C.cyan, lw: 3});
    glow(ctx, "词嵌入 · 512 维", 440, 385, 30, C.ink, {align: "center", alpha: p1, glow: NOGLOW});
    glow(ctx, "× √512 = 22.6", 440, 430, 26, C.amber, {align: "center", alpha: p1, glow: "rgba(255,194,71,.4)"});
    panel(ctx, 1240, 330, 480, 130, {alpha: p1, stroke: C.violet, lw: 3});
    glow(ctx, "输出 softmax 前", 1480, 385, 26, C.ink, {align: "center", alpha: p1, glow: NOGLOW});
    glow(ctx, "同一份权重矩阵", 1480, 430, 26, C.violet, {align: "center", alpha: p1});
  }
  const p2 = barP(f, 400, 18);
  if (p2 > 0) {
    neonLine(ctx, 680, 395, 1240, 395, C.amber, 3, 0.8 * p2, 14);
    flowDots(ctx, 680, 395, 1240, 395, f, C.amber, 4);
    glow(ctx, "共享权重 · 省参数 · 效果更好", 960, 350, 30, B10(), {align: "center", alpha: p2, glow: "rgba(255,194,71,.4)"});
  }
  const p3 = barP(f, 650, 18);
  if (p3 > 0) {
    // softmax 扇形 → 词表柱
    const bars = [0.32, 0.24, 0.14, 0.09, 0.07, 0.05, 0.04, 0.05];
    bars.forEach((h, i) => {
      const x = 340 + i * 160;
      ctx.fillStyle = i === 0 ? C.amber : C.cyan;
      ctx.globalAlpha = p3 * (0.5 + h);
      ctx.fillRect(x, 850 - h * 400, 90, h * 400);
      ctx.globalAlpha = p3;
      big(ctx, `${(h * 100).toFixed(0)}%`, x + 45, 880, 22, C.ink, "center", MONO, 700);
    });
    glow(ctx, "出口 softmax → 词表概率 → 交叉熵训练", 960, 930, 28, C.ink, {align: "center", alpha: p3, glow: NOGLOW});
  }
}

/* ═════════ k13 · 位置编码（真曲线） ═════════ */
function k13(ctx: CanvasRenderingContext2D, f: number, shot: any) {
  big(ctx, "PE(pos,2i)=sin(pos/10000^(2i/d))  ·  PE(pos,2i+1)=cos(·)", 250, 250, 30, C.ink, "left", FONT_UI, 800);
  const p1 = barP(f, 100, 18);
  if (p1 > 0) {
    const colors = [C.cyan, C.violet, C.amber, C.red, C.ink];
    for (let k = 0; k < 5; k++) {
      ctx.save();
      ctx.globalAlpha = p1 * (0.9 - k * 0.12);
      ctx.strokeStyle = colors[k];
      ctx.lineWidth = 2.5;
      ctx.shadowColor = colors[k]; ctx.shadowBlur = 8;
      ctx.beginPath();
      for (let i = 0; i <= 240; i++) {
        const pos = i * 0.5;
        const d = 16 * Math.pow(k + 1, 1.6);
        const x = 200 + i * 6.4;
        const y = 430 + Math.sin(pos / d) * 60;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }
    glow(ctx, "高频 → 低频 · 每个位置唯一波形", 960, 560, 30, C.ink, {align: "center", alpha: p1, glow: NOGLOW});
  }
  const p2 = barP(f, 500, 18);
  if (p2 > 0) {
    // 词 + 印章 + 相加
    const words = ["猫", "追", "狗"];
    words.forEach((wd, i) => {
      const x = 560 + i * 300;
      panel(ctx, x - 80, 640, 160, 80, {alpha: p2, stroke: C.cyan});
      glow(ctx, wd, x, 692, 36, C.ink, {align: "center", alpha: p2, glow: NOGLOW});
      glow(ctx, `+ PE ${i + 1}`, x, 770, 22, C.amber, {align: "center", alpha: p2, glow: "rgba(255,194,71,.4)"});
      if (i < 2) glow(ctx, "+", x + 150, 690, 36, C.dim, {align: "center", alpha: p2, glow: NOGLOW});
    });
    glow(ctx, "直接加在词向量上 · 维度完全对齐", 960, 850, 28, C.ink, {align: "center", alpha: p2, glow: NOGLOW});
  }
  const p3 = barP(f, 850, 18);
  if (p3 > 0) {
    glow(ctx, "相对位置可表示为绝对编码的线性组合【文中有据】", 960, 920, 26, C.violet, {align: "center", alpha: p3, glow: "rgba(139,92,246,.4)"});
  }
}

/* ═════════ k14 · 三笔账 ═════════ */
function k14(ctx: CanvasRenderingContext2D, f: number, shot: any) {
  const rows: [string, string, string, string][] = [
    ["每层计算量", "O(n²·d)", "O(n·d²)", "n < d 时自注意力更省【文中有据】"],
    ["顺序操作", "O(1)", "O(n)", "并行能力：整句一拍"],
    ["最大路径", "O(1)", "O(n)", "长程依赖一步直达"],
  ];
  rows.forEach(([name, sa, sr, note], i) => {
    const p = barP(f, 120 + i * 180, 20);
    if (p <= 0) return;
    const y = 300 + i * 160;
    panel(ctx, 240, y, 1540, 120, {alpha: p, stroke: i === 2 ? C.cyan : B10(), lw: i === 2 ? 4 : 2});
    glow(ctx, name, 300, y + 72, 34, C.ink, {align: "left", alpha: p, glow: NOGLOW});
    glow(ctx, `自注意力 ${sa}`, 800, y + 72, 34, C.cyan, {align: "left", alpha: p, font: MONO});
    glow(ctx, `循环 ${sr}`, 1260, y + 72, 34, C.dim, {align: "left", alpha: p, font: MONO});
    glow(ctx, note, 800, y + 104, 22, B10(), {align: "left", alpha: p, glow: NOGLOW});
  });
  const p4 = barP(f, 720, 18);
  if (p4 > 0) {
    glow(ctx, "三笔账：更省 · 可并行 · 好学长依赖", 960, 880, 36, C.ink, {align: "center", alpha: p4, glow: "rgba(70,230,255,.4)"});
    glow(ctx, "诚实标注：n² 内存是长文本的硬代价【文中有据】", 960, 935, 24, C.amber, {align: "center", alpha: p4, glow: NOGLOW});
  }
}

/* ═════════ k15 · 训练数据 ═════════ */
function k15(ctx: CanvasRenderingContext2D, f: number, shot: any) {
  big(ctx, "燃料：WMT 2014", 120, 250, 50, C.ink, "left", FONT_UI, 900);
  const cards: [string, string, string][] = [
    ["4,500,000", "英德句对", "BPE 37,000 tokens"],
    ["36,000,000", "英法句对", "word-piece 32,000"],
    ["25,000×2", "每批源+目标词", "按句长近似分桶"],
  ];
  cards.forEach(([num, zh, sub], i) => {
    const p = barP(f, 120 + i * 160, 20);
    if (p <= 0) return;
    const x = 240 + i * 540;
    panel(ctx, x, 380, 480, 220, {alpha: p, stroke: [C.cyan, C.violet, C.amber][i], lw: 3});
    glow(ctx, num, x + 240, 480, 54, [C.cyan, C.violet, C.amber][i], {align: "center", alpha: p, font: MONO});
    glow(ctx, zh, x + 240, 535, 28, C.ink, {align: "center", alpha: p, glow: NOGLOW});
    glow(ctx, sub, x + 240, 575, 20, C.dim, {align: "center", font: MONO, alpha: p, glow: NOGLOW});
  });
  const p4 = barP(f, 640, 18);
  if (p4 > 0) glow(ctx, "数据工程看似平淡，直接决定上限", 960, 700, 34, C.ink, {align: "center", alpha: p4, glow: "rgba(70,230,255,.4)"});
}

/* ═════════ k16 · 硬件 ═════════ */
function k16(ctx: CanvasRenderingContext2D, f: number, shot: any) {
  big(ctx, "8 × NVIDIA P100", 120, 250, 50, C.ink, "left", FONT_UI, 900);
  for (let g = 0; g < 8; g++) {
    const p = barP(f, 100 + g * 25, 14);
    if (p <= 0) continue;
    const x = 200 + (g % 4) * 260, y = 330 + Math.floor(g / 4) * 160;
    panel(ctx, x, y, 220, 110, {alpha: p, stroke: C.cyan});
    ctx.save();
    ctx.globalAlpha = p;
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = `rgba(70,230,255,${0.3 + 0.4 * Math.abs(Math.sin(f * 0.07 + g + k))})`;
      ctx.fillRect(x + 20 + k * 48, y + 22, 36, 46);
    }
    ctx.restore();
    glow(ctx, `P100-${g + 1}`, x + 110, y + 95, 20, C.dim, {align: "center", glow: NOGLOW});
  }
  const rows: [string, string, string][] = [
    ["base", "12 小时 · 100,000 步", "0.4 s/step"],
    ["big", "3.5 天 · 300,000 步", "1.0 s/step"],
  ];
  rows.forEach(([name, t2, sp], i) => {
    const p = barP(f, 500 + i * 160, 18);
    if (p <= 0) return;
    const y = 700 + i * 100;
    panel(ctx, 200, y, 1520, 80, {alpha: p, stroke: i === 0 ? C.cyan : C.amber});
    glow(ctx, name, 260, y + 50, 30, i === 0 ? C.cyan : C.amber, {align: "left", alpha: p, font: MONO});
    glow(ctx, t2, 560, y + 50, 28, C.ink, {align: "left", alpha: p, glow: NOGLOW});
    glow(ctx, sp, 1400, y + 50, 26, C.dim, {align: "left", font: MONO, alpha: p, glow: NOGLOW});
  });
}

/* ═════════ k17 · 优化器（真曲线） ═════════ */
function k17(ctx: CanvasRenderingContext2D, f: number, shot: any) {
  big(ctx, "Adam · β₁=0.9 β₂=0.98 ε=10⁻⁹", 250, 250, 40, C.ink, "left", FONT_UI, 900);
  const p1 = barP(f, 100, 20);
  if (p1 > 0) {
    // LR 曲线：前 4000 步线性升到峰值，之后 step^-0.5 衰减
    ctx.save();
    ctx.strokeStyle = C.cyan; ctx.lineWidth = 4;
    ctx.shadowColor = C.cyan; ctx.shadowBlur = 12;
    ctx.beginPath();
    const peakStep = 4000, maxStep = 100000;
    for (let i = 0; i <= 300; i++) {
      const step = (i / 300) * maxStep;
      const lr = Math.min(1 / Math.sqrt(step), step / (4000 * Math.sqrt(4000)));
      const x = 330 + (step / maxStep) * 1400;
      const y = 780 - lr / (1 / Math.sqrt(4000)) * 420;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
    // 4000 步标记
    const px = 200 + (4000 / 100000) * 1500;
    ctx.save();
    ctx.strokeStyle = C.amber; ctx.setLineDash([8, 8]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px, 300); ctx.lineTo(px, 780); ctx.stroke();
    ctx.restore();
    glow(ctx, "warmup = 4000 步", px + 16, 330, 26, C.amber, {align: "left", glow: "rgba(255,194,71,.5)"});
    glow(ctx, "lr = d^(-0.5) · min(step^(-0.5), step·warmup^(-1.5))", 960, 845, 28, C.ink, {align: "center", glow: NOGLOW});
  }
  const p2 = barP(f, 700, 18);
  if (p2 > 0) {
    glow(ctx, "先升温后降温：初期小步热身，站稳后退火精修", 960, 930, 32, B10(), {align: "center", alpha: p2, glow: "rgba(255,194,71,.4)"});
  }
}

/* ═════════ k18 · 正则 ═════════ */
function k18(ctx: CanvasRenderingContext2D, f: number, shot: any) {
  const p1 = barP(f, 80, 18);
  if (p1 > 0) {
    panel(ctx, 200, 300, 720, 420, {alpha: p1, stroke: C.cyan, lw: 3});
    glow(ctx, "残差 Dropout", 560, 370, 36, C.cyan, {align: "center", alpha: p1});
    // 神经元随机熄灭
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 7; c++) {
        const alive = sRnd(r * 7 + c + Math.floor(f / 20)) > 0.25;
        ctx.save();
        ctx.globalAlpha = p1 * (alive ? 0.9 : 0.15);
        ctx.fillStyle = alive ? C.cyan : C.dim;
        ctx.beginPath(); ctx.arc(300 + c * 80, 440 + r * 60, 16, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    glow(ctx, "P=0.1 → 大模型 0.3", 560, 690, 24, C.dim, {align: "center", glow: NOGLOW});
  }
  const p2 = barP(f, 260, 18);
  if (p2 > 0) {
    panel(ctx, 1000, 300, 720, 420, {alpha: p2, stroke: C.violet, lw: 3});
    glow(ctx, "Label Smoothing ε=0.1", 1360, 370, 32, C.violet, {align: "center", alpha: p2});
    // 硬标签 → 软分布
    const hard = [1, 0, 0, 0, 0];
    const soft = [0.9, 0.025, 0.025, 0.025, 0.025];
    hard.forEach((v, i) => {
      const x = 1100 + i * 120;
      ctx.save(); ctx.globalAlpha = p2;
      ctx.fillStyle = C.dim;
      ctx.fillRect(x, 640 - v * 200, 60, v * 200);
      ctx.fillStyle = C.violet;
      ctx.fillRect(x, 640 - soft[i] * 200, 60, soft[i] * 200);
      ctx.restore();
      ctx.save(); ctx.globalAlpha = p2;
      big(ctx, `${soft[i]}`, x + 30, 680, 20, C.violet, "center", MONO, 700);
      ctx.restore();
    });
    glow(ctx, "PPL 变差 · BLEU 变高【文中有据】", 1360, 690, 24, B10(), {align: "center", alpha: p2, glow: "rgba(255,194,71,.4)"});
  }
  const p3 = barP(f, 700, 18);
  if (p3 > 0) glow(ctx, "反直觉的教训：别只盯一个指标做决定", 960, 860, 38, C.ink, {align: "center", alpha: p3, glow: "rgba(70,230,255,.4)"});
}

/* ═════════ k19 · 结果 ═════════ */
function k19(ctx: CanvasRenderingContext2D, f: number, shot: any) {
  const bars: [string, number, string][] = [
    ["此前最佳集成", 26.36, C.dim],
    ["Transformer base", 27.3, C.violet],
    ["Transformer big", 28.4, C.orange ?? C.amber],
  ];
  big(ctx, "WMT14 EN-DE · BLEU", 120, 250, 40, C.dim, "left", MONO, 700);
  bars.forEach(([name, val, color], i) => {
    const p = barP(f, 100 + i * 160, 20);
    if (p <= 0) return;
    const y = 320 + i * 120;
    const frac = (val - 24) / 6;
    barRow(ctx, 300, y, 1000, 74, frac, color, p);
    big(ctx, name, 310, y + 46, 26, C.ink, "left", FONT_UI, 800);
    big(ctx, val.toFixed(1), 1450, y + 50, 44, color, "left", MONO, 900);
  });
  glow(ctx, "+2.0 BLEU vs 此前最佳集成（含 ensemble）【文中有据】", 700, 760, 30, C.amber, {align: "center", glow: "rgba(255,194,71,.4)"});
  const p2 = barP(f, 560, 20);
  if (p2 > 0) {
    panel(ctx, 200, 800, 1520, 110, {alpha: p2, stroke: C.amber, lw: 3});
    glow(ctx, "EN-FR：41.8 BLEU · 单模型 · 训练成本 1/4【文中有据】", 960, 868, 36, B10(), {align: "center", alpha: p2});
  }
}
function barRow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frac: number, color: string, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha * 0.3;
  ctx.strokeStyle = "rgba(70,230,255,.25)";
  ctx.strokeRect(x, y, w, h);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.shadowColor = color; ctx.shadowBlur = 12;
  ctx.fillRect(x + 3, y + 3, Math.max(3, (w - 6) * sClamp01(frac)), h - 6);
  ctx.restore();
}

/* ═════════ k20 · 消融全景 ═════════ */
function k20(ctx: CanvasRenderingContext2D, f: number, shot: any) {
  const rows: [string, string, string][] = [
    ["(A) 头数", "h=1: 24.9 → h=8: 25.8 → h=32: 25.4", "甜点位"],
    ["(B) 键维度", "dk 64→32→16 持续下降", "减小有害【原话】"],
    ["(C) 更大模型", "d_model=1024: 26.0 · d_ff=4096: 26.2", "更大更好"],
    ["(D) 正则", "dropout 0→24.6 · 0.2→25.5", "防过拟合"],
    ["(E) 位置嵌入", "可学习 vs 正弦：25.7 vs 25.8", "几乎一样"],
  ];
  rows.forEach(([name, val, tag], i) => {
    const p = barP(f, 100 + i * 150, 20);
    if (p <= 0) return;
    const y = 300 + i * 118;
    panel(ctx, 240, y, 1540, 92, {alpha: p, stroke: i % 2 ? C.violet : C.cyan});
    glow(ctx, name, 300, y + 58, 30, C.ink, {align: "left", alpha: p, glow: NOGLOW});
    glow(ctx, val, 720, y + 58, 28, C.ink, {align: "left", alpha: p, font: MONO, glow: NOGLOW});
    glow(ctx, tag, 1560, y + 58, 26, B10(), {align: "left", alpha: p, glow: "rgba(255,194,71,.4)"});
  });
  const p6 = barP(f, 900, 18);
  if (p6 > 0) glow(ctx, "数据驱动的工程：每个设计决定都有消融", 960, 940, 34, C.ink, {align: "center", alpha: p6, glow: "rgba(70,230,255,.4)"});
}

/* ═════════ k21 · 结论 ═════════ */
function k21(ctx: CanvasRenderingContext2D, f: number, shot: any) {
  const cards: [string, string][] = [
    ["并行的架构", "整句一拍，训练快"],
    ["可解释的注意力", "头会看对地方"],
    ["数据驱动的工程", "每个决定有消融"],
  ];
  cards.forEach(([zh, sub], i) => {
    const p = barP(f, 100 + i * 120, 18);
    if (p <= 0) return;
    const x = 240 + i * 520;
    panel(ctx, x, 260, 460, 160, {alpha: p, stroke: [C.cyan, C.violet, C.amber][i], lw: 3});
    glow(ctx, zh, x + 230, 330, 32, [C.cyan, C.violet, C.amber][i], {align: "center", alpha: p});
    glow(ctx, sub, x + 230, 380, 22, C.dim, {align: "center", alpha: p, glow: NOGLOW});
  });
  // 模态轨道
  const p2 = barP(f, 500, 20);
  if (p2 > 0) {
    glow(ctx, "推广到 images · audio · video【结论原句】", 960, 560, 34, C.ink, {align: "center", alpha: p2, glow: "rgba(70,230,255,.4)"});
    for (let i = 0; i < 8; i++) {
      const a = f * 0.02 + (i / 8) * Math.PI * 2;
      orb(ctx, 960 + Math.cos(a) * 380, 760 + Math.sin(a) * 90, 12, [C.cyan, C.violet, C.amber][i % 3], p2 * 0.9);
    }
    ctx.save();
    ctx.globalAlpha = p2 * 0.6;
    ctx.strokeStyle = C.violet; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(960, 760, 380, 90, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  const p3 = barP(f, 750, 20);
  if (p3 > 0) {
    glow(ctx, "GPT · BERT · 多模态 —— 全部站在这副骨架上", 960, 920, 34, C.ink, {align: "center", alpha: p3, glow: "rgba(70,230,255,.45)"});
  }
  const p4 = barP(f, 950, 20);
  if (p4 > 0) {
    glow(ctx, "下一集：位置编码 · 为什么是正弦波", 960, 985, 28, C.violet, {align: "center", alpha: p4, glow: "rgba(139,92,246,.5)"});
    glow(ctx, "纸片工作室 · 收藏不迷路", 960, 1030, 22, C.dim, {align: "center", alpha: p4, glow: NOGLOW});
  }
}

/* ═════════ 场景分发 ═════════ */
type Draw = (ctx: CanvasRenderingContext2D, f: number, shot: any) => void;
const DRAW: Draw[] = [k01, k02, k03, k04, k05, k06, k07, k08, k09, k10, k11, k12, k13, k14, k15, k16, k17, k18, k19, k20, k21];

const CanvasLayer: React.FC<{index: number; frame: number}> = ({index, frame}) => {
  const ref = React.useRef<HTMLCanvasElement | null>(null);
  const shot = SHOTS[index];
  const local = frame;
  const t = local / shot.frames;
  React.useLayoutEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, C.bg0); g.addColorStop(0.6, C.bg1); g.addColorStop(1, C.bg2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const cam = camAt(CAMS[index], sClamp01(t));
    starfield(ctx, frame, cam);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(cam.s, cam.s);
    ctx.translate(-cam.x, -cam.y);
    DRAW[index](ctx, local, shot);
    ctx.restore();
    chrome(ctx, frame, index, local);
  }, [frame, index, local, shot, t]);
  return <canvas ref={ref} width={W} height={H} style={{width: "100%", height: "100%"}} />;
};

const ChapterShell: React.FC<{index: number}> = ({index}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: C.bg1}}>
      <CanvasLayer index={index} frame={frame} />
      {SHOTS[index].sentences.map((s: any, k: number) => (
        <Sequence key={k} from={s.start} durationInFrames={s.frames} name={`${SHOTS[index].id}-${k + 1}`}>
          <Audio src={staticFile(`audio9/${s.audio}.mp3`)} volume={1} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

export const Ep03Full: React.FC = () => {
  return (
    <AbsoluteFill style={{background: C.bg1}}>
      <Audio src={staticFile("audio9/bgm_ep03.wav")} volume={0.55} />
      {SHOTS.map((shot: any, i: number) => (
        <Sequence key={shot.id} from={shot.start} durationInFrames={shot.frames} name={`${shot.id} ${shot.title}`}>
          <ChapterShell index={i} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

export const EP03_FRAMES = TOTAL_FRAMES;
