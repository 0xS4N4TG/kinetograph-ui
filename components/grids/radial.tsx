// Radial: photos on concentric rings, a tunnel of cards seen straight down its axis. The rings open out from the middle
// one after another and step round in alternate directions under a long lens, the camera holds, winds up with a small
// pull the other way, then does a dolly zoom (vertigo): it moves in while the focal length shortens in step, so the middle
// ring stays the same size while the rings in front of it swell past and the ones behind drop away down the tunnel.
// The focus is on the nearest ring while the rings assemble and racks to the held ring as the dolly zoom lands.
//
// Principles: anticipation (the wind-up), overlap and follow-through (rings start apart and settle apart), slow in and
// slow out, overshoot and settle (the dolly zoom lands past its mark and eases back), staging (focus decides the
// subject), solid drawing (rings at different depths; the zoom changes the perspective, not the framing).

import React from 'react';
import { z } from 'zod';
import { useCurrentFrame } from '@kinetographdev/core';
import { Stage, camDrift, commonDefaults, commonShape, out, rack, ramp, shutterFor, themeOf, track, type Cam, type Item, type V3 } from './kit.js';

export const radialSchema = z.object({
  ...commonShape,
  count: z.number().int().min(3).max(90).describe('Cards in all, shared between the rings by circumference.'),
  rings: z.number().int().min(1).max(5).describe('How many concentric rings.'),
  ringGap: z.number().min(120).max(700).describe('Radius step between rings, world px.'),
  ringDepth: z.number().min(-600).max(600).describe('How far back each ring sits from the one inside it, world px. 0 for a flat dial.'),
  cardWidth: z.number().min(40).max(500).describe('Card width, world px.'),
  cardHeight: z.number().min(40).max(600).describe('Card height, world px.'),
  swing: z.number().min(0).max(45).describe('Degrees the camera swings either side of the ring axis.'),
  stagger: z.number().min(0).max(30).describe('Frames between one ring starting and the next.'),
  pullBack: z.number().min(600).max(6000).describe('Eye distance of the wide shot.'),
  pushIn: z.number().min(400).max(6000).describe('Eye distance at the end of the push in.'),
  steps: z.number().int().min(0).max(4).describe('How many cards each ring advances in its step (0 keeps the rings still).'),
  heldRing: z.number().int().min(0).max(4).describe('The ring that keeps its size through the dolly zoom (0 is the middle one).'),
  motionBlur: z.number().min(0).max(1).describe('Camera motion blur shutter in frames, used while the camera moves fast. 0 turns it off.'),
});
export type RadialProps = z.infer<typeof radialSchema>;

export const radialDefaults: RadialProps = {
  ...commonDefaults,
  caption: 'Radial',
  count: 36,
  rings: 3,
  ringGap: 380,
  ringDepth: 560,
  cardWidth: 230,
  cardHeight: 290,
  swing: 20,
  stagger: 9,
  pullBack: 5200,
  pushIn: 2150,
  steps: 1,
  heldRing: 1,
  motionBlur: 0,
};

export const RADIAL_DURATION = 240;

/** Cards for each ring, in proportion to its circumference. */
export const ringCounts = (count: number, rings: number): number[] => {
  const total = (rings * (rings + 1)) / 2;
  const n = Array.from({ length: rings }, (_, i) => Math.max(3, Math.round((count * (i + 1)) / total)));
  return n;
};

export const Radial: React.FC<Partial<RadialProps>> = (partial) => {
  const p = { ...radialDefaults, ...partial };
  const f = useCurrentFrame();
  const counts = ringCounts(p.count, p.rings);
  const held = Math.min(p.heldRing, p.rings - 1);
  // beats
  const hold0 = 100; // assembled and stepping, long lens
  const windA = 118; // wind-up
  const dollyA = 128;
  const dollyB = 190;
  const settleB = 214;
  const items: Item[] = [];
  let key = 0;
  counts.forEach((n, ring) => {
    const R = (ring + 1) * p.ringGap;
    const start = 4 + ring * p.stagger;
    const dir = ring % 2 === 0 ? 1 : -1;
    const slot = 360 / n;
    // one step, then a second, smaller one: the rings never stop together
    const turn = dir * slot * p.steps * (ramp(f, 54 + ring * 8, 104 + ring * 8) + 0.5 * ramp(f, 150 + ring * 6, 205 + ring * 6));
    for (let k = 0; k < n; k += 1) {
      const a = ramp(f, start + k * 0.5, start + k * 0.5 + 30, out);
      const ang = ((-90 + (360 * k) / n + turn) * Math.PI) / 180;
      const rr = R * (0.15 + 0.85 * a);
      items.push({
        key: key,
        pos: [rr * Math.cos(ang), rr * Math.sin(ang), -ring * p.ringDepth],
        photo: key,
        w: p.cardWidth,
        h: p.cardHeight,
        opacity: a,
        scale: 0.7 + 0.3 * a,
      });
      key += 1;
    }
  });
  const dd = camDrift(f, p.drift * 0.6);
  const heldZ = -held * p.ringDepth;
  // eye-to-held-ring distance and focal move together (same ratio), so the held ring never changes size
  const ratio = 0.5;
  const camAt = (t: number): Cam => {
    const dHeld = track(
      t,
      [[0, p.pullBack * 0.96], [hold0, p.pullBack], [windA, p.pullBack * 1.045], [dollyB, p.pushIn * 0.97], [settleB, p.pushIn]],
      (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    );
    return {
      yaw: track(t, [[0, 0], [dollyA, 0], [dollyB, 2.5], [settleB, 0]]),
      pitch: track(t, [[0, 0], [dollyB, -2], [settleB, 0]]),
      roll: track(t, [[0, -6], [hold0, 0], [dollyA, 0], [dollyB, 7], [settleB, 5]]),
      dist: dHeld + heldZ,
      focal: dHeld * ratio,
      target: [0, 0, 0],
      pan: [0, 0],
    };
  };
  const cam = camAt(f);
  cam.roll += dd.roll;
  cam.pan = dd.pan;
  // focus: the nearest ring while the rings assemble, the held ring from the moment the dolly zoom lands
  const heldDist = cam.focal / ratio;
  const focusDist = rack(f, dollyB - 34, dollyB + 6, cam.dist, heldDist);
  const probes: V3[] = [[p.ringGap, 0, 0], [p.ringGap * 3, 0, -2 * p.ringDepth], [0, -p.ringGap * 2, -p.ringDepth]];
  const shutter = p.motionBlur > 0 ? shutterFor(camAt, f, probes, 6, p.motionBlur) : 0;
  return (
    <Stage
      cam={cam}
      items={items}
      photos={p.photos}
      look={{ focus: Math.max(200, focusDist), aperture: p.aperture, fogStart: cam.dist * 1.1, fogLen: cam.dist * 1.4, fogMax: 0.55, radius: p.radius }}
      theme={themeOf(p.colors)}
      hud={{ caption: p.caption, showHud: p.showHud }}
      shutter={shutter}
    />
  );
};
