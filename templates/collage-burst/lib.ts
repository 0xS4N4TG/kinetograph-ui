// Shared constants, timing helpers, font loading and text measuring for the collage burst.

import { Easing, interpolate } from 'remotion';
import { makeGoogleFont } from '@kinetographdev/core/google-fonts';
import { measureText } from '@remotion/layout-utils';

export const W = 1920;
export const H = 1080;
export const FPS = 30;
export const DURATION = 130;
/** The reference is 1280x720; everything is authored in those pixels and multiplied by K on the way out. */
export const K = 1.5;
export const RW = 1280;
export const RH = 720;

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeInOut = Easing.bezier(0.6, 0, 0.2, 1);

export const ramp = (f: number, a: number, b: number, from: number, to: number, easing: (t: number) => number = easeOut) =>
  interpolate(f, [a, b], [from, to], { ...clamp, easing });

/** Linear interpolation through [frame, value] keys, held outside. */
export function lerpKeys(f: number, k: [number, number][]): number {
  if (f <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) {
    if (f <= k[i][0]) {
      const [a, va] = k[i - 1];
      const [b, vb] = k[i];
      return va + ((vb - va) * (f - a)) / (b - a);
    }
  }
  return k[k.length - 1][1];
}

/** A smooth monotone cubic through [frame, value] keys: moves through its marks without stopping or overshooting. */
export function glide(f: number, k: [number, number][]): number {
  const n = k.length;
  if (f <= k[0][0]) return k[0][1];
  if (f >= k[n - 1][0]) return k[n - 1][1];
  const d = k.map((_, i) => {
    if (i === 0 || i === n - 1) return 0;
    const s0 = (k[i][1] - k[i - 1][1]) / (k[i][0] - k[i - 1][0]);
    const s1 = (k[i + 1][1] - k[i][1]) / (k[i + 1][0] - k[i][0]);
    return s0 * s1 <= 0 ? 0 : (2 * s0 * s1) / (s0 + s1);
  });
  let i = 1;
  while (f > k[i][0]) i++;
  const [x0, y0] = k[i - 1];
  const [x1, y1] = k[i];
  const h = x1 - x0;
  const t = (f - x0) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * h * d[i - 1] + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * h * d[i];
}

/** A rounded rectangle as SVG path data (for `clip`). */
export function rrPath(w: number, h: number, r: number): string {
  const c = Math.min(r, w / 2, h / 2);
  return `M${c} 0H${w - c}Q${w} 0 ${w} ${c}V${h - c}Q${w} ${h} ${w - c} ${h}H${c}Q0 ${h} 0 ${h - c}V${c}Q0 0 ${c} 0Z`;
}

// ---- fonts -----------------------------------------------------------------------------------------------------

const asked = new Set<string>();
/** Load a Google font family (idempotent). Call before the first text that uses it is laid out. */
export function ensureFont(family: string, weights: string[]): string {
  const key = `${family}:${weights.join(',')}`;
  if (!asked.has(key)) {
    asked.add(key);
    makeGoogleFont(family).loadFont('normal', { weights });
  }
  return family;
}

const widths = new Map<string, number>();
/** Width in px of one line of text. */
export function textWidth(text: string, font: string, size: number, weight: number): number {
  const key = `${font}|${weight}|${size}|${text}`;
  let w = widths.get(key);
  if (w === undefined) {
    w = measureText({ text, fontFamily: font, fontSize: size, fontWeight: String(weight) }).width;
    widths.set(key, w);
  }
  return w;
}
