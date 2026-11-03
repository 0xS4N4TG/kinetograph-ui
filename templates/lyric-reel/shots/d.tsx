// Shot D, back in the stars. Timing follows the reference: black with streaks rushing past (f352 to f362), a line of
// words on nulls the camera travels along with heavy streaks and a flare passing close (f358 to f420), then the
// camera rises to the last stack, its words landing letter by letter over one another (f432 to f510), black at f517.

import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Layer, Rect, radialGradient } from '@kinetographdev/core';
import { keys } from '../../../kit/core/timing.js';
import { H, W } from '../lib.js';
import { Plane, Sky, Word, rigAt } from '../type.js';
import type { Placed, RigKey } from '../type.js';
import { LINES } from '../words.js';

export const D_START = 352;

// the line: x, y, z, size, rotateY
const LINE: [number, number, number, number, number][] = [
  [-700, 0, 0, 80, -20],
  [-560, 30, -80, 70, -20],
  [-430, -10, 60, 66, -25],
  [-300, 40, -40, 88, -20],
  [-150, 0, 40, 72, -25],
  [0, 30, 0, 96, -20],
];
// the stack: x, y, size
const STACK: [number, number, number][] = [
  [180, -360, 150],
  [200, -268, 96],
  [160, -190, 124],
  [120, -80, 158],
  [100, 40, 176],
];

const RIG: RigKey[] = [
  [352, { x: -1000, y: 700, zoom: 1.4, roll: -35, turnY: 20, turnX: 0, dolly: -400 }],
  [362, { x: -760, y: 40, dolly: 0, roll: -30 }],
  [380, { x: -560, y: 0, roll: -40 }],
  [400, { x: -300, y: 20, roll: -32, turnY: 25 }],
  [420, { x: -120, y: -40, zoom: 1.6, roll: -35 }],
  [440, { x: 200, y: -170, roll: -30, zoom: 2.1 }],
  [470, { x: 280, y: -220, roll: -28, zoom: 2.0 }],
  [500, { x: 300, y: -200, zoom: 2.15, roll: -25 }],
  [521, { x: 310, y: -190, zoom: 2.25 }],
];
const rig = (f: number) => rigAt(f, RIG);

export const ShotD: React.FC = () => {
  const f = useCurrentFrame() + D_START;
  const [line, stack] = LINES.d;
  const words: Placed[] = [
    ...line.map((w, i) => ({ ...w, x: LINE[i][0], y: LINE[i][1], z: LINE[i][2], size: LINE[i][3], rotateY: LINE[i][4] })),
    ...stack.map((w, i) => ({ ...w, x: STACK[i][0], y: STACK[i][1], size: STACK[i][2] })),
  ];
  const fade = keys(f, [[352, 0], [358, 1], [514, 1], [517, 0]]);
  return (
    <Layer opacity={fade}>
      <Rect width={W} height={H} fill="#020203" />
      <Rect width={W} height={H} fill={radialGradient(['#4a4e68', [0.35, '#1a1c29'], [1, 'rgba(8,8,12,0)']], { cx: 1.0, cy: 1.08, r: 0.8 })} />
      <Sky seed="d" rig={rig} f={f} count={340} color="#cfeaff" />
      <Plane id="d-plane" rig={rig(f)}>
        {words.map((w, i) => (
          <Word key={i} w={w} f={f} />
        ))}
      </Plane>
    </Layer>
  );
};
