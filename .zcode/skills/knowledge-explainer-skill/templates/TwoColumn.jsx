import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill} from 'remotion';

const FONT = '"Hiragino Sans GB", -apple-system, "PingFang SC", sans-serif';
const clamp = () => ({extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

export const TwoColumn = ({
  title = '对比',
  left = [],
  right = [],
  callout = '',
  color1 = '#6c5ce7',
  color2 = '#00cec9',
  bg = '#0a0a0f',
  leftLabel = '输入',
  rightLabel = '输出',
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const titleOp = interpolate(frame, [0, 22], [0, 1], clamp());
  const titleY = spring({frame, fps, from: -16, to: 0, durationInFrames: 22});

  // 流动光效箭头
  const arrowOp = interpolate(frame, [40, 70], [0, 1], clamp());
  const dashOffset = (frame * 1.2) % 80;

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at top, #1a1a2e 0%, ${bg} 70%)`,
      padding: '36px 5%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', fontFamily: FONT,
    }}>
      <h1 style={{
        fontSize: 44, fontWeight: 900, color: '#fff',
        margin: '12px 0 24px',
        opacity: titleOp, transform: `translateY(${titleY}px)`,
        textAlign: 'center', letterSpacing: 1,
      }}>{title}</h1>

      <div style={{display: 'flex', gap: 24, alignItems: 'stretch',
        width: '100%', maxWidth: 1100, flex: '0 1 auto'}}>
        {/* 左列 */}
        <Column items={left} color={color1} label={leftLabel}
          delay={20} fps={fps} frame={frame} />

        {/* 大箭头 */}
        <div style={{display: 'flex', alignItems: 'center',
          justifyContent: 'center', flex: '0 0 80px', opacity: arrowOp}}>
          <svg viewBox="0 0 80 40" width="80" height="40" style={{overflow: 'visible'}}>
            <defs>
              <linearGradient id="arGrad" x1="0" y1="20" x2="80" y2="20">
                <stop offset="0" stopColor={color1} />
                <stop offset="1" stopColor={color2} />
              </linearGradient>
            </defs>
            <path d="M5 20 L65 20 L52 8 M65 20 L52 32"
              stroke="url(#arGrad)" strokeWidth="5"
              strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <line x1="5" y1="20" x2="65" y2="20"
              stroke="#fff" strokeWidth="2" strokeLinecap="round"
              strokeDasharray="10 80" strokeDashoffset={-dashOffset} opacity="0.85" />
          </svg>
        </div>

        {/* 右列 */}
        <Column items={right} color={color2} label={rightLabel}
          delay={50} fps={fps} frame={frame} />
      </div>

      {callout && (
        <Callout text={callout} color={color1} frame={frame} fps={fps} delay={120} />
      )}
    </AbsoluteFill>
  );
};

const Column = ({items, color, label, delay, fps, frame}) => (
  <div style={{flex: 1,
    background: `linear-gradient(135deg, ${color}1f, ${color}08)`,
    border: `2px solid ${color}66`, borderRadius: 14, padding: '18px 22px'}}>
    <div style={{fontSize: 14, color, fontWeight: 700, marginBottom: 12,
      letterSpacing: 1.5, textTransform: 'uppercase'}}>{label}</div>
    <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
      {items.map((item, i) => {
        const op = interpolate(frame, [delay + i * 8, delay + 18 + i * 8], [0, 1], clamp());
        const y = interpolate(frame, [delay + i * 8, delay + 18 + i * 8], [12, 0], clamp());
        return (
          <div key={i} style={{
            opacity: op, transform: `translateY(${y}px)`,
            fontSize: 22, color: '#fff', fontWeight: 500,
            padding: '10px 14px', background: 'rgba(255,255,255,0.04)',
            borderRadius: 8, borderLeft: `3px solid ${color}`,
          }}>{item}</div>
        );
      })}
    </div>
  </div>
);

const Callout = ({text, color, frame, fps, delay}) => {
  const op = interpolate(frame, [delay, delay + 24], [0, 1], clamp());
  const y = spring({frame: Math.max(0, frame - delay), fps,
    from: 18, to: 0, durationInFrames: 22});
  return (
    <div style={{
      opacity: op, transform: `translateY(${y}px)`, marginTop: 22,
      padding: '14px 24px', borderRadius: 12,
      background: `linear-gradient(135deg, ${color}33, ${color}11)`,
      border: `1.5px solid ${color}88`,
      fontSize: 22, color: '#fff', fontWeight: 600,
      maxWidth: '88%', textAlign: 'center',
    }}>💡 {text}</div>
  );
};
