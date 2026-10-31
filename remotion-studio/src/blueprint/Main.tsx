import React from "react";
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from "remotion";
import {C, Caption, MONO, Spine, STAGE_H, STAGE_W, STAGE_X} from "./layout";
import {SHOTS, TOTAL_FRAMES, type Shot} from "./timeline.generated";
import {C01, C02, C03, C04} from "./shots-a";
import {C05, C06, C07, C08} from "./shots-b";
import {C09, C10, C11, C12} from "./shots-c";

const COMPONENTS: React.FC<{shot: Shot}>[] = [C01, C02, C03, C04, C05, C06, C07, C08, C09, C10, C11, C12];

const currentShot = (frame: number) => {
  for (let i = SHOTS.length - 1; i >= 0; i--) {
    if (frame >= SHOTS[i].start) return {shot: SHOTS[i], index: i, local: frame - SHOTS[i].start};
  }
  return {shot: SHOTS[0], index: 0, local: 0};
};

/** 图纸比例尺：顶部刻度 + 游标 */
const Ruler: React.FC = () => {
  const frame = useCurrentFrame();
  const p = frame / (TOTAL_FRAMES - 1);
  return (
    <div style={{position: "absolute", left: STAGE_X, top: 0, width: STAGE_W, height: 24, pointerEvents: "none"}}>
      <div style={{position: "absolute", left: 0, right: 0, top: 22, height: 1, background: C.lineFaint, opacity: 0.55}} />
      {Array.from({length: 31}).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${(i / 30) * 100}%`,
            top: i % 5 === 0 ? 12 : 17,
            width: 1,
            height: i % 5 === 0 ? 10 : 5,
            background: C.lineFaint,
            opacity: i % 5 === 0 ? 0.7 : 0.4,
          }}
        />
      ))}
      <div style={{position: "absolute", left: `${p * 100}%`, top: 6, width: 2, height: 18, background: C.accent}} />
    </div>
  );
};

/** 全局图签（左上角章号 + 时间码） */
const Stamps: React.FC<{shot: Shot; index: number}> = ({shot, index}) => {
  const frame = useCurrentFrame();
  const sec = Math.floor(frame / 30);
  const total = Math.floor(TOTAL_FRAMES / 30);
  return (
    <>
      <div style={{position: "absolute", left: STAGE_X + 24, top: 36, fontFamily: MONO, fontSize: 12, letterSpacing: 3, color: C.lineDim, opacity: 0.8}}>
        {shot.chapter}
      </div>
      <div style={{position: "absolute", left: STAGE_X + STAGE_W - 150, top: 36, fontFamily: MONO, fontSize: 12, letterSpacing: 2, color: C.lineFaint}}>
        {String(index + 1).padStart(2, "0")} / 12　·　{String(Math.floor(sec / 60)).padStart(2, "0")}:{String(sec % 60).padStart(2, "0")}
      </div>
    </>
  );
};

const ShotShell: React.FC<{shot: Shot; index: number}> = ({shot, index}) => {
  const frame = useCurrentFrame();
  const fade = Math.min(1, frame / 9, (shot.frames - frame) / 9);
  const Comp = COMPONENTS[index];

  return (
    <AbsoluteFill style={{opacity: Math.max(0, Math.min(1, fade))}}>
      <Comp shot={shot} />
      {shot.sentences.map((s, k) => (
        <Sequence key={k} from={s.start} durationInFrames={s.frames} name={`${shot.id}-${k + 1}`}>
          <Audio src={staticFile(`audio3/${s.audio}.mp3`)} volume={1} />
          <Caption text={s.text} accent={shot.accent} total={s.frames} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

export const TransformerBlueprint: React.FC = () => {
  const frame = useCurrentFrame();
  const {shot, index, local} = currentShot(frame);

  return (
    <AbsoluteFill style={{background: C.bg}}>
      <Audio src={staticFile("audio3/bgm.wav")} volume={0.14} />

      {SHOTS.map((s, i) => (
        <Sequence key={s.id} from={s.start} durationInFrames={s.frames} name={`${s.id} ${s.chapter}`}>
          <ShotShell shot={s} index={i} />
        </Sequence>
      ))}

      {/* 常驻层：论证脊柱 + 图签 + 比例尺 */}
      <Spine
        shotId={shot.id}
        sheet={index + 1}
        total={SHOTS.length}
        title={shot.title}
        kicker={shot.kicker}
        bullets={shot.bullets}
        bulletAt={shot.bulletAt}
        accent={shot.accent}
        hero={shot.hero}
        localFrame={local}
      />
      <Stamps shot={shot} index={index} />
      <Ruler />
      <div style={{position: "absolute", left: STAGE_X, top: 0, width: 1, height: STAGE_H, background: C.lineFaint, opacity: 0.4}} />
    </AbsoluteFill>
  );
};

export const BP_FRAMES = TOTAL_FRAMES;
