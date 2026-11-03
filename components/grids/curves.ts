// Curves for the path components: dense polylines with arc length, so items can be placed by distance along the line.

import type { V3 } from './kit.js';

export type PathShape = 'wave' | 'triangle' | 'square' | 'infinity';
export const PATH_SHAPES: PathShape[] = ['wave', 'triangle', 'square', 'infinity'];

export interface Curve {
  pts: V3[];
  /** Cumulative arc length at each point. */
  len: number[];
  total: number;
  closed: boolean;
}

const chaikin = (pts: V3[], times: number): V3[] => {
  let p = pts;
  for (let t = 0; t < times; t += 1) {
    const q: V3[] = [];
    for (let i = 0; i < p.length; i += 1) {
      const a = p[i]!;
      const b = p[(i + 1) % p.length]!;
      q.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1], 0.75 * a[2] + 0.25 * b[2]]);
      q.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1], 0.25 * a[2] + 0.75 * b[2]]);
    }
    p = q;
  }
  return p;
};

const finish = (pts: V3[], closed: boolean): Curve => {
  const all = closed ? [...pts, pts[0]!] : pts;
  const len = [0];
  for (let i = 1; i < all.length; i += 1) {
    const a = all[i - 1]!;
    const b = all[i]!;
    len.push(len[i - 1]! + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
  }
  return { pts: all, len, total: len[len.length - 1]!, closed };
};

/** `size` is the half width of the shape in world px; `depth` is how far the line swings in z. */
export const makeCurve = (shape: PathShape, size: number, depth: number): Curve => {
  if (shape === 'wave') {
    const pts: V3[] = [];
    const n = 240;
    for (let i = 0; i <= n; i += 1) {
      const u = i / n;
      pts.push([(u - 0.5) * 2 * size * 1.5, Math.sin(u * Math.PI * 2 * 1.1 + 0.4) * size * 0.28, Math.cos(u * Math.PI * 2 * 1.1 + 0.4) * depth]);
    }
    return finish(pts, false);
  }
  if (shape === 'triangle') {
    const r = size * 0.78;
    const tri: V3[] = [[0, -r, 0], [r * 0.9, r * 0.62, 0], [-r * 0.9, r * 0.62, 0]];
    return finish(chaikin(tri, 4), true);
  }
  if (shape === 'square') {
    const w = size * 0.82;
    const h = size * 0.56;
    return finish(chaikin([[-w, -h, 0], [w, -h, 0], [w, h, 0], [-w, h, 0]], 4), true);
  }
  const pts: V3[] = [];
  const n = 280;
  for (let i = 0; i < n; i += 1) {
    const t = (i / n) * Math.PI * 2;
    const k = 1 + Math.sin(t) ** 2;
    pts.push([(size * 1.05 * Math.cos(t)) / k, (size * 1.05 * Math.sin(t) * Math.cos(t)) / k * 1.25, Math.sin(t) * depth]);
  }
  return finish(pts, true);
};

/** The point at fraction `u` of the length (wrapped for a closed curve, clamped for an open one) and its direction. */
export const sample = (c: Curve, u: number): { p: V3; t: V3 } => {
  const uu = c.closed ? ((u % 1) + 1) % 1 : Math.min(1, Math.max(0, u));
  const d = uu * c.total;
  let lo = 0;
  let hi = c.len.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (c.len[mid]! <= d) lo = mid;
    else hi = mid;
  }
  const a = c.pts[lo]!;
  const b = c.pts[hi]!;
  const seg = c.len[hi]! - c.len[lo]! || 1;
  const k = (d - c.len[lo]!) / seg;
  const t: V3 = [(b[0] - a[0]) / seg, (b[1] - a[1]) / seg, (b[2] - a[2]) / seg];
  return { p: [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k], t };
};
