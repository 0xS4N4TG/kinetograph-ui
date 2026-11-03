// Tally rise. A currency figure climbing on a bloom that dies under it. One number, one label, one light: the figure
// counts, the frame pushes in on it, and the blue the whole scene is lit by drains away over the second half, so what
// is left is the figure alone on near-black.
//
// Everything on the type layer is one uniform scale about one point; the figure is anchored by its LEFT edge, not
// centred, so a live number that re-centres every time a 1 rolls into a 4 does not shimmy on each tick. The light is
// a fifteen-stop radial gradient taken off the reference's own radial profile (flat core, a falloff that bends), and
// it fades by weight: every stop is a mix of the glow and the field, so it dies the way a lamp dims and not like a
// picture going transparent.
//
// Authored in the reference's 960x540 pixels and doubled by one root scale.
//
// Principles: slow in/slow out and follow through (the push settles fast, drifts, then the second half speeds it
// into the last frame), staging (the light is the staging: it leaves, the figure stays), timing (the count lands
// well before the frame stops moving).

import React from 'react';
import { z } from 'zod';
import { Layer, Rect, Text } from '@kinetographdev/core';
import { hex, lerp, useFonts } from './lib.js';

export const TALLY_FPS = 60;

export const tallySchema = z.object({
  label: z.string().describe('The small line over the figure.'),
  from: z.number().describe('Where the count starts.'),
  to: z.number().describe('Where it lands (as the light goes out).'),
  prefix: z.string().describe('Before the figure, e.g. a currency sign.'),
  decimals: z.number().int().min(0).max(4).describe('Digits after the point.'),
  glow: hex.describe('The colour of the light at its core.'),
  field: hex.describe('The dark the light dies into.'),
  labelColor: hex.describe('The colour of the label.'),
  inkColor: hex.describe('The colour of the figure.'),
  countSeconds: z.number().min(0.3).max(6).describe('Seconds the figure takes to land (reference 0.9 s).'),
  lightOutAt: z.number().min(0).max(6).describe('Seconds when the light starts to drain.'),
  lightOutFor: z.number().min(0.2).max(6).describe('Seconds it takes to go out.'),
  pushSeconds: z.number().min(0.5).max(6).describe('Seconds the whole push takes (reference 1.23 s). The shape of it is measured.'),
  holdSeconds: z.number().min(0).max(8).describe('Seconds the figure holds alone after the push (reference 0.3 s).'),
});
export type TallyProps = z.infer<typeof tallySchema>;

export const tallyDefaults: TallyProps = {
  label: 'Creator payouts',
  from: 1058.77,
  to: 1903.73,
  prefix: '$',
  decimals: 2,
  glow: '#202652',
  field: '#0f0d1a',
  labelColor: '#52545f',
  inkColor: '#fffdfe',
  countSeconds: 0.9,
  lightOutAt: 0.43,
  lightOutFor: 0.55,
  pushSeconds: 1.23,
  holdSeconds: 0.3,
};

const S = (s: number) => Math.round(s * TALLY_FPS);
export const tallyDuration = (p: TallyProps) => S(p.pushSeconds) + S(p.holdSeconds);

// How far through the count the figure is, by reference frame (0..1): measured.
const COUNT: [number, number][] = [[1, 0], [11, 0.1852], [23, 0.4074], [35, 0.6296], [47, 0.8518], [55, 1]];
// The push: the type's scale by reference frame, as a fraction of its final size.
const PUSH: [number, number][] = [[1, 0.796], [5, 0.829], [9, 0.848], [13, 0.863], [25, 0.882], [37, 0.891], [49, 0.91], [55, 0.934], [61, 0.962], [67, 0.986], [73, 0.995], [75, 1]];
// The light's radial profile: [radius in reference px, weight of the glow].
const LIGHT: [number, number][] = [
  [0, 1], [45, 1], [75, 0.96], [105, 0.86], [135, 0.8], [165, 0.73], [195, 0.65], [225, 0.56], [255, 0.45], [285, 0.36],
  [315, 0.29], [345, 0.18], [375, 0.115], [405, 0.055], [435, 0.02], [465, 0],
];
const LIGHT_CENTRE = { x: 478, y: 263 };
const PIVOT = { x: 475, y: 261 };
const TIGHT = 6.6; // pixels each glyph of the figure is pulled in at its final size

const lin = (n: number, k: [number, number][]) => {
  if (n <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) if (n <= k[i][0]) return lerp(k[i - 1][1], k[i][1], (n - k[i - 1][0]) / (k[i][0] - k[i - 1][0]));
  return k[k.length - 1][1];
};
const smooth = (t: number) => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};
const rgb = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const mix = (a: string, b: string, w: number) => {
  const x = rgb(a), y = rgb(b);
  return `rgb(${Math.round(lerp(x[0], y[0], w))},${Math.round(lerp(x[1], y[1], w))},${Math.round(lerp(x[2], y[2], w))})`;
};
const money = (v: number, p: TallyProps) => {
  const [i, d] = Math.abs(v).toFixed(p.decimals).split('.');
  return `${p.prefix}${i.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${d ? '.' + d : ''}`;
};

// final layout, reference px
const NUM_X = 180;
const NUM_Y = 205;
const NUM_SIZE = 147;
const LAB_X = 259;
const LAB_Y = 100;
const LAB_SIZE = 58;

export const TallyRise: React.FC<{ f: number } & TallyProps> = ({ f, ...p }) => {
  const fonts = useFonts();
  // the reference changes on every other frame; keep the count on its 30 fps ticks, the rest continuous
  const n = f + 1 + 0.5;
  const nq = 1 + 2 * Math.floor(f / 2);
  const k = S(p.pushSeconds) / 75; // stretch the measured push over pushSeconds
  const nPush = Math.min(1 + (n - 1) / k, 75);
  const push = lin(nPush, PUSH);
  const countFrames = (S(p.countSeconds) / 54) || 1;
  const u = lin(1 + (nq - 1) / countFrames, COUNT);
  const value = lerp(p.from, p.to, u);

  // the light drains by weight
  const out0 = S(p.lightOutAt), out1 = out0 + S(p.lightOutFor);
  const w = 1 - smooth((f - out0) / Math.max(1, out1 - out0));
  const stops = LIGHT.map(([r, wt]) => ({ offset: r / 465, color: mix(p.field, p.glow, wt * w) }));

  const fig = money(value, p);
  const chars = Array.from(fig).map((_, i) => ({ x: -TIGHT * i }));

  return (
    <Layer id="root">
      <Rect id="ground" width={1920} height={1080} fill={p.field} />
      <Layer id="scene" scale={2}>
        <Rect id="light" width={960} height={540}
          fill={{ type: 'radial', cx: LIGHT_CENTRE.x, cy: LIGHT_CENTRE.y, r: 465, stops }} />
        <Layer id="push" x={PIVOT.x} y={PIVOT.y} anchorX={PIVOT.x} anchorY={PIVOT.y} scale={push}>
          <Text id="label" x={LAB_X} y={LAB_Y} font={fonts.sans} weight={600} size={LAB_SIZE} color={p.labelColor}>{p.label}</Text>
          <Text id="figure" x={NUM_X} y={NUM_Y} font={fonts.sans} weight={600} size={NUM_SIZE} color={p.inkColor} chars={chars}>{fig}</Text>
        </Layer>
      </Layer>
    </Layer>
  );
};
