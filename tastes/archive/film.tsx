// The film around every archive shot: the picture sits in a projector gate. Built from kit/looks (GateWeave, Flicker,
// Dust, WindowLight, EdgeBlur, Vignette) with the numbers of the reference's own presets:
//
//   Gate Weave & Exposure Flicker / GateWeave.ffx   Transform Position expression:
//       fps = 24; seedRandom(Math.floor(time * fps), true); jitter = 1.5; value + [random(-jitter, jitter), ...]
//     a new uniform offset in +-1.5 px each 1/24 s, x and y independent. `Weave` below is exactly that (scaled to W);
//     the reel itself measured on twos at std 1.1 / 1.7 px, which `GateWeave` reproduces:
//     pass weave="measured" for it.
//   Cinema Treatment / Secret Sauce.ffx   Add Grain, Posterize Time, an Exposure whose expression holds a random
//     value in +-0.04 stops for 1/2 s (freq = 2), and the same Transform weave. `Flicker` below stacks that slow
//     held flicker on the reel's measured per-frame one (0.024 stops, Da3YpRipHuF).
//   HeavyFlicker.ffx   Exposure wiggle(24, .2): `heavy` doubles the per-frame flicker for an older, rougher reel.
//
// Order, bottom to top, as in the reference project's stack: picture, edge blur, (window
// light), weave + flicker over all of that, then dust and the scanned film texture screened, then the vignette.
import React from 'react';
import { AbsoluteFill, Img, random, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Dust, EdgeBlur, GateWeave, Vignette, WindowLight } from '../../kit/looks/film.js';

const gauss = (seed: string) => ((random(`${seed}a`) + random(`${seed}b`) + random(`${seed}c`)) - 1.5) / 0.5;

/** The GateWeave.ffx preset: a new offset in +-`jitter` px (at 1080 wide) every 1/`rate` s. */
export const Weave: React.FC<{ jitter?: number; rate?: number; seed?: string; overscan?: number; children: React.ReactNode }> = ({ jitter = 1.5, rate = 24, seed = 'aw', overscan = 1.012, children }) => {
  const f = useCurrentFrame();
  const { fps, width: W } = useVideoConfig();
  const n = Math.floor((f / fps) * rate), k = W / 1080;
  const x = (random(`${seed}x${n}`) * 2 - 1) * jitter * k, y = (random(`${seed}y${n}`) * 2 - 1) * jitter * k;
  return <AbsoluteFill style={{ transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${overscan})` }}>{children}</AbsoluteFill>;
};

/** Exposure flicker: Secret Sauce's held +-0.04 stops (new value every 1/2 s) times the measured per-frame 0.024. */
export const Flicker: React.FC<{ held?: number; holdHz?: number; stops?: number; heavy?: boolean; seed?: string; children: React.ReactNode }> = ({ held = 0.04, holdHz = 2, stops = 0.024, heavy, seed = 'afl', children }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slow = (random(`${seed}h${Math.floor((f / fps) * holdHz)}`) * 2 - 1) * held;
  const fast = gauss(`${seed}${f}`) * stops * (heavy ? 2 : 1);
  return <AbsoluteFill style={{ filter: `brightness(${(2 ** (slow + fast)).toFixed(4)})` }}>{children}</AbsoluteFill>;
};

/** The scanned film texture (a Texturelabs scan, downscaled; tastes/archive/textures, linked into the effect's public
 *  folder as `archive-textures`): screened, its frame jumping every 2 frames so the scratches and specks move like
 *  film running through the gate. */
export const FilmScan: React.FC<{ strength?: number; base?: string }> = ({ strength = 0.5, base = 'archive-textures' }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const n = Math.floor(f / 2);
  const ox = random(`fsx${n}`), oy = random(`fsy${n}`), flip = random(`fsf${n}`) > 0.5;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'screen', opacity: strength, overflow: 'hidden' }}>
      {/* drawn larger than the frame, offset and mirrored at random each step */}
      <Img src={staticFile(`${base}/film-scan.jpg`)} style={{ position: 'absolute', width: W * 1.2, height: H * 1.2, left: -ox * W * 0.2, top: -oy * H * 0.2, objectFit: 'cover',
        transform: `scaleX(${flip ? -1 : 1})` }} />
    </AbsoluteFill>
  );
};

export interface FinishProps {
  /** the picture, made fresh for each id (the edge blur draws it a second time and needs its own layer ids) */
  picture: (copy: string) => React.ReactNode;
  /** slow push, scale per frame from `from` (DZFqNzwAqVa: about 0.2% a frame) */
  push?: number;
  from?: number;
  /** push pivot, fractions of the frame */
  pivot?: [number, number];
  /** the edge blur radius at 1080 wide (0 off) and the sharp centre */
  blur?: number;
  focus?: [number, number];
  /** window light multiplied over the picture (DdKZ5oBpPCW), 0 off */
  light?: number;
  lightAngle?: number;
  weave?: 'preset' | 'measured' | 'off';
  flicker?: boolean;
  heavy?: boolean;
  dust?: number;
  scan?: number;
  vignette?: number;
}

/** A finished archive shot: the picture with every film layer over it. */
export const ArchiveFinish: React.FC<FinishProps> = ({ picture, push = 0.0012, from = 0, pivot = [0.5, 0.42], blur = 40, focus = [0.5, 0.42], light = 0, lightAngle = -24, weave = 'preset', flicker = true, heavy, dust = 0.45, scan = 0.35, vignette = 1 }) => {
  const f = useCurrentFrame();
  const s = 1 + push * Math.max(0, f - from);
  let body: React.ReactNode = (
    <AbsoluteFill style={{ transform: `scale(${s.toFixed(4)})`, transformOrigin: `${pivot[0] * 100}% ${pivot[1] * 100}%` }}>
      {picture('a')}
      {blur > 0 && <EdgeBlur radius={blur} cx={focus[0]} cy={focus[1]}>{picture('b')}</EdgeBlur>}
      {light > 0 && <WindowLight strength={light} angle={lightAngle} drift={0.1} />}
    </AbsoluteFill>
  );
  if (weave === 'preset') body = <Weave>{body}</Weave>;
  if (weave === 'measured') body = <GateWeave>{body}</GateWeave>;
  if (flicker) body = <Flicker heavy={heavy}>{body}</Flicker>;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#0d0b09' }}>
      {body}
      {dust > 0 && <Dust strength={dust} density={160} hairs={3} />}
      {scan > 0 && <FilmScan strength={scan} />}
      {vignette > 0 && <Vignette strength={vignette} />}
    </AbsoluteFill>
  );
};
