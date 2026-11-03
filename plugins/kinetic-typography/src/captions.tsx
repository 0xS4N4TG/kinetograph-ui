// <Captions>: captions in a named style, timed to the voice. A line with a big word is a hook: the big word is set
// huge (fitted to the frame), the small words over and under it; a line without one is a caption. Each word arrives as
// it is said, in the look's motion; the line leaves together. The looks are in styles.ts.
//
//   <Captions words={words} split={[3, 3]} big={['premium']} preset="highlighter" footage={{ src: staticFile('me.mp4') }} />
//
// `footage` is the video under the captions: it gives `accent: 'footage'` its colour, `side: 'auto'` its open side, and
// lets `readable` strengthen the shadow where the picture under a line is bright.

import React from 'react';
import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from '@kinetographdev/core';
import { loadFont, makeWebFont } from '@kinetographdev/core/fonts';
import { makeGoogleFont } from '@kinetographdev/core/google-fonts';
import { pagesOf, type Word } from './hands.js';
// registers Kineta, the font that ships with the plugin
import '../fonts/kineta/kineta.css';
import { FONTS, styleLook, type FontInfo, type CaptionLook, type In, type LookPatch, type Out, type StyleName, type TextLook } from './styles.js';
import { BoilLine } from './boil-captions.js';
import { accentFrom, brightness, openSide, type Footage } from './footage.js';

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
/** A colour a little darker, so a shine has something to be brighter than (white becomes a light grey). */
const shade2 = (c: string) => {
  const m = /^#([0-9a-f]{6})$/i.exec(c);
  if (!m) return c;
  const n = parseInt(m[1]!, 16);
  return `rgb(${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * 0.8)).join(',')})`;
};

// ---- fonts ----

const faces = new Map<string, string>();
/** The family for a text look, loaded at the nearest weight the font has. */
function face(t: TextLook): { family: string; weight: number; italic: boolean } {
  const info: FontInfo = FONTS[t.font] ?? FONTS.Switzer;
  const weight = info.weights.reduce((a, b) => (Math.abs(b - t.weight) < Math.abs(a - t.weight) ? b : a));
  const italic = t.italic && info.italic;
  const key = `${info.module}|${weight}|${italic}`;
  let family = faces.get(key);
  if (!family) {
    if (info.local) {
      family = info.module;
    } else if (info.files) {
      for (const f of info.files) void loadFont({ family: info.module, url: f.url, weight: f.weight });
      family = info.module;
    } else {
      const font = info.css ? makeWebFont(info.css) : makeGoogleFont(info.module);
      family = font.loadFont(italic ? 'italic' : 'normal', { weights: [String(weight)] }).fontFamily;
    }
    faces.set(key, family);
  }
  return { family, weight, italic };
}

const cased = (s: string, c: TextLook['case']) => (c === 'upper' ? s.toUpperCase() : c === 'lower' ? s.toLowerCase() : s);
/** The word without the punctuation a caption drops (a trailing comma or full stop; a question mark stays). */
const clean = (s: string) => s.replace(/[,.;:]+$/, '');

/** A word's width in ems, from the font's average letter widths. */
function ems(text: string, t: TextLook): number {
  const info: FontInfo = FONTS[t.font] ?? FONTS.Switzer;
  let w = 0;
  for (const ch of text) w += (ch === ch.toUpperCase() && ch !== ch.toLowerCase() ? info.upper : info.lower) + t.tracking;
  return w * (t.weight >= 800 ? 1.04 : 1);
}

// ---- motion ----

const CUBIC = (u: number) => 1 - (1 - u) ** 3;
/** Past the mark and back, as a spring does. */
const BACK = (u: number) => { const c = 2.4; return 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2; };

interface Pose { opacity: number; x: number; y: number; scale: number; blur: number }
const REST: Pose = { opacity: 1, x: 0, y: 0, scale: 1, blur: 0 };

/** A word `t` frames into its entrance, `size` px tall. */
function enter(kind: In, t: number, dur: number, size: number, look: CaptionLook): Pose {
  if (t < 0) return { ...REST, opacity: 0 };
  if (kind === 'instant' || kind === 'typewriter') return REST;
  const u = clamp(t / dur);
  const e = look.bounce ? BACK(u) : CUBIC(u);
  const far = look.far;
  const soft = (look.soft / 100) * size * 0.12 * (1 - u);
  const fade = clamp(u * 2.2);
  switch (kind) {
    case 'rise': return { opacity: fade, x: 0, y: (1 - e) * size * 0.55 * far, scale: 1, blur: soft };
    case 'fall': return { opacity: fade, x: 0, y: -(1 - e) * size * 0.55 * far, scale: 1, blur: soft };
    case 'left': return { opacity: fade, x: -(1 - e) * size * 0.9 * far, y: 0, scale: 1, blur: soft };
    case 'right': return { opacity: fade, x: (1 - e) * size * 0.9 * far, y: 0, scale: 1, blur: soft };
    case 'focus': return { opacity: clamp(u * 1.6), x: 0, y: 0, scale: 1 + (1 - e) * 0.06 * far, blur: (1 - CUBIC(u)) * size * 0.22 * far + soft };
    case 'pop': return { opacity: clamp(u * 4), x: 0, y: 0, scale: 1 - (1 - (look.bounce ? BACK(u) : e)) * 0.45 * far, blur: soft };
    case 'box-first': return { opacity: clamp((t - dur * 0.45) / (dur * 0.35)), x: 0, y: 0, scale: 1, blur: 0 };
    default: return { opacity: fade, x: 0, y: 0, scale: 1, blur: soft };
  }
}

/** A word `u` (0..1) through the line's exit. */
function leave(kind: Out, u: number, size: number, far: number): Pose {
  if (u <= 0) return REST;
  const e = u * u;
  const gone = 1 - clamp(u * 1.4);
  switch (kind) {
    case 'cut': return u >= 1 ? { ...REST, opacity: 0 } : REST;
    case 'rise': return { opacity: gone, x: 0, y: -e * size * 0.6 * far, scale: 1, blur: 0 };
    case 'fall': return { opacity: gone, x: 0, y: e * size * 0.6 * far, scale: 1, blur: 0 };
    case 'left': return { opacity: gone, x: -e * size * 1.2 * far, y: 0, scale: 1, blur: 0 };
    case 'right': return { opacity: gone, x: e * size * 1.2 * far, y: 0, scale: 1, blur: 0 };
    case 'blur': return { opacity: 1 - u, x: 0, y: 0, scale: 1 + u * 0.04, blur: u * size * 0.25 * far };
    default: return { opacity: 1 - u, x: 0, y: 0, scale: 1, blur: 0 };
  }
}

const css = (p: Pose, jx = 0, jy = 0): React.CSSProperties => ({
  opacity: p.opacity,
  transform: `translate(${(p.x + jx).toFixed(1)}px, ${(p.y + jy).toFixed(1)}px) scale(${p.scale.toFixed(4)})`,
  filter: p.blur > 0.3 ? `blur(${p.blur.toFixed(1)}px)` : undefined,
});
/** A box behind a word, drawn as the word's own background (an absolute sibling would be painted over the text):
 *  `grow` of its width from the left, `top` and `height` px down the word's line box, `pad` px out at each side. */
const fill = (color: string, grow: number, pad: number, top: number, height: number): React.CSSProperties =>
  grow <= 0 ? {} : {
    backgroundImage: `linear-gradient(${color}, ${color})`, backgroundRepeat: 'no-repeat',
    backgroundPosition: `0px ${top.toFixed(1)}px`, backgroundSize: `${(grow * 100).toFixed(2)}% ${height.toFixed(1)}px`,
    paddingLeft: pad, paddingRight: pad, marginLeft: -pad, marginRight: -pad,
  };
const both = (a: Pose, b: Pose): Pose => ({ opacity: a.opacity * b.opacity, x: a.x + b.x, y: a.y + b.y, scale: a.scale * b.scale, blur: a.blur + b.blur });

const VARY: In[] = ['pop', 'focus', 'left', 'fall', 'rise', 'right'];

// ---- the component ----

export interface CaptionsProps {
  /** The spoken words with their frames (`wordsFrom` turns timestamps in seconds into these). */
  words: Word[];
  /** Words per line. Default 3 a line. */
  split?: number[];
  /** Words set big (matched without case or punctuation): a line with one is a hook. */
  big?: string[];
  /** Caption words marked out (heavier, coloured or boxed, by the look's `mark`). Default: each caption line's first word. */
  marks?: string[];
  /** A style by name (`STYLE_NAMES`). */
  preset?: StyleName;
  /** Changes to the style, every line. */
  look?: LookPatch;
  /** Changes for single lines, by line index from 0: `{ 2: { bigIn: 'left', big: { color: '#fff' } } }`. */
  lines?: Record<number, LookPatch>;
  /** The video under the captions, timed as its `<Video>` is. */
  footage?: Footage;
  /** The subject (a face) on a frame, in canvas pixels: `beside` puts the block in the open side of it, at its eye
   *  level. A point track from plugins/vj/tools/track.mjs read with `pointAt`, or a fixed point. Read once a line. */
  subject?: (frame: number) => { x: number; y: number } | null;
  /** Frames a line stays after its last word when the next does not start sooner. Default 12. */
  hold?: number;
  width?: number;
  height?: number;
}

const bare = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, '');

export interface CaptionLine { index: number; from: number; to: number; hook: boolean; words: (Word & { hot: number; id: number })[] }

/** The lines of a caption track: when each starts and ends and whether it is a hook (has a big word). */
export function captionLines(words: Word[], split?: number[], big: string[] = [], hold = 12): CaptionLine[] {
  return pagesOf(words, split, big, hold).map((p, i) => ({ index: i, from: p.from, to: p.to, hook: p.words.some((w) => w.hot > 0), words: p.words }));
}

/** Frames worth a still: a hook's big word and a caption line, each settled, to check that both read. */
export function checkFrames(words: Word[], split?: number[], big: string[] = [], hold = 12): { hook?: number; caption?: number } {
  const lines = captionLines(words, split, big, hold);
  const hook = lines.find((l) => l.hook);
  const cap = lines.find((l) => !l.hook);
  const settled = (l: (typeof lines)[number], w: Word) => Math.min(l.to - 1, w.from + 10);
  return {
    hook: hook ? settled(hook, hook.words.find((w) => w.hot > 0)!) : undefined,
    caption: cap ? settled(cap, cap.words[cap.words.length - 1]!) : undefined,
  };
}

export const Captions: React.FC<CaptionsProps> = (p) => {
  const frame = useCurrentFrame();
  const vc = useVideoConfig();
  const W = p.width ?? vc.width, H = p.height ?? vc.height, fps = vc.fps;
  const lines = captionLines(p.words, p.split, p.big, p.hold);
  const line = lines.find((l) => frame >= l.from && frame < l.to);
  if (!line) return null;
  const look = styleLook(p.preset, p.look, p.lines?.[line.index]);
  const accent = look.accent === 'footage' ? (p.footage ? accentFrom(p.footage, fps) : '#e2552b') : look.accent;
  const colour = (c: string) => (c === 'accent' ? accent : c);

  // poster-boil: the line drawn by hand, a word to a row (boil-captions.tsx)
  if (look.treatment === 'boil') {
    const margin = (W * (1 - look.fit)) / 2;
    return (
      <AbsoluteFill style={{ width: W, height: H }}>
        <BoilLine words={line.words} from={line.from} to={line.to} frame={frame} fps={fps} left={margin} top={look.y * H} width={W - margin * 2}
          rowMax={H * 0.2} colors={[accent, '#fa4c08', '#fa0644']} marks />
      </AbsoluteFill>
    );
  }

  // steps: the motion's clock held on 12 frames a second
  const tick = (t: number) => (look.steps ? Math.floor((t * 12) / fps) * (fps / 12) : t);
  const dur = Math.round((7 * fps) / 30 * (1 + look.soft / 120));
  const short = Math.min(W, H);
  const cap = look.caption.size * short;

  // the line's exit: the last frames before it ends, once its last word has arrived
  const last = line.words[line.words.length - 1]!;
  const outDur = look.out === 'cut' ? 0 : Math.round((6 * fps) / 30 * (1 + look.soft / 200));
  const outFrom = Math.max(line.to - outDur, last.from + dur);
  const outU = look.out === 'cut' ? 0 : outFrom >= line.to ? 0 : clamp((frame - outFrom) / Math.max(1, line.to - outFrom));

  const first = look.layout === 'plain' ? -1 : line.words.findIndex((w) => w.hot > 0);
  let end = first;
  while (first >= 0 && end + 1 < line.words.length && line.words[end + 1]!.hot > 0) end++;
  const run = first >= 0 ? line.words.slice(first, end + 1) : [];
  const bigWord = run[0];
  const marks = p.marks ? p.marks.map(bare) : null;
  const marked = (w: Word, i: number) => (marks ? marks.includes(bare(w.text)) : i === 0 && !bigWord);
  const startOf = (w: Word) => (look.reveal === 'line' ? line.from : w.from);

  // where the open side is, read once a line so the block does not jump about
  const who = p.subject?.(line.from) ?? null;
  const side = look.side !== 'auto' ? look.side : who ? (who.x > W / 2 ? 'left' : 'right') : p.footage ? openSide(p.footage, line.from, fps) : 'left';
  const margin = W * 0.07;
  const half = look.layout === 'beside';
  // beside a subject: from the frame's edge to a little short of the subject; without one, the open half
  const gap = W * 0.11;
  const nearEdge = who ? (side === 'left' ? Math.max(W * 0.3, who.x - gap) : Math.min(W * 0.7, who.x + gap)) : W / 2 + (side === 'left' ? -margin * 0.4 : margin * 0.4);
  const blockLeft = half ? (side === 'left' ? margin : nearEdge) : look.layout === 'left' ? margin * 1.2 : margin;
  const blockWidth = half ? (side === 'left' ? nearEdge - margin : W - margin - nearEdge) : W - margin * 2 - (look.layout === 'left' ? margin * 0.2 : 0);
  const eyeY = half && who ? clamp(who.y / H, 0.18, 0.7) : null;
  const align = half || look.layout === 'left' ? 'flex-start' : 'center';

  // the big word's size: fitted to `fit` of the frame's width, at most `big.size` captions tall
  const textOf = (w: Word) => cased(clean(w.text), look.big.case);
  const runText = run.map(textOf).join(' ');
  const oneLine = look.layout === 'one-line';
  const bigPx = bigWord ? (oneLine ? cap * Math.min(look.big.size, 1.3) : Math.min(cap * look.big.size, Math.min(look.fit * W, half ? blockWidth : W) / Math.max(1, ems(runText, look.big)))) : 0;

  // readability: a stronger shadow, and a soft scrim, where the picture under the text is bright
  const centreY = eyeY ?? (bigWord ? look.y : look.captionY);
  const band = bigWord && !oneLine ? bigPx * 0.9 + cap * 2.5 : cap * 1.6;
  const lit = look.readable && p.footage ? brightness(p.footage, line.from + 2, fps, [blockLeft / W, (centreY * H - band / 2) / H, (blockLeft + blockWidth) / W, (centreY * H + band / 2) / H]) : 0;
  const shade = Math.max(look.shadow, look.readable ? clamp((lit - 0.42) / 0.3) * 0.9 : 0);
  const shadow = (on: boolean) => (on && shade > 0.02 ? `0 0.03em 0.1em rgba(0,0,0,${(0.7 * shade).toFixed(3)}), 0 0 0.45em rgba(0,0,0,${(0.4 * shade).toFixed(3)})` : '');
  const scrim = look.readable && lit > 0.6 && look.blend === 'normal' ? clamp((lit - 0.6) * 2.2, 0, 0.55) : 0;

  const typing = look.in === 'typewriter';
  /** Letters of a word typed by `frame`: across its spoken time, at most 2.5 frames a letter. */
  const typed = (w: Word, n: number) => {
    const per = Math.min((w.to - w.from) / Math.max(1, n), fps / 12);
    return clamp(Math.floor((frame - startOf(w)) / Math.max(0.5, per)) + 1, 0, n);
  };
  // the cursor rides the newest word, and blinks once the line is typed
  const newest = [...line.words].reverse().find((w) => frame >= startOf(w));
  const cursorOn = (w: Word) => w === newest && (typed(w, clean(w.text).length) < clean(w.text).length || Math.floor((frame * 2) / fps) % 2 === 0);
  const Cursor: React.FC<{ color: string; px: number }> = ({ color, px }) => (
    <span style={{ display: 'inline-block', width: Math.max(2, px * 0.07), height: px * 0.82, marginLeft: px * 0.06, background: color, verticalAlign: '-0.08em' }} />
  );

  /** A small word: a caption word, or one of a hook's small words. */
  const Small: React.FC<{ w: Word; i: number; px: number }> = ({ w, i, px }) => {
    const t = tick(frame - startOf(w));
    const isMarked = marked(w, i) && look.mark !== 'none';
    const tl = isMarked && look.mark === 'weight' ? { ...look.caption, weight: Math.max(800, look.caption.weight + 200) } : look.caption;
    const f = face(tl);
    const text = cased(clean(w.text), tl.case);
    const shown = typing ? text.slice(0, typed(w, text.length)) : text;
    const boxed = isMarked && look.mark === 'box';
    const color = isMarked && look.mark === 'colour' ? accent : boxed ? (look.treatment === 'box-first' ? colour(look.big.color) : '#ffffff') : colour(tl.color);
    const pose = both(enter(look.in, t, dur, px, look), leave(look.out, outU, px, look.far));
    const boxIn = clamp(t / (dur * 0.5));
    const size = isMarked && look.mark === 'weight' ? px * 1.12 : px;
    return (
      <span style={{ position: 'relative', display: 'inline-block', margin: `0 ${(px * 0.13).toFixed(1)}px`, ...css(pose) }}>
        <span style={{ ...(boxed ? fill(accent, CUBIC(boxIn), size * 0.12, size * 0.1, size * 0.98) : {}), fontFamily: f.family, fontWeight: f.weight, fontStyle: f.italic ? 'italic' : 'normal', fontSize: size, lineHeight: 1.1, letterSpacing: `${tl.tracking}em`, color, whiteSpace: 'pre', textShadow: shadow(!boxed) || undefined }}>
          {shown}
        </span>
        {typing && cursorOn(w) && <Cursor color={colour(look.caption.color)} px={px} />}
      </span>
    );
  };

  /** The big word, dressed by the treatment and finish. */
  const Big: React.FC<{ w: Word }> = ({ w }) => {
    const t = tick(frame - startOf(w));
    const kind: In = look.bigIn === 'same' ? look.in : look.bigIn === 'vary' ? VARY[line.index % VARY.length]! : look.bigIn;
    const f = face(look.big);
    const px = bigPx;
    const tr = look.treatment;
    // box-first holds the word back until its box has grown; the others arrive in the word's motion
    let pose = tr === 'box-first' ? enter('box-first', t, dur, px, look) : tr === 'typewriter' ? (t >= 0 ? REST : { ...REST, opacity: 0 }) : enter(kind, t, dur, px, look);
    pose = both(pose, leave(look.out, outU, px, look.far));
    if (look.flicker && t >= 0 && t < dur + 4) pose.opacity *= random(`flicker-${w.from}-${Math.floor(t)}`) > 0.42 ? 1 : 0.12;
    // a jolt as it lands
    const landed = t - dur;
    const jolt = look.shake > 0 && landed >= 0 && landed < 12 ? (look.shake / 100) * px * 0.05 * (1 - landed / 12) : 0;
    const jx = jolt * (random(`sx-${w.from}-${Math.floor(t)}`) - 0.5) * 2, jy = jolt * (random(`sy-${w.from}-${Math.floor(t)}`) - 0.5) * 2;
    const flash = look.flash && landed >= -1 && landed < 5 ? 1 - (landed + 1) / 6 : 0;

    const sweep = (delay: number, length: number) => CUBIC(clamp((t - delay) / length));
    const color = colour(look.big.color);
    const text = textOf(w);
    const shown = tr === 'typewriter' ? text.slice(0, typed(w, text.length)) : text;
    // the shine: a bright band across the word once it has landed, and again every 2.5 s
    const shineAt = ((t - dur) % Math.round(fps * 2.5)) / (fps * 0.6);
    const band = look.finish === 'shine' && t >= dur ? -20 + clamp(shineAt) * 140 : -40;
    const shining = look.finish === 'shine';
    const glow = look.finish === 'glow' ? `0 0 0.08em ${color}, 0 0 0.35em ${color}aa` : '';
    const flashGlow = flash > 0 ? `0 0 ${(0.6 * flash).toFixed(2)}em rgba(255,255,255,${(0.9 * flash).toFixed(2)})` : '';
    const onBox = tr === 'box-first' || tr === 'highlight';
    const shadows = [shadow(look.blend === 'normal' && !onBox), glow, flashGlow].filter(Boolean).join(', ');
    const boxGrow = tr === 'box-first' ? sweep(0, dur * 0.5) : tr === 'highlight' ? sweep(dur * 0.4, dur * 0.9) : tr === 'underline' ? sweep(dur * 0.5, dur) : 0;
    const sel = tr === 'select' ? sweep(dur * 0.4, dur * 1.1) : 0;
    const capTop = 0.1, capBottom = 0.04;
    return (
      <span style={{ position: 'relative', display: 'inline-block', mixBlendMode: look.blend === 'difference' ? 'difference' : undefined, ...css(pose, jx, jy) }}>
        {tr === 'select' && t >= 0 && (
          <>
            {sel > 0.02 && <span style={{ position: 'absolute', left: -px * 0.03 - 2, top: px * 0.06, bottom: 0, width: 4, background: '#3d82ff' }}><span style={{ position: 'absolute', left: -px * 0.04 + 2, top: -px * 0.08, width: px * 0.08, height: px * 0.08, borderRadius: '50%', background: '#3d82ff' }} /></span>}
            {sel > 0.02 && <span style={{ position: 'absolute', left: `calc(${(sel * 100).toFixed(1)}% + ${(px * 0.03 * sel).toFixed(1)}px)`, top: px * 0.06, bottom: 0, width: 4, background: '#3d82ff' }}><span style={{ position: 'absolute', left: -px * 0.04 + 2, bottom: -px * 0.08, width: px * 0.08, height: px * 0.08, borderRadius: '50%', background: '#3d82ff' }} /></span>}
          </>
        )}
        {tr === 'underline' && t >= 0 && (
          <span style={{ position: 'absolute', left: 0, right: 0, bottom: -px * 0.02, height: Math.max(3, px * 0.07), background: accent, transformOrigin: 'left center', transform: `scaleX(${boxGrow.toFixed(3)})` }} />
        )}
        <span style={{
          ...((tr === 'box-first' || tr === 'highlight') && t >= 0 ? fill(accent, boxGrow, px * 0.07, px * capTop, px * (1 - capTop - capBottom)) : tr === 'select' ? fill('rgba(46,120,255,0.55)', sel, px * 0.03, px * 0.06, px * 0.94) : {}),
          fontFamily: f.family, fontWeight: f.weight, fontStyle: f.italic ? 'italic' : 'normal', fontSize: px, lineHeight: 1,
          letterSpacing: `${look.big.tracking}em`, whiteSpace: 'pre', textShadow: shadows || undefined, color: shining ? shade2(color) : color,
        }}>{shown || '\u200b'}</span>
        {shining && band > -30 && band < 130 && (
          <span style={{
            position: 'absolute', left: 0, top: 0, fontFamily: f.family, fontWeight: f.weight, fontStyle: f.italic ? 'italic' : 'normal', fontSize: px, lineHeight: 1,
            letterSpacing: `${look.big.tracking}em`, whiteSpace: 'pre', color: 'transparent', backgroundClip: 'text', WebkitBackgroundClip: 'text',
            backgroundImage: `linear-gradient(105deg, rgba(255,255,255,0) ${band - 16}%, rgba(255,255,255,0.95) ${band}%, rgba(255,255,255,0) ${band + 16}%)`,
          }}>{shown}</span>
        )}
        {tr === 'typewriter' && cursorOn(w) && <Cursor color={color} px={px} />}
      </span>
    );
  };

  const row = (ws: Word[], start: number, px: number, alignSelf: React.CSSProperties['alignSelf'], extra: React.CSSProperties = {}) =>
    ws.length ? (
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: alignSelf === 'flex-end' ? 'flex-end' : alignSelf === 'center' ? 'center' : 'flex-start', alignSelf, ...extra }}>
        {ws.map((w, k) => <Small key={w.from + k} w={w} i={start + k} px={px} />)}
      </div>
    ) : null;

  let body: React.ReactNode;
  if (!bigWord) {
    // a caption: one line of small words
    body = (
      <div style={{ position: 'absolute', left: blockLeft, width: blockWidth, top: (eyeY ?? look.captionY) * H, height: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: align }}>
        {row(line.words, 0, cap, align)}
      </div>
    );
  } else if (oneLine) {
    body = (
      <div style={{ position: 'absolute', left: blockLeft, width: blockWidth, top: look.y * H, height: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: align, rowGap: cap * 0.1 }}>
          {line.words.map((w, k) => (run.includes(w) ? <span key={k} style={{ margin: `0 ${(cap * 0.13).toFixed(1)}px` }}><Big w={w} /></span> : <Small key={k} w={w} i={k} px={cap} />))}
        </div>
      </div>
    );
  } else {
    // a hook: the small words before the big word over it, those after under it
    const at = line.words.indexOf(bigWord);
    const before = line.words.slice(0, at), after = line.words.slice(at + run.length);
    const centre = look.layout === 'centre';
    const dotOn = look.dot && frame >= startOf(bigWord);
    const dotT = tick(frame - startOf(bigWord));
    // the words under the big word sit tight to it, unless a letter of it hangs below the line (g, j, p, q, y) over the
    // stretch they sit under: then they drop clear of the descender
    const afterAlign = align === 'center' && !centre ? 'flex-end' : align;
    const bigText = run.map((w) => cased(clean(w.text), look.big.case)).join(' ');
    const afterText = after.map((w) => cased(clean(w.text), look.caption.case)).join(' ');
    const share = Math.min(1, (ems(afterText, look.caption) * cap) / Math.max(1, ems(bigText, look.big) * bigPx) + 0.08);
    const n = Math.max(1, Math.ceil(share * bigText.length));
    const over = afterAlign === 'flex-end' ? bigText.slice(-n) : afterAlign === 'flex-start' ? bigText.slice(0, n)
      : bigText.slice(Math.floor((bigText.length - n) / 2), Math.floor((bigText.length - n) / 2) + n);
    const hangs = after.length > 0 && /[gjpqyQ]/.test(over);
    body = (
      <div style={{ position: 'absolute', left: blockLeft, width: blockWidth, top: (eyeY ?? (look.layout === 'centre' ? 0.5 : look.y)) * H, height: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: align }}>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: align }}>
          {scrim > 0 && <div style={{ position: 'absolute', left: '-20%', right: '-20%', top: '-35%', bottom: '-35%', background: `radial-gradient(closest-side, rgba(0,0,0,${scrim.toFixed(3)}), rgba(0,0,0,0))` }} />}
          {row(before, 0, cap, align, { marginBottom: -bigPx * 0.06 })}
          <div style={{ display: 'flex', justifyContent: align, columnGap: bigPx * 0.22 }}>{run.map((w) => <Big key={w.from} w={w} />)}</div>
          {row(after, at + run.length, cap, afterAlign, { marginTop: bigPx * (hangs ? 0.13 : -0.02) })}
          {dotOn && (
            <span style={{ position: 'absolute', right: -bigPx * 0.02, top: -bigPx * 0.12, width: bigPx * 0.16, height: bigPx * 0.16, borderRadius: '50%', background: accent,
              boxShadow: look.finish === 'glow' ? `0 0 ${bigPx * 0.12}px ${accent}` : undefined, ...css(enter('pop', dotT - 3, dur, bigPx * 0.16, { ...look, bounce: true })) }} />
          )}
        </div>
      </div>
    );
  }

  return (
    <AbsoluteFill style={{ width: W, height: H }}>
      {!bigWord && scrim > 0 && (
        <div style={{ position: 'absolute', left: blockLeft - margin * 0.5, width: blockWidth + margin, top: look.captionY * H - cap * 2, height: cap * 4, background: `radial-gradient(closest-side, rgba(0,0,0,${scrim.toFixed(3)}), rgba(0,0,0,0))` }} />
      )}
      {body}
    </AbsoluteFill>
  );
};
