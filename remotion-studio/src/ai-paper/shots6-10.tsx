import React from "react";
import * as THREE from "three";
import {AbsoluteFill, interpolate, useCurrentFrame} from "remotion";
import {C, FONT, MONO, clamp01, easeInOut, rnd, Stage} from "./layout";
import {Arc, Bar, Floor, Glow, Heatmap, Lights, MatrixFrame, MatrixTiles, Rig, Slabs, Stars} from "./three/parts";
import type {Shot} from "./timeline.generated";

const clamp = () => ({extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const});

/* ════════════════ 镜头 6 · 多头 ════════════════ */

// 八种可分辨的注意力模式（0..1）
const PATTERNS: ((j: number, i: number) => number)[] = [
  (j, i) => (i === j ? 0.95 : 0.06),                                   // 对角：自我
  (j, i) => (i + j === 4 ? 0.9 : 0.05),                                // 反对角
  (j, i) => (i === 0 ? 0.85 : 0.08),                                   // 首列：盯句首
  (j, i) => (Math.abs(i - j) <= 1 ? 0.8 : 0.05),                       // 局部窗口
  (j, i) => (j === 0 ? 0.75 : 0.1),                                    // 首行
  (j, i) => (i >= j ? 0.7 : 0.04),                                     // 因果：只看左侧
  (j, i) => (Math.abs(i - j) === 2 ? 0.72 : 0.06),                     // 隔位
  (j, i) => (i === 4 && j === 4 ? 0.9 : Math.abs(i - 2) + Math.abs(j - 2) < 2 ? 0.5 : 0.05), // 中心块
];

export const Shot06: React.FC<{shot: Shot}> = ({shot}) => {
  const frame = useCurrentFrame();
  const p = frame / shot.frames;
  const merge = easeInOut(clamp01((p - 0.66) / 0.26));
  const appear = clamp01(p / 0.18);

  const camA = 0.24 + p * 0.22;
  const camR = 12.6 - merge * 1.8;
  const cam: [number, number, number] = [Math.sin(camA) * camR, 3.4 - merge * 1.2, Math.cos(camA) * camR];

  const colors = [C.blue, C.purple, C.orange, C.green, C.cyan, "#f472b6", C.amber, "#a3e635"];

  return (
    <Stage position={cam} fov={42}>
      <Lights accent={C.purple} />
      <Stars count={480} radius={44} opacity={0.34} />
      <Rig position={cam} lookAt={[0, 0.1, 0]} />
      <Floor y={-3.3} size={42} />

      {/* 8 个头：4×2 矩阵阵列 */}
      {PATTERNS.map((fn, k) => {
        const col = k % 4;
        const row = Math.floor(k / 4);
        const bx = (col - 1.5) * 2.3;
        const by = 1.55 - row * 2.5;
        // 汇聚：向中心收拢并缩小
        const x = bx * (1 - merge * 0.82);
        const y = by * (1 - merge * 0.82);
        const z = merge * 0.5;
        const sc = appear * (1 - merge * 0.45);
        return (
          <group key={k} position={[x, y, z]} scale={[sc, sc, sc]}>
            <MatrixFrame rows={5} cols={5} cell={0.3} gap={0.05} color={colors[k]} opacity={0.8} />
            <MatrixTiles
              rows={5}
              cols={5}
              cell={0.3}
              gap={0.05}
              color={colors[k]}
              value={(j, i, f) => {
                const base = fn(j, i);
                return base * (0.75 + 0.25 * Math.sin(f * 0.05 + k + i * 0.4));
              }}
              maxHeight={0.3}
            />
            {/* 头的颜色标记 */}
            <mesh position={[0, -0.98, 0]}>
              <boxGeometry args={[1.4, 0.045, 0.045]} />
              <meshBasicMaterial color={colors[k]} transparent opacity={0.85} />
            </mesh>
          </group>
        );
      })}

      {/* 拼接结果 */}
      {merge > 0.35 ? (
        <group opacity={(merge - 0.35) / 0.65}>
          <MatrixFrame rows={8} cols={5} cell={0.3} gap={0.05} position={[0, 0.1, 1.4]} color={C.purple} opacity={1} />
          <MatrixTiles
            rows={8}
            cols={5}
            cell={0.3}
            gap={0.05}
            position={[0, 0.1, 1.45]}
            color={C.purple}
            value={(j, i, f) => PATTERNS[j % 8](0, i) * (0.8 + 0.2 * Math.sin(f * 0.04 + j))}
            maxHeight={0.34}
          />
          {/* 输出光束 */}
          <mesh position={[0, 2.9, 1.45]}>
            <cylinderGeometry args={[0.05, 0.4, 2.2, 20, 1, true]} />
            <meshBasicMaterial color={C.purple} transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        </group>
      ) : null}
    </Stage>
  );
};

/* ════════════════ 镜头 7 · 位置编码 ════════════════ */

export const Shot07: React.FC<{shot: Shot}> = ({shot}) => {
  const frame = useCurrentFrame();
  const p = frame / shot.frames;
  const camX = interpolate(p, [0, 1], [-1.8, 1.8], clamp());
  const cam: [number, number, number] = [camX, 2.2, 11.4];

  // 热力图：横轴 = 位置，纵轴 = 维度；颜色 = sin/cos 值
  const heat = (u: number, v: number, f: number): [number, number, number] => {
    const pos = u * 40;
    const dim = v * 48;
    const freq = Math.pow(10000, -(dim / 48));
    const s = Math.sin(pos * freq + f * 0.012) * 0.5 + 0.5;
    const c = Math.cos(pos * freq + f * 0.012) * 0.5 + 0.5;
    const val = dim % 2 === 0 ? s : c;
    // 深海军蓝 → 亮青
    const r = 6 + val * 84;
    const g = 14 + val * 212;
    const b = 26 + val * 200;
    return [r, g, b];
  };

  return (
    <Stage position={cam} fov={42}>
      <Lights accent={C.cyan} />
      <Stars count={460} radius={44} opacity={0.3} />
      <Rig position={cam} lookAt={[0, 0, 0]} />
      <Floor y={-3.4} size={44} />

      {/* 位置 × 维度 热力图 */}
      <Heatmap
        cols={80}
        rows={48}
        width={9.2}
        height={4.8}
        position={[0, 0.4, 0]}
        fn={heat}
        opacity={0.96}
      />

      {/* 位置刻度 */}
      {Array.from({length: 11}).map((_, i) => (
        <mesh key={i} position={[-4.4 + i * 0.88, -2.16, 0.1]}>
          <boxGeometry args={[0.03, 0.22, 0.03]} />
          <meshBasicMaterial color="#5d6c92" transparent opacity={0.75} />
        </mesh>
      ))}

      {/* 某个位置的"指纹"：螺旋 */}
      {(() => {
        const pos = 20;
        const pts: [number, number, number][] = [];
        for (let d = 0; d < 48; d++) {
          const freq = Math.pow(10000, -(d / 48));
          const val = Math.sin(pos * freq + frame * 0.012);
          pts.push([3.85 + val * 0.4, 2.35 - d * 0.098, 1.3]);
        }
        return pts.map((pt, i) => (
          <mesh key={i} position={pt}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshBasicMaterial color={i < 24 ? C.cyan : C.purple} transparent opacity={0.9 - i * 0.008} />
          </mesh>
        ));
      })()}

      {/* 频率刻度标记（低频在上，高频在下） */}
      <mesh position={[-4.85, 1.9, 0.6]}>
        <boxGeometry args={[0.5, 0.03, 0.03]} />
        <meshBasicMaterial color={C.cyan} />
      </mesh>
      <mesh position={[-4.85, -1.5, 0.6]}>
        <boxGeometry args={[0.5, 0.03, 0.03]} />
        <meshBasicMaterial color={C.purple} />
      </mesh>
    </Stage>
  );
};

/* ════════════════ 镜头 8 · 架构 ════════════════ */

export const Shot08: React.FC<{shot: Shot}> = ({shot}) => {
  const frame = useCurrentFrame();
  const p = frame / shot.frames;
  const camA = -0.28 + p * 0.2;
  const cam: [number, number, number] = [Math.sin(camA) * 11.6, 3.0, Math.cos(camA) * 11.6];
  const focus = clamp01((p - 0.3) / 0.3); // 交叉注意力高亮

  const encX = -1.9;
  const decX = 1.9;

  return (
    <>
    <Stage position={cam} fov={44}>
      <Lights accent={C.blue} />
      <Stars count={520} radius={46} opacity={0.36} />
      <Rig position={cam} lookAt={[0, 0.1, 0]} />
      <Floor y={-3.4} size={44} />

      {/* 编码器堆叠 */}
      <Slabs
        count={6}
        position={[encX, 0, 0]}
        color={C.blue}
        size={[2.1, 0.34, 1.9]}
        gapY={0.72}
        glow={(i, f) => 0.35 + 0.35 * Math.sin(f * 0.05 + i * 0.8)}
      />
      {/* 解码器堆叠 */}
      <Slabs
        count={6}
        position={[decX, 0, 0]}
        color={C.purple}
        size={[2.1, 0.34, 1.9]}
        gapY={0.72}
        glow={(i, f) => 0.35 + 0.35 * Math.sin(f * 0.05 + i * 0.8 + 1.2)}
      />

      {/* 子层色条：自注意力（青）/ 前馈（绿） */}
      {Array.from({length: 6}).map((_, i) => (
        <group key={"sub" + i}>
          <mesh position={[encX, (i - 2.5) * 0.72, 0.96]}>
            <boxGeometry args={[1.5, 0.09, 0.03]} />
            <meshStandardMaterial color={C.cyan} emissive={C.cyan} emissiveIntensity={0.9} />
          </mesh>
          <mesh position={[encX, (i - 2.5) * 0.72 + 0.3, 0.96]}>
            <boxGeometry args={[1.5, 0.06, 0.03]} />
            <meshStandardMaterial color={C.green} emissive={C.green} emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[decX, (i - 2.5) * 0.72, 0.96]}>
            <boxGeometry args={[1.5, 0.09, 0.03]} />
            <meshStandardMaterial color={C.purple} emissive={C.purple} emissiveIntensity={0.9} />
          </mesh>
          <mesh position={[decX, (i - 2.5) * 0.72 + 0.3, 0.96]}>
            <boxGeometry args={[1.5, 0.06, 0.03]} />
            <meshStandardMaterial color={C.amber} emissive={C.amber} emissiveIntensity={0.5} />
          </mesh>
        </group>
      ))}

      {/* 编码器输入 / 解码器输入输出 */}
      <Glow position={[encX, -2.6, 0]} r={0.22} color={C.cyan} intensity={1.3} />
      <Glow position={[decX, -2.6, 0]} r={0.22} color={C.amber} intensity={1.2} />
      <Glow position={[decX, 2.75, 0]} r={0.24} color={C.amber} intensity={1.5} />

      {/* 交叉注意力光束（随 focus 增强） */}
      {Array.from({length: 6}).map((_, i) => (
        <Arc
          key={i}
          from={[encX + 1.05, (i - 2.5) * 0.72, 0]}
          to={[decX - 1.05, (i - 2.5) * 0.72, 0]}
          lift={0.22}
          color={i % 2 ? C.cyan : C.blue}
          opacity={0.1 + focus * 0.22 + 0.05 * Math.sin(frame * 0.08 + i)}
          radius={0.012}
          head={focus > 0.3 ? (frame * 0.012 + i * 0.16) % 1 : -1}
        />
      ))}

      {/* 残差旁路：两侧细线 */}
      {[encX, decX].map((x) => (
        <mesh key={x} position={[x + (x > 0 ? 1.2 : -1.2), 0, 0]}>
          <boxGeometry args={[0.05, 4.4, 0.05]} />
          <meshBasicMaterial color="#3a4a74" transparent opacity={0.7} />
        </mesh>
      ))}
    </Stage>

    <div style={{position: "absolute", left: 640, top: 34, width: 1280, display: "flex", justifyContent: "center", gap: 300, fontFamily: MONO, fontSize: 19, letterSpacing: 3}}>
      <span style={{color: C.blue}}>ENCODER × 6</span>
      <span style={{color: C.purple}}>DECODER × 6</span>
    </div>
    </>
  );
};

/* ════════════════ 镜头 9 · 结果 ════════════════ */

export const Shot09: React.FC<{shot: Shot}> = ({shot}) => {
  const frame = useCurrentFrame();
  const p = frame / shot.frames;
  const grow = easeInOut(clamp01((p - 0.08) / 0.32));
  const camX = interpolate(p, [0, 1], [-1.4, 1.6], clamp());
  const cam: [number, number, number] = [camX, 2.3, 11.8];

  const bleu = [
    {x: -3.6, v: 26.3, c: "#6b7794"},
    {x: -2.5, v: 26.36, c: "#8894b3"},
    {x: -1.4, v: 28.4, c: C.green},
  ];
  const cost = [
    {x: 1.4, v: 180, c: "#6b7794"},
    {x: 2.5, v: 96, c: "#8894b3"},
    {x: 3.6, v: 23, c: C.green},
  ];
  const hB = (v: number) => Math.max(0.001, (0.7 + (v - 25.5) * 1.5) * grow);
  const hC = (v: number) => Math.max(0.001, (Math.log10(v) - 1.0) * 2.5 * grow);

  return (
    <>
    <Stage position={cam} fov={42}>
      <Lights accent={C.green} />
      <Stars count={460} radius={44} opacity={0.3} />
      <Rig position={cam} lookAt={[-0.1, 0.2, 0]} />
      <Floor y={-2.6} size={44} />

      {/* BLEU 组 */}
      {bleu.map((b, i) => (
        <group key={"b" + i}>
          <Bar position={[b.x, -2.5, 0]} height={hB(b.v)} width={0.62} depth={0.62} color={b.c} intensity={i === 2 ? 1.3 : 0.5} />
          {i === 2 ? <Glow position={[b.x, hB(b.v) - 2.5 + 0.22, 0]} r={0.09} color="#eafff4" intensity={2} halo={1.4} /> : null}
        </group>
      ))}
      {/* 算力组 */}
      {cost.map((c, i) => (
        <Bar key={"c" + i} position={[c.x, -2.5, 0]} height={hC(c.v)} width={0.54} depth={0.54} color={c.c} intensity={i === 2 ? 1.1 : 0.35} opacity={0.95} />
      ))}

      {/* 刻度 */}
      {[1, 2, 3, 4].map((k) => (
        <mesh key={"tick" + k} position={[-5.0, -2.5 + k * 0.78, 0]}>
          <boxGeometry args={[0.22, 0.02, 0.02]} />
          <meshBasicMaterial color="#4b5a7f" transparent opacity={0.6} />
        </mesh>
      ))}

      {/* 基线 */}
      <mesh position={[-0.1, -2.53, 0]}>
        <boxGeometry args={[10.4, 0.04, 1.0]} />
        <meshBasicMaterial color="#1b2440" transparent opacity={0.75} />
      </mesh>

      {/* 分组框 */}
      <mesh position={[-2.5, -2.56, 0.7]}>
        <boxGeometry args={[3.1, 0.02, 0.9]} />
        <meshBasicMaterial color={C.blue} transparent opacity={0.25} />
      </mesh>
      <mesh position={[2.5, -2.56, 0.7]}>
        <boxGeometry args={[3.1, 0.02, 0.9]} />
        <meshBasicMaterial color={C.orange} transparent opacity={0.25} />
      </mesh>
    </Stage>
    <div style={{position: "absolute", left: 640, top: 40, width: 1280, display: "flex", justifyContent: "center", gap: 250, fontFamily: MONO, fontSize: 18, letterSpacing: 2, color: "#8fa0c4"}}>
      <span>BLEU ↑（越高越好）</span>
      <span>训练算力 ↓（×10¹⁸ FLOPs）</span>
    </div>
    </>
  );
};

/* ════════════════ 镜头 10 · 收尾（全屏） ════════════════ */

export const Shot10: React.FC<{shot: Shot}> = ({shot}) => {
  const frame = useCurrentFrame();
  const p = frame / shot.frames;
  const titleOp = interpolate(frame, [shot.frames * 0.5, shot.frames * 0.5 + 34], [0, 1], clamp());
  const fade = interpolate(frame, [shot.frames - 30, shot.frames - 1], [0, 1], clamp());
  const camZ = 11 + easeInOut(p) * 6.5;

  return (
    <AbsoluteFill style={{background: C.bg, fontFamily: FONT}}>
      <div style={{position: "absolute", inset: 0, opacity: 1 - titleOp * 0.55}}>
        <Stage full position={[0, 0.6, camZ]} fov={44}>
          <Lights accent={C.blue} />
          <Stars count={900} radius={60} opacity={0.5} />
          <Floor y={-3.6} size={70} />
          <Rig position={[0, 0.6, camZ]} lookAt={[0, 0, 0]} />

          {/* 汇聚的 token 立方：螺旋收束 */}
          {Array.from({length: 44}).map((_, i) => {
            const t = clamp01(p * 1.1);
            const a = (i / 44) * Math.PI * 2 + frame * 0.006;
            const r = (4.6 + (i % 5) * 0.4) * (1 - t * 0.72);
            const y = Math.sin(i * 1.3) * 2.2 * (1 - t * 0.55);
            return (
              <mesh key={i} position={[Math.cos(a) * r, y, Math.sin(a) * r]} rotation={[frame * 0.01, a, 0]}>
                <boxGeometry args={[0.15, 0.15, 0.15]} />
                <meshStandardMaterial
                  color={i % 2 ? C.blue : C.purple}
                  emissive={i % 2 ? C.blue : C.purple}
                  emissiveIntensity={1.0}
                  roughness={0.3}
                  metalness={0.4}
                />
              </mesh>
            );
          })}

          <Glow position={[0, 0, 0]} r={0.55 + 0.3 * p} color="#d6e9ff" intensity={1.6 + p} halo={2.2} />
          <mesh rotation={[0.3, frame * 0.002, 0]}>
            <icosahedronGeometry args={[3.6, 1]} />
            <meshBasicMaterial color={C.blue} wireframe transparent opacity={0.18} />
          </mesh>
        </Stage>
      </div>

      <AbsoluteFill style={{alignItems: "center", justifyContent: "center", opacity: titleOp}}>
        <div
          style={{
            padding: "46px 70px",
            background: "rgba(4,7,14,.88)",
            border: "1px solid rgba(78,168,255,.24)",
            borderRadius: 18,
            textAlign: "center",
            boxShadow: "0 30px 90px rgba(0,0,0,.7)",
          }}
        >
          <div style={{fontSize: 74, fontWeight: 900, color: "#fff", letterSpacing: -0.5}}>Attention Is All You Need</div>
          <div style={{fontSize: 27, color: C.muted, marginTop: 20, letterSpacing: 2}}>Transformer · NeurIPS 2017</div>
          <div style={{marginTop: 26, display: "flex", flexDirection: "column", gap: 10}}>
            {shot.bullets.map((b, i) => (
              <div key={i} style={{fontSize: 21, color: "#c9d5ee"}}>{b}</div>
            ))}
          </div>
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{background: "#000", opacity: fade}} />
    </AbsoluteFill>
  );
};
