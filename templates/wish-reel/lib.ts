// Shared pieces of the wish reel: size and timing, the palette, easing helpers, the WGSL grades and a pinhole
// camera that matches <Camera3D>, so lines drawn in 2D sit in the same space as the 3D layers.

import { random } from 'remotion';
import { makeGoogleFont } from '@kinetographdev/core/google-fonts';

export const W = 1440;
export const H = 1080;
export const FPS = 30;
export const DURATION = 540;

export const SANS = makeGoogleFont('Inter').loadFont('normal', { weights: ['400', '500', '700'] }).fontFamily;
export const JP = makeGoogleFont('Noto Sans JP').loadFont('normal', { weights: ['500', '700'] }).fontFamily;
// Times-like, for the roman numerals
export const SERIF = makeGoogleFont('Tinos').loadFont('normal', { weights: ['400'] }).fontFamily;

// The reel's pastel pop palette.
export const PAL = {
  cyan: '#2fd8e0',
  mint: '#43e89a',
  lime: '#a6f25a',
  yellow: '#ffe24d',
  orange: '#ff9a3c',
  coral: '#ff6b6b',
  pink: '#ff67b3',
  violet: '#a77bff',
  blue: '#3c7bff',
  white: '#fbfbfd',
};
export const RAINBOW = [PAL.pink, PAL.orange, PAL.yellow, PAL.lime, PAL.mint, PAL.cyan, PAL.blue, PAL.violet];

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t: number) => t * t * t;
/** 0..1 across frames a..b, clamped, with an easing. */
export const prog = (f: number, a: number, b: number, e: (t: number) => number = smooth) => e(clamp((f - a) / (b - a)));
export const rnd = (seed: string | number) => random(seed);
export const pick = <T,>(arr: T[], seed: string | number) => arr[Math.floor(rnd(seed) * arr.length) % arr.length];
/** How far a look has arrived on frame l: plain footage for its first frames, then the effect builds in. */
export const arrive = (l: number) => smooth(clamp((l - 2) / 8));
/** Animation on twos: holds every other frame, like the reel's 15 drawings a second. */
export const twos = (f: number) => Math.floor(f / 2) * 2;

/** A hex colour as linear RGB, for shader uniforms. */
export function linear(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.pow(c / 255, 2.2)) as [number, number, number];
}

// ---- the camera ----

export type V3 = [number, number, number];
export interface Cam {
  pos: V3;
  target: V3;
  fov: number; // vertical, degrees
}
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** The world point `d` metres out along the ray through canvas pixel (x, y). */
export function unproject(cam: Cam, x: number, y: number, d: number): V3 {
  const fwd = norm(sub(cam.target, cam.pos));
  const right = norm(cross(fwd, [0, 1, 0]));
  const up = cross(right, fwd);
  const k = H / 2 / Math.tan(((cam.fov / 2) * Math.PI) / 180);
  const dir = norm([
    fwd[0] + (right[0] * (x - W / 2) - up[0] * (y - H / 2)) / k,
    fwd[1] + (right[1] * (x - W / 2) - up[1] * (y - H / 2)) / k,
    fwd[2] + (right[2] * (x - W / 2) - up[2] * (y - H / 2)) / k,
  ]);
  return [cam.pos[0] + dir[0] * d, cam.pos[1] + dir[1] * d, cam.pos[2] + dir[2] * d];
}

/** Where a world point lands on the canvas, and its depth along the view; null behind the camera. */
export function project(cam: Cam, p: V3): { x: number; y: number; d: number } | null {
  const fwd = norm(sub(cam.target, cam.pos));
  const right = norm(cross(fwd, [0, 1, 0]));
  const up = cross(right, fwd);
  const v = sub(p, cam.pos);
  const d = dot(v, fwd);
  if (d < 0.05) return null;
  const k = H / 2 / Math.tan(((cam.fov / 2) * Math.PI) / 180);
  return { x: W / 2 + (dot(v, right) / d) * k, y: H / 2 - (dot(v, up) / d) * k, d };
}

// ---- WGSL ----

export const COMMON = `
fn hash2(p: vec2<f32>) -> f32 {
  let q = fract(p * vec2<f32>(123.34, 456.21));
  let r = q + dot(q, q + 45.32);
  return fract(r.x * r.y);
}
fn vnoise(p: vec2<f32>) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let s = f * f * (3.0 - 2.0 * f);
  let a = hash2(i);
  let b = hash2(i + vec2<f32>(1.0, 0.0));
  let c = hash2(i + vec2<f32>(0.0, 1.0));
  let d = hash2(i + vec2<f32>(1.0, 1.0));
  return mix(mix(a, b, s.x), mix(c, d, s.x), s.y);
}
fn lin(c: vec3<f32>) -> vec3<f32> { return pow(c, vec3<f32>(2.2)); }
fn lum(c: vec4<f32>) -> f32 {
  let s = pow(max(c.rgb, vec3<f32>(0.0)), vec3<f32>(1.0 / 2.2));
  return dot(s, vec3<f32>(0.2126, 0.7152, 0.0722));
}
`;

// The pop grade: the brightest tones blow out to white, two bands of mid tones become flat colours, the darkest keep
// the photo (either band can keep the photo instead: k1, k2). `spread` grows the flat colours over the picture in blotches (noise below the level), `white` lowers
// the blow-out level as the shot washes out, `invert` flips the whole thing for a frame.
export const POP = `${COMMON}
fn effect(px: vec2<f32>) -> vec4<f32> {
  let s = layer(px);
  let l = lum(s);
  let blot = vnoise(px * 0.0032 + vec2<f32>(u.seed * 1.7, u.seed * 0.3)) * 0.7 + vnoise(px * 0.02) * 0.3;
  let on = step(blot, u.spread);
  var c = s.rgb;
  if (l > u.white) {
    c = vec3<f32>(1.0);
  } else if (on > 0.5 && l > u.hi) {
    c = mix(vec3<f32>(u.r2, u.g2, u.b2), c, u.k2);
  } else if (on > 0.5 && l > u.lo) {
    c = mix(vec3<f32>(u.r1, u.g1, u.b1), c, u.k1);
  }
  c = mix(c, vec3<f32>(1.0) - c, u.invert);
  return vec4<f32>(c, 1.0);
}`;

/** Uniforms for POP: two flat colours and the levels. `amount` brings the whole grade in from the plain photo (0)
 *  to full (1): the flat colours spread in blotches and the white rises in. */
export function pop(o: { c1: string; c2: string; lo?: number; hi?: number; white?: number; spread?: number; invert?: number; seed?: number; k1?: number; k2?: number; amount?: number }) {
  const amount = o.amount ?? 1;
  const [r1, g1, b1] = linear(o.c1);
  const [r2, g2, b2] = linear(o.c2);
  return {
    r1, g1, b1, r2, g2, b2,
    lo: o.lo ?? 0.42,
    hi: o.hi ?? 0.62,
    white: lerp(2, o.white ?? 0.86, amount),
    spread: (o.spread ?? 1) * amount,
    invert: o.invert ?? 0,
    seed: o.seed ?? 0,
    k1: o.k1 ?? 0,
    k2: o.k2 ?? 0,
  };
}

// A zoom blur toward a point: the reel's whip between shots.
export const ZOOM = `
fn effect(px: vec2<f32>) -> vec4<f32> {
  let c = vec2<f32>(u.cx, u.cy);
  var acc = vec4<f32>(0.0);
  for (var i = 0; i < 24; i = i + 1) {
    let t = f32(i) / 23.0;
    acc = acc + layer(mix(px, c, t * u.amount));
  }
  return acc / 24.0;
}`;

// A sideways smear, for the sea's exit.
export const SMEAR = `
fn effect(px: vec2<f32>) -> vec4<f32> {
  var acc = vec4<f32>(0.0);
  for (var i = 0; i < 24; i = i + 1) {
    let t = f32(i) / 23.0 - 0.5;
    acc = acc + layer(px + vec2<f32>(t * u.amount, 0.0));
  }
  return acc / 24.0;
}`;

// ---- the tracked cameras (cams/*.ts, from tools/track-camera.mjs) ----

export interface Track {
  fov: number;
  frames: { p: number[]; t: number[]; r: number }[];
}

/** A prepared video (tools/prepare.mjs): the plate in public/, its camera track, where in it a shot starts, and
 *  its vanishing point in that first frame (default: the middle, a little low). */
export interface Clip {
  src: string;
  track: Track;
  trim?: number;
  vp?: { x: number; y: number };
}
export const vpOf = (c: Clip) => c.vp ?? { x: W / 2, y: H * 0.52 };
/** The camera on frame `l` of a shot that starts `clip.trim` frames into the clip. */
export const clipAt = (c: Clip, l: number) => tracked(c.track, (c.trim ?? 0) + l);
/** The camera on the shot's first frame, which the shot's props are placed from. */
export const clipStart = (c: Clip) => clipAt(c, 0).cam;

/** The camera for frame `i` of a tracked plate (held at its ends), and the roll to turn the tracked layers by. */
export function tracked(t: Track, i: number): { cam: Cam; roll: number } {
  const fr = t.frames[Math.max(0, Math.min(t.frames.length - 1, Math.round(i)))];
  return { cam: { pos: fr.p as V3, target: fr.t as V3, fov: t.fov }, roll: fr.r };
}
