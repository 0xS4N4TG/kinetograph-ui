// Rectangular grid: a wall of photos on one plane. The shot opens full frame on a single photo, pulls back as the wall
// assembles round it (each ring of cards lands as the pull reaches it), holds on the whole wall, winds up with a small
// move away, then whip-pans with motion blur to a second hero that steps forward out of the wall and takes the focus
// as the camera lands on it, with an overshoot and a settle.
//
// Principles: staging (hero, wall, second hero), anticipation (the wind-up before the whip), slow in and slow out,
// overlap (the ripple is staggered by distance from the middle), arcs (the whip is a truck with a yaw swing),
// overshoot and settle, solid drawing (one perspective, fog and depth of field agree), holds.

import React from 'react';
import { z } from 'zod';
import { Stage, commonDefaults, commonShape, camDrift, themeOf, track, ramp, out, shutterFor, projectPoint, rack, type Cam, type Item, type V3 } from './kit.js';
import { useCurrentFrame } from '@kinetographdev/core';

export const rectangularSchema = z.object({
  ...commonShape,
  cols: z.number().int().min(1).max(15).describe('Cards across.'),
  rows: z.number().int().min(1).max(11).describe('Cards down.'),
  cardWidth: z.number().min(60).max(900).describe('Card width, world px (1:1 at the focal distance).'),
  cardHeight: z.number().min(60).max(900).describe('Card height, world px.'),
  gap: z.number().min(0).max(200).describe('Space between cards, world px.'),
  stagger: z.number().min(0).max(8).describe('Frames of delay per card of distance from the middle, for the ripple in.'),
  startDistance: z.number().min(300).max(4000).describe('Eye distance of the opening shot (a single card fills the frame at about 1000).'),
  endDistance: z.number().min(300).max(6000).describe('Eye distance of the wide shot.'),
  orbit: z.number().min(0).max(40).describe('Degrees the camera turns about the wall for the wide shot and the truck.'),
  truck: z.number().min(0).max(1500).describe('World px the camera slides sideways for the last move.'),
  tilt: z.number().min(0).max(30).describe('Degrees the camera looks down on the wall in the wide shot.'),
  hold: z.number().int().min(0).max(120).describe('Frames the opening shot holds before the pull back.'),
  heroCol: z.number().int().min(-7).max(7).describe('Columns from the middle of the second hero.'),
  heroRow: z.number().int().min(-5).max(5).describe('Rows from the middle of the second hero.'),
  motionBlur: z.number().min(0).max(1).describe('Camera motion blur shutter in frames, used while the camera moves fast. 0 turns it off.'),
});
export type RectangularProps = z.infer<typeof rectangularSchema>;

export const rectangularDefaults: RectangularProps = {
  ...commonDefaults,
  caption: 'Rectangular',
  cols: 9,
  rows: 5,
  cardWidth: 320,
  cardHeight: 410,
  gap: 44,
  stagger: 2.6,
  startDistance: 800,
  endDistance: 3800,
  orbit: 14,
  truck: 720,
  tilt: 10,
  hold: 14,
  aperture: 0,
  heroCol: 3,
  heroRow: 1,
  motionBlur: 0,
};

export const RECT_DURATION = 216;

export const Rectangular: React.FC<Partial<RectangularProps>> = (partial) => {
  const p = { ...rectangularDefaults, ...partial };
  const f = useCurrentFrame();
  const { cols, rows } = p;
  const px = p.cardWidth + p.gap;
  const py = p.cardHeight + p.gap;
  const cc = (cols - 1) / 2;
  const cr = (rows - 1) / 2;
  // beats
  const h0 = p.hold; // opening hold
  const pullEnd = h0 + 78; // wall fully pulled back
  const windA = pullEnd + 26; // anticipation starts
  const whipA = windA + 12; // whip starts
  const whipB = whipA + 17; // whip lands
  const settle = whipB + 26;
  const heroX = p.heroCol * px;
  const heroY = p.heroRow * py;
  const items: Item[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const dc = c - cc;
      const dr = r - cr;
      const d = Math.hypot(dc, dr * 1.2);
      const isHero1 = dc === 0 && dr === 0;
      const isHero2 = dc === p.heroCol - cc + cc - 0 && false;
      const second = c - cc === p.heroCol && r - cr === p.heroRow;
      // each ring lands as the pull reaches it
      const t0 = h0 + 4 + d * p.stagger * 1.3;
      const a = isHero1 ? 1 : ramp(f, t0, t0 + 24, out);
      // the second hero steps forward as the whip arrives; the rest of the wall sits back from it
      const lift = second ? 240 * ramp(f, whipA + 6, whipB + 8, out) : 0;
      const back = -260 * ramp(f, whipA + 4, whipB + 8, out) * (second ? 0 : 1);
      void isHero2;
      items.push({
        key: r * cols + c,
        pos: [dc * px, dr * py, -(1 - a) * 420 + lift + back],
        photo: (r * cols + c + (cols * rows - Math.floor(cols * rows / 2))) % 24,
        w: p.cardWidth,
        h: p.cardHeight,
        opacity: a,
        scale: 0.9 + 0.1 * a,
        shade: (second ? 0 : 0.5 * ramp(f, whipA + 8, settle)) + (isHero1 ? 0 : 0.0),
      });
    }
  }
  const dd = camDrift(f, p.drift * 0.6);
  const close = p.startDistance;
  const camAt = (t: number): Cam => ({
    yaw:
      track(t, [[0, 0], [h0, 0], [pullEnd, -p.orbit * 0.5], [pullEnd + 24, -p.orbit * 0.35], [windA, -p.orbit * 0.3], [windA + 10, -p.orbit * 0.5], [whipA + 8, p.orbit * 0.9], [whipB + 6, -p.orbit * 0.12], [settle, 0]]),
    pitch: track(t, [[0, 0], [h0, 0], [pullEnd, p.tilt], [windA, p.tilt * 0.8], [whipB, 1], [settle, 0]]),
    roll: track(t, [[0, -1.8], [h0 + 30, 0.4], [windA, 0.6], [whipA + 8, -2.6], [whipB + 6, 0.5], [settle, 0]]),
    dist: track(
      t,
      [[0, close], [h0, close * 0.99], [pullEnd - 6, p.endDistance * 1.03], [pullEnd + 12, p.endDistance], [windA + 10, p.endDistance * 1.04], [whipB - 4, close * 1.45], [whipB + 6, close * 1.05 + 40], [settle, close * 1.32]],
    ),
    focal: 1700,
    target: [
      track(t, [[0, 0], [pullEnd + 10, 0], [windA + 10, -px * 0.35], [whipB - 2, heroX + px * 0.05], [whipB + 8, heroX - 22], [settle, heroX]]),
      track(t, [[0, 0], [pullEnd + 10, 0], [windA + 10, py * 0.1], [whipB - 2, heroY], [settle, heroY]]),
      0,
    ],
    pan: [0, 0],
  });
  const cam = camAt(f);
  cam.pan = dd.pan;
  cam.roll += dd.roll;
  // focus: the middle card, then the plane of the wall, then the second hero as the whip lands on it
  const heroPos: V3 = [heroX, heroY, 240];
  const wallD = cam.dist;
  const focus = rack(f, whipB - 4, whipB + 6, wallD, projectPoint(heroPos, cam).dist);
  const probes: V3[] = [[0, 0, 0], [px * 2, 0, 0], [0, py * 1.5, 0], [heroX, heroY, 0]];
  const shutter = p.motionBlur > 0 ? shutterFor(camAt, f, probes, 8, p.motionBlur) : 0;
  return (
    <Stage
      cam={cam}
      items={items}
      photos={p.photos}
      look={{ focus, aperture: p.aperture, fogStart: wallD * 1.4, fogLen: wallD * 1.2, fogMax: 0.55, radius: p.radius }}
      theme={themeOf(p.colors)}
      hud={{ caption: p.caption, showHud: p.showHud }}
      shutter={shutter}
    />
  );
};
