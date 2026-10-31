import React from "react";
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from "remotion";
import {ThreeCanvas} from "@remotion/three";
import {interpolate} from "remotion";
import {C, FONT, MONO, easeInOut, rnd} from "./theme";
import {Arc, CameraRig, FloorGrid, GlowSphere, SceneLights, Starfield} from "./three/kit";

const clamp = () => ({extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const});

export const Stage3D: React.FC<{
  children: React.ReactNode;
  fov?: number;
  position?: [number, number, number];
  background?: string;
}> = ({children, fov = 45, position = [0, 0, 12], background = C.bg}) => {
  const {width, height} = useVideoConfig();
  return (
    <ThreeCanvas
      width={width}
      height={height}
      camera={{fov, near: 0.1, far: 200, position}}
      gl={{antialias: true}}
      style={{background}}
    >
      {children}
    </ThreeCanvas>
  );
};

/* ═════════════ 镜头 1 · 开篇 ═════════════ */

export const Shot1Opening: React.FC<{frames: number}> = ({frames}) => {
  const frame = useCurrentFrame();
  const p = frame / frames;

  const titleOp = interpolate(frame, [18, 46], [0, 1], clamp());
  const lineW = interpolate(frame, [40, 78], [0, 1], clamp());
  const subOp = interpolate(frame, [78, 108], [0, 1], clamp());
  const thirdOp = interpolate(frame, [140, 172], [0, 1], clamp());

  return (
    <AbsoluteFill style={{background: C.bg, fontFamily: FONT}}>
      <Stage3D position={[0, 0.6, 13.5]}>
        <SceneLights accent={C.blue} />
        <Starfield count={1100} radius={70} />
        <FloorGrid y={-3.6} size={80} />
        <CameraRig
          position={[0, 0.6 - 0.3 * easeInOut(p), 13.5 - 4.6 * easeInOut(p)]}
          lookAt={[0, 0.1, 0]}
        />
        {/* 线框二十面体 */}
        <mesh rotation={[0.28 + 0.12 * Math.sin(frame * 0.008), frame * 0.0038, 0]}>
          <icosahedronGeometry args={[2.45, 1]} />
          <meshBasicMaterial color={C.blue} wireframe transparent opacity={0.42} />
        </mesh>
        <mesh rotation={[0.1, -frame * 0.0026, 0.2]}>
          <icosahedronGeometry args={[3.15, 0]} />
          <meshBasicMaterial color={C.purple} wireframe transparent opacity={0.2} />
        </mesh>
        {/* 核心 */}
        <GlowSphere
          position={[0, 0, 0]}
          radius={0.82}
          color="#9fd0ff"
          intensity={1.6 + 0.8 * Math.sin(frame * 0.05)}
          halo={1.6}
        />
        {/* 轨道环 */}
        {[
          {r: 3.5, t: 0.42, s: 0.0022, c: C.blue, o: 0.5},
          {r: 4.2, t: 1.15, s: -0.0017, c: C.purple, o: 0.4},
          {r: 4.9, t: 0.1, s: 0.0013, c: C.cyan, o: 0.28},
        ].map((ring, i) => (
          <mesh key={i} rotation={[ring.t, frame * ring.s + i, 0.12]}>
            <torusGeometry args={[ring.r, 0.012, 8, 160]} />
            <meshBasicMaterial color={ring.c} transparent opacity={ring.o} />
          </mesh>
        ))}
      </Stage3D>

      {/* 标题叠层 */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(ellipse 62% 46% at 50% 52%, rgba(3,5,12,.82) 0%, rgba(3,5,12,.55) 55%, rgba(3,5,12,0) 100%)",
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 20,
            letterSpacing: 8,
            color: C.blue,
            opacity: titleOp * 0.95,
            marginBottom: 22,
            padding: "6px 16px",
            background: "rgba(3,5,12,.55)",
            borderRadius: 8,
            textShadow: "0 2px 12px rgba(0,0,0,.9)",
            textTransform: "uppercase",
          }}
        >
          NeurIPS 2017 · arXiv 1706.03762
        </div>
        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            color: "#ffffff",
            letterSpacing: -1,
            opacity: titleOp,
            transform: `translateY(${interpolate(titleOp, [0, 1], [26, 0])}px)`,
            textShadow: "0 0 60px rgba(78,168,255,.55)",
            textAlign: "center",
            lineHeight: 1.12,
          }}
        >
          Attention Is All You Need
        </div>
        <div
          style={{
            height: 3,
            width: 620 * lineW,
            background: `linear-gradient(90deg, transparent, ${C.blue}, transparent)`,
            margin: "30px 0 26px",
          }}
        />
        <div style={{fontSize: 36, color: C.text, opacity: subOp, letterSpacing: 2}}>
          注意力，就是你所需要的一切
        </div>
        <div style={{fontSize: 24, color: C.muted, opacity: thirdOp, marginTop: 20, letterSpacing: 1}}>
          Vaswani 等 8 人 · 3 分钟讲透一个改变 AI 的算子
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ═════════════ 镜头 2 · RNN 串行 ═════════════ */

export const Shot2RNN: React.FC<{frames: number}> = ({frames}) => {
  const frame = useCurrentFrame();
  const p = frame / frames;

  const N = 7;
  const GAP = 1.95;
  const nodeZ = (i: number) => -i * GAP;

  // 阅读进度：整段旁白走 5 轮
  const passes = 5;
  const inPass = (p * passes) % 1;
  const readFloat = inPass * (N - 1);

  const camAngle = 0.55 + p * 0.18;
  const camR = 13.2;
  const cam: [number, number, number] = [Math.sin(camAngle) * camR, 4.6, -5.8 + Math.cos(camAngle) * camR];

  return (
    <AbsoluteFill style={{background: C.bg, fontFamily: FONT}}>
      <Stage3D position={cam} fov={46}>
        <SceneLights accent={C.orange} />
        <Starfield count={650} radius={55} opacity={0.55} />
        <FloorGrid y={-3.2} size={60} />
        <CameraRig position={cam} lookAt={[0, -0.2, -5.7]} />

        {/* 序列节点 */}
        {Array.from({length: N}).map((_, i) => {
          const dist = Math.abs(readFloat - i);
          const lit = Math.max(0, 1 - dist * 0.85);
          return (
            <group key={i}>
              <GlowSphere
                position={[0, 0, nodeZ(i)]}
                radius={0.44}
                color={lit > 0.35 ? "#ffd9a8" : C.orange}
                intensity={0.75 + lit * 3.2}
                halo={lit}
              />
              {/* 已读节点的光晕残影 */}
              {lit > 0.05 ? (
                <mesh position={[0, 0, nodeZ(i)]}>
                  <sphereGeometry args={[0.85 + lit * 0.35, 24, 24]} />
                  <meshBasicMaterial color="#ffb066" transparent opacity={0.09 * lit} depthWrite={false} />
                </mesh>
              ) : null}
            </group>
          );
        })}

        {/* 节点之间的连线 */}
        {Array.from({length: N - 1}).map((_, i) => (
          <mesh key={i} position={[0, 0, (nodeZ(i) + nodeZ(i + 1)) / 2]}>
            <cylinderGeometry args={[0.018, 0.018, GAP - 0.9, 8]} />
            <meshBasicMaterial color={C.orange} transparent opacity={0.28} />
          </mesh>
        ))}

        {/* 正在传递的信号光点 */}
        {(() => {
          const z = -readFloat * GAP;
          return (
            <group>
              <mesh position={[0, 0, z]}>
                <sphereGeometry args={[0.13, 16, 16]} />
                <meshBasicMaterial color="#fff4e0" />
              </mesh>
              <mesh position={[0, 0, z]}>
                <sphereGeometry args={[0.34, 16, 16]} />
                <meshBasicMaterial color="#ffb066" transparent opacity={0.25} depthWrite={false} />
              </mesh>
            </group>
          );
        })()}

        {/* 尾部的"信息残留"粒子 */}
        {Array.from({length: 46}).map((_, i) => {
          const t = (frame * 0.012 + i * 0.13) % 1;
          const z = -t * (N - 1) * GAP;
          const r = 0.25 + 0.5 * rnd(i);
          const a = rnd(i + 99) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * r, Math.sin(a) * r * 0.6, z]}>
              <sphereGeometry args={[0.022, 6, 6]} />
              <meshBasicMaterial color={C.orange} transparent opacity={0.35 * (1 - t)} depthWrite={false} />
            </mesh>
          );
        })}
      </Stage3D>

      <ShotBullets
        kicker="WHY RNN FAILED"
        title="RNN：一个词，一个词地读"
        accent={C.orange}
        items={[
          {text: "必须逐步串行 —— GPU 的并行算力被闲置", at: 120},
          {text: "句首到句尾要走 n 步 —— 信息与梯度一路衰减", at: 320},
          {text: "路径长度 O(n)：语法结构越远，越学不动", at: 500},
        ]}
      />
      <DepthBadge text={`依赖路径  O(n)   ·   ${N} 个时间步`} accent={C.orange} />
    </AbsoluteFill>
  );
};

/* ═════════════ 镜头 3 · 全连接 ═════════════ */

export const Shot3Mesh: React.FC<{frames: number}> = ({frames}) => {
  const frame = useCurrentFrame();
  const p = frame / frames;

  const N = 6;
  const R = 3.3;
  const nodes: [number, number, number][] = Array.from({length: N}).map((_, i) => {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    return [Math.cos(a) * R, Math.sin(a * 2) * 0.55, Math.sin(a) * R];
  });

  const camR = interpolate(p, [0, 0.45, 1], [15.5, 9.4, 14.8], clamp());
  const camY = interpolate(p, [0, 0.45, 1], [8.6, 2.6, 7.2], clamp());
  const camA = -0.5 + p * 0.55;
  const cam: [number, number, number] = [Math.sin(camA) * camR, camY, Math.cos(camA) * camR];

  const pairs: [number, number][] = [];
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) pairs.push([i, j]);

  return (
    <AbsoluteFill style={{background: C.bg, fontFamily: FONT}}>
      <Stage3D position={cam} fov={48}>
        <SceneLights accent={C.blue} />
        <Starfield count={700} radius={60} opacity={0.6} />
        <CameraRig position={cam} lookAt={[0, 0, 0]} />

        {pairs.map(([i, j], k) => {
          const reveal = interpolate(frame, [30 + k * 12, 58 + k * 12], [0, 1], clamp());
          const head = ((frame * 0.012 + k * 0.17) % 1);
          return (
            <Arc
              key={`${i}-${j}`}
              from={nodes[i]}
              to={nodes[j]}
              lift={1.1 + Math.abs(i - j) * 0.22}
              color={k % 3 === 0 ? C.blue : k % 3 === 1 ? C.cyan : C.purple}
              opacity={0.34 * reveal}
              radius={0.022}
              head={reveal > 0.9 ? head : -1}
            />
          );
        })}

        {nodes.map((n, i) => (
          <GlowSphere
            key={i}
            position={n}
            radius={0.36}
            color={i === 0 ? "#ffd166" : "#a9d4ff"}
            intensity={1.5 + 0.9 * Math.sin(frame * 0.06 + i)}
            halo={1}
          />
        ))}
      </Stage3D>

      <ShotBullets
        kicker="ALL-PAIRS"
        title="让每个词，直接看到所有词"
        accent={C.blue}
        items={[
          {text: "任意两个位置之间，只有一次点积的距离", at: 90},
          {text: "最长路径 O(1) —— 长依赖不再需要「穿过」整条链", at: 260},
          {text: "代价：每层 O(n²·d) 计算量，换来确定性的并行", at: 400},
        ]}
      />
      <DepthBadge text={`全连接  ${(N * (N - 1)) / 2} 条关系  ·  路径 O(1)`} accent={C.blue} />
    </AbsoluteFill>
  );
};

/* ═════════════ 共用叠层 ═════════════ */

export const ShotBullets: React.FC<{
  kicker: string;
  title: string;
  accent: string;
  items: {text: string; at: number}[];
}> = ({kicker, title, accent, items}) => {
  const frame = useCurrentFrame();
  const titleOp = interpolate(frame, [6, 26], [0, 1], clamp());
  return (
    <AbsoluteFill style={{padding: "96px 0 0 92px", pointerEvents: "none"}}>
      <div style={{maxWidth: 760}}>
        <div style={{display: "flex", alignItems: "center", gap: 16, opacity: titleOp}}>
          <div style={{width: 54, height: 3, background: accent}} />
          <div style={{fontFamily: MONO, fontSize: 20, color: accent, letterSpacing: 3, opacity: 0.85}}>{kicker}</div>
        </div>
        <div
          style={{
            fontSize: 58,
            fontWeight: 900,
            color: "#fff",
            marginTop: 14,
            opacity: titleOp,
            transform: `translateY(${interpolate(titleOp, [0, 1], [18, 0])}px)`,
            lineHeight: 1.2,
            textShadow: "0 4px 40px rgba(0,0,0,.75)",
          }}
        >
          {title}
        </div>
        <div style={{marginTop: 30, display: "flex", flexDirection: "column", gap: 16}}>
          {items.map((it, i) => {
            const op = interpolate(frame, [it.at, it.at + 22], [0, 1], clamp());
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                  opacity: op,
                  transform: `translateX(${interpolate(op, [0, 1], [-16, 0])}px)`,
                  background: "rgba(8,12,24,.55)",
                  borderLeft: `3px solid ${accent}`,
                  borderRadius: "0 10px 10px 0",
                  padding: "12px 18px",
                  backdropFilter: "blur(6px)",
                }}
              >
                <div style={{fontSize: 26, color: "#e7eeff", lineHeight: 1.5}}>{it.text}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const DepthBadge: React.FC<{text: string; accent: string}> = ({text, accent}) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [40, 70], [0, 1], clamp());
  return (
    <div
      style={{
        position: "absolute",
        right: 92,
        top: 196,
        fontFamily: MONO,
        fontSize: 22,
        color: accent,
        opacity: op * 0.85,
        padding: "10px 18px",
        border: `1px solid ${accent}55`,
        borderRadius: 999,
        background: "rgba(6,9,18,.55)",
      }}
    >
      {text}
    </div>
  );
};
