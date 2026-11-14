import React from "react";
import * as THREE from "three";
import {AbsoluteFill, interpolate, useCurrentFrame} from "remotion";
import {C, FONT, MONO, clamp01, easeInOut, rnd} from "./theme";
import {CameraRig, GlowSphere, SceneLights, Starfield, SineRibbon} from "./three/kit";
import {DepthBadge, ShotBullets, Stage3D} from "./shots-a";

const clamp = () => ({extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const});

/* ═════════════ 镜头 4 · QKV 三维演示 ═════════════ */

export const Shot4QKV: React.FC<{frames: number}> = ({frames}) => {
  const frame = useCurrentFrame();
  const p = frame / frames;

  // 三个相位：0-.28 投影出 Q/K/V；.28-.62 对齐打分；.62-1 加权汇聚
  const phase = (a: number, b: number) => clamp01((p - a) / (b - a));

  const arrowP = easeInOut(phase(0.02, 0.26));
  const align = easeInOut(phase(0.3, 0.55));
  const scorePulse = phase(0.55, 0.68);
  const flow = phase(0.64, 0.95);

  const origin: [number, number, number] = [-0.9, 0.5, 0.2];
  const catPos: [number, number, number] = [-4.9, -0.5, -1.6];

  // Q 从"向上探索"逐渐转向候选词的 K —— 对齐即打分
  const qStart = new THREE.Vector3(0.15, 1, 0.1).normalize();
  const qEnd = new THREE.Vector3(catPos[0] - origin[0], catPos[1] + 0.25 - origin[1], catPos[2] - origin[2]).normalize();
  const dirQ = qStart.clone().lerp(qEnd, align).normalize();
  const dirK = new THREE.Vector3(origin[0] - catPos[0], origin[1] - catPos[1], origin[2] - catPos[2]).normalize();

  const camA = 0.36 - p * 0.24;
  const camR = 11.8;
  const cam: [number, number, number] = [Math.sin(camA) * camR, 3.2 - p * 0.7, Math.cos(camA) * camR];
  const look: [number, number, number] = [-2.6, 0.1, -0.8];

  const len = 3.0 * arrowP;
  const qTip = new THREE.Vector3(...origin).add(dirQ.clone().multiplyScalar(len));
  const kTip = new THREE.Vector3(...catPos).add(dirK.clone().multiplyScalar(len * 0.78));
  const mid = qTip.clone().add(kTip).multiplyScalar(0.5);

  return (
    <AbsoluteFill style={{background: C.bg, fontFamily: FONT}}>
      <Stage3D position={cam} fov={46}>
        <SceneLights accent={C.purple} />
        <Starfield count={600} radius={50} opacity={0.5} />
        <CameraRig position={cam} lookAt={look} />

        {/* 主语 token 与候选 token */}
        <GlowSphere position={origin} radius={0.5} color="#bfe0ff" intensity={1.4 + 0.5 * Math.sin(frame * 0.07)} />
        <GlowSphere position={catPos} radius={0.36} color={C.green} intensity={1.1} />

        {/* Q（蓝）从主语出发，逐渐指向候选词的 K */}
        {len > 0.05 ? (
          <>
            <arrowHelper args={[dirQ, new THREE.Vector3(...origin), len, 0x4ea8ff, 0.36, 0.19]} />
            {/* K（绿）从候选词指向主语 —— 与 Q 对望 */}
            <arrowHelper args={[dirK, new THREE.Vector3(...catPos), len * 0.78, 0x34d399, 0.32, 0.17]} />
            {/* V（橙）从候选词向下 —— 内容待取回 */}
            <arrowHelper
              args={[
                new THREE.Vector3(-0.12, -1, 0.3).normalize(),
                new THREE.Vector3(...catPos),
                len * 0.72,
                0xff7a45,
                0.3,
                0.16,
              ]}
            />
          </>
        ) : null}

        {/* 打分闪光：Q 尖与 K 尖的中点 */}
        {scorePulse > 0 ? (
          <group position={[mid.x, mid.y, mid.z]}>
            <mesh scale={0.2 + scorePulse * 0.9}>
              <sphereGeometry args={[0.5, 24, 24]} />
              <meshBasicMaterial color="#fff2c4" transparent opacity={0.85 * (1 - scorePulse * 0.7)} depthWrite={false} />
            </mesh>
            <mesh scale={1 + scorePulse * 2.6}>
              <ringGeometry args={[0.5, 0.56, 40]} />
              <meshBasicMaterial color={C.amber} transparent opacity={0.55 * (1 - scorePulse)} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
          </group>
        ) : null}

        {/* 加权汇聚：V 的粒子从候选词流向主语 */}
        {flow > 0
          ? Array.from({length: 30}).map((_, i) => {
              const t = clamp01(flow * 1.7 - rnd(i) * 0.7);
              const e = easeInOut(t);
              const sx = catPos[0] + 0.2;
              const sy = catPos[1] - 1.3;
              const sz = catPos[2];
              const x = sx + (origin[0] - sx) * e;
              const y = sy + (origin[1] - sy) * e + Math.sin(e * Math.PI) * 1.7;
              const z = sz + (origin[2] - sz) * e;
              return (
                <mesh key={i} position={[x, y, z]}>
                  <sphereGeometry args={[0.05 + 0.03 * rnd(i + 4), 8, 8]} />
                  <meshBasicMaterial color={i % 2 ? C.orange : "#ffd7a8"} transparent opacity={0.9 * (1 - t * 0.3)} depthWrite={false} />
                </mesh>
              );
            })
          : null}

        {/* 主语吸收信息后变大 */}
        {flow > 0.55 ? (
          <mesh position={origin}>
            <sphereGeometry args={[0.6 + 0.24 * flow, 24, 24]} />
            <meshBasicMaterial color={C.orange} transparent opacity={0.2} depthWrite={false} />
          </mesh>
        ) : null}

        <gridHelper args={[26, 26, "#16224a", "#0a1122"]} position={[0, -2.6, 0]} />
      </Stage3D>

      {/* Q/K/V 图例 */}
      <div style={{position: "absolute", right: 92, top: 300, display: "flex", flexDirection: "column", gap: 12, opacity: arrowP}}>
        {[
          {k: "Q", v: "Query · 我在找什么", c: C.blue},
          {k: "K", v: "Key · 我的标签", c: C.green},
          {k: "V", v: "Value · 我的内容", c: C.orange},
        ].map((it) => (
          <div key={it.k} style={{display: "flex", alignItems: "center", gap: 12, fontFamily: MONO, fontSize: 19}}>
            <div style={{width: 34, height: 3, background: it.c, boxShadow: `0 0 10px ${it.c}`}} />
            <span style={{color: it.c, fontWeight: 700}}>{it.k}</span>
            <span style={{color: "#97a3c2"}}>{it.v}</span>
          </div>
        ))}
      </div>

      <ShotBullets
        kicker="ATTENTION"
        title="Q · K · V：一次「检索」"
        accent={C.purple}
        items={[
          {text: "每个词投影成三个向量：Query / Key / Value", at: 60},
          {text: "Q 与全部 Key 点积 —— 分数越高，关系越强", at: 300},
          {text: "按分数把 Value 加权取回：信息定向流动", at: 430},
        ]}
      />
      <FormulaCard text="Attention(Q, K, V) = softmax( QKᵀ / √dₖ ) V" />
    </AbsoluteFill>
  );
};

/* ═════════════ 镜头 5 · 缩放 √dk ═════════════ */

export const Shot5Scaling: React.FC<{frames: number}> = ({frames}) => {
  const frame = useCurrentFrame();
  const p = frame / frames;

  const leftVals = [9.0, 1.0, 0.42, 0.22, 0.16, 0.11, 0.09, 0.05];
  const rightVals = [4.1, 3.7, 3.25, 2.85, 2.45, 2.05, 1.6, 1.25];

  const grow = easeInOut(clamp01((p - 0.12) / 0.42));
  const camX = interpolate(p, [0, 0.5, 1], [-1.5, 0.2, 1.7], clamp());
  const cam: [number, number, number] = [camX, 2.9, 12.0];

  const noScaleAlert = clamp01((p - 0.62) / 0.2);

  return (
    <AbsoluteFill style={{background: C.bg, fontFamily: FONT}}>
      <Stage3D position={cam} fov={44}>
        <SceneLights accent={C.amber} />
        <Starfield count={520} radius={50} opacity={0.42} />
        <CameraRig position={cam} lookAt={[camX * 0.4, 0.7, 0]} />

        {/* 左：未缩放 */}
        <group>
          {leftVals.map((v, i) => (
            <mesh key={"l" + i} position={[-4.6 + i * 0.62, (v * 0.42 * grow) / 2 - 1.6, 0]} scale={[1, Math.max(0.001, v * 0.42 * grow), 1]}>
              <boxGeometry args={[0.42, 1, 0.42]} />
              <meshStandardMaterial color={C.red} emissive={C.red} emissiveIntensity={0.8} roughness={0.3} metalness={0.3} />
            </mesh>
          ))}
          {/* 未缩放的 one-hot 尖峰 */}
          <mesh position={[-4.6, leftVals[0] * 0.42 * grow - 1.55, 0]}>
            <sphereGeometry args={[0.16, 16, 16]} />
            <meshBasicMaterial color="#ffe9a8" transparent opacity={grow} />
          </mesh>
        </group>

        {/* 右：除以 √dk */}
        <group>
          {rightVals.map((v, i) => (
            <mesh key={"r" + i} position={[1.5 + i * 0.62, (v * 0.42 * grow) / 2 - 1.6, 0]} scale={[1, Math.max(0.001, v * 0.42 * grow), 1]}>
              <boxGeometry args={[0.42, 1, 0.42]} />
              <meshStandardMaterial color={C.green} emissive={C.green} emissiveIntensity={0.75} roughness={0.3} metalness={0.3} />
            </mesh>
          ))}
        </group>

        {/* 底座 */}
        <mesh position={[0, -1.62, 0]}>
          <boxGeometry args={[13.4, 0.06, 1.1]} />
          <meshBasicMaterial color="#16224a" transparent opacity={0.6} />
        </mesh>

        {/* 中间的分隔与 σ 轴线 */}
        <mesh position={[0.05, 1.4, -0.6]}>
          <boxGeometry args={[0.02, 4.6, 0.02]} />
          <meshBasicMaterial color="#28345c" transparent opacity={0.7} />
        </mesh>

        <gridHelper args={[30, 30, "#141f3f", "#0a1122"]} position={[0, -1.66, 0]} />
      </Stage3D>

      {/* 面板标题 */}
      <div style={{position: "absolute", top: 424, left: 0, width: "100%", display: "flex", justifyContent: "center", gap: 470, pointerEvents: "none"}}>
        <div style={{textAlign: "center", opacity: grow}}>
          <div style={{fontSize: 26, color: C.red, fontWeight: 700}}>不缩放 · dₖ = 64</div>
          <div style={{fontSize: 20, color: C.muted, marginTop: 6, fontFamily: MONO}}>logits σ = 8 → one-hot</div>
        </div>
        <div style={{textAlign: "center", opacity: grow}}>
          <div style={{fontSize: 26, color: C.green, fontWeight: 700}}>÷ √dₖ = ÷ 8</div>
          <div style={{fontSize: 20, color: C.muted, marginTop: 6, fontFamily: MONO}}>σ = 1 → 梯度可用</div>
        </div>
      </div>

      <ShotBullets
        kicker="STABILITY"
        title="为什么必须除以 √dₖ"
        accent={C.amber}
        items={[
          {text: "q、k 各分量独立、方差 1 ⇒ 点积方差 = dₖ", at: 90},
          {text: "dₖ = 64 ⇒ 标准差 8 ⇒ softmax 饱和、梯度趋零", at: 330},
          {text: "除以 8 把方差拉回 1 —— 训练才能继续", at: 560},
        ]}
      />
      <div
        style={{
          position: "absolute",
          right: 92,
          top: 300,
          fontFamily: MONO,
          fontSize: 26,
          color: "#ffe9a8",
          opacity: noScaleAlert,
          padding: "10px 18px",
          border: "1px solid rgba(251,191,36,.35)",
          borderRadius: 10,
          background: "rgba(10,14,28,.6)",
        }}
      >
        Var(q·k) = dₖ = 64　⇒　σ = 8
      </div>
      <FormulaCard text="softmax( QKᵀ / √dₖ )　·　论文脚注 4 可手算" />
    </AbsoluteFill>
  );
};

/* ═════════════ 镜头 6 · 多头 ═════════════ */

export const Shot6MultiHead: React.FC<{frames: number}> = ({frames}) => {
  const frame = useCurrentFrame();
  const p = frame / frames;

  const merge = easeInOut(clamp01((p - 0.62) / 0.3));
  const ringA = p * 0.35;

  // 8 块面板排成朝向观众的弧形墙：两侧后退、略有起伏，保证每一块都能读
  const heads = Array.from({length: 8}).map((_, i) => {
    const off = i - 3.5;
    return {
      i,
      base: [off * 1.62, Math.cos(off * 0.55) * 0.55, -Math.abs(off) * 0.62] as [number, number, number],
      rotY: -off * 0.16,
    };
  });

  const camR = 12.6;
  const camA = 0.3 + p * 0.5;
  const cam: [number, number, number] = [Math.sin(camA) * camR, 5.2 - p * 1.4, Math.cos(camA) * camR];

  const headColors = [C.blue, C.purple, C.orange, C.green, C.cyan, "#f472b6", C.amber, "#a3e635"];

  return (
    <AbsoluteFill style={{background: C.bg, fontFamily: FONT}}>
      <Stage3D position={cam} fov={47}>
        <SceneLights accent={C.purple} />
        <Starfield count={520} radius={48} opacity={0.4} />
        <CameraRig position={cam} lookAt={[0, 0, 0]} />

        {heads.map(({i, base, rotY}) => {
          const target: [number, number, number] = [0, 1.9 - i * 0.5, 0];
          const pos: [number, number, number] = [
            base[0] * (1 - merge),
            base[1] * (1 - merge) + target[1] * merge,
            base[2] * (1 - merge) + target[2] * merge,
          ];
          const s = 1 - merge * 0.55;
          return (
            <group key={i} position={pos} scale={[s, s, s]}>
              {/* 注意力权重小面板 */}
              <mesh rotation={[0, rotY, 0]}>
                <planeGeometry args={[1.8, 1.8]} />
                <meshBasicMaterial color={headColors[i]} transparent opacity={0.12} side={THREE.DoubleSide} />
              </mesh>
              <mesh rotation={[0, rotY, 0]} position={[0, 0, 0.02]}>
                <planeGeometry args={[1.74, 1.74]} />
                <meshBasicMaterial color={headColors[i]} transparent opacity={0.06} side={THREE.DoubleSide} />
              </mesh>
              {/* 4×4 权重点阵 */}
              {Array.from({length: 16}).map((_, c) => {
                const cx = ((c % 4) - 1.5) * 0.34;
                const cy = (Math.floor(c / 4) - 1.5) * 0.34;
                const v = rnd(i * 17 + c * 3) * 0.8 + 0.2 * Math.sin(frame * 0.05 + c);
                return (
                  <mesh key={c} position={[cx, cy, 0.05]} rotation={[0, rotY, 0]}>
                    <sphereGeometry args={[0.062 + Math.abs(v) * 0.05, 8, 8]} />
                    <meshBasicMaterial color={headColors[i]} transparent opacity={0.35 + Math.abs(v) * 0.6} />
                  </mesh>
                );
              })}
              {/* 头编号 */}
              <mesh position={[0, -1.02, 0]}>
                <sphereGeometry args={[0.05, 8, 8]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </group>
          );
        })}

        {/* 拼接后的输出柱 */}
        {merge > 0.15 ? (
          <group>
            <mesh position={[0, -1.2, 0]} scale={[1, 1, 1]}>
              <boxGeometry args={[1.5, 0.5 + merge * 2.6, 1.5]} />
              <meshStandardMaterial
                color="#dfe9ff"
                emissive={C.purple}
                emissiveIntensity={0.5 + merge * 0.8}
                transparent
                opacity={0.35 + merge * 0.5}
                roughness={0.2}
                metalness={0.5}
              />
            </mesh>
            {/* 输出光束 */}
            <mesh position={[0, 3.4, 0]} scale={[1, 0.4 + merge * 1.6, 1]}>
              <cylinderGeometry args={[0.06, 0.42, 4.6, 20, 1, true]} />
              <meshBasicMaterial color={C.purple} transparent opacity={0.16 * merge} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
          </group>
        ) : null}

        <gridHelper args={[28, 28, "#151f42", "#0a1122"]} position={[0, -3.0, 0]} />
      </Stage3D>

      <ShotBullets
        kicker="CAPACITY"
        title="八个头，八种视角"
        accent={C.purple}
        items={[
          {text: "512 维拆成 8 × 64 维，各自独立计算", at: 80},
          {text: "拼接后再次投影 —— 总计算量几乎不变", at: 300},
          {text: "多头让模型同时盯语法、指代、搭配", at: 470},
        ]}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 200,
          textAlign: "center",
          fontFamily: MONO,
          fontSize: 34,
          color: "#c9b6ff",
          opacity: clamp01((p - 0.55) / 0.2),
          letterSpacing: 2,
        }}
      >
        8 heads × 64 dims = 512
      </div>
      <DepthBadge text="Concat(head₁ … head₈) Wᴼ" accent={C.purple} />
    </AbsoluteFill>
  );
};

/* ═════════════ 共用公式卡片 ═════════════ */

export const FormulaCard: React.FC<{text: string}> = ({text}) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [20, 46], [0, 1], clamp());
  return (
    <div
      style={{
        position: "absolute",
        right: 92,
        top: 116,
        opacity: op,
        fontFamily: "Georgia, 'Cambria Math', serif",
        fontSize: 25,
        color: "#ffe9a8",
        background: "rgba(10,14,28,.72)",
        border: "1px solid rgba(120,140,200,.3)",
        borderRadius: 14,
        padding: "12px 20px",
        letterSpacing: 0.5,
      }}
    >
      {text}
    </div>
  );
};
