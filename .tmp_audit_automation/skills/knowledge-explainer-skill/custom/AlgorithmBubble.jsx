import React, {useMemo} from 'react';
import {useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill} from 'remotion';

const FONT = '"Hiragino Sans GB", -apple-system, "PingFang SC", sans-serif';
const clamp = () => ({extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

// 抖音算法 → 信息茧房可视化
// 24 张视频卡 (6 列 × 4 行),开始时 6 个标签均匀分布;
// 用户连续点赞蓝色"科技"卡 → 推荐流逐渐被蓝色霸屏 → 全屏蓝色 = 信息茧房

const TOPICS = [
  {id: 'travel',  label: '旅行', emoji: '✈️', color: '#4ECDC4'},
  {id: 'food',    label: '美食', emoji: '🍜', color: '#FF6B6B'},
  {id: 'fitness', label: '健身', emoji: '💪', color: '#95E1D3'},
  {id: 'tech',    label: '科技', emoji: '💻', color: '#4A90E2'}, // 用户偏好
  {id: 'pet',     label: '萌宠', emoji: '🐱', color: '#FFC93C'},
  {id: 'humor',   label: '搞笑', emoji: '😂', color: '#C490E4'},
];
const TARGET = 'tech'; // 用户偏好

const COLS = 6;
const ROWS = 4;
const N = COLS * ROWS;

// 初始布局:6 个 topic 各 4 张,确定性洗牌(seed)
function makeInitialLayout() {
  const arr = [];
  for (const t of TOPICS) for (let i = 0; i < 4; i++) arr.push(t.id);
  // 简单确定性洗牌(基于固定 indices 重排,避免每次渲染随机)
  const order = [3, 14, 7, 21, 0, 11, 18, 5, 9, 16, 23, 2, 13, 6, 19, 10, 1, 22, 15, 8, 17, 4, 20, 12];
  return order.map(i => arr[i]);
}

// 算法步:在指定帧把若干张卡换成 TARGET
function buildTimeline(initial) {
  // 时间轴(帧):
  // 0-30:   设置展示
  // 30-90:  4 次"点赞"动画(15f 一次)
  // 90-160: 第一波刷新 → 蓝色卡 7-8 张
  // 160-230: 第二波 → 12 张
  // 230-300: 第三波 → 18 张
  // 300-360: 第四波 → 22 张
  // 360-420: 收尾 → 全部 24 张
  // 420-540: 茧房标语停留

  const layouts = []; // 每帧的 topics 数组
  let cur = [...initial];

  // 0-90: 不变(只动画点赞)
  for (let f = 0; f < 90; f++) layouts.push([...cur]);

  // 算法 4 波 — 每次把 N 张非 tech 换成 tech
  const waves = [
    {atFrame: 90, addCount: 4},   // → 8
    {atFrame: 160, addCount: 4},  // → 12
    {atFrame: 230, addCount: 6},  // → 18
    {atFrame: 300, addCount: 4},  // → 22
    {atFrame: 360, addCount: 2},  // → 24
  ];

  let nextStop = waves[0].atFrame;
  let waveIdx = 0;

  for (let f = 90; f < 540; f++) {
    if (waveIdx < waves.length && f === waves[waveIdx].atFrame) {
      // 找 N 张非 tech 替换
      const indices = [];
      for (let i = 0; i < cur.length; i++) {
        if (cur[i] !== TARGET) indices.push(i);
      }
      // 用确定性"洗牌"挑前 addCount 张
      const pickOrder = [11, 5, 17, 23, 2, 14, 8, 20, 0, 6, 12, 18, 4, 10, 16, 22, 1, 7, 13, 19, 3, 9, 15, 21];
      const toReplace = indices
        .slice()
        .sort((a, b) => pickOrder[a] - pickOrder[b])
        .slice(0, waves[waveIdx].addCount);
      toReplace.forEach(i => { cur[i] = TARGET; });
      waveIdx++;
    }
    layouts.push([...cur]);
  }

  return layouts;
}

const PADDING_X = 60;
const PADDING_TOP = 100;
const PADDING_BOTTOM = 90;
const GAP = 8;

export const AlgorithmBubble = ({
  caption = '你点的每一下,都在喂算法',
  duration = 18,
}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();

  const initial = useMemo(() => makeInitialLayout(), []);
  const layouts = useMemo(() => buildTimeline(initial), [initial]);
  const cf = Math.min(frame, layouts.length - 1);
  const cells = layouts[cf];

  // 卡片尺寸
  const gridW = width - 2 * PADDING_X;
  const gridH = height - PADDING_TOP - PADDING_BOTTOM;
  const cardW = (gridW - (COLS - 1) * GAP) / COLS;
  const cardH = (gridH - (ROWS - 1) * GAP) / ROWS;

  // tech 数量
  const techCount = cells.filter(c => c === TARGET).length;

  // 顶部标题渐变
  const phase = (() => {
    if (frame < 30) return 'opening';
    if (frame < 90) return 'liking';
    if (frame < 360) return 'feeding';
    if (frame < 540) return 'bubble';
    return 'bubble';
  })();

  const headerText = {
    opening: '今天打开抖音 · 6 个话题随机推',
    liking: '你只点赞了「科技」内容...',
    feeding: '推荐流在悄悄收敛',
    bubble: '🔒 你的信息茧房',
  }[phase];

  const headerOp = interpolate(frame, [0, 14], [0, 1], clamp());

  // 点赞动画 (frames 30-90, 4 次点赞,每次15帧)
  const likeEvents = [
    {frame: 30, idx: 3},
    {frame: 45, idx: 14},
    {frame: 60, idx: 21},
    {frame: 75, idx: 9},
  ];

  // 茧房标语
  const bubbleOp = interpolate(frame, [380, 420], [0, 1], clamp());
  const bubbleScale = spring({
    frame: Math.max(0, frame - 380), fps,
    from: 0.8, to: 1, durationInFrames: 28,
  });

  return (
    <AbsoluteFill style={{
      background: phase === 'bubble'
        ? `radial-gradient(circle at center, ${TOPICS.find(t=>t.id===TARGET).color}40 0%, #050510 70%)`
        : 'radial-gradient(ellipse at top, #0e0e22 0%, #050510 70%)',
      fontFamily: FONT,
    }}>
      {/* 顶部标题 */}
      <div style={{
        position: 'absolute', top: 32, left: 0, width: '100%',
        textAlign: 'center', opacity: headerOp,
      }}>
        <div style={{
          fontSize: 12, fontWeight: 700, letterSpacing: 4,
          color: '#8888a0', textTransform: 'uppercase', marginBottom: 8,
        }}>FILTER BUBBLE · 算法信息茧房</div>
        <div style={{
          fontSize: 28, fontWeight: 800, color: '#fff',
          letterSpacing: 2,
        }}>{headerText}</div>
      </div>

      {/* 卡片网格 */}
      <div style={{
        position: 'absolute',
        top: PADDING_TOP, left: PADDING_X,
        width: gridW, height: gridH,
        display: 'grid',
        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
        gridTemplateRows: `repeat(${ROWS}, 1fr)`,
        gap: GAP,
      }}>
        {cells.map((topicId, i) => {
          const topic = TOPICS.find(t => t.id === topicId);
          // Like 动画
          const likeEvt = likeEvents.find(e => e.idx === i);
          let scale = 1, glow = 0, badgeOp = 0;
          if (likeEvt && frame >= likeEvt.frame) {
            const lf = frame - likeEvt.frame;
            scale = lf < 8 ? 1 + 0.15 * (lf / 8) : lf < 16 ? 1.15 - 0.15 * ((lf - 8) / 8) : 1;
            glow = lf < 16 ? 1 - lf / 16 : 0;
            badgeOp = interpolate(lf, [0, 6, 14, 22], [0, 1, 1, 0], clamp());
          }
          // 当前帧 vs 上一帧:如果新换成 tech,触发"翻面"动画
          const prevCells = cf > 0 ? layouts[cf - 1] : cells;
          const justChanged = prevCells[i] !== topicId;
          let flipScale = 1, flipOp = 1;
          if (justChanged) {
            // 用 useMemo 跨帧难,简化为最近 8 帧的入场弹簧
            const hf = Math.min(8, frame % 1000);  // crude
            flipScale = 0.85 + 0.15 * Math.min(1, hf / 8);
          }

          return (
            <div key={i} style={{
              background: `linear-gradient(135deg, ${topic.color}33, ${topic.color}11)`,
              border: `2px solid ${topic.color}`,
              borderRadius: 12,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: 8, position: 'relative',
              transform: `scale(${scale * flipScale})`,
              transition: 'transform 0.18s ease-out',
              boxShadow: glow > 0
                ? `0 0 ${30 * glow}px ${topic.color}` : 'none',
              overflow: 'hidden',
            }}>
              <div style={{
                fontSize: cardH > 100 ? 36 : 28,
                lineHeight: 1, marginBottom: 4,
              }}>{topic.emoji}</div>
              <div style={{
                fontSize: 13, color: '#fff',
                fontWeight: 700, letterSpacing: 1,
                opacity: 0.85,
              }}>{topic.label}</div>

              {/* Like badge */}
              {badgeOp > 0 && (
                <div style={{
                  position: 'absolute', top: 6, right: 8,
                  fontSize: 28, opacity: badgeOp,
                  filter: 'drop-shadow(0 0 8px rgba(255,80,120,0.8))',
                }}>❤️</div>
              )}
            </div>
          );
        })}
      </div>

      {/* 底部 — 计数 + caption */}
      <div style={{
        position: 'absolute', bottom: 30, left: 0, width: '100%',
        display: 'flex', justifyContent: 'space-between',
        padding: '0 60px',
        alignItems: 'center',
      }}>
        <div style={{
          fontSize: 14, color: '#8888a0', fontFamily: 'monospace',
          letterSpacing: 1,
        }}>
          科技占比 <span style={{
            fontSize: 22, color: '#4A90E2', fontWeight: 800,
            margin: '0 4px',
          }}>{techCount}/24</span>
          ({Math.round(techCount / N * 100)}%)
        </div>
        <div style={{
          fontSize: 18, color: '#fff', fontWeight: 600,
          padding: '6px 18px', borderRadius: 22,
          background: 'rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.08)',
          letterSpacing: 1,
        }}>{caption}</div>
        <div style={{
          fontSize: 14, color: '#666', fontFamily: 'monospace',
        }}>
          t = {(cf / fps).toFixed(1)}s
        </div>
      </div>

      {/* 茧房收尾大字 (380-540 帧) */}
      {bubbleOp > 0 && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: `translate(-50%, -50%) scale(${bubbleScale})`,
          opacity: bubbleOp,
          textAlign: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            fontSize: 80, fontWeight: 900,
            background: `linear-gradient(135deg, #4A90E2, #74b9ff)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: 4,
            textShadow: '0 4px 60px rgba(74,144,226,0.5)',
          }}>信息茧房</div>
          <div style={{
            fontSize: 22, color: '#fff', marginTop: 16,
            fontWeight: 600, letterSpacing: 2,
            textShadow: '0 2px 20px rgba(0,0,0,0.8)',
          }}>看到的世界,只剩你想看的</div>
        </div>
      )}
    </AbsoluteFill>
  );
};
