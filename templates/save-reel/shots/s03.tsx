// Shot 03 (80-134): "And just like that ..." blurs in word by word on the dark warm gradient; a white pointer rises,
// selects "And", the line whips off to the left and "You  lose [post]" lands, then the camera pushes in.

import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Layer, Rect, Text, blur } from '@kinetographdev/core';
import { UI, W, easeIn, keys, ramp } from '../lib.js';
import { DarkGradient, FlatArrow, PostChip, textWidth } from './b-common.js';

const FROM = 80;

const LINE = ['And', 'just', 'like', 'that', '...'];
const LINE_AT = [80, 82, 84, 87, 90];
const LINE_SIZE = 51;
const LINE_Y = 372;

// "You  lose [chip]": left edges
const BIG = 82;
const YOU_X = 170;
const LOSE_X = 424;
const CHIP = { x: 676, y: 360, w: 214, h: 160 };

const POINTER: [number, number, number, number][] = [
  // frame, x, y, rotation (the tip turns from up to right as it travels)
  [97, 100, 860, 20],
  [100, 116, 800, 25],
  [106, 134, 640, 35],
  [109, 180, 580, 55],
  [112, 240, 550, 75],
  [114, 280, 540, 88],
  [118, 334, 534, 98],
  [124, 440, 548, 108],
  [130, 620, 596, 120],
  [134, 900, 610, 125],
];

export const JustLikeThat: React.FC = () => {
  const g = useCurrentFrame() + FROM;

  // the first line: words at their final places, the whole line settling and then whipping out to the left
  const space = textWidth(' ', UI, LINE_SIZE, 400);
  const widths = LINE.map((w) => textWidth(w, UI, LINE_SIZE, 400));
  const total = widths.reduce((a, b) => a + b, 0) + space * (LINE.length - 1);
  let pen = W / 2 - total / 2;
  const xs = widths.map((w) => {
    const x = pen;
    pen += w + space;
    return x;
  });
  const settle = keys(g, [[80, 190], [84, 130], [92, 35], [100, 0]], (t) => t);
  const out = keys(g, [[107, 0], [109, -75], [112, -450], [114, -1100]], easeIn);
  const selected = g >= 107;

  // "You lose [chip]"
  // You, lose, chip: [frame, offset] keys; each shows from its first key
  const ENTER: [number, number][][] = [
    [[111, 520], [112, 413], [114, 144], [117, 0]],
    [[115, 50], [116, 20], [117, 0]],
    [[117, 60], [118, 0]],
  ];
  const enter = (i: number) => keys(g, ENTER[i], (t) => t);
  const shown = (i: number) => (g >= ENTER[i][0][0] ? 1 : 0);
  const push = ramp(g, 117, 134, 1, 1.085);
  const exit = keys(g, [[130, 0], [133, -60], [134, -130], [136, -400]], (t) => t);

  const p = (i: number) => keys(g, POINTER.map((k) => [k[0], k[i]] as [number, number]), (t) => t);

  return (
    <Layer>
      <DarkGradient warmth={ramp(g, 80, 134, 1, 0.75)} />

      {g < 117 && (
        <Layer id="jlt-line" x={settle + out} motionBlur={{ samples: 16, shutter: 1.6 }}>
          {selected && (
            <Rect
              x={xs[0] - 6}
              y={LINE_Y - 8}
              width={ramp(g, 109, 111, widths[0], total) + 12}
              height={LINE_SIZE * 1.3 + 4}
              radius={2}
              fill="#d6d6d8"
              opacity={ramp(g, 107, 108, 0, 1)}
            />
          )}
          {LINE.map((word, i) => {
            const a = LINE_AT[i];
            return (
              <Text
                key={i}
                font={UI}
                weight={400}
                size={LINE_SIZE}
                color={i === 0 && selected ? '#3a3a3c' : '#f2f2f2'}
                x={xs[i]}
                y={LINE_Y}
                opacity={ramp(g, a, a + 4, 0, 1)}
                effects={g < a + 5 ? [blur(ramp(g, a, a + 5, 7, 0))] : undefined}
              >
                {word}
              </Text>
            );
          })}
        </Layer>
      )}

      {g >= 111 && (
        <Layer id="jlt-big" x={540 + exit} y={430} scale={push} motionBlur={{ samples: 16, shutter: 1 }}>
          <Layer x={-540} y={-430}>
            <Text font={UI} weight={700} size={BIG} color="#f4f4f4" x={YOU_X + enter(0)} y={368} opacity={shown(0)}>
              You
            </Text>
            <Text font={UI} weight={700} size={BIG} color="#f4f4f4" x={LOSE_X + enter(1)} y={368} opacity={shown(1)}>
              lose
            </Text>
            <Layer x={CHIP.x + enter(2)} y={CHIP.y} opacity={shown(2)}>
              <PostChip width={CHIP.w} height={CHIP.h} />
            </Layer>
          </Layer>
        </Layer>
      )}

      {g >= 97 && g < 133.6 && (
        <Layer id="jlt-pointer" x={p(1)} y={p(2)} rotation={p(3)} motionBlur={{ samples: 12, shutter: 1 }}>
          {/* the keys were measured for a pointer leaning 20 degrees left of straight up; the block arrow points right */}
          <Layer rotation={-110}>
            <FlatArrow size={64} />
          </Layer>
        </Layer>
      )}
    </Layer>
  );
};
