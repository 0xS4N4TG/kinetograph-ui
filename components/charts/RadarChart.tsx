// Radar chart, after Bklit UI's Radar Chart (MIT): polygon grid rings that grow out of the centre one after another
// (spring 100/15, 0.08 s apart), spokes that extend outward (0.05 s apart), category labels, level numbers up the top
// spoke, and translucent polygon areas (15% fill, 2 px stroke, a dot at each vertex). Hovering a series lifts its
// fill to 35% and dims the rest.
//
// Shot: the camera starts tight on the top axis while the grid grows through the frame, then orbits the chart with
// the first series as it sweeps out one axis at a time, a fan from the centre following the head, the camera
// following at a fraction of the radius with a few degrees of roll. Labels far from the head are soft; they sharpen
// as the head reaches them. Then a small anticipation, a pull-out with motion blur and overshoot while the second
// series springs open, and the first series is picked: its fill lifts, the other dims, a tooltip lists its values.
//
// Principles: staging, arcs (orbit and roll), slow in and slow out per axis, anticipation and overshoot on the pull
// out, follow-through (second series, tooltip), depth of field that lands on the subject.

import React from 'react';
import { z } from 'zod';
import { Ellipse, Layer, Path, Text } from '@kinetographdev/core';
import { spring } from 'remotion';
import { Cam, H, W, clamp01, easeOut, hex, lerp, seg, stroke, useFonts } from './lib.js';
import { PX, backOut, bkModeSchema, bkPaletteSchema, easeRide, mix, moveCurve, polar, poly, shutterFor, soft, tokens } from './bklit.js';
import { Backdrop, BkTooltip, Heading, Soft, tipWidth } from './bklitParts.js';

export const RADAR_FPS = 60;

export const radarSchema = z.object({
  metrics: z.array(z.string()).min(3).max(8).describe('The axes, clockwise from the top.'),
  series: z.array(z.object({
    name: z.string().describe('Series name.'),
    values: z.array(z.number().min(0)).describe('One value per axis, 0 to `max`.'),
    color: hex.optional().describe('Override colour; by default --chart-1, --chart-2, --chart-3.'),
  })).min(1).max(3).describe('The polygons. The first is the one the camera follows.'),
  max: z.number().min(1).describe('The value at the outer ring.'),
  levels: z.number().int().min(2).max(8).describe('Number of grid rings.'),
  title: z.string().describe('Heading.'),
  subtitle: z.string().describe('Muted line under the heading.'),
  mode: bkModeSchema,
  palette: bkPaletteSchema,
  axisSeconds: z.number().min(0.2).max(2).describe('How long the head takes along each edge of the first series.'),
  holdSeconds: z.number().min(0).max(8).describe('How long the last frame holds.'),
  camera: z.object({
    tightZoom: z.number().min(1.2).max(3.5).describe('Zoom while orbiting.'),
    wideZoom: z.number().min(0.7).max(1.3).describe('Zoom of the whole chart.'),
    orbit: z.number().min(0).max(1).describe('How far the camera follows the head out from the centre.'),
    roll: z.number().min(0).max(12).describe('Degrees of roll the orbit leans into.'),
    motionBlur: z.number().min(0).max(1.5).describe('Strength of the motion blur on the fast moves; 0 turns it off.'),
    rackFocus: z.number().min(0).max(12).describe('Blur in pixels on labels away from the head.'),
  }).describe('Camera.'),
});
export type RadarProps = z.infer<typeof radarSchema>;

export const radarDefaults: RadarProps = {
  metrics: ['Speed', 'Reliability', 'Comfort', 'Safety', 'Efficiency', 'Range'],
  series: [
    { name: 'Model A', values: [82, 70, 62, 91, 76, 58] },
    { name: 'Model B', values: [64, 88, 78, 60, 52, 84] },
  ],
  max: 100,
  levels: 5,
  title: 'Vehicle comparison',
  subtitle: 'Scored 0 to 100 on six measures',
  mode: 'light',
  palette: 'primary',
  axisSeconds: 0.55,
  holdSeconds: 1.8,
  camera: { tightZoom: 2.2, wideZoom: 1.02, orbit: 0.72, roll: 3.5, motionBlur: 1, rackFocus: 4 },
};

const S = (s: number) => Math.round(s * RADAR_FPS);
const times = (p: RadarProps) => {
  const m = p.metrics.length;
  const g0 = 0;
  const a0 = S(0.55);
  const edge = S(p.axisSeconds);
  const a1 = a0 + m * edge;
  const pre = a1 + S(0.2);
  const m0 = pre + S(0.3);
  const m1 = m0 + S(1.6);
  const h0 = m1 + S(0.15);
  const h1 = h0 + S(0.6);
  return { g0, a0, edge, a1, pre, m0, m1, h0, h1, end: h1 + S(p.holdSeconds) };
};
export const radarDuration = (p: RadarProps) => times(p).end;

const CX = 650;
const CY = 590;
const R = 340;

export const RadarChart: React.FC<{ f: number } & RadarProps> = ({ f, ...p }) => {
  const fonts = useFonts();
  const tk = tokens(p.mode, p.palette);
  const T = times(p);
  const m = p.metrics.length;
  const colors = p.series.map((s, i) => s.color ?? tk.series[i % tk.series.length]);
  const ang = (k: number) => (k * Math.PI * 2) / m;
  const vert = (si: number, k: number, scale = 1): [number, number] => polar(CX, CY, ((p.series[si].values[k] ?? 0) / p.max) * R * scale, ang(k));
  const ringStroke = mix(tk.bg, tk.border, tk.dark ? 0.9 : 0.6);

  // ---- the first series, edge by edge
  const edgeProg = (ff: number, k: number) => seg(ff, T.a0 + k * T.edge, T.a0 + (k + 1) * T.edge, easeRide);
  const headAt = (ff: number): [number, number, number] => {
    // [x, y, angle] of the head
    let k = 0;
    while (k < m - 1 && ff >= T.a0 + (k + 1) * T.edge) k++;
    const a = vert(0, k);
    const b = vert(0, (k + 1) % m);
    const t = edgeProg(ff, k);
    const hx = lerp(a[0], b[0], t);
    const hy = lerp(a[1], b[1], t);
    return [hx, hy, Math.atan2(hx - CX, CY - hy)];
  };

  // ---- the camera
  const wide: [number, number, number] = [930, 545, p.camera.wideZoom];
  const camAt = (ff: number): [number, number, number, number] => {
    const [hx, hy, ha] = headAt(ff);
    const grow = seg(ff, 0, T.a0, easeOut);
    // before the sweep starts it holds on the top axis, where the head will start
    const sx = lerp(CX, CX, 1);
    const sy = lerp(CY - R * 0.62, hy, 0);
    const started = seg(ff, T.a0 - S(0.2), T.a0 + S(0.3), (t) => t * t * (3 - 2 * t));
    const headX = lerp(sx, lerp(CX, hx, p.camera.orbit), started);
    const headY = lerp(sy, lerp(CY, hy, p.camera.orbit), started);
    const tgt: [number, number, number] = [headX, headY, p.camera.tightZoom * (1 + 0.04 * (1 - grow))];
    const a = seg(ff, T.pre, T.m0, (t) => t * t * (3 - 2 * t));
    tgt[2] *= 1 + 0.05 * a;
    const w = moveCurve(seg(ff, T.m0, T.m1, (t) => t), 0, 0.055);
    const roll = p.camera.roll * Math.sin(ha) * (1 - clamp01(w)) * started;
    const lean = seg(ff, T.h0, T.h1 + S(0.4), easeOut);
    const pose: [number, number, number] = [lerp(tgt[0], wide[0], w), lerp(tgt[1], wide[1], w), Math.exp(lerp(Math.log(tgt[2]), Math.log(wide[2]), w))];
    return [lerp(pose[0], pose[0] + 40, lean), pose[1], pose[2] * (1 + 0.03 * lean), roll];
  };
  const cam = camAt(f);
  const shutter = shutterFor(camAt(Math.max(0, f - 1)).slice(0, 3) as [number, number, number], cam.slice(0, 3) as [number, number, number]) * p.camera.motionBlur;
  const [hx0, hy0, ha0] = headAt(f);
  const sharp = seg(f, T.m0 + S(0.2), T.m1 - S(0.3), easeOut);
  const sweeping = seg(f, T.a0 - S(0.1), T.a0, easeOut) * (1 - seg(f, T.a1, T.a1 + S(0.1), easeOut));
  void sweeping;

  // ---- grid: rings out of the centre (spring 100/15, 0.08 s apart), spokes (0.05 s apart), labels
  const ringK = (i: number) => spring({ frame: f - S(i * 0.08), fps: RADAR_FPS, config: { stiffness: 100, damping: 15, mass: 1 } });
  const spokeK = (k: number) => spring({ frame: f - S(p.levels * 0.04 + k * 0.05), fps: RADAR_FPS, config: { stiffness: 80, damping: 15, mass: 1 } });
  const labelK = (k: number) => seg(f, S(0.1 + p.levels * 0.04 + k * 0.08), S(0.1 + p.levels * 0.04 + k * 0.08 + 0.5), easeOut);

  // ---- the first series: fan, outline, vertex dots
  const nDone = Math.min(m, Math.max(0, Math.floor((f - T.a0) / T.edge)));
  const fullA = f >= T.a0 + m * T.edge;
  const ptsA: [number, number][] = [];
  for (let k = 0; k <= Math.min(nDone, m - 1); k++) ptsA.push(vert(0, k));
  if (!fullA && f >= T.a0) {
    ptsA.push([hx0, hy0]);
  }
  const hov = seg(f, T.h0, T.h1, easeOut);
  const opA = 0.15 + 0.2 * hov;
  const outlineA = ptsA.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join('') + (fullA ? 'Z' : '');
  const fanA = ptsA.length >= 2 ? (fullA ? poly(ptsA) : poly([[CX, CY], ...ptsA])) : '';

  // ---- other series: spring open from the centre during the pull out
  const others = p.series.slice(1).map((s, i) => ({ s, i: i + 1, k: spring({ frame: f - (T.m0 + S(0.45 + i * 0.25)), fps: RADAR_FPS, config: { stiffness: 80, damping: 16, mass: 1 } }) }));

  // ---- right column
  const rows = p.metrics.map((mn, k) => ({ color: colors[0], label: mn, value: String(p.series[0].values[k]) }));
  const tw = tipWidth(p.series[0].name, rows);
  const tipK = backOut(seg(f, T.h0, T.h0 + S(0.45), easeOut));
  const colK = seg(f, T.m0 + S(0.4), T.m1 - S(0.2), easeOut);

  return (
    <Layer id="radar-root">
      <Backdrop tk={tk} W={W} H={H} />
      <Cam id="radar-cam" x={cam[0]} y={cam[1]} zoom={cam[2]} rotation={cam[3]} blur={shutter}>
        <Heading id="radar-head" x={170} y={96} title={p.title} sub={p.subtitle} tk={tk} fonts={fonts} opacity={seg(f, T.m0 + S(0.3), T.m1 - S(0.2), easeOut)} />

        {/* grid rings, scaling out of the centre */}
        {Array.from({ length: p.levels }, (_, i) => {
          const k = Math.max(0, ringK(i));
          if (k <= 0.001) return null;
          const r = ((i + 1) / p.levels) * R * k;
          const pts = Array.from({ length: m }, (_, j) => polar(CX, CY, r, ang(j)));
          return <Path key={i} id={`radar-ring-${i}`} d={poly(pts)} stroke={stroke(ringStroke, 2, { join: 'round' })} opacity={clamp01(k)} />;
        })}
        {/* spokes */}
        {p.metrics.map((_, k) => {
          const s = Math.max(0, spokeK(k));
          if (s <= 0.001) return null;
          const [x, y] = polar(CX, CY, R * s, ang(k));
          return <Path key={k} id={`radar-spoke-${k}`} d={`M${CX} ${CY}L${x.toFixed(2)} ${y.toFixed(2)}`} stroke={stroke(ringStroke, 2, { cap: 'round' })} />;
        })}
        {/* level numbers up the top spoke */}
        {Array.from({ length: p.levels }, (_, i) => (
          <Text key={i} id={`radar-lv-${i}`} x={CX - 14 - 120} y={CY - ((i + 1) / p.levels) * R - 12} maxWidth={120} align="right" font={fonts.mono} size={18} color={mix(tk.bg, tk.label, 0.7)} opacity={labelK(i)}>
            {String(Math.round(((i + 1) / p.levels) * p.max))}
          </Text>
        ))}

        {/* category labels: soft away from the head, sharp where it is */}
        {p.metrics.map((mn, k) => {
          const [lx, ly] = polar(CX, CY, R + 30 * PX * 0.75 + 8, ang(k));
          let d = Math.abs(((ang(k) - ha0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
          const depth = (1 - sharp) * clamp01(d / 1.9) * (f < T.a0 ? 0 : 1);
          const w = 220;
          const cosA = Math.sin(ang(k));
          const align = Math.abs(cosA) < 0.25 ? 'center' : cosA > 0 ? 'left' : 'right';
          const tx = align === 'center' ? lx - w / 2 : align === 'left' ? lx : lx - w;
          return (
            <Soft key={k} id={`radar-lab-${k}`} r={soft(depth, p.camera.rackFocus)} opacity={labelK(k)}>
              <Text id={`radar-label-${k}`} x={tx} y={ly - 14} maxWidth={w} align={align as 'left'} font={fonts.sans} size={11 * PX} color={tk.label}>{mn}</Text>
            </Soft>
          );
        })}

        {/* other series (spring open from the centre) */}
        {others.map(({ s, i, k }) => {
          if (k <= 0.001) return null;
          const pts = p.metrics.map((_, j) => vert(i, j, Math.max(0.001, k)));
          const dim = 1 - 0.7 * hov;
          return (
            <Layer id={`radar-s${i}`} key={i} opacity={clamp01(k * 2) * dim}>
              <Path id={`radar-s${i}-fill`} d={poly(pts)} fill={colors[i]} opacity={0.15} />
              <Path id={`radar-s${i}-line`} d={poly(pts)} stroke={stroke(colors[i], 2 * PX, { join: 'round' })} />
              {pts.map(([x, y], j) => <Ellipse key={j} id={`radar-s${i}-d${j}`} x={x - 7} y={y - 7} width={14} height={14} fill={colors[i]} stroke={{ color: tk.bg, width: 3 }} />)}
            </Layer>
          );
        })}

        {/* the first series */}
        {fanA ? <Path id="radar-a-fill" d={fanA} fill={colors[0]} opacity={opA} /> : null}
        {outlineA ? <Path id="radar-a-line" d={outlineA} stroke={stroke(colors[0], (2 + 1.2 * hov) * PX, { cap: 'round', join: 'round' })} /> : null}
        {Array.from({ length: Math.min(m, nDone + 1) }, (_, k) => {
          const [x, y] = vert(0, k);
          const born = seg(f, T.a0 + k * T.edge - 2, T.a0 + k * T.edge + S(0.2), easeOut);
          const sc = backOut(born, 2.2);
          if (born <= 0) return null;
          return <Ellipse key={k} id={`radar-a-d${k}`} x={x - 7 * sc} y={y - 7 * sc} width={14 * sc} height={14 * sc} fill={colors[0]} stroke={{ color: tk.bg, width: 3 }} />;
        })}
        {!fullA && f >= T.a0 ? (
          <Layer id="radar-head-dot">
            <Ellipse id="radar-head-halo" x={hx0 - 26} y={hy0 - 26} width={52} height={52} fill={colors[0]} opacity={0.2} />
            <Ellipse id="radar-head-core" x={hx0 - 9} y={hy0 - 9} width={18} height={18} fill={colors[0]} stroke={{ color: tk.bg, width: 4 }} />
          </Layer>
        ) : null}

        {/* legend and the hover tooltip */}
        <Layer id="radar-legend" x={1250} y={300 + (1 - colK) * 14} opacity={colK}>
          {p.series.map((s, i) => (
            <Layer id={`radar-leg-${i}`} key={i} y={i * 56} opacity={i === 0 ? 1 : 1 - 0.55 * hov}>
              <Ellipse id={`radar-leg-dot-${i}`} x={0} y={12} width={16} height={16} fill={colors[i]} />
              <Text id={`radar-leg-name-${i}`} x={36} y={4} font={fonts.sans} size={28} color={tk.fg}>{s.name}</Text>
            </Layer>
          ))}
        </Layer>
        {hov > 0 ? (
          <BkTooltip id="radar-tt" x={1250} y={300 + p.series.length * 56 + 30} title={p.series[0].name} rows={rows} tk={tk} fonts={fonts} width={tw}
            opacity={clamp01(tipK * 1.5)} scale={0.9 + 0.1 * tipK} pivot={[0, 0]} />
        ) : null}
      </Cam>
    </Layer>
  );
};

