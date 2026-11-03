// Film finishing, measured off three reels:
//
//   GateWeave     Da3YpRipHuF: AE Transform with Position wiggle(12, 2). Measured: a new position every 2nd frame,
//                 each step independent, std about 1.1 px in x and 1.7 px in y at 1080 wide (peak about 4), no
//                 rotation or scale; the picture overscanned about 1.5% so its edge never shows.
//   Flicker       same reel: Exposure with wiggle(14, .2). Measured luma std 1.7% (about 0.024 stops), every frame,
//                 no hue shift.
//   Dust          DZFqNzwAqVa / DdKZ5oBpPCW: light specks and a few hairs, Screen only: about 240 specks per Mpx,
//                 median about 20 px in area, +35 to +60 luma at their core; a pattern holds 8 to 15 frames, then
//                 another; the stock plate also drifts (about 5 px a frame to the left).
//   WindowLight   DdKZ5oBpPCW: a greyscale window-light plate in Multiply, multiplying the lit sky by about 0.53 in its
//                 shadows, sliding slowly (+127 px over the clip) for "light gently drifting".
//   EdgeBlur      DZFqNzwAqVa: the "fringe blur" is not chromatic aberration (R, G, B shifts measured 0): it is a lens
//                 blur through a radial map: sharp in an ellipse about (0.5 W, 0.42 H), about 45-60 px at the top and
//                 bottom edges and 10-20 px at the sides.
//   Vignette      same reel: a multiply falloff centred near (0.45 W, 0.31 H): 0.73 at the top edge, 0.76-0.85 at the
//                 sides, 0.36-0.39 at the bottom edge and corners.
//   VoxFinish     the reel's whole stack, top to bottom: zoom (+9.4% over 44 frames), vignette, dust (screen), the
//                 edge blur, the picture.
import React from 'react';
import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from 'remotion';

/** A normal-ish random number (sum of three uniforms, scaled to std 1) for a seed. */
const gauss = (seed: string) => ((random(`${seed}a`) + random(`${seed}b`) + random(`${seed}c`)) - 1.5) / 0.5;

/** The picture jitters like film in a projector gate. `mode="reel"` (default) is what the reel measured: a new offset
 *  every `hold` frames, std 1.1 / 1.7 px. `mode="preset"` is the reference's GateWeave.ffx:
 *  Transform Position + random(-1.5, 1.5) px per axis, re-seeded floor(time * 24), Scale 101%. */
export const GateWeave: React.FC<{ amount?: number; hold?: number; seed?: string; overscan?: number; mode?: 'reel' | 'preset'; children: React.ReactNode }> = ({ amount = 1, hold = 2, seed = 'weave', overscan, mode = 'reel', children }) => {
  const f = useCurrentFrame();
  const { width: W, fps } = useVideoConfig();
  const k = (amount * W) / 1080;
  let x: number, y: number;
  if (mode === 'preset') {
    const step = Math.floor((f / fps) * 24);
    x = (random(`${seed}x${step}`) * 2 - 1) * 1.5 * k;
    y = (random(`${seed}y${step}`) * 2 - 1) * 1.5 * k;
  } else {
    const step = Math.floor(f / hold);
    x = gauss(`${seed}x${step}`) * 1.1 * k;
    y = gauss(`${seed}y${step}`) * 1.7 * k;
  }
  const s = overscan ?? (mode === 'preset' ? 1.01 : 1.015);
  return <AbsoluteFill style={{ transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${s})` }}>{children}</AbsoluteFill>;
};

/** Exposure flicker: brightness 2^(stops), a new value every frame. Default: std `stops` (0.024 measured off the reel;
 *  the reference's presets use random(-S, S) with S 0.02-0.04). `heavy` is HeavyFlicker.ffx: Exposure wiggle(24, .2),
 *  about ±0.2 stops. */
export const Flicker: React.FC<{ stops?: number; heavy?: boolean; seed?: string; children: React.ReactNode }> = ({ stops = 0.024, heavy = false, seed = 'flicker', children }) => {
  const f = useCurrentFrame();
  const e = heavy ? (random(`${seed}h${f}`) * 2 - 1) * 0.2 : gauss(`${seed}${f}`) * stops;
  const b = 2 ** e;
  return <AbsoluteFill style={{ filter: `brightness(${b.toFixed(4)})` }}>{children}</AbsoluteFill>;
};

/** Film dust: light specks and hairs, screened over everything; a pattern holds 8 to 15 frames, then another. */
export const Dust: React.FC<{ density?: number; strength?: number; drift?: number; hairs?: number; seed?: string }> = ({ density = 240, strength = 0.5, drift = 0, hairs = 2, seed = 'dust' }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  // which pattern is up: patterns of 8-15 frames laid end to end
  let start = 0, n = 0;
  while (true) { const len = 8 + Math.floor(random(`${seed}len${n}`) * 8); if (start + len > f) break; start += len; n++; }
  const count = Math.round((density * W * H) / 1e6);
  const dx = -drift * f;
  const specks = Array.from({ length: count }, (_, i) => {
    const s = `${seed}${n}s${i}`;
    const r = Math.max(0.6, (1.2 + 2.2 * random(`${s}r`) ** 3) * (W / 1080));
    return { x: (((random(`${s}x`) * W + dx) % W) + W) % W, y: random(`${s}y`) * H, r, a: 0.35 + 0.65 * random(`${s}a`) };
  });
  const lines = Array.from({ length: hairs }, (_, i) => {
    const s = `${seed}${n}h${i}`;
    if (random(`${s}on`) < 0.45) return null;
    const x = random(`${s}x`) * W, y = random(`${s}y`) * H, len = (40 + 120 * random(`${s}l`)) * (W / 1080), a = random(`${s}t`) * Math.PI;
    const c = Math.cos(a) * len, d = Math.sin(a) * len, bend = (random(`${s}b`) - 0.5) * len;
    return `M${x} ${y} q${(c / 2 - d * bend / len).toFixed(1)} ${(d / 2 + c * bend / len).toFixed(1)} ${c.toFixed(1)} ${d.toFixed(1)}`;
  }).filter(Boolean) as string[];
  return (
    <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, mixBlendMode: 'screen', opacity: strength, pointerEvents: 'none' }}>
      <g style={{ filter: `blur(${(0.6 * W / 1080).toFixed(2)}px)` }}>
        {specks.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={`rgba(255,255,255,${p.a.toFixed(2)})`} />)}
        {lines.map((d, i) => <path key={`h${i}`} d={d} stroke="rgba(255,255,255,0.8)" strokeWidth={1.2 * (W / 1080)} fill="none" />)}
      </g>
    </svg>
  );
};

/** Window light falling across the picture, multiplied: soft slanted bars and leaf shadows, drifting slowly. */
export const WindowLight: React.FC<{ strength?: number; drift?: number; angle?: number }> = ({ strength = 0.47, drift = 0.12, angle = -24 }) => {
  const f = useCurrentFrame();
  const { width: W, height: H, durationInFrames } = useVideoConfig();
  const x = (drift * W * f) / Math.max(1, durationInFrames);
  const k = W / 1080;
  return (
    <AbsoluteFill style={{ mixBlendMode: 'multiply', pointerEvents: 'none', opacity: strength }}>
      <svg width={W * 1.6} height={H * 1.4} style={{ position: 'absolute', left: -0.3 * W + x, top: -0.2 * H, filter: `blur(${(26 * k).toFixed(0)}px)` }}>
        <g transform={`rotate(${angle} ${W * 0.8} ${H * 0.7})`}>
          {/* the window: two panes of light with a mullion and a transom between, the rest of the wall in shadow */}
          <rect x={0} y={0} width={W * 1.6} height={H * 1.4} fill="#000" />
          <rect x={W * 0.25} y={H * 0.12} width={W * 0.42} height={H * 0.5} fill="#fff" />
          <rect x={W * 0.73} y={H * 0.12} width={W * 0.42} height={H * 0.5} fill="#fff" />
          <rect x={W * 0.25} y={H * 0.66} width={W * 0.42} height={H * 0.45} fill="#fff" />
          <rect x={W * 0.73} y={H * 0.66} width={W * 0.42} height={H * 0.45} fill="#fff" />
          {/* leaves outside, breaking up the light */}
          {Array.from({ length: 9 }, (_, i) => <ellipse key={i} cx={W * (0.3 + 0.9 * random(`leaf${i}x`))} cy={H * (0.15 + 0.9 * random(`leaf${i}y`))} rx={W * (0.04 + 0.06 * random(`leaf${i}r`))} ry={W * 0.03} fill="#000" opacity={0.6} transform={`rotate(${random(`leaf${i}a`) * 180})`} />)}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/** (A picture holding a <Layer> with an id must be made twice with two ids: one for under, one for here.)
 *  The radial lens blur: a blurred copy of the picture shows through a mask that is clear in a central ellipse and
 *  solid at the edges, strongest top and bottom. Pass the same picture you draw underneath: the copy must line up with
 *  it exactly (no scale), and where its blur thins at the frame edge the sharp picture shows instead. */
export const EdgeBlur: React.FC<{ radius?: number; cx?: number; cy?: number; children: React.ReactNode }> = ({ radius = 45, cx = 0.5, cy = 0.42, children }) => {
  const { width: W } = useVideoConfig();
  const mask = `radial-gradient(ellipse 62% 40% at ${cx * 100}% ${cy * 100}%, transparent 45%, rgba(0,0,0,0.55) 75%, #000 100%)`;
  return (
    <AbsoluteFill style={{ WebkitMaskImage: mask, maskImage: mask, pointerEvents: 'none' }}>
      <AbsoluteFill style={{ filter: `blur(${((radius * W) / 1080).toFixed(1)}px)`, }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** The measured vignette, multiplied: lighter at the top, twice as dark at the bottom corners (an SVG radial
 *  gradient, so its shape is exact). */
export const Vignette: React.FC<{ strength?: number; cx?: number; cy?: number }> = ({ strength = 1, cx = 0.45, cy = 0.31 }) => {
  const { width: W, height: H } = useVideoConfig();
  // the farthest corner from the centre sets the radius; stops measured: 0.73 at the top edge, 0.8 at the sides,
  // 0.37 at the bottom corners (multiply factors, so black at 1 - factor)
  const r = Math.hypot(Math.max(cx, 1 - cx) * W, Math.max(cy, 1 - cy) * H);
  return (
    <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', opacity: strength }}>
      <defs>
        <radialGradient id="kg-vignette" gradientUnits="userSpaceOnUse" cx={cx * W} cy={cy * H} r={r} gradientTransform={`translate(${cx * W} ${cy * H}) scale(0.78 1) translate(${-cx * W} ${-cy * H})`}>
          <stop offset="0.3" stopColor="#000" stopOpacity={0} />
          <stop offset="0.5" stopColor="#000" stopOpacity={0.2} />
          <stop offset="0.75" stopColor="#000" stopOpacity={0.45} />
          <stop offset="1" stopColor="#000" stopOpacity={0.64} />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#kg-vignette)" />
    </svg>
  );
};

/** The Vox finish over a picture: a slow push, edge blur, dust and vignette, with optional weave and flicker. */
export const VoxFinish: React.FC<{ picture: React.ReactNode; push?: number; weave?: boolean; flicker?: boolean; dust?: number; blur?: number; vignette?: number }> = ({ picture, push = 0.0021, weave = true, flicker = true, dust = 0.55, blur = 45, vignette = 1 }) => {
  const f = useCurrentFrame();
  let body = (
    <AbsoluteFill style={{ transform: `scale(${(1 + push * f).toFixed(4)})` }}>
      {picture}
      {blur > 0 && <EdgeBlur radius={blur}>{picture}</EdgeBlur>}
    </AbsoluteFill>
  );
  if (weave) body = <GateWeave>{body}</GateWeave>;
  if (flicker) body = <Flicker>{body}</Flicker>;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#000' }}>
      {body}
      {dust > 0 && <Dust strength={dust} />}
      {vignette > 0 && <Vignette strength={vignette} />}
    </AbsoluteFill>
  );
};
