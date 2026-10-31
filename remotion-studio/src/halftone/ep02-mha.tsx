import React from "react";
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from "remotion";
import {W, H, MONO, FONT_UI, FONT_HEAVY} from "./core";
import {camAt, type Cue} from "./camera";
import {sClamp01, sEase, sRnd} from "./social-core";

/* ═════════ EP02 · Multi-Head Attention 的数学 ═════════
   brutalist × warm-orange × cinematic × music-only（无旁白）
   章节边界全部落在乐句边界（640 帧整数倍，BPM 90）。
   转场 = 运镜：章首 whip-in 回拉，章尾推进焦点，切点踩音乐重音。 */

const B = {
  bg: "#140c06",
  panel: "#1d130b",
  panel2: "#241811",
  ink: "#f5ede3",
  orange: "#ff7a1a",
  amber: "#ffb347",
  dim: "#8a7f74",
  line: "#40301f",
  red: "#e8491d",
};
const NOGLOW = "rgba(0,0,0,0)";
const LETTER = 132; // 2.39:1 遮幅

type Shot = {id: string; frames: number; title: string; sec: string; focal: [number, number]; dir: number};
const CH: Shot[] = [
  {id: "k01", frames: 1280, title: "PROLOGUE",        sec: "回顾与预告",   focal: [960, 500], dir: -1},
  {id: "k02", frames: 1280, title: "THE FORMULA",     sec: "公式拆解",     focal: [960, 520], dir: 1},
  {id: "k03", frames: 1280, title: "DOT PRODUCT",     sec: "为什么点积",   focal: [960, 540], dir: -1},
  {id: "k04", frames: 1280, title: "THE PROBLEM",     sec: "dk 变大之后",  focal: [960, 470], dir: 1},
  {id: "k05", frames: 1920, title: "SATURATION",      sec: "饱和实验",     focal: [960, 520], dir: -1},
  {id: "k06", frames: 1280, title: "THE FIX",         sec: "除以 √dk",    focal: [960, 520], dir: 1},
  {id: "k07", frames: 1920, title: "PROOF",           sec: "三行推导",     focal: [960, 500], dir: -1},
  {id: "k08", frames: 1920, title: "MULTI-HEAD",      sec: "多头结构",     focal: [960, 540], dir: 1},
  {id: "k09", frames: 1280, title: "SUBSPACES",       sec: "子空间",       focal: [960, 520], dir: -1},
  {id: "k10", frames: 1920, title: "EVIDENCE",        sec: "消融实验",     focal: [820, 520], dir: 1},
  {id: "k11", frames: 1920, title: "COMPLEXITY",      sec: "复杂度账本",   focal: [960, 540], dir: -1},
  {id: "k12", frames: 1280, title: "RECAP",           sec: "公式重组",     focal: [960, 520], dir: 1},
  {id: "k13", frames: 1280, title: "OUTRO",           sec: "下集",         focal: [960, 480], dir: -1},
];
const STARTS: number[] = (() => {
  const a: number[] = [];
  let acc = 0;
  for (const c of CH) { a.push(acc); acc += c.frames; }
  return a;
})();
const TOTAL = acc_of(CH);
function acc_of(chs: Shot[]) { return chs.reduce((a, b) => a + b.frames, 0); }

/* ───────── 暴力美学小件（全部硬边、无辉光） ───────── */
const big = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number,
             color: string, align: CanvasTextAlign = "left", font = MONO, weight = 900) => {
  ctx.save();
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
  ctx.restore();
};

const panel = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
               o: {alpha?: number; stroke?: string; fill?: string; lw?: number; ticks?: boolean} = {}) => {
  const {alpha = 1, stroke = B.ink, fill = B.panel, lw = 3, ticks = true} = o;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lw;
  ctx.strokeRect(x, y, w, h);
  if (ticks) {
    const t = 14;
    ctx.strokeStyle = B.orange;
    ctx.lineWidth = 3;
    [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]].forEach(([cx, cy, sx, sy]) => {
      ctx.beginPath();
      ctx.moveTo(cx + sx * t, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy * t);
      ctx.stroke();
    });
  }
  ctx.restore();
};

const barRow = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
                frac: number, color: string, alpha: number) => {
  ctx.save();
  ctx.globalAlpha = alpha * 0.25;
  ctx.strokeStyle = B.line;
  ctx.strokeRect(x, y, w, h);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x + 3, y + 3, Math.max(2, (w - 6) * sClamp01(frac)), h - 6);
  ctx.restore();
};

/* ───────── 全局 chrome：遮幅 / 颗粒 / 注册标记 / 章节巨号 ───────── */
const drawChrome = (ctx: CanvasRenderingContext2D, f: number, shot: Shot, index: number) => {
  // 遮幅 2.39:1
  ctx.save();
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, W, LETTER);
  ctx.fillRect(0, H - LETTER, W, LETTER);
  ctx.fillStyle = B.orange;
  ctx.fillRect(0, LETTER - 3, W, 3);
  ctx.fillRect(0, H - LETTER, W, 3);
  // 章节进度条（遮幅内）
  ctx.fillStyle = "rgba(255,122,26,.25)";
  ctx.fillRect(0, 0, W, 6);
  ctx.fillRect(0, 0, W * ((f + 1) / shot.frames), 6);
  // 注册十字
  ctx.strokeStyle = "rgba(245,237,227,.14)";
  ctx.lineWidth = 1;
  for (let x = 160; x < W; x += 160)
    for (let y = LETTER + 80; y < H - LETTER; y += 120) {
      ctx.beginPath();
      ctx.moveTo(x - 9, y); ctx.lineTo(x + 9, y);
      ctx.moveTo(x, y - 9); ctx.lineTo(x, y + 9);
      ctx.stroke();
    }
  ctx.restore();
  // 颗粒（每帧变化，纯函数）
  ctx.save();
  for (let i = 0; i < 160; i++) {
    const gx = sRnd(i * 7.77 + f * 3.1) * W;
    const gy = LETTER + sRnd(i * 3.33 + f * 5.7) * (H - 2 * LETTER);
    ctx.fillStyle = i % 3 === 0 ? "rgba(255,122,26,.05)" : "rgba(245,237,227,.05)";
    ctx.fillRect(gx, gy, 2, 2);
  }
  ctx.restore();
  // 章节巨号
  big(ctx, String(index + 1).padStart(2, "0"), 1876, 880, 380, "rgba(255,122,26,.12)", "right");
  // 左上/右上标签
  big(ctx, "EP02 // MULTI-HEAD ATTENTION", 36, 84, 20, B.dim, "left", MONO, 700);
  big(ctx, `SEC ${String(index + 1).padStart(2, "0")}/13 · ${shot.sec}`, W - 36, 84, 22, B.amber, "right", MONO, 800);
  big(ctx, "arXiv:1706.03762 · §3.2", 36, H - 46, 18, B.dim, "left", MONO, 600);
  big(ctx, `PAPERPIPE · ${shot.title}`, W - 36, H - 46, 18, B.dim, "right", MONO, 600);
};

/* ───────── 文字节拍：在小节边界逐条揭示 ───────── */
const barP = (f: number, at: number, dur = 14) => sEase(sClamp01((f - at) / dur));

/* ───────── 章节机位：whip-in 回拉 + 慢推 + 章尾推进 ───────── */
const CAMS: Cue[][] = CH.map((c, i) => {
  const dir = c.dir;
  const [fx, fy] = c.focal;
  return [
    {t: 0.0, x: fx + dir * 240, y: fy, s: 1.52},
    {t: 0.03, x: fx, y: fy, s: 1.0},
    {t: 0.9, x: fx, y: fy, s: 1.14},
    {t: 1.0, x: fx + dir * 60, y: fy, s: 1.5},
  ];
});

/* ═════════ k01 · PROLOGUE ═════════ */
const drawK01 = (ctx: CanvasRenderingContext2D, f: number) => {
  const p1 = barP(f, 10, 16);
  big(ctx, "MULTI-HEAD", 960, 400, 148, B.ink, "center");
  big(ctx, "ATTENTION", 960, 540, 148, B.orange, "center");
  ctx.fillStyle = B.orange;
  ctx.fillRect(300, 580, 1320 * p1, 10);
  const p2 = barP(f, 320, 18);
  if (p2 > 0) {
    big(ctx, "EP01 里它是 8 个观察员。", 960, 700, 40, B.ink, "center", FONT_UI, 700);
    big(ctx, "今天拆它的数学。", 960, 760, 40, B.amber, "center", FONT_UI, 700);
  }
  const p3 = barP(f, 720, 18);
  if (p3 > 0) {
    const nums: [string, string][] = [["64", "dk 每头维度"], ["8", "头数 h"], ["√64 = 8.00", "缩放因子"], ["25.8", "8 头 BLEU"]];
    nums.forEach(([n, cap], i) => {
      const x = 300 + i * 350;
      panel(ctx, x, 820, 300, 130, {alpha: p3, stroke: i === 2 ? B.orange : B.ink});
      big(ctx, n, x + 150, 890, 46, i === 2 ? B.orange : B.ink, "center");
      big(ctx, cap, x + 150, 928, 18, B.dim, "center", FONT_UI, 600);
    });
  }
  if (f > 1150) {
    const p = sClamp01((f - 1150) / 60);
    big(ctx, "4 个数字 · 1 个公式", 960, 200, 44, B.orange, "center", FONT_UI, 900);
    ctx.globalAlpha = p;
  }
};

/* ═════════ k02 · THE FORMULA ═════════ */
const drawK02 = (ctx: CanvasRenderingContext2D, f: number) => {
  big(ctx, "THE FORMULA", 120, 230, 40, B.dim, "left", MONO, 800);
  panel(ctx, 100, 280, 1720, 240, {stroke: B.orange, lw: 4});
  // 逐 token 测量排版（避免手写坐标重叠）
  const cy = 430;
  const tokens: [string, string, boolean][] = [
    ["Attention(Q, K, V)", B.ink, false],
    [" = ", B.dim, false],
    ["softmax", B.orange, false],
    ["(", B.ink, false],
    ["QK", B.amber, false],
    ["T", B.amber, true],
    [" / √dk ", B.red, false],
    [") ", B.ink, false],
    ["V", B.ink, false],
  ];
  const size = 62;
  ctx.save();
  ctx.font = `900 ${size}px ${MONO}`;
  const totalW = tokens.reduce((a, [t]) => a + ctx.measureText(t).width, 0);
  let x = 960 - totalW / 2;
  const centers: Record<string, number> = {};
  tokens.forEach(([t, color, sup]) => {
    const w = ctx.measureText(t).width;
    if (sup) {
      big(ctx, t, x, cy - size * 0.42, 34, color, "left", MONO, 900);
    } else {
      big(ctx, t, x, cy, size, color, "left", MONO, 900);
      centers[t.trim()] = x + w / 2;
    }
    x += w;
  });
  ctx.restore();
  // 逐符号注解（锚点 = token 中心）
  const ann: [string, string, string, string][] = [
    ["QK", "查询 × 键 = 打分", B.amber, "2"],
    ["/ √dk", "缩放：今天的主角", B.red, "3"],
    ["softmax", "分数 → 权重 Σ=1", B.orange, "1"],
    ["V", "按权重取回内容", B.ink, "4"],
  ];
  ann.forEach(([sym, txt, color, key], i) => {
    const p = barP(f, 260 + i * 150, 16);
    if (p <= 0) return;
    const ax = centers[sym] ?? 960;
    ctx.save();
    ctx.globalAlpha = p;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ax, 520);
    ctx.lineTo(ax - 20, 590);
    ctx.stroke();
    ctx.restore();
    big(ctx, `${key} · ${sym}`, ax - 20, 626, 24, color, "left", MONO, 800);
    big(ctx, txt, ax - 20, 664, 23, B.ink, "left", FONT_UI, 700);
  });
  const p5 = barP(f, 980, 18);
  if (p5 > 0) {
    big(ctx, "两个工程决定 + 一个结构决定", 960, 780, 40, B.ink, "center", FONT_UI, 900);
    big(ctx, "为什么点积 · 为什么除 √dk · 为什么要 8 个头", 960, 845, 30, B.amber, "center", FONT_UI, 700);
  }
};

/* ═════════ k03 · DOT PRODUCT ═════════ */
const drawK03 = (ctx: CanvasRenderingContext2D, f: number) => {
  big(ctx, "为什么用点积", 120, 250, 56, B.ink, "left", FONT_UI, 900);
  // 左：矩阵乘示意
  panel(ctx, 140, 330, 820, 420, {stroke: B.orange});
  big(ctx, "Q", 220, 420, 60, B.orange, "center");
  big(ctx, "n×64", 220, 470, 22, B.dim, "center", MONO, 600);
  big(ctx, "×", 380, 430, 50, B.ink, "center");
  big(ctx, "Kᵀ", 500, 420, 60, B.amber, "center");
  big(ctx, "64×m", 500, 470, 22, B.dim, "center", MONO, 600);
  big(ctx, "=", 640, 430, 50, B.ink, "center");
  big(ctx, "分数", 800, 420, 60, B.ink, "center");
  big(ctx, "n×m", 800, 470, 22, B.dim, "center", MONO, 600);
  const p2 = barP(f, 240, 18);
  if (p2 > 0) big(ctx, "全部 n×m 个分数 = 一次矩阵乘法", 550, 580, 32, B.ink, "center", FONT_UI, 800);
  const p3 = barP(f, 480, 18);
  if (p3 > 0) {
    ctx.fillStyle = B.orange;
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 6; c++)
        ctx.fillRect(260 + c * 90, 620 + r * 26, 70 * sClamp01(p3 * 2 - r * 0.2), 12);
  }
  // 右：对比
  panel(ctx, 1020, 330, 760, 420, {stroke: B.ink});
  const p4 = barP(f, 700, 16);
  big(ctx, "点积注意力", 1060, 400, 30, B.orange, "left", FONT_UI, 900);
  big(ctx, "一次 matmul · GPU 原生 · 快", 1060, 450, 26, B.ink, "left", FONT_UI, 700);
  big(ctx, "加性注意力", 1060, 540, 30, B.dim, "left", FONT_UI, 900);
  big(ctx, "每个 (i,j) 对都要过一遍前馈网络", 1060, 590, 24, B.dim, "left", FONT_UI, 700);
  if (p4 > 0) {
    big(ctx, "小 dk：两者差不多", 1060, 680, 26, B.ink, "left", FONT_UI, 700);
    big(ctx, "大 dk：不缩放的点积开始出问题 → 第 04 章", 1060, 725, 26, B.red, "left", FONT_UI, 800);
  }
  const p5 = barP(f, 1050, 18);
  if (p5 > 0) big(ctx, "论文原句：dot-product attention is much faster and space-optimized in practice", 960, 880, 26, B.dim, "center", FONT_UI, 600);
};

/* ═════════ k04 · THE PROBLEM ═════════ */
const drawK04 = (ctx: CanvasRenderingContext2D, f: number) => {
  big(ctx, "dk 变大，点积变大", 120, 250, 52, B.ink, "left", FONT_UI, 900);
  // 推导卡片
  panel(ctx, 140, 320, 900, 250, {stroke: B.orange});
  big(ctx, "q·k = q₁k₁ + q₂k₂ + … + q₆₄k₆₄", 200, 400, 40, B.ink, "left");
  const p1 = barP(f, 160, 16);
  if (p1 > 0) big(ctx, "每项：E = 0 · Var = 1（q、k 分量独立）", 200, 460, 28, B.dim, "left", FONT_UI, 700);
  const p2 = barP(f, 360, 16);
  if (p2 > 0) {
    big(ctx, "Var(q·k) = 64 × 1 = dk = 64", 200, 530, 40, B.orange, "left");
  }
  // 巨号 std
  const p3 = barP(f, 560, 20);
  panel(ctx, 1120, 320, 660, 250, {stroke: B.red, lw: 4});
  big(ctx, "标准差", 1180, 380, 28, B.dim, "left", FONT_UI, 700);
  big(ctx, "√64 = 8.00", 1450, 490, 96, B.red, "center");
  if (p3 > 0) big(ctx, "logit 典型幅度 ±8，尾巴到 ±20+", 1450, 545, 24, B.ink, "center", FONT_UI, 700);
  // 分布示意
  const p4 = barP(f, 760, 18);
  if (p4 > 0) {
    ctx.save();
    ctx.strokeStyle = B.orange;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const x = 200 + i * 24;
      const z = (i - 30) / 5.2;
      const y = 860 - Math.exp(-z * z / 2) * 130;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = B.dim;
    ctx.setLineDash([8, 8]);
    ctx.beginPath(); ctx.moveTo(200, 730); ctx.lineTo(1640, 730); ctx.stroke();
    ctx.restore();
    big(ctx, "N(0, 8)：大多数点积落在 ±8 → softmax 输入差 10+ → 危险", 960, 895, 28, B.ink, "center", FONT_UI, 800);
  }
};

/* ═════════ k05 · SATURATION ═════════ */
const drawK05 = (ctx: CanvasRenderingContext2D, f: number) => {
  big(ctx, "数值实验：不缩放会怎样", 120, 250, 50, B.ink, "left", FONT_UI, 900);
  // 典型 logits（std=8）
  const logits = [8.0, 0.0];
  const p1 = barP(f, 120, 16);
  panel(ctx, 200, 320, 1520, 200, {stroke: B.ink});
  big(ctx, "典型 logits（差 = 8）", 260, 380, 26, B.dim, "left", FONT_UI, 700);
  big(ctx, "[ 8.00 , 0.00 ]", 620, 405, 56, B.ink, "left");
  big(ctx, "→ softmax", 1330, 400, 34, B.dim, "left", MONO, 700);
  const p2 = barP(f, 300, 16);
  if (p2 > 0) {
    big(ctx, "[ 0.99966 , 0.00034 ]", 620, 480, 48, B.red, "left");
    big(ctx, "≈ one-hot", 1450, 480, 28, B.red, "left", FONT_UI, 900);
  }
  // 雅可比
  const p3 = barP(f, 560, 16);
  panel(ctx, 200, 570, 1520, 170, {stroke: B.red, lw: 4});
  big(ctx, "softmax 的雅可比 ∂p/∂z 每一格", 260, 630, 26, B.dim, "left", FONT_UI, 700);
  big(ctx, "≈ p·(1−p) ≈ 0.00034", 620, 700, 52, B.red, "left");
  if (p3 > 0) big(ctx, "→ 梯度几乎为零：这一步学不到东西", 1250, 700, 30, B.ink, "left", FONT_UI, 800);
  // softmax 曲线 + 饱和区
  const p4 = barP(f, 900, 18);
  if (p4 > 0) {
    ctx.save();
    ctx.strokeStyle = B.dim;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(300, 880); ctx.lineTo(1700, 880); ctx.stroke();
    ctx.strokeStyle = B.orange;
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i <= 140; i++) {
      const x = 300 + i * 10;
      const z = (i - 70) / 14;
      const y = 880 - (1 / (1 + Math.exp(-z))) * 120;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = "rgba(232,73,29,.18)";
    ctx.fillRect(300, 760, 500, 120);
    ctx.fillRect(1500, 760, 200, 120);
    big(ctx, "饱和区：梯度 ≈ 0", 480, 770, 24, B.red, "center", FONT_UI, 800);
    ctx.restore();
  }
};

/* ═════════ k06 · THE FIX ═════════ */
const drawK06 = (ctx: CanvasRenderingContext2D, f: number) => {
  big(ctx, "除以 √dk", 120, 250, 56, B.orange, "left", FONT_UI, 900);
  big(ctx, "同一个实验，缩放后", 1400, 240, 28, B.ink, "left", FONT_UI, 700);
  panel(ctx, 200, 320, 1520, 200, {stroke: B.orange, lw: 4});
  big(ctx, "缩放后 logits（差 = 8/8 = 1）", 260, 380, 26, B.dim, "left", FONT_UI, 700);
  big(ctx, "[ 1.00 , 0.00 ]", 620, 405, 56, B.ink, "left");
  big(ctx, "→ softmax", 1330, 400, 34, B.dim, "left", MONO, 700);
  big(ctx, "[ 0.731 , 0.269 ]", 620, 480, 48, B.orange, "left");
  big(ctx, "远离 one-hot", 1440, 480, 26, B.orange, "left", FONT_UI, 800);
  const p2 = barP(f, 420, 16);
  panel(ctx, 200, 570, 1520, 170, {stroke: B.orange});
  big(ctx, "雅可比每一格", 260, 630, 26, B.dim, "left", FONT_UI, 700);
  big(ctx, "≈ 0.269 × 0.731 = 0.197", 260, 705, 48, B.orange, "left");
  if (p2 > 0) {
    // 对比条独立区域（右下，避免与大字重叠）
    barRow(ctx, 1180, 600, 460, 34, 0.0017, B.red, p2);
    big(ctx, "饱和态 0.00034", 1660, 625, 20, B.red, "left", MONO, 700);
    barRow(ctx, 1180, 660, 460, 34, 0.99, B.orange, p2);
    big(ctx, "缩放后 0.197", 1660, 685, 20, B.orange, "left", MONO, 700);
    big(ctx, "≈ 600 倍梯度", 1180, 725, 26, B.ink, "left", FONT_UI, 900);
  }
  const p3 = barP(f, 760, 18);
  if (p3 > 0) {
    big(ctx, "√64 = 8.00 —— 一个除法，救活整层梯度", 960, 850, 40, B.ink, "center", FONT_UI, 900);
    ctx.fillStyle = B.orange;
    ctx.fillRect(560, 870, 800 * sClamp01(p3), 8);
  }
};

/* ═════════ k07 · PROOF ═════════ */
const drawK07 = (ctx: CanvasRenderingContext2D, f: number) => {
  big(ctx, "三行推导：Var(q·k) = dk", 120, 250, 50, B.ink, "left", FONT_UI, 900);
  const lines: [string, string][] = [
    ["1", "q·k = Σᵢ qᵢ·kᵢ    （i = 1…dk，各项独立，E[qᵢ]=E[kᵢ]=0，Var=1）"],
    ["2", "E[q·k] = 0 ；  Var(qᵢ·kᵢ) = E[(qᵢkᵢ)²] = 1"],
    ["3", "Var(q·k) = Σᵢ Var(qᵢ·kᵢ) = dk · 1 = dk"],
  ];
  lines.forEach(([n, txt], i) => {
    const p = barP(f, 160 + i * 240, 20);
    if (p <= 0) return;
    panel(ctx, 200, 330 + i * 130, 1520, 100, {alpha: p, stroke: i === 2 ? B.orange : B.ink, lw: i === 2 ? 4 : 2});
    big(ctx, n, 240, 400 + i * 130, 44, B.orange, "left");
    big(ctx, txt, 320, 400 + i * 130, 36, B.ink, "left", MONO, 700);
  });
  const p4 = barP(f, 900, 20);
  if (p4 > 0) {
    panel(ctx, 400, 690, 1120, 130, {alpha: p4, stroke: B.red, lw: 4});
    big(ctx, "std = √dk  ⇒  除以 √dk 后 Var = 1", 960, 775, 44, B.ink, "center", FONT_UI, 900);
    big(ctx, "dk=64 → √64 = 8.00 → 缩放后 logit ~ N(0,1)", 960, 818, 24, B.amber, "center", FONT_UI, 700);
  }
};

/* ═════════ k08 · MULTI-HEAD ═════════ */
const drawK08 = (ctx: CanvasRenderingContext2D, f: number) => {
  big(ctx, "MultiHead = Concat(head₁…head₈) · Wᴼ", 120, 250, 46, B.ink, "left", FONT_UI, 900);
  big(ctx, "headᵢ = Attention(Q·Wᵢ^Q, K·Wᵢ^K, V·Wᵢ^V)", 120, 320, 34, B.amber, "left", MONO, 700);
  // 8 头 → concat → WO
  const p1 = barP(f, 200, 16);
  for (let i = 0; i < 8; i++) {
    const p = barP(f, 200 + i * 60, 14);
    if (p <= 0) continue;
    const x = 180 + i * 200;
    panel(ctx, x, 420, 140, 200, {alpha: p, stroke: i % 2 ? B.orange : B.ink});
    big(ctx, `head${i + 1}`, x + 70, 470, 24, B.ink, "center", MONO, 800);
    big(ctx, "64", x + 70, 530, 44, B.orange, "center");
    big(ctx, "dᵏ=dᵛ", x + 70, 585, 18, B.dim, "center", MONO, 600);
    ctx.save();
    ctx.globalAlpha = p * 0.7;
    ctx.strokeStyle = B.dim;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + 70, 620); ctx.lineTo(940, 700); ctx.stroke();
    ctx.restore();
  }
  const p2 = barP(f, 760, 16);
  if (p2 > 0) {
    panel(ctx, 800, 700, 320, 90, {alpha: p2, stroke: B.orange, lw: 4});
    big(ctx, "Concat", 960, 760, 40, B.orange, "center");
    big(ctx, "512 = 8 × 64", 960, 815, 24, B.ink, "center", MONO, 700);
  }
  const p3 = barP(f, 1050, 16);
  if (p3 > 0) {
    ctx.save();
    ctx.globalAlpha = p3;
    ctx.strokeStyle = B.ink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(1120, 745); ctx.lineTo(1320, 745); ctx.stroke();
    ctx.restore();
    panel(ctx, 1320, 700, 240, 90, {alpha: p3, stroke: B.ink, lw: 4});
    big(ctx, "Wᴼ", 1440, 758, 44, B.ink, "center");
    big(ctx, "512×512", 1440, 815, 20, B.dim, "center", MONO, 600);
    big(ctx, "→ 512", 1650, 760, 36, B.ink, "left", MONO, 800);
  }
  const p4 = barP(f, 1350, 18);
  if (p4 > 0) {
    big(ctx, "h = 8 · d_model = 512 · dk = dv = 64", 960, 940, 36, B.orange, "center", MONO, 800);
    big(ctx, "原文：每头降维后，总算力 ≈ 全维单头（substantially the same）", 960, 990, 24, B.dim, "center", FONT_UI, 600);
  }
};

/* ═════════ k09 · SUBSPACES ═════════ */
const drawK09 = (ctx: CanvasRenderingContext2D, f: number) => {
  big(ctx, "为什么 8 个头 ≠ 1 个大 头", 120, 250, 50, B.ink, "left", FONT_UI, 900);
  const p1 = barP(f, 120, 16);
  if (p1 > 0) big(ctx, "原文：single head averaging inhibits this（平均化会抹平不同子空间）", 120, 310, 26, B.dim, "left", FONT_UI, 600);
  const heads: [string, string][] = [["指代", "it → cat"], ["相邻", "i ↔ i+1"], ["因果", "because → 结果"]];
  heads.forEach(([name, pat], i) => {
    const p = barP(f, 300 + i * 150, 16);
    if (p <= 0) return;
    const x = 200 + i * 540;
    panel(ctx, x, 380, 480, 330, {alpha: p, stroke: B.orange});
    big(ctx, `head${i + 1} · ${name}`, x + 240, 440, 32, B.orange, "center", FONT_UI, 900);
    // 5×5 热力块
    const patFn: Record<number, (r: number, c: number) => number> = {
      0: (r, c) => (r === 1 && c === 4 ? 0.95 : 0.05),
      1: (r, c) => (Math.abs(r - c) === 1 ? 0.85 : 0.05),
      2: (r, c) => (r > c ? 0.75 : 0.05),
    };
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 5; c++) {
        const v = patFn[i](r, c);
        ctx.save();
        ctx.globalAlpha = p * (0.15 + v * 0.85);
        ctx.fillStyle = v > 0.5 ? B.orange : B.line;
        ctx.fillRect(x + 80 + c * 66, 480 + r * 44, 56, 34);
        ctx.restore();
      }
    big(ctx, pat, x + 240, 690, 26, B.ink, "center", MONO, 700);
  });
  const p4 = barP(f, 800, 18);
  if (p4 > 0) {
    big(ctx, "一个大 头 = 把 8 种关系压进同一个 64 维 → 互相稀释", 960, 800, 34, B.ink, "center", FONT_UI, 800);
    big(ctx, "8 个头 = 8 个独立子空间，各查各的资料，最后 Wᴼ 重组", 960, 860, 30, B.orange, "center", FONT_UI, 800);
  }
};

/* ═════════ k10 · EVIDENCE ═════════ */
const drawK10 = (ctx: CanvasRenderingContext2D, f: number) => {
  big(ctx, "消融实验：头数真的是甜点位", 120, 250, 48, B.ink, "left", FONT_UI, 900);
  big(ctx, "Table 3(A) · WMT newstest2013 · BLEU", 120, 310, 24, B.dim, "left", MONO, 600);
  const rows: [number, number, number][] = [
    [1, 24.9, 0.0],
    [4, 25.5, 0.46],
    [8, 25.8, 0.69],
    [16, 25.8, 0.69],
    [32, 25.4, 0.38],
  ];
  rows.forEach(([h, bleu, frac], i) => {
    const p = barP(f, 160 + i * 140, 20);
    if (p <= 0) return;
    const y = 380 + i * 100;
    const hot = h === 8;
    big(ctx, `h = ${h}`, 200, y + 50, 36, hot ? B.orange : B.ink, "left", MONO, 800);
    barRow(ctx, 360, y, 1000, 66, frac, hot ? B.orange : B.amber, p);
    big(ctx, bleu.toFixed(1), 1420, y + 50, 40, hot ? B.orange : B.ink, "left", MONO, 900);
    if (hot) big(ctx, "← EP01 的配置", 1560, y + 48, 22, B.dim, "left", FONT_UI, 600);
  });
  const p6 = barP(f, 1000, 18);
  if (p6 > 0) {
    big(ctx, "单头掉 0.9 BLEU；8 → 16 持平；32 反而降", 960, 920, 34, B.ink, "center", FONT_UI, 900);
    big(ctx, "多头是甜点位，不是线性堆叠", 960, 975, 26, B.amber, "center", FONT_UI, 700);
  }
};

/* ═════════ k11 · COMPLEXITY ═════════ */
const drawK11 = (ctx: CanvasRenderingContext2D, f: number) => {
  big(ctx, "复杂度账本（§3.5 · Table 1）", 120, 250, 48, B.ink, "left", FONT_UI, 900);
  const rows: [string, string, string, string][] = [
    ["Self-Attention", "O(n²·d)", "O(1)", "O(1)"],
    ["Recurrent", "O(n·d²)", "O(n)", "O(n)"],
    ["Convolutional", "O(k·n·d²)", "O(1)", "O(log_k n)"],
  ];
  // 表头
  big(ctx, "每层复杂度", 560, 340, 24, B.dim, "left", FONT_UI, 700);
  big(ctx, "顺序操作", 1080, 340, 24, B.dim, "left", FONT_UI, 700);
  big(ctx, "最大路径", 1360, 340, 24, B.dim, "left", FONT_UI, 700);
  rows.forEach(([name, cx2, seq, path], i) => {
    const p = barP(f, 160 + i * 180, 20);
    if (p <= 0) return;
    const y = 380 + i * 130;
    const hot = i === 0;
    panel(ctx, 140, y, 1640, 100, {alpha: p, stroke: hot ? B.orange : B.ink, lw: hot ? 4 : 2});
    big(ctx, name, 180, y + 62, 34, hot ? B.orange : B.ink, "left", MONO, 800);
    big(ctx, cx2, 560, y + 62, 34, B.ink, "left", MONO, 700);
    big(ctx, seq, 1080, y + 62, 34, hot ? B.orange : B.dim, "left", MONO, 800);
    big(ctx, path, 1360, y + 62, 34, hot ? B.orange : B.dim, "left", MONO, 800);
  });
  const p4 = barP(f, 780, 18);
  if (p4 > 0) {
    big(ctx, "顺序操作 O(1)：整句一拍（EP01 的并行）", 960, 876, 32, B.ink, "center", FONT_UI, 800);
    big(ctx, "n² 是代价：长文本的账，后续模型各自还债", 960, 930, 26, B.amber, "center", FONT_UI, 700);
  }
};

/* ═════════ k12 · RECAP ═════════ */
const drawK12 = (ctx: CanvasRenderingContext2D, f: number) => {
  big(ctx, "RECAP", 120, 240, 40, B.dim, "left", MONO, 800);
  big(ctx, "Attention(Q,K,V) = softmax(QKᵀ/√dk)·V", 960, 360, 60, B.ink, "center");
  const parts: [string, string][] = [
    ["QKᵀ", "打分：谁和谁相关"],
    ["÷√dk", "保梯度：Var 回到 1"],
    ["softmax", "变权重：Σ = 1"],
    ["×V", "取内容：按权重混合"],
    ["×8 头", "8 个子空间各查一次"],
    ["Wᴼ", "跨头重组回 512"],
  ];
  parts.forEach(([sym, txt], i) => {
    const p = barP(f, 200 + i * 110, 16);
    if (p <= 0) return;
    const x = 240 + (i % 3) * 560, y = 460 + Math.floor(i / 3) * 190;
    panel(ctx, x, y, 500, 130, {alpha: p, stroke: i === 1 ? B.orange : B.ink});
    big(ctx, sym, x + 30, y + 62, 40, i === 1 ? B.orange : B.ink, "left", MONO, 900);
    big(ctx, txt, x + 30, y + 108, 24, B.dim, "left", FONT_UI, 700);
  });
  const p7 = barP(f, 900, 18);
  if (p7 > 0) {
    big(ctx, "4 个数字：64 · 8 · √64 = 8.00 · 25.8", 960, 900, 40, B.orange, "center", MONO, 900);
  }
};

/* ═════════ k13 · OUTRO ═════════ */
const drawK13 = (ctx: CanvasRenderingContext2D, f: number) => {
  big(ctx, "NEXT", 960, 330, 40, B.dim, "center", MONO, 800);
  big(ctx, "位置编码", 960, 470, 120, B.ink, "center", FONT_UI, 900);
  big(ctx, "为什么是一串正弦波", 960, 580, 40, B.orange, "center", FONT_UI, 800);
  const p = barP(f, 400, 18);
  if (p > 0) {
    panel(ctx, 560, 660, 800, 100, {alpha: p, stroke: B.ink, lw: 4});
    big(ctx, "收藏 · PaperVideo 论文动画", 960, 724, 34, B.ink, "center", FONT_UI, 900);
  }
  big(ctx, "EP02 / MULTI-HEAD ATTENTION 的数学", 960, 830, 22, B.dim, "center", MONO, 600);
};

/* ═════════ 场景分发 ═════════ */
type Draw = (ctx: CanvasRenderingContext2D, f: number) => void;
const DRAW: Draw[] = [
  drawK01, drawK02, drawK03, drawK04, drawK05, drawK06, drawK07,
  drawK08, drawK09, drawK10, drawK11, drawK12, drawK13,
];

const CanvasLayer: React.FC<{index: number; frame: number}> = ({index, frame}) => {
  const ref = React.useRef<HTMLCanvasElement | null>(null);
  const shot = CH[index];
  const local = frame; // Sequence 内 useCurrentFrame 已是章内局部帧
  const t = local / shot.frames;

  React.useLayoutEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = B.bg;
    ctx.fillRect(0, 0, W, H);
    // 章内局部帧
    ctx.save();
    const cam = camAt(CAMS[index], sClamp01(t));
    ctx.translate(W / 2, H / 2);
    ctx.scale(cam.s, cam.s);
    ctx.translate(-cam.x, -cam.y);
    DRAW[index](ctx, local);
    ctx.restore();
    drawChrome(ctx, local, shot, index);
  }, [frame, index, local, shot, t]);

  return <canvas ref={ref} width={W} height={H} style={{width: "100%", height: "100%"}} />;
};

const ChapterShell: React.FC<{index: number}> = ({index}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: B.bg}}>
      <CanvasLayer index={index} frame={frame} />
    </AbsoluteFill>
  );
};

export const Ep02Mha: React.FC = () => {
  return (
    <AbsoluteFill style={{background: B.bg}}>
      <Audio src={staticFile("audio8/bgm_ep02.wav")} volume={0.92} />
      {CH.map((shot, i) => (
        <Sequence key={shot.id} from={STARTS[i]} durationInFrames={shot.frames} name={`${shot.id} ${shot.title}`}>
          <ChapterShell index={i} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

export const EP02_FRAMES = TOTAL;
