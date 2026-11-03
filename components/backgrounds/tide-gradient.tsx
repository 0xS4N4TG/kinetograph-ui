// Tide Gradient: quick, soft pools of cyan, mint, teal and steel blue that swell, slide over one another and sink into
// black, like light moving under water. Matched to a 15 s gradient reference: its palette (black through deep teal and
// steel blue to mint and cyan), the size of its pools (each a half to two thirds of the frame), their softness, the
// black that opens between them, and their pace (much faster than the other gradients: the picture
// changes by about a tenth of its brightness every half second). The reference does not loop; this one loops on 10 s.
//
// One fragment shader: six pools, each with its own colour, travelling on its own closed path (whole-number multiples
// of the loop phase, so the loop is exact) and swelling and fading on its own beat. Each pixel's colour is the pools'
// colours averaged by how close it is to each (a mesh gradient), and its brightness is how strongly any pool reaches it,
// so where no pool reaches the frame falls to black. A slow noise warp keeps the pools from being perfect circles.
//
// Principles: overlap (six paths and six beats that never line up), slow in and out (every path and beat is a sine),
// arcs (closed curved paths), restraint (one cool family; no grain, no light streaks).

import React from 'react';
import { z } from 'zod';
import { GlslShader } from '@kinetographdev/core';
import { useCurrentFrame } from 'remotion';
import { rgb } from './lib.js';

export const W = 1920;
export const H = 1080;
export const LOOP = 300;

const hex = z.string().describe('A CSS colour as #rrggbb.');

export const tideGradientSchema = z.object({
  colors: z.array(hex).length(6).describe('The six pool colours: by default cyan, mint, sea green, blue, steel and deep teal.'),
  ground: hex.describe('What shows where no pool reaches (black).'),
  scale: z.number().min(0.4).max(3).describe('Size of the pools: higher is larger.'),
  depth: z.number().min(0).max(2).describe('How much black opens between the pools. 1 matches the reference; 0 fills the frame.'),
  speed: z.number().min(0).max(4).describe('Loops per 10 seconds. Whole numbers loop seamlessly.'),
});
export type TideGradientProps = z.infer<typeof tideGradientSchema>;

export const tideGradientDefaults: TideGradientProps = {
  colors: ['#40eafd', '#2ad0ae', '#1a8a7e', '#2a8ed0', '#1b5d7c', '#0d3a52'],
  ground: '#000000',
  scale: 1,
  depth: 1,
  speed: 1,
};

const FRAGMENT = `
precision highp float;
uniform vec2 u_res;
uniform float u_ph;
uniform vec3 u_c0; uniform vec3 u_c1; uniform vec3 u_c2; uniform vec3 u_c3; uniform vec3 u_c4; uniform vec3 u_c5;
uniform vec3 u_ground;
uniform float u_scale; uniform float u_depth;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash(i); float b = hash(i + vec2(1.0, 0.0)); float c = hash(i + vec2(0.0, 1.0)); float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

vec3 acc; float wsum; float reach;
// a pool of colour c, radius s, at centre m, with strength k (0..1): a soft body, brightest at its centre
void pool(vec2 p, vec2 m, float s, vec3 c, float k){
  float d = length(p - m) / (s * u_scale);
  float body = exp(-d * d * 1.5);
  float w = k * body + 1e-4;
  acc += c * w * w; wsum += w * w;
  reach += w;
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  uv.y = 1.0 - uv.y;
  float asp = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * asp, uv.y);
  float ph = u_ph;

  // a slow warp so the pools wobble; its offsets go round a circle once per loop
  vec2 o = 0.8 * vec2(cos(u_ph), sin(u_ph));
  p += 0.1 * (vec2(vnoise(p * 1.6 + o), vnoise(p * 1.6 + vec2(3.7, 8.1) - o)) - 0.5);

  acc = vec3(0.0); wsum = 0.0; reach = 0.0;
  pool(p, vec2(0.55 + 0.55 * cos(2.0 * ph + 0.3) + 0.15 * cos(3.0 * ph), 0.3 + 0.32 * sin(3.0 * ph + 1.0)), 0.48, u_c0, 0.65 + 0.35 * sin(2.0 * ph + 0.5));
  pool(p, vec2(0.6 + 0.5 * cos(3.0 * ph + 2.2), 0.55 + 0.4 * sin(2.0 * ph + 3.0) + 0.1 * sin(ph)), 0.58, u_c1, 0.7 + 0.3 * sin(3.0 * ph + 2.0));
  pool(p, vec2(0.45 + 0.45 * sin(ph + 4.0) + 0.2 * sin(3.0 * ph + 1.0), 0.45 + 0.35 * cos(2.0 * ph + 0.4)), 0.62, u_c2, 0.75 + 0.25 * sin(ph + 1.0));
  pool(p, vec2(1.35 + 0.45 * cos(2.0 * ph + 1.4) + 0.12 * sin(3.0 * ph + 1.0), 0.6 + 0.4 * sin(3.0 * ph + 2.6)), 0.66, u_c3, 0.75 + 0.3 * sin(2.0 * ph + 4.0));
  pool(p, vec2(1.2 + 0.55 * sin(3.0 * ph + 5.0), 0.35 + 0.45 * cos(2.0 * ph + 0.9)), 0.66, u_c4, 0.8 + 0.2 * sin(3.0 * ph + 0.2));
  pool(p, vec2(0.9 + 0.7 * cos(ph + 3.3) + 0.2 * cos(2.0 * ph), 0.75 + 0.3 * sin(3.0 * ph + 1.7)), 0.7, u_c5, 0.75 + 0.25 * sin(2.0 * ph + 5.5));

  vec3 col = acc / wsum;
  // brightness follows how strongly the pools reach a pixel, so each pool glows at its heart, overlaps run brighter,
  // and the gaps sink to the ground colour
  float lit = smoothstep(0.1 * u_depth, 0.1 * u_depth + 1.15, reach);
  col = mix(u_ground, col * (0.7 + 0.4 * lit), pow(lit, 1.25));
  gl_FragColor = vec4(col, 1.0);
}
`;

export const TideGradient: React.FC<TideGradientProps> = (p) => {
  const frame = useCurrentFrame();
  const ph = (2 * Math.PI * frame * p.speed) / LOOP;
  const c = (i: number) => rgb(p.colors[i]);
  return (
    <GlslShader
      id="tg-shader"
      width={W}
      height={H}
      fragment={FRAGMENT}
      uniforms={{
        u_res: [W, H],
        u_ph: ph,
        u_c0: c(0), u_c1: c(1), u_c2: c(2), u_c3: c(3), u_c4: c(4), u_c5: c(5),
        u_ground: rgb(p.ground),
        u_scale: p.scale,
        u_depth: p.depth,
      }}
    />
  );
};
