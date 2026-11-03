// What the eight arrangements share: a small 3D layout engine (hand projection, so a frame is a pure function of the
// frame number and the camera can go anywhere), the photo card, the stage (ground, depth of field, fog, grain, a quiet
// caption) and the timing helpers.
//
// The engine places each card by hand: a card's centre is projected with a perspective camera (position and scale at
// that depth), and its tilt is the layer's own rotateX / rotateY / rotation, seen through a scene `<Camera>` whose
// perspective is the same focal length, so a tilted card foreshortens exactly as the projection says it should.
// Cards are drawn far to near.

import React from 'react';
import { z } from 'zod';
import { Camera, Image, Layer, Rect, Text, blur, grain, radialGradient, staticFile, useCurrentFrame } from '@kinetographdev/core';
import { loadFont } from '@remotion/google-fonts/Geist';

export const W = 1920;
export const H = 1080;
export const FPS = 30;

export const FONT = loadFont('normal', { weights: ['400'] }).fontFamily;

// ---- timing ---------------------------------------------------------------------------------------------------

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Slow in, slow out. */
export const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** Quick start, long settle. */
export const out = (t: number) => 1 - Math.pow(1 - t, 3);
export const outQuint = (t: number) => 1 - Math.pow(1 - t, 5);
export const inCubic = (t: number) => t * t * t;
/** A settle that overshoots by about 4% and comes back. */
export const outBack = (t: number) => {
  const c1 = 1.1;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
/** 0 before `a`, 1 after `b`, `ease` between. */
export const ramp = (f: number, a: number, b: number, ease: (t: number) => number = inOut) => ease(clamp((f - a) / Math.max(1e-6, b - a)));
/** Pose-to-pose keys: [frame, value] pairs, each segment eased slow in and slow out, so the value rests at every key. */
export const track = (f: number, keys: [number, number][], ease: (t: number) => number = inOut): number => {
  if (f <= keys[0]![0]) return keys[0]![1];
  for (let i = 1; i < keys.length; i += 1) {
    const [f1, v1] = keys[i]!;
    if (f <= f1) {
      const [f0, v0] = keys[i - 1]!;
      return lerp(v0, v1, ease((f - f0) / (f1 - f0)));
    }
  }
  return keys[keys.length - 1]![1];
};
/** Straight-ahead life on a long hold: a few slow sines, `amp` in the unit of the value. The phases come from `seed`. */
export const drift = (f: number, amp: number, seed: number) =>
  amp * (0.55 * Math.sin(f * 0.043 + seed * 2.1) + 0.3 * Math.sin(f * 0.091 + seed * 5.3) + 0.15 * Math.sin(f * 0.17 + seed * 1.7));

// ---- 3D -------------------------------------------------------------------------------------------------------

export type V3 = [number, number, number];
/** Row-major 3x3. Axes as CSS: x right, y down, z toward the viewer. */
export type M3 = [number, number, number, number, number, number, number, number, number];
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export const I3: M3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
export const rotX = (d: number): M3 => {
  const c = Math.cos(rad(d));
  const s = Math.sin(rad(d));
  return [1, 0, 0, 0, c, -s, 0, s, c];
};
export const rotY = (d: number): M3 => {
  const c = Math.cos(rad(d));
  const s = Math.sin(rad(d));
  return [c, 0, s, 0, 1, 0, -s, 0, c];
};
/** Clockwise on screen. */
export const rotZ = (d: number): M3 => {
  const c = Math.cos(rad(d));
  const s = Math.sin(rad(d));
  return [c, -s, 0, s, c, 0, 0, 0, 1];
};
export const mul = (a: M3, b: M3): M3 => {
  const r = new Array<number>(9).fill(0);
  for (let i = 0; i < 3; i += 1) for (let j = 0; j < 3; j += 1) for (let k = 0; k < 3; k += 1) r[i * 3 + j]! += a[i * 3 + k]! * b[k * 3 + j]!;
  return r as M3;
};
export const transpose = (m: M3): M3 => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
export const apply = (m: M3, v: V3): V3 => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];

export interface Cam {
  /** Degrees. Turns the world about the vertical axis through `target`: the orbit. */
  yaw: number;
  /** Degrees. Positive tips the near side up (looks up from below); negative looks down on the scene. */
  pitch: number;
  /** Degrees, clockwise. */
  roll: number;
  /** Eye to `target`, in world units. With `focal` equal to it, the target plane is drawn at 1:1. */
  dist: number;
  focal: number;
  target: V3;
  /** Pixels the frame is shifted on screen after projection (a truck without parallax). */
  pan?: [number, number];
}

export const camMatrix = (c: Cam): M3 => mul(rotZ(c.roll), mul(rotX(c.pitch), rotY(c.yaw)));

export interface Item {
  key: number | string;
  pos: V3;
  /** Card to world. Identity: upright, facing +z. `'camera'`: always facing the screen. */
  orient?: M3 | 'camera';
  /** With `'camera'`, a turn in the card's own plane, degrees. */
  spin?: number;
  photo: number;
  w: number;
  h: number;
  opacity?: number;
  scale?: number;
  /** 0..1 extra darkening. */
  shade?: number;
  /** Draw only while the face is turned toward the eye (a card drawn twice, one face each way, is double sided). */
  cull?: boolean;
  /** The number the counter shows for this card (defaults to the key). */
  n?: number;
}

export interface Look {
  /** Distance (eye to card) that is in focus, world units; `'auto'` follows the cards near the middle of the frame. */
  focus: number | 'auto';
  /** Blur in px of a card one `focus` away from the focus plane; 0 for none. */
  aperture: number;
  /** Eye distance where the fog starts and how long it takes to reach `fogMax`. */
  fogStart: number;
  fogLen: number;
  fogMax: number;
  /** Corner radius of the card, px at 1:1. */
  radius: number;
  /** Cards closer to the eye than this fade out (an eye that passes through them). 0 for none. */
  near?: number;
}

export const rrPath = (w: number, h: number, r: number) => {
  const k = Math.min(r, w / 2, h / 2);
  return `M${k} 0H${w - k}Q${w} 0 ${w} ${k}V${h - k}Q${w} ${h} ${w - k} ${h}H${k}Q0 ${h} 0 ${h - k}V${k}Q0 0 ${k} 0Z`;
};

/** One photo, cover-fitted, with a shade, and a hairline edge only if `edge` is set (not 'none'). */
export const PhotoCard: React.FC<{ src: string; w: number; h: number; radius: number; shade: number; edge: string }> = ({ src, w, h, radius, shade, edge }) => (
  <>
    <Image src={src} width={w} height={h} fit="cover" clip={{ kind: 'path', d: rrPath(w, h, radius) }} />
    {shade > 0.01 ? <Rect width={w} height={h} radius={radius} fill="#040507" opacity={clamp(shade)} /> : null}
    {edge && edge !== 'none' ? <Rect width={w} height={h} radius={radius} stroke={{ color: edge, width: 1.5 }} /> : null}
  </>
);

const photoSrc = (photos: string[], i: number) => staticFile(`photos/${photos[((i % photos.length) + photos.length) % photos.length]}`);

export interface Placed {
  item: Item;
  sx: number;
  sy: number;
  s: number;
  dist: number;
  rx: number;
  ry: number;
  rz: number;
  front: boolean;
}

/** Project items through `cam`: where each lands, how big, how it is turned, and whether you see its face. */
export const project = (items: Item[], cam: Cam): Placed[] => {
  const R = camMatrix(cam);
  const out: Placed[] = [];
  for (const item of items) {
    const q = apply(R, [item.pos[0] - cam.target[0], item.pos[1] - cam.target[1], item.pos[2] - cam.target[2]]);
    const dist = cam.dist - q[2];
    if (dist < 60) continue;
    const s = cam.focal / dist;
    const sx = W / 2 + q[0] * s + (cam.pan?.[0] ?? 0);
    const sy = H / 2 + q[1] * s + (cam.pan?.[1] ?? 0);
    // the card in camera space
    const M: M3 = item.orient === 'camera' ? rotZ(item.spin ?? 0) : mul(R, item.orient ?? I3);
    const m02 = clamp(M[2], -1, 1);
    const b = Math.asin(m02);
    const cb = Math.cos(b);
    let a: number;
    let c: number;
    if (cb > 1e-4) {
      a = Math.atan2(-M[5], M[8]);
      c = Math.atan2(-M[1], M[0]);
    } else {
      a = 0;
      c = Math.atan2(M[3], M[4]);
    }
    // normal (third column) against the way to the eye
    const n: V3 = [M[2], M[5], M[8]];
    const toEye: V3 = [-q[0], -q[1], cam.dist - q[2]];
    const front = n[0] * toEye[0] + n[1] * toEye[1] + n[2] * toEye[2] > 0;
    out.push({ item, sx, sy, s, dist, rx: deg(a), ry: deg(b), rz: deg(c), front });
  }
  return out.sort((p, q) => q.dist - p.dist);
};

/** Where a world point lands on screen. */
export const projectPoint = (pos: V3, cam: Cam): { x: number; y: number; s: number; dist: number } => {
  const q = apply(camMatrix(cam), [pos[0] - cam.target[0], pos[1] - cam.target[1], pos[2] - cam.target[2]]);
  const dist = Math.max(60, cam.dist - q[2]);
  const s = cam.focal / dist;
  return { x: W / 2 + q[0] * s + (cam.pan?.[0] ?? 0), y: H / 2 + q[1] * s + (cam.pan?.[1] ?? 0), s, dist };
};

export interface Theme {
  ground: string;
  ground2: string;
  ink: string;
  edge: string;
}

export const THEME: Theme = { ground: '#0a0b0d', ground2: '#171a1f', ink: '#e9e6df', edge: 'none' };

export interface HudProps {
  caption: string;
  showHud: boolean;
}

/** The stage: ground, cards far to near with depth of field and fog, a quiet caption and a little grain. */
export const Stage: React.FC<{
  cam: Cam;
  items: Item[];
  photos: string[];
  look: Look;
  theme: Theme;
  hud: HudProps;
  /** 0..1 fade of the whole frame in and out. */
  fade?: number;
  /** Drawn under the cards, over the ground (a path line, say). */
  under?: React.ReactNode;
  grainAmount?: number;
  /** Shutter in frames for camera motion blur (0 or undefined: off). */
  shutter?: number;
  /** Number of cards the counter names (defaults to the item count). */
  total?: number;
}> = ({ cam, items, photos, look, theme, hud, fade = 1, under, grainAmount = 0.03, shutter = 0, total }) => {
  const placed = project(items, cam);
  // the card nearest the middle of the frame is the one the counter names
  let near: Placed | undefined;
  let best = 1e9;
  for (const p of placed) {
    if ((p.item.opacity ?? 1) < 0.6 || !p.front || p.dist < 120) continue;
    const d = Math.hypot(p.sx - W / 2, (p.sy - H / 2) * 1.2) / p.s;
    if (d < best) { best = d; near = p; }
  }
  let focusDist = typeof look.focus === 'number' ? look.focus : cam.dist;
  if (look.focus === 'auto') {
    let wsum = 0;
    let dsum = 0;
    for (const p of placed) {
      if ((p.item.opacity ?? 1) < 0.3) continue;
      const d2 = (p.sx - W / 2) ** 2 + (p.sy - H / 2) ** 2;
      const w = Math.exp(-d2 / (2 * 330 * 330));
      wsum += w;
      dsum += w * p.dist;
    }
    if (wsum > 1e-3) focusDist = dsum / wsum;
  }
  const counter = near ? `${pad2((near.item.n ?? Number(near.item.key)) + 1)} / ${pad2(total ?? items.length)}` : '';
  return (
    <Layer id="shutter" motionBlur={shutter > 0 ? { samples: 8, shutter } : undefined}>
    <Layer id="stage" effects={grainAmount > 0 ? [grain(grainAmount, { seed: 11, size: 1.3, animate: true, monochrome: true })] : []}>
      <Rect id="ground" width={W} height={H} fill={radialGradient([[0, theme.ground2], [1, theme.ground]], { cx: 0.5, cy: 0.46, r: 0.75 })} />
      {under}
      <Camera perspective={cam.focal} />
      <Layer id="cards" opacity={fade}>
        {placed.map((p) => {
          const { item } = p;
          const sc = p.s * (item.scale ?? 1);
          if (item.cull && !p.front) return null;
          const nearFade = look.near ? clamp((p.dist - look.near * 0.5) / (look.near * 0.5)) : 1;
          if (sc <= 0.002 || (item.opacity ?? 1) * nearFade <= 0.002) return null;
          const fog = look.fogLen > 0 ? clamp((p.dist - look.fogStart) / look.fogLen) * look.fogMax : 0;
          const shade = clamp(Math.max(fog, item.shade ?? 0) + (p.front || item.cull ? 0 : 0.5));
          const coc = look.aperture > 0 ? (look.aperture * Math.abs(p.dist - focusDist)) / focusDist : 0;
          const r = Math.round(coc * 2) / 2;
          return (
            <Layer
              key={item.key}
              id={`c${item.key}`}
              x={p.sx}
              y={p.sy}
              anchorX={item.w / 2}
              anchorY={item.h / 2}
              scale={sc}
              rotateX={p.rx}
              rotateY={p.ry}
              rotation={p.rz}
              opacity={(item.opacity ?? 1) * nearFade}
              effects={r >= 1 ? [blur(Math.min(r, 28) / Math.max(sc, 0.2))] : []}
            >
              <PhotoCard src={photoSrc(photos, item.photo)} w={item.w} h={item.h} radius={look.radius} shade={shade} edge={theme.edge} />
            </Layer>
          );
        })}
      </Layer>
      {hud.showHud ? <Hud caption={hud.caption} counter={counter} theme={theme} fade={fade} /> : null}
    </Layer>
    </Layer>
  );
};

const Hud: React.FC<{ caption: string; counter: string; theme: Theme; fade: number }> = ({ caption, counter, theme, fade }) => (
  <Layer id="hud" opacity={0.62 * fade}>
    <Text id="hud-caption" x={72} y={H - 96} font={FONT} size={22} color={theme.ink}>{caption}</Text>
    <Text id="hud-counter" x={W - 72 - 300} y={H - 96} font={FONT} size={22} color={theme.ink} align="right" maxWidth={300}>{counter}</Text>
  </Layer>
);

export const pad2 = (n: number) => String(Math.max(0, n)).padStart(2, '0');

export const useFrame = () => useCurrentFrame();

// ---- props every component shares -----------------------------------------------------------------------------

export const DEFAULT_PHOTOS = [
  'nasa-earth-1.jpg', 'nasa-nebula-2.jpg', 'nasa-aurora-1.jpg', 'nasa-mars-2.jpg', 'nasa-jupiter-2.jpg', 'nasa-mars-1.jpg',
  'nasa-galaxy-2.jpg', 'nasa-storm-1.jpg', 'nasa-city-1.jpg', 'nasa-glacier-1.jpg', 'nasa-reef-1.jpg', 'nasa-volcano-1.jpg',
  'nasa-telescope-1.jpg', 'nasa-desert-2.jpg', 'nasa-iss-1.jpg', 'nasa-sun-1.jpg', 'nasa-astronaut-1.jpg', 'nasa-river-1.jpg',
  'nasa-moon-1.jpg', 'nasa-mountains-2.jpg', 'nasa-nebula-1.jpg', 'nasa-clouds-1.jpg', 'nasa-aurora-2.jpg', 'nasa-city-2.jpg',
];

const hex = z.string().describe('A CSS colour.');

export const commonShape = {
  photos: z.array(z.string()).min(1).describe('Photo file names inside public/photos, in order. Items take them in turn and repeat when there are more items than photos.'),
  caption: z.string().describe('Small line at the bottom left. Empty for none.'),
  showHud: z.boolean().describe('Show the caption and the counter.'),
  aperture: z.number().min(0).max(80).describe('Depth of field: blur, in px, of a card one focus distance away from the focus plane. 0 keeps everything sharp.'),
  drift: z.number().min(0).max(3).describe('Handheld drift on the camera, as a multiple of the default (about 0.4 degrees and 6 px). 0 for a locked-off camera.'),
  radius: z.number().min(0).max(80).describe('Corner radius of the cards, px.'),
  colors: z
    .object({
      ground: hex.describe('Frame edge.'),
      ground2: hex.describe('Frame centre, slightly lighter.'),
      ink: hex.describe('Caption type.'),
      edge: hex.describe("Hairline round every card, or 'none' (the default) for clean edges."),
    })
    .describe('Colours.'),
};

export const commonDefaults = {
  photos: DEFAULT_PHOTOS,
  caption: '',
  showHud: true,
  aperture: 0,
  drift: 1,
  radius: 14,
  colors: { ground: THEME.ground, ground2: THEME.ground2, ink: THEME.ink, edge: THEME.edge },
};

/** The arrays and objects zod hands over may be partial in Studio; fill from the defaults. */
export const themeOf = (c: Partial<Theme> | undefined): Theme => ({ ...THEME, ...(c ?? {}) });

export const camDrift = (f: number, amount: number): { roll: number; yaw: number; pan: [number, number] } => ({
  roll: drift(f, 0.35 * amount, 1),
  yaw: drift(f, 0.5 * amount, 2),
  pan: [drift(f, 6 * amount, 3), drift(f, 5 * amount, 4)],
});

// ---- camera helpers -------------------------------------------------------------------------------------------

/**
 * The yaw, pitch and distance that put the eye at `eye` and aim it at `target` (world, y down). Roll is left to the
 * caller. Inverse of the offset `dist * (-sin(yaw) cos(pitch), sin(pitch), cos(yaw) cos(pitch))`.
 */
export const lookFrom = (eye: V3, target: V3): { yaw: number; pitch: number; dist: number } => {
  const dx = eye[0] - target[0];
  const dy = eye[1] - target[1];
  const dz = eye[2] - target[2];
  const dist = Math.hypot(dx, dy, dz);
  return { yaw: deg(Math.atan2(-dx, dz)), pitch: deg(Math.asin(clamp(dy / Math.max(1e-6, dist), -1, 1))), dist };
};

/** Where the eye sits, world. */
export const eyeOf = (c: Cam): V3 => {
  const y = rad(c.yaw);
  const p = rad(c.pitch);
  return [c.target[0] + c.dist * -Math.sin(y) * Math.cos(p), c.target[1] + c.dist * Math.sin(p), c.target[2] + c.dist * Math.cos(y) * Math.cos(p)];
};

/**
 * Motion blur shutter for frame `f`: the screen speed of a few probe points in the scene (px per frame) decides whether
 * the shot is moving fast enough to need it. `0` while the camera is slow, so still shots cost nothing.
 */
export const shutterFor = (camAt: (f: number) => Cam, f: number, probes: V3[], threshold = 7, shutter = 0.5): number => {
  const a = camAt(f - 0.5);
  const b = camAt(f + 0.5);
  let top = 0;
  for (const p of probes) {
    const pa = projectPoint(p, a);
    const pb = projectPoint(p, b);
    top = Math.max(top, Math.hypot(pb.x - pa.x, pb.y - pa.y));
  }
  return top > threshold ? shutter : 0;
};

/** A distance that moves from `a` to `b` on a ramp, for rack focus. */
export const rack = (f: number, f0: number, f1: number, a: number, b: number) => lerp(a, b, ramp(f, f0, f1, inOut));
