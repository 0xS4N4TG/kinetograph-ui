// Stack credits: the double-exposure opening-credits template, measured off a reference reel (a tutorial on
// the "True Detective" title look; spec not committed). Our own pictures and names go in; the layout, grade, timing and transitions are the reference's.
//
// The look, from the measurements:
//   - the 1080x1920 frame is three stacked 16:9 panels on black: x 10.5-1069, tops 29.6 / 661.7 / 1294.5, 595 tall,
//     36.5 px gaps, hard edges
//   - each panel is pale cream-green paper with a black-and-white double exposure: a figure's silhouette shows a second
//     photograph only inside its shape; outside is blank paper. Ink-brush edges 30-40 px soft (10-90 %)
//   - the grade maps luminance onto teal-blue blacks, neutral green-grey mids and cream-green whites (never pure white)
//   - every panel is a 24 fps clip held on the 60 fps timeline, panels on different phases; layers drift 0-1 px/frame
//   - tiny credits: light sans names tracked +0.20 em (cap 0.009 H, stars 0.0107 H), small serif-capital role labels
//     (cap 0.005 H), dark warm grey #3a362c at 0.85 (or off-white on dark), slow fades in, hard cuts out
//   - shots change by hard cut; the reel leaves through a film burn (white-yellow-orange bands that step at 24 fps,
//     tinting the black bars too)
import React from 'react';
import { Layer, blur, gradientMap } from '@kinetographdev/core';
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from 'remotion';
import { family } from '../../../tastes/explainer/type.js';

export const PANEL = { x: 10.5, w: 1058, h: 595, tops: [29.6, 661.7, 1294.5] } as const;

/** The frame a 24 fps clip shows on this timeline frame: held 2-3 frames; `phase` offsets a panel's updates. */
export const held = (f: number, fps: number, phase = 0, rate = 24) => Math.floor(((f + phase) * rate) / fps) * (fps / rate);

export interface Grade { dark: string; mid: string; light: string }
/** Measured panel grades (percentiles 0.5 / 50 / 99.5 of the reference panels). */
export const GRADES = {
  warm: { dark: '#3a2e28', mid: '#b3998b', light: '#e7e0da' },
  aerial: { dark: '#1a2121', mid: '#827c78', light: '#eef5eb' },
  suit: { dark: '#231e21', mid: '#8f8c84', light: '#d7d8cd' },
  field: { dark: '#0a0f19', mid: '#a29e93', light: '#e8e7de' },
  storm: { dark: '#161e1e', mid: '#7b8478', light: '#f3f6e1' },
  pale: { dark: '#041310', mid: '#9aa59a', light: '#dae0d3' },
  shirt: { dark: '#3b4336', mid: '#a7ab9c', light: '#edf3e6' },
} satisfies Record<string, Grade>;

const gradeFx = (g: Grade) => gradientMap({ stops: [{ offset: 0.02, color: g.dark }, { offset: 0.5, color: g.mid }, { offset: 0.98, color: g.light }] });

/** One panel: paper, the content in panel pixels (0..1058 x 0..595), the grade over all of it, clipped hard. */
export const Panel: React.FC<{ id: string; index: 0 | 1 | 2; grade: Grade; paper?: string; children: React.ReactNode }> = ({ id, index, grade, paper = '#ffffff', children }) => (
  <Layer id={id} effects={[gradeFx(grade)]}>
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: PANEL.x, top: PANEL.tops[index], width: PANEL.w, height: PANEL.h, overflow: 'hidden', background: paper }}>
        {children}
      </div>
    </AbsoluteFill>
  </Layer>
);

export interface Box { x: number; y: number; w: number; h: number }
const boxStyle = (b: Box, extra?: React.CSSProperties): React.CSSProperties => ({ position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h, ...extra });

/** A picture placed in panel pixels, object-fit cover, with optional CSS filter (contrast for the plates). */
export const Plate: React.FC<{ src: string; box: Box; position?: string; filter?: string; opacity?: number; blend?: React.CSSProperties['mixBlendMode'] }> = ({ src, box, position = '50% 50%', filter, opacity, blend }) => (
  <img src={src} style={boxStyle(box, { objectFit: 'cover', objectPosition: position, filter, opacity, mixBlendMode: blend })} />
);

/**
 * The double exposure: `inside` shows only within the silhouette `matte` (a cut-out's alpha, or any drawn shape),
 * whose edge is softened like a dry brush (`edge` px of blur, about a third of the 10-90 % width).
 * Panel-sized: put it inside a Panel. `matte` and `inside` are drawn in panel pixels.
 */
export const DoubleExposure: React.FC<{ id: string; matte: React.ReactNode; inside: React.ReactNode; edge?: number }> = ({ id, matte, inside, edge = 12 }) => (
  <AbsoluteFill>
    <Layer id={`${id}-in`} matte={{ layer: `${id}-m`, mode: 'alpha' }}>
      <AbsoluteFill>{inside}</AbsoluteFill>
    </Layer>
    <Layer id={`${id}-m`} effects={edge > 0 ? [blur(edge)] : []}>
      <AbsoluteFill>{matte}</AbsoluteFill>
    </Layer>
  </AbsoluteFill>
);

/* ---------- credits ---------- */

export interface CreditLine { text: string; kind: 'name' | 'star' | 'label' | 'first' }
const CAP = { name: 17.5, star: 20.5, label: 9.5, first: 10.5 } as const;
/** cap height to font size for these faces */
const SIZE = (k: CreditLine['kind']) => CAP[k] / 0.7;

/**
 * A credit block in frame pixels: lines stacked at a 27 px pitch (more after a star line), right or left aligned at
 * `x` (the ink edge), first baseline near `y`. `fade` is [frame, opacity] keys measured off the reference; `drift` px
 * per frame; light ink on dark pictures.
 */
export const Credit: React.FC<{ lines: CreditLine[]; x: number; y: number; align: 'left' | 'right'; fade: [number, number][]; drift?: [number, number]; at?: number; light?: boolean; phase?: number }> = ({ lines, x, y, align, fade, drift = [0, 0], at = 0, light = false, phase = 0 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = held(f, fps, phase);
  // x, y are where the block sits at frame `at`; it drifts from there
  const d = t - at;
  const o = interpolate(t, fade.map((k) => k[0]), fade.map((k) => k[1]), { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (o <= 0.001) return null;
  const sans = family('Barlow', 300, false);
  const serif = family('Cinzel', 500, false);
  let yy = 0;
  return (
    <div style={{ position: 'absolute', left: align === 'left' ? x + drift[0] * d : undefined, right: align === 'right' ? 1080 - x - drift[0] * d : undefined, top: y + drift[1] * d, opacity: o,
      color: light ? '#e8e8e4' : '#3a362c', textAlign: align, filter: 'blur(0.6px)' }}>
      {lines.map((l, i) => {
        const size = SIZE(l.kind);
        const top = yy;
        yy += l.kind === 'label' || l.kind === 'first' ? 22 : l.kind === 'star' ? 30 : 27;
        return (
          <div key={i} style={{ position: 'absolute', top, [align]: 0, whiteSpace: 'pre', fontFamily: l.kind === 'label' ? serif : sans, fontWeight: l.kind === 'label' ? 500 : 300,
            fontSize: size, lineHeight: 1, letterSpacing: l.kind === 'star' ? '0.17em' : '0.2em', marginRight: align === 'right' ? (l.kind === 'star' ? '-0.17em' : '-0.2em') : undefined, opacity: light ? 0.7 : 0.85 }}>
            {l.text}
          </div>
        );
      })}
    </div>
  );
};

/* ---------- light: the red X flare and the film burn ---------- */

/**
 * The red "X" of the storm panel, as it reads at full size (ref f240): not tubes of light but a neon sign's reflection
 * double-exposed into the smoke. A wide, soft red haze along the strokes (most of the colour), and over it thin pale
 * pink-white lines, drawn double (two hairlines 5 px apart), broken into runs with gaps, each with a small red bloom.
 * Two parallel diagonals from the upper left down to the lower middle, and a horizontal double line across the chest.
 * Screened over the panel, in panel pixels.
 */
export const XFlare: React.FC<{ strength: number; barY: number; seed?: string; lines?: boolean }> = ({ strength, barY, seed = 'x', lines = true }) => {
  /** a broken double hairline from (x0, y0) to (x1, y1) */
  const line = (key: string, x0: number, y0: number, x1: number, y1: number) => {
    const len = Math.hypot(x1 - x0, y1 - y0), ang = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;
    // runs and gaps along the line, seeded so the breaks hold still
    const runs: [number, number][] = [];
    let p = 0, k = 0;
    while (p < len) {
      const run = 30 + 110 * random(`${seed}${key}r${k}`), gap = random(`${seed}${key}g${k}`) < 0.25 ? 4 + 10 * random(`${seed}${key}h${k}`) : 0;
      runs.push([p, Math.min(len, p + run)]);
      p += run + gap; k++;
    }
    return (
      <div key={key} style={{ position: 'absolute', left: x0, top: y0, width: len, height: 12, transformOrigin: '0 0', transform: `rotate(${ang.toFixed(2)}deg) translateY(-6px)` }}>
        {runs.map(([a, b], i) => (
          <div key={i} style={{ opacity: 0.35 + 0.65 * random(`${seed}${key}o${i}`), filter: 'blur(0.7px)' }}>
            <div style={{ position: 'absolute', left: a, width: b - a, top: 2, height: 2, background: 'rgba(255,228,214,0.85)', boxShadow: '0 0 5px 1px rgba(240,90,70,0.55)' }} />
            <div style={{ position: 'absolute', left: a + 4, width: Math.max(0, b - a - 8), top: 7, height: 2, background: 'rgba(255,214,200,0.6)', boxShadow: '0 0 5px 1px rgba(240,90,70,0.45)' }} />
          </div>
        ))}
      </div>
    );
  };
  /** the soft red haze under a stroke */
  const haze = (x0: number, y0: number, x1: number, y1: number, w: number, a: number) => {
    const len = Math.hypot(x1 - x0, y1 - y0), ang = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;
    return <div style={{ position: 'absolute', left: x0, top: y0, width: len, height: w, transformOrigin: '0 0', transform: `rotate(${ang.toFixed(2)}deg) translateY(${-w / 2}px)`, borderRadius: w / 2, background: `rgba(196,62,52,${a})`, filter: 'blur(28px)' }} />;
  };
  return (
    <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: strength }}>
      {haze(200, 40, 600, 560, 170, 0.32)}
      {haze(120, 60, 700, 300, 220, 0.18)}
      {haze(240, 150, 520, 330, 160, 0.4)}
      {haze(270, barY - 10, 730, barY - 10, 50, 0.45)}
      {lines && line('d1', 255, 20, 585, 520)}
      {lines && line('d2', 300, 20, 600, 470)}
      {lines && line('h', 270, barY - 12, 730, barY - 12)}
    </AbsoluteFill>
  );
};

export interface BurnStep { from: number; to: number; kind: 'band' | 'wash' | 'white' | 'split'; x0: number; x1: number; color: string; bars: string; ghost: number }

/** The film burn, as measured: held 24 fps states over the whole frame, bars included (screen blend over the picture). */
export const FilmBurn: React.FC<{ steps: BurnStep[] }> = ({ steps }) => {
  const f = useCurrentFrame();
  const s = steps.find((k) => f >= k.from && f <= k.to);
  if (!s) return null;
  const W = 1080, H = 1920;
  const bars = (
    <>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: 30, background: s.bars }} />
      <div style={{ position: 'absolute', left: 0, top: 1890, width: W, height: 30, background: s.bars }} />
    </>
  );
  if (s.kind === 'white') return <AbsoluteFill style={{ background: '#fdfdfc' }} />;
  if (s.kind === 'wash') {
    return (
      <AbsoluteFill>
        <AbsoluteFill style={{ background: s.color, opacity: 1 - s.ghost, mixBlendMode: 'screen' }} />
        <AbsoluteFill style={{ background: `linear-gradient(90deg, rgba(251,170,60,0.85) 0%, rgba(251,200,90,0.6) ${(s.x0 / W) * 100}%, rgba(255,255,250,0.95) ${(s.x1 / W) * 100}%)`, mixBlendMode: 'screen' }} />
        {bars}
      </AbsoluteFill>
    );
  }
  if (s.kind === 'split') {
    return (
      <AbsoluteFill>
        <div style={{ position: 'absolute', left: 0, top: 0, width: s.x0, height: H, background: '#fdfdfc' }} />
        <div style={{ position: 'absolute', left: s.x0, top: 0, width: W - s.x0, height: H, background: `linear-gradient(90deg, #fdfdfc, ${s.color} ${((s.x1 - s.x0) / (W - s.x0)) * 100}%, #fbc217)` }} />
      </AbsoluteFill>
    );
  }
  // a vertical band: white-yellow core, orange fringe, screened, the picture warmed under it
  const cx = (s.x0 + s.x1) / 2, hw = (s.x1 - s.x0) / 2;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: 'rgba(255,150,60,0.12)', mixBlendMode: 'screen' }} />
      <div style={{ position: 'absolute', left: cx - hw * 2, top: 0, width: hw * 4, height: H, mixBlendMode: 'screen',
        background: `linear-gradient(90deg, rgba(0,0,0,0), ${s.color} 30%, rgba(255,246,214,0.95) 50%, ${s.color} 70%, rgba(0,0,0,0))` }} />
      <div style={{ position: 'absolute', left: 1069, top: 0, width: 11, height: H, background: '#ee7905' }} />
      {bars}
    </AbsoluteFill>
  );
};

/** The black frame behind the panels. */
export const StackFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => <AbsoluteFill style={{ background: '#000000' }}>{children}</AbsoluteFill>;

/** The children fade in from transparent at `from` to opaque at `to` (panel px, downwards): a luminance matte from a
 *  black-to-white gradient, so a picture inside a silhouette melts into the paper above it. */
export const FadeDown: React.FC<{ id: string; from: number; to: number; children: React.ReactNode }> = ({ id, from, to, children }) => (
  <>
    <Layer id={id} matte={{ layer: `${id}-g`, mode: 'luminance' }}><AbsoluteFill>{children}</AbsoluteFill></Layer>
    <Layer id={`${id}-g`}><AbsoluteFill><div style={{ position: 'absolute', left: 0, top: 0, width: 4000, height: 4000, background: `linear-gradient(#000 ${from}px, #fff ${to}px)` }} /></AbsoluteFill></Layer>
  </>
);
