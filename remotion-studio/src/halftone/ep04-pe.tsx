import React from "react";
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from "remotion";
import {W, H, MONO, FONT_UI} from "./core";
import {camAt, type Cue} from "./camera";
import {SHOTS} from "./ep04-timeline.generated";
import {sClamp01, sEase, sRnd} from "./social-core";
import {WiseAboutLove} from "./wise-motion/catalog/remotion/aboutlove.jsx";

/* ═════════ EP04 · 位置编码（NEON ORBIT 延续 + wise-motion 动效库实装） ═════════
   风格跨集延续 EP03：同色板/星场/运镜/chrome。
   动效库实装：k01 type-reveal（逐字亮起标题）、k05 sine-grid（方块波浪波形）。 */

const C = {
  bg0: "#070a1a", bg1: "#0a0e22", bg2: "#101636",
  ink: "#f2f6ff", cyan: "#46e6ff", violet: "#8b5cf6",
  amber: "#ffc247", red: "#ff5470", dim: "#7c88b8",
  panel: "rgba(16,22,54,.72)", panelStroke: "rgba(70,230,255,.55)",
};
const NOGLOW = "rgba(0,0,0,0)";
const LETTER = 132;

const big = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number,
             color: string, align: CanvasTextAlign = "left", font = MONO, weight = 900) => {
  ctx.save();
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
  ctx.restore();
};

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

function orb(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha = 1) {
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
    ctx.save();
    ctx.globalAlpha = 0.9 * Math.sin(u * Math.PI);
    ctx.fillStyle = color;
    ctx.shadowColor = color; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(x1 + (x2 - x1) * u, y1 + (y2 - y1) * u, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

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

function cuesFor(i: number): Cue[] {
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

/* ═════════ k01 · 冷开场（wise-motion type-reveal 标题） ═════════ */
function k01(ctx: CanvasRenderingContext2D, f: number, shot: any) {
  const si = sentIdx(shot, f);
  if (si >= 3) {
    const p = pop(shot, f, 3, 20);
    glow(ctx, "位置编码", 960, 400, 120, C.ink, {align: "center", alpha: p, glow: "rgba(70,230,255,.6)"});
    glow(ctx, "为什么是正弦波", 960, 500, 44, C.cyan, {align: "center", alpha: p, glow: "rgba(70,230,255,.5)"});
  }
  if (si >= 4) {
    const p = pop(shot, f, 4, 18);
    glow(ctx, "三个性质：唯一 · 相对 · 可外推", 960, 620, 36, C.amber, {align: "center", alpha: p, glow: "rgba(255,194,71,.5)"});
  }
  if (si >= 5) {
    const p = pop(shot, f, 5, 18);
    glow(ctx, "答案不止是美学，是数学", 960, 730, 32, C.ink, {align: "center", alpha: p, glow: NOGLOW});
  }
}

/* ═════════ k02 · 排列不变性 ═════════ */
function k02(ctx: CanvasRenderingContext2D, f: number, shot: any) {
  const si = sentIdx(shot, f);
  const p1 = pop(shot, f, 0, 16);
  if (p1 > 0) {
    // 原序 vs 打乱 两面板
    panel(ctx, 160, 300, 780, 300, {alpha: p1, stroke: C.cyan});
    glow(ctx, "猫 追 狗", 550, 400, 44, C.ink, {align: "center", alpha: p1, glow: NOGLOW});
    glow(ctx, "→ 输出：猫° 狗¹ 追²", 550, 480, 28, C.cyan, {align: "center", alpha: p1, glow: NOGLOW});
    panel(ctx, 1000, 300, 780, 300, {alpha: p1, stroke: C.violet});
    glow(ctx, "狗 追 猫", 1390, 400, 44, C.ink, {align: "center", alpha: p1, glow: NOGLOW});
    glow(ctx, "→ 输出：狗¹ 猫° 追²", 1390, 480, 28, C.violet, {align: "center", alpha: p1, glow: NOGLOW});
  }
  if (si >= 4) {
    const p = pop(shot, f, 4, 18);
    glow(ctx, "数值一模一样 · 只是换了位置", 960, 690, 42, C.amber, {align: "center", alpha: p, glow: "rgba(255,194,71,.5)"});
  }
  if (si >= 6) {
    const p = pop(shot, f, 6, 18);
    glow(ctx, "排列等变【可严格证明】", 960, 790, 30, C.violet, {align: "center", alpha: p, glow: "rgba(139,92,246,.5)"});
  }
  if (si >= 7) {
    const p = pop(shot, f, 7, 18);
    glow(ctx, "猫追狗 = 狗追猫 → 灾难", 960, 890, 40, C.red, {align: "center", alpha: p, glow: "rgba(255,84,112,.5)"});
  }
}

/* ═════════ k03 · 印章 ═════════ */
function k03(ctx: CanvasRenderingContext2D, f: number, shot: any) {
  const si = sentIdx(shot, f);
  const p1 = pop(shot, f, 0, 18);
  if (p1 > 0) {
    glow(ctx, "解法只要一句话", 960, 300, 40, C.dim, {align: "center", alpha: p1, glow: NOGLOW});
  }
  const p2 = pop(shot, f, 1, 20);
  if (p2 > 0) {
    panel(ctx, 240, 380, 480, 140, {alpha: p2, stroke: C.cyan, lw: 3});
    glow(ctx, "词向量", 480, 445, 36, C.ink, {align: "center", alpha: p2, glow: NOGLOW});
    glow(ctx, "512 维", 480, 490, 20, C.dim, {align: "center", alpha: p2, font: MONO, glow: NOGLOW});
    panel(ctx, 720, 380, 480, 140, {alpha: p2, stroke: C.amber, lw: 3});
    glow(ctx, "+ 位置印章", 960, 445, 36, C.amber, {align: "center", alpha: p2, glow: "rgba(255,194,71,.4)"});
    panel(ctx, 1200, 380, 480, 140, {alpha: p2, stroke: C.violet, lw: 3});
    glow(ctx, "= 带顺序的词", 1440, 445, 36, C.violet, {align: "center", alpha: p2, glow: "rgba(139,92,246,.4)"});
    neonLine(ctx, 720, 450, 720, 450, C.ink, 1, 0, 0);
    flowDots(ctx, 720, 450, 1200, 450, f, C.ink, 2);
  }
  if (si >= 2) {
    const p = pop(shot, f, 2, 18);
    glow(ctx, "不改架构 · 不加参数 · 不破坏并行", 960, 620, 34, C.cyan, {align: "center", alpha: p, glow: "rgba(70,230,255,.4)"});
  }
  if (si >= 3) {
    const p = pop(shot, f, 3, 18);
    glow(ctx, "印章长什么样，才能又唯一又好用？", 960, 760, 40, B10(), {align: "center", alpha: p, glow: "rgba(255,194,71,.5)"});
  }
}
const B10 = () => C.amber;

/* ═════════ k04 · 公式 ═════════ */
function k04(ctx: CanvasRenderingContext2D, f: number, shot: any) {
  big(ctx, "PE(pos, 2i)   = sin( pos / 10000^(2i/d_model) )", 160, 350, 52, C.cyan, "left", MONO, 900);
  big(ctx, "PE(pos, 2i+1) = cos( pos / 10000^(2i/d_model) )", 160, 470, 52, C.violet, "left", MONO, 900);
  const p1 = barP(f, 300, 18);
  if (p1 > 0) {
    // 高亮易错点：cos 分母也是 2i
    ctx.save();
    ctx.globalAlpha = p1;
    ctx.strokeStyle = C.amber; ctx.lineWidth = 3;
    ctx.strokeRect(555, 425, 445, 62);
    ctx.restore();
    glow(ctx, "⚠ cos 的分母也是 2i，不是 2i+1（最易看错）", 160, 570, 30, B10(), {align: "left", glow: "rgba(255,194,71,.4)"});
  }
  const p2 = barP(f, 560, 18);
  if (p2 > 0) {
    glow(ctx, "pos 从 0 开始 · 维度成对铺满 512 维", 160, 680, 32, C.ink, {align: "left", glow: NOGLOW});
    glow(ctx, "每一对 = 一个不同频率的正弦振荡器", 160, 740, 32, C.cyan, {align: "left", glow: NOGLOW});
  }
  const p3 = barP(f, 780, 18);
  if (p3 > 0) {
    // 8 个振荡器频率条
    for (let i = 0; i < 8; i++) {
      const x = 220 + i * 190;
      const f0 = 1 / Math.pow(10000, (2 * i) / 512);
      const h = 40 + f0 * 3000;
      ctx.fillStyle = i % 2 ? C.violet : C.cyan;
      ctx.globalAlpha = p3 * (0.4 + 0.6 * (1 - i / 8));
      ctx.fillRect(x, 900 - h, 90, h);
    }
    ctx.globalAlpha = 1;
    glow(ctx, "512 维 = 256 对 × 256 种频率", 960, 950, 30, B10(), {align: "center", glow: "rgba(255,194,71,.4)"});
  }
}

/* ═════════ k05 · 波形（wise-motion sine-grid 实装） ═════════ */
const SineGridTile: React.FC<{ms: number}> = ({ms}) => {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const engine = React.useRef<((ms: number) => void) | null>(null);
  React.useLayoutEffect(() => {
    const F = (globalThis as any).MotionFactories;
    if (!F || !ref.current) return;
    const render = F["claude-sine-grid-illustration"](ref.current, {
      clamp: sClamp01, mix: (a: number, b: number, t: number) => a + (b - a) * t,
    }, {duration_ms: 3000});
    engine.current = (m) => render(m);
    return () => render.destroy(true);
  }, []);
  React.useLayoutEffect(() => { engine.current?.(ms); }, [ms]);
  return (
    <div style={{
      // NEON ORBIT CSS 变量 → 库内 var(--ink)/var(--muted)/var(--stage) 跟随色板
      ["--ink" as any]: "#46e6ff", ["--muted" as any]: "#7c88b8", ["--stage" as any]: "#0a0e22",
      width: 885, height: 455, transform: "scale(1)", transformOrigin: "center",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div ref={ref} style={{width: 640, height: 360}} />
    </div>
  );
};

function k05(ctx: CanvasRenderingContext2D, f: number, shot: any) {
  // sine-grid 组件由 React 层叠加（见 Shell），此处画多频曲线
  const p1 = barP(f, 60, 20);
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
        const y = 400 + Math.sin(pos / d) * 60;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }
    glow(ctx, "从 2π 到 10000·2π · 指数铺开覆盖所有尺度", 960, 560, 30, C.ink, {align: "center", alpha: p1, glow: NOGLOW});
  }
  if (f > 500) {
    const p = barP(f, 500, 18);
    if (p > 0) {
      glow(ctx, "聪明之处：频率指数分布，短程长程全盖住", 960, 640, 32, B10(), {align: "center", alpha: p, glow: "rgba(255,194,71,.4)"});
    }
  }
}

/* ═════════ k06 · 指纹 ═════════ */
function k06(ctx: CanvasRenderingContext2D, f: number, shot: any) {
  const p1 = pop(shot, f, 0, 18);
  if (p1 > 0) glow(ctx, "任意两个位置，512 维波形不会完全相同", 960, 300, 38, C.ink, {align: "center", alpha: p1, glow: "rgba(70,230,255,.4)"});
  // 指纹散点：pos 0..60 投影到 2D（前两维 sin/cos）
  const p2 = barP(f, 200, 20);
  if (p2 > 0) {
    for (let pos = 0; pos < 60; pos++) {
      const x = 560 + Math.sin(pos / 1) * 260 + Math.sin(pos / 8) * 180;
      const y = 420 + Math.cos(pos / 1) * 120 + Math.cos(pos / 8) * 90;
      const hot = pos === 0 || pos === 1;
      orb(ctx, x, y, hot ? 14 : 7, hot ? C.amber : C.cyan, p2 * (hot ? 1 : 0.7));
      if (hot) glow(ctx, `pos ${pos}`, x, y - 24, 22, C.amber, {align: "center", alpha: p2, glow: NOGLOW});
    }
    glow(ctx, "512 维指纹 · 投影到 2D", 960, 620, 26, C.dim, {align: "center", alpha: p2, glow: NOGLOW});
  }
  if (si_ok(shot, f, 4)) {
    const p = pop(shot, f, 4, 18);
    glow(ctx, "对比指纹相似度 = 推断距离", 960, 720, 34, C.violet, {align: "center", alpha: p, glow: "rgba(139,92,246,.4)"});
  }
}
const si_ok = (shot: any, f: number, si: number) => f >= shot.sentences[Math.min(si, shot.sentences.length - 1)].start;

/* ═════════ k07 · 相对位置（旋转直觉） ═════════ */
function k07(ctx: CanvasRenderingContext2D, f: number, shot: any) {
  big(ctx, "PE(pos+k) = 旋转矩阵(k) · PE(pos)", 160, 280, 46, C.ink, "left", FONT_UI, 900);
  // 单位圆 + 旋转向量
  const p1 = barP(f, 120, 20);
  if (p1 > 0) {
    ctx.save();
    ctx.globalAlpha = p1;
    ctx.strokeStyle = C.dim; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(560, 540, 200, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    const ang = f * 0.03;
    ctx.save();
    ctx.globalAlpha = p1;
    ctx.strokeStyle = C.cyan; ctx.lineWidth = 5;
    ctx.shadowColor = C.cyan; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.moveTo(560, 540); ctx.lineTo(560 + Math.cos(ang) * 200, 540 - Math.sin(ang) * 200); ctx.stroke();
    ctx.restore();
    orb(ctx, 560 + Math.cos(ang) * 200, 540 - Math.sin(ang) * 200, 12, C.amber, p1);
    glow(ctx, "PE(pos)", 560 + Math.cos(ang) * 200 + (Math.cos(ang) > 0 ? 30 : -30), 540 - Math.sin(ang) * 200 - 20, 24, C.amber, {align: Math.cos(ang) > 0 ? "left" : "right", alpha: p1, glow: NOGLOW});
    // 恒等式
    glow(ctx, "sin(pos+k) = sin(pos)·cos(k) + cos(pos)·sin(k)", 960, 850, 30, C.cyan, {align: "center", font: MONO, alpha: p1, glow: NOGLOW});
    glow(ctx, "cos(pos+k) = cos(pos)·cos(k) − sin(pos)·sin(k)", 960, 905, 30, C.cyan, {align: "center", font: MONO, alpha: p1 * 0.9, glow: NOGLOW});
  }
  const p2 = barP(f, 500, 18);
  if (p2 > 0) {
    panel(ctx, 1150, 400, 560, 260, {alpha: p2, stroke: C.violet, lw: 3});
    glow(ctx, "二维旋转矩阵", 1430, 460, 28, C.violet, {align: "center", alpha: p2});
    big(ctx, "[ cos k  −sin k ]", 1430, 530, 30, C.ink, "center", MONO, 700);
    big(ctx, "[ sin k   cos k ]", 1430, 580, 30, C.ink, "center", MONO, 700);
    glow(ctx, "只跟位移 k 有关 · 与绝对位置无关", 1430, 630, 22, C.ink, {align: "center", alpha: p2, glow: NOGLOW});
  }
  const p3 = barP(f, 800, 18);
  if (p3 > 0) {
    glow(ctx, "每移动 k 步 = 转一个固定角度", 960, 930, 34, B10(), {align: "center", alpha: p3, glow: "rgba(255,194,71,.4)"});
  }
}

/* ═════════ k08 · 注入 ═════════ */
function k08(ctx: CanvasRenderingContext2D, f: number, shot: any) {
  const p1 = pop(shot, f, 0, 18);
  if (p1 > 0) {
    glow(ctx, "注入方式：直接相加", 960, 300, 44, C.ink, {align: "center", alpha: p1, glow: "rgba(70,230,255,.4)"});
    panel(ctx, 260, 380, 480, 130, {alpha: p1, stroke: C.cyan, lw: 3});
    glow(ctx, "词嵌入 512", 500, 455, 32, C.ink, {align: "center", alpha: p1, glow: NOGLOW});
    panel(ctx, 720, 380, 480, 130, {alpha: p1, stroke: C.amber, lw: 3});
    glow(ctx, "+ 印章 512", 960, 455, 32, C.amber, {align: "center", alpha: p1, glow: NOGLOW});
    panel(ctx, 1180, 380, 480, 130, {alpha: p1, stroke: C.violet, lw: 3});
    glow(ctx, "= 512", 1420, 455, 32, C.violet, {align: "center", alpha: p1, glow: NOGLOW});
  }
  const p2 = barP(f, 400, 18);
  if (p2 > 0) {
    // 拼接 vs 相加 对比
    panel(ctx, 260, 580, 700, 220, {alpha: p2, stroke: C.red, lw: 3});
    glow(ctx, "✗ 拼接", 300, 640, 30, C.red, {align: "left", glow: NOGLOW});
    glow(ctx, "512 + 512 = 1024 维", 300, 700, 28, C.ink, {align: "left", alpha: p2, glow: NOGLOW});
    glow(ctx, "后续层全部要改 · 参数暴涨", 300, 750, 24, C.dim, {align: "left", alpha: p2, glow: NOGLOW});
    panel(ctx, 1020, 580, 700, 220, {alpha: p2, stroke: C.cyan, lw: 3});
    glow(ctx, "✓ 相加", 1060, 640, 30, C.cyan, {align: "left", glow: NOGLOW});
    glow(ctx, "维度保持 512", 1060, 700, 28, C.ink, {align: "left", alpha: p2, glow: NOGLOW});
    glow(ctx, "架构不动 · 计算量不动 · 参数不动", 1060, 750, 24, C.dim, {align: "left", alpha: p2, glow: NOGLOW});
  }
  const p3 = barP(f, 800, 18);
  if (p3 > 0) {
    glow(ctx, "位置信息悄悄混进每个词的表示", 960, 890, 36, C.cyan, {align: "center", alpha: p3, glow: "rgba(70,230,255,.4)"});
  }
}

/* ═════════ k09 · 外推 ═════════ */
function k09(ctx: CanvasRenderingContext2D, f: number, shot: any) {
  const p1 = barP(f, 80, 18);
  if (p1 > 0) {
    // 训练范围 vs 推理需求
    ctx.save();
    ctx.globalAlpha = p1;
    ctx.fillStyle = "rgba(70,230,255,.15)";
    ctx.fillRect(300, 350, 700, 60);
    ctx.fillStyle = "rgba(255,84,112,.15)";
    ctx.fillRect(1000, 350, 620, 60);
    ctx.strokeStyle = C.cyan; ctx.lineWidth = 2;
    ctx.strokeRect(300, 350, 700, 60);
    ctx.strokeRect(1000, 350, 620, 60);
    ctx.restore();
    glow(ctx, "训练见过的位置 0–511", 650, 390, 26, C.cyan, {align: "center", alpha: p1, glow: NOGLOW});
    glow(ctx, "推理要求 0–1610", 1310, 390, 26, C.red, {align: "center", alpha: p1, glow: NOGLOW});
    // sin 曲线延伸
    ctx.save();
    ctx.globalAlpha = p1;
    ctx.strokeStyle = C.cyan; ctx.lineWidth = 3;
    ctx.shadowColor = C.cyan; ctx.shadowBlur = 10;
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const x = 300 + i * 6.6;
      const y = 560 + Math.sin(i * 0.09) * 60;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
    glow(ctx, "sin 是解析函数：任何位置都能算【推断】", 960, 700, 32, C.ink, {align: "center", alpha: p1, glow: NOGLOW});
  }
  const p2 = barP(f, 600, 18);
  if (p2 > 0) {
    glow(ctx, "诚实标注：超长部分效果打折扣", 960, 790, 30, B10(), {align: "center", alpha: p2, glow: "rgba(255,194,71,.4)"});
    glow(ctx, "可学习嵌入更受限：查表超出即无定义", 960, 860, 30, C.red, {align: "center", alpha: p2, glow: "rgba(255,84,112,.4)"});
  }
  const p3 = barP(f, 900, 18);
  if (p3 > 0) glow(ctx, "外推能力 = 正弦方案的隐藏优势", 960, 950, 34, C.cyan, {align: "center", alpha: p3, glow: "rgba(70,230,255,.4)"});
}

/* ═════════ k10 · 消融 (E) ═════════ */
function k10(ctx: CanvasRenderingContext2D, f: number, shot: any) {
  big(ctx, "消融 (E)：两种印章上擂台", 120, 260, 44, C.ink, "left", FONT_UI, 900);
  big(ctx, "results.tex · Table 3(E)【文中有据】", 120, 320, 22, C.dim, "left", MONO, 600);
  const rows: [string, string, string][] = [
    ["可学习位置嵌入", "25.7", C.violet],
    ["正弦波（论文选择）", "25.8", C.cyan],
  ];
  rows.forEach(([name, val, color], i) => {
    const p = barP(f, 150 + i * 200, 20);
    if (p <= 0) return;
    const y = 420 + i * 130;
    panel(ctx, 200, y, 1520, 100, {alpha: p, stroke: color, lw: i === 1 ? 4 : 2});
    glow(ctx, name, 280, y + 60, 32, C.ink, {align: "left", alpha: p, glow: NOGLOW});
    glow(ctx, val + " BLEU", 1560, y + 60, 40, color, {align: "right", alpha: p, font: MONO});
  });
  const p3 = barP(f, 500, 18);
  if (p3 > 0) {
    glow(ctx, "差距 < 0.1 · 论文原话：produce nearly identical results", 960, 720, 30, C.ink, {align: "center", glow: NOGLOW});
  }
  const p4 = barP(f, 700, 18);
  if (p4 > 0) {
    glow(ctx, "为什么还选正弦？免训练 · 零参数 · 天然可外推", 960, 820, 36, B10(), {align: "center", alpha: p4, glow: "rgba(255,194,71,.4)"});
    glow(ctx, "三个理由合起来 = 更工程化的选择", 960, 890, 30, C.ink, {align: "center", alpha: p4, glow: NOGLOW});
  }
}

/* ═════════ k11 · 演进 ═════════ */
function k11(ctx: CanvasRenderingContext2D, f: number, shot: any) {
  const items: [string, string, string][] = [
    ["2017", "正弦波", "本文 · 解析可外推"],
    ["2021", "RoPE", "相对位移 → 向量旋转"],
    ["2022", "ALiBi", "线性距离惩罚"],
    ["—", "无显式编码", "局部窗口隐式建模"],
  ];
  items.forEach(([year, name, note], i) => {
    const p = barP(f, 100 + i * 150, 18);
    if (p <= 0) return;
    const x = 200 + i * 400;
    panel(ctx, x, 340, 360, 180, {alpha: p, stroke: i === 0 ? C.cyan : C.violet});
    glow(ctx, year, x + 180, 410, 36, i === 0 ? C.cyan : C.violet, {align: "center", font: MONO, alpha: p, glow: NOGLOW});
    glow(ctx, name, x + 180, 460, 30, C.ink, {align: "center", alpha: p, glow: NOGLOW});
    glow(ctx, note, x + 180, 500, 18, C.dim, {align: "center", alpha: p, glow: NOGLOW});
    if (i < 3) neonLine(ctx, x + 360, 430, x + 400, 430, C.dim, 2, 0.5 * p, 0);
  });
  const p5 = barP(f, 750, 18);
  if (p5 > 0) {
    glow(ctx, "超出论文范围 · 后人的接力【标注】", 960, 640, 28, C.dim, {align: "center", alpha: p5, glow: NOGLOW});
    glow(ctx, "万变不离其宗：位置信息必须显式或隐式地给到模型", 960, 720, 32, C.ink, {align: "center", alpha: p5, glow: "rgba(70,230,255,.4)"});
  }
}

/* ═════════ k12 · 总结 ═════════ */
function k12(ctx: CanvasRenderingContext2D, f: number, shot: any) {
  const cards: [string, string][] = [
    ["唯一性", "每位置一枚独一印章"],
    ["相对性", "位移 = 固定角度旋转"],
    ["可外推", "解析函数不限长度"],
  ];
  cards.forEach(([zh, sub], i) => {
    const p = barP(f, 80 + i * 120, 18);
    if (p <= 0) return;
    const x = 240 + i * 520;
    panel(ctx, x, 280, 460, 160, {alpha: p, stroke: [C.cyan, C.violet, C.amber][i], lw: 3});
    glow(ctx, zh, x + 230, 350, 34, [C.cyan, C.violet, C.amber][i], {align: "center", alpha: p});
    glow(ctx, sub, x + 230, 400, 20, C.dim, {align: "center", alpha: p, glow: NOGLOW});
  });
  const p4 = barP(f, 500, 20);
  if (p4 > 0) {
    glow(ctx, "两行公式 · 三个性质 · 撑起全架构对顺序的理解", 960, 560, 38, C.ink, {align: "center", alpha: p4, glow: "rgba(70,230,255,.4)"});
  }
  const p5 = barP(f, 700, 20);
  if (p5 > 0) {
    glow(ctx, "系列四集已完结：注意力 · 多头 · 缩放 · 位置", 960, 680, 30, C.dim, {align: "center", alpha: p5, glow: NOGLOW});
    glow(ctx, "下一集：训练配方 · 数据与优化器的反直觉技巧", 960, 750, 30, C.violet, {align: "center", alpha: p5, glow: "rgba(139,92,246,.4)"});
  }
  const p6 = barP(f, 900, 20);
  if (p6 > 0) {
    glow(ctx, "纸片工作室 · 收藏不迷路", 960, 860, 30, B10(), {align: "center", alpha: p6, glow: "rgba(255,194,71,.4)"});
  }
}

/* ═════════ 场景分发 ═════════ */
type Draw = (ctx: CanvasRenderingContext2D, f: number, shot: any) => void;
const DRAW: Draw[] = [k01, k02, k03, k04, k05, k06, k07, k08, k09, k10, k11, k12];

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
    // chrome
    ctx.save();
    big(ctx, "EP04 // POSITIONAL ENCODING", 40, 64, 19, C.dim, "left", MONO, 700);
    big(ctx, `SEC ${String(index + 1).padStart(2, "0")}/12 · ${shot.kicker}`, W - 40, 64, 21, shot.accent, "right", MONO, 800);
    ctx.fillStyle = "rgba(70,230,255,.18)"; ctx.fillRect(0, H - 6, W, 6);
    ctx.fillStyle = C.cyan; ctx.fillRect(0, H - 6, W * ((local + 1) / shot.frames), 6);
    glow(ctx, shot.title, 40, H - 28, 24, shot.accent, {glow: NOGLOW, weight: 800});
    big(ctx, String(index + 1).padStart(2, "0"), 1870, 950, 360, "rgba(139,92,246,.14)", "right");
    ctx.strokeStyle = "rgba(70,230,255,.2)"; ctx.lineWidth = 1;
    ctx.strokeRect(30, 96, W - 60, H - 156);
    ctx.restore();
  }, [frame, index, local, shot, t]);
  return <canvas ref={ref} width={W} height={H} style={{width: "100%", height: "100%"}} />;
};

const ChapterShell: React.FC<{index: number}> = ({index}) => {
  const frame = useCurrentFrame();
  const isK01 = index === 0;
  return (
    <AbsoluteFill style={{background: C.bg1}}>
      <CanvasLayer index={index} frame={frame} />
      {isK01 && (
        <AbsoluteFill style={{opacity: frame >= 60 && frame < 400 ? 1 : 0, transition: "opacity 0.2s"}}>
          <WiseAboutLove effectId="type-reveal" variantId="aboutlove-01" includeAudio={false} />
        </AbsoluteFill>
      )}
      {SHOTS[index].sentences.map((s: any, k: number) => (
        <Sequence key={k} from={s.start} durationInFrames={s.frames} name={`${SHOTS[index].id}-${k + 1}`}>
          <Audio src={staticFile(`audio10/${s.audio}.mp3`)} volume={1} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

export const Ep04Pe: React.FC = () => {
  return (
    <AbsoluteFill style={{background: C.bg1}}>
      <Audio src={staticFile("audio10/bgm_ep04.wav")} volume={0.55} />
      {SHOTS.map((shot: any, i: number) => (
        <Sequence key={shot.id} from={shot.start} durationInFrames={shot.frames} name={`${shot.id} ${shot.title}`}>
          <ChapterShell index={i} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

export const EP04_FRAMES = SHOTS.reduce((a, b) => a + b.frames, 0);
