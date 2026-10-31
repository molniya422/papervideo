import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill} from 'remotion';

const FONT = '"Hiragino Sans GB", -apple-system, "PingFang SC", sans-serif';
const BG = '#0a0a0f';
const CARD_BG = '#16161e';
const TEXT_DIM = '#8888a0';
const clamp = () => ({extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

// 通用对比可视化模板:支持 viz=bars(波形条)和 viz=duration(时间轴削减)
// 灵感:上期视频的 WaveformCompare + TimelineCompare
export const BeforeAfter = ({
  title = '',
  subtitle = '',
  before,                  // number 或 string
  after,
  unit = '',
  beforeLabel = '调整前',
  afterLabel = '调整后',
  viz = 'bars',            // 'bars' | 'duration'
  max,                     // bars: 缩放参考最大值,默认 max(before, after) * 1.2
  color1 = '#636e72',
  color2 = '#00cec9',
  color2Glow = '#6c5ce7',
  callout = '',
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const titleOp = interpolate(frame, [0, 22], [0, 1], clamp());
  const titleY = spring({frame, fps, from: -16, to: 0, durationInFrames: 22});

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at top, #1a1a2e 0%, ${BG} 70%)`,
      padding: '36px 6%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: FONT,
    }}>
      {title && (
        <h1 style={{
          fontSize: 44, fontWeight: 900, color: '#fff',
          margin: '0 0 8px',
          opacity: titleOp,
          transform: `translateY(${titleY}px)`,
          textAlign: 'center',
          letterSpacing: 1,
        }}>{title}</h1>
      )}
      {subtitle && (
        <div style={{
          fontSize: 20, color: TEXT_DIM,
          marginBottom: 32,
          opacity: titleOp,
        }}>{subtitle}</div>
      )}

      {viz === 'bars' && (
        <BarsViz before={before} after={after} unit={unit} max={max}
          beforeLabel={beforeLabel} afterLabel={afterLabel}
          color1={color1} color2={color2} color2Glow={color2Glow}
          frame={frame} fps={fps} />
      )}
      {viz === 'duration' && (
        <DurationViz before={before} after={after} unit={unit}
          beforeLabel={beforeLabel} afterLabel={afterLabel}
          color1={color1} color2={color2} color2Glow={color2Glow}
          frame={frame} fps={fps} />
      )}

      {callout && (
        <Callout text={callout} color={color2} frame={frame} fps={fps} delay={90} />
      )}
    </AbsoluteFill>
  );
};

// ===== Bars 可视化:两组波形条柱对比(数值越高条越长)=====
const BarsViz = ({before, after, unit, max, beforeLabel, afterLabel,
                  color1, color2, color2Glow, frame, fps}) => {
  const beforeOp = interpolate(frame, [25, 45], [0, 1], clamp());
  const afterOp = interpolate(frame, [60, 90], [0, 1], clamp());
  const N = 28;
  const refMax = max || Math.max(Number(before), Number(after)) * 1.25;
  const beforeRatio = Number(before) / refMax;
  const afterRatio = Number(after) / refMax;
  // 静态种子(基于 sin),避免每帧抖动
  const beforeBars = Array.from({length: N}, (_, i) =>
    8 + Math.abs(Math.sin(i * 0.55)) * (40 * beforeRatio));
  const afterBars = Array.from({length: N}, (_, i) =>
    8 + Math.abs(Math.sin(i * 0.55)) * (40 * afterRatio));

  return (
    <div style={{display: 'flex', gap: 24, width: '100%', maxWidth: 980}}>
      <BarsCard label={beforeLabel} value={before} unit={unit}
        bars={beforeBars} color={color1} glow={null}
        op={beforeOp} flat />
      <BarsCard label={afterLabel} value={after} unit={unit}
        bars={afterBars} color={color2} glow={color2Glow}
        op={afterOp} />
    </div>
  );
};

const BarsCard = ({label, value, unit, bars, color, glow, op, flat}) => (
  <div style={{
    flex: 1,
    background: CARD_BG,
    borderRadius: 16,
    padding: '28px 32px 24px',
    border: `1.5px solid ${color}55`,
    position: 'relative',
    boxShadow: glow ? `0 0 32px ${glow}33` : 'none',
    opacity: op,
  }}>
    <div style={{
      position: 'absolute', top: -12, left: 24,
      fontSize: 16, fontWeight: 700,
      padding: '4px 12px', borderRadius: 6,
      background: color, color: '#fff', letterSpacing: 1,
    }}>{label}</div>
    <div style={{
      fontSize: 64, fontWeight: 900, color: '#fff',
      lineHeight: 1, marginTop: 8,
    }}>
      {value}
      {unit && <span style={{fontSize: 32, color: TEXT_DIM, marginLeft: 6}}>{unit}</span>}
    </div>
    <div style={{display: 'flex', gap: 3, height: 60,
      alignItems: 'flex-end', marginTop: 18}}>
      {bars.map((h, i) => (
        <div key={i} style={{
          flex: 1,
          background: flat ? color
            : `linear-gradient(to top, ${color}, ${glow || color})`,
          borderRadius: 3,
          height: h,
        }} />
      ))}
    </div>
  </div>
);

// ===== Duration 可视化:横条对比 + 削掉的碎片飞出 =====
const DurationViz = ({before, after, unit, beforeLabel, afterLabel,
                      color1, color2, color2Glow, frame, fps}) => {
  const titleDelay = 25;
  const fullW = 720;
  const ratio = Number(after) / Number(before);
  const targetW = Math.round(fullW * ratio);

  const beforeOp = interpolate(frame, [titleDelay, titleDelay + 18], [0, 1], clamp());
  const afterOp = interpolate(frame, [titleDelay + 25, titleDelay + 45], [0, 1], clamp());
  const cutFrame = Math.max(0, frame - titleDelay - 50);
  const cutProgress = interpolate(cutFrame, [0, 25], [0, 1], clamp());
  const flyT = interpolate(cutFrame, [10, 45], [0, 1], clamp());
  const flyOpacity = interpolate(cutFrame, [10, 28, 45], [1, 1, 0], clamp());

  const currentAfterW = interpolate(cutProgress, [0, 1], [fullW, targetW], clamp());
  const cutW = fullW - targetW;
  const cutSeconds = Number(before) - Number(after);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 28,
      alignItems: 'flex-start',
      maxWidth: 980,
      width: '100%',
    }}>
      {/* 调整前 */}
      <div style={{display: 'flex', alignItems: 'center', gap: 16,
        opacity: beforeOp}}>
        <span style={{fontSize: 14, fontWeight: 700,
          padding: '6px 14px', borderRadius: 6,
          background: color1, color: '#fff',
          minWidth: 80, textAlign: 'center'}}>{beforeLabel}</span>
        <div style={{width: fullW, height: 36, background: '#4a4a5a',
          borderRadius: 6, position: 'relative',
          display: 'flex', alignItems: 'center'}}>
          <span style={{position: 'absolute', right: 14, color: '#fff',
            fontSize: 18, fontFamily: 'monospace', fontWeight: 700}}>
            {before}{unit}
          </span>
        </div>
      </div>

      {/* 调整后 */}
      <div style={{display: 'flex', alignItems: 'center', gap: 16,
        position: 'relative', opacity: afterOp}}>
        <span style={{fontSize: 14, fontWeight: 700,
          padding: '6px 14px', borderRadius: 6,
          background: color2, color: '#fff',
          minWidth: 80, textAlign: 'center'}}>{afterLabel}</span>
        <div style={{width: currentAfterW, height: 36,
          background: `linear-gradient(to right, ${color2Glow}, ${color2})`,
          borderRadius: 6, position: 'relative',
          display: 'flex', alignItems: 'center',
          boxShadow: `0 0 16px ${color2}55`}}>
          <span style={{position: 'absolute', right: 14, color: '#fff',
            fontSize: 18, fontFamily: 'monospace', fontWeight: 800}}>
            {after}{unit}
          </span>
        </div>
        {/* 削掉的碎片飞出 */}
        {cutFrame > 5 && (
          <div style={{
            position: 'absolute',
            left: 80 + 16 + targetW + 8 + flyT * 80,
            top: flyT * 36,
            width: cutW * (1 - flyT * 0.4),
            height: 36,
            background: '#4a4a5a',
            borderRadius: 6,
            opacity: flyOpacity,
            transform: `rotate(${flyT * 30}deg)`,
            transformOrigin: 'left center',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            paddingRight: 8,
          }}>
            <span style={{color: '#fff', fontSize: 14,
              fontFamily: 'monospace', opacity: 0.7}}>
              {cutSeconds}{unit}
            </span>
          </div>
        )}
        {cutFrame > 30 && (
          <span style={{
            position: 'absolute',
            left: 80 + 16 + targetW + 100,
            top: 50,
            fontSize: 18,
            color: '#fd79a8',
            fontWeight: 700,
            fontFamily: FONT,
            opacity: interpolate(cutFrame, [30, 45], [0, 1], clamp()),
            whiteSpace: 'nowrap',
          }}>✂️ 削掉 {cutSeconds}{unit}</span>
        )}
      </div>
    </div>
  );
};

const Callout = ({text, color, frame, fps, delay}) => {
  const op = interpolate(frame, [delay, delay + 24], [0, 1], clamp());
  const y = spring({frame: Math.max(0, frame - delay), fps,
    from: 18, to: 0, durationInFrames: 22});
  return (
    <div style={{
      opacity: op, transform: `translateY(${y}px)`,
      marginTop: 36,
      padding: '14px 28px', borderRadius: 12,
      background: `linear-gradient(135deg, ${color}33, ${color}11)`,
      border: `1.5px solid ${color}88`,
      fontSize: 22, color: '#fff', fontWeight: 600,
      maxWidth: '88%', textAlign: 'center',
    }}>💡 {text}</div>
  );
};
