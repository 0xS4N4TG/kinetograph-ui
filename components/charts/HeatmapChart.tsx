// Heatmap chart, after Bklit UI's Heatmap Chart (MIT): a contribution grid, weeks across and days down, small
// rounded cells in Bklit's five-step sequential scale (--chart-scale-01 neutral up to --chart-1), month labels above,
// weekday labels left, a Less / More legend below, and a tooltip on hover. Bklit's enter fades every cell in at a
// seeded random moment across the duration.
//
// Shot: the camera starts tight on the first weeks and sweeps along the grid. The cells exist as neutral squares
// and a wave of light runs through them just ahead of the camera, each cell popping to its level with a little
// overshoot at a seeded random moment inside the wave. After the last week it pushes in a touch (anticipation),
// pulls out to the whole grid with motion blur and overshoot, the legend and heading arrive, and the camera leans onto
// the busiest day, which lifts while the rest dim and a tooltip opens.
//
// Principles: staging (the wave leads the eye), slow in and slow out (the sweep eases in and out), anticipation and
// overshoot on the pull out, overlap (cells pop at staggered moments), follow-through (legend, tooltip after the
// camera), straight-ahead randomness (seeded jitter) on top of the keyed sweep.

import React from 'react';
import { z } from 'zod';
import { Ellipse, Layer, Rect, Text } from '@kinetographdev/core';
import { Cam, H, W, clamp01, easeOut, lerp, seg, useFonts } from './lib.js';
import { PX, backOut, bkModeSchema, bkPaletteSchema, easeRide, mix, moveCurve, shutterFor, soft, tokens } from './bklit.js';
import { Backdrop, BkTooltip, Heading, Soft, tipWidth } from './bklitParts.js';

export const HEATMAP_FPS = 60;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// seeded generator for the default data: weekday-heavy, in streaks
function makeData(weeks: number): number[][] {
  let s = 20260104;
  const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const out: number[][] = [];
  let heat = 0.4;
  for (let w = 0; w < weeks; w++) {
    heat = clamp01(heat + (rnd() - 0.5) * 0.5);
    const col: number[] = [];
    for (let d = 0; d < 7; d++) {
      const weekend = d === 0 || d === 6 ? 0.35 : 1;
      const v = rnd() < 0.18 ? 0 : Math.round(rnd() * 7.4 * heat * weekend + (rnd() < 0.08 ? 3 : 0));
      col.push(v);
    }
    out.push(col);
  }
  return out;
}

export const heatmapSchema = z.object({
  data: z.array(z.array(z.number().min(0)).length(7)).min(8).max(60).describe('Counts: one array of seven days (Sunday first) per week, oldest week first.'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Date of the first cell, YYYY-MM-DD (a Sunday).'),
  title: z.string().describe('Heading.'),
  unit: z.string().describe('What a count counts, for the tooltip and the subtitle.'),
  mode: bkModeSchema,
  palette: bkPaletteSchema,
  sweepSeconds: z.number().min(1).max(12).describe('How long the camera takes along the weeks.'),
  holdSeconds: z.number().min(0).max(8).describe('How long the last frame holds on the tooltip.'),
  camera: z.object({
    tightZoom: z.number().min(1.2).max(4).describe('Zoom during the sweep.'),
    wideZoom: z.number().min(0.7).max(1.3).describe('Zoom of the whole grid.'),
    lag: z.number().min(0).max(1.5).describe('Seconds the camera trails the wave of light.'),
    motionBlur: z.number().min(0).max(1.5).describe('Strength of the motion blur on the fast moves; 0 turns it off.'),
    rackFocus: z.number().min(0).max(12).describe('Blur in pixels on the axis labels while the shot is tight.'),
  }).describe('Camera.'),
});
export type HeatmapProps = z.infer<typeof heatmapSchema>;

export const heatmapDefaults: HeatmapProps = {
  data: makeData(24),
  startDate: '2026-01-04',
  title: 'Contributions',
  unit: 'contributions',
  mode: 'light',
  palette: 'primary',
  sweepSeconds: 4.4,
  holdSeconds: 1.6,
  camera: { tightZoom: 2.4, wideZoom: 1, lag: 0.3, motionBlur: 1, rackFocus: 4 },
};

const S = (s: number) => Math.round(s * HEATMAP_FPS);
const times = (p: HeatmapProps) => {
  const s0 = S(0.5);
  const s1 = s0 + S(p.sweepSeconds);
  const a0 = s1 + S(0.35);
  const m0 = a0 + S(0.3);
  const m1 = m0 + S(1.7);
  const h0 = m1 + S(0.15);
  const h1 = h0 + S(0.9);
  return { s0, s1, a0, m0, m1, h0, h1, end: h1 + S(p.holdSeconds) };
};
export const heatmapDuration = (p: HeatmapProps) => times(p).end;

const GX0 = 250;
const GX1 = 1770;
const GY0 = 380;

const level = (c: number) => (c <= 0 ? 0 : c >= 4 ? 4 : c);
const hash = (a: number, b: number) => {
  let h = (a * 1009 + b * 9176) % 2147483647;
  h = (h * 16807) % 2147483647;
  h = (h * 16807) % 2147483647;
  return (h - 1) / 2147483646;
};

export const HeatmapChart: React.FC<{ f: number } & HeatmapProps> = ({ f, ...p }) => {
  const fonts = useFonts();
  const tk = tokens(p.mode, p.palette);
  const T = times(p);
  const cols = p.data.length;
  const pitch = (GX1 - GX0) / cols;
  const gap = 2 * PX;
  const cell = pitch - gap;
  const gridH = 7 * pitch;
  const cx = (c: number) => GX0 + c * pitch + cell / 2;
  const cy = (r: number) => GY0 + r * pitch + cell / 2;
  const start = new Date(p.startDate + 'T00:00:00Z');
  const dateOf = (c: number, r: number) => new Date(start.getTime() + (c * 7 + r) * 86400000);
  const total = p.data.reduce((a, c) => a + c.reduce((x, y) => x + y, 0), 0);

  // busiest day
  let bc = 0;
  let br = 0;
  p.data.forEach((col, c) => col.forEach((v, r) => { if (v >= p.data[bc][br]) { bc = c; br = r; } }));
  const best = p.data[bc][br];

  // ---- the sweep and the wave
  const sweepAt = (ff: number, lag = 0) => easeRide(seg(ff, T.s0 + lag, T.s1 + lag, (t) => t));
  const wave = sweepAt(f) * 1.12; // the wave runs a little past the end so the last weeks light fully

  // ---- camera
  const wide: [number, number, number] = [W / 2, 545, p.camera.wideZoom];
  const camAt = (ff: number): [number, number, number] => {
    const k = easeRide(seg(ff, T.s0 + S(p.camera.lag), T.s1 + S(p.camera.lag), (t) => t));
    const z0 = p.camera.tightZoom * (1 - 0.1 * k);
    const half = W / 2 / z0;
    const x = lerp(GX0 + half * 0.78, GX1 - half * 0.78, k);
    const y = GY0 + gridH / 2 + 8 * Math.sin(k * Math.PI * 2);
    const a = seg(ff, T.a0, T.m0, (t) => t * t * (3 - 2 * t));
    const z = z0 * (1 + 0.05 * a);
    const w = moveCurve(seg(ff, T.m0, T.m1, (t) => t), 0, 0.055);
    const lean = seg(ff, T.h0, T.h1 + S(0.4), easeOut);
    const pose: [number, number, number] = [lerp(x, wide[0], w), lerp(y, wide[1], w), Math.exp(lerp(Math.log(z), Math.log(wide[2]), w))];
    return [lerp(pose[0], lerp(wide[0], cx(bc), 0.07), lean), lerp(pose[1], lerp(wide[1], cy(br), 0.1), lean), pose[2] * (1 + 0.07 * lean)];
  };
  const cam = camAt(f);
  const shutter = shutterFor(camAt(Math.max(0, f - 1)), cam) * p.camera.motionBlur;
  const sharp = seg(f, T.m0 + S(0.2), T.m1 - S(0.3), easeOut);

  const fadeIn = (c: number) => seg(f, S(c * 0.012), S(c * 0.012 + 0.4), easeOut);
  const hov = seg(f, T.h0, T.h0 + S(0.5), easeOut);

  // tooltip content
  const tipDate = dateOf(bc, br);
  const tipTitle = `${DAYS[tipDate.getUTCDay()]}, ${MONTHS[tipDate.getUTCMonth()]} ${tipDate.getUTCDate()}`;
  const rows = [{ color: tk.series[0], label: p.unit, value: String(best) }];
  const tw = tipWidth(tipTitle, rows);
  const tipH = (40 + 24 + 20) * PX;
  const tipK = backOut(seg(f, T.h0 + S(0.15), T.h0 + S(0.6), easeOut));
  const headK = seg(f, T.m0 + S(0.3), T.m1 - S(0.2), easeOut);

  return (
    <Layer id="heat-root">
      <Backdrop tk={tk} W={W} H={H} />
      <Cam id="heat-cam" x={cam[0]} y={cam[1]} zoom={cam[2]} blur={shutter}>
        <Layer id="heat-head" x={GX0} y={196} opacity={headK}>
          <Text id="heat-title" font={fonts.sans} weight={500} size={40} color={tk.fg}>{p.title}</Text>
          <Text id="heat-sub" y={62} font={fonts.sans} size={25} color={tk.mutedFg}>{`${total.toLocaleString('en-US')} ${p.unit} in the last ${cols} weeks`}</Text>
        </Layer>

        {/* axis labels: months above, weekdays left */}
        <Soft id="heat-axes" r={soft(1 - sharp, p.camera.rackFocus)} opacity={seg(f, 0, S(0.5), easeOut)}>
          {p.data.map((_, c) => {
            const d = dateOf(c, 0);
            const prevMonth = c === 0 ? -1 : dateOf(c - 1, 0).getUTCMonth();
            if (d.getUTCMonth() === prevMonth) return null;
            if (c > cols - 3 && c !== 0) return null;
            return <Text key={c} id={`heat-m-${c}`} x={GX0 + c * pitch} y={GY0 - 52} font={fonts.sans} size={12 * PX} color={tk.label}>{MONTHS[d.getUTCMonth()]}</Text>;
          })}
          {[1, 3, 5].map((r) => (
            <Text key={r} id={`heat-d-${r}`} x={GX0 - 20 - 100} y={cy(r) - 15} maxWidth={100} align="right" font={fonts.sans} size={12 * PX} color={tk.label}>{DAYS[r]}</Text>
          ))}
        </Soft>

        {/* cells */}
        {p.data.map((col, c) =>
          col.map((v, r) => {
            const fi = fadeIn(c);
            if (fi <= 0.001) return null;
            const lv = level(v);
            const u = c / (cols - 1) + (hash(c, r) - 0.5) * 0.07;
            const lit = lv === 0 ? 0 : clamp01((wave - u) / 0.07);
            const pop = backOut(lit, 2.6);
            const isBest = c === bc && r === br;
            const dim = hov > 0 && !isBest ? 1 - 0.45 * hov : 1;
            const s = (0.55 + 0.45 * fi) * (lv === 0 ? 1 : 0.9 + 0.1 * pop) * (isBest ? 1 + 0.18 * hov : 1);
            const color = mix(tk.scale[0], tk.scale[lv], clamp01(lit * 1.4));
            const size = cell * s;
            return (
              <Rect key={`${c}-${r}`} id={`heat-c-${c}-${r}`} x={cx(c) - size / 2} y={cy(r) - size / 2} width={size} height={size} radius={2 * PX} fill={color} opacity={fi * dim} />
            );
          }),
        )}

        {/* highlight ring on the busiest day */}
        {hov > 0 ? (
          <Ellipse id="heat-ring" x={cx(bc) - cell * 0.72} y={cy(br) - cell * 0.72} width={cell * 1.44} height={cell * 1.44} stroke={{ color: tk.series[0], width: 3 }} opacity={hov * 0.7} />
        ) : null}

        {/* legend: Less [] [] [] [] [] More */}
        <Layer id="heat-legend" x={GX1 - 520} y={GY0 + gridH + 44} opacity={headK}>
          <Text id="heat-less" y={4} font={fonts.sans} size={12 * PX} color={tk.label}>Less</Text>
          {tk.scale.map((c, i) => <Rect key={i} id={`heat-sw-${i}`} x={96 + i * 46} y={2} width={34} height={34} radius={2 * PX} fill={c} />)}
          <Text id="heat-more" x={96 + 5 * 46 + 12} y={4} font={fonts.sans} size={12 * PX} color={tk.label}>More</Text>
        </Layer>

        {/* tooltip */}
        {tipK > 0 ? (
          <BkTooltip id="heat-tt" x={Math.min(cx(bc) - tw / 2, GX1 + 20 - tw)} y={cy(br) + cell / 2 + 26} title={tipTitle} rows={rows} tk={tk} fonts={fonts} width={tw}
            opacity={clamp01(tipK * 1.6)} scale={0.9 + 0.1 * tipK} pivot={[Math.min(tw / 2, tw - 20 + (cx(bc) - GX1)), 0]} />
        ) : null}
      </Cam>
    </Layer>
  );
};
