// What every shot shares: the canvas, the two colours, the type (Figtree Bold set tight, standing in for the
// reference's Proxima-style sans), ink measurement so a word can be placed and scaled by its ink box the way an
// After Effects text layer with its anchor at the content's centre is, and the three entry shaders.

import React from 'react';
import { random } from 'remotion';
import { Canvas, Layer, Text, shader } from '@kinetographdev/core';
import { makeGoogleFont } from '@kinetographdev/core/google-fonts';

export const W = 1080;
export const H = 1920;
export const FPS = 30;

export const LIGHT = '#f7f7f7';
export const DARK = '#050505';

export const FONT = makeGoogleFont('Figtree').loadFont('normal', { weights: ['700'] }).fontFamily;
export const WEIGHT = 700;
/** tracking, em */
export const TRACK = -0.06;
/** the baseline below a Text's y, em (Figtree, default line height) */
const BASE = 0.955;

// ---- ink ----

export interface Ink {
  /** ink edges, em, from the pen at the start of the baseline; top and bottom are y down */
  l: number;
  r: number;
  top: number;
  bottom: number;
  /** each character's pen position, em, tracking included */
  pens: number[];
}

type Surface = { getContext(type: '2d', options?: unknown): any };
let surface: Surface | null = null;
const inks = new Map<string, Ink>();
const G = 200; // px per em when measuring

/** The word's ink box, drawn once on an OffscreenCanvas with the same tracking Text gets and read back. */
export function ink(text: string): Ink {
  const hit = inks.get(text);
  if (hit) return hit;
  const Offscreen = (globalThis as { OffscreenCanvas?: new (w: number, h: number) => Surface }).OffscreenCanvas;
  if (!Offscreen) throw new Error('word-flash measures type with OffscreenCanvas: render it with Kinetograph');
  const [cw, ch] = [G * Math.max(4, text.length + 2), G * 2];
  surface ??= new Offscreen(G * 16, ch);
  const ctx = surface.getContext('2d', { willReadFrequently: true });
  ctx.clearRect(0, 0, G * 16, ch);
  ctx.font = `${WEIGHT} ${G}px ${FONT}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#fff';
  const [ox, base] = [G / 2, G * 1.3];
  const chars = Array.from(text);
  const pens = chars.map((_, k) => ctx.measureText(chars.slice(0, k).join('')).width + k * TRACK * G);
  chars.forEach((c, k) => ctx.fillText(c, ox + pens[k], base));
  const px: Uint8ClampedArray = ctx.getImageData(0, 0, cw, ch).data;
  let [l, r, t, b] = [cw, -1, ch, -1];
  for (let y = 0; y < ch; y++)
    for (let x = 0; x < cw; x++)
      if (px[(y * cw + x) * 4 + 3] > 100) {
        if (x < l) l = x;
        if (x > r) r = x;
        if (y < t) t = y;
        if (y > b) b = y;
      }
  const out: Ink = { l: (l - ox) / G, r: (r + 1 - ox) / G, top: (t - base) / G, bottom: (b + 1 - base) / G, pens: pens.map((p) => p / G) };
  inks.set(text, out);
  return out;
}

/** The size at which the word's ink is w pixels wide. */
export const fit = (text: string, w: number) => {
  const k = ink(text);
  return w / (k.r - k.l);
};

// ---- a word ----

export interface Place {
  /** ink centre x, or ink left / right edge */
  cx?: number;
  left?: number;
  right?: number;
  /** baseline y, or the ink's bottom edge */
  baseline?: number;
  bottom?: number;
}

/** A word placed by its ink and scaled about its ink centre. `chars` styles go to the Text as they are. */
export const Word: React.FC<{
  text: string;
  size: number;
  at: Place;
  color: string;
  scale?: number;
  dx?: number;
  dy?: number;
  chars?: (c: string, k: number) => Record<string, number | string> | null;
  /** more to draw in the word's frame, given where its pen starts on the baseline */
  extra?: (pen: { x: number; y: number }) => React.ReactNode;
}> = ({ text, size, at, color, scale = 1, dx = 0, dy = 0, chars, extra }) => {
  const k = ink(text);
  const w = (k.r - k.l) * size;
  const left = at.left ?? (at.right !== undefined ? at.right - w : (at.cx ?? W / 2) - w / 2);
  const baseline = at.baseline ?? (at.bottom ?? H / 2) - k.bottom * size;
  const pen = left - k.l * size;
  const px = left + w / 2;
  const py = baseline + ((k.top + k.bottom) / 2) * size;
  return (
    <Layer x={px + dx} y={py + dy} scale={scale}>
      <Text
        font={FONT}
        weight={WEIGHT}
        size={size}
        color={color}
        x={pen - px}
        y={baseline - BASE * size - py}
        chars={Array.from(text).map((c, i) => ({ x: i * TRACK * size, ...(chars?.(c, i) ?? {}) }))}
      >
        {text}
      </Text>
      {extra?.({ x: pen - px, y: baseline - py })}
    </Layer>
  );
};

// ---- shaders ----

/** A Gaussian blur along one direction (dx, dy), sigma in pixels. */
export const directionalBlur = (sigma: number, dx = 0, dy = 1) =>
  shader({
    code: `fn effect(px: vec2<f32>) -> vec4<f32> {
  let s = max(u.sigma, 0.001);
  var acc = vec4<f32>(0.0);
  var sum = 0.0;
  for (var i = -16; i <= 16; i++) {
    let t = f32(i) / 16.0 * 2.6 * s;
    let w = exp(-0.5 * (t / s) * (t / s));
    acc += layer(px + vec2<f32>(u.dx, u.dy) * t) * w;
    sum += w;
  }
  return acc / sum;
}`,
    uniforms: { sigma, dx, dy },
    padding: Math.ceil(sigma * 3),
  });

/** A grainy blur: every pixel reads a few points scattered round it, so edges dissolve into specks. */
export const grainBlur = (sx: number, sy: number) =>
  shader({
    code: `fn hash2(p: vec2<f32>) -> f32 { return fract(sin(dot(p, vec2<f32>(12.9898, 78.233))) * 43758.5453); }
fn effect(px: vec2<f32>) -> vec4<f32> {
  var acc = vec4<f32>(0.0);
  for (var i = 0; i < 3; i++) {
    let o = f32(i) * 7.31 + globals.frame * 1.7;
    let r = vec2<f32>(hash2(px + o) - 0.5, hash2(px * 1.37 + o + 3.1) - 0.5);
    acc += layer(px + r * 2.0 * vec2<f32>(u.sx, u.sy));
  }
  return acc / 3.0;
}`,
    uniforms: { sx, sy },
    padding: Math.ceil(Math.max(sx, sy)),
  });

/** A tapered wave across a word from x0, w wide, about the line y = cy: its left end squashed to a thin line
 *  (`thin` of its height) and widening to full height on the right, the whole lifted along an arc of `amp` pixels
 *  that dips on the left and peaks two thirds along. Both go to nothing as thin goes to 1 and amp to 0. */
export const ribbon = (amp: number, thin: number, x0: number, w: number, cy: number) =>
  shader({
    code: `fn effect(px: vec2<f32>) -> vec4<f32> {
  let x = (px.x - u.x0) / u.w;
  let sy = mix(u.thin, 1.0, smoothstep(-0.1, 1.0, x));
  let off = -u.amp * sin((x - 0.3) * 3.1415927 * 1.25);
  return layer(vec2<f32>(px.x, u.cy + (px.y - u.cy - off) / sy));
}`,
    uniforms: { amp, thin, x0, w, cy },
    padding: Math.ceil(Math.abs(amp) * 1.5),
  });

/** A one-sided smear: every pixel also reads up to len pixels back along (dx, dy), under the layer itself, so a
 *  word that has just moved that way stays sharp and trails behind it. */
export const smear = (len: number, dx = 0, dy = -1) =>
  shader({
    code: `fn effect(px: vec2<f32>) -> vec4<f32> {
  var acc = vec4<f32>(0.0);
  for (var i = 0; i < 24; i++) {
    acc += layer(px + vec2<f32>(u.dx, u.dy) * u.len * f32(i) / 23.0) * (1.0 - f32(i) / 24.0);
  }
  let own = layer(px);
  return own + (1.0 - own.a) * acc / 12.5;
}`,
    uniforms: { len, dx, dy },
    padding: Math.ceil(len),
  });

// ---- dust ----

/** Film dust: specks scattered fresh every frame, light on dark and dark on light. */
export const Dust: React.FC<{ f: number; color: string; count?: number }> = ({ f, color, count = 110 }) => (
  <Canvas
    width={W}
    height={H}
    draw={(ctx: any) => {
      ctx.fillStyle = color;
      for (let i = 0; i < count; i++) {
        const r = (k: string) => random(`dust-${f}-${i}-${k}`);
        const s = 0.6 + 1.8 * r('s') ** 4;
        ctx.globalAlpha = 0.35 + 0.65 * r('a');
        ctx.beginPath();
        ctx.ellipse(r('x') * W, r('y') * H, s, s * (0.7 + 0.6 * r('e')), r('t') * 3.14, 0, Math.PI * 2);
        ctx.fill();
      }
    }}
  />
);
