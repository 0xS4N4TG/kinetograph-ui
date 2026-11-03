// Forward-orient: cards lie on a turntable ring and each turns to face along the direction it travels, so they swing
// round like cars on a roundabout. The plate is tilted toward us; near cards are big and sharp, far ones small and soft.
// The camera starts low and close, riding with the first card as the ring turns, holds, then cranes up and pulls out in
// one motion-blurred move to the tilted view of the whole plate, settling past its mark and back, with the focus on the
// riding card the whole way (the hero is never blurred; the ring falls away behind it).
//
// Principles: arcs, slow in and slow out, solid drawing (one perspective, depth of field and fog agree), staging
// (soft focus rests on the near card), secondary action (the camera orbit and the drift), overlap (cards arrive one
// after another round the ring).

import React from 'react';
import { z } from 'zod';
import { useCurrentFrame } from '@kinetographdev/core';
import { Stage, camDrift, commonDefaults, commonShape, mul, out, ramp, rotX, rotZ, apply, themeOf, track, type Cam, type Item , lerp, lookFrom, projectPoint, shutterFor, type V3 } from './kit.js';

export const forwardOrientSchema = z.object({
  ...commonShape,
  count: z.number().int().min(3).max(24).describe('Cards on the ring.'),
  radius3d: z.number().min(200).max(1600).describe('Radius of the ring, world px.'),
  cardWidth: z.number().min(60).max(700).describe('Card width, world px. The long side runs along the direction of travel.'),
  cardHeight: z.number().min(60).max(700).describe('Card height, world px.'),
  tilt: z.number().min(0).max(85).describe('Degrees the plate tips away from the screen (0 faces us, 90 is edge on).'),
  revolution: z.number().min(30).max(720).describe('Degrees the ring turns in the move.'),
  direction: z.enum(['clockwise', 'counterclockwise']).describe('Which way the ring turns.'),
  orbit: z.number().min(0).max(70).describe('Degrees the camera orbits.'),
  distance: z.number().min(600).max(6000).describe('Eye distance of the wide shot after the crane.'),
  chaseDistance: z.number().min(300).max(3000).describe('Eye distance while riding with the first card.'),
  motionBlur: z.number().min(0).max(1).describe('Camera motion blur shutter in frames, used while the camera moves fast. 0 turns it off.'),
});
export type ForwardOrientProps = z.infer<typeof forwardOrientSchema>;

export const forwardOrientDefaults: ForwardOrientProps = {
  ...commonDefaults,
  caption: "Forward orient",
  aperture: 0,
  count: 10,
  radius3d: 700,
  cardWidth: 400,
  cardHeight: 270,
  tilt: 40,
  revolution: 216,
  direction: 'clockwise',
  orbit: 34,
  distance: 2900,
  chaseDistance: 1150,
  motionBlur: 0,
};

export const FORWARD_DURATION = 240;

const io = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export const ForwardOrient: React.FC<Partial<ForwardOrientProps>> = (partial) => {
  const p = { ...forwardOrientDefaults, ...partial };
  const f = useCurrentFrame();
  const dir = p.direction === 'clockwise' ? 1 : -1;
  const plate = rotX(p.tilt);
  const turnAt = (t: number) => dir * p.revolution * ramp(t, 20, FORWARD_DURATION - 24);
  const cardPos = (i: number, t: number, a = 1): V3 => {
    const rad = ((-90 + (360 * i) / p.count + turnAt(t)) * Math.PI) / 180;
    const rr = p.radius3d * (0.2 + 0.8 * a);
    return apply(plate, [rr * Math.cos(rad), rr * Math.sin(rad), 0]);
  };
  const items: Item[] = [];
  for (let i = 0; i < p.count; i += 1) {
    const a = ramp(f, 4 + i * 3, 4 + i * 3 + 30, out);
    const deg = -90 + (360 * i) / p.count + turnAt(f);
    items.push({
      key: i,
      pos: cardPos(i, f, a),
      orient: mul(plate, rotZ(deg + 90 * dir + (dir < 0 ? 180 : 0))),
      photo: i,
      w: p.cardWidth,
      h: p.cardHeight,
      opacity: a,
      scale: 0.7 + 0.3 * a,
    });
  }
  // beats: ride with card 0 (low, close), hold, a small dip, crane up and out, settle
  const craneA = 104;
  const craneB = 160;
  const camAt = (t: number): Cam => {
    const c = ramp(t, craneA, craneB, io);
    const over = 1 + 0.04 * Math.sin(ramp(t, craneB - 8, craneB + 26, (x) => x) * Math.PI) * (t > craneB - 8 ? 1 : 0);
    const dip = Math.sin(ramp(t, craneA - 16, craneA, (x) => x) * Math.PI) * (t < craneA ? 1 : 0);
    const hero = cardPos(0, t);
    const tgt: V3 = [lerp(hero[0], 0, c), lerp(hero[1], 0, c), lerp(hero[2], 0, c)];
    return {
      yaw: lerp(-26, 24, io(ramp(t, 0, craneB))) + dip * 3,
      pitch: lerp(4, -30, c) + dip * 3,
      roll: lerp(-4, 1, c),
      dist: lerp(p.chaseDistance * (1 - 0.08 * ramp(t, 0, craneA, (x) => x)), p.distance * 0.97, c) * over + dip * 70 - 80 * ramp(t, craneB + 30, FORWARD_DURATION - 1),
      focal: 1700,
      target: tgt,
      pan: [0, 0],
    };
  };
  const dd = camDrift(f, p.drift * 0.7);
  const cam = camAt(f);
  cam.yaw += dd.yaw;
  cam.roll += dd.roll;
  cam.pan = dd.pan;
  // the riding card keeps the focus; the cards behind it fall away
  const focus = projectPoint(cardPos(0, f), cam).dist;
  const shutter = p.motionBlur > 0 ? shutterFor(camAt, f, [[0, 0, 0], [p.radius3d, 0, 0], [0, p.radius3d, 0]], 8, p.motionBlur) : 0;
  return (
    <Stage
      cam={cam}
      items={items}
      photos={p.photos}
      look={{ focus, aperture: p.aperture, fogStart: cam.dist * 1.0, fogLen: p.radius3d * 2.6, fogMax: 0.5, radius: p.radius }}
      theme={themeOf(p.colors)}
      hud={{ caption: p.caption, showHud: p.showHud }}
      shutter={shutter}
    />
  );
};
