import React from "react";
import {useCurrentFrame} from "remotion";
import {FONT_UI, H, MONO, PAL, W} from "./core";
import {
  HalftoneStage,
  HazardStrip,
  HudBar,
  clamp01,
  gridDots,
  paintDots,
  textDots,
} from "./core";
import {crtTrace, gauge, hazardBar, plate, ringTicks, smooth} from "./mech";
import {camAt, curtain, withCamera, type Cue, type TransitionKind} from "./camera";
import type {Shot} from "../blueprint/timeline.generated";

/* ─────────── 文本工具 ─────────── */

const label = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size = 13, alpha = 0.5) => {
  ctx.save();
  ctx.font = `500 ${size}px ${MONO}`;
  ctx.fillStyle = `rgba(255,210,30,${alpha})`;
  ctx.fillText(text, x, y);
  ctx.restore();
};

const body = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size = 24, alpha = 0.9) => {
  ctx.save();
  ctx.font = `700 ${size}px ${FONT_UI}`;
  ctx.fillStyle = `rgba(244,241,230,${alpha})`;
  ctx.fillText(text, x, y);
  ctx.restore();
};

const line = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, w = 2, color = PAL.ink, alpha = 0.8) => {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
};

const Scene: React.FC<{
  shot: Shot;
  index: number;
  kind: TransitionKind;
  cues: Cue[];
  draw: (ctx: CanvasRenderingContext2D, f: number, t: number) => void;
}> = ({shot, index, kind, cues, draw}) => {
  const frame = useCurrentFrame();
  const t = frame / shot.frames;
  const cam = camAt(cues, t);
  return (
    <>
      <HalftoneStage
        draw={(ctx, f) => {
          withCamera(ctx, cam, () => draw(ctx, f, t));
          curtain(ctx, kind, f, shot.frames);
        }}
      />
      <Chrome shot={shot} index={index} />
    </>
  );
};

/* ═════════ c01 · 印刷机：把标题印出来 ═════════ */

export const H01: React.FC<{shot: Shot}> = ({shot}) => {
  const word = textDots("ATTENTION", {fitWidth: 1500, crop: 0.06, y: -400});
  return (
    <Scene
      shot={shot}
      index={1}
      kind="page"
      cues={[
        {t: 0, x: 960, y: 600, s: 1},
        {t: 0.22, x: 900, y: 300, s: 1.55},
        {t: 0.62, x: 960, y: 560, s: 0.95},
        {t: 1, x: 960, y: 560, s: 1.02},
      ]}
      draw={(ctx, f) => {
        const headX = 340 + (Math.sin(f * 0.012) * 0.5 + 0.5) * 1240;
        const printX = 340 + ((f * 3.2) % 1240);

        line(ctx, 260, 210, 1700, 210, 3, PAL.ink, 0.5);
        line(ctx, 260, 250, 1700, 250, 1, PAL.ink, 0.25);
        plate(ctx, 300, 300, 1320, 560, {alpha: 0.55, rivets: false, fill: "rgba(12,12,11,.75)"});
        [[340, 340], [1580, 340], [340, 820], [1580, 820]].forEach(([x, y]) => {
          line(ctx, x - 12, y, x + 12, y, 1, PAL.ink, 0.5);
          line(ctx, x, y - 12, x, y + 12, 1, PAL.ink, 0.5);
        });

        paintDots(ctx, word.filter((d) => d.x <= printX), {frame: f, warmth: 0.1});

        plate(ctx, headX - 120, 190, 240, 76, {alpha: 0.95, hazard: true});
        for (let i = 0; i < 9; i++) {
          ctx.save();
          ctx.fillStyle = PAL.warm;
          ctx.globalAlpha = 0.9;
          ctx.fillRect(headX - 96 + i * 24, 268, 10, 10);
          ctx.restore();
        }
        label(ctx, "PRINT HEAD · 8PX DOT", headX - 118, 182, 11, 0.55);

        plate(ctx, 1320, 700, 280, 140, {alpha: 0.5, rivets: true});
        label(ctx, "ATTENTION IS ALL YOU NEED", 1338, 738, 9, 0.55);
        label(ctx, "No.1706.03762 · SHEET 01", 1338, 762, 9, 0.4);
        label(ctx, "NEURIPS 2017", 1338, 786, 9, 0.4);
        label(ctx, "注意力，就是你所需要的一切", 1338, 812, 10, 0.55);

        label(ctx, "INDUSTRIAL PRESS · HALFTONE PLATE", 300, 178, 12, 0.5);
        gauge(ctx, 1700, 420, 86, (printX - 340) / 1240, {alpha: 0.6, label: "PRINT", min: 0, max: 100, unit: "%"});
      }}
    />
  );
};

/* ═════════ c02 · 串行传送带 ═════════ */

export const H02: React.FC<{shot: Shot}> = ({shot}) => (
  <Scene
    shot={shot}
    index={2}
    kind="shutter"
    cues={[
      {t: 0, x: 900, y: 560, s: 1},
      {t: 0.28, x: 1220, y: 520, s: 1.65},
      {t: 0.62, x: 900, y: 620, s: 1.05},
      {t: 1, x: 900, y: 620, s: 1},
    ]}
    draw={(ctx, f) => {
      const beltY = 520;
      line(ctx, 220, beltY + 64, 1700, beltY + 64, 8, PAL.ink, 0.35);
      for (let i = 0; i < 18; i++) {
        ctx.save();
        ctx.strokeStyle = PAL.ink;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(250 + i * 84, beltY + 70, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      const gateX = 1210;
      for (let i = 0; i < 6; i++) {
        const x = 220 + ((f * 2.6 + i * 175) % 1480);
        const atGate = Math.abs(x - gateX) < 70;
        plate(ctx, x - 46, beltY - 34, 92, 68, {alpha: 0.95, hazard: atGate, rivets: true});
        label(ctx, "T" + (i + 1), x - 14, beltY + 6, 14, 0.8);
        if (atGate) {
          ctx.save();
          ctx.globalAlpha = 0.8;
          ctx.strokeStyle = PAL.warm;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(x, beltY, 62, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      plate(ctx, gateX - 90, beltY - 150, 34, 300, {alpha: 0.95, hazard: true});
      plate(ctx, gateX + 56, beltY - 150, 34, 300, {alpha: 0.95, hazard: true});
      label(ctx, "GATE · 1 TOKEN", gateX - 86, beltY - 168, 11, 0.55);

      plate(ctx, 240, 250, 300, 120, {alpha: 0.7});
      label(ctx, "QUEUE", 258, 282, 11, 0.45);
      ctx.save();
      ctx.font = `800 44px ${MONO}`;
      ctx.fillStyle = PAL.ink;
      ctx.fillText("6", 258, 336);
      ctx.font = `700 12px ${MONO}`;
      ctx.fillStyle = "rgba(255,61,0,.9)";
      ctx.fillText("SEQUENTIAL · O(n)", 300, 330);
      ctx.restore();
      gauge(ctx, 1700, 300, 96, 0.92, {alpha: 0.65, label: "WAIT", min: 0, max: 100, unit: "%"});

      const gx = 300;
      const gy = 760;
      const activeCol = Math.floor(((f * 0.006) % 1) * 16);
      for (let j = 0; j < 4; j++)
        for (let i = 0; i < 16; i++) {
          const on = i === activeCol && j === 1;
          ctx.save();
          ctx.globalAlpha = on ? 1 : 0.22;
          ctx.fillStyle = on ? PAL.warm : PAL.ink;
          ctx.fillRect(gx + i * 46 - 6, gy + j * 34 - 6, 12, 12);
          ctx.restore();
        }
      label(ctx, "GPU CORES · 1 ACTIVE", gx - 6, gy + 4 * 34 + 18, 11, 0.45);
    }}
  />
);

/* ═════════ c03 · 检索灯 ═════════ */

const SIM = [0.9, 0.62, 0.44, 0.3, 0.22, 0.14];

export const H03: React.FC<{shot: Shot}> = ({shot}) => (
  <Scene
    shot={shot}
    index={3}
    kind="iris"
    cues={[
      {t: 0, x: 900, y: 540, s: 1},
      {t: 0.3, x: 1250, y: 340, s: 1.35},
      {t: 0.62, x: 900, y: 520, s: 1.05},
      {t: 1, x: 900, y: 520, s: 1},
    ]}
    draw={(ctx, f, t) => {
      const wallX = 1400;
      const cards = SIM.map((s, i) => ({s, x: wallX, y: 190 + i * 128}));
      const scanY = 190 + (Math.sin(f * 0.02) * 0.5 + 0.5) * 640;
      const widen = smooth((t - 0.45) / 0.25);
      const lamp = {x: 260, y: 150};

      plate(ctx, lamp.x - 60, lamp.y - 34, 120, 68, {alpha: 0.95, hazard: true});
      label(ctx, "QUERY LAMP", lamp.x - 52, lamp.y - 44, 10, 0.55);
      ctx.save();
      ctx.fillStyle = PAL.warm;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y + 6, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      cards.forEach((c) => {
        const on = Math.max(0, 1 - Math.abs(c.y - scanY) / 90);
        const beamAlpha = (0.05 + on * 0.22) * (1 - widen) + widen * (0.06 + c.s * 0.2);
        ctx.save();
        ctx.globalAlpha = beamAlpha;
        ctx.strokeStyle = on > 0.4 ? PAL.warm : PAL.ink;
        ctx.lineWidth = 1 + on * 2;
        ctx.beginPath();
        ctx.moveTo(lamp.x + 20, lamp.y + 10);
        ctx.lineTo(c.x - 150, c.y);
        ctx.stroke();
        ctx.restore();
      });

      cards.forEach((c, i) => {
        const on = Math.max(0, 1 - Math.abs(c.y - scanY) / 90);
        plate(ctx, c.x - 150, c.y - 44, 300, 88, {alpha: 0.95, hazard: on > 0.6 || widen > 0.4});
        for (let k = 0; k < 4; k++) {
          ctx.save();
          ctx.fillStyle = PAL.ink;
          ctx.globalAlpha = 0.85;
          ctx.fillRect(c.x - 126 + k * 14, c.y - 8, 8, 8);
          ctx.restore();
        }
        ctx.save();
        ctx.fillStyle = PAL.warm;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(c.x - 60, c.y - 4, 30 + c.s * 170, 8);
        ctx.restore();
        label(ctx, "KEY " + (i + 1), c.x - 148, c.y - 56, 10, 0.4 + on * 0.4);
      });

      if (widen > 0.05) {
        ctx.save();
        ctx.globalAlpha = widen * 0.5;
        ctx.strokeStyle = PAL.ink;
        ctx.lineWidth = 1;
        for (let i = 0; i < cards.length; i++)
          for (let j = i + 1; j < cards.length; j++) {
            ctx.beginPath();
            ctx.moveTo(cards[i].x, cards[i].y);
            ctx.lineTo(cards[j].x, cards[j].y);
            ctx.stroke();
          }
        ctx.restore();
        label(ctx, "ALL-TO-ALL · O(1) PATH", 1240, 940, 12, 0.5 * widen);
      }
      label(ctx, "SEARCHLIGHT = ATTENTION", 240, 420, 13, 0.5);
    }}
  />
);

/* ═════════ c04 · 计算管线 ═════════ */

export const H04: React.FC<{shot: Shot}> = ({shot}) => (
  <Scene
    shot={shot}
    index={4}
    kind="wipe"
    cues={[
      {t: 0, x: 900, y: 560, s: 1},
      {t: 0.32, x: 1100, y: 560, s: 1.55},
      {t: 0.66, x: 1450, y: 560, s: 1.2},
      {t: 1, x: 1450, y: 560, s: 1.05},
    ]}
    draw={(ctx, f, t) => {
      const railY = 620;
      line(ctx, 240, railY + 70, 1720, railY + 70, 6, PAL.ink, 0.35);

      ["Q", "K", "V"].forEach((name, i) => {
        const drop = smooth((t - i * 0.07) / 0.16);
        const x = 560 + i * 190;
        const y = railY - 60 * (1 - drop);
        plate(ctx, x - 70, y - 90, 140, 120, {alpha: 0.95, hazard: i === 1});
        ctx.save();
        ctx.font = `800 46px ${MONO}`;
        ctx.fillStyle = PAL.ink;
        ctx.fillText(name, x - 16, y - 18);
        ctx.restore();
        label(ctx, i === 0 ? "QUESTION" : i === 1 ? "LABEL" : "CONTENT", x - 62, y + 16, 9, 0.45);
      });

      plate(ctx, 1000, railY - 160, 300, 240, {alpha: 0.95, hazard: true});
      ctx.save();
      ctx.font = `800 64px ${MONO}`;
      ctx.fillStyle = PAL.warm;
      ctx.fillText("×", 1120, railY - 20);
      ctx.font = `700 14px ${MONO}`;
      ctx.fillStyle = PAL.ink;
      ctx.fillText("QKᵀ", 1200, railY - 120);
      ctx.restore();
      label(ctx, "DOT-PRODUCT ENGINE", 1004, railY - 176, 11, 0.5);

      ctx.save();
      ctx.strokeStyle = PAL.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(1320, railY - 150);
      ctx.lineTo(1500, railY - 150);
      ctx.lineTo(1440, railY + 30);
      ctx.lineTo(1380, railY + 30);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
      label(ctx, "SOFTMAX", 1352, railY - 168, 11, 0.55);

      plate(ctx, 1560, railY - 60, 220, 150, {alpha: 0.9});
      label(ctx, "OUTPUT VECTOR", 1572, railY - 76, 10, 0.5);
      for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.fillStyle = i === 0 ? PAL.warm : PAL.ink;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(1580 + i * 32, railY - 20, 20, 20 + (1 - i / 8) * 70);
        ctx.restore();
      }

      const scores = [0.62, 0.24, 0.46, 0.18, 0.34, 0.22];
      scores.forEach((v, i) => {
        ctx.save();
        ctx.fillStyle = PAL.ink;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(1020 + i * 44 - 4, railY + 40 - v * 120, 8, v * 120);
        ctx.restore();
      });
      label(ctx, "SCORES", 1020, railY + 56, 10, 0.4);
      ctx.save();
      ctx.font = `700 26px ${MONO}`;
      ctx.fillStyle = PAL.ink;
      ctx.globalAlpha = 0.88;
      ctx.fillText("softmax( QKᵀ / √dₖ ) · V", 780, 214);
      ctx.restore();
    }}
  />
);

/* ═════════ c05 · 方差仪表 ═════════ */

export const H05: React.FC<{shot: Shot}> = ({shot}) => (
  <Scene
    shot={shot}
    index={5}
    kind="dip"
    cues={[
      {t: 0, x: 960, y: 560, s: 1},
      {t: 0.28, x: 330, y: 420, s: 1.55},
      {t: 0.62, x: 1590, y: 420, s: 1.5},
      {t: 1, x: 960, y: 560, s: 1},
    ]}
    draw={(ctx) => {
      const base = 820;
      const sharp = [1, 0.16, 0.09, 0.06, 0.05, 0.04, 0.03, 0.02];
      const smoothV = [0.4, 0.35, 0.3, 0.26, 0.22, 0.19, 0.16, 0.14];

      gauge(ctx, 330, 330, 150, 0.95, {alpha: 0.85, label: "σ", min: 0, max: 10, unit: ""});
      gauge(ctx, 1590, 330, 150, 0.1, {alpha: 0.85, label: "σ", min: 0, max: 10, unit: ""});

      sharp.forEach((v, i) => {
        ctx.save();
        ctx.fillStyle = PAL.ink;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(200 + i * 52 - 6, base - v * 380, 12, v * 380);
        ctx.restore();
      });
      smoothV.forEach((v, i) => {
        ctx.save();
        ctx.fillStyle = PAL.ink;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(1180 + i * 52 - 6, base - v * 380, 12, v * 380);
        ctx.restore();
      });
      hazardBar(ctx, 160, base + 26, 560, 14, {alpha: 0.85});
      hazardBar(ctx, 1140, base + 26, 560, 14, {alpha: 0.85});

      ctx.save();
      ctx.strokeStyle = PAL.warm;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(196, 640, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = PAL.warm;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(196, 640, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      label(ctx, "ONE-HOT LAMP", 150, 690, 10, 0.5);

      label(ctx, "UNSCALED · Var = 64", 160, 170, 14, 0.6);
      label(ctx, "÷ √dₖ · Var = 1", 1140, 170, 14, 0.6);
      body(ctx, "除以 8，把方差拉回 1", 160, 940, 26, 0.8);
    }}
  />
);

/* ═════════ c06 · 调音台 ═════════ */

export const H06: React.FC<{shot: Shot}> = ({shot}) => (
  <Scene
    shot={shot}
    index={6}
    kind="page"
    cues={[
      {t: 0, x: 900, y: 560, s: 1},
      {t: 0.3, x: 560, y: 600, s: 1.45},
      {t: 0.66, x: 1320, y: 640, s: 1.35},
      {t: 1, x: 1200, y: 600, s: 1},
    ]}
    draw={(ctx, f) => {
      const weights = [0.36, 0.24, 0.16, 0.12, 0.08, 0.04];
      const top = 380;
      const bottom = 780;
      weights.forEach((w, i) => {
        const x = 340 + i * 120;
        line(ctx, x, top, x, bottom, 3, PAL.ink, 0.35);
        line(ctx, x - 26, top, x + 26, top, 2, PAL.ink, 0.5);
        line(ctx, x - 26, bottom, x + 26, bottom, 2, PAL.ink, 0.5);
        const knobY = bottom - w * 2.4 * (bottom - top);
        plate(ctx, x - 30, knobY - 14, 60, 28, {alpha: 0.95, hazard: i === 0});
        label(ctx, (w * 100).toFixed(0) + "%", x - 16, knobY + 5, 10, 0.7);
        ctx.save();
        ctx.fillStyle = i === 0 ? PAL.warm : PAL.ink;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(x - 3, knobY, 6, bottom - knobY);
        ctx.restore();
      });

      line(ctx, 300, 840, 1500, 840, 4, PAL.warm, 0.7);
      for (let i = 0; i < weights.length; i++) line(ctx, 340 + i * 120, 800, 340 + i * 120, 840, 2, PAL.ink, 0.5);
      label(ctx, "SUM BUS", 300, 872, 11, 0.5);

      plate(ctx, 1540, 620, 260, 260, {alpha: 0.9});
      const level = 0.55 + 0.25 * Math.sin(f * 0.08);
      for (let i = 0; i < 12; i++) {
        ctx.save();
        ctx.globalAlpha = i / 12 < level ? 0.95 : 0.15;
        ctx.fillStyle = i > 9 ? PAL.warm : PAL.ink;
        ctx.fillRect(1570, 840 - i * 18, 180, 10);
        ctx.restore();
      }
      label(ctx, "Σ wᵢ·vᵢ", 1560, 606, 14, 0.7);
      label(ctx, "MIX CONSOLE · WEIGHTED SUM", 300, 170, 13, 0.5);
    }}
  />
);

/* ═════════ c07 · 八路监视器 ═════════ */

const PATTERNS: ((i: number, j: number) => number)[] = [
  (i, j) => (i === j ? 0.95 : 0.06),
  (i, j) => (i + j === 4 ? 0.9 : 0.05),
  (i, j) => (i === 0 ? 0.85 : 0.08),
  (i, j) => (Math.abs(i - j) <= 1 ? 0.8 : 0.05),
  (i, j) => (j === 0 ? 0.75 : 0.1),
  (i, j) => (i >= j ? 0.7 : 0.04),
  (i, j) => (Math.abs(i - j) === 2 ? 0.7 : 0.06),
  (i, j) => (Math.abs(i - 2) + Math.abs(j - 2) < 2 ? 0.85 : 0.05),
];

export const H07: React.FC<{shot: Shot}> = ({shot}) => (
  <Scene
    shot={shot}
    index={7}
    kind="shutter"
    cues={[
      {t: 0, x: 960, y: 540, s: 1},
      {t: 0.26, x: 480, y: 380, s: 1.7},
      {t: 0.6, x: 960, y: 520, s: 1.05},
      {t: 1, x: 960, y: 520, s: 1},
    ]}
    draw={(ctx, f, t) => {
      const merge = smooth((t - 0.56) / 0.24);
      for (let k = 0; k < 8; k++) {
        const col = k % 4;
        const row = Math.floor(k / 4);
        const bx = 300 + col * 360;
        const by = 250 + row * 330;
        const cx = bx + (960 - bx) * merge * 0.8;
        const cy = by + (520 - by) * merge * 0.8;
        const scale = 1 - merge * 0.5;
        plate(ctx, cx - 150 * scale, cy - 110 * scale, 300 * scale, 220 * scale, {alpha: 0.9 * (1 - merge * 0.6)});
        const d = gridDots({
          x: cx - 120 * scale,
          y: cy - 80 * scale,
          w: 240 * scale,
          h: 160 * scale,
          cols: 5,
          rows: 5,
          value: (i, j) => PATTERNS[k](i, j) * (0.75 + 0.25 * Math.sin(f * 0.05 + k)),
          maxR: 12 * scale,
        });
        paintDots(ctx, d, {frame: f, warmth: 0.15, alpha: (1 - merge * 0.7) * 0.95});
        label(ctx, "HEAD " + (k + 1), cx - 146 * scale, cy - 124 * scale, 10, 0.4 * (1 - merge));
      }
      if (merge > 0.2) {
        plate(ctx, 760, 380, 400, 280, {alpha: merge, hazard: true});
        const merged = gridDots({
          x: 780,
          y: 400,
          w: 360,
          h: 240,
          cols: 12,
          rows: 8,
          value: (i, j) => PATTERNS[j % 8](i % 5, (i * 2) % 5) * (0.72 + 0.28 * Math.sin(f * 0.05 + j)),
          maxR: 11,
        });
        paintDots(ctx, merged, {frame: f, warmth: 0.2, alpha: (merge - 0.2) / 0.8});
        label(ctx, "CONCAT → 512", 790, 340, 13, 0.6 * merge);
      }
      label(ctx, "8 MONITORS · 8 RELATIONS", 300, 180, 13, 0.5);
    }}
  />
);

/* ═════════ c08 · 打码机 ═════════ */

export const H08: React.FC<{shot: Shot}> = ({shot}) => (
  <Scene
    shot={shot}
    index={8}
    kind="iris"
    cues={[
      {t: 0, x: 900, y: 560, s: 1},
      {t: 0.28, x: 560, y: 500, s: 1.45},
      {t: 0.66, x: 1320, y: 400, s: 1.35},
      {t: 1, x: 1100, y: 520, s: 1},
    ]}
    draw={(ctx, f) => {
      ringTicks(ctx, 520, 420, 170, 60, f * 0.01, {alpha: 0.6});
      ringTicks(ctx, 520, 420, 210, 120, -f * 0.006, {alpha: 0.25, len: 8});
      ctx.save();
      ctx.strokeStyle = PAL.warm;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(520, 420);
      const a = f * 0.03;
      ctx.lineTo(520 + Math.cos(a) * 170, 420 + Math.sin(a) * 170);
      ctx.stroke();
      ctx.restore();
      label(ctx, "POSITION DIAL", 430, 240, 11, 0.5);

      const stampY = 620 + Math.max(0, Math.sin(f * 0.09)) * 60;
      plate(ctx, 480, stampY, 80, 90, {alpha: 0.95, hazard: true});
      line(ctx, 520, stampY + 90, 520, 700, 3, PAL.warm, 0.8);

      for (let i = 0; i < 5; i++) {
        const x = 260 + ((f * 3 + i * 240) % 1200);
        plate(ctx, x - 50, 660, 100, 80, {alpha: 0.9});
        label(ctx, "T" + (i + 1), x - 14, 708, 12, 0.75);
        if (Math.abs(x - 520) < 60) {
          ctx.save();
          ctx.fillStyle = PAL.warm;
          ctx.globalAlpha = 0.9;
          for (let k = 0; k < 4; k++) ctx.fillRect(x - 20 + (k % 2) * 22, 716 + Math.floor(k / 2) * 20, 12, 12);
          ctx.restore();
        }
      }

      for (let k = 0; k < 3; k++) {
        const pts: {x: number; y: number}[] = [];
        for (let i = 0; i <= 100; i++) {
          const p = i / 100;
          pts.push({x: 1240 + p * 520, y: 260 + k * 110 + Math.sin(p * Math.PI * 2 * (4 / (k + 1)) + f * 0.06) * 30});
        }
        crtTrace(ctx, pts, {alpha: 0.85, width: 2, color: k === 0 ? PAL.warm : PAL.ink});
      }
      label(ctx, "POSITIONAL TAPE · sin/cos", 1240, 620, 11, 0.55);
      plate(ctx, 1220, 230, 560, 380, {alpha: 0.5, rivets: false});
      label(ctx, "STAMP = POSITION ENCODING", 300, 180, 13, 0.5);
    }}
  />
);

/* ═════════ c09 · 旁路管道 ═════════ */

export const H09: React.FC<{shot: Shot}> = ({shot}) => (
  <Scene
    shot={shot}
    index={9}
    kind="wipe"
    cues={[
      {t: 0, x: 900, y: 560, s: 1},
      {t: 0.3, x: 700, y: 480, s: 1.5},
      {t: 0.66, x: 980, y: 520, s: 1.1},
      {t: 1, x: 960, y: 540, s: 1},
    ]}
    draw={(ctx, f) => {
      const pipeW = 54;
      plate(ctx, 760 - pipeW / 2, 220, pipeW, 600, {alpha: 0.85, fill: "rgba(20,20,18,.9)"});
      line(ctx, 760 - pipeW / 2, 220, 760 - pipeW / 2, 820, 2, PAL.ink, 0.7);
      line(ctx, 760 + pipeW / 2, 220, 760 + pipeW / 2, 820, 2, PAL.ink, 0.7);
      for (let i = 0; i < 10; i++) {
        const y = 260 + i * 54 + ((f * 2) % 54);
        line(ctx, 760 - 18, y, 760 + 18, y, 2, PAL.warm, 0.35);
      }
      plate(ctx, 700, 470, 120, 90, {alpha: 0.95, hazard: true});
      ctx.save();
      ctx.strokeStyle = PAL.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(760, 515, 26, 0, Math.PI * 2);
      ctx.moveTo(760, 489);
      ctx.lineTo(760, 541);
      ctx.stroke();
      ctx.restore();
      label(ctx, "LAYERNORM", 700, 582, 11, 0.6);

      ctx.save();
      ctx.strokeStyle = PAL.warm;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(760, 820);
      ctx.lineTo(520, 820);
      ctx.lineTo(520, 260);
      ctx.lineTo(760, 260);
      ctx.stroke();
      ctx.restore();
      [[760, 820], [760, 260]].forEach(([x, y]) => {
        ctx.save();
        ctx.fillStyle = PAL.warm;
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      label(ctx, "RESIDUAL BYPASS", 380, 860, 12, 0.65);

      for (let i = 1; i <= 5; i++) {
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.strokeStyle = PAL.ink;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.rect(760 - pipeW / 2 + i * 34, 220 + i * 24, pipeW, 600 - i * 48);
        ctx.stroke();
        ctx.restore();
      }
      label(ctx, "STACKED × 6", 1000, 260, 12, 0.45);

      gauge(ctx, 1650, 420, 110, 0.6, {alpha: 0.6, label: "DEPTH", min: 0, max: 12});
      gauge(ctx, 1650, 700, 110, 0.35 + 0.2 * Math.sin(f * 0.05), {alpha: 0.55, label: "GRAD", min: 0, max: 1});
      body(ctx, "残差给梯度一条高速公路", 340, 960, 24, 0.75);
    }}
  />
);

/* ═════════ c10 · 装配线 ═════════ */

export const H10: React.FC<{shot: Shot}> = ({shot}) => (
  <Scene
    shot={shot}
    index={10}
    kind="page"
    cues={[
      {t: 0, x: 900, y: 560, s: 1},
      {t: 0.3, x: 560, y: 520, s: 1.5},
      {t: 0.64, x: 1240, y: 520, s: 1.45},
      {t: 1, x: 960, y: 560, s: 1},
    ]}
    draw={(ctx, f, t) => {
      const railY = 780;
      line(ctx, 200, railY, 1740, railY, 8, PAL.ink, 0.35);
      for (let i = 0; i < 16; i++) {
        ctx.save();
        ctx.strokeStyle = PAL.ink;
        ctx.globalAlpha = 0.25;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(230 + i * 96, railY + 26, 9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      for (let i = 0; i < 6; i++) {
        const arrive = smooth((t - i * 0.06) / 0.18);
        const ex = 470 + (1 - arrive) * -260;
        const dx = 1160 + (1 - arrive) * -260;
        const ey = 700 - i * 84;
        plate(ctx, ex - 110, ey - 30, 220, 60, {alpha: 0.9, hazard: i === 0});
        label(ctx, "ENC " + (i + 1), ex - 100, ey + 5, 10, 0.6);
        plate(ctx, dx - 110, ey - 30, 220, 60, {alpha: 0.9, hazard: i === 0});
        label(ctx, "DEC " + (i + 1), dx - 100, ey + 5, 10, 0.6);
      }

      const armT = (f * 0.02) % 1;
      const armX = 470 + Math.sin(armT * Math.PI * 2) * 300;
      line(ctx, armX, 160, armX, 420, 8, PAL.ink, 0.7);
      plate(ctx, armX - 40, 420, 80, 60, {alpha: 0.95, hazard: true});
      line(ctx, armX, 160, 960, 90, 4, PAL.ink, 0.4);
      label(ctx, "ASSEMBLY ARM", 900, 80, 11, 0.5);

      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = PAL.warm;
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 6; i++) {
        const y = 700 - i * 84;
        ctx.beginPath();
        ctx.moveTo(582, y);
        ctx.bezierCurveTo(740, y - 26, 880, y - 26, 1040, y);
        ctx.stroke();
      }
      ctx.restore();

      plate(ctx, 1420, 470, 260, 260, {alpha: 0.9});
      for (let r = 0; r < 6; r++)
        for (let c = 0; c < 6; c++) {
          if (c <= r) {
            ctx.save();
            ctx.strokeStyle = PAL.warm;
            ctx.globalAlpha = 0.75;
            ctx.lineWidth = 1;
            ctx.strokeRect(1440 + c * 36, 490 + r * 36, 30, 30);
            ctx.restore();
          }
        }
      label(ctx, "MASK PLATE", 1440, 450, 11, 0.55);
      label(ctx, "ENCODER", 400, 200, 12, 0.55);
      label(ctx, "DECODER", 1100, 200, 12, 0.55);
      label(ctx, "ASSEMBLY LINE · ENC → DEC", 300, 120, 13, 0.5);
    }}
  />
);

/* ═════════ c11 · 记分打印机 ═════════ */

export const H11: React.FC<{shot: Shot}> = ({shot}) => (
  <Scene
    shot={shot}
    index={11}
    kind="dip"
    cues={[
      {t: 0, x: 960, y: 540, s: 1},
      {t: 0.3, x: 760, y: 520, s: 1.6},
      {t: 0.66, x: 1300, y: 560, s: 1.35},
      {t: 1, x: 1100, y: 560, s: 1},
    ]}
    draw={(ctx, t) => {
      const print = smooth(t / 0.55);
      plate(ctx, 240, 380, 900, 300, {alpha: 0.85, hazard: true});
      const headX = 280 + print * 820;
      plate(ctx, headX - 40, 350, 80, 60, {alpha: 0.95});
      for (let i = 0; i < 7; i++) {
        ctx.save();
        ctx.fillStyle = PAL.warm;
        ctx.fillRect(headX - 28 + i * 9, 404, 4, 14);
        ctx.restore();
      }
      ctx.save();
      ctx.beginPath();
      ctx.rect(280, 420, headX - 280, 240);
      ctx.clip();
      ctx.font = `900 150px ${MONO}`;
      ctx.fillStyle = PAL.ink;
      ctx.fillText("28.4", 300, 580);
      ctx.restore();
      label(ctx, "DOT-MATRIX LEDGER · WMT14 EN-DE", 260, 350, 11, 0.5);
      label(ctx, "BLEU", 300, 610, 12, 0.45);

      gauge(ctx, 1400, 290, 104, 0.84, {alpha: 0.8, label: "BLEU", min: 25, max: 29, unit: ""});
      gauge(ctx, 1700, 290, 104, 0.23, {alpha: 0.8, label: "FLOPs", min: 0, max: 100, unit: "%"});

      const base = 840;
      const bars = [
        {x: 1420, h: 90, label: "26.30"},
        {x: 1500, h: 94, label: "26.36"},
        {x: 1580, h: 150, label: "28.40"},
      ];
      bars.forEach((b, i) => {
        ctx.save();
        ctx.fillStyle = i === 2 ? PAL.warm : PAL.ink;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(b.x - 8, base - b.h, 16, b.h);
        ctx.restore();
        label(ctx, b.label, b.x - 18, base + 18, 9, 0.5);
      });
      line(ctx, 1380, base + 4, 1680, base + 4, 2, PAL.ink, 0.5);
      label(ctx, "+2.0 BLEU · 1/8 COMPUTE", 1380, base + 40, 12, 0.6);
    }}
  />
);

/* ═════════ c12 · 出片 ═════════ */

export const H12: React.FC<{shot: Shot}> = ({shot}) => {
  const frame = useCurrentFrame();
  const word = textDots("ATTENTION", {fitWidth: 1500, crop: 0.06, y: -400});
  const sub = textDots("IS ALL YOU NEED", {fitWidth: 900, crop: 0.05, y: -650});
  const fade = clamp01((frame / shot.frames - 0.9) / 0.1);
  return (
    <>
      <Scene
        shot={shot}
        index={12}
        kind="iris"
        cues={[
          {t: 0, x: 900, y: 560, s: 1.2},
          {t: 0.5, x: 960, y: 540, s: 1},
          {t: 1, x: 960, y: 540, s: 0.98},
        ]}
        draw={(ctx, f, t) => {
          const eject = smooth(t / 0.5);
          const offset = (1 - eject) * 700;
          plate(ctx, 200, 240, 1600, 640, {alpha: 0.35, rivets: false, fill: "rgba(10,10,9,.6)"});
          ctx.save();
          ctx.translate(-offset, 0);
          plate(ctx, 300, 280, 1340, 580, {alpha: 0.5, rivets: false, fill: "rgba(12,12,11,.8)"});
          paintDots(ctx, word.filter((d) => d.y > 700), {frame: f, warmth: 0.12});
          paintDots(ctx, sub.filter((d) => d.y > 700), {frame: f, warmth: 0.4});
          ctx.restore();

          hazardBar(ctx, 180, 900, 1560, 18, {alpha: 0.6});
          label(ctx, "END OF PRINT · SHEET 12/12", 300, 220, 12, 0.55);
        }}
      />
      <Chrome shot={shot} index={12} />
      <div style={{position: "absolute", inset: 0, background: "#000", opacity: fade}} />
    </>
  );
};

/* ═════════ 顶栏 ═════════ */

const Chrome: React.FC<{shot: Shot; index: number}> = ({shot, index}) => {
  const frame = useCurrentFrame();
  const sec = Math.floor(frame / 30);
  return (
    <>
      <HudBar
        chapter={shot.chapter}
        index={index}
        total={12}
        time={`${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`}
        coord={`X:${String((frame * 7) % 999).padStart(3, "0")} Y:${String((frame * 3) % 999).padStart(3, "0")}`}
      />
      <HazardStrip top />
      <HazardStrip />
    </>
  );
};

export const HALFTONE_SCENES = [H01, H02, H03, H04, H05, H06, H07, H08, H09, H10, H11, H12];
