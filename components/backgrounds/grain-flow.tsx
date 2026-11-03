// Grain Flow: two soft sheets of light, cobalt to ice white, that flow past a dark navy valley like slow liquid, under
// fine film grain. Matched to a still gradient reference: the dark valley runs from the top left to the lower right, one
// sheet of blue fills the top right and fades to pale blue in the corner, the other fills the lower left and burns to
// near white in its corner. Here the sheets breathe and undulate on a seamless 10 s loop.
//
// One fragment shader: each edge of the valley is a curve that waves over the loop; the frame is warped by slow noise
// whose offsets move on closed circles (so the loop is exact); brightness is the soft distance from each edge plus a glow
// from its corner, mapped through the ramp navy, cobalt, blue, pale blue, white; then grain, new every frame and seeded
// by the frame number, is added on top.
//
// Principles: slow in and out (every motion is a sine of the loop phase), overlap (the two sheets and the warp each run
// on their own phase), arcs (noise offsets travel on circles), restraint (one hue, no hard edges), texture on the whole
// frame (the grain).

import React from 'react';
import { z } from 'zod';
import { GlslShader } from '@kinetographdev/core';
import { useCurrentFrame } from 'remotion';
import { rgb } from './lib.js';

export const W = 1920;
export const H = 1080;
export const LOOP = 300;

const hex = z.string().describe('A CSS colour as #rrggbb.');

export const grainFlowSchema = z.object({
  ground: hex.describe('The dark valley between the sheets (navy black).'),
  deep: hex.describe('The body colour of the sheets (cobalt).'),
  bright: hex.describe('The lit part of the sheets toward their corners (sky blue).'),
  glow: hex.describe('The hottest light, in the lower-left corner (ice white).'),
  flow: z.number().min(0).max(2).describe('How far the sheets bend and travel over the loop. 1 is a slow liquid drift.'),
  speed: z.number().min(0).max(4).describe('Loops per 10 seconds. Whole numbers loop seamlessly.'),
  grain: z.number().min(0).max(1).describe('Film grain strength. 0.5 matches the reference.'),
});
export type GrainFlowProps = z.infer<typeof grainFlowSchema>;

export const grainFlowDefaults: GrainFlowProps = {
  ground: '#0f121a',
  deep: '#1438a0',
  bright: '#5486d0',
  glow: '#eef0ea',
  flow: 1,
  speed: 1,
  grain: 0.5,
};

const FRAGMENT = `
precision highp float;
uniform vec2 u_res;
uniform float u_ph;
uniform float u_seed;
uniform vec3 u_ground; uniform vec3 u_deep; uniform vec3 u_bright; uniform vec3 u_glow;
uniform float u_flow; uniform float u_grain;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = hash(i); float b = hash(i + vec2(1.0, 0.0)); float c = hash(i + vec2(0.0, 1.0)); float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p){ return 0.65 * vnoise(p) + 0.35 * vnoise(p * 2.1 + 7.3); }
vec2 orbit(float ph, float r, float k){ return r * vec2(cos(ph + k), sin(ph + k * 1.7)); }

// the colour ramp: navy, cobalt, blue, pale blue, white
vec3 ramp(float f){
  vec3 c = mix(u_ground, u_deep, smoothstep(0.0, 0.5, f));
  c = mix(c, u_bright, smoothstep(0.55, 0.78, f));
  c = mix(c, mix(u_bright, u_glow, 0.55), smoothstep(0.76, 0.9, f));
  return mix(c, u_glow, smoothstep(0.9, 1.0, f));
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  uv.y = 1.0 - uv.y;
  vec2 a = vec2(uv.x * (u_res.x / u_res.y), uv.y);

  // liquid: the whole frame drifts on slow noise whose offsets go round a circle once per loop
  vec2 w = vec2(fbm(a * 1.3 + orbit(u_ph, 0.7, 0.0)), fbm(a * 1.3 + vec2(4.1, 7.3) + orbit(u_ph, 0.7, 2.3))) - 0.5;
  vec2 q = uv + w * 0.16 * u_flow;
  float x = q.x;

  // the upper sheet's edge: from the top a quarter in, down to 40% at the right, with a tongue that waves
  float yU = -0.08 + 1.05 * x - 0.5 * x * x + 0.045 * u_flow * sin(x * 4.0 + u_ph) + 0.03 * u_flow * sin(u_ph * 2.0 + 1.3);
  // the lower sheet's edge: 58% down at the left, out of the frame at the lower right
  float yL = 0.55 + 0.1 * x + 0.22 * x * x + 0.05 * u_flow * sin(x * 3.2 - u_ph + 2.0) + 0.03 * u_flow * sin(u_ph * 2.0 + 4.0);

  float up = smoothstep(-0.06, 0.24, yU - q.y);
  float lo = smoothstep(-0.06, 0.24, q.y - yL);

  // corner light: pale blue at the top right, near white at the lower left; each breathes a little over the loop
  float gTR = smoothstep(0.66, 0.0, length((q - vec2(1.05, -0.06)) * vec2(1.0, 1.25)));
  float gBL = smoothstep(0.74, 0.0, length((q - vec2(-0.06, 1.06)) * vec2(1.0, 1.3)));
  gTR *= 0.9 + 0.1 * sin(u_ph + 0.5);
  gBL *= 0.92 + 0.08 * sin(u_ph + 3.6);

  float f = max(up * (0.5 + 0.42 * gTR), lo * (0.5 + 0.62 * gBL));
  f = clamp(f, 0.0, 1.0);
  vec3 col = ramp(f);

  // film grain, a new pattern every frame, a touch stronger in the mid tones
  // soft grains about 1.5 px across, as on a scanned print
  vec2 gp = mod(gl_FragCoord.xy, 384.0) / 1.5 + vec2(fract(u_seed * 0.618034), fract(u_seed * 0.754878)) * 97.0;
  float n = (vnoise(gp) + vnoise(gp * 1.9 + 13.7) - 1.0) * 1.6;
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col += n * u_grain * (0.07 + 0.05 * (1.0 - abs(lum * 2.0 - 1.0)));
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

export const GrainFlow: React.FC<GrainFlowProps> = (p) => {
  const frame = useCurrentFrame();
  const ph = (2 * Math.PI * frame * p.speed) / LOOP;
  return (
    <GlslShader
      id="gf-shader"
      width={W}
      height={H}
      fragment={FRAGMENT}
      uniforms={{
        u_res: [W, H],
        u_ph: ph,
        u_seed: frame % LOOP,
        u_ground: rgb(p.ground),
        u_deep: rgb(p.deep),
        u_bright: rgb(p.bright),
        u_glow: rgb(p.glow),
        u_flow: p.flow,
        u_grain: p.grain,
      }}
    />
  );
};
