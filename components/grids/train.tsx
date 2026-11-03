// Items riding a curve: the train (cards placed by arc length, the leader setting off first so the train stretches and
// closes up again) and the hairline of the path itself, drawn on at the start.

import React from 'react';
import { Path } from '@kinetographdev/core';
import { projectPoint, ramp, out, inOut, rotZ, type Cam, type Item, type M3 } from './kit.js';
import { sample, type Curve } from './curves.js';

export interface TrainParams {
  curve: Curve;
  count: number;
  cardWidth: number;
  cardHeight: number;
  /** Fraction of the curve the train travels in all (a closed curve: in slots, see `slots`). */
  travel: number;
  /** Frames the leader waits, and how many frames each card after it waits more. */
  start: number;
  lag: number;
  /** Frames one card takes for the whole travel. */
  span: number;
  /** In-plane turn to the tangent, 0..1 (1 = along the path). */
  follow: number;
  /** Extra turn in degrees (90 puts the card's top toward the direction of travel). */
  offsetDeg: number;
}

export const buildTrain = (f: number, t: TrainParams): Item[] => {
  const { curve, count } = t;
  const items: Item[] = [];
  const spacing = curve.closed ? 1 / count : 0.86 / Math.max(1, count - 1);
  for (let i = 0; i < count; i += 1) {
    // card 0 is at the back; the card ahead of it starts first
    const lead = count - 1 - i;
    const adv = t.travel * inOut(ramp(f, t.start + lead * t.lag, t.start + lead * t.lag + t.span, (x) => x));
    const u = (curve.closed ? 0 : 0.04) + i * spacing + adv;
    const { p, t: tan } = sample(curve, u);
    const a = ramp(f, 10 + lead * 3, 10 + lead * 3 + 24, out);
    let orient: M3 | undefined;
    if (t.follow > 0) orient = rotZ(((Math.atan2(tan[1], tan[0]) * 180) / Math.PI) * t.follow + t.offsetDeg);
    const edge = curve.closed ? 1 : Math.min(ramp(u, -0.02, 0.06, (x) => x), 1 - ramp(u, 0.94, 1.02, (x) => x));
    items.push({ key: i, pos: p, orient, photo: i, w: t.cardWidth, h: t.cardHeight, opacity: a * edge, scale: 0.8 + 0.2 * a });
  }
  return items;
};

/** The path as a hairline, drawn on between frames `a` and `b`. */
export const PathLine: React.FC<{ curve: Curve; cam: Cam; f: number; a: number; b: number; color: string }> = ({ curve, cam, f, a, b, color }) => {
  const k = ramp(f, a, b, inOut);
  if (k <= 0) return null;
  const n = Math.max(2, Math.floor(curve.pts.length * k));
  const step = Math.max(1, Math.floor(curve.pts.length / 160));
  let d = '';
  for (let i = 0; i < n; i += step) {
    const q = projectPoint(curve.pts[i]!, cam);
    d += `${d ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
  }
  const q = projectPoint(curve.pts[n - 1]!, cam);
  d += `L${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
  return <Path id="path-line" d={d} stroke={{ color, width: 1.5 }} opacity={0.5} />;
};
