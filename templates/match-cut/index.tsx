// The paper plugin's match cut, one composition per preset (web, broadsheet, crumpled, clean), and "Screenshots"
// when shots.ts lists any: your own images with the keyword's rough box, snapped to the ink and drawn with
// showKeyBox so a still shows whether the snap held.
//
// Render from the kinetograph-ui root:
//   node ../kinetograph/packages/cli/dist/cli.js render templates/match-cut/index.tsx --comp Web -o templates/match-cut/out/web.mp4

import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { MatchCut, flicks } from '../../plugins/paper/src/index.js';
import { SHOTS } from './shots.js';

const W = 1080;
const H = 1920;
const FPS = 30;
const FRAMES = 150;
const KEYWORD = 'Super Bowl';

// the demo's sound: a flick on every cut at 10 a second, the presets' rate but for crumpled (12) and clean (8)
flicks({ frames: FRAMES, fps: FPS, cutsPerSecond: 10 });

const PRESETS = [
  ['Web', 'web'],
  ['Broadsheet', 'broadsheet'],
  ['Crumpled', 'crumpled'],
  ['Clean', 'clean'],
] as const;

registerRoot(() => (
  <>
    {PRESETS.map(([id, preset]) => (
      <Composition key={id} id={id} component={() => <MatchCut keyword={KEYWORD} preset={preset} />} durationInFrames={FRAMES} fps={FPS} width={W} height={H} />
    ))}
    {SHOTS.length ? (
      <Composition
        id="Screenshots"
        component={() => <MatchCut keyword={KEYWORD} preset="web" screenshots={SHOTS} everyNth={1} showKeyBox />}
        durationInFrames={FRAMES}
        fps={FPS}
        width={W}
        height={H}
      />
    ) : null}
  </>
));
