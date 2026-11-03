// Shot A, night sky. Timing and moves follow the reference frame for frame: a stack of silver words builds down a
// tilted plane as the camera sinks with it (f16 to f84), the camera drops away fast and the stack leaves the top
// of the frame (f84 to f94), the stars go out of focus (f92 to f106), a second stack builds and the plane turns
// over in 3D as the camera falls past it (f124 to f155).

import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Layer, Rect, radialGradient } from '@kinetographdev/core';
import { measureText } from '@remotion/layout-utils';
import { keys } from '../../../kit/core/timing.js';
import { H, W } from '../lib.js';
import { Plane, SANS, Sky, Word, rigAt } from '../type.js';
import type { Placed, RigKey } from '../type.js';
import { LINES } from '../words.js';

export const A_END = 155;

const RIG: RigKey[] = [
  [0, { x: 20, y: -420, zoom: 1.76, roll: -6, turnY: 18, turnX: 0 }],
  [16, { x: 30, y: -40, roll: -12 }],
  [40, { x: 40, y: 40, roll: -14 }],
  [64, { x: 50, y: 120, roll: -15, turnY: 22 }],
  [74, { x: 60, y: 160, zoom: 1.85 }],
  [84, { x: 70, y: 330, zoom: 2.13, roll: -20 }],
  [92, { x: 60, y: 760, zoom: 2.50, roll: -12 }],
  [100, { x: 20, y: 1170, zoom: 1.85, roll: -4, turnY: 8 }],
  [124, { x: 30, y: 1260, roll: -10, turnY: 14, turnX: 0 }],
  [134, { x: 40, y: 1350, turnY: 58, turnX: 35, roll: -22 }],
  [142, { x: 20, y: 1440, turnY: 20, turnX: -15, roll: -28, zoom: 2.31 }],
  [155, { x: 0, y: 1520, zoom: 2.96, roll: -30 }],
];
const rig = (f: number) => rigAt(f, RIG);

const width = (text: string, size: number) =>
  measureText({ text, fontFamily: SANS, fontSize: size, fontWeight: '700' }).width - (Array.from(text).length - 1) * 0.055 * size;

/** [line x, line y, size, words on the line] for the two stacks */
const STACK_1: [number, number, number, number][] = [
  [0, 0, 78, 1],
  [-30, 92, 124, 1],
  [-40, 168, 74, 3],
  [10, 262, 116, 1],
  [20, 378, 132, 1],
  [30, 462, 92, 1],
];
const STACK_2: [number, number, number, number][] = [
  [-80, 1200, 82, 1],
  [-110, 1288, 112, 1],
  [-100, 1374, 92, 1],
  [-60, 1476, 124, 1],
  [-40, 1558, 92, 1],
];

function place(words: { text: string; at: number }[], lines: [number, number, number, number][]): Placed[] {
  const out: Placed[] = [];
  let i = 0;
  for (const [x0, y, size, count] of lines) {
    let x = x0;
    for (let k = 0; k < count && i < words.length; k++, i++) {
      out.push({ ...words[i], x, y, size });
      x += width(words[i].text, size) + size * 0.22;
    }
  }
  return out;
}

export const ShotA: React.FC = () => {
  const f = useCurrentFrame();
  const words = [...place(LINES.a[0], STACK_1), ...place(LINES.a[1], STACK_2)];
  const defocus = keys(f, [[88, 0], [95, 18], [102, 8], [106, 0], [146, 0], [155, 22]]);
  const fadeIn = keys(f, [[0, 0], [8, 1]]);
  return (
    <Layer opacity={fadeIn}>
      <Rect width={W} height={H} fill="#020203" />
      <Rect width={W} height={H} fill={radialGradient(['#4a4e68', [0.35, '#1a1c29'], [1, 'rgba(8,8,12,0)']], { cx: 1.0, cy: 1.08, r: 0.8 })} />
      <Sky seed="a" rig={rig} f={f} defocus={defocus} count={340} />
      <Plane id="a-plane" rig={rig(f)} defocus={defocus * 0.7}>
        {words.map((w, i) => (
          <Word key={i} w={w} f={f} />
        ))}
      </Plane>
    </Layer>
  );
};
