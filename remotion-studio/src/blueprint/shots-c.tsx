import React from "react";
import {AbsoluteFill, useCurrentFrame} from "remotion";
import {C, FONT, MONO, clamp01, easeInOut, Stage} from "./layout";
import {Dust, FlowDots, Leader, Lights, Rig, SheetFrame, Ticks, WireBar, WireBox, WireLine, WireStack} from "./kit";
import type {Shot} from "./timeline.generated";

/* 加法结点 */
const Junction: React.FC<{position: [number, number, number]; color?: string; size?: number}> = ({position, color = C.accent, size = 0.13}) => (
  <group position={position}>
    <mesh>
      <sphereGeometry args={[size, 12, 12]} />
      <meshBasicMaterial color={color} transparent opacity={0.9} />
    </mesh>
    <mesh>
      <sphereGeometry args={[size * 1.9, 12, 12]} />
      <meshBasicMaterial color={color} transparent opacity={0.12} depthWrite={false} />
    </mesh>
  </group>
);

/* ═════════ c09 · 残差与层归一化 ═════════ */
export const C09: React.FC<{shot: Shot}> = ({shot}) => {
  const frame = useCurrentFrame();
  const p = frame / shot.frames;
  const build = clamp01((p - 0.05) / 0.45);
  const bypass = clamp01((p - 0.45) / 0.3);
  const ghost = clamp01((p - 0.7) / 0.25);

  const camA = 0.16 + p * 0.08;
  const cam: [number, number, number] = [Math.sin(camA) * 16.5, 2.0, Math.cos(camA) * 16.5];

  const yIn = -2.6;
  const yAtt = -0.9;
  const yAdd1 = 0.1;
  const yNorm1 = 0.9;
  const yFFN = 1.85;
  const yAdd2 = 2.75;
  const yNorm2 = 3.45;

  return (
    <>
      <Stage position={cam} fov={40}>
        <Lights />
        <Dust count={90} />
        <Rig position={cam} lookAt={[0, 0.4, 0]} />

        {/* 单层剖面 */}
        <group opacity={build} scale={[0.88, 0.86, 0.88]}>
          <WireBox position={[0, yIn, 0]} size={[2.2, 0.4, 1.4]} color={C.line} opacity={0.85} />
          <WireBox position={[0, yAtt, 0]} size={[2.4, 1.0, 1.5]} color={C.mint} opacity={0.95} fill={0.05} />
          <WireBox position={[0, yNorm1, 0]} size={[1.5, 0.16, 1.2]} color={C.line} opacity={0.8} />
          <WireBox position={[0, yFFN, 0]} size={[2.4, 1.0, 1.5]} color={C.line} opacity={0.9} fill={0.03} />
          <WireBox position={[0, yNorm2, 0]} size={[1.5, 0.16, 1.2]} color={C.line} opacity={0.8} />
          <WireBox position={[0, 4.05, 0]} size={[2.2, 0.32, 1.4]} color={C.line} opacity={0.7} />

          {/* 主干 */}
          <WireLine from={[0, yIn + 0.2, 0]} to={[0, yAtt - 0.5, 0]} color={C.lineDim} opacity={0.8} thickness={0.02} />
          <WireLine from={[0, yAtt + 0.5, 0]} to={[0, yAdd1, 0]} color={C.lineDim} opacity={0.8} thickness={0.02} />
          <WireLine from={[0, yNorm1, 0]} to={[0, yFFN - 0.5, 0]} color={C.lineDim} opacity={0.8} thickness={0.02} />
          <WireLine from={[0, yFFN + 0.5, 0]} to={[0, yAdd2, 0]} color={C.lineDim} opacity={0.8} thickness={0.02} />
          <WireLine from={[0, yNorm2, 0]} to={[0, 4.05, 0]} color={C.lineDim} opacity={0.8} thickness={0.02} />

          <Junction position={[0, yAdd1, 0]} />
          <Junction position={[0, yAdd2, 0]} />

          {/* 残差旁路 */}
          <WireLine from={[-1.15, yIn, 0]} to={[-1.85, yIn, 0]} color={C.accent} opacity={0.8 * bypass} thickness={0.016} />
          <WireLine from={[-1.85, yIn, 0]} to={[-1.85, yAdd1, 0]} color={C.accent} opacity={0.8 * bypass} thickness={0.016} />
          <WireLine from={[-1.85, yAdd1, 0]} to={[-0.15, yAdd1, 0]} color={C.accent} opacity={0.8 * bypass} thickness={0.016} />

          <WireLine from={[-1.15, yNorm1, 0]} to={[-2.2, yNorm1, 0]} color={C.accent} opacity={0.7 * bypass} thickness={0.014} />
          <WireLine from={[-2.2, yNorm1, 0]} to={[-2.2, yAdd2, 0]} color={C.accent} opacity={0.7 * bypass} thickness={0.014} />
          <WireLine from={[-2.2, yAdd2, 0]} to={[-0.15, yAdd2, 0]} color={C.accent} opacity={0.7 * bypass} thickness={0.014} />

          <FlowDots from={[0, yIn, 0.5]} to={[0, 4.0, 0.5]} count={8} progress={bypass} color={C.mint} size={0.035} />
        </group>

        <Leader from={[1.25, yNorm1, 0]} to={[2.2, yNorm1, 0]} opacity={0.6} />
        <Leader from={[1.3, yAdd1, 0]} to={[2.2, yAdd1, 0]} opacity={0.5} />
      </Stage>

      <div style={{position: "absolute", left: 420, top: 62, width: 1500, textAlign: "center", fontFamily: MONO, fontSize: 14, color: C.lineDim, letterSpacing: 2, opacity: build}}>
        ONE LAYER · STACKED × 6
      </div>
      <div style={{position: "absolute", left: 420, top: 806, width: 1500, display: "flex", justifyContent: "center", gap: 280, fontFamily: MONO, fontSize: 16, letterSpacing: 1.2}}>
        <span style={{color: C.accent, opacity: bypass}}>残差：x + Sublayer(x)</span>
        <span style={{color: C.mint, opacity: build}}>LayerNorm：稳定数值</span>
      </div>
    </>
  );
};

/* ═════════ c10 · 装配 ═════════ */
export const C10: React.FC<{shot: Shot}> = ({shot}) => {
  const frame = useCurrentFrame();
  const p = frame / shot.frames;
  const build = clamp01((p - 0.04) / 0.35);
  const cross = clamp01((p - 0.42) / 0.28);
  const mask = clamp01((p - 0.66) / 0.2);
  const camA = -0.18 + p * 0.14;
  const cam: [number, number, number] = [Math.sin(camA) * 15.5, 2.6, Math.cos(camA) * 15.5];

  const encX = -2.4;
  const decX = 2.4;

  return (
    <>
      <Stage position={cam} fov={40}>
        <Lights />
        <Dust count={110} />
        <Rig position={cam} lookAt={[0, 0.2, 0]} />

        <WireStack count={6} position={[encX, 0.2, 0]} size={[2.0, 0.3, 1.7]} gapY={0.66} color={C.line} opacity={0.85} scaleY={build}
          glow={(i, f) => 0.3 + 0.25 * Math.sin(f * 0.04 + i * 0.7)} />
        <WireStack count={6} position={[decX, 0.2, 0]} size={[2.0, 0.3, 1.7]} gapY={0.66} color={C.line} opacity={0.85} scaleY={build}
          glow={(i, f) => 0.3 + 0.25 * Math.sin(f * 0.04 + i * 0.7 + 1.4)} />

        {/* 输入 / 输出 */}
        <WireLine from={[encX, -2.5, 0]} to={[encX, -1.55, 0]} color={C.mint} opacity={0.8} thickness={0.016} />
        <WireLine from={[decX, -2.5, 0]} to={[decX, -1.55, 0]} color={C.amber} opacity={0.8} thickness={0.016} />
        <WireLine from={[decX, 1.95, 0]} to={[decX, 2.85, 0]} color={C.amber} opacity={0.8} thickness={0.016} />

        {/* 交叉注意力：编码器 → 解码器 */}
        {Array.from({length: 6}).map((_, i) => (
          <WireLine key={i} from={[encX + 1.0, (i - 2.5) * 0.66 + 0.2, 0]} to={[decX - 1.0, (i - 2.5) * 0.66 + 0.2, 0]}
            color={C.mint} opacity={0.12 + cross * 0.36} thickness={0.008} progress={cross} />
        ))}

        {/* 解码器掩码三角 */}
        <group position={[decX + 2.15, -1.15, 0]} scale={[0.8, 0.8, 0.8]} opacity={mask * 0.85}>
          {Array.from({length: 5}).map((_, j) =>
            Array.from({length: 5}).map((_, i) => {
              const allowed = i <= j;
              return (
                <mesh key={`${i}-${j}`} position={[(i - 2) * 0.2, (2 - j) * 0.2, 0]}>
                  <boxGeometry args={[0.16, 0.16, 0.01]} />
                  <meshBasicMaterial color={allowed ? C.mint : C.lineFaint} transparent opacity={allowed ? 0.32 : 0.07} />
                </mesh>
              );
            })
          )}
          <WireLine from={[-0.62, 0.62, 0]} to={[0.62, -0.62, 0]} color={C.amber} opacity={0.7} thickness={0.01} />
        </group>
      </Stage>

      <div style={{position: "absolute", left: 420, top: 28, width: 1500, display: "flex", justifyContent: "center", gap: 280, fontFamily: MONO, fontSize: 18, color: C.lineDim, letterSpacing: 3, opacity: build}}>
        <span>ENCODER × 6</span>
        <span>DECODER × 6</span>
      </div>
      <div style={{position: "absolute", left: 420, top: 806, width: 1500, display: "flex", justifyContent: "center", gap: 220, fontFamily: MONO, fontSize: 15, letterSpacing: 1.2}}>
        <span style={{color: C.mint, opacity: cross}}>交叉注意力：Q←解码器 · K/V←编码器</span>
        <span style={{color: C.amber, opacity: mask}}>掩码：只能看前 i−1 个词</span>
      </div>
    </>
  );
};

/* ═════════ c11 · 证据 ═════════ */
export const C11: React.FC<{shot: Shot}> = ({shot}) => {
  const frame = useCurrentFrame();
  const p = frame / shot.frames;
  const grow = clamp01((p - 0.04) / 0.3);
  const note = clamp01((p - 0.55) / 0.22);
  const camX = -1.0 + easeInOut(p) * 1.8;
  const cam: [number, number, number] = [camX, 2.0, 14.6];

  const bleu = [
    {x: -4.4, v: 26.3},
    {x: -3.2, v: 26.36},
    {x: -2.0, v: 28.4, hi: true},
  ];
  const cost = [
    {x: 1.4, v: 180},
    {x: 2.6, v: 96},
    {x: 3.8, v: 23, hi: true},
  ];
  const hB = (v: number) => Math.max(0.001, (0.55 + (v - 25.5) * 1.45) * grow);
  const hC = (v: number) => Math.max(0.001, (Math.log10(v) - 1.0) * 2.5 * grow);

  return (
    <>
      <Stage position={cam} fov={40}>
        <Lights />
        <Dust count={90} />
        <Rig position={cam} lookAt={[0, 0.2, 0]} />

        {bleu.map((b, i) => (
          <WireBar key={"b" + i} position={[b.x, -2.3, 0]} height={hB(b.v)} width={0.62} depth={0.62}
            color={b.hi ? C.accent : C.line} opacity={0.95} fill={b.hi ? 0.08 : 0.04} />
        ))}
        {cost.map((c, i) => (
          <WireBar key={"c" + i} position={[c.x, -2.3, 0]} height={hC(c.v)} width={0.55} depth={0.55}
            color={c.hi ? C.accent : C.lineDim} opacity={0.95} fill={c.hi ? 0.08 : 0.03} />
        ))}

        {/* 基线 + 刻度 */}
        <WireLine from={[-5.2, -2.34, 0]} to={[4.6, -2.34, 0]} color={C.line} opacity={0.7} thickness={0.012} />
        {[1, 2, 3, 4].map((k) => (
          <WireLine key={k} from={[-5.3, -2.3 + k * 0.72, 0]} to={[-5.15, -2.3 + k * 0.72, 0]} color={C.lineFaint} opacity={0.6} thickness={0.01} />
        ))}
        {[-5.3, -1.2, 0.6, 4.6].map((x, i) => (
          <WireLine key={"v" + i} from={[x, -2.34, 0]} to={[x, -2.52, 0]} color={C.lineFaint} opacity={0.5} thickness={0.008} />
        ))}

        <Leader from={[-2.0, hB(28.4) - 2.3 + 0.15, 0]} to={[-2.0, hB(28.4) - 2.3 + 0.75, 0]} opacity={0.7} />
        <Leader from={[3.8, hC(23) - 2.3 + 0.15, 0]} to={[3.8, hC(23) - 2.3 + 0.75, 0]} opacity={0.7} />
      </Stage>

      <div style={{position: "absolute", left: 420, top: 26, width: 1500, display: "flex", justifyContent: "center", gap: 300, fontFamily: MONO, fontSize: 16, color: C.lineDim, letterSpacing: 1.5, opacity: grow}}>
        <span>BLEU ↑　26.3 · 26.36 · <b style={{color: C.accent}}>28.4</b></span>
        <span>训练算力 ↓　1.8e20 · 9.6e18 · <b style={{color: C.accent}}>2.3e19</b></span>
      </div>
      <div style={{position: "absolute", left: 420, top: 800, width: 1500, textAlign: "center", fontFamily: MONO, fontSize: 17, color: C.accent, letterSpacing: 1.5, opacity: note}}>
        +2.0 BLEU　·　1/8 训练算力　·　8×P100 · 3.5 天
      </div>
    </>
  );
};

/* ═════════ c12 · 收尾 ═════════ */
export const C12: React.FC<{shot: Shot}> = ({shot}) => {
  const frame = useCurrentFrame();
  const p = frame / shot.frames;
  const fold = clamp01(p / 0.55);
  const title = clamp01((p - 0.35) / 0.3);
  const fade = clamp01((p - 0.88) / 0.12);
  const camZ = 13.5 + easeInOut(p) * 5;

  return (
    <AbsoluteFill style={{background: C.bg, fontFamily: FONT}}>
      <div style={{position: "absolute", inset: 0, opacity: 1 - title * 0.62}}>
      <Stage full position={[0, 1.0, camZ]} fov={40}>
        <Lights />
        <Dust count={130} />
        <Rig position={[0, 1.0, camZ]} lookAt={[0, 0, 0]} />

        {/* 图纸折叠：三张纸依次转开 */}
        {[0, 1, 2].map((i) => (
          <SheetFrame
            key={i}
            w={12}
            h={7}
            position={[(i - 1) * 0.3, 0, -i * 0.8]}
            rotation={[-0.2 + i * 0.05, 0.12 + fold * (i - 1) * 0.9, 0]}
            opacity={(0.55 - i * 0.12) * (1 - fold * 0.55)}
            progress={1}
          />
        ))}

        <WireStack count={6} position={[0, -0.3, -1.4]} size={[3.0, 0.28, 2.0]} gapY={0.7} color={C.lineDim} opacity={0.5 * (1 - fold * 0.4)} />
      </Stage>
      </div>

      <div style={{position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: title}}>
        <div style={{textAlign: "center", padding: "42px 58px", border: `1px solid ${C.lineDim}`, background: "#061527", boxShadow: "0 30px 90px rgba(0,0,0,.75)"}}>
          <div style={{fontFamily: MONO, fontSize: 13, letterSpacing: 6, color: C.accent}}>SHEET 12 / 12 · END OF DRAWING</div>
          <div style={{fontSize: 76, fontWeight: 900, color: "#fff", marginTop: 18, letterSpacing: -0.5}}>Attention Is All You Need</div>
          <div style={{fontFamily: MONO, fontSize: 16, color: C.muted, marginTop: 16, letterSpacing: 2}}>Transformer · NeurIPS 2017 · Vaswani et al.</div>
        </div>
      </div>

      <AbsoluteFill style={{background: "#000", opacity: fade}} />
    </AbsoluteFill>
  );
};
