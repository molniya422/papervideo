// 由 agent 自动生成 — 演示 custom 模板的能力
// (这里是一个简单的示例;真实场景 agent 会根据 script.md 里的需求生成更丰富的内容)
import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill} from 'remotion';

const FONT = '"Hiragino Sans GB", -apple-system, "PingFang SC", sans-serif';
const clamp = () => ({extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

export const CustomFunFact = ({
  fact = '冷知识',
  hint = '提示',
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const op = interpolate(frame, [0, 22], [0, 1], clamp());
  const labelY = spring({frame, fps, from: -16, to: 0, durationInFrames: 22});

  // 主事实大字 — 字符渐次出现
  const factCharsShown = Math.min(fact.length,
    Math.floor(interpolate(frame, [22, 80], [0, fact.length], clamp())));
  const factVisible = fact.slice(0, factCharsShown);

  // hint 卡片飞入
  const hintOp = interpolate(frame, [70, 100], [0, 1], clamp());
  const hintY = spring({frame: Math.max(0, frame - 70), fps, from: 18, to: 0, durationInFrames: 22});

  // 小三角图标(脉动)
  const pulse = 0.7 + 0.3 * Math.sin(frame * 0.15);

  return (
    <AbsoluteFill style={{
      background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a0f 70%)',
      padding: '40px 6%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: FONT,
    }}>
      {/* "💡 冷知识" 标签 */}
      <div style={{
        opacity: op, transform: `translateY(${labelY}px)`,
        display: 'inline-flex', alignItems: 'center', gap: 10,
        padding: '8px 20px', borderRadius: 999,
        background: 'linear-gradient(135deg, #fdcb6e, #e17055)',
        fontSize: 20, fontWeight: 800, color: '#fff',
        boxShadow: '0 6px 20px rgba(253,203,110,0.5)',
        marginBottom: 28,
      }}>💡 冷知识</div>

      {/* 主事实(大字) */}
      <div style={{
        fontSize: 44, fontWeight: 900, color: '#fff',
        textAlign: 'center', maxWidth: 1000, lineHeight: 1.4,
        textShadow: '0 2px 12px rgba(0,0,0,0.6)',
      }}>
        {factVisible}
        <span style={{
          opacity: ((frame % 30) < 15) ? 1 : 0,
          color: '#fdcb6e',
        }}>|</span>
      </div>

      {/* hint 卡 */}
      <div style={{
        opacity: hintOp, transform: `translateY(${hintY}px)`,
        marginTop: 36, padding: '18px 28px', borderRadius: 12,
        background: 'linear-gradient(135deg, rgba(253,203,110,0.2), rgba(253,203,110,0.08))',
        border: '2px solid rgba(253,203,110,0.6)',
        display: 'flex', alignItems: 'center', gap: 14,
        boxShadow: `0 4px 24px rgba(253,203,110,${0.3 * pulse})`,
      }}>
        <span style={{fontSize: 28, opacity: pulse}}>👉</span>
        <span style={{fontSize: 24, color: '#fff', fontWeight: 600}}>{hint}</span>
      </div>
    </AbsoluteFill>
  );
};
