import React from "react";
import {AbsoluteFill, interpolate, useCurrentFrame} from "remotion";
import {C, FONT, MONO, clamp01, easeInOut, rnd} from "./theme";
import {Arc, CameraRig, GlowSphere, SceneLights, SineRibbon, Starfield} from "./three/kit";
import {DepthBadge, ShotBullets, Stage3D} from "./shots-a";
import {FormulaCard} from "./shots-b";

const clamp = () => ({extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const});

/* ═════════════ 镜头 7 · 位置编码 ═════════════ */

export const Shot7Position: React.FC<{frames: number}> = ({frames}) => {
  const frame = useCurrentFrame();
  const p = frame / frames;

  const camX = interpolate(p, [0, 1], [-6.4, 5.2], clamp());
  const cam: [number, number, number] = [camX, 3.4, 11.6];

  const waves = [
    {y: 2.05, freq: 0.34, amp: 0.62, speed: 0.035, color: C.cyan, label: "i = 0　长波"},
    {y: 0.0, freq: 1.05, amp: 0.5, speed: 0.075, color: C.blue, label: "i = 64　中波"},
    {y: -2.05, freq: 3.1, amp: 0.36, speed: 0.16, color: C.purple, label: "i = 255　短波"},
  ];

  return (
    <AbsoluteFill style={{background: C.bg, fontFamily: FONT}}>
      <Stage3D position={cam} fov={42}>
        <SceneLights accent={C.cyan} />
        <Starfield count={560} radius={48} opacity={0.42} />
        <CameraRig position={cam} lookAt={[camX * 0.35, 0, 0]} />

        {waves.map((w, i) => (
          <SineRibbon
            key={i}
            y={w.y}
            freq={w.freq}
            amp={w.amp}
            speed={w.speed}
            phase={i * 1.7}
            color={w.color}
            opacity={0.95}
            span={10}
          />
        ))}

        {/* 位置刻度 */}
        {Array.from({length: 15}).map((_, i) => {
          const x = -7 + i;
          const on = x > camX - 5.2 && x < camX + 5.2;
          return (
            <group key={i}>
              <mesh position={[x, -3.35, 0]}>
                <sphereGeometry args={[0.045, 8, 8]} />
                <meshBasicMaterial color="#5b6b96" transparent opacity={on ? 0.85 : 0.25} />
              </mesh>
              <mesh position={[x, -3.35, 0]}>
                <boxGeometry args={[0.012, 0.34, 0.012]} />
                <meshBasicMaterial color="#33436e" transparent opacity={0.8} />
              </mesh>
            </group>
          );
        })}

        {/* 波形指纹采样点 */}
        {Array.from({length: 26}).map((_, i) => {
          const x = -7.6 + i * 0.62;
          const s = Math.sin(x * 1.05 + frame * 0.075) * 0.5;
          return (
            <mesh key={i} position={[x, s + 0.5, 0.35]}>
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshBasicMaterial color={C.blue} transparent opacity={0.5} depthWrite={false} />
            </mesh>
          );
        })}

        <gridHelper args={[34, 34, "#131e3f", "#091021"]} position={[0, -3.6, 0]} />
      </Stage3D>

      {waves.map((w, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 96 + i * 30,
            top: 590 + i * 0,
            fontFamily: MONO,
            fontSize: 20,
            color: w.color,
            opacity: 0.9,
            transform: `translateY(${i * 26}px)`,
            background: "rgba(4,7,15,.62)",
            padding: "4px 12px",
            borderRadius: 6,
          }}
        >
          <span style={{display: "inline-block", width: 26, height: 3, background: w.color, marginRight: 10, verticalAlign: "middle"}} />
          {w.label}
        </div>
      ))}

      <ShotBullets
        kicker="ORDER"
        title="没有循环，位置从哪来"
        accent={C.cyan}
        items={[
          {text: "在词向量上叠加不同频率的正弦波", at: 80},
          {text: "每个位置得到独一无二的「波形指纹」", at: 300},
          {text: "相对偏移可线性表示 ⇒ 天然编码相对位置", at: 470},
        ]}
      />
      <FormulaCard text="PE(pos, 2i) = sin( pos / 10000^(2i/512) )" />
    </AbsoluteFill>
  );
};

/* ═════════════ 镜头 8 · 结果 ═════════════ */

export const Shot8Results: React.FC<{frames: number}> = ({frames}) => {
  const frame = useCurrentFrame();
  const p = frame / frames;

  const grow = easeInOut(clamp01((p - 0.08) / 0.35));
  const camX = interpolate(p, [0, 0.45, 1], [-1.7, 0.1, 1.8], clamp());
  const cam: [number, number, number] = [camX, 2.85, 12.2];

  const bleu = [
    {x: -4.7, h: 26.3, label: "GNMT+RL 集成", color: "#6b7794"},
    {x: -3.1, h: 26.36, label: "ConvS2S 集成", color: "#8894b3"},
    {x: -1.5, h: 28.4, label: "Transformer", color: C.green},
  ];
  const cost = [
    {x: 1.5, h: 180, label: "1.8×10²⁰", color: "#6b7794"},
    {x: 3.0, h: 96, label: "9.6×10¹⁸", color: "#8894b3"},
    {x: 4.5, h: 23, label: "2.3×10¹⁹", color: C.green},
  ];

  // 截断坐标轴：BLEU 从 25.5 起算，放大 1 分多的差距；算力用 log10，越低越好
  const hBleu = (v: number) => Math.max(0.001, (0.7 + (v - 25.5) * 1.35) * grow);
  const hCost = (v: number) => Math.max(0.001, (Math.log10(v) - 1.05) * 2.4 * grow);

  return (
    <AbsoluteFill style={{background: C.bg, fontFamily: FONT}}>
      <Stage3D position={cam} fov={44}>
        <SceneLights accent={C.green} />
        <Starfield count={560} radius={50} opacity={0.45} />
        <CameraRig position={cam} lookAt={[camX * 0.3, 0.5, 0]} />

        {/* BLEU 组 */}
        {bleu.map((b, i) => {
          const h = hBleu(b.h);
          return (
            <group key={"b" + i}>
              <mesh position={[b.x, h / 2 - 2.4, 0]} scale={[1, h, 1]}>
                <boxGeometry args={[0.72, 1, 0.72]} />
                <meshStandardMaterial
                  color={b.color}
                  emissive={b.color}
                  emissiveIntensity={i === 2 ? 1.15 : 0.45}
                  roughness={0.26}
                  metalness={0.4}
                />
              </mesh>
              {i === 2 ? (
                <mesh position={[b.x, h - 2.4 + 0.5, 0]}>
                  <sphereGeometry args={[0.12, 14, 14]} />
                  <meshBasicMaterial color="#e8fff2" />
                </mesh>
              ) : null}
            </group>
          );
        })}

        {/* 算力组（对数感：高度取立方根后再缩放，避免突兀） */}
        {cost.map((c, i) => {
          const h = hCost(c.h);
          return (
            <mesh key={"c" + i} position={[c.x, h / 2 - 2.4, 0]} scale={[1, h, 1]}>
              <boxGeometry args={[0.62, 1, 0.62]} />
              <meshStandardMaterial
                color={c.color}
                emissive={c.color}
                emissiveIntensity={i === 2 ? 1.0 : 0.35}
                roughness={0.3}
                metalness={0.35}
                transparent
                opacity={0.95}
              />
            </mesh>
          );
        })}

        <mesh position={[-0.1, -2.42, 0]}>
          <boxGeometry args={[13.6, 0.05, 1.2]} />
          <meshBasicMaterial color="#16224a" transparent opacity={0.55} />
        </mesh>
        <gridHelper args={[30, 30, "#131e3f", "#091021"]} position={[0, -2.46, 0]} />
      </Stage3D>

      <ShotBullets
        kicker="EVIDENCE"
        title="28.4 BLEU，八分之一算力"
        accent={C.green}
        items={[
          {text: "英德：28.4，超过当时最好的集成系统 2 分以上", at: 80},
          {text: "英法：41.8，单模型超越全部已有单模型", at: 300},
          {text: "训练 3.5 天 / 8 卡 P100 —— 成本只是零头", at: 430},
        ]}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 206,
          display: "flex",
          justifyContent: "center",
          gap: 64,
          fontFamily: MONO,
          fontSize: 24,
          opacity: clamp01((p - 0.45) / 0.2),
        }}
      >
        <span style={{color: "#9fb2d8"}}>BLEU ↑　26.3 · 26.36 · <b style={{color: C.green}}>28.4</b></span>
        <span style={{color: "#9fb2d8"}}>算力 ↓　1.8e20 · 9.6e18 · <b style={{color: C.green}}>2.3e19</b></span>
      </div>
      <DepthBadge text="+2.0 BLEU　·　1/8 compute" accent={C.green} />
    </AbsoluteFill>
  );
};

/* ═════════════ 镜头 9 · 收尾 ═════════════ */

export const Shot9Outro: React.FC<{frames: number}> = ({frames}) => {
  const frame = useCurrentFrame();
  const p = frame / frames;

  const pull = easeInOut(clamp01(p / 0.55));
  const camZ = 11.2 + pull * 7.2;
  const cam: [number, number, number] = [0.4, 2.6 + pull * 1.8, camZ];

  const encX = -2.5;
  const decX = 2.5;
  const layers = Array.from({length: 6}).map((_, i) => i * 0.82 - 2.1);

  const titleOp = interpolate(frame, [frames * 0.55, frames * 0.55 + 40], [0, 1], clamp());
  const fadeOut = interpolate(frame, [frames - 26, frames - 1], [0, 1], clamp());

  return (
    <AbsoluteFill style={{background: C.bg, fontFamily: FONT}}>
      <div style={{position: "absolute", inset: 0, opacity: 1 - titleOp * 0.62}}>
      <Stage3D position={cam} fov={45}>
        <SceneLights accent={C.blue} />
        <Starfield count={620} radius={54} opacity={0.5} />
        <CameraRig position={cam} lookAt={[0, 0.2, 0]} />

        {/* 编码器 / 解码器 堆叠 */}
        {layers.map((y, i) => (
          <group key={i}>
            <mesh position={[encX, y, 0]}>
              <boxGeometry args={[1.9, 0.46, 1.9]} />
              <meshStandardMaterial
                color="#7fb8ff"
                emissive={C.blue}
                emissiveIntensity={0.5 + 0.3 * Math.sin(frame * 0.05 + i * 0.6)}
                roughness={0.22}
                metalness={0.55}
                transparent
                opacity={0.85}
              />
            </mesh>
            <mesh position={[decX, y, 0]}>
              <boxGeometry args={[1.9, 0.46, 1.9]} />
              <meshStandardMaterial
                color="#c9b6ff"
                emissive={C.purple}
                emissiveIntensity={0.45 + 0.3 * Math.sin(frame * 0.05 + i * 0.6 + 1)}
                roughness={0.22}
                metalness={0.55}
                transparent
                opacity={0.85}
              />
            </mesh>
            {/* 交叉注意力光束 */}
            <Arc
              from={[encX + 0.95, y, 0]}
              to={[decX - 0.95, y, 0]}
              lift={0.28}
              color={i % 2 ? C.cyan : C.blue}
              opacity={0.16 + 0.06 * Math.sin(frame * 0.08 + i)}
              radius={0.012}
              head={((frame * 0.01 + i * 0.2) % 1)}
            />
          </group>
        ))}

        {/* 底部输入 / 顶部输出 */}
        <GlowSphere position={[encX, -2.9, 0]} radius={0.25} color={C.cyan} intensity={1.2} />
        <GlowSphere position={[decX, 3.7, 0]} radius={0.25} color={C.amber} intensity={1.3} />
        <mesh position={[0, -3.6, 0]}>
          <boxGeometry args={[9.5, 0.04, 2.2]} />
          <meshBasicMaterial color="#16224a" transparent opacity={0.6} />
        </mesh>
      </Stage3D>
      </div>

      {/* 结构标注 */}
      <div
        style={{
          position: "absolute",
          left: "37%",
          top: 300,
          transform: "translateX(-50%)",
          fontFamily: MONO,
          fontSize: 24,
          color: C.blue,
          opacity: clamp01((p - 0.1) / 0.2) * 0.9,
          letterSpacing: 3,
        }}
      >
        ENCODER × 6
      </div>
      <div
        style={{
          position: "absolute",
          right: "37%",
          top: 300,
          transform: "translateX(50%)",
          fontFamily: MONO,
          fontSize: 24,
          color: C.purple,
          opacity: clamp01((p - 0.1) / 0.2) * 0.9,
          letterSpacing: 3,
        }}
      >
        DECODER × 6
      </div>

      {/* 收尾标题 */}
      <AbsoluteFill style={{alignItems: "center", justifyContent: "flex-end", paddingBottom: 236, opacity: titleOp}}>
        <div style={{fontSize: 70, fontWeight: 900, color: "#fff", letterSpacing: 0.5, textShadow: "0 0 70px rgba(78,168,255,.55)"}}>
          Attention Is All You Need
        </div>
        <div style={{fontSize: 28, color: C.muted, marginTop: 18, letterSpacing: 2}}>
          Transformer · NeurIPS 2017 · 八位作者的一次结构性胜利
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{background: "#000", opacity: fadeOut}} />
    </AbsoluteFill>
  );
};
