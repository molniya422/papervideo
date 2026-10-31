import React from "react";
import {AbsoluteFill, interpolate, useCurrentFrame} from "remotion";
import {C, FONT, MONO} from "./theme";
import {SHOTS, TOTAL_FRAMES, captionAt, shotAt} from "./timeline";

/** 全局包装层：章节标签、字幕、进度条、水印 */
export const Chrome: React.FC = () => {
  const frame = useCurrentFrame();
  const {index, shot, local} = shotAt(frame);
  const cap = captionAt(shot, local);
  const progress = frame / (TOTAL_FRAMES - 1);

  const chromeOp = interpolate(frame, [10, 34], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{fontFamily: FONT, pointerEvents: "none", opacity: chromeOp}}>
      {/* 顶部左侧：章节 */}
      <div style={{position: "absolute", top: 54, left: 92, display: "flex", alignItems: "center", gap: 14}}>
        <div style={{width: 8, height: 8, borderRadius: 999, background: shot.accent, boxShadow: `0 0 14px ${shot.accent}`}} />
        <div style={{fontFamily: MONO, fontSize: 20, color: "#aab6d4", letterSpacing: 2}}>
          {String(index + 1).padStart(2, "0")} / {String(SHOTS.length).padStart(2, "0")}
        </div>
        <div style={{fontSize: 21, color: "#dbe4ff", letterSpacing: 1.5}}>{shot.chapter}</div>
      </div>

      {/* 顶部右侧：水印 */}
      <div
        style={{
          position: "absolute",
          top: 58,
          right: 92,
          fontFamily: MONO,
          fontSize: 16,
          color: "#5d688a",
          letterSpacing: 3,
        }}
      >
        ATTENTION IS ALL YOU NEED · PAPER EXPLAINER
      </div>

      {/* 字幕 */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 108,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            maxWidth: 1420,
            padding: "14px 30px",
            borderRadius: 12,
            background: "rgba(4,7,15,.62)",
            border: "1px solid rgba(90,110,160,.18)",
            backdropFilter: "blur(8px)",
            fontSize: 33,
            lineHeight: 1.45,
            color: "#f2f6ff",
            letterSpacing: 0.6,
            textAlign: "center",
            opacity: cap.opacity,
            textShadow: "0 2px 18px rgba(0,0,0,.9)",
          }}
        >
          {cap.text}
        </div>
      </div>

      {/* 进度条 */}
      <div style={{position: "absolute", left: 0, right: 0, bottom: 0, height: 6, background: "rgba(255,255,255,.05)"}}>
        <div
          style={{
            height: "100%",
            width: `${progress * 100}%`,
            background: `linear-gradient(90deg, ${C.blue}, ${C.cyan} 55%, ${C.purple})`,
            boxShadow: "0 0 16px rgba(78,168,255,.55)",
          }}
        />
      </div>

      {/* 镜头剩余时间刻度 */}
      <div style={{position: "absolute", left: 92, bottom: 26, fontFamily: MONO, fontSize: 15, color: "#4d5878", letterSpacing: 1}}>
        {Math.floor(frame / 30 / 60)}:{String(Math.floor((frame / 30) % 60)).padStart(2, "0")} / {Math.floor(TOTAL_FRAMES / 30 / 60)}:
        {String(Math.floor((TOTAL_FRAMES / 30) % 60)).padStart(2, "0")}
      </div>
    </AbsoluteFill>
  );
};
