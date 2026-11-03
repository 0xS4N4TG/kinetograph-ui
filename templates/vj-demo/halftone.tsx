// The vj plugin's halftone poster on Fred Ott's Sneeze (1894) and its matte. `Poster` runs three posters in a row: the
// whole picture printed blue on yellow; Fred cut out in dots on a blue ground with the film's own word behind him; and
// two panels side by side, each its own ink pair, with an off-register shadow and a title over the top. `Look` is the
// look on its own, `halftonePoster()` as layer effects on the 1927 parade.
//
//   node ../kinetograph/packages/cli/dist/cli.js render templates/vj-demo/halftone.tsx --comp Poster -o templates/vj-demo/out/halftone.mp4

import React from 'react';
import { AbsoluteFill, Composition, Sequence, registerRoot, staticFile } from 'remotion';
import { Layer, Video } from '@kinetographdev/core';
import { HalftonePoster, halftonePoster } from '../../plugins/vj/src/index.js';

const W = 1920;
const H = 1080;
const FPS = 30;
const SEG = 60;
const FRED = staticFile('fred.mp4');
const MATTE = staticFile('fred-matte.mp4');

const Poster: React.FC = () => (
  <AbsoluteFill style={{ background: '#000' }}>
    <Sequence durationInFrames={SEG}>
      <HalftonePoster id="plain" src={FRED} panels={[{ ink: '#1d3fd1', paper: '#f4d63a' }]} size={11} punch={1.8} />
    </Sequence>
    <Sequence from={SEG} durationInFrames={SEG}>
      <HalftonePoster id="cut" src={FRED} matte={MATTE} trimBefore={20} size={10} punch={1.9} backdrop="dots"
        panels={[{ ink: '#14215c', paper: '#f2e24a', ground: '#2f6fe0' }]}
        title={{ text: 'sneeze', color: '#f2e24a', size: 460, y: 0.42 }} />
    </Sequence>
    <Sequence from={SEG * 2} durationInFrames={SEG}>
      <HalftonePoster id="split" src={FRED} matte={MATTE} trimBefore={50} size={9} punch={1.8} offset={[-26, 14]}
        panels={[
          { x: [0, 0.42], ink: '#10284a', paper: '#efe6d2', ground: '#141414', shadow: '#2bb3a8' },
          { x: [0.42, 1], ink: '#4a0f1e', paper: '#f2a7b6', ground: '#d8322f', shadow: '#2b4bd6' },
        ]}
        changes={[{ at: 30, panels: [
          { x: [0, 0.58], ink: '#3a1060', paper: '#c9f04a', ground: '#7a2fd6', shadow: '#ff4f9a' },
          { x: [0.58, 1], ink: '#0b0b0b', paper: '#f6f2e8', ground: '#f05a28', shadow: '#1d3fd1' },
        ] }]}
        title={{ text: 'halftone', color: '#ffffff', size: 250, y: 0.8, over: true }} />
    </Sequence>
  </AbsoluteFill>
);

const Look: React.FC = () => (
  <AbsoluteFill style={{ background: '#000' }}>
    <Layer id="parade" effects={halftonePoster({ ink: '#16124a', paper: '#ffb3c7', size: 8, punch: 1.6, bias: -0.22 })}>
      <Video id="parade-clip" src={staticFile('veteran.mp4')} width={W} height={H} fit="cover" muted />
    </Layer>
  </AbsoluteFill>
);

registerRoot(() => (
  <>
    <Composition id="Poster" component={Poster} durationInFrames={SEG * 3} fps={FPS} width={W} height={H} />
    <Composition id="Look" component={Look} durationInFrames={77} fps={FPS} width={W} height={H} />
  </>
));
