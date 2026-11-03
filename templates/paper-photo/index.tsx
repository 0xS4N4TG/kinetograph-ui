// The paper plugin's photo effects: a picture with alpha as a paper cut-out (`Edges`: the four edge styles side by
// side, on white, kraft and newsprint) and balled up, opening out (`FoldOut` on a green screen, `FoldOutDesk` on a grey desk).
//
// Render from the kinetograph-ui root:
//   node ../kinetograph/packages/cli/dist/cli.js render templates/paper-photo/index.tsx --comp FoldOut -o templates/paper-photo/out/fold-out.mp4

import React from 'react';
import { AbsoluteFill, Composition, registerRoot, staticFile } from 'remotion';
import { CutOut, FoldOut, Paper, unfolds } from '../../plugins/paper/src/index.js';

const W = 1080;
const H = 1920;
const FPS = 30;
const SUBJECT = staticFile('subject.png');

// both fold-out compositions open at frame 8: a crinkle on each step, a soft thump as it lands
unfolds({ fps: FPS, delay: 8 });

const EDGE_STYLES = [
  ['torn', 'white'],
  ['cut', 'kraft'],
  ['wavy', 'newsprint'],
  ['sticker', 'white'],
] as const;

const Edges: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: '#2f8a46' }}>
    {EDGE_STYLES.map(([edge, stock], i) => (
      <CutOut key={edge} id={`cut-${edge}`} src={SUBJECT} edge={edge} stock={stock} width={440} x={W * (i % 2 ? 0.74 : 0.26)} y={H * (i < 2 ? 0.3 : 0.7)} seed={i} />
    ))}
  </AbsoluteFill>
);

const Green: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: '#2f8a46' }}>
    <FoldOut src={SUBJECT} width={860} delay={8} />
  </AbsoluteFill>
);

const Desk: React.FC = () => (
  <AbsoluteFill>
    <Paper w={W} h={H} tint="#d9d6cf" seed={3} crumple={0.6} />
    <FoldOut src={SUBJECT} width={860} delay={8} seed={2} />
  </AbsoluteFill>
);

registerRoot(() => (
  <>
    <Composition id="FoldOut" component={Green} durationInFrames={60} fps={FPS} width={W} height={H} />
    <Composition id="FoldOutDesk" component={Desk} durationInFrames={60} fps={FPS} width={W} height={H} />
    <Composition id="Edges" component={Edges} durationInFrames={1} fps={FPS} width={W} height={H} />
  </>
));
