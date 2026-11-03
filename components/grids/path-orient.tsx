// Path-orient: cards ride a rounded triangle and turn to its tangent, so each swings through the corners like a car on
// a track. The camera chases the lead card low and close, banking with it through the corner (yaw follows the heading), holds on it with the focus landing, then cranes up and out in one motion-blurred move to the tilted view of the whole loop and settles with the focus still on the leader.
//
// Principles: arcs and follow-through (the turn at a corner is the path's own curve, and the cards behind turn later),
// overlap (the leader leaves first), slow in and slow out, staging, solid drawing.

import React from 'react';
import { z } from 'zod';
import { useCurrentFrame } from '@kinetographdev/core';
import { Stage, camDrift, commonDefaults, commonShape, lerp, projectPoint, ramp, shutterFor, themeOf, type Cam, type V3 } from './kit.js';
import { makeCurve, PATH_SHAPES } from './curves.js';
import { buildTrain, PathLine } from './train.js';

export const pathOrientSchema = z.object({
  ...commonShape,
  shape: z.enum(PATH_SHAPES as [string, ...string[]]).describe('The curve the cards follow.'),
  count: z.number().int().min(3).max(24).describe('Cards on the path.'),
  size: z.number().min(300).max(1600).describe('Half width of the curve, world px.'),
  cardWidth: z.number().min(60).max(600).describe('Card width, world px.'),
  cardHeight: z.number().min(60).max(700).describe('Card height, world px.'),
  turns: z.number().min(0.1).max(3).describe('Slots the train advances in the move (1 = one card position).'),
  follow: z.number().min(0).max(1).describe('How far each card turns to the tangent: 0 keeps it upright, 1 follows the path fully.'),
  lag: z.number().min(0).max(8).describe('Frames each card sets off after the one ahead.'),
  showLine: z.boolean().describe('Draw the path as a hairline under the cards. Off by default.'),
  orbit: z.number().min(0).max(50).describe('Degrees the camera turns about the path.'),
  distance: z.number().min(600).max(6000).describe('Eye distance of the wide shot after the crane.'),
  chaseDistance: z.number().min(300).max(3000).describe('Eye distance while chasing the lead card.'),
  motionBlur: z.number().min(0).max(1).describe('Camera motion blur shutter in frames, used while the camera moves fast. 0 turns it off.'),
});
export type PathOrientProps = z.infer<typeof pathOrientSchema>;

export const pathOrientDefaults: PathOrientProps = {
  ...commonDefaults,
  caption: 'Path orient',
  shape: 'triangle',
  count: 9,
  size: 1500,
  cardWidth: 320,
  cardHeight: 240,
  turns: 1.5,
  follow: 1,
  lag: 2,
  showLine: false,
  orbit: 22,
  distance: 2550,
  chaseDistance: 1150,
  motionBlur: 0,
};

export const PATH_ORIENT_DURATION = 240;

const io = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export const PathOrient: React.FC<Partial<PathOrientProps>> = (partial) => {
  const p = { ...pathOrientDefaults, ...partial };
  const f = useCurrentFrame();
  const curve = makeCurve(p.shape as 'triangle', p.size, 160);
  const train = (t: number) =>
    buildTrain(t, {
      curve, count: p.count, cardWidth: p.cardWidth, cardHeight: p.cardHeight, travel: curve.closed ? p.turns / p.count : 0.3,
      start: 30, lag: p.lag, span: 140, follow: p.follow, offsetDeg: 0,
    });
  const items = train(f);
  const leadPos = (t: number): V3 => train(t)[p.count - 1]!.pos;
  const craneA = 112;
  const craneB = 168;
  const camAt = (t: number): Cam => {
    const c = ramp(t, craneA, craneB, io);
    const over = 1 + 0.04 * Math.sin(ramp(t, craneB - 8, craneB + 26, (x) => x) * Math.PI) * (t > craneB - 8 ? 1 : 0);
    const dip = Math.sin(ramp(t, craneA - 16, craneA, (x) => x) * Math.PI) * (t < craneA ? 1 : 0);
    const a = leadPos(t - 3);
    const b = leadPos(t + 3);
    const lead = leadPos(t);
    // the heading of the leader: the camera banks and yaws with it through the corner
    const heading = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
    const tgt: V3 = [lerp(lead[0], 0, c), lerp(lead[1], 20, c), 0];
    return {
      yaw: lerp(-8 + 0.18 * heading, -6, c),
      pitch: lerp(-6, -24, c) + dip * 2.5,
      roll: lerp(-0.12 * heading, 0, c),
      dist: lerp(p.chaseDistance, p.distance, c) * over + dip * 70,
      focal: 1700,
      target: tgt,
      pan: [0, 0],
    };
  };
  const dd = camDrift(f, p.drift * 0.6);
  const cam = camAt(f);
  cam.yaw += dd.yaw;
  cam.roll += dd.roll;
  cam.pan = dd.pan;
  // the leader is the subject, sharp from start to end
  const focus = projectPoint(leadPos(f), cam).dist;
  const shutter = p.motionBlur > 0 ? shutterFor(camAt, f, [leadPos(f), [0, 0, 0], [p.size * 0.6, 0, 0]], 8, p.motionBlur) : 0;
  const theme = themeOf(p.colors);
  return (
    <Stage
      cam={cam}
      items={items}
      photos={p.photos}
      look={{ focus, aperture: p.aperture, fogStart: cam.dist * 1.1, fogLen: cam.dist * 0.8, fogMax: 0.5, radius: p.radius }}
      theme={theme}
      hud={{ caption: p.caption, showHud: p.showHud }}
      shutter={shutter}
      under={p.showLine ? <PathLine curve={curve} cam={cam} f={f} a={0} b={44} color={theme.ink} /> : null}
    />
  );
};
