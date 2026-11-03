// Shot C, the clouds. Timing follows the reference: out of focus into a bright sky (f262 to f278), small blue words on
// their own nulls at different depths and angles while the camera turns round them, the sky blowing out white as it
// swings (f292 to f305), then settling on the last words (f330 to f352).

import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Layer, Noise, Rect, blur, gradientMap } from '@kinetographdev/core';
import { keys } from '../../../kit/core/timing.js';
import { H, W } from '../lib.js';
import { Plane, Word, rigAt } from '../type.js';
import type { Placed, RigKey } from '../type.js';
import { LINES } from '../words.js';

export const C_START = 262;
export const C_END = 352;

const BLUE = ['#2448f2', '#1230d6'];

// x, y, z, size, rotate, rotateY per word
const PLACE: [number, number, number, number, number, number][] = [
  [-60, -40, 0, 58, -4, -10],
  [120, 60, -300, 44, 8, 60],
  [-200, 20, 150, 50, 20, -40],
  [80, -120, -150, 40, 80, 0],
  [20, 160, 100, 64, -10, 20],
  [-40, -10, 250, 78, 0, -15],
  [-150, 110, -100, 36, 60, 0],
  [200, 110, 0, 60, 55, 10],
];

const RIG: RigKey[] = [
  [262, { x: 0, y: 0, zoom: 1.6, roll: 10, turnY: -30, turnX: 0, dolly: -200 }],
  [285, { roll: 0, turnY: 10, dolly: 0 }],
  [300, { turnY: 50, turnX: 20, roll: -20, dolly: 150 }],
  [315, { turnY: 10, turnX: -10, roll: 10, dolly: 50 }],
  [330, { turnY: -5, turnX: 0, roll: 0, dolly: 0, x: 20, y: 40 }],
  [352, { dolly: 40 }],
];

/** a bright sky of soft cumulus: fractal noise graded from blue through to blown-out white */
const Clouds: React.FC<{ seed: number; scale: number; x: number; y: number; rotation: number; opacity?: number }> = ({ seed, scale, x, y, rotation, opacity = 1 }) => (
  <Layer x={W / 2 + x} y={H / 2 + y} rotation={rotation} scale={scale} opacity={opacity}>
    <Noise
      x={-1100}
      y={-1100}
      width={2200}
      height={2200}
      channels="gray"
      turbulence={{ type: 'fractalNoise', baseFrequency: 0.0028, numOctaves: 5, seed }}
      effects={[
        gradientMap({
          stops: [
            { offset: 0.2, color: '#5aa2ec' },
            { offset: 0.4, color: '#9fcbf4' },
            { offset: 0.55, color: '#e4f0fc' },
            { offset: 0.68, color: '#ffffff' },
          ],
        }),
        blur(5),
      ]}
    />
  </Layer>
);

export const ShotC: React.FC = () => {
  const f = useCurrentFrame() + C_START;
  const rig = rigAt(f, RIG);
  const words: Placed[] = LINES.c.map((w, i) => {
    const [x, y, z, size, rotate, rotateY] = PLACE[i];
    return { ...w, x, y, z, size, rotate, rotateY, face: BLUE, edge: 'none' };
  });
  const defocus = keys(f, [[262, 26], [268, 16], [280, 0]]);
  const flash = keys(f, [[290, 0], [298, 0.75], [306, 0]]);
  const fadeIn = keys(f, [[262, 0], [267, 1]]);
  return (
    <Layer opacity={fadeIn} effects={defocus > 0.3 ? [blur(defocus)] : []}>
      <Rect width={W} height={H} fill="#cfe4f8" />
      <Clouds seed={4} scale={1.3 + rig.dolly / 900} x={-rig.turnY * 6} y={rig.turnX * 6} rotation={rig.roll * 0.8} />
      <Rect width={W} height={H} fill="#ffffff" opacity={flash} />
      <Plane id="c-plane" rig={rig} shutter={1.4}>
        {words.map((w, i) => (
          <Word key={i} w={w} f={f} />
        ))}
      </Plane>
    </Layer>
  );
};
