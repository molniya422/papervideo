import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill} from 'remotion';

const FONT = '"Hiragino Sans GB", -apple-system, "PingFang SC", sans-serif';
const clamp = () => ({extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

export const Title = ({
  title = '标题',
  subtitle = '副标题',
  bg = '#0a0a0f',
  color1 = '#6c5ce7',
  color2 = '#00cec9',
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const titleY = spring({frame, fps, from: 50, to: 0, durationInFrames: 30});
  const titleOp = interpolate(frame, [0, 20], [0, 1], clamp());
  const subOp = interpolate(frame, [15, 35], [0, 1], clamp());
  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at center, #1a1a2e, ${bg})`,
      justifyContent: 'center', alignItems: 'center', fontFamily: FONT,
    }}>
      <div style={{textAlign: 'center'}}>
        <h1 style={{
          fontSize: 88, fontWeight: 900,
          background: `linear-gradient(135deg, ${color1}, ${color2})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          opacity: titleOp, transform: `translateY(${titleY}px)`,
          margin: 0, letterSpacing: 1,
        }}>{title}</h1>
        <p style={{
          fontSize: 34, color: '#8888a0', marginTop: 20,
          opacity: subOp, fontWeight: 300,
        }}>{subtitle}</p>
      </div>
    </AbsoluteFill>
  );
};
