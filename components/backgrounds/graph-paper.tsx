// Graph Paper: the faint squared grid that sits behind so many explainer reels, under cut-out objects and big type: thin
// grey lines (or dots, or plus marks at the crossings) on an off-white ground, strongest round a focus and fading out
// towards the edges, with a soft light and a slow drift of the grid so the frame is never quite still. The drift moves
// a whole number of cells a loop, so it loops without a seam.
//
// Principles: restraint (lines at half strength, one ink, no motion above a cell in ten seconds), staging (the fade
// pulls the eye to the focus, where the subject goes), slow in and out (the drift is linear, the light is a slow sine),
// texture on the whole frame (grain on the root layer).

import React from 'react';
import { z } from 'zod';
import { GlslShader, Layer, grain } from '@kinetographdev/core';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { phase, rgb } from './lib.js';

export const DURATION = 300;

const hex = z.string().describe('A CSS colour.');

export const graphPaperSchema = z.object({
  ground: hex.describe('Paper colour.'),
  ink: hex.describe('Colour of the grid.'),
  kind: z.enum(['lines', 'dots', 'crosses']).describe('Ruled lines, a dot at each crossing, or a plus mark at each crossing.'),
  cell: z.number().min(12).max(200).describe('Grid cell, in pixels.'),
  line: z.number().min(0.5).max(4).describe('Line width (or dot radius), in pixels.'),
  major: z.number().int().min(0).max(10).describe('A stronger line every this many cells; 0 for none.'),
  strength: z.number().min(0).max(1).describe('How dark the grid is over the paper.'),
  focusX: z.number().min(0).max(1).describe('Where the grid is strongest, across (0 left, 1 right).'),
  focusY: z.number().min(0).max(1).describe('Where the grid is strongest, down (0 top, 1 bottom).'),
  fade: z.number().min(0.2).max(2).describe('How far from the focus the grid has faded out, as a fraction of the frame height. 2 for no fade.'),
  drift: z.enum(['none', 'up', 'left', 'diagonal']).describe('Which way the grid slides.'),
  speed: z.number().int().min(0).max(4).describe('Cells the grid slides per loop. Whole numbers, so it loops.'),
  light: z.number().min(0).max(0.4).describe('How much the corners darken round a soft light.'),
  grain: z.number().min(0).max(0.3).describe('Grain amount over the whole frame.'),
});
export type GraphPaperProps = z.infer<typeof graphPaperSchema>;

export const graphPaperDefaults: GraphPaperProps = {
  ground: '#f3f2ee',
  ink: '#a9a8a3',
  kind: 'lines',
  cell: 56,
  line: 1.2,
  major: 0,
  strength: 0.5,
  focusX: 0.5,
  focusY: 0.45,
  fade: 0.85,
  drift: 'diagonal',
  speed: 1,
  light: 0.12,
  grain: 0.04,
};

const FRAGMENT = `
precision highp float;
uniform vec2 u_res; uniform vec2 u_off;
uniform float u_cell; uniform float u_line; uniform float u_major; uniform float u_kind;
uniform vec3 u_bg; uniform vec3 u_ink; uniform float u_str;
uniform vec2 u_focus; uniform float u_fade; uniform float u_light; uniform float u_ph;

// distance in px from p to the nearest grid line, on each axis
vec2 toLine(vec2 p, float cell){ return abs(fract(p / cell - 0.5) - 0.5) * cell; }

void main(){
  vec2 px = gl_FragCoord.xy;
  vec2 p = px + u_off;
  float aa = 0.8;
  float lw = u_line * 0.5;
  vec2 f = toLine(p, u_cell);
  float cov = 0.0;
  if (u_kind < 0.5) {
    cov = smoothstep(lw + aa, lw - aa, min(f.x, f.y));
    if (u_major > 0.5) {
      vec2 fm = toLine(p, u_cell * u_major);
      float m = smoothstep(lw * 1.8 + aa, lw * 1.8 - aa, min(fm.x, fm.y));
      cov = max(cov * 0.6, m);
    }
  } else if (u_kind < 1.5) {
    float r = u_line * 1.3;
    cov = smoothstep(r + aa, r - aa, length(f));
  } else {
    float arm = u_cell * 0.11;
    float h = smoothstep(lw + aa, lw - aa, f.y) * smoothstep(arm + aa, arm - aa, f.x);
    float v = smoothstep(lw + aa, lw - aa, f.x) * smoothstep(arm + aa, arm - aa, f.y);
    cov = max(h, v);
  }
  // strongest round the focus, gone by u_fade frame-heights away
  vec2 q = (px - u_focus * u_res) / u_res.y;
  float keep = u_fade >= 1.99 ? 1.0 : 1.0 - smoothstep(u_fade * 0.3, u_fade, length(q));
  // a soft light that breathes a little round the focus
  vec2 l = (px - (u_focus + vec2(0.03 * cos(u_ph), 0.02 * sin(u_ph))) * u_res) / u_res.y;
  vec3 bg = u_bg * (1.0 - u_light * smoothstep(0.25, 1.3, length(l)));
  gl_FragColor = vec4(mix(bg, u_ink, cov * u_str * keep), 1.0);
}
`;

/** Faint graph paper on an off-white ground, fading out from a focus, sliding slowly. `id` prefixes its layer ids, for
 *  two papers on screen at once (a camera pan between scenes). */
export const GraphPaper: React.FC<GraphPaperProps & { id?: string }> = (p) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const ph = phase(frame, DURATION, 1);
  const slide = ((frame % DURATION) / DURATION) * p.speed * p.cell;
  // gl_FragCoord runs up, so "up" on screen adds to y
  const dir = p.drift === 'up' ? [0, -1] : p.drift === 'left' ? [1, 0] : p.drift === 'diagonal' ? [1, -1] : [0, 0];
  return (
    <Layer id={`${p.id ?? 'gp'}-root`} effects={p.grain > 0 ? [grain(p.grain, { seed: 11, size: 1.2 })] : undefined}>
      <GlslShader
        id={`${p.id ?? 'gp'}-shader`}
        width={W}
        height={H}
        fragment={FRAGMENT}
        uniforms={{
          u_res: [W, H], u_off: [dir[0]! * slide, dir[1]! * slide], u_cell: p.cell, u_line: p.line, u_major: p.major,
          u_kind: p.kind === 'lines' ? 0 : p.kind === 'dots' ? 1 : 2, u_bg: rgb(p.ground), u_ink: rgb(p.ink), u_str: p.strength,
          u_focus: [p.focusX, 1 - p.focusY], u_fade: p.fade, u_light: p.light, u_ph: ph,
        }}
      />
    </Layer>
  );
};
