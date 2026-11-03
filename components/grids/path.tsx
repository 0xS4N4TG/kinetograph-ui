// Path: a string of photos along a curve in space, every card turned to face the lens. The camera rides the path like a
// dolly: it starts behind the first card, off to one side and a little above the line, and flies along it looking at the
// card ahead, so the curve bends away in front of it with real parallax and each card swells and passes. Cards open
// just ahead of the camera as it reaches them. It slows into the lead card, holds on it with the focus landing, then
// cranes up and out in one move (motion blur on the whip) to show the whole curve, and settles with the focus on the lead.
//
// Principles: staging (the lead card is the subject at both ends), follow-through (the crane overshoots and settles),
// anticipation (a small dip before the crane), slow in and slow out, arcs (the ride and the crane are curves),
// solid drawing (one perspective; cards billboarded), overlap (cards open as the camera nears them).

import React from 'react';
import { z } from 'zod';
import { useCurrentFrame } from '@kinetographdev/core';
import { Stage, camDrift, commonDefaults, commonShape, lookFrom, out, projectPoint, rack, ramp, shutterFor, themeOf, track, type Cam, type Item, type V3 } from './kit.js';
import { makeCurve, sample, PATH_SHAPES } from './curves.js';
import { PathLine } from './train.js';

export const pathSchema = z.object({
  ...commonShape,
  shape: z.enum(PATH_SHAPES as [string, ...string[]]).describe('The curve: wave (open, swings in depth), triangle, square or infinity (closed).'),
  count: z.number().int().min(2).max(24).describe('Cards on the path.'),
  size: z.number().min(300).max(1600).describe('Half width of the curve, world px.'),
  depth: z.number().min(0).max(1200).describe('How far the curve swings toward and away from the camera, world px.'),
  cardWidth: z.number().min(60).max(600).describe('Card width, world px.'),
  cardHeight: z.number().min(60).max(700).describe('Card height, world px.'),
  travel: z.number().min(0).max(1).describe('How far the train moves, as a fraction of the curve.'),
  lag: z.number().min(0).max(8).describe('Frames each card sets off after the one ahead.'),
  showLine: z.boolean().describe('Draw the path as a hairline under the cards. Off by default.'),
  truck: z.number().min(0).max(2000).describe('Unused; kept for older settings.'),
  swing: z.number().min(0).max(40).describe('Unused; kept for older settings.'),
  distance: z.number().min(600).max(6000).describe('Eye distance of the wide shot at the end of the crane.'),
  rideSide: z.number().min(0).max(1500).describe('How far to the side of the line the camera rides, world px.'),
  rideBehind: z.number().min(0.02).max(0.4).describe('How far behind the lead card the camera is, as a fraction of the curve.'),
  craneHeight: z.number().min(0).max(3000).describe('How far the camera lifts for the wide shot, world px.'),
  motionBlur: z.number().min(0).max(1).describe('Camera motion blur shutter in frames, used while the camera moves fast. 0 turns it off.'),
});
export type PathProps = z.infer<typeof pathSchema>;

export const pathDefaults: PathProps = {
  ...commonDefaults,
  caption: 'Path',
  shape: 'wave',
  count: 11,
  size: 1100,
  depth: 520,
  cardWidth: 310,
  cardHeight: 390,
  travel: 0.62,
  lag: 3,
  showLine: false,
  truck: 520,
  swing: 14,
  distance: 3300,
  rideSide: 520,
  rideBehind: 0.1,
  craneHeight: 800,
  motionBlur: 0,
};

export const PATH_DURATION = 240;

export const PathGrid: React.FC<Partial<PathProps>> = (partial) => {
  const p = { ...pathDefaults, ...partial };
  const f = useCurrentFrame();
  const curve = makeCurve(p.shape as 'wave', p.size, p.depth);
  // beats
  const rideEnd = 124; // camera reaches its place behind the lead card
  const craneA = 150; // the dip, then the crane
  const craneB = 208;
  const spacing = 0.88 / Math.max(1, p.count - 1);
  const uAt = (i: number) => 0.05 + i * spacing;
  // the lead card is the one the ride ends behind
  const lead = Math.max(1, Math.min(p.count - 1, Math.round((p.travel - 0.05) / spacing)));
  const leadU = uAt(lead);
  const items: Item[] = [];
  const camAt = (t: number): Cam => {
    // camera along the curve: eased ride, quick start, long arrival
    const k = ramp(t, 4, rideEnd, (x) => 1 - Math.pow(1 - x, 2.2));
    const uc = (leadU - p.rideBehind) * k - 0.02 * (1 - k);
    const ride = sample(curve, uc);
    const ahead = sample(curve, Math.min(0.995, uc + 0.07 + 0.04 * (1 - k)));
    const lookAt = sample(curve, Math.min(0.995, uc + p.rideBehind + 0.02 * (1 - k)));
    // sideways of the path (its normal in the ground plane)
    const tx = ride.t[0];
    const tz = ride.t[2];
    const l = Math.hypot(tx, tz) || 1;
    const nx = tz / l;
    const nz = -tx / l;
    const side = p.rideSide * (1 - 0.55 * ramp(t, 60, rideEnd));
    const eyeRide: V3 = [ride.p[0] + nx * side * 0.0 + 0, ride.p[1] - 110 + 0, ride.p[2] + 1150 + side * 0.25];
    void nz;
    void ahead;
    // the crane: eye lifts and swings out to the front, the target slides to the middle of the curve
    const c = ramp(t, craneA, craneB, (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2));
    const dipT = ramp(t, craneA - 14, craneA, (x) => x) * (1 - ramp(t, craneA, craneA + 8, (x) => x));
    const midU: V3 = [0, -40, 0];
    const tgt: V3 = [lookAt.p[0] + (midU[0] - lookAt.p[0]) * c + dipT * 20, lookAt.p[1] + (midU[1] - lookAt.p[1]) * c, lookAt.p[2] + (midU[2] - lookAt.p[2]) * c];
    const eyeWide: V3 = [tgt[0] + 0.0, tgt[1] - p.craneHeight, tgt[2] + p.distance];
    const over = 1 + 0.035 * Math.sin(Math.min(1, ramp(t, craneB - 6, craneB + 22, (x) => x)) * Math.PI);
    const e: V3 = [eyeRide[0] + (eyeWide[0] - eyeRide[0]) * c * over, eyeRide[1] + (eyeWide[1] - eyeRide[1]) * c * over, eyeRide[2] + (eyeWide[2] - eyeRide[2]) * c * over - dipT * 90];
    const L = lookFrom(e, tgt);
    return {
      yaw: L.yaw,
      pitch: L.pitch,
      roll: track(t, [[0, 3], [rideEnd, -1], [craneA + 20, 2.5], [craneB + 10, 0]]),
      dist: L.dist,
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
  const eyeFocusLead = projectPoint(sample(curve, leadU).p, cam).dist;
  for (let i = 0; i < p.count; i += 1) {
    const u = uAt(i);
    const { p: pos } = sample(curve, u);
    // a card opens as the camera nears it (progress of the ride past u - 0.2), all open by the crane
    const kRide = ramp(f, 4, rideEnd, (x) => 1 - Math.pow(1 - x, 2.2)) * (leadU - p.rideBehind);
    const open = Math.max(ramp(f, craneA - 20, craneA + 10), ramp(kRide - (u - 0.19), 0, 0.09, out));
    items.push({ key: i, pos, orient: 'camera', photo: i, w: p.cardWidth, h: p.cardHeight, opacity: open, scale: 0.82 + 0.18 * open, shade: i === lead ? 0 : 0.28 * ramp(f, craneB - 20, craneB + 10) });
  }
  const wideD = projectPoint(sample(curve, leadU).p, cam).dist;
  // focus follows the nearest card ahead on the ride, lands on the lead as the ride ends, and stays on it through the crane
  const focus = Math.max(300, eyeFocusLead);
  void wideD;
  const probes: V3[] = [sample(curve, 0.2).p, sample(curve, 0.5).p, sample(curve, leadU).p, sample(curve, 0.8).p];
  const shutter = p.motionBlur > 0 ? shutterFor(camAt, f, probes, 8, p.motionBlur) : 0;
  const theme = themeOf(p.colors);
  return (
    <Stage
      cam={cam}
      items={items}
      photos={p.photos}
      look={{ focus: rack(f, rideEnd - 20, rideEnd, Math.max(500, projectPoint(sample(curve, Math.min(0.99, leadU - 0.1)).p, cam).dist), focus), aperture: p.aperture, fogStart: cam.dist * 1.1, fogLen: cam.dist * 1.2, fogMax: 0.6, radius: p.radius, near: 300 }}
      theme={theme}
      hud={{ caption: p.caption, showHud: p.showHud }}
      shutter={shutter}
      total={p.count}
      under={p.showLine ? <PathLine curve={curve} cam={cam} f={f} a={0} b={44} color={theme.ink} /> : null}
    />
  );
};
