import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {WiseAboutLove} from './catalog/remotion/aboutlove.jsx';
const Root=()=> <Composition id="Motion" component={WiseAboutLove}
  width={1920} height={1080} fps={60} durationInFrames={289}
  defaultProps={{"effectId":"type-reveal","speed":1,"variantId":"aboutlove-01"}} />;
registerRoot(Root);
