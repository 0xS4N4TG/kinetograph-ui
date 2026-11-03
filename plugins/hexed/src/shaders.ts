// WGSL passes for the looks the built-in effects cannot make: mirrors, kaleidoscope, tiles, zoom blur, streaks,
// slice glitches, lens wobble and sharpen. Each reads the picture with the engine's `layer(px)` in canvas pixels,
// so each takes the picture's box on the canvas (bx, by, bw, bh) as uniforms.

import { shader } from '@kinetographdev/core';
import type { Effect } from '@kinetographdev/core';

export type Box = [number, number, number, number];

const box = ([bx, by, bw, bh]: Box) => ({ bx, by, bw, bh });

// the picture-local point of px, and back
const HEAD = `
fn mg_local(px: vec2<f32>) -> vec2<f32> { return px - vec2<f32>(u.bx, u.by); }
fn mg_canvas(l: vec2<f32>) -> vec2<f32> { return l + vec2<f32>(u.bx, u.by); }
fn mg_size() -> vec2<f32> { return vec2<f32>(u.bw, u.bh); }
fn mg_hash(n: f32) -> f32 { return fract(sin(n * 127.1 + 311.7) * 43758.5453); }
fn mg_luma(c: vec4<f32>) -> f32 { return dot(c.rgb, vec3<f32>(0.2126, 0.7152, 0.0722)); }
`;

const pass = (code: string, b: Box, uniforms: Record<string, number> = {}, padding = 0): Effect =>
  shader({ code: HEAD + code, uniforms: { ...box(b), ...uniforms }, padding });

/** One half folded onto the other. axis 0: left and right, 1: top and bottom; flip picks which half is kept. */
export const mirror = (b: Box, axis: 0 | 1, flip: boolean) =>
  pass(
    `fn effect(px: vec2<f32>) -> vec4<f32> {
  var l = mg_local(px);
  let s = mg_size();
  if (u.axis < 0.5) {
    if ((u.flip < 0.5 && l.x > s.x * 0.5) || (u.flip > 0.5 && l.x < s.x * 0.5)) { l.x = s.x - l.x; }
  } else {
    if ((u.flip < 0.5 && l.y > s.y * 0.5) || (u.flip > 0.5 && l.y < s.y * 0.5)) { l.y = s.y - l.y; }
  }
  return layer(mg_canvas(l));
}`,
    b,
    { axis, flip: flip ? 1 : 0 },
  );

/** Both mirrors: one quarter of the picture in all four corners. */
export const quad = (b: Box) =>
  pass(
    `fn effect(px: vec2<f32>) -> vec4<f32> {
  var l = mg_local(px);
  let s = mg_size();
  if (l.x > s.x * 0.5) { l.x = s.x - l.x; }
  if (l.y > s.y * 0.5) { l.y = s.y - l.y; }
  return layer(mg_canvas(l));
}`,
    b,
  );

/** The picture shrunk into an n by n grid; `flip` mirrors every other tile so the seams meet. */
export const tile = (b: Box, n: number, flip: boolean) =>
  pass(
    `fn effect(px: vec2<f32>) -> vec4<f32> {
  let s = mg_size();
  let cell = s / u.n;
  let l = mg_local(px);
  let i = floor(l / cell);
  var t = (l - i * cell) / cell;
  if (u.flip > 0.5) {
    if (i32(i.x) % 2 == 1) { t.x = 1.0 - t.x; }
    if (i32(i.y) % 2 == 1) { t.y = 1.0 - t.y; }
  }
  return layer(mg_canvas(t * s));
}`,
    b,
    { n, flip: flip ? 1 : 0 },
  );

/** Polar folds round the centre: `n` mirrored wedges, turning slowly. */
export const kaleido = (b: Box, n: number, spin: number, turn: number) =>
  pass(
    `fn effect(px: vec2<f32>) -> vec4<f32> {
  let s = mg_size();
  let c = s * 0.5;
  let d = mg_local(px) - c;
  let r = length(d);
  let seg = 6.2831853 / u.n;
  var a = atan2(d.y, d.x) + globals.time * u.spin + u.turn;
  a = a - seg * floor(a / seg);
  a = abs(a - seg * 0.5);
  let p = c + vec2<f32>(cos(a), sin(a)) * r * 0.9;
  return layer(mg_canvas(clamp(p, vec2<f32>(0.0), s)));
}`,
    b,
    { n, spin, turn },
  );

/** The two halves slid against each other, top and bottom wrapped round. */
export const splitOffset = (b: Box, shift: number, axis: 0 | 1) =>
  pass(
    `fn effect(px: vec2<f32>) -> vec4<f32> {
  let s = mg_size();
  var l = mg_local(px);
  if (u.axis < 0.5) {
    let d = select(-u.shift, u.shift, l.x < s.x * 0.5) * s.y;
    l.y = l.y + d;
    l.y = l.y - s.y * floor(l.y / s.y);
  } else {
    let d = select(-u.shift, u.shift, l.y < s.y * 0.5) * s.x;
    l.x = l.x + d;
    l.x = l.x - s.x * floor(l.x / s.x);
  }
  return layer(mg_canvas(l));
}`,
    b,
    { shift, axis },
  );

/** Samples pulled toward the centre: a zoom smear. */
export const zoomBlur = (b: Box, amount: number) =>
  pass(
    `fn effect(px: vec2<f32>) -> vec4<f32> {
  let c = mg_canvas(mg_size() * 0.5);
  var acc = vec4<f32>(0.0);
  for (var i = 0; i < 16; i = i + 1) {
    let t = 1.0 - f32(i) / 15.0 * u.amount;
    acc = acc + layer(c + (px - c) * t);
  }
  return acc / 16.0;
}`,
    b,
    { amount },
  );

/** A blur along one direction, in degrees. */
export const streak = (b: Box, length: number, angle: number) =>
  pass(
    `fn effect(px: vec2<f32>) -> vec4<f32> {
  let dir = vec2<f32>(cos(u.angle), sin(u.angle)) * u.len / 15.0;
  var acc = vec4<f32>(0.0);
  for (var i = 0; i < 16; i = i + 1) {
    acc = acc + layer(px + dir * (f32(i) - 7.5));
  }
  return acc / 16.0;
}`,
    b,
    { len: length, angle: (angle * Math.PI) / 180 },
  );

/** The whole picture dragged sideways, as a long shutter or a smeared print: each pixel trails the ones behind it
 *  with fading weight, and the length changes from one band of rows to the next, so the drag is uneven. `mix` keeps
 *  some of the sharp picture under the trail. */
export const smear = (b: Box, length: number, angle: number, mix: number, seed: number) =>
  pass(
    `fn effect(px: vec2<f32>) -> vec4<f32> {
  let dir = vec2<f32>(cos(u.angle), sin(u.angle));
  let across = dot(mg_local(px), vec2<f32>(-dir.y, dir.x));
  let band = floor(across / 6.0);
  let len = u.len * (0.35 + 0.65 * mg_hash(band + u.seed)) * (0.8 + 0.2 * mg_hash(floor(across / 40.0) + u.seed * 3.0));
  var acc = vec4<f32>(0.0);
  var total = 0.0;
  for (var i = 0; i < 24; i = i + 1) {
    let t = f32(i) / 23.0;
    let w = exp(-3.0 * t);
    acc = acc + layer(px - dir * len * t) * w;
    total = total + w;
  }
  return mix(layer(px), acc / total, u.mix);
}`,
    b,
    { len: length, angle: (angle * Math.PI) / 180, mix, seed: seed % 997 },
  );

/** Anamorphic flare: the brightest parts smeared into long horizontal streaks of a tint, added on. */
export const flare = (b: Box, length: number, threshold: number, tint: [number, number, number], gain: number) =>
  pass(
    `fn effect(px: vec2<f32>) -> vec4<f32> {
  let base = layer(px);
  var acc = 0.0;
  for (var i = -24; i <= 24; i = i + 1) {
    let f = f32(i) / 24.0;
    let c = layer(px + vec2<f32>(f * u.len, 0.0));
    acc = acc + max(mg_luma(c) - u.thr, 0.0) * (1.0 - abs(f));
  }
  let add = vec3<f32>(u.tr, u.tg, u.tb) * acc / 12.0 * u.gain;
  return vec4<f32>(base.rgb + add * base.a, base.a);
}`,
    b,
    { len: length, thr: threshold, tr: tint[0], tg: tint[1], tb: tint[2], gain },
  );

/** A lens that breathes: barrel and pincushion swinging, the picture wobbling off centre. */
export const wobble = (b: Box, amount: number, speed: number) =>
  pass(
    `fn effect(px: vec2<f32>) -> vec4<f32> {
  let s = mg_size();
  let c = s * 0.5;
  let d = (mg_local(px) - c) / s.y;
  let k = u.amount * sin(globals.time * u.speed);
  let off = vec2<f32>(sin(globals.time * u.speed * 0.7), cos(globals.time * u.speed * 0.9)) * u.amount * 0.15;
  let p = c + (d * (1.0 + k * dot(d, d)) + off) * s.y;
  return layer(mg_canvas(clamp(p, vec2<f32>(0.0), s)));
}`,
    b,
    { amount, speed },
  );

/** Horizontal bands shoved sideways, new bands every `every` frames; `split` pulls the channels apart too. */
export const slices = (b: Box, amount: number, band: number, chance: number, every: number, seed: number, split: number) =>
  pass(
    `fn effect(px: vec2<f32>) -> vec4<f32> {
  let s = mg_size();
  let l = mg_local(px);
  let tick = floor(globals.frame / u.every);
  let row = floor(l.y / u.band);
  let h = mg_hash(row * 1.37 + tick * 17.1 + u.seed);
  var dx = 0.0;
  if (h < u.chance) { dx = (mg_hash(row + tick * 3.3 + u.seed * 0.5) - 0.5) * 2.0 * u.amount * s.x; }
  let wrapx = fn_wrap(l.x + dx, s.x);
  let r = layer(mg_canvas(vec2<f32>(fn_wrap(wrapx + dx * u.split, s.x), l.y)));
  let g = layer(mg_canvas(vec2<f32>(wrapx, l.y)));
  let bl = layer(mg_canvas(vec2<f32>(fn_wrap(wrapx - dx * u.split, s.x), l.y)));
  return vec4<f32>(r.r, g.g, bl.b, g.a);
}
fn fn_wrap(x: f32, w: f32) -> f32 { return x - w * floor(x / w); }`,
    b,
    { amount, band, chance, every, seed: seed % 1000, split },
  );

/** Unsharp mask: each pixel pushed away from the mean of its neighbours. */
export const sharpen = (b: Box, amount: number) =>
  pass(
    `fn effect(px: vec2<f32>) -> vec4<f32> {
  let c = layer(px);
  let n = (layer(px + vec2<f32>(1.0, 0.0)) + layer(px - vec2<f32>(1.0, 0.0)) + layer(px + vec2<f32>(0.0, 1.0)) + layer(px - vec2<f32>(0.0, 1.0))) * 0.25;
  return vec4<f32>(max(c.rgb + (c.rgb - n.rgb) * u.amount, vec3<f32>(0.0)), c.a);
}`,
    b,
    { amount },
  );
