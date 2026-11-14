import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill} from 'remotion';

const FONT = '"Hiragino Sans GB", -apple-system, "PingFang SC", sans-serif';
const clamp = () => ({extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

export const ContentCard = ({
  title = '标题',
  items = [],
  color = '#6c5ce7',
  bg = '#0a0a0f',
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const titleOp = interpolate(frame, [0, 22], [0, 1], clamp());
  const titleY = spring({frame, fps, from: -16, to: 0, durationInFrames: 22});

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at top, #1a1a2e 0%, ${bg} 70%)`,
      padding: '40px 6%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', fontFamily: FONT,
    }}>
      <h1 style={{
        fontSize: 48, fontWeight: 900, color: '#fff',
        margin: '20px 0 28px',
        opacity: titleOp, transform: `translateY(${titleY}px)`,
        textAlign: 'center', letterSpacing: 1,
      }}>
        <span style={{color, marginRight: 14}}>▎</span>
        {title}
      </h1>

      <div style={{
        width: '100%', maxWidth: 900,
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        {items.map((item, i) => {
          const op = interpolate(frame, [22 + i * 12, 42 + i * 12], [0, 1], clamp());
          const x = spring({frame: Math.max(0, frame - 22 - i * 12), fps,
            from: -30, to: 0, durationInFrames: 22});
          return (
            <div key={i} style={{
              opacity: op, transform: `translateX(${x}px)`,
              padding: '18px 26px',
              background: `linear-gradient(135deg, ${color}22, ${color}08)`,
              border: `2px solid ${color}66`,
              borderRadius: 14,
              fontSize: 28, fontWeight: 600, color: '#fff',
              boxShadow: `0 6px 24px ${color}33`,
            }}>{item}</div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
