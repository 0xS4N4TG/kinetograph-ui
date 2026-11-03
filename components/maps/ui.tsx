// What the three map components share: the font, tracked small caps, the attribution line, a vignette and the reader
// of the capture's track file (capture/capture.mjs: where each place and the arc sit on the screen, frame by frame).

import React from 'react';
import { Layer, Rect, Text, radialGradient, dropShadow } from '@kinetographdev/core';
import { makeGoogleFont } from '@kinetographdev/core/google-fonts';
import { Easing, interpolate } from 'remotion';

export const W = 1920;
export const H = 1080;
export const FPS = 30;

export type XY = [number, number];

/** One frame of a capture's track file. */
export interface TrackFrame {
  cam: { center: XY; zoom: number; bearing: number; pitch: number };
  /** The great circle from A to B in screen pixels (flyover only). */
  arc?: XY[];
  /** Screen position of each named place, in the order the capture was given them. */
  places: XY[];
  /** 0..1 along the arc of the arc's head (flyover only). */
  progress?: number;
  /** Camera height in metres above sea level (terrain dive only). */
  alt?: number;
}
export interface Track {
  meta: { id: string; fps: number; frames: number; pace?: number; from?: XY; to?: XY; city?: XY; places?: { name: string; at: XY; elevation?: number }[] };
  track: TrackFrame[];
}

/** The track at frame f (held at the last frame past the end). */
export const at = (t: Track, f: number): TrackFrame => t.track[Math.min(t.track.length - 1, Math.max(0, Math.floor(f)))];

export const useFont = (family: string): string =>
  makeGoogleFont(family).loadFont('normal', { weights: ['400', '500', '600'] }).fontFamily;

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeInOut = Easing.bezier(0.45, 0, 0.15, 1);
/** from..to over frames a..b, eased. */
export const ramp = (f: number, a: number, b: number, from = 0, to = 1, easing = easeOut) =>
  interpolate(f, [a, b], [from, to], { ...clamp, easing });

/** A stroke with round caps and joins (the engine draws them; the TS `Stroke` type does not list them). */
export const stroke = (color: string, width: number) => ({ color, width, cap: 'round', join: 'round' }) as unknown as { color: string; width: number };

/** Tracked (letter-spaced) text: the engine has no letterSpacing, so each glyph is offset by a fixed step. */
export const Tracked: React.FC<{
  id: string;
  family: string;
  text: string;
  size: number;
  weight?: number;
  color: string;
  x: number;
  y: number;
  tracking?: number;
  opacity?: number;
}> = ({ id, family, text, size, weight = 500, color, x, y, tracking = 0.18, opacity = 1 }) => (
  <Text id={id} font={family} weight={weight} size={size} color={color} x={x} y={y} opacity={opacity} chars={(_c: string, i: number) => ({ x: i * size * tracking })}>
    {text}
  </Text>
);

/** The width Tracked text takes (for right-aligning): an estimate from the size, as glyph widths are not measured. */
export const trackedWidth = (text: string, size: number, tracking = 0.18) => text.length * size * (0.62 + tracking);

export const Attribution: React.FC<{ family: string; text: string; color?: string; opacity?: number }> = ({ family, text, color = '#ffffff', opacity = 0.6 }) => (
  <Text id="attribution" font={family} weight={400} size={15} color={color} opacity={opacity} x={W - 36 - text.length * 7.3} y={H - 44}>
    {text}
  </Text>
);

/** A soft darkening toward the corners, so type at the edges holds on any ground. */
export const Vignette: React.FC<{ strength: number }> = ({ strength }) => (
  <Rect id="vignette" width={W} height={H} fill={radialGradient([[0, 'rgba(0,0,0,0)'], [0.55, 'rgba(0,0,0,0)'], [1, `rgba(0,0,0,${strength})`]], { cx: 0.5, cy: 0.5, r: 0.72 })} />
);

export const textShadow = [dropShadow({ x: 0, y: 2, blur: 12, color: 'rgba(0,0,0,0.45)' })];
export { Layer };
