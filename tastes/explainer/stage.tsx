// The explainer's frame and motion. The numbers are each taste's (taste.ts); the defaults and the notes below are BASE,
// measured off pin 1119 read frame by frame at 30 fps, unless marked otherwise:
//
//   entrance   objects arrive on an exponential ease-out: each frame they cover the same share of the distance left
//              (0.12 for a rise from the bottom, 0.18 for a slide from the right), no overshoot, no blur
//   push       a beat can leave by sliding left in layers, each on a quadratic ease-in of its own speed, so the lead goes
//              first and fastest, the keyword next, the object last: a parallax push (`push`)
//   dissolve   a line can leave by a wave running left to right at 0.046 W a frame, each letter fading and blurring as
//              it passes (`wave`)
//   cut        otherwise beats cut hard; the paper does not move between them
//   circle     one designed wipe: a hard-edged black disc growing from the object's centre, 0.115 W of radius a frame
//   stars      black four-point corner stars with needle arms grow in over 6-7 frames (0.75 of the length still to
//              grow left each frame), then breathe +-10% slowly; on dark beats they are blurred and dark red, still
//
// Shadows follow one light, top right: a star's falls down-left off its concave edges, as an object's does (props.tsx).

import React from 'react';
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { GraphPaper, graphPaperDefaults } from '../../components/backgrounds/graph-paper.js';
import type { CornerKind, ExplainerTaste, WipeKind } from './taste.js';

export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
/** 0..1 over `dur` frames from `at`. */
export const prog = (f: number, at: number, dur: number) => clamp01((f - at) / Math.max(1, dur));

/** The exponential ease-out of every entrance: `from` before `t0`, then `keep` of the remaining distance left each frame
 *  (0.88 for a rise, 0.82-0.89 for a slide). */
export const expo = (f: number, t0: number, from: number, to: number, keep: number) => (f < t0 ? from : to + (from - to) * keep ** (f - t0));

/** A layer's offset in a push exit: 0 before `t0`, then `-k (f - t0)^2` (in whatever unit `k` is, usually W). Measured k
 *  for the lead, keyword and object: 0.005, 0.0027, 0.010 W, starting on frames 0, +1 and +4 of the push. */
export const push = (f: number, t0: number, k: number) => (f < t0 ? 0 : -k * (f - t0) ** 2);

/** How far a dissolve wave starting at `t0` has gone with a letter at `x` (fraction of W): 0 untouched, 1 gone. The
 *  front moves `speed` W a frame from `x0` (0.046 measured), and a letter takes `fade` frames to fade once reached. */
export const wave = (f: number, t0: number | undefined, x: number, x0 = 0, speed = 0.046, fade = 3) =>
  (t0 === undefined ? 0 : clamp01((f - t0 - (x - x0) / speed) / fade));

const GraphPaperFor: React.FC<{ taste: ExplainerTaste; id?: string }> = ({ taste, id }) => {
  const { width: W } = useVideoConfig();
  return <GraphPaper {...graphPaperDefaults} id={id} ground={taste.paper} ink={taste.gridInk ?? '#b4b3ae'} strength={taste.gridStrength ?? 0.45}
    cell={Math.max(12, Math.min(200, (taste.gridCell ?? 64 / 1080) * W))} fade={0.95} focusY={0.4} speed={0} light={0} grain={0} />;
};

/** The paper: flat, as measured; a vignette and graph paper when the taste has them. Give each paper on screen at once
 *  its own `id` (two scenes in a pan). */
export const Paper: React.FC<{ taste: ExplainerTaste; dark?: boolean; id?: string }> = ({ taste, dark, id }) => (
  <AbsoluteFill style={{ background: dark ? taste.dark : taste.paper }}>
    {!dark && taste.grid && <GraphPaperFor taste={taste} id={id} />}
    {!dark && taste.vignette > 0 && <AbsoluteFill style={{ background: `radial-gradient(ellipse 75% 62% at 50% 45%, rgba(0,0,0,0) 40%, rgba(40,38,34,${taste.vignette}) 100%)` }} />}
  </AbsoluteFill>
);

// a four-point star with concave sides pulled almost to the centre, so its arms are needles; `l` is the arm length
const starPath = (l: number) => {
  const c = l * 0.045, d = l * 0.18;
  return `M${l} 0 C${d} ${c} ${c} ${d} 0 ${l} C${-c} ${d} ${-d} ${c} ${-l} 0 C${-d} ${-c} ${-c} ${-d} 0 ${-l} C${c} ${-d} ${d} ${-c} ${l} 0 Z`;
};

/** A corner shape's size on frame `f`: nothing before `t0`, grown in keeping `grow` of the length still to grow each
 *  frame (0.75 measured: 6-7 frames), then `breathe` (a fraction, signed) of drift over the next `span` frames. */
export const starLength = (f: number, t0: number, length: number, breathe = 0, span = 90, grow = 0.75) =>
  f < t0 ? 0 : length * (1 - grow ** (f - t0 + 1)) * (1 + breathe * clamp01((f - t0 - 6) / span));

/** `starLength` with the taste's growth; `breathe` is signed, as a share of the taste's own breathing. */
export const cornerLength = (taste: ExplainerTaste, f: number, t0: number, length: number, breathe = 1, span = 90) =>
  starLength(f, t0, length, breathe * taste.shapes.breathe, span, taste.shapes.grow);

/** One corner shape at arm length (or radius) `l` px, centred on 0,0. Filled shapes fill, line shapes stroke. */
const shapeEl = (kind: CornerKind, l: number, color: string, extra?: React.SVGProps<SVGPathElement>) => {
  const k = l * 0.18;
  switch (kind) {
    case 'needle': return <path d={starPath(l)} fill={color} {...extra} />;
    // a four-point sparkle: the same star with its sides pulled in less, so the arms are fat and soft
    case 'sparkle': return <path d={`M${l} 0 Q${k} ${k} 0 ${l} Q${-k} ${k} ${-l} 0 Q${-k} ${-k} 0 ${-l} Q${k} ${-k} ${l} 0 Z`} fill={color} {...extra} />;
    // six thin round-capped strokes through the centre, a drawn asterisk
    case 'asterisk': {
      const arms = [0, 60, 120].map((a) => { const r = (a * Math.PI) / 180, x = l * Math.cos(r), y = l * Math.sin(r); return `M${-x} ${-y} L${x} ${y}`; }).join(' ');
      return <path d={arms} fill="none" stroke={color} strokeWidth={l * 0.07} strokeLinecap="round" {...extra} />;
    }
    case 'dot': return <path d={`M${l / 2} 0 A${l / 2} ${l / 2} 0 1 1 ${-l / 2} 0 A${l / 2} ${l / 2} 0 1 1 ${l / 2} 0 Z`} fill={color} {...extra} />;
    case 'ring': return <path d={`M${l / 2} 0 A${l / 2} ${l / 2} 0 1 1 ${-l / 2} 0 A${l / 2} ${l / 2} 0 1 1 ${l / 2} 0 Z`} fill="none" stroke={color} strokeWidth={l * 0.06} {...extra} />;
    case 'plus': return <path d={`M${-l} 0 L${l} 0 M0 ${-l} L0 ${l}`} fill="none" stroke={color} strokeWidth={l * 0.14} {...extra} />;
    default: return null;
  }
};

export interface StarProps {
  /** its centre, fractions of W and H (usually on or past a corner) and its arm length (radius for dot and ring), in W */
  cx: number;
  cy: number;
  length: number;
  color: string;
  /** a soft-focus shape (the dark beats'): blur as a fraction of W, no shadow */
  soft?: number;
  /** the down-left shadow off its edges (default true on paper) */
  shadow?: boolean;
  /** which shape (default the taste's, on paper or `dark`; needle without a taste) */
  kind?: CornerKind;
  taste?: ExplainerTaste;
  dark?: boolean;
}

/** A corner shape with its down-left shadow: the taste's kind (needle stars for pin 1119), or `kind`. */
export const Star: React.FC<StarProps> = ({ cx, cy, length, color, soft = 0, shadow = soft === 0, kind, taste, dark }) => {
  const { width: W, height: H } = useVideoConfig();
  const shape = kind ?? (taste ? (dark ? taste.shapes.cornerOnDark : taste.shapes.corner) : 'needle');
  if (length <= 0.002 || shape === 'none') return null;
  const l = length * W, L = taste?.light;
  const side = (L?.castOffset[0] ?? -1) > 0 ? 1 : -1;
  const off = (L?.shapeOffset ?? 9 / 720) * W, blur = (L?.shapeBlur ?? 10 / 720) * W, alpha = L?.shapeAlpha ?? 0.38;
  return (
    <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}>
      <g transform={`translate(${cx * W} ${cy * H})`}>
        {shadow && <g opacity={alpha} transform={`translate(${side * off} ${off})`} style={{ filter: `blur(${blur.toFixed(1)}px)` }}>{shapeEl(shape, l, '#000')}</g>}
        <g style={{ filter: soft > 0 ? `blur(${(soft * W).toFixed(1)}px)` : undefined }}>{shapeEl(shape, l, color)}</g>
      </g>
    </svg>
  );
};

/** How big each kind is drawn for the same `length`, so a length means the same reach into the frame whatever the
 *  taste's shape: a needle's thin tips run the whole length, a dot or an asterisk would fill the corner at it. */
const REACH: Record<CornerKind, number> = { needle: 1, sparkle: 0.6, asterisk: 0.4, dot: 0.3, ring: 0.35, plus: 0.4, none: 0 };

/** The taste's corner shape on paper or dark, in the taste's colour, `length` being its reach (a needle's arm):
 *  `<Corner taste cx cy length dark?>`. */
export const Corner: React.FC<Omit<StarProps, 'color'> & { taste: ExplainerTaste; color?: string }> = ({ taste, dark, color, soft, ...rest }) => {
  const c = color ?? (dark ? taste.starOnDark : taste.star);
  if (!c) return null;
  const kind = rest.kind ?? (dark ? taste.shapes.cornerOnDark : taste.shapes.corner);
  return <Star {...rest} length={rest.length * REACH[kind]} taste={taste} dark={dark} color={c} soft={soft ?? (dark ? 0.03 : 0)} />;
};

/** The circle wipe: a hard black disc from (cx, cy), `speed` W of radius a frame from `t0` (0.115 measured, so it covers
 *  the frame in about 8 frames). Children (the next beat) show inside it. */
export const CircleWipe: React.FC<{ f: number; t0: number; cx: number; cy: number; color?: string; speed?: number; radii?: number[]; children?: React.ReactNode }> = ({ f, t0, cx, cy, color = '#000', speed = 0.115, radii, children }) => {
  const { width: W, height: H } = useVideoConfig();
  if (f < t0) return null;
  // an eased iris reads its radius off the table (pin 933: 54, 190, 355, 559, 700 px at 720), else a constant speed
  const r = (radii?.length ? radii[Math.min(radii.length - 1, f - t0)]! + Math.max(0, f - t0 - radii.length + 1) * 0.2 : 0.01 + speed * (f - t0)) * W;
  return (
    <div style={{ position: 'absolute', inset: 0, clipPath: `circle(${r.toFixed(1)}px at ${(cx * W).toFixed(1)}px ${(cy * H).toFixed(1)}px)`, background: color }}>
      {children}
    </div>
  );
};

/** A blinds wipe (not from a reference): `bands` horizontal bands slide shut across the frame, alternately from the
 *  left and the right, each over `speed` frames and one frame after the band above. Children show inside the bands. */
export const BlindsWipe: React.FC<{ f: number; t0: number; color?: string; speed?: number; bands?: number; children?: React.ReactNode }> = ({ f, t0, color = '#000', speed = 7, bands = 6, children }) => {
  const { width: W, height: H } = useVideoConfig();
  if (f < t0) return null;
  const bh = H / bands;
  let d = '';
  for (let i = 0; i < bands; i++) {
    const t = clamp01((f - t0 - i) / speed), w = W * (1 - (1 - t) ** 3);
    if (w < 0.5) continue;
    const x0 = i % 2 === 0 ? 0 : W - w, y0 = i * bh;
    d += `M${x0.toFixed(1)} ${y0.toFixed(1)}h${w.toFixed(1)}v${(bh + 1).toFixed(1)}h${(-w).toFixed(1)}Z`;
  }
  if (!d) return null;
  return <div style={{ position: 'absolute', inset: 0, clipPath: `path('${d}')`, background: color }}>{children}</div>;
};

/** The taste's wipe from beat to beat (`cut` draws children from `t0` with no wipe). */
export const Wipe: React.FC<{ taste: ExplainerTaste; f: number; t0: number; cx?: number; cy?: number; color?: string; kind?: WipeKind; children?: React.ReactNode }> = ({ taste, f, t0, cx = 0.5, cy = 0.5, color, kind, children }) => {
  const k = kind ?? taste.transition.wipe, c = color ?? taste.dark, { speed, bands, radii } = taste.transition;
  if (k === 'circle') return <CircleWipe f={f} t0={t0} cx={cx} cy={cy} color={c} speed={speed} radii={radii}>{children}</CircleWipe>;
  if (k === 'blinds') return <BlindsWipe f={f} t0={t0} color={c} speed={speed} bands={bands}>{children}</BlindsWipe>;
  return f < t0 ? null : <AbsoluteFill style={{ background: c }}>{children}</AbsoluteFill>;
};

/** A barcode: seeded bars, the small print under an object. */
export const Barcode: React.FC<{ seed?: string; width?: number; height?: number; color?: string }> = ({ seed = 'bc', width = 220, height = 46, color = '#111' }) => {
  const bars: number[] = [];
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  for (let i = 0; i < 46; i++) { h = (h * 1103515245 + 12345) >>> 0; bars.push(1 + ((h >> 16) % 4)); }
  const total = bars.reduce((a, b) => a + b, 0) * 1.6;
  let x = 0;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${total} 10`} preserveAspectRatio="none">
      {bars.map((b, i) => { const r = i % 2 === 0 ? <rect key={i} x={x} y={0} width={b} height={10} fill={color} /> : null; x += b * (i % 2 ? 1.2 : 1); return r; })}
    </svg>
  );
};

/** A small wordmark at the top centre (not in the measured reference; the agency reels carry one). */
export const Wordmark: React.FC<{ text: string; taste: ExplainerTaste }> = ({ text, taste }) => {
  const { width: W } = useVideoConfig();
  return (
    <div style={{ position: 'absolute', top: W * 0.05, left: 0, right: 0, textAlign: 'center', fontFamily: taste.font, fontWeight: 800, fontSize: W * 0.026,
      letterSpacing: '0.04em', lineHeight: 0.9, color: taste.ink, textTransform: 'uppercase' }}>{text}</div>
  );
};

/** A local patch of graph paper around an object (pin 971 S2, S4): dashed grey lines with a dot at each crossing, its
 *  edge feathered to nothing. Box and cell in fractions of W and H; `opacity` to fade it in with its beat. */
export const GridPatch: React.FC<{ x: number; y: number; w: number; h: number; cell?: [number, number]; color?: string; dot?: string; opacity?: number }> = ({ x, y, w, h, cell = [0.093, 0.036], color = '#b0b0b0', dot = '#8a8a8a', opacity = 1 }) => {
  const { width: W, height: H } = useVideoConfig();
  const pw = w * W, ph = h * H, cw = cell[0] * W, ch = cell[1] * H;
  const xs = Array.from({ length: Math.floor(pw / cw) + 1 }, (_, i) => i * cw), ys = Array.from({ length: Math.floor(ph / ch) + 1 }, (_, i) => i * ch);
  return (
    <svg width={pw} height={ph} style={{ position: 'absolute', left: x * W, top: y * H, opacity, maskImage: 'radial-gradient(ellipse 50% 50% at 50% 50%, #000 55%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 50% 50% at 50% 50%, #000 55%, transparent 100%)' }}>
      {xs.map((v) => <line key={`v${v}`} x1={v} y1={0} x2={v} y2={ph} stroke={color} strokeWidth={W * 0.002} strokeDasharray={`${W * 0.008} ${W * 0.006}`} />)}
      {ys.map((v) => <line key={`h${v}`} x1={0} y1={v} x2={pw} y2={v} stroke={color} strokeWidth={W * 0.002} strokeDasharray={`${W * 0.008} ${W * 0.006}`} />)}
      {xs.flatMap((a) => ys.map((b) => <circle key={`${a}-${b}`} cx={a} cy={b} r={W * 0.0055} fill={dot} />))}
    </svg>
  );
};

/** The grey S-band behind a beat (pin 933 B4, B6, B11): a flat, thick curve from the top edge to the bottom, drawn on
 *  from the top at about 0.3 H a frame (full in 4 frames). `t0` its first frame. */
export const Band: React.FC<{ f: number; t0: number; color?: string; width?: number; mirror?: boolean }> = ({ f, t0, color = '#bdb8b3', width = 0.22, mirror }) => {
  const { width: W, height: H } = useVideoConfig();
  if (f < t0) return null;
  // the measured centre line (rows y 60, 200, 400, 1000, 1200 at 1280), as one smooth Catmull-Rom curve
  const pts: [number, number][] = [[0.17, -0.08], [0.23, 0.047], [0.36, 0.156], [0.45, 0.31], [0.58, 0.78], [0.75, 0.94], [0.86, 1.08]];
  const P = pts.map(([px, py]) => [(mirror ? 1 - px : px) * W, py * H] as const);
  let d = `M${P[0]![0]} ${P[0]![1]}`;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)]!, p1 = P[i]!, p2 = P[i + 1]!, p3 = P[Math.min(P.length - 1, i + 2)]!;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`;
  }
  const drawn = clamp01((f - t0 + 1) * 0.3 / 1.12);
  return (
    <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
      <path d={d} fill="none" stroke={color} strokeWidth={width * W} pathLength={1} strokeDasharray={`${drawn} 1`} />
    </svg>
  );
};

/** The taste's textures over the whole frame (taste.texture): draw it last. The files are tastes/explainer/textures, served
 *  from the effect's public folder at `base` (link it: `ln -s ../../../kit/explainer/textures public/explainer-textures`).
 *  Grain jumps to a new offset every other frame, like film. */
export const Texture: React.FC<{ taste: ExplainerTaste; base?: string; dark?: boolean }> = ({ taste, base = 'explainer-textures', dark }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const t = taste.texture, tile = Math.round(W * 0.474);
  const url = (n: string) => `url(${staticFile(`${base}/${n}.png`)})`;
  const step = Math.floor(f / 2), jx = ((step * 7919) % 997) / 997, jy = ((step * 104729) % 991) / 991;
  const layer = (name: string, opacity: number, blend: React.CSSProperties['mixBlendMode'], pos = '0px 0px', size: number | string = tile) => opacity > 0 && (
    <AbsoluteFill key={name} style={{ pointerEvents: 'none', backgroundImage: url(name), backgroundRepeat: 'repeat', backgroundSize: typeof size === 'number' ? `${size}px ${size}px` : size, backgroundPosition: pos, mixBlendMode: blend, opacity }} />
  );
  return (
    <>
      {layer('paper', t.paper * (dark ? 0.4 : 1), 'multiply')}
      {layer('halftone', t.halftone, 'multiply', '0px 0px', Math.round(W * 0.25))}
      {/* the rest blend normally, so they print over the type and the objects as well as the paper */}
      {layer('ink', t.ink, 'normal')}
      {/* a real scanned halftone screen, full frame, hard-light: neutral at its mid grey, so its dots darken the paper
          and lift specks out of black type alike; it jumps a little every 4 frames, like a page re-scanned */}
      {t.scan > 0 && <AbsoluteFill style={{ pointerEvents: 'none', backgroundImage: `url(${staticFile(`${base}/scans/scan-halftone.jpg`)})`, backgroundSize: '104% 104%',
        backgroundPosition: `${(-0.02 * W + ((Math.floor(f / 4) * 37) % 9) - 4).toFixed(0)}px ${(-0.02 * H + ((Math.floor(f / 4) * 53) % 9) - 4).toFixed(0)}px`, mixBlendMode: 'hard-light', opacity: t.scan }} />}
      {/* moire: one full frame (no tile, so no repeating stripe), a little larger than the frame, drifting */}
      {layer('moire', t.moire, 'normal', `${(-0.04 * W + f * 0.25).toFixed(1)}px ${(-0.03 * H + f * 0.6).toFixed(1)}px`, '111% 109%')}
      {layer('grain', t.grain, 'normal', `${Math.round(jx * tile)}px ${Math.round(jy * tile)}px`, Math.round(W * 0.36))}
    </>
  );
};
