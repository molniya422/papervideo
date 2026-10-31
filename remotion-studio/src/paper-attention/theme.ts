export const C = {
  bg: "#05070f",
  bgDeep: "#02030a",
  text: "#eef2ff",
  muted: "#8b93b0",
  dim: "#586180",
  blue: "#4ea8ff",
  cyan: "#22d3ee",
  orange: "#ff7a45",
  purple: "#a78bfa",
  green: "#34d399",
  amber: "#fbbf24",
  red: "#f87171",
  line: "#1e2a4a",
};

export const FONT = '"Noto Sans SC", "Microsoft YaHei", "PingFang SC", system-ui, sans-serif';
export const MONO = '"JetBrains Mono", "Cascadia Code", Consolas, monospace';

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const easeInOut = (v: number) => {
  const t = clamp01(v);
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};
export const easeOut = (v: number) => 1 - Math.pow(1 - clamp01(v), 3);
/** 确定性伪随机（禁止 Math.random，保证每帧可复现） */
export const rnd = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
