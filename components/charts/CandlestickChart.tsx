// Candlestick chart, after Bklit UI's Candlestick Chart (MIT): OHLC candles in --chart-positive (emerald) and
// --chart-negative (red), a 1.5 px wick and a square-cornered body, dashed grid rows and columns, price labels on the
// left, dates under, and a tooltip with Open, High, Low, Close. Bklit fades each candle in from its wick centre,
// one after another.
//
// Shot: the camera starts tight on the first candles and rides the newest one as the series prints, a little ahead of
// it, following the price up and down. The candles speed through the quiet stretch and slow when the breakout starts,
// so the move gets the time. After the last candle it holds, pulls back a hair (anticipation) and pulls out to the
// whole chart with motion blur and overshoot, grid and labels snapping from soft to sharp. A tooltip opens on the
// last candle and slides to the biggest green one.
//
// Principles: staging, timing (fast through the quiet, slow through the breakout), anticipation and overshoot on the
// pull out, arcs (the camera follows smoothed price), follow-through (tooltip after the camera), depth of field.

import React from 'react';
import { z } from 'zod';
import { Layer, Path, Rect, Text } from '@kinetographdev/core';
import { Cam, H, W, clamp01, drift, easeOut, fmt, fmtSchema, hexA, lerp, niceScale, seg, stroke, useFonts, type NumFmt } from './lib.js';
import { PX, avg, backOut, bkModeSchema, bkPaletteSchema, moveCurve, shutterFor, soft, tokens } from './bklit.js';
import { Backdrop, BkTooltip, Heading, Pill, Soft, tipWidth } from './bklitParts.js';

export const CANDLE_FPS = 60;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function makeCandles(n: number) {
  let s = 424242;
  const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const out: { open: number; high: number; low: number; close: number }[] = [];
  let price = 100;
  const bo = Math.floor(n * 0.7);
  for (let k = 0; k < n; k++) {
    const open = price;
    const drift_ = k < bo ? (rnd() - 0.5) * 5.6 : 0.9 + rnd() * 2.6;
    const close = open + drift_ - (k < bo ? (price - 104) * 0.14 : 0);
    const wick = 1.2 + rnd() * 3.2;
    out.push({ open: +open.toFixed(2), close: +close.toFixed(2), high: +(Math.max(open, close) + wick * rnd() * 1.6).toFixed(2), low: +(Math.min(open, close) - wick * rnd() * 1.6).toFixed(2) });
    price = close;
  }
  return out;
}

export const candleSchema = z.object({
  data: z.array(z.object({ open: z.number(), high: z.number(), low: z.number(), close: z.number() }))
    .min(8).max(80).describe('The candles, oldest first. Open, high, low, close.'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Date of the first candle, YYYY-MM-DD. Candles fall on weekdays.'),
  title: z.string().describe('Heading.'),
  subtitle: z.string().describe('Muted line under the heading.'),
  mode: bkModeSchema,
  palette: bkPaletteSchema,
  format: fmtSchema,
  printSeconds: z.number().min(1).max(14).describe('How long the candles take to print.'),
  holdSeconds: z.number().min(0).max(8).describe('How long the last frame holds.'),
  camera: z.object({
    tightZoom: z.number().min(1.2).max(4).describe('Zoom while riding the newest candle.'),
    wideZoom: z.number().min(0.7).max(1.3).describe('Zoom of the whole chart.'),
    lead: z.number().min(0).max(500).describe('Screen pixels the camera leads the newest candle by.'),
    motionBlur: z.number().min(0).max(1.5).describe('Strength of the motion blur on the fast moves; 0 turns it off.'),
    rackFocus: z.number().min(0).max(12).describe('Blur in pixels on the grid and labels while the shot is tight.'),
    drift: z.number().min(0).max(12).describe('Handheld drift in pixels on the holds.'),
  }).describe('Camera.'),
});
export type CandleProps = z.infer<typeof candleSchema>;

const fmt2: NumFmt = { prefix: '$', suffix: '', decimals: 2, group: ',' };

export const candleDefaults: CandleProps = {
  data: makeCandles(44),
  startDate: '2026-02-02',
  title: 'ACME',
  subtitle: 'Daily price, last 44 sessions',
  mode: 'light',
  palette: 'primary',
  format: fmt2,
  printSeconds: 4,
  holdSeconds: 1.6,
  camera: { tightZoom: 2.6, wideZoom: 1, lead: 300, motionBlur: 1, rackFocus: 4, drift: 3 },
};

const S = (s: number) => Math.round(s * CANDLE_FPS);

/** Start frame of each candle: quick through the quiet stretch, slower from the breakout (the first run of green). */
function schedule(p: CandleProps) {
  const n = p.data.length;
  const bo = Math.floor(n * 0.7);
  const wq = 1;
  const wb = 1.9;
  const total = bo * wq + (n - bo) * wb;
  const unit = S(p.printSeconds) / total;
  const start: number[] = [];
  let t = S(0.3);
  for (let k = 0; k < n; k++) {
    start[k] = Math.round(t);
    t += (k < bo ? wq : wb) * unit;
  }
  return { start, end: Math.round(t), bo };
}
const times = (p: CandleProps) => {
  const sc = schedule(p);
  const a0 = sc.end + S(0.5);
  const m0 = a0 + S(0.3);
  const m1 = m0 + S(1.7);
  const t0 = m1 + S(0.1);
  const g0 = t0 + S(0.5);
  const g1 = g0 + S(0.8);
  return { ...sc, a0, m0, m1, t0, g0, g1, tEnd: g1 + S(p.holdSeconds) };
};
export const candleDuration = (p: CandleProps) => times(p).tEnd;

const PX0 = 230;
const PX1 = 1750;
const PTOP = 310;
const PBASE = 900;

export const CandlestickChart: React.FC<{ f: number } & CandleProps> = ({ f, ...p }) => {
  const fonts = useFonts();
  const tk = tokens(p.mode, p.palette);
  const n = p.data.length;
  const T = times(p);
  const slot = (PX1 - PX0) / n;
  const bodyW = slot * 0.74;
  const lo = Math.min(...p.data.map((d) => d.low));
  const hi = Math.max(...p.data.map((d) => d.high));
  const sc = niceScale(lo - (hi - lo) * 0.04, hi + (hi - lo) * 0.04, 5);
  const yOf = (v: number) => PBASE - ((v - sc.min) / (sc.max - sc.min)) * (PBASE - PTOP);
  const xOf = (k: number) => PX0 + slot * (k + 0.5);
  const start = new Date(p.startDate + 'T00:00:00Z');
  const dateOf = (k: number) => {
    const d = new Date(start.getTime());
    let left = k;
    while (left > 0) {
      d.setUTCDate(d.getUTCDate() + 1);
      const wd = d.getUTCDay();
      if (wd !== 0 && wd !== 6) left--;
    }
    return d;
  };
  const label = (k: number) => `${MONTHS[dateOf(k).getUTCMonth()]} ${dateOf(k).getUTCDate()}`;

  // each candle's own progress: wick from the centre, body pops
  const born = (k: number) => seg(f, T.start[k], T.start[k] + S(0.24), easeOut);
  // newest candle position (fractional): where the printing is
  const frontAt = (ff: number) => {
    let k = 0;
    while (k < n - 1 && ff >= T.start[k + 1]) k++;
    const b = seg(ff, T.start[k], T.start[k] + S(0.24), easeOut);
    return k + b;
  };

  // ---- camera: ride the front, follow smoothed price
  const wide: [number, number, number] = [W / 2, H / 2, p.camera.wideZoom];
  const camAt = (ff: number): [number, number, number] => {
    const fr = Math.min(n - 1, frontAt(ff));
    const z0 = p.camera.tightZoom * (1 - 0.1 * clamp01(fr / (n - 1)));
    const lead = p.camera.lead * (1 - 0.8 * seg(ff, T.start[n - 1] - S(0.3), T.start[n - 1] + S(0.3), (t) => t * t * (3 - 2 * t)));
    const x = xOf(fr) + lead / z0;
    const price = (kk: number) => p.data[Math.max(0, Math.min(n - 1, Math.round(kk)))].close;
    const y = yOf(avg((kk) => price(kk), fr - 6, fr + 2, 9)) + 20;
    const a = seg(ff, T.a0, T.m0, (t) => t * t * (3 - 2 * t));
    const z = z0 * (1 + 0.05 * a);
    const w = moveCurve(seg(ff, T.m0, T.m1, (t) => t), 0, 0.055);
    return [lerp(x - 22 * a, wide[0], w), lerp(y, wide[1], w), Math.exp(lerp(Math.log(z), Math.log(wide[2]), w))];
  };
  const cam = camAt(f);
  const dr = drift(f, p.camera.drift * (f > T.m1 ? 1 : 0.3), 2.1);
  const shutter = shutterFor(camAt(Math.max(0, f - 1)), cam) * p.camera.motionBlur;
  const sharp = seg(f, T.m0 + S(0.2), T.m1 - S(0.35), easeOut);
  const gridBlur = soft(1 - sharp, p.camera.rackFocus);
  const reveal = seg(f, 0, S(0.4), easeOut);
  const headK = seg(f, T.m0 + S(0.3), T.m1 - S(0.2), easeOut);

  // ---- hover: opens on the last candle, slides to the biggest green body
  let big = 0;
  p.data.forEach((d, k) => { if (k >= schedule(p).bo && k < n - 4 && d.close - d.open > p.data[big].close - p.data[big].open) big = k; });
  const tOpen = seg(f, T.t0, T.t0 + S(0.3), easeOut);
  const glide = seg(f, T.g0, T.g1, easeOut);
  const hxk = lerp(n - 1, big, glide);
  const hk = Math.max(0, Math.min(n - 1, Math.round(hxk)));
  const hx = xOf(hxk);
  const d = p.data[hk];
  const rows = [
    { color: tk.label, label: 'Open', value: fmt(d.open, p.format) },
    { color: tk.label, label: 'High', value: fmt(d.high, p.format) },
    { color: tk.label, label: 'Low', value: fmt(d.low, p.format) },
    { color: d.close >= d.open ? tk.positive : tk.negative, label: 'Close', value: fmt(d.close, p.format) },
  ];
  const tw = tipWidth(label(hk), rows);
  const tipH = (40 + 24 + rows.length * 20 + (rows.length - 1) * 8) * PX;
  const pop = backOut(tOpen);
  const tipX = Math.min(hx - tw - 18 * PX, PX1 - tw);
  const tipY = Math.max(PTOP - 70, yOf(d.high) - tipH - 40);

  return (
    <Layer id="candle-root">
      <Backdrop tk={tk} W={W} H={H} />
      <Cam id="candle-cam" x={cam[0] + dr.x} y={cam[1] + dr.y} zoom={cam[2]} blur={shutter}>
        <Heading id="candle-head" x={PX0 - 60} y={96} title={p.title} sub={p.subtitle} tk={tk} fonts={fonts} opacity={headK} />

        {/* grid rows and columns, price labels, dates */}
        <Soft id="candle-soft" r={gridBlur} opacity={reveal}>
          {sc.ticks.map((t, i) => (
            <Layer id={`candle-row-${i}`} key={i}>
              <Path id={`candle-gl-${i}`} d={`M${PX0} ${yOf(t)}H${PX1}`} stroke={stroke(tk.grid, 2, { dash: [8, 8] })} />
              <Text id={`candle-yl-${i}`} x={PX0 - 24 - 140} y={yOf(t) - 15} maxWidth={140} align="right" font={fonts.sans} size={12 * PX} color={tk.label}>{fmt(t, { ...p.format, decimals: 0 })}</Text>
            </Layer>
          ))}
          {p.data.map((_, k) => (k % 6 === 3 ? (
            <Layer id={`candle-col-${k}`} key={k}>
              <Path id={`candle-vl-${k}`} d={`M${xOf(k)} ${PTOP}V${PBASE}`} stroke={stroke(tk.grid, 2, { dash: [8, 8] })} />
              <Text id={`candle-xl-${k}`} x={xOf(k) - 70} y={PBASE + 30} maxWidth={140} align="center" font={fonts.sans} size={12 * PX} color={tk.label}
                opacity={tOpen > 0 && Math.abs(k - hxk) < 1.6 ? 1 - tOpen : 1}>{label(k)}</Text>
            </Layer>
          ) : null))}
        </Soft>

        {/* candles */}
        {p.data.map((c, k) => {
          const b = born(k);
          if (b <= 0.001) return null;
          const up = c.close >= c.open;
          const col = up ? tk.positive : tk.negative;
          const yh = yOf(c.high);
          const yl = yOf(c.low);
          const mid = (yh + yl) / 2;
          const yo = yOf(c.open);
          const yc = yOf(c.close);
          const bt = Math.min(yo, yc);
          const bh = Math.max(2, Math.abs(yc - yo));
          const wk = easeOut(clamp01(b * 1.4));
          const bm = backOut(clamp01((b - 0.15) / 0.85), 1.4);
          const hov = tOpen > 0 && k === hk ? 1 : tOpen > 0 ? 0.75 : 1;
          const mc = (bt + bt + bh) / 2;
          return (
            <Layer id={`candle-${k}`} key={k} opacity={hov}>
              <Rect id={`candle-w-${k}`} x={xOf(k) - 1.5} y={mid - ((yl - yh) / 2) * wk} width={3} height={Math.max(1, (yl - yh) * wk)} fill={col} />
              <Rect id={`candle-b-${k}`} x={xOf(k) - bodyW / 2} y={mc - (bh * bm) / 2} width={bodyW} height={Math.max(1, bh * bm)} radius={2} fill={col} />
            </Layer>
          );
        })}

        {/* hover: crosshair, date pill, tooltip */}
        {tOpen > 0 ? (
          <Layer id="candle-hover" opacity={clamp01(tOpen * 1.6)}>
            <Rect id="candle-cross" x={hx - 1} y={PTOP - 30} width={2} height={PBASE - PTOP + 30} opacity={0.9}
              fill={{ type: 'linear', x0: 0, y0: PTOP - 30, x1: 0, y1: PBASE, stops: [{ offset: 0, color: hexA(tk.crosshair, 0) }, { offset: 0.12, color: hexA(tk.crosshair, 1) }, { offset: 0.9, color: hexA(tk.crosshair, 1) }, { offset: 1, color: hexA(tk.crosshair, 0) }] }} />
            <Pill id="candle-pill" x={hx} y={PBASE + 12} text={label(hk)} tk={tk} fonts={fonts} scale={0.85 + 0.15 * pop} />
            <BkTooltip id="candle-tt" x={tipX} y={tipY} title={label(hk)} rows={rows} tk={tk} fonts={fonts} width={tw}
              scale={0.9 + 0.1 * pop} pivot={[tw, tipH]} />
          </Layer>
        ) : null}
      </Cam>
    </Layer>
  );
};
