// Center-orient: a grid of photos where each card turns to point at the middle. The shot opens full frame on the centre
// card; as the twist travels outward the camera pulls back and rolls to keep the wave's edge in frame (a spiral out),
// holds on the rosette, winds up, and dives back to the middle where every card points, landing with an overshoot and
// the focus on the centre card (motion blur on the dive).
//
// Principles: overlap and follow-through (the twist travels outward and each card settles after its neighbour),
// slow in and slow out, exaggeration (the final rosette is the key pose; the in-between is quick), staging (the
// centre is the anchor that never moves), arcs (the roll and push are one curve).

import React from 'react';
import { z } from 'zod';
import { useCurrentFrame } from '@kinetographdev/core';
import { Stage, camDrift, commonDefaults, commonShape, out, ramp, rotZ, themeOf, track, type Cam, type Item , lerp, shutterFor, projectPoint, type V3 } from './kit.js';

export const centerOrientSchema = z.object({
  ...commonShape,
  cols: z.number().int().min(3).max(15).describe('Cards across (an odd number keeps a card at the centre).'),
  rows: z.number().int().min(3).max(11).describe('Cards down (odd keeps a card at the centre).'),
  cardSize: z.number().min(60).max(500).describe('Card edge, world px (cards are square so the rosette stays even).'),
  gap: z.number().min(0).max(160).describe('Space between card centres beyond the card size, world px.'),
  stagger: z.number().min(0).max(8).describe('Frames of delay per card of distance from the centre, for the twist to travel outward.'),
  bowl: z.number().min(0).max(120).describe('World px each ring of cards sits further back, so the rosette has depth.'),
  roll: z.number().min(0).max(40).describe('Degrees the camera rolls over the move.'),
  startDistance: z.number().min(600).max(6000).describe('Eye distance at the start.'),
  endDistance: z.number().min(400).max(6000).describe('Eye distance at the end of the dive.'),
  motionBlur: z.number().min(0).max(1).describe('Camera motion blur shutter in frames, used while the camera moves fast. 0 turns it off.'),
});
export type CenterOrientProps = z.infer<typeof centerOrientSchema>;

export const centerOrientDefaults: CenterOrientProps = {
  ...commonDefaults,
  caption: 'Center orient',
  cols: 9,
  rows: 7,
  cardSize: 160,
  gap: 36,
  stagger: 3,
  bowl: 40,
  roll: 26,
  startDistance: 2300,
  endDistance: 760,
  aperture: 0,
  motionBlur: 0,
};

export const CENTER_DURATION = 240;

export const CenterOrient: React.FC<Partial<CenterOrientProps>> = (partial) => {
  const p = { ...centerOrientDefaults, ...partial };
  const f = useCurrentFrame();
  const pitch = p.cardSize + p.gap;
  const cc = (p.cols - 1) / 2;
  const cr = (p.rows - 1) / 2;
  const items: Item[] = [];
  for (let r = 0; r < p.rows; r += 1) {
    for (let c = 0; c < p.cols; c += 1) {
      const dx = (c - cc) * pitch;
      const dy = (r - cr) * pitch;
      const d = Math.hypot(c - cc, r - cr);
      const appear = ramp(f, 6 + d * 3.2, 6 + d * 3.2 + 24, out);
      const twist = ramp(f, 22 + d * p.stagger, 22 + d * p.stagger + 40);
      const ang = d === 0 ? 0 : (Math.atan2(dy, dx) * 180) / Math.PI;
      items.push({
        key: r * p.cols + c,
        pos: [dx, dy, -d * p.bowl * (0.4 + 0.6 * twist)],
        orient: rotZ(ang * twist),
        photo: r * p.cols + c,
        w: p.cardSize,
        h: p.cardSize,
        opacity: appear,
        scale: 0.8 + 0.2 * appear,
      });
    }
  }
  const reach = Math.hypot(cc, cr);
  const pullA = 18;
  const pullB = 22 + reach * p.stagger + 52; // the twist has reached the corners
  const diveA = pullB + 34;
  const diveB = diveA + 40;
  const io = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const camAt = (t: number): Cam => {
    const pull = ramp(t, pullA, pullB, io);
    const wind = Math.sin(ramp(t, diveA - 14, diveA, (x) => x) * Math.PI) * (t < diveA ? 1 : 0);
    const dive = ramp(t, diveA, diveB, (x) => 1 - Math.pow(1 - x, 3));
    const over = 1 - 0.05 * Math.sin(ramp(t, diveB - 6, diveB + 22, (x) => x) * Math.PI) * (t > diveB - 6 ? 1 : 0);
    return {
      yaw: 0,
      pitch: 0,
      roll: lerp(-4, p.roll * 0.5, pull) + p.roll * 0.5 * dive,
      dist: lerp(lerp(900, p.startDistance, pull), p.endDistance, dive) * over + wind * 140,
      focal: 1700,
      target: [0, 0, 0],
      pan: [0, 0],
    };
  };
  const dd = camDrift(f, p.drift * 0.5);
  const cam = camAt(f);
  cam.roll += dd.roll;
  cam.pan = dd.pan;
  // the centre card is the subject: sharp always; the rosette falls into the bowl behind it
  const focus = cam.dist;
  const shutter = p.motionBlur > 0 ? shutterFor(camAt, f, [[0, 0, 0], [pitch * 2, 0, 0], [0, pitch * 2, 0]], 8, p.motionBlur) : 0;
  return (
    <Stage
      cam={cam}
      items={items}
      photos={p.photos}
      look={{ focus, aperture: p.aperture, fogStart: cam.dist * 1.1, fogLen: cam.dist * 0.9, fogMax: 0.6, radius: p.radius }}
      theme={themeOf(p.colors)}
      hud={{ caption: p.caption, showHud: p.showHud }}
      shutter={shutter}
    />
  );
};
