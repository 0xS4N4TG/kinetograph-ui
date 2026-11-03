// Shot 11 (frames 412-452): close on the notification. The two cards rise in from below, the back one tilted and
// paler, the "a" of "gonna" on the left; they drift up, the stack closing, and are whipped up out of frame. Screen
// pixels, the cards at their design size, measured on the reference.

import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Layer, Rect, Text, blur } from '@kinetographdev/core';
import { measureText } from '@kinetographdev/core/layout-utils';
import { PAPER, TEXT, UI, ramp } from '../lib.js';
import { NoticeCard, spline } from './c-ui.js';

const F0 = 412;
const FRONT_X = 100;
const WORD = 157; // "gonna" at the close-up's scale: its "a" has an 86 px x-height

const FRONT_Y: [number, number][] = [
  [412, 1100], [414, 860], [416, 621], [418, 526], [420, 472], [423, 410], [427, 370], [433, 345], [440, 316],
  [445, 238], [448, 86], [451, -250], [453, -560],
];
const BACK_Y: [number, number][] = [
  [412, 715], [414, 500], [416, 378], [418, 310], [420, 256], [423, 216], [427, 184], [433, 175], [440, 148],
  [445, 121], [448, -40], [451, -380], [453, -700],
];

export const Notice: React.FC = () => {
  const f = useCurrentFrame() + F0;
  const front = spline(f, FRONT_Y);
  const back = spline(f, BACK_Y);
  const gonnaW = measureText({ text: 'gonna', fontFamily: UI, fontSize: WORD, fontWeight: '500' }).width;

  return (
    <Layer>
      <Rect width={1080} height={810} fill={PAPER} />
      <Layer id="s11-stack" motionBlur={{ samples: 16, shutter: f < 415 || f > 446 ? 1 : 0.3 }}>
        <Layer x={spline(f, [[414, 162], [416, 148]])} y={back} rotation={spline(f, [[414, 7], [416, 5], [420, 4], [433, 3], [445, 2]])}
          // the back card falls out of focus as the front one settles
          effects={[blur(ramp(f, 421, 440, 0.6, 6.5, (t) => t * t))]}
        >
          <NoticeCard dim={ramp(f, 416, 423, 0, 0.15)} now={false} />
        </Layer>
        <Layer y={front}>
          <Text font={UI} weight={500} size={WORD} color={TEXT} x={54 - gonnaW} y={130 - WORD * 0.7}>
            gonna
          </Text>
          <Layer x={FRONT_X}>
            <NoticeCard now={false} />
          </Layer>
        </Layer>
      </Layer>
    </Layer>
  );
};
