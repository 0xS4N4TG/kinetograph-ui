// Scrapline's drawing (from templates/scrapline): hand-drawn strokes along a ring, and torn paper behind it. Canvas 2D
// only, drawn from seeded numbers.

import type { CanvasContext2D } from '@kinetographdev/core';
import { TEXTURES, cyclicNoise, rng } from './sheet.js';
import type { Ring } from './trace.js';

type Ctx = CanvasContext2D;
/** The engine's `new Image()` (a project file or a data: URL); there is no DOM lib in the type checker. */
declare const Image: new () => { src: string };

// ---- line styles ----

export interface LineStyle {
  /** Stroke width in pixels. */
  width: number;
  /** Overlapping strokes round the shape. */
  passes: number;
  /** Break the stroke up (dry media). */
  grain: boolean;
  /** Redraws per second. */
  boil: number;
  /** How far a stroke wanders off the traced line, px. */
  wobble: number;
  /** How far apart the passes sit, px. */
  spread: number;
  /** How much of a lap a stroke overshoots (a hand does not stop where it started). */
  overshoot: number;
  /** 0..1: how uneven the width is. */
  widthVar: number;
  /** Ink opacity. */
  alpha: number;
  /** Streaks across the stroke when grain is on (the bristles of a brush). */
  lanes: number;
  /** Chance of a gap in the grain, per lane and step. */
  dropout: number;
}

/**
 * width, passes, grain and boil are the spec's; the rest (wobble, spread, overshoot, widthVar, alpha, lanes, dropout)
 * is tuned by eye for each medium.
 */
export const LINES = {
  marker: { width: 8, passes: 1, grain: false, boil: 8, wobble: 1.6, spread: 0, overshoot: 0.04, widthVar: 0.14, alpha: 1, lanes: 1, dropout: 0 },
  pencil: { width: 4, passes: 3, grain: true, boil: 12, wobble: 2.2, spread: 2.4, overshoot: 0.07, widthVar: 0.5, alpha: 0.82, lanes: 1, dropout: 0.1 },
  crayon: { width: 10, passes: 2, grain: true, boil: 6, wobble: 2.6, spread: 3.5, overshoot: 0.05, widthVar: 0.35, alpha: 0.92, lanes: 2, dropout: 0.2 },
  scribble: { width: 4, passes: 3, grain: false, boil: 12, wobble: 5, spread: 6, overshoot: 0.14, widthVar: 0.55, alpha: 1, lanes: 1, dropout: 0 },
  brush: { width: 14, passes: 1, grain: true, boil: 6, wobble: 2.4, spread: 0, overshoot: 0.03, widthVar: 0.6, alpha: 0.95, lanes: 4, dropout: 0.16 },
} satisfies Record<string, LineStyle>;

export type LineName = keyof typeof LINES;

/** One hand-drawn stroke that follows `ring`, drawn in `color`. `key` seeds every random number in it. */
function stroke(ctx: Ctx, ring: Ring, st: LineStyle, key: string, color: string, spread: number) {
  const r = rng(key);
  const { n, total } = ring;
  const wob = cyclicNoise(r, Math.max(3, Math.round(total / 75)));
  const wob2 = cyclicNoise(r, Math.max(5, Math.round(total / 26)));
  const press = cyclicNoise(r, Math.max(3, Math.round(total / 55)));
  const c1 = Math.max(3, Math.round(total / 75)), c2 = Math.max(5, Math.round(total / 26)), c3 = Math.max(3, Math.round(total / 55));
  const s0 = Math.floor(r() * n);
  const m = Math.floor(n * (1 + st.overshoot)) + 1;
  const drift = (r() * 2 - 1) * (2 + st.wobble); // the end misses the start by about this much
  const base = spread;
  const taperN = Math.max(3, Math.round(36 / ring.ds)); // the ends thin out over about 36 px
  const lanes = st.grain ? st.lanes : 1;

  const px = new Float64Array(m * (lanes + 1)), py = new Float64Array(m * (lanes + 1));
  const pr = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    const idx = (s0 + i) % n;
    const u = idx / n;
    const off = base + st.wobble * wob(u * c1) + st.wobble * 0.35 * wob2(u * c2) + drift * (i / n);
    const pressure = 0.5 + 0.5 * press(u * c3);
    pr[i] = pressure;
    const tt = Math.min(1, Math.min(i, m - 1 - i) / taperN);
    const w = st.width * (1 - st.widthVar * 0.5 + st.widthVar * pressure) * (0.2 + 0.8 * (tt * tt * (3 - 2 * tt)));
    const cx = ring.x[idx] + ring.nx[idx] * off, cy = ring.y[idx] + ring.ny[idx] * off;
    for (let k = 0; k <= lanes; k++) {
      const f = k / lanes - 0.5;
      px[k * m + i] = cx + ring.nx[idx] * w * f;
      py[k * m + i] = cy + ring.ny[idx] * w * f;
    }
  }

  // the ribbon: one smooth polygon, left edge out and right edge back
  ctx.fillStyle = color;
  ctx.globalAlpha = st.alpha;
  ctx.beginPath();
  ctx.moveTo(px[0], py[0]);
  for (let i = 1; i < m; i++) ctx.lineTo(px[i], py[i]);
  for (let i = m - 1; i >= 0; i--) ctx.lineTo(px[lanes * m + i], py[lanes * m + i]);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  if (!st.grain) return;

  // grain: punch holes in the ink (the line has a canvas of its own, so erasing leaves the paper alone)
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = '#000';
  const speck = Math.max(0.8, Math.sqrt(st.width) * 0.45);
  const perSample = st.width * st.dropout * 3.5 * (ring.ds / 3);
  ctx.beginPath();
  for (let i = 0; i < m - 1; i++) {
    let k = perSample * (1.5 - pr[i]);
    while (k > 0) {
      if (k >= 1 || r() < k) {
        const f = r(), g = r();
        const x = px[i] + (px[lanes * m + i] - px[i]) * f + (px[i + 1] - px[i]) * g;
        const y = py[i] + (py[lanes * m + i] - py[i]) * f + (py[i + 1] - py[i]) * g;
        const sz = speck * (0.4 + r() * 1.3);
        ctx.rect(x, y, sz * (1 + r() * 1.5), sz);
      }
      k--;
    }
  }
  ctx.fill();
  // streaks along the stroke, where the bristles part
  ctx.strokeStyle = '#000';
  for (let k = 1; k < lanes; k++) {
    let i = Math.floor(r() * 20);
    while (i < m - 2) {
      const run = 6 + Math.floor(r() * 50);
      if (r() < 0.55) {
        ctx.lineWidth = 0.7 + r() * 1.6;
        ctx.beginPath();
        ctx.moveTo(px[k * m + i], py[k * m + i]);
        for (let j = i + 1; j < Math.min(m, i + run); j++) ctx.lineTo(px[k * m + j], py[k * m + j]);
        ctx.stroke();
      }
      i += run + Math.floor(r() * 25);
    }
  }
  ctx.restore();
}

/** The line: every ring gets `st.passes` overlapping strokes, each drawn on its own. */
export function drawLine(ctx: Ctx, rings: Ring[], st: LineStyle, color: string, seed: string) {
  rings.forEach((ring, ri) => {
    for (let p = 0; p < st.passes; p++) {
      const side = st.passes === 1 ? 0 : (p / (st.passes - 1) - 0.5) * 2; // -1 .. 1 across the passes
      const r = rng(`${seed}-spread-${ri}-${p}`);
      const spread = side * st.spread + (r() - 0.5) * st.spread * 0.6;
      stroke(ctx, ring, st, `${seed}-${ri}-${p}`, color, spread);
    }
  });
}

// ---- paper ----

/** A picture for the paper: a data: URL or a project file, and its size. */
export interface Texture {
  file: string;
  w: number;
  h: number;
}

export interface PaperDef {
  /** The paper's scan. */
  texture: Texture;
  /** The torn rim under the edge: the same scan washed out, over this colour. */
  rim: string;
}

const scan = (file: string, w = 1024, h = 1024): Texture => ({ file, w, h });

/** The papers behind a Scrapline, from the plugin's scans. */
export const PAPERS = {
  white: { texture: scan(TEXTURES.scrapWhite), rim: '#fffefa' },
  kraft: { texture: scan(TEXTURES.scrapKraft), rim: '#d9bd92' },
  binder: { texture: scan(TEXTURES.binder), rim: '#fffdf4' },
  cardboard: { texture: scan(TEXTURES.cardboard), rim: '#c9a577' },
  newsprint: { texture: scan(TEXTURES.newsprint, 1536, 1024), rim: '#f4f2ec' },
} satisfies Record<string, PaperDef>;
export type PaperName = keyof typeof PAPERS;

/** Longest edge first: the tear. Each ring point is moved along its normal by noise at two scales plus a fine jitter. */
function tornPath(ctx: Ctx, rings: Ring[], key: string, amp: number, grow: number) {
  rings.forEach((ring, ri) => {
    const r = rng(`${key}-${ri}`);
    const lo = cyclicNoise(r, Math.max(3, Math.round(ring.total / 120)));
    const mid = cyclicNoise(r, Math.max(6, Math.round(ring.total / 28)));
    const hi = cyclicNoise(r, Math.max(12, Math.round(ring.total / 9)));
    const cl = Math.max(3, Math.round(ring.total / 120)), cm = Math.max(6, Math.round(ring.total / 28)), ch = Math.max(12, Math.round(ring.total / 9));
    for (let i = 0; i < ring.n; i++) {
      const u = i / ring.n;
      const o = grow + amp * 0.45 * lo(u * cl) + amp * 0.16 * mid(u * cm) + 1.8 * hi(u * ch) + (r() - 0.5) * 1.6;
      const x = ring.x[i] + ring.nx[i] * o, y = ring.y[i] + ring.ny[i] * o;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  });
}

/**
 * Torn paper behind the cut-out: a paler rim, then the paper, both from the same rings grown by the margin and torn.
 * `def.texture` is the paper picture: one of the plugin's scans, or the user's photo.
 */
export function drawPaper(
  ctx: Ctx, rings: Ring[], rimRings: Ring[], def: PaperDef, seed: string, margin: number, W: number, H: number,
) {
  if (!rings.length) return;
  const r = rng(`${seed}-place`);
  const ox = r(), oy = r(); // where the picture sits under this piece
  const { texture } = def;
  const img = new Image();
  img.src = texture.file;
  const lay = (): void => {
    const cover = Math.max(W / texture.w, H / texture.h) * 1.08;
    const dw = texture.w * cover, dh = texture.h * cover;
    ctx.drawImage(img as never, -ox * (dw - W), -oy * (dh - H), dw, dh);
  };
  // the rim: a little wider and torn differently, paler, with the shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.38)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = def.rim;
  ctx.beginPath();
  tornPath(ctx, rimRings, `${seed}-rim`, margin * 0.9, 1);
  ctx.fill('evenodd');
  ctx.restore();
  // the torn rim is the same picture, washed out
  ctx.save();
  ctx.beginPath();
  tornPath(ctx, rimRings, `${seed}-rim`, margin * 0.9, 1);
  ctx.clip('evenodd');
  lay();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  tornPath(ctx, rings, `${seed}-paper`, margin * 0.9, 0);
  ctx.clip('evenodd');
  lay();
  ctx.restore();
}
