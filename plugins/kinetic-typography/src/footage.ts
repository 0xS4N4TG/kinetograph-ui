// Reading the footage under the captions: an accent colour taken from it, how bright it is where a line sits (so the
// line can strengthen its shadow), and which side of the frame is open (for the `beside` layout).
//
// The picture is read as the paper plugin's tracer reads a matte: the file at an instant is drawn small on an
// OffscreenCanvas and `getImageData` reads it back (the renderer decodes it itself; no ffmpeg). Same file and time in,
// same numbers out, so a frame stays a pure function of its props.

import { CANVAS_SOURCE } from '@kinetographdev/core';
import { probeMedia } from '@kinetographdev/core/media-utils';

/** The video under the captions, timed as its `<Video>` is: `rate` its playbackRate, `loop` its length in frames when
 *  it loops, `start` seconds into the clip at frame 0. A still image works too. */
export interface Footage { src: string; rate?: number; loop?: number; start?: number }

const VIDEO = /\.(mp4|mov|m4v|webm|mkv|avi)$/i;
// the read grid: small enough to be cheap every line, big enough to find a lamp in the corner
const GW = 64, GH = 64;

type Surface = { getContext(type: '2d', options?: unknown): any };
let surface: Surface | null = null;
const reads = new Map<string, Uint8ClampedArray>();

/** The picture at `time` seconds (null for an image) as GW x GH RGBA, stretched to the grid (the frame's shape is
 *  given back by the caller's fractions). */
function pixels(src: string, time: number | null): Uint8ClampedArray {
  const key = `${src}@${time === null ? 'still' : time.toFixed(3)}`;
  const hit = reads.get(key);
  if (hit) return hit;
  const Offscreen = (globalThis as { OffscreenCanvas?: new (w: number, h: number) => Surface }).OffscreenCanvas;
  if (!Offscreen) throw new Error('Captions read the footage with OffscreenCanvas: render with Kinetograph');
  const { width, height } = probeMedia(src, { cache: true });
  const source = time === null ? { kind: 'src' as const, src } : { kind: 'video' as const, src, time };
  surface ??= new Offscreen(GW, GH);
  const ctx = surface.getContext('2d', { willReadFrequently: true });
  ctx.clearRect(0, 0, GW, GH);
  ctx.drawImage({ [CANVAS_SOURCE]: () => ({ source, width, height }) }, 0, 0, GW, GH);
  const px: Uint8ClampedArray = ctx.getImageData(0, 0, GW, GH).data.slice();
  if (reads.size > 256) reads.clear();
  reads.set(key, px);
  return px;
}

/** Seconds into the file at composition frame `frame`. */
export function timeAt(f: Footage, frame: number, fps: number): number | null {
  if (!VIDEO.test(f.src)) return null;
  const at = f.loop ? ((frame % f.loop) + f.loop) % f.loop : Math.max(0, frame);
  const t = (f.start ?? 0) + (at / fps) * (f.rate ?? 1);
  const d = probeMedia(f.src, { cache: true }).durationInSeconds;
  return d ? Math.min(t, Math.max(0, d - 0.05)) : t;
}

const lum = (r: number, g: number, b: number) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

/** Mean brightness 0..1 of the picture in a box given as fractions of the frame [x0, y0, x1, y1]. */
export function brightness(f: Footage, frame: number, fps: number, box: [number, number, number, number]): number {
  const px = pixels(f.src, timeAt(f, frame, fps));
  const [x0, y0, x1, y1] = box.map((v, i) => Math.round(Math.min(1, Math.max(0, v)) * (i % 2 ? GH : GW)));
  let sum = 0, n = 0;
  for (let y = y0; y < Math.max(y1, y0 + 1); y++) for (let x = x0; x < Math.max(x1, x0 + 1); x++) {
    const j = (Math.min(GH - 1, y) * GW + Math.min(GW - 1, x)) * 4;
    sum += lum(px[j], px[j + 1], px[j + 2]);
    n++;
  }
  return n ? sum / n : 0;
}

/** The side of the frame with less going on (less contrast between neighbouring cells), between `y0` and `y1`. */
export function openSide(f: Footage, frame: number, fps: number, y0 = 0.15, y1 = 0.85): 'left' | 'right' {
  const px = pixels(f.src, timeAt(f, frame, fps));
  const busy = (from: number, to: number) => {
    let s = 0;
    for (let y = Math.round(y0 * GH); y < Math.round(y1 * GH); y++) for (let x = from; x < to - 1; x++) {
      const j = (y * GW + x) * 4, k = j + 4, d = j + GW * 4;
      const l = lum(px[j], px[j + 1], px[j + 2]);
      s += Math.abs(l - lum(px[k], px[k + 1], px[k + 2])) + (y + 1 < GH ? Math.abs(l - lum(px[d], px[d + 1], px[d + 2])) : 0);
    }
    return s;
  };
  return busy(0, GW / 2) <= busy(GW / 2, GW) ? 'left' : 'right';
}

const hex = (r: number, g: number, b: number) => `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`;

function hsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function rgbOf(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

const accents = new Map<string, string>();

/**
 * An accent colour taken from the footage: the strongest hue across a few moments of it (each cell weighted by how
 * saturated and lit it is, so a lamp or a shirt wins over a grey wall), lifted to a colour that reads behind or as
 * white-on text. `fallback` when the footage has no colour (black and white film).
 */
export function accentFrom(f: Footage, fps = 30, fallback = '#e2552b'): string {
  const key = `${f.src}|${f.start ?? 0}|${f.rate ?? 1}|${f.loop ?? 0}`;
  const hit = accents.get(key);
  if (hit) return hit;
  const d = VIDEO.test(f.src) ? probeMedia(f.src, { cache: true }).durationInSeconds ?? 1 : 0;
  const times = d ? [0.1, 0.3, 0.5, 0.7, 0.9].map((k) => k * d) : [null];
  const bins = Array.from({ length: 24 }, () => ({ w: 0, r: 0, g: 0, b: 0 }));
  for (const t of times) {
    const px = pixels(f.src, t === null ? null : Math.min(t, Math.max(0, d - 0.05)));
    for (let i = 0; i < px.length; i += 4) {
      const [h, s, l] = hsl(px[i], px[i + 1], px[i + 2]);
      // saturated and neither near black nor near white; squared so a few vivid cells beat many dull ones
      const w = s * s * Math.max(0, 1 - Math.abs(l - 0.5) * 2.2);
      if (w < 0.04) continue;
      const bin = bins[Math.floor(h / 15) % 24];
      bin.w += w; bin.r += px[i] * w; bin.g += px[i + 1] * w; bin.b += px[i + 2] * w;
    }
  }
  // the best hue with its neighbours, so a hue split across two bins still wins
  let best = -1, at = 0;
  bins.forEach((_, k) => { const w = bins[k].w + 0.5 * (bins[(k + 23) % 24].w + bins[(k + 1) % 24].w); if (w > best) { best = w; at = k; } });
  const total = bins.reduce((a, b) => a + b.w, 0);
  let out = fallback;
  if (best > 0 && total > 2) {
    const b = bins[at];
    const [h, s] = hsl(b.r / b.w, b.g / b.w, b.b / b.w);
    out = hex(...rgbOf(h, Math.max(0.68, Math.min(0.9, s * 1.3)), 0.54));
  }
  accents.set(key, out);
  return out;
}

/**
 * The subject's head from a matte (white subject on black, timed like the footage): the middle of the matte's top
 * band across, and eye level a little under its top. For `<Captions subject>`, so `beside` stays clear of a subject
 * who moves. Null where the matte is empty.
 */
export function subjectFrom(matte: Footage, fps: number, width: number, height: number): (frame: number) => { x: number; y: number } | null {
  return (frame) => {
    const px = pixels(matte.src, timeAt(matte, frame, fps));
    const on = (x: number, y: number) => { const j = (y * GW + x) * 4; return lum(px[j], px[j + 1], px[j + 2]) > 0.5; };
    let top = -1;
    for (let y = 0; y < GH && top < 0; y++) { let n = 0; for (let x = 0; x < GW; x++) if (on(x, y)) n++; if (n >= 2) top = y; }
    if (top < 0) return null;
    const rows = Math.round(GH * 0.16);
    let sx = 0, n = 0, lo = GW, hi = 0;
    for (let y = top; y < Math.min(GH, top + rows); y++) for (let x = 0; x < GW; x++) if (on(x, y)) { sx += x + 0.5; n++; lo = Math.min(lo, x); hi = Math.max(hi, x + 1); }
    if (!n) return null;
    // eyes sit about 0.55 of the head's width under its top (hair included, so a head cut by the frame still lands)
    const headW = ((hi - lo) / GW) * width;
    return { x: (sx / n / GW) * width, y: Math.min(height * 0.75, (top / GH) * height + headW * 0.55) };
  };
}
