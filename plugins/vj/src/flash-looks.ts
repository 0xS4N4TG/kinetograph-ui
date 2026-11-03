// Four flash-cut looks, the kind an edit cuts to for a few frames on a hit: a blown screen glow, an acid heat
// camera, night vision and grainy black and white. Each comes in numbered variants (`v`), matched by eye to the
// usual looks of the genre, and is built from the engine's own effects plus three small WGSL passes (a directional
// blur, a mirror and an acid palette). No outside footage or presets: an overlay, when a variant wants one, is the
// caller's own picture.

import { blur, brightness, contrast, glow, gradientMap, grain, grayscale, saturate, shader } from '@kinetographdev/core';
import type { Effect } from '@kinetographdev/core';

type Stops = [number, string][];
/** A picture's place on the canvas, [x, y, w, h] px, for the passes that read by position. */
export type Box = [number, number, number, number];
const map = (stops: Stops, amount = 1) => gradientMap({ stops: stops.map(([offset, color]) => ({ offset, color })), amount });

/** A blur along one direction (degrees), as a fast pan or a shake smears it. */
export function streak(length: number, angle = 0): Effect {
  return shader({
    code: /* wgsl */ `
fn effect(px: vec2<f32>) -> vec4<f32> {
  let d = vec2<f32>(cos(u.angle), sin(u.angle)) * u.len / 23.0;
  var acc = vec4<f32>(0.0);
  for (var i = 0; i < 24; i = i + 1) { acc = acc + layer(px + d * (f32(i) - 11.5)); }
  return acc / 24.0;
}`,
    uniforms: { len: length, angle: (angle * Math.PI) / 180 },
    padding: 0,
  });
}

/** One half folded onto the other. axis 0: left onto right, 1: top onto bottom. `box` is the picture on the canvas
 *  ([x, y, w, h], px); without it, the whole canvas. */
export function fold(axis: 0 | 1 = 0, box?: Box): Effect {
  const [bx, by, bw, bh] = box ?? [0, 0, -1, -1];
  return shader({
    code: /* wgsl */ `
fn effect(px: vec2<f32>) -> vec4<f32> {
  let o = vec2<f32>(u.bx, u.by);
  let s = select(vec2<f32>(u.bw, u.bh), globals.canvas, u.bw < 0.0);
  var p = px - o;
  if (u.axis < 0.5) { if (p.x > s.x * 0.5) { p.x = s.x - p.x; } } else { if (p.y > s.y * 0.5) { p.y = s.y - p.y; } }
  return layer(p + o);
}`,
    uniforms: { axis, bx, by, bw, bh },
    padding: 0,
  });
}

/** Brightness to hue: from `hue` (degrees) round the colour wheel `cycles` times (negative runs the other way) as
 *  the picture brightens, `gamma` under 1 spending more of the turn on the shadows, at full saturation, the
 *  brightest parts washed to white: the acid heat camera. */
export function acid(cycles = -0.75, hue = 60, gamma = 0.6, white = 0.85): Effect {
  return shader({
    code: /* wgsl */ `
fn hsv(h: f32, s: f32, v: f32) -> vec3<f32> {
  let k = vec3<f32>(1.0, 2.0 / 3.0, 1.0 / 3.0);
  let p = abs(fract(vec3<f32>(h) + k) * 6.0 - vec3<f32>(3.0));
  return v * mix(vec3<f32>(1.0), clamp(p - vec3<f32>(1.0), vec3<f32>(0.0), vec3<f32>(1.0)), s);
}
fn effect(px: vec2<f32>) -> vec4<f32> {
  let c = layer(px);
  let l = clamp(dot(c.rgb, vec3<f32>(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
  let t = pow(l, u.gamma);
  let col = hsv(fract(u.hue / 360.0 + t * u.cycles), 1.0 - smoothstep(u.white, 1.0, l), 0.8 + 0.2 * t);
  return vec4<f32>(col, 1.0);
}`,
    uniforms: { cycles, hue, gamma, white },
    padding: 0,
  });
}

/** A hard black and white cut that follows the footage: each pixel is cut against the mean brightness of a wide
 *  patch round it (`reach`, a fraction of the frame height), times `bias`, so bright footage and dark footage both
 *  split into big black and white shapes instead of going all white or all black. */
export function adaptiveCut(bias = 0.9, reach = 0.22): Effect {
  return shader({
    code: /* wgsl */ `
fn lu(p: vec2<f32>) -> f32 { return dot(layer(p).rgb, vec3<f32>(0.2126, 0.7152, 0.0722)); }
fn effect(px: vec2<f32>) -> vec4<f32> {
  let r = globals.canvas.y * u.reach;
  var sum = 0.0;
  for (var j = -4; j <= 4; j = j + 1) {
    for (var i = -4; i <= 4; i = i + 1) { sum = sum + lu(px + vec2<f32>(f32(i), f32(j)) * r / 4.0); }
  }
  let v = step(sum / 81.0 * u.bias, lu(px));
  return vec4<f32>(vec3<f32>(v), 1.0);
}`,
    uniforms: { bias, reach },
    padding: 0,
  });
}

/** Screen glow: the picture's own colours pushed bright and blue-cyan into a big bloom. 1-3 bright (3 soft),
 *  7 deep blue and crushed, 8 nearly clean, a little cool; 4-6 are 1 with room for an overlay (`FLASH_OVERLAY`). */
export function screenGlow(v = 1): Effect[] {
  const cool: Stops = [[0, '#02041a'], [0.4, '#1c3cb0'], [0.75, '#46b4ff'], [1, '#f2fbff']];
  switch (v) {
    case 7:
      return [brightness(1.15), grayscale(1), contrast(1.7), map([[0, '#000000'], [0.3, '#00003a'], [0.65, '#2440ff'], [1, '#eef6ff']]), glow({ radius: 26, intensity: 1 })];
    case 8:
      return [brightness(1.1), saturate(1.15), map(cool, 0.12), glow({ radius: 18, intensity: 0.3 })];
    case 3:
      return [brightness(1.6), saturate(1.35), map(cool, 0.3), blur(1.5), glow({ radius: 40, intensity: 1.1 })];
    default:
      return [brightness(1.55), contrast(1.05), saturate(1.35), map(cool, 0.3), glow({ radius: 32, intensity: 1 })];
  }
}

/** Which screen-glow variants lay an overlay on (screen blend), and how strongly. The overlay is the caller's. */
export const FLASH_OVERLAY: Record<number, number> = { 2: 0.25, 4: 0.8, 5: 0.9, 6: 0.85 };

/** Acid heat camera. 1 and 4 soft blobs, folded; 2 sharp, warm shadows; 3 sharp, teal shadows. */
export function acidHeat(v = 1, box?: Box): Effect[] {
  switch (v) {
    case 2:
      return [grayscale(1), contrast(1.25), acid(-0.45, 22, 0.5, 0.8)];
    case 3:
      return [grayscale(1), contrast(1.25), acid(0.32, 168, 0.55, 0.8)];
    case 4:
      return [grayscale(1), contrast(1.3), blur(2), acid(-0.8, 330, 0.6, 0.85), fold(0, box), streak(14, 90)];
    default:
      return [grayscale(1), contrast(1.3), blur(2), acid(-0.8, 320, 0.6, 0.85), fold(0, box), streak(10, 0)];
  }
}

/** Night vision: lime phosphor with lifted blacks, a little noise. 1-5 smeared by the camera's move, 6 still. */
export function nightVision(v = 1, seed = 1): Effect[] {
  const fuzz = (a: number) => grain(a, { size: 1.6, seed, animate: true, monochrome: true });
  if (v === 6) return [grayscale(1), map([[0, '#071207'], [0.5, '#2c6424'], [0.85, '#62c64c'], [1, '#c4ffb4']]), fuzz(0.04)];
  const moves: [number, number, number][] = [[70, 15, 1.1], [170, 90, 1.4], [80, 12, 1.1], [90, 8, 1], [60, 5, 0.9]];
  const [len, angle, lift] = moves[(v - 1) % moves.length];
  return [grayscale(1), brightness(lift), map([[0, '#0b1d0b'], [0.45, '#3c9430'], [0.8, '#8cee6c'], [1, '#e8ffd8']]), blur(1.5), fuzz(0.06), streak(len, angle)];
}

/** Grainy black and white. 1 soft and high-key, 5 high-key with grain; 2-4 a hard cut that follows the footage's
 *  brightness (3 and 4 folded), 6 the cut smeared down. */
export function grainyBW(v = 1, seed = 1, box?: Box): Effect[] {
  const noise = (a: number) => grain(a, { size: 1.3, seed, animate: true, monochrome: true });
  switch (v) {
    case 1:
      return [grayscale(1), brightness(1.5), contrast(1.2), blur(10), noise(0.08)];
    case 5:
      return [grayscale(1), brightness(1.55), contrast(1.5), noise(0.14)];
    case 2:
      return [grayscale(1), noise(0.1), adaptiveCut(0.85)];
    case 3:
      return [grayscale(1), noise(0.1), adaptiveCut(0.9), fold(0, box)];
    case 4:
      return [grayscale(1), noise(0.1), adaptiveCut(0.95), fold(0, box)];
    default:
      return [grayscale(1), noise(0.12), adaptiveCut(0.95), streak(70, 90)];
  }
}
