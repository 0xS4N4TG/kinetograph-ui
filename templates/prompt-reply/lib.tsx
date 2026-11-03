// Shared bits of the prompt-reply component: size, timing helpers, fonts, colours, the line icons.
// All drawing is authored in the reference's own pixels (960x540); the stage scales it by STAGE_SCALE.

import React from 'react';
import { Easing, Layer, Path, interpolate, interpolateColors } from '@kinetographdev/core';
import type { Stroke } from '@kinetographdev/core';
import { makeGoogleFont } from '@kinetographdev/core/google-fonts';

export const FPS = 60;
export const DURATION = 300; // 5.0 s
export const WIDTH = 1920;
export const HEIGHT = 1080;
/** The reference is 960x540; every number below is in its pixels. */
export const STAGE_SCALE = 2;
/** Frame where the prompt shot hard-cuts to the reply shot. */
export const CUT = 110;

// ---------------------------------------------------------------------------------------------------------------
// props

export type PromptReplyColors = {
  /** the page */
  background: string;
  /** the prompt box */
  surface: string;
  /** primary text and the white of the icon tiles */
  ink: string;
  /** typed characters start in this tint and fade to `ink` */
  tint: string;
  /** the icon tile's colour while an activity is running */
  active: string;
  /** dim labels (activity rows) */
  label: string;
  /** status line */
  status: string;
  /** chip text, table header, table text, link, action icons */
  chipText: string;
  head: string;
  cell: string;
  link: string;
  icons: string;
  /** the table's "value" chip text */
  value: string;
  /** hairlines: chip borders, the connector between activities */
  line: string;
};

export type PromptReplyFonts = {
  /** Google Fonts family names, as `@remotion/google-fonts/<Family>` spells them */
  ui: string;
  mono: string;
  serif: string;
};

export type PromptReplyProps = {
  /** the name in the small chip under the reply */
  brand: string;
  /** what the user types */
  prompt: string;
  /** the two activity rows that tick in above the reply */
  activities: [string, string];
  /** the small line under the second activity */
  status: string;
  /** the reply, in the serif */
  reply: string;
  /** the table: three column heads and one row; the middle cell is plain, the last one a link */
  table: { head: [string, string, string]; row: [string, string, string] };
  fonts: PromptReplyFonts;
  colors: PromptReplyColors;
};

export const defaultProps: PromptReplyProps = {
  brand: 'Kinetograph',
  prompt: 'Can you turn this release into a video?',
  activities: ['Plan the cut', 'Render preview'],
  status: 'Cut the video and pulled its preview link.',
  reply: 'I’ve cut a 20-second launch video from this release’s changelog.  Link below:',
  table: {
    head: ['Video', 'Scenes', 'Link'],
    row: ['Launch • 0:20', 'Hero, changelog, pricing', 'Open in editor'],
  },
  fonts: { ui: 'Inter', mono: 'SourceCodePro', serif: 'CormorantGaramond' },
  colors: {
    background: '#1b1b1b',
    surface: '#373735',
    ink: '#ffffff',
    tint: '#d0a2a5',
    active: '#d5523e',
    label: '#737373',
    status: '#b4b4b4',
    chipText: '#b9b9b9',
    head: '#b6b6b6',
    cell: '#9e9e9e',
    link: '#b0b0b0',
    icons: '#d2d2d2',
    value: '#bd8d9b',
    line: '#3c3c3c',
  },
};

// ---------------------------------------------------------------------------------------------------------------
// fonts

export interface Faces {
  ui: string;
  mono: string;
  serif: string;
}

/** Loads the three families (Google Fonts, downloaded once into the cache) and returns the names to use. */
export function loadFaces(fonts: PromptReplyFonts): Faces {
  const load = (family: string, weights: string[]) =>
    makeGoogleFont(family).loadFont('normal', { weights }).fontFamily;
  return {
    ui: load(fonts.ui, ['400', '500']),
    mono: load(fonts.mono, ['400']),
    serif: load(fonts.serif, ['400', '500', '600']),
  };
}

/** line-height / size of the default fonts, to centre a text box on a point */
export const LH = { ui: 1.21, mono: 1.3, serif: 1.211 };

/** Letter-spacing, in px, of the reference's interface type at `size` px (Inter's own size-dependent tracking: tight
 *  in large type, a little open in small). The text element has no letter-spacing, so callers offset each character. */
export const tracking = (size: number) => (-0.0223 + 0.185 * Math.exp(-0.1745 * (size / 2))) * size;

// ---------------------------------------------------------------------------------------------------------------
// timing

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
export const easeOutCubic = Easing.bezier(0.215, 0.61, 0.355, 1);
export const easeOutQuad = Easing.bezier(0.25, 0.46, 0.45, 0.94);
export const easeInOut = Easing.bezier(0.45, 0, 0.55, 1);

/** 0..1 over [from, from + dur] with an easing, held outside */
export const ramp = (f: number, from: number, dur: number, easing: (t: number) => number = (t) => t) =>
  interpolate(f, [from, from + dur], [0, 1], { ...clamp, easing });

/** A monotone cubic through [frame, value] keys: a camera that glides through measured marks without overshoot. */
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
  let i = 0;
  while (f > k[i + 1][0]) i++;
  const h = k[i + 1][0] - k[i][0];
  const t = (f - k[i][0]) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * k[i][1] +
    (t3 - 2 * t2 + t) * h * d[i] +
    (-2 * t3 + 3 * t2) * k[i + 1][1] +
    (t3 - t2) * h * d[i + 1]
  );
}

/** colour a -> b, t 0..1 */
export const mix = (a: string, b: string, t: number) => interpolateColors(Math.min(1, Math.max(0, t)), [0, 1], [a, b]);

/** Kinetograph blends in linear light, a browser in sRGB. A fade drawn at `alpha` here would look brighter than the same
 *  fade in the reference, so this returns the opacity that gives the sRGB result: the colour `fg` fading in over `bg`
 *  (#rgb or #rrggbb). Anything else is returned unchanged. */
export function fadeAlpha(alpha: number, fg: string, bg: string): number {
  const parse = (c: string): number[] | null => {
    const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c.trim());
    if (!m) return null;
    const h = m[1].length === 3 ? m[1].split('').map((x) => x + x).join('') : m[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  };
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const a = parse(fg);
  const b = parse(bg);
  if (!a || !b) return alpha;
  const lum = (c: number[]) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const lf = lum(a);
  const lb = lum(b);
  if (Math.abs(lf - lb) < 1e-4) return alpha;
  // perceived (sRGB) level of the faded colour, taken on luminance, then back to the linear mix that reaches it
  const sv = (l: number) => (l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055);
  const target = sv(lb) + alpha * (sv(lf) - sv(lb));
  return Math.min(1, Math.max(0, (lin(target) - lb) / (lf - lb)));
}

// ---------------------------------------------------------------------------------------------------------------
// drawing helpers

/** A stroke with caps and joins (the TS type only names colour and width; the engine draws the rest). */
export const line = (s: { color: string; width: number; cap?: 'round' | 'butt'; join?: 'round' | 'miter' }): Stroke =>
  s as unknown as Stroke;

export const ICON = {
  copy: 'M9 9H20A1.5 1.5 0 0 1 21.5 10.5V20A1.5 1.5 0 0 1 20 21.5H10.5A1.5 1.5 0 0 1 9 20ZM5.5 15H4.5A1.5 1.5 0 0 1 3 13.5V4.5A1.5 1.5 0 0 1 4.5 3H13.5A1.5 1.5 0 0 1 15 4.5V5.5',
  speaker:
    'M2.6 9.2H5.6L11.8 4V20L5.6 14.8H2.6Z M15.6 7.4Q20.6 12 15.6 16.6 M18.4 5Q26.6 12 18.4 19',
  up: 'M7.2 10.5V21H3.8A1 1 0 0 1 2.8 20V11.5A1 1 0 0 1 3.8 10.5ZM7.2 10.5L11.3 3.4A2.2 2.2 0 0 1 14 5.4L13.4 9.5H19.4A2 2 0 0 1 21.3 12.2L19.6 19.4A2.2 2.2 0 0 1 17.5 21H7.2',
  down: 'M16.8 13.5V3H20.2A1 1 0 0 1 21.2 4V12.5A1 1 0 0 1 20.2 13.5ZM16.8 13.5L12.7 20.6A2.2 2.2 0 0 1 10 18.6L10.6 14.5H4.6A2 2 0 0 1 2.7 11.8L4.4 4.6A2.2 2.2 0 0 1 6.5 3H16.8',
  dots: 'M5.4 12h.01M12 12h.01M18.6 12h.01',
  plus: 'M12 3V21M3 12H21',
};

export const Icon: React.FC<{
  id: string;
  d: string;
  size: number;
  color: string;
  stroke?: number;
  x: number;
  y: number;
  opacity?: number;
}> = ({ id, d, size, color, stroke = 1.7, x, y, opacity = 1 }) => (
  <Layer id={id} x={x} y={y} scale={size / 24} opacity={opacity}>
    <Path id={`${id}-p`} d={d} stroke={line({ color, width: stroke, cap: 'round', join: 'round' })} />
  </Layer>
);

/** The small video-camera glyph in an activity tile, traced from the reference: an open box (a "C" with a 3 px stroke)
 *  and a lens that widens to the right. Coordinates are the row's own (tile top-left at 61.7, 0.6, 33.4 square). */
export const CameraGlyph: React.FC<{ id: string; color: string }> = ({ id, color }) => (
  <Layer id={id}>
    <Path
      id={`${id}-body`}
      d="M81.5 11H72.4A1.5 1.5 0 0 0 70.9 12.5V20.95A1.5 1.5 0 0 0 72.4 22.45H81.5"
      stroke={line({ color, width: 3, cap: 'butt', join: 'round' })}
    />
    <Path
      id={`${id}-lens`}
      d="M82.1 14.4L86.7 12.1V21.6L82.1 19.9Z"
      fill={color}
      stroke={line({ color, width: 0.9, join: 'round' })}
    />
  </Layer>
);
