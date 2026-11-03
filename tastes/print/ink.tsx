// Ink passes, the risograph's core and the halftone screen.
//
// One <InkPass> is one drum of a riso: its children are the art for that ink, drawn in black or as a greyscale (or
// colour) picture. A WGSL shader turns the art into ink density, screens it, and prints it in one ink, multiplied over
// whatever is below (the paper, the other passes):
//
//   1. separation: density = 1 - (bias + weights . colour) of the art (the AE Tint, Map Black To = the ink), times its alpha,
//      then levels (lo, hi, gamma)
//   2. Hard Mix at `strength` (0.55: the caption says 50 %, the last readout 63 %): AE's Hard Mix of the art against a texture is
//      step(1, colour + texture); in ink terms that is "ink where density > texture", so at 50 % the coverage is
//      0.5 * density + 0.5 * step(texture, density). The texture is a halftone lattice (pitch, angle) mixed with a
//      stipple of fine grain (`grain`, 0 = pure dots, 1 = pure grain)
//   3. the texture re-rolls every `roll` frames: 2 while things move or print in, 6 on a hold (the full read of the
//      reel). A re-roll does not draw new dots: the whole screen jumps by a random offset inside one pitch and turns
//      by up to 5 deg. A photo screen keeps jitter 0: its dots never move (DUJWPrqCYGX)
//   4. the lattice and the grain live on the artwork: the camera (<PrintCamera>) scales the art and the dots together
//   5. the pass sits `offset` px off register; `boil` and `rough` push its edges with noise (the riso's ragged ink edge,
//      about 1.5 px at 1x, re-rolled with the grain)
//   6. ink is about 90 % opaque (the measured overprints), with soft starved patches and paper specks in the solids
//
// Every <Layer> in a pass is full-frame (AbsoluteFill); the art moves inside it.
import React, { createContext, useContext } from 'react';
import { Layer, displace, shader } from '@kinetographdev/core';
import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from 'remotion';
import { INKS, RATES, SCREENS, type InkName } from './tokens.js';

const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
export const inkHex = (ink: InkName | string) => (ink in INKS ? INKS[ink as InkName] : ink);
export const linRgb = (hex: string) => {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  return [lin(((n >> 16) & 255) / 255), lin(((n >> 8) & 255) / 255), lin((n & 255) / 255)] as const;
};

const INK = /* wgsl */ `
fn pr_hash(p: vec2<i32>, s: u32) -> f32 {
  var h: u32 = (bitcast<u32>(p.x) * 1597334677u) ^ (bitcast<u32>(p.y) * 3812015801u) ^ (s * 2654435761u);
  h = h ^ (h >> 16u);
  h = h * 2246822519u;
  h = h ^ (h >> 13u);
  h = h * 3266489917u;
  h = h ^ (h >> 16u);
  return f32(h) / 4294967295.0;
}
fn pr_noise(p: vec2<f32>, s: u32) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let w = f * f * (vec2<f32>(3.0, 3.0) - 2.0 * f);
  let ii = vec2<i32>(i);
  let a = pr_hash(ii, s);
  let b = pr_hash(ii + vec2<i32>(1, 0), s);
  let c = pr_hash(ii + vec2<i32>(0, 1), s);
  let d = pr_hash(ii + vec2<i32>(1, 1), s);
  return mix(mix(a, b, w.x), mix(c, d, w.x), w.y);
}
fn effect(px: vec2<f32>) -> vec4<f32> {
  let src = layer(px - vec2<f32>(u.offX, u.offY));
  let a = src.a;
  if (a < 0.002) { return vec4<f32>(0.0); }
  // the art's point on the page (the camera's inverse), so screen and grain ride on the artwork
  let lp = (px - vec2<f32>(u.camX, u.camY)) / u.camS;
  let rgb = pow(clamp(src.rgb / a, vec3<f32>(0.0), vec3<f32>(1.0)), vec3<f32>(1.0 / 2.2));
  let wv = vec3<f32>(u.wR, u.wG, u.wB);
  let v = u.bias + dot(rgb, wv);
  var d = (1.0 - v) * a;
  d = clamp((d - u.lo) / max(u.hi - u.lo, 0.001), 0.0, 1.0);
  d = pow(d, u.gamma);
  if (d <= 0.0005) { return vec4<f32>(0.0); }
  // the texture for this roll: the same lattice and grain, translated by (shiftX, shiftY) page px (a random offset
  // inside one pitch) and turned by the roll's angle: a re-roll moves the screen, it does not redraw it
  let tp = lp + vec2<f32>(u.shiftX, u.shiftY);
  let ca = cos(u.angle);
  let sa = sin(u.angle);
  let q = vec2<f32>(ca * tp.x + sa * tp.y, -sa * tp.x + ca * tp.y) / u.pitch;
  let cell = fract(q) - vec2<f32>(0.5, 0.5);
  let lat = clamp(length(cell) * 1.4142, 0.0, 1.0);
  // the stipple: two octaves of value noise at about grainSize page px, contrast widened
  let gp = tp / u.grainSize;
  let n1 = pr_noise(gp, 1u);
  let n2 = pr_noise(gp * 2.3 + vec2<f32>(17.0, 31.0), 2u);
  let noise = clamp(0.5 + (n1 * 0.62 + n2 * 0.38 - 0.5) * 2.0, 0.0, 1.0);
  let tex = mix(lat, noise, u.grain);
  // Hard Mix at strength: ink where density beats the texture, anti-aliased by about a pixel of the screen
  let aa = clamp(0.7 / (u.pitch * u.camS), 0.02, 0.2);
  let hm = smoothstep(tex - aa, tex + aa, d);
  var cov = mix(d, hm, u.strength);
  // ink starve: broad soft patches print lighter (fixed to the art); specks of paper show in the solids
  let st = pr_noise(lp / 160.0, 991u) * 0.65 + pr_noise(lp / 37.0, 992u) * 0.35;
  cov = cov * (1.0 - u.starve * st);
  let sp = pr_hash(vec2<i32>(floor(tp / 1.6)), 77u);
  cov = cov * (1.0 - u.speckle * step(0.955, sp));
  // a sweep: the pass prints in top to bottom (screen px)
  cov = cov * step(px.y, u.sweepY);
  let al = clamp(cov * u.opacity, 0.0, 1.0);
  return vec4<f32>(vec3<f32>(u.ir, u.ig, u.ib) * al, al);
}
`;

/** The camera over the page: page point p shows at p * s + (tx, ty). Ink passes read it, so the dots zoom with it. */
export interface PrintCam { s: number; tx: number; ty: number }
const CamCtx = createContext<PrintCam>({ s: 1, tx: 0, ty: 0 });
export const usePrintCam = () => useContext(CamCtx);

/** Zoom by `s` about the page point (ox, oy) (it stays put), then pan by (dx, dy) screen px. */
export const zoomAt = (s: number, ox: number, oy: number, dx = 0, dy = 0): PrintCam => ({ s, tx: ox * (1 - s) + dx, ty: oy * (1 - s) + dy });

/** Zoom by `s` so that page point (px, py) shows at screen point (qx, qy). */
export const focus = (s: number, px: number, py: number, qx: number, qy: number): PrintCam => ({ s, tx: qx - px * s, ty: qy - py * s });

/** Everything inside sees this camera: ink passes scale their art and their screens with it. Nest to compose. */
export const PrintCamera: React.FC<{ cam: PrintCam; children: React.ReactNode }> = ({ cam, children }) => {
  const outer = useContext(CamCtx);
  const c = { s: outer.s * cam.s, tx: outer.tx + outer.s * cam.tx, ty: outer.ty + outer.s * cam.ty };
  return <CamCtx.Provider value={c}>{children}</CamCtx.Provider>;
};

/** Art placed in page space under the current camera (for things that are not ink: paper cards, shadows). */
export const OnPage: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => {
  const cam = usePrintCam();
  return (
    <AbsoluteFill style={{ transformOrigin: '0 0', transform: `translate(${cam.tx.toFixed(2)}px, ${cam.ty.toFixed(2)}px) scale(${cam.s.toFixed(5)})`, ...style }}>{children}</AbsoluteFill>
  );
};

export interface InkProps {
  /** unique: one Layer per pass */
  id: string;
  /** a token name (green, yellow, pink, blue...) or a hex */
  ink: InkName | string;
  /** separation: density = 1 - (bias + weights . colour), colour in sRGB 0..1. Default luma (bias 0). A colour
   *  separation uses negative weights: yellow = 1 - 0.5 R - 0.5 G + B with bias 1 (the colour's lack of blue) */
  weights?: [number, number, number];
  bias?: number;
  /** levels on the density: lo -> none, hi -> solid, then gamma */
  lo?: number;
  hi?: number;
  gamma?: number;
  /** screen pitch in page px at 1080 wide, angle in degrees */
  pitch?: number;
  angle?: number;
  /** 0 = pure halftone dots, 1 = pure stipple grain */
  grain?: number;
  /** stipple size in page px */
  grainSize?: number;
  /** Hard Mix amount (0.5 measured); 1 = a hard screen, 0 = flat tone */
  strength?: number;
  /** how far the screen jumps per re-roll, in pitches (1: a random offset anywhere inside one dot pitch; 0 for a
   *  photo screen, whose dots never move) and the angle jitter per roll in degrees (5 measured on the final poster) */
  jitter?: number;
  turn?: number;
  /** frames per drawing of the texture: 2 while things move or print in, 6 on a hold (measured). Defaults to the
   *  surrounding <PrintCadence>, else 2 */
  roll?: number;
  /** print-in progress 0..1: the pass appears top to bottom (15 frames per ink measured) */
  sweep?: number;
  /** misregistration in px at 1080 wide */
  offset?: [number, number];
  /** ink opacity (0.9 measured from the overprints) */
  opacity?: number;
  /** edge boil (px, re-rolled on twos, bigger every 6) and static ragged edge (px) */
  boil?: number;
  rough?: number;
  /** starved ink patches (0..1) and paper specks in solids (0..1) */
  starve?: number;
  speckle?: number;
  /** pass opacity on top (fade a pass in or out) */
  fade?: number;
  /** a screen-space window (px) the pass prints inside: a picture frame that does not move with the camera */
  window?: { x: number; y: number; w: number; h: number };
  children: React.ReactNode;
}

/** The ink-pass effects for a full-frame layer: optional edge boil, then the ink shader. */
export const inkEffects = (p: Omit<InkProps, 'id' | 'children' | 'fade' | 'window'>, frame: number, W: number, H: number, cam: PrintCam, seedBase = 0, cadence: number = RATES.grain) => {
  const k = W / 1080;
  const {
    ink, weights = [0.2126, 0.7152, 0.0722], bias = 0, lo = 0, hi = 1, gamma = 1, pitch = SCREENS.riso.pitch, angle = SCREENS.riso.angle, grain = 0.35, grainSize = 1.3,
    strength = 0.55, jitter = 1, turn = 5, roll = cadence, offset = [0, 0], opacity = 0.9, boil = 0.9, rough = 1.4, starve = 0.22, speckle = 0.35, sweep = 1,
  } = p;
  const [ir, ig, ib] = linRgb(inkHex(ink));
  const step = Math.floor(frame / roll);
  const r = (n: string) => random(`ink${seedBase}-${step}-${n}`);
  const pk = pitch * k;
  const shiftX = (r('x') - 0.5) * pk * jitter, shiftY = (r('y') - 0.5) * pk * jitter;
  const ang = angle + (jitter > 0 ? (r('a') - 0.5) * 2 * turn : 0);
  const fx = [] as ReturnType<typeof displace>[];
  const s = cam.s * k;
  if (rough > 0) fx.push(displace({ scale: rough * 2 * s, turbulence: { type: 'fractalNoise', baseFrequency: 0.22 / s, numOctaves: 2, seed: 7 + seedBase } }));
  if (boil > 0) {
    fx.push(displace({ scale: boil * 2 * s, turbulence: { type: 'fractalNoise', baseFrequency: 0.06 / s, numOctaves: 2, seed: Math.floor(frame / RATES.boilFine) + 3 + seedBase * 57 } }));
    fx.push(displace({ scale: boil * 3 * s, turbulence: { type: 'fractalNoise', baseFrequency: 0.011 / s, numOctaves: 1, seed: Math.floor(frame / RATES.boilCoarse) + 1000 + seedBase * 57 } }));
  }
  return [
    ...fx,
    shader({ code: INK, uniforms: {
      ir, ig, ib, wR: weights[0], wG: weights[1], wB: weights[2], bias, lo, hi, gamma, pitch: pk, angle: (ang * Math.PI) / 180, grain, grainSize: grainSize * k,
      strength, shiftX, shiftY, offX: offset[0] * s, offY: offset[1] * s, opacity, starve, speckle, camX: cam.tx, camY: cam.ty, camS: cam.s,
      sweepY: sweep >= 1 ? H * 4 : sweep * H,
    } }),
  ];
};

const CadenceCtx = createContext<number>(RATES.grain);
/** Sets how often the texture re-rolls for the passes inside: 2 while the shot moves or prints in, 6 on a hold. */
export const PrintCadence: React.FC<{ every: number; children: React.ReactNode }> = ({ every, children }) => <CadenceCtx.Provider value={every}>{children}</CadenceCtx.Provider>;

/** One ink pass: its children (black or greyscale art, in page space) printed in one ink, multiplied over what is below. */
export const InkPass: React.FC<InkProps> = ({ id, children, fade = 1, window: win, ...p }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const cam = usePrintCam();
  const cadence = useContext(CadenceCtx);
  if (fade <= 0.001 || (p.sweep !== undefined && p.sweep <= 0)) return null;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997;
  return (
    <Layer id={id} blendMode="multiply" opacity={fade} effects={inkEffects(p, f, W, H, cam, h, cadence)}
      clip={win ? { kind: 'polygon', points: [[win.x, win.y], [win.x + win.w, win.y], [win.x + win.w, win.y + win.h], [win.x, win.y + win.h]] } : undefined}>
      <OnPage>{children}</OnPage>
    </Layer>
  );
};
