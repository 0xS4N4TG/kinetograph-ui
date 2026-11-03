// Checkout Push: a phone stands in the dark showing a picture; the camera walks into it, accelerating, while the phone
// lays back until the top rim sweeps down past the lens and you are looking up the screen. As the phone leaves, a dim
// checkout card (payee, amount) is left standing where it was. Timed to a measured
// reference: same layout, same pose curve (tilt only from frame 18), same timing, at 60 fps.
//
// The phone is real 3D (a pinhole camera 2000 units from the glass at the start). The pose is three numbers a frame:
// distance to the glass, tilt about the horizontal axis through its middle, and the height of the middle in the frame.
// Fitted from the reference's silhouette: the dolly runs far more than it looks (1000 -> ~10) because the tilt hides it.

import React from 'react';
import { z } from 'zod';
import { Camera, Image, Layer, Path, Rect, Text, grain, linearGradient, staticFile } from '@kinetographdev/core';
import { useCurrentFrame } from 'remotion';
import { clamp, keys, prog, useFamily } from './lib.js';

export const W = 1920;
export const H = 1080;
export const FPS = 60;
export const DURATION = 120;

const hex = z.string().describe('A CSS colour.');

export const checkoutPushSchema = z.object({
  payee: z.string().describe('Who is being paid, shown on the dim checkout card.'),
  amount: z.string().describe('The amount on the checkout card.'),
  note: z.string().describe('The line under the amount.'),
  screen: z.string().describe('Image under public/ shown on the phone screen.'),
  font: z.string().describe('Google Fonts family for the checkout card.'),
  background: hex.describe('The dark ground.'),
  card: hex.describe('The checkout card colour.'),
  deviceBody: hex.describe('Phone frame colour.'),
  speed: z.number().min(0.5).max(2).describe('Playback speed of the move.'),
  grain: z.number().min(0).max(0.2).describe('Film grain over the frame.'),
  motionBlur: z.number().min(0).max(1.5).describe('Shutter in frames on the camera move; 0 for none.'),
});
export type CheckoutPushProps = z.infer<typeof checkoutPushSchema>;

export const checkoutPushDefaults: CheckoutPushProps = {
  payee: 'Northline Studio',
  amount: '$48.00',
  note: 'Annual plan',
  screen: 'photos/nasa-earth-1.jpg',
  font: 'Geist',
  background: '#0a0a0b',
  card: '#131416',
  deviceBody: '#17181b',
  speed: 1,
  grain: 0.03,
  motionBlur: 0.7,
};

// the phone, in 1920 space: 390 x 808 like the reference's 195 x 404
const PW = 390;
const PH = 808;
const BZ = 6;

// pose keyframes in reference pixels: frame, distance D, tilt (radians), middle height Cy
const POSE: [number, number, number, number][] = [
  [0, 1007, 0, 0],
  [10, 1005, 0, 5],
  [18, 1000, 0, 12],
  [30, 990, 0.04, 23],
  [40, 930, 0.1, 40],
  [50, 835, 0.33, 66],
  [62, 535, 0.9, 64],
  [70, 344, 1.17, 59],
  [78, 213, 1.28, 56],
  [86, 125, 1.3, 70],
  [94, 52, 1.32, 74],
  [102, 8, 1.33, 78],
  [108, -10, 1.34, 92],
  [112, -30, 1.34, 120],
  [120, -60, 1.34, 180],
];

const pose = (f: number): [number, number, number] => {
  const k = (c: 1 | 2 | 3) => POSE.map((r) => [r[0], r[c]] as [number, number]);
  // linear between fitted keys, light smoothing by sampling a neighbourhood
  const lin = (c: 1 | 2 | 3, x: number) => keys(x, k(c), (t) => t);
  const avg = (c: 1 | 2 | 3) => (lin(c, f - 2) + 2 * lin(c, f) + lin(c, f + 2)) / 4;
  return [avg(1), avg(2), avg(3)];
};

/** Path of the phone's visible shell: rounded top, the bottom cut at `bottom` (or rounded when whole). */
const shell = (w: number, bottom: number, r: number) =>
  bottom >= PH - 1
    ? `M${r} 0H${w - r}A${r} ${r} 0 0 1 ${w} ${r}V${bottom - r}A${r} ${r} 0 0 1 ${w - r} ${bottom}H${r}A${r} ${r} 0 0 1 0 ${bottom - r}V${r}A${r} ${r} 0 0 1 ${r} 0Z`
    : `M${r} 0H${w - r}A${r} ${r} 0 0 1 ${w} ${r}V${bottom}H0V${r}A${r} ${r} 0 0 1 ${r} 0Z`;

export const CheckoutPush: React.FC<CheckoutPushProps> = (p) => {
  const frame = useCurrentFrame();
  const f = frame * p.speed;
  const ui = useFamily(p.font, ['400', '500', '600']);

  const [D, th, Cy] = pose(f);
  const Dz = Math.max(D, 8);
  // keep every drawn point in front of the lens: cut the bottom of the phone off where it would pass behind it
  const sinT = Math.max(0.05, Math.sin(th));
  const half = Math.min(PH / 2, Math.max(60, ((Dz * 2 - 60) / sinT)));
  const bottom = Math.min(PH, PH / 2 + half);
  const z = 2000 - Dz * 2;

  // the checkout card the phone leaves behind (reference px -> 1920 space x2)
  const ca = prog(f, 94, 116, (t) => t * t * (3 - 2 * t));
  const cTop = keys(f, [[96, 270], [102, 250], [110, 186], [120, 146]], (t) => t * (2 - t));
  const cBot = keys(f, [[96, 520], [110, 499], [120, 477]], (t) => t * (2 - t));
  const cw = keys(f, [[96, 190], [102, 200], [110, 222], [120, 234]], (t) => t * (2 - t));

  return (
    <Layer id="cp-root" effects={p.grain > 0 ? [grain(p.grain, { seed: 4, size: 1.3 })] : undefined}>
      <Rect id="cp-bg" width={W} height={H} fill={p.background} />
      {/* the card, standing behind where the phone was */}
      <Layer id="cp-card" opacity={ca}>
        <Rect id="cp-card-body" x={W / 2 - cw} y={cTop * 2} width={cw * 2} height={(cBot - cTop) * 2} radius={26} fill={p.card} />
        <Text id="cp-card-payee" font={ui} weight={500} size={22} color="#1d1e22" x={W / 2 - cw + 36} y={cTop * 2 + 52} maxWidth={cw * 2 - 72}>
          {p.payee}
        </Text>
        <Text id="cp-card-amt" font={ui} weight={600} size={64} color="#202125" x={W / 2 - cw + 36} y={cTop * 2 + 100} maxWidth={cw * 2 - 72}>
          {p.amount}
        </Text>
        <Text id="cp-card-note" font={ui} weight={400} size={22} color="#1b1c20" x={W / 2 - cw + 36} y={cTop * 2 + 190} maxWidth={cw * 2 - 72}>
          {p.note}
        </Text>
      </Layer>
      <Camera perspective={2000} />
      <Layer id="cp-cam" motionBlur={p.motionBlur > 0 ? { samples: 10, shutter: p.motionBlur } : undefined}>
        <Layer id="cp-world" preserve3d x={W / 2} y={H / 2 + Cy * 2} z={z} rotateX={(th * 180) / Math.PI} anchorX={PW / 2} anchorY={PH / 2}>
          <Layer id="cp-phone" clip={{ kind: 'path', d: shell(PW, bottom, 56) }}>
            <Path id="cp-body" d={shell(PW, bottom, 56)} fill={p.deviceBody} />
            <Layer id="cp-screen" x={BZ} y={BZ} clip={{ kind: 'path', d: shell(PW - 2 * BZ, Math.max(10, bottom - BZ), 50) }}>
              <Image id="cp-img" src={staticFile(p.screen)} width={PW - 2 * BZ} height={PH - 2 * BZ} fit="cover" />
            </Layer>
            <Path id="cp-rim" d={shell(PW, bottom, 56)} stroke={{ color: '#3a3b40', width: 2 }} />
          </Layer>
        </Layer>
      </Layer>
    </Layer>
  );
};
