import {H, PAL, W} from "./core";
import {clamp01} from "./core";

/* ───────── 镜头：按讲解重点推拉 ───────── */

export type Cue = {t: number; x: number; y: number; s: number};
export type Cam = {x: number; y: number; s: number};

export const DEFAULT_CAM: Cam = {x: W / 2, y: H / 2, s: 1};

export function camAt(cues: Cue[], t: number): Cam {
  if (!cues.length) return DEFAULT_CAM;
  const p = clamp01(t);
  if (p <= cues[0].t) return {x: cues[0].x, y: cues[0].y, s: cues[0].s};
  for (let i = 0; i < cues.length - 1; i++) {
    const a = cues[i];
    const b = cues[i + 1];
    if (p >= a.t && p <= b.t) {
      const raw = (p - a.t) / Math.max(1e-6, b.t - a.t);
      const e = raw * raw * (3 - 2 * raw);
      return {
        x: a.x + (b.x - a.x) * e,
        y: a.y + (b.y - a.y) * e,
        s: a.s + (b.s - a.s) * e,
      };
    }
  }
  const last = cues[cues.length - 1];
  return {x: last.x, y: last.y, s: last.s};
}

export function withCamera(ctx: CanvasRenderingContext2D, cam: Cam, fn: () => void) {
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(cam.s, cam.s);
  ctx.translate(-cam.x, -cam.y);
  fn();
  ctx.restore();
}

/* ───────── 转场 ───────── */

export type TransitionKind = "page" | "iris" | "shutter" | "wipe" | "dip";

/** open=0 全遮，open=1 全开 */
export function transition(
  ctx: CanvasRenderingContext2D,
  kind: TransitionKind,
  open: number,
  frame: number,
) {
  const o = clamp01(open);
  if (o >= 0.999) return;
  const k = 1 - o;

  if (kind === "iris") {
    const R = 1250;
    const hole = R * o;
    ctx.save();
    const blades = 8;
    ctx.fillStyle = "#000";
    for (let i = 0; i < blades; i++) {
      const a0 = (i / blades) * Math.PI * 2;
      const a1 = ((i + 1) / blades) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, R * 1.9, a0, a1);
      ctx.arc(W / 2, H / 2, Math.max(0.5, hole), a1, a0, true);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(255,61,0,.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, Math.max(1, hole), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (kind === "page") {
    // 纸张从左向右翻走（k=1 全遮）
    const edge = W * (1 - k);
    const skew = 260 * k;
    ctx.save();
    // 阴影
    const g = ctx.createLinearGradient(edge - 220, 0, edge + 40, 0);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,.75)");
    ctx.fillStyle = g;
    ctx.fillRect(edge - 220, 0, 260, H);
    // 纸面
    ctx.fillStyle = "#050505";
    ctx.beginPath();
    ctx.moveTo(edge + skew, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W, H);
    ctx.lineTo(edge - skew, H);
    ctx.closePath();
    ctx.fill();
    // 纸边
    ctx.strokeStyle = "rgba(255,210,30,.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(edge + skew, 0);
    ctx.lineTo(edge - skew, H);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (kind === "shutter") {
    const hh = (H / 2) * k;
    ctx.save();
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, W, hh);
    ctx.fillRect(0, H - hh, W, hh);
    // 闸门边 + 危险条
    ctx.strokeStyle = PAL.warm;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, hh);
    ctx.lineTo(W, hh);
    ctx.moveTo(0, H - hh);
    ctx.lineTo(W, H - hh);
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, hh - 16, W, 16);
    ctx.rect(0, H - hh, W, 16);
    ctx.clip();
    ctx.strokeStyle = PAL.warm;
    ctx.lineWidth = 10;
    for (let i = -40; i < W + 40; i += 26) {
      ctx.beginPath();
      ctx.moveTo(i, hh);
      ctx.lineTo(i + 18, hh - 18);
      ctx.moveTo(i, H - hh + 18);
      ctx.lineTo(i + 18, H - hh);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
    return;
  }

  if (kind === "wipe") {
    // 斜向扫描擦除
    const x = -W * 0.4 + (W * 1.8) * (1 - k);
    ctx.save();
    ctx.fillStyle = "#050505";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.max(0, x), 0);
    ctx.lineTo(Math.max(0, x) - 240, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();
    // 扫描前沿
    ctx.strokeStyle = PAL.warm;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - 240, H);
    ctx.stroke();
    ctx.globalAlpha = 0.35;
    const g = ctx.createLinearGradient(x - 120, 0, x, 0);
    g.addColorStop(0, "rgba(255,61,0,0)");
    g.addColorStop(1, "rgba(255,61,0,.8)");
    ctx.fillStyle = g;
    ctx.fillRect(x - 120, 0, 120, H);
    ctx.restore();
    return;
  }

  // dip：整体淡入淡出
  ctx.save();
  ctx.globalAlpha = k;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** 镜头锁定框：画在相机目标上，随缩放保持屏幕尺寸 */
export const focusBrackets = (ctx: CanvasRenderingContext2D, cam: Cam, size = 150, alpha = 0.55) => {
  const s = size / cam.s;
  const x = cam.x;
  const y = cam.y;
  const arm = s * 0.28;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = PAL.warm;
  ctx.lineWidth = 2 / cam.s;
  const pts = [
    [x - s, y - s, 1, 1],
    [x + s, y - s, -1, 1],
    [x - s, y + s, 1, -1],
    [x + s, y + s, -1, -1],
  ];
  (pts as [number, number, number, number][]).forEach(([px, py, dx, dy]) => {
    ctx.beginPath();
    ctx.moveTo(px + dx * arm, py);
    ctx.lineTo(px, py);
    ctx.lineTo(px, py + dy * arm);
    ctx.stroke();
  });
  ctx.restore();
};

/** 章节进出场：前 14 帧进、后 14 帧出 */
export const curtain = (
  ctx: CanvasRenderingContext2D,
  kind: TransitionKind,
  f: number,
  frames: number,
) => {
  const open = Math.min(1, f / 14, (frames - f) / 14);
  if (open < 1) transition(ctx, kind, open, f);
};
