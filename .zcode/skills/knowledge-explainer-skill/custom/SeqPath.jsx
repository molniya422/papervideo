import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate, AbsoluteFill} from 'remotion';

const FONT = '"Hiragino Sans GB", -apple-system, "PingFang SC", sans-serif';
const clamp = () => ({extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

const WORDS = ['The', 'cat', 'sat', 'on', 'mat'];
const X0 = 170, GAP = 190, RY = 170, AY = 420;

/**
 * ## SeqPath
 * RNN 信号沿链走 O(n) 步 vs 自注意力任意两词 O(1) 直达。
 * props: title, rnnLabel, attnLabel
 */
export const SeqPath = ({title = '长依赖路径', rnnLabel = 'RNN · 信号走 O(n) 步', attnLabel = 'Self-Attention · O(1) 直达'}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  const xs = WORDS.map((_, i) => X0 + i * GAP);
  const cx = width / 2;

  const titleOp = interpolate(frame, [0, 20], [0, 1], clamp());
  const chainOp = (i) => interpolate(frame, [14 + i * 9, 34 + i * 9], [0, 1], clamp());
  const attnOp = (i) => interpolate(frame, [70 + i * 6, 88 + i * 6], [0, 1], clamp());
  const meshOp = interpolate(frame, [95, 125], [0, 1], clamp());
  const pulse = (f) => interpolate(frame, [f, f + 8, f + 16], [0, 1, 0], clamp());

  return (
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at top, #1a1a2e 0%, #0a0a0f 70%)', fontFamily: FONT, padding: '30px 0'}}>
      <h1 style={{fontSize: 44, fontWeight: 900, color: '#fff', textAlign: 'center', opacity: titleOp, margin: '6px 0 4px'}}>
        <span style={{color: '#74b9ff', marginRight: 14}}>▎</span>{title}
      </h1>
      <svg viewBox="0 0 1280 640" style={{width: '100%'}}>
        {/* RNN 链 */}
        <text x={cx} y={102} textAnchor="middle" fontSize={24} fill="#e17055" fontWeight={700} opacity={chainOp(0)}>{rnnLabel}</text>
        {WORDS.map((w, i) => (
          <g key={'r' + i} opacity={chainOp(i)}>
            <rect x={xs[i] - 62} y={RY - 34} width={124} height={68} rx={14} fill="#241017" stroke="#e17055" strokeWidth={2}/>
            <text x={xs[i]} y={RY + 6} textAnchor="middle" fontSize={24} fill="#fff" fontWeight={600}>{w}</text>
          </g>
        ))}
        {WORDS.slice(0, -1).map((_, i) => (
          <g key={'rl' + i} opacity={Math.min(chainOp(i), chainOp(i + 1))}>
            <line x1={xs[i] + 62} y1={RY} x2={xs[i + 1] - 62} y2={RY} stroke="#e17055" strokeWidth={3} strokeDasharray="10 8"
              strokeDashoffset={-frame * 2.2} opacity={0.9}/>
          </g>
        ))}
        {/* 首尾大弧：信号必须走完整条链 */}
        <path d={`M ${xs[0]} ${RY - 40} C ${xs[0]} ${RY - 130}, ${xs[4]} ${RY - 130}, ${xs[4]} ${RY - 40}`}
          fill="none" stroke="#e17055" strokeWidth={2.5} strokeDasharray="7 7"
          strokeDashoffset={-frame * 2} opacity={meshOp * 0.8}/>
        <text x={cx} y={RY - 145} textAnchor="middle" fontSize={21} fill="#ffb199" opacity={pulse(120) || meshOp}>
          首 → 尾：信号穿过全部 n 步，梯度随路径衰减
        </text>

        {/* Self-Attention 全连 */}
        <text x={cx} y={AY - 90} textAnchor="middle" fontSize={24} fill="#74b9ff" fontWeight={700} opacity={attnOp(0)}>{attnLabel}</text>
        {WORDS.map((w, i) => (
          <g key={'a' + i} opacity={attnOp(i)}>
            <rect x={xs[i] - 62} y={AY - 34} width={124} height={68} rx={14} fill="#0e1f33" stroke="#74b9ff" strokeWidth={2}/>
            <text x={xs[i]} y={AY + 6} textAnchor="middle" fontSize={24} fill="#fff" fontWeight={600}>{w}</text>
          </g>
        ))}
        {WORDS.map((_, i) => WORDS.map((__, j) => {
          if (j <= i) return null;
          const mx = (xs[i] + xs[j]) / 2;
          const lift = 40 + (j - i) * 12;
          return (
            <path key={'m' + i + '-' + j}
              d={`M ${xs[i]} ${AY + 36} Q ${mx} ${AY + 36 + lift}, ${xs[j]} ${AY + 36}`}
              fill="none" stroke="#74b9ff" strokeWidth={1.8} strokeDasharray="8 8"
              strokeDashoffset={-frame * 2.6} opacity={meshOp * 0.75}/>
          );
        }))}
        <text x={cx} y={AY + 158} textAnchor="middle" fontSize={23} fill="#a8d8ff" fontWeight={600} opacity={meshOp}>
          每一对位置：一次点积 → 路径长度 O(1)
        </text>
      </svg>
    </AbsoluteFill>
  );
};
