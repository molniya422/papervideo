import React from "react";
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from "remotion";
import {C, CaptionBand, FONT, MONO, TextPanel} from "./layout";
import {SHOTS, TOTAL_FRAMES, type Shot} from "./timeline.generated";
import {Shot01, Shot02, Shot03, Shot04, Shot05} from "./shots1-5";
import {Shot06, Shot07, Shot08, Shot09, Shot10} from "./shots6-10";

const COMPONENTS: React.FC<{shot: Shot}>[] = [Shot01, Shot02, Shot03, Shot04, Shot05, Shot06, Shot07, Shot08, Shot09, Shot10];

/** 每个镜头：3D 舞台 + 左侧文字区 + 逐句字幕/旁白（字幕与语音同源，天然对齐） */
const ShotShell: React.FC<{shot: Shot; index: number}> = ({shot, index}) => {
  const frame = useCurrentFrame();
  const fade = Math.min(1, frame / 10, (shot.frames - frame) / 10);
  const Comp = COMPONENTS[index];

  return (
    <AbsoluteFill style={{opacity: Math.max(0, Math.min(1, fade)), background: C.bg}}>
      <Comp shot={shot} />

      {!shot.hero ? (
        <TextPanel
          kicker={shot.kicker}
          title={shot.title}
          bullets={shot.bullets}
          bulletAt={shot.bulletAt}
          accent={shot.accent}
        />
      ) : null}

      {shot.sentences.map((s, k) => (
        <Sequence key={k} from={s.start} durationInFrames={s.frames} name={`${shot.id}-${k + 1}`}>
          <Audio src={staticFile(`audio2/${s.audio}.mp3`)} volume={1} />
          <CaptionBand text={s.text} accent={shot.accent} index={k} total={s.frames} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

/** 全局：顶部进度条 + 时间码 */
const Chrome: React.FC = () => {
  const frame = useCurrentFrame();
  const progress = frame / (TOTAL_FRAMES - 1);
  const sec = Math.floor(frame / 30);
  const total = Math.floor(TOTAL_FRAMES / 30);

  return (
    <AbsoluteFill style={{pointerEvents: "none", fontFamily: MONO}}>
      <div style={{position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "rgba(255,255,255,.05)"}}>
        <div
          style={{
            height: "100%",
            width: `${progress * 100}%`,
            background: `linear-gradient(90deg, ${C.blue}, ${C.cyan} 55%, ${C.purple})`,
            boxShadow: "0 0 12px rgba(78,168,255,.6)",
          }}
        />
      </div>
      <div style={{position: "absolute", top: 18, right: 34, fontSize: 15, color: "#4f5b7d", letterSpacing: 1.4}}>
        {String(Math.floor(sec / 60)).padStart(2, "0")}:{String(sec % 60).padStart(2, "0")} /{" "}
        {String(Math.floor(total / 60)).padStart(2, "0")}:{String(total % 60).padStart(2, "0")}
      </div>
    </AbsoluteFill>
  );
};

export const TransformerExplained: React.FC = () => {
  return (
    <AbsoluteFill style={{background: C.bg}}>
      <Audio src={staticFile("audio2/bgm.wav")} volume={0.15} />
      {SHOTS.map((shot, i) => (
        <Sequence key={shot.id} from={shot.start} durationInFrames={shot.frames} name={`${shot.id} ${shot.chapter}`}>
          <ShotShell shot={shot} index={i} />
        </Sequence>
      ))}
      <Chrome />
    </AbsoluteFill>
  );
};

export const TRANSFORMER_EXPLAINED_FRAMES = TOTAL_FRAMES;
