// Rise Glow: a dark ground with a soft band of light rising from the bottom edge in two humps (brightest in the bottom
// corners, dipping in the middle), and a faint ring sweeping round the left. Taken from the opening of a SaaS launch
// reel and measured there: the ground #121013, the band's
// top edge at 0.31 H in the corners and 0.15 H in the middle, its colours from #4a1c1a at the edge through #a54e41 to
// #cc887e in the corners, and the ring #1e1313. The reference's glow does not loop; here the humps sway and breathe on a
// seamless 10 s loop.
//
// `palette` swaps the ramp for the colours of another background in this folder (Liquid, Drift, Tide, Flow, Aurora,
// Veil, Grain), read from that component's own defaults, so a variation always matches its source. `colors` overrides
// both with your own five.
//
// One fragment shader: the light falls off upward from the bottom edge as A·exp(-(y/L)^1.3), where the strength A and the
// reach L are slow sines across x (two humps; whole-number frequencies of the loop phase), mapped through the five-colour
// ramp.
//
// Principles: slow in and out (every motion is a sine), overlap (the two humps sway on different phases), restraint (one
// light, no edges, no grain).

import React from 'react';
import { z } from 'zod';
import { GlslShader } from '@kinetographdev/core';
import { useCurrentFrame } from 'remotion';
import { rgb } from './lib.js';
import { liquidGradientDefaults as liquid } from './liquid-gradient.js';
import { driftGradientDefaults as drift } from './drift-gradient.js';
import { tideGradientDefaults as tide } from './tide-gradient.js';
import { grainFlowDefaults as flow } from './grain-flow.js';
import { auroraDefaults as aurora } from './aurora.js';
import { auroraVeilDefaults as veil } from './aurora-veil.js';
import { grainGradientDefaults as grain } from './grain-gradient.js';

export const W = 1920;
export const H = 1080;
export const LOOP = 300;

/** Mix two #rrggbb colours (t 0..1) and return #rrggbb. */
const mixHex = (a: string, b: string, t: number) => {
  const [x, y] = [rgb(a), rgb(b)];
  return '#' + x.map((v, i) => Math.round((v + (y[i] - v) * t) * 255).toString(16).padStart(2, '0')).join('');
};

/** Each palette is [ground, edge, body, hot, core]: the dark field, the band's outer edge, its body, the corners, and the
 *  brightest point at the bottom of the corners. */
export const RISE_PALETTES = {
  ember: ['#121013', '#4a1c1a', '#a54e41', '#cc887e', '#ead2cf'],
  liquid: [mixHex(liquid.deep, '#000000', 0.6), liquid.deep, liquid.mid, liquid.bright, mixHex(liquid.bright, '#ffffff', 0.55)],
  drift: [mixHex(drift.deep, '#000000', 0.82), drift.deep, drift.mid, drift.light, drift.glow],
  tide: [tide.ground, tide.colors[5], tide.colors[2], tide.colors[1], tide.colors[0]],
  flow: [flow.ground, flow.deep, mixHex(flow.deep, flow.bright, 0.6), flow.bright, flow.glow],
  aurora: [aurora.groundTop, aurora.ribbons[1], aurora.ribbons[2], aurora.ribbons[0], mixHex(aurora.ribbons[0], '#ffffff', 0.55)],
  veil: ['#04120d', veil.colors[4], veil.colors[0], veil.colors[1], veil.colors[2]],
  grain: [mixHex(grain.palette[4], '#000000', 0.8), grain.palette[4], grain.palette[2], grain.palette[1], grain.palette[0]],
} as const;
export type RisePalette = keyof typeof RISE_PALETTES;

const hex = z.string().describe('A CSS colour as #rrggbb.');

export const riseGlowSchema = z.object({
  palette: z.enum(Object.keys(RISE_PALETTES) as [RisePalette, ...RisePalette[]]).describe(
    'The colours: ember is the reference; the others take the colours of LiquidGradient, DriftGradient, TideGradient, GrainFlow, Aurora, AuroraVeil and GrainGradient.',
  ),
  colors: z.array(hex).length(5).optional().describe('Your own five colours (ground, edge, body, hot, core); overrides palette.'),
  height: z.number().min(0.3).max(2.5).describe('How high the band rises. 1 matches the reference (0.31 H in the corners).'),
  dip: z.number().min(0).max(1).describe('How far the middle sinks between the two humps. 1 matches the reference.'),
  ring: z.number().min(0).max(1).describe('Strength of the faint ring at the left. 1 matches the reference, 0 hides it.'),
  sway: z.number().min(0).max(3).describe('How much the humps sway and breathe.'),
  speed: z.number().min(0).max(4).describe('Loops per 10 seconds. Whole numbers loop seamlessly.'),
});
export type RiseGlowProps = z.infer<typeof riseGlowSchema>;

export const riseGlowDefaults: RiseGlowProps = {
  palette: 'ember',
  height: 1,
  dip: 1,
  ring: 1,
  sway: 1,
  speed: 1,
};

const FRAGMENT = `
precision highp float;
uniform vec2 u_res;
uniform float u_ph;
uniform vec3 u_c0; uniform vec3 u_c1; uniform vec3 u_c2; uniform vec3 u_c3; uniform vec3 u_c4;
uniform float u_height; uniform float u_dip; uniform float u_ring; uniform float u_sway;

void main(){
  vec2 px = gl_FragCoord.xy;
  float x = px.x / u_res.x;
  float b = px.y / u_res.y;            // height above the bottom edge, 0..1
  float ph = u_ph;

  // the light falls off upward from the bottom edge, strongest and tallest in the corners, lower in the middle; fitted
  // to the reference's columns (corners 0.85 / 0.6 / 0.4 / 0.15 at 0.06 / 0.17 / 0.28 / 0.39 H, the middle 0.55 / 0.3 / 0.1)
  float sx = x + 0.035 * u_sway * sin(ph + 0.7);
  float c = cos(6.2831853 * sx);
  float A = 0.75 + 0.22 * u_dip * c + 0.06 * x + 0.03 * u_sway * sin(2.0 * ph + 6.2831853 * x * 2.0);
  float L = (0.18 + 0.045 * u_dip * c + 0.035 * x + 0.01 * u_sway * sin(ph + 1.9)) * u_height;
  float v = clamp(A * exp(-pow(b / L, 1.3)), 0.0, 1.0);

  vec3 col = mix(u_c0, u_c1, smoothstep(0.0, 0.18, v));
  col = mix(col, u_c2, smoothstep(0.15, 0.5, v));
  col = mix(col, u_c3, smoothstep(0.45, 0.85, v));
  col = mix(col, u_c4, smoothstep(0.85, 1.0, v) * 0.6);

  // the faint ring: an annulus round a point on the left edge, the ground lifted slightly toward the band's edge colour
  float r = length(px - vec2(0.0, 0.5 * u_res.y)) / u_res.y;
  float rin = 0.47 + 0.02 * sin(ph + 0.3);
  float rout = 0.7 + 0.015 * sin(ph + 2.1);
  float ring = smoothstep(rin - 0.004, rin + 0.004, r) * (1.0 - smoothstep(rout - 0.004, rout + 0.004, r));
  // it lifts the ground by at most 0.05 per channel (the reference's #1e1313 on #121013), whatever the palette
  vec3 dd = u_c1 - u_c0;
  float k = min(0.3, 0.05 / max(max(abs(dd.r), abs(dd.g)), max(abs(dd.b), 0.001)));
  col = mix(col, u_c0 + dd * k, ring * u_ring * (1.0 - smoothstep(0.0, 0.3, v)));

  gl_FragColor = vec4(col, 1.0);
}
`;

export const RiseGlow: React.FC<RiseGlowProps> = (p) => {
  const frame = useCurrentFrame();
  const ph = (2 * Math.PI * frame * p.speed) / LOOP;
  const c = p.colors ?? RISE_PALETTES[p.palette];
  return (
    <GlslShader
      id="rg-shader"
      width={W}
      height={H}
      fragment={FRAGMENT}
      uniforms={{
        u_res: [W, H],
        u_ph: ph,
        u_c0: rgb(c[0]),
        u_c1: rgb(c[1]),
        u_c2: rgb(c[2]),
        u_c3: rgb(c[3]),
        u_c4: rgb(c[4]),
        u_height: p.height,
        u_dip: p.dip,
        u_ring: p.ring,
        u_sway: p.sway,
      }}
    />
  );
};
