import React, {useMemo} from "react";
import * as THREE from "three";
import {AbsoluteFill, useCurrentFrame} from "remotion";
import {ThreeCanvas} from "@remotion/three";

export const C = {
  bg: "#05070f",
  panel: "#080c18",
  text: "#eef2ff",
  muted: "#95a1c0",
  dim: "#5b6684",
  blue: "#4ea8ff",
  cyan: "#22d3ee",
  orange: "#ff7a45",
  purple: "#a78bfa",
  green: "#34d399",
  amber: "#fbbf24",
  red: "#f87171",
};

export const FONT = '"Noto Sans SC", "Microsoft YaHei", "PingFang SC", system-ui, sans-serif';
export const MONO = '"JetBrains Mono", "Cascadia Code", Consolas, monospace';

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const easeInOut = (v: number) => {
  const t = clamp01(v);
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};
export const easeOut = (v: number) => 1 - Math.pow(1 - clamp01(v), 3);
export const rnd = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/* ───────────── 版面常量：文字区 / 3D 舞台 / 字幕带 物理隔离 ───────────── */

export const TEXT_W = 640;
export const STAGE_X = TEXT_W;
export const STAGE_W = 1920 - TEXT_W;
export const STAGE_H = 952;
export const CAPTION_H = 128;

/* 舞台内的景深粒子，让纯黑背景有层次 */
const Ambient: React.FC<{count?: number}> = ({count = 240}) => {
  const frame = useCurrentFrame();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (rnd(i * 2.1) - 0.5) * 24;
      arr[i * 3 + 1] = (rnd(i * 5.3) - 0.5) * 14;
      arr[i * 3 + 2] = (rnd(i * 9.7) - 0.5) * 18 - 4;
    }
    return arr;
  }, [count]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.055}
        color="#6f9bd8"
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

/* ───────────── 3D 舞台 ───────────── */

export const Stage: React.FC<{
  children: React.ReactNode;
  fov?: number;
  position?: [number, number, number];
  full?: boolean;
}> = ({children, fov = 45, position = [0, 0, 12], full = false}) => {
  const x = full ? 0 : STAGE_X;
  const w = full ? 1920 : STAGE_W;
  const h = full ? 1080 : STAGE_H;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: 0,
        width: w,
        height: h,
        overflow: "hidden",
        background:
          "radial-gradient(ellipse 68% 62% at 58% 42%, rgba(24,36,68,.55) 0%, rgba(8,12,24,.25) 55%, rgba(5,7,15,0) 100%)",
      }}
    >
      <ThreeCanvas
        width={w}
        height={h}
        camera={{fov, near: 0.1, far: 200, position}}
        gl={{antialias: true}}
        style={{background: "transparent"}}
      >
        <Ambient />
        {children}
      </ThreeCanvas>
    </div>
  );
};

/* ───────────── 左侧文字区 ───────────── */

export const TextPanel: React.FC<{
  kicker: string;
  title: string;
  bullets: string[];
  bulletAt: number[];
  accent: string;
}> = ({kicker, title, bullets, bulletAt, accent}) => {
  const frame = useCurrentFrame();
  const titleOp = Math.min(1, frame / 16);

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: TEXT_W,
        height: STAGE_H,
        padding: "88px 56px 40px 84px",
        boxSizing: "border-box",
        fontFamily: FONT,
        background: `linear-gradient(180deg, ${C.panel} 0%, ${C.bg} 100%)`,
        borderRight: "1px solid rgba(70,90,140,.22)",
      }}
    >
      <div style={{display: "flex", alignItems: "center", gap: 12, opacity: titleOp}}>
        <div style={{width: 40, height: 3, background: accent}} />
        <div style={{fontFamily: MONO, fontSize: 16, color: accent, letterSpacing: 2.4, opacity: 0.9}}>{kicker}</div>
      </div>

      <div
        style={{
          fontSize: title.length > 11 ? 40 : 46,
          lineHeight: 1.28,
          fontWeight: 900,
          color: "#fff",
          marginTop: 16,
          opacity: titleOp,
          transform: `translateY(${(1 - titleOp) * 14}px)`,
          textShadow: "0 6px 30px rgba(0,0,0,.6)",
        }}
      >
        {title}
      </div>

      <div style={{marginTop: 34, display: "flex", flexDirection: "column", gap: 18}}>
        {bullets.map((b, i) => {
          const at = bulletAt[i] ?? 20 * i;
          const op = Math.min(1, Math.max(0, (frame - at) / 18));
          return (
            <div
              key={i}
              style={{
                opacity: op,
                transform: `translateX(${(1 - op) * -14}px)`,
                borderLeft: `3px solid ${accent}`,
                paddingLeft: 16,
                fontSize: 23,
                lineHeight: 1.62,
                color: "#d9e2f7",
                letterSpacing: 0.3,
              }}
            >
              {b}
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          left: 84,
          bottom: 36,
          fontFamily: MONO,
          fontSize: 13,
          letterSpacing: 2.4,
          color: "#43506f",
        }}
      >
        ATTENTION IS ALL YOU NEED · PAPER EXPLAINER
      </div>
    </div>
  );
};

/* ───────────── 字幕带（独立区域，不压 3D） ───────────── */

export const CaptionBand: React.FC<{text: string; accent: string; index: number; total: number}> = ({
  text,
  accent,
  index,
  total,
}) => {
  const frame = useCurrentFrame();
  const op = Math.min(1, frame / 8, (total - frame) / 8);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        bottom: 0,
        width: 1920,
        height: CAPTION_H,
        background: "#04060d",
        borderTop: "1px solid rgba(70,90,140,.26)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT,
        opacity: Math.max(0, op),
      }}
    >
      <div style={{display: "flex", alignItems: "center", gap: 18, maxWidth: 1640}}>
        <div style={{width: 7, height: 7, borderRadius: 99, background: accent, flexShrink: 0}} />
        <div style={{fontSize: 33, color: "#f2f6ff", letterSpacing: 0.5, lineHeight: 1.4}}>{text}</div>
      </div>
    </div>
  );
};
