import React from "react";
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from "remotion";
import {C} from "./theme";
import {SHOT_STARTS, SHOTS, TOTAL_FRAMES} from "./timeline";
import {Chrome} from "./Chrome";
import {Shot1Opening, Shot2RNN, Shot3Mesh} from "./shots-a";
import {Shot4QKV, Shot5Scaling, Shot6MultiHead} from "./shots-b";
import {Shot7Position, Shot8Results, Shot9Outro} from "./shots-c";

/** 每个镜头首尾各 10 帧交叉淡入淡出 */
const ShotFade: React.FC<{frames: number; children: React.ReactNode}> = ({frames, children}) => {
  const f = useCurrentFrame();
  const fade = 10;
  const op = Math.min(1, f / fade, (frames - f) / fade);
  return <AbsoluteFill style={{opacity: Math.max(0, Math.min(1, op))}}>{children}</AbsoluteFill>;
};

const SHOT_COMPONENTS: React.FC<{frames: number}>[] = [
  Shot1Opening,
  Shot2RNN,
  Shot3Mesh,
  Shot4QKV,
  Shot5Scaling,
  Shot6MultiHead,
  Shot7Position,
  Shot8Results,
  Shot9Outro,
];

export const PaperExplain3D: React.FC = () => {
  return (
    <AbsoluteFill style={{background: C.bg}}>
      {/* 环境配乐：全片铺底，音量压低给人声让位 */}
      <Audio src={staticFile("audio/bgm.wav")} volume={0.19} />

      {SHOTS.map((shot, i) => {
        const Comp = SHOT_COMPONENTS[i];
        return (
          <Sequence key={shot.id} from={SHOT_STARTS[i]} durationInFrames={shot.frames} name={`${shot.id} ${shot.chapter}`}>
            <ShotFade frames={shot.frames}>
              <Comp frames={shot.frames} />
            </ShotFade>
            <Audio src={staticFile(`audio/${shot.audio}.mp3`)} volume={1} />
          </Sequence>
        );
      })}

      <Chrome />
    </AbsoluteFill>
  );
};

export const PAPER_EXPLAIN_3D_DURATION = TOTAL_FRAMES;
