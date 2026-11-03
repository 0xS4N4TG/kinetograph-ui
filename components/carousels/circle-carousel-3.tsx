// Circle Carousel 3: the covers pile into a "U". They file down the left arm, round the bottom and up the right, growing
// as they go, and each lies a little askew so the pile reads as handled prints, not a grid. The big end rises
// from the right arm and is let go at the top. The conveyor idles in and eases out.

import React from 'react';
import { z } from 'zod';
import { random, useCurrentFrame } from 'remotion';
import { Layer } from '@kinetographdev/core';
import { Chain } from './chain.js';
import { chainCamera, Rig, shutterOf, DEFAULT_PHOTOS, Ground, H, Label, W, ease, easeCam, hex, imagesSchema, lerp, prog, ramp, smooth, useFont } from './kit.js';

export const circleCarousel3Schema = z.object({
  images: imagesSchema,
  count: z.number().int().min(8).max(60).describe('How many covers are in the pile.'),
  width: z.number().min(300).max(1100).describe('Width of the U, centre to centre of its arms, in px.'),
  armHeight: z.number().min(0).max(500).describe('Length of each straight arm above the curve, in px.'),
  minSize: z.number().min(10).max(200).describe('Side of the cover at the top of the left arm, in px.'),
  maxSize: z.number().min(100).max(420).describe('Side of the cover at the top of the right arm, in px.'),
  scatter: z.number().min(0).max(80).describe('How far covers sit off the path, in px, so they pile.'),
  lean: z.number().min(0).max(25).describe('How far covers are turned from square, in degrees.'),
  travel: z.number().min(0.05).max(1.5).describe('How far the covers move along the U over the shot, as a fraction of its length.'),
  travelStart: z.number().int().min(0).describe('Frame the covers start moving.'),
  travelFrames: z.number().int().min(10).describe('Frames the move takes, eased in and out.'),
  seed: z.number().int().describe('Seed for the scatter and lean. Same seed, same pile.'),
  stagger: z.number().min(0).max(4).describe('Frames between one cover appearing and the next.'),
  rideZoom: z.number().min(1).max(5).describe('Zoom of the opening shot on the smallest covers.'),
  push: z.number().min(0).max(1).describe('How far the camera pushes into the largest cover at the end.'),
  motionBlur: z.number().min(0).max(1).describe('Camera motion blur shutter in frames, used while the camera moves fast. 0 turns it off.'),
  title: z.string().describe('Small title at the top left. Empty for none.'),
  caption: z.string().describe('Smaller line under the title. Empty for none.'),
  font: z.string().describe('Google Fonts family for the label.'),
  colors: z.object({ ground: hex.describe('Background.'), ink: hex.describe('Title.'), muted: hex.describe('Caption.') }).describe('Colours.'),
});
export type CircleCarousel3Props = z.infer<typeof circleCarousel3Schema>;

export const circleCarousel3Defaults: CircleCarousel3Props = {
  images: DEFAULT_PHOTOS.slice(16).concat(DEFAULT_PHOTOS.slice(0, 16)),
  count: 30,
  width: 640,
  armHeight: 250,
  minSize: 70,
  maxSize: 270,
  scatter: 26,
  lean: 9,
  travel: 0.3,
  travelStart: 118,
  travelFrames: 100,
  seed: 7,
  stagger: 3,
  rideZoom: 2.2,
  push: 0,
  motionBlur: 0,
  title: 'Circle Carousel 3',
  caption: 'Piled into a U',
  font: 'Geist',
  colors: { ground: '#f1eee8', ink: '#1a1815', muted: '#8a847a' },
};

export const CIRCLE3_DURATION = 270;

export const CircleCarousel3 = (p: CircleCarousel3Props) => {
  const f = useCurrentFrame();
  const font = useFont(p.font);
  const shiftAt = (t: number) => p.travel * prog(t, p.travelStart, p.travelStart + p.travelFrames, ease);
  const shift = shiftAt(f);
  const half = p.width / 2;
  const arc = Math.PI * half;
  const total = 2 * p.armHeight + arc;
  const along = (u: number) => {
    // distance along the U from the top of the left arm
    const d = u * total;
    if (d < p.armHeight) return { x: -half, y: -p.armHeight + d };
    if (d < p.armHeight + arc) {
      const a = Math.PI + ((d - p.armHeight) / arc) * Math.PI; // 180 to 360 degrees, round the bottom
      return { x: Math.cos(a) * half, y: -Math.sin(a) * half };
    }
    return { x: half, y: -(d - p.armHeight - arc) };
  };
  const sizeOf = (u: number) => lerp(p.minSize, p.maxSize, Math.pow(u, 1.3)) * smooth(u / 0.07) * smooth((1 - u) / 0.06);
  const where = (u: number) => {
    const { x, y } = along(u);
    return { x, y, size: sizeOf(u) };
  };
  const place = (u: number, i: number) => {
    const { x, y } = along(u);
    const jx = (random(`jx${p.seed}-${i}`) - 0.5) * 2 * p.scatter;
    const jy = (random(`jy${p.seed}-${i}`) - 0.5) * 2 * p.scatter;
    const rot = (random(`r${p.seed}-${i}`) - 0.5) * 2 * p.lean;
    // grows left to right; both ends fold to nothing so a cover is born and let go
    return { x: x + jx, y: y + jy, rot, size: sizeOf(u) };
  };
  const sweepEnd = 4 + p.count * p.stagger + 10;
  const pullA = sweepEnd - 8;
  const pushA = p.travelStart + p.travelFrames + 4;
  const camAt = chainCamera({
    count: p.count, stagger: p.stagger, where, shiftAt, rest: { cx: 0, cy: (half - p.armHeight) / 2 + 10, zoom: 1 }, rideZoom: p.rideZoom, push: p.push,
    pullA, pullB: pullA + 34, pushA, pushB: pushA + 34, roll: [-3, 2],
  });
  const c = camAt(f);
  const shutter = p.motionBlur > 0 ? shutterOf(camAt, f, 420, 14, p.motionBlur) : 0;
  return (
    <Layer id="root">
      <Ground color={p.colors.ground} />
      <Rig cx={c.cx} cy={c.cy} zoom={c.zoom} roll={c.roll} shutter={shutter}>
        <Chain frame={f} images={p.images} count={p.count} shift={shift} idPrefix="cc3" radius={3} stagger={p.stagger} shadow={1.2} place={place} />
      </Rig>
      <Label x={72} y={72} title={p.title} sub={p.caption} font={font} ink={p.colors.ink} muted={p.colors.muted} opacity={ramp(f, pullA + 30, pullA + 60, 0, 1)} />
    </Layer>
  );
};
