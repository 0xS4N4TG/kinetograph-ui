// Donut chart, after Bklit UI's Pie Chart (MIT): rounded, padded slices in the --chart-1..5 colours, a total and a
// label in the middle, a legend with progress bars, and the hover state (one slice steps out along its radius, the
// rest fade to 40%, the middle swaps to that slice).
//
// Shot: the camera starts tight on the top of the ring and orbits with the sweep (it follows the head at a fraction
// of the radius, so it travels on a tighter circle than the head: the ring keeps curving through the frame). Each
// slice takes its turn, the camera pausing at each seam. Then a small pull-back (anticipation), a pull-out to the
// whole chart with motion blur and a settle, and the largest slice steps out as the middle changes to it.
//
// Principles: staging (one slice a beat), arcs (the orbit), slow in and slow out (each slice eases in and out, so the
// camera breathes at every seam), anticipation and overshoot on the pull-out, follow-through (legend rows arrive
// after their slice, the hover after the camera has landed).

import React from 'react';
import { z } from 'zod';
import { Ellipse, Layer, Path, Rect, Text } from '@kinetographdev/core';
import { Cam, H, W, easeOut, fmt, fmtSchema, hex, hexA, lerp, seg, useFonts, type NumFmt } from './lib.js';
import { PX, arcPath, backOut, bkModeSchema, bkPaletteSchema, easeRide, group, moveCurve, polar, shutterFor, soft, tokens } from './bklit.js';
import { Backdrop, Heading, Soft } from './bklitParts.js';

export const DONUT_FPS = 60;

export const donutSchema = z.object({
  data: z.array(z.object({
    label: z.string().describe('Slice name.'),
    value: z.number().min(0).describe('Slice value.'),
    color: hex.optional().describe('Override colour; by default the palette (--chart-1 to --chart-5) in order.'),
  })).min(2).max(8).describe('The slices, clockwise from 12 o\'clock.'),
  title: z.string().describe('Heading.'),
  subtitle: z.string().describe('Muted line under the heading.'),
  centerLabel: z.string().describe('Label under the total in the middle.'),
  leader: z.number().int().min(-1).describe('Slice that steps out at the end; -1 for the largest.'),
  mode: bkModeSchema,
  palette: bkPaletteSchema,
  format: fmtSchema,
  innerRatio: z.number().min(0).max(0.9).describe('Inner radius over outer radius; 0 draws a pie.'),
  padDegrees: z.number().min(0).max(8).describe('Gap between slices in degrees (Bklit padAngle).'),
  cornerRadius: z.number().min(0).max(40).describe('Corner radius of the slices in pixels.'),
  sliceSeconds: z.number().min(0.2).max(3).describe('How long each slice takes to sweep.'),
  holdSeconds: z.number().min(0).max(8).describe('How long the last frame holds.'),
  camera: z.object({
    tightZoom: z.number().min(1.2).max(3.5).describe('Zoom while orbiting the ring.'),
    wideZoom: z.number().min(0.7).max(1.3).describe('Zoom of the whole chart.'),
    orbit: z.number().min(0).max(1).describe('How far the camera follows the head around the ring (1 rides on it, lower keeps nearer the middle).'),
    motionBlur: z.number().min(0).max(1.5).describe('Strength of the motion blur on the fast moves; 0 turns it off.'),
    rackFocus: z.number().min(0).max(12).describe('Blur in pixels on the middle readout while the camera orbits.'),
  }).describe('Camera.'),
});
export type DonutProps = z.infer<typeof donutSchema>;

const fmt0: NumFmt = { prefix: '', suffix: '', decimals: 0, group: ',' };

export const donutDefaults: DonutProps = {
  data: [
    { label: 'Direct', value: 3200 }, { label: 'Organic', value: 2800 }, { label: 'Referral', value: 1900 },
    { label: 'Social', value: 1400 }, { label: 'Email', value: 900 },
  ],
  title: 'Traffic sources',
  subtitle: 'Visitors by channel, last 30 days',
  centerLabel: 'Visitors',
  leader: -1,
  mode: 'light',
  palette: 'primary',
  format: fmt0,
  innerRatio: 0.66,
  padDegrees: 1.6,
  cornerRadius: 12,
  sliceSeconds: 0.75,
  holdSeconds: 1.6,
  camera: { tightZoom: 2, wideZoom: 1.04, orbit: 0.62, motionBlur: 1, rackFocus: 4 },
};

const S = (s: number) => Math.round(s * DONUT_FPS);
const GAP = 4; // frames of rest at each seam
const times = (p: DonutProps) => {
  const sl = S(p.sliceSeconds);
  const d0 = S(0.4);
  const d1 = d0 + p.data.length * sl + (p.data.length - 1) * GAP;
  const a0 = d1 + S(0.2);
  const m0 = a0 + S(0.3);
  const m1 = m0 + S(1.6);
  const h0 = m1 + S(0.1);
  const h1 = h0 + S(0.7);
  return { sl, d0, d1, a0, m0, m1, h0, h1, end: h1 + S(p.holdSeconds) };
};
export const donutDuration = (p: DonutProps) => times(p).end;

const CX = 640;
const CY = 590;
const R1 = 360;
const LEG_X = 1180;

export const DonutChart: React.FC<{ f: number } & DonutProps> = ({ f, ...p }) => {
  const fonts = useFonts();
  const tk = tokens(p.mode, p.palette);
  const n = p.data.length;
  const T = times(p);
  const vals = p.data.map((d) => d.value);
  const total = vals.reduce((a, b) => a + b, 0);
  const colors = p.data.map((d, i) => d.color ?? tk.series[i % tk.series.length]);
  const lead = p.leader >= 0 ? Math.min(p.leader, n - 1) : vals.indexOf(Math.max(...vals));
  const r0 = R1 * p.innerRatio;
  const pad = (p.padDegrees * Math.PI) / 180;

  // slice angles
  const starts: number[] = [];
  const spans = vals.map((v) => (v / total) * Math.PI * 2);
  spans.reduce((a, s, i) => ((starts[i] = a), a + s), 0);
  const sliceStart = (i: number) => T.d0 + i * (T.sl + GAP);
  const prog = (ff: number, i: number) => seg(ff, sliceStart(i), sliceStart(i) + T.sl, easeRide);

  // ---- the camera
  const headAt = (ff: number): [number, number] => {
    let i = 0;
    while (i < n - 1 && ff >= sliceStart(i + 1)) i++;
    const ang = starts[i] + spans[i] * prog(ff, i);
    return polar(CX, CY, (R1 + r0) / 2, ang);
  };
  const wide: [number, number, number] = [935, 525, p.camera.wideZoom];
  const camAt = (ff: number): [number, number, number] => {
    const [hx, hy] = headAt(ff);
    const tgt: [number, number, number] = [lerp(CX, hx, p.camera.orbit), lerp(CY, hy, p.camera.orbit), p.camera.tightZoom];
    const a = seg(ff, T.a0, T.m0, (t) => t * t * (3 - 2 * t));
    tgt[2] *= 1 + 0.05 * a;
    const w = moveCurve(seg(ff, T.m0, T.m1, (t) => t), 0, 0.055);
    const pose: [number, number, number] = [lerp(tgt[0], wide[0], w), lerp(tgt[1], wide[1], w), Math.exp(lerp(Math.log(tgt[2]), Math.log(wide[2]), w))];
    const lean = seg(ff, T.h0, T.h1 + S(0.4), easeOut);
    const [lx, ly] = polar(CX, CY, R1 * 0.5, starts[lead] + spans[lead] / 2);
    return [lerp(pose[0], lerp(wide[0], lx, 0.12), lean), lerp(pose[1], lerp(wide[1], ly, 0.12), lean), pose[2] * (1 + 0.04 * lean)];
  };
  const cam = camAt(f);
  const shutter = shutterFor(camAt(Math.max(0, f - 1)), cam) * p.camera.motionBlur;
  const sharp = seg(f, T.m0 + S(0.2), T.m1 - S(0.3), easeOut);

  // ---- hover on the leader
  const hov = backOut(seg(f, T.h0, T.h1, easeOut), 1.4);
  const hovS = seg(f, T.h0, T.h1, easeOut);
  const reveal = seg(f, 0, S(0.4), easeOut);
  const totalNow = vals.reduce((a, v, i) => a + v * prog(f, i), 0);
  const centerIsLead = hovS > 0.45;

  return (
    <Layer id="donut-root">
      <Backdrop tk={tk} W={W} H={H} />
      <Cam id="donut-cam" x={cam[0]} y={cam[1]} zoom={cam[2]} blur={shutter}>
        <Heading id="donut-head" x={170} y={96} title={p.title} sub={p.subtitle} tk={tk} fonts={fonts} opacity={seg(f, T.m0 + S(0.3), T.m1 - S(0.2), easeOut)} />

        {/* slices */}
        {p.data.map((d, i) => {
          const pr = prog(f, i);
          if (pr <= 0.001) return null;
          const isLead = i === lead;
          const mid = starts[i] + spans[i] / 2;
          const off = isLead ? 20 * hov : 0;
          const [ox, oy] = [Math.sin(mid) * off, -Math.cos(mid) * off];
          const a0 = starts[i] + pad / 2;
          const a1 = starts[i] + pad / 2 + Math.max(0.0006, (spans[i] - pad) * pr);
          const dim = isLead ? 1 : 1 - 0.6 * hovS;
          return (
            <Path key={i} id={`donut-slice-${i}`} d={arcPath(CX, CY, r0, R1, a0, a1, p.cornerRadius)} x={ox} y={oy} fill={colors[i]} opacity={dim} />
          );
        })}

        {/* the middle: the total counting up, then the leading slice */}
        <Soft id="donut-mid" r={soft(1 - sharp, p.camera.rackFocus)} opacity={reveal}>
          <Text id="donut-total" x={CX - 260} y={CY - 70} maxWidth={520} align="center" font={fonts.sans} weight={600} size={92} color={tk.fg}
            opacity={centerIsLead ? 0 : 1}>{fmt(totalNow, p.format)}</Text>
          <Text id="donut-total-l" x={CX - 260} y={CY + 36} maxWidth={520} align="center" font={fonts.sans} size={30} color={tk.mutedFg}
            opacity={centerIsLead ? 0 : 1}>{p.centerLabel}</Text>
          <Text id="donut-lead-v" x={CX - 260} y={CY - 70} maxWidth={520} align="center" font={fonts.sans} weight={600} size={92} color={tk.fg}
            opacity={centerIsLead ? 1 : 0}>{fmt(vals[lead], p.format)}</Text>
          <Text id="donut-lead-l" x={CX - 260} y={CY + 36} maxWidth={520} align="center" font={fonts.sans} size={30} color={tk.mutedFg}
            opacity={centerIsLead ? 1 : 0}>{p.data[lead].label}</Text>
        </Soft>

        {/* legend: dot, label, value, progress bar */}
        <Layer id="donut-legend" x={LEG_X} y={CY - (n * 112) / 2 + 8}>
          {p.data.map((d, i) => {
            const k = seg(f, sliceStart(i) + T.sl * 0.6, sliceStart(i) + T.sl * 0.6 + S(0.5), easeOut);
            const barW = 480;
            const share = vals[i] / Math.max(...vals);
            const dimmed = i === lead ? 1 : 1 - 0.6 * hovS;
            return (
              <Layer id={`donut-row-${i}`} key={i} y={i * 112 + (1 - k) * 16} opacity={k * dimmed}>
                <Ellipse id={`donut-dot-${i}`} x={0} y={14} width={8 * PX} height={8 * PX} fill={colors[i]} />
                <Text id={`donut-name-${i}`} x={36} y={4} font={fonts.sans} size={28} color={tk.fg}>{d.label}</Text>
                <Text id={`donut-val-${i}`} x={barW - 260} y={4} maxWidth={260} align="right" font={fonts.sans} weight={500} size={28} color={tk.fg}>{group(vals[i])}</Text>
                <Rect id={`donut-track-${i}`} y={56} width={barW} height={12} radius={6} fill={tk.track} />
                <Rect id={`donut-bar-${i}`} y={56} width={Math.max(0.01, barW * share * seg(f, sliceStart(i) + T.sl * 0.6, sliceStart(i) + T.sl * 0.6 + S(0.8), easeOut))} height={12} radius={6} fill={colors[i]} />
              </Layer>
            );
          })}
        </Layer>
      </Cam>
    </Layer>
  );
};

void hexA;
