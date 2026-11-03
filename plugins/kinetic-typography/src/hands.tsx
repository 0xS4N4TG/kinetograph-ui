// Captions written on in many hands, the look of jellysynth.com's projected captions (from the Kinetograph launch
// film, examples/launch/print/captions.tsx): each word writes itself across its spoken time a letter at a time, every
// letter in a different handwritten face, so it reads as one restless hand; the key words break out whole in a big
// display face, a fat serif with a doodle beside it or a heavy italic that streaks in. Letters glow warm, like projected
// light, and land with a pink and cyan fringe that closes up.
//
// The text can hang off a tracked subject (`anchor`): a reticle on the subject, thin lines from it to the text and off
// the frame, and a bracket riding the letter being written with the subject's coordinates. Without `anchor` the
// captions sit centred low in the frame.

import React from 'react';
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from '@kinetographdev/core';
import { makeGoogleFont } from '@kinetographdev/core/google-fonts';

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const font = (name: string, weight: string) => makeGoogleFont(name).loadFont('normal', { weights: [weight] }).fontFamily;

/** A handwritten face. `k` evens out how big each reads at one size. */
export interface Hand { family: string; weight: number; k: number }

/** The default hands, mixed a letter at a time (OFL Google Fonts). */
export const HANDS: Hand[] = [
  { family: font('Caveat', '700'), weight: 700, k: 1.18 },
  { family: font('ShadowsIntoLight', '400'), weight: 400, k: 1.02 },
  { family: font('IndieFlower', '400'), weight: 400, k: 0.98 },
  { family: font('GloriaHallelujah', '400'), weight: 400, k: 0.86 },
  { family: font('PatrickHand', '400'), weight: 400, k: 1.04 },
  { family: font('GochiHand', '400'), weight: 400, k: 1.0 },
];
/** The display faces a key word breaks out in, taken in turn: a soft fat serif, and a heavy italic that streaks. */
export const SERIF = font('AbrilFatface', '400');
export const HEAVY = font('ArchivoBlack', '400');
const MONO = font('JetBrainsMono', '400');

/** One spoken word: its text and the frames it is said over. */
export interface Word { text: string; from: number; to: number }
export interface Point { x: number; y: number }
/** A tracked subject: its centre, the side the text should go (else the roomier), and its box when known. */
export interface Subject extends Point { side?: 'left' | 'right'; w?: number; h?: number }

/** Words from timestamps in seconds (an ASR or TTS word list), starting on frame `at`. */
export function wordsFrom(stamps: { w: string; s: number; e: number }[], fps: number, at = 0): Word[] {
  return stamps.map((x) => ({ text: x.w, from: at + Math.round(x.s * fps), to: at + Math.round(x.e * fps) }));
}

/** A word to break out: the word alone (its face set by its place in the list: the 1st, 3rd, ... entry in the serif,
 *  the 2nd, 4th, ... in the heavy italic, every time it is said), or with its own colour and face. */
export type HotWord = string | { word: string; color?: string; face?: 'serif' | 'heavy' };

interface Spoken extends Word { hot: number; id: number; color?: string; face?: 'serif' | 'heavy' }
interface Page { words: Spoken[]; from: number; to: number }

const bare = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, '');

/** The pages: `split` word counts per page (default 3 a page). A page stays up until the next starts, or `hold` frames
 *  after its last word. `hot` words (compared without case or punctuation) break out, numbered by their place in `hot`. */
export function pagesOf(words: Word[], split?: number[], hot: readonly HotWord[] = [], hold = 12): Page[] {
  const looks = hot.map((h) => (typeof h === 'string' ? { word: h } : h));
  // a hot word is numbered by its place in the list, not by when it is said, so a word said twice keeps its face and
  // adding a word to the list leaves the others' alone
  const said: Spoken[] = words.map((w, i) => {
    const k = looks.findIndex((h) => bare(h.word) === bare(w.text));
    const look = looks[k];
    return { ...w, hot: k + 1, id: i + 1, ...(look ? { color: look.color, face: look.face } : {}) };
  });
  const counts = split ?? Array.from({ length: Math.ceil(said.length / 3) }, (_, i) => Math.min(3, said.length - i * 3));
  if (counts.reduce((a, b) => a + b, 0) !== said.length) throw new Error(`split covers ${counts.reduce((a, b) => a + b, 0)} words, not ${said.length}`);
  const out: Page[] = [];
  let k = 0;
  for (const c of counts) {
    const ws = said.slice(k, k + c);
    k += c;
    out.push({ words: ws, from: ws[0]!.from, to: ws[ws.length - 1]!.to + hold });
  }
  out.forEach((p, i) => { const next = out[i + 1]; if (next && next.from < p.to) p.to = next.from; });
  return out;
}

/** When each word is written: across its spoken time for a plain word, at once for one that breaks out. */
export const wordSpans = (words: Word[], split?: number[], hot: readonly HotWord[] = []): { from: number; to: number; hot: boolean }[] =>
  pagesOf(words, split, hot).flatMap((p) => p.words.filter((w) => w.from < p.to).map((w) => ({ from: w.from, to: Math.min(w.to, p.to), hot: w.hot > 0 })));

/** The frame letter `k` of `n` in a word appears: the word writes itself across its spoken time. */
const letterAt = (w: Word, k: number, n: number) => w.from + ((w.to - w.from) * k) / Math.max(1, n);

interface Style { size: number; color: string; hotColor?: string; glow: string; hands: Hand[]; serif: string; heavy: string; doodle: string | false; fringe: boolean }

/** The dark halo, as text-shadows listed after the glow so they paint under it: a tight black edge round each letter,
 *  then darker and wider shadows, so whatever is behind a word falls to grey near it. `k` scales the opacities. */
export function haloOf(k: number): string {
  if (k <= 0) return '';
  const a = (v: number) => Math.min(1, v * k).toFixed(2);
  return [`0 0 2px rgba(0,0,0,${a(1)})`, `0 0 3px rgba(0,0,0,${a(1)})`, `0 2px 6px rgba(0,0,0,${a(0.95)})`,
    `0 0 18px rgba(0,0,0,${a(0.85)})`, `0 0 40px rgba(0,0,0,${a(0.6)})`].join(', ');
}

/** Lands over 6 frames: a little big, with a pink and cyan fringe that closes up. */
function landing(t: number, fringe: boolean): { scale: number; opacity: number; fringe: string } {
  const a = interpolate(t, [0, 6], [1, 0], CLAMP);
  const off = 5 * a;
  return {
    scale: interpolate(t, [0, 3], [1.3, 1], CLAMP),
    opacity: interpolate(t, [0, 1.5], [0, 1], CLAMP),
    fringe: fringe ? `${-off}px 0 0 rgba(255,70,160,${(0.85 * a).toFixed(3)}), ${off}px 0 0 rgba(70,255,220,${(0.85 * a).toFixed(3)}), ` : '',
  };
}

/** The bracket on the letter being written, with the subject's coordinates in small type. */
const Bracket: React.FC<{ at: Point; color: string }> = ({ at, color }) => (
  <div style={{ position: 'absolute', left: -5, right: -5, top: '8%', bottom: '-4%', border: `1.5px solid ${color}`, boxShadow: '0 0 6px rgba(255,236,210,0.5)' }}>
    <div style={{ position: 'absolute', left: -4, top: -4, width: 6, height: 6, background: color }} />
    <div style={{ position: 'absolute', right: -4, bottom: -4, width: 6, height: 6, background: color }} />
    <div style={{ position: 'absolute', left: '100%', top: -18, marginLeft: 8, fontFamily: MONO, fontSize: 13, color, whiteSpace: 'pre', letterSpacing: 0.5, opacity: 0.9 }}>
      {`x: ${Math.round(at.x)}  y: ${Math.round(at.y)}`}
    </div>
  </div>
);

/** A little flower, drawn on stroke by stroke, beside a word that broke out. */
const Doodle: React.FC<{ t: number; seed: number; color: string }> = ({ t, seed, color }) => {
  const draw = interpolate(t, [0, 10], [0, 1], CLAMP);
  const petals = [0, 1, 2, 3, 4].map((i) => {
    const a = (i / 5) * Math.PI * 2 + seed;
    const x = Math.cos(a) * 15, y = Math.sin(a) * 15;
    return `M0 0 Q${(x * 0.2 - y * 0.6).toFixed(1)} ${(y * 0.2 + x * 0.6).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)} Q${(x * 0.2 + y * 0.6).toFixed(1)} ${(y * 0.2 - x * 0.6).toFixed(1)} 0 0`;
  });
  return (
    <svg width={60} height={60} viewBox="-30 -30 60 60" style={{ position: 'absolute', right: -52, top: -30, overflow: 'visible' }}>
      {petals.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - interpolate(draw, [i / 6, (i + 1) / 6], [0, 1], CLAMP)} />
      ))}
      <circle r={3.5 * interpolate(draw, [0.8, 1], [0, 1], CLAMP)} fill="#FFE27A" />
    </svg>
  );
};

/** A hot word's face: its own, else serif and heavy in turn down the `hot` list. */
const isSerif = (w: Spoken) => (w.face ? w.face === 'serif' : w.hot % 2 === 1);

/** One word: plain words letter by letter in mixed hands; a hot word whole, in its display face. */
const WordView: React.FC<{ w: Spoken; head: number | null; anchor: Point | null; s: Style }> = ({ w, head, anchor, s }) => {
  const frame = useCurrentFrame();
  const letters = [...w.text];
  const glow = s.glow ? `, ${s.glow}` : '';
  if (w.hot) {
    const t = frame - w.from;
    if (t < 0) return <span style={{ display: 'inline-block', width: 0 }} />;
    const l = landing(t, s.fringe);
    const serif = isSerif(w);
    const size = s.size * (serif ? 1.38 : 1.26);
    const color = w.color ?? s.hotColor ?? s.color;
    return (
      <span style={{ position: 'relative', display: 'inline-block', margin: `0 ${s.size * 0.18}px`, verticalAlign: 'baseline' }}>
        {/* the heavy italic streaks in from the left */}
        {!serif && t < 8 && (
          <span style={{ position: 'absolute', left: 0, top: 0, fontFamily: s.heavy, fontSize: size, fontStyle: 'italic', color, whiteSpace: 'nowrap',
            opacity: 0.35 * (1 - t / 8), filter: 'blur(6px)', transform: `translateX(${-40 + t * 5}px) scaleX(1.25)` }}>{w.text}</span>
        )}
        <span style={{
          display: 'inline-block', fontFamily: serif ? s.serif : s.heavy, fontStyle: serif ? 'normal' : 'italic', fontSize: size, lineHeight: 1,
          color, whiteSpace: 'nowrap', textShadow: `${l.fringe}0 0 0 transparent${glow}`, opacity: l.opacity,
          transform: `scale(${l.scale.toFixed(3)}) rotate(${((random(`r-${w.id}`) - 0.5) * 5).toFixed(2)}deg)`,
        }}>{w.text}</span>
        {serif && s.doodle && <Doodle t={t - 4} seed={w.id} color={s.doodle} />}
        {head === 0 && anchor && <Bracket at={anchor} color={s.color} />}
      </span>
    );
  }
  return (
    <span style={{ display: 'inline-block', margin: `0 ${s.size * 0.15}px`, whiteSpace: 'nowrap' }}>
      {letters.map((ch, k) => {
        const t = frame - letterAt(w, k, letters.length);
        const hand = s.hands[Math.floor(random(`h-${w.id}-${k}`) * s.hands.length)]!;
        const l = landing(t, s.fringe);
        const lift = (random(`y-${w.id}-${k}`) - 0.5) * s.size * 0.08;
        const tilt = (random(`t-${w.id}-${k}`) - 0.5) * 9;
        const big = 0.92 + random(`s-${w.id}-${k}`) * 0.18;
        return (
          <span key={k} style={{ position: 'relative', display: 'inline-block', verticalAlign: 'baseline' }}>
            <span style={{
              display: 'inline-block', fontFamily: hand.family, fontWeight: hand.weight, fontSize: s.size * hand.k * big, lineHeight: 1,
              color: s.color, textShadow: `${l.fringe}0 0 0 transparent${glow}`, opacity: t >= 0 ? l.opacity : 0,
              transform: `translateY(${lift.toFixed(1)}px) rotate(${tilt.toFixed(1)}deg) scale(${l.scale.toFixed(3)})`,
            }}>{ch}</span>
            {head === k && anchor && <Bracket at={anchor} color={s.color} />}
          </span>
        );
      })}
    </span>
  );
};

/** Where on the page the bracket is: the last letter that has appeared, as [word index, letter index]. */
function writeHead(page: Page, frame: number): [number, number] {
  let at: [number, number] = [0, 0];
  page.words.forEach((w, i) => {
    if (w.hot) { if (frame >= w.from) at = [i, 0]; return; }
    const n = [...w.text].length;
    for (let k = 0; k < n; k++) if (frame >= letterAt(w, k, n)) at = [i, k];
  });
  return at;
}

/** The reticle on the tracked subject: a box with ticks and an id, nudged a pixel or two each frame. It takes the
 *  subject's own box when the anchor gives one, else a 92 px square. */
const Reticle: React.FC<{ at: Subject; frame: number; color: string; label: string }> = ({ at, frame, color, label }) => {
  const jx = (random(`rx-${frame}`) - 0.5) * 3, jy = (random(`ry-${frame}`) - 0.5) * 3;
  const w = at.w ?? 92, h = at.h ?? 92;
  return (
    <div style={{ position: 'absolute', left: at.x - w / 2 + jx, top: at.y - h / 2 + jy, width: w, height: h, border: `1px solid ${color}`,
      boxShadow: '0 0 0 1px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(0,0,0,0.45)' }}>
      {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) => (
        <div key={`${x}${y}`} style={{ position: 'absolute', left: x ? undefined : -2, right: x ? -2 : undefined, top: y ? undefined : -2, bottom: y ? -2 : undefined, width: 12, height: 12,
          [`border${y ? 'Bottom' : 'Top'}`]: `3px solid ${color}`, [`border${x ? 'Right' : 'Left'}`]: `3px solid ${color}`, filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.8))' }} />
      ))}
      <div style={{ position: 'absolute', left: 0, top: '100%', marginTop: 6, fontFamily: MONO, fontSize: 13, color, whiteSpace: 'pre', opacity: 0.85 }}>
        {`${label}  ${(0.91 + random(`c-${Math.floor(frame / 5)}`) * 0.08).toFixed(2)}`}
      </div>
    </div>
  );
};

/** A page's width on one line, roughly: the hands are about half an em a letter, the display faces a little more. */
function guessWidth(page: Page, size: number): number {
  return page.words.reduce((a, w) => a + size * 0.32 + [...w.text].length * (w.hot ? size * (isSerif(w) ? 1.38 : 1.26) * 0.58 : size * 0.46), 0);
}

export interface HandCaptionsProps {
  /** The spoken words with their frames (`wordsFrom` turns timestamps in seconds into these). */
  words: Word[];
  /** Words per page. Default 3 a page. */
  split?: number[];
  /** Words that break out in a display face: a word, or `{ word, color, face }` to give it its own colour and face
   *  (`serif` or `heavy`; without one the faces take turns). */
  hot?: readonly HotWord[];
  /** The colour of every hot word without its own. Default `color`. */
  hotColor?: string;
  /** The tracked subject on a frame, in canvas pixels, or null where nothing is tracked: its centre, and its box
   *  (`w`, `h`) when known, which the reticle then frames and the text sits clear of. Without it the captions sit
   *  centred low in the frame, with no reticle or lines. */
  anchor?: (frame: number) => Subject | null;
  /** Where the text hangs, when it should not follow the subject (a subject that jumps about, or a place kept clear of
   *  the picture): the lines still run to the subject. A box here keeps the text clear of it as `anchor`'s does. */
  place?: (frame: number) => Subject | null;
  /** Letter size, px. Default 124 at 1080 high, scaled with the canvas. */
  size?: number;
  color?: string;
  /** A CSS text-shadow for the glow, or '' for none. */
  glow?: string;
  /** A dark halo under the glow, so the letters read over bright footage and white flashes: `true` (strength 1) or a
   *  strength, 0..1.5. Default off. */
  halo?: boolean | number;
  /** The pink and cyan fringe as letters land. Default true. */
  fringe?: boolean;
  /** The hands mixed a letter at a time, and the two display faces. */
  hands?: Hand[];
  serif?: string;
  heavy?: string;
  /** The doodle's colour beside a serif key word, or false for none. */
  doodle?: string | false;
  /** The reticle's label, or false for no reticle. Default `TRK 01`. */
  reticle?: string | false;
  /** Lines from the subject to the text and off the frame. Default true. */
  lines?: boolean;
  /** Highest the text block may reach, px from the top. */
  top?: number;
  width?: number;
  height?: number;
}

/** Captions written on in many hands, hanging off a tracked subject or centred low. */
export const HandCaptions: React.FC<HandCaptionsProps> = (p) => {
  const frame = useCurrentFrame();
  const vc = useVideoConfig();
  const width = p.width ?? vc.width, height = p.height ?? vc.height;
  const size = p.size ?? 124 * (height / 1080);
  const s: Style = {
    size, color: p.color ?? '#FFF4E2', hotColor: p.hotColor,
    glow: [p.glow ?? '0 0 10px rgba(255,236,210,0.55), 0 0 28px rgba(255,214,170,0.28)', haloOf(p.halo === true ? 1 : p.halo || 0)].filter(Boolean).join(', '),
    hands: p.hands ?? HANDS, serif: p.serif ?? SERIF, heavy: p.heavy ?? HEAVY, doodle: p.doodle ?? '#FF8FC8', fringe: p.fringe ?? true,
  };
  const page = pagesOf(p.words, p.split, p.hot).find((pg) => frame >= pg.from && frame < pg.to);
  if (!page) return null;
  const subject = p.anchor?.(frame) ?? null;
  const at = p.place ? p.place(frame) : subject;
  const [hw, hk] = writeHead(page, frame);
  const top = p.top ?? height * 0.15;

  // no subject: one centred block, low in the frame
  if (!p.anchor || !at || !subject) {
    if (p.anchor) return null;
    return (
      <AbsoluteFill style={{ width, height }}>
        <div style={{ position: 'absolute', left: width * 0.08, right: width * 0.08, bottom: height * 0.12, display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'center', rowGap: 4 }}>
          {page.words.map((w, i) => <WordView key={w.id} w={w} head={i === hw ? hk : null} anchor={null} s={s} />)}
        </div>
      </AbsoluteFill>
    );
  }

  // the block goes on the side where the page fits on one line, or the roomier side; its near edge is beside the
  // subject (clear of its box) and it grows up from its bottom, never above `top`
  const beside = Math.max(size * 0.73, (at.w ?? 0) / 2 + 24), above = Math.max(size * 1.2, (at.h ?? 0) / 2 + 24), margin = width * 0.03;
  const need = guessWidth(page, size);
  const roomOf = (sd: 'left' | 'right') => (sd === 'right' ? width - margin - (at.x + beside) : at.x - beside - margin);
  const side = at.side ?? (roomOf('right') >= need ? 'right' : roomOf('left') >= need ? 'left' : roomOf('right') > roomOf('left') ? 'right' : 'left');
  const near = side === 'right' ? at.x + beside : at.x - beside;
  // the longest single word sets the least width; the block then stays inside the frame, even over the subject
  const longest = Math.max(...page.words.map((w) => guessWidth({ ...page, words: [w] }, size)));
  const room = Math.min(width - 2 * margin, Math.max(size * 2, longest, roomOf(side)));
  const left = clamp(side === 'right' ? near : near - room, margin, width - margin - room);
  const rows = Math.max(1, Math.ceil(need / room));
  const bottom = Math.min(Math.max(height - (at.y - above), height * 0.15), height - top - rows * size * 1.6);
  const cx = near + (side === 'right' ? 30 : -30), cy = height - bottom + 10;
  const edge = { x: subject.x < width / 2 ? width + 40 : -40, y: subject.y + (subject.y < height / 2 ? 260 : -260) };
  return (
    <AbsoluteFill style={{ width, height }}>
      {(p.lines ?? true) && (
        <svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
          {/* a dark edge under the lines, so they read over white as well as dark */}
          <line x1={subject.x} y1={subject.y} x2={cx} y2={cy} stroke="#000" strokeWidth={3.2} strokeOpacity={0.3} />
          <line x1={subject.x} y1={subject.y} x2={edge.x} y2={edge.y} stroke="#000" strokeWidth={3} strokeOpacity={0.22} />
          <line x1={subject.x} y1={subject.y} x2={cx} y2={cy} stroke={s.color} strokeWidth={1.2} strokeOpacity={0.6} />
          <line x1={subject.x} y1={subject.y} x2={edge.x} y2={edge.y} stroke={s.color} strokeWidth={1} strokeOpacity={0.35} />
          <line x1={cx} y1={cy} x2={cx + (side === 'right' ? -260 : 260)} y2={cy - 40} stroke={s.color} strokeWidth={1} strokeOpacity={0.3} />
        </svg>
      )}
      {p.reticle !== false && <Reticle at={subject} frame={frame} color={s.color} label={p.reticle ?? 'TRK 01'} />}
      <div style={{
        position: 'absolute', bottom, width: room, left,
        display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: side === 'right' ? 'flex-start' : 'flex-end', rowGap: 4,
      }}>
        {page.words.map((w, i) => <WordView key={w.id} w={w} head={i === hw ? hk : null} anchor={subject} s={s} />)}
      </div>
    </AbsoluteFill>
  );
};
