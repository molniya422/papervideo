import React from "react";
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from "remotion";
import {Caption, PAL} from "./core";
import {SHOTS, TOTAL_FRAMES, type Shot} from "../blueprint/timeline.generated";
import {HALFTONE_SCENES} from "./scenes";

const ShotShell: React.FC<{shot: Shot; index: number}> = ({shot, index}) => {
  const frame = useCurrentFrame();
  const fade = Math.min(1, frame / 8, (shot.frames - frame) / 8);
  const Comp = HALFTONE_SCENES[index];

  return (
    <AbsoluteFill style={{opacity: Math.max(0, Math.min(1, fade)), background: PAL.bg}}>
      <Comp shot={shot} />
      {shot.sentences.map((s, k) => (
        <Sequence key={k} from={s.start} durationInFrames={s.frames} name={`${shot.id}-${k + 1}`}>
          <Audio src={staticFile(`audio3/${s.audio}.mp3`)} volume={1} />
          <Caption text={s.text} total={s.frames} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

export const TransformerHalftone: React.FC = () => {
  return (
    <AbsoluteFill style={{background: PAL.bg}}>
      <Audio src={staticFile("audio3/bgm.wav")} volume={0.13} />
      {SHOTS.map((shot, i) => (
        <Sequence key={shot.id} from={shot.start} durationInFrames={shot.frames} name={`${shot.id} ${shot.chapter}`}>
          <ShotShell shot={shot} index={i} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

export const HALFTONE_FRAMES = TOTAL_FRAMES;
