// Shot 08 (frames 240-342): "...had Save Reminders?" under the post, close on its save button. A colour sweep runs
// through "Save Reminders?", the camera drifts right and pushes in on the button, the button is pressed (it shrinks,
// fills, and a grey ring spreads and fades), two bubbles lead down to the Reminder sheet, which pops out of them;
// the camera pulls back to show it whole, its toggle turns on, Apply is tapped, and the sheet collapses back into
// the button. Positions are the post's world pixels (the post at 0, 0); the camera keys were measured on the
// reference.

import React from 'react';
import { interpolateColors, useCurrentFrame } from 'remotion';
import { Ellipse, Layer, Rect, Text, blur, dropShadow } from '@kinetographdev/core';
import { measureText } from '@kinetographdev/core/layout-utils';
import { Cam, PAPER, ReminderMark, UI, easeOut, keys, ramp } from '../lib.js';
import { POST, PostCard } from '../post.js';
import { NightPicture, ReminderSheet, spline } from './c-ui.js';

const F0 = 240;
const MARK = { x: POST.width - 30, y: POST.actionsY(POST.imageHeight) }; // the save button's centre

// camera: [frame, x, y, zoom]
const CAM: [number, number, number, number][] = [
  [240, 334.7, 472.3, 3.0],
  [245, 360, 472.3, 3.0],
  [262, 394.7, 472.3, 3.1],
  [274, 411.4, 464.9, 3.5],
  [278, 420.3, 458.4, 3.9],
  [281, 430.9, 450.9, 4.5],
  [283, 436.3, 447.9, 4.9],
  [289, 442.7, 443.8, 5.5],
  [293, 444.4, 443.5, 5.6],
  [299, 445.5, 442.5, 5.4],
  [303, 447.6, 446.6, 5.4],
  [306, 450, 450, 5.25],
  [309, 460.7, 463.3, 4.6],
  [312, 469.8, 479.9, 4.25],
  [315, 479.2, 492.4, 3.7],
  [320, 485.4, 501, 3.5],
  [337, 487.5, 503.2, 3.47],
  [342, 470, 490, 3.6],
];
const camAt = (f: number, i: 1 | 2 | 3) => spline(f, CAM.map((k) => [k[0], k[i]] as [number, number]));

// the line under the post: regular, then "Save Reminders" bold, then "?"; right edge just left of the button
const SIZE = 15.5;
const HEAD = 'But, what if Instagram had ';
const BOLD = 'Save Reminders';
const LINE_RIGHT = 411;
const LINE_Y = 474 - SIZE * 0.6;

// the sweep: a band of orange then magenta running left to right through "Save Reminders?"
const AHEAD = '#8c8c92';
const DONE = '#3a3a3e';
function sweep(i: number, pos: number): string {
  const t = pos - i;
  if (t < 0) return AHEAD;
  if (t < 1.5) return interpolateColors(t, [0, 1.5], ['#f7a14a', '#f58a3a']);
  if (t < 7) return interpolateColors(t, [1.5, 4, 7], ['#f58a3a', '#e0389a', '#d22aa8']);
  if (t < 11) return interpolateColors(t, [7, 11], ['#d22aa8', DONE]);
  return DONE;
}

// the sheet's place in the world (its top left) and scale
const SHEET_AT = { x: 465.4, y: 472, k: 1 / 3.5 };

export const SaveReminders: React.FC = () => {
  const f = useCurrentFrame() + F0;

  const headW = measureText({ text: HEAD, fontFamily: UI, fontSize: SIZE, fontWeight: '400' }).width;
  const boldW = measureText({ text: BOLD, fontFamily: UI, fontSize: SIZE, fontWeight: '700' }).width;
  const qW = measureText({ text: '?', fontFamily: UI, fontSize: SIZE, fontWeight: '400' }).width;
  const x0 = LINE_RIGHT - headW - boldW - qW;
  const pos = keys(f, [[236, 5.5], [240, 7.5], [262, 19.5], [272, 30]], (t) => t);

  // the press: the button shrinks and fills at 281, springs back by 289; the grey ring spreads and fades
  const pressed = f >= 281;
  // the reference's button is a fifth bigger than the post's own one
  const markScale = keys(f, [[279, 1.22], [281.5, 0.75], [284, 0.85], [288, 1.3], [292, 1.22]], easeOut);
  const ring = ramp(f, 281, 300, 0, 1, (t) => 1 - (1 - t) * (1 - t));
  const ringD = 16 + 58 * ring;
  const ringShade = Math.round(keys(f, [[283, 120], [287, 168], [290, 200], [300, 222]], (t) => t));
  const ringOpacity = f < 281 ? 0 : ramp(f, 296, 302, 1, 0);
  // from 286 a paler disc opens round the button inside the grey one, so the grey reads as a ring
  const hole = ramp(f, 285, 292, 0, 1, easeOut);
  const holeD = ringD * 0.5 * hole;
  const holeShade = Math.round(ringShade + (242 - ringShade) * 0.55);
  // the disc is centred on the bookmark's body (the badge pokes out up and right)
  const RX = MARK.x - 0.2;
  const RY = MARK.y + 0.4;
  // the camera's blur: the reference keeps the press sharp while it zooms in on it
  const shutter = keys(f, [[240, 1.4], [279, 1.4], [283, 0.35], [300, 0.35], [306, 1.4]], (t) => t);

  // bubbles, then the sheet popping out of them (scale from its top left corner, sliding in from down right)
  const bubA = ramp(f, 297, 301, 0, 1, easeOut);
  const bubB = ramp(f, 300, 304, 0, 1, easeOut);
  const pop = ramp(f, 299, 305, 0, 1, easeOut);
  // and back into the button at the end
  const out = ramp(f, 337, 342, 0, 1, (t) => t * t);
  const sheetScale = SHEET_AT.k * (0.55 + 0.45 * pop) * (1 - 0.85 * out);
  const sheetX = SHEET_AT.x + 15 * (1 - pop) - 20 * out;
  const sheetY = SHEET_AT.y + 19 * (1 - pop) - 45 * out;
  const toggle = ramp(f, 322, 326, 0, 1);
  const ripple = ramp(f, 330, 341, 0, 1, (t) => t);
  const bubbleShadow = [dropShadow({ y: 1, blur: 1.5, color: '#00000020' })];

  return (
    <Layer>
      <Rect width={1080} height={810} fill={PAPER} />
      <Cam id="save-cam" x={camAt(f, 1)} y={camAt(f, 2)} zoom={camAt(f, 3)} blur={shutter}>
        <PostCard
          image={<NightPicture width={POST.width} height={POST.imageHeight} />}
          save={pressed ? 'reminderFilled' : 'reminder'}
          saveScale={markScale}
          headerOpacity={0}
          likes=""
          comments=""
          reposts=""
        />
        {/* the press ring, under the button */}
        {ringOpacity > 0 && (
          <Layer opacity={ringOpacity}>
            <Ellipse x={RX - ringD / 2} y={RY - ringD / 2} width={ringD} height={ringD} fill={`rgb(${ringShade},${ringShade},${ringShade})`} />
            {holeD > 0.5 && (
              <Ellipse
                x={RX - holeD / 2}
                y={RY - holeD / 2}
                width={holeD}
                height={holeD}
                fill={`rgb(${holeShade},${holeShade},${holeShade})`}
                effects={[blur(1)]}
              />
            )}
          </Layer>
        )}
        {ringOpacity > 0 && (
          // the button again, over its ring
          <Layer x={MARK.x + 1} y={MARK.y + 1} scale={markScale}>
            <Layer x={-13} y={-13}>
              <ReminderMark size={26} filled />
            </Layer>
          </Layer>
        )}
        <Text font={UI} weight={400} size={SIZE} color="#5c5c62" x={x0} y={LINE_Y}>
          {HEAD}
        </Text>
        <Text
          font={UI}
          weight={700}
          size={SIZE}
          color={DONE}
          x={x0 + headW}
          y={LINE_Y}
          chars={[...BOLD].map((_, i) => ({ color: sweep(i, pos) }))}
        >
          {BOLD}
        </Text>
        <Text font={UI} weight={400} size={SIZE} color={sweep(BOLD.length, pos)} x={x0 + headW + boldW} y={LINE_Y}>
          ?
        </Text>
        {bubA > 0 && out < 1 && (
          <Ellipse x={468 - 7.6 * bubA} y={458.1 - 7.6 * bubA} width={15.2 * bubA} height={15.2 * bubA} fill="#fff" effects={bubbleShadow} opacity={1 - out} />
        )}
        {bubB > 0 && out < 1 && (
          // the second bubble sits on the sheet's top edge, half under it, so the two read as one shape
          <Ellipse x={476.5 - 8.8 * bubB} y={472.6 - 8.8 * bubB} width={17.6 * bubB} height={17.6 * bubB} fill="#fff" effects={bubbleShadow} opacity={1 - out} />
        )}
        {pop > 0 && out < 1 && (
          <Layer x={sheetX} y={sheetY} scale={sheetScale} opacity={Math.min(1, pop * 2.5)} effects={out > 0 ? [blur(out * 40)] : undefined}>
            <ReminderSheet toggle={toggle} ripple={ripple} />
          </Layer>
        )}
      </Cam>
    </Layer>
  );
};
