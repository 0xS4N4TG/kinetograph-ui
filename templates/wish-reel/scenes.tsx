// The 3D shots: the country road where white poles march past and a storm of gradient cards fills the sky;
// the helix of coloured strands with gradient crosses in a white void, which wraps itself round a picture of the
// sea; and the seaside crossing where a clock face of roman numerals turns with signs spiralling through it.

import React from 'react';
import { staticFile } from 'remotion';
import { AmbientLight, Camera3D, DirectionalLight, Group3D, Layer, Mesh, Path, PointLight, Rect, Scene3D, Text, Video, contrast, saturate, brightness, shader } from '@kinetographdev/core';
import { Card, Cross, Numeral, ROMAN, SIGN_KINDS, Sign } from './props3d.js';
import type { SignKind } from './props3d.js';
import { Cam3D, ClockRing, Roll, phaseAt } from './walk.js';
import type { Phase } from './walk.js';
import { Plate } from './street.js';
import type { Cam, Clip, V3 } from './lib.js';
import { H, PAL, POP, RAINBOW, SANS, SMEAR, W, arrive, clipAt, clipStart, unproject, vpOf, clamp, easeOut, lerp, pick, pop, prog, project, rnd, twos } from './lib.js';

// ---- the shopping street ----

const ROAD_PHASES: Phase[] = [
  { at: 0, c1: PAL.lime, c2: PAL.lime, lo: 2, hi: 2, white: 2 },
  { at: 4, c1: PAL.lime, c2: PAL.lime, lo: 0.42, hi: 0.6, white: 1.1, k2: 1, spread: 0.7 },
  { at: 9, c1: PAL.lime, c2: PAL.yellow, lo: 0.42, hi: 0.6, white: 1.1 },
  { at: 15, c1: '#ffb347', c2: '#ff7a5c', lo: 0.42, hi: 0.58, white: 1.1 },
  { at: 22, c1: PAL.lime, c2: '#ffe066', lo: 0.4, hi: 0.58, white: 0.9 },
  { at: 30, c1: PAL.mint, c2: PAL.lime, lo: 0.38, hi: 0.56, white: 0.8 },
  { at: 40, c1: PAL.lime, c2: '#b6ff7a', lo: 0.34, hi: 0.52, white: 0.66 },
  { at: 50, c1: PAL.lime, c2: '#d6ffb0', lo: 0.3, hi: 0.46, white: 0.52 },
];

const FORMULAS = ['x=(-b±√(b²-4ac))/2a', 'log(xy)=log x+log y', 'd=vt', 'sin²θ+cos²θ=1', 'θ=180°', 'v=v₀+at', '(a+b)²=a²+2ab+b²', 'E=mc²', 'y=ax+b', '∫f(x)dx', 'P(A|B)', 'a²+b²=c²', 'n!=n(n-1)!', 'λ=v/f'];

/** A street pole with an arm, a 40 sign, a no-parking disc and a small blue sign. `clay` draws it all plain white,
 *  the untextured preview the reference flashes first. */
const SignPole: React.FC<{ at: V3; h: number; clay: boolean; i: number }> = ({ at, h, clay, i }) => {
  const metal = { color: clay ? '#ffffff' : '#7d97ab', unlit: clay, roughness: 0.4, metallic: 0.3 };
  const sign = (kind: SignKind, y: number, x: number, s: number) =>
    clay ? (
      <Mesh key={kind + y} geometry={{ kind: 'sphere', radius: 0.5 }} position={[x, y, 0]} scale={[s, s, s * 0.3]} material={{ color: '#ffffff', unlit: true }} />
    ) : (
      <Sign key={kind + y} kind={kind} position={[x, y, 0.06]} scale={s} />
    );
  return (
    <Group3D position={at}>
      <Mesh geometry={{ kind: 'cylinder', radiusTop: 0.05, radiusBottom: 0.05, height: h, segments: 12 }} position={[0, h / 2, 0]} material={metal} />
      <Mesh geometry={{ kind: 'cylinder', radiusTop: 0.035, radiusBottom: 0.035, height: 1.1, segments: 10 }} position={[0.55, h - 0.1, 0]} rotation={[0, 0, 90]} material={metal} />
      {sign('speed', h - 0.55, 0.55, 0.62)}
      {sign('nopark', h - 1.25, 0.0, 0.55)}
      {sign(i % 2 ? 'blue' : 'walk', h - 1.85, 0.0, 0.42)}
    </Group3D>
  );
};

/** Patchwork and gradient cards pouring along the street toward the camera, tumbling. */
const CardStorm: React.FC<{ l: number; n: number; start: V3; end: V3 }> = ({ l, n, start, end }) => (
  <>
    {Array.from({ length: n }, (_, i) => {
      const life = 30 + rnd(`cl${i}`) * 20;
      const age = (l - (rnd(`cb${i}`) * 50 - 30)) / life;
      if (age < 0 || age > 1) return null;
      const ang = rnd(`ca${i}`) * Math.PI * 2 + age * 2.5;
      const rad = 0.6 + rnd(`cr${i}`) * 3 + age * 2;
      const p: V3 = [lerp(start[0], end[0], age) + Math.cos(ang) * rad, lerp(start[1], end[1], age) + Math.sin(ang) * rad * 0.7 + 1, lerp(start[2], end[2], age)];
      const sz = 0.25 + rnd(`cs${i}`) * 0.75;
      const rot: V3 = [l * (3 + (i % 6)) + i * 20, l * (4 + (i % 4)) + i * 50, i * 13];
      if (i % 3 !== 2) {
        return (
          <Mesh
            key={i}
            geometry={{ kind: 'plane', width: 1, height: 0.8 }}
            position={p}
            rotation={rot}
            scale={sz}
            material={{ color: '#ffffff', texture: staticFile(`patch${i % 6}.png`), unlit: true, doubleSided: true }}
          />
        );
      }
      return i % 2 ? <Sign key={i} kind={pick(SIGN_KINDS, `ck${i}`)} position={p} rotation={rot} scale={sz * 0.5} /> : <Card key={i} grad={i} position={p} rotation={rot} scale={sz} />;
    })}
  </>
);

/** Small formulas floating in the air, drawn through the camera. */
const Formulas: React.FC<{ l: number; cam: Cam; n: number; centre: V3; color: string }> = ({ l, cam, n, centre, color }) => (
  <Layer id="formulas">
    {Array.from({ length: n }, (_, i) => {
      const p = project(cam, [centre[0] + (rnd(`fx${i}`) - 0.5) * 9, centre[1] + (rnd(`fy${i}`) - 0.3) * 4, centre[2] + (rnd(`fz${i}`) - 0.5) * 8]);
      if (!p) return null;
      return (
        <Text key={i} font={SANS} weight={500} size={clamp(140 / p.d, 10, 24)} color={color} x={p.x} y={p.y}>
          {FORMULAS[(i + Math.floor(twos(l) / 8)) % FORMULAS.length]}
        </Text>
      );
    })}
  </Layer>
);

/** Rainbow speed lines rushing out of the bottom left into the vanishing point. */
const SpeedLines: React.FC<{ l: number; n: number; vp: { x: number; y: number } }> = ({ l, n, vp }) => {
  const t = twos(l);
  const out: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const k = `sl${i}-${Math.floor(t / 2)}`;
    const a = ((112 + rnd(`${k}a`) * 50) * Math.PI) / 180;
    const r0 = 30 + rnd(`${k}r`) * 160;
    const r1 = 700 + rnd(`${k}l`) * 800;
    const w = 2 + rnd(`${k}w`) * 9;
    const nx = -Math.sin(a) * w;
    const ny = Math.cos(a) * w;
    const x0 = vp.x + Math.cos(a) * r0;
    const y0 = vp.y + Math.sin(a) * r0;
    const x1 = vp.x + Math.cos(a) * r1;
    const y1 = vp.y + Math.sin(a) * r1;
    out.push(<Path key={i} d={`M ${x0} ${y0} L ${x1 + nx} ${y1 + ny} L ${x1 - nx} ${y1 - ny} Z`} fill={pick(RAINBOW, `${k}c`)} />);
  }
  return <Layer id="speed">{out}</Layer>;
};

/** The storm look (the reference's road of sign poles), 63 frames, on any clip. */
export const StormLook: React.FC<{ l: number; clip: Clip }> = ({ l, clip }) => {
  const S0 = clipStart(clip);
  const ROAD_VP0 = vpOf(clip);
  const ROAD_FAR = unproject(S0, ROAD_VP0.x, ROAD_VP0.y, 40);
  const POLE_NEAR = unproject(S0, W * 0.29, H * 0.9, 6);
  const POLE_FAR = unproject(S0, W * 0.82, H * 0.67, 19);
  const STORM_START = unproject(S0, W * 0.62, H * 0.28, 24);
  const STORM_END = unproject(S0, W * 0.44, H * 0.39, 2.5);
  const { cam, roll } = clipAt(clip, l);
  const ph = phaseAt(ROAD_PHASES, l);
  const grade = pop({ ...ph, spread: ph.spread ?? 1, invert: 0, seed: ph.at + 9, amount: arrive(l) });
  const vp = project(cam, ROAD_FAR) ?? ROAD_VP0;
  const clay = l < 4;
  return (
    <Layer id="road">
      <Layer id="road-graded" effects={[shader({ code: POP, uniforms: grade })]}>
        <Video src={staticFile(clip.src)} width={W} height={H} trimBefore={clip.trim ?? 0} effects={[saturate(1.35), brightness(1.15)]} />
      </Layer>
      <Roll r={roll} id="road-over">
        {l >= 8 && <SpeedLines l={l} n={36} vp={vp} />}
        <Scene3D id="road-3d" width={W} height={H}>
          <Cam3D cam={cam} />
          <AmbientLight intensity={0.8} />
          <DirectionalLight direction={[-0.6, -1, -0.5]} intensity={1.2} />
          {Array.from({ length: 6 }, (_, i) => {
            const t = i / 5;
            return <SignPole key={i} i={i} clay={clay} h={3.8} at={[lerp(POLE_NEAR[0], POLE_FAR[0], t), lerp(POLE_NEAR[1], POLE_FAR[1], t), lerp(POLE_NEAR[2], POLE_FAR[2], t)]} />;
          })}
          {l >= 2 && <CardStorm l={l} n={240} start={STORM_START} end={STORM_END} />}
        </Scene3D>
        {l >= 6 && <Formulas l={l} cam={cam} n={18} centre={unproject(S0, W * 0.44, H * 0.35, 10)} color={l < 40 ? '#ffffff' : '#2a3a2a'} />}
      </Roll>
    </Layer>
  );
};

// ---- the helix ----

const STRAND_COLOURS = [PAL.cyan, PAL.mint, PAL.yellow, PAL.orange, PAL.pink, PAL.coral, '#8fd3ff', PAL.lime, '#ffb3d9'];
const STRANDS = 28;

/** A point on strand i at s (0..1 along the bundle) for the void helix: a tilted spring coming down from the top left. */
function helixPoint(i: number, s: number, l: number): V3 {
  const cx = lerp(-7, 2.5, s);
  const cy = lerp(5, -2.6, s);
  const cz = lerp(-3, 1, s);
  const band = (i / (STRANDS - 1) - 0.5) * 2;
  const r = (1.6 + 0.8 * Math.sin(Math.PI * s)) * (1 + band * 0.2 + (rnd(`hr${i}`) - 0.5) * 0.18);
  const th = Math.PI * 2 * 3.1 * s + l * 0.04 + (rnd(`hp${i}`) - 0.5) * 0.12;
  return [cx + Math.cos(th) * r, cy + band * 0.7 + Math.sin(th) * r * 0.35, cz + Math.sin(th) * r];
}

/** A point on strand i for the rings round the sea: loops lying nearly flat, rising slowly. */
function loopPoint(i: number, s: number, l: number): V3 {
  const band = (i / (STRANDS - 1) - 0.5) * 1.6;
  const r = 3.1 * (1 + band * 0.16 + (rnd(`lr${i}`) - 0.5) * 0.08);
  const th = Math.PI * 2 * 2.6 * s + l * 0.12;
  return [Math.cos(th) * r, -1.8 + s * 1.4 + band * 0.4, Math.sin(th) * r];
}

/** The strands, projected through the same camera as the 3D layer and drawn as thin lines. */
const Strands: React.FC<{ cam: Cam; l: number; head: number; len: number; at: (i: number, s: number, l: number) => V3; id: string }> = ({ cam, l, head, len, at, id }) => {
  const out: React.ReactNode[] = [];
  for (let i = 0; i < STRANDS; i++) {
    const s1 = clamp(head - rnd(`hh${i}`) * 0.09);
    const s0 = clamp(s1 - len * (0.55 + rnd(`hn${i}`) * 0.5));
    if (s1 <= s0) continue;
    const pts: string[] = [];
    const steps = 110;
    for (let k = 0; k <= steps; k++) {
      const s = lerp(s0, s1, k / steps);
      const p = project(cam, at(i, clamp(s), l));
      if (p) pts.push(`${pts.length ? 'L' : 'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
    }
    out.push(
      <Path
        key={i}
        d={pts.join(' ')}
        stroke={{ color: STRAND_COLOURS[i % STRAND_COLOURS.length], width: 2.5 + rnd(`hw${i}`) * 5 }}
      />,
    );
  }
  return <Layer id={id}>{out}</Layer>;
};

const CROSS_COLOURS = ['#ffd84a', '#6ff0b0', '#ffa14a', '#5fe3ff', '#ff86c0'];

/** Gradient crosses drifting and turning through the void. */
const Crosses: React.FC<{ l: number; n: number; spread: number }> = ({ l, n, spread }) => (
  <>
    {Array.from({ length: n }, (_, i) => {
      const p: V3 = [(rnd(`xx${i}`) - 0.5) * spread * 2, (rnd(`xy${i}`) - 0.5) * spread * 1.2 + Math.sin(l * 0.05 + i) * 0.3, (rnd(`xz${i}`) - 0.5) * spread];
      return (
        <Cross
          key={i}
          color="#ffffff"
          grad={[1, 1, 3, 4, 0][i % 5]}
          position={p}
          rotation={[l * (2 + (i % 5)) + i * 40, l * (3 + (i % 3)) + i * 70, i * 17]}
          scale={0.4 + rnd(`xs${i}`) * 0.4}
        />
      );
    })}
  </>
);

/** Little coloured specks, scattered over the void. */
const Confetti: React.FC<{ l: number; n: number }> = ({ l, n }) => (
  <Layer id="confetti">
    {Array.from({ length: n }, (_, i) => {
      const s = 5 + rnd(`cf${i}`) * 7;
      const x = rnd(`cx${i}`) * W;
      const y = (rnd(`cy${i}`) * H + l * (1 + rnd(`cv${i}`) * 3)) % H;
      return <Rect key={i} x={x} y={y} width={s} height={s} rotation={45} fill={pick([...CROSS_COLOURS, PAL.pink], `cc${i}`)} opacity={0.85} />;
    })}
  </Layer>
);

const Void3D: React.FC<{ cam: Cam; l: number; children: React.ReactNode; id: string }> = ({ cam, children, id }) => (
  <Scene3D id={id} width={W} height={H}>
    <Camera3D fov={cam.fov} position={cam.pos} target={cam.target} />
    <AmbientLight intensity={0.35} />
    <DirectionalLight direction={[-0.5, -0.4, -1]} intensity={1.1} />
    <DirectionalLight direction={[1, -0.6, -0.2]} color="#ffe2b0" intensity={0.5} />
    {children}
  </Scene3D>
);

/** Shot 5, 51 frames: the helix in the white void, the camera swinging round it. */
export const HelixShot: React.FC<{ l: number }> = ({ l }) => {
  const a = ((-35 + l * 1.6) * Math.PI) / 180;
  const cam: Cam = { pos: [Math.sin(a) * 7.5, 1.2, Math.cos(a) * 7.5], target: [0, 0, 0], fov: 50 };
  const head = easeOut(prog(l, 0, 30, (v) => v)) * 1.15;
  return (
    <Layer id="helix">
      <Rect width={W} height={H} fill={PAL.white} />
      <Confetti l={l} n={130} />
      <Void3D cam={cam} l={l} id="helix-3d">
        <Crosses l={l} n={24} spread={6} />
      </Void3D>
      <Strands cam={cam} l={l} head={head} len={0.62} at={helixPoint} id="helix-strands" />
    </Layer>
  );
};

/** The framed look, 21 frames, on any clip: the clip as a framed picture with the strands looping round it, then
 *  smeared sideways. */
export const FramedLook: React.FC<{ l: number; clip: Clip }> = ({ l, clip }) => {
  const cam: Cam = { pos: [0, 2.4, 9], target: [0, -0.6, 0], fov: 50 };
  const smear = prog(l, 15, 21) * 700;
  return (
    <Layer id="sea">
      <Rect width={W} height={H} fill={PAL.white} />
      <Layer id="sea-inner" effects={smear > 0 ? [shader({ code: SMEAR, uniforms: { amount: smear } })] : []}>
        <Video src={staticFile(clip.src)} trimBefore={clip.trim ?? 0} x={40} y={70} width={W - 80} height={H - 140} effects={[saturate(0.85), brightness(1.45), contrast(0.8)]} />
        <Void3D cam={cam} l={l} id="sea-3d">
          <Crosses l={l + 51} n={18} spread={5} />
        </Void3D>
        <Strands cam={cam} l={l} head={1} len={1} at={loopPoint} id="sea-strands" />
      </Layer>
    </Layer>
  );
};

// ---- the shrine path ----

const PATH_PHASES: Phase[] = [
  { at: 0, c1: PAL.lime, c2: PAL.lime, lo: 2, hi: 2, white: 2 },
  { at: 3, c1: PAL.lime, c2: '#c8ff6a', lo: 0.4, hi: 0.6, white: 1.1, spread: 0.8 },
  { at: 7, c1: PAL.lime, c2: PAL.lime, lo: 0.34, hi: 0.6, white: 1.1 },
  { at: 14, c1: PAL.yellow, c2: '#d8ff5a', lo: 0.36, hi: 0.6, white: 1.1 },
  { at: 20, c1: PAL.orange, c2: PAL.yellow, lo: 0.52, hi: 0.66, white: 1.1, k1: 0, k2: 0, spread: 0.55 },
  { at: 26, c1: PAL.coral, c2: '#ff9a7a', lo: 0.55, hi: 0.68, white: 1.1, spread: 0.45 },
  { at: 32, c1: PAL.yellow, c2: PAL.lime, lo: 0.56, hi: 0.7, white: 1.1, spread: 0.45 },
  { at: 38, c1: PAL.cyan, c2: PAL.mint, lo: 0.55, hi: 0.68, white: 1.1, spread: 0.5 },
  { at: 44, c1: PAL.mint, c2: PAL.lime, lo: 0.55, hi: 0.68, white: 1.1, spread: 0.5 },
  { at: 50, c1: PAL.lime, c2: '#c8ff6a', lo: 0.55, hi: 0.68, white: 1.1, spread: 0.55 },
];

/** The tunnel look (the reference's last street), 60 frames, on any clip: a tunnel of numeral rings down the
 *  view with a river of signs flowing through it. */
export const TunnelLook: React.FC<{ l: number; clip: Clip }> = ({ l, clip }) => {
  const P0 = clipStart(clip);
  const vp0 = vpOf(clip);
  // the tunnel's axis: from a little in front of the camera, right of centre, into the distance
  const AXIS_NEAR = unproject(P0, W * 0.68, H * 0.59, 7);
  const AXIS_FAR = unproject(P0, vp0.x + 100, vp0.y, 40);
  const axisAt = (t: number): V3 => [lerp(AXIS_NEAR[0], AXIS_FAR[0], t), lerp(AXIS_NEAR[1], AXIS_FAR[1], t), lerp(AXIS_NEAR[2], AXIS_FAR[2], t)];
  const { cam, roll } = clipAt(clip, l);
  const ph = phaseAt(PATH_PHASES, l);
  const grade = pop({ ...ph, spread: ph.spread ?? 1, invert: 0, seed: ph.at + 31, amount: arrive(l) });
  const grow = 0.55 + 0.45 * easeOut(clamp(l / 8));
  const rings: React.ReactNode[] = [];
  for (let k = 0; k < 6; k++) {
    const c = axisAt([0, 0.16, 0.34, 0.52, 0.72, 0.95][k]);
    rings.push(<ClockRing key={k} centre={c} r={2.9 * grow} turn={l * 1.2 + k * 17} size={0.62} yaw={0} />);
  }
  const signs: React.ReactNode[] = [];
  for (let i = 0; i < 170; i++) {
    const speed = 0.012 + rnd(`rv${i}`) * 0.01;
    const t = 1 - ((rnd(`ro${i}`) + l * speed) % 1);
    const c = axisAt(t);
    const a = rnd(`ra${i}`) * Math.PI * 2 + l * 0.05;
    const rr = (0.2 + rnd(`rr${i}`) * 1.3) * grow;
    signs.push(
      <Sign
        key={i}
        kind={pick(SIGN_KINDS, `rk${i}`)}
        position={[c[0] + Math.cos(a) * rr * 1.6, Math.max(0.1, c[1] - 1.2 + Math.sin(a) * rr * 0.5), c[2]]}
        rotation={[l * (3 + (i % 5)) + i * 40, l * (4 + (i % 3)) + i * 30, i * 21]}
        scale={0.18 + rnd(`rs${i}`) * 0.14}
      />,
    );
  }
  return (
    <Layer id="crossing">
      <Layer id="crossing-graded" effects={[shader({ code: POP, uniforms: grade })]}>
        <Video src={staticFile(clip.src)} width={W} height={H} trimBefore={clip.trim ?? 0} effects={[saturate(1.35), brightness(1.12)]} />
      </Layer>
      <Roll r={roll} id="crossing-over">
        <Scene3D id="crossing-3d" width={W} height={H}>
          <Cam3D cam={cam} />
          {l >= 1 && rings}
          {l >= 2 && signs}
        </Scene3D>
      </Roll>
    </Layer>
  );
};
