// Shot 09 (frames 343-372): the filled save button flies up out of shot 08 to fill the frame and bounces like a
// character, rocking side to side over its shadow, while "And done..!" settles beside it; the camera drifts up
// and then whips everything off to the left. Positions are screen pixels at frame 353, measured on the reference.

import React from 'react';
import { interpolateColors, useCurrentFrame } from 'remotion';
import { Ellipse, Layer, Rect, Text, blur } from '@kinetographdev/core';
import { measureText } from '@kinetographdev/core/layout-utils';
import { PAPER, ReminderMark, TEXT, UI, easeOut, keys, ramp } from '../lib.js';
import { spline } from './c-ui.js';

const F0 = 342;
const FLOOR = { x: 324, y: 616 };
const MARK = 350; // the icon's 24-unit box, in px: its body is 190 wide and 255 tall
const HALF_BODY = 128;
const WORDS = { x: 508, y: 462, size: 84 };

// the scene drifts up as the camera follows, then is whipped off to the left
const DY: [number, number][] = [[345, -114], [347, -63], [349, -27], [351, -9], [353, 0], [356, 10], [359, 18], [362, 26], [365, 32], [372, 44]];
const DX: [number, number][] = [[345, 0], [347, 13], [349, 5], [351, 0], [356, -3], [359, -28], [362, -98], [365, -246], [368, -540], [372, -1000]];
const ROT: [number, number][] = [[345, 0], [347, 12], [349, 8], [351, -12], [353, 0], [356, -10], [359, 0], [362, 18], [365, 10], [372, 6]];
const SWAY: [number, number][] = [[345, 364], [347, 375], [349, 350], [351, 335], [353, 331], [356, 327], [359, 325]];

export const AndDone: React.FC = () => {
  const f = useCurrentFrame() + F0;
  const shown = f >= 343; // frame 342 is still shot 08's

  const dx = spline(f, DX);
  const dy = spline(f, DY);
  // the bottom of the icon's body above the floor: a hop every 12.5 frames, landing at 357
  const hop = 20 + 115 * Math.abs(Math.sin((Math.PI * (f - 344.5)) / 12.5));
  const land = keys(f, [[356, 1], [357.5, 0.95], [360, 1]], easeOut);

  // the way in: out of shot 08's button (small, up left) to full size
  const inT = ramp(f, 341.5, 345, 0, 1, (t) => t);
  const restX = keys(f, SWAY);
  const restY = FLOOR.y - hop - HALF_BODY;
  const iconX = 397 + (restX - 397) * inT;
  const iconY = 189 + (restY + dy - 189) * inT;
  const iconScale = (0.19 + 0.81 * inT) * land;

  const andW = measureText({ text: 'And ', fontFamily: UI, fontSize: WORDS.size, fontWeight: '800' }).width;
  const and = ramp(f, 346, 349, 0, 1);
  const done = ramp(f, 348, 351, 0, 1);
  const grey = (t: number) => interpolateColors(t, [0, 1], ['#a8a8ac', TEXT]);
  const shadowW = 340 - 1.15 * hop;

  return (
    <Layer>
      <Rect width={1080} height={810} fill={PAPER} opacity={shown ? 1 : 0} />
      {/* an explicit id: on the sub-frames before 343 shot 08 is still in the tree and would shift an automatic one */}
      <Layer id="s09-scene" motionBlur={{ samples: 16, shutter: f < 361 ? 0.6 : 1.2 }} opacity={f >= 342.5 ? 1 : 0}>
        <Layer x={dx}>
          <Layer y={dy} opacity={ramp(f, 343, 345, 0, 1)}>
            <Ellipse
              x={FLOOR.x - shadowW / 2}
              y={FLOOR.y - 13}
              width={shadowW}
              height={26}
              fill="#000"
              opacity={0.16 + 0.1 * (1 - hop / 135)}
              effects={[blur(4)]}
            />
          </Layer>
          <Layer x={iconX} y={iconY} rotation={keys(f, ROT)} scale={iconScale}>
            <Layer x={-MARK / 2} y={-MARK / 2}>
              <ReminderMark size={MARK} filled color="#050505" badgeBg="#fff" />
            </Layer>
          </Layer>
          <Layer y={dy}>
            {and > 0 && (
              <Text
                font={UI}
                weight={800}
                size={WORDS.size}
                color={grey(and)}
                x={WORDS.x}
                y={WORDS.y - 8 * (1 - and)}
                opacity={0.4 + 0.6 * and}
                effects={and < 1 ? [blur(4 * (1 - and))] : undefined}
              >
                And
              </Text>
            )}
            {done > 0 && (
              <Text
                font={UI}
                weight={800}
                size={WORDS.size}
                color={grey(done)}
                x={WORDS.x + andW}
                y={WORDS.y + 8 * (1 - done)}
                opacity={0.4 + 0.6 * done}
                effects={done < 1 ? [blur(4 * (1 - done))] : undefined}
              >
                done..!
              </Text>
            )}
          </Layer>
        </Layer>
      </Layer>
    </Layer>
  );
};
