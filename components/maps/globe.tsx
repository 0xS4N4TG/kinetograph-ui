// Spinning Globe. A real MapLibre GL globe (the globe projection, NASA Blue Marble imagery from NASA EOSDIS GIBS, public
// domain) captured frame by frame (capture/capture.mjs). It turns fast and eases to rest on the featured place. Markers
// and names are drawn here from the capture's projected positions, so they ride the surface and fade at the limb.
//
// Principles: slow in and slow out (the spin is an ease-out of 8 s: fast, then settling), arcs (the surface moves on
// arcs, markers fade as they curve away), follow through (names arrive after the turn has stopped, one by one),
// staging (the featured place is the only one with a large name), secondary action (the other markers, quiet),
// appeal (a still at any frame is a globe with a clean rim).

import React from 'react';
import { z } from 'zod';
import { Ellipse, Layer, Text, Video, staticFile } from '@kinetographdev/core';
import { useCurrentFrame } from 'remotion';
import { Attribution, H, Tracked, W, at, ramp, stroke, textShadow, useFont } from './ui.js';
import type { Track, XY } from './ui.js';

const hex = z.string().describe('A CSS colour.');

export const globeSchema = z.object({
  clip: z.string().describe('The captured globe in public/ (node capture/capture.mjs globe). It also fixes where the places are.'),
  featured: z.string().describe('The name of the place the globe comes to rest on (one of the places in the clip).'),
  featuredCaption: z.string().describe('Small line under the featured name, e.g. the country. Empty for none.'),
  title: z.string().describe('Small tracked caption at the top left. Empty for none.'),
  showOthers: z.boolean().describe('Show the other places as quiet markers with names once the globe has settled.'),
  settleFrame: z.number().int().min(60).max(230).describe('Frame the globe has come to rest; the names arrive from here.'),
  attribution: z.string().describe('Credit line, bottom right. Imagery credit is required: keep it.'),
  font: z.string().describe('Google Fonts family for all type.'),
  colors: z
    .object({
      accent: hex.describe('Marker ring and featured pin.'),
      ink: hex.describe('Names.'),
      muted: hex.describe('Captions and the other names.'),
    })
    .describe('Colours.'),
});
export type GlobeProps = z.infer<typeof globeSchema>;

export const globeDefaults: GlobeProps = {
  clip: 'globe.mp4',
  featured: 'Lisbon',
  featuredCaption: 'Portugal',
  title: 'ON THE MAP',
  showOthers: true,
  settleFrame: 168,
  attribution: 'Imagery: NASA EOSDIS GIBS · Blue Marble',
  font: 'Geist',
  colors: { accent: '#ff7a59', ink: '#ffffff', muted: 'rgba(255,255,255,0.62)' },
};

const rad = Math.PI / 180;
/** Angle in degrees between two [lng, lat] points as seen from the globe's centre. */
const angle = ([l1, p1]: XY, [l2, p2]: XY) =>
  Math.acos(Math.min(1, Math.max(-1, Math.sin(p1 * rad) * Math.sin(p2 * rad) + Math.cos(p1 * rad) * Math.cos(p2 * rad) * Math.cos((l1 - l2) * rad)))) / rad;

interface Props extends GlobeProps {
  track: Track;
}

export const Globe: React.FC<Props> = (p) => {
  const f = useCurrentFrame();
  const family = useFont(p.font);
  const fr = at(p.track, f);
  const places = p.track.meta.places ?? [];

  return (
    <Layer id="globe">
      <Video id="map" muted src={staticFile(p.clip)} width={W} height={H} fit="cover" />

      {places.map((pl, i) => {
        const [x, y] = fr.places[i];
        // 1 on the near side, 0 past 78 degrees from the centre (the limb), eased.
        const a = angle(fr.cam.center, pl.at);
        const facing = Math.max(0, Math.min(1, (84 - a) / 20));
        const featured = pl.name === p.featured;
        const delay = featured ? 0 : 8 + (i % 6) * 5;
        const show = featured ? ramp(f, p.settleFrame - 30, p.settleFrame - 8) : p.showOthers ? ramp(f, p.settleFrame + delay, p.settleFrame + delay + 14) : 0;
        const o = show * facing;
        if (o <= 0.01) return null;
        const pulse = ((f - p.settleFrame) % 60) / 60;
        return (
          <Layer id={`pl-${i}`} key={pl.name} x={x} y={y} opacity={o}>
            {featured ? (
              <Ellipse id={`pl-${i}-ring`} x={-12 - 22 * pulse} y={-12 - 22 * pulse} width={24 + 44 * pulse} height={24 + 44 * pulse} stroke={stroke(p.colors.accent, 2)} opacity={f >= p.settleFrame - 8 ? 0.7 * (1 - pulse) : 0} />
            ) : null}
            <Ellipse id={`pl-${i}-dot`} x={featured ? -8 : -5} y={featured ? -8 : -5} width={featured ? 16 : 10} height={featured ? 16 : 10} fill={featured ? p.colors.ink : p.colors.accent} stroke={featured ? stroke(p.colors.accent, 4) : undefined} />
            <Text id={`pl-${i}-name`} font={family} weight={featured ? 500 : 400} size={featured ? 40 : 21} color={featured ? p.colors.ink : p.colors.muted} x={featured ? 24 : 15} y={featured ? 14 : -13 + (1 - show) * 6} effects={textShadow}>
              {pl.name}
            </Text>
            {featured && p.featuredCaption ? <Tracked id={`pl-${i}-cap`} family={family} text={p.featuredCaption.toUpperCase()} size={16} color={p.colors.muted} x={26} y={62} /> : null}
          </Layer>
        );
      })}

      {p.title ? <Tracked id="title" family={family} text={p.title} size={17} color={p.colors.muted} x={72} y={72} opacity={ramp(f, 6, 24)} /> : null}
      <Attribution family={family} text={p.attribution} />
    </Layer>
  );
};
