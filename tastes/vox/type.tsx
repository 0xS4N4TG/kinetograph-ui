// The vox text moves:
//   PopWord        fill: letters fill in yellow left to right, then turn charcoal left to right
//   RandomLetters  the letters of a line appear one by one in a random order
//   Odometer       each letter rolls up from below its line into place, left to right (or replaces old text)
//   Highlight      a flat colour box wipes in behind a word (the collage reel's "cohesion")
//   Line           a plain line that fades up, for the words around the one that moves
// Every text gets a slight colour misregistration (a red and a cyan ghost a pixel or two off), the scanned-magazine
// imperfection of DbJSUGZpvzL. One text animation at a time: start the next when the last has landed.
import React from 'react';
import { random, useCurrentFrame, useVideoConfig } from 'remotion';
import { family } from '../explainer/type.js';
import { FONTS, VOX } from './tokens.js';

export type Face = 'serif' | 'caps' | 'sans';

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const hexRgb = (hex: string) => { const n = parseInt(hex.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const; };
const mix = (a: string, b: string, t: number) => { const A = hexRgb(a), B = hexRgb(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i]! - v) * t)).join(',')})`; };

/** The misregistration ghosts as a text-shadow: red one way, cyan the other, `px` apart (scaled to the frame). */
export const misreg = (px: number, W: number, a = 0.45) => {
  const d = (px * W) / 1080;
  return `${(-d).toFixed(1)}px 0 rgba(235,40,70,${a}), ${d.toFixed(1)}px ${(d * 0.4).toFixed(1)}px rgba(20,170,220,${a})`;
};

export interface TextBase {
  /** anchor, fractions of W and H; `align` says which edge (or the centre) sits on `x` */
  x: number;
  y: number;
  /** font size as a fraction of W */
  size: number;
  face?: Face;
  weight?: number;
  italic?: boolean;
  color?: string;
  align?: 'left' | 'center' | 'right';
  /** the frame it starts */
  at: number;
  /** misregistration in px at 1080 wide (0 for none) */
  reg?: number;
  /** letter spacing in em */
  tracking?: number;
  /** a frame from which it fades out over 6 frames */
  out?: number;
}

const faceOf = (face: Face, weight: number, italic: boolean) => family(FONTS[face], weight, italic);

const Box: React.FC<TextBase & { children: React.ReactNode; extra?: React.CSSProperties }> = ({ x, y, size, face = 'serif', weight = 600, italic = face === 'serif', color = VOX.ink, align = 'left', reg = 1.5, tracking, out, children, extra }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const px = size * W;
  const gone = out === undefined ? 0 : clamp01((f - out) / 6);
  const pos: React.CSSProperties = align === 'left' ? { left: x * W } : { left: (x - (align === 'center' ? 0.5 : 1)) * W, width: W, justifyContent: align === 'center' ? 'center' : 'flex-end' };
  return (
    <div style={{ position: 'absolute', ...pos, top: y * H - px * 0.6, display: 'flex', whiteSpace: 'pre', fontFamily: faceOf(face, weight, italic), fontWeight: weight,
      fontStyle: italic ? 'italic' : 'normal', fontSize: px, lineHeight: 1.1, letterSpacing: tracking !== undefined ? `${tracking}em` : face === 'caps' ? '0.01em' : '-0.01em',
      color, textShadow: reg > 0 ? misreg(reg, W) : undefined, opacity: 1 - gone, textTransform: face === 'caps' ? 'uppercase' : undefined, ...extra }}>{children}</div>
  );
};

/** A plain line fading up over 6 frames (a 4-frame rise of 0.15 em). */
export const Line: React.FC<TextBase & { text: string }> = (p) => {
  const f = useCurrentFrame();
  const t = clamp01((f - p.at) / 6);
  if (f < p.at) return null;
  return <Box {...p}><span style={{ opacity: t, transform: `translateY(${((1 - t) * 0.15).toFixed(3)}em)`, display: 'inline-block' }}>{p.text}</span></Box>;
};

/** cubic-bezier(x1, y1, x2, y2) as a function of t in [0, 1] (CSS / AE speed-0 influence curves). */
const bezier = (x1: number, y1: number, x2: number, y2: number) => (t: number) => {
  const u = clamp01(t);
  const bx = (s: number) => 3 * (1 - s) ** 2 * s * x1 + 3 * (1 - s) * s * s * x2 + s ** 3;
  let lo = 0, hi = 1;
  for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (bx(m) < u) lo = m; else hi = m; }
  const s = (lo + hi) / 2;
  return 3 * (1 - s) ** 2 * s * y1 + 3 * (1 - s) * s * s * y2 + s ** 3;
};
const FILL_EASE = bezier(0.13, 0, 0, 1);

/** Fill. The word appears whole in the accent yellow, sliding in from 0.23 W to the left with an
 *  exponential ease-out (time constant 10.3 frames at 24 fps), and at once a soft edge sweeps **right to left** turning
 *  each letter to the settle colour: the preset's range End 82 -> 0 over 47 frames at 24 fps with cubic-bezier(0.13, 0,
 *  0, 1), so the right-hand letters turn in a few frames and the first letters last. Yellow never stays: it is only the
 *  pop. `marker` (opt-in) is the older variant: charcoal letters over a yellow marker box that stays.
 *
 *  Light paper (a dark `settle` colour): yellow letters on cream do not read and the yellow-to-charcoal mix passes
 *  through a muddy olive, so there the letters are charcoal from the first frame and the yellow is a flat block behind
 *  them that shrinks right to left on the same curve. Same timing, same flash, readable on every frame. On dark
 *  pictures (a light `settle`, e.g. cream) the letters themselves flash yellow, as in the reel.
 *  The slide never starts the first letter off the frame: it is capped at the text's own left margin. */
export const PopWord: React.FC<TextBase & { text: string; accent?: string; settle?: string; dur?: number; slide?: boolean; rate?: number; marker?: boolean }> = ({ text, accent = VOX.yellow, settle = VOX.charcoal, dur = 59, slide = true, rate = 1, marker = false, ...p }) => {
  const f = useCurrentFrame();
  const { width: W, fps } = useVideoConfig();
  const a = f - p.at;
  if (a < 0) return null;
  const chars = [...text];
  const n = chars.length;
  if (!marker) {
    const k = fps / 24;
    const room = (p.align ?? 'left') === 'left' ? Math.max(0, p.x - 0.03) : 0.23;
    const dx = slide ? -Math.min(0.23, room) * W * Math.exp(-a / (10.3 * k)) : 0;
    // the range's end, as a fraction of the word: letters left of it are still yellow; a soft edge 0.18 wide
    // (it runs on past 0 by half the edge, so the first letter finishes too)
    const soft = 0.18;
    const end = 0.82 - (0.82 + soft / 2) * FILL_EASE(a / dur);
    const [r, g, b] = hexRgb(settle);
    const lightPaper = 0.2126 * r + 0.7152 * g + 0.0722 * b < 128;
    if (lightPaper) {
      const px = p.size * W;
      const w = clamp01(end + soft / 2);
      return (
        <Box {...p} color={settle} extra={{ transform: `translateX(${dx.toFixed(1)}px)` }}>
          <span style={{ position: 'relative', display: 'inline-block' }}>
            {w > 0 && <span style={{ position: 'absolute', left: -px * 0.06, top: '10%', bottom: '2%', width: `calc(${(w * 100).toFixed(2)}% + ${(px * 0.12).toFixed(1)}px)`, background: accent }} />}
            <span style={{ position: 'relative', zIndex: 1, display: 'inline-block' }}>{text}</span>
          </span>
        </Box>
      );
    }
    return (
      <Box {...p} color={settle} extra={{ transform: `translateX(${dx.toFixed(1)}px)` }}>
        {chars.map((c, i) => {
          const pos = (i + 0.5) / n;
          const turn = clamp01((pos - end) / soft + 0.5);
          return <span key={i} style={{ color: mix(accent, settle, turn) }}>{c}</span>;
        })}
      </Box>
    );
  }
  {
    // on light paper yellow letters do not read: the yellow becomes a marker swept behind charcoal letters, left to
    // right with the letters, and stays
    const px = p.size * W;
    const sweep = 1 - (1 - clamp01(a / ((n / rate) + 2))) ** 2;
    return (
      <Box {...p} color={settle}>
        <span style={{ position: 'relative', display: 'inline-block', padding: `0 ${(px * 0.08).toFixed(1)}px` }}>
          <span style={{ position: 'absolute', left: 0, top: '12%', bottom: '4%', width: `${(sweep * 100).toFixed(1)}%`, background: accent }} />
          <span style={{ position: 'relative', zIndex: 1, display: 'inline-block' }}>
            {chars.map((c, i) => <span key={i} style={{ opacity: clamp01((a - i / rate) / 2) }}>{c}</span>)}
          </span>
        </span>
      </Box>
    );
  }
};

/** The letters appear in a random order over `spread` frames, linearly, each one at once (no fade). From the
 *  reference's AppearRandom.ffx: range selector End 100 -> 0 over 13 frames at 24 fps,
 *  linear, Randomize Order on, Opacity 0; 13 frames at 24 fps is 16 at 30. */
export const RandomLetters: React.FC<TextBase & { text: string; spread?: number; seed?: string }> = ({ text, spread = 16, seed = 'rl', ...p }) => {
  const f = useCurrentFrame();
  if (f < p.at) return null;
  const order = [...text].map((c, i) => ({ c, i, k: random(`${seed}${i}`) })).sort((a, b) => a.k - b.k);
  const when = new Map(order.map((o, n) => [o.i, p.at + Math.floor((n / Math.max(1, order.length)) * spread)]));
  return <Box {...p}>{[...text].map((c, i) => <span key={i} style={{ opacity: f >= when.get(i)! ? 1 : 0 }}>{c}</span>)}</Box>;
};

/** Odometer: each character rolls up from
 *  below its line into place, masked at the line, left to right `stagger` frames apart, each over `roll` frames with a
 *  slight overshoot. With `from`, the old text rolls up and out as the new one rolls in, column by column. */
export const Odometer: React.FC<TextBase & { text: string; from?: string; roll?: number; stagger?: number }> = ({ text, from, roll = 7, stagger = 1.5, ...p }) => {
  const f = useCurrentFrame();
  const { width: W } = useVideoConfig();
  if (f < p.at && !from) return null;
  const px = p.size * W, lh = px * 1.15;
  const n = Math.max(text.length, from?.length ?? 0);
  const ease = (t: number) => { const u = clamp01(t); return 1 + 2.2 * (u - 1) ** 3 + 1.2 * (u - 1) ** 2; };
  return (
    <Box {...p} extra={{ overflow: 'visible' }}>
      {Array.from({ length: n }, (_, i) => {
        const t = (f - p.at - i * stagger) / roll;
        const e = t <= 0 ? 0 : ease(t);
        const next = text[i] ?? ' ', prev = from?.[i] ?? ' ';
        return (
          <span key={i} style={{ position: 'relative', display: 'inline-block', height: lh, overflow: 'hidden', verticalAlign: 'top' }}>
            <span style={{ display: 'inline-block', visibility: 'hidden' }}>{next.length >= prev.length ? next : prev}</span>
            {from && <span style={{ position: 'absolute', left: 0, top: 0, transform: `translateY(${(-e * lh).toFixed(1)}px)` }}>{prev}</span>}
            <span style={{ position: 'absolute', left: 0, top: 0, transform: `translateY(${((1 - e) * lh).toFixed(1)}px)` }}>{next}</span>
          </span>
        );
      })}
    </Box>
  );
};

/** A flat box wipes in left to right behind the text over `wipe` frames; the text sits in `textColor` on it. */
export const Highlight: React.FC<TextBase & { text: string; box?: string; textColor?: string; wipe?: number; padX?: number }> = ({ text, box = VOX.coral, textColor = VOX.cream, wipe = 7, padX = 0.18, ...p }) => {
  const f = useCurrentFrame();
  const { width: W } = useVideoConfig();
  if (f < p.at) return null;
  const t = clamp01((f - p.at) / wipe), e = 1 - (1 - t) ** 3;
  const px = p.size * W;
  return (
    <Box {...p} color={textColor} reg={0}>
      <span style={{ position: 'relative', display: 'inline-block', padding: `${(px * 0.04).toFixed(1)}px ${(px * padX).toFixed(1)}px` }}>
        <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(e * 100).toFixed(1)}%`, background: box }} />
        <span style={{ position: 'relative', zIndex: 1, display: 'inline-block', opacity: clamp01((f - p.at - 2) / 4), textShadow: misreg(p.reg ?? 1.5, W, 0.35) }}>{text}</span>
      </span>
    </Box>
  );
};
