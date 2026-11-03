// Shot B, the orange band. Timing follows the reference frame for frame: the stars' glints fade into an orange field
// as dark bars close in (f155 to f172), black words arrive in two staggered rows while the camera pans along them,
// whipping twice (f205, f238), the bars open (f225 to f234), and the frame goes out of focus (f252 to f262).

import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Layer, Rect, linearGradient, radialGradient } from '@kinetographdev/core';
import { keys } from '../../../kit/core/timing.js';
import { H, W } from '../lib.js';
import { Plane, SANS, Sky, Word, rigAt } from '../type.js';
import type { Placed, RigKey } from '../type.js';
import { LINES } from '../words.js';

export const B_START = 155;
export const B_END = 262;

const SIZE = 100;
const ROW = [0, 80];
/** each word's left end and row, world pixels */
const PLACE: [number, number][] = [
  [0, 0],
  [60, 1],
  [330, 0],
  [380, 1],
  [640, 0],
  [700, 1],
  [960, 0],
  [1010, 1],
];

const RIG: RigKey[] = [
  [155, { x: 60, y: 30, zoom: 1.85 * 0.98 }],
  [190, { x: 200 }],
  [200, { x: 250 }],
  [208, { x: 470 }],
  [222, { x: 540 }],
  [232, { x: 690, zoom: 1.85 * 1.05 }],
  [240, { x: 950, zoom: 1.85 * 1.12 }],
  [262, { x: 1120, zoom: 1.85 * 1.16 }],
];

export const ShotB: React.FC = () => {
  const f = useCurrentFrame() + B_START;
  const words: Placed[] = LINES.b.map((w, i) => ({
    ...w,
    x: PLACE[i][0],
    y: ROW[PLACE[i][1]],
    size: SIZE,
    face: ['#0b0704'],
    edge: 'none',
  }));
  const bars = keys(f, [[155, 0], [166, 120], [173, 300], [232, 300], [236, 220], [244, 0]]);
  const defocus = keys(f, [[252, 0], [262, 26]]);
  const fadeIn = keys(f, [[155, 0], [160, 1]]);
  const glints = keys(f, [[158, 1], [175, 0]]);
  return (
    <Layer opacity={fadeIn}>
      <Rect width={W} height={H} fill={linearGradient(['#ff9c1a', '#f8840c', '#f07a12'], { angle: 160 })} />
      <Rect width={W} height={H} fill={radialGradient(['#ffb030', [1, 'rgba(255,160,40,0)']], { cx: 0.8, cy: 0.15, r: 0.6 })} opacity={0.7} />
      <Rect width={W} height={H} fill={radialGradient(['#e2702e', [1, 'rgba(226,112,46,0)']], { cx: 0.95, cy: 0.95, r: 0.5 })} opacity={0.6} />
      {glints > 0.01 ? <Sky seed="b-glint" rig={(t) => rigAt(t, RIG)} f={f} count={120} opacity={glints} /> : null}
      <Sky seed="b-dust" rig={(t) => rigAt(t, RIG)} f={f} count={170} dark defocus={defocus} />
      <Plane id="b-plane" rig={rigAt(f, RIG)} defocus={defocus} shutter={1.2}>
        {words.map((w, i) => (
          <Word key={i} w={w} f={f} />
        ))}
      </Plane>
      {bars > 0.5 ? (
        <Layer>
          <Rect width={W} height={bars} fill="#121212" />
          <Rect y={H - bars} width={W} height={bars} fill="#121212" />
        </Layer>
      ) : null}
    </Layer>
  );
};
