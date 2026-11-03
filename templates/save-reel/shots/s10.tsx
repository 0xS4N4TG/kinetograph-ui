// Shot 10 (frames 372-412): "Instagram's gonna [notification] you". The words slide in from the right and settle,
// a pink-tinted, blurred notification drops into the gap, clears, and a second card rises tilted behind it; "you"
// follows; then the whole line is whipped up out of frame. Screen pixels, measured on the reference.

import React from 'react';
import { interpolateColors, useCurrentFrame } from 'remotion';
import { Layer, Rect, Text, blur } from '@kinetographdev/core';
import { measureText } from '@kinetographdev/core/layout-utils';
import { PAPER, TEXT, UI, keys, ramp } from '../lib.js';
import { NOTICE, NoticeStack, spline } from './c-ui.js';

const F0 = 372;
const CENTER_Y = 394;
const PILL = 0.32; // the notification's scale here (its design size is the close-up's in shot 11)

const measure = (text: string, size: number) => measureText({ text, fontFamily: UI, fontSize: size, fontWeight: '500' }).width;

export const Gonna: React.FC = () => {
  const f = useCurrentFrame() + F0;
  // the reference's "Instagram’s" is 221 px wide
  const size = (40 * 221) / measure('Instagram’s', 40);
  const top = CENTER_Y - size * 0.6;

  const x0 = spline(f, [[372, 284], [374, 211], [377, 148], [380, 121], [383, 113]]);
  const gonnaFinal = measure('Instagram’s ', size);
  const gonnaX = x0 + spline(f, [[377, 292], [380, 262], [383, 254], [390, 241], [395, gonnaFinal]]);
  const gonna = ramp(f, 376, 383, 0, 1);
  const pillFinal = gonnaFinal + measure('gonna', size) + 24;
  const pillX = x0 + spline(f, [[383, pillFinal + 19], [385, pillFinal + 14], [387, pillFinal + 6], [390, pillFinal]]);
  const pill = ramp(f, 382, 383.5, 0, 1);
  const youX = x0 + pillFinal + NOTICE.width * PILL + 11 + spline(f, [[385, 62], [387, 35], [390, 16], [395, 0]]);
  const you = ramp(f, 384.5, 390, 0, 1);
  const dy = spline(f, [[395, 0], [400, -6], [404, -29], [406, -52], [408, -81], [409, -110], [411, -227], [413, -520]]);
  const entry = ramp(f, 372, 377, 1, 0);

  return (
    <Layer>
      <Rect width={1080} height={810} fill={PAPER} />
      <Layer id="s10-line" y={dy} motionBlur={{ samples: 16, shutter: f < 409 ? 0.4 : 1.2 }}>
        <Text font={UI} weight={500} size={size} color={TEXT} x={x0} y={top} effects={entry > 0 ? [blur(5 * entry)] : undefined}>
          Instagram’s
        </Text>
        {gonna > 0 && (
          <Text
            font={UI}
            weight={500}
            size={size}
            color={interpolateColors(gonna, [0, 1], ['#b4b4b8', TEXT])}
            x={gonnaX}
            y={top}
            opacity={0.3 + 0.7 * gonna}
            effects={gonna < 1 ? [blur(6 * (1 - gonna))] : undefined}
          >
            gonna
          </Text>
        )}
        {pill > 0 && (
          <Layer
            x={pillX}
            y={CENTER_Y + 6 - (NOTICE.height * PILL) / 2}
            scale={PILL}
            opacity={pill}
            effects={f < 388 ? [blur(ramp(f, 383, 388, 10, 0))] : undefined}
          >
            <NoticeStack
              backY={keys(f, [[386, 0], [387, -112], [390, -200], [395, -184]], (t) => t)}
              backRotation={3}
              backOpacity={ramp(f, 386, 388, 0, 1)}
              tint={ramp(f, 383, 394, 0.9, 0)}
              backTint={ramp(f, 383, 394, 0.9, 0.12)}
              backDim={0.12}
            />
          </Layer>
        )}
        {you > 0 && (
          <Text
            font={UI}
            weight={500}
            size={size}
            color={interpolateColors(you, [0, 1], ['#b4b4b8', TEXT])}
            x={youX}
            y={top}
            opacity={0.25 + 0.75 * you}
          >
            you
          </Text>
        )}
      </Layer>
    </Layer>
  );
};
