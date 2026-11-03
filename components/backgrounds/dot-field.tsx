// Dot Field: a halftone grid whose dots swell and shrink on a slow wave. Two waves cross, a ring that travels out from
// a point off the centre and a long diagonal swell, so the field never looks mechanical, and the dots take their
// colour from where they sit in the wave. Dots are anti-aliased in the shader, so edges stay clean at any scale.
//
// Principles: slow in and out (sine waves), overlap (two waves at different periods), arcs (the ring's centre drifts on a
// small circle), restraint (one colour pair, small dots), solid drawing (a soft light falloff behind the grid).

import React from 'react';
import { z } from 'zod';
import { GlslShader, Layer, grain } from '@kinetographdev/core';
import { useCurrentFrame } from 'remotion';
import { phase, rgb } from './lib.js';

export const W = 1920;
export const H = 1080;
export const FPS = 30;
export const DURATION = 300;

const hex = z.string().describe('A CSS colour.');

export const dotFieldSchema = z.object({
  ground: hex.describe('Background colour.'),
  dot: hex.describe('Colour of the dots where the wave is low.'),
  dotHigh: hex.describe('Colour of the dots at the crest of the wave.'),
  spacing: z.number().min(10).max(80).describe('Distance between dot centres, in pixels.'),
  size: z.number().min(0.2).max(1).describe('The largest dot, as a fraction of the spacing.'),
  waveLength: z.number().min(0.4).max(3).describe('Length of the waves as a multiple of the default. Higher is calmer.'),
  speed: z.number().min(0).max(4).describe('How fast the wave travels. Whole numbers loop seamlessly over 10 seconds.'),
  grain: z.number().min(0).max(0.3).describe('Grain amount over the whole frame.'),
});
export type DotFieldProps = z.infer<typeof dotFieldSchema>;

export const dotFieldDefaults: DotFieldProps = {
  ground: '#efede6',
  dot: '#c9c5b8',
  dotHigh: '#2b3a22',
  spacing: 34,
  size: 0.62,
  waveLength: 1,
  speed: 1,
  grain: 0.05,
};

const FRAGMENT = `
precision highp float;
uniform vec2 u_res;
uniform float u_ph;
uniform vec3 u_bg; uniform vec3 u_lo; uniform vec3 u_hi;
uniform float u_sp; uniform float u_size; uniform float u_wl;
void main(){
  vec2 p = gl_FragCoord.xy;
  vec2 c = (floor(p / u_sp) + 0.5) * u_sp;
  float asp = u_res.x / u_res.y;
  vec2 q = vec2(c.x / u_res.x * asp, c.y / u_res.y);
  // ring wave from a centre that drifts on a small circle
  vec2 o = vec2(0.5 * asp + 0.12 * cos(u_ph), 0.5 + 0.08 * sin(u_ph));
  float ring = sin(length(q - o) * 7.0 / u_wl - u_ph * 2.0);
  // a long diagonal swell
  float swell = sin((q.x * 0.9 + q.y * 1.4) * 2.6 / u_wl + u_ph);
  float w = clamp(0.5 + 0.32 * ring + 0.26 * swell, 0.0, 1.0);
  float r = u_sp * 0.5 * u_size * (0.12 + 0.88 * w * w);
  float dist = length(p - c);
  float cover = smoothstep(r + 0.75, r - 0.75, dist);
  vec3 dotc = mix(u_lo, u_hi, w * w);
  vec2 uv = gl_FragCoord.xy / u_res;
  vec3 bg = u_bg * (0.94 + 0.08 * smoothstep(1.1, 0.0, length((uv - vec2(0.3, 0.75)) * vec2(1.0, 0.9))));
  vec3 col = mix(bg, dotc, cover);
  gl_FragColor = vec4(col, 1.0);
}
`;

export const DotField: React.FC<DotFieldProps> = (p) => {
  const frame = useCurrentFrame();
  const ph = phase(frame, DURATION, p.speed);
  return (
    <Layer id="df-root" effects={p.grain > 0 ? [grain(p.grain, { seed: 6, size: 1.2 })] : undefined}>
      <GlslShader
        id="df-shader"
        width={W}
        height={H}
        fragment={FRAGMENT}
        uniforms={{ u_res: [W, H], u_ph: ph, u_bg: rgb(p.ground), u_lo: rgb(p.dot), u_hi: rgb(p.dotHigh), u_sp: p.spacing, u_size: p.size, u_wl: p.waveLength }}
      />
    </Layer>
  );
};
