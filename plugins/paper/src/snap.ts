// Snapping a rough keyword box to the word's ink. An agent (or a person) looks at a screenshot and says roughly
// where the keyword is; this reads the pixels around that box and returns the exact box of the words it covers, so
// the keyword lines up across cuts to the pixel. Pure pixel maths on the engine's own image decode (the picture is
// drawn on an OffscreenCanvas and read back, as scrapline reads its cut-out), so it runs wherever Kinetograph does.
//
//   1. Read the hint grown by half its height all round; the background is the median brightness there.
//   2. Ink is anything far enough from the background (dark type on light, light on dark, type on a highlight).
//   3. Rows with ink make text lines; take the line whose middle is nearest the hint's.
//   4. In that line, columns with ink make glyphs; the widest jump between their sorted gaps splits letter gaps
//      from word gaps, and glyphs closer than that make words. Keep the words the hint covers at least half of.

import { probeMedia } from '@kinetographdev/core/media-utils';
import { CANVAS_SOURCE } from '@kinetographdev/scene';

export type Box = [number, number, number, number];

type Surface = { getContext(type: '2d', options?: unknown): any };
const snapped = new Map<string, Box>();

/** Brightness of the image region [x, y, w, h] (image pixels), row by row. */
function read(src: string, [x, y, w, h]: Box): Uint8Array {
  const Offscreen = (globalThis as { OffscreenCanvas?: new (w: number, h: number) => Surface }).OffscreenCanvas;
  if (!Offscreen) throw new Error('paper reads screenshots with OffscreenCanvas: render with Kinetograph');
  const { width, height } = probeMedia(src, { cache: true });
  const picture = { [CANVAS_SOURCE]: () => ({ source: { kind: 'src' as const, src }, width, height }) };
  const ctx = new Offscreen(w, h).getContext('2d', { willReadFrequently: true });
  ctx.drawImage(picture, -x, -y, width, height);
  const px: Uint8ClampedArray = ctx.getImageData(0, 0, w, h).data;
  const out = new Uint8Array(w * h);
  for (let i = 0; i < out.length; i++) out[i] = Math.round(0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]);
  return out;
}

/** Runs of indices where `on` holds, joined across gaps of up to `gap`. */
function runs(n: number, on: (i: number) => boolean, gap: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    if (!on(i)) continue;
    const last = out[out.length - 1];
    if (last && i - last[1] <= gap + 1) last[1] = i;
    else out.push([i, i]);
  }
  return out;
}

/** The keyword's exact box near `hint` in the image at `src` (a resolved URL or path), image pixels. The hint is
 *  returned as it is when no ink is found. */
export function snapBox(src: string, hint: Box, imageSize: [number, number]): Box {
  const key = `${src}:${hint.join(',')}`;
  const hit = snapped.get(key);
  if (hit) return hit;
  const [hx, hy, hw, hh] = hint;
  const pad = Math.round(hh * 0.5);
  const x0 = Math.max(0, Math.floor(hx - pad));
  const y0 = Math.max(0, Math.floor(hy - pad));
  const x1 = Math.min(imageSize[0], Math.ceil(hx + hw + pad));
  const y1 = Math.min(imageSize[1], Math.ceil(hy + hh + pad));
  const [w, h] = [x1 - x0, y1 - y0];
  let box: Box = hint;
  if (w > 4 && h > 4) {
    const lum = read(src, [x0, y0, w, h]);
    const bg = [...lum].sort((a, b) => a - b)[lum.length >> 1];
    const ink = (i: number) => Math.abs(lum[i] - bg) > 70;
    const rowInk = (y: number) => {
      let c = 0;
      for (let x = 0; x < w; x++) if (ink(y * w + x)) c++;
      return c;
    };
    const lines = runs(h, (y) => rowInk(y) > 1, 1).filter(([a, b]) => b - a >= 3);
    const mid = hy + hh / 2 - y0;
    const line = lines.sort((a, b) => Math.abs((a[0] + a[1]) / 2 - mid) - Math.abs((b[0] + b[1]) / 2 - mid))[0];
    if (line) {
      const lh = line[1] - line[0] + 1;
      const colInk = (x: number) => {
        for (let y = line[0]; y <= line[1]; y++) if (ink(y * w + x)) return true;
        return false;
      };
      // glyphs first, then the gap that splits letter gaps from word gaps: the widest jump between the sorted gaps
      const glyphs = runs(w, colInk, 0);
      const gaps = glyphs.slice(1).map(([a], i) => a - glyphs[i][1] - 1);
      const sorted = [...gaps].sort((a, b) => a - b);
      let split = Math.round(lh / 3);
      let jump = 0;
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] - sorted[i - 1] > jump && sorted[i] >= 3) {
          jump = sorted[i] - sorted[i - 1];
          split = (sorted[i] + sorted[i - 1]) / 2;
        }
      }
      const words = runs(w, colInk, Math.floor(split));
      const keep = words.filter(([a, b]) => {
        const cover = Math.min(b, hx + hw - x0) - Math.max(a, hx - x0);
        return cover >= (b - a + 1) / 2;
      });
      if (keep.length) box = [x0 + keep[0][0], y0 + line[0], keep[keep.length - 1][1] - keep[0][0] + 1, lh];
    }
  }
  snapped.set(key, box);
  return box;
}
