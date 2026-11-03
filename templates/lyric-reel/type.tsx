// Flat type on a tilted plane, as the reference has it: Helvetica-style bold set tight, a silver gradient face with a
// thin dark edge under it, each word arriving letter-spaced and dim and closing up into place. A camera rig moves the
// plane (pan, zoom, roll, and a turn in 3D), and a star field moves with it in parallax.

import React from 'react';
import { random, staticFile } from 'remotion';
import { Camera, Canvas, Layer, Text, blur, glow, linearGradient, registerFont } from '@kinetographdev/core';
import { clamp, easeOut, glide } from '../../kit/core/timing.js';
import { interpolate } from 'remotion';
import { H, W } from './lib.js';

registerFont({ family: 'Arial', weight: 700, path: staticFile('ArialBold.ttf') });
export const SANS = 'Arial';

// ---- camera rig ----

export interface Rig {
  /** world point in the middle of the frame */
  x: number;
  y: number;
  zoom: number;
  /** degrees, on screen */
  roll: number;
  /** degrees, the plane turned about its vertical and horizontal axes */
  turnY: number;
  turnX: number;
  /** the camera moved toward the world, world pixels */
  dolly: number;
}

export type RigKey = [number, Partial<Rig>];

const DEFAULT: Rig = { x: 0, y: 0, zoom: 1, roll: 0, turnY: 0, turnX: 0, dolly: 0 };

/** Each field glides (monotone cubic) through the keys that set it. */
export function rigAt(f: number, ks: RigKey[]): Rig {
  const out = { ...DEFAULT };
  for (const name of Object.keys(DEFAULT) as (keyof Rig)[]) {
    const k = ks.filter(([, r]) => r[name] !== undefined).map(([t, r]) => [t, r[name] as number] as [number, number]);
    if (k.length) out[name] = k.length === 1 ? k[0][1] : glide(f, k);
  }
  return out;
}

/** The world seen through the rig, as a 3D camera sees layers parented to nulls: the world is a preserve3d group,
 *  the camera its inverse transform (move to the camera's point, then turn and zoom about the middle of the frame),
 *  and each child keeps its own place, depth and turn in it, so words at different depths move against one another.
 *  Motion blurred as a whole. */
export const Plane: React.FC<{ id: string; rig: Rig; shutter?: number; defocus?: number; children: React.ReactNode }> = ({
  id,
  rig,
  shutter = 1,
  defocus = 0,
  children,
}) => (
  <Layer id={id} motionBlur={shutter > 0 ? { samples: 10, shutter } : undefined} effects={defocus > 0.3 ? [blur(defocus)] : []}>
    <Camera perspective={1100} />
    <Layer preserve3d x={W / 2} y={H / 2} rotation={rig.roll} rotateY={rig.turnY} rotateX={rig.turnX} scale={rig.zoom}>
      <Layer preserve3d x={-rig.x} y={-rig.y} z={-rig.dolly}>
        {children}
      </Layer>
    </Layer>
  </Layer>
);

// ---- words ----

export interface Placed {
  text: string;
  /** frame it starts to arrive */
  at: number;
  /** left end of the baseline, world pixels */
  x: number;
  y: number;
  size: number;
  /** face colours, top to bottom; silver by default */
  face?: string[];
  /** colour of the thin edge under the face, or 'none' */
  edge?: string;
  /** the word's null: depth toward the camera, and its own turn (degrees) */
  z?: number;
  rotate?: number;
  rotateX?: number;
  rotateY?: number;
}

const TRACK = -0.055;
const SILVER = ['#ffffff', '#e9e9ee', '#a7a8b0'];

/** One word: it shows up letter-spaced, small and dim a little to the right, then closes up and brightens over
 *  about eight frames, the letters landing one after another. */
export const Word: React.FC<{ w: Placed; f: number }> = ({ w, f }) => {
  if (f < w.at - 0.5) return null;
  const style = (edge: boolean) => (_c: string, k: number) => {
    const p = interpolate(f, [w.at + k * 0.8, w.at + k * 0.8 + 8], [0, 1], { ...clamp, easing: easeOut });
    const spread = w.size * 0.42 * (1 - p);
    return {
      x: k * TRACK * w.size + k * spread + w.size * 0.5 * (1 - p),
      opacity: (edge ? p * p : 0.25 + 0.75 * p) * Math.min(1, p * 4),
      scale: 0.82 + 0.18 * p,
    };
  };
  const top = -w.size * 0.92; // the text box starts above the baseline
  const face = w.face ?? SILVER;
  return (
    <Layer x={w.x} y={w.y} z={w.z ?? 0} rotation={w.rotate ?? 0} rotateX={w.rotateX ?? 0} rotateY={w.rotateY ?? 0}>
      {(w.edge === 'none' ? [] : [3, 2, 1]).map((d) => (
        <Text
          key={d}
          font={SANS}
          weight={700}
          size={w.size}
          color={w.edge ?? '#4a4c58'}
          x={d * w.size * 0.012}
          y={top + d * w.size * 0.02}
          lineHeight={1.1}
          chars={style(true)}
        >
          {w.text}
        </Text>
      ))}
      <Text font={SANS} weight={700} size={w.size} color={face.length === 1 ? face[0] : linearGradient(face)} x={0} y={top} lineHeight={1.1} chars={style(false)}>
        {w.text}
      </Text>
    </Layer>
  );
};

// ---- stars ----

/** Stars around the plane in parallax: depth 1 moves with the type, nearer ones faster. Glints with a four-point
 *  flare when still, streaks along their path on screen when the rig moves, soft discs when out of focus. */
export const Sky: React.FC<{
  seed: string;
  rig: (f: number) => Rig;
  f: number;
  count?: number;
  defocus?: number;
  opacity?: number;
  color?: string;
  dark?: boolean;
}> = ({ seed, rig, f, count = 230, defocus = 0, opacity = 1, color = '#e4f2ff', dark = false }) => {
  const now = rig(f);
  const then = rig(f - 1.6);
  const span = 2600;
  const place = (r: Rig, x0: number, y0: number, d: number) => {
    // the star's world point drifts with depth, wrapped into a tile round the camera
    const wx = ((((x0 - r.x * d) % span) + span) % span) - span / 2;
    const wy = ((((y0 - r.y * d) % span) + span) % span) - span / 2;
    const z = (r.zoom / 1.85) * (0.6 + 0.4 * d);
    const a = (r.roll * Math.PI) / 180;
    const sx = wx * z * Math.cos((r.turnY * Math.PI) / 180);
    const sy = wy * z * Math.cos((r.turnX * Math.PI) / 180);
    return { x: W / 2 + sx * Math.cos(a) - sy * Math.sin(a), y: H / 2 + sx * Math.sin(a) + sy * Math.cos(a), wx, wy };
  };
  const draw = (ctx: any) => {
    ctx.lineCap = 'round';
    for (let i = 0; i < count; i++) {
      const r = (k: string) => random(`${seed}-${i}-${k}`);
      const d = 0.5 + 1.6 * r('d');
      const a = place(now, r('x') * span * 4, r('y') * span * 4, d);
      if (a.x < -60 || a.x > W + 60 || a.y < -60 || a.y > H + 60) continue;
      const b = place(then, r('x') * span * 4, r('y') * span * 4, d);
      const wrapped = Math.abs(a.wx - b.wx) > span / 2 || Math.abs(a.wy - b.wy) > span / 2;
      const len = wrapped ? 0 : Math.hypot(a.x - b.x, a.y - b.y);
      const bright = r('b') ** 2;
      const tw = 0.7 + 0.3 * Math.sin(f * (0.1 + 0.15 * r('w')) + r('p') * 6.28);
      const size = (1.6 + 2.6 * bright) * (0.7 + 0.4 * d);
      const alpha = (0.55 + 0.45 * bright) * tw * opacity;
      ctx.fillStyle = dark ? '#140a00' : '#ffffff';
      ctx.strokeStyle = dark ? '#140a00' : color;
      if (defocus > 0.5) {
        ctx.globalAlpha = alpha * 0.45;
        ctx.fillStyle = dark ? '#140a00' : color;
        ctx.beginPath();
        ctx.arc(a.x, a.y, size + defocus * (0.5 + 0.8 * bright), 0, Math.PI * 2);
        ctx.fill();
      } else if (len > size * 2) {
        ctx.globalAlpha = alpha * (0.75 + 0.25 * bright);
        ctx.lineWidth = size * 0.9;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(a.x, a.y);
        ctx.stroke();
      } else {
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(a.x, a.y, size * 0.6, 0, Math.PI * 2);
        ctx.fill();
        if (bright > 0.18) {
          const fl = size * (2.5 + 7 * bright) * tw;
          ctx.globalAlpha = alpha * 0.9;
          ctx.lineWidth = Math.max(1, size * 0.3);
          ctx.beginPath();
          ctx.moveTo(a.x - fl, a.y);
          ctx.lineTo(a.x + fl, a.y);
          ctx.moveTo(a.x, a.y - fl * 1.15);
          ctx.lineTo(a.x, a.y + fl * 1.15);
          ctx.stroke();
        }
      }
    }
  };
  return (
    <Canvas
      width={W}
      height={H}
      draw={draw}
      effects={dark ? (defocus > 0.5 ? [blur(defocus * 0.3)] : []) : [glow({ radius: 9, intensity: 1.6 }), ...(defocus > 0.5 ? [blur(defocus * 0.3)] : [])]}
    />
  );
};
