// City Zoom. A real MapLibre GL vector map (OpenFreeMap tiles, OpenMapTiles schema, OpenStreetMap data) captured frame by
// frame (capture/capture.mjs): a hold on the country, then the camera descends on the city, tilting and turning a little
// as it arrives. The pin and the label are drawn here from the projected position of the city, so they stay sharp and live.
//
// Principles: anticipation (a hold, then the descent), slow in and slow out (zoom is logarithmic, so the ease is applied
// to the zoom itself), arcs (the centre curves towards the city a beat behind the scale), squash and stretch plus follow
// through (the pin drops, squashes on landing and settles; a ripple leaves it), staging (the label waits for the pin),
// restraint (a pale map, one accent).

import React from 'react';
import { z } from 'zod';
import { Ellipse, Layer, Path, Rect, Text, Video, dropShadow, staticFile } from '@kinetographdev/core';
import { Easing, useCurrentFrame } from 'remotion';
import { Attribution, H, Tracked, W, at, easeOut, ramp, stroke, useFont } from './ui.js';
import type { Track } from './ui.js';

const hex = z.string().describe('A CSS colour.');

export const cityZoomSchema = z.object({
  clip: z.string().describe('The captured map in public/ (node capture/capture.mjs city-zoom). It also fixes the city and the camera.'),
  city: z.string().describe('The city name on the label.'),
  country: z.string().describe('The country, under the city name. Also shown small in the opening hold. Empty for none.'),
  showCoordinates: z.boolean().describe('Show the latitude and longitude under the name.'),
  landFrame: z.number().int().min(60).max(235).describe('Frame the pin lands (the camera has come to rest just before).'),
  attribution: z.string().describe('Credit line, bottom right. The map data credit is required: keep it.'),
  font: z.string().describe('Google Fonts family for all type.'),
  colors: z
    .object({
      pin: hex.describe('The pin.'),
      card: hex.describe('The label card.'),
      ink: hex.describe('The city name.'),
      muted: hex.describe('The country and coordinates.'),
    })
    .describe('Colours.'),
});
export type CityZoomProps = z.infer<typeof cityZoomSchema>;

export const cityZoomDefaults: CityZoomProps = {
  clip: 'city-zoom.mp4',
  city: 'Lisbon',
  country: 'Portugal',
  showCoordinates: true,
  landFrame: 190,
  attribution: '© OpenStreetMap contributors · OpenFreeMap · OpenMapTiles',
  font: 'Geist',
  colors: { pin: '#ff5a3c', card: '#ffffff', ink: '#14161a', muted: '#6b7079' },
};

const dms = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(2)}° ${v >= 0 ? pos : neg}`;

interface Props extends CityZoomProps {
  track: Track;
}

/** A pin: a teardrop whose point is the origin, 44 px tall. */
const pinPath = (sx: number, sy: number) => {
  const X = (v: number) => (v * sx).toFixed(2);
  const Y = (v: number) => (v * sy).toFixed(2);
  return `M 0 0 C ${X(-3)} ${Y(-9)} ${X(-16)} ${Y(-19)} ${X(-16)} ${Y(-30)} A ${X(16)} ${Y(16)} 0 1 1 ${X(16)} ${Y(-30)} C ${X(16)} ${Y(-19)} ${X(3)} ${Y(-9)} 0 0 Z`;
};

export const CityZoom: React.FC<Props> = (p) => {
  const f = useCurrentFrame();
  const family = useFont(p.font);
  const fr = at(p.track, f);
  const [x, y] = fr.places[0];
  const city = p.track.meta.city ?? [0, 0];

  // The drop: ease in over 9 frames from 90 px above, squash on landing, settle with a small rebound.
  const t = f - p.landFrame;
  const fall = t < 0 ? 1 : 0;
  const dropY = t < -9 ? -90 : t < 0 ? -90 * (1 - Easing.in(Easing.quad)((t + 9) / 9)) : 0;
  const squash = t >= 0 && t < 14 ? Math.sin((t / 14) * Math.PI) * Math.exp(-t / 5) : 0;
  const rebound = t >= 0 ? -6 * Math.exp(-t / 6) * Math.abs(Math.sin(t / 2.4)) : 0;
  const pinOpacity = ramp(f, p.landFrame - 14, p.landFrame - 9);
  const ripple = ramp(f, p.landFrame, p.landFrame + 40, 0, 1, Easing.out(Easing.cubic));
  const cardIn = ramp(f, p.landFrame + 8, p.landFrame + 26);
  const openHold = 1 - ramp(f, 18, 40, 0, 1, Easing.inOut(Easing.cubic));

  const cardW = 360;
  const cardH = p.showCoordinates ? 132 : 104;

  return (
    <Layer id="city-zoom">
      <Video id="map" muted src={staticFile(p.clip)} width={W} height={H} fit="cover" />

      {p.country ? <Tracked id="open-cap" family={family} text={p.country.toUpperCase()} size={20} weight={500} color={p.colors.muted} x={72} y={72} opacity={ramp(f, 4, 20) * openHold} /> : null}

      {f >= p.landFrame - 14 ? (
        <Layer id="pin" x={x} y={y}>
          <Ellipse id="ripple" x={-70 * ripple} y={-70 * ripple * 0.4} width={140 * ripple} height={140 * ripple * 0.8} stroke={stroke(p.colors.pin, 2)} opacity={t >= 0 ? 0.5 * (1 - ripple) : 0} />
          <Ellipse id="pin-shadow" x={-9} y={-3} width={18} height={6} fill="rgba(0,0,0,0.28)" opacity={fall ? ramp(f, p.landFrame - 9, p.landFrame, 0.1, 1) * 0.9 : 0.9} />
          <Layer id="pin-body" y={dropY + rebound} opacity={pinOpacity}>
            <Path id="pin-shape" d={pinPath(1 + squash * 0.16, 1 - squash * 0.2)} fill={p.colors.pin} stroke={stroke('rgba(0,0,0,0.12)', 1)} />
            <Ellipse id="pin-hole" x={-5.5 * (1 + squash * 0.16)} y={-35.5 * (1 - squash * 0.2) - 5.5} width={11 * (1 + squash * 0.16)} height={11 * (1 - squash * 0.2)} fill="#ffffff" />
          </Layer>
        </Layer>
      ) : null}

      {f >= p.landFrame + 8 ? (
        <Layer id="card" x={x + 34 + (1 - cardIn) * -10} y={y - 76} opacity={cardIn}>
          <Rect id="card-bg" width={cardW} height={cardH} radius={18} fill={p.colors.card} effects={[dropShadow({ x: 0, y: 10, blur: 28, color: 'rgba(20,22,26,0.22)' })]} />
          <Text id="card-city" font={family} weight={500} size={52} color={p.colors.ink} x={28} y={20}>{p.city}</Text>
          {p.country ? <Tracked id="card-country" family={family} text={p.country.toUpperCase()} size={15} weight={500} color={p.colors.muted} x={30} y={86} /> : null}
          {p.showCoordinates ? <Text id="card-coords" font={family} weight={400} size={17} color={p.colors.muted} x={30} y={104}>{`${dms(city[1], 'N', 'S')}   ${dms(city[0], 'E', 'W')}`}</Text> : null}
        </Layer>
      ) : null}

      <Attribution family={family} text={p.attribution} color="#14161a" opacity={0.55} />
    </Layer>
  );
};
