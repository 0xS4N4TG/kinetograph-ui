// Spherical: photos on a sphere. The shot opens with the eye at the sphere's centre, looking out at the inside faces
// while the cards arrive round it, holds on the hero, winds up with a small push toward it, then pulls straight back
// through the shell (the cards the eye crosses fade as they pass, motion blur on the whip) and orbits half a turn to the
// hero's outside face, where it pushes up to the card and the focus lands on it as it arrives.
//
// Every card is drawn twice, one face each way, so the inside and the outside both show the picture the right way round.
//
// Principles: staging (the move starts and ends on the same card, seen from inside and then outside), anticipation (the
// wind-up push before the pull), arcs (the exit is a spiral: distance and yaw grow together), slow in and slow out,
// overshoot and settle (the orbit and the push both land past their mark and ease back), overlap (cards arrive in order
// of angle from the hero), solid drawing (one perspective; the dolly zoom of focal 1000 to 1700 widens as it pulls).

import React from 'react';
import { z } from 'zod';
import { useCurrentFrame } from '@kinetographdev/core';
import { Stage, camDrift, commonDefaults, commonShape, mul, out, projectPoint, rack, ramp, shutterFor, themeOf, track, type Cam, type Item, type M3, type V3 } from './kit.js';

export const sphericalSchema = z.object({
  ...commonShape,
  count: z.number().int().min(6).max(80).describe('Cards on the sphere, spread evenly (a Fibonacci spiral).'),
  radius3d: z.number().min(200).max(1500).describe('Radius of the sphere, world px.'),
  cardWidth: z.number().min(60).max(600).describe('Card width, world px.'),
  cardHeight: z.number().min(60).max(700).describe('Card height, world px.'),
  turns: z.number().min(0).max(2).describe('Extra full orbits the camera makes while it pulls out, on top of the half turn from the inside view to the hero\'s outside face.'),
  insideFocal: z.number().min(500).max(2500).describe('Focal length while the eye sits inside the sphere (smaller is wider). It widens to the outside focal as the camera pulls through the shell.'),
  motionBlur: z.number().min(0).max(1).describe('Camera motion blur shutter in frames, used only while the camera moves fast. 0 turns it off.'),
  hero: z.number().int().min(0).max(79).describe('Index of the card the move ends on (a card near the equator reads best).'),
  wideDistance: z.number().min(1200).max(8000).describe('Eye distance of the opening shot.'),
  closeDistance: z.number().min(500).max(6000).describe('Eye distance at the end of the push in.'),
  backDim: z.number().min(0).max(1).describe('How much the far side of the sphere is darkened.'),
});
export type SphericalProps = z.infer<typeof sphericalSchema>;

export const sphericalDefaults: SphericalProps = {
  ...commonDefaults,
  caption: 'Spherical',
  count: 34,
  radius3d: 640,
  cardWidth: 250,
  cardHeight: 310,
  turns: 0,
  insideFocal: 1000,
  motionBlur: 0,
  hero: 17,
  wideDistance: 3300,
  closeDistance: 1410,
  backDim: 0.35,
  aperture: 0,
};

export const SPHERICAL_DURATION = 270;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/** Where card i sits on a unit sphere (Fibonacci spiral), x right, y down, z toward the viewer. */
export const fib = (i: number, n: number): V3 => {
  const y = 1 - (2 * (i + 0.5)) / n;
  const r = Math.sqrt(1 - y * y);
  const t = i * GOLDEN;
  return [r * Math.cos(t), -y, r * Math.sin(t)];
};

/** A card lying on the sphere at unit position `n`, facing out with its top toward the north pole. */
export const tangentFrame = (n: V3): M3 => {
  // x = yref x n with yref = (0, 1, 0) (screen down)
  let x: V3 = [n[2], 0, -n[0]];
  const l = Math.hypot(...x);
  x = l < 1e-3 ? [1, 0, 0] : [x[0] / l, 0, x[2] / l];
  // y = n x x
  const y: V3 = [n[1] * x[2] - n[2] * x[1], n[2] * x[0] - n[0] * x[2], n[0] * x[1] - n[1] * x[0]];
  return [x[0], y[0], n[0], x[1], y[1], n[1], x[2], y[2], n[2]];
};

const FLIP: M3 = [-1, 0, 0, 0, 1, 0, 0, 0, -1];

export const Spherical: React.FC<Partial<SphericalProps>> = (partial) => {
  const p = { ...sphericalDefaults, ...partial };
  const f = useCurrentFrame();
  const R = p.radius3d;
  const hero = Math.min(p.hero, p.count - 1);
  const h = fib(hero, p.count);
  const heroPos: V3 = [h[0] * R, h[1] * R, h[2] * R];
  // the yaw that brings the hero to the front, seen from outside
  const yawOut = (Math.atan2(-h[0], h[2]) * 180) / Math.PI;
  const yawIn = yawOut + 180;

  // beats (frames at 30 fps)
  const T = { look: 56, wind: 84, windTop: 94, pullEnd: 138, orbitEnd: 172, arrive: 214 };

  const items: Item[] = [];
  for (let i = 0; i < p.count; i += 1) {
    const n = fib(i, p.count);
    // cards arrive in order of angle from the hero, so the view fills from the middle of the frame outward
    const ang = Math.acos(Math.max(-1, Math.min(1, n[0] * h[0] + n[1] * h[1] + n[2] * h[2])));
    const delay = 3 + (ang / Math.PI) * 30 + (i % 4) * 0.8;
    const a = ramp(f, delay, delay + 26, out);
    const r = R * (1.45 - 0.45 * a);
    const frame = tangentFrame(n);
    const shade = i === hero ? 0 : 0.22 * ramp(f, T.orbitEnd + 6, T.arrive + 6);
    const base = { w: p.cardWidth, h: p.cardHeight, opacity: a, scale: 0.55 + 0.45 * a, shade, cull: true, photo: (i - hero + p.count) % p.count, n: i } as const;
    items.push({ ...base, key: i * 2, pos: [n[0] * (r + 3), n[1] * (r + 3), n[2] * (r + 3)], orient: frame });
    items.push({ ...base, key: i * 2 + 1, pos: [n[0] * (r - 3), n[1] * (r - 3), n[2] * (r - 3)], orient: mul(frame, FLIP) });
  }

  const dd = camDrift(f, p.drift);
  const turns = 180 + 360 * p.turns;
  const camAt = (t: number): Cam => ({
    // look around, settle on the hero's inner face, then spiral out and round to its outer face, past the mark and back
    yaw:
      track(t, [[0, yawIn + 36], [T.look, yawIn], [T.windTop, yawIn]], (x) => 1 - Math.pow(1 - x, 3)) +
      track(t, [[T.windTop, 0], [T.orbitEnd - 14, -turns - 7], [T.orbitEnd + 16, -turns]]),
    pitch: track(t, [[0, 7], [T.look, 2], [T.windTop, 2], [T.pullEnd, -15], [T.arrive, 0]]),
    roll: track(t, [[0, 3.5], [T.look, 0.6], [T.windTop, 0.6], [T.pullEnd, -1.5], [T.arrive, 0]]),
    // inside, a wind-up push toward the hero (the eye goes slightly past the centre), then a hard pull straight back
    dist: track(
      t,
      [[0, 6], [T.wind, 6], [T.windTop, -120], [T.pullEnd, p.wideDistance], [T.orbitEnd - 6, p.wideDistance * 0.985], [T.arrive - 14, p.closeDistance * 0.965], [T.arrive + 8, p.closeDistance]],
      (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    ),
    focal: track(t, [[0, p.insideFocal], [T.windTop, p.insideFocal], [T.pullEnd, 1700]]),
    target: [0, track(t, [[T.pullEnd, 0], [T.arrive, h[1] * R * 0.9]]), 0],
    pan: [0, 0],
  });
  const cam = camAt(f);
  cam.yaw += dd.yaw * 0.6;
  cam.roll += dd.roll;
  cam.pan = [dd.pan[0] * 0.6, dd.pan[1] * 0.6];

  // focus: on the hero inside, on the middle of the sphere while it is pulled back and whipped round, on the hero again as it lands
  const heroD = projectPoint(heroPos, cam).dist;
  const centreD = Math.max(300, cam.dist);
  const focus = rack(f, T.arrive - 26, T.arrive - 2, rack(f, T.windTop + 4, T.windTop + 22, heroD, centreD), heroD);

  const shutter = p.motionBlur > 0 ? shutterFor(camAt, f, [heroPos, [R, 0, 0], [-R, 0, 0], [0, 0, R]], 9, p.motionBlur) : 0;
  return (
    <Stage
      cam={cam}
      items={items}
      photos={p.photos}
      look={{ focus, aperture: p.aperture, fogStart: Math.max(400, cam.dist) + R * 0.7, fogLen: R * 2, fogMax: p.backDim, radius: p.radius, near: 460 }}
      theme={themeOf(p.colors)}
      hud={{ caption: p.caption, showHud: p.showHud }}
      shutter={shutter}
      total={p.count}
    />
  );
};
