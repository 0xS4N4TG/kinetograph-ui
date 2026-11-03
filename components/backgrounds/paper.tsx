// Paper: a sheet of fibrous paper under a raking light. A crumple of soft folds, oriented fibres and fine tooth is
// lit by a light that circles very slowly, so the grain catches and loses the light; a broad falloff gives the sheet
// one bright side. Drawn by a fragment shader, so it is one flat layer that sits behind anything.
//
// Principles: slow in and out (the light's orbit is a sine), secondary action (the falloff and the raking light move
// on different periods), solid drawing (one light, shadows consistent with its direction), texture makes it made, restraint.

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

export const paperSchema = z.object({
  paper: hex.describe('The colour of the sheet where the light is full.'),
  shade: hex.describe('The colour of the sheet in its shadows and blotches.'),
  fibre: z.number().min(0).max(2).describe('How much fibre shows. 0 is smooth stock; 1 is a handmade sheet.'),
  relief: z.number().min(0).max(3).describe('How strongly the light picks out the surface. Higher is rougher.'),
  scale: z.number().min(0.4).max(3).describe('Size of the texture: higher is coarser.'),
  speed: z.number().min(0).max(4).describe('How fast the light moves. Whole numbers loop seamlessly over 10 seconds.'),
  falloff: z.number().min(0).max(1).describe('How much darker the far side of the sheet is.'),
  grain: z.number().min(0).max(0.3).describe('Extra grain over the whole frame.'),
});
export type PaperProps = z.infer<typeof paperSchema>;

export const paperDefaults: PaperProps = {
  paper: '#f4efe4',
  shade: '#d9d0bd',
  fibre: 1,
  relief: 1,
  scale: 1,
  speed: 1,
  falloff: 0.55,
  grain: 0.03,
};

const FRAGMENT = `
precision highp float;
uniform vec2 u_res;
uniform float u_ph;
uniform vec3 u_paper; uniform vec3 u_shade;
uniform float u_fibre; uniform float u_relief; uniform float u_scale; uniform float u_fall;
${NOISE_GLSL}
float crumple(vec2 p){
  // soft folds: ridged noise, two octaves, so the sheet has creases and swells the light can rake across
  float r1 = 1.0 - abs(2.0 * fbm(p * 1.15 + 9.0) - 1.0);
  float r2 = 1.0 - abs(2.0 * fbm(p * 2.6 + 3.0) - 1.0);
  return 0.75 * r1 * r1 + 0.28 * r2 * r2 + 0.25 * fbm(p * 0.8);
}
float fine(vec2 p){
  float h = 0.0;
  for (int i = 0; i < 4; i++) {
    float a = float(i) * 1.37 + 0.4;
    mat2 r = mat2(cos(a), -sin(a), sin(a), cos(a));
    vec2 q = r * (p + float(i) * 3.7);
    h += u_fibre * 0.012 * vnoise(vec2(q.x * 60.0, q.y * 420.0));
  }
  h += 0.05 * vnoise(p * 520.0) + 0.03 * vnoise(p * 210.0);
  return h;
}
void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  float asp = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * asp, uv.y) / u_scale;
  float e = 1.0 / 900.0 / u_scale;
  float c0 = crumple(p);
  float cx = crumple(p + vec2(e, 0.0));
  float cy = crumple(p + vec2(0.0, e));
  float f0 = fine(p);
  float fx = fine(p + vec2(e, 0.0));
  float fy = fine(p + vec2(0.0, e));
  vec2 g = vec2(c0 - cx, c0 - cy) / e * 0.03 + vec2(f0 - fx, f0 - fy) / e * 0.011;
  vec3 n = normalize(vec3(g * u_relief, 1.0));
  // a raking light from the upper left that circles enough to move the shadows of the folds
  vec3 L = normalize(vec3(-0.6 + 0.3 * cos(u_ph), 0.55 + 0.25 * sin(u_ph), 0.42));
  float lit = dot(n, L);
  float blotch = smoothstep(0.3, 0.8, fbm(p * 1.3 + 4.0));
  vec3 col = mix(u_paper, u_shade, blotch * 0.5 + 0.35 * clamp(0.9 - c0, 0.0, 1.0) * 0.5);
  col *= 0.74 + 0.40 * lit;
  // a broad falloff: bright upper left, darker far side; its centre sways on another period
  vec2 lc = vec2(0.28 + 0.1 * sin(u_ph * 2.0), 0.78 + 0.06 * cos(u_ph));
  float fo = smoothstep(1.35, 0.0, length((uv - lc) * vec2(1.0, 0.8)));
  col *= 1.0 - u_fall * 0.34 * (1.0 - fo);
  col += (fo - 0.5) * 0.03;
  gl_FragColor = vec4(col, 1.0);
}
`;

export const Paper: React.FC<PaperProps> = (p) => {
  const frame = useCurrentFrame();
  const ph = phase(frame, DURATION, p.speed);
  return (
    <Layer id="pa-root" effects={p.grain > 0 ? [grain(p.grain, { seed: 2, size: 1.1 })] : undefined}>
      <GlslShader
        id="pa-shader"
        width={W}
        height={H}
        fragment={FRAGMENT}
        uniforms={{ u_res: [W, H], u_ph: ph, u_paper: rgb(p.paper), u_shade: rgb(p.shade), u_fibre: p.fibre, u_relief: p.relief, u_scale: p.scale, u_fall: p.falloff }}
      />
    </Layer>
  );
};
