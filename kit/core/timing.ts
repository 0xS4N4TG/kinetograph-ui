// Frame-based timing: eases, keyframes, ramps, and two smooth curves for camera paths measured key by key.

import { Easing, interpolate } from 'remotion';

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
export const ease = Easing.bezier(0.45, 0, 0.15, 1);
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeIn = Easing.bezier(0.7, 0, 0.84, 0);

/** interpolate over keyframes [[frame, value], ...] with one easing for every segment */
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

/** from at frame a to to at frame b, held outside */
export const ramp = (f: number, a: number, b: number, from: number, to: number, easing = ease) =>
  interpolate(f, [a, b], [from, to], { ...clamp, easing });

/** A smooth curve through [frame, value] keys (cubic Hermite, finite-difference slopes, flat at the ends and where
 *  the direction turns), so a camera measured key by key moves without stopping at every key. */
export function spline(f: number, k: [number, number][]): number {
  if (f <= k[0][0]) return k[0][1];
  const n = k.length - 1;
  if (f >= k[n][0]) return k[n][1];
  const slope = (i: number) => {
    if (i === 0 || i === n) return 0;
    const a = (k[i][1] - k[i - 1][1]) / (k[i][0] - k[i - 1][0]);
    const b = (k[i + 1][1] - k[i][1]) / (k[i + 1][0] - k[i][0]);
    return a * b <= 0 ? 0 : (k[i + 1][1] - k[i - 1][1]) / (k[i + 1][0] - k[i - 1][0]);
  };
  let i = 0;
  while (f > k[i + 1][0]) i++;
  const [t0, v0] = k[i];
  const [t1, v1] = k[i + 1];
  const h = t1 - t0;
  const t = (f - t0) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * v0 + (t3 - 2 * t2 + t) * h * slope(i) + (-2 * t3 + 3 * t2) * v1 + (t3 - t2) * h * slope(i + 1);
}

/** Monotone cubic through keys [[frame, value], ...]: a camera that glides through its marks without stopping or
 *  overshooting them. */
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
  const hh = x1 - x0;
  const t = (f - x0) / hh;
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * hh * d[i - 1] + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * hh * d[i]
  );
}
