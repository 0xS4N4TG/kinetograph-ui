// The motion slots: crop (how the picture sits in the frame), shake (a camera that will not keep still) and fps
// (frames held, so footage steps like 12 fps animation). Each gene gives a function of the frame, so the same
// strand plays back exactly.

import { between, hash, pick, rng } from './rng.js';
import type { Rng } from './rng.js';

/** Where the picture sits: zoom about the centre, offset in fractions of the frame, turn in degrees, and black bars
 *  (fractions of the height, top and bottom together; of the width, left and right together). */
export interface Frame {
  zoom: number;
  dx: number;
  dy: number;
  rotation: number;
  bars: number;
  sides: number;
}
export const STILL: Frame = { zoom: 1, dx: 0, dy: 0, rotation: 0, bars: 0, sides: 0 };

export interface CropGene {
  id: string;
  frame: (k: number, r: Rng) => Frame;
}
export interface ShakeGene {
  id: string;
  /** the offset at a frame, in fractions of the frame, and degrees */
  at: (k: number, r: Rng, frame: number, seed: number) => { dx: number; dy: number; rotation: number; zoom: number };
}
export interface FpsGene {
  id: string;
  /** the frame to show at `frame` */
  hold: (r: Rng, frame: number, seed: number) => number;
}

export const CROP: CropGene[] = [
  { id: 'none', frame: () => STILL },
  { id: 'punch-in', frame: (k, r) => ({ ...STILL, zoom: 1 + between(r, 0.15, 0.45) * k, dx: between(r, -0.06, 0.06) * k, dy: between(r, -0.05, 0.05) * k }) },
  { id: 'off-centre', frame: (k, r) => ({ ...STILL, zoom: 1 + 0.35 * k, dx: pick(r, [-1, 1]) * 0.12 * k, dy: between(r, -0.08, 0.08) * k }) },
  { id: 'tilt', frame: (k, r) => ({ ...STILL, zoom: 1 + 0.18 * k, rotation: pick(r, [-1, 1]) * between(r, 2, 6) * k }) },
  // 2.39:1 or 2:1 bars on a 16:9 frame
  { id: 'letterbox', frame: (k, r) => ({ ...STILL, bars: (1 - (16 / 9) / pick(r, [2.39, 2, 2.76])) * k }) },
  // 4:3 or 1:1 pillars
  { id: 'pillarbox', frame: (k, r) => ({ ...STILL, sides: (1 - pick(r, [4 / 3, 1]) / (16 / 9)) * k }) },
];

// smooth wobble out of a few sines with seeded speeds and phases
function wobble(seed: number, t: number): number {
  const r = rng(seed);
  let v = 0;
  for (let i = 0; i < 3; i++) v += Math.sin(t * between(r, 0.05, 0.25) * (i + 1) + r() * 6.283) / (i + 1);
  return v / 1.83;
}
const jump = (seed: number, block: number) => rng(hash(`${seed}:${block}`))() * 2 - 1;

export const SHAKE: ShakeGene[] = [
  { id: 'none', at: () => ({ dx: 0, dy: 0, rotation: 0, zoom: 1 }) },
  {
    id: 'handheld',
    at: (k, r, f, s) => {
      const a = between(r, 0.004, 0.012) * k;
      return { dx: a * wobble(s, f), dy: a * wobble(s + 1, f), rotation: between(r, 0.2, 0.8) * k * wobble(s + 2, f), zoom: 1 + 2.4 * a };
    },
  },
  {
    id: 'jitter',
    at: (k, r, f, s) => {
      const a = between(r, 0.006, 0.02) * k;
      const b = Math.floor(f / Math.round(between(r, 1, 3)));
      return { dx: a * jump(s, b), dy: a * jump(s + 7, b), rotation: 0.6 * k * jump(s + 13, b), zoom: 1 + 2.4 * a };
    },
  },
  {
    id: 'impact',
    at: (k, r, f, s) => {
      const every = Math.round(between(r, 8, 20));
      const t = f % every;
      const hit = Math.exp(-t / 2.5) * k;
      const b = Math.floor(f / every);
      return { dx: 0.03 * hit * jump(s, b), dy: 0.03 * hit * jump(s + 3, b), rotation: 1.5 * hit * jump(s + 5, b), zoom: 1 + 0.08 * hit + 0.06 * k };
    },
  },
  {
    id: 'breathe',
    at: (k, r, f, s) => ({ dx: 0, dy: 0, rotation: 0, zoom: 1 + between(r, 0.03, 0.08) * k * (0.5 + 0.5 * wobble(s, f * 0.4)) }),
  },
];

export const FPS: FpsGene[] = [
  { id: 'none', hold: (_r, f) => f },
  { id: 'fps-12', hold: (_r, f) => f - (f % Math.max(1, Math.round(30 / 12))) },
  { id: 'fps-8', hold: (_r, f) => f - (f % 4) },
  { id: 'fps-6', hold: (_r, f) => f - (f % 5) },
  {
    // holds of one to four frames in a seeded run, like footage stepped by hand
    id: 'stutter',
    hold: (_r, f, s) => {
      const r = rng(s);
      let at = 0;
      for (;;) {
        const len = 1 + Math.floor(r() * 4);
        if (f < at + len) return at;
        at += len;
      }
    },
  },
];
