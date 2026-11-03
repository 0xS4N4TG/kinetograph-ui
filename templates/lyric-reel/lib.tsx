// The parts every shot shares: the beat grid, the font and its glyph metrics, one perspective camera that the 3D
// type (a Scene3D) and the star field (a 2D canvas) are both seen through, the star field itself, and words built
// letter by letter out of extruded Text3D.

import React from 'react';
import { random } from 'remotion';
import { AmbientLight, Camera3D, Canvas, DirectionalLight, Group3D, Layer, Scene3D, Text3D, blur, glow } from '@kinetographdev/core';
import { makeGoogleFont } from '@kinetographdev/core/google-fonts';
import { clamp, easeOut, spline } from '../../kit/core/timing.js';
import { interpolate } from 'remotion';

export const W = 1080;
export const H = 1080;
export const FPS = 30;
export const BPM = 117.5;
/** frames per beat */
export const BEAT = (60 / BPM) * FPS;
/** the frame of beat n (fractions allowed) */
export const b = (n: number) => Math.round(n * BEAT);
/** seconds into the song where the reel starts: the loud section after the intro */
export const SONG_START = 16.04;
export const DURATION = b(34);

export const FONT = makeGoogleFont('Inter').loadFont('normal', { weights: ['700', '800'] }).fontFamily;

// ---- glyphs ----

interface Glyph {
  /** advance, em */
  adv: number;
  /** middle of the ink from the pen position, em, x right */
  cx: number;
  /** middle of the ink above the baseline, em */
  cy: number;
}

type Surface = { getContext(type: '2d', options?: unknown): any };
let surface: Surface | null = null;
const glyphs = new Map<string, Glyph>();
const G = 200; // px per em when measuring

/** Text3D centres each glyph's mesh on its own ink box, so a word set letter by letter needs every glyph's ink box
 *  to put the letters back on one baseline: drawn once on an OffscreenCanvas and read back. */
function glyph(c: string, weight: number): Glyph {
  const key = `${weight}:${c}`;
  const hit = glyphs.get(key);
  if (hit) return hit;
  const Offscreen = (globalThis as { OffscreenCanvas?: new (w: number, h: number) => Surface }).OffscreenCanvas;
  if (!Offscreen) throw new Error('lyric-reel measures glyphs with OffscreenCanvas: render it with Kinetograph');
  surface ??= new Offscreen(G * 2, G * 2);
  const ctx = surface.getContext('2d', { willReadFrequently: true });
  ctx.clearRect(0, 0, G * 2, G * 2);
  ctx.font = `${weight} ${G}px ${FONT}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#fff';
  const ox = G / 2;
  const base = G * 1.4;
  ctx.fillText(c, ox, base);
  const adv = ctx.measureText(c).width / G;
  const px: Uint8ClampedArray = ctx.getImageData(0, 0, G * 2, G * 2).data;
  let [l, r, t, bt] = [G * 2, -1, G * 2, -1];
  for (let y = 0; y < G * 2; y++)
    for (let x = 0; x < G * 2; x++)
      if (px[(y * G * 2 + x) * 4 + 3] > 40) {
        if (x < l) l = x;
        if (x > r) r = x;
        if (y < t) t = y;
        if (y > bt) bt = y;
      }
  const g: Glyph = r < 0 ? { adv, cx: adv / 2, cy: 0.35 } : { adv, cx: ((l + r + 1) / 2 - ox) / G, cy: (base - (t + bt + 1) / 2) / G };
  glyphs.set(key, g);
  return g;
}

export interface Letter {
  c: string;
  /** ink middle, em, from the word's middle (x) and baseline (y, up) */
  x: number;
  y: number;
}

/** A word laid out letter by letter with tight tracking, centred on x; spaces take their advance and draw nothing. */
export function layout(text: string, weight = 700, track = -0.03): { letters: Letter[]; width: number } {
  let pen = 0;
  const raw: Letter[] = [];
  for (const c of Array.from(text)) {
    const g = glyph(c, weight);
    if (c !== ' ') raw.push({ c, x: pen + g.cx, y: g.cy });
    pen += g.adv + track;
  }
  const width = pen - track;
  return { letters: raw.map((l) => ({ ...l, x: l.x - width / 2 })), width };
}

// ---- camera ----

export type V3 = [number, number, number];

export interface CamState {
  pos: V3;
  target: V3;
  /** vertical, degrees */
  fov: number;
  /** degrees clockwise on screen */
  roll: number;
}

/** Keys [frame, state] joined by a smooth curve per component, so the camera glides through its marks. */
export type CamKey = [number, Partial<CamState>];

export function camAt(f: number, ks: CamKey[]): CamState {
  const pick = (get: (s: Partial<CamState>) => number | undefined, dflt: number) => {
    const k = ks.map(([t, s]) => [t, get(s)] as [number, number | undefined]).filter((q): q is [number, number] => q[1] !== undefined);
    return k.length === 0 ? dflt : k.length === 1 ? k[0][1] : spline(f, k);
  };
  return {
    pos: [0, 1, 2].map((i) => pick((s) => s.pos?.[i], [0, 0, 6][i])) as V3,
    target: [0, 1, 2].map((i) => pick((s) => s.target?.[i], 0)) as V3,
    fov: pick((s) => s.fov, 40),
    roll: pick((s) => s.roll, 0),
  };
}

const sub = (a: V3, c: V3): V3 => [a[0] - c[0], a[1] - c[1], a[2] - c[2]];
const dot = (a: V3, c: V3) => a[0] * c[0] + a[1] * c[1] + a[2] * c[2];
const cross = (a: V3, c: V3): V3 => [a[1] * c[2] - a[2] * c[1], a[2] * c[0] - a[0] * c[2], a[0] * c[1] - a[1] * c[0]];
const norm = (a: V3): V3 => {
  const l = Math.hypot(...a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** The side of the square box the 3D picture and the stars are drawn in: big enough that rolling it never shows a
 *  corner of the canvas. */
export const BOX = Math.ceil(Math.hypot(W, H)) + 8;

/** A world point seen by the camera, in box pixels (y down) with its depth, or null behind the eye. Matches
 *  Scene3D's perspective camera: a look-at with +y up and a vertical fov over the box height. */
export function project(p: V3, cam: CamState): { x: number; y: number; z: number } | null {
  const fwd = norm(sub(cam.target, cam.pos));
  const right = norm(cross(fwd, [0, 1, 0]));
  const up = cross(right, fwd);
  const d = sub(p, cam.pos);
  const z = dot(d, fwd);
  if (z < 0.05) return null;
  const f = BOX / 2 / Math.tan((cam.fov * Math.PI) / 360);
  return { x: BOX / 2 + (dot(d, right) / z) * f, y: BOX / 2 - (dot(d, up) / z) * f, z };
}

// ---- stars ----

export interface StarField {
  seed: string;
  count: number;
  /** the box they fill, world units: [min, max] per axis */
  min: V3;
  max: V3;
  /** colour of the streaks and glints */
  color?: string;
}

/** The star field seen through the camera: glints (a dot, the bright ones with a four-point flare) that stretch into
 *  streaks along their path on screen when the camera moves fast, and turn into soft bokeh discs as `defocus` rises.
 *  Streaks run from where the star was `trail` frames ago to where it is now. */
export const Stars: React.FC<{
  field: StarField;
  cam: (f: number) => CamState;
  frame: number;
  trail?: number;
  defocus?: number;
  opacity?: number;
}> = ({ field, cam, frame, trail = 2.5, defocus = 0, opacity = 1 }) => {
  const now = cam(frame);
  const then = cam(frame - trail);
  const color = field.color ?? '#dff1ff';
  const draw = (ctx: any) => {
    ctx.lineCap = 'round';
    for (let i = 0; i < field.count; i++) {
      const r = (k: string) => random(`${field.seed}-${i}-${k}`);
      const p: V3 = [0, 1, 2].map((a) => field.min[a] + (field.max[a] - field.min[a]) * r(`p${a}`)) as V3;
      const a = project(p, now);
      if (!a) continue;
      const bright = r('b') ** 2.2;
      // a slow twinkle
      const tw = 0.65 + 0.35 * Math.sin(frame * (0.08 + 0.12 * r('w')) + r('ph') * 6.28);
      const near = Math.min(2, 7 / a.z);
      const size = (1.6 + 4 * bright) * near;
      const alpha = Math.min(1, (0.5 + 0.5 * bright) * tw * Math.min(1, 14 / a.z)) * opacity;
      if (alpha < 0.02) continue;
      const c = project(p, then);
      const len = c ? Math.hypot(a.x - c.x, a.y - c.y) : 0;
      if (defocus > 0.5) {
        ctx.globalAlpha = alpha * Math.min(1, 6 / defocus) * 0.55;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(a.x, a.y, size * 0.6 + defocus * (0.6 + bright), 0, Math.PI * 2);
        ctx.fill();
      } else if (c && len > size * 1.5) {
        ctx.globalAlpha = alpha * Math.min(1, 40 / len + 0.45);
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1.2, size * 0.75);
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(a.x, a.y);
        ctx.stroke();
      } else {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(a.x, a.y, size * 0.55, 0, Math.PI * 2);
        ctx.fill();
        if (bright > 0.25) {
          const fl = size * (3 + 4 * bright) * tw;
          ctx.globalAlpha = alpha * 0.8;
          ctx.strokeStyle = color;
          ctx.lineWidth = Math.max(0.8, size * 0.22);
          ctx.beginPath();
          ctx.moveTo(a.x - fl, a.y);
          ctx.lineTo(a.x + fl, a.y);
          ctx.moveTo(a.x, a.y - fl);
          ctx.lineTo(a.x, a.y + fl);
          ctx.stroke();
        }
      }
    }
  };
  return (
    <Layer x={W / 2} y={H / 2} rotation={now.roll}>
      <Canvas
        width={BOX}
        height={BOX}
        x={-BOX / 2}
        y={-BOX / 2}
        effects={[glow({ radius: 7, intensity: 1.3 }), ...(defocus > 0.5 ? [blur(defocus * 0.25)] : [])]}
        draw={draw}
      />
    </Layer>
  );
};

// ---- 3D type ----

export interface WordSpec {
  text: string;
  /** frame the first letter starts to arrive */
  at: number;
  /** world position of the word's middle, on its baseline */
  pos: V3;
  /** XYZ Euler degrees */
  rot?: V3;
  /** em in world units */
  size?: number;
  weight?: number;
  /** how the letters arrive: from far behind and spread wide ('fly'), dropping from above ('drop'), or out of the
   *  camera ('pop') */
  enter?: 'fly' | 'drop' | 'pop';
  /** frames between letters */
  stagger?: number;
  /** frames a letter takes */
  dur?: number;
  color?: string;
  depth?: number;
}

/** One word of extruded letters, arriving letter by letter. */
export const Word3D: React.FC<{ w: WordSpec; frame: number; material?: Record<string, unknown> }> = ({ w, frame, material }) => {
  const { letters } = layout(w.text, w.weight ?? 700);
  const size = w.size ?? 1;
  const stagger = w.stagger ?? 1.6;
  const dur = w.dur ?? 9;
  const enter = w.enter ?? 'fly';
  if (frame < w.at - 1) return null;
  return (
    <Group3D position={w.pos} rotation={w.rot ?? [0, 0, 0]} scale={size}>
      {letters.map((l, i) => {
        const p = interpolate(frame, [w.at + i * stagger, w.at + i * stagger + dur], [0, 1], { ...clamp, easing: easeOut });
        if (p <= 0.001) return null;
        const q = 1 - p;
        const off: V3 =
          enter === 'fly' ? [l.x * 1.6 * q, 0.4 * q, -7 * q] : enter === 'drop' ? [0, 1.8 * q, -1.5 * q] : [l.x * 0.8 * q, -0.3 * q, 4.5 * q];
        const spin: V3 = enter === 'drop' ? [-80 * q, 0, 0] : enter === 'fly' ? [0, -40 * q, 0] : [0, 30 * q, 0];
        return (
          <Text3D
            key={i}
            font={FONT}
            weight={w.weight ?? 700}
            size={1}
            depth={w.depth ?? 0.22}
            bevel={{ thickness: 0.012, size: 0.008, segments: 2 }}
            position={[l.x + off[0], l.y + off[1], off[2]]}
            rotation={spin}
            material={{ color: w.color ?? '#ffffff', roughness: 0.38, ...material, opacity: Math.min(1, p * 1.6) }}
          >
            {l.c}
          </Text3D>
        );
      })}
    </Group3D>
  );
};

/** The 3D type of a shot, seen through its camera, rolled with it, motion blurred. */
export const Type3D: React.FC<{
  id: string;
  cam: CamState;
  words: WordSpec[];
  frame: number;
  defocus?: number;
  lights?: 'chrome' | 'flat';
  material?: Record<string, unknown>;
  shutter?: number;
  opacity?: number;
}> = ({ id, cam, words, frame, defocus = 0, lights = 'chrome', material, shutter = 1, opacity = 1 }) => {
  return (
    <Layer
      id={id}
      x={W / 2}
      y={H / 2}
      rotation={cam.roll}
      opacity={opacity}
      motionBlur={shutter > 0 ? { samples: 8, shutter } : undefined}
      effects={defocus > 0.3 ? [blur(defocus)] : []}
    >
    <Scene3D width={BOX} height={BOX} x={-BOX / 2} y={-BOX / 2}>
      <Camera3D fov={cam.fov} position={cam.pos} target={cam.target} near={0.05} far={200} />
      {lights === 'chrome' ? (
        <>
          <AmbientLight color="#aab2d4" intensity={0.3} />
          <DirectionalLight direction={[-0.3, -0.5, -1]} intensity={1.15} />
          <DirectionalLight direction={[0.9, 0.4, -0.3]} color="#7c84a8" intensity={0.45} />
        </>
      ) : (
        <AmbientLight intensity={1} />
      )}
      {words.map((w, i) => (
        <Word3D key={i} w={w} frame={frame} material={material} />
      ))}
    </Scene3D>
    </Layer>
  );
};
