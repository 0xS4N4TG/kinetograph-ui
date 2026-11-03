// Small timing and drawing helpers shared by the showcase components. Every function is pure in the frame number.

import { Easing, interpolate } from 'remotion';
import { makeGoogleFont } from '@kinetographdev/core/google-fonts';

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** slow in, slow out: the default for anything that travels */
export const ease = Easing.bezier(0.45, 0, 0.15, 1);
/** fast start, long settle: things arriving */
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
/** slow start, fast end: things leaving at speed */
export const easeIn = Easing.bezier(0.7, 0, 0.84, 0);

/** from `from` at frame a to `to` at frame b, held outside */
export const ramp = (f: number, a: number, b: number, from: number, to: number, easing: (t: number) => number = ease) =>
  interpolate(f, [a, b], [from, to], { ...clamp, easing });

/** 0 to 1 over [a, b], eased */
export const prog = (f: number, a: number, b: number, easing: (t: number) => number = ease) => ramp(f, a, b, 0, 1, easing);

/** Keyframes [[frame, value], ...] with one easing on every segment. */
export function keys(f: number, k: [number, number][], easing: (t: number) => number = ease): number {
  if (f <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) {
    if (f <= k[i][0]) {
      const [a, va] = k[i - 1];
      const [b, vb] = k[i];
      return va + (vb - va) * easing((f - a) / (b - a));
    }
  }
  return k[k.length - 1][1];
}

/** A damped spring from 0 at frame `a` to 1: overshoots, then settles. `bounce` 0.2 is gentle, 0.5 lively. */
export function spring(f: number, a: number, dur = 30, bounce = 0.25): number {
  const t = (f - a) / dur;
  if (t <= 0) return 0;
  if (t >= 1.6) return 1;
  const damp = 5.5;
  const w = Math.PI * 2 * (0.6 + bounce * 1.4);
  return 1 - Math.exp(-damp * t) * Math.cos(w * t);
}

/** Path data for a w x h rounded rectangle at the origin. */
export const rr = (w: number, h: number, r: number): string => {
  r = Math.min(r, w / 2, h / 2);
  return `M${r} 0H${w - r}A${r} ${r} 0 0 1 ${w} ${r}V${h - r}A${r} ${r} 0 0 1 ${w - r} ${h}H${r}A${r} ${r} 0 0 1 0 ${h - r}V${r}A${r} ${r} 0 0 1 ${r} 0Z`;
};

export const clipRR = (w: number, h: number, r: number) => ({ kind: 'path' as const, d: rr(w, h, r) });

/** Registers a Google Fonts family and returns the name to put in `font`. */
export const useFamily = (family: string, weights: string[] = ['400', '500', '600'], italic = false): string => {
  const mod = makeGoogleFont(family.replace(/\s+/g, ''));
  if (italic) mod.loadFont('italic', { weights });
  return mod.loadFont('normal', { weights }).fontFamily;
};

/** A point on a circle, for arcs: angle in degrees from straight up, clockwise. */
export const onArc = (cx: number, cy: number, r: number, deg: number) => ({
  x: cx + r * Math.sin((deg * Math.PI) / 180),
  y: cy - r * Math.cos((deg * Math.PI) / 180),
});

/** A smooth hash noise in [-1, 1] of a time and a seed: slow handheld drift without Math.random. */
export const drift = (f: number, seed: number, speed = 0.02): number => {
  const t = f * speed;
  const i = Math.floor(t);
  const h = (n: number) => {
    const s = Math.sin((n + seed * 97.13) * 127.1) * 43758.5453;
    return (s - Math.floor(s)) * 2 - 1;
  };
  const u = t - i;
  const s = u * u * (3 - 2 * u);
  return h(i) * (1 - s) + h(i + 1) * s;
};
