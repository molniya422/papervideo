import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill} from 'remotion';

const FONT = '"Hiragino Sans GB", -apple-system, "PingFang SC", sans-serif';
const clamp = () => ({extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

export const Outro = ({
  title = '收束',
  cta = '点关注',
  bg = '#0a0a0f',
  color1 = '#6c5ce7',
  color2 = '#00cec9',
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const titleOp = interpolate(frame, [0, 24], [0, 1], clamp());
  const titleScale = spring({frame, fps, from: 0.92, to: 1, durationInFrames: 24});
  const ctaOp = interpolate(frame, [24, 50], [0, 1], clamp());
  const ctaY = spring({frame: Math.max(0, frame - 24), fps,
    from: 16, to: 0, durationInFrames: 24});
  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at center, #1a1a2e, ${bg})`,
      justifyContent: 'center', alignItems: 'center', fontFamily: FONT,
    }}>
      <h1 style={{
        fontSize: 76, fontWeight: 900,
        background: `linear-gradient(135deg, ${color1}, ${color2})`,
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        opacity: titleOp, transform: `scale(${titleScale})`,
        margin: 0, textAlign: 'center', letterSpacing: 2,
      }}>{title}</h1>
      <p style={{
        fontSize: 28, color: '#e8e8f0', marginTop: 32,
        opacity: ctaOp, transform: `translateY(${ctaY}px)`,
        fontWeight: 600, textAlign: 'center',
      }}>👉 {cta}</p>
    </AbsoluteFill>
  );
};
