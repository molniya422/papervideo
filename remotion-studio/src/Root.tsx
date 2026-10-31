import React from "react";
import { AbsoluteFill, Composition, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { PaperExplain3D, PAPER_EXPLAIN_3D_DURATION } from "./paper-attention/Main";
import { TransformerExplained, TRANSFORMER_EXPLAINED_FRAMES } from "./ai-paper/Main";
import { TransformerBlueprint, BP_FRAMES } from "./blueprint/Main";
import { TransformerHalftone, HALFTONE_FRAMES } from "./halftone/Main";
import { SocialAttention, SOCIAL_FRAMES } from "./halftone/social";
import { MechLong, MECHLONG_FRAMES } from "./halftone/long-mech";
import { Ep02Mha, EP02_FRAMES } from "./halftone/ep02-mha";

/**
 * 论文讲解视频起手模板：标题卡 + 要点逐条浮现。
 * 写自定义场景时复制这种模式：useCurrentFrame + interpolate/spring 驱动动画，
 * 逻辑保持纯函数（同一帧永远渲染同一画面），不要用 setTimeout/随机数。
 */

const COLORS = {
  bg: "#0f172a",
  fg: "#f8fafc",
  accent: "#38bdf8",
  muted: "#94a3b8",
};

export const TitleCard: React.FC<{
  paperTitle: string;
  authors?: string;
  bullets: string[];
}> = ({ paperTitle, authors, bullets }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = spring({ frame, fps, durationInFrames: 20 });
  const titleY = interpolate(titleOpacity, [0, 1], [40, 0]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${COLORS.bg} 0%, #1e293b 100%)`,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "system-ui, 'Microsoft YaHei', sans-serif",
        padding: 80,
      }}
    >
      <div style={{ width: "100%", maxWidth: 1000 }}>
        <div
          style={{
            fontSize: 18,
            color: COLORS.accent,
            letterSpacing: 6,
            marginBottom: 24,
            opacity: titleOpacity,
          }}
        >
          PAPER EXPLAINER
        </div>
        <h1
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.fg,
            lineHeight: 1.25,
            margin: 0,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          {paperTitle}
        </h1>
        {authors ? (
          <div style={{ fontSize: 22, color: COLORS.muted, marginTop: 16, opacity: titleOpacity }}>
            {authors}
          </div>
        ) : null}
        <div style={{ marginTop: 56 }}>
          {bullets.map((b, i) => {
            const appear = spring({
              frame: frame - 25 - i * 12,
              fps,
              durationInFrames: 18,
            });
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  fontSize: 28,
                  color: COLORS.fg,
                  marginBottom: 20,
                  opacity: appear,
                  transform: `translateX(${interpolate(appear, [0, 1], [-30, 0])}px)`,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: COLORS.accent,
                    flexShrink: 0,
                  }}
                />
                {b}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 默认起手模板 */}
      <Composition
        id="PaperExplain"
        component={TitleCard}
        durationInFrames={150}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{
          paperTitle: "在这里填写论文标题",
          authors: "Author One, Author Two · Venue 2026",
          bullets: ["一句话讲清它解决什么问题", "方法的核心机制", "最亮眼的实验结论"],
        }}
      />

      {/* 3D 讲解片：9 镜头 + 中文旁白 + 代码合成配乐 */}
      <Composition
        id="PaperExplain3D"
        component={PaperExplain3D}
        durationInFrames={PAPER_EXPLAIN_3D_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* v2：逐句旁白对齐字幕 + 分区版面 + 矩阵级 3D 场景（10 镜头） */}
      <Composition
        id="TransformerExplained"
        component={TransformerExplained}
        durationInFrames={TRANSFORMER_EXPLAINED_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* v3：工程蓝图语言 + 论证脊柱 + 线框 3D（12 章） */}
      <Composition
        id="TransformerBlueprint"
        component={TransformerBlueprint}
        durationInFrames={BP_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* v7：社媒 60 秒（16:9） */}
      <Composition
        id="SocialAttention"
        component={SocialAttention}
        durationInFrames={SOCIAL_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* v7：社媒 60 秒（9:16 竖版，重新排版） */}
      <Composition
        id="SocialAttentionVertical"
        component={SocialAttention}
        durationInFrames={SOCIAL_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />

      {/* EP02：多头注意力的数学（brutalist · music-only · 13 章） */}
      <Composition
        id="Ep02Mha"
        component={Ep02Mha}
        durationInFrames={EP02_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* v8：长版 10 分钟（18 章 · 机核语言 · 零基础） */}
      <Composition
        id="MechLong"
        component={MechLong}
        durationInFrames={MECHLONG_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* v4：工业半调点阵（halftone）+ HUD（12 章） */}
      <Composition
        id="TransformerHalftone"
        component={TransformerHalftone}
        durationInFrames={HALFTONE_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
