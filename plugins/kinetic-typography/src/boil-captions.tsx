// The `poster-boil` caption style: BoilStack's look driven by a voiceover. A line's words stack one to a row, each drawn
// by hand (p5.brush) and redrawn on twelves so it boils. A word lands as it is said, small, and steps up to size over two
// beats of twelve (the poster's growth steps); the line's colours rotate a place with every word that lands, and white
// marks (rays, a squiggle, a swirl) flicker round the new word for three beats. When the line has been said and holds,
// each row is painted over, top to bottom, into a solid band that knocks its letters out (alternating left and right, a
// white arrow on each stroke); as the line leaves, the bands crop in to the centre one beat after another.
//
// Each row is laid out in BoilStack's 1080 x 449 band and scaled to its place, so the brush, the band and the halftone
// are the poster's. Over footage, no ground is drawn.

import React from 'react';
import { BAND_H, BAND_W, Arrow, Band, Marks, Word, knockOf } from './boil.js';

export interface BoilLineProps {
  /** the line's words, each with the frame it is said on */
  words: { text: string; from: number }[];
  /** the frames the line starts and ends */
  from: number;
  to: number;
  frame: number;
  fps: number;
  /** the block's box in canvas pixels */
  left: number;
  top: number;
  width: number;
  /** the most a row may be tall, px */
  rowMax: number;
  colors: [string, string, string];
  marks: boolean;
}

type Table = ReadonlyArray<readonly [number, number]>;
const tbl = (f: number, t: Table): number => {
  if (f <= t[0]![0]) return t[0]![1];
  for (let i = 1; i < t.length; i++) {
    const [f1, v1] = t[i]!;
    if (f <= f1) {
      const [f0, v0] = t[i - 1]!;
      return v0 + ((v1 - v0) * (f - f0)) / (f1 - f0);
    }
  }
  return t[t.length - 1]![1];
};

/** A landing word's size per beat of twelve after it is said (the poster's growth: a speck, then two steps). */
const LAND: Table = [[0, 0.32], [1, 0.62], [2, 0.86], [3, 0.97], [4, 1]];
/** A row's crop-out per beat of twelve (the poster's, from its f50). */
const OUT: Table = [[0, 1], [1, 0.995], [2, 0.978], [3, 0.941], [4, 0.878], [5, 0.767], [6, 0.541], [7, 0.1], [8, 0]];
/** A band's wipe per beat of twelve once it starts. */
const WIPE: Table = [[0, 0], [1, 0.45], [2, 0.85], [3, 1]];

export const BoilLine: React.FC<BoilLineProps> = (p) => {
  const beat = (f: number) => Math.floor(((f - p.from) * 12) / p.fps);
  const r = beat(p.frame);
  const said = p.words.filter((w) => w.from <= p.frame);
  if (!said.length) return null;
  const n = p.words.length;
  // rows: one a word; long words fill the block's width, short ones keep their letters' proportions
  const rowH = Math.min(p.rowMax, (p.width / 2.4) * (3 / Math.max(3, n)));
  const lastBeat = beat(p.words[n - 1]!.from);
  const endBeat = beat(p.to);
  // the bands go on once the line has been said and has settled (6 beats), a row every 2 beats, if there is time
  const paintFrom = lastBeat + 6;
  const canPaint = endBeat - paintFrom >= 2 * n + 4;
  const outFrom = endBeat - 9;
  const box = { x0: 0, y0: 0, x1: p.width, y1: rowH * n };
  // the newest word, for the marks round it
  const newest = said.length - 1;
  const sinceNew = r - beat(said[newest]!.from);
  return (
    <div style={{ position: 'absolute', left: p.left, top: p.top - (rowH * n) / 2, width: p.width, height: rowH * n }}>
      {p.words.map((w, i) => {
        if (w.from > p.frame) return null;
        const age = r - beat(w.from);
        const grow = tbl(age, LAND);
        const out = r >= outFrom ? tbl(r - outFrom - i, OUT) : 1;
        if (out <= 0) return null;
        // the colours rotate a place with every word that lands
        const color = p.colors[(i + said.length) % 3]!;
        const text = w.text.toUpperCase().replace(/[^A-Z!? ]/g, '');
        const wordW = Math.min(BAND_W - 20, Math.max(0.5, text.length / 5) * (BAND_W - 20));
        const wipeAt = paintFrom + 2 * i;
        const wipe = canPaint && r >= wipeAt ? tbl(r - wipeAt, WIPE) : 0;
        const fromRight = i % 2 === 1;
        const dark = (x: number) => (wipe >= 1 ? true : fromRight ? x > 1 - wipe : x < wipe);
        const sx = p.width / BAND_W;
        const sy = rowH / BAND_H;
        return (
          <div key={i} style={{ position: 'absolute', left: 0, top: i * rowH, width: p.width, height: rowH, overflow: out < 1 ? 'hidden' : 'visible',
            transform: `scale(${grow * out})`, transformOrigin: `${p.width / 2}px ${rowH * (n / 2 - i)}px` }}>
            <div style={{ position: 'absolute', left: 0, top: 0, width: BAND_W, height: BAND_H, transform: `scale(${sx}, ${sy})`, transformOrigin: '0 0' }}>
              <Band t={wipe} fromRight={fromRight} color={color} line={i} r={r} dots={color === p.colors[1] ? 0.32 : 0.06} />
              <div style={{ position: 'absolute', left: (BAND_W - wordW) / 2, top: 6 }}>
                <Word text={text} r={r} line={i % 3} color={color} knock={knockOf(color)} dark={wipe > 0 ? dark : () => false} w={wordW} h={BAND_H - 12} />
              </div>
            </div>
          </div>
        );
      })}
      <svg width={p.width} height={rowH * n} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        {p.marks && sinceNew < 3 && <Marks r={24 + Math.max(0, sinceNew)} box={{ ...box, y0: newest * rowH - rowH * 0.2, y1: (newest + 1) * rowH }} />}
        {canPaint && p.words.map((_, i) => {
          const at = r - (paintFrom + 2 * i);
          if (at < 0 || at > 1) return null;
          const y = (i + 0.5) * rowH;
          return i % 2 ? <Arrow key={i} x={p.width * 0.9} y={y} dx={-p.width * 0.1} dy={0} /> : <Arrow key={i} x={p.width * 0.48} y={y} dx={p.width * 0.1} dy={0} />;
        })}
      </svg>
    </div>
  );
};
