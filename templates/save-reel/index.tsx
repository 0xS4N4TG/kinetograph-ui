// A 39 s app-concept reel ("what if your saves came back when you need them"): a post
// is liked and saved, the save is lost in the collection, and a save reminder brings it back. Flat UI on a pale
// canvas, a camera that pushes in and whips between details with heavy motion blur, word-by-word type on dark
// gradients, hand-written ink notes, letterbox bars that open and close with the shots.
//
// Timing is the reference's, measured frame by frame at 30 fps (each shot's `from` below and the frames inside
// the shots are reference frames). The reference reel (not committed) goes in reference/reel.mp4.
//
// Render from the kinetograph-ui root:
//   node ../kinetograph/packages/cli/dist/cli.js strip templates/save-reel/index.tsx -n 12 -o templates/save-reel/out/strip.png
//   node ../kinetograph/packages/cli/dist/cli.js render templates/save-reel/index.tsx -o templates/save-reel/out/save-reel.mp4

import React from 'react';
import { AbsoluteFill, Composition, Sequence, registerRoot, useCurrentFrame } from 'remotion';
import { TasteProvider } from '../../kit/core/taste.js';
import { Letterbox } from '../../kit/core/camera.js';
import { paleWhip } from '../../tastes/pale-whip.js';
import { BARS, DURATION, FPS, H, W } from './lib.js';
import type { Media } from './lib.js';
import { Post } from './shots/s01.js';
import { FeedWhip } from './shots/s02.js';
import { JustLikeThat } from './shots/s03.js';
import { InYour } from './shots/s04.js';
import { Grid } from './shots/s05.js';
import { Collection } from './shots/s06.js';
import { WhatIf } from './shots/s07.js';
import { SaveReminders } from './shots/s08.js';
import { AndDone } from './shots/s09.js';
import { Gonna } from './shots/s10.js';
import { Notice } from './shots/s11.js';
import { Feed } from './shots/s12.js';
import { Photo } from './shots/s13.js';
import { Forever } from './shots/s14.js';
import { EndCard } from './shots/s15.js';
import './sound.js';

// [component, first frame, last frame (exclusive)]; neighbours overlap where the reference cross-blurs
export const SHOTS: [React.FC<{ media: Media }>, number, number][] = [
  [Post, 0, 62],
  [FeedWhip, 54, 82],
  [JustLikeThat, 80, 135],
  [InYour, 134, 153],
  [Grid, 150, 181],
  [Collection, 176, 198],
  [WhatIf, 197, 241],
  [SaveReminders, 240, 343],
  [AndDone, 342, 373],
  [Gonna, 372, 413],
  [Notice, 412, 453],
  [Feed, 447, 561],
  [Photo, 560, 761],
  [Forever, 740, 946],
  [EndCard, 939, DURATION],
];

export interface SaveReelProps {
  media: Media;
}

export const SaveReel: React.FC<SaveReelProps> = ({ media }) => {
  const frame = useCurrentFrame();
  return (
    <TasteProvider taste={paleWhip}>
      <AbsoluteFill style={{ backgroundColor: '#000' }}>
        {SHOTS.map(([Shot, from, to], i) => (
          <Sequence key={i} from={from} durationInFrames={to - from}>
            <Shot media={media} />
          </Sequence>
        ))}
        <Letterbox frame={frame} bars={BARS} />
      </AbsoluteFill>
    </TasteProvider>
  );
};

registerRoot(() => (
  <Composition
    id="SaveReel"
    component={SaveReel}
    durationInFrames={DURATION}
    fps={FPS}
    width={W}
    height={H}
    defaultProps={{ media: {} }}
  />
));
