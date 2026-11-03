// Area chart, after Bklit UI's Area Chart (MIT): a gradient area under a monotone line, dashed grid rows that fade at
// the sides, month labels, point markers, and the hover tooltip (crosshair, dot with halo, date pill, popover panel).
//
// Shot: the camera starts tight and rides the tip of the line as it draws, a little ahead of it. When the line has
// landed it holds a beat, pulls back a hair (anticipation), then pulls out to the whole chart with motion blur and a
// small overshoot while the soft-focus grid snaps sharp. The header arrives with the pull. Then the tooltip opens at
// the last point and glides to the highlighted one while the camera leans in a few percent and settles.
//
// Principles: staging (one subject a beat: the tip, then the chart, then the point), anticipation (the pull-back
// before the pull-out), slow in and slow out, overshoot and settle, follow-through (the header and tooltip arrive
// after the camera), arcs (the camera y follows a smoothed line), timing (long ride, short pull, long hold).

import React from 'react';
import { z } from 'zod';
import { Ellipse, Layer, Path, Rect, Text } from '@kinetographdev/core';
import { Cam, H, W, clamp01, curvePath, drift, easeOut, fmt, fmtSchema, hexA, lerp, monotone, niceScale, seg, stroke, useFonts, type NumFmt } from './lib.js';
import { PX, avg, backOut, bkModeSchema, bkPaletteSchema, easeRide, moveCurve, shutterFor, soft, tokens } from './bklit.js';
import { Backdrop, BkTooltip, Heading, Pill, Soft, tipWidth } from './bklitParts.js';

export const AREA_FPS = 60;

export const areaSchema = z.object({
  data: z.array(z.object({ label: z.string().describe('X axis label.'), value: z.number().describe('The value.') }))
    .min(3).max(24).describe('The series, left to right.'),
  title: z.string().describe('Heading.'),
  subtitle: z.string().describe('Muted line under the heading.'),
  seriesName: z.string().describe('Name shown in the tooltip row.'),
  highlight: z.number().int().min(0).describe('Index of the point the tooltip ends on.'),
  mode: bkModeSchema,
  palette: bkPaletteSchema,
  color: z.number().int().min(0).max(4).describe('Which palette colour (--chart-1 to --chart-5, as 0 to 4) draws the series.'),
  format: fmtSchema,
  drawSeconds: z.number().min(0.5).max(10).describe('How long the line takes to draw.'),
  holdSeconds: z.number().min(0).max(8).describe('How long the last frame holds on the tooltip.'),
  markers: z.boolean().describe('A dot at every data point as the line passes it.'),
  camera: z.object({
    tightZoom: z.number().min(1.2).max(4).describe('Zoom while riding the line tip.'),
    wideZoom: z.number().min(0.7).max(1.3).describe('Zoom of the whole chart.'),
    lead: z.number().min(0).max(500).describe('Screen pixels the camera leads the tip by.'),
    motionBlur: z.number().min(0).max(1.5).describe('Strength of the motion blur on the fast moves; 0 turns it off.'),
    rackFocus: z.number().min(0).max(12).describe('Blur in pixels on the grid and labels while the shot is tight; they snap sharp on the pull out.'),
    drift: z.number().min(0).max(12).describe('Handheld drift in pixels on the holds.'),
  }).describe('Camera.'),
});
export type AreaProps = z.infer<typeof areaSchema>;

const fmt0: NumFmt = { prefix: '', suffix: '', decimals: 0, group: ',' };

export const areaDefaults: AreaProps = {
  data: [
    { label: 'Jan', value: 12400 }, { label: 'Feb', value: 13900 }, { label: 'Mar', value: 13100 }, { label: 'Apr', value: 16800 },
    { label: 'May', value: 18200 }, { label: 'Jun', value: 17500 }, { label: 'Jul', value: 21300 }, { label: 'Aug', value: 24600 },
    { label: 'Sep', value: 23800 }, { label: 'Oct', value: 29400 }, { label: 'Nov', value: 31900 }, { label: 'Dec', value: 35200 },
  ],
  title: 'Weekly active sessions',
  subtitle: 'Sessions per month, this year',
  seriesName: 'Sessions',
  highlight: 9,
  mode: 'light',
  palette: 'primary',
  color: 0,
  format: fmt0,
  drawSeconds: 3.6,
  holdSeconds: 1.6,
  markers: true,
  camera: { tightZoom: 2.5, wideZoom: 0.99, lead: 330, motionBlur: 1, rackFocus: 4, drift: 3 },
};

const S = (s: number) => Math.round(s * AREA_FPS);
const times = (p: AreaProps) => {
  const d0 = S(0.35);
  const d1 = d0 + S(p.drawSeconds);
  const a0 = d1 + S(0.25); // anticipation starts
  const m0 = a0 + S(0.3); // pull out
  const m1 = m0 + S(1.7);
  const t0 = m1 + S(0.1); // tooltip opens
  const g0 = t0 + S(0.55); // glide to the highlight
  const g1 = g0 + S(0.9);
  return { d0, d1, a0, m0, m1, t0, g0, g1, end: g1 + S(p.holdSeconds) };
};
export const areaDuration = (p: AreaProps) => times(p).end;

// layout in world pixels
const PX0 = 170;
const PX1 = 1750;
const PTOP = 300;
const PBASE = 880;

export const AreaChart: React.FC<{ f: number } & AreaProps> = ({ f, ...p }) => {
  const fonts = useFonts();
  const tk = tokens(p.mode, p.palette);
  const col = tk.series[p.color];
  const n = p.data.length;
  const hl = Math.min(p.highlight, n - 1);
  const T = times(p);

  const vals = p.data.map((d) => d.value);
  const sc = niceScale(0, Math.max(...vals) * 1.02, 4);
  const yOf = (v: number) => PBASE - ((v - sc.min) / (sc.max - sc.min)) * (PBASE - PTOP);
  const xs = p.data.map((_, i) => PX0 + (i * (PX1 - PX0)) / (n - 1));
  const ys = vals.map(yOf);
  const curve = monotone(xs, ys);
  const topY = Math.min(...ys);

  // ---- progress
  const draw = seg(f, T.d0, T.d1, easeRide);
  const headX = lerp(PX0, PX1, draw);
  const headY = curve(headX);
  const reveal = seg(f, 0, S(0.5), easeOut);

  // ---- camera: ride -> anticipate -> pull out -> lean in
  const tight = (ff: number): [number, number, number] => {
    const d = seg(ff, T.d0, T.d1, easeRide);
    const hx = lerp(PX0, PX1, d);
    const z = lerp(p.camera.tightZoom, p.camera.tightZoom * 0.9, d);
    const cy = avg(curve, hx - 60, hx + 260) + 70;
    const lead = p.camera.lead * (1 - 0.85 * seg(d, 0.78, 1, (t) => t * t * (3 - 2 * t)));
    return [hx + lead / z, cy, z];
  };
  const wide: [number, number, number] = [W / 2, 530, p.camera.wideZoom];
  const camAt = (ff: number): [number, number, number] => {
    const a = seg(ff, T.a0, T.m0, (t) => t * t * (3 - 2 * t)); // the pull back, in the direction of the push
    const tg = tight(ff);
    const tgz: [number, number, number] = [tg[0] - 26 * a, tg[1], tg[2] * (1 + 0.05 * a)];
    const w = moveCurve(seg(ff, T.m0, T.m1, (t) => t), 0, 0.055);
    const pose: [number, number, number] = [lerp(tgz[0], wide[0], w), lerp(tgz[1], wide[1], w), Math.exp(lerp(Math.log(tgz[2]), Math.log(wide[2]), w))];
    const lean = seg(ff, T.g0, T.g1 + S(0.4), easeOut);
    const hx = xs[hl];
    const hy = ys[hl];
    return [lerp(pose[0], lerp(wide[0], hx, 0.07), lean), lerp(pose[1], lerp(wide[1], hy, 0.0), lean), pose[2] * (1 + 0.05 * lean)];
  };
  const cam = camAt(f);
  const prev = camAt(Math.max(0, f - 1));
  const holdDrift = f > T.m1 ? 1 : 0.35;
  const dr = drift(f, p.camera.drift * holdDrift, 1.3);
  const shutter = shutterFor(prev, cam) * p.camera.motionBlur;

  // ---- focus: grid and labels are soft while tight, sharp as the pull out lands
  const sharp = seg(f, T.m0 + S(0.2), T.m1 - S(0.35), easeOut);
  const gridBlur = soft(1 - sharp, p.camera.rackFocus);

  // ---- the line
  const line = curvePath(curve, PX0, Math.max(PX0 + 0.01, headX), 4);
  const fillD = line.d + `L${headX.toFixed(2)} ${PBASE}L${PX0} ${PBASE}Z`;

  // ---- the hover
  const tOpen = seg(f, T.t0, T.t0 + S(0.3), easeOut);
  const glide = seg(f, T.g0, T.g1, easeOut);
  const hx = lerp(xs[n - 1], xs[hl], glide);
  const hy = curve(hx);
  const hi = Math.max(0, Math.min(n - 1, Math.round(((hx - PX0) / (PX1 - PX0)) * (n - 1))));
  const pop = backOut(tOpen);
  const tipRows = [{ color: col, label: p.seriesName, value: fmt(vals[hi], p.format) }];
  const tw = tipWidth(p.data[hi].label, tipRows);
  const tipH = (40 + 24 + 20) * PX;
  // above and to the left of the point: there the line runs lower, so the panel never sits on it
  const tipX = hx - tw - 18 * PX;
  const tipY = Math.max(PTOP - 60, hy - tipH - 34);

  return (
    <Layer id="area-root">
      <Backdrop tk={tk} W={W} H={H} />
      <Cam id="area-cam" x={cam[0] + dr.x} y={cam[1] + dr.y} zoom={cam[2]} blur={shutter}>
        <Heading id="area-head" x={PX0} y={96 + (1 - reveal) * 12} title={p.title} sub={p.subtitle} tk={tk} fonts={fonts}
          opacity={seg(f, T.m0 + S(0.3), T.m1 - S(0.2), easeOut)} />

        {/* grid rows (dashed, fading at the sides) and the month labels */}
        <Soft id="area-soft" r={gridBlur} opacity={reveal}>
          {sc.ticks.map((t, i) => (
            <Path key={i} id={`area-gl-${i}`} d={`M${PX0} ${yOf(t)}H${PX1}`} stroke={stroke(tk.grid, 2, { dash: [8, 8] })} />
          ))}
          <Rect id="area-fade-l" x={PX0 - 2} y={PTOP - 10} width={220} height={PBASE - PTOP + 20}
            fill={{ type: 'linear', x0: PX0, y0: 0, x1: PX0 + 220, y1: 0, stops: [{ offset: 0, color: hexA(tk.bg, 1) }, { offset: 1, color: hexA(tk.bg, 0) }] }} />
          <Rect id="area-fade-r" x={PX1 - 218} y={PTOP - 10} width={220} height={PBASE - PTOP + 20}
            fill={{ type: 'linear', x0: PX1 - 220, y0: 0, x1: PX1, y1: 0, stops: [{ offset: 0, color: hexA(tk.bg, 0) }, { offset: 1, color: hexA(tk.bg, 1) }] }} />
          {p.data.map((d, i) => {
            const underPill = tOpen > 0 && Math.abs(xs[i] - hx) < 70 ? 1 - tOpen : 1;
            return (
              <Text key={i} id={`area-xl-${i}`} x={xs[i] - 60} y={PBASE + 30} maxWidth={120} align="center" font={fonts.sans} size={12 * PX} color={tk.label} opacity={underPill}>
                {d.label}
              </Text>
            );
          })}
        </Soft>

        {/* the area and the line */}
        <Path id="area-fill" d={fillD}
          fill={{ type: 'linear', x0: 0, y0: topY, x1: 0, y1: PBASE, stops: [{ offset: 0, color: hexA(col, 0.4) }, { offset: 1, color: hexA(col, 0) }] }} />
        <Path id="area-line" d={line.d} stroke={stroke(col, 2.5 * PX, { cap: 'round', join: 'round' })} />

        {/* markers: pop as the head passes */}
        {p.markers
          ? p.data.map((_, i) => {
              const reach = (xs[i] - PX0) / (PX1 - PX0);
              const k = clamp01((draw - reach) / 0.045);
              if (k <= 0 || i === 0) return null;
              const s = backOut(k, 2.2);
              return <Ellipse key={i} id={`area-m-${i}`} x={xs[i] - 7 * s} y={ys[i] - 7 * s} width={14 * s} height={14 * s} fill={col} stroke={{ color: tk.bg, width: 3 }} />;
            })
          : null}

        {/* the tip: a dot with a soft halo while the line draws */}
        {draw > 0 && draw < 1 ? (
          <Layer id="area-tip">
            <Ellipse id="area-tip-halo" x={headX - 26} y={headY - 26} width={52} height={52} fill={hexA(col, 0.2)} />
            <Ellipse id="area-tip-core" x={headX - 9} y={headY - 9} width={18} height={18} fill={col} stroke={{ color: tk.bg, width: 4 }} />
          </Layer>
        ) : null}

        {/* hover: crosshair, dot with halo, date pill, popover panel */}
        {tOpen > 0 ? (
          <Layer id="area-hover" opacity={clamp01(tOpen * 1.6)}>
            <Rect id="area-cross" x={hx - 1} y={PTOP - 30} width={2} height={PBASE - PTOP + 30} opacity={0.9}
              fill={{ type: 'linear', x0: 0, y0: PTOP - 30, x1: 0, y1: PBASE, stops: [{ offset: 0, color: hexA(tk.crosshair, 0) }, { offset: 0.12, color: hexA(tk.crosshair, 1) }, { offset: 0.9, color: hexA(tk.crosshair, 1) }, { offset: 1, color: hexA(tk.crosshair, 0) }] }} />
            <Ellipse id="area-dot-halo" x={hx - 26 * pop} y={hy - 26 * pop} width={52 * pop} height={52 * pop} fill={hexA(col, 0.3)} />
            <Ellipse id="area-dot" x={hx - 10} y={hy - 10} width={20} height={20} fill={col} stroke={{ color: tk.bg, width: 4 }} />
            <Pill id="area-pill" x={hx} y={PBASE + 10} text={p.data[hi].label} tk={tk} fonts={fonts} scale={0.85 + 0.15 * pop} />
            <BkTooltip id="area-tt" x={tipX} y={tipY} title={p.data[hi].label} rows={tipRows} tk={tk} fonts={fonts} width={tw}
              scale={0.9 + 0.1 * pop} pivot={[tw, tipH]} />
          </Layer>
        ) : null}
      </Cam>
    </Layer>
  );
};
