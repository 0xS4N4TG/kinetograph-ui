// Timing helpers for the wait-ship component. Everything is measured on the 60 fps, 960 x 540 reference
// (reference/reel.mp4) and written in those "reference units"; the scene draws them 2x for 1920 x 1080.

export const FPS = 60;
export const DURATION = 148; // the reference's 148 frames (2.47 s)
export const W = 1920;
export const H = 1080;
/** Reference units to canvas pixels. */
export const K = 2;

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

/** 0..1 ramp between two frames, no easing. */
export const ramp = (f: number, a: number, b: number) => clamp((f - a) / (b - a));

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
export const easeOutQuart = (t: number) => 1 - Math.pow(1 - clamp(t), 4);
export const easeInOut = (t: number) => {
  const c = clamp(t);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};
export const smooth = (t: number) => {
  const c = clamp(t);
  return c * c * (3 - 2 * c);
};

/**
 * A smooth curve through (frame, value) points: monotone cubic (Fritsch-Carlson), so it never overshoots the
 * points and has no kinks. Holds the first and last value outside the range.
 */
export function curve(f: number, pts: [number, number][]): number {
  const n = pts.length;
  if (f <= pts[0][0]) return pts[0][1];
  if (f >= pts[n - 1][0]) return pts[n - 1][1];
  const h: number[] = [];
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    h.push(pts[i + 1][0] - pts[i][0]);
    d.push((pts[i + 1][1] - pts[i][1]) / h[i]);
  }
  const m: number[] = new Array(n).fill(0);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  let i = 0;
  while (f > pts[i + 1][0]) i++;
  const t = (f - pts[i][0]) / h[i];
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * pts[i][1] +
    (t3 - 2 * t2 + t) * h[i] * m[i] +
    (-2 * t3 + 3 * t2) * pts[i + 1][1] +
    (t3 - t2) * h[i] * m[i + 1]
  );
}

/** Scales an SVG path written in fractions of a box (absolute commands only) to w x h. */
export function boxPath(w: number, h: number, d: string): string {
  let n = 0;
  return d.replace(/-?\d*\.?\d+/g, (tok) => {
    const v = parseFloat(tok) * (n % 2 === 0 ? w : h);
    n++;
    return v.toFixed(2);
  });
}
