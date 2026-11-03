// Hand-written notes: words written on in a handwriting font, and freehand lines (underlines, arrows, scribbles)
// drawn on along their length.

import React from 'react';
import { random } from 'remotion';
import { measureText } from '@remotion/layout-utils';
import { Layer, Path, Text } from '@kinetographdev/core';
import { line, polyD } from './draw.js';
import { useTaste } from './taste.js';
import { ramp } from './timing.js';

export interface InkStroke {
  pts: number[][];
  len: number;
}

/** Strokes drawn on in order, by length: progress 0 is nothing, 1 the whole of them. */
export const InkLines: React.FC<{
  strokes: InkStroke[];
  progress: number;
  color: string;
  width: number;
  effects?: unknown[];
}> = ({ strokes, progress, color, width, effects }) => {
  const total = strokes.reduce((a, b) => a + b.len, 0);
  let left = Math.max(0, Math.min(1, progress)) * total;
  return (
    <Layer effects={effects as never}>
      {strokes.map((st, i) => {
        const show = Math.min(st.len, left);
        left -= st.len;
        if (show <= 0.01) return null;
        return (
          <Path
            key={i}
            d={polyD(st.pts)}
            stroke={line({ color, width, cap: 'round', join: 'round', dashArray: [show, st.len + 1000] })}
          />
        );
      })}
    </Layer>
  );
};

/** A handwritten word at (x, y) (its baseline), written on left to right between frames start and end: the word
 *  in the taste's marker or pen font, uncovered by a slanted edge that runs along it as a pen would. */
export const Ink: React.FC<{
  text: string;
  frame: number;
  start: number;
  end: number;
  x: number;
  y: number;
  size: number;
  color: string;
  hand?: 'marker' | 'pen';
  rotation?: number;
  effects?: unknown[];
}> = ({ text, frame, start, end, x, y, size, color, hand = 'marker', rotation = 0, effects }) => {
  const { fonts } = useTaste();
  const font = hand === 'marker' ? fonts.marker : fonts.pen;
  const weight = 400;
  const w = measureText({ text, fontFamily: font, fontSize: size, fontWeight: String(weight) }).width;
  const p = ramp(frame, start, end, 0, 1, (t) => t);
  if (p <= 0) return null;
  // the text box's top sits about 0.8 of the size above the baseline in handwriting fonts
  const top = -size * 0.8;
  const edge = -size * 0.1 + p * (w + size * 0.3);
  const lean = size * 0.25;
  return (
    <Layer x={x} y={y} rotation={rotation}>
      <Layer
        effects={effects as never}
        clip={{
          kind: 'polygon',
          points: [
            [-size, top - size],
            [edge + lean, top - size],
            [edge - lean, size * 0.6],
            [-size, size * 0.6],
          ],
        }}
      >
        <Text font={font} weight={weight} size={size} color={color} x={0} y={top}>
          {text}
        </Text>
      </Layer>
    </Layer>
  );
};

/** A freehand line through points (an arrow's shaft, an underline), with a little seeded wobble. */
export function handLine(points: number[][], seed: string, wobble = 1.5): InkStroke {
  const pts: number[][] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[i + 1];
    const n = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay) / 6));
    for (let k = i ? 1 : 0; k <= n; k++) {
      const t = k / n;
      pts.push([ax + (bx - ax) * t + (random(`${seed}-${i}-${k}-x`) - 0.5) * wobble, ay + (by - ay) * t + (random(`${seed}-${i}-${k}-y`) - 0.5) * wobble]);
    }
  }
  // smooth once so the wobble reads as a hand, not noise
  const sm = pts.map((p, i) => (i === 0 || i === pts.length - 1 ? p : [(pts[i - 1][0] + 2 * p[0] + pts[i + 1][0]) / 4, (pts[i - 1][1] + 2 * p[1] + pts[i + 1][1]) / 4]));
  let len = 0;
  for (let i = 1; i < sm.length; i++) len += Math.hypot(sm[i][0] - sm[i - 1][0], sm[i][1] - sm[i - 1][1]);
  return { pts: sm, len };
}

/** Points along a quadratic curve from a to b bending through c. */
export function curve(a: number[], c: number[], b: number[], n = 16): number[][] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
  });
}
