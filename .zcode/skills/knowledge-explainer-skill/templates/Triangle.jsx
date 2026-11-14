import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill} from 'remotion';

const FONT = '"Hiragino Sans GB", -apple-system, "PingFang SC", sans-serif';
const clamp = () => ({extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

// 三角形几何讲解模板
// 支持:边长 + 高 + 公式 + 答案,带动画绘制
export const Triangle = ({
  title = '三角形',
  base = 10,
  height = 6,
  unit = 'cm',
  formula = '底 × 高 ÷ 2',
  result,                        // 可选:最终答案数字
  resultUnit = '',               // 例如 'cm²'
  bg = '#0a0a0f',
  color1 = '#6c5ce7',
  color2 = '#00cec9',
  highlight = '#fdcb6e',
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // ===== 动画时间节点 =====
  const titleOp = interpolate(frame, [0, 22], [0, 1], clamp());
  const titleY  = spring({frame, fps, from: -16, to: 0, durationInFrames: 22});

  // 三角形描边绘制(stroke-dasharray)
  const drawProgress = interpolate(frame, [22, 90], [0, 1], clamp());
  // 标签依次出现
  const baseLabelOp = interpolate(frame, [60, 80], [0, 1], clamp());
  // 高(虚线)
  const heightLineOp = interpolate(frame, [80, 100], [0, 1], clamp());
  const heightLabelOp = interpolate(frame, [95, 115], [0, 1], clamp());
  // 公式
  const formulaOp = interpolate(frame, [125, 150], [0, 1], clamp());
  const formulaY = spring({frame: Math.max(0, frame - 125), fps,
    from: 16, to: 0, durationInFrames: 22});
  // 计算过程
  const calcOp = interpolate(frame, [165, 195], [0, 1], clamp());
  // 最终答案高亮
  const resultOp = interpolate(frame, [200, 230], [0, 1], clamp());
  const resultScale = spring({frame: Math.max(0, frame - 200), fps,
    from: 0.85, to: 1, durationInFrames: 22});

  // ===== 三角形几何参数(在 SVG viewBox 内) =====
  // 等比缩放 base 和 height 到 viewBox(280 宽 200 高最大区域)
  const maxW = 280, maxH = 220;
  const ratio = base / height;
  let triW, triH;
  if (ratio >= maxW / maxH) {
    triW = maxW;
    triH = maxW / ratio;
  } else {
    triH = maxH;
    triW = maxH * ratio;
  }
  // 三角形顶点(底边居中,顶点在底边中心正上方 — 等腰三角)
  const cx = 250, byBottom = 380;  // 底边中点(SVG 坐标)
  const x1 = cx - triW / 2, y1 = byBottom;
  const x2 = cx + triW / 2, y2 = byBottom;
  const x3 = cx, y3 = byBottom - triH;

  // 三角形周长(用于 stroke-dasharray)
  const side1 = Math.hypot(x2 - x1, y2 - y1);
  const side2 = Math.hypot(x3 - x2, y3 - y2);
  const side3 = Math.hypot(x1 - x3, y1 - y3);
  const perim = side1 + side2 + side3;

  // 计算结果
  const computedResult = result !== undefined ? result : (base * height) / 2;

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at top, #1a1a2e 0%, ${bg} 70%)`,
      padding: '32px 5%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', fontFamily: FONT,
    }}>
      {/* 标题 */}
      <h1 style={{
        fontSize: 44, fontWeight: 900, color: '#fff',
        margin: '8px 0 18px',
        opacity: titleOp, transform: `translateY(${titleY}px)`,
        textShadow: '0 2px 12px rgba(0,0,0,0.6)',
      }}>{title}</h1>

      {/* 主图区(三角形 SVG)+ 公式区 */}
      <div style={{display: 'flex', alignItems: 'center', gap: 36,
        flex: 1, width: '100%', justifyContent: 'center'}}>

        {/* 三角形 SVG */}
        <svg viewBox="0 0 500 440" style={{width: 480, height: 420}}>
          <defs>
            <linearGradient id="triFill" x1="0" y1="0" x2="500" y2="440">
              <stop offset="0" stopColor={color1} stopOpacity="0.25" />
              <stop offset="1" stopColor={color2} stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="triStroke" x1="0" y1="0" x2="500" y2="440">
              <stop offset="0" stopColor={color1} />
              <stop offset="1" stopColor={color2} />
            </linearGradient>
          </defs>

          {/* 三角形填充(伴随描边出现) */}
          <polygon
            points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`}
            fill="url(#triFill)"
            opacity={drawProgress}
          />

          {/* 三角形描边(动画) */}
          <polygon
            points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`}
            fill="none"
            stroke="url(#triStroke)"
            strokeWidth="3.5"
            strokeLinejoin="round"
            strokeDasharray={perim}
            strokeDashoffset={perim * (1 - drawProgress)}
            style={{filter: `drop-shadow(0 0 8px ${color2}55)`}}
          />

          {/* 高(虚线 — 从顶点到底边垂直) */}
          <line
            x1={x3} y1={y3}
            x2={x3} y2={y2}
            stroke={highlight}
            strokeWidth="2.5"
            strokeDasharray="6 4"
            opacity={heightLineOp}
          />
          {/* 高 — 直角符号 */}
          {heightLineOp > 0.5 && (
            <path
              d={`M ${x3 - 12} ${y2} L ${x3 - 12} ${y2 - 12} L ${x3} ${y2 - 12}`}
              stroke={highlight}
              strokeWidth="2"
              fill="none"
              opacity={heightLineOp}
            />
          )}

          {/* 底边标签 */}
          <text
            x={cx} y={y1 + 28}
            textAnchor="middle"
            fontSize="20"
            fill="#fff"
            fontWeight="700"
            fontFamily={FONT}
            opacity={baseLabelOp}
          >底 {base} {unit}</text>

          {/* 高标签 */}
          <text
            x={x3 - 22} y={(y3 + y2) / 2 + 6}
            textAnchor="end"
            fontSize="20"
            fill={highlight}
            fontWeight="700"
            fontFamily={FONT}
            opacity={heightLabelOp}
          >高 {height} {unit}</text>
        </svg>

        {/* 公式 + 计算区 */}
        <div style={{display: 'flex', flexDirection: 'column', gap: 16,
          minWidth: 380}}>

          {/* 公式 */}
          <div style={{
            opacity: formulaOp, transform: `translateY(${formulaY}px)`,
            padding: '18px 22px', borderRadius: 12,
            background: `linear-gradient(135deg, ${color1}22, ${color1}08)`,
            border: `2px solid ${color1}88`,
          }}>
            <div style={{fontSize: 13, color: '#a1a1aa', fontWeight: 600,
              marginBottom: 6, letterSpacing: 1}}>📐 公式</div>
            <div style={{fontSize: 28, color: '#fff', fontWeight: 700,
              fontFamily: 'monospace'}}>
              面积 = {formula}
            </div>
          </div>

          {/* 代入计算 */}
          <div style={{
            opacity: calcOp,
            padding: '18px 22px', borderRadius: 12,
            background: `linear-gradient(135deg, ${color2}22, ${color2}08)`,
            border: `2px solid ${color2}88`,
          }}>
            <div style={{fontSize: 13, color: '#a1a1aa', fontWeight: 600,
              marginBottom: 6, letterSpacing: 1}}>🧮 代入</div>
            <div style={{fontSize: 26, color: '#fff', fontWeight: 700,
              fontFamily: 'monospace'}}>
              {base} × {height} ÷ 2
            </div>
          </div>

          {/* 答案高亮 */}
          <div style={{
            opacity: resultOp, transform: `scale(${resultScale})`,
            padding: '20px 26px', borderRadius: 14,
            background: `linear-gradient(135deg, ${highlight}33, ${highlight}11)`,
            border: `2.5px solid ${highlight}`,
            boxShadow: `0 0 30px ${highlight}55`,
          }}>
            <div style={{fontSize: 13, color: highlight, fontWeight: 700,
              marginBottom: 6, letterSpacing: 1}}>✨ 答案</div>
            <div style={{fontSize: 40, color: '#fff', fontWeight: 900,
              fontFamily: 'monospace'}}>
              {computedResult} <span style={{fontSize: 28, color: highlight}}>{resultUnit}</span>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
