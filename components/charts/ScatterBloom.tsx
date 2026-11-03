// Scatter bloom. A scatter plot that blooms onto a tilted plane while the camera drifts along it: thirteen hundred
// small points arrive over three seconds -- most on schedule, one in fourteen long before its turn, anywhere along
// the axis -- while the plane rolls a little, pushes in about a tenth (and overshoots on the way) and tracks two
// hundred pixels left. Nothing cuts and nothing lands; the only event in it is data.
//
// The plane is a flat sheet (header, hairline grid, week labels, a table) turned by the engine's own 3D layer
// transform under one perspective camera: the right edge is the near edge, so the near points are larger and, being
// out of focus, soft. The pose was fitted to the reference's week labels and table cells (rotateY about -12 degrees,
// roll about -6, perspective 554 reference px). The depth of field is made from bands of points blurred by their
// distance along the plane.
//
// Principles: slow in/slow out (the camera decays into its rest, no keyframe stops), follow through (the push
// overshoots by 2% and settles), staging (the data is the only event; the sheet is a still ground), timing (the cloud
// arrives on the reference's measured S-curve), secondary action (each point pops with a small overshoot).

import React from 'react';
import { z } from 'zod';
import { random } from 'remotion';
import { Camera, Ellipse, Layer, Path, Rect, Text, blur } from '@kinetographdev/core';
import { clamp01, hex, lerp, useFonts } from './lib.js';

export const SCATTER_FPS = 60;

export const scatterSchema = z.object({
  eyebrow: z.string().describe('Small line over the title.'),
  title: z.string().describe('The chart title.'),
  subtitle: z.string().describe('Small line under the title.'),
  weeks: z.array(z.string()).length(5).describe('The five x labels, left to right.'),
  columns: z.array(z.string()).length(4).describe('Table header cells.'),
  rows: z.array(z.array(z.string()).length(4)).max(3).describe('Table rows.'),
  points: z.number().int().min(100).max(3000).describe('How many points bloom onto the plane (reference 1300).'),
  seed: z.number().int().describe('Seed of the cloud.'),
  early: z.number().min(0).max(0.5).describe('Share of the points that arrive long before their turn (reference 1 in 14).'),
  accent: hex.describe('One end of the colour ramp of the points.'),
  accentB: hex.describe('The other end.'),
  ground: hex.describe('Background.'),
  bloomSeconds: z.number().min(1).max(12).describe('Seconds the points take to arrive (reference 3.1 s of the 3.27 s shot).'),
  holdSeconds: z.number().min(0).max(8).describe('Extra seconds to hold the last frame.'),
});
export type ScatterProps = z.infer<typeof scatterSchema>;

export const scatterDefaults: ScatterProps = {
  eyebrow: 'Dashboard · Render performance',
  title: 'Time to first frame',
  subtitle: 'Seconds per scene, by week',
  weeks: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
  columns: ['Scenes rendered', '+26%', 'p95', 'p99'],
  rows: [['23', '28', '1.9s', '4.1s'], ['34', '31', '2.4s', '6.0s']],
  points: 1300,
  seed: 7,
  early: 1 / 14,
  accent: '#4a62e0',
  accentB: '#b43ea2',
  ground: '#faf9f5',
  bloomSeconds: 3.1,
  holdSeconds: 0,
};

const END = 196;
export const scatterDuration = (p: ScatterProps) => END + Math.round(p.holdSeconds * SCATTER_FPS);

// ---------------------------------------------------------------------------------------------------------------
// Pose, fitted to the reference (reference px; the canvas is twice that).
const POSE = { rx: 0.67, ry: -12.03, rz0: -5.64, rz1: -6.3, persp: 554, tx0: 8.43, tx1: -95.85, ty0: 190.34, ty1: 192.25, sc0: 0.897 };
const COL = 170; // distance between columns on the plane
const ROW = 43; // distance between table rows

// How much of the cloud has arrived, by reference frame (measured off the area of colour).
const ARRIVED: [number, number][] = [[0, 0], [1, 0.024], [11, 0.035], [21, 0.052], [31, 0.073], [41, 0.115], [51, 0.146], [61, 0.187], [71, 0.243], [81, 0.325], [91, 0.406], [101, 0.52], [111, 0.621], [121, 0.729], [131, 0.793], [141, 0.857], [151, 0.893], [161, 0.948], [171, 0.979], [181, 0.998], [191, 1]];
const when = (q: number) => {
  for (let i = 1; i < ARRIVED.length; i++) if (q <= ARRIVED[i][1]) return lerp(ARRIVED[i - 1][0], ARRIVED[i][0], (q - ARRIVED[i - 1][1]) / (ARRIVED[i][1] - ARRIVED[i - 1][1]));
  return 191;
};

interface Dot { x: number; y: number; r: number; t: number; a: number; b: number }
const cache = new Map<string, Dot[]>();
function cloud(p: ScatterProps): Dot[] {
  const key = `${p.points}|${p.seed}|${p.early}|${p.bloomSeconds}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const k = (p.bloomSeconds * SCATTER_FPS) / 186; // stretch the reference's schedule
  const out: Dot[] = [];
  for (let i = 0; i < p.points; i++) {
    const R = (n: string) => random(`${p.seed}-${i}-${n}`);
    const v = Math.pow(R('x'), 0.72);
    const x = -405 + 925 * v;
    const hmax = Math.min(170, 22 + (x + 400) * 0.26);
    const y = -140 + 12 * (R('f') - 0.5) * (0.4 + (x + 400) / 900) - hmax * Math.pow(R('y'), 1.5);
    const r = 1.05 * (1.4 + 3.6 * Math.pow(R('r'), 2.2)) * (1 + 0.5 * clamp01((x - 100) / 400));
    const q = R('e') < p.early ? R('q') * v : clamp01(0.4 * v + 0.6 * R('j'));
    const b = (when(q) - 6) * k;
    out.push({ x, y, r, t: R('c'), a: 0.62 + 0.38 * R('a'), b });
  }
  cache.set(key, out);
  return out;
}

const rgb = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const mix = (a: string, b: string, t: number) => {
  const x = rgb(a), y = rgb(b);
  return `rgb(${Math.round(lerp(x[0], y[0], t))},${Math.round(lerp(x[1], y[1], t))},${Math.round(lerp(x[2], y[2], t))})`;
};
const popScale = (a: number) => {
  if (a >= 1) return 1;
  const c1 = 1.9, c3 = c1 + 1;
  return 1 + c3 * Math.pow(a - 1, 3) + c1 * Math.pow(a - 1, 2);
};

const BANDS = 12;
const X_MIN = -405, X_MAX = 520;
const bandBlur = (xc: number) => 5 * clamp01((xc - 230) / 300); // reference px, in plane units

export const ScatterBloom: React.FC<{ f: number } & ScatterProps> = ({ f, ...p }) => {
  const fonts = useFonts();
  const g = Math.min(f, END);
  const pn = (1 - Math.exp(-g / 80)) / (1 - Math.exp(-END / 80));
  const over = 0.02 * Math.sin(Math.PI * Math.pow(pn, 0.7));
  const sc = lerp(POSE.sc0, 1, pn) + over;
  const rz = lerp(POSE.rz0, POSE.rz1, pn);
  const tx = lerp(POSE.tx0, POSE.tx1, pn);
  const ty = lerp(POSE.ty0, POSE.ty1, pn);

  const dots = cloud(p);
  const bands: React.ReactNode[][] = Array.from({ length: BANDS }, () => []);
  dots.forEach((d, i) => {
    const a = clamp01((g - d.b) / 12);
    if (a <= 0) return;
    const bi = Math.min(BANDS - 1, Math.max(0, Math.floor(((d.x - X_MIN) / (X_MAX - X_MIN)) * BANDS)));
    const r = d.r * popScale(a);
    bands[bi].push(
      <Ellipse key={i} id={`d${i}`} x={d.x - r} y={d.y - r} width={2 * r} height={2 * r}
        fill={mix(p.accent, p.accentB, d.t)} opacity={Math.min(1, a * 2) * d.a} />,
    );
  });

  const colX = (k: number) => (k - 2) * COL;
  const rowY = (j: number) => (j - 1.5) * ROW;
  const text = (id: string, s: string, x: number, y: number, size: number, color: string, weight = 400, w = 160) => (
    <Text key={id} id={id} x={x - w / 2} y={y - size * 0.62} font={fonts.sans} weight={weight} size={size} color={color} maxWidth={w} align="center">{s}</Text>
  );
  const lineColor = '#f2f1ec';

  return (
    <Layer id="root">
      <Camera perspective={POSE.persp * 2} />
      <Rect id="ground" width={1920} height={1080} fill={p.ground} />
      <Layer id="plane" x={960 + 2 * tx} y={540 + 2 * ty} scale={2 * sc} rotation={rz} rotateX={POSE.rx} rotateY={POSE.ry}>
        {/* header */}
        <Text id="eyebrow" x={-345} y={-433} font={fonts.sans} weight={400} size={9} color="#b4b2aa">{p.eyebrow}</Text>
        <Text id="title" x={-347} y={-402} font={fonts.sans} weight={400} size={19} color="#3f3d37">{p.title}</Text>
        <Text id="subtitle" x={-345} y={-369} font={fonts.sans} weight={400} size={8.5} color="#bdbbb3">{p.subtitle}</Text>

        {/* chart: a baseline and faint grid */}
        {[-145, -225, -305, -385].map((y, i) => (
          <Path key={i} id={`grid${i}`} d={`M-430 ${y}H600`} stroke={{ color: i === 0 ? '#ebeae4' : lineColor, width: 1 }} />
        ))}
        {Array.from({ length: BANDS }, (_, bi) => {
          const xc = X_MIN + ((bi + 0.5) / BANDS) * (X_MAX - X_MIN);
          const r = bandBlur(xc);
          return (
            <Layer key={bi} id={`band${bi}`} effects={r >= 0.5 ? [blur(r * 2)] : []}>
              {bands[bi]}
            </Layer>
          );
        })}

        {/* week labels */}
        {p.weeks.map((w, k) => (
          <Layer key={k} id={`wk${k}`} effects={k === 4 ? [blur(3)] : []}>
            {text(`wkt${k}`, w, colX(k), rowY(0), 12.5, '#a8a69e', 400)}
          </Layer>
        ))}

        {/* table */}
        <Rect id="bar" x={-421} y={rowY(1) - 18.5} width={985} height={37} radius={5}
          fill={{ type: 'linear', x0: -421, y0: 0, x1: 564, y1: 0, stops: [{ offset: 0, color: '#ecebe6' }, { offset: 0.5, color: '#dfded9' }, { offset: 1, color: '#f4f3ef' }] }} />
        {p.columns.map((c, k) => text(`h${k}`, c, colX(k), rowY(1), k === 0 ? 7.5 : 8.5, '#55534c', 500))}
        {p.rows.map((row, j) => row.map((c, k) => text(`r${j}-${k}`, c, colX(k), rowY(2 + j), 12.5, '#59574f', 400)))}
      </Layer>
    </Layer>
  );
};
