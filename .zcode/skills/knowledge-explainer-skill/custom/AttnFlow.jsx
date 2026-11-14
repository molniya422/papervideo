import React from 'react';
import {useCurrentFrame, interpolate, AbsoluteFill} from 'remotion';

const FONT = '"Hiragino Sans GB", -apple-system, "PingFang SC", sans-serif';
const clamp = () => ({extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

const STAGES = [
  {label: 'Q · Kᵀ', sub: '点积打分', color: '#74b9ff'},
  {label: '÷ √64', sub: '方差 64 → 1', color: '#e17055'},
  {label: 'softmax', sub: '归一成权重', color: '#a29bfe'},
  {label: '× V', sub: '加权求和', color: '#55efc4'},
];

/**
 * ## AttnFlow
 * softmax(QKᵀ/√d_k)V 四步流水线 + 为什么除以 √d_k 的手算解释。
 * props: title, formula, footnote
 */
export const AttnFlow = ({title = '缩放点积注意力', formula = 'Attention(Q, K, V) = softmax( QKᵀ / √dₖ ) V',
  footnote = '论文脚注 4：q、k 各分量独立、均值 0 方差 1 ⇒ q·k 方差 = dₖ = 64，σ = 8'}) => {
  const frame = useCurrentFrame();
  const W = 1280, stageX = [300, 530, 760, 990], Y = 250;

  const titleOp = interpolate(frame, [0, 20], [0, 1], clamp());
  const fOp = interpolate(frame, [8, 28], [0, 1], clamp());
  const stageOp = (i) => interpolate(frame, [26 + i * 22, 48 + i * 22], [0, 1], clamp());
  const calcOp = interpolate(frame, [26 + 4 * 22 + 20, 26 + 4 * 22 + 44], [0, 1], clamp());
  const badOp = interpolate(frame, [170, 195], [0, 1], clamp());

  return (
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at top, #1a1a2e 0%, #0a0a0f 70%)', fontFamily: FONT, padding: '30px 0'}}>
      <h1 style={{fontSize: 44, fontWeight: 900, color: '#fff', textAlign: 'center', opacity: titleOp, margin: '6px 0 0'}}>
        <span style={{color: '#74b9ff', marginRight: 14}}>▎</span>{title}
      </h1>
      <div style={{textAlign: 'center', marginTop: 10, opacity: fOp}}>
        <span style={{
          fontFamily: 'Georgia, "Cambria Math", serif', fontSize: 34, color: '#ffeaa7',
          background: '#131024', border: '1.5px solid #4a3f7a', borderRadius: 14, padding: '14px 30px', display: 'inline-block',
        }}>{formula}</span>
      </div>
      <svg viewBox={`0 0 ${W} 560`} style={{width: '100%'}}>
        {STAGES.map((s, i) => (
          <g key={i} opacity={stageOp(i)}>
            <rect x={stageX[i] - 92} y={Y - 52} width={184} height={104} rx={16}
              fill="#101833" stroke={s.color} strokeWidth={2}/>
            <text x={stageX[i]} y={Y - 6} textAnchor="middle" fontSize={28} fill={s.color} fontWeight={700}>{s.label}</text>
            <text x={stageX[i]} y={Y + 30} textAnchor="middle" fontSize={18} fill="#a1a1aa">{s.sub}</text>
          </g>
        ))}
        {STAGES.slice(1).map((s, i) => (
          <line key={'l' + i} x1={stageX[i] + 92} y1={Y} x2={stageX[i + 1] - 92} y2={Y}
            stroke={s.color} strokeWidth={3} strokeDasharray="10 8" strokeDashoffset={-frame * 2.4}
            opacity={Math.min(stageOp(i), stageOp(i + 1))}/>
        ))}
        <line x1={stageX[3] + 92} y1={Y} x2={W - 30} y2={Y} stroke="#55efc4" strokeWidth={3}
          strokeDasharray="10 8" strokeDashoffset={-frame * 2.4} opacity={stageOp(3)}/>
        <text x={W - 24} y={Y - 24} textAnchor="end" fontSize={22} fill="#55efc4" fontWeight={700} opacity={stageOp(3)}>输出</text>

        {/* 手算面板 */}
        <g opacity={calcOp}>
          <rect x={180} y={360} width={920} height={86} rx={14} fill="#131024" stroke="#4a3f7a" strokeWidth={1.5}/>
          <text x={W / 2} y={398} textAnchor="middle" fontSize={24} fill="#fff">{footnote}</text>
          <text x={W / 2} y={430} textAnchor="middle" fontSize={21} fill="#a1a1aa">不缩放：logits ±8 ⇒ softmax 输出 ≈ one-hot ⇒ 梯度 ≈ 0</text>
        </g>
        <text x={W / 2} y={502} textAnchor="middle" fontSize={24} fill="#e17055" fontWeight={700} opacity={badOp}>
          所以必须除以 √dₖ = 8 —— 把方差拉回 1，训练才能收敛
        </text>
      </svg>
    </AbsoluteFill>
  );
};
