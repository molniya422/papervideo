import React, {useMemo} from 'react';
import {useCurrentFrame, useVideoConfig, interpolate, AbsoluteFill} from 'remotion';

const FONT = '"Hiragino Sans GB", -apple-system, "PingFang SC", sans-serif';

// 双摆物理仿真 — 拉格朗日方程 + 欧拉积分
// 真正展示 Remotion 能力的非 PPT 案例:每帧根据物理公式重新解算位置
const G = 9.81;
const M1 = 1, M2 = 1;
const L1 = 1.0, L2 = 1.0;

function step(state, dt) {
  const [t1, w1, t2, w2] = state;
  const c12 = Math.cos(t1 - t2);
  const s12 = Math.sin(t1 - t2);
  const den = 2 * M1 + M2 - M2 * Math.cos(2 * t1 - 2 * t2);

  const a1Num =
    -G * (2 * M1 + M2) * Math.sin(t1)
    - M2 * G * Math.sin(t1 - 2 * t2)
    - 2 * s12 * M2 * (w2 * w2 * L2 + w1 * w1 * L1 * c12);
  const a1 = a1Num / (L1 * den);

  const a2Num =
    2 * s12 *
    (w1 * w1 * L1 * (M1 + M2)
      + G * (M1 + M2) * Math.cos(t1)
      + w2 * w2 * L2 * M2 * c12);
  const a2 = a2Num / (L2 * den);

  return [t1 + w1 * dt, w1 + a1 * dt, t2 + w2 * dt, w2 + a2 * dt];
}

function simulate(t1_0, t2_0, totalFrames, fps, substeps) {
  const dt = 1 / (fps * substeps);
  let s = [t1_0, 0, t2_0, 0];
  const out = [];
  for (let f = 0; f < totalFrames; f++) {
    for (let k = 0; k < substeps; k++) s = step(s, dt);
    out.push([s[0], s[1], s[2], s[3]]);
  }
  return out;
}

function project([t1, , t2], cx, cy, scale) {
  const x1 = cx + L1 * scale * Math.sin(t1);
  const y1 = cy + L1 * scale * Math.cos(t1);
  const x2 = x1 + L2 * scale * Math.sin(t2);
  const y2 = y1 + L2 * scale * Math.cos(t2);
  return {x1, y1, x2, y2};
}

export const DoublePendulum = ({
  caption = '两个一模一样的双摆,初始角度只差 0.001°',
  duration = 14,
}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const totalFrames = Math.round(duration * fps);

  // 初始条件: ~115° 离垂直线, 高能起手
  const t1_0 = 2.0;
  const t2_0 = 1.5;
  const eps = 0.001 * Math.PI / 180; // 0.001° in rad

  const simA = useMemo(() => simulate(t1_0, t2_0, totalFrames, fps, 20), [totalFrames, fps]);
  const simB = useMemo(() => simulate(t1_0 + eps, t2_0 + eps, totalFrames, fps, 20), [totalFrames, fps]);

  const cx = width / 2;
  const cy = height / 2 - 20;
  const scale = 145;

  const cf = Math.min(frame, totalFrames - 1);
  const pa = project(simA[cf], cx, cy, scale);
  const pb = project(simB[cf], cx, cy, scale);

  // Trail (last 90 frames of bob 2 position)
  const trailLen = 90;
  const start = Math.max(0, cf - trailLen);
  const trailA = [];
  const trailB = [];
  for (let f = start; f <= cf; f++) {
    trailA.push(project(simA[f], cx, cy, scale));
    trailB.push(project(simB[f], cx, cy, scale));
  }
  const pathStr = (arr) =>
    arr.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x2.toFixed(1)} ${p.y2.toFixed(1)}`).join(' ');

  // Divergence display: angular distance between the two systems
  const dθ = Math.abs(simA[cf][0] - simB[cf][0]) + Math.abs(simA[cf][2] - simB[cf][2]);
  const dθDeg = (dθ * 180 / Math.PI).toFixed(2);

  // Animations
  const titleOp = interpolate(frame, [0, 22], [0, 1], {extrapolateRight: 'clamp'});
  const captionOp = interpolate(frame, [10, 32], [0, 1], {extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{
      background: 'radial-gradient(ellipse at center, #0e0e22 0%, #050510 70%)',
      fontFamily: FONT,
    }}>
      {/* 顶部小角标 */}
      <div style={{
        position: 'absolute', top: 32, left: 0, width: '100%',
        textAlign: 'center', opacity: titleOp,
      }}>
        <span style={{
          fontSize: 14, fontWeight: 700, letterSpacing: 4,
          color: '#8888a0', textTransform: 'uppercase',
        }}>BUTTERFLY EFFECT · 双摆混沌</span>
      </div>

      {/* SVG 主画面 */}
      <svg width={width} height={height}
           style={{position: 'absolute', top: 0, left: 0}}>
        <defs>
          <radialGradient id="pivotG">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="100%" stopColor="#aaa" />
          </radialGradient>
        </defs>

        {/* 拖尾 A — 粉 */}
        <path d={pathStr(trailA)}
              stroke="#fd79a8" strokeWidth="2.5"
              fill="none" opacity="0.85"
              strokeLinecap="round" strokeLinejoin="round" />
        {/* 拖尾 B — 青 */}
        <path d={pathStr(trailB)}
              stroke="#00cec9" strokeWidth="2.5"
              fill="none" opacity="0.85"
              strokeLinecap="round" strokeLinejoin="round" />

        {/* 支点 */}
        <circle cx={cx} cy={cy} r="7" fill="url(#pivotG)" />
        <circle cx={cx} cy={cy} r="7" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="1" />

        {/* 双摆 A — 粉 */}
        <line x1={cx} y1={cy} x2={pa.x1} y2={pa.y1}
              stroke="#fd79a8" strokeWidth="3" opacity="0.5" />
        <line x1={pa.x1} y1={pa.y1} x2={pa.x2} y2={pa.y2}
              stroke="#fd79a8" strokeWidth="3" opacity="0.5" />
        <circle cx={pa.x1} cy={pa.y1} r="9" fill="#fd79a8" opacity="0.85" />
        <circle cx={pa.x2} cy={pa.y2} r="15" fill="#fd79a8" />
        <circle cx={pa.x2} cy={pa.y2} r="22" fill="none"
                stroke="#fd79a8" strokeOpacity="0.25" strokeWidth="2" />

        {/* 双摆 B — 青 */}
        <line x1={cx} y1={cy} x2={pb.x1} y2={pb.y1}
              stroke="#00cec9" strokeWidth="3" opacity="0.5" />
        <line x1={pb.x1} y1={pb.y1} x2={pb.x2} y2={pb.y2}
              stroke="#00cec9" strokeWidth="3" opacity="0.5" />
        <circle cx={pb.x1} cy={pb.y1} r="9" fill="#00cec9" opacity="0.85" />
        <circle cx={pb.x2} cy={pb.y2} r="15" fill="#00cec9" />
        <circle cx={pb.x2} cy={pb.y2} r="22" fill="none"
                stroke="#00cec9" strokeOpacity="0.25" strokeWidth="2" />
      </svg>

      {/* 左下:图例 */}
      <div style={{
        position: 'absolute', bottom: 32, left: 40,
        display: 'flex', flexDirection: 'column', gap: 8,
        opacity: captionOp,
      }}>
        <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
          <div style={{width: 14, height: 14, borderRadius: 7, background: '#fd79a8'}} />
          <span style={{fontSize: 16, color: '#eee', fontFamily: 'monospace'}}>
            θ₀ = 115.0000°
          </span>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
          <div style={{width: 14, height: 14, borderRadius: 7, background: '#00cec9'}} />
          <span style={{fontSize: 16, color: '#eee', fontFamily: 'monospace'}}>
            θ₀ = 115.0010°
          </span>
        </div>
        <div style={{fontSize: 13, color: '#8888a0', marginTop: 4, letterSpacing: 1}}>
          初始角度只差 0.001°
        </div>
      </div>

      {/* 右下:发散指示器 */}
      <div style={{
        position: 'absolute', bottom: 32, right: 40,
        textAlign: 'right', opacity: captionOp,
      }}>
        <div style={{
          fontSize: 12, color: '#8888a0', letterSpacing: 2,
          textTransform: 'uppercase', marginBottom: 4,
        }}>DIVERGENCE</div>
        <div style={{
          fontSize: 32, fontWeight: 800,
          color: dθDeg > 30 ? '#ff7675' : dθDeg > 5 ? '#fdcb6e' : '#00cec9',
          fontFamily: 'monospace',
          textShadow: dθDeg > 30 ? '0 0 20px rgba(255,118,117,0.5)' : 'none',
        }}>
          {dθDeg}°
        </div>
        <div style={{fontSize: 12, color: '#666', marginTop: 4, fontFamily: 'monospace'}}>
          t = {(cf / fps).toFixed(2)}s
        </div>
      </div>

      {/* 底部 caption */}
      <div style={{
        position: 'absolute', bottom: 32, left: 0, width: '100%',
        textAlign: 'center', opacity: captionOp, pointerEvents: 'none',
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
