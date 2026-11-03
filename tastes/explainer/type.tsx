// The explainer's type. Its numbers come from the taste (taste.text, taste.light); as measured for BASE (pin 1119, 30 fps,
// sizes as fractions of the frame width W):
//
//   Lead     the small line: medium italic, 0.038 W, near-black (white on dark). It writes on one character at a time,
//            about one a frame (0.8 to 2.5 a frame across the reference's beats), spaces taking no time. Each letter lands
//            at 0.7 scale, 0.4 em up and turned -10 degrees and settles over 3 frames (0.8 / 0.9 scale, 0.25 / 0.1 em),
//            so the line ripples as it writes.
//   Keyword  the big words: extra-bold italic, tight (-0.04 em, line height about 0.9), placed line by line flush left
//            with ragged starts. Each word fades up out of a blur over 8 frames (10 px at 720 wide to 0), words 3 to 8
//            frames apart; or, in a beat that wants punch, pops in whole on its frame.
//   On dark  both bloom: the colour's core is lifted (red to a pink, white stays white) and two halos sit behind it,
//            a tight one and a wide one, with the letters themselves a touch soft, like light rather than ink.
//   Exits    a dissolve wave left to right (`wave` in stage.tsx), a uniform fade, or a push (an `x` offset per frame).
//
// The keyword is drawn before the object, so the object covers part of it, but only ever the tail of the last line:
// the keyword must still read.

import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { makeGoogleFont } from '@kinetographdev/core/google-fonts';
import { clamp01, wave } from './stage.js';
import type { ExplainerTaste } from './taste.js';

const loaded = new Map<string, string>();
/** The family for a taste font at a weight: a Google font by name, else the name as given (a font loaded elsewhere). */
export function family(name: string, weight: number, italic: boolean): string {
  const key = `${name}|${weight}|${italic}`;
  let fam = loaded.get(key);
  if (!fam) {
    try { fam = makeGoogleFont(name.replace(/ /g, '')).loadFont(italic ? 'italic' : 'normal', { weights: [String(weight)] }).fontFamily; }
    catch { fam = name; }
    loaded.set(key, fam);
  }
  return fam;
}

const hexRgb = (hex: string) => { const n = parseInt(hex.replace('#', '').slice(0, 6), 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; };
/** The bloom behind type on a dark beat: a tight halo and a wide one in the type's colour. */
const bloom = (taste: ExplainerTaste, color: string, px: number, strength = 1) => {
  const { glowTight, glowWide, glowStrength } = taste.light, k = strength * glowStrength;
  return `0 0 ${(px * glowTight).toFixed(1)}px rgba(${hexRgb(color)},${Math.min(1, 0.9 * k).toFixed(2)}), 0 0 ${(px * glowWide).toFixed(1)}px rgba(${hexRgb(color)},${Math.min(1, 0.6 * k).toFixed(2)})`;
};

/** A line's box: from its anchor at `x` (fraction of W), aligned left, centre or right, full width so it never wraps. */
export const anchor = (x: number, align: 'left' | 'center' | 'right', W: number): React.CSSProperties =>
  align === 'left' ? { left: x * W, justifyContent: 'flex-start' }
    : { left: (x - (align === 'center' ? 0.5 : 1)) * W, width: W, justifyContent: align === 'center' ? 'center' : 'flex-end' };

export interface LeadProps {
  taste: ExplainerTaste;
  text: string;
  /** the line's anchor (its left edge, centre or right edge, by `align`) and its middle, fractions of W and H */
  x: number;
  y: number;
  align?: 'left' | 'center' | 'right';
  /** the frame its first letter lands, and letters a frame (default the taste's) */
  at: number;
  rate?: number;
  /** a dark beat: white type that blooms */
  dark?: boolean;
  /** a dissolve wave's first frame */
  out?: number;
  /** an offset in W this frame (a push exit) */
  dx?: number;
  /** a fraction of W (default the taste's) */
  size?: number;
}

/** The small lead line, written on letter by letter with the settling hop. */
export const Lead: React.FC<LeadProps> = ({ taste, text, x, y, align = 'left', at, rate = taste.text.leadRate, dark, out, dx = 0, size = taste.text.leadSize }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const px = W * size;
  const color = dark ? taste.inkOnDark : taste.ink;
  let n = 0;
  const T = taste.text, words = T.leadMode === 'words';
  // in words mode every letter of a word takes the word's first letter's frame
  let wordAt = at;
  const chars = [...text].map((c, i, all) => {
    const t = at + Math.floor(n / rate);
    if (c !== ' ' && (i === 0 || all[i - 1] === ' ')) wordAt = t;
    if (c !== ' ') n++;
    return { c, at: c === ' ' ? -1 : words ? wordAt : t };
  });
  const start = align === 'left' ? x : align === 'center' ? x - text.length * size * 0.27 : x - text.length * size * 0.54;
  return (
    <div style={{ position: 'absolute', ...anchor(x + dx, align, W), top: y * H - px * 0.62,
      display: 'flex', whiteSpace: 'pre', fontFamily: family(taste.leadFont ?? taste.font, taste.leadWeight, taste.leadItalic ?? taste.italic),
      fontStyle: taste.leadItalic ?? taste.italic ? 'italic' : 'normal', fontWeight: taste.leadWeight, fontSize: px, lineHeight: 1.2, letterSpacing: `${taste.text.leadTracking}em`, color,
      textShadow: dark ? bloom(taste, color, px, 0.7) : undefined }}>
      {chars.map((ch, i) => {
        if (ch.c === ' ') return <span key={i}>{' '}</span>;
        const a = f - ch.at;
        if (a < 0) return <span key={i} style={{ opacity: 0 }}>{ch.c}</span>;
        const hop = words ? { s: 1, y: -(T.leadBob[a] ?? 0), r: 0 } : (T.hop[a] ?? { s: 1, y: 0, r: 0 });
        const k = words ? T.fadeFrom + (1 - T.fadeFrom) * clamp01((a + 1) / T.fade) : 1;
        const soft = words ? (1 - k) * T.blur * W : 0;
        const gone = wave(f, out, start + i * size * 0.55, start, taste.motion.waveSpeed, taste.motion.waveFade);
        return (
          <span key={i} style={{ display: 'inline-block', transformOrigin: '50% 100%', transform: `translateY(${(-hop.y * px).toFixed(1)}px) scale(${hop.s}) rotate(${hop.r}deg)`,
            opacity: k * (1 - gone), filter: gone + soft > 0 ? `blur(${(gone * px * 0.25 + soft).toFixed(1)}px)` : undefined }}>{ch.c}</span>
        );
      })}
    </div>
  );
};

export interface KeyLine {
  words: string[];
  /** the line's left edge and middle, fractions of W and H (lines start ragged, a few hundredths apart) */
  x: number;
  y: number;
  /** the frame each word starts to arrive */
  at: number[];
  /** plain words, in `taste.muted` (or the lead's ink) at `taste.mutedWeight`: the whole line (true) or the words at
   *  these indexes (933 mixes both on one line: "ideas and"). false marks an accent line that bobs late and wide beside
   *  plain ones; unset for an ordinary keyword line */
  plain?: boolean | number[];
  /** where `x` anchors the line (default left) */
  align?: 'left' | 'center' | 'right';
}

export interface KeywordProps {
  taste: ExplainerTaste;
  lines: KeyLine[];
  /** the font size, a fraction of W (0.087 to 0.215 in the reference: bigger for fewer, shorter words) */
  size: number;
  /** pop each word in whole instead of the blur fade (default the taste's) */
  pop?: boolean;
  dark?: boolean;
  /** a dissolve wave's first frame, or a uniform fade [from, to] */
  out?: number;
  fade?: [number, number];
  dx?: number;
}

/** The big keyword lines, word by word. */
export const Keyword: React.FC<KeywordProps> = ({ taste, lines, size, pop = taste.text.pop, dark, out, fade, dx = 0 }) => {
  const T = taste.text;
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const px = W * size;
  const color = dark ? taste.keywordOnDark : taste.accentMode === 'highlight' ? taste.ink : taste.keyword;
  const faded = fade ? 1 - clamp01((f - fade[0]) / (fade[1] - fade[0])) : 1;
  return (
    <>
      {lines.map((ln, li) => {
        let chars = 0;
        return (
          <div key={li} style={{ position: 'absolute', ...anchor(ln.x + dx, ln.align ?? 'left', W), top: ln.y * H - px * 0.55, display: 'flex', columnGap: px * T.keyGap, whiteSpace: 'pre',
            fontFamily: family(taste.font, taste.keyWeight, taste.italic), fontStyle: taste.italic ? 'italic' : 'normal', fontWeight: taste.keyWeight,
            fontSize: px, lineHeight: T.keyLineHeight, letterSpacing: `${T.keyTracking}em`, color, textShadow: dark ? bloom(taste, color, px) : undefined, filter: dark ? `blur(${(W / 720 * 0.7).toFixed(2)}px)` : undefined }}>
            {ln.words.map((word, wi) => {
              const t = f - (ln.at[wi] ?? ln.at[0]!);
              const k = pop ? (t >= 0 ? 1 : 0) : t < 0 ? 0 : T.fadeFrom + (1 - T.fadeFrom) * clamp01(t / T.fade);
              // the spring bob (taste.text.bob): a late accent line starts `bobLag` frames later and swings `bobGain` wider
              // a taste with both moves (933) bobs on dark beats and rises on paper ones
              const plain = ln.plain === true || (Array.isArray(ln.plain) && ln.plain.includes(wi));
              const late = ln.plain === false || (Array.isArray(ln.plain) && !plain), nb = dark ? T.bob.length : 0;
              const bob = nb && t >= 0 ? (T.bob[Math.min(nb - 1, Math.max(0, t - (late ? T.bobLag : 0)))] ?? 0) * (late ? T.bobGain : 1) : 0;
              const rise = T.rise && !nb && t >= 0 ? T.rise * T.riseKeep ** t : 0;
              const x0 = ln.x + chars * size * 0.56;
              chars += word.length + 1;
              const gone = wave(f, out, x0, 0.1, taste.motion.waveSpeed, taste.motion.waveFade);
              const blur = (pop ? 0 : (1 - k) * T.blur * W) + gone * 8;
              const hi = taste.accentMode === 'highlight' && !dark ? clamp01((t - 5) / 9) : 0;
              return (
                <span key={wi} style={{ display: 'inline-block', ...(plain ? { color: dark ? taste.inkOnDark : taste.muted ?? taste.ink, fontWeight: taste.mutedWeight ?? taste.keyWeight,
                  fontFamily: family(taste.font, taste.mutedWeight ?? taste.keyWeight, taste.italic) } : {}), transform: bob + rise ? `translateY(${((bob + rise) * px).toFixed(1)}px)` : undefined, opacity: k * faded * (1 - gone), filter: blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : undefined,
                  ...(hi > 0 ? { backgroundImage: `linear-gradient(${taste.highlight}, ${taste.highlight})`, backgroundRepeat: 'no-repeat', backgroundPosition: `0px ${(px * 0.18).toFixed(1)}px`,
                    backgroundSize: `${(hi * 100).toFixed(1)}% ${(px * 0.8).toFixed(1)}px`, paddingLeft: px * 0.08, paddingRight: px * 0.08, marginLeft: -px * 0.08, marginRight: -px * 0.08 } : {}) }}>{word}</span>
              );
            })}
          </div>
        );
      })}
    </>
  );
};

/** A small paragraph typed on (pin 971: about 3.3 characters a frame, centred lines, regular weight, the ink colour). */
export const Paragraph: React.FC<{ taste: ExplainerTaste; lines: string[]; x: number; y: number; at: number; rate?: number; size?: number; align?: 'left' | 'center' | 'right' }> = ({ taste, lines, x, y, at, rate = 3.3, size = 0.027, align = 'center' }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const px = size * W;
  let shown = Math.max(0, Math.floor((f - at) * rate));
  return (
    <>
      {lines.map((ln, i) => {
        const part = ln.slice(0, Math.max(0, shown));
        shown -= ln.length;
        return (
          <div key={i} style={{ position: 'absolute', ...anchor(x, align, W), top: y * H + i * px * 1.4 - px * 0.6, display: 'flex', whiteSpace: 'pre',
            fontFamily: family('Inter', 400, false), fontWeight: 400, fontSize: px, lineHeight: 1.2, color: taste.ink }}>{part}</div>
        );
      })}
    </>
  );
};
