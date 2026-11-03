// Shared constants, timing helpers and fonts for the phone-orbit component.
//
// Everything here is in 1920x1080 canvas pixels at 60 fps; the reference (960x540, 60 fps) was measured in its own
// pixels, so numbers copied from it are doubled where they become canvas pixels.

import { Easing, interpolate } from 'remotion';
import { makeGoogleFont } from '@kinetographdev/core/google-fonts';

export const W = 1920;
export const H = 1080;
export const FPS = 60;
/** 193 frames at 60 fps, the reference's length (3.2 s) */
export const DURATION = 193;

/** frame of the hard cut from the close-up to the pulled-back shot (the reference's 15th source frame, at 24 fps) */
export const CUT = 37.5;
/** frame the second picture replaces the first inside the phone */
export const SWAP = 177.5;

/** The reference was shot at 24 fps and held to 60: each source frame lasts 2.5 frames. This returns the frame whose
 *  picture to show: `hold` is the source rate in fps (24 for the reference's look, 60 for fully smooth motion). */
export const heldFrame = (frame: number, hold: number) => {
  if (hold <= 0 || hold >= FPS) return frame;
  const step = FPS / hold;
  return Math.floor(frame / step + 1e-6) * step;
};

export type Keys = [number, number][];

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
export const ease = Easing.bezier(0.45, 0, 0.15, 1);
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeIn = Easing.bezier(0.7, 0, 0.84, 0);

/** from `from` at frame a to `to` at frame b, held outside */
export const ramp = (f: number, a: number, b: number, from: number, to: number, easing: (t: number) => number = ease) =>
  interpolate(f, [a, b], [from, to], { ...clamp, easing });

/** Monotone cubic through [frame, value] keys: glides through every key without stopping or overshooting. */
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

/** Rounded rectangle as path data (clips take a path, not a box). */
export const rrect = (w: number, h: number, r: number, x = 0, y = 0) =>
  `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}` +
  `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;

/** a fully typed stroke (SCENE.md's stroke takes cap and join; the TS type only names colour and width) */
export const stroke = (color: string, width: number, extra: { cap?: 'round' | 'butt' | 'square'; join?: 'round' | 'miter' | 'bevel' } = {}) =>
  ({ color, width, ...extra }) as { color: string; width: number };

// ---- fonts (Google fonts, as the reference uses them) ----
// Geist for the UI type, Geist Mono for the view count, Roboto Condensed for the post's caption pill.
export const UI_FONT = makeGoogleFont('Geist').loadFont('normal', { weights: ['400', '500', '600'] }).fontFamily;
export const MONO_FONT = makeGoogleFont('GeistMono').loadFont('normal', { weights: ['500'] }).fontFamily;
export const CAPTION_FONT = makeGoogleFont('RobotoCondensed').loadFont('normal', { weights: ['500', '600'] }).fontFamily;
