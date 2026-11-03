// Light Leak. A warm leak sweeps across the picture the way light gets into a film back: it enters from an edge, swells
// into a soft streaked glow (pale core, orange body, deep red fringe), washes the frame at its peak and ebbs away. With a
// second picture, the cut is made at the peak, hidden inside the glow.
//
// Principles: anticipation (the leak builds from a thin edge glow before it floods), slow in and slow out (a sine-squared
// envelope: it eases on and off), arcs (the leak's centre travels along the edge on an eased path, not a line at constant
// speed), staging (it covers the cut, so the eye is on the light and not the swap), timing (a 2.3 s leak, peaking on
// the cut), exaggeration (the peak is pushed, the shoulders are quiet), restraint (one effect, three colours).

import React from 'react';
import { z } from 'zod';
import { Layer, Rect, grain, shader } from '@kinetographdev/core';
import { Easing, useCurrentFrame } from 'remotion';
import { NOISE, colorUniforms } from './shaders.js';
import { H, Picture, W } from './picture.js';

const hex = z.string().describe('A CSS colour (hex).');

export const lightLeakSchema = z.object({
  src: z.string().describe('Picture in public/ (used when no children are given).'),
  toSrc: z.string().describe('Second picture, cut to at the peak of the leak. Empty for a single picture.'),
  peakFrame: z.number().int().min(10).max(300).describe('Frame the leak is at its fullest (and the cut, when there is a second picture).'),
  duration: z.number().int().min(24).max(240).describe('Frames the whole leak lasts, from first glow to gone.'),
  strength: z.number().min(0).max(1.5).describe('How strong the leak is at its peak. 1 floods most of the frame in warm light; 0.5 is a glow at the edge.'),
  edge: z.enum(['left', 'right', 'top', 'bottom']).describe('The edge the light comes in from.'),
  sweep: z.number().min(0).max(1).describe('How far the leak travels along the edge while it plays (0 holds it in place).'),
  softness: z.number().min(0.4).max(2).describe('How far the glow spreads into the frame. Higher is a larger, softer leak.'),
  streaks: z.number().min(0).max(1).describe('How much the glow breaks into streaks (0 is a smooth gradient).'),
  grain: z.number().min(0).max(0.2).describe('Film grain over the whole frame (0 for none).'),
  colors: z
    .object({
      core: hex.describe('The hot centre of the leak.'),
      body: hex.describe('The body of the leak.'),
      fringe: hex.describe('The outer fringe.'),
    })
    .describe('Colours.'),
});
export type LightLeakProps = z.infer<typeof lightLeakSchema>;

export const lightLeakDefaults: LightLeakProps = {
  src: 'photos/nasa-desert-1.jpg',
  toSrc: 'photos/nasa-clouds-1.jpg',
  peakFrame: 66,
  duration: 72,
  strength: 0.9,
  edge: 'right',
  sweep: 0.5,
  softness: 1,
  streaks: 0.6,
  grain: 0.05,
  colors: { core: '#fff1c9', body: '#ff8a2b', fringe: '#c2160f' },
};

const CODE = /* wgsl */ `
${NOISE}
fn sq(x: f32) -> f32 { return x * x; }
fn effect(px: vec2<f32>) -> vec4<f32> {
  let size = globals.canvas;
  // Coordinates in a frame where the light comes in from the left edge: x is the depth into the frame (0 at the edge,
  // measured in frame heights), y runs along the edge.
  var q = px / size.y;
  let ar = size.x / size.y;
  var depth = q.x;
  var along = q.y;
  var len = ar;
  if (u.edge > 2.5) {          // bottom: light comes up from the bottom edge
    depth = (size.y - px.y) / size.y;
    along = px.x / size.y;
    len = 1.0;
  } else if (u.edge > 1.5) {   // top
    depth = px.y / size.y;
    along = px.x / size.y;
    len = 1.0;
  } else if (u.edge > 0.5) {   // right
    depth = (size.x - px.x) / size.y;
    along = q.y;
  }
  let span = select(1.0, ar, u.edge > 1.5);
  let amt = u.amt;
  // Where along the edge the leak's heart sits (moves with the sweep), and how far it reaches into the frame.
  let heart = mix(0.18, 0.82, u.pos) * span;
  let reach = mix(0.1, 0.95, amt) * u.soft;
  let spread = mix(0.22, 0.95, amt) * span * 0.5 + 0.12;
  let lat = exp(-sq((along - heart) / spread));
  // Streaks: the light is broken by the film gate, so brightness varies along the edge and slowly drifts.
  let drift = globals.frame * 0.006;
  let sn = fbm(vec2<f32>(along * 3.2 + drift, depth * 0.9 - drift * 0.5));
  let sn2 = fbm(vec2<f32>(along * 9.0 - drift * 1.7, depth * 2.5));
  let streak = mix(1.0, 0.45 + 0.9 * sn + 0.35 * (sn2 - 0.5), u.streaks);
  let fall = exp(-max(depth, 0.0) / reach);
  var L = fall * (0.35 + 0.65 * lat) * streak;
  // A second, wider, fainter lobe so the leak has a body and not just a hot spot.
  let L2 = exp(-max(depth, 0.0) / (reach * 2.2)) * exp(-sq((along - heart * 0.9 - 0.2 * span) / (spread * 1.8))) * 0.45;
  L = clamp((L + L2) * amt * 1.05, 0.0, 1.3);
  let core = vec3<f32>(u.cr, u.cg, u.cb);
  let body = vec3<f32>(u.br, u.bg, u.bb);
  let fringe = vec3<f32>(u.fr, u.fg, u.fb);
  let hot = smoothstep(0.55, 1.25, L);
  var col = mix(fringe, body, smoothstep(0.04, 0.55, L));
  col = mix(col, core, hot);
  let a = clamp(L, 0.0, 1.0);
  // Screen blend: premultiplied colour with alpha a.
  return vec4<f32>(col * a * (0.55 + 0.55 * L), a);
}
`;

const EDGE = { left: 0, right: 1, top: 2, bottom: 3 } as const;

export const LightLeak: React.FC<LightLeakProps & { children?: React.ReactNode }> = (p) => {
  const f = useCurrentFrame();
  const start = p.peakFrame - p.duration * 0.46;
  const t = Math.min(1, Math.max(0, (f - start) / p.duration));
  // The envelope is skewed: a slower build to the peak, a longer ebb.
  const env = Math.sin(Math.PI * t) ** 2;
  const amt = env * p.strength;
  const pos = 0.5 + p.sweep * (Easing.inOut(Easing.cubic)(t) - 0.5);
  const showTo = p.toSrc !== '' && f >= p.peakFrame;
  return (
    <Layer id="light-leak" effects={p.grain > 0 ? [grain(p.grain, { size: 1.3, seed: 11, animate: true, monochrome: true })] : []}>
      {showTo ? <Picture id="leak-b" src={p.toSrc} scale={1.03 - 0.01 * Math.min(1, (f - p.peakFrame) / 60)} /> : <Picture id="leak-a" src={p.src} scale={1 + 0.02 * Math.min(1, f / p.peakFrame)}>{p.children}</Picture>}
      <Rect
        id="leak"
        width={W}
        height={H}
        fill="#000000"
        blendMode="screen"
        effects={[
          shader({
            code: CODE,
            uniforms: { amt, pos, soft: p.softness, streaks: p.streaks, edge: EDGE[p.edge], ...colorUniforms('c', p.colors.core), ...colorUniforms('b', p.colors.body), ...colorUniforms('f', p.colors.fringe) },
            padding: 0,
          }),
        ]}
      />
    </Layer>
  );
};
