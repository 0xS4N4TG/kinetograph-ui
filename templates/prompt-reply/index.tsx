// PromptReply: a short UI promo, timed to a measured 5 s reference. A chat prompt types itself into a rounded
// box and sends; the shot cuts to the agent's reply, which builds up on a scrolling page: two activity rows, a status
// line, a serif reply, a brand chip, a small table and the action icons. Dark grey UI, a warm tint on fresh type.
//
// Timing is the reference's, measured frame by frame at 60 fps. The reference (not committed) goes in
// reference/reel.mp4. Everything you see is a prop (text, colours, fonts); see README.md.
//
// Render from the kinetograph-ui root:
//   node ../kinetograph/packages/cli/dist/cli.js strip templates/prompt-reply/index.tsx -n 12 -o templates/prompt-reply/out/strip.png
//   node ../kinetograph/packages/cli/dist/cli.js render templates/prompt-reply/index.tsx -o templates/prompt-reply/out/prompt-reply.mp4

import React from 'react';
import { Composition, Layer, Rect, registerRoot, useCurrentFrame } from '@kinetographdev/core';
import { CUT, DURATION, FPS, HEIGHT, STAGE_SCALE, WIDTH, defaultProps, loadFaces } from './lib.js';
import type { PromptReplyProps } from './lib.js';
import { PromptShot } from './prompt.js';
import { ReplyShot } from './reply.js';

export const PromptReply: React.FC<PromptReplyProps> = (props) => {
  const f = useCurrentFrame();
  const faces = loadFaces(props.fonts);
  return (
    <Layer id="stage">
      <Rect id="page" width={WIDTH} height={HEIGHT} fill={props.colors.background} />
      <Layer id="ref-pixels" scale={STAGE_SCALE}>
        {f < CUT ? <PromptShot f={f} props={props} faces={faces} /> : <ReplyShot f={f} props={props} faces={faces} />}
      </Layer>
    </Layer>
  );
};

registerRoot(() => (
  <Composition
    id="PromptReply"
    component={PromptReply}
    durationInFrames={DURATION}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
    defaultProps={defaultProps}
  />
));
