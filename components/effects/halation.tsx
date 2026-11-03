// Halation. The glow film puts round bright things: light passes through the emulsion, bounces off the film base and
// exposes the layer again, so highlights get a soft warm-red halo that spills past their edges. Highlights above a
// threshold are gathered (two rings of taps, a tight one and a wide one), tinted and added back, then film grain goes on
// top. The picture drifts in very slowly so the halo breathes against a held frame.
//
// Principles: restraint (two effects, halation and grain, nothing else), slow in and slow out (the strength eases on over
// 36 frames, the push-in eases in and out), secondary action (the slow push-in, the grain), appeal (every still holds
// up: the halo hugs the highlights and never greys the shadows), timing (a 5 s hold: long enough to read the glow).

import React from 'react';
import { z } from 'zod';
import { Layer, grain, shader } from '@kinetographdev/core';
import { Easing, useCurrentFrame } from 'remotion';
import { NOISE, colorUniforms } from './shaders.js';
import { H, Picture, W } from './picture.js';

const hex = z.string().describe('A CSS colour (hex).');

export const halationSchema = z.object({
  src: z.string().describe('Picture in public/ (used when no children are given).'),
  strength: z.number().min(0).max(2).describe('How much glow is added back. 0 is off, 1 is a visible but gentle halo.'),
  radius: z.number().min(4).max(120).describe('Reach of the tight halo in pixels (the wide one is 3.2 times that).'),
  threshold: z.number().min(0).max(1).describe('How bright a pixel must be (linear) before it glows. Lower glows more of the picture.'),
  tint: hex.describe('The colour of the halo. Film halation is red-orange.'),
  tintMix: z.number().min(0).max(1).describe("0 glows in the highlight's own colour, 1 in the tint."),
  grain: z.number().min(0).max(0.3).describe('Film grain amount (0 for none).'),
  grainSize: z.number().min(0.5).max(4).describe('Grain size in pixels.'),
  fadeIn: z.number().int().min(0).max(120).describe('Frames the glow takes to come on at the start.'),
  push: z.number().min(0).max(0.12).describe('How far the picture pushes in over the shot (0.04 is 4 percent).'),
});
export type HalationProps = z.infer<typeof halationSchema>;

export const halationDefaults: HalationProps = {
  src: 'photos/nasa-city-2.jpg',
  strength: 1,
  radius: 30,
  threshold: 0.14,
  tint: '#ff5a2a',
  tintMix: 0.62,
  grain: 0.07,
  grainSize: 1.4,
  fadeIn: 36,
  push: 0.04,
};

const CODE = /* wgsl */ `
${NOISE}
fn glowOf(p: vec2<f32>) -> vec3<f32> {
  let c = layer(p).rgb;
  let k = smoothstep(u.thr, u.thr + 0.3, luma(c));
  return c * k;
}
fn ring(px: vec2<f32>, r: f32, jitter: f32) -> vec3<f32> {
  var acc = vec3<f32>(0.0, 0.0, 0.0);
  var ws = 0.0;
  for (var i = 0; i < 40; i = i + 1) {
    let fi = f32(i) + 0.5;
    let t = sqrt(fi / 40.0);
    let a = fi * 2.39996323 + jitter;
    let w = exp(-t * t * 2.4);
    acc = acc + glowOf(px + vec2<f32>(cos(a), sin(a)) * t * r) * w;
    ws = ws + w;
  }
  return acc / ws;
}
fn effect(px: vec2<f32>) -> vec4<f32> {
  let base = layer(px);
  let j = hash21(px) * 6.2831853;
  let tight = ring(px, u.radius, j);
  let wide = ring(px, u.radius * 3.2, j + 1.7);
  let halo = tight * 0.95 + wide * 0.85;
  let tint = vec3<f32>(u.tintr, u.tintg, u.tintb);
  let hl = luma(halo);
  // Halation is mostly red: keep a share of the highlight's own colour, push the rest into the tint.
  let colour = mix(halo, tint * hl * 5.0, u.mixv);
  let outc = base.rgb + colour * u.amount;
  return vec4<f32>(outc, base.a);
}
`;

export const Halation: React.FC<HalationProps & { children?: React.ReactNode }> = (p) => {
  const f = useCurrentFrame();
  const amount = (p.fadeIn > 0 ? Easing.inOut(Easing.cubic)(Math.min(1, f / p.fadeIn)) : 1) * p.strength * 1.6 * (1 + 0.08 * Math.sin(f * 0.07));
  const push = 1 + p.push * Easing.inOut(Easing.quad)(Math.min(1, f / 150));
  return (
    <Layer
      id="halation"
      effects={[
        shader({ code: CODE, uniforms: { amount, radius: p.radius, thr: p.threshold, mixv: p.tintMix, ...colorUniforms('tint', p.tint) }, padding: 0 }),
        ...(p.grain > 0 ? [grain(p.grain, { size: p.grainSize, seed: 7, animate: true, monochrome: true })] : []),
      ]}
    >
      <Picture id="hal-pic" src={p.src} scale={push}>{p.children}</Picture>
    </Layer>
  );
};
