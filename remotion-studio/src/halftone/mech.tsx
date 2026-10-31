import {Dot, GAP, PAL} from "./core";

const TAU = Math.PI * 2;

/* ───────── 齿轮 ───────── */

export function gearDots(cx: number, cy: number, R: number, teeth: number, rot: number, r = 2.4): Dot[] {
  const out: Dot[] = [];
  const steps = Math.max(48, teeth * 16);
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * TAU + rot;
    const wave = Math.sin(a * teeth);
    const rr = R + wave * R * 0.11;
    out.push({x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr, r});
  }
  return out;
}

export function gearSolid(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  R: number,
  teeth: number,
  rot: number,
  o: {alpha?: number; color?: string; hub?: number; bolts?: number} = {},
) {
  const {alpha = 1, color = PAL.ink, hub = 0.28, bolts = 6} = o;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  const steps = Math.max(72, teeth * 12);
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * TAU + rot;
    const rr = R + Math.sin(a * teeth) * R * 0.11;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  const rh = R * hub;
  ctx.beginPath();
  ctx.arc(cx, cy, rh, 0, TAU);
  ctx.stroke();

  for (let i = 0; i < bolts; i++) {
    const a = (i / bolts) * TAU + rot * 0.5;
    const br = (R + rh) * 0.5;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * br, cy + Math.sin(a) * br, Math.max(2, R * 0.035), 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

/* ───────── 环 + 刻度 ───────── */

export function ringDots(cx: number, cy: number, R: number, count: number, rot = 0, r = 2.2): Dot[] {
  const out: Dot[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU + rot;
    out.push({x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, r});
  }
  return out;
}

export function ringTicks(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  R: number,
  count: number,
  rot = 0,
  o: {alpha?: number; len?: number; color?: string} = {},
) {
  const {alpha = 0.8, len = 12, color = PAL.ink} = o;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU + rot;
    const l = i % 5 === 0 ? len : len * 0.45;
    ctx.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    ctx.lineTo(cx + Math.cos(a) * (R - l), cy + Math.sin(a) * (R - l));
  }
  ctx.stroke();
  ctx.restore();
}

/* ───────── 铆接板 ───────── */

export function plate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  o: {alpha?: number; hazard?: boolean; rivets?: boolean; fill?: string; stroke?: string; line?: number} = {},
) {
  const {alpha = 1, hazard = false, rivets = true, fill = "rgba(16,16,14,.92)", stroke = PAL.ink, line = 1.6} = o;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = line;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

  if (rivets) {
    const m = Math.min(14, Math.min(w, h) * 0.18);
    const pts = [
      [x + m, y + m],
      [x + w - m, y + m],
      [x + m, y + h - m],
      [x + w - m, y + h - m],
    ];
    ctx.fillStyle = stroke;
    pts.forEach(([px, py]) => {
      ctx.beginPath();
      ctx.arc(px, py, 2.4, 0, TAU);
      ctx.fill();
    });
  }

  if (hazard) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y + h - 7, w, 7);
    ctx.clip();
    ctx.strokeStyle = PAL.warm;
    ctx.lineWidth = 5;
    for (let i = -h; i < w + h; i += 14) {
      ctx.beginPath();
      ctx.moveTo(x + i, y + h);
      ctx.lineTo(x + i + 8, y + h - 8);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

/* ───────── 仪表 ───────── */

export function gauge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  R: number,
  value: number,
  o: {alpha?: number; label?: string; min?: number; max?: number; unit?: string} = {},
) {
  const {alpha = 1, label = "", min = 0, max = 1, unit = ""} = o;
  const v = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const a0 = Math.PI * 0.75;
  const a1 = Math.PI * 2.25;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, R, a0, a1);
  ctx.stroke();

  // 刻度
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const a = a0 + ((a1 - a0) * i) / 40;
    const long = i % 5 === 0;
    const l = long ? R * 0.16 : R * 0.08;
    ctx.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    ctx.lineTo(cx + Math.cos(a) * (R - l), cy + Math.sin(a) * (R - l));
  }
  ctx.stroke();

  // 红区
  ctx.strokeStyle = PAL.warm;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.9, a0 + (a1 - a0) * 0.82, a1);
  ctx.stroke();

  // 指针
  const a = a0 + (a1 - a0) * v;
  ctx.strokeStyle = PAL.warm;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(a) * R * 0.78, cy + Math.sin(a) * R * 0.78);
  ctx.stroke();
  ctx.fillStyle = PAL.warm;
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, TAU);
  ctx.fill();

  if (label) {
    ctx.fillStyle = PAL.ink;
    ctx.font = "500 12px 'JetBrains Mono', Consolas, monospace";
    ctx.textAlign = "center";
    ctx.fillText(label, cx, cy + R * 0.55);
    ctx.font = "700 20px 'JetBrains Mono', Consolas, monospace";
    ctx.fillText((min + (max - min) * v).toFixed(unit === "" ? 0 : 1) + unit, cx, cy + R * 0.82);
  }
  ctx.restore();
}

/* ───────── 等距盒 ───────── */

export function isoBox(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  d: number,
  o: {alpha?: number; fill?: boolean; color?: string} = {},
) {
  const {alpha = 1, fill = false, color = PAL.ink} = o;
  const dx = d * 0.72;
  const dy = d * 0.42;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;

  const front = [
    [cx - w / 2, cy - h / 2],
    [cx + w / 2, cy - h / 2],
    [cx + w / 2, cy + h / 2],
    [cx - w / 2, cy + h / 2],
  ];
  const back = front.map(([x, y]) => [x + dx, y - dy]);

  ctx.beginPath();
  front.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  back.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    ctx.moveTo(front[i][0], front[i][1]);
    ctx.lineTo(back[i][0], back[i][1]);
  }
  ctx.stroke();

  if (fill) {
    ctx.globalAlpha = alpha * 0.14;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(...(front[0] as [number, number]));
    ctx.lineTo(...(front[1] as [number, number]));
    ctx.lineTo(...(back[1] as [number, number]));
    ctx.lineTo(...(back[0] as [number, number]));
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/* ───────── 危险条纹 ───────── */

export function hazardBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  o: {alpha?: number; color?: string} = {},
) {
  const {alpha = 0.85, color = PAL.warm} = o;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = color;
  ctx.lineWidth = h * 0.55;
  for (let i = -h; i < w + h; i += h * 1.5) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + h);
    ctx.lineTo(x + i + h, y);
    ctx.stroke();
  }
  ctx.restore();
}

/* ───────── 机械光圈（章节转场） ───────── */

export function iris(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, open: number) {
  const o = Math.max(0, Math.min(1, open));
  if (o >= 0.999) return;
  ctx.save();
  const blades = 8;
  const hole = R * (1 - o);
  ctx.fillStyle = "#0a0a0b";
  for (let i = 0; i < blades; i++) {
    const a0 = (i / blades) * TAU;
    const a1 = ((i + 1) / blades) * TAU;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.9, a0, a1);
    ctx.arc(cx, cy, Math.max(0.5, hole), a1, a0, true);
    ctx.closePath();
    ctx.fill();

    // 叶片边缘
    ctx.strokeStyle = PAL.ink;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a0) * hole, cy + Math.sin(a0) * hole);
    ctx.lineTo(cx + Math.cos(a0) * R * 1.9, cy + Math.sin(a0) * R * 1.9);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (hole > 2) {
    ctx.strokeStyle = PAL.warm;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, hole, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

/* ───────── 示波器曲线 ───────── */

export function crtTrace(
  ctx: CanvasRenderingContext2D,
  pts: {x: number; y: number}[],
  o: {alpha?: number; color?: string; width?: number; glow?: boolean} = {},
) {
  const {alpha = 1, color = PAL.ink, width = 2, glow = true} = o;
  if (pts.length < 2) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  if (glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
  }
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
}

/* ───────── 爆散/收拢的碎片 ───────── */

export function debris(
  dots: Dot[],
  cx: number,
  cy: number,
  amount: number,
  seed = 1,
): Dot[] {
  const out: Dot[] = [];
  dots.forEach((d, i) => {
    const a = Math.atan2(d.y - cy, d.x - cx) + (Math.sin(i * 12.9898 + seed) * 0.6);
    const dist = amount * (60 + ((i * 37) % 240));
    out.push({x: d.x + Math.cos(a) * dist, y: d.y + Math.sin(a) * dist, r: d.r * (1 - amount * 0.35)});
  });
  return out;
}

/* ───────── 进度缓动 ───────── */

export const smooth = (v: number) => {
  const t = Math.max(0, Math.min(1, v));
  return t * t * (3 - 2 * t);
};
