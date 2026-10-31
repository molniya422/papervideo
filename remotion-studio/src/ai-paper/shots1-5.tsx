import React from "react";
import * as THREE from "three";
import {AbsoluteFill, interpolate, useCurrentFrame} from "remotion";
import {C, FONT, MONO, clamp01, easeInOut, rnd, Stage} from "./layout";
import {Arc, Bar, CurveLine, Floor, Glow, Lights, MatrixFrame, MatrixTiles, Rig, Stars, Tokens, VectorCol} from "./three/parts";
import type {Shot} from "./timeline.generated";

const clamp = () => ({extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const});

/* ════════════════ 镜头 1 · 开篇（全屏） ════════════════ */

export const Shot01: React.FC<{shot: Shot}> = ({shot}) => {
  const frame = useCurrentFrame();
  const p = frame / shot.frames;
  const titleOp = interpolate(frame, [10, 34], [0, 1], clamp());
  const subOp = interpolate(frame, [60, 92], [0, 1], clamp());
  const listOp = interpolate(frame, [140, 172], [0, 1], clamp());

  return (
    <AbsoluteFill style={{background: C.bg, fontFamily: FONT}}>
      <Stage full position={[0, 0.4, 13]} fov={42}>
        <Lights accent={C.blue} />
        <Stars count={1200} radius={70} />
        <Floor y={-3.6} size={80} />
        <Rig position={[0, 0.4 - 0.2 * easeInOut(p), 13 - 3.8 * easeInOut(p)]} lookAt={[0, 0, 0]} />

        {/* 论文：三层悬浮纸面 */}
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0, -i * 0.12, -i * 0.16]} rotation={[-0.22, 0.32 + i * 0.04, 0.06]}>
            <boxGeometry args={[3.4 - i * 0.12, 4.4 - i * 0.1, 0.035]} />
            <meshStandardMaterial
              color="#dbe7ff"
              emissive="#4ea8ff"
              emissiveIntensity={0.06 + i * 0.02}
              roughness={0.55}
              metalness={0.1}
              transparent
              opacity={0.9 - i * 0.16}
            />
          </mesh>
        ))}

        {/* 环绕的 token 立方 */}
        {Array.from({length: 14}).map((_, i) => {
          const a = (i / 14) * Math.PI * 2 + frame * 0.004;
          const r = 3.5 + 0.5 * Math.sin(i * 1.7);
          const y = Math.sin(i * 0.9) * 1.5;
          return (
            <mesh key={i} position={[Math.cos(a) * r, y, Math.sin(a) * r]} rotation={[frame * 0.01 + i, frame * 0.008, 0]}>
              <boxGeometry args={[0.26, 0.26, 0.26]} />
              <meshStandardMaterial
                color={i % 3 === 0 ? C.blue : i % 3 === 1 ? C.purple : C.cyan}
                emissive={i % 3 === 0 ? C.blue : i % 3 === 1 ? C.purple : C.cyan}
                emissiveIntensity={0.9}
                roughness={0.3}
                metalness={0.4}
              />
            </mesh>
          );
        })}

        {/* 外层线框 */}
        <mesh rotation={[0.3, frame * 0.0028, 0]}>
          <icosahedronGeometry args={[4.6, 1]} />
          <meshBasicMaterial color={C.blue} wireframe transparent opacity={0.16} />
        </mesh>

        <Glow position={[0, 0, 0]} r={0.5} color="#cfe4ff" intensity={1.5 + 0.5 * Math.sin(frame * 0.05)} halo={2} />
      </Stage>

      {/* 标题卡：实底，保证不与 3D 混读 */}
      <div style={{position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center"}}>
        <div
          style={{
            width: 1260,
            padding: "48px 60px",
            background: "#05070f",
            border: "1px solid rgba(78,168,255,.25)",
            borderRadius: 20,
            boxShadow: "0 30px 90px rgba(0,0,0,.75)",
            textAlign: "center",
            opacity: titleOp,
          }}
        >
          <div style={{fontFamily: MONO, fontSize: 17, letterSpacing: 7, color: C.blue, marginBottom: 18}}>
            NEURIPS 2017 · ARXIV 1706.03762
          </div>
          <div style={{fontSize: 70, fontWeight: 900, color: "#fff", lineHeight: 1.12, letterSpacing: -0.5}}>
            Attention Is All You Need
          </div>
          <div style={{height: 2, width: 520, margin: "26px auto", background: `linear-gradient(90deg,transparent,${C.blue},transparent)`}} />
          <div style={{fontSize: 31, color: C.text, opacity: subOp, letterSpacing: 2}}>注意力，就是你所需要的一切</div>
          <div style={{marginTop: 26, fontSize: 20, color: C.muted, opacity: subOp}}>Vaswani 等 8 人 · 2017</div>
          <div style={{marginTop: 30, display: "flex", flexDirection: "column", gap: 12, opacity: listOp}}>
            {shot.bullets.map((b, i) => (
              <div key={i} style={{fontSize: 21, color: "#c9d5ee", display: "flex", alignItems: "center", justifyContent: "center", gap: 12}}>
                <span style={{width: 5, height: 5, borderRadius: 99, background: C.blue, display: "inline-block"}} />
                {b}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ════════════════ 镜头 2 · RNN 串行 ════════════════ */

export const Shot02: React.FC<{shot: Shot}> = ({shot}) => {
  const frame = useCurrentFrame();
  const p = frame / shot.frames;
  const N = 6;
  const SP = 1.35;
  const xs = Array.from({length: N}).map((_, i) => (i - (N - 1) / 2) * SP);

  // 阅读光点来回扫 4 轮
  const sweep = (frame % 100) / 100;
  const lightX = -3.6 + sweep * 7.2;
  const litAt = (i: number) => Math.max(0, 1 - Math.abs(xs[i] - lightX) / 1.0);

  const camA = 0.34 + p * 0.1;
  const cam: [number, number, number] = [Math.sin(camA) * 10.4, 3.4, Math.cos(camA) * 10.4 - 1.2];

  // GPU 核心网格：只有极少数同时点亮
  const activeCol = Math.floor(sweep * 14);

  return (
    <Stage position={cam} fov={44}>
      <Lights accent={C.orange} />
      <Stars count={520} radius={48} opacity={0.42} />
      <Rig position={cam} lookAt={[0, 0.2, -0.4]} />
      <Floor y={-3.2} size={44} />

      {/* 背景 GPU 核心阵列：绝大多数空闲，只有一小簇在工作 */}
      {Array.from({length: 96}).map((_, k) => {
        const i = k % 16;
        const j = Math.floor(k / 16);
        const on = Math.abs(i - activeCol * 1.3) <= 0.7 && j >= 2 && j <= 3;
        return (
          <mesh key={k} position={[(i - 7.5) * 0.46, (j - 2.5) * 0.46 - 0.4, -4.9]}>
            <boxGeometry args={[0.35, 0.35, 0.05]} />
            <meshBasicMaterial
              color={on ? "#ffcf9e" : "#2a3a63"}
              transparent
              opacity={on ? 0.95 : 0.5}
              depthWrite={false}
            />
          </mesh>
        );
      })}

      {/* 令牌序列 */}
      <Tokens
        n={N}
        spacing={SP}
        size={0.68}
        color={C.orange}
        lit={(i) => litAt(i)}
      />

      {/* 相邻连线 */}
      {xs.slice(0, -1).map((x, i) => (
        <mesh key={i} position={[x + SP / 2, 0, 0]}>
          <boxGeometry args={[SP - 0.76, 0.035, 0.035]} />
          <meshBasicMaterial color={C.orange} transparent opacity={0.32} />
        </mesh>
      ))}

      {/* 长依赖弧：越远越暗，光点越走越小 */}
      <Arc from={[xs[0], 0.55, 0]} to={[xs[N - 1], 0.55, 0]} lift={2.3} color="#ff9d6b" opacity={0.22} radius={0.018} />
      {[0, 1, 2].map((k) => {
        const h = ((frame * 0.006 + k * 0.33) % 1);
        const cx = xs[0] + (xs[N - 1] - xs[0]) * h;
        const y = 0.55 + Math.sin(Math.PI * h) * 2.3;
        const scale = 0.14 * (1 - h * 0.75);
        return (
          <mesh key={k} position={[cx, y, 0]}>
            <sphereGeometry args={[Math.max(0.02, scale), 10, 10]} />
            <meshBasicMaterial color="#ffd9bf" transparent opacity={0.9 * (1 - h * 0.6)} />
          </mesh>
        );
      })}

      {/* 时间步刻度 */}
      {Array.from({length: 24}).map((_, i) => (
        <mesh key={"t" + i} position={[-3.9 + i * 0.34, -1.52, 0]}>
          <boxGeometry args={[0.02, i % 4 === 0 ? 0.24 : 0.12, 0.02]} />
          <meshBasicMaterial color="#5c4a3c" transparent opacity={i % 4 === 0 ? 0.8 : 0.45} />
        </mesh>
      ))}

      {/* 阅读光球 */}
      <Glow position={[lightX, 0, 0.9]} r={0.11} color="#fff1e0" intensity={2.4} halo={0.6} />
    </Stage>
  );
};

/* ════════════════ 镜头 3 · 查字典 ════════════════ */

const SIM = [0.72, 0.18, 0.55, 0.09, 0.34, 0.12];

export const Shot03: React.FC<{shot: Shot}> = ({shot}) => {
  const frame = useCurrentFrame();
  const p = frame / shot.frames;
  const queryIn = clamp01((p - 0.05) / 0.15);
  const cardsIn = clamp01((p - 0.05) / 0.16);
  const matchP = clamp01((p - 0.45) / 0.3);

  const camA = 0.5 - p * 0.16;
  const cam: [number, number, number] = [Math.sin(camA) * 10.8, 3.2 - p * 0.6, Math.cos(camA) * 10.8];
  const qPos: [number, number, number] = [-2.4, 0.2, 0];
  const cardX = 0.85;

  return (
    <Stage position={cam} fov={44}>
      <Lights accent={C.blue} />
      <Stars count={520} radius={46} opacity={0.4} />
      <Rig position={cam} lookAt={[-0.6, 0, 0]} />
      <Floor y={-3.3} size={42} />

      {/* Query 球 */}
      <group opacity={queryIn}>
        <Glow position={qPos} r={0.42} color="#9fd0ff" intensity={1.8 + 0.5 * Math.sin(frame * 0.07)} halo={1.6} />
      </group>

      {/* 字典背板 */}
      <mesh position={[cardX, 0, -0.55]}>
        <boxGeometry args={[3.0, 5.5, 0.04]} />
        <meshBasicMaterial color="#0b1424" transparent opacity={0.45 * cardsIn} />
      </mesh>

      {/* 词条卡片 */}
      {SIM.map((s, i) => {
        const y = 2.1 - i * 0.84;
        const visible = cardsIn;
        const boost = 1 + matchP * s * 0.5;
        return (
          <group key={i} position={[cardX, y, 0]} scale={[visible * boost, visible * boost, visible]}>
            {/* 卡片底板 */}
            <mesh>
              <boxGeometry args={[2.15, 0.62, 0.06]} />
              <meshStandardMaterial
                color="#111a30"
                emissive={s > 0.4 ? C.blue : "#2a3552"}
                emissiveIntensity={0.15 + s * 0.5 * matchP}
                roughness={0.4}
                metalness={0.3}
              />
            </mesh>
            {/* Key 条 */}
            <mesh position={[-0.78, 0, 0.06]}>
              <boxGeometry args={[0.5, 0.16, 0.04]} />
              <meshStandardMaterial color={C.green} emissive={C.green} emissiveIntensity={0.5 + s * 1.6 * matchP} />
            </mesh>
            {/* Value 条（长度代表内容量） */}
            <mesh position={[0.16 + (0.4 + s) * 0.28, 0, 0.06]}>
              <boxGeometry args={[0.6 + s * 0.9, 0.12, 0.04]} />
              <meshStandardMaterial color={C.orange} emissive={C.orange} emissiveIntensity={0.3 + s * 1.2} transparent opacity={0.85} />
            </mesh>
          </group>
        );
      })}

      {/* 匹配连线：粗细分权 */}
      {SIM.map((s, i) => {
        const y = 2.1 - i * 0.84;
        const op = cardsIn * (0.1 + s * 0.55 * matchP);
        return (
          <Arc
            key={i}
            from={[qPos[0] + 0.5, qPos[1], qPos[2]]}
            to={[cardX - 1.08, y, 0]}
            lift={0.5 + Math.abs(y - qPos[1]) * 0.18}
            color={s > 0.4 ? C.blue : "#5c6a8f"}
            opacity={op}
            radius={0.012 + s * 0.02}
            head={matchP > 0.6 ? (frame * 0.02 + i * 0.17) % 1 : -1}
          />
        );
      })}

      {/* 汇总权重矩阵 */}
      <MatrixTiles
        rows={1}
        cols={6}
        cell={0.42}
        gap={0.08}
        position={[1.9, -2.72, 0]}
        color={C.blue}
        opacity={matchP}
        value={(j) => SIM[j] * (0.5 + 0.5 * Math.sin(frame * 0.06 + j))}
        maxHeight={0.5}
      />
    </Stage>
  );
};

/* ════════════════ 镜头 4 · 计算流程 ════════════════ */

export const Shot04: React.FC<{shot: Shot}> = ({shot}) => {
  const frame = useCurrentFrame();
  const p = frame / shot.frames;
  const ph = (a: number, b: number) => clamp01((p - a) / (b - a));

  const qIn = ph(0.02, 0.12);
  const kIn = ph(0.09, 0.19);
  const sIn = ph(0.18, 0.3);
  const softP = ph(0.32, 0.46);
  const vIn = ph(0.47, 0.58);
  const outP = ph(0.62, 0.8);

  const camZ = 11.4 - 0.5 * easeInOut(p);
  const cam: [number, number, number] = [0, 1.95, camZ];

  const scores = [0.62, 0.28, 0.44, 0.16, 0.32, 0.2];
  const ex = scores.map((v) => Math.exp(v * 3.2));
  const sum = ex.reduce((a, b) => a + b, 0);
  const probs = ex.map((e) => e / sum);

  const X = {q: -4.75, k: -3.05, s: -0.95, pr: 0.75, v: 2.55, o: 4.45};

  const beam = (x1: number, x2: number, op: number, color: string) => (
    <mesh position={[(x1 + x2) / 2, 0, 0]} visible={op > 0.01}>
      <boxGeometry args={[x2 - x1, 0.02, 0.02]} />
      <meshBasicMaterial color={color} transparent opacity={0.5 * op} />
    </mesh>
  );

  return (
    <>
    <Stage position={cam} fov={42}>
      <Lights accent={C.purple} />
      <Stars count={420} radius={44} opacity={0.28} />
      <Rig position={cam} lookAt={[0, 0.05, 0]} />
      <Floor y={-3.1} size={44} />

      {/* Q */}
      <group position={[X.q, 0.1, 0]}>
        <group scale={[qIn, qIn, qIn]}>
          <VectorCol n={6} position={[0, 0, 0]} color={C.blue} cell={0.26} value={(i, f) => 0.4 + 0.35 * Math.abs(Math.sin(i * 1.6 + f * 0.02))} />
        </group>
      </group>

      {/* K */}
      <group position={[X.k, 0.1, 0]}>
        <group scale={[kIn, kIn, kIn]}>
          <MatrixFrame rows={6} cols={6} cell={0.24} gap={0.05} position={[0, 0, -0.05]} color={C.green} opacity={0.9} />
          <MatrixTiles rows={6} cols={6} cell={0.24} gap={0.05} position={[0, 0, 0]} color={C.green} maxHeight={0.16}
            value={(j, i, f) => 0.18 + 0.5 * Math.abs(Math.sin(j * 1.2 + i * 0.9 + f * 0.015))} />
        </group>
      </group>

      {/* 分数条 */}
      <group position={[X.s, -1.35, 0]}>
        {scores.map((v, i) => (
          <Bar key={i} position={[(i - 2.5) * 0.34, 0, 0]} height={v * 2.6 * sIn * (1 - softP * 0.55)} width={0.24} depth={0.24} color={C.amber} intensity={0.9} />
        ))}
      </group>

      {/* 概率条 */}
      <group position={[X.pr, -1.35, 0]}>
        {probs.map((v, i) => (
          <Bar key={i} position={[(i - 2.5) * 0.34, 0, 0]} height={v * 2.6 * 3.4 * softP} width={0.24} depth={0.24} color={C.purple} intensity={1.15} />
        ))}
      </group>

      {/* V */}
      <group position={[X.v, 0.1, 0]}>
        <group scale={[vIn, vIn, vIn]}>
          <MatrixFrame rows={6} cols={6} cell={0.24} gap={0.05} position={[0, 0, -0.05]} color={C.orange} opacity={0.9} />
          <MatrixTiles rows={6} cols={6} cell={0.24} gap={0.05} position={[0, 0, 0]} color={C.orange} maxHeight={0.16} opacity={0.92}
            value={(j, i, f) => 0.15 + 0.55 * Math.abs(Math.cos(j * 0.95 + i * 1.15 + f * 0.012))} />
        </group>
      </group>

      {/* 输出 */}
      <group position={[X.o, 0.1, 0]}>
        <group scale={[outP, outP, outP]}>
          <VectorCol n={6} position={[0, 0, 0]} color={C.purple} cell={0.26} value={(i, f) => 0.45 + 0.4 * Math.abs(Math.cos(i * 1.4 + f * 0.03))} />
          <mesh position={[0, 0, -0.2]}>
            <boxGeometry args={[0.72, 2.4, 0.02]} />
            <meshBasicMaterial color={C.purple} transparent opacity={0.1} />
          </mesh>
        </group>
      </group>

      {/* 阶段连线 */}
      {beam(X.q + 0.2, X.k - 0.86, qIn * kIn, C.blue)}
      {beam(X.k + 0.86, X.s - 1.0, kIn * sIn, C.green)}
      {beam(X.s + 1.0, X.pr - 1.0, sIn * softP, C.amber)}
      {beam(X.pr + 1.0, X.v - 0.86, softP * vIn, C.purple)}
      {beam(X.v + 0.86, X.o - 0.2, vIn * outP, C.purple)}

      {/* 加权流动粒子 */}
      {outP > 0.02
        ? Array.from({length: 16}).map((_, k) => {
            const t = clamp01(outP * 1.5 - rnd(k) * 0.6);
            const sx = X.pr, sy = -0.6, sz = 0;
            const tx = X.o, ty = 0.2, tz = 0;
            return (
              <mesh key={k} position={[sx + (tx - sx) * t, sy + (ty - sy) * t + Math.sin(t * Math.PI) * 0.5, sz]}>
                <sphereGeometry args={[0.045, 8, 8]} />
                <meshBasicMaterial color={k % 2 ? C.purple : "#e2d4ff"} transparent opacity={0.9 * (1 - t * 0.3)} />
              </mesh>
            );
          })
        : null}
    </Stage>

    {/* 阶段标签：固定在 3D 区底部，帮助读者把画面和步骤对上 */}
    {[
      {x: 0.129, t: "Q · 查询"},
      {x: 0.335, t: "K · 键"},
      {x: 0.546, t: "QKᵀ 分数"},
      {x: 0.667, t: "softmax"},
      {x: 0.808, t: "V · 值"},
      {x: 0.94, t: "输出"},
    ].map((l, k) => (
      <div
        key={k}
        style={{
          position: "absolute",
          left: 640 + l.x * 1280 - 60,
          top: 700,
          width: 120,
          textAlign: "center",
          fontFamily: MONO,
          fontSize: 17,
          color: "#8fa0c4",
          letterSpacing: 1,
          opacity: ph(0.02 + k * 0.075, 0.1 + k * 0.075),
        }}
      >
        {l.t}
      </div>
    ))}
    <div
      style={{
        position: "absolute",
        left: 640,
        top: 34,
        width: 1280,
        textAlign: "center",
        fontFamily: "Georgia, 'Cambria Math', serif",
        fontSize: 26,
        color: "#ffe9a8",
        opacity: ph(0.18, 0.3),
        letterSpacing: 0.6,
      }}
    >
      Attention(Q, K, V) = softmax( QKᵀ / √dₖ ) · V
    </div>
    </>
  );
};
/* ════════════════ 镜头 5 · 缩放 ════════════════ */

export const Shot05: React.FC<{shot: Shot}> = ({shot}) => {
  const frame = useCurrentFrame();
  const p = frame / shot.frames;
  const grow = clamp01((p - 0.1) / 0.35);
  const alert = clamp01((p - 0.58) / 0.2);
  const camZ = 12.4 - 1.6 * easeInOut(p);
  const cam: [number, number, number] = [0.4, 2.6, camZ];

  const sharp = [1, 0.16, 0.09, 0.06, 0.05, 0.04, 0.03, 0.02];
  const smooth = [0.42, 0.36, 0.3, 0.26, 0.22, 0.19, 0.16, 0.13];

  const softmaxCurve = (vals: number[], temp: number) => {
    const e = vals.map((v) => Math.exp(v * temp));
    const s = e.reduce((a, b) => a + b, 0);
    return e.map((x) => x / s);
  };
  const curveL = softmaxCurve(sharp, 7);
  const curveR = softmaxCurve(smooth, 2.6 * 2);

  return (
    <>
    <Stage position={cam} fov={42}>
      <Lights accent={C.amber} />
      <Stars count={460} radius={44} opacity={0.34} />
      <Rig position={cam} lookAt={[0.2, 0.3, 0]} />
      <Floor y={-3.2} size={44} />

      {/* 左：未缩放 */}
      <group position={[-3.1, 0, 0]}>
        {sharp.map((v, i) => (
          <Bar key={i} position={[(i - 3.5) * 0.5, -2.4, 0]} height={v * 5.2 * grow} width={0.38} depth={0.38} color={C.red} intensity={0.9} />
        ))}
        <CurveLine
          points={curveL}
          width={4.2}
          height={3.4}
          position={[0, -2.38, 0.42]}
          color="#ff9f9f"
          opacity={0.95 * grow}
        />
        <mesh position={[0, -2.44, 0]}>
          <boxGeometry args={[4.6, 0.05, 0.9]} />
          <meshBasicMaterial color="#1b2440" transparent opacity={0.7} />
        </mesh>
      </group>

      {/* 右：除以 √dk */}
      <group position={[2.9, 0, 0]}>
        {smooth.map((v, i) => (
          <Bar key={i} position={[(i - 3.5) * 0.5, -2.4, 0]} height={v * 5.2 * grow} width={0.38} depth={0.38} color={C.green} intensity={0.9} />
        ))}
        <CurveLine
          points={curveR}
          width={4.2}
          height={3.4}
          position={[0, -2.38, 0.42]}
          color="#8ef0c4"
          opacity={0.95 * grow}
        />
        <mesh position={[0, -2.44, 0]}>
          <boxGeometry args={[4.6, 0.05, 0.9]} />
          <meshBasicMaterial color="#1b2440" transparent opacity={0.7} />
        </mesh>
      </group>

      {/* 中间分隔 */}
      <mesh position={[0, 0.2, -0.6]}>
        <boxGeometry args={[0.02, 5.2, 0.02]} />
        <meshBasicMaterial color="#26314f" transparent opacity={0.85} />
      </mesh>
    </Stage>

    <div style={{position: "absolute", left: 640, top: 40, width: 1280, display: "flex", justifyContent: "center", gap: 300, fontFamily: MONO, fontSize: 18, letterSpacing: 1, opacity: grow}}>
      <span style={{color: "#ff9f9f"}}>未缩放 · Var = 64 · σ = 8</span>
      <span style={{color: "#8ef0c4"}}>÷√dₖ · Var = 1 · σ = 1</span>
    </div>
    </>
  );
};
