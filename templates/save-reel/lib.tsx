// Shared pieces of the save reel. The reusable blocks (camera, ink, icons, pointers, timing) are in the kit
// (../../kit), cut in the Pale Whip taste; this re-exports them under the names the shots use and keeps what is the
// reel's own: its constants, its pictures and the save-reminder button.

import React from 'react';
import { staticFile } from 'remotion';
import { Layer, Path, Rect, linearGradient } from '@kinetographdev/core';
import { paleWhip } from '../../tastes/pale-whip.js';
import { line } from '../../kit/core/draw.js';

export { line, rrect, polyD } from '../../kit/core/draw.js';
export type { Line } from '../../kit/core/draw.js';
export { clamp, ease, easeIn, easeOut, glide, keys, ramp, spline } from '../../kit/core/timing.js';
export { Cam } from '../../kit/core/camera.js';
export { InkLines, Ink, handLine, curve } from '../../kit/core/ink.js';
export type { InkStroke } from '../../kit/core/ink.js';
export { ICON, Icon } from '../../kit/core/icons.js';
export { Arrow, BigArrow, FlatArrow, Hand } from '../../kit/core/pointers.js';

export const W = 1080;
export const H = 810;
export const FPS = 30;
export const DURATION = 1166;

export const UI = paleWhip.fonts.ui;
export const WIDE = paleWhip.fonts.display;
export const MARKER = paleWhip.fonts.marker;
export const PEN = paleWhip.fonts.pen;

export const PAPER = paleWhip.canvas;
export const TEXT = paleWhip.ink;
export const GREY = paleWhip.muted;
export const RED_INK = paleWhip.notes.red;
export const YELLOW_INK = paleWhip.notes.yellow;
export const BLUE = paleWhip.accent;

// Bar height (px of 810) measured frame by frame on the reference: it opens and closes with the shots.
export const BARS: [number, number][] = [
  [0, 0], [12, 0], [18, 13], [24, 23], [27, 28], [33, 28], [39, 47], [45, 47], [48, 42], [51, 24], [54, 0],
  [135, 0], [150, 58], [174, 72], [228, 70], [240, 40], [252, 0], [266, 0], [276, 58], [290, 66],
  [300, 60], [310, 20], [338, 20], [348, 58], [400, 60], [414, 91], [444, 88], [450, 46], [456, 0], [750, 0], [810, 76],
];

// The posts' pictures are public-domain photos from the Internet Archive, in public/photos/ (sources and why each is
// public domain in public/photos/CREDITS.md; re-download with tools/fetch-photos.sh). The editor screenshot is drawn.
export const photoSrc = (file: string) => staticFile(`photos/${file}`);
/** Video thumbnail n of the collection grid (any integer; there are ten photos, so they repeat). */
export const thumbSrc = (n: number) => photoSrc(`thumb-${String((((n % 10) + 10) % 10) + 1).padStart(2, '0')}.jpg`);

// To use your own pictures in the feed, put them in public/media/ and pass their names as the composition's `media`
// prop; `editor` replaces the drawn editor screenshot.
export interface Media {
  hills?: string;
  editor?: string;
  photo?: string;
}
export const mediaSrc = (file: string | undefined) => (file ? staticFile(`media/${file}`) : undefined);

/** The save-reminder bookmark: a tall bookmark with round corners and a deep notch (to 63% of its height), and a
 *  stopwatch badge over its top right corner: a thick ring with one slanted hand, cut out of the bookmark by a thin
 *  gap of the background colour (`gap`). Measured on the reference. */
export const ReminderMark: React.FC<{ size: number; filled?: boolean; color?: string; badgeBg?: string; gap?: string }> = ({
  size,
  filled = false,
  color = TEXT,
  badgeBg = '#fff',
  gap = PAPER,
}) => {
  const k = size / 24;
  const circle = (r: number) => `M18.2 ${4.2 - r}A${r} ${r} 0 1 1 18.19 ${4.2 - r}Z`;
  return (
    <Layer scale={k}>
      <Path
        d="M3.8 3H17.8V21.4L10.8 14.6 3.8 21.4Z"
        fill={filled ? color : undefined}
        stroke={line({ color, width: 2.1, join: 'round', cap: 'round' })}
      />
      <Path d={circle(5.3)} fill={gap} />
      <Path d={circle(3.9)} fill={filled ? badgeBg : gap} stroke={line({ color, width: 1.9 })} />
      <Path d="M17.6 5.5L19.1 2.9" stroke={line({ color, width: 1.8, cap: 'round' })} />
    </Layer>
  );
};

// the app's glyph: a rounded square in the warm-to-violet gradient with a camera drawn in white
export const APP_GRADIENT = linearGradient(['#fdc468', '#fa7e1e', '#e3255f', '#c13584', '#7a3fe0'], { angle: 35 });

export const AppGlyph: React.FC<{ size: number }> = ({ size }) => {
  const k = size / 100;
  return (
    <Layer scale={k}>
      <Rect width={100} height={100} radius={26} fill={APP_GRADIENT} />
      <Rect x={20} y={20} width={60} height={60} radius={18} stroke={{ color: '#fff', width: 7.5 }} />
      <Path d="M50 35A15 15 0 1 1 49.99 35Z" stroke={{ color: '#fff', width: 7.5 }} />
      <Path d="M68.5 27.5A4.5 4.5 0 1 1 68.49 27.5Z" fill="#fff" />
    </Layer>
  );
};
