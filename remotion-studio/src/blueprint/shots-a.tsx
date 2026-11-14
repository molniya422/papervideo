import React from "react";
import {AbsoluteFill, interpolate, useCurrentFrame} from "remotion";
import {C, MONO, clamp01, easeInOut, rnd, Stage} from "./layout";
import {Dust, FlowDots, Leader, Lights, Rig, SheetFrame, Ticks, WireBar, WireBox, WireLine, WireMatrix, WireStack} from "./kit";
import type {Shot} from "./timeline.generated";

const cl = () => ({extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const});

/* ═════════ c01 · 一张图纸 ═════════ */
export const C01: React.FC<{shot: Shot}> = ({shot}) => {
  const frame = useCurrentFrame();
  const p = frame / shot.frames;
  const draw = clamp01(p / 0.35);
  const stack = clamp01((p - 0.25) / 0.4);
  const z = 13.2 - 2.6 * easeInOut(p);

  return (
    <Stage position={[0.6, 1.2, z]} fov={40}>
      <Lights />
      <Dust count={140} />
      <Rig position={[0.6, 1.0, z]} lookAt={[0, 0.1, 0]} />

      <SheetFrame w={10.4} h={6.0} position={[0, 0, 0]} rotation={[-0.18, 0.16, 0]} progress={draw} opacity={0.8} />

      {/* 幽灵架构：六层堆叠 */}
      <WireStack
        count={6}
        position={[0, -0.2, -0.6]}
        size={[4.4, 0.42, 2.8]}
        gapY={0.82}
        color={C.lineDim}
        opacity={0.55}
        scaleY={Math.max(0.01, stack)}
        glow={(i, f) => 0.3 + 0.3 * Math.sin(f * 0.03 + i * 0.5)}
      />

      {/* 图幅标记 */}
      <Ticks start={[-5.2, -3.06, 0.02]} end={[5.2, -3.06, 0.02]} count={12} length={0.14} />
      <Ticks start={[-5.2, -3.06, 0.02]} end={[-5.2, 3.06, 0.02]} count={8} length={0.14} />
    </Stage>
  );
};

/* ═════════ c02 · RNN 的两个代价 ═════════ */
export const C02: React.FC<{shot: Shot}> = ({shot}) => {
  const frame = useCurrentFrame();
  const p = frame / shot.frames;
  const N = 7;
  const GAP = 1.02;
  const sweep = (frame % 96) / 96;
  const pulseX = -(N - 1) * GAP * 0.5 + sweep * (N - 1) * GAP;
  const camA = 0.2 + p * 0.12;
  const cam: [number, number, number] = [Math.sin(camA) * 15, 3.2, Math.cos(camA) * 15];

  return (
    <Stage position={cam} fov={40}>
      <Lights />
      <Dust count={120} />
      <Rig position={cam} lookAt={[0, 0.1, 0]} />

      {/* 序列 */}
      {Array.from({length: N}).map((_, i) => {
        const x = (i - (N - 1) / 2) * GAP;
        const lit = Math.max(0, 1 - Math.abs(x - pulseX) / 0.62);
        return (
          <group key={i}>
            <WireBox position={[x, 0.7, 0]} size={[0.72, 0.72, 0.72]} color={lit > 0.5 ? C.accent : C.line} opacity={0.5 + lit * 0.5} fill={0.02 + lit * 0.1} />
            <mesh position={[x, 0.7, 0]}>
              <boxGeometry args={[0.76, 0.76, 0.76]} />
              <meshBasicMaterial color={C.accent} transparent opacity={0.06 * lit} depthWrite={false} />
            </mesh>
            {i < N - 1 ? (
              <WireLine from={[x + 0.38, 0.7, 0]} to={[x + GAP - 0.38, 0.7, 0]} color={C.lineDim} opacity={0.55} thickness={0.016} />
            ) : null}
          </group>
        );
      })}

      {/* 串行脉冲 */}
      <mesh position={[pulseX, 0.7, 0.42]}>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshBasicMaterial color={C.accent} />
      </mesh>

      {/* 长依赖路径：跨度标注 */}
      <WireLine from={[-(N - 1) * GAP * 0.5, 1.55, 0]} to={[(N - 1) * GAP * 0.5, 1.55, 0]} color={C.accent} opacity={0.5} thickness={0.01} />
      <Leader from={[-(N - 1) * GAP * 0.5, 1.55, 0]} to={[-(N - 1) * GAP * 0.5, 1.05, 0]} opacity={0.5} />
      <Leader from={[(N - 1) * GAP * 0.5, 1.55, 0]} to={[(N - 1) * GAP * 0.5, 1.05, 0]} opacity={0.5} />

      {/* GPU 核心阵列：只有一列在工作 */}
      {Array.from({length: 7 * 4}).map((_, k) => {
        const i = k % 7;
        const j = Math.floor(k / 7);
        const active = i === Math.floor(sweep * 7) && j === 1;
        return (
          <mesh key={k} position={[(i - 3) * 0.62, -1.5 + (j - 1.5) * 0.42, 0]}>
            <boxGeometry args={[0.44, 0.3, 0.02]} />
            <meshBasicMaterial color={active ? C.accent : C.lineFaint} transparent opacity={active ? 0.85 : 0.28} depthWrite={false} />
          </mesh>
        );
      })}
      <WireLine from={[-2.6, -2.05, 0]} to={[2.6, -2.05, 0]} color={C.lineFaint} opacity={0.4} thickness={0.008} />
    </Stage>
  );
};

/* ═════════ c03 · 查询式读取 ═════════ */
const SIM = [0.86, 0.62, 0.44, 0.3, 0.22, 0.14];

export const C03: React.FC<{shot: Shot}> = ({shot}) => {
  const frame = useCurrentFrame();
  const p = frame / shot.frames;
  const emit = clamp01((p - 0.14) / 0.34);
  const readback = clamp01((p - 0.56) / 0.3);
  const camA = 0.24 - p * 0.12;
  const cam: [number, number, number] = [Math.sin(camA) * 15.2, 2.6, Math.cos(camA) * 15.2];

  const src: [number, number, number] = [-3.4, 0.2, 0];
  const cards = SIM.map((s, i) => {
    const y = 2.1 - i * 0.84;
    return {s, pos: [1.7, y, 0] as [number, number, number], y};
  });

  return (
    <Stage position={cam} fov={40}>
      <Lights />
      <Dust count={110} />
      <Rig position={cam} lookAt={[-0.3, 0.1, 0]} />

      {/* 查询源 */}
      <WireBox position={src} size={[0.9, 0.9, 0.9]} color={C.accent} opacity={0.95} fill={0.08} />
      <mesh position={src}>
        <boxGeometry args={[0.98, 0.98, 0.98]} />
        <meshBasicMaterial color={C.accent} transparent opacity={0.05} />
      </mesh>

      {/* 词条卡 */}
      {cards.map(({s, pos}, i) => (
        <group key={i} position={pos} scale={[0.5 + emit * 0.5, 0.5 + emit * 0.5, 1]}>
          <WireBox size={[2.2, 0.6, 0.06]} color={s > 0.5 ? C.line : C.lineFaint} opacity={0.9} fill={0.03 + s * readback * 0.06} />
          {/* Key 段 */}
          <WireBox position={[-0.7, 0, 0.06]} size={[0.46, 0.16, 0.02]} color={C.mint} opacity={0.9} fill={0.1} />
          {/* Value 段长度随相似度 */}
          <WireBox position={[0.18 + s * 0.3, 0, 0.06]} size={[0.5 + s * 0.9, 0.1, 0.02]} color={C.lineDim} opacity={0.8} fill={0.06} />
        </group>
      ))}

      {/* 查询线：粗细/透明度 = 相似度 */}
      {cards.map(({s, pos}, i) => (
        <WireLine
          key={i}
          from={[src[0] + 0.5, src[1], src[2]]}
          to={[pos[0] - 1.1, pos[1], pos[2]]}
          color={s > 0.5 ? C.mint : C.lineFaint}
          opacity={(0.12 + s * 0.6) * emit}
          thickness={0.01 + s * 0.018}
          progress={emit}
        />
      ))}

      {/* 取回：最强的那条线回流 */}
      <FlowDots from={[1.2, 2.1, 0.1]} to={[src[0] + 0.6, src[1], 0.1]} count={7} progress={readback} color={C.mint} size={0.045} arc={0.6} />

      {/* 权重标尺 */}
      <Ticks start={[-3.9, -2.3, 0]} end={[2.3, -2.3, 0]} count={6} length={0.14} color={C.lineFaint} opacity={0.5} />
    </Stage>
  );
};

/* ═════════ c04 · Q K V 与点积 ═════════ */
export const C04: React.FC<{shot: Shot}> = ({shot}) => {
  const frame = useCurrentFrame();
  const p = frame / shot.frames;
  const ph = (a: number, b: number) => clamp01((p - a) / (b - a));

  const qIn = ph(0.02, 0.12);
  const kIn = ph(0.08, 0.18);
  const dot = ph(0.26, 0.44);
  const soft = ph(0.46, 0.64);
  const vIn = ph(0.62, 0.72);
  const outP = ph(0.74, 0.9);

  const camZ = 14.6 - 0.8 * easeInOut(p);
  const cam: [number, number, number] = [0, 1.6, camZ];
  const X = {q: -5.4, k: -3.4, s: -1.3, p: 0.5, v: 2.5, o: 4.5};

  const scores = [0.62, 0.24, 0.46, 0.18, 0.34, 0.22];
  const ex = scores.map((v) => Math.exp(v * 3.2));
  const sum = ex.reduce((a, b) => a + b, 0);
  const probs = ex.map((e) => e / sum);

  return (
    <>
      <Stage position={cam} fov={40}>
        <Lights />
        <Dust count={100} />
        <Rig position={cam} lookAt={[0, 0.1, 0]} />

        {/* Q 列 */}
        <group position={[X.q, 0.2, 0]} scale={[qIn, qIn, qIn]}>
          {Array.from({length: 6}).map((_, i) => (
            <WireBox key={i} position={[0, (2.5 - i) * 0.42, 0]} size={[0.34, 0.3, 0.12]} color={C.line} opacity={0.85} fill={0.05} />
          ))}
        </group>

        {/* K 矩阵 */}
        <group position={[X.k, 0.2, 0]} scale={[kIn, kIn, kIn]}>
          <WireMatrix rows={6} cols={6} cell={0.24} gap={0.05} color={C.lineDim} opacity={0.8} maxLift={0.12}
            value={(j, i, f) => 0.2 + 0.6 * Math.abs(Math.sin(j * 1.1 + i * 0.8 + f * 0.012))} />
        </group>

        {/* 点积光束 */}
        {Array.from({length: 6}).map((_, i) => (
          <WireLine key={i} from={[X.q + 0.2, 2.5 - i * 0.42 + 0.2, 0]} to={[X.k - 0.9, 2.5 - i * 0.42 + 0.2, 0]}
            color={C.accent} opacity={0.1 + scores[i] * 0.5 * dot} thickness={0.008 + scores[i] * 0.008} progress={dot} />
        ))}

        {/* 分数条 */}
        <group position={[X.s, -1.6, 0]}>
          {scores.map((v, i) => (
            <WireBar key={i} position={[(i - 2.5) * 0.36, 0, 0]} height={v * 2.2 * dot * (1 - soft * 0.5)} width={0.24} depth={0.24} color={C.amber} opacity={0.9} />
          ))}
        </group>

        {/* softmax 后 */}
        <group position={[X.p, -1.6, 0]}>
          {probs.map((v, i) => (
            <WireBar key={i} position={[(i - 2.5) * 0.36, 0, 0]} height={v * 2.2 * 3.2 * soft} width={0.24} depth={0.24} color={C.mint} opacity={0.95} />
          ))}
        </group>

        {/* V 矩阵 */}
        <group position={[X.v, 0.2, 0]} scale={[vIn, vIn, vIn]}>
          <WireMatrix rows={6} cols={6} cell={0.24} gap={0.05} color={C.lineDim} opacity={0.8} maxLift={0.12}
            value={(j, i, f) => 0.15 + 0.65 * Math.abs(Math.cos(j * 0.9 + i * 1.1 + f * 0.01))} />
        </group>

        {/* 输出向量 */}
        <group position={[X.o, 0.2, 0]} scale={[outP, outP, outP]}>
          {Array.from({length: 6}).map((_, i) => (
            <WireBox key={i} position={[0, (2.5 - i) * 0.42, 0]} size={[0.34, 0.3, 0.12]} color={C.mint} opacity={0.95} fill={0.08} />
          ))}
        </group>

        <FlowDots from={[X.p, -0.3, 0]} to={[X.o, 0.4, 0]} count={9} progress={outP} color={C.mint} size={0.04} arc={0.5} />
      </Stage>

      {/* 顶部公式与阶段标注 */}
      <div style={{position: "absolute", left: 420, top: 26, width: 1500, textAlign: "center", fontFamily: MONO, fontSize: 22, color: C.amber, opacity: ph(0.16, 0.3), letterSpacing: 1}}>
        Attention(Q,K,V) = softmax( QKᵀ / √dₖ ) · V
      </div>
      <div style={{position: "absolute", left: 420, top: 806, width: 1500, display: "flex", justifyContent: "center", gap: 150, fontFamily: MONO, fontSize: 15, color: C.lineDim, letterSpacing: 2, opacity: ph(0.1, 0.24)}}>
        <span>Q · 提问</span>
        <span>K · 标签</span>
        <span>QKᵀ</span>
        <span>softmax</span>
        <span>V · 内容</span>
        <span>OUT</span>
      </div>
    </>
  );
};
