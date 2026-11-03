// The film under the opening, drawn the way the reference's page draws it: each picture of the video is cut to cover
// the frame, scaled to `width` pixels across, given a little fixed noise and dithered to two tones with Floyd and
// Steinberg's error diffusion, then stretched back over the frame with smoothing, so the dots come out soft. The
// two tones are the paper and the ink.
//
// The line over the film is drawn into it as its negative: around the line the film is blurred (a 9 px box) and each
// pixel of the glyphs takes the ink where the film is light and the paper where it is dark (`toneAround`).
//
// The video is read as kinetic-typography's footage reader reads it: drawn on an OffscreenCanvas and read back with
// getImageData (the renderer decodes it). The noise comes from `random`, so a frame is a pure function of its props.

import { CANVAS_SOURCE, random } from '@kinetographdev/core';
import { probeMedia } from '@kinetographdev/core/media-utils';

export type RGB = [number, number, number];

/** A video and where in it the opening starts. */
export interface FilmSource {
  src: string;
  /** Seconds into the file at the moment the film appears. */
  start: number;
  /** Playback rate. */
  rate: number;
}

/** One dithered picture and where it is drawn on the frame. */
export interface Dithered {
  /** The dither's size in pixels. */
  dw: number;
  dh: number;
  /** 1 where the dither is paper, 0 where it is ink, row by row. */
  bits: Uint8Array;
  /** The box on the frame it is stretched over. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** The picture to draw: an OffscreenCanvas holding it in the two tones. */
  picture: unknown;
}

type Ctx = any;
type Surface = { width: number; height: number; getContext(type: '2d', options?: unknown): Ctx };

const offscreen = (w: number, h: number): Surface => {
  const Offscreen = (globalThis as { OffscreenCanvas?: new (w: number, h: number) => Surface }).OffscreenCanvas;
  if (!Offscreen) throw new Error('The film is read with OffscreenCanvas: render with Kinetograph');
  return new Offscreen(w, h);
};

// The reference adds a table of 4096 noise values (+-7) to the picture before the dither, read from a new offset each
// time the video's picture changes, so the dots boil at the video's frame rate.
const NOISE = Float32Array.from({ length: 4096 }, (_, i) => (random(`film-noise-${i}`) - 0.5) * 14);

let reader: Surface | null = null;
const made = new Map<string, Dithered>();

/**
 * The film `t` seconds after it appears, at `zoom` (1 = covering the frame), dithered `width` pixels across the
 * part of the video that shows.
 */
export function dither(film: FilmSource, t: number, zoom: number, W: number, H: number, width: number,
  paper: RGB, ink: RGB): Dithered {
  const info = probeMedia(film.src, { cache: true });
  const I = info.width, B = info.height;
  const end = info.durationInSeconds ? Math.max(0, info.durationInSeconds - 0.05) : Infinity;
  const time = Math.min(end, Math.max(0, film.start + t * film.rate));
  const fps = info.fps || 30;
  const shown = Math.floor(time * fps + 1e-6);
  // cover the frame, then crop in by the zoom: the part of the video that shows, in video pixels
  const j = Math.max(W / I, H / B) * zoom;
  const P = Math.min(I, W / j), Q = Math.min(B, H / j);
  const D = (I - P) / 2, E = (B - Q) / 2;
  const N = width / I;
  const dw = Math.max(1, Math.round(P * N)), dh = Math.max(1, Math.round(Q * N));

  const key = `${film.src}|${shown}|${dw}x${dh}|${paper}|${ink}`;
  const hit = made.get(key);
  if (hit) return { ...hit, x: W / 2 - (P * j) / 2, y: H / 2 - (Q * j) / 2, w: P * j, h: Q * j };

  if (!reader || reader.width !== dw || reader.height !== dh) reader = offscreen(dw, dh);
  const rc = reader.getContext('2d', { willReadFrequently: true });
  rc.clearRect(0, 0, dw, dh);
  rc.imageSmoothingEnabled = true;
  rc.imageSmoothingQuality = 'high';
  const source = { kind: 'video' as const, src: film.src, time: shown / fps };
  rc.drawImage({ [CANVAS_SOURCE]: () => ({ source, width: I, height: B }) }, D, E, P, Q, 0, 0, dw, dh);
  const px: Uint8ClampedArray = rc.getImageData(0, 0, dw, dh).data;

  // Floyd-Steinberg on the red channel, threshold 128, as the reference does
  const n = dw * dh;
  const p = new Float32Array(n);
  const off = Math.floor(random(`film-offset-${shown}`) * 4096);
  for (let i = 0; i < n; i++) p[i] = px[4 * i] + NOISE[(i + off) & 4095];
  const bits = new Uint8Array(n);
  for (let y = 0; y < dh; y++) {
    const row = y * dw;
    for (let x = 0; x < dw; x++) {
      const i = row + x, v = p[i], on = v < 128 ? 0 : 1, e = v - (on ? 255 : 0);
      bits[i] = on;
      if (x + 1 < dw) p[i + 1] += 0.4375 * e;
      if (y + 1 < dh) {
        if (x > 0) p[i + dw - 1] += 0.1875 * e;
        p[i + dw] += 0.3125 * e;
        if (x + 1 < dw) p[i + dw + 1] += 0.0625 * e;
      }
    }
  }

  const surface = offscreen(dw, dh);
  const sc = surface.getContext('2d');
  const img = sc.createImageData(dw, dh);
  for (let i = 0; i < n; i++) {
    const c = bits[i] ? paper : ink, k = 4 * i;
    img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; img.data[k + 3] = 255;
  }
  sc.putImageData(img, 0, 0);

  const out: Dithered = { dw, dh, bits, x: W / 2 - (P * j) / 2, y: H / 2 - (Q * j) / 2, w: P * j, h: Q * j, picture: surface };
  if (made.size > 8) made.clear();
  made.set(key, out);
  return out;
}

/**
 * The colours the line takes over the film in the box (rx, ry, rw, rh) of the frame: the film there as it is drawn
 * (the dither stretched with bilinear smoothing), blurred with a box of `radius` pixels each way, and each pixel set to
 * the ink where that is lighter than halfway between the two tones, else the paper. An OffscreenCanvas of rw x rh.
 */
export function toneAround(d: Dithered, rx: number, ry: number, rw: number, rh: number, paper: RGB, ink: RGB,
  radius = 4): unknown {
  rw = Math.max(1, Math.round(rw)); rh = Math.max(1, Math.round(rh));
  const lum = new Float32Array(rw * rh);
  const sx = d.dw / d.w, sy = d.dh / d.h;
  const lo = ink[0], hi = paper[0];
  const at = (u: number, v: number) => {
    const cu = Math.min(d.dw - 1, Math.max(0, u)), cv = Math.min(d.dh - 1, Math.max(0, v));
    return d.bits[cv * d.dw + cu] ? hi : lo;
  };
  for (let y = 0; y < rh; y++) {
    const v = (ry + y + 0.5 - d.y) * sy - 0.5;
    const v0 = Math.floor(v), fv = v - v0;
    for (let x = 0; x < rw; x++) {
      const u = (rx + x + 0.5 - d.x) * sx - 0.5;
      const u0 = Math.floor(u), fu = u - u0;
      const top = at(u0, v0) * (1 - fu) + at(u0 + 1, v0) * fu;
      const bot = at(u0, v0 + 1) * (1 - fu) + at(u0 + 1, v0 + 1) * fu;
      lum[y * rw + x] = top * (1 - fv) + bot * fv;
    }
  }
  // separable box blur, edges clamped
  const g = radius, f = 2 * g + 1, tmp = new Float32Array(rw * rh);
  for (let y = 0; y < rh; y++) {
    const row = y * rw;
    let s = 0;
    for (let k = -g; k <= g; k++) s += lum[row + Math.min(rw - 1, Math.max(0, k))];
    for (let x = 0; x < rw; x++) {
      tmp[row + x] = s / f;
      s += lum[row + Math.min(rw - 1, x + g + 1)] - lum[row + Math.max(0, x - g)];
    }
  }
  for (let x = 0; x < rw; x++) {
    let s = 0;
    for (let k = -g; k <= g; k++) s += tmp[Math.min(rh - 1, Math.max(0, k)) * rw + x];
    for (let y = 0; y < rh; y++) {
      lum[y * rw + x] = s / f;
      s += tmp[Math.min(rh - 1, y + g + 1) * rw + x] - tmp[Math.max(0, y - g) * rw + x];
    }
  }
  const mid = (lo + hi) / 2;
  const surface = offscreen(rw, rh);
  const sc = surface.getContext('2d');
  const img = sc.createImageData(rw, rh);
  for (let i = 0; i < rw * rh; i++) {
    const c = lum[i] > mid ? ink : paper, k = 4 * i;
    img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; img.data[k + 3] = 255;
  }
  sc.putImageData(img, 0, 0);
  return surface;
}
