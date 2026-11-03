// A-to-B Flyover. A real MapLibre GL map of NASA's Blue Marble imagery (NASA EOSDIS GIBS, public domain) flown from one
// place to another along the great circle. The map is captured frame by frame (capture/capture.mjs); everything on top of
// it is drawn here, sharp and live: the arc drawing itself, the pins, the labels and the distance counting up.
//
// Principles: arcs (the route is a great circle and the camera rides it), slow in and slow out (one ease for the arc and
// the camera, which follows the head a few frames behind), staging (one subject a beat: A, the flight, B), follow
// through (the pull-out is quicker than the push-in, the head pulses and settles at B), timing (a 0.8 s hold on A, 6 s
// flight, 1.8 s hold on B), restraint (one colour, one number).

import React from 'react';
import { z } from 'zod';
import { Ellipse, Layer, Path, Text, Video, staticFile } from '@kinetographdev/core';
import { measureText } from '@remotion/layout-utils';
import { useCurrentFrame } from 'remotion';
import { Attribution, H, Tracked, Vignette, W, at, easeInOut, ramp, stroke, textShadow, useFont } from './ui.js';
import type { Track, XY } from './ui.js';

const hex = z.string().describe('A CSS colour.');

export const flyoverSchema = z.object({
  clip: z.string().describe('The captured map in public/ (node capture/capture.mjs flyover). It also fixes the route and the camera.'),
  fromName: z.string().describe('Name at the start of the route. Must match the route the clip was captured for.'),
  toName: z.string().describe('Name at the end of the route.'),
  fromCode: z.string().describe('Small code under the start name (an airport, a country). Empty for none.'),
  toCode: z.string().describe('Small code under the end name. Empty for none.'),
  showDistance: z.boolean().describe('Show the distance flown, counting up with the arc, bottom left.'),
  unit: z.enum(['km', 'mi']).describe('Unit of the distance.'),
  arcWidth: z.number().min(1).max(14).describe('Width of the arc in pixels.'),
  vignette: z.number().min(0).max(0.8).describe('How much the corners darken (0 is none).'),
  arcDelay: z.number().int().min(0).max(120).describe('Frames the arc waits after the camera starts moving. 0 draws it with the camera.'),
  attribution: z.string().describe('Credit line, bottom right. Imagery credit is required: keep it.'),
  font: z.string().describe('Google Fonts family for all type.'),
  colors: z
    .object({
      arc: hex.describe('The arc and the head.'),
      ink: hex.describe('Names and the distance.'),
      muted: hex.describe('Codes and captions.'),
    })
    .describe('Colours.'),
});
export type FlyoverProps = z.infer<typeof flyoverSchema>;

export const flyoverDefaults: FlyoverProps = {
  clip: 'flyover.mp4',
  fromName: 'Dubai',
  toName: 'Tokyo',
  fromCode: 'DXB',
  toCode: 'HND',
  showDistance: true,
  unit: 'km',
  arcWidth: 5,
  vignette: 0.42,
  arcDelay: 0,
  attribution: 'Imagery: NASA EOSDIS GIBS · Blue Marble',
  font: 'Geist',
  colors: { arc: '#ff7a59', ink: '#ffffff', muted: 'rgba(255,255,255,0.68)' },
};

/** Great-circle distance in km between two [lng, lat] points. */
export const haversineKm = ([lng1, lat1]: XY, [lng2, lat2]: XY) => {
  const r = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lng2 - lng1) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
};

const pathOf = (pts: XY[], head: number): string => {
  // Points 0..head (a fractional index: the last segment is cut part way).
  const n = Math.floor(head);
  let d = '';
  for (let i = 0; i <= n && i < pts.length; i++) d += `${i === 0 ? 'M' : 'L'} ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)} `;
  if (n + 1 < pts.length) {
    const t = head - n;
    const [x0, y0] = pts[n];
    const [x1, y1] = pts[n + 1];
    d += `L ${(x0 + (x1 - x0) * t).toFixed(1)} ${(y0 + (y1 - y0) * t).toFixed(1)}`;
  }
  return d;
};

const headAt = (pts: XY[], head: number): XY => {
  const n = Math.min(pts.length - 2, Math.floor(head));
  const t = head - n;
  return [pts[n][0] + (pts[n + 1][0] - pts[n][0]) * t, pts[n + 1 > pts.length - 1 ? n : n + 1][1] * t + pts[n][1] * (1 - t)];
};

interface Props extends FlyoverProps {
  track: Track;
}

const Place: React.FC<{ id: string; family: string; name: string; code: string; at: XY; opacity: number; lift: number; colors: FlyoverProps['colors']; arrive: number }> = ({
  id, family, name, code, at: [x, y], opacity, lift, colors, arrive,
}) => {
  const ring = 1 + 2.2 * arrive;
  return (
    <Layer id={id} x={x} y={y} opacity={opacity}>
      <Ellipse id={`${id}-halo`} x={-22 * ring} y={-22 * ring} width={44 * ring} height={44 * ring} fill={`${colors.arc}33`} opacity={1 - arrive * 0.9} />
      <Ellipse id={`${id}-dot`} x={-7} y={-7} width={14} height={14} fill={colors.ink} stroke={stroke(colors.arc, 3.5)} />
      <Layer id={`${id}-label`} x={24} y={18 + lift}>
        <Text id={`${id}-name`} font={family} weight={500} size={40} color={colors.ink} x={0} y={0} effects={textShadow}>{name}</Text>
        {code ? <Tracked id={`${id}-code`} family={family} text={code} size={17} weight={500} color={colors.muted} x={2} y={48} /> : null}
      </Layer>
    </Layer>
  );
};

export const Flyover: React.FC<Props> = (p) => {
  const f = useCurrentFrame();
  const family = useFont(p.font);
  const fr = at(p.track, f);
  const arc = fr.arc ?? [];
  const last = arc.length - 1;
  const lead = p.arcDelay;
  const progress = p.track.track[Math.max(0, Math.min(p.track.track.length - 1, f - lead))].progress ?? 0;
  const head = progress * last;
  const [a, b] = fr.places;
  const meta = p.track.meta;
  const km = meta.from && meta.to ? haversineKm(meta.from, meta.to) : 0;
  const shown = p.unit === 'km' ? km * progress : km * progress * 0.621371;
  const arrived = progress >= 0.999;
  const arriveFrame = p.track.track.findIndex((t) => (t.progress ?? 0) >= 0.93) + lead;
  const pulse = (f % 48) / 48;
  const headXY = arc.length > 1 && progress > 0 ? headAt(arc, head) : null;
  const unitLabel = p.unit;
  const num = Math.round(shown).toLocaleString('en-US');
  const numW = measureText({ text: num, fontFamily: family, fontSize: 64, fontWeight: 500 }).width;

  return (
    <Layer id="flyover">
      <Video id="map" muted src={staticFile(p.clip)} width={W} height={H} fit="cover" />
      <Vignette strength={p.vignette} />

      {/* the route ahead, faint, then the arc itself: a wide soft line under a crisp one */}
      {arc.length > 1 ? (
        <>
          <Path id="route" d={pathOf(arc, last)} stroke={stroke(p.colors.arc, 2)} opacity={0.2 * ramp(f, 4, 20)} />
          {progress > 0 ? <Path id="arc-glow" d={pathOf(arc, head)} stroke={stroke(p.colors.arc, p.arcWidth * 3.2)} opacity={0.18} /> : null}
          {progress > 0 ? <Path id="arc" d={pathOf(arc, head)} stroke={stroke(p.colors.arc, p.arcWidth)} /> : null}
        </>
      ) : null}

      {headXY && !arrived ? (
        <Layer id="head" x={headXY[0]} y={headXY[1]}>
          <Ellipse id="head-ring" x={-14 - 16 * pulse} y={-14 - 16 * pulse} width={28 + 32 * pulse} height={28 + 32 * pulse} stroke={stroke(p.colors.arc, 2)} opacity={0.6 * (1 - pulse)} />
          <Ellipse id="head-dot" x={-8} y={-8} width={16} height={16} fill={p.colors.ink} stroke={stroke(p.colors.arc, 4)} />
        </Layer>
      ) : null}

      <Place id="place-a" family={family} name={p.fromName} code={p.fromCode} at={a} colors={p.colors} opacity={ramp(f, 6, 22)} lift={ramp(f, 6, 22, 14, 0)} arrive={0} />
      <Place id="place-b" family={family} name={p.toName} code={p.toCode} at={b} colors={p.colors} opacity={ramp(f, arriveFrame, arriveFrame + 16)} lift={ramp(f, arriveFrame, arriveFrame + 16, 14, 0)}
        arrive={ramp(f, arriveFrame + 4, arriveFrame + 34, 0, 1, easeInOut)} />

      {p.showDistance ? (
        <Layer id="distance" x={72} y={H - 168} opacity={ramp(f, 14, 30)}>
          <Tracked id="distance-cap" family={family} text="DISTANCE FLOWN" size={16} weight={500} color={p.colors.muted} x={2} y={0} />
          <Text id="distance-n" font={family} weight={500} size={64} color={p.colors.ink} x={0} y={26} effects={textShadow}>{num}</Text>
          <Text id="distance-u" font={family} weight={400} size={26} color={p.colors.muted} x={numW + 10} y={58}>{unitLabel}</Text>
        </Layer>
      ) : null}

      <Attribution family={family} text={p.attribution} />
    </Layer>
  );
};
