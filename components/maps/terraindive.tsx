// Terrain Dive. A real MapLibre GL scene captured frame by frame (capture/capture.mjs terrain-dive): high over the Alps with
// the Earth curving away, a fast plunge that pitches over into the Mattertal, a low run down the valley, then a bank round
// the Matterhorn, rising until its ridge stands against the sky. 3D terrain (AWS Terrain Tiles, exaggerated), hillshade,
// Sentinel-2 cloudless imagery, sky and fog. One continuous move, no cuts.
//
// Over the clip, drawn here from the capture's per-frame track: the peak's name, height and coordinates in tracked small
// caps on a map-legend line, a thin leader from the label to the peak's projected screen position, and an altitude readout
// counting down the dive with a log-scale rail beside it.
//
// Principles: slow in and slow out (the camera is a spline still at both ends, so the speed builds through the dive and
// bleeds off into the settle), arcs (the valley run banks into the turn round the peak, the roll follows the yaw rate),
// follow through (the leader draws out and the marker pulses once the camera has found the peak), staging (the label waits
// until the peak is in frame, the altitude is the only other moving type), exaggeration (terrain stretched 1.7x, a drone's
// wide lens), restraint (one accent, two numbers).

import React from 'react';
import { z } from 'zod';
import { Ellipse, Layer, Path, Rect, Text, Video, dropShadow, staticFile } from '@kinetographdev/core';
import { measureText } from '@remotion/layout-utils';
import { useCurrentFrame } from 'remotion';
import { H, Tracked, Vignette, W, at, easeOut, ramp, stroke, textShadow, trackedWidth, useFont } from './ui.js';
import type { Track } from './ui.js';

const hex = z.string().describe('A CSS colour.');

export const terrainDiveSchema = z.object({
  clip: z.string().describe('The captured dive in public/ (node capture/capture.mjs terrain-dive). It fixes the peak, the route and the camera.'),
  name: z.string().describe('The peak\'s name on the legend line (drawn in capitals).'),
  elevation: z.number().min(0).max(9000).describe('The peak\'s height in metres, on the legend line. Empty (0) for none.'),
  showCoordinates: z.boolean().describe('Show the peak\'s latitude and longitude under the name (read from the clip\'s track).'),
  showAltitude: z.boolean().describe('Show the altitude readout, bottom left, counting down the dive.'),
  labelFrame: z.number().int().min(30).max(170).describe('Frame the legend line starts to draw (the peak is in frame from about here).'),
  vignette: z.number().min(0).max(1).describe('Darkening toward the corners, so the type holds on snow.'),
  attribution: z.array(z.string()).describe('Credit lines, bottom right, one per line. The imagery and terrain credits are required: keep them.'),
  font: z.string().describe('Google Fonts family for all type.'),
  colors: z
    .object({
      accent: hex.describe('The peak marker, the leader and the altitude figure.'),
      ink: hex.describe('The peak name and the altitude.'),
      muted: hex.describe('Coordinates and captions.'),
    })
    .describe('Colours.'),
});
export type TerrainDiveProps = z.infer<typeof terrainDiveSchema>;

export const terrainDiveDefaults: TerrainDiveProps = {
  clip: 'terrain-dive.mp4',
  name: 'Matterhorn',
  elevation: 4478,
  showCoordinates: true,
  showAltitude: true,
  labelFrame: 112,
  vignette: 0.32,
  attribution: ['Sentinel-2 cloudless – https://s2maps.eu by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016)', 'Terrain Tiles: Mapzen/AWS Open Data'],
  font: 'Geist',
  colors: { accent: '#ffb347', ink: '#ffffff', muted: 'rgba(255,255,255,0.74)' },
};

interface Props extends TerrainDiveProps {
  track: Track;
}

const coord = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(3)}°${v >= 0 ? pos : neg}`;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const darkChip = [dropShadow({ x: 0, y: 4, blur: 18, color: 'rgba(0,0,0,0.35)' })];

/** The altitude in metres as the readout shows it: whole metres under 10 km, the nearest 10 above. */
const shownAltitude = (m: number) => (m < 10000 ? Math.round(m) : Math.round(m / 10) * 10);

/** Where a height sits on the rail, 0 at the ground (3 km) and 1 at the top (700 km), on a log scale. */
const railT = (m: number) => clamp((Math.log(m) - Math.log(3000)) / (Math.log(700000) - Math.log(3000)), 0, 1);

export const TerrainDive: React.FC<Props> = (p) => {
  const f = useCurrentFrame();
  const family = useFont(p.font);
  const fr = at(p.track, f);
  const meta = p.track.meta;
  const peak = meta.places?.[0];
  const [px, py] = fr.places[0] ?? [W / 2, H / 2];
  const lng = peak?.at[0] ?? 0;
  const lat = peak?.at[1] ?? 0;

  // ---- the legend line: NAME · 4,478 M, coordinates under it ----
  const head = `${p.name.toUpperCase()}${p.elevation > 0 ? ` · ${p.elevation.toLocaleString('en-US')} M` : ''}`;
  const sub = `${coord(lat, 'N', 'S')} ${coord(lng, 'E', 'W')}`;
  const size = 24;
  const headW = trackedWidth(head, size, 0.16) - size * 0.16;
  const subW = trackedWidth(sub, 17, 0.14) - 17 * 0.14;
  const boxW = Math.max(headW, p.showCoordinates ? subW : 0) + 40;
  const boxH = p.showCoordinates ? 78 : 50;

  // On screen with a margin: the legend waits for the peak to be in frame and leaves with it.
  const margin = 90;
  const inFrame = clamp(Math.min(px - margin, W - margin - px, py - margin, H - margin - py) / 60, 0, 1);
  const draw = ramp(f, p.labelFrame, p.labelFrame + 22, 0, 1, easeOut);
  const show = draw * inFrame;
  // The box sits up and to the right of the peak, kept inside the safe area; the leader runs from the marker to its corner.
  const bx = clamp(px + 96, 72, W - 72 - boxW);
  const by = clamp(py - 150, 96, H - 250);
  const cornerX = bx;
  const cornerY = by + boxH;
  const lx = lerp(px, cornerX, draw);
  const ly = lerp(py, cornerY, draw);
  const pulse = ((f - p.labelFrame) % 54) / 54;

  // ---- the altitude readout ----
  const alt = fr.alt ?? 0;
  const digits = shownAltitude(alt).toLocaleString('en-US');
  const altIn = ramp(f, 4, 22);
  const rail = 150;
  const railY = H - 208;
  const t = railT(alt);

  const attrSize = 15;
  const attrW = p.attribution.map((s) => measureText({ text: s, fontFamily: family, fontSize: attrSize, fontWeight: 400 }).width);

  return (
    <Layer id="terrain-dive">
      <Video id="map" muted src={staticFile(p.clip)} width={W} height={H} fit="cover" />
      <Vignette strength={p.vignette} />

      {p.showAltitude ? (
        <Layer id="altitude" x={72} y={H - 190} opacity={altIn}>
          <Rect id="alt-shade" x={-28} y={-30} width={400} height={130} radius={18} fill="rgba(6,10,18,0.34)" effects={darkChip} />
          <Tracked id="alt-cap" family={family} text="ALTITUDE · M ABOVE SEA LEVEL" size={14} weight={500} color={p.colors.muted} x={2} y={-8} />
          <Layer id="alt-digits" x={0} y={16}>
            {digits.split('').map((c, i, all) => {
              // tabular: every digit takes the same step, the comma a narrow one, so the figure does not shimmy as it counts
              const x = all.slice(0, i).reduce((acc, d) => acc + (d === ',' ? 16 : 33), 0);
              return (
                <Text key={i} id={`alt-d${i}`} font={family} weight={500} size={52} color={c === ',' ? p.colors.muted : p.colors.ink} x={x + (c === ',' ? 2 : 0)} y={0} effects={textShadow}>
                  {c}
                </Text>
              );
            })}
          </Layer>
        </Layer>
      ) : null}
      {p.showAltitude ? (
        <Layer id="alt-rail" x={44} y={railY - rail + 60} opacity={altIn}>
          <Rect id="rail-line" x={0} y={0} width={2} height={rail} radius={1} fill="rgba(255,255,255,0.4)" />
          <Ellipse id="rail-dot" x={-5} y={rail * (1 - t) - 6} width={12} height={12} fill={p.colors.accent} effects={[dropShadow({ x: 0, y: 0, blur: 8, color: p.colors.accent })]} />
        </Layer>
      ) : null}

      {show > 0.01 ? (
        <Layer id="peak" opacity={show}>
          {/* the leader: from the marker, out to the corner of the legend, then under it */}
          <Path id="leader" d={`M ${px.toFixed(1)} ${py.toFixed(1)} L ${lx.toFixed(1)} ${ly.toFixed(1)}`} stroke={stroke(p.colors.accent, 2)} opacity={0.95} />
          <Path id="underline" d={`M ${cornerX.toFixed(1)} ${cornerY.toFixed(1)} L ${(cornerX + boxW * draw).toFixed(1)} ${cornerY.toFixed(1)}`} stroke={stroke(p.colors.accent, 2)} opacity={0.95} />
          <Layer id="marker" x={px} y={py}>
            <Ellipse id="marker-ring" x={-13 - 18 * pulse} y={-13 - 18 * pulse} width={26 + 36 * pulse} height={26 + 36 * pulse} stroke={stroke(p.colors.accent, 2)} opacity={0.75 * (1 - pulse)} />
            <Ellipse id="marker-dot" x={-6} y={-6} width={12} height={12} fill={p.colors.ink} stroke={stroke(p.colors.accent, 3)} />
          </Layer>
          <Layer id="legend" x={bx} y={by - (1 - draw) * 10} opacity={ramp(f, p.labelFrame + 6, p.labelFrame + 24)}>
            <Rect id="legend-bg" x={0} y={0} width={boxW} height={boxH} radius={6} fill="rgba(6,10,18,0.46)" effects={darkChip} />
            <Tracked id="legend-head" family={family} text={head} size={size} weight={600} color={p.colors.ink} x={20} y={11} tracking={0.16} />
            {p.showCoordinates ? <Tracked id="legend-sub" family={family} text={sub} size={17} weight={500} color={p.colors.muted} x={20} y={46} tracking={0.14} /> : null}
          </Layer>
        </Layer>
      ) : null}

      {p.attribution.map((line, i) => (
        <Text key={i} id={`attribution-${i}`} font={family} weight={400} size={attrSize} color="#ffffff" opacity={0.62} x={W - 36 - attrW[i]} y={H - 44 - (p.attribution.length - 1 - i) * 22} effects={textShadow}>
          {line}
        </Text>
      ))}
    </Layer>
  );
};
