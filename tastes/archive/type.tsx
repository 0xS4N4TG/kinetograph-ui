// The archive's type. Two faces only: a book serif for what is said (EB Garamond), a typewriter for what the archive
// records (Courier Prime: dates, places, catalogue numbers). The moves:
//
//   Dateline   the archive's record line: typewriter caps, tracked 0.18 em, typed one character a frame behind a
//              block caret that blinks out after the last letter; a short rule leads it
//   Develop    the headline comes up the way a print comes up in the developer tray: each line from blank paper-white
//              and soft (blur 0.12 em) to its full tone and sharp over 14 frames, lines 7 frames apart
//   Line       a plain line that fades up (the words around the one that moves)
//   Tag        a catalogue tag: a paper card with dark typewriter ink, a red accession number, dropped in
//
// Sizes are fractions of the frame width W. Light type only over the dark (the vignette's falloff, a Scrim); on paper
// the type is ink. One text animation at a time: start the next when the last has landed.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { family } from '../explainer/type.js';
import { ARCHIVE, FONTS } from './tokens.js';

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const easeOut = (t: number) => 1 - (1 - clamp01(t)) ** 3;

export const serif = (weight = 500, italic = false) => family(FONTS.serif, weight, italic);
export const typewriter = (weight = 400) => family(FONTS.type, weight, false);

interface Place {
  /** anchor in fractions of W and H: the left edge (or centre/right by `align`) and the line's middle */
  x: number;
  y: number;
  /** font size, fraction of W */
  size: number;
  align?: 'left' | 'center' | 'right';
  color?: string;
  /** first frame */
  at: number;
  /** a frame from which it fades out over 6 frames */
  out?: number;
}

const box = (p: Place, W: number, H: number): React.CSSProperties => {
  const px = p.size * W;
  const align = p.align ?? 'left';
  const pos: React.CSSProperties = align === 'left' ? { left: p.x * W } : { left: (p.x - (align === 'center' ? 0.5 : 1)) * W, width: W, justifyContent: align === 'center' ? 'center' : 'flex-end' };
  return { position: 'absolute', ...pos, top: p.y * H - px * 0.62, display: 'flex', whiteSpace: 'pre', fontSize: px, lineHeight: 1.2 };
};
const gone = (f: number, out?: number) => (out === undefined ? 0 : clamp01((f - out) / 6));
/** a soft dark halo so light type holds on any part of a photo */
const halo = (W: number) => `0 ${(0.002 * W).toFixed(1)}px ${(0.012 * W).toFixed(1)}px rgba(8,6,4,0.85), 0 0 ${(0.03 * W).toFixed(1)}px rgba(8,6,4,0.55)`;

/** The record line: typewriter caps typed one character a frame, a caret, a lead rule. */
export const Dateline: React.FC<Place & { text: string; rate?: number; rule?: boolean }> = ({ text, rate = 1, rule = true, color = ARCHIVE.silver, ...p }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const a = f - p.at;
  if (a < 0) return null;
  const shown = Math.min(text.length, Math.floor(a * rate) + 1);
  const done = shown >= text.length;
  const caret = !done || (Math.floor((a - text.length / rate) / 6) % 2 === 0 && a - text.length / rate < 24);
  const px = p.size * W;
  const ruleW = rule ? clamp01(a / 6) * px * 1.6 : 0;
  return (
    <div style={{ ...box(p, W, H), alignItems: 'center', fontFamily: typewriter(700), fontWeight: 700, letterSpacing: '0.18em', color, textShadow: halo(W), opacity: 1 - gone(f, p.out) }}>
      {rule && <span style={{ display: 'inline-block', width: ruleW, height: Math.max(2, px * 0.08), background: color, marginRight: px * 0.5, boxShadow: halo(W) }} />}
      <span>{text.slice(0, shown).toUpperCase()}</span>
      <span style={{ display: 'inline-block', width: px * 0.62, height: px * 0.95, background: color, opacity: caret ? 0.85 : 0, marginLeft: px * 0.06 }} />
    </div>
  );
};

/** The headline develops, line by line: from paper-white and soft to its tone and sharp. */
export const Develop: React.FC<Omit<Place, 'y'> & { lines: string[]; y: number; leading?: number; italic?: boolean[]; weight?: number; stagger?: number; dur?: number; shadow?: boolean }> = ({ lines, leading = 1.12, italic = [], weight = 500, stagger = 7, dur = 14, color = ARCHIVE.silver, shadow = true, ...p }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const px = p.size * W;
  const g = gone(f, p.out);
  return (
    <>
      {lines.map((text, i) => {
        const t = clamp01((f - p.at - i * stagger) / dur);
        if (f < p.at + i * stagger) return null;
        const e = easeOut(t);
        const it = italic[i] ?? false;
        // the developing print: overexposed (near white) and soft, darkening into its tone; on dark the "white" is
        // the silver, so the line glows up out of the black instead
        const blur = (1 - e) * 0.12 * px;
        return (
          <div key={i} style={{ ...box({ ...p, y: p.y + (i * leading * px) / H }, W, H), fontFamily: serif(weight, it), fontWeight: weight, fontStyle: it ? 'italic' : 'normal',
            letterSpacing: '-0.01em', color, opacity: clamp01(t * 2.2) * (1 - g), filter: blur > 0.3 ? `blur(${blur.toFixed(1)}px)${shadow ? ` brightness(${(1 + 0.6 * (1 - e)).toFixed(2)})` : ''}` : undefined, textShadow: shadow ? halo(W) : undefined }}>
            {text}
          </div>
        );
      })}
    </>
  );
};

/** A plain line fading up over 8 frames. */
export const Line: React.FC<Place & { text: string; face?: 'serif' | 'type'; italic?: boolean; weight?: number; shadow?: boolean }> = ({ text, face = 'serif', italic = false, weight = 500, color = ARCHIVE.silver, shadow = true, ...p }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  if (f < p.at) return null;
  const t = easeOut((f - p.at) / 8);
  return (
    <div style={{ ...box(p, W, H), fontFamily: face === 'serif' ? serif(weight, italic) : typewriter(weight), fontWeight: weight, fontStyle: italic ? 'italic' : 'normal',
      letterSpacing: face === 'type' ? '0.12em' : '-0.005em', color, opacity: t * (1 - gone(f, p.out)), transform: `translateY(${((1 - t) * 0.12 * p.size * W).toFixed(1)}px)`, textShadow: shadow ? halo(W) : undefined }}>
      {face === 'type' ? text.toUpperCase() : text}
    </div>
  );
};

/** A catalogue tag: paper card, dark typewriter ink, a red accession number; drops in (scale 1.12 to 1, turning
 *  from tilt + 4 to tilt) over 7 frames. Box in fractions of W and H, (x, y) its top-left. */
export const Tag: React.FC<{ x: number; y: number; w: number; at: number; no: string; lines: string[]; tilt?: number; size?: number; out?: number }> = ({ x, y, w, at, no, lines, tilt = -2, size = 0.034, out }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const a = f - at;
  if (a < 0) return null;
  const e = easeOut(a / 7);
  const px = size * W;
  return (
    <div style={{ position: 'absolute', left: x * W, top: y * H, width: w * W, padding: `${px * 0.7}px ${px * 0.85}px ${px * 0.8}px`, boxSizing: 'border-box', background: ARCHIVE.paper,
      backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.25), rgba(120,90,40,0.12))`, color: ARCHIVE.ink, fontFamily: typewriter(400), fontSize: px, lineHeight: 1.35,
      transform: `rotate(${(tilt + 4 * (1 - e)).toFixed(2)}deg) scale(${(1.12 - 0.12 * e).toFixed(4)})`, transformOrigin: '10% 0%', opacity: clamp01(a / 3) * (1 - gone(f, out)),
      boxShadow: `${0.004 * W}px ${0.01 * W}px ${0.025 * W}px rgba(0,0,0,0.55)` }}>
      {/* the string hole */}
      <div style={{ position: 'absolute', right: px * 0.7, top: px * 0.6, width: px * 0.7, height: px * 0.7, borderRadius: '50%', background: ARCHIVE.umber, boxShadow: `0 0 0 ${px * 0.12}px ${ARCHIVE.paperDark}` }} />
      <div style={{ fontFamily: typewriter(700), fontWeight: 700, color: ARCHIVE.stamp, letterSpacing: '0.08em', marginBottom: px * 0.3 }}>{no}</div>
      {lines.map((l, i) => <div key={i} style={{ whiteSpace: 'pre' }}>{l}</div>)}
    </div>
  );
};

/** A dark scrim behind light type: from the bottom (or top) of the frame, `reach` of the height. */
export const Scrim: React.FC<{ from?: 'bottom' | 'top'; reach?: number; strength?: number }> = ({ from = 'bottom', reach = 0.45, strength = 0.8 }) => (
  <AbsoluteFill style={{ pointerEvents: 'none', background: `linear-gradient(${from === 'bottom' ? '0deg' : '180deg'}, rgba(10,8,6,${strength}) 0%, rgba(10,8,6,${(strength * 0.55).toFixed(2)}) ${(reach * 55).toFixed(0)}%, rgba(10,8,6,0) ${(reach * 100).toFixed(0)}%)` }} />
);
