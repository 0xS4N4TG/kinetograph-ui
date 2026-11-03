// Hand-drawn block capitals: each letter is a few centre lines on a 4 x 10 grid (5 wide for M and W, 1 for I), drawn
// with a thick flat brush. Every frame the points are nudged and the brush's pressure wanders, so the letters are
// redrawn by hand each time, lumpy and never twice the same. Used by BoilStack, in the manner of a hand-lettered poster.

export type Stroke = [number, number][];

const O: Stroke = [[2, 0], [0.6, 0.6], [0, 2.5], [0, 7.5], [0.6, 9.4], [2, 10], [3.4, 9.4], [4, 7.5], [4, 2.5], [3.4, 0.6], [2, 0]];
const P: Stroke[] = [[[0, 10], [0, 0], [2.8, 0], [4, 1.4], [4, 4], [2.8, 5.4], [0, 5.4]]];

/** Centre lines per capital, and the letter's width on the grid. */
export const SKELETON: Record<string, { w: number; s: Stroke[] }> = {
  A: { w: 4, s: [[[0, 10], [2, 0], [4, 10]], [[0.8, 6.6], [3.2, 6.6]]] },
  B: { w: 4, s: [[[0, 0], [0, 10]], [[0, 0], [2.8, 0], [3.8, 1.2], [3.8, 3.6], [2.8, 4.8], [0, 4.8]], [[0, 4.8], [3, 4.8], [4, 6.1], [4, 8.7], [3, 10], [0, 10]]] },
  C: { w: 4, s: [[[4, 1.6], [3, 0], [1, 0], [0, 2], [0, 8], [1, 10], [3, 10], [4, 8.4]]] },
  D: { w: 4, s: [[[0, 0], [0, 10]], [[0, 0], [2.5, 0], [4, 2], [4, 8], [2.5, 10], [0, 10]]] },
  E: { w: 3.6, s: [[[3.6, 0], [0, 0], [0, 10], [3.6, 10]], [[0, 5], [3, 5]]] },
  F: { w: 3.6, s: [[[3.6, 0], [0, 0], [0, 10]], [[0, 5], [3, 5]]] },
  G: { w: 4, s: [[[4, 1.6], [3, 0], [1, 0], [0, 2], [0, 8], [1, 10], [3, 10], [4, 8.4], [4, 5.6], [2.3, 5.6]]] },
  H: { w: 4, s: [[[0, 0], [0, 10]], [[4, 0], [4, 10]], [[0, 5], [4, 5]]] },
  I: { w: 0.01, s: [[[0, 0], [0, 10]]] },
  J: { w: 4, s: [[[4, 0], [4, 8], [3, 10], [1, 10], [0, 8.4]]] },
  K: { w: 4, s: [[[0, 0], [0, 10]], [[4, 0], [0.4, 5.6]], [[1.6, 4.4], [4, 10]]] },
  L: { w: 3.6, s: [[[0, 0], [0, 10], [3.6, 10]]] },
  M: { w: 5, s: [[[0, 10], [0, 0], [2.5, 6], [5, 0], [5, 10]]] },
  N: { w: 4, s: [[[0, 10], [0, 0], [4, 10], [4, 0]]] },
  O: { w: 4, s: [O] },
  P: { w: 4, s: P },
  Q: { w: 4, s: [O, [[2.6, 7.6], [4.2, 10.4]]] },
  R: { w: 4, s: [...P, [[2, 5.4], [4, 10]]] },
  S: { w: 4, s: [[[4, 1.6], [3, 0], [1, 0], [0, 1.6], [0, 3.4], [4, 6.6], [4, 8.4], [3, 10], [1, 10], [0, 8.4]]] },
  T: { w: 4, s: [[[0, 0], [4, 0]], [[2, 0], [2, 10]]] },
  U: { w: 4, s: [[[0, 0], [0, 8], [1, 10], [3, 10], [4, 8], [4, 0]]] },
  V: { w: 4, s: [[[0, 0], [2, 10], [4, 0]]] },
  W: { w: 5, s: [[[0, 0], [1.2, 10], [2.5, 3], [3.8, 10], [5, 0]]] },
  X: { w: 4, s: [[[0, 0], [4, 10]], [[4, 0], [0, 10]]] },
  Y: { w: 4, s: [[[0, 0], [2, 5], [4, 0]], [[2, 5], [2, 10]]] },
  Z: { w: 4, s: [[[0, 0], [4, 0], [0, 10], [4, 10]]] },
  '!': { w: 0.01, s: [[[0, 0], [0, 6.8]], [[0, 9.4], [0, 10]]] },
  '?': { w: 4, s: [[[0, 2], [1, 0], [3, 0], [4, 1.8], [4, 3.4], [2, 5.4], [2, 7]], [[2, 9.4], [2, 10]]] },
  ' ': { w: 1.2, s: [] },
};

/** The stem thickness, in grid units. */
export const STEM = 1.55;
/** The gap between letters, in grid units. */
const GAP = 0.35;

export interface PlacedStroke { pts: [number, number][]; letter: number; cx: number }

/**
 * Lays `text` out in a box `w` x `h` px (stretched to fill both ways, as the poster's words are), and returns each
 * stroke in px with the index of its letter and the letter's centre as a share of the width. `rand(key)` gives 0..1;
 * `wobble` is how far points are nudged, in grid units.
 */
export function layOut(text: string, w: number, h: number, rand: (k: string) => number, wobble: number, key: string): { strokes: PlacedStroke[]; stem: number } {
  const chars = text.toUpperCase().split('');
  const adv = chars.map((c) => (SKELETON[c] ?? SKELETON[' ']!).w + STEM + GAP);
  const total = adv.reduce((a, b) => a + b, 0) - GAP;
  const sx = w / total;
  const sy = h / (10 + STEM);
  const out: PlacedStroke[] = [];
  let x = 0;
  chars.forEach((c, i) => {
    const g = SKELETON[c] ?? SKELETON[' ']!;
    const left = x + STEM / 2;
    const cx = (x + adv[i]! / 2) / total;
    g.s.forEach((st, j) => {
      out.push({
        letter: i,
        cx,
        pts: st.map(([px, py], k) => {
          const n = `${key}-${i}-${j}-${k}`;
          return [(left + px + (rand(`x${n}`) - 0.5) * wobble) * sx, (STEM / 2 + py + (rand(`y${n}`) - 0.5) * wobble) * sy];
        }),
      });
    });
    x += adv[i]!;
  });
  return { strokes: out, stem: STEM * sx };
}
