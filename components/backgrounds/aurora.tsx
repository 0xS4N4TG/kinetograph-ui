// Aurora / Silk: slow light ribbons over a deep ground, drawn by a fragment shader. Each ribbon is a soft band that
// follows two sines, brighter on its upper edge and fading below, with a thin sheen along its crest like creased silk.
// Colours pass along each ribbon, and the ribbons combine by screening, so two overlapping never blow out.
//
// Principles: slow in and out (sines), overlap and follow through (each ribbon has its own phase and a slower second
// harmonic that trails the first), arcs, restraint (low intensity: it sits behind type), solid drawing (one glow side).

import React from 'react';
import { z } from 'zod';
import { GlslShader, Layer, grain } from '@kinetographdev/core';
import { useCurrentFrame } from 'remotion';
import { NOISE_GLSL, phase, rgb } from './lib.js';

export const W = 1920;
export const H = 1080;
export const FPS = 30;
export const DURATION = 300;

const hex = z.string().describe('A CSS colour.');

export const auroraSchema = z.object({
  groundTop: hex.describe('The ground at the top.'),
  groundBottom: hex.describe('The ground at the bottom.'),
  ribbons: z.array(hex).length(3).describe('Three ribbon colours, which also blend along each ribbon.'),
  intensity: z.number().min(0).max(1.5).describe('How bright the ribbons are. 0.6 sits behind type; 1 is bold.'),
  width: z.number().min(0.4).max(2.5).describe('How wide the ribbons are, as a multiple of the default.'),
  speed: z.number().min(0).max(4).describe('How fast they flow. Whole numbers loop seamlessly over 10 seconds.'),
  scale: z.number().min(0.4).max(3).describe('How long the waves are, as a multiple of the default. Higher is calmer.'),
  grain: z.number().min(0).max(0.3).describe('Grain amount over the whole frame.'),
});
export type AuroraProps = z.infer<typeof auroraSchema>;

export const auroraDefaults: AuroraProps = {
  groundTop: '#050912',
  groundBottom: '#0d1626',
  ribbons: ['#2fd3b0', '#7a6bff', '#4aa3ff'],
  intensity: 1.15,
  width: 1,
  speed: 1,
  scale: 1,
  grain: 0.07,
};

const FRAGMENT = `
precision highp float;
uniform vec2 u_res;
uniform float u_ph;
uniform vec3 u_g0; uniform vec3 u_g1;
uniform vec3 u_c0; uniform vec3 u_c1; uniform vec3 u_c2;
uniform float u_int; uniform float u_w; uniform float u_scale;
${NOISE_GLSL}
vec3 ribbonColour(float t){
  t = clamp(t, 0.0, 1.0) * 2.0;
  return t < 1.0 ? mix(u_c0, u_c1, t) : mix(u_c1, u_c2, t - 1.0);
}
void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  float asp = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * asp, uv.y);
  vec3 col = mix(u_g1, u_g0, uv.y);
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float k = (1.1 + 0.35 * fi) / u_scale;
    float base = 0.30 + 0.115 * fi;
    float y = base
      + 0.085 * sin(p.x * k * 2.0 + u_ph + fi * 1.7)
      + 0.045 * sin(p.x * k * 4.1 - u_ph * 2.0 + fi * 2.9)
      + 0.02 * sin(p.x * k * 7.3 + u_ph * 3.0 + fi * 0.6);
    float d = p.y - y;
    float w = (d > 0.0 ? 0.050 : 0.17) * u_w * (0.8 + 0.2 * sin(p.x * 1.3 + fi + u_ph));
    float body = exp(-(d * d) / (w * w));
    float sheen = exp(-(d * d) / (w * w * 0.012)) * 0.35;
    float fade = 0.55 + 0.45 * sin(p.x * (0.9 + 0.2 * fi) + fi * 2.0 + u_ph);
    float tone = 0.5 + 0.5 * sin(p.x * 0.8 + fi * 1.3 - u_ph);
    vec3 rc = ribbonColour(tone * 0.6 + fi * 0.13);
    float I = (body * 0.55 + sheen) * fade * u_int * (0.8 - 0.1 * fi);
    col = 1.0 - (1.0 - col) * (1.0 - clamp(rc * I, 0.0, 1.0));
  }
  col += (vnoise(gl_FragCoord.xy * 0.5) - 0.5) * 0.012;
  float v = smoothstep(1.25, 0.35, length((uv - 0.5) * vec2(1.0, 0.85)));
  col *= 0.78 + 0.22 * v;
  gl_FragColor = vec4(col, 1.0);
}
`;

export const Aurora: React.FC<AuroraProps> = (p) => {
  const frame = useCurrentFrame();
  const ph = phase(frame, DURATION, p.speed);
  return (
    <Layer id="au-root" effects={p.grain > 0 ? [grain(p.grain, { seed: 8, size: 1.2 })] : undefined}>
      <GlslShader
        id="au-shader"
        width={W}
        height={H}
        fragment={FRAGMENT}
        uniforms={{
          u_res: [W, H],
          u_ph: ph,
          u_g0: rgb(p.groundTop),
          u_g1: rgb(p.groundBottom),
          u_c0: rgb(p.ribbons[0]),
          u_c1: rgb(p.ribbons[1]),
          u_c2: rgb(p.ribbons[2]),
          u_int: p.intensity,
          u_w: p.width,
          u_scale: p.scale,
        }}
      />
    </Layer>
  );
};
