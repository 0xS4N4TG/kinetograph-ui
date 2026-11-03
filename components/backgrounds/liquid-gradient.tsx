// Liquid Gradient: a slow pour of deep plum, crimson and amber that folds over itself and comes back to where it began,
// matched to a 10 s looping gradient reference. It is calm at the loop point (big soft pools of plum and amber) and swirls
// in the middle of the loop (amber ribbons drawn into S-curves through the plum), then settles again, so the seam is
// invisible.
//
// One fragment shader: fbm noise, warped twice by itself (domain warping), with every offset moving on a closed circle so
// the loop is exact. The warp's strength breathes over the loop, which gives the calm, swirl, calm rhythm. Colour comes
// from the warp fields: the plum where the field is low, amber where it is high, crimson pooled on one side and along
// the boundary between them, as in the reference.
//
// Principles: slow in and out (the warp eases in and out over the loop), follow through and overlapping action (each
// warp layer lags the one under it), arcs (the field travels on circles), restraint (three colours, no grain, no light).

import React from 'react';
import { z } from 'zod';
import { GlslShader } from '@kinetographdev/core';
import { useCurrentFrame } from 'remotion';
import { rgb } from './lib.js';

export const W = 1920;
export const H = 1080;
export const FPS = 30;
export const LOOP = 300;

const hex = z.string().describe('A CSS colour as #rrggbb.');

export const liquidGradientSchema = z.object({
  deep: hex.describe('The darkest colour, where the field is low (plum).'),
  mid: hex.describe('The colour pooled along one side and between the others (crimson).'),
  bright: hex.describe('The brightest colour, where the field is high (amber).'),
  scale: z.number().min(0.4).max(3).describe('Size of the shapes: higher is larger, calmer pools.'),
  swirl: z.number().min(0).max(2).describe('How far the shapes fold over in the middle of the loop. 1 matches the reference.'),
  speed: z.number().min(0).max(4).describe('Loops per 10 seconds. Whole numbers loop seamlessly.'),
  softness: z.number().min(0).max(1).describe('How soft the edges between colours are.'),
});
export type LiquidGradientProps = z.infer<typeof liquidGradientSchema>;

export const liquidGradientDefaults: LiquidGradientProps = {
  deep: '#22002e',
  mid: '#c4002f',
  bright: '#f0883a',
  scale: 1,
  swirl: 1,
  speed: 1,
  softness: 0.8,
};

const FRAGMENT = `
precision highp float;
uniform vec2 u_res;
uniform float u_ph;
uniform vec3 u_deep; uniform vec3 u_mid; uniform vec3 u_bright;
uniform float u_scale; uniform float u_swirl; uniform float u_soft;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash(i); float b = hash(i + vec2(1.0, 0.0)); float c = hash(i + vec2(0.0, 1.0)); float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p){
  float v = 0.0; float a = 0.5; float n = 0.0;
  mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 2; i++){ v += a * vnoise(p); n += a; p = r * p * 2.03 + 11.7; a *= 0.5; }
  return v / n;
}
// a point that goes once round a circle per loop
vec2 orbit(float ph, float r, float k){ return r * vec2(cos(ph + k), sin(ph * 1.0 + k * 1.7)); }

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  uv.y = 1.0 - uv.y;
  vec2 p = vec2(uv.x * (u_res.x / u_res.y), uv.y) * (0.95 / u_scale);

  // calm at the loop point, folded in the middle
  float breathe = 0.5 - 0.5 * cos(u_ph);
  float amp = (0.7 + 1.5 * breathe) * u_swirl;

  vec2 q = vec2(fbm(p + orbit(u_ph, 0.55, 0.0)), fbm(p + vec2(5.2, 1.3) + orbit(u_ph, 0.55, 2.1)));
  vec2 r = vec2(fbm(p + amp * q + vec2(1.7, 9.2) + orbit(u_ph, 0.35, 4.0)), fbm(p + amp * q + vec2(8.3, 2.8) + orbit(u_ph, 0.35, 1.0)));
  float f = fbm(p + amp * r + orbit(u_ph, 0.25, 3.0));
  // the warped field bunches around 0.3; spread it over 0..1
  f = clamp((f - 0.1) / 0.42, 0.0, 1.0);
  // the plum gathers toward the top left, the amber toward the lower right, as in the reference
  f += 0.22 * (uv.x * 0.6 + uv.y * 0.4 - 0.5);

  float s = mix(0.05, 0.34, u_soft);
  // amber where the field is high, plum where it is low, the brown of the two between
  float t = smoothstep(0.42 - s, 0.58 + s, f);
  vec3 col = mix(u_deep, u_bright, t);
  // crimson: pooled toward the lower left, and along the edge of the plum
  float pool = smoothstep(0.85, 0.1, length((uv - vec2(-0.05, 0.8)) * vec2(1.0, 1.2))) * smoothstep(0.7, 0.4, r.x) * smoothstep(0.18, 0.42, f);
  float edge = smoothstep(0.30, 0.46, f) * smoothstep(0.62, 0.46, f) * smoothstep(0.35, 0.6, q.y);
  col = mix(col, u_mid, clamp(pool * 0.95 + edge * 0.4, 0.0, 0.85));
  // the plum deepest in its pools
  col = mix(col, u_deep * 0.9, smoothstep(0.38, 0.15, f) * 0.6);
  gl_FragColor = vec4(col, 1.0);
}
`;

export const LiquidGradient: React.FC<LiquidGradientProps> = (p) => {
  const frame = useCurrentFrame();
  const ph = (2 * Math.PI * frame * p.speed) / LOOP;
  return (
    <GlslShader
      id="lg-shader"
      width={W}
      height={H}
      fragment={FRAGMENT}
      uniforms={{
        u_res: [W, H],
        u_ph: ph,
        u_deep: rgb(p.deep),
        u_mid: rgb(p.mid),
        u_bright: rgb(p.bright),
        u_scale: p.scale,
        u_swirl: p.swirl,
        u_soft: p.softness,
      }}
    />
  );
};
