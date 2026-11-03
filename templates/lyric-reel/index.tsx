// A kinetic-type lyric reel in four looks, built to a reference reel's camera work, timing and
// textures: silver words stacking in a night sky full of glinting stars that streak when the camera moves, black type
// on an orange band between letterbox bars, small blue words turning in the clouds, and a finale back in the stars.
// Words sit on nulls in 3D and one camera moves through them (type.tsx). The song plays from 16.04 s in.
//
// The words are placeholders (words.ts); the song is not committed (public/song.mp3).
//
// Render from the kinetograph-ui root:
//   node ../kinetograph/packages/cli/dist/cli.js strip templates/lyric-reel/index.tsx -n 12 -o templates/lyric-reel/out/strip.png
//   node ../kinetograph/packages/cli/dist/cli.js render templates/lyric-reel/index.tsx -o templates/lyric-reel/out/lyric-reel.mp4

import React from 'react';
import { AbsoluteFill, Audio, Composition, Sequence, interpolate, registerRoot, staticFile } from 'remotion';
import { DURATION, FPS, H, SONG_START, W } from './lib.js';
import { A_END, ShotA } from './shots/a.js';
import { B_END, B_START, ShotB } from './shots/b.js';
import { C_END, C_START, ShotC } from './shots/c.js';
import { D_START, ShotD } from './shots/d.js';

export const LyricReel: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: '#000' }}>
    <Sequence from={0} durationInFrames={A_END}>
      <ShotA />
    </Sequence>
    <Sequence from={B_START} durationInFrames={B_END - B_START}>
      <ShotB />
    </Sequence>
    <Sequence from={C_START} durationInFrames={C_END - C_START}>
      <ShotC />
    </Sequence>
    <Sequence from={D_START} durationInFrames={DURATION - D_START}>
      <ShotD />
    </Sequence>
    <Audio
      src={staticFile('song.mp3')}
      trimBefore={Math.round(SONG_START * FPS)}
      volume={(f) => interpolate(f, [DURATION - 12, DURATION], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
    />
  </AbsoluteFill>
);

registerRoot(() => (
  <Composition id="LyricReel" component={LyricReel} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
));
