// Circle Carousel 1: square covers on a circle, tiny at the top left and large at the bottom, turning clockwise so each
// one grows as it comes round. The big end piles up and overlaps; the ring is drawn in by a sweep of entrances.
// The camera has a reason to move: it rides the front of that sweep, tight on the covers as they are born and zoomed out
// as they grow (the size on screen stays about the same), so the growth is felt rather than measured. When the sweep
// closes it pulls out past the mark and back to show the ring, holds, lets the ring turn, then pushes into the pile and
// lands on the biggest cover. Motion blur while it moves fast.

import React from 'react';
import { z } from 'zod';
import { useCurrentFrame } from 'remotion';
import { Layer } from '@kinetographdev/core';
import { Chain } from './chain.js';
import { chainCamera, DEFAULT_PHOTOS, Ground, H, Label, Rig, W, easeCam, hex, imagesSchema, keys, lerp, prog, ramp, shutterOf, smooth, useFont, ease } from './kit.js';

export const circleCarousel1Schema = z.object({
  images: imagesSchema,
  count: z.number().int().min(6).max(48).describe('How many covers sit on the ring.'),
  radius: z.number().min(120).max(520).describe('Radius of the ring in px at the start of the shot.'),
  minSize: z.number().min(2).max(60).describe('Side of the smallest cover, in px.'),
  maxSize: z.number().min(80).max(420).describe('Side of the largest cover, in px.'),
  growth: z.number().min(0.6).max(4).describe('How late the covers grow: 1 is even, higher keeps them small longer and piles the big ones up at the end.'),
  turns: z.number().min(0.05).max(2).describe('How far the ring turns over the shot, in full turns.'),
  startAngle: z.number().describe('Where the smallest cover sits, in degrees clockwise from the top.'),
  turnStart: z.number().int().min(0).describe('Frame the ring starts turning.'),
  turnFrames: z.number().int().min(10).describe('Frames the turn takes, eased in and out.'),
  stagger: z.number().min(0).max(4).describe('Frames between one cover appearing and the next, round the ring.'),
  push: z.number().min(0).max(1).describe('How far the camera pushes into the biggest cover at the end (0.5 is 50 percent past the ring shot).'),
  rideZoom: z.number().min(1).max(5).describe('Zoom of the opening shot on the smallest covers.'),
  motionBlur: z.number().min(0).max(1).describe('Camera motion blur shutter in frames, used while the camera moves fast. 0 turns it off.'),
  title: z.string().describe('Small title at the bottom left. Empty for none.'),
  caption: z.string().describe('Smaller line under the title. Empty for none.'),
  font: z.string().describe('Google Fonts family for the label.'),
  colors: z.object({ ground: hex.describe('Background.'), ink: hex.describe('Title.'), muted: hex.describe('Caption.') }).describe('Colours.'),
});
export type CircleCarousel1Props = z.infer<typeof circleCarousel1Schema>;

export const circleCarousel1Defaults: CircleCarousel1Props = {
  images: DEFAULT_PHOTOS,
  count: 26,
  radius: 330,
  minSize: 6,
  maxSize: 250,
  growth: 2.2,
  turns: 0.45,
  startAngle: -125,
  turnStart: 122,
  turnFrames: 100,
  stagger: 3,
  push: 0,
  rideZoom: 2.3,
  motionBlur: 0,
  title: 'Circle Carousel',
  caption: 'Public-domain photographs, NASA',
  font: 'Geist',
  colors: { ground: '#ececef', ink: '#17171a', muted: '#7d7d85' },
};

export const CIRCLE1_DURATION = 270;

export const CircleCarousel1 = (p: CircleCarousel1Props) => {
  const f = useCurrentFrame();
  const font = useFont(p.font);
  const shiftAt = (t: number) => p.turns * prog(t, p.turnStart, p.turnStart + p.turnFrames, ease);
  const shift = shiftAt(f);
  // the ring's centre sits so the pile at the bottom stays in frame
  const ox = 60;
  const oy = 70;
  const size = (u: number) =>
    // rises from min to max over the first 84 percent of the ring, then folds back to min at the seam
    u <= 0.84 ? lerp(p.minSize, p.maxSize, Math.pow(u / 0.84, p.growth)) : lerp(p.minSize, p.maxSize, smooth((1 - u) / 0.16));
  const where = (u: number) => {
    const a = ((p.startAngle + u * 360) * Math.PI) / 180;
    return { x: Math.sin(a) * p.radius, y: -Math.cos(a) * p.radius, size: size(u) };
  };
  // beats: ride the sweep, pull out and show the ring, hold, push into the biggest cover
  const sweepEnd = 4 + p.count * p.stagger + 10;
  const pullA = sweepEnd - 8;
  const pullB = pullA + 34;
  const pushA = p.turnStart + p.turnFrames + 4;
  const camAt = chainCamera({
    count: p.count, stagger: p.stagger, where, shiftAt, rest: { cx: ox, cy: oy, zoom: 0.96 }, rideZoom: p.rideZoom, push: p.push,
    pullA, pullB, pushA, pushB: pushA + 36, roll: [-4, 3],
  });
  const c = camAt(f);
  const shutter = p.motionBlur > 0 ? shutterOf(camAt, f, 420, 14, p.motionBlur) : 0;
  return (
    <Layer id="root">
      <Ground color={p.colors.ground} />
      <Rig cx={c.cx} cy={c.cy} zoom={c.zoom} roll={c.roll} shutter={shutter}>
        <Chain
          frame={f}
          images={p.images}
          count={p.count}
          shift={shift}
          idPrefix="cc1"
          radius={3}
          stagger={p.stagger}
          shadow={1}
          place={(u) => {
            const w = where(u);
            return { x: w.x, y: w.y, rot: 0, size: w.size };
          }}
        />
      </Rig>
      <Label x={72} y={H - 130} title={p.title} sub={p.caption} font={font} ink={p.colors.ink} muted={p.colors.muted} opacity={ramp(f, pullB, pullB + 30, 0, 1)} />
    </Layer>
  );
};
