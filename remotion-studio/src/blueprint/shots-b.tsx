import React from "react";
import {useCurrentFrame} from "remotion";
import * as THREE from "three";
import {C, MONO, clamp01, easeInOut, Stage} from "./layout";
import {Dust, Fingerprint, FlowDots, Leader, Lights, Rig, Ticks, WaveFamily, WireBar, WireBox, WireLine, WireMatrix} from "./kit";
import type {Shot} from "./timeline.generated";

/* 线框曲线：用一串细线段画出来 */
const WireCurve: React.FC<{
  points: number[];
  width?: number;
  height?: number;
  position?: [number, number, number];
  color?: string;
  opacity?: number;
}> = ({points, width = 4.4, height = 2.6, position = [0, 0, 0], color = C.amber, opacity = 0.9}) => {
  const segs = points.length - 1;
  return (
    <group position={position}>
      {Array.from({length: segs}).map((_, i) => {
        const x1 = (i / segs - 0.5) * width;
        const x2 = ((i + 1) / segs - 0.5) * width;
        const y1 = points[i] * height;
        const y2 = points[i + 1] * height;
        return <WireLine key={i} from={[x1, y1, 0]} to={[x2, y2, 0]} color={color} opacity={opacity} thickness={0.016} />;
      })}
    </group>
  );
};

/* ═════════ c05 · 除以 √dk ═════════ */
export const C05: React.FC<{shot: Shot}> = ({shot}) => {
  const frame = useCurrentFrame();
  const p = frame / shot.frames;
  const grow = clamp01((p - 0.03) / 0.22);
  const alert = clamp01((p - 0.55) / 0.2);
  const camZ = 15.3 - 1.3 * easeInOut(p);
  const cam: [number, number, number] = [0.2, 1.9, camZ];

  const sharp = [1, 0.17, 0.1, 0.07, 0.05, 0.04, 0.03, 0.02];
  const smooth = [0.4, 0.35, 0.3, 0.26, 0.22, 0.19, 0.16, 0.14];
  const softmax = (vals: number[], t: number) => {
    const e = vals.map((v) => Math.exp(v * t));
    const s = e.reduce((a, b) => a + b, 0);
    return e.map((x) => x / s);
  };
  const curveL = softmax(sharp, 7);
  const curveR = softmax(smooth, 5);

  return (
    <>
      <Stage position={cam} fov={40}>
        <Lights />
        <Dust count={100} />
        <Rig position={cam} lookAt={[0.1, 0, 0]} />

        {/* 左：未缩放 */}
        <group position={[-3.4, 0, 0]}>
          {sharp.map((v, i) => (
            <WireBar key={i} position={[(i - 3.5) * 0.5, -2.4, 0]} height={v * 4.4 * grow} width={0.36} depth={0.36}
              color={alert > 0.3 && i === 0 ? C.accent : C.line} opacity={0.9} fill={0.03} />
          ))}
          <WireCurve points={curveL} width={4.3} height={3.9} position={[0, -2.36, 0.35]} color={C.accent} opacity={0.6 * grow} />
          <WireLine from={[-2.1, -2.42, 0]} to={[2.1, -2.42, 0]} color={C.lineFaint} opacity={0.6} thickness={0.008} />
          <Ticks start={[-2.1, -2.5, 0]} end={[2.1, -2.5, 0]} count={8} length={0.12} opacity={0.5} />
        </group>

        {/* 右：除以 √dk */}
        <group position={[3.0, 0, 0]}>
          {smooth.map((v, i) => (
            <WireBar key={i} position={[(i - 3.5) * 0.5, -2.4, 0]} height={v * 4.4 * grow} width={0.36} depth={0.36}
              color={C.mint} opacity={0.9} fill={0.04} />
          ))}
          <WireCurve points={curveR} width={4.3} height={3.9} position={[0, -2.36, 0.35]} color={C.mint} opacity={0.6 * grow} />
          <WireLine from={[-2.1, -2.42, 0]} to={[2.1, -2.42, 0]} color={C.lineFaint} opacity={0.6} thickness={0.008} />
          <Ticks start={[-2.1, -2.5, 0]} end={[2.1, -2.5, 0]} count={8} length={0.12} opacity={0.5} />
        </group>

        {/* 分界与标注 */}
        <WireLine from={[-0.2, -2.6, 0]} to={[-0.2, 1.9, 0]} color={C.lineFaint} opacity={0.5} thickness={0.008} />
      </Stage>

      <div style={{position: "absolute", left: 420, top: 28, width: 1500, display: "flex", justifyContent: "center", gap: 260, fontFamily: MONO, fontSize: 18, letterSpacing: 1.5, opacity: grow}}>
        <span style={{color: C.accent}}>UNSCALED · Var = 64 · σ = 8</span>
        <span style={{color: C.mint}}>÷ √dₖ · Var = 1 · σ = 1</span>
      </div>
      <div style={{position: "absolute", left: 420, top: 812, width: 1500, textAlign: "center", fontFamily: MONO, fontSize: 17, color: C.lineDim, letterSpacing: 1.5, opacity: clamp01((p - 0.5) / 0.2)}}>
        logits 标准差 8 → softmax 饱和 → 梯度消失
      </div>
    </>
  );
};

/* ═════════ c06 · 加权读取 ═════════ */
export const C06: React.FC<{shot: Shot}> = ({shot}) => {
  const frame = useCurrentFrame();
  const p = frame / shot.frames;
  const grow = clamp01((p - 0.05) / 0.3);
  const flow = clamp01((p - 0.4) / 0.35);
  const cam: [number, number, number] = [0.2, 1.8, 14.2];

  const weights = [0.36, 0.24, 0.16, 0.12, 0.08, 0.04];

  return (
    <>
      <Stage position={cam} fov={40}>
        <Lights />
        <Dust count={90} />
        <Rig position={cam} lookAt={[0, 0, 0]} />

        {/* 权重条 */}
        <group position={[-3.2, 0, 0]}>
          {weights.map((w, i) => (
            <WireBar key={i} position={[(i - 2.5) * 0.5, -2.2, 0]} height={w * 12 * grow} width={0.38} depth={0.38}
              color={i === 0 ? C.accent : C.line} opacity={0.9} fill={0.04} />
          ))}
          <WireLine from={[-1.7, -2.24, 0]} to={[1.7, -2.24, 0]} color={C.lineFaint} opacity={0.6} thickness={0.008} />
          <Ticks start={[-1.7, -2.32, 0]} end={[1.7, -2.32, 0]} count={6} length={0.12} opacity={0.45} />
        </group>

        {/* 三个 Value 行，被权重放大 */}
        <group position={[0.6, 0, 0]}>
          {[0, 1, 2].map((r) => (
            <group key={r}>
              {Array.from({length: 7}).map((_, i) => (
                <WireBox key={i} position={[(i - 3) * 0.44, 1.1 - r * 0.86, 0]} size={[0.3, 0.24, 0.1]}
                  color={r === 0 ? C.mint : C.lineDim} opacity={0.55 + (r === 0 ? 0.35 : 0)} fill={0.03} />
              ))}
            </group>
          ))}
        </group>

        {/* 输出向量 */}
        <group position={[3.9, 0, 0]} scale={[grow, grow, grow]}>
          {Array.from({length: 7}).map((_, i) => (
            <WireBox key={i} position={[0, (3 - i) * 0.42, 0]} size={[0.32, 0.28, 0.12]} color={C.mint} opacity={0.95} fill={0.07} />
          ))}
        </group>

        <FlowDots from={[-1.4, -0.4, 0]} to={[3.6, 0.2, 0]} count={10} progress={flow} color={C.mint} size={0.04} arc={0.5} />
        <FlowDots from={[-1.4, 0.6, 0]} to={[3.6, 0.5, 0]} count={6} progress={flow} color={C.lineDim} size={0.03} arc={0.3} />
      </Stage>

      <div style={{position: "absolute", left: 420, top: 30, width: 1500, display: "flex", justifyContent: "center", gap: 300, fontFamily: MONO, fontSize: 17, color: C.lineDim, letterSpacing: 1.5, opacity: grow}}>
        <span>softmax 权重</span>
        <span>Value（按权重取回）</span>
      </div>
      <div style={{position: "absolute", left: 420, top: 812, width: 1500, textAlign: "center", fontFamily: MONO, fontSize: 17, color: C.mint, letterSpacing: 1.5, opacity: flow}}>
        output = Σ wᵢ · vᵢ　·　可微、按内容寻址
      </div>
    </>
  );
};

/* ═════════ c07 · 多头 ═════════ */
const PATTERNS: ((j: number, i: number) => number)[] = [
  (j, i) => (i === j ? 0.95 : 0.06),
  (j, i) => (i + j === 4 ? 0.9 : 0.05),
  (j, i) => (i === 0 ? 0.85 : 0.08),
  (j, i) => (Math.abs(i - j) <= 1 ? 0.8 : 0.05),
  (j, i) => (j === 0 ? 0.75 : 0.1),
  (j, i) => (i >= j ? 0.7 : 0.04),
  (j, i) => (Math.abs(i - j) === 2 ? 0.7 : 0.06),
  (j, i) => (Math.abs(i - 2) + Math.abs(j - 2) < 2 ? 0.85 : 0.05),
];

export const C07: React.FC<{shot: Shot}> = ({shot}) => {
  const frame = useCurrentFrame();
  const p = frame / shot.frames;
  const appear = clamp01(p / 0.16);
  const concat = clamp01((p - 0.6) / 0.25);
  const camA = 0.1 + p * 0.1;
  const cam: [number, number, number] = [Math.sin(camA) * 15, 2.4, Math.cos(camA) * 15];

  return (
    <>
      <Stage position={cam} fov={40}>
        <Lights />
        <Dust count={100} />
        <Rig position={cam} lookAt={[0, 0, 0]} />

        {PATTERNS.map((fn, k) => {
          const col = k % 4;
          const row = Math.floor(k / 4);
          const x = (col - 1.5) * 2.25;
          const y = 1.5 - row * 2.5;
          return (
            <group key={k} position={[x, y, 0]} scale={[appear, appear, appear]}>
              <WireMatrix rows={5} cols={5} cell={0.28} gap={0.05} color={k === 5 ? C.accent : C.line} opacity={0.75} maxLift={0.26}
                value={(j, i, f) => fn(j, i) * (0.8 + 0.2 * Math.sin(f * 0.05 + k))} />
              <WireLine from={[-0.82, -0.95, 0]} to={[0.82, -0.95, 0]} color={k === 5 ? C.accent : C.lineFaint} opacity={0.8} thickness={0.02} />
            </group>
          );
        })}

        {/* 拼接括号 */}
        <group position={[5.1, 0, 0]} opacity={concat}>
          <WireLine from={[-0.5, 2.0, 0]} to={[-0.5, -2.0, 0]} color={C.mint} opacity={0.8} thickness={0.018} />
          <WireLine from={[-0.5, 2.0, 0]} to={[-0.2, 2.0, 0]} color={C.mint} opacity={0.8} thickness={0.018} />
          <WireLine from={[-0.5, -2.0, 0]} to={[-0.2, -2.0, 0]} color={C.mint} opacity={0.8} thickness={0.018} />
          <FlowDots from={[0, 0, 0]} to={[0.5, 0, 0]} count={6} progress={concat} color={C.mint} size={0.04} />
        </group>
      </Stage>

      <div style={{position: "absolute", left: 420, top: 30, width: 1500, textAlign: "center", fontFamily: MONO, fontSize: 17, color: C.lineDim, letterSpacing: 2, opacity: appear}}>
        8 heads × 5×5 attention maps · different patterns
      </div>
      <div style={{position: "absolute", left: 420, top: 812, width: 1500, textAlign: "center", fontFamily: MONO, fontSize: 17, color: C.mint, letterSpacing: 1.5, opacity: concat}}>
        Concat(head₁ … head₈) · Wᴼ　→　512 维
      </div>
    </>
  );
};

/* ═════════ c08 · 位置编码 ═════════ */
export const C08: React.FC<{shot: Shot}> = ({shot}) => {
  const frame = useCurrentFrame();
  const p = frame / shot.frames;
  const camX = -1.2 + easeInOut(p) * 2.4;
  const cam: [number, number, number] = [camX, 2.0, 13.4];

  return (
    <>
      <Stage position={cam} fov={40}>
        <Lights />
        <Dust count={80} />
        <Rig position={cam} lookAt={[0, 0, 0]} />

        <WaveFamily rows={18} cols={56} width={8.4} height={4.3} position={[-0.2, 0.4, 0]} colorA={C.mint} colorB={C.lineDim} opacity={0.92} />

        {/* 边框与刻度 */}
        <WireLine from={[-4.6, 2.75, 0]} to={[4.2, 2.75, 0]} color={C.line} opacity={0.7} thickness={0.012} />
        <WireLine from={[-4.6, -1.85, 0]} to={[4.2, -1.85, 0]} color={C.line} opacity={0.7} thickness={0.012} />
        <WireLine from={[-4.6, -1.85, 0]} to={[-4.6, 2.75, 0]} color={C.line} opacity={0.7} thickness={0.012} />
        <WireLine from={[4.2, -1.85, 0]} to={[4.2, 2.75, 0]} color={C.line} opacity={0.7} thickness={0.012} />
        <Ticks start={[-4.6, -1.98, 0]} end={[4.2, -1.98, 0]} count={10} length={0.14} opacity={0.5} />

        {/* 单个位置的指纹 */}
        <Fingerprint x={5.5} y={0.4} z={0.5} n={44} amp={0.4} phase={20} height={4.0} color={C.mint} />
        <WireLine from={[4.25, 2.4, 0]} to={[5.1, 1.9, 0.4]} color={C.mint} opacity={0.5} thickness={0.008} />
      </Stage>

      <div style={{position: "absolute", left: 420, top: 30, width: 1500, paddingRight: 200, boxSizing: "border-box", display: "flex", justifyContent: "center", gap: 210, fontFamily: MONO, fontSize: 16, color: C.lineDim, letterSpacing: 1.5}}>
        <span>POSITION →</span>
        <span>DIMENSION ↓</span>
        <span style={{color: C.mint}}>FINGERPRINT</span>
      </div>
      <div style={{position: "absolute", left: 420, top: 812, width: 1500, textAlign: "center", fontFamily: MONO, fontSize: 17, color: C.amber, letterSpacing: 1.2}}>
        PE(pos,2i) = sin( pos / 10000^(2i/d) )
      </div>
    </>
  );
};
