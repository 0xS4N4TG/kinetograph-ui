// Tracing (from templates/scrapline): a cut-out's alpha (or a matte, or an SVG path) -> closed outlines pushed out by a distance.
//
//   mask (coarse grid) -> distance outside the mask (exact EDT) -> marching squares at "distance = offset"
//   -> Douglas-Peucker -> Chaikin smoothing -> even resampling.
//
// Growing the mask by a distance field, instead of moving the traced line along its normals, keeps the outline
// clean where the shape is concave (no loops, small gaps close up).
//
// The mask is read the way `onVideoFrame` hands a project a video's pixels: a picture of the file at an instant is drawn
// on an OffscreenCanvas at the trace resolution, and `getImageData` reads it back (the renderer decodes the frame with
// its own decoder; no ffmpeg). The picture is made here for the boil step's first frame rather than taken from a
// `<Video onVideoFrame>`, so a held outline is traced from the same frame whichever frame of the step is rendered.

import { probeMedia } from '@kinetographdev/core/media-utils';
import { CANVAS_SOURCE } from '@kinetographdev/core';

export interface Mask {
  w: number;
  h: number;
  data: Uint8Array;
}

/** A closed polyline in canvas pixels. */
export type Loop = [number, number][];

/** Where the cut-out comes from. */
export type Trace =
  | {
      /** An image with alpha (`.png`, `.webp`), or a video (`.mp4`, `.mov`, `.webm`) that is a matte. */
      src: string;
      /** `alpha`: the alpha channel (default for images). `luma`: brightness, a black and white matte (default for videos). */
      mode?: 'alpha' | 'luma';
      /** Video only: media seconds per comp second (a Video's `playbackRate`). Default 1. */
      rate?: number;
      /** Video only: the clip is this many comp frames long and loops (a Video's `loop`). Default: does not loop. */
      loop?: number;
      /** Video only: seconds into the clip at comp frame 0. Default 0. */
      start?: number;
    }
  | {
      /** SVG path data (M L H V C S Q T Z, absolute and relative; arcs are left out). Filled even-odd. */
      d: string;
      /** The path's origin and scale on the canvas. Default 0, 0, 1. */
      x?: number;
      y?: number;
      scale?: number;
    };

const VIDEO_EXT = /\.(mp4|mov|m4v|webm|mkv|avi)$/i;

// ---- masks ----

type Surface = { getContext(type: '2d', options?: unknown): any };
const surfaces = new Map<string, Surface>();

/** The file (a picture of a video at `time` seconds, or an image) drawn at w x h, read back as grey: alpha or luma. */
function readPicture(src: string, time: number | null, mode: 'alpha' | 'luma', w: number, h: number): Uint8Array {
  const Offscreen = (globalThis as { OffscreenCanvas?: new (w: number, h: number) => Surface }).OffscreenCanvas;
  if (!Offscreen) throw new Error('The paper plugin reads a cut-out with OffscreenCanvas: render it with Kinetograph');
  const { width, height } = probeMedia(src, { cache: true });
  const source = time === null ? { kind: 'src' as const, src } : { kind: 'video' as const, src, time };
  const picture = { [CANVAS_SOURCE]: () => ({ source, width, height }) };
  let surface = surfaces.get(`${w}x${h}`);
  if (!surface) surfaces.set(`${w}x${h}`, (surface = new Offscreen(w, h)));
  const ctx = surface.getContext('2d', { willReadFrequently: true });
  ctx.clearRect(0, 0, w, h); // an OffscreenCanvas keeps its pixels between reads
  ctx.drawImage(picture, 0, 0, w, h);
  const px: Uint8ClampedArray = ctx.getImageData(0, 0, w, h).data;
  const out = new Uint8Array(w * h);
  for (let i = 0; i < out.length; i++) {
    const j = i * 4;
    // luma: BT.601 weights, as ffmpeg's grey conversion; times alpha, so a transparent pixel counts as outside
    out[i] = mode === 'alpha' ? px[j + 3] : Math.round(((0.299 * px[j] + 0.587 * px[j + 1] + 0.114 * px[j + 2]) * px[j + 3]) / 255);
  }
  return out;
}

function videoMask(t: Extract<Trace, { src: string }>, frame: number, fps: number, w: number, h: number): Mask {
  const f = t.loop ? ((frame % t.loop) + t.loop) % t.loop : Math.max(0, frame);
  const time = (t.start ?? 0) + (f / fps) * (t.rate ?? 1);
  return { w, h, data: readPicture(t.src, time, t.mode ?? 'luma', w, h) };
}

const stills = new Map<string, Mask>();

function imageMask(t: Extract<Trace, { src: string }>, w: number, h: number): Mask {
  const key = `${t.src}|${t.mode ?? 'alpha'}|${w}x${h}`;
  let m = stills.get(key);
  if (!m) {
    m = { w, h, data: readPicture(t.src, null, t.mode ?? 'alpha', w, h) };
    stills.set(key, m);
  }
  return m;
}

/** SVG path data to closed polylines (curves flattened). */
export function flattenPath(d: string): Loop[] {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  const loops: Loop[] = [];
  let cur: Loop = [];
  let i = 0;
  let cmd = '';
  let x = 0, y = 0, sx = 0, sy = 0, cx = 0, cy = 0;
  const num = () => parseFloat(tokens[i++]);
  const flush = () => { if (cur.length > 2) loops.push(cur); cur = []; };
  const cubic = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
    for (let s = 1; s <= 16; s++) {
      const t = s / 16, u = 1 - t;
      cur.push([u*u*u*x + 3*u*u*t*x1 + 3*u*t*t*x2 + t*t*t*x3, u*u*u*y + 3*u*u*t*y1 + 3*u*t*t*y2 + t*t*t*y3]);
    }
    cx = x2; cy = y2; x = x3; y = y3;
  };
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
    const rel = cmd === cmd.toLowerCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    switch (cmd.toUpperCase()) {
      case 'M': flush(); x = num() + ox; y = num() + oy; sx = x; sy = y; cur.push([x, y]); cmd = rel ? 'l' : 'L'; cx = x; cy = y; break;
      case 'L': x = num() + ox; y = num() + oy; cur.push([x, y]); cx = x; cy = y; break;
      case 'H': x = num() + ox; cur.push([x, y]); break;
      case 'V': y = num() + oy; cur.push([x, y]); break;
      case 'C': { const a = num() + ox, b = num() + oy, c = num() + ox, e = num() + oy, f = num() + ox, g = num() + oy; cubic(a, b, c, e, f, g); break; }
      case 'S': { const c = num() + ox, e = num() + oy, f = num() + ox, g = num() + oy; cubic(2 * x - cx, 2 * y - cy, c, e, f, g); break; }
      case 'Q': { const a = num() + ox, b = num() + oy, f = num() + ox, g = num() + oy; cubic(x + (2/3)*(a-x), y + (2/3)*(b-y), f + (2/3)*(a-f), g + (2/3)*(b-g), f, g); break; }
      case 'T': { const f = num() + ox, g = num() + oy; const a = 2 * x - cx, b = 2 * y - cy; cubic(x + (2/3)*(a-x), y + (2/3)*(b-y), f + (2/3)*(a-f), g + (2/3)*(b-g), f, g); break; }
      case 'Z': flush(); x = sx; y = sy; break;
      default: i++; // an arc or something unknown: skip its number
    }
  }
  flush();
  return loops;
}

function pathMask(t: Extract<Trace, { d: string }>, w: number, h: number, sc: number): Mask {
  const loops = flattenPath(t.d).map((l) => l.map(([px, py]): [number, number] => [((px * (t.scale ?? 1)) + (t.x ?? 0)) / sc, ((py * (t.scale ?? 1)) + (t.y ?? 0)) / sc]));
  const data = new Uint8Array(w * h);
  for (let row = 0; row < h; row++) {
    const yc = row + 0.5;
    const xs: number[] = [];
    for (const l of loops) {
      for (let k = 0; k < l.length; k++) {
        const [x0, y0] = l[k], [x1, y1] = l[(k + 1) % l.length];
        if ((y0 <= yc) !== (y1 <= yc)) xs.push(x0 + ((yc - y0) / (y1 - y0)) * (x1 - x0));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let c = Math.max(0, Math.round(xs[k] - 0.5)); c < Math.min(w, Math.round(xs[k + 1] - 0.5)); c++) data[row * w + c] = 255;
    }
  }
  return { w, h, data };
}

/** The cut-out's mask at comp frame `frame`, on a grid `scale` times coarser than the canvas. */
export function readMask(t: Trace, frame: number, fps: number, width: number, height: number, scale: number): Mask {
  const w = Math.ceil(width / scale), h = Math.ceil(height / scale);
  if ('d' in t) return pathMask(t, w, h, scale);
  return VIDEO_EXT.test(t.src) ? videoMask({ ...t, mode: t.mode ?? 'luma' }, frame, fps, w, h) : imageMask(t, w, h);
}

// ---- distance field ----

/** Distance (in cells) from every cell to the nearest mask cell, on a grid padded by `pad` cells. Exact (Felzenszwalb). */
export function distanceOutside(m: Mask, threshold: number, pad: number): { d: Float32Array; w: number; h: number } {
  const w = m.w + 2 * pad, h = m.h + 2 * pad;
  const INF = 1e12;
  const f = new Float64Array(w * h).fill(INF);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.data[y * m.w + x] >= threshold) f[(y + pad) * w + x + pad] = 0;
  const n = Math.max(w, h);
  const v = new Int32Array(n), z = new Float64Array(n + 1), col = new Float64Array(n), out = new Float64Array(n);
  const pass = (len: number) => {
    let k = 0;
    v[0] = 0; z[0] = -INF; z[1] = INF;
    for (let q = 1; q < len; q++) {
      let s: number;
      for (;;) {
        const p = v[k];
        s = (col[q] + q * q - (col[p] + p * p)) / (2 * q - 2 * p);
        if (s <= z[k] && k > 0) k--; else break;
      }
      k++;
      v[k] = q; z[k] = s; z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < len; q++) {
      while (z[k + 1] < q) k++;
      out[q] = (q - v[k]) ** 2 + col[v[k]];
    }
  };
  for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) col[y] = f[y * w + x]; pass(h); for (let y = 0; y < h; y++) f[y * w + x] = out[y]; }
  for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) col[x] = f[y * w + x]; pass(w); for (let x = 0; x < w; x++) f[y * w + x] = out[x]; }
  const d = new Float32Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = Math.sqrt(Math.min(f[i], INF));
  return { d, w, h };
}

// ---- marching squares ----

/** The loops where the field crosses `iso`, in grid cells (cells where d <= iso are inside). */
export function marchingSquares(d: Float32Array, w: number, h: number, iso: number): Loop[] {
  // an edge id: (cell y * w + cell x) * 2 (+1 for the vertical edge at the cell's left)
  const segs: [number, number][] = [];
  const at = (x: number, y: number) => d[y * w + x] - iso;
  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const a = at(x, y) <= 0, b = at(x + 1, y) <= 0, c = at(x + 1, y + 1) <= 0, e = at(x, y + 1) <= 0;
      const idx = (a ? 1 : 0) | (b ? 2 : 0) | (c ? 4 : 0) | (e ? 8 : 0);
      if (idx === 0 || idx === 15) continue;
      const T = (y * w + x) * 2, B = ((y + 1) * w + x) * 2, L = (y * w + x) * 2 + 1, R = (y * w + x + 1) * 2 + 1;
      switch (idx) {
        case 1: case 14: segs.push([L, T]); break;
        case 2: case 13: segs.push([T, R]); break;
        case 3: case 12: segs.push([L, R]); break;
        case 4: case 11: segs.push([R, B]); break;
        case 6: case 9: segs.push([T, B]); break;
        case 7: case 8: segs.push([L, B]); break;
        case 5: case 10: {
          const centre = (at(x, y) + at(x + 1, y) + at(x + 1, y + 1) + at(x, y + 1)) / 4 <= 0;
          if ((idx === 5) === centre) segs.push([L, B], [T, R]); else segs.push([L, T], [R, B]);
        }
      }
    }
  }
  const ends = new Map<number, number[]>();
  segs.forEach(([p, q], i) => {
    (ends.get(p) ?? ends.set(p, []).get(p)!).push(i);
    (ends.get(q) ?? ends.set(q, []).get(q)!).push(i);
  });
  const point = (id: number): [number, number] => {
    const cell = id >> 1;
    const x = cell % w, y = (cell - x) / w;
    const [x1, y1] = id & 1 ? [x, y + 1] : [x + 1, y];
    const v0 = at(x, y), v1 = at(x1, y1);
    const t = v0 / (v0 - v1);
    return [x + (x1 - x) * t, y + (y1 - y) * t];
  };
  const used = new Uint8Array(segs.length);
  const loops: Loop[] = [];
  for (let s = 0; s < segs.length; s++) {
    if (used[s]) continue;
    used[s] = 1;
    const ids = [segs[s][0], segs[s][1]];
    let cur = segs[s][1];
    for (;;) {
      const next = (ends.get(cur) ?? []).find((i) => !used[i]);
      if (next === undefined) break;
      used[next] = 1;
      cur = segs[next][0] === cur ? segs[next][1] : segs[next][0];
      ids.push(cur);
    }
    if (ids.length > 8) loops.push(ids.map(point));
  }
  return loops;
}

// ---- simplify, smooth, resample ----

/** Douglas-Peucker on a closed loop: split it at the point farthest from the first, simplify the two halves. */
function dp(pts: Loop, eps: number): Loop {
  let far = 0, fd = -1;
  for (let i = 1; i < pts.length; i++) { const dd = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]); if (dd > fd) { fd = dd; far = i; } }
  const first = dp2(pts.slice(0, far + 1), eps);
  const second = dp2(pts.slice(far).concat([pts[0]]), eps);
  return first.concat(second.slice(1, -1));
}
/** Douglas-Peucker on an open polyline. */
function dp2(pts: Loop, eps: number): Loop {
  const keep = new Uint8Array(pts.length);
  keep[0] = 1; keep[pts.length - 1] = 1;
  const rec = (a: number, b: number) => {
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    let worst = 0, wi = -1;
    for (let i = a + 1; i < b; i++) {
      const dist = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / len;
      if (dist > worst) { worst = dist; wi = i; }
    }
    if (worst > eps && wi >= 0) { keep[wi] = 1; rec(a, wi); rec(wi, b); }
  };
  rec(0, pts.length - 1);
  return pts.filter((_, i) => keep[i]);
}

function chaikin(pts: Loop, rounds: number): Loop {
  let p = pts;
  for (let r = 0; r < rounds; r++) {
    const q: Loop = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      q.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
    }
    p = q;
  }
  return p;
}

/** A closed polyline resampled to an even spacing, with a unit normal at every point. */
export interface Ring {
  n: number;
  total: number;
  ds: number;
  x: Float64Array;
  y: Float64Array;
  nx: Float64Array;
  ny: Float64Array;
}

export function resample(loop: Loop, spacing: number): Ring | null {
  const m = loop.length;
  const cum = new Float64Array(m + 1);
  for (let i = 0; i < m; i++) cum[i + 1] = cum[i] + Math.hypot(loop[(i + 1) % m][0] - loop[i][0], loop[(i + 1) % m][1] - loop[i][1]);
  const total = cum[m];
  const n = Math.max(8, Math.round(total / spacing));
  const ds = total / n;
  const x = new Float64Array(n), y = new Float64Array(n);
  let k = 0;
  for (let i = 0; i < n; i++) {
    const s = i * ds;
    while (cum[k + 1] < s && k < m - 1) k++;
    const t = (s - cum[k]) / ((cum[k + 1] - cum[k]) || 1);
    const a = loop[k], b = loop[(k + 1) % m];
    x[i] = a[0] + (b[0] - a[0]) * t;
    y[i] = a[1] + (b[1] - a[1]) * t;
  }
  const nx = new Float64Array(n), ny = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const p = (i + n - 2) % n, q = (i + 2) % n;
    const tx = x[q] - x[p], ty = y[q] - y[p], l = Math.hypot(tx, ty) || 1;
    nx[i] = -ty / l;
    ny[i] = tx / l;
  }
  return { n, total, ds, x, y, nx, ny };
}

/** The outlines of the mask grown by `distance` canvas pixels: simplified, smoothed, in canvas pixels. */
export function outlines(m: Mask, threshold: number, distance: number, scale: number, minLength = 80): Loop[] {
  const r = Math.max(0.5, distance / scale);
  const pad = Math.ceil(r) + 3;
  const { d, w, h } = distanceOutside(m, threshold, pad);
  const result: Loop[] = [];
  for (const raw of marchingSquares(d, w, h, r)) {
    const loop = chaikin(dp(raw, 0.5), 2).map(([x, y]): [number, number] => [(x - pad + 0.5) * scale, (y - pad + 0.5) * scale]);
    let len = 0;
    for (let i = 0; i < loop.length; i++) len += Math.hypot(loop[(i + 1) % loop.length][0] - loop[i][0], loop[(i + 1) % loop.length][1] - loop[i][1]);
    if (len >= minLength) result.push(loop);
  }
  return result;
}
