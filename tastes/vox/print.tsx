// Print and collage: every photo is tinted into the colour system (its blacks
// mapped to one colour, its whites to another, the reference's Tint effect) and, to hide a weak picture, screened as a
// halftone (his texture used as a luma matte). Photos sit as cards: a thin paper border, a soft shadow, a slight
// tilt. Over everything, a scanned magazine texture in overlay (his high-pass scan) on graph-ruled paper.
import React from 'react';
import { Layer, shader } from '@kinetographdev/core';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { VOX } from './tokens.js';

const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linRgb = (hex: string) => { const n = parseInt(hex.replace('#', ''), 16); return [lin(((n >> 16) & 255) / 255), lin(((n >> 8) & 255) / 255), lin((n & 255) / 255)] as const; };

const PRINT = /* wgsl */ `
fn effect(px: vec2<f32>) -> vec4<f32> {
  let c = layer(px);
  if (c.a < 0.001) { return c; }
  let rgb = c.rgb / c.a;
  // tone in display terms, levels from lo..hi
  var l = pow(max(dot(rgb, vec3<f32>(0.2126, 0.7152, 0.0722)), 0.0), 1.0 / 2.2);
  l = clamp((l - u.lo) / max(u.hi - u.lo, 0.01), 0.0, 1.0);
  if (u.cell > 0.5) {
    // a halftone screen at the angle: darker tone, bigger dot
    let a = u.angle;
    let q = vec2<f32>(cos(a) * px.x - sin(a) * px.y, sin(a) * px.x + cos(a) * px.y) / u.cell;
    let d = length(fract(q) - vec2<f32>(0.5, 0.5)) * 2.0;
    let radius = sqrt(1.0 - l) * 1.12;
    let ink = 1.0 - smoothstep(radius - 0.1, radius + 0.1, d);
    l = mix(l, 1.0 - ink, u.halftone);
  }
  let dark = vec3<f32>(u.dr, u.dg, u.db);
  let light = vec3<f32>(u.lr, u.lg, u.lb);
  let toned = mix(dark, light, l);
  let outc = mix(rgb, toned, u.tint);
  return vec4<f32>(outc * c.a, c.a);
}
`;

export interface PrintProps {
  /** blacks to `dark`, whites to `light`, by `tint` (0..1) */
  dark?: string;
  light?: string;
  tint?: number;
  /** halftone strength 0..1, cell in px at 1080 wide, screen angle in degrees */
  halftone?: number;
  cell?: number;
  angle?: number;
  /** levels: the tones mapped to black and white */
  lo?: number;
  hi?: number;
}

/** The print effect for a layer: tint into two colours, optional halftone. */
export const printEffect = ({ dark = VOX.ink, light = VOX.cream, tint = 1, halftone = 0, cell = 9, angle = 45, lo = 0.08, hi = 0.92 }: PrintProps, W: number) => {
  const [dr, dg, db] = linRgb(dark), [lr, lg, lb] = linRgb(light);
  return shader({ code: PRINT, uniforms: { dr, dg, db, lr, lg, lb, tint, halftone, cell: (cell * W) / 1080, angle: (angle * Math.PI) / 180, lo, hi } });
};

/** A photo printed into the colour system, filling its box (object-fit cover). */
export const PrintPhoto: React.FC<PrintProps & { id: string; src: string; position?: string; zoom?: number }> = ({ id, src, position = '50% 50%', zoom = 1, ...p }) => {
  const { width: W } = useVideoConfig();
  return (
    <Layer id={id} effects={[printEffect(p, W)]}>
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: position, transform: zoom !== 1 ? `scale(${zoom})` : undefined }} />
      </AbsoluteFill>
    </Layer>
  );
};

/** A photo card: paper border, soft shadow, a tilt; it drops in (scale 1.08 to 1, 8 frames) at `at`. Box in fractions
 *  of W and H (x, y the centre). */
export const Card: React.FC<{ x: number; y: number; w: number; h: number; tilt?: number; at: number; border?: number; children: React.ReactNode }> = ({ x, y, w, h, tilt = -3, at, border = 0.012, children }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const a = f - at;
  if (a < 0) return null;
  const t = Math.min(1, a / 8), e = 1 - (1 - t) ** 3;
  const b = border * W;
  return (
    <div style={{ position: 'absolute', left: (x - w / 2) * W, top: (y - h / 2) * H, width: w * W, height: h * H, transform: `rotate(${tilt}deg) scale(${(1.08 - 0.08 * e).toFixed(4)})`, opacity: Math.min(1, a / 3),
      background: VOX.cream, padding: b, boxSizing: 'border-box', boxShadow: `${0.006 * W}px ${0.012 * W}px ${0.03 * W}px rgba(0,0,0,0.28)` }}>
      <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>{children}</div>
    </div>
  );
};

/** Graph-ruled paper, as under every typography beat of the reels. */
export const GridPaper: React.FC<{ color?: string; line?: string; cell?: number }> = ({ color = VOX.paper, line = VOX.grid, cell = 0.06 }) => {
  const { width: W } = useVideoConfig();
  const c = cell * W;
  return (
    <AbsoluteFill style={{ background: color }}>
      <AbsoluteFill style={{ backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`, backgroundSize: `${c}px ${c}px`, backgroundPosition: `${c / 2}px ${c / 2}px`, opacity: 0.55 }} />
    </AbsoluteFill>
  );
};

/** The scanned magazine texture over the frame (the user's halftone scan, soft light), plus fine paper. The files are
 *  tastes/explainer/textures, linked into the effect's public folder as `explainer-textures`. */
export const MagazineTexture: React.FC<{ strength?: number; base?: string }> = ({ strength = 0.5, base = 'explainer-textures' }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const j = Math.floor(f / 3);
  return (
    <>
      <AbsoluteFill style={{ pointerEvents: 'none', backgroundImage: `url(${staticFile(`${base}/scans/scan-halftone.jpg`)})`, backgroundSize: '104% 104%',
        backgroundPosition: `${(-0.02 * W + ((j * 37) % 7) - 3).toFixed(0)}px ${(-0.02 * H + ((j * 53) % 7) - 3).toFixed(0)}px`, mixBlendMode: 'soft-light', opacity: strength }} />
      <AbsoluteFill style={{ pointerEvents: 'none', backgroundImage: `url(${staticFile(`${base}/paper.png`)})`, backgroundSize: `${Math.round(W * 0.474)}px`, mixBlendMode: 'multiply', opacity: strength * 0.8 }} />
    </>
  );
};
