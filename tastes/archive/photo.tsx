// The photo treatment: every picture is printed as the process it was made with (PROCESS in tokens.ts): its tones
// mapped from a shadow colour to a highlight colour through levels and a soft S-curve, then film grain. The grain is
// a hash of the pixel and the frame step, so it boils on twos with the rest of the film, mono, strongest in the
// mid-tones (where real grain shows), sized about 1.5 px at 1080 wide.
import React from 'react';
import { Layer, shader } from '@kinetographdev/core';
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from 'remotion';
import { PROCESS, type Process } from './tokens.js';

const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linRgb = (hex: string) => { const n = parseInt(hex.replace('#', ''), 16); return [lin(((n >> 16) & 255) / 255), lin(((n >> 8) & 255) / 255), lin((n & 255) / 255)] as const; };

const TONE = /* wgsl */ `
fn hash(p: vec2<f32>) -> f32 {
  let q = fract(p * vec2<f32>(0.1031, 0.1030));
  let r = q + dot(q, q.yx + 33.33);
  return fract((r.x + r.y) * r.x);
}
fn toLin(c: f32) -> f32 { return select(pow((c + 0.055) / 1.055, 2.4), c / 12.92, c <= 0.04045); }

fn effect(px: vec2<f32>) -> vec4<f32> {
  let c = layer(px);
  if (c.a < 0.001) { return c; }
  let rgb = c.rgb / c.a;
  // tone in display terms
  var l = pow(max(dot(rgb, vec3<f32>(0.2126, 0.7152, 0.0722)), 0.0), 1.0 / 2.2);
  l = clamp((l - u.lo) / max(u.hi - u.lo, 0.01), 0.0, 1.0);
  l = pow(l, u.gamma);
  // a soft S-curve, as a print's paper and chemistry give
  l = mix(l, l * l * (3.0 - 2.0 * l), u.curve);
  // grain: two octaves of hashed noise on a cell of u.cell px, a new pattern each frame step
  let cell = max(u.cell, 0.5);
  let g1 = hash(floor(px / cell) + vec2<f32>(u.seed * 17.0, u.seed * 31.0)) - 0.5;
  let g2 = hash(floor(px / (cell * 2.0)) + vec2<f32>(u.seed * 7.0, 3.0)) - 0.5;
  let mid = 1.0 - abs(l * 2.0 - 1.0);
  l = clamp(l + (g1 * 0.7 + g2 * 0.5) * u.grain * (0.35 + 0.65 * mid), 0.0, 1.0);
  // fade: lift the blacks and lower the whites a little, an old print
  l = mix(u.fade, 1.0 - u.fade * 0.4, l);
  // map to the process colours, mixed in display space then back to linear
  let d = vec3<f32>(u.dr, u.dg, u.db);
  let w = vec3<f32>(u.lr, u.lg, u.lb);
  let toned = mix(d, w, l);
  let outc = vec3<f32>(toLin(toned.r), toLin(toned.g), toLin(toned.b));
  return vec4<f32>(outc * c.a, c.a);
}
`;

const disp = (hex: string) => { const n = parseInt(hex.replace('#', ''), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255] as const; };

export interface ToneProps {
  /** which process to print as (default albumen) */
  process?: Process;
  /** override the grain amount (0..0.2) and its cell in px at 1080 wide */
  grain?: number;
  cell?: number;
  /** S-curve 0..1, fade (lifted blacks) 0..0.15 */
  curve?: number;
  fade?: number;
  /** frames per grain pattern (2: on twos) */
  hold?: number;
}

/** The tone-and-grain effect for a layer. `frame` picks the grain pattern. */
export const toneEffect = ({ process = 'albumen', grain, cell = 1.6, curve = 0.35, fade = 0.04, hold = 2 }: ToneProps, W: number, frame: number) => {
  const p = PROCESS[process];
  const [dr, dg, db] = disp(p.dark), [lr, lg, lb] = disp(p.light);
  return shader({ code: TONE, uniforms: { dr, dg, db, lr, lg, lb, lo: p.lo, hi: p.hi, gamma: p.gamma, curve, fade, grain: grain ?? p.grain, cell: (cell * W) / 1080, seed: Math.floor(frame / hold) % 97 } });
};

/** Prints whatever is inside (a photo, a parallax stack) as the process. Full frame: move the content inside it. */
export const Toned: React.FC<ToneProps & { id: string; children: React.ReactNode }> = ({ id, children, ...p }) => {
  const f = useCurrentFrame();
  const { width: W } = useVideoConfig();
  return (
    <Layer id={id} effects={[toneEffect(p, W, f)]}>
      <AbsoluteFill>{children}</AbsoluteFill>
    </Layer>
  );
};

/** A photo filling the frame (cover), printed as the process. */
export const ArchivePhoto: React.FC<ToneProps & { id: string; src: string; position?: string; zoom?: number; origin?: string }> = ({ id, src, position = '50% 50%', zoom = 1, origin, ...p }) => (
  <Toned id={id} {...p}>
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: position, transform: zoom !== 1 ? `scale(${zoom.toFixed(4)})` : undefined, transformOrigin: origin ?? position }} />
    </AbsoluteFill>
  </Toned>
);

export { linRgb };
