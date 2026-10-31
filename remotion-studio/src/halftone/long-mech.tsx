import React from "react";
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from "remotion";
import {PAL, W, H, paintDots, textDots, gridDots, type Dot} from "./core";
import {plate, gauge, isoBox, hazardBar, ringTicks, gearDots} from "./mech";
import {camAt, type Cue} from "./camera";
import {SHOTS, type Shot} from "./long-timeline.generated";
import {S, SFONT, SMONO, sClamp01, sEase, sLine, sDot, sRnd, glowText, C_MINT, C_DIM, worldTransform} from "./social-core";

/* ═════════════ 长版（10 分钟）· 机核语言 · 零基础讲解 ═════════════
   结构：18 章 × 6-10 句旁白；节拍锚定到句子起点（sentIdx）。
   视觉：装甲板 / 仪表 / 等距舱 / 点阵 / HUD / 机械快门（与社媒版同一语言）。 */

const HOLDS: Record<string, number> = {k00: 30, k01: 20, k18: 140};
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

const PLATE_FILL = "rgba(13,22,38,.94)";
const NOGLOW = "rgba(0,0,0,0)";
const CW = 1920;
const CH = 1080;

/* ───────── 小工具 ───────── */
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

const bboxOf = (dots: Dot[]) => {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const d of dots) {
    x0 = Math.min(x0, d.x); y0 = Math.min(y0, d.y);
    x1 = Math.max(x1, d.x); y1 = Math.max(y1, d.y);
  }
  return {cx: (x0 + x1) / 2, cy: (y0 + y1) / 2};
};

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

/** 当前正在讲第几句（0 起） */
const sentIdx = (shot: Shot, f: number) => {
  let si = 0;
  for (let i = 0; i < shot.sentences.length; i++) if (f >= shot.sentences[i].start) si = i;
  return si;
};
/** 第 si 句开始后经过的帧数（负数=还没开始） */
const since = (shot: Shot, f: number, si: number) => f - shot.sentences[Math.min(si, shot.sentences.length - 1)].start;
const popAt = (shot: Shot, f: number, si: number, dur = 18) => sEase(sClamp01(since(shot, f, si) / dur));

/* ───────── 背景 + HUD + 快门 ───────── */
const drawBG = (ctx: CanvasRenderingContext2D, f: number) => {
  ctx.save();
  ctx.strokeStyle = "rgba(140,190,255,.07)";
  ctx.lineWidth = 1;
  for (let x = 48; x < CW; x += 48) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke();
  }
  for (let y = 48; y < CH; y += 48) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke();
  }
  ctx.restore();
  for (let x = 24; x < CW; x += 48)
    for (let y = 24; y < CH; y += 48)
      sDot(ctx, x, y, 1.4, PAL.ink, 0.05 + 0.05 * sRnd(x * 0.13 + y));
  const sy = ((f * 1.1) % (CH + 300)) - 150;
  ctx.save();
  ctx.globalAlpha = 0.045;
  ctx.fillStyle = C_MINT;
  ctx.fillRect(0, sy, CW, 90);
  ctx.restore();
};

const drawChrome = (ctx: CanvasRenderingContext2D, f: number, shot: Shot, index: number, frame: number) => {
  const m = 24, L = 40;
  ctx.save();
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.55;
  [[m, m, 1, 1], [CW - m, m, -1, 1], [m, CH - m, 1, -1], [CW - m, CH - m, -1, -1]].forEach(([x, y, sx, sy]) => {
    ctx.beginPath();
    ctx.moveTo(x + sx * L, y); ctx.lineTo(x, y); ctx.lineTo(x, y + sy * L);
    ctx.stroke();
  });
  ctx.restore();
  if (Math.sin(f * 0.21) > -0.2) sDot(ctx, m + 22, m + 22, 4, PAL.warm, 0.9);
  glowText(ctx, "PAPERVIDEO // ATTENTION 特辑", m + 34, m + 26, 16, S.muted, {font: SFONT, alpha: 0.8, weight: 600, glow: NOGLOW});
  glowText(ctx, `SEC ${String(index + 1).padStart(2, "0")}/20 · ${shot.kicker}`, CW - m - 12, m + 26, 17, S.muted, {font: SFONT, align: "right", alpha: 0.85, weight: 700, glow: NOGLOW});
  glowText(ctx, `F ${String(Math.floor(frame)).padStart(4, "0")}`, CW - m - 12, m + 48, 13, C_DIM, {font: SMONO, align: "right", alpha: 0.9, weight: 500, glow: NOGLOW});
  hazardBar(ctx, m + L, CH - m - 5, CW - 2 * (m + L), 5, {alpha: 0.4});
  for (let y = m + 64; y < CH - m - 40; y += 44) {
    const long = ((y / 44) | 0) % 4 === 0;
    sLine(ctx, m + 2, y, m + (long ? 16 : 8), y, 1.4, PAL.ink, long ? 0.4 : 0.22);
  }
};

const SHUTTER = 9;
const drawShutter = (ctx: CanvasRenderingContext2D, cover: number, label: string) => {
  if (cover <= 0.001) return;
  const e = sEase(sClamp01(cover));
  const half = (CH / 2) * e;
  ctx.save();
  ctx.fillStyle = "#0a1322";
  ctx.fillRect(0, 0, CW, half);
  ctx.fillRect(0, CH - half, CW, half);
  if (half > 16) {
    hazardBar(ctx, 0, half - 12, CW, 12, {alpha: 0.85});
    hazardBar(ctx, 0, CH - half, CW, 12, {alpha: 0.85});
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, half - 20); ctx.lineTo(CW, half - 20);
    ctx.moveTo(0, CH - half + 20); ctx.lineTo(CW, CH - half + 20);
    ctx.stroke();
  }
  ctx.restore();
  if (e > 0.45)
    glowText(ctx, label, CW / 2, CH / 2 + 8, 30, PAL.ink, {align: "center", font: SFONT, weight: 700, alpha: sClamp01((e - 0.45) / 0.2), glow: NOGLOW});
};

/* ═════════════ k00 · 开场标题卡 ═════════════ */
const drawK00 = (ctx: CanvasRenderingContext2D, f: number, t: number, shot: Shot) => {
  const si = sentIdx(shot, f);
  // 背景点阵 + 齿轮
  for (let i = 0; i < 90; i++)
    sDot(ctx, sRnd(i * 3.3) * W, sRnd(i * 7.7) * H, 1.6 + sRnd(i) * 2, PAL.ink, 0.1);
  if (si >= 4)
    paintDots(ctx, gearDots(300, 700, 78, 12, f * 0.01, 2.2), {frame: f, warmth: 0.3, alpha: 0.2});
  // 中央标题板
  const titleP = popAt(shot, f, 1, 22);
  plate(ctx, 460, 300, 1000, 130, {alpha: titleP, fill: "rgba(10,16,28,.95)", stroke: PAL.warm, line: 2.4});
  hazardBar(ctx, 460, 432, 1000, 8, {alpha: 0.8});
  glowText(ctx, "Attention Is All You Need", 960, 370, 56, "#ffffff", {align: "center", font: SMONO, alpha: titleP, weight: 900, glow: "rgba(255,61,0,.6)"});
  // 论文信息
  if (si >= 3) {
    const p = popAt(shot, f, 3);
    plate(ctx, 560, 470, 800, 64, {alpha: p, fill: PLATE_FILL, stroke: PAL.ink, line: 1.6});
    glowText(ctx, "Google Brain · 2017 · 谷歌大脑", 960, 514, 26, C_MINT, {align: "center", font: SMONO, alpha: p, weight: 700, glow: NOGLOW});
  }
  // 为什么值得看
  if (si >= 4) {
    const p = popAt(shot, f, 4);
    plate(ctx, 520, 610, 880, 84, {alpha: p, fill: "rgba(30,10,6,.94)", stroke: PAL.warm, line: 2});
    glowText(ctx, "你用的输入法 · 客服 · AI 助手", 960, 668, 34, "#ffd9c9", {align: "center", alpha: p, weight: 900, glow: NOGLOW});
    if (si >= 6) {
      const p6 = popAt(shot, f, 6);
      glowText(ctx, "底层都是它 — 大语言模型的心脏", 960, 760, 30, "#ffffff", {align: "center", alpha: p6, weight: 800, glow: "rgba(255,210,30,.4)"});
    }
  }
  if (si >= 4) {
    const p = popAt(shot, f, 4);
    paintDots(ctx, gearDots(1620, 640, 66, 10, -f * 0.012, 2.2), {frame: f, warmth: 0.4, alpha: 0.18});
  }
};

/* ═════════════ k01 · 钩子 ═════════════ */
const drawK01 = (ctx: CanvasRenderingContext2D, f: number, t: number, shot: Shot) => {
  const si = sentIdx(shot, f);
  drawGhost(ctx, "注意力", 960, 430, 900, si >= 3 ? 0.16 : 0.07, 0.1, f);
  // 聊天气泡 + 三个结果
  const bp = popAt(shot, f, 0);
  if (bp > 0) {
    plate(ctx, 420, 330, 480, 92, {alpha: bp, fill: PLATE_FILL, stroke: PAL.ink});
    glowText(ctx, "帮我订明天的闹钟", 660, 386, 34, "#dfe9ff", {align: "center", alpha: bp, glow: NOGLOW});
    const res = ["⏰ 明天 07:00", "✓ 听懂了意思", "✗ 不是后天"];
    res.forEach((r, i) => {
      const p = popAt(shot, f, 1, 16 + i * 6);
      if (p <= 0) return;
      const y = 260 + i * 90;
      plate(ctx, 1040, y, 380, 70, {alpha: p, fill: PLATE_FILL, stroke: i === 2 ? PAL.warm : S.green, line: i === 2 ? 2.4 : 1.6});
      glowText(ctx, r, 1230, y + 46, 28, i === 2 ? "#ffb38a" : "#b8f5d8", {align: "center", alpha: p, glow: NOGLOW});
    });
  }
  if (si >= 2) {
    const p = popAt(shot, f, 2);
    plate(ctx, 560, 680, 800, 96, {alpha: p, fill: "rgba(10,16,28,.95)", stroke: C_MINT, line: 2});
    glowText(ctx, "Attention Is All You Need · 2017", 960, 740, 34, C_MINT, {align: "center", font: SMONO, alpha: p, weight: 700, glow: NOGLOW});
  }
  if (si >= 3) {
    const p = popAt(shot, f, 3);
    glowText(ctx, "答案是：注意力", 960, 540, 54, "#ffffff", {align: "center", alpha: p, glow: "rgba(255,61,0,.6)"});
  }
  if (si >= 4) {
    const p = popAt(shot, f, 4);
    plate(ctx, 760, 820, 400, 56, {alpha: p, fill: "rgba(30,10,6,.94)", stroke: PAL.warm});
    glowText(ctx, "10 分钟 · 从零看懂", 960, 858, 28, "#ffd9c9", {align: "center", alpha: p, weight: 800, glow: NOGLOW});
  }
};

/* ═════════════ k02 · 数字 ═════════════ */
const drawK02 = (ctx: CanvasRenderingContext2D, f: number, t: number, shot: Shot) => {
  const si = sentIdx(shot, f);
  const p1 = popAt(shot, f, 1);
  plate(ctx, 260, 380, 300, 140, {alpha: p1, fill: PLATE_FILL, stroke: PAL.ink, line: 2});
  glowText(ctx, "猫", 410, 470, 72, "#dfe9ff", {align: "center", alpha: p1, glow: NOGLOW});
  if (si >= 2) {
    const p2 = popAt(shot, f, 2);
    sLine(ctx, 570, 450, 570 + 120 * p2, 450, 3, PAL.ink, 0.7);
    glowText(ctx, "→", 640, 462, 34, PAL.ink, {alpha: p2, glow: NOGLOW});
  }
  if (si >= 3) {
    const p3 = popAt(shot, f, 3);
    const dots = gridDots({x: 740, y: 360, w: 60, h: 360, cols: 2, rows: 10, value: (r) => 0.3 + 0.7 * sRnd(r * 7)});
    paintDots(ctx, dots, {frame: f, warmth: 0.25, alpha: p3});
    isoBox(ctx, 790, 540, 100, 420, 14, {alpha: p3, color: PAL.ink});
    glowText(ctx, "[ 0.21, 1.37, 0.04, … ]", 900, 560, 26, "#dfe9ff", {alpha: p3, font: SMONO, weight: 600, glow: NOGLOW});
  }
  if (si >= 4) {
    const p = popAt(shot, f, 4);
    glowText(ctx, "512 个数字 = 一个词的身份证号", 1180, 400, 28, C_MINT, {alpha: p, weight: 800, glow: NOGLOW});
  }
  if (si >= 5) {
    const p = popAt(shot, f, 5);
    // 相似度散点
    sLine(ctx, 700, 860, 1700, 860, 2, PAL.ink, 0.5);
    const words: [string, number, number][] = [["猫", 900, 780], ["狗", 1010, 820], ["卫星", 1520, 760], ["跑道", 1380, 830], [" кошка", 960, 745]];
    words.forEach(([w, x, y], i) => {
      sDot(ctx, x, y, 9, i < 2 ? PAL.warm : PAL.ink, p * 0.95);
      glowText(ctx, w, x, y - 22, 24, i < 2 ? "#ffb38a" : "#dfe9ff", {align: "center", alpha: p, weight: 700, glow: NOGLOW});
    });
    arc(ctx, 900, 780, 1010, 820, -40, S.green, p, 3);
    glowText(ctx, "近", 960, 830, 22, S.green, {align: "center", alpha: p, weight: 800, glow: NOGLOW});
    arc(ctx, 920, 780, 1520, 770, -120, PAL.warm, p * 0.8, 2);
    ctx.save();
    ctx.setLineDash([10, 8]);
    sLine(ctx, 940, 790, 1500, 775, 2, PAL.warm, p * 0.6);
    ctx.restore();
    glowText(ctx, "远", 1240, 700, 22, PAL.warm, {align: "center", alpha: p, weight: 800, glow: NOGLOW});
  }
};

/* ═════════════ k03 · 旧读法（传送带） ═════════════ */
const drawK03 = (ctx: CanvasRenderingContext2D, f: number, t: number, shot: Shot) => {
  const si = sentIdx(shot, f);
  const WORDS3 = ["The", "cat", "sat", "because", "it", "was"];
  // 传送带
  sLine(ctx, 180, 620, 1780, 620, 4, PAL.ink, 0.7);
  for (let x = 220; x < 1780; x += 90) {
    const rot = f * 0.04;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(x, 640, 16, rot, rot + Math.PI);
    ctx.moveTo(x - 16, 640); ctx.lineTo(x + 16, 640);
    ctx.stroke();
    ctx.restore();
  }
  // 机器（漏斗/舱）
  isoBox(ctx, 300, 560, 200, 220, 20, {alpha: 0.9, color: PAL.warm});
  glowText(ctx, "RNN", 300, 580, 40, PAL.warm, {align: "center", glow: "rgba(255,61,0,.5)"});
  glowText(ctx, "循环神经网络", 300, 700, 22, "#c3d8ea", {align: "center", alpha: 0.85, glow: NOGLOW});
  // 词块沿带左移进入机器
  WORDS3.forEach((wd, i) => {
    const speed = 2.6;
    const x = 1900 - (((f * speed + i * 260) % 2100));
    if (x < 430) return;
    const a = 0.95;
    plate(ctx, x - 70, 540, 140, 64, {alpha: a, fill: PLATE_FILL, stroke: PAL.ink, line: 1.5});
    glowText(ctx, wd, x, 582, 26, "#dfe9ff", {align: "center", alpha: a, glow: NOGLOW});
  });
  // 记忆条：读入的词依次点亮，旧的变暗
  glowText(ctx, "记忆", 180, 830, 24, S.muted, {font: SFONT, alpha: 0.85, glow: NOGLOW});
  WORDS3.forEach((wd, i) => {
    const enterT = 400 + i * 210; // 第 i 个词进入机器的帧
    const age = f - enterT;
    if (age < 0) return;
    const a = Math.max(0.14, 1 - age / 420);
    plate(ctx, 300 + i * 150, 780, 130, 84, {alpha: a, fill: PLATE_FILL, stroke: a > 0.5 ? PAL.ink : S.dim, line: 1.4});
    glowText(ctx, wd, 365 + i * 150, 832, 24, a > 0.5 ? "#dfe9ff" : "#5a6a86", {align: "center", alpha: a, glow: NOGLOW});
    if (si >= 2 && a <= 0.4) hazardBar(ctx, 300 + i * 150, 780, 130, 8, {alpha: 0.7});
  });
  if (si >= 2) {
    const p = popAt(shot, f, 2);
    glowText(ctx, "读完就忘", 1400, 500, 34, PAL.warm, {alpha: p, weight: 800, glow: "rgba(255,61,0,.4)"});
  }
  if (si >= 4) {
    const p = popAt(shot, f, 4);
    plate(ctx, 1180, 380, 480, 64, {alpha: p, fill: "rgba(30,10,6,.94)", stroke: PAL.warm});
    glowText(ctx, "必须等上一个读完，才能读下一个", 1420, 422, 26, "#ffd9c9", {align: "center", alpha: p, weight: 700, glow: NOGLOW});
  }
  if (si >= 7) {
    const p = popAt(shot, f, 7);
    glowText(ctx, "所有模型都堵在这条带上", 960, 910, 30, PAL.ink, {align: "center", alpha: p, weight: 800, glow: NOGLOW});
  }
};

/* ═════════════ k04 · 破局 ═════════════ */
const drawK04 = (ctx: CanvasRenderingContext2D, f: number, t: number, shot: Shot) => {
  const si = sentIdx(shot, f);
  const WORDS4 = ["The", "cat", "sat", "because", "it", "was"];
  const WX = (i: number) => 300 + i * 260;
  WORDS4.forEach((wd, i) => {
    const p = si >= 1 ? popAt(shot, f, 1, 14 + i * 4) : 0;
    if (p <= 0) return;
    plate(ctx, WX(i) - 80, 620, 160, 84, {alpha: p, fill: PLATE_FILL, stroke: PAL.ink, line: 1.6});
    glowText(ctx, wd, WX(i), 672, 28, "#dfe9ff", {align: "center", alpha: p, glow: NOGLOW});
  });
  // 全连接弧线
  if (si >= 1) {
    for (let i = 0; i < 6; i++)
      for (let j = i + 1; j < 6; j++) {
        const bow = ((i + j) % 2 ? 1 : -1) * (60 + 70 * sRnd(i * 7 + j * 3));
        arc(ctx, WX(i), 620, WX(j), 620, bow, C_MINT, 0.14 + 0.26 * sRnd(i * 7 + j), 1.6);
      }
    for (let p2 = 0; p2 < 4; p2++) {
      const i = Math.floor(sRnd(p2 * 11 + 2) * 5);
      const j = i + 1 + Math.floor(sRnd(p2 * 13 + 1) * (5 - i));
      const bow = ((i + j) % 2 ? 1 : -1) * (60 + 70 * sRnd(i * 7 + j * 3));
      const u = (f * 0.012 + sRnd(p2 * 17) * 3) % 1;
      const mx = (WX(i) + WX(j)) / 2, my = 620 + bow;
      const px = (1 - u) * (1 - u) * WX(i) + 2 * (1 - u) * u * mx + u * u * WX(j);
      const py = (1 - u) * (1 - u) * 620 + 2 * (1 - u) * u * my + u * u * 620;
      sDot(ctx, px, py, 5, PAL.warm, 0.9);
    }
  }
  plate(ctx, 560, 240, 800, 110, {alpha: 1, fill: "rgba(10,16,28,.95)", stroke: C_MINT, line: 2.2});
  hazardBar(ctx, 560, 352, 800, 8, {alpha: 0.8});
  glowText(ctx, "Attention Is All You Need", 960, 300, 44, "#ffffff", {align: "center", font: SMONO, weight: 800, glow: "rgba(94,234,212,.4)"});
  glowText(ctx, "2017 · Google · 8 位研究员", 960, 340, 22, S.muted, {align: "center", font: SFONT, alpha: 0.9, glow: NOGLOW});
  if (si >= 2) {
    const p = popAt(shot, f, 2);
    glowText(ctx, "所有词，同时看见所有词", 960, 470, 40, PAL.ink, {align: "center", alpha: p, weight: 900, glow: "rgba(255,210,30,.4)"});
  }
  if (si >= 5) {
    const p = popAt(shot, f, 5);
    glowText(ctx, "注意力，就是一切", 960, 880, 36, C_MINT, {align: "center", alpha: p, weight: 800, glow: "rgba(94,234,212,.5)"});
  }
};

/* ═════════════ k05 · 例句 ═════════════ */
const drawK05 = (ctx: CanvasRenderingContext2D, f: number, t: number, shot: Shot) => {
  const si = sentIdx(shot, f);
  const WORDS5 = ["The", "cat", "sat", "because", "it", "was", "tired"];
  const WX = (i: number) => 250 + i * 235;
  WORDS5.forEach((wd, i) => {
    const p = popAt(shot, f, 1, 12 + i * 3);
    if (p <= 0) return;
    const hot = i === 4;
    plate(ctx, WX(i) - 78, 480, 156, 84, {alpha: p, fill: hot ? "rgba(30,10,6,.95)" : PLATE_FILL, stroke: hot ? PAL.warm : PAL.ink, line: hot ? 2.6 : 1.5});
    if (hot) hazardBar(ctx, WX(i) - 78, 480, 156, 8, {alpha: 0.9});
    glowText(ctx, wd, WX(i), 532, 28, hot ? "#ffb38a" : "#dfe9ff", {align: "center", alpha: p, glow: NOGLOW});
  });
  if (si >= 2) {
    const p = popAt(shot, f, 2);
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = PAL.warm;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(WX(4), 522, 96 + 5 * Math.sin(f * 0.15), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    plate(ctx, 560, 700, 800, 84, {alpha: p, fill: PLATE_FILL, stroke: PAL.ink, line: 1.6});
    glowText(ctx, "猫坐下了，因为它累了", 960, 754, 36, "#dfe9ff", {align: "center", alpha: p, glow: NOGLOW});
  }
  if (si >= 3) {
    const p = popAt(shot, f, 3);
    arc(ctx, WX(4), 480, WX(1), 480, -110, PAL.warm, p, 4);
    sDot(ctx, WX(1), 480, 10, PAL.warm, p);
    glowText(ctx, "it → cat", (WX(4) + WX(1)) / 2, 330, 34, PAL.warm, {align: "center", alpha: p, weight: 900, glow: "rgba(255,61,0,.5)"});
  }
  if (si >= 5) {
    const p = popAt(shot, f, 5);
    plate(ctx, WX(4) - 78, 580, 156, 56, {alpha: p, fill: "rgba(10,16,28,.95)", stroke: S.dim, line: 1.3});
    glowText(ctx, "编号 #9182", WX(4), 618, 20, "#8fa3c0", {align: "center", font: SMONO, alpha: p, weight: 600, glow: NOGLOW});
  }
  if (si >= 6) {
    const p = popAt(shot, f, 6);
    glowText(ctx, "机器需要一套方法，算出它指的是谁", 960, 860, 30, PAL.ink, {align: "center", alpha: p, weight: 800, glow: NOGLOW});
  }
};

/* ═════════════ k06 · Q K V ═════════════ */
const MODS6 = [
  {x: 420, name: "Q", en: "QUERY", zh: "问题", color: PAL.warm},
  {x: 960, name: "K", en: "KEY", zh: "标签", color: PAL.ink},
  {x: 1500, name: "V", en: "VALUE", zh: "内容", color: C_MINT},
];
const drawK06 = (ctx: CanvasRenderingContext2D, f: number, t: number, shot: Shot) => {
  const si = sentIdx(shot, f);
  const active = si <= 1 ? 0 : si <= 4 ? 1 : 2;
  MODS6.forEach((m, i) => {
    const startSi = [1, 3, 5][i];
    const p = popAt(shot, f, startSi, 16);
    if (p <= 0) return;
    const on = i === active;
    const a = on ? 0.95 : 0.34;
    isoBox(ctx, m.x, 520, 300 * (0.7 + 0.3 * p), 300 * (0.7 + 0.3 * p), 26 * p, {alpha: a, color: m.color, fill: on});
    glowText(ctx, m.name, m.x, 500, 88, m.color, {alpha: a, align: "center", glow: `${m.color}88`});
    glowText(ctx, m.zh, m.x, 660, 28, "#c3d8ea", {align: "center", alpha: a, weight: 800, glow: NOGLOW});
    glowText(ctx, m.en, m.x, 336, 16, S.muted, {align: "center", font: SMONO, alpha: 0.75, weight: 600, glow: NOGLOW});
    if (on) paintDots(ctx, gearDots(m.x, 520, 66, 10, f * 0.02 * (i % 2 ? -1 : 1), 2), {frame: f, warmth: i === 2 ? 0.15 : 0.5, alpha: 0.15});
  });
  // Q 舱：问题卡
  if (si >= 2) {
    const p = popAt(shot, f, 2);
    plate(ctx, 300, 740, 240, 60, {alpha: p, fill: "rgba(30,10,6,.94)", stroke: PAL.warm});
    glowText(ctx, "我指的是谁？", 420, 780, 24, "#ffd9c9", {align: "center", alpha: p, weight: 700, glow: NOGLOW});
  }
  // K 舱：书脊标签
  if (si >= 4) {
    const p = popAt(shot, f, 4);
    const tags = ["动物", "动作", "代词"];
    tags.forEach((tag, i) => {
      plate(ctx, 840 + i * 84, 700, 72, 100, {alpha: p * (i === 2 ? 1 : 0.75), fill: PLATE_FILL, stroke: PAL.ink, line: 1.4});
      ctx.save();
      ctx.globalAlpha = p;
      ctx.translate(876 + i * 84, 750);
      ctx.rotate(-Math.PI / 2);
      glowText(ctx, tag, 0, 8, 18, "#dfe9ff", {align: "center", weight: 700, glow: NOGLOW});
      ctx.restore();
    });
  }
  // V 舱：内容点阵
  if (si >= 6) {
    const p = popAt(shot, f, 6);
    const dots = gridDots({x: 1440, y: 440, w: 120, h: 160, cols: 5, rows: 6, value: (r, c) => 0.3 + 0.6 * sRnd(r * 5 + c)});
    paintDots(ctx, dots, {frame: f, warmth: 0.15, alpha: p});
    glowText(ctx, "真正携带的信息", 1500, 700, 20, "#b8f5d8", {align: "center", alpha: p, weight: 700, glow: NOGLOW});
  }
  if (si >= 7) {
    const p = popAt(shot, f, 7);
    plate(ctx, 610, 880, 700, 64, {alpha: p, fill: "rgba(10,16,28,.95)", stroke: C_MINT, line: 1.8});
    glowText(ctx, "图书馆：带问题 · 扫标签 · 取内容", 960, 880, 28, C_MINT, {align: "center", alpha: p, weight: 800, glow: NOGLOW});
  }
  if (si >= 9) {
    const p = popAt(shot, f, 9);
    glowText(ctx, "三张工牌，都从词的身份证号变出来", 960, 300, 26, S.muted, {align: "center", alpha: p, weight: 700, glow: NOGLOW});
  }
};

/* ═════════════ k07 · 打分 ═════════════ */
const SCORES7 = [0.28, 0.62, 0.86, 0.34, 0.18];
const drawK07 = (ctx: CanvasRenderingContext2D, f: number, t: number, shot: Shot) => {
  const si = sentIdx(shot, f);
  const qx = 380, qy = 560;
  const ks = SCORES7.map((s, i) => ({x: 1180 + i * 170, y: 300 + i * 130, s}));
  const gv = 15 + 71 * sEase(sClamp01((t - 0.08) / 0.3));
  gauge(ctx, qx, qy, 84, gv, {alpha: 0.96, label: "Q · it", max: 100});
  ringTicks(ctx, qx, qy, 108, 24, f * 0.004, {alpha: 0.28});
  ks.forEach((k, i) => {
    const reveal = sClamp01((t - 0.15 - i * 0.09) / 0.22);
    if (reveal <= 0) return;
    const hot = k.s > 0.7;
    ctx.save();
    if (!hot) ctx.setLineDash([9, 7]);
    sLine(ctx, qx + 26, qy, qx + 26 + (k.x - qx - 46) * reveal, qy + (k.y - qy) * reveal, hot ? 5 : 1.8, hot ? PAL.warm : PAL.ink, hot ? 0.95 : 0.5);
    ctx.restore();
    sDot(ctx, k.x, k.y, 10, hot ? PAL.warm : PAL.ink, reveal);
    if (hot) ringTicks(ctx, k.x, k.y, 27, 12, f * 0.01, {alpha: reveal * 0.8, color: PAL.warm, len: 8});
    const last = i === ks.length - 1;
    glowText(ctx, (k.s * 100).toFixed(0), last ? k.x - 26 : k.x + 26, k.y + 8, 22, hot ? PAL.warm : PAL.ink, {alpha: reveal, weight: 700, font: SMONO, glow: NOGLOW, align: last ? "right" : "left"});
  });
  const hotK = ks[2];
  if (t > 0.35) {
    const u = (f * 0.02) % 1;
    sDot(ctx, qx + 26 + (hotK.x - qx - 46) * u, qy + (hotK.y - qy) * u, 6, "#ffd9c9", 0.9);
  }
  const hotA = sClamp01((t - 0.5) / 0.2);
  if (hotA > 0) {
    plate(ctx, hotK.x - 128, hotK.y - 112, 200, 44, {alpha: hotA, fill: "rgba(30,10,6,.94)", stroke: PAL.warm});
    glowText(ctx, "最强：cat", hotK.x - 28, hotK.y - 82, 24, PAL.warm, {align: "center", alpha: hotA, weight: 800, glow: NOGLOW});
  }
  glowText(ctx, "分数 = 问题 × 标签", 300, 215, 24, S.muted, {font: SFONT, alpha: 0.8, weight: 700, glow: NOGLOW});
  if (si >= 5) {
    const p = popAt(shot, f, 5);
    glowText(ctx, "乘法 = 两个号码有多像", 300, 260, 22, "#8fa3c0", {alpha: p, weight: 600, glow: NOGLOW});
  }
};

/* ═════════════ k08 · softmax ═════════════ */
const drawK08 = (ctx: CanvasRenderingContext2D, f: number, t: number, shot: Shot) => {
  const si = sentIdx(shot, f);
  const ex = SCORES7.map((v) => Math.exp(v * 3));
  const sum = ex.reduce((a, b) => a + b, 0);
  const probs = ex.map((e) => e / sum);
  const mStart = shot.sentences[Math.min(3, shot.sentences.length - 1)].start;
  const morph = sEase(sClamp01((f - mStart) / 70));
  sLine(ctx, 280, 862, 1280, 862, 3, PAL.ink, 0.6);
  for (let x = 280; x <= 1280; x += 50) sLine(ctx, x, 862, x, 871, 1.4, PAL.ink, 0.4);
  SCORES7.forEach((v, i) => {
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
  glowText(ctx, "Σ = 100%", 1375, 852, 24, C_MINT, {align: "center", alpha: morph, weight: 800, glow: NOGLOW});
  // 图例
  plate(ctx, 300, 396, 128, 46, {alpha: 0.8, fill: PLATE_FILL, stroke: PAL.ink, line: 1.4});
  glowText(ctx, "分数", 364, 428, 24, PAL.ink, {align: "center", weight: 800, glow: NOGLOW});
  sLine(ctx, 438, 419, 502, 419, 2, PAL.ink, 0.5);
  sDot(ctx, 470 + 30 * Math.sin(f * 0.06), 419, 4.5, PAL.warm, 0.85);
  plate(ctx, 512, 396, 128, 46, {alpha: 0.8, fill: "rgba(30,10,6,.92)", stroke: PAL.warm, line: 1.4});
  glowText(ctx, "权重", 576, 428, 24, PAL.warm, {align: "center", weight: 800, glow: NOGLOW});
  glowText(ctx, "softmax：分数 → 百分比", 320, 300, 24, S.muted, {font: SFONT, alpha: 0.8, weight: 700, glow: NOGLOW});
  if (si >= 5) {
    const p = popAt(shot, f, 5);
    glowText(ctx, "cat 拿走最大的一块", 620, 300, 28, PAL.warm, {alpha: p, weight: 800, glow: NOGLOW});
  }
};

/* ═════════════ k09 · 取回 ═════════════ */
const drawK09 = (ctx: CanvasRenderingContext2D, f: number, t: number, shot: Shot) => {
  const si = sentIdx(shot, f);
  const ex = SCORES7.map((v) => Math.exp(v * 3));
  const sum = ex.reduce((a, b) => a + b, 0);
  const probs = ex.map((e) => e / sum);
  const morph = sEase(sClamp01(t / 0.4));
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
    if (hotCol && t > 0.3) {
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
  const t2 = sClamp01((t - 0.4) / 0.4);
  for (let i = 0; i < 24; i++) {
    const p = sClamp01(t2 * 1.3 - sRnd(i) * 0.4);
    if (p <= 0 || p >= 1) continue;
    const x = 1000 + (1430 - 1000) * sEase(p);
    const y = 520 - Math.sin(p * Math.PI) * 80 + (sRnd(i + 40) - 0.5) * 44;
    sLine(ctx, x - 26, y, x, y, 2, i % 2 ? S.green : "#d8ffe9", 0.5);
    sDot(ctx, x, y, 5.5, i % 2 ? S.green : "#d8ffe9", 0.9);
  }
  const oa = sClamp01((t - 0.45) / 0.3);
  isoBox(ctx, 1480, 520, 130, 310, 20, {alpha: oa, color: S.green});
  ctx.save();
  ctx.globalAlpha = oa * 0.9;
  ctx.fillStyle = S.green;
  for (let i = 0; i < 8; i++) ctx.fillRect(1436, 396 + i * 30, 88 * (0.4 + 0.5 * sRnd(i + 3)), 14);
  ctx.restore();
  glowText(ctx, "新含义", 1480, 730, 30, S.green, {align: "center", alpha: sClamp01((t - 0.55) / 0.25), weight: 800, glow: NOGLOW});
  if (si >= 4) {
    const p = popAt(shot, f, 4);
    plate(ctx, 380, 300, 380, 56, {alpha: p, fill: "rgba(10,16,28,.95)", stroke: PAL.ink, line: 1.5});
    glowText(ctx, "是一串新数字，不是新词", 570, 338, 24, "#dfe9ff", {align: "center", alpha: p, weight: 700, glow: NOGLOW});
  }
  if (si >= 6) {
    const p = popAt(shot, f, 6);
    glowText(ctx, "it 自带：我是那只猫", 1480, 800, 30, C_MINT, {align: "center", alpha: p, weight: 900, glow: "rgba(94,234,212,.5)"});
  }
};

/* ═════════════ k10 · 多头 ═════════════ */
const MP10 = [
  (i: number, j: number) => (i === j ? 0.95 : 0.06),
  (i: number, j: number) => (i === 0 ? 0.85 : 0.08),
  (i: number, j: number) => (Math.abs(i - j) <= 1 ? 0.8 : 0.05),
  (i: number, j: number) => (i >= j ? 0.7 : 0.04),
  (i: number, j: number) => (i + j === 4 ? 0.9 : 0.05),
  (i: number, j: number) => (j === 2 ? 0.8 : 0.06),
  (i: number, j: number) => (Math.abs(i - j) === 2 ? 0.7 : 0.06),
  (i: number, j: number) => (Math.abs(i - 2) + Math.abs(j - 2) < 2 ? 0.85 : 0.05),
];
const TAGS10: Record<number, string> = {0: "指代", 1: "相邻", 2: "因果"};
const drawK10 = (ctx: CanvasRenderingContext2D, f: number, t: number, shot: Shot) => {
  const si = sentIdx(shot, f);
  for (let k = 0; k < 8; k++) {
    const p = popAt(shot, f, 1, 12 + k * 4);
    if (p <= 0) continue;
    const x = 170 + k * 226, y = 380;
    const a = 0.92 * p;
    plate(ctx, x - 82, y - 82, 164, 164, {alpha: a, fill: PLATE_FILL, stroke: PAL.ink, line: 1.5});
    const dots: Dot[] = [];
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 5; c++) {
        const v = MP10[k](r, c);
        if (v < 0.2) continue;
        dots.push({x: x - 62 + c * 31, y: y - 62 + r * 31, r: 4 + v * 8});
      }
    paintDots(ctx, dots, {frame: f, warmth: k % 2 ? 0.22 : 0.88, alpha: a});
    glowText(ctx, "H" + (k + 1), x, y + 112, 18, S.muted, {alpha: 0.7 * p, align: "center", weight: 700, font: SMONO, glow: NOGLOW});
    const tag = TAGS10[k];
    if (tag) {
      ctx.save();
      ctx.globalAlpha = 0.9 * p * sClamp01((since(shot, f, 2 + k)) / 20);
      ctx.fillStyle = C_MINT;
      ctx.font = `700 22px ${SFONT}`;
      ctx.textAlign = "center";
      ctx.fillText(tag, x, y + 146);
      ctx.restore();
    }
  }
  if (si >= 5) {
    const p = popAt(shot, f, 5);
    for (let k = 0; k < 8; k++) {
      const x = 170 + k * 226;
      sLine(ctx, x, 560, 960 + (x - 960) * 0.25, 700, 1.6, PAL.ink, 0.4 * p);
    }
    plate(ctx, 610, 700, 700, 84, {alpha: p, fill: "rgba(10,16,28,.95)", stroke: C_MINT, line: 2});
    glowText(ctx, "8 个角度，拼成完整理解", 960, 754, 34, C_MINT, {align: "center", alpha: p, weight: 900, glow: "rgba(94,234,212,.5)"});
  }
  if (si >= 6) {
    const p = popAt(shot, f, 6);
    glowText(ctx, "Multi-Head Attention", 960, 880, 30, S.muted, {align: "center", font: SMONO, alpha: p, weight: 700, glow: NOGLOW});
  }
};

/* ═════════════ k11 · 位置 ═════════════ */
const drawK11 = (ctx: CanvasRenderingContext2D, f: number, t: number, shot: Shot) => {
  const si = sentIdx(shot, f);
  const WORDS11 = ["猫", "追", "狗"];
  const WX = (i: number) => 660 + i * 300;
  WORDS11.forEach((wd, i) => {
    const p = popAt(shot, f, 2, 14 + i * 4);
    if (p <= 0) return;
    plate(ctx, WX(i) - 80, 380, 160, 92, {alpha: p, fill: PLATE_FILL, stroke: PAL.ink, line: 1.8});
    glowText(ctx, wd, WX(i), 440, 40, "#dfe9ff", {align: "center", alpha: p, glow: NOGLOW});
    plate(ctx, WX(i) + 18, 352, 62, 40, {alpha: p, fill: "rgba(10,16,28,.95)", stroke: C_MINT, line: 1.4});
    glowText(ctx, `P${i + 1}`, WX(i) + 49, 381, 20, C_MINT, {align: "center", font: SMONO, alpha: p, weight: 700, glow: NOGLOW});
  });
  if (si >= 1) {
    const p = popAt(shot, f, 1);
    plate(ctx, 240, 620, 340, 72, {alpha: p, fill: "rgba(13,22,38,.94)", stroke: S.green, line: 1.6});
    glowText(ctx, "猫追狗 ✓", 410, 668, 30, "#b8f5d8", {align: "center", alpha: p, weight: 800, glow: NOGLOW});
    plate(ctx, 240, 730, 340, 72, {alpha: p, fill: "rgba(30,10,6,.94)", stroke: PAL.warm, line: 1.6});
    glowText(ctx, "狗追猫 ✗ 意思反了", 410, 778, 26, "#ffd9c9", {align: "center", alpha: p, weight: 700, glow: NOGLOW});
  }
  // 波形印章
  if (si >= 3) {
    const p = popAt(shot, f, 3);
    for (let r = 0; r < 2; r++) {
      const pts: Dot[] = [];
      for (let i = 0; i <= 80; i++) {
        const x = 620 + i * 10.5;
        const freq = Math.pow(100, -r) * 0.9;
        pts.push({x, y: 880 + r * 44 + Math.sin((x - 620) * 0.02 * freq * 10 + f * 0.03) * 16, r: 2.6});
      }
      paintDots(ctx, pts, {frame: f, warmth: 0.15 + r * 0.2, alpha: p});
    }
    glowText(ctx, "每个位置 = 独一无二的波形印章", 960, 820, 26, C_MINT, {align: "center", alpha: p, weight: 800, glow: NOGLOW});
  }
  if (si >= 6) {
    const p = popAt(shot, f, 6);
    plate(ctx, 700, 240, 520, 60, {alpha: p, fill: "rgba(10,16,28,.95)", stroke: PAL.ink, line: 1.6});
    glowText(ctx, "新号码 = 身份证号 + 印章", 960, 280, 28, "#dfe9ff", {align: "center", alpha: p, weight: 800, glow: NOGLOW});
  }
};

/* ═════════════ k12 · 架构 ═════════════ */
const drawK12 = (ctx: CanvasRenderingContext2D, f: number, t: number, shot: Shot) => {
  const si = sentIdx(shot, f);
  // 左塔 编码器
  glowText(ctx, "编码器 · 读懂", 480, 250, 26, PAL.ink, {align: "center", weight: 800, glow: NOGLOW});
  for (let i = 0; i < 6; i++) {
    const p = popAt(shot, f, 1, 10 + i * 5);
    if (p <= 0) continue;
    plate(ctx, 360, 320 + i * 82, 240, 64, {alpha: 0.9 * p, fill: PLATE_FILL, stroke: PAL.ink, line: 1.4});
    glowText(ctx, `ENC ${6 - i}`, 480, 362 + i * 82, 20, S.muted, {align: "center", font: SMONO, alpha: 0.8 * p, weight: 600, glow: NOGLOW});
  }
  // 右塔 解码器
  glowText(ctx, "解码器 · 生成", 1440, 250, 26, C_MINT, {align: "center", weight: 800, glow: NOGLOW});
  for (let i = 0; i < 6; i++) {
    const p = popAt(shot, f, 3, 10 + i * 5);
    if (p <= 0) continue;
    plate(ctx, 1320, 320 + i * 82, 240, 64, {alpha: 0.9 * p, fill: PLATE_FILL, stroke: C_MINT, line: 1.4});
    glowText(ctx, `DEC ${6 - i}`, 1440, 362 + i * 82, 20, S.muted, {align: "center", font: SMONO, alpha: 0.8 * p, weight: 600, glow: NOGLOW});
  }
  // 输入词卡 → 左塔
  const inWords = ["猫", "坐", "因为", "它", "累"];
  inWords.forEach((wd, i) => {
    const p = popAt(shot, f, 2, 10 + i * 6);
    if (p <= 0) return;
    plate(ctx, 60, 340 + i * 96, 150, 62, {alpha: p, fill: PLATE_FILL, stroke: PAL.ink, line: 1.3});
    glowText(ctx, wd, 135, 381 + i * 96, 24, "#dfe9ff", {align: "center", alpha: p, glow: NOGLOW});
    sLine(ctx, 214, 371 + i * 96, 356, 371 + i * 96, 1.6, PAL.ink, 0.45 * p);
  });
  // 输出词卡 ← 右塔
  const outWords = ["The", "cat", "sat"];
  outWords.forEach((wd, i) => {
    const p = popAt(shot, f, 4, 12 + i * 14);
    if (p <= 0) return;
    plate(ctx, 1720, 360 + i * 110, 150, 62, {alpha: p, fill: "rgba(13,22,38,.94)", stroke: C_MINT, line: 1.3});
    glowText(ctx, wd, 1795, 401 + i * 110, 24, "#b8f5d8", {align: "center", alpha: p, glow: NOGLOW});
  });
  // 中间桥
  if (si >= 5) {
    const p = popAt(shot, f, 5);
    sLine(ctx, 610, 560, 1310, 560, 3, PAL.warm, 0.75 * p);
    for (let i = 0; i < 3; i++) {
      const u = (f * 0.012 + i * 0.33) % 1;
      sDot(ctx, 610 + 700 * u, 560, 6, PAL.warm, 0.9 * p);
    }
    ringTicks(ctx, 960, 560, 46, 16, f * 0.008, {alpha: 0.7 * p, color: PAL.warm, len: 10});
    glowText(ctx, "注意力", 960, 640, 30, PAL.warm, {align: "center", alpha: p, weight: 900, glow: "rgba(255,61,0,.5)"});
  }
  if (si >= 6) {
    const p = popAt(shot, f, 6);
    plate(ctx, 760, 880, 400, 60, {alpha: p, fill: "rgba(13,22,38,.94)", stroke: PAL.ink, line: 1.5});
    glowText(ctx, "中文 → English", 960, 880, 28, "#dfe9ff", {align: "center", alpha: p, weight: 800, glow: NOGLOW});
  }
};

/* ═════════════ k13 · 训练 ═════════════ */
const drawK13 = (ctx: CanvasRenderingContext2D, f: number, t: number, shot: Shot) => {
  const si = sentIdx(shot, f);
  // 填空题卡
  plate(ctx, 260, 320, 1400, 110, {alpha: popAt(shot, f, 1), fill: PLATE_FILL, stroke: PAL.ink, line: 2});
  glowText(ctx, "The cat sat because", 430, 390, 36, "#dfe9ff", {alpha: popAt(shot, f, 1), glow: NOGLOW});
  const maskP = popAt(shot, f, 2);
  plate(ctx, 1010, 330, 140, 90, {alpha: maskP, fill: "rgba(30,10,6,.95)", stroke: PAL.warm, line: 2.4});
  hazardBar(ctx, 1010, 330, 140, 8, {alpha: 0.9});
  glowText(ctx, "???", 1080, 392, 36, "#ffd9c9", {align: "center", alpha: maskP, font: SMONO, weight: 800, glow: NOGLOW});
  glowText(ctx, "was tired", 1300, 390, 36, "#dfe9ff", {alpha: popAt(shot, f, 2), glow: NOGLOW});
  // 候选概率条
  const cand: [string, number, string][] = [["it", 0.62, PAL.warm], ["he", 0.23, PAL.ink], ["she", 0.15, PAL.ink]];
  cand.forEach(([wd, prob, color], i) => {
    const p = popAt(shot, f, 3, 12 + i * 8);
    if (p <= 0) return;
    const y = 540 + i * 90;
    plate(ctx, 340, y, 150, 58, {alpha: p, fill: PLATE_FILL, stroke: color, line: 1.6});
    glowText(ctx, wd, 415, y + 40, 28, i === 0 ? "#ffb38a" : "#dfe9ff", {align: "center", font: SMONO, alpha: p, weight: 700, glow: NOGLOW});
    const bw = 620 * prob * sEase(sClamp01((since(shot, f, 3) - 20 - i * 8) / 40));
    const d = gridDots({x: 540, y: y + 8, w: Math.max(6, bw), h: 42, cols: Math.max(2, Math.round(bw / 22)), rows: 2, value: () => 0.9});
    paintDots(ctx, d, {frame: f, warmth: i === 0 ? 0.9 : 0.3, alpha: p});
    glowText(ctx, `${(prob * 100).toFixed(0)}%`, 560 + Math.max(6, bw), y + 40, 24, color, {alpha: p, font: SMONO, weight: 800, glow: NOGLOW});
  });
  // 对错反馈
  if (si >= 5) {
    const p = popAt(shot, f, 5);
    ctx.save();
    ctx.globalAlpha = 0.7 * p;
    ctx.strokeStyle = S.green;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(415, 569, 44 + 4 * Math.sin(f * 0.2), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    glowText(ctx, "猜对了 → 摸到规律", 540, 470, 28, S.green, {alpha: p, weight: 800, glow: NOGLOW});
  }
  // 次数（封顶 15 万亿，避免数字无限增 chang 抖动）
  if (si >= 6) {
    const p = popAt(shot, f, 6);
    const count = Math.floor(15000000000 + 3000000000 * sClamp01(since(shot, f, 6) / 200));
    plate(ctx, 1120, 630, 560, 80, {alpha: p, fill: "rgba(10,16,28,.95)", stroke: PAL.warm, line: 2});
    glowText(ctx, `重复 ${count.toLocaleString("en-US")} 次`, 1400, 682, 32, "#ffd9c9", {align: "center", font: SMONO, alpha: p, weight: 800, glow: NOGLOW});
    glowText(ctx, "猜错就微调内部数字", 1400, 590, 24, S.muted, {align: "center", alpha: p, weight: 700, glow: NOGLOW});
  }
  if (si >= 7) {
    const p = popAt(shot, f, 7);
    glowText(ctx, "没有人教过它一条语法", 620, 900, 30, PAL.ink, {align: "center", alpha: p, weight: 900, glow: NOGLOW});
  }
  if (si >= 8) {
    const p = popAt(shot, f, 8);
    glowText(ctx, "规律是自己长出来的", 1300, 900, 30, C_MINT, {align: "center", alpha: p, weight: 900, glow: "rgba(94,234,212,.5)"});
  }
};

/* ═════════════ k14 · 并行 ═════════════ */
const drawK14 = (ctx: CanvasRenderingContext2D, f: number, t: number, shot: Shot) => {
  const si = sentIdx(shot, f);
  const N = 8;
  // 上：串行
  glowText(ctx, "旧方法 · 串行", 300, 350, 26, S.muted, {align: "center", weight: 800, glow: NOGLOW});
  const tick = Math.floor(f / 16) % (N + 2);
  for (let i = 0; i < N; i++) {
    const x = 500 + i * 90;
    const lit = si >= 1 && i < tick;
    sDot(ctx, x, 400, lit ? 14 : 8, lit ? PAL.ink : S.dim, lit ? 0.95 : 0.4);
    sLine(ctx, x, 430, x, 450, 1.4, PAL.ink, 0.3);
  }
  glowText(ctx, "一个词一拍", 500, 500, 22, "#8fa3c0", {alpha: si >= 1 ? 0.9 : 0.3, weight: 700, glow: NOGLOW});
  // 下：并行
  glowText(ctx, "注意力 · 并行", 300, 640, 26, PAL.warm, {align: "center", weight: 800, glow: NOGLOW});
  const burst = sEase(sClamp01((since(shot, f, 2) % 120) / 20));
  for (let i = 0; i < N; i++) {
    const x = 500 + i * 90;
    const lit = si >= 2;
    sDot(ctx, x, 690, lit ? 14 : 8, lit ? PAL.warm : S.dim, lit ? 0.95 : 0.4);
    if (lit && burst > 0 && burst < 1) {
      ctx.save();
      ctx.globalAlpha = 0.5 * (1 - burst);
      ctx.strokeStyle = PAL.warm;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, 690, 16 + 30 * burst, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
  glowText(ctx, "整句一拍", 500, 790, 22, "#ffd9c9", {alpha: si >= 2 ? 0.95 : 0.3, weight: 700, glow: NOGLOW});
  // GPU 芯片
  if (si >= 3) {
    const p = popAt(shot, f, 3);
    plate(ctx, 1440, 380, 360, 300, {alpha: p, fill: PLATE_FILL, stroke: PAL.ink, line: 2});
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 6; c++) {
        const gx = 1480 + c * 50, gy = 420 + r * 50;
        plate(ctx, gx, gy, 38, 38, {alpha: p * (0.5 + 0.5 * Math.abs(Math.sin(f * 0.05 + r + c))), fill: "rgba(20,34,58,.9)", stroke: PAL.ink, line: 1});
      }
    glowText(ctx, "GPU · 几千个小核", 1620, 640, 26, "#dfe9ff", {align: "center", alpha: p, weight: 800, glow: NOGLOW});
  }
  if (si >= 6) {
    const p = popAt(shot, f, 6);
    glowText(ctx, "同样的时间，多喂几十倍的句子", 960, 910, 32, PAL.ink, {align: "center", alpha: p, weight: 900, glow: NOGLOW});
  }
};

/* ═════════════ k15 · 规模 ═════════════ */
const drawK15 = (ctx: CanvasRenderingContext2D, f: number, t: number, shot: Shot) => {
  const si = sentIdx(shot, f);
  // 层数阶梯
  const steps: [number, number][] = [[6, 520], [12, 440], [48, 360], [96, 280]];
  const grows = [1, 2, 3, 4];
  let maxLayers = 6;
  steps.forEach(([layers, y], i) => {
    if (si >= grows[i] - 0) {
      const p = popAt(shot, f, grows[i] - 1 + 0, 16);
      if (p > 0) maxLayers = layers;
      ctx.save();
      ctx.globalAlpha = p;
      const hh = Math.round(layers / 4);
      for (let L2 = 0; L2 < hh; L2++) {
        const a = 0.85 - (L2 / hh) * 0.45;
        ctx.fillStyle = `rgba(255,210,30,${a * 0.28})`;
        ctx.fillRect(360, y + L2 * 3, 320, 2);
      }
      plate(ctx, 340, y - 34, 360, 34, {alpha: p * 0.9, fill: PLATE_FILL, stroke: PAL.ink, line: 1.3});
      glowText(ctx, `${layers} 层`, 520, y - 10, 20, "#dfe9ff", {align: "center", alpha: p, weight: 700, glow: NOGLOW});
      ctx.restore();
    }
  });
  // 参数计数（三态按句子锚定）
  const labels: [string, string][] = [["65M", "六千五百万参数"], ["1.7B", "三年后 · 一千七百亿"], ["175B", "百层积木"]];
  const li = si >= 4 ? 2 : si >= 2 ? 1 : 0;
  const stageStart = [1, 2, 4][li];
  const lp = popAt(shot, f, stageStart, 14);
  plate(ctx, 1150, 380, 560, 150, {alpha: 0.95, fill: "rgba(10,16,28,.95)", stroke: PAL.warm, line: 2.4});
  glowText(ctx, labels[li][0], 1430, 470, 76, "#ffffff", {align: "center", font: SMONO, weight: 900, glow: "rgba(255,61,0,.6)"});
  glowText(ctx, labels[li][1], 1430, 510, 24, "#ffd9c9", {align: "center", alpha: 0.9, weight: 700, glow: NOGLOW});
  if (si >= 5) {
    const p = popAt(shot, f, 5);
    glowText(ctx, "每一层都在重复：查资料 → 混合", 960, 700, 30, C_MINT, {align: "center", alpha: p, weight: 800, glow: NOGLOW});
  }
  if (si >= 6) {
    const p = popAt(shot, f, 6);
    ["对话", "写代码", "翻译"].forEach((wd, i) => {
      const pp = sClamp01((since(shot, f, 6) - i * 10) / 14);
      plate(ctx, 700 + i * 200, 800, 170, 64, {alpha: pp, fill: PLATE_FILL, stroke: C_MINT, line: 1.6});
      glowText(ctx, wd, 785 + i * 200, 842, 28, "#b8f5d8", {align: "center", alpha: pp, weight: 800, glow: NOGLOW});
    });
    glowText(ctx, "同一块积木", 960, 900, 30, PAL.ink, {align: "center", alpha: p, weight: 900, glow: NOGLOW});
  }
};

/* ═════════════ k16 · 应用 ═════════════ */
const drawK16 = (ctx: CanvasRenderingContext2D, f: number, t: number, shot: Shot) => {
  const si = sentIdx(shot, f);
  const apps: [string, string, string][] = [
    ["输入法", "猜你下一个词", "ni hao → 你好"],
    ["客服机器人", "回你消息", "亲，已为您加急~"],
    ["代码补全", "写一半猜一半", "def predict(…]"],
    ["聊天助手", "陪你讨论问题", "这个问题分三步看…"],
  ];
  apps.forEach(([name, desc, mock], i) => {
    const p = popAt(shot, f, i + 1, 16);
    if (p <= 0) return;
    const x = 400 + (i % 2) * 620, y = 300 + Math.floor(i / 2) * 300;
    plate(ctx, x, y, 520, 220, {alpha: p, fill: PLATE_FILL, stroke: i % 2 ? C_MINT : PAL.ink, line: 1.8});
    glowText(ctx, name, x + 40, y + 62, 34, i % 2 ? "#b8f5d8" : "#dfe9ff", {alpha: p, weight: 900, glow: NOGLOW});
    glowText(ctx, desc, x + 40, y + 112, 24, "#8fa3c0", {alpha: p, weight: 700, glow: NOGLOW});
    glowText(ctx, mock, x + 40, y + 172, 24, i % 2 ? C_MINT : PAL.ink, {alpha: p, font: SMONO, weight: 600, glow: NOGLOW});
    sDot(ctx, x + 480, y + 40, 6 + 2 * Math.sin(f * 0.1 + i), i % 2 ? C_MINT : PAL.warm, p);
  });
  if (si >= 5) {
    const p = popAt(shot, f, 5);
    // 四张卡汇聚到中央
    const cardPos: [number, number][] = [[920, 550], [1540, 550], [920, 850], [1540, 850]];
    cardPos.forEach(([cx, cy], i) => {
      sLine(ctx, cx, cy, 960 + (cx - 960) * 0.2, 640 + (cy - 640) * 0.2, 1.6, C_MINT, 0.4 * p);
      const u = (f * 0.012 + i * 0.25) % 1;
      sDot(ctx, cx + (960 + (cx - 960) * 0.2 - cx) * u, cy + (640 + (cy - 640) * 0.2 - cy) * u, 5, C_MINT, 0.8 * p);
    });
    ringTicks(ctx, 960, 640, 44, 14, f * 0.008, {alpha: 0.7 * p, color: C_MINT, len: 10});
    glowText(ctx, "注意力", 960, 648, 26, "#b8f5d8", {align: "center", alpha: p, weight: 900, glow: "rgba(94,234,212,.5)"});
    glowText(ctx, "同一套原理，撑起所有的 AI 新闻", 960, 900, 34, PAL.ink, {align: "center", alpha: p, weight: 900, glow: "rgba(255,210,30,.4)"});
  }
};

/* ═════════════ k17 · 总结 ═════════════ */
const drawK17 = (ctx: CanvasRenderingContext2D, f: number, t: number, shot: Shot) => {
  const si = sentIdx(shot, f);
  drawGhost(ctx, "重新计算", 960, 420, 860, 0.12, 0.12, f);
  const steps: [string, string][] = [["打分", PAL.warm], ["变权重", PAL.ink], ["取内容", C_MINT]];
  steps.forEach(([wd, color], i) => {
    const p = popAt(shot, f, 3, 14 + i * 8);
    if (p <= 0) return;
    const x = 460 + i * 500;
    plate(ctx, x - 110, 400, 220, 84, {alpha: p, fill: PLATE_FILL, stroke: color, line: 2});
    glowText(ctx, wd, x, 456, 34, color === PAL.ink ? "#dfe9ff" : color, {align: "center", alpha: p, weight: 900, glow: NOGLOW});
    if (i < 2) {
      sLine(ctx, x + 120, 442, x + 380, 442, 2.4, PAL.ink, 0.55 * p);
      const u = (f * 0.014 + i * 0.5) % 1;
      sDot(ctx, x + 120 + 260 * u, 442, 5, PAL.warm, 0.85 * p);
    }
  });
  if (si >= 1) {
    const p = popAt(shot, f, 1);
    plate(ctx, 760, 240, 400, 84, {alpha: p, fill: "rgba(30,10,6,.94)", stroke: PAL.warm, line: 2});
    glowText(ctx, "it → 猫", 960, 296, 40, "#ffb38a", {align: "center", alpha: p, weight: 900, glow: "rgba(255,61,0,.5)"});
  }
  if (si >= 4) {
    const p = popAt(shot, f, 4);
    glowText(ctx, "根据上下文，重新计算每个词", 960, 700, 48, "#ffffff", {align: "center", alpha: p, weight: 900, glow: "rgba(255,61,0,.6)"});
    sLine(ctx, 660, 740, 1260, 740, 3, PAL.warm, 0.9 * p);
  }
};

/* ═════════════ k18 · 结尾卡 ═════════════ */
const drawK18 = (ctx: CanvasRenderingContext2D, f: number) => {
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
  glowText(ctx, "根据上下文，重新计算每个词的重要性", W / 2, 575, 48, PAL.ink, {align: "center", weight: 800});
  glowText(ctx, "下一集：多头注意力的数学细节", W / 2, 700, 32, C_MINT, {align: "center", weight: 700});
  glowText(ctx, "收藏 · 从零看懂 AI 系列", W / 2, 775, 26, S.muted, {align: "center", weight: 500, glow: NOGLOW});
  glowText(ctx, "@PaperVideo · Attention 特辑", W / 2, 855, 20, C_DIM, {align: "center", weight: 500, font: SMONO, glow: NOGLOW});
};

/* ═════════════ 场景分发 + 机位 ═════════════ */
type Draw = (ctx: CanvasRenderingContext2D, f: number, t: number, shot: Shot) => void;
const DRAW: Draw[] = [
  drawK00, drawK01, drawK02, drawK03, drawK04, drawK05, drawK06, drawK07, drawK08, drawK09,
  drawK10, drawK11, drawK12, drawK13, drawK14, drawK15, drawK16, drawK17,
  (ctx, f) => drawK18(ctx, f),
];

const CAMS: Cue[][] = [
  [{t: 0, x: 960, y: 480, s: 1.14}, {t: 0.5, x: 960, y: 520, s: 1.06}, {t: 1, x: 960, y: 540, s: 1.0}],
  [{t: 0, x: 960, y: 540, s: 1.0}, {t: 0.6, x: 900, y: 560, s: 1.06}, {t: 1, x: 960, y: 540, s: 1.0}],
  [{t: 0, x: 960, y: 560, s: 1.04}, {t: 1, x: 960, y: 560, s: 1.0}],
  [{t: 0, x: 960, y: 500, s: 1.06}, {t: 1, x: 960, y: 540, s: 1.0}],
  [{t: 0, x: 960, y: 540, s: 1.04}, {t: 1, x: 960, y: 540, s: 1.0}],
  [{t: 0, x: 960, y: 540, s: 1.02}, {t: 1, x: 960, y: 540, s: 1.0}],
  [{t: 0, x: 480, y: 560, s: 1.1}, {t: 0.5, x: 900, y: 550, s: 1.06}, {t: 0.8, x: 1100, y: 545, s: 1.1}, {t: 1, x: 1000, y: 545, s: 1.02}],
  [{t: 0, x: 760, y: 620, s: 1.04}, {t: 0.6, x: 740, y: 610, s: 1.1}, {t: 1, x: 780, y: 600, s: 1.04}],
  [{t: 0, x: 620, y: 600, s: 1.1}, {t: 0.5, x: 940, y: 580, s: 1.04}, {t: 1, x: 1250, y: 560, s: 0.98}],
  [{t: 0, x: 960, y: 480, s: 1.06}, {t: 1, x: 960, y: 540, s: 1.0}],
  [{t: 0, x: 960, y: 520, s: 1.02}, {t: 1, x: 960, y: 540, s: 1.0}],
  [{t: 0, x: 960, y: 540, s: 1.0}, {t: 0.6, x: 960, y: 540, s: 1.03}, {t: 1, x: 960, y: 540, s: 1.0}],
  [{t: 0, x: 960, y: 560, s: 1.02}, {t: 1, x: 960, y: 540, s: 1.0}],
  [{t: 0, x: 800, y: 580, s: 1.04}, {t: 1, x: 960, y: 560, s: 1.0}],
  [{t: 0, x: 960, y: 560, s: 1.0}, {t: 1, x: 960, y: 540, s: 1.0}],
  [{t: 0, x: 960, y: 540, s: 1.04}, {t: 1, x: 960, y: 540, s: 1.0}],
  [{t: 0, x: 960, y: 480, s: 1.06}, {t: 1, x: 960, y: 500, s: 1.0}],
  [{t: 0, x: 960, y: 520, s: 1.08}, {t: 1, x: 960, y: 540, s: 1.0}],
];

/* ═════════════ 大字幕 + 底部字幕 ═════════════ */
const BigCaption: React.FC<{text: string; total: number; accent: string}> = ({text, total, accent}) => {
  const frame = useCurrentFrame();
  const op = Math.min(1, frame / 6, (total - frame) / 6);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        bottom: 40,
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

const ShotShell: React.FC<{shot: Shot; index: number}> = ({shot, index}) => {
  const frame = useCurrentFrame();
  const draw = DRAW[index];
  return (
    <AbsoluteFill style={{background: S.bg}}>
      <CanvasLayer shot={shot} index={index} frame={frame} draw={draw} />
      {shot.sentences.map((s, k) => (
        <Sequence key={k} from={s.start} durationInFrames={s.frames} name={`${shot.id}-${k + 1}`}>
          <Audio src={staticFile(`audio7/${s.audio}.mp3`)} volume={1} />
          <BigCaption text={s.text} total={s.frames} accent={shot.accent} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

const CanvasLayer: React.FC<{
  shot: Shot;
  index: number;
  frame: number;
  draw: Draw;
}> = ({shot, index, frame, draw}) => {
  const ref = React.useRef<HTMLCanvasElement | null>(null);
  const t = frame / shot.frames;

  React.useLayoutEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = S.bg;
    ctx.fillRect(0, 0, CW, CH);
    drawBG(ctx, frame);
    ctx.save();
    worldTransform(ctx, false, camAt(CAMS[index] ?? [], t));
    draw(ctx, Math.floor(frame), t, shot);
    ctx.restore();
    drawChrome(ctx, frame, shot, index, frame);
    const cover = frame < SHUTTER ? 1 - frame / SHUTTER
      : frame > shot.frames - SHUTTER ? (frame - (shot.frames - SHUTTER)) / SHUTTER : 0;
    drawShutter(ctx, cover, `▸ SEC ${String(index + 1).padStart(2, "0")} · ${shot.kicker}`);
  }, [frame, draw, shot, index, t]);

  return <canvas ref={ref} width={CW} height={CH} style={{width: "100%", height: "100%"}} />;
};

export const MechLong: React.FC = () => {
  return (
    <AbsoluteFill style={{background: S.bg}}>
      <Audio src={staticFile("audio7/bgm_long.wav")} volume={0.12} />
      {SHOTS2.map((shot, i) => (
        <Sequence key={shot.id} from={STARTS[i]} durationInFrames={shot.frames} name={`${shot.id} ${shot.chapter}`}>
          <ShotShell shot={shot} index={i} />
        </Sequence>
      ))}
      <StepTitleGlobal />
    </AbsoluteFill>
  );
};

const StepTitleGlobal: React.FC = () => {
  const frame = useCurrentFrame();
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
  if (cur.id === "k18") return null;
  const op = Math.min(1, local / 10, (cur.frames - local) / 10);
  return (
    <AbsoluteFill style={{pointerEvents: "none"}}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 70,
          textAlign: "center",
          opacity: Math.max(0, Math.min(1, op)),
        }}
      >
        <div style={{fontFamily: SMONO, fontSize: 19, letterSpacing: 5, color: cur.accent, opacity: 0.9, marginBottom: 8, fontWeight: 700}}>
          {`SEC ${String(curIdx + 1).padStart(2, "0")}/20 · ${cur.kicker}`}
        </div>
        <div
          style={{
            fontFamily: SFONT,
            fontSize: 58,
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

export const MECHLONG_FRAMES = TOTAL;
