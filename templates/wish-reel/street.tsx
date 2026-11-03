// The title look: rings, hatching and gradient
// tiles lie on the ground, gradient bars, lenses and diamonds hang in the air, "Shelter" builds a letter at a time
// with its katakana under it, a burst of crystal shards flies out along the tracks, and the picture runs from
// lime through yellow and orange to mint and white.

import React from 'react';
import { staticFile } from 'remotion';
import { AmbientLight, DirectionalLight, Group3D, Layer, Mesh, Scene3D, Text, Video, brightness, linearGradient, saturate, shader } from '@kinetographdev/core';
import { Card, Gem, Ring } from './props3d.js';
import { Cam3D, GroundRings, Roll, phaseAt } from './walk.js';
import type { Phase } from './walk.js';
import { H, JP, PAL, POP, SANS, W, arrive, clamp, clipAt, clipStart, easeOut, pick, pop, project, rnd, unproject, vpOf } from './lib.js';
import type { Clip, V3 } from './lib.js';

/** The footage, graded. `trim` is where in the clip this use starts, in frames. */
export const Plate: React.FC<{ src: string; trim?: number; grade?: ReturnType<typeof pop> | null; sat?: number }> = ({ src, trim = 0, grade, sat = 1.25 }) => (
  <Video
    src={staticFile(src)}
    width={W}
    height={H}
    trimBefore={trim}
    effects={[saturate(sat), brightness(1.08), ...(grade ? [shader({ code: POP, uniforms: grade })] : [])]}
  />
);

const RAINBOW_STRIPES = [PAL.cyan, PAL.mint, PAL.lime, PAL.yellow, PAL.orange, PAL.pink, PAL.coral];

/** Parallel stripes painted on the ground, shading through the rainbow. */
const Hatch: React.FC<{ at: V3; yaw: number; n: number; len: number; l: number; born: number }> = ({ at, yaw, n, len, l, born }) => {
  const grow = easeOut(clamp((l - born) / 4));
  if (grow <= 0) return null;
  const c = Math.cos((yaw * Math.PI) / 180);
  const s = Math.sin((yaw * Math.PI) / 180);
  return (
    <>
      {Array.from({ length: n }, (_, k) => {
        const o = (k - n / 2) * 0.16;
        return (
          <Card
            key={k}
            grad={0}
            w={0.05}
            h={len * grow}
            position={[at[0] + o * c, 0.015, at[2] - o * s]}
            rotation={[-90, yaw, 0]}
          />
        );
      }).map((el, k) => React.cloneElement(el, { key: k, grad: k % 6 }))}
    </>
  );
};

// lime on the trees, then yellow, orange over the mid tones, yellow again, mint, and the highs going white
const TRACK_PHASES: Phase[] = [
  { at: 0, c1: PAL.lime, c2: PAL.lime, lo: 0.55, hi: 0.68, white: 1.1, k2: 1, spread: 0.5 },
  { at: 5, c1: PAL.yellow, c2: '#fff08a', lo: 0.56, hi: 0.7, white: 1.1, k2: 1 },
  { at: 9, c1: PAL.orange, c2: '#ffc061', lo: 0.54, hi: 0.72, white: 1.1, k2: 1 },
  { at: 14, c1: PAL.yellow, c2: '#f4ff9a', lo: 0.5, hi: 0.68, white: 0.95 },
  { at: 19, c1: PAL.mint, c2: '#9dffc4', lo: 0.46, hi: 0.62, white: 0.82 },
  { at: 24, c1: PAL.mint, c2: PAL.lime, lo: 0.4, hi: 0.54, white: 0.64 },
  { at: 29, c1: PAL.mint, c2: '#c8ffd9', lo: 0.32, hi: 0.46, white: 0.5 },
];

const SHARD_COLOURS = [PAL.cyan, '#7ff7e8', PAL.yellow, PAL.lime, '#b8fff0', PAL.mint, '#ffe98a'];

/** Crystal shards bursting out of the crossing toward the camera, tumbling. */
const Shards: React.FC<{ l: number; n: number; from: V3 }> = ({ l, n, from }) => (
  <>
    {Array.from({ length: n }, (_, i) => {
      const t0 = rnd(`sh${i}`) * 9;
      const age = (l - t0) / 24;
      if (age < 0 || age > 1.1) return null;
      const a = rnd(`sa${i}`) * Math.PI * 2;
      const sp = 0.6 + rnd(`sv${i}`) * 2.4;
      const p: V3 = [from[0] + Math.cos(a) * sp * age * 2.6, from[1] + 0.4 + Math.abs(Math.sin(a)) * sp * age * 1.4, from[2] + age * (2.5 + rnd(`sz${i}`) * 3.5)];
      const sc = 0.12 + rnd(`ss${i}`) * 0.2;
      return (
        <Gem
          key={i}
          color={pick(SHARD_COLOURS, `sc${i}`)}
          position={p}
          rotation={[l * (6 + (i % 7)) + i * 31, l * (8 + (i % 5)) + i * 17, i * 43]}
          scale={[sc * (0.6 + rnd(`sx${i}`)), sc * (0.6 + rnd(`sy${i}`) * 1.2), sc * 0.7]}
        />
      );
    })}
  </>
);

/** Gradient bars, standing lenses and tall diamonds hanging over the street, popping in. */
const Hangers: React.FC<{ l: number; centre: V3; n: number; born: number }> = ({ l, centre, n, born }) => (
  <>
    {Array.from({ length: n }, (_, i) => {
      const grow = easeOut(clamp((l - born - rnd(`hb${i}`) * 10) / 2));
      if (grow <= 0) return null;
      const kind = i % 5;
      const p: V3 = [centre[0] + (rnd(`hx${i}`) - 0.5) * 7, centre[1] + (rnd(`hy${i}`) - 0.4) * 3.2, centre[2] + (rnd(`hz${i}`) - 0.5) * 8];
      if (kind < 3) {
        return <Card key={i} grad={[0, 1, 4][kind]} w={(1.2 + rnd(`hw${i}`) * 3.5) * grow} h={0.14 + rnd(`hh${i}`) * 0.16} position={p} />;
      }
      if (kind === 3) {
        return <Mesh3DLens key={i} p={p} s={(0.3 + rnd(`hs${i}`) * 0.4) * grow} grad={i % 6} />;
      }
      // a tall diamond: a square turned 45 degrees, squeezed
      const d = 0.9 + rnd(`hd${i}`) * 0.6;
      return (
        <Group3D key={i} position={p} scale={[0.28 * grow, 1.5 * grow, 1]}>
          <Card grad={3} w={d} h={d} position={[0, 0, 0]} rotation={[0, 0, 45]} />
        </Group3D>
      );
    })}
  </>
);
/** A standing lens: a flattened sphere with a gradient. */
const Mesh3DLens: React.FC<{ p: V3; s: number; grad: number }> = ({ p, s, grad }) => (
  <Mesh
    geometry={{ kind: 'sphere', radius: 0.5, segments: 32, rings: 16 }}
    position={p}
    scale={[s, s * 2.6, 0.04]}
    material={{ color: '#ffffff', texture: staticFile(`grad${grad}.png`), unlit: true }}
  />
);

/** The title look (the reference's "Shelter" shot), 36 frames, on any clip: `title` builds a letter at a time
 *  with `sub` under it. The whip montage replays part of it (`l` the shot frame, `trim` where its plate starts). */
export const TitleLook: React.FC<{ l: number; clip: Clip; trim?: number; title?: string; sub?: string }> = ({ l, clip, trim = 0, title = 'Shelter', sub = 'シェルター' }) => {
  const SHELTER = title;
  const SHELTER_JP = sub;
  const start = clipStart(clip);
  const vp0 = vpOf(clip);
  const SHELTER_AT = unproject(start, clamp(vp0.x - 520, 60, W - 600), clamp(vp0.y - 230, 120, H - 300), 9);
  const CROSSING = unproject(start, clamp(vp0.x + 180, 200, W - 200), clamp(vp0.y + 110, vp0.y + 40, H - 120), 9);
  const AIR = unproject(start, clamp(vp0.x + 100, 200, W - 200), clamp(vp0.y - 110, 150, H - 150), 12);
  const { cam, roll } = clipAt(clip, l);
  const ph = phaseAt(TRACK_PHASES, l);
  const grade = pop({ ...ph, spread: ph.spread ?? 1, invert: 0, seed: ph.at + 3, amount: arrive(l) });
  const at = project(cam, SHELTER_AT);
  const size = at ? 96 * (9 / at.d) : 96;
  const typed = clamp(Math.floor((l - 3) / 2.2) + 1, 0, SHELTER.length);
  const jp = clamp(Math.floor((l - 12) / 2) + 1, 0, SHELTER_JP.length);
  const dark = l >= 24;
  return (
    <Layer id="track">
      <Layer id="track-graded" effects={[shader({ code: POP, uniforms: grade })]}>
        <Video src={staticFile(clip.src)} width={W} height={H} trimBefore={(clip.trim ?? 0) + trim} effects={[saturate(1.3), brightness(1.12)]} />
        <Roll r={roll} id="track-roll">
          <Scene3D id="track-ground" width={W} height={H}>
            <Cam3D cam={cam} />
            <GroundRings l={l} sets={[[CROSSING[0] - 1.5, CROSSING[2] + 2], [CROSSING[0] + 0.8, CROSSING[2]], [CROSSING[0] - 0.4, CROSSING[2] - 3], [CROSSING[0] + 2, CROSSING[2] + 3.5]]} />
            <Hatch at={[CROSSING[0] - 1.2, 0, CROSSING[2] + 3]} yaw={20} n={12} len={1.2} l={l} born={0} />
            <Hatch at={[CROSSING[0] + 1.6, 0, CROSSING[2] + 1]} yaw={-70} n={10} len={1.6} l={l} born={2} />
            <Hatch at={[CROSSING[0] + 0.2, 0, CROSSING[2] - 2]} yaw={80} n={9} len={1} l={l} born={4} />
            <Card grad={1} w={1.6} h={0.9} position={[CROSSING[0] + 2.4, 0.02, CROSSING[2] + 4]} rotation={[-90, 25, 0]} />
            <Card grad={4} w={1.4} h={0.8} position={[CROSSING[0] - 0.6, 0.02, CROSSING[2] - 1]} rotation={[-90, -15, 0]} />
            <Ring color={PAL.pink} r={0.9} tube={0.025} position={[CROSSING[0] + 0.2, 0.02, CROSSING[2] + 1.2]} />
          </Scene3D>
        </Roll>
      </Layer>
      <Roll r={roll} id="track-over">
        <Scene3D id="track-air" width={W} height={H}>
          <Cam3D cam={cam} />
          <AmbientLight intensity={0.6} />
          <DirectionalLight direction={[-1, -0.6, -1]} color="#8ff7ff" intensity={1.8} />
          <DirectionalLight direction={[1, -0.3, -0.8]} color="#fff27a" intensity={1.4} />
          <DirectionalLight direction={[0, 1, -0.5]} color="#ff9bd0" intensity={0.7} />
          <Hangers l={l} centre={AIR} n={26} born={2} />
          {l >= 10 && <Shards l={l - 10} n={110} from={CROSSING} />}
        </Scene3D>
        {at && typed > 0 && (
          <Text
            id="shelter"
            font={SANS}
            weight={500}
            size={size}
            x={at.x}
            y={at.y}
            color={dark ? linearGradient(['#3a1a6a', '#121018'], { angle: 90 }) : linearGradient(['#3d7bff', '#2a2bd6', '#6a2bd6'], { angle: 90 })}
            chars={Array.from(SHELTER).map((_, k) => {
              const age = l - (3 + k * 2.2);
              if (k >= typed) return { opacity: 0 };
              const g = easeOut(clamp(age / 3));
              return { scale: 1 + 1.3 * (1 - g), y: -size * 0.4 * (1 - g), opacity: 0.55 + 0.45 * g, color: g < 0.7 ? '#a8c4ff' : undefined };
            })}
          >
            {SHELTER}
          </Text>
        )}
        {at && jp > 0 && (
          <Text id="shelter-jp" font={JP} weight={500} size={size * 0.4} color={dark ? '#1a1424' : '#3b2f8f'} x={at.x + size * 1.05} y={at.y + size * 1.02}>
            {SHELTER_JP.slice(0, jp)}
          </Text>
        )}
      </Roll>
    </Layer>
  );
};
