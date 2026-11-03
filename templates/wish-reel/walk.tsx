// The rays look, and the pieces the other looks share. Ribbons of colour fan up out of the
// vanishing point, a clock face of serif numerals rings it, road signs lie strewn along the floor with rings of
// colour, gradient bars hang in the air with blocks of code-like glyphs, petals drift, and the picture steps
// through flat pop colours, a negative and a wash to white, a few frames at a time, as the reference does.

import React from 'react';
import { staticFile } from 'remotion';
import { Camera3D, Group3D, Layer, Path, Scene3D, Text, Video, brightness, invert, linearGradient, saturate, shader } from '@kinetographdev/core';
import { Card, Numeral, ROMAN, Ring, SIGN_KINDS, Sign } from './props3d.js';
import { H, JP, PAL, POP, W, arrive, clamp, clipAt, clipStart, easeOut, lerp, pick, pop, project, rnd, twos, unproject, vpOf } from './lib.js';
import type { Cam, Clip, V3 } from './lib.js';

/** One step of a shot's grade: from this frame on, these bands and colours. */
export interface Phase {
  at: number;
  c1: string;
  c2: string;
  lo: number;
  hi: number;
  white: number;
  k1?: number;
  k2?: number;
  spread?: number;
  invert?: boolean;
}
export const phaseAt = (phases: Phase[], l: number) => phases.reduce((p, q) => (l >= q.at ? q : p), phases[0]);

// Read off the reference a frame at a time: a little lime, then the mid tones yellow, then coral, then the sky pink
// over orange, a negative, and the highs blowing out to white over yellow and then over lime and mint.
const WALK_PHASES: Phase[] = [
  { at: 0, c1: PAL.lime, c2: PAL.lime, lo: 0.5, hi: 0.64, white: 1.1, k2: 1, spread: 0.45 },
  { at: 3, c1: PAL.yellow, c2: PAL.yellow, lo: 0.46, hi: 0.68, white: 1.1, k2: 1 },
  { at: 6, c1: PAL.coral, c2: '#ffd0a0', lo: 0.46, hi: 0.66, white: 1.1, k2: 1 },
  { at: 9, c1: PAL.orange, c2: PAL.pink, lo: 0.46, hi: 0.64, white: 1.1 },
  { at: 12, c1: '#ff7f50', c2: '#ff5fa8', lo: 0.45, hi: 0.63, white: 1.1 },
  { at: 15, c1: PAL.orange, c2: PAL.pink, lo: 0.38, hi: 0.6, white: 1.1, invert: true },
  { at: 17, c1: PAL.yellow, c2: PAL.lime, lo: 0.42, hi: 0.6, white: 0.78 },
  { at: 22, c1: PAL.lime, c2: PAL.mint, lo: 0.38, hi: 0.52, white: 0.66 },
  { at: 27, c1: PAL.mint, c2: '#b8ffd8', lo: 0.28, hi: 0.45, white: 0.55 },
];

const RAY_COLOURS = [PAL.yellow, PAL.orange, PAL.pink, PAL.lime, PAL.mint, PAL.cyan, '#4f8dff', '#ffd36a', PAL.coral];

/** Wide ribbons of colour fanning up out of the vanishing point, bending a little, reshaped on twos. */
export const Ribbons: React.FC<{ l: number; vp: { x: number; y: number }; n?: number; seed: string; from?: number; to?: number; grow?: boolean }> = ({
  l,
  vp,
  n = 22,
  seed,
  from = 212,
  to = 328,
  grow = true,
}) => {
  const t = twos(l);
  const out: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const born = grow ? 2 + rnd(`${seed}rb${i}`) * 8 : -10;
    const g = easeOut(clamp((l - born) / 3));
    if (g <= 0) continue;
    const a = ((from + ((to - from) * (i + 0.5 + (rnd(`${seed}ra${i}`) - 0.5) * 0.8)) / n + Math.sin(t * 0.3 + i * 1.7) * 1.5) * Math.PI) / 180;
    const len = 1500 * g;
    const wTop = 18 + rnd(`${seed}rw${i}`) * 62;
    const bend = (rnd(`${seed}rk${i}`) - 0.5) * 0.35 + Math.sin(t * 0.2 + i) * 0.04;
    const tip = [vp.x + Math.cos(a) * len, vp.y + Math.sin(a) * len];
    const nx = -Math.sin(a);
    const ny = Math.cos(a);
    const mid = [vp.x + Math.cos(a + bend) * len * 0.45, vp.y + Math.sin(a + bend) * len * 0.45];
    const d = [
      `M ${vp.x + nx * 2} ${vp.y + ny * 2}`,
      `Q ${mid[0] + nx * wTop * 0.3} ${mid[1] + ny * wTop * 0.3} ${tip[0] + nx * wTop} ${tip[1] + ny * wTop}`,
      `L ${tip[0] - nx * wTop} ${tip[1] - ny * wTop}`,
      `Q ${mid[0] - nx * wTop * 0.3} ${mid[1] - ny * wTop * 0.3} ${vp.x - nx * 2} ${vp.y - ny * 2}`,
      'Z',
    ].join(' ');
    out.push(<Path key={i} d={d} fill={RAY_COLOURS[(i * 4 + Math.floor(rnd(`${seed}rc${i}`) * 3)) % RAY_COLOURS.length]} />);
  }
  return <Layer id={`ribbons-${seed}`}>{out}</Layer>;
};

/** Signs strewn along the ground and hovering low, popping in, turning slowly. */
export const GroundSigns: React.FC<{ l: number; n: number; seed: string; near: number; far: number; spread: number }> = ({ l, n, seed, near, far, spread }) => (
  <>
    {Array.from({ length: n }, (_, i) => {
      const grow = easeOut(clamp((l - rnd(`${seed}sb${i}`) * 6) / 3));
      if (grow <= 0) return null;
      const z = -(near + rnd(`${seed}sz${i}`) * (far - near));
      const side = i % 2 ? 1 : -1;
      const x = side * (0.5 + rnd(`${seed}sx${i}`) * spread) * (0.4 + -z / far);
      const lying = rnd(`${seed}sl${i}`) < 0.55;
      const y = lying ? 0.03 : 0.25 + rnd(`${seed}sy${i}`) * 1.2;
      const spin = (rnd(`${seed}ss${i}`) - 0.5) * 4;
      const rot: V3 = lying
        ? [-90 + (rnd(`${seed}rx${i}`) - 0.5) * 40, rnd(`${seed}ry${i}`) * 360 + l * spin, 0]
        : [(rnd(`${seed}rx${i}`) - 0.5) * 50 + l * spin, rnd(`${seed}ry${i}`) * 80 - 40, (rnd(`${seed}rz${i}`) - 0.5) * 60];
      return <Sign key={i} kind={pick(SIGN_KINDS, `${seed}k${i}`)} position={[x, y, z]} rotation={rot} scale={(0.28 + rnd(`${seed}sc${i}`) * 0.22) * grow} />;
    })}
  </>
);

/** Concentric rings lying on the ground in a few colours. */
export const GroundRings: React.FC<{ l: number; sets: [number, number][] }> = ({ l, sets }) => (
  <>
    {sets.flatMap(([x, z], i) =>
      [0, 1, 2].map((k) => (
        <Ring
          key={`${i}-${k}`}
          color={[PAL.cyan, PAL.yellow, PAL.pink, PAL.mint][(i + k) % 4]}
          r={(0.35 + k * 0.22) * Math.max(0.001, easeOut(clamp((l - i * 0.7 - k) / 4)))}
          tube={0.03}
          position={[x, 0.02, z]}
        />
      )),
    )}
  </>
);

/** The clock face: twelve serif numerals in a ring, facing the camera, turning slowly. */
export const ClockRing: React.FC<{ centre: V3; r: number; turn: number; color?: string; size?: number; yaw?: number }> = ({
  centre,
  r,
  turn,
  color = '#ffffff',
  size = 0.95,
  yaw = 0,
}) => {
  const c = Math.cos((yaw * Math.PI) / 180);
  const s = Math.sin((yaw * Math.PI) / 180);
  return (
    <>
      {ROMAN.map((n, k) => {
        const th = 90 - (k + 1) * 30 + turn;
        const a = (th * Math.PI) / 180;
        const lx = Math.cos(a) * r;
        return (
          <Numeral
            key={n}
            n={n}
            color={color}
            position={[centre[0] + lx * c, centre[1] + Math.sin(a) * r, centre[2] - lx * s]}
            rotation={[0, yaw, th - 90]}
            scale={size}
          />
        );
      })}
    </>
  );
};

/** Gradient bars and squares hanging in the air, facing the camera. */
export const AirCards: React.FC<{ l: number; seed: string; centre: V3; n: number }> = ({ l, seed, centre, n }) => (
  <>
    {Array.from({ length: n }, (_, i) => {
      const grow = easeOut(clamp((l - rnd(`${seed}cb${i}`) * 12) / 2));
      if (grow <= 0) return null;
      const square = rnd(`${seed}cq${i}`) < 0.3;
      const w = square ? 0.5 + rnd(`${seed}cw${i}`) * 0.4 : 0.9 + rnd(`${seed}cw${i}`) * 2.2;
      const h = square ? w * (0.8 + rnd(`${seed}ch${i}`) * 0.3) : 0.08 + rnd(`${seed}ch${i}`) * 0.12;
      const p: V3 = [centre[0] + (rnd(`${seed}cx${i}`) - 0.5) * 6, centre[1] + (rnd(`${seed}cy${i}`) - 0.55) * 3.6, centre[2] + (rnd(`${seed}cz${i}`) - 0.5) * 6];
      return <Card key={i} grad={[3, 0, 1, 4, 2][i % 5]} w={w * grow} h={h} position={p} />;
    })}
  </>
);

const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンあいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんぁぃぅぇぉゃゅょっ';
const glyphs = (k: string, n: number) => Array.from({ length: n }, (_, i) => GLYPHS[Math.floor(rnd(`${k}-${i}`) * GLYPHS.length)]).join(' ');

/** Code-like two-line blocks of Latin and kana hanging in the air, re-rolled on twos. */
export const GlyphCloud: React.FC<{ l: number; cam: Cam; centre: V3; n: number; color: string; seed: string }> = ({ l, cam, centre, n, color, seed }) => {
  const t = twos(l);
  const out: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const p = project(cam, [centre[0] + (rnd(`${seed}gx${i}`) - 0.5) * 7, centre[1] + (rnd(`${seed}gy${i}`) - 0.45) * 3.4, centre[2] + (rnd(`${seed}gz${i}`) - 0.5) * 4]);
    if (!p) continue;
    const k = `${seed}${i}-${Math.floor(t / 2)}`;
    out.push(
      <Text key={i} font={JP} weight={500} size={clamp(220 / p.d, 12, 30)} lineHeight={1.15} color={color} x={p.x} y={p.y}>
        {glyphs(`${k}a`, 6 + (i % 5)) + '\n' + glyphs(`${k}b`, 7 + (i % 4))}
      </Text>,
    );
  }
  return <Layer id={`glyphs-${seed}`}>{out}</Layer>;
};

/** Little gradient petals drifting in the air, drawn through the camera. */
export const Petals: React.FC<{ l: number; cam: Cam; n: number; seed: string; box: [V3, V3] }> = ({ l, cam, n, seed, box }) => {
  const out: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const w: V3 = [
      lerp(box[0][0], box[1][0], rnd(`${seed}px${i}`)) + Math.sin(l * 0.07 + i) * 0.2,
      lerp(box[0][1], box[1][1], rnd(`${seed}py${i}`)) - l * 0.01 * (1 + (i % 3)),
      lerp(box[0][2], box[1][2], rnd(`${seed}pz${i}`)),
    ];
    const p = project(cam, w);
    if (!p) continue;
    const s = clamp(120 / p.d, 4, 22);
    out.push(
      <Path
        key={i}
        d={`M 0 ${-s} C ${s * 0.9} ${-s * 0.3} ${s * 0.6} ${s * 0.8} 0 ${s} C ${-s * 0.6} ${s * 0.8} ${-s * 0.9} ${-s * 0.3} 0 ${-s} Z`}
        x={p.x}
        y={p.y}
        rotation={rnd(`${seed}pr${i}`) * 360 + l * (2 + (i % 4))}
        fill={linearGradient([PAL.orange, PAL.yellow, PAL.mint], { angle: 160 })}
      />,
    );
  }
  return <Layer id={`petals-${seed}`}>{out}</Layer>;
};

/** Turns its children about the frame's centre: a rolled camera. */
export const Roll: React.FC<{ r: number; id: string; children: React.ReactNode }> = ({ r, id, children }) => (
  <Layer id={id} x={W / 2} y={H / 2} anchorX={W / 2} anchorY={H / 2} rotation={r}>
    {children}
  </Layer>
);

export const Cam3D: React.FC<{ cam: Cam }> = ({ cam }) => <Camera3D fov={cam.fov} position={cam.pos} target={cam.target} />;

/** Objects placed as the shot's first camera stands: x to its right, -z ahead of it, y up from the floor. */
export const Floor: React.FC<{ cam: Cam; children: React.ReactNode }> = ({ cam, children }) => {
  const h = Math.atan2(cam.target[0] - cam.pos[0], -(cam.target[2] - cam.pos[2]));
  return (
    <Group3D position={[cam.pos[0], 0, cam.pos[2]]} rotation={[0, (-h * 180) / Math.PI, 0]}>
      {children}
    </Group3D>
  );
};

/** The rays look (the reference's first street shot), 33 frames, on any clip. The whip montage replays part of it:
 *  `l` is then the shot frame and `trim` how far into the shot the montage's first frame is. */
export const RaysLook: React.FC<{ l: number; clip: Clip; trim?: number }> = ({ l, clip, trim = 0 }) => {
  const start = clipStart(clip);
  const vp0 = vpOf(clip);
  const far = unproject(start, vp0.x, vp0.y, 30);
  const clock = unproject(start, vp0.x, vp0.y - 90, 13);
  const air = unproject(start, vp0.x, vp0.y - 120, 11);
  const { cam, roll } = clipAt(clip, l);
  const ph = phaseAt(WALK_PHASES, l);
  const vp = project(cam, far) ?? vp0;
  const grade = pop({ ...ph, spread: ph.spread ?? 1, invert: 0, seed: ph.at, amount: arrive(l) });
  return (
    <Layer id="street" effects={ph.invert ? [invert(1)] : []}>
      <Layer id="street-graded" effects={[shader({ code: POP, uniforms: grade })]}>
        <Video src={staticFile(clip.src)} width={W} height={H} trimBefore={(clip.trim ?? 0) + trim} effects={[saturate(1.35), brightness(1.15)]} />
        <Roll r={roll} id="street-roll">
          <Scene3D id="street-ground" width={W} height={H}>
            <Cam3D cam={cam} />
            <Floor cam={start}>
              <GroundRings l={l} sets={[[-0.6, -2.5], [0.7, -4.5], [-0.3, -7], [0.5, -10], [-0.5, -13]]} />
              <GroundSigns l={l} n={40} seed="w" near={3} far={22} spread={1.4} />
            </Floor>
            <ClockRing centre={clock} r={4.4 * (0.7 + 0.3 * arrive(l))} turn={l * 0.6} size={0.8 * arrive(l)} />
          </Scene3D>
        </Roll>
      </Layer>
      <Roll r={roll} id="street-over">
        <Ribbons l={l} vp={vp} seed="w" />
        <Scene3D id="street-air" width={W} height={H}>
          <Cam3D cam={cam} />
          <AirCards l={l} seed="w" centre={air} n={11} />
        </Scene3D>
        {l >= 4 && <GlyphCloud l={l} cam={cam} centre={air} n={9} color={l < 10 ? '#ffffff' : '#141414'} seed="w" />}
        <Petals l={l} cam={cam} n={34} seed="w" box={[[-5, 0.4, -3], [5, 5, -16]]} />
      </Roll>
    </Layer>
  );
};
