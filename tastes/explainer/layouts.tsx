// The beat layouts: where each reference puts its words and its object, measured off its frames. A taste names the
// layouts of its reference (`meta.layouts`); a reel picks one per beat, gives it the words and the picture, and the
// layout places them, times them inside the beat and draws them in the taste. Positions are fractions of W and H, times
// are frames from the beat's first frame (`from`).
//
//   red     HeroRise, FloorSide, Interlude                 (pin 1119)
//   pulse   BleedSide, CentreStage, Interlude              (pin 933)
//   graph   Ringed, HeadlineOver, EndCard                  (pin 971)
//   agency  Sandwich, StandOn, ListBeat                    (pin 1061)
//
// A layout draws the beat's words and object only: the paper, corner shapes, camera and wipe are the reel's (the
// engine's `Paper`, `Corner`, `Camera`, `Wipe`), so the same layout can sit inside a push, a pan or a cut.

import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { Prop, type PropProps } from './props.js';
import { Band, Barcode, GridPatch, Star } from './stage.js';
import type { ExplainerTaste } from './taste.js';
import { Keyword, Lead, Paragraph, type KeyLine } from './type.js';

/** One line of keyword words; `plain` as in KeyLine (true, or the indexes of plain words). */
export interface Line { words: string[]; plain?: boolean | number[] }
/** A cut-out: its file and width / height. */
export interface Pic { src: string; aspect: number }

interface Base {
  taste: ExplainerTaste;
  /** the beat's first frame */
  from: number;
  dark?: boolean;
}

/** When the lead `text` is written if it starts at `at` (the taste's rate; spaces take no time). */
const written = (taste: ExplainerTaste, text: string, at: number) =>
  taste.text.leadMode === 'words' ? at + 6 : at + Math.ceil(text.replace(/ /g, '').length / taste.text.leadRate);

/** Keyword lines placed at `xs`/`ys`, their words starting at `t0`, `gap` frames apart. */
const place = (lines: Line[], xs: number[], ys: number[], t0: number, gap: number, align?: KeyLine['align']): KeyLine[] => {
  let t = t0;
  return lines.map((ln, i) => ({ words: ln.words, plain: ln.plain, align, x: xs[Math.min(i, xs.length - 1)]!, y: ys[i]!, at: ln.words.map(() => (t += gap) - gap) }));
};

const pitch = (size: number, W: number, H: number, k = 0.95) => (size * W * k) / H;
const boxOf = (pic: Pic, w: number, cx: number, top: number, W: number, H: number): Pick<PropProps, 'size' | 'aspect' | 'x' | 'y'> =>
  ({ size: w, aspect: pic.aspect, x: cx, y: top + (w * W) / pic.aspect / H / 2 });

/* ---------------------------------------------------------------- red, pin 1119 */

/** The small lead top left, two or three big keyword lines flush left with ragged starts, a bust rising from the
 *  bottom right in front of them, hiding only the tail of the last line. */
export const HeroRise: React.FC<Base & { lead: string; lines: Line[]; pic: Pic; size?: number; dx?: [number, number, number] }> = ({ taste, from, lead, lines, pic, size = 0.2, dx = [0, 0, 0] }) => {
  const { width: W, height: H } = useVideoConfig();
  const p = pitch(size, W, H), y0 = 0.31;
  return (
    <>
      <Lead taste={taste} text={lead} x={0.13} y={0.215} at={from + 1} dx={dx[0]} />
      <Keyword taste={taste} size={size} dx={dx[1]} lines={place(lines, [0.12, 0.13, 0.13], lines.map((_, i) => y0 + i * p), Math.max(from + 36, written(taste, lead, from + 1) + 4), 3)} />
      <Prop taste={taste} src={pic.src} from={from} at={2} enter="rise" {...boxOf(pic, 0.98, 0.72, 0.43, W, H)} dx={dx[2]} />
    </>
  );
};

/** Barcode under the frame's middle, the lead mid-left, keyword lines staggered in x, an object sliding in from the
 *  right to stand on its floor shadow at the right of the keyword. */
export const FloorSide: React.FC<Base & { lead: string; lines: Line[]; pic: Pic; size?: number; barcode?: string }> = ({ taste, from, lead, lines, pic, size = 0.13, barcode }) => {
  const { width: W, height: H } = useVideoConfig();
  const p = pitch(size, W, H, 0.95) * 0.98;
  return (
    <>
      {barcode && <div style={{ position: 'absolute', left: 0.33 * W, top: 0.871 * H }}><Barcode seed={barcode} width={0.345 * W} height={0.047 * H} /></div>}
      <Lead taste={taste} text={lead} x={0.113} y={0.3} at={from + 1} />
      <Keyword taste={taste} size={size} lines={place(lines, [0.22, 0.14, 0.22], lines.map((_, i) => 0.375 + i * p), Math.max(from + 50, written(taste, lead, from + 1) + 6), 4)} />
      <Prop taste={taste} src={pic.src} from={from} at={2} enter="right" keep={0.82} {...boxOf(pic, 0.2, 0.68, 0.43, W, H)} />
    </>
  );
};

/** A dark beat: a short lead and one keyword line in the middle of the frame, both blooming; plain words on the line
 *  for a taste that mixes weights (933). */
export const Interlude: React.FC<Base & { lead?: string; line: Line; size?: number }> = ({ taste, from, lead, line, size = 0.06, dark = true }) => {
  const t0 = lead ? written(taste, lead, from + 2) + 6 : from + 2;
  return (
    <>
      {lead && <Lead taste={taste} text={lead} x={0.5} y={0.465} align="center" at={from + 2} dark={dark} />}
      <Keyword taste={taste} size={size} dark={dark} lines={place([line], [0.5], [lead ? 0.5 : 0.49], t0, 3, 'center')} />
    </>
  );
};

/* ---------------------------------------------------------------- pulse, pin 933 */

/** A big object bleeding off the left edge (the camera pushes into it), a barcode at the top right, and the words
 *  stacked right-aligned beside it: a lead, then lines mixing plain and accent words. */
export const BleedSide: React.FC<Base & { lead: string; lines: Line[]; pic: Pic; barcode?: string; size?: number }> = ({ taste, from, lead, lines, pic, barcode, size = 0.085 }) => {
  const { width: W, height: H } = useVideoConfig();
  const p = pitch(size, W, H, 0.92);
  return (
    <>
      {barcode && <div style={{ position: 'absolute', left: 0.57 * W, top: 0.3 * H }}><Barcode seed={barcode} width={0.13 * W} height={0.032 * H} /></div>}
      <Prop taste={taste} src={pic.src} from={from} enter="none" shadow="cast" {...boxOf(pic, 0.5, 0.2, 0.31, W, H)} />
      {/* the camera pushes in about the centre, so the words sit just right of it (933: x 0.25-0.85 W at scale 1) */}
      <Lead taste={taste} text={lead} x={0.8} y={0.395} align="right" at={from + 3} size={0.045} />
      <Keyword taste={taste} size={size} lines={place(lines, [0.8], lines.map((_, i) => 0.44 + i * p), from + 14, 5, 'right')} />
    </>
  );
};

/** The words centred above the frame's middle and the object centred under them, springing in; the grey S-band drawn
 *  behind on the beat's third frame. */
export const CentreStage: React.FC<Base & { lead?: string; line: Line; pic: Pic; band?: boolean; size?: number }> = ({ taste, from, lead, line, pic, band = true, size = 0.085 }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  return (
    <>
      {band && <Band f={f} t0={from + 2} />}
      {lead && <Lead taste={taste} text={lead} x={0.5} y={0.385} align="center" at={from + 2} size={0.05} />}
      <Keyword taste={taste} size={size} lines={place([line], [0.5], [0.44], from + (lead ? 10 : 3), 5, 'center')} />
      <Prop taste={taste} src={pic.src} from={from} enter="spring" shadow="none" {...boxOf(pic, 0.36, 0.5, 0.5, W, H)} />
    </>
  );
};

/* ---------------------------------------------------------------- graph, pin 971 */

/** An object tilted in the middle inside a dashed ring, a lead and bold line top right, another pair bottom left. */
export const Ringed: React.FC<Base & { top: [string, string]; bottom: [string, string]; pic: Pic; tilt?: number }> = ({ taste, from, top, bottom, pic, tilt = -18 }) => {
  const { width: W, height: H } = useVideoConfig();
  return (
    <>
      <Lead taste={taste} text={top[0]} x={0.6} y={0.2} align="right" at={from + 4} />
      <Keyword taste={taste} size={0.06} lines={[{ words: top[1].split(' '), x: 0.62, y: 0.25, align: 'right', at: top[1].split(' ').map((_, i) => from + 16 + i * 3) }]} />
      <div style={{ position: 'absolute', inset: 0, transform: `rotate(${tilt}deg)`, transformOrigin: '50% 47%' }}>
        <Prop taste={taste} src={pic.src} from={from} at={3} enter="right" keep={0.865} ring ringColor="#000" shadow="cast" {...boxOf(pic, 0.24, 0.5, 0.47 - (0.24 * W) / pic.aspect / H / 2, W, H)} />
      </div>
      <Lead taste={taste} text={bottom[0]} x={0.22} y={0.67} at={from + 30} />
      <Keyword taste={taste} size={0.06} lines={[{ words: bottom[1].split(' '), x: 0.22, y: 0.715, at: bottom[1].split(' ').map((_, i) => from + 40 + i * 3) }]} />
    </>
  );
};

/** A small caps kicker over one huge word at the top, the object on a patch of dotted graph paper under it, a bold
 *  italic line and a typed paragraph below. */
export const HeadlineOver: React.FC<Base & { kicker: string; word: string; line: string; paragraph: string[]; pic: Pic }> = ({ taste, from, kicker, word, line, paragraph, pic }) => {
  const { width: W, height: H } = useVideoConfig();
  return (
    <>
      <GridPatch x={0.12} y={0.31} w={0.76} h={0.36} />
      <Lead taste={taste} text={kicker} x={0.72} y={0.165} align="right" at={from + 2} size={0.035} />
      <Keyword taste={{ ...taste, italic: false }} size={0.2} lines={[{ words: [word], x: 0.5, y: 0.235, align: 'center', at: [from + 6] }]} />
      <Prop taste={taste} src={pic.src} from={from} enter="none" shadow="cast" {...boxOf(pic, 0.5, 0.5, 0.34, W, H)} />
      <Keyword taste={taste} size={0.055} lines={[{ words: line.split(' '), x: 0.5, y: 0.7, align: 'center', at: line.split(' ').map((_, i) => from + 24 + i * 3) }]} />
      <Paragraph taste={taste} lines={paragraph} x={0.5} y={0.745} at={from + 36} />
    </>
  );
};

/** The closing card: a lead and one bold line in the middle. */
export const EndCard: React.FC<Base & { lead: string; word: string; size?: number }> = ({ taste, from, lead, word, size = 0.07 }) => (
  <>
    <Lead taste={taste} text={lead} x={0.5} y={0.47} align="center" at={from + 2} />
    <Keyword taste={taste} size={size} lines={[{ words: word.split(' '), x: 0.5, y: 0.515, align: 'center', at: word.split(' ').map((_, i) => from + 8 + i * 3) }]} />
  </>
);

/* ---------------------------------------------------------------- agency, pin 1061 */

/** A centred lead and headline above the object, the object across the middle, a second lead and a big muted line
 *  under it. */
export const Sandwich: React.FC<Base & { top: [string, string]; bottom: [string, string]; pic: Pic; width?: number }> = ({ taste, from, top, bottom, pic, width = 0.7 }) => {
  const { width: W, height: H } = useVideoConfig();
  // the object sits under the top pair and the bottom pair under the object, however tall it is (at most to 0.6 H)
  const h = Math.min(0.3, (width * W) / pic.aspect / H), w = (h * H * pic.aspect) / W, yb = 0.3 + h;
  return (
    <>
      <Prop taste={taste} src={pic.src} from={from} enter="none" shadow="ground" {...boxOf(pic, w, 0.5, 0.3, W, H)} />
      <Lead taste={taste} text={top[0]} x={0.5} y={0.205} align="center" at={from + 4} />
      <Keyword taste={taste} size={0.075} lines={[{ words: top[1].split(' '), x: 0.5, y: 0.245, align: 'center', at: top[1].split(' ').map(() => from + 5) }]} />
      <Lead taste={taste} text={bottom[0]} x={0.5} y={yb + 0.035} align="center" at={from + 19} />
      <Keyword taste={taste} size={0.12} lines={[{ words: bottom[1].split(' '), x: 0.5, y: yb + 0.085, align: 'center', plain: true, at: bottom[1].split(' ').map(() => from + 27) }]} />
    </>
  );
};

/** A centred lead and headline, and a huge muted word low in the frame with the object standing on it, its feet
 *  covering the word's top. */
export const StandOn: React.FC<Base & { lead: string; line: string; word: string; pic: Pic; width?: number }> = ({ taste, from, lead, line, word, pic, width = 0.42 }) => {
  const { width: W, height: H } = useVideoConfig();
  const h = (width * W) / pic.aspect / H;
  return (
    <>
      <Lead taste={taste} text={lead} x={0.5} y={0.2} align="center" at={from + 4} />
      <Keyword taste={taste} size={0.075} lines={[{ words: line.split(' '), x: 0.5, y: 0.24, align: 'center', at: line.split(' ').map(() => from + 7) }]} />
      <Keyword taste={taste} size={0.2} lines={[{ words: [word], x: 0.5, y: 0.66, align: 'center', plain: true, at: [from + 18] }]} />
      <Prop taste={taste} src={pic.src} from={from} enter="none" shadow="ground" {...boxOf(pic, width, 0.5, 0.645 - h, W, H)} />
    </>
  );
};

/** A list top left, each item after a small star, coming in one after another; the object centred below. */
export const ListBeat: React.FC<Base & { items: string[]; pic: Pic; gap?: number }> = ({ taste, from, items, pic, gap = 40 }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  return (
    <>
      {items.map((it, i) => {
        const at = from + 2 + i * gap;
        return (
          <React.Fragment key={i}>
            <Star taste={taste} kind="needle" cx={0.25} cy={0.3 + i * 0.045} length={f >= at ? 0.014 : 0} color={taste.ink} shadow={false} />
            <Keyword taste={taste} size={0.045} lines={[{ words: it.split(' '), x: 0.29, y: 0.3 + i * 0.045, at: it.split(' ').map(() => at) }]} />
          </React.Fragment>
        );
      })}
      <Prop taste={taste} src={pic.src} from={from} enter="none" shadow="ground" {...boxOf(pic, 0.62, 0.5, 0.44, W, H)} />
    </>
  );
};
