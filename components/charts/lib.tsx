// Shared parts of the chart components: themes, fonts, timing, number formatting, a camera, and the pieces every
// chart draws (a tooltip card, a hairline grid). Nothing here keeps state; every value is a function of the frame.

import React from 'react';
import { z } from 'zod';
import { Easing, interpolate } from 'remotion';
import { Layer, Path as Path_, Rect, Text, dropShadow } from '@kinetographdev/core';
import { loadFont as loadGeist } from '@remotion/google-fonts/Geist';
import { loadFont as loadGeistMono } from '@remotion/google-fonts/GeistMono';

export const W = 1920;
export const H = 1080;

// ---------------------------------------------------------------------------------------------------------------
// Timing

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
/** Slow in, slow out: the default for anything that travels. */
export const ease = Easing.bezier(0.45, 0, 0.15, 1);
/** Fast start, long settle: for things that arrive. */
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeIn = Easing.bezier(0.7, 0, 0.84, 0);
export const linear = (t: number) => t;

/** 0..1 progress of frame f between frames a and b, eased and held outside. */
export const seg = (f: number, a: number, b: number, e: (t: number) => number = ease) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing: e });
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** A monotone cubic through [frame, value] keys: a camera that glides through its marks without stopping or
 *  overshooting them. Flat at both ends (so it eases in and out of a hold). */
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

// ---------------------------------------------------------------------------------------------------------------
// Colour

export const hexA = (hex: string, a: number) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${clamp01(a).toFixed(4)})`;
};

export interface Theme {
  bg: string;
  /** The card the chart sits on. */
  card: string;
  /** Primary type. */
  ink: string;
  /** Secondary type, axis labels. */
  muted: string;
  /** Hairlines, grid. */
  grid: string;
  /** Card border. */
  border: string;
  /** Fill of a tooltip. */
  tip: string;
  tipInk: string;
  shadow: string;
}

// Restrained, slightly warm neutrals; the accent carries all the colour.
export const THEMES: Record<'light' | 'dark', Theme> = {
  light: {
    bg: '#f3f3f1', card: '#fcfcfb', ink: '#14151a', muted: '#7b7d86', grid: '#d3d3cd', border: '#e6e6e2',
    tip: '#ffffff', tipInk: '#14151a', shadow: '#14151a1f',
  },
  dark: {
    bg: '#0b0c0f', card: '#121317', ink: '#f2f2f4', muted: '#7d808a', grid: '#363a43', border: '#23252b',
    tip: '#1a1c22', tipInk: '#f2f2f4', shadow: '#00000099',
  },
};

// A restrained set to pick from (oklch ~0.68 / 0.15, spread round the wheel), as hex.
export const PALETTE = ['#4f7cf6', '#e0855a', '#3fb58c', '#b476e0', '#d9b44a', '#e0607a'];

/** A stroke with the fields SCENE.md has (cap, join, dashArray) that the TypeScript `Stroke` type does not list yet;
 *  the element passes them through to the scene. */
export const stroke = (color: string, width: number, o: { cap?: 'butt' | 'round' | 'square'; join?: 'miter' | 'round' | 'bevel'; dash?: number[]; offset?: number } = {}) =>
  ({ color, width, ...(o.cap ? { cap: o.cap } : {}), ...(o.join ? { join: o.join } : {}), ...(o.dash ? { dashArray: o.dash } : {}), ...(o.offset ? { dashOffset: o.offset } : {}) }) as { color: string; width: number };

export const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/).describe('A colour, #rrggbb.');
export const modeSchema = z.enum(['light', 'dark']).describe('Colour theme: light or dark.');

// ---------------------------------------------------------------------------------------------------------------
// Fonts

export interface Fonts {
  sans: string;
  mono: string;
}
export function useFonts(): Fonts {
  const sans = loadGeist('normal', { weights: ['400', '500', '600'] }).fontFamily;
  const mono = loadGeistMono('normal', { weights: ['400', '500', '600'] }).fontFamily;
  return { sans, mono };
}
/** Advance width of Geist Mono is 0.6 em, so a number's width is known without measuring. */
export const monoWidth = (text: string, size: number) => text.length * size * 0.6;

// ---------------------------------------------------------------------------------------------------------------
// Numbers

export interface NumFmt {
  prefix: string;
  suffix: string;
  decimals: number;
  /** Thousands separator, '' for none. */
  group: string;
}
export const fmtSchema = z
  .object({
    prefix: z.string().describe('Before the number, e.g. "$".'),
    suffix: z.string().describe('After the number, e.g. "%" or "k".'),
    decimals: z.number().int().min(0).max(4).describe('Digits after the decimal point.'),
    group: z.string().max(1).describe('Thousands separator, a comma by default. Empty for none.'),
  })
  .describe('How a number is written.');

export function fmt(v: number, f: NumFmt): string {
  const neg = v < 0;
  const fixed = Math.abs(v).toFixed(f.decimals);
  const [int, dec] = fixed.split('.');
  const grouped = f.group ? int.replace(/\B(?=(\d{3})+(?!\d))/g, f.group) : int;
  return `${neg ? '-' : ''}${f.prefix}${grouped}${dec ? '.' + dec : ''}${f.suffix}`;
}

// ---------------------------------------------------------------------------------------------------------------
// Camera

/** A camera on a world of pixel coordinates: the point (x, y) of the world lands in the middle of the frame, seen
 *  `zoom` times larger and, if asked, tilted. Give it an id; the motion blur matches sub-frames by id. */
export const Cam: React.FC<{
  id: string;
  x: number;
  y: number;
  zoom?: number;
  rotateX?: number;
  rotateY?: number;
  rotation?: number;
  /** Motion blur shutter in frames (0 off). */
  blur?: number;
  children: React.ReactNode;
}> = ({ id, x, y, zoom = 1, rotateX = 0, rotateY = 0, rotation = 0, blur = 0, children }) => (
  <Layer id={id} motionBlur={blur > 0 ? { samples: 8, shutter: blur } : undefined}>
    <Layer id={id + '-eye'} x={W / 2} y={H / 2} scale={zoom} rotateX={rotateX} rotateY={rotateY} rotation={rotation}>
      <Layer id={id + '-world'} x={-x} y={-y}>
        {children}
      </Layer>
    </Layer>
  </Layer>
);

/** A soft, bounded handheld drift: pixels of x and y, a function of the frame. Keep the amplitude under 1% of the
 *  frame. */
export const drift = (f: number, amp: number, seed = 0) => ({
  x: amp * (Math.sin(f * 0.021 + seed) * 0.6 + Math.sin(f * 0.053 + seed * 2.3) * 0.4),
  y: amp * (Math.sin(f * 0.017 + seed * 1.7) * 0.6 + Math.sin(f * 0.047 + seed) * 0.4),
});

// ---------------------------------------------------------------------------------------------------------------
// Curves

/** A monotone cubic (Fritsch-Carlson) through points with increasing x. Returns y at any x, with no overshoot. */
export function monotone(xs: number[], ys: number[]): (x: number) => number {
  const n = xs.length;
  if (n === 1) return () => ys[0];
  const dx = xs.slice(1).map((x, i) => x - xs[i]);
  const s = dx.map((d, i) => (ys[i + 1] - ys[i]) / d);
  const m = new Array(n).fill(0);
  m[0] = s[0];
  m[n - 1] = s[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = s[i - 1] * s[i] <= 0 ? 0 : (s[i - 1] + s[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (s[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
    } else {
      const a = m[i] / s[i];
      const b = m[i + 1] / s[i];
      const h = Math.hypot(a, b);
      if (h > 3) {
        m[i] = (3 * a * s[i]) / h;
        m[i + 1] = (3 * b * s[i]) / h;
      }
    }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = dx[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

/** Sample a curve y(x) from x0 to x1 into an SVG polyline (`M x y L ...`), a point about every `step` px. */
export function curvePath(y: (x: number) => number, x0: number, x1: number, step = 5): { d: string; pts: [number, number][] } {
  const n = Math.max(2, Math.ceil((x1 - x0) / step));
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    pts.push([x, y(x)]);
  }
  const d = pts.map(([x, py], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${py.toFixed(2)}`).join('');
  return { d, pts };
}

// ---------------------------------------------------------------------------------------------------------------
// Pieces

/** A tooltip card: label, a dot, the value, and an optional small line. Anchored by its bottom centre. */
export const Tooltip: React.FC<{
  id: string;
  x: number;
  y: number;
  label: string;
  value: string;
  note?: string;
  dot: string;
  theme: Theme;
  fonts: Fonts;
  opacity?: number;
  scale?: number;
  width?: number;
}> = ({ id, x, y, label, value, note, dot, theme, fonts, opacity = 1, scale = 1, width = 280 }) => {
  const h = note ? 136 : 112;
  return (
    <Layer id={id} x={x} y={y} anchorX={width / 2} anchorY={h} opacity={opacity} scale={scale}
      effects={[dropShadow({ y: 14, blur: 32, color: theme.shadow })]}>
      <Rect id={id + '-card'} width={width} height={h} radius={16} fill={theme.tip} stroke={{ color: theme.border, width: 1.5 }} />
      <Text id={id + '-label'} x={24} y={20} font={fonts.sans} weight={500} size={20} color={theme.muted}>{label}</Text>
      <Rect id={id + '-dot'} x={24} y={61} width={14} height={14} radius={7} fill={dot} />
      <Text id={id + '-value'} x={50} y={50} font={fonts.mono} weight={500} size={36} color={theme.tipInk}>{value}</Text>
      {note ? (
        <Text id={id + '-note'} x={24} y={98} font={fonts.sans} weight={500} size={19} color={dot}>{note}</Text>
      ) : null}
    </Layer>
  );
};

/** The card a chart sits on. */
export const Card: React.FC<{ id: string; x: number; y: number; width: number; height: number; theme: Theme; radius?: number }> = ({
  id, x, y, width, height, theme, radius = 36,
}) => (
  <Rect id={id} x={x} y={y} width={width} height={height} radius={radius} fill={theme.card} stroke={{ color: theme.border, width: 2 }}
    effects={[dropShadow({ y: 24, blur: 60, color: theme.shadow })]} />
);

/** Ground: a flat colour with a very slow light falloff, for the whole frame. */
export const Ground: React.FC<{ theme: Theme; dark: boolean }> = ({ theme, dark }) => (
  <Layer id="ground">
    <Rect id="ground-base" width={W} height={H} fill={theme.bg} />
    <Rect id="ground-light" width={W} height={H}
      fill={{ type: 'radial', units: 'box', cx: 0.5, cy: 0.35, r: 0.8,
        stops: [{ offset: 0, color: dark ? '#ffffff05' : '#ffffffcc' }, { offset: 1, color: '#ffffff00' }] }} />
  </Layer>
);

/** Small tag: a chip with a delta ("+12.4%") in the accent. Width follows the text (mono, 0.6 em per char). */
export const Chip: React.FC<{ id: string; x: number; y: number; text: string; color: string; fonts: Fonts; size?: number; opacity?: number }> = ({
  id, x, y, text, color, fonts, size = 24, opacity = 1,
}) => {
  const w = monoWidth(text, size) + size * 1.2;
  const h = size * 1.7;
  return (
    <Layer id={id} x={x} y={y} opacity={opacity}>
      <Rect id={id + '-bg'} width={w} height={h} radius={h / 2} fill={hexA(color, 0.14)} />
      <Text id={id + '-t'} x={size * 0.6} y={(h - size * 1.25) / 2} font={fonts.mono} weight={500} size={size} color={color}>{text}</Text>
    </Layer>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// Scales

/** A "nice" axis for data between lo and hi: [min, max, step] with round ticks, about `count` of them. */
export function niceScale(lo: number, hi: number, count = 4): { min: number; max: number; step: number; ticks: number[] } {
  const span = Math.max(1e-9, hi - lo);
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const min = Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = min; v <= max + step * 1e-6; v += step) ticks.push(v);
  return { min, max, step, ticks };
}

/** Wrap a draw-in so an effect that must keep to the plot is cut off at the plot edge. */
export const Hairline: React.FC<{ id: string; x0: number; x1: number; y: number; color: string; dash?: boolean; opacity?: number; width?: number }> = ({
  id, x0, x1, y, color, dash = true, opacity = 1, width = 2,
}) => (
  <Path_ id={id} d={`M${x0} ${y}H${x1}`} stroke={stroke(color, width, { cap: 'round', dash: dash ? [1, 10] : undefined })} opacity={opacity} />
);
