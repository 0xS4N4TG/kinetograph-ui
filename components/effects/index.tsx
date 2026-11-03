// Effects with taste: a light leak, halation, a glass lens and a film burn, each wrapping a picture (or any children).
// 1920x1080 at 30 fps. They are Kinetograph `shader` effects (WGSL), so every frame is a pure function of the frame.
//
//   node ../kinetograph/packages/cli/dist/cli.js still components/effects/index.tsx 60 --comp LightLeak -o components/effects/out/leak.png
//   node ../kinetograph/packages/cli/dist/cli.js render components/effects/index.tsx --comp LightLeak -o components/effects/out/light-leak.mp4

import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { FilmBurn, filmBurnDefaults, filmBurnSchema } from './filmburn.js';
import { GlassLens, glassLensDefaults, glassLensSchema } from './glasslens.js';
import { Halation, halationDefaults, halationSchema } from './halation.js';
import { LightLeak, lightLeakDefaults, lightLeakSchema } from './lightleak.js';

const common = { width: 1920, height: 1080, fps: 30 } as const;

const Root: React.FC = () => (
  <>
    <Composition id="LightLeak" component={LightLeak} schema={lightLeakSchema} defaultProps={lightLeakDefaults} durationInFrames={150} {...common} />
    <Composition id="Halation" component={Halation} schema={halationSchema} defaultProps={halationDefaults} durationInFrames={150} {...common} />
    <Composition id="GlassLens" component={GlassLens} schema={glassLensSchema} defaultProps={glassLensDefaults} durationInFrames={150} {...common} />
    <Composition id="FilmBurn" component={FilmBurn} schema={filmBurnSchema} defaultProps={filmBurnDefaults} durationInFrames={150} {...common} />
  </>
);

registerRoot(Root);
