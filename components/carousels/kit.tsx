// Shared by the carousel components: easing, key frames, the default photo set, a photo card and font loading.
// Every function is a pure function of the frame number.

import React from 'react';
import { z } from 'zod';
import { Easing, interpolate, staticFile } from 'remotion';
import { Image, Layer, Rect, Text } from '@kinetographdev/core';
import { makeGoogleFont } from '@kinetographdev/core/google-fonts';

export const W = 1920;
export const H = 1080;

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
/** slow in, slow out */
export const ease = Easing.bezier(0.45, 0, 0.15, 1);
/** fast start, long settle: a flick that dies away */
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
/** gentle start, then speed */
export const easeIn = Easing.bezier(0.7, 0, 0.84, 0);
/** a soft in and out for camera moves */
export const easeCam = Easing.bezier(0.5, 0, 0.1, 1);

/** from `a` at frame f0 to `b` at frame f1, held outside, with an easing */
export const ramp = (f: number, f0: number, f1: number, a: number, b: number, e: (t: number) => number = ease) =>
  interpolate(f, [f0, f1], [a, b], { ...clamp, easing: e });

/** 0 to 1 over [f0, f1] with an easing */
export const prog = (f: number, f0: number, f1: number, e: (t: number) => number = ease) => ramp(f, f0, f1, 0, 1, e);

/** Piecewise through [frame, value] keys, one easing per segment. */
export function keys(f: number, k: [number, number][], e: (t: number) => number = ease): number {
  if (f <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) {
    if (f <= k[i][0]) {
      const [a, va] = k[i - 1];
      const [b, vb] = k[i];
      return va + (vb - va) * e((f - a) / (b - a));
    }
  }
  return k[k.length - 1][1];
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

export const hex = z.string().describe('A CSS colour.');

/** The photo set the components default to: public-domain NASA pictures, see photos/CREDITS.md. */
export const DEFAULT_PHOTOS = [
  'nasa-earth-2', 'nasa-nebula-1', 'nasa-mars-1', 'nasa-moon-1', 'nasa-saturn-1',
  'nasa-storm-1', 'nasa-desert-1', 'nasa-galaxy-1', 'nasa-glacier-1', 'nasa-city-1', 'nasa-jupiter-1',
  'nasa-reef-1', 'nasa-iss-1', 'nasa-clouds-1', 'nasa-nebula-2', 'nasa-aurora-2',
  'nasa-mountains-1', 'nasa-telescope-1', 'nasa-sun-1', 'nasa-river-1', 'nasa-galaxy-2', 'nasa-moon-2', 'nasa-storm-2'
].map((n) => `photos/${n}.jpg`);

export const imagesSchema = z
  .array(z.string())
  .min(1)
  .describe('Pictures, as paths under public/ (or full URLs). They repeat when there are fewer than the count.');

/** A path under public/ or a URL, as an image source. */
export const src = (s: string) => (/^(https?:|data:|\/)/.test(s) ? s : staticFile(s));

/** Loads a Google font and returns the family name that is registered. */
export const useFont = (family: string, weights: string[] = ['400', '500']): string =>
  makeGoogleFont(family).loadFont('normal', { weights }).fontFamily;

export const useFontItalic = (family: string, weights: string[] = ['400']): string =>
  makeGoogleFont(family).loadFont('italic', { weights }).fontFamily;

/** A picture cropped to a rounded card of w x h, centred on the layer's origin. */
export const Photo = ({ file, w, h, radius = 0, opacity, id, reveal = 1 }: { file: string; w: number; h: number; radius?: number; opacity?: number; id?: string; reveal?: number }) => (
  <Image
    id={id}
    src={src(file)}
    x={-w / 2}
    y={-h / 2}
    width={w}
    height={h}
    fit="cover"
    opacity={opacity}
    clip={radius > 0 || reveal < 1 ? { kind: 'inset', radius, bottom: (1 - reveal) * h } : undefined}
  />
);

/** A flat ground. */
export const Ground = ({ color }: { color: string }) => <Rect id="ground" width={W} height={H} fill={color} />;

export const pick = <T,>(list: T[], i: number): T => list[((i % list.length) + list.length) % list.length];

export { Layer };

/** A quiet two-line label: a title and a smaller line under it. */
export const Label = ({ x, y, title, sub, font, ink, muted, opacity = 1, align = 'left' }: { x: number; y: number; title: string; sub: string; font: string; ink: string; muted: string; opacity?: number; align?: 'left' | 'right' }) => {
  const maxWidth = 700;
  const ox = align === 'right' ? -maxWidth : 0;
  return (
    <Layer id="label" x={x} y={y} opacity={opacity}>
      {title ? <Text id="label-title" font={font} weight={500} size={30} color={ink} x={ox} y={0} maxWidth={maxWidth} align={align}>{title}</Text> : null}
      {sub ? <Text id="label-sub" font={font} weight={400} size={21} color={muted} x={ox} y={title ? 44 : 0} maxWidth={maxWidth} align={align}>{sub}</Text> : null}
    </Layer>
  );
};

/** "nasa-earth-2" in photos/nasa-earth-2.jpg becomes "Earth". Used for default card labels. */
export const nameOf = (file: string) => {
  const m = /nasa-([a-z]+)-/.exec(file);
  return m ? m[1][0].toUpperCase() + m[1].slice(1) : '';
};

/**
 * A 2D camera: the world point (cx, cy) sits at the middle of the frame, `zoom` scales about it and `roll` turns the
 * frame (degrees, clockwise). `shutter` is the motion blur in frames (0 for none).
 */
export const Rig = ({ cx, cy, zoom, roll = 0, shutter = 0, children }: { cx: number; cy: number; zoom: number; roll?: number; shutter?: number; children: React.ReactNode }) => (
  <Layer id="rig" motionBlur={shutter > 0 ? { samples: 20, shutter } : undefined}>
    <Layer id="rig-eye" x={W / 2} y={H / 2} scale={zoom} rotation={roll}>
      <Layer id="rig-world" x={-cx} y={-cy}>
        {children}
      </Layer>
    </Layer>
  </Layer>
);

/** Motion blur shutter from how far a 2D camera moves between two moments: 0 while it is slow. */
export const shutterOf = (camAt: (f: number) => { cx: number; cy: number; zoom: number; roll?: number }, f: number, span = 400, threshold = 7, shutter = 0.5) => {
  const a = camAt(f - 0.5);
  const b = camAt(f + 0.5);
  const d = Math.hypot((b.cx - a.cx) * b.zoom, (b.cy - a.cy) * b.zoom) + Math.abs(Math.log(b.zoom / a.zoom)) * span + Math.abs((b.roll ?? 0) - (a.roll ?? 0)) * 8;
  return d > threshold ? shutter : 0;
};

export interface ChainCam {
  count: number;
  stagger: number;
  /** Where the cover at position u sits and how big it is, in world px. */
  where: (u: number) => { x: number; y: number; size: number };
  /** Conveyor position at frame t, in turns. */
  shiftAt: (t: number) => number;
  /** The world point shown at the middle of the frame in the ring shot, and its zoom. */
  rest: { cx: number; cy: number; zoom: number };
  rideZoom: number;
  push: number;
  /** Frames: pull out starts and lands, push starts and lands. */
  pullA: number;
  pullB: number;
  pushA: number;
  pushB: number;
  /** Roll in degrees at the start, the end of the ride and at rest. */
  roll: [number, number];
}

/**
 * The camera of a conveyor of covers: it rides the front of the entrance sweep (the cover being born), zoomed so the
 * covers it follows stay about 190 px across, pulls out past the mark and back to the ring shot, holds, then pushes
 * into the biggest cover once the conveyor has stopped.
 */
export const chainCamera = (o: ChainCam) => {
  let hero = o.where(0);
  const endShift = o.shiftAt(1e6);
  for (let i = 0; i < o.count; i += 1) {
    const w = o.where((((i / o.count + endShift) % 1) + 1) % 1);
    if (i === 0 || w.size > hero.size - 0.001) hero = w;
  }
  const io = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  return (t: number) => {
    const front = Math.min(o.count - 1, Math.max(0, (t - 5) / o.stagger));
    const fw = o.where((((front / o.count + o.shiftAt(t)) % 1) + 1) % 1);
    const zRide = Math.min(o.rideZoom, Math.max(o.rest.zoom, 190 / Math.max(fw.size, 24)));
    const kRing = prog(t, o.pullA, o.pullB, io);
    const over = 1 + 0.045 * Math.sin(prog(t, o.pullB - 4, o.pullB + 26, (x: number) => x) * Math.PI);
    let cx = lerp(fw.x, o.rest.cx, kRing);
    let cy = lerp(fw.y, o.rest.cy, kRing);
    let zoom = lerp(zRide, o.rest.zoom, kRing) * (kRing >= 1 ? over : 1);
    const kPush = prog(t, o.pushA, o.pushB, (x: number) => 1 - Math.pow(1 - x, 3));
    // re-centre on the hero only as far as the push goes in: with no push the ring stays framed whole
    const aim = Math.min(1, o.push * 3);
    cx = lerp(cx, lerp(cx, hero.x, aim), kPush);
    cy = lerp(cy, lerp(cy, hero.y, aim), kPush);
    zoom = lerp(zoom, o.rest.zoom * (1 + o.push), kPush);
    const roll = keys(t, [[0, o.roll[0]], [o.pullA, o.roll[1]], [o.pullB + 24, 0], [o.pushB, 0]]);
    return { cx, cy, zoom, roll };
  };
};
