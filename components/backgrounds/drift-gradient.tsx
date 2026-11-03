// Drift Gradient: big, out-of-focus pools of ultramarine and cyan that drift across an electric-blue field, with a teal
// cast along the edges, like a defocused light through water. Matched to a looping blue-gradient reference: its palette,
// the size of its pools (each about half the frame), their softness and their pace (a pool crosses a third of the frame
// in about four seconds). The reference loops every two minutes; this loops seamlessly every 10 s.
//
// One fragment shader: a few soft blobs, dark and bright, each travelling on its own closed Lissajous path (whole-number
// frequencies of the loop phase, so the loop is exact), blended into one field over a mid-blue base, gently warped by slow
// noise so the pools are never perfect circles, and mapped through the ramp navy, ultramarine, azure, sky, cyan. A second
// field of blobs near the edges tints toward teal.
//
// Principles: slow in and out (every path is a sine), overlap (each pool has its own path and period), arcs (closed
// curved paths), restraint (one hue family, no edges anywhere, no grain).

import React from 'react';
import { z } from 'zod';
import { GlslShader } from '@kinetographdev/core';
import { useCurrentFrame } from 'remotion';
import { rgb } from './lib.js';

export const W = 1920;
export const H = 1080;
export const LOOP = 300;

const hex = z.string().describe('A CSS colour as #rrggbb.');

export const driftGradientSchema = z.object({
  deep: hex.describe('The darkest pools (navy ultramarine).'),
  mid: hex.describe('The body of the field (electric blue).'),
  light: hex.describe('The lighter field around the bright pools (sky blue).'),
  glow: hex.describe('The brightest pools (cyan).'),
  tint: hex.describe('The cast along the edges (teal).'),
  scale: z.number().min(0.4).max(3).describe('Size of the pools: higher is larger.'),
  contrast: z.number().min(0).max(2).describe('How dark the dark pools and how bright the bright ones get. 1 matches the reference.'),
  speed: z.number().min(0).max(4).describe('Loops per 10 seconds. Whole numbers loop seamlessly.'),
});
export type DriftGradientProps = z.infer<typeof driftGradientSchema>;

export const driftGradientDefaults: DriftGradientProps = {
  deep: '#000c8c',
  mid: '#0052d0',
  light: '#00a2ee',
  glow: '#00dcf6',
  tint: '#0b8eaa',
  scale: 1,
  contrast: 1,
  speed: 1,
};

const FRAGMENT = `
precision highp float;
uniform vec2 u_res;
uniform float u_ph;
uniform vec3 u_deep; uniform vec3 u_mid; uniform vec3 u_light; uniform vec3 u_glow; uniform vec3 u_tint;
uniform float u_scale; uniform float u_contrast;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash(i); float b = hash(i + vec2(1.0, 0.0)); float c = hash(i + vec2(0.0, 1.0)); float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
// a soft pool of radius s at c
// stretched along the rising diagonal, as the reference's pools are
float blob(vec2 p, vec2 c, float s){
  vec2 d = (p - c) / (s * u_scale);
  d = mat2(0.866, 0.5, -0.5, 0.866) * d;
  d.x *= 0.62;
  return exp(-dot(d, d));
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  uv.y = 1.0 - uv.y;
  float asp = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * asp, uv.y);
  float ph = u_ph;

  // a slow warp so the pools wobble out of round; its offsets go round a circle once per loop
  vec2 o = 0.6 * vec2(cos(ph), sin(ph));
  p += 0.12 * (vec2(vnoise(p * 1.4 + o), vnoise(p * 1.4 + vec2(5.3, 2.1) - o)) - 0.5);

  // the pools, each a value (0 the darkest, 1 the brightest) that pulls the field toward it near its centre: a weighted
  // average, like a mesh gradient, so overlapping pools blend instead of piling up
  float acc = 0.0; float wsum = 0.0; float w;
  #define POOL(v, c, s) w = pow(blob(p, c, s), 1.8); acc += w * (0.55 + ((v) - 0.55) * u_contrast); wsum += w;
  POOL(0.05, vec2(0.62 * asp + 0.42 * cos(ph + 2.4), 0.42 + 0.28 * sin(ph + 0.9) + 0.06 * sin(2.0 * ph)), 0.5)
  POOL(0.22, vec2(0.3 * asp + 0.35 * cos(ph + 5.0) + 0.1 * cos(2.0 * ph + 1.0), 0.78 + 0.22 * sin(ph + 3.9)), 0.42)
  POOL(0.3,  vec2(0.8 * asp + 0.3 * cos(2.0 * ph + 0.3), 0.82 + 0.18 * cos(ph + 1.7)), 0.42)
  POOL(0.42, vec2(0.15 * asp + 0.25 * cos(ph + 0.6), 0.55 + 0.3 * sin(ph + 5.6)), 0.4)
  POOL(1.0,  vec2(0.7 * asp + 0.4 * cos(ph + 0.4), 0.45 + 0.3 * sin(ph + 4.3) + 0.05 * cos(2.0 * ph + 2.0)), 0.5)
  POOL(0.88, vec2(0.25 * asp + 0.4 * sin(ph + 1.2), 0.2 + 0.2 * cos(ph + 0.2)), 0.42)
  POOL(0.78, vec2(0.55 * asp + 0.35 * cos(2.0 * ph + 4.1), 0.05 + 0.12 * sin(ph + 2.2)), 0.36)
  // the electric-blue field everywhere between them
  acc += 0.02 * 0.55; wsum += 0.02;
  float f = clamp(acc / wsum, 0.0, 1.0);

  // the ramp: navy, ultramarine, electric blue, sky, cyan
  vec3 col = mix(u_deep, u_mid, smoothstep(0.05, 0.45, f));
  col = mix(col, u_light, smoothstep(0.34, 0.74, f));
  col = mix(col, u_glow, smoothstep(0.72, 1.0, f));

  // the teal cast, strongest near the left and top edges, drifting along them
  float tl = blob(p, vec2(-0.05 + 0.08 * cos(ph + 1.0), 0.35 + 0.3 * sin(ph + 0.4)), 0.42)
           + 0.7 * blob(p, vec2(0.35 * asp + 0.4 * cos(ph + 3.0), -0.08), 0.35);
  col = mix(col, u_tint, clamp(tl, 0.0, 1.0) * 0.38 * smoothstep(0.15, 0.55, f) * smoothstep(0.95, 0.6, f));

  gl_FragColor = vec4(col, 1.0);
}
`;

export const DriftGradient: React.FC<DriftGradientProps> = (p) => {
  const frame = useCurrentFrame();
  const ph = (2 * Math.PI * frame * p.speed) / LOOP;
  return (
    <GlslShader
      id="dg-shader"
      width={W}
      height={H}
      fragment={FRAGMENT}
      uniforms={{
        u_res: [W, H],
        u_ph: ph,
        u_deep: rgb(p.deep),
        u_mid: rgb(p.mid),
        u_light: rgb(p.light),
        u_glow: rgb(p.glow),
        u_tint: rgb(p.tint),
        u_scale: p.scale,
        u_contrast: p.contrast,
      }}
    />
  );
};
