// Three-Phone Showcase: three phones on a soft pale ground, the outer two turned in towards the centre one. The camera is
// the storyteller: it opens tight on the centre phone's screen and holds, dips back (anticipation), travels to the left
// phone's headline and lands with an overshoot, holds, then sweeps across the centre to the right phone's chart (the fast
// move, with motion blur), holds, and pulls back to the three of them together with a small overshoot and a settle.
//
// Principles: staging (one screen at a time, each read before the camera leaves it), anticipation (a dip before each big
// move), slow in and out and overshoot (every landing), arcs (the camera banks and yaws into the sideways moves), overlap
// (each screen starts playing as the camera arrives), solid drawing (real 3D phones, one key light top left).

import React from 'react';
import { z } from 'zod';
import { Camera, Layer, Rect, dropShadow, grain, linearGradient, radialGradient } from '@kinetographdev/core';
import { useCurrentFrame } from 'remotion';
import { CameraMotionBlur } from '@kinetographdev/core/motion-blur';
import { Phone, PH, PW } from './devices.js';
import { Screen, barOn, defaultStyle } from './screens.js';
import { ease, prog, useFamily } from './lib.js';

export const W = 1920;
export const H = 1080;
export const FPS = 60;
export const DURATION = 420;

const hex = z.string().describe('A CSS colour.');

export const threePhoneSchema = z.object({
  screens: z
    .array(z.string())
    .length(3)
    .describe('Left, centre and right screen. A built-in drawn screen (hero, dashboard, chart, plan) or a path to an image under public/, such as photos/nasa-earth-1.jpg.'),
  font: z.string().describe('Google Fonts family for the type drawn on the built-in screens.'),
  accent: hex.describe('The sample app\'s accent colour.'),
  ground: hex.describe('The pale ground.'),
  groundShade: hex.describe('The ground at the lower right, away from the light.'),
  frame: hex.describe('Phone frame colour.'),
  fanAngle: z.number().min(0).max(40).describe('How far the outer phones turn in towards the centre one, in degrees.'),
  spread: z.number().min(380).max(620).describe('Distance of the outer phones from the centre one, in pixels.'),
  size: z.number().min(0.6).max(1.1).describe('Phone scale: 1 is 800 px tall at the wide shot.'),
  speed: z.number().min(0.5).max(2).describe('Playback speed of the move: 2 is twice as fast.'),
  startZoom: z.number().min(1).max(3.5).describe('How tight the camera is on the centre phone\'s screen at the start and on each screen it visits.'),
  grain: z.number().min(0).max(0.2).describe('Film grain over the whole frame.'),
});
export type ThreePhoneProps = z.infer<typeof threePhoneSchema>;

export const threePhoneDefaults: ThreePhoneProps = {
  screens: ['hero', 'dashboard', 'chart'],
  font: 'Geist',
  accent: '#d9f26b',
  ground: '#eef0e5',
  groundShade: '#dfe3d2',
  frame: '#26272b',
  fanAngle: 24,
  spread: 470,
  size: 1,
  speed: 1,
  startZoom: 2.2,
  grain: 0.035,
};

/** Where the outer phones' pivot sits below the centre phone, in phone heights. A large radius keeps the fan shallow. */
const PIVOT = 1500;

// camera targets in world units, centred on the middle phone: [x, y, zoom multiplier of startZoom]
const seg = (f: number, a: number, b: number, easing: (t: number) => number = ease) => easing(prog(f, a, b, (t) => t));
/** ease in and out that runs a little past 1 and comes back: a landing with follow through */
const landing = (t: number) => ease(t) + 0.05 * Math.sin(Math.PI * t) * t * t;

export const ThreePhone: React.FC<ThreePhoneProps> = (p) => {
  const frame = useCurrentFrame();
  const f = (frame * p.speed) / 60; // seconds
  const font = useFamily(p.font, ['400', '500', '600']);
  const st = { ...defaultStyle(font), accent: p.accent };
  const zt = p.startZoom;

  // the camera as keyframed targets: [time in s, x, y, zoom]
  const cam = (t: number) => {
    const C = { x: 0, y: -170, z: zt };
    const Cb = { x: 14, y: -150, z: zt * 1.06 }; // the dip before the first move
    const Lp = { x: -p.spread, y: 70, z: zt * 0.88 };
    const Rp = { x: p.spread, y: -40, z: zt * 0.88 };
    const All = { x: 0, y: 10, z: 1.1 };
    const mix = (a: typeof C, b: typeof C, u: number) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: Math.exp(Math.log(a.z) + (Math.log(b.z) - Math.log(a.z)) * u) });
    if (t < 0.8) return mix(C, { x: 4, y: -166, z: zt * 1.02 }, seg(t, 0, 0.8, (u) => u));
    if (t < 1.1) return mix({ x: 4, y: -166, z: zt * 1.02 }, Cb, seg(t, 0.8, 1.1));
    if (t < 2.1) return mix(Cb, Lp, landing(seg(t, 1.1, 2.1, (u) => u)));
    if (t < 2.8) return mix(Lp, { x: Lp.x - 6, y: Lp.y + 2, z: Lp.z * 1.02 }, seg(t, 2.1, 2.8, (u) => u));
    if (t < 3.0) return mix({ x: Lp.x - 6, y: Lp.y + 2, z: Lp.z * 1.02 }, { x: Lp.x - 16, y: Lp.y, z: Lp.z * 1.04 }, seg(t, 2.8, 3.0));
    if (t < 3.9) return mix({ x: Lp.x - 16, y: Lp.y, z: Lp.z * 1.04 }, Rp, landing(seg(t, 3.0, 3.9, (u) => u)));
    if (t < 4.5) return mix(Rp, { x: Rp.x + 6, y: Rp.y, z: Rp.z * 1.02 }, seg(t, 3.9, 4.5, (u) => u));
    if (t < 6.0) return mix({ x: Rp.x + 6, y: Rp.y, z: Rp.z * 1.02 }, All, landing(seg(t, 4.5, 6.0, (u) => u)));
    return mix(All, { x: 0, y: 6, z: 1.125 }, seg(t, 6.0, 7.0, (u) => u));
  };
  const now = cam(f);
  // the camera banks into a sideways move
  const dt = 1 / 60;
  const vx = (cam(f + dt).x - cam(f - dt).x) / (2 * dt); // world units per second
  const vz = Math.log(cam(f + dt).z / cam(f - dt).z) / (2 * dt);
  const roll = Math.max(-2.4, Math.min(2.4, -vx * 0.0034));
  const yaw = Math.max(-5, Math.min(5, vx * 0.0045));
  const fast = Math.min(1, Math.abs(vx) / 700 + Math.abs(vz) / 1.2);

  const zoom = now.z * p.size;
  const wx = W / 2 - now.x * zoom;
  const wy = H / 2 - now.y * zoom;

  // each screen starts to play as the camera reaches it
  const screenT = [prog(f, 0.0, 1.6), prog(f, 0.0, 2.3), prog(f, 3.1, 4.8)];
  const centreT = prog(f, 0.1, 1.5);
  const leftT = prog(f, 1.5, 3.0);
  const rightT = prog(f, 3.2, 4.8);
  void screenT;

  const phone = (key: string, screen: string, t: number, x: number, yawDeg: number, rollDeg: number, z: number, sheenAt: number) => (
    <Layer
      id={`tp-${key}`}
      x={x}
      y={0}
      z={z}
      rotateY={yawDeg}
      rotation={rollDeg}
      anchorX={PW / 2}
      anchorY={PH / 2}
      effects={[dropShadow({ x: 18 * (yawDeg >= 0 ? 1 : 1), y: 34, blur: 30, color: '#2b331738' })]}
    >
      <Phone id={`tp-${key}-ph`} frame={p.frame} bar={barOn(screen)} sheenAt={sheenAt}>
        <Screen id={`tp-${key}-sc`} screen={screen} st={st} t={t} />
      </Phone>
    </Layer>
  );

  return (
    <Layer id="tp-root" effects={p.grain > 0 ? [grain(p.grain, { seed: 4, size: 1.3 })] : undefined}>
      <Camera perspective={2600} />
      <Rect id="tp-ground" width={W} height={H} fill={linearGradient([p.ground, p.groundShade], { angle: 140 })} />
      <Rect id="tp-light" x={-now.x * 0.08} width={W} height={H} fill={radialGradient([[0, '#ffffffcc'], [0.55, '#ffffff22'], [1, '#ffffff00']])} opacity={0.9} />
      <CameraMotionBlur samples={12} shutterAngle={fast > 0.05 ? 220 : 120}>
        <Layer id="tp-world" preserve3d x={wx} y={wy} scale={zoom} rotation={roll} rotateY={yaw}>
          {phone('l', p.screens[0], leftT, -p.spread, p.fanAngle, -3, -40, -0.3)}
          {phone('r', p.screens[2], rightT, p.spread, -p.fanAngle, 3, -40, 0.3)}
          {phone('c', p.screens[1], centreT, 0, 0, 0, 30, 0)}
        </Layer>
      </CameraMotionBlur>
      <Rect id="tp-vignette" width={W} height={H} fill={radialGradient([[0, '#00000000'], [0.7, '#00000000'], [1, '#2a31181c']])} />
    </Layer>
  );
};
