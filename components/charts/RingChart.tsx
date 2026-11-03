// Ring chart, after Bklit UI's Ring Chart (MIT): concentric rounded rings on a --border track, each filling clockwise
// from 12 o'clock to value/max, ring names in mono type left of the start line, a total in the middle, and a legend
// with progress bars. Bklit's enter: tracks scale out of the centre 0.08 s apart, progress arcs follow 0.6 s later.
//
// Shot: the camera starts tight on the start line where the names stack, then rides each ring's head as it fills,
// innermost first. Between rings it dollies out to the next start line (a quick move with motion blur, after a small
// push-in as anticipation) and the ring names that are not the current one stay soft. When the last ring closes the
// camera pulls out to the whole chart, overshoots a hair, settles, the middle reads the average and the legend lands.
//
// Principles: staging (one ring a beat), anticipation (push-in before each dolly), arcs (the head's orbit),
// slow in and slow out, follow-through (legend and totals after the camera), focus that lands on the current ring.

import React from 'react';
import { z } from 'zod';
import { Ellipse, Layer, Path, Rect, Text } from '@kinetographdev/core';
import { Cam, H, W, clamp01, easeOut, fmt, fmtSchema, lerp, seg, useFonts, type NumFmt } from './lib.js';
import { PX, arcPath, bkModeSchema, bkPaletteSchema, easeRide, moveCurve, polar, shutterFor, soft, tokens } from './bklit.js';
import { Backdrop, Heading, Soft } from './bklitParts.js';

export const RING_FPS = 60;

export const ringSchema = z.object({
  data: z.array(z.object({
    label: z.string().describe('Ring name.'),
    value: z.number().min(0).describe('Value; the ring fills to value / max.'),
    max: z.number().min(1).describe('Value at a full ring.'),
  })).min(2).max(5).describe('The rings, innermost first.'),
  title: z.string().describe('Heading.'),
  subtitle: z.string().describe('Muted line under the heading.'),
  centerLabel: z.string().describe('Label under the average in the middle.'),
  mode: bkModeSchema,
  palette: bkPaletteSchema,
  format: fmtSchema,
  strokeWidth: z.number().min(20).max(90).describe('Thickness of each ring in pixels.'),
  ringGap: z.number().min(0).max(40).describe('Gap between rings in pixels.'),
  ringSeconds: z.number().min(0.4).max(3).describe('Time a ring takes to fill from empty to full (shorter for shorter rings).'),
  holdSeconds: z.number().min(0).max(8).describe('How long the last frame holds.'),
  camera: z.object({
    tightZoom: z.number().min(1.2).max(3.5).describe('Zoom while riding a ring.'),
    wideZoom: z.number().min(0.7).max(1.3).describe('Zoom of the whole chart.'),
    orbit: z.number().min(0).max(1).describe('How far the camera follows the head around the ring (1 rides on it).'),
    motionBlur: z.number().min(0).max(1.5).describe('Strength of the motion blur on the fast moves; 0 turns it off.'),
    rackFocus: z.number().min(0).max(12).describe('Blur in pixels on ring names other than the current ring.'),
  }).describe('Camera.'),
});
export type RingProps = z.infer<typeof ringSchema>;

const pct: NumFmt = { prefix: '', suffix: '%', decimals: 0, group: ',' };

export const ringDefaults: RingProps = {
  data: [
    { label: 'Other', value: 38, max: 100 },
    { label: 'Direct', value: 56, max: 100 },
    { label: 'Social', value: 71, max: 100 },
    { label: 'Email', value: 88, max: 100 },
  ],
  title: 'Goal completion',
  subtitle: 'Share of target reached, by channel',
  centerLabel: 'Average',
  mode: 'light',
  palette: 'primary',
  format: pct,
  strokeWidth: 58,
  ringGap: 14,
  ringSeconds: 1.5,
  holdSeconds: 1.6,
  camera: { tightZoom: 2, wideZoom: 1.02, orbit: 0.7, motionBlur: 1, rackFocus: 4 },
};

const S = (s: number) => Math.round(s * RING_FPS);
const BASE_INNER = 150;
const CX = 1260;
const CY = 580;
const TAU = Math.PI * 2;

const times = (p: RingProps) => {
  const n = p.data.length;
  const fr = p.data.map((d) => clamp01(d.value / d.max));
  const dur = fr.map((x) => S(0.45) + Math.round(S(p.ringSeconds) * x));
  const transit = S(0.5);
  const start: number[] = [];
  let t = S(0.45);
  for (let i = 0; i < n; i++) {
    start[i] = t;
    t += dur[i] + S(0.12) + (i < n - 1 ? transit - S(0.12) : 0);
  }
  const d1 = start[n - 1] + dur[n - 1];
  const a0 = d1 + S(0.15);
  const m0 = a0 + S(0.3);
  const m1 = m0 + S(1.6);
  const h0 = m1 + S(0.1);
  return { fr, dur, transit, start, d1, a0, m0, m1, h0, end: h0 + S(0.9) + S(p.holdSeconds) };
};
export const ringDuration = (p: RingProps) => times(p).end;

export const RingChart: React.FC<{ f: number } & RingProps> = ({ f, ...p }) => {
  const fonts = useFonts();
  const tk = tokens(p.mode, p.palette);
  const n = p.data.length;
  const T = times(p);
  const colors = p.data.map((_, i) => tk.series[i % tk.series.length]);
  const rIn = (i: number) => BASE_INNER + i * (p.strokeWidth + p.ringGap);
  const rOut = (i: number) => rIn(i) + p.strokeWidth;
  const rMid = (i: number) => (rIn(i) + rOut(i)) / 2;
  const prog = (ff: number, i: number) => seg(ff, T.start[i], T.start[i] + T.dur[i], easeRide);
  const frac = (ff: number, i: number) => T.fr[i] * prog(ff, i);

  // ---- the camera
  const ride = (i: number, a: number): [number, number] => {
    const [x, y] = polar(CX, CY, rMid(i), a);
    return [lerp(CX, x, p.camera.orbit) + (a === 0 ? -120 : 0), lerp(CY, y, p.camera.orbit)];
  };
  const wide: [number, number, number] = [925, 546, p.camera.wideZoom];
  const camAt = (ff: number): [number, number, number] => {
    // which ring's turn: the last one that has started riding
    let i = 0;
    while (i < n - 1 && ff >= T.start[i + 1] - S(0.1)) i++;
    const endT = T.start[i] + T.dur[i];
    let pos: [number, number];
    let z = p.camera.tightZoom;
    if (i < n - 1 && ff > endT + S(0.02) - 1 && ff >= endT) {
      // dolly from the end of ring i to the start line of ring i + 1
      const from = ride(i, T.fr[i] * TAU);
      const to = ride(i + 1, 0);
      const t0 = endT + S(0.02);
      const t1 = T.start[i + 1] - S(0.1);
      const w = moveCurve(seg(ff, t0, t1, (t) => t), 0.05, 0.05);
      pos = [lerp(from[0], to[0], w), lerp(from[1], to[1], w)];
      z *= 1 + 0.06 * Math.sin(Math.PI * clamp01(seg(ff, t0 - S(0.12), t1, (t) => t)));
    } else {
      pos = ride(i, i === 0 && ff < T.start[0] ? 0 : T.fr[i] * TAU * prog(ff, i));
    }
    const a = seg(ff, T.a0, T.m0, (t) => t * t * (3 - 2 * t));
    z *= 1 + 0.05 * a;
    const w = moveCurve(seg(ff, T.m0, T.m1, (t) => t), 0, 0.055);
    return [lerp(pos[0], wide[0], w), lerp(pos[1], wide[1], w), Math.exp(lerp(Math.log(z), Math.log(wide[2]), w))];
  };
  const cam = camAt(f);
  const shutter = shutterFor(camAt(Math.max(0, f - 1)), cam) * p.camera.motionBlur;
  const sharp = seg(f, T.m0 + S(0.2), T.m1 - S(0.3), easeOut);

  // current ring, for the middle readout and focus
  let cur = 0;
  while (cur < n - 1 && f >= T.start[cur + 1]) cur++;
  const done = f >= T.d1;
  const readout = seg(f, T.d1, T.d1 + S(0.25), easeOut);
  const avg = p.data.reduce((a, d, i) => a + (d.value / d.max) * 100 * prog(f, i), 0) / n;
  const curVal = (p.data[cur].value / p.data[cur].max) * 100 * prog(f, cur);
  const showCur = !done && f >= T.start[0];
  const reveal = seg(f, 0, S(0.4), easeOut);
  const legendK = seg(f, T.m0 + S(0.5), T.m1, easeOut);

  return (
    <Layer id="ring-root">
      <Backdrop tk={tk} W={W} H={H} />
      <Cam id="ring-cam" x={cam[0]} y={cam[1]} zoom={cam[2]} blur={shutter}>
        <Heading id="ring-head" x={170} y={96} title={p.title} sub={p.subtitle} tk={tk} fonts={fonts} opacity={seg(f, T.m0 + S(0.3), T.m1 - S(0.2), easeOut)} />

        {/* tracks, scaling out of the centre one after another */}
        {p.data.map((d, i) => {
          const k = easeOut(seg(f, S(i * 0.08), S(i * 0.08 + 0.55), (t) => t));
          if (k <= 0.001) return null;
          return <Path key={i} id={`ring-track-${i}`} d={arcPath(CX, CY, rIn(i) * k, rOut(i) * k, 0, TAU)} fill={tk.border} />;
        })}

        {/* progress arcs */}
        {p.data.map((d, i) => {
          const fr = frac(f, i);
          if (fr <= 0.0004) return null;
          const k = easeOut(seg(f, S(i * 0.08), S(i * 0.08 + 0.55), (t) => t));
          return (
            <Path key={i} id={`ring-arc-${i}`} d={arcPath(CX, CY, rIn(i) * k, rOut(i) * k, 0, Math.max(0.001, fr * TAU), (p.strokeWidth / 2) * k)} fill={colors[i]} />
          );
        })}

        {/* names, stacked left of the start line */}
        {p.data.map((d, i) => {
          const depth = i === cur && !done ? 0 : 1 - sharp;
          const k = seg(f, S(0.3 + i * 0.08), S(0.7 + i * 0.08), easeOut);
          return (
            <Soft key={i} id={`ring-name-soft-${i}`} r={soft(depth * (f < T.m0 ? 1 : 1), p.camera.rackFocus)} opacity={k}>
              <Text id={`ring-name-${i}`} x={CX - 20 - 300} y={CY - rMid(i) - 15} maxWidth={300} align="right" font={fonts.mono} size={26} color={i === cur && !done ? tk.fg : tk.label}>
                {d.label}
              </Text>
            </Soft>
          );
        })}

        {/* the middle: the ring being filled, then the average */}
        <Soft id="ring-mid" r={soft(1 - sharp, p.camera.rackFocus * 0.6)} opacity={reveal}>
          <Text id="ring-mid-v" x={CX - 140} y={CY - 52} maxWidth={280} align="center" font={fonts.sans} weight={600} size={72} color={tk.fg}>
            {fmt(showCur ? curVal : avg * readout, p.format)}
          </Text>
          <Text id="ring-mid-l" x={CX - 140} y={CY + 34} maxWidth={280} align="center" font={fonts.sans} size={26} color={tk.mutedFg}>
            {showCur ? p.data[cur].label : p.centerLabel}
          </Text>
        </Soft>

        {/* legend with progress bars */}
        <Layer id="ring-legend" x={170} y={CY - (n * 110) / 2 + 30}>
          {p.data.map((d, i) => {
            const k = clamp01(legendK * 1.6 - (n - 1 - i) * 0.18);
            const w = 460;
            return (
              <Layer id={`ring-leg-${i}`} key={i} y={(n - 1 - i) * 110 + (1 - k) * 14} opacity={k}>
                <Ellipse id={`ring-leg-dot-${i}`} x={0} y={14} width={16} height={16} fill={colors[i]} />
                <Text id={`ring-leg-name-${i}`} x={36} y={4} font={fonts.sans} size={28} color={tk.fg}>{d.label}</Text>
                <Text id={`ring-leg-val-${i}`} x={w - 200} y={4} maxWidth={200} align="right" font={fonts.sans} weight={500} size={28} color={tk.fg}>{fmt((d.value / d.max) * 100, p.format)}</Text>
                <Rect id={`ring-leg-track-${i}`} y={56} width={w} height={12} radius={6} fill={tk.track} />
                <Rect id={`ring-leg-bar-${i}`} y={56} width={Math.max(0.01, w * T.fr[i] * k)} height={12} radius={6} fill={colors[i]} />
              </Layer>
            );
          })}
        </Layer>
      </Cam>
    </Layer>
  );
};
