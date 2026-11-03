// Shot 1 (frames 0-109): the prompt box. Characters type in at an uneven pace, each in a warm tint that fades to white
// as it ages; the box drifts left and settles, then a pink hairline pulses round it as the prompt sends.

import React from 'react';
import { Layer, Path, Rect, Text } from '@kinetographdev/core';
import { measureText } from '@remotion/layout-utils';
import { CUT, easeOutCubic, glide, line, mix, ramp, tracking } from './lib.js';
import type { Faces, PromptReplyProps } from './lib.js';

/** Frame each character of the default 39-character prompt appears (measured from the reference). Negative: the first
 *  characters are already there at frame 0. Other prompt lengths resample this curve, so the pace stays uneven. */
const TYPE_AT = [
  -4, -3, -2, -1, 0, 2, 4, 6, 7, 9, 10, 12, 13, 15, 16, 18, 20, 21, 22, 24, 26, 28, 30, 31, 33, 34, 36, 38, 40, 42, 44,
  46, 48, 50, 53, 55, 58, 62, 70,
];

export function typeTimes(count: number): number[] {
  if (count <= 1) return [0];
  const last = TYPE_AT.length - 1;
  return Array.from({ length: count }, (_, i) => {
    const u = (i / (count - 1)) * last;
    const a = Math.floor(u);
    const b = Math.min(last, a + 1);
    return TYPE_AT[a] + (TYPE_AT[b] - TYPE_AT[a]) * (u - a);
  });
}

// camera: where the box's top-left corner is on screen (reference pixels)
const BOX_X: [number, number][] = [
  [0, 74], [35, 74], [45, 70], [55, 59], [60, 51], [65, 45], [70, 41], [75, 39], [80, 38], [90, 37],
];
const BOX_Y: [number, number][] = [
  [0, 153], [5, 144], [10, 140], [15, 137], [20, 135], [25, 134], [30, 133], [35, 131], [50, 130], [95, 130],
  [100, 128], [102, 127], [104, 126], [106, 123], [108, 119], [110, 115],
];

const BOX_H = 280;
const BOX_W = 1400; // runs off the right edge of the frame
const PAD_X = 55.75;
const TEXT_SIZE = 48.3;
/** the widest a prompt may run before its type shrinks to fit (the reference's own line is 836 px at 48) */
const MAX_LINE = 840;

export const PromptShot: React.FC<{ f: number; props: PromptReplyProps; faces: Faces }> = ({ f, props, faces }) => {
  const { colors, prompt } = props;
  const bx = glide(f, BOX_X);
  const by = glide(f, BOX_Y);
  const chars = Array.from(prompt);
  const times = typeTimes(chars.length);
  const typed = times.filter((t) => t <= f).length;
  // light type blends heavier here (linear light) than in the reference; a touch less white evens the strokes out
  const textInk = mix(colors.ink, colors.surface, 0.075);
  const tx = bx + PAD_X;
  const ty = by + 50;

  // caret sits after the last typed character; measured as the advance of "prefix + x" minus "x" so a trailing space counts
  const natural = measureText({ text: prompt, fontFamily: faces.ui, fontSize: TEXT_SIZE }).width + chars.length * tracking(TEXT_SIZE);
  const size = natural > MAX_LINE ? (TEXT_SIZE * MAX_LINE) / natural : TEXT_SIZE;
  const k = size / TEXT_SIZE;
  const ls = tracking(size) + 0.015 * k;
  const w = (text: string) => measureText({ text, fontFamily: faces.ui, fontSize: size }).width;
  const adv = (s: string) => w(s + '|') - w('|') + Array.from(s).length * ls;
  const caretX = tx + (typed > 0 ? adv(chars.slice(0, typed).join('')) : 0) + 4.8;
  const caretOn = f < 101;

  // the send highlight: a pink hairline that swells in and fades out again
  const ring = ramp(f, 86, 9, easeOutCubic) * (1 - ramp(f, 97, 11));
  const ringColor = mix(colors.surface, '#e8969f', 0.36);

  return (
    <Layer id="prompt-shot">
      <Layer id="box" x={bx} y={by}>
        <Rect id="box-fill" width={BOX_W} height={BOX_H} radius={26} fill={colors.surface} />
        <Layer id="box-ring" opacity={ring}>
          <Rect id="box-ring-line" width={BOX_W} height={BOX_H} radius={26} stroke={line({ color: ringColor, width: 1.5 })} />
        </Layer>
        <Layer id="plus" x={99.5 - 20} y={204.5 - 20}>
          <Path id="plus-h" d="M0 20H40" stroke={line({ color: colors.ink, width: 3, cap: 'butt' })} />
          <Path id="plus-v" d="M20 0V40" stroke={line({ color: colors.ink, width: 3, cap: 'butt' })} />
        </Layer>
      </Layer>
      <Layer id="typed" x={tx} y={ty}>
        <Text
          id="typed-text"
          font={faces.ui}
          size={size}
          weight={400}
          color={textInk}
          chars={(_ch, i) => {
            const age = f - times[i];
            if (age < 0) return { x: i * ls, opacity: 0 };
            return { x: i * ls, color: mix(colors.tint, textInk, (age - 8) / 36) };
          }}
        >
          {prompt}
        </Text>
      </Layer>
      {caretOn ? (
        <Rect id="caret" x={caretX} y={by + 82.25 - 21.25 * k} width={3} height={42.5 * k} fill={mix(colors.tint, colors.ink, 0.4)} />
      ) : null}
    </Layer>
  );
};

export const PROMPT_END = CUT;
