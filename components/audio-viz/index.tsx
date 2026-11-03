// Audio visualisers: the same audio drawn several times in different styles, colours and offsets, stacked under two
// glows with grain on top. Portrait 1080x1920 at 30 fps; the clip runs the length of the audio (12 s for the bundled beat).
//
//   node ../kinetograph/packages/cli/dist/cli.js still components/audio-viz/index.tsx 120 --comp AudioScope -o components/audio-viz/out/scope.png
//   node ../kinetograph/packages/cli/dist/cli.js render components/audio-viz/index.tsx --comp AudioScope -o components/audio-viz/out/scope.mp4

import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { AudioViz, audioVizSchema, plasmaDefaults, scopeDefaults } from './audio-viz.js';

const common = { component: AudioViz, schema: audioVizSchema, width: 1080, height: 1920, fps: 30, durationInFrames: 360 } as const;

const Root: React.FC = () => (
  <>
    <Composition id="AudioScope" {...common} defaultProps={scopeDefaults} />
    <Composition id="AudioPlasma" {...common} defaultProps={plasmaDefaults} />
  </>
);

registerRoot(Root);
