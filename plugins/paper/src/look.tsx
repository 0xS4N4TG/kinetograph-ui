// What the pages are made of: the faces (a text serif, a sans for web pages, and display, condensed and block faces
// for headlines), text measurement so a line can be laid out word by word, the paper (a tint, crumpled creases lit
// from the top left, an optional scan), and the focus blur that keeps the keyword's line sharp while the rest of the
// page goes soft.

import React from 'react';
import { staticFile } from '@kinetographdev/core';
import { Image, Layer, Noise, Rect, radialGradient, shader } from '@kinetographdev/core';
import { makeGoogleFont } from '@kinetographdev/core/google-fonts';

// ---- type ----

const SERIF = makeGoogleFont('SourceSerif4').loadFont('normal', { weights: ['400', '700'] }).fontFamily;
makeGoogleFont('SourceSerif4').loadFont('italic', { weights: ['700'] });
const SANS = makeGoogleFont('Inter').loadFont('normal', { weights: ['500', '700'] }).fontFamily;
const DISPLAY = makeGoogleFont('PlayfairDisplay').loadFont('normal', { weights: ['700'] }).fontFamily;
const CONDENSED = makeGoogleFont('Oswald').loadFont('normal', { weights: ['600'] }).fontFamily;
const BLOCK = makeGoogleFont('ArchivoBlack').loadFont('normal', { weights: ['400'] }).fontFamily;

export interface Face {
  family: string;
  weight: number;
  style: 'normal' | 'italic';
  /** the baseline below a Text's y at line height 1.2, em (measured) */
  base: number;
  /** cap height, em */
  cap: number;
}

export const FACES = {
  serif: { family: SERIF, weight: 400, style: 'normal', base: 0.95, cap: 0.67 },
  serifBold: { family: SERIF, weight: 700, style: 'normal', base: 0.95, cap: 0.67 },
  serifItalic: { family: SERIF, weight: 700, style: 'italic', base: 0.95, cap: 0.67 },
  sans: { family: SANS, weight: 500, style: 'normal', base: 0.96, cap: 0.72 },
  sansBold: { family: SANS, weight: 700, style: 'normal', base: 0.96, cap: 0.72 },
  display: { family: DISPLAY, weight: 700, style: 'normal', base: 1.015, cap: 0.705 },
  condensed: { family: CONDENSED, weight: 600, style: 'normal', base: 1.05, cap: 0.805 },
  block: { family: BLOCK, weight: 400, style: 'normal', base: 0.93, cap: 0.68 },
} satisfies Record<string, Face>;

export type FaceKey = keyof typeof FACES;

type Surface = { getContext(type: '2d'): any };
let surface: Surface | null = null;
const widths = new Map<string, number>();

/** The advance of `text` in `face` at `size` px, measured once at 100 px on an OffscreenCanvas. */
export function measure(text: string, face: FaceKey, size: number): number {
  const key = `${face}:${text}`;
  let w = widths.get(key);
  if (w === undefined) {
    const Offscreen = (globalThis as { OffscreenCanvas?: new (w: number, h: number) => Surface }).OffscreenCanvas;
    if (!Offscreen) throw new Error('match-cut measures type with OffscreenCanvas: render it with Kinetograph');
    surface ??= new Offscreen(8, 8);
    const ctx = surface.getContext('2d');
    const f = FACES[face];
    ctx.font = `${f.style} ${f.weight} 100px ${f.family}`;
    w = ctx.measureText(text).width / 100;
    widths.set(key, w);
  }
  return w * size;
}

// ---- paper ----

/** Creases: the noise read as a height field and lit from the top left, as a multiply layer (white leaves the
 *  paper as it is, the shaded side of a crease darkens it). */
const CREASE = `fn effect(px: vec2<f32>) -> vec4<f32> {
  let e = 1.5;
  let hx = layer(px + vec2<f32>(e, 0.0)).r - layer(px - vec2<f32>(e, 0.0)).r;
  let hy = layer(px + vec2<f32>(0.0, e)).r - layer(px - vec2<f32>(0.0, e)).r;
  let n = normalize(vec3<f32>(-hx * u.depth, -hy * u.depth, 1.0));
  let lit = dot(n, normalize(vec3<f32>(-0.6, -0.7, 0.9)));
  let v = clamp(mix(1.0 - u.strength, 1.0, smoothstep(0.35, 0.95, lit)), 0.0, 1.0);
  return vec4<f32>(v, v, v, 1.0);
}`;

/** The sheet: a tint, crumpled creases, a scan multiplied over it if one is given (`texture`, a path under public/,
 *  stretched to cover), a soft fall-off to the corners. `seed` picks the crumple. */
export const Paper: React.FC<{ w: number; h: number; tint: string; seed: number; crumple: number; texture?: string; textureOpacity?: number }> = ({
  w,
  h,
  tint,
  seed,
  crumple,
  texture,
  textureOpacity = 1,
}) => (
  <Layer>
    <Rect width={w} height={h} fill={tint} />
    {texture ? (
      <Layer blendMode="multiply" opacity={textureOpacity}>
        <Image src={staticFile(texture)} width={w} height={h} fit="cover" />
      </Layer>
    ) : null}
    {crumple > 0 ? (
      <Layer blendMode="multiply">
        <Noise
          width={w}
          height={h}
          channels="gray"
          turbulence={{ type: 'turbulence', baseFrequency: 1.6 / w, numOctaves: 4, seed }}
          effects={[shader({ code: CREASE, uniforms: { depth: 14, strength: 0.16 * crumple } })]}
        />
      </Layer>
    ) : null}
    <Rect width={w} height={h} fill={radialGradient(['rgba(0,0,0,0)', [0.7, 'rgba(0,0,0,0)'], [1, 'rgba(40,32,20,0.16)']], { cx: 0.5, cy: 0.5, r: 0.75 })} />
  </Layer>
);

// ---- focus ----

/** Sharp on a band round the line y = ay, softer with distance above and below it (full blur `falloff` bands out), the blur `smear` times taller
 *  than wide there so copy runs into vertical streaks; past `side` from the middle the blur also streaks sideways.
 *  Each pixel gathers 24 points on a spiral sized by its own blur. */
export const focus = (blur: number, smear: number, ay: number, band: number, falloff: number, ax: number, side: number, streak: number) =>
  shader({
    code: `fn effect(px: vec2<f32>) -> vec4<f32> {
  let off = u.blur * smoothstep(u.band, u.band * u.falloff, abs(px.y - u.ay));
  let ry = off * u.smear;
  let rx = off + u.streak * smoothstep(u.side, u.side * 1.6, abs(px.x - u.ax));
  if (max(rx, ry) < 0.3) { return layer(px); }
  var acc = vec4<f32>(0.0);
  for (var i = 0; i < 24; i++) {
    let k = (f32(i) + 0.5) / 24.0;
    let a = f32(i) * 2.3999632;
    acc += layer(px + vec2<f32>(cos(a) * rx, sin(a) * ry) * sqrt(k));
  }
  return acc / 24.0;
}`,
    uniforms: { blur, smear, ay, band, falloff, ax, side, streak },
    padding: Math.ceil(blur * smear + streak),
  });

// ---- screen ----

/**
 * The page as a filmed screen: the picture broken into `pixel`-px cells, each lit as three soft RGB stripes with a dark
 * gap between rows (an LCD's subpixels, close up), a slight barrel from the lens (`curve`, filling the frame), and a
 * soft fall-off to the corners. `amount` 0..1 mixes it in. Screen space, so the grid holds still under a
 * push-in, as the monitor does in front of a camera.
 */
export const screen = (amount: number, pixel: number, curve: number, width: number, height: number) =>
  shader({
    code: `fn effect(px: vec2<f32>) -> vec4<f32> {
  let c = vec2<f32>(u.w, u.h) * 0.5;
  // the lens: a barrel, normalised so the corners land on the frame's corners (no dark edge, the middle a touch bigger)
  let q = (px - c) / c;
  let r2 = dot(q, q) * 0.5;
  let src = c + q * c * (1.0 + u.curve * r2) / (1.0 + u.curve);
  // the panel's grid stays straight in frame: a curved grid at this pitch rings with moiré
  let cell = floor(px / u.pixel);
  let f = fract(px / u.pixel);
  let mid = src + ((cell + 0.5) * u.pixel - px);
  // the cell's colour: its middle, with a little of its neighbours, as an LCD's light spreads
  let col = layer(mid).rgb * 0.7 + (layer(mid + vec2<f32>(u.pixel, 0.0)).rgb + layer(mid - vec2<f32>(u.pixel, 0.0)).rgb) * 0.15;
  // three stripes across the cell, soft so a channel leaks into its neighbours; a dark gap between rows
  let sx = f.x * 3.0;
  let bell = vec3<f32>(
    exp(-pow((sx - 0.5) * 1.6, 2.0)),
    exp(-pow((sx - 1.5) * 1.6, 2.0)),
    exp(-pow((sx - 2.5) * 1.6, 2.0)));
  let gap = smoothstep(0.0, 0.14, f.y) * smoothstep(1.0, 0.86, f.y) * smoothstep(0.0, 0.05, f.x) * smoothstep(1.0, 0.95, f.x);
  let mask = (0.4 + 0.6 * bell) * (0.55 + 0.45 * gap) * 1.55;
  let lcd = min(col * mask, vec3<f32>(1.0));
  // the corners fall off, as a panel seen slightly off axis
  let v = 1.0 - 0.2 * smoothstep(0.5, 1.5, length(q));
  let orig = layer(src).rgb;
  return vec4<f32>(mix(orig, lcd * v, u.amount), 1.0);
}`,
    uniforms: { amount, pixel: Math.max(2, pixel), curve, w: width, h: height },
  });
