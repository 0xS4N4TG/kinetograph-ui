// Face-screen: a carousel of photos on a horizontal ring, every card turned to face the screen however the ring
// turns. The ring steps round one card at a time, each step slow in and slow out with a hold, near cards big and
// sharp, far ones small, dim and soft; the camera starts high and wide and comes down to eye level over the first steps, each step is followed by the camera a beat late (it yaws against the turn and catches up), the last step winds up with a small pull back and then pushes onto the front card, which lands with an overshoot and the focus on it (motion blur on the steps and the push).
//
// Principles: anticipation and holds (each step is a short ease in, a move and a settle, then a beat to read),
// slow in and slow out, solid drawing (depth sorts, scales and blurs agree), staging (the front card is the subject),
// arcs (cards ride a circle seen as an ellipse), restraint (one move at a time).

import React from 'react';
import { z } from 'zod';
import { useCurrentFrame } from '@kinetographdev/core';
import { Stage, camDrift, commonDefaults, commonShape, lerp, out, ramp, shutterFor, themeOf, track, type Cam, type Item, type V3 } from './kit.js';

export const faceScreenSchema = z.object({
  ...commonShape,
  count: z.number().int().min(3).max(24).describe('Cards on the ring.'),
  radius3d: z.number().min(200).max(2000).describe('Radius of the ring, world px.'),
  cardWidth: z.number().min(60).max(700).describe('Card width, world px.'),
  cardHeight: z.number().min(60).max(800).describe('Card height, world px.'),
  steps: z.number().int().min(1).max(8).describe('How many cards the ring advances, one at a time with a hold between.'),
  stepFrames: z.number().int().min(10).max(90).describe('Frames each step takes.'),
  holdFrames: z.number().int().min(0).max(90).describe('Frames the ring rests between steps.'),
  lift: z.number().min(0).max(45).describe('Degrees the camera looks down on the ring at the high point.'),
  distance: z.number().min(800).max(7000).describe('Eye distance at the start; it closes in by about a quarter.'),
  motionBlur: z.number().min(0).max(1).describe('Camera motion blur shutter in frames, used while the ring or the camera moves fast. 0 turns it off.'),
  tiltCards: z.number().min(0).max(30).describe('Degrees each card leans back from the screen plane (0 faces the screen exactly).'),
});
export type FaceScreenProps = z.infer<typeof faceScreenSchema>;

export const faceScreenDefaults: FaceScreenProps = {
  ...commonDefaults,
  caption: 'Face screen',
  count: 16,
  radius3d: 1250,
  cardWidth: 330,
  cardHeight: 420,
  steps: 3,
  stepFrames: 40,
  holdFrames: 22,
  lift: 12,
  distance: 3200,
  tiltCards: 0,
  motionBlur: 0,
  aperture: 0,
};

export const faceDuration = (p: Pick<FaceScreenProps, 'steps' | 'stepFrames' | 'holdFrames'>) => 30 + p.steps * (p.stepFrames + p.holdFrames) + 50;
export const FACE_DURATION = faceDuration(faceScreenDefaults);

const io = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export const FaceScreen: React.FC<Partial<FaceScreenProps>> = (partial) => {
  const p = { ...faceScreenDefaults, ...partial };
  const f = useCurrentFrame();
  const total = faceDuration(p) + 30;
  const slot = 360 / p.count;
  const stepStart = (s: number) => 30 + s * (p.stepFrames + p.holdFrames);
  const spinAt = (t: number) => {
    let spin = 0;
    for (let s = 0; s < p.steps; s += 1) spin += slot * ramp(t, stepStart(s), stepStart(s) + p.stepFrames);
    return spin;
  };
  // the ring's speed, as a share of its fastest, to lag the camera behind each step
  const speedAt = (t: number) => (spinAt(t + 1) - spinAt(t - 1)) / 2 / (slot / p.stepFrames * 1.8);
  const items: Item[] = [];
  for (let i = 0; i < p.count; i += 1) {
    const a = ramp(f, 2 + i * 2.2, 2 + i * 2.2 + 28, out);
    const ang = (((360 * i) / p.count - spinAt(f)) * Math.PI) / 180;
    const rr = p.radius3d * (0.3 + 0.7 * a);
    items.push({
      key: i,
      pos: [rr * Math.sin(ang), 0, rr * Math.cos(ang)],
      orient: 'camera',
      spin: 0,
      photo: i,
      w: p.cardWidth,
      h: p.cardHeight,
      opacity: a,
      scale: 0.75 + 0.25 * a,
    });
  }
  const lastA = stepStart(p.steps - 1);
  const pushA = lastA + p.stepFrames + 4;
  const pushB = pushA + 34;
  const closeD = p.radius3d + 980;
  const camAt = (t: number): Cam => {
    const wind = Math.sin(ramp(t, pushA - 16, pushA, (x) => x) * Math.PI) * (t < pushA ? 1 : 0);
    const push = ramp(t, pushA, pushB, (x) => 1 - Math.pow(1 - x, 3));
    const over = 1 - 0.04 * Math.sin(ramp(t, pushB - 4, pushB + 22, (x) => x) * Math.PI) * (t > pushB - 4 ? 1 : 0);
    const settle = ramp(t, 0, stepStart(1), io);
    const d0 = lerp(p.distance * 1.08, p.distance * 0.82, settle);
    return {
      yaw: lerp(-9, 3, ramp(t, 0, pushB)) - 3.2 * speedAt(t),
      pitch: lerp(-p.lift * 1.5, -p.lift * 0.25, settle) * (1 - push),
      roll: lerp(1.5, 0, settle) * (1 - push),
      dist: lerp(d0, closeD, push) * (t > pushB - 4 ? over : 1) + wind * 160,
      focal: 1700,
      target: [0, lerp(170, 0, push), 0],
      pan: [0, 0],
    };
  };
  const dd = camDrift(f, p.drift * 0.6);
  const cam = camAt(f);
  cam.yaw += dd.yaw;
  cam.roll += dd.roll;
  cam.pan = dd.pan;
  // the front card is the subject
  const focus = cam.dist - p.radius3d;
  const probes: V3[] = [[0, 0, p.radius3d], [p.radius3d, 0, 0], [-p.radius3d, 0, 0]];
  const ringMoving = Math.abs(speedAt(f)) > 0.45;
  const shutter = p.motionBlur > 0 ? Math.max(shutterFor(camAt, f, probes, 8, p.motionBlur), ringMoving ? p.motionBlur * 0.8 : 0) : 0;
  void total;
  return (
    <Stage
      cam={cam}
      items={items}
      photos={p.photos}
      look={{ focus, aperture: p.aperture, fogStart: cam.dist - p.radius3d * 0.4, fogLen: p.radius3d * 2.2, fogMax: 0.6, radius: p.radius }}
      theme={themeOf(p.colors)}
      hud={{ caption: p.caption, showHud: p.showHud }}
      shutter={shutter}
    />
  );
};
