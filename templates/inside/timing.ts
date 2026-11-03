// The film's clock: every shot and caption is timed from the narrator's one take (public/vo/take.wav), through its
// word timestamps (public/vo/asr.json, Whisper, about 0.1 s). Change the take and every cut moves with it.
import take from './public/vo/asr-spaced.json' with { type: 'json' };

export const FPS = 30;
const f = (s: number) => Math.round(s * FPS);

/** Lead-in before the first word: the leader runs here. */
export const PRE = 34;

export interface Word { word: string; from: number; to: number; line: number; i: number }
export interface Line { n: number; text: string; from: number; to: number }

type Take = { words: { word: string; start: number; end: number }[]; lines: { n: number; text: string; start: number; end: number }[]; duration: number };
const T = take as Take;

export const LINES: Line[] = T.lines.map((l) => ({ n: l.n, text: l.text, from: PRE + f(l.start), to: PRE + f(l.end) }));

/** A word belongs to the last line that starts at or before it (lines 8 and 9 run together with no gap). */
const lineOf = (s: number) => [...T.lines].reverse().find((l) => s >= l.start - 0.02)?.n ?? 1;

// Whisper splits "0.3" and "kinetograph.dev" into pieces that start with a dot: join them back for the screen.
const merged: { word: string; start: number; end: number }[] = [];
for (const w of T.words) {
  const last = merged[merged.length - 1];
  if (last && /^\./.test(w.word)) last.word = last.word.replace(/[.,]$/, '') + w.word, (last.end = w.end);
  else merged.push({ ...w });
}

export const WORDS: Word[] = merged.map((w, i) => ({ word: w.word, from: PRE + f(w.start), to: PRE + f(w.end), line: lineOf(w.start), i }));

export const line = (n: number) => LINES.find((l) => l.n === n)!;
export const wordsOf = (n: number) => WORDS.filter((w) => w.line === n);
const bare = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, '');
/** The frame the k-th spoken occurrence of `w` in line n starts (k from 0). */
export const at = (n: number, w: string, k = 0) => {
  const hit = wordsOf(n).filter((x) => bare(x.word) === bare(w))[k];
  if (!hit) throw new Error(`no "${w}" in line ${n}`);
  return hit.from;
};
/** The index of a word within its line. */
export const indexIn = (n: number, w: string, k = 0) => {
  const ws = wordsOf(n);
  const hit = ws.filter((x) => bare(x.word) === bare(w))[k];
  if (!hit) throw new Error(`no "${w}" in line ${n}`);
  return ws.indexOf(hit);
};

/** A caption page: a sentence, or a part of a long one, shown from its first word until the next page starts. */
export interface Chunk { words: Word[]; from: number; to: number }
export function chunks(lines: number[]): Chunk[] {
  const out: Chunk[] = [];
  for (const n of lines) {
    let cur: Word[] = [];
    const flush = () => { if (cur.length) out.push({ words: cur, from: cur[0]!.from, to: cur[cur.length - 1]!.to + 14 }); cur = []; };
    for (const w of wordsOf(n)) {
      cur.push(w);
      // break after a full stop, after a comma once a page has 4 words, or at 7 words
      if (/\.$/.test(w.word) || (/,$/.test(w.word) && cur.length >= 4) || cur.length >= 7) flush();
    }
    flush();
  }
  out.forEach((c, i) => { const next = out[i + 1]; if (next && next.from < c.to) c.to = next.from; });
  return out;
}

/** The whole film: the take, then the end card held for a beat. */
export const TOTAL = PRE + f(T.duration) + 45;
