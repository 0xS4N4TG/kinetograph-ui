// Film Burn. A transition between two pictures made the way a burnt film end is: a heat front crosses the frame along an
// organic, noisy edge. Ahead of it the first picture scorches and warms; at the front the emulsion glows white, then
// yellow, orange and red; behind it the second picture shows through, over-exposed at first and settling to its own
// colours. One shared field decides where the front is, and three layers read it: the scorched picture, the revealed
// picture, and a screen-blended glow.
//
// Principles: anticipation (the first picture warms and darkens ahead of the front before anything burns), slow in and
// slow out (the front eases across), follow through (the afterglow trails the front and the second picture settles from
// over-exposed), staging (the glow is the only bright thing, the cut happens inside it), timing (a 3.5 s burn with a long afterglow),
// exaggeration (the front's colour is pushed, the pictures are not), restraint (no sparks, no shake).

import React from 'react';
import { z } from 'zod';
import { Layer, Rect, grain, shader } from '@kinetographdev/core';
import { Easing, useCurrentFrame } from 'remotion';
import { NOISE, colorUniforms } from './shaders.js';
import { H, Picture, W } from './picture.js';

const hex = z.string().describe('A CSS colour (hex).');

export const filmBurnSchema = z.object({
  src: z.string().describe('First picture in public/.'),
  toSrc: z.string().describe('Second picture in public/.'),
  startFrame: z.number().int().min(0).max(300).describe('Frame the heat starts to reach the picture.'),
  duration: z.number().int().min(15).max(240).describe('Frames the burn takes to cross the frame.'),
  angle: z.number().min(0).max(360).describe('Direction the front travels, in degrees clockwise from the right (0 sweeps left to right).'),
  width: z.number().min(0.03).max(0.4).describe('How wide the glowing front is, as a share of the frame.'),
  roughness: z.number().min(0).max(1).describe('How ragged the front is (0 is a straight line, 1 is very organic).'),
  scorch: z.number().min(0).max(1).describe('How much the first picture darkens and warms ahead of the front.'),
  flash: z.number().min(0).max(1).describe('How much the whole frame is washed with warm light at the front\'s peak.'),
  grain: z.number().min(0).max(0.2).describe('Film grain over the whole frame (0 for none).'),
  colors: z
    .object({
      hot: hex.describe('The white-hot inside of the front.'),
      mid: hex.describe('Yellow-orange body.'),
      outer: hex.describe('Deep red and brown at the outer edge.'),
    })
    .describe('Colours of the heat, from hottest to coolest.'),
});
export type FilmBurnProps = z.infer<typeof filmBurnSchema>;

export const filmBurnDefaults: FilmBurnProps = {
  src: 'photos/nasa-volcano-1.jpg',
  toSrc: 'photos/nasa-earth-2.jpg',
  startFrame: 12,
  duration: 104,
  angle: 20,
  width: 0.13,
  roughness: 0.7,
  scorch: 0.7,
  flash: 0.4,
  grain: 0.05,
  colors: { hot: '#fff4d6', mid: '#ff9b2e', outer: '#8f1d0a' },
};

/** The field every layer reads: 0 at the side the burn starts, 1 at the far side, bent by noise. */
const FIELD = /* wgsl */ `
${NOISE}
fn field(px: vec2<f32>) -> f32 {
  let size = globals.canvas;
  let uv = px / size - vec2<f32>(0.5, 0.5);
  let dir = vec2<f32>(cos(u.ang), sin(u.ang));
  // Along the travel direction, scaled so the front crosses the whole frame (0..1).
  let reach = abs(dir.x) * size.x / size.y + abs(dir.y);
  let g = dot(uv * vec2<f32>(size.x / size.y, 1.0), dir) / reach + 0.5;
  let nz = fbm(px / size.y * 3.2 + vec2<f32>(3.7, 1.3)) * 0.75 + fbm(px / size.y * 11.0) * 0.25;
  return g + (nz - 0.5) * u.rough * 0.9;
}
`;

const SCORCHED = /* wgsl */ `
${FIELD}
fn effect(px: vec2<f32>) -> vec4<f32> {
  let c = layer(px);
  let x = field(px) - u.front;           // negative behind the front, positive ahead
  let ahead = clamp(x, 0.0, 1.0);
  // Heat soaks in ahead of the front: warm, then darker as it chars.
  let soak = exp(-ahead / (u.width * 2.6));
  let char = exp(-ahead / (u.width * 0.9));
  let warm = vec3<f32>(1.0, 0.55, 0.22);
  var rgb = c.rgb * mix(vec3<f32>(1.0, 1.0, 1.0), warm, soak * 0.6 * u.scorch);
  rgb = rgb * (1.0 - 0.55 * char * u.scorch);
  return vec4<f32>(rgb, c.a);
}
`;

const REVEAL = /* wgsl */ `
${FIELD}
fn effect(px: vec2<f32>) -> vec4<f32> {
  let c = layer(px);
  let x = field(px) - u.front;
  // Visible behind the front, over-exposed and warm, settling as the front moves on.
  let vis = 1.0 - smoothstep(-0.012, 0.012, x);
  let behind = clamp(-x, 0.0, 1.0);
  let over = exp(-behind / (u.width * 5.0));
  let rgb = (c.rgb + vec3<f32>(1.0, 0.62, 0.28) * over * 0.55) * (1.0 + over * 0.35);
  return vec4<f32>(min(rgb, vec3<f32>(1.0, 1.0, 1.0)) * vis, vis);
}
`;

const GLOW = /* wgsl */ `
${FIELD}
fn ramp(h: f32) -> vec3<f32> {
  let hot = vec3<f32>(u.hr, u.hg, u.hb);
  let mid = vec3<f32>(u.mr, u.mg, u.mb);
  let outer = vec3<f32>(u.outr, u.outg, u.outb);
  let a = mix(vec3<f32>(0.0, 0.0, 0.0), outer, smoothstep(0.0, 0.35, h));
  let b = mix(a, mid, smoothstep(0.25, 0.7, h));
  return mix(b, hot, smoothstep(0.65, 1.0, h));
}
fn effect(px: vec2<f32>) -> vec4<f32> {
  let x = field(px) - u.front;
  // Heat: sharp ahead of the front, a long afterglow behind it.
  let k = select(exp(-(x * x) / (u.width * u.width * 0.18)), exp(-(x * x) / (u.width * u.width * 9.0)), x < 0.0);
  let crackle = 0.82 + 0.35 * fbm(px * 0.045 + vec2<f32>(globals.frame * 0.7, 0.0)) ;
  let h = clamp(k * crackle * u.live, 0.0, 1.0);
  // A wash of warm light over everything at the burn's peak.
  let wash = u.flash * u.live * (0.55 + 0.45 * fbm(px / globals.canvas.y * 1.6 + vec2<f32>(5.0, 2.0)));
  var rgb = ramp(h) * (0.9 + 0.7 * h) + vec3<f32>(u.mr, u.mg * 0.8, u.mb * 0.5) * wash * 0.28;
  // Embers: where the front has passed the char keeps glowing, in patches that crawl, and dies away over a second.
  let behind = clamp(-x, 0.0, 1.0);
  let blotch = pow(fbm(px * 0.011 + vec2<f32>(0.0, globals.frame * 0.05)), 2.6) * 5.0;
  let emb = u.ember * smoothstep(0.02, 0.35, behind) * clamp(blotch, 0.0, 1.0);
  let rgb2 = rgb + (vec3<f32>(u.outr, u.outg, u.outb) * 1.7 + vec3<f32>(u.mr, u.mg, u.mb) * 0.35) * emb * (0.7 + 0.5 * crackle);
  let a = clamp(max(max(rgb2.x, rgb2.y), rgb2.z), 0.0, 1.0);
  return vec4<f32>(rgb2, a);
}
`;

export const FilmBurn: React.FC<FilmBurnProps> = (p) => {
  const f = useCurrentFrame();
  const t = Math.min(1, Math.max(0, (f - p.startFrame) / p.duration));
  // The front crosses from before the frame to past it; an ease-in-out, a little slower at the start (heat builds).
  const front = -0.15 + 1.4 * Easing.bezier(0.38, 0, 0.62, 1)(t);
  // The glow is alive while the front is in the frame, and ebbs afterwards.
  const live = Math.sin(Math.PI * Math.min(1, Math.max(0, (front + 0.15) / 1.4))) ** 0.45 * (t > 0 ? 1 : 0);
  const flashPeak = Math.exp(-(((t - 0.5) / 0.22) ** 2)) * p.flash;
  const ember = Math.min(1, Math.max(0, (front - 0.2) * 3)) * Math.exp(-Math.max(0, f - (p.startFrame + p.duration * 0.8)) / 20);
  const ang = (p.angle * Math.PI) / 180;
  const shared = { front, ang, rough: p.roughness, width: p.width };
  return (
    <Layer id="film-burn" effects={p.grain > 0 ? [grain(p.grain, { size: 1.3, seed: 23, animate: true, monochrome: true })] : []}>
      <Layer id="burn-a" effects={[shader({ code: SCORCHED, uniforms: { ...shared, scorch: p.scorch }, padding: 0 })]}>
        <Picture id="burn-a-pic" src={p.src} scale={1 + 0.02 * Math.min(1, f / 120)} />
      </Layer>
      <Layer id="burn-b" effects={[shader({ code: REVEAL, uniforms: shared, padding: 0 })]}>
        <Picture id="burn-b-pic" src={p.toSrc} scale={1.03 - 0.02 * Math.min(1, Math.max(0, f - p.startFrame) / 120)} />
      </Layer>
      <Rect
        id="burn-glow"
        width={W}
        height={H}
        fill="#000000"
        blendMode="screen"
        effects={[shader({ code: GLOW, uniforms: { ...shared, live, flash: flashPeak, ember, ...colorUniforms('h', p.colors.hot), ...colorUniforms('m', p.colors.mid), ...colorUniforms('out', p.colors.outer) }, padding: 0 })]}
      />
    </Layer>
  );
};
