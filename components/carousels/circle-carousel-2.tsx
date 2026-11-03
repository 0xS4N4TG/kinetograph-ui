// Circle Carousel 2: a spiral. The covers wind inward from a wide, tiny start to one large cover in the middle, and the
// whole spiral turns, so each cover is carried in, grows, and is swallowed at the centre as the next one is born at the
// rim. The spiral is tilted a little and drifts in a slow rotation; the ground is a cool grey.
// The camera rides the front of the sweep inward along the spiral (zoomed out as the covers grow), pulls out past the
// mark to show the whole spiral, holds while it winds, then pushes into the largest cover. Motion blur on fast moves.

import React from 'react';
import { z } from 'zod';
import { useCurrentFrame } from 'remotion';
import { Layer } from '@kinetographdev/core';
import { Chain } from './chain.js';
import { chainCamera, Rig, shutterOf, DEFAULT_PHOTOS, Ground, H, Label, W, easeCam, ease, hex, imagesSchema, lerp, prog, ramp, smooth, useFont } from './kit.js';

export const circleCarousel2Schema = z.object({
  images: imagesSchema,
  count: z.number().int().min(8).max(60).describe('How many covers ride the spiral.'),
  outerRadius: z.number().min(200).max(700).describe('Radius of the rim, where the covers are born, in px.'),
  innerRadius: z.number().min(0).max(300).describe('Radius at the end of the spiral, where the largest cover sits, in px.'),
  windings: z.number().min(0.5).max(3).describe('How many times the spiral winds round on its way in.'),
  minSize: z.number().min(2).max(60).describe('Side of the smallest cover, in px.'),
  maxSize: z.number().min(80).max(420).describe('Side of the largest cover, in px.'),
  growth: z.number().min(0.6).max(4).describe('How late the covers grow; higher keeps them small until near the centre.'),
  travel: z.number().min(0.05).max(1.5).describe('How far the covers travel along the spiral over the shot, as a fraction of its length.'),
  travelStart: z.number().int().min(0).describe('Frame the covers start moving.'),
  travelFrames: z.number().int().min(10).describe('Frames the travel takes, eased in and out.'),
  swirl: z.number().min(-60).max(60).describe('Degrees the whole spiral turns over the shot, on top of the covers travelling along it.'),
  tilt: z.number().min(0).max(40).describe('Degrees each cover leans along the spiral.'),
  stagger: z.number().min(0).max(4).describe('Frames between one cover appearing and the next.'),
  rideZoom: z.number().min(1).max(5).describe('Zoom of the opening shot on the smallest covers.'),
  push: z.number().min(0).max(1).describe('How far the camera pushes into the largest cover at the end.'),
  motionBlur: z.number().min(0).max(1).describe('Camera motion blur shutter in frames, used while the camera moves fast. 0 turns it off.'),
  title: z.string().describe('Small title at the bottom right. Empty for none.'),
  caption: z.string().describe('Smaller line under the title. Empty for none.'),
  font: z.string().describe('Google Fonts family for the label.'),
  colors: z.object({ ground: hex.describe('Background.'), ink: hex.describe('Title.'), muted: hex.describe('Caption.') }).describe('Colours.'),
});
export type CircleCarousel2Props = z.infer<typeof circleCarousel2Schema>;

export const circleCarousel2Defaults: CircleCarousel2Props = {
  images: DEFAULT_PHOTOS.slice(8).concat(DEFAULT_PHOTOS.slice(0, 8)),
  count: 38,
  outerRadius: 470,
  innerRadius: 90,
  windings: 1.15,
  minSize: 5,
  maxSize: 270,
  growth: 2.0,
  travel: 0.4,
  travelStart: 128,
  travelFrames: 100,
  swirl: 14,
  tilt: 6,
  stagger: 2.6,
  rideZoom: 2.2,
  push: 0.35,
  motionBlur: 0,
  title: 'Circle Carousel 2',
  caption: 'A spiral, wound inward',
  font: 'Inter',
  colors: { ground: '#e9ecf0', ink: '#14171c', muted: '#7a828d' },
};

export const CIRCLE2_DURATION = 275;

export const CircleCarousel2 = (p: CircleCarousel2Props) => {
  const f = useCurrentFrame();
  const font = useFont(p.font);
  const shiftAt = (t: number) => p.travel * prog(t, p.travelStart, p.travelStart + p.travelFrames, ease);
  const shift = shiftAt(f);
  const turnAt = (t: number) => p.swirl * prog(t, 0, CIRCLE2_DURATION - 1, easeCam);
  const where = (u: number) => {
    // radius shrinks with an ease so the covers bunch toward the centre
    const r = lerp(p.outerRadius, p.innerRadius, Math.pow(u, 0.8));
    const a = (-90 + u * p.windings * 360) * (Math.PI / 180);
    // size: grows over the whole path, then folds to nothing in the last stretch (swallowed)
    const rise = Math.pow(u / 0.9, p.growth);
    const size = u <= 0.9 ? lerp(p.minSize, p.maxSize, rise) : lerp(p.minSize, p.maxSize, smooth((1 - u) / 0.1));
    return { x: Math.cos(a) * r, y: Math.sin(a) * r, size };
  };
  const place = (u: number) => {
    const w = where(u);
    return { x: w.x, y: w.y, rot: p.tilt * Math.sin(u * 6.28), size: w.size };
  };
  const sweepEnd = 4 + p.count * p.stagger + 10;
  const pullA = sweepEnd - 8;
  const pushA = p.travelStart + p.travelFrames + 4;
  const base = chainCamera({
    count: p.count, stagger: p.stagger, where, shiftAt, rest: { cx: 0, cy: 20, zoom: 0.98 }, rideZoom: p.rideZoom, push: p.push,
    pullA, pullB: pullA + 34, pushA, pushB: pushA + 34, roll: [4, -3],
  });
  // the world turns with the swirl, so the camera's point turns with it
  const camAt = (t: number) => {
    const c = base(t);
    const th = (turnAt(t) * Math.PI) / 180;
    return { ...c, cx: c.cx * Math.cos(th) - c.cy * Math.sin(th), cy: c.cx * Math.sin(th) + c.cy * Math.cos(th) };
  };
  const c = camAt(f);
  const shutter = p.motionBlur > 0 ? shutterOf(camAt, f, 420, 14, p.motionBlur) : 0;
  return (
    <Layer id="root">
      <Ground color={p.colors.ground} />
      <Rig cx={c.cx} cy={c.cy} zoom={c.zoom} roll={c.roll} shutter={shutter}>
        <Layer id="world" rotation={turnAt(f)}>
          <Chain frame={f} images={p.images} count={p.count} shift={shift} idPrefix="cc2" radius={2} stagger={p.stagger} shadow={1} place={place} />
        </Layer>
      </Rig>
      <Label x={W - 72} y={H - 130} title={p.title} sub={p.caption} font={font} ink={p.colors.ink} muted={p.colors.muted} opacity={ramp(f, pullA + 30, pullA + 60, 0, 1)} align="right" />
    </Layer>
  );
};
