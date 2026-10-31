import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill} from 'remotion';

const FONT = '"Hiragino Sans GB", -apple-system, "PingFang SC", sans-serif';

// 一张纸对折 42 次到月球
// 视觉设计:左侧 log-scale 垂直柱(等比每折一格),里程碑 emoji 标在对应高度;
// 右侧大字读数 + 厚度自动选单位(mm → cm → m → km)。
const TOTAL_FOLDS = 42;
const PAPER_MM = 0.1;

const MILESTONES = [
  {n: 0,  label: '一张纸',       emoji: '📄'},
  {n: 7,  label: '一颗巧克力',   emoji: '🍫'},
  {n: 14, label: '一个人 1.6m',  emoji: '🧍'},
  {n: 17, label: '4 层楼 13m',   emoji: '🏠'},
  {n: 20, label: '自由女神 105m', emoji: '🗽'},
  {n: 23, label: '迪拜塔 839m',  emoji: '🏗'},
  {n: 27, label: '高空云层 13km', emoji: '☁️'},
  {n: 30, label: '大气层 107km', emoji: '🌍'},
  {n: 35, label: 'GPS 轨道 3437km', emoji: '🛰'},
  {n: 40, label: '1/3 月球距离', emoji: '🌑'},
  {n: 42, label: '超过月球 44万km', emoji: '🌙'},
];

function formatThickness(m) {
  if (m < 0.01) return {val: (m * 1000).toFixed(2), unit: 'mm'};
  if (m < 1) return {val: (m * 100).toFixed(2), unit: 'cm'};
  if (m < 1000) return {val: m.toFixed(2), unit: 'm'};
  if (m < 1e7) return {val: (m / 1000).toFixed(2), unit: 'km'};
  return {val: (m / 1000).toFixed(0), unit: 'km'};
}

const clamp = () => ({extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

export const PaperFold = ({
  caption = '0.1mm 的纸对折 42 次,比月球还远',
  duration = 18,
}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const totalFrames = Math.round(duration * fps);
  const animEnd = totalFrames - 60; // 末尾停留 2s

  // 整体进度(ease-out): 前面慢、中间加速
  const t = Math.min(1, Math.max(0, frame / animEnd));
  const eased = 1 - Math.pow(1 - t, 2.4);
  const foldF = eased * TOTAL_FOLDS;
  const fold = Math.floor(foldF + 0.0001);

  // 厚度
  const thicknessM = PAPER_MM * 1e-3 * Math.pow(2, foldF);
  const {val, unit} = formatThickness(thicknessM);

  // 入场
  const titleOp = interpolate(frame, [0, 22], [0, 1], clamp());

  // 当前已通过的最大里程碑
  const reachedMilestone = MILESTONES.slice().reverse().find(m => fold >= m.n);

  // 柱高 = log scale = 直接 fold/42 比例
  const barHpx = height - 160;
  const barTop = 80;
  const fillH = (foldF / TOTAL_FOLDS) * barHpx;
  const barX = 100;
  const barW = 36;

  // 颜色:从紫渐变到红
  const gradId = 'pfGrad';

  return (
    <AbsoluteFill style={{
      background: 'radial-gradient(ellipse at top, #0e0e22 0%, #050510 70%)',
      fontFamily: FONT,
    }}>
      {/* 顶部小标 */}
      <div style={{
        position: 'absolute', top: 30, left: 0, width: '100%',
        textAlign: 'center', opacity: titleOp,
      }}>
        <span style={{
          fontSize: 14, fontWeight: 700, letterSpacing: 4,
          color: '#8888a0', textTransform: 'uppercase',
        }}>EXPONENTIAL GROWTH · 指数的力量</span>
      </div>

      {/* 左侧:log-scale 柱 + 里程碑 */}
      <svg width={width} height={height}
           style={{position: 'absolute', top: 0, left: 0}}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#6c5ce7" />
            <stop offset="40%" stopColor="#fd79a8" />
            <stop offset="80%" stopColor="#fdcb6e" />
            <stop offset="100%" stopColor="#74b9ff" />
          </linearGradient>
        </defs>

        {/* 柱背景 */}
        <rect x={barX} y={barTop} width={barW} height={barHpx}
              fill="rgba(255,255,255,0.04)" rx="8" />

        {/* 已填充部分 — 从底部往上长 */}
        <rect x={barX} y={barTop + barHpx - fillH}
              width={barW} height={fillH}
              fill={`url(#${gradId})`} rx="8"
              style={{filter: 'drop-shadow(0 0 16px rgba(108,92,231,0.4))'}} />

        {/* 里程碑刻度线 */}
        {MILESTONES.map((m, i) => {
          const y = barTop + barHpx - (m.n / TOTAL_FOLDS) * barHpx;
          const passed = fold >= m.n;
          return (
            <g key={i}>
              <line x1={barX} y1={y} x2={barX + barW + 14} y2={y}
                    stroke={passed ? '#fff' : 'rgba(255,255,255,0.2)'}
                    strokeWidth={passed ? 1.5 : 1} />
              <text x={barX + barW + 22} y={y + 5}
                    fontSize="22"
                    opacity={passed ? 1 : 0.35}
                    style={{transition: 'opacity 0.3s'}}>
                {m.emoji}
              </text>
              <text x={barX + barW + 56} y={y + 5}
                    fontSize="13"
                    fill={passed ? '#fff' : '#666'}
                    fontFamily={FONT}
                    fontWeight={passed ? 700 : 500}
                    style={{letterSpacing: 1}}>
                {m.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* 右侧:计数 + 厚度 */}
      <div style={{
        position: 'absolute', top: 110, right: 60,
        textAlign: 'right', width: 620,
      }}>
        <div style={{
          fontSize: 22, color: '#8888a0', letterSpacing: 4,
          textTransform: 'uppercase', fontWeight: 700,
        }}>
          FOLD #
        </div>
        <div style={{
          fontSize: 220, fontWeight: 900,
          background: 'linear-gradient(135deg, #6c5ce7, #00cec9)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 0.95, letterSpacing: -4,
          textShadow: '0 4px 40px rgba(108,92,231,0.4)',
          fontFamily: 'monospace, ' + FONT,
        }}>
          {String(fold).padStart(2, '0')}
        </div>

        <div style={{
          marginTop: 30,
          fontSize: 20, color: '#aaa', letterSpacing: 2,
          fontWeight: 600,
        }}>
          THICKNESS
        </div>
        <div style={{display: 'flex', alignItems: 'baseline',
          justifyContent: 'flex-end', gap: 14, marginTop: 8}}>
          <span style={{
            fontSize: 96, fontWeight: 800, color: '#fff',
            fontFamily: 'monospace, ' + FONT,
            letterSpacing: -2,
            textShadow: '0 2px 30px rgba(0,0,0,0.6)',
          }}>{val}</span>
          <span style={{
            fontSize: 56, fontWeight: 700,
            color: '#fdcb6e', letterSpacing: 1,
          }}>{unit}</span>
        </div>

        {reachedMilestone && reachedMilestone.n > 0 && (
          <div style={{
            marginTop: 24, padding: '10px 18px',
            display: 'inline-block',
            borderRadius: 12,
            background: 'rgba(108,92,231,0.18)',
            border: '1.5px solid rgba(108,92,231,0.5)',
            fontSize: 22, color: '#fff', fontWeight: 700,
            letterSpacing: 1,
          }}>
            {reachedMilestone.emoji} 比 {reachedMilestone.label} 还{
              reachedMilestone.n >= 14 ? '高' : '厚'}
          </div>
        )}
      </div>

      {/* 底部 caption */}
      <div style={{
        position: 'absolute', bottom: 30, left: 0, width: '100%',
        textAlign: 'center', opacity: titleOp, pointerEvents: 'none',
      }}>
        <div style={{
          display: 'inline-block',
          fontSize: 18, color: '#fff', fontWeight: 600,
          padding: '6px 18px', borderRadius: 22,
          background: 'rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.08)',
          letterSpacing: 1,
        }}>
          {caption}
        </div>
      </div>
    </AbsoluteFill>
  );
};
