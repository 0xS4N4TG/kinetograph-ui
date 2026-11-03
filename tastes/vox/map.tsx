// Documentary maps: a clean old map with its saturation dropped; regions as flat colour in
// overlay; a CC Burn Film reveal animated from 100 to 0 (the region burns into view from scattered spots, a dark rim
// at the burning edge); then a texture over everything, and clouds drifting on top for depth. Labels in italic serif,
// curved white arrows drawn on.
//
// <MapView> places a map picture under a camera: `center` is a point of the map (fractions of its width and height)
// that sits at the middle of the frame, `span` how much of the map's width the frame shows. Children are an SVG in the
// map's own pixel space (viewBox = the map's size), so overlays stay pinned to places as the camera moves.
import React from 'react';
import { Layer, displace, shader } from '@kinetographdev/core';
import { AbsoluteFill, Img, random, useCurrentFrame, useVideoConfig } from 'remotion';
import { family } from '../explainer/type.js';
import { printEffect } from './print.js';
import { FONTS, VOX } from './tokens.js';

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

export interface MapViewProps {
  id: string;
  src: string;
  /** the map's size in px (its viewBox for overlays) */
  size: [number, number];
  /** the map point at the frame's middle, fractions of the map */
  center: [number, number];
  /** how much of the map's width fills the frame's width */
  span: number;
  /** drop the map's saturation toward the paper (0 keeps its colour, 1 fully toned) */
  tone?: number;
  children?: React.ReactNode;
}

/** Where the map sits on the frame for a camera: its box in px and the scale from map px to frame px. */
export const mapBox = (size: [number, number], center: [number, number], span: number, W: number, H: number) => {
  const k = W / (span * size[0]);
  const w = size[0] * k, h = size[1] * k;
  return { k, w, h, left: W / 2 - center[0] * w, top: H / 2 - center[1] * h };
};

/** A layer over the frame aligned with a <MapView> camera, holding an SVG in map px: for overlays that need their own
 *  layer (a burn-in, a blend mode). */
export const MapOverlay: React.FC<{ size: [number, number]; center: [number, number]; span: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ size, center, span, style, children }) => {
  const { width: W, height: H } = useVideoConfig();
  const { w, h, left, top } = mapBox(size, center, span, W, H);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', ...style }}>
      <svg viewBox={`0 0 ${size[0]} ${size[1]}`} width={w} height={h} style={{ position: 'absolute', left, top, overflow: 'visible' }}>{children}</svg>
    </AbsoluteFill>
  );
};

export const MapView: React.FC<MapViewProps> = ({ id, src, size, center, span, tone = 0.75, children }) => {
  const { width: W, height: H } = useVideoConfig();
  const { w, h, left, top } = mapBox(size, center, span, W, H);
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: VOX.paper }}>
      {/* the layer is the frame's size from its own corner, so it sits at the frame's corner and the picture moves
          inside it (an offset parent would cut the map off one frame-width from its left edge) */}
      <Layer id={`${id}-map`} effects={[printEffect({ dark: '#3b3832', light: '#efe8d6', tint: tone, lo: 0.12, hi: 0.95 }, W)]}>
        <AbsoluteFill>
          <Img src={src} style={{ position: 'absolute', left, top, width: w, height: h, maxWidth: 'none' }} />
        </AbsoluteFill>
      </Layer>
      <svg viewBox={`0 0 ${size[0]} ${size[1]}`} width={w} height={h} style={{ position: 'absolute', left, top, overflow: 'visible' }}>{children}</svg>
    </AbsoluteFill>
  );
};

const BURN = /* wgsl */ `
fn hash(p: vec2<f32>) -> f32 { return fract(sin(dot(p, vec2<f32>(127.1, 311.7))) * 43758.5453); }
fn vnoise(p: vec2<f32>) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let s = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2<f32>(1.0, 0.0)), s.x), mix(hash(i + vec2<f32>(0.0, 1.0)), hash(i + vec2<f32>(1.0, 1.0)), s.x), s.y);
}
fn fbm(p: vec2<f32>) -> f32 {
  return 0.55 * vnoise(p) + 0.3 * vnoise(p * 2.1 + 7.0) + 0.15 * vnoise(p * 4.3 + 13.0);
}
fn effect(px: vec2<f32>) -> vec4<f32> {
  let c = layer(px);
  if (c.a < 0.001) { return c; }
  // CC Burn Film: the region shows where the noise is above the burn level; a dark scorched rim at the edge
  let n = fbm(px / u.scale);
  let e = n - u.burn;
  let shown = smoothstep(0.0, 0.025, e);
  let rim = smoothstep(0.0, 0.02, e) * (1.0 - smoothstep(0.02, 0.09, e));
  let dark = vec3<f32>(0.03, 0.012, 0.004) * c.a;
  let rgb = mix(c.rgb, dark, rim * 0.85 * clamp(u.burn * 3.0, 0.0, 1.0));
  return vec4<f32>(rgb * shown, c.a * shown);
}
`;

/** A layer that burns into view: `progress` 0 (all burnt away) to 1 (all shown), the CC Burn Film Burn going 100 to 0.
 *  Children are positioned over the frame (put a map's region SVG inside a <MapView> child instead via `<BurnIn>` around
 *  the whole MapView overlay). */
export const BurnIn: React.FC<{ id: string; progress: number; scale?: number; children: React.ReactNode }> = ({ id, progress, scale = 60, children }) => {
  const { width: W } = useVideoConfig();
  return (
    <Layer id={id} effects={[shader({ code: BURN, uniforms: { burn: 1.02 - 1.12 * clamp01(progress), scale: (scale * W) / 1080 } })]}>
      <AbsoluteFill>{children}</AbsoluteFill>
    </Layer>
  );
};

/** A curved arrow drawn on from `a` to `b` (map px) over `dur` frames, its head appearing at the end. */
export const Arrow: React.FC<{ a: [number, number]; b: [number, number]; bend?: number; at: number; dur?: number; width?: number; color?: string }> = ({ a, b, bend = 0.25, at, dur = 18, width = 7, color = '#fffaf0' }) => {
  const f = useCurrentFrame();
  const t = clamp01((f - at) / dur), e = 1 - (1 - t) ** 3;
  if (t <= 0) return null;
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1];
  const cx = mx - dy * bend, cy = my + dx * bend;
  const d = `M${a[0]} ${a[1]} Q${cx} ${cy} ${b[0]} ${b[1]}`;
  // the head points along the curve's end tangent
  const tx = b[0] - cx, ty = b[1] - cy, tl = Math.hypot(tx, ty) || 1, ux = tx / tl, uy = ty / tl, hs = width * 4.2;
  const head = `M${b[0] - ux * hs - uy * hs * 0.6} ${b[1] - uy * hs + ux * hs * 0.6} L${b[0]} ${b[1]} L${b[0] - ux * hs + uy * hs * 0.6} ${b[1] - uy * hs - ux * hs * 0.6}`;
  return (
    <g style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))' }}>
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" pathLength={1} strokeDasharray={`${e} 1`} />
      {t >= 1 && <path d={head} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />}
    </g>
  );
};

/** A pin: a dot with a ring that pops (map px, size in map px). */
export const Pin: React.FC<{ at: number; x: number; y: number; r?: number; color?: string }> = ({ at, x, y, r = 10, color = VOX.coral }) => {
  const f = useCurrentFrame();
  const a = f - at;
  if (a < 0) return null;
  const s = 1 + 0.6 * Math.max(0, 1 - a / 6) ** 2;
  const ring = clamp01(a / 20);
  return (
    <g>
      <circle cx={x} cy={y} r={r * (1 + ring * 2.2)} fill="none" stroke={color} strokeWidth={r * 0.35} opacity={1 - ring} />
      <circle cx={x} cy={y} r={r * s} fill={color} stroke="#fffaf0" strokeWidth={r * 0.35} />
    </g>
  );
};

/** An italic serif label in map px, fading up (4 frames). */
export const MapLabel: React.FC<{ at: number; x: number; y: number; text: string; size?: number; color?: string; anchor?: 'start' | 'middle' | 'end' }> = ({ at, x, y, text, size = 40, color = '#fffaf0', anchor = 'start' }) => {
  const f = useCurrentFrame();
  const t = clamp01((f - at) / 5);
  if (t <= 0) return null;
  return (
    <text x={x} y={y - (1 - t) * size * 0.2} fontFamily={family(FONTS.serif, 600, true)} fontStyle="italic" fontWeight={600} fontSize={size} fill={color} textAnchor={anchor} opacity={t}
      style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.45))' }}>{text}</text>
  );
};

/** Rings spreading from a point, one every `every` frames from `at`, `speed` map px a frame, fading as they go. */
export const Rings: React.FC<{ at: number; x: number; y: number; speed?: number; every?: number; count?: number; max?: number; color?: string; width?: number }> = ({ at, x, y, speed = 9, every = 12, count = 6, max = 1000, color = '#fffaf0', width = 3 }) => {
  const f = useCurrentFrame();
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const r = (f - at - i * every) * speed;
        if (r <= 0) return null;
        const o = clamp01(1 - r / max);
        return <circle key={i} cx={x} cy={y} r={r} fill="none" stroke={color} strokeWidth={width} opacity={o * 0.8} />;
      })}
    </g>
  );
};

/** Clouds drifting over the frame: soft white blobs, slow, for depth. */
export const Clouds: React.FC<{ count?: number; drift?: number; opacity?: number; seed?: string }> = ({ count = 5, drift = 0.6, opacity = 0.55, seed = 'cloud' }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity }}>
      {Array.from({ length: count }, (_, i) => {
        const s = `${seed}${i}`;
        const w = (0.5 + 0.6 * random(`${s}w`)) * W, h = w * (0.3 + 0.15 * random(`${s}h`));
        const x = random(`${s}x`) * W * 1.4 - 0.4 * W + f * drift * (0.6 + random(`${s}v`)) * (W / 1080);
        const y = random(`${s}y`) * H;
        return <div key={i} style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(255,255,255,0.95), rgba(255,255,255,0.5) 55%, rgba(255,255,255,0))', filter: `blur(${(0.02 * W).toFixed(0)}px)` }} />;
      })}
    </AbsoluteFill>
  );
};

/** Edge boil: drawn lines re-drawn every frame-pair like hand animation. Three displacements,
 *  as the AE stack: a static roughen (fine fractal noise), a fine turbulence re-seeded every `rate` frames, and a
 *  coarse one re-seeded every 3 x `rate`. Strength 1 is the Vox original, measured about 1 px mean, 3-4 px p90 at
 *  1080 wide; the reference's demo is about 3x. Wrap the lines' layer (full frame).
 *  Confirmed by the full read: AE uses Roughen Edges (Border 7.1, Sharpness 5.67) over two Turbulent Displaces sharing
 *  a seed of time*4 (fine: Size 2, Amount 80; coarse: Size 52, Amount 15); the clip is on twos with a bigger change
 *  every 6 frames; a 16 px line moves 0.5-2 px mean, 2-4.5 px p90. */
export const Boil: React.FC<{ id: string; strength?: number; rate?: number; children: React.ReactNode }> = ({ id, strength = 1, rate = 2, children }) => {
  const f = useCurrentFrame();
  const { width: W } = useVideoConfig();
  const k = (strength * W) / 1080;
  const step = Math.floor(f / rate), big = Math.floor(f / (rate * 3));
  return (
    <Layer id={id} effects={[
      displace({ scale: 2 * k, turbulence: { type: 'fractalNoise', baseFrequency: 0.2, numOctaves: 2, seed: 5 } }),
      displace({ scale: 4 * k, turbulence: { type: 'turbulence', baseFrequency: 0.05, numOctaves: 2, seed: 17 + step } }),
      displace({ scale: 3 * k, turbulence: { type: 'fractalNoise', baseFrequency: 0.012, numOctaves: 1, seed: 301 + big } }),
    ]}>
      <AbsoluteFill>{children}</AbsoluteFill>
    </Layer>
  );
};
