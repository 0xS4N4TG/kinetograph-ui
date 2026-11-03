// Eight arrangements of photos with a camera move each.
//
//   node ../kinetograph/packages/cli/dist/cli.js still components/grids/index.tsx 60 --comp GridRect -o components/grids/out/rect.png
import React from 'react';
import { Composition, registerRoot } from '@kinetographdev/core';
import { FPS, H, W } from './kit.js';
import { Radial, RADIAL_DURATION, radialDefaults, radialSchema } from './radial.js';
import { PathGrid, PATH_DURATION, pathDefaults, pathSchema } from './path.js';
import { PathOrient, PATH_ORIENT_DURATION, pathOrientDefaults, pathOrientSchema } from './path-orient.js';
import { Spherical, SPHERICAL_DURATION, sphericalDefaults, sphericalSchema } from './spherical.js';
import { ForwardOrient, FORWARD_DURATION, forwardOrientDefaults, forwardOrientSchema } from './forward-orient.js';
import { CenterOrient, CENTER_DURATION, centerOrientDefaults, centerOrientSchema } from './center-orient.js';
import { FaceScreen, FACE_DURATION, faceScreenDefaults, faceScreenSchema } from './face-screen.js';
import { Rectangular, RECT_DURATION, rectangularDefaults, rectangularSchema } from './rectangular.js';

registerRoot(() => (
  <>
    <Composition id="GridRect" component={Rectangular} schema={rectangularSchema} defaultProps={rectangularDefaults} durationInFrames={RECT_DURATION} fps={FPS} width={W} height={H} />
    <Composition id="GridRadial" component={Radial} schema={radialSchema} defaultProps={radialDefaults} durationInFrames={RADIAL_DURATION} fps={FPS} width={W} height={H} />
    <Composition id="GridPath" component={PathGrid} schema={pathSchema} defaultProps={pathDefaults} durationInFrames={PATH_DURATION} fps={FPS} width={W} height={H} />
    <Composition id="GridPathOrient" component={PathOrient} schema={pathOrientSchema} defaultProps={pathOrientDefaults} durationInFrames={PATH_ORIENT_DURATION} fps={FPS} width={W} height={H} />
    <Composition id="GridSpherical" component={Spherical} schema={sphericalSchema} defaultProps={sphericalDefaults} durationInFrames={SPHERICAL_DURATION} fps={FPS} width={W} height={H} />
    <Composition id="GridForwardOrient" component={ForwardOrient} schema={forwardOrientSchema} defaultProps={forwardOrientDefaults} durationInFrames={FORWARD_DURATION} fps={FPS} width={W} height={H} />
    <Composition id="GridCenterOrient" component={CenterOrient} schema={centerOrientSchema} defaultProps={centerOrientDefaults} durationInFrames={CENTER_DURATION} fps={FPS} width={W} height={H} />
    <Composition id="GridFaceScreen" component={FaceScreen} schema={faceScreenSchema} defaultProps={faceScreenDefaults} durationInFrames={FACE_DURATION} fps={FPS} width={W} height={H} />
  </>
));
