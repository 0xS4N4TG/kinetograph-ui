// A photo as a paper cut-out: the subject's alpha traced and grown into a border, torn (or cut, waved, rounded), with
// a fibre fringe; and the sheet crumpled into a ball and opened out again, as triangles of the sheet mapped by affine
// transforms, the backs showing where a facet has turned over, each lit by its slope.
//
// Everything is drawn with Canvas 2D from seeded numbers, so a frame is a function of its props and the frame number.

import { random, type CanvasContext2D } from '@kinetographdev/core';
import { outlines, readMask, resample, type Ring } from './trace.js';
import { TEXTURE_DATA } from '../textures/index.js';

type Ctx = CanvasContext2D;
/** The engine's `new Image()` (a project file or a data: URL) and `OffscreenCanvas`; there is no DOM lib here. */
declare const Image: new () => { src: string };
declare const OffscreenCanvas: new (w: number, h: number) => { getContext(type: '2d'): Ctx };

// ---- seeded numbers ----

/** A fast generator seeded from `random(key)`, so every number is a function of the key. */
export function rng(key: string): () => number {
  let a = Math.floor(random(key) * 4294967296) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth noise in -1..1 that repeats every `cells` units of its argument (so it closes round a loop). */
export function cyclicNoise(r: () => number, cells: number): (u: number) => number {
  const v = Array.from({ length: cells }, () => r() * 2 - 1);
  return (u) => {
    const i = Math.floor(u);
    const f = u - i;
    const s = f * f * (3 - 2 * f);
    const a = v[((i % cells) + cells) % cells], b = v[(((i + 1) % cells) + cells) % cells];
    return a + (b - a) * s;
  };
}

// ---- the edge ----

export type EdgeStyle = 'torn' | 'cut' | 'wavy' | 'sticker';

export interface Edge {
  /** `torn`: ragged, with a grey fibre fringe. `cut`: straight scissor cuts. `wavy`: a soft deckle. `sticker`: smooth. */
  style: EdgeStyle;
  /** Border width, as a fraction of the picture's longer side. */
  thickness: number;
  /** How far the edge wanders in and out, 0 (a clean line) to about 2. */
  intensity: number;
  /** How fine the wander is, 0 (long swells) to about 2 (small teeth). */
  detail: number;
}

export const EDGES: Record<EdgeStyle, Edge> = {
  torn: { style: 'torn', thickness: 0.026, intensity: 1, detail: 1 },
  cut: { style: 'cut', thickness: 0.03, intensity: 1, detail: 1 },
  wavy: { style: 'wavy', thickness: 0.028, intensity: 1, detail: 1 },
  sticker: { style: 'sticker', thickness: 0.035, intensity: 0, detail: 0 },
};

/** The outline roughened as the style says, by up to about `amp` px either way. `fringe`: the paler band past the
 *  edge, rougher and finer. */
function edgePath(ctx: Ctx, rings: Ring[], edge: Edge, key: string, amp0: number, fringe: boolean) {
  const { style, intensity: k, detail: dt } = edge;
  rings.forEach((ring, ri) => {
    const r = rng(`${key}-${ri}`);
    const cells = (len: number) => Math.max(4, Math.round(ring.total / len));
    if (style === 'cut') {
      // a pair of scissors: straight runs between corners a few teeth apart, each corner a little in or out
      const every = Math.max(2, Math.round((60 / Math.max(0.25, dt)) / ring.ds));
      for (let i = 0; i < ring.n; i += every) {
        const j = Math.min(ring.n - 1, i + Math.floor(r() * every * 0.5));
        const o = (r() - 0.5) * amp0 * 0.5 * k;
        const x = ring.x[j] + ring.nx[j] * o, y = ring.y[j] + ring.ny[j] * o;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      return;
    }
    const cl = cells(140), cm = cells(34 / Math.max(0.2, dt)), ch = cells(8 / Math.max(0.2, dt));
    const lo = cyclicNoise(r, cl), mid = cyclicNoise(r, cm), hi = cyclicNoise(r, ch);
    const amp = amp0 * k;
    for (let i = 0; i < ring.n; i++) {
      const u = i / ring.n;
      let o = 0;
      if (style === 'torn') {
        o += amp * (0.35 * lo(u * cl) + 0.22 * mid(u * cm)) + (fringe ? amp * 0.3 * hi(u * ch) + (r() - 0.5) * amp * 0.35 : amp * 0.08 * hi(u * ch));
      } else if (style === 'wavy') {
        o += amp * (0.15 * lo(u * cl) + 0.25 * Math.sin(u * cm * Math.PI * 2));
      }
      const x = ring.x[i] + ring.nx[i] * o, y = ring.y[i] + ring.ny[i] * o;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  });
}

// ---- textures ----

/** The plugin's scans, as data: URLs (`tools/textures.py` makes them). The crease maps are grey with their median at
 *  white: multiplied over anything they add only the creases' shade. */
export const TEXTURES = TEXTURE_DATA;

/** Paper stocks: the border and the back are this paper. `grain` is multiplied over a flat `paper` colour (white), or
 *  `scan` is the paper itself (newsprint, kraft, binder, cardboard). */
export type Stock = 'white' | 'newsprint' | 'kraft' | 'binder' | 'cardboard';
export const STOCKS: Record<Stock, { paper: string; back: string; fringe: string; fibre: string; grain?: string; scan?: string }> = {
  white: { paper: '#fbfbf8', back: '#f1f0ec', fringe: 'rgba(214,214,208,0.8)', fibre: 'rgba(232,232,226,0.9)', grain: TEXTURES.smoothWhite },
  newsprint: { paper: '#e9e6df', back: '#e4e1da', fringe: 'rgba(205,201,192,0.85)', fibre: 'rgba(225,221,212,0.9)', scan: TEXTURES.newsprint },
  kraft: { paper: '#c49a6c', back: '#b98f62', fringe: 'rgba(214,186,150,0.85)', fibre: 'rgba(222,196,160,0.9)', scan: TEXTURES.kraft },
  binder: { paper: '#f5f2e6', back: '#f5f2e6', fringe: 'rgba(214,210,196,0.85)', fibre: 'rgba(236,232,220,0.9)', scan: TEXTURES.binder },
  cardboard: { paper: '#a67a4d', back: '#9c7146', fringe: 'rgba(201,165,119,0.85)', fibre: 'rgba(214,180,136,0.9)', scan: TEXTURES.cardboard },
};

/** One scan laid over the whole sheet, turned a quarter turn and shifted by `key`, `zoom` times the sheet's size. */
function layTexture(ctx: Ctx, s: Sheet, file: string, key: string, zoom: number) {
  const r = rng(`${key}-lay`);
  const size = Math.max(s.w, s.h) * zoom;
  const img = new Image();
  img.src = file;
  ctx.save();
  ctx.translate(s.w / 2, s.h / 2);
  ctx.rotate(Math.floor(r() * 4) * (Math.PI / 2));
  ctx.drawImage(img as never, -size / 2 - r() * (size - Math.max(s.w, s.h)) * 0.5, -size / 2 - r() * (size - Math.max(s.w, s.h)) * 0.5, size, size);
  ctx.restore();
}

// ---- the sheet ----

export interface Sheet {
  /** The sheet's box: the picture sits at (pad, pad) in it, drawn at dw x dh. */
  w: number;
  h: number;
  pad: number;
  dw: number;
  dh: number;
  /** The subject's outline grown by the border, and by a little more (the fibre fringe), in sheet px. */
  rings: Ring[];
  outer: Ring[];
  /** Border width, px. */
  border: number;
}

const sheets = new Map<string, Sheet>();

/** The cut-out of `src` drawn at dw x dh: traced once (alpha >= threshold) and kept. */
export function sheetOf(src: string, dw: number, dh: number, edge: Edge, threshold: number): Sheet {
  const border = edge.thickness * Math.max(dw, dh);
  const key = JSON.stringify([src, Math.round(dw), Math.round(dh), border.toFixed(1), threshold]);
  let s = sheets.get(key);
  if (!s) {
    const scale = Math.max(2, Math.round(Math.max(dw, dh) / 360));
    const mask = readMask({ src, mode: 'alpha' }, 0, 30, Math.round(dw), Math.round(dh), scale);
    const pad = Math.ceil(border * 2.2 + 12);
    // grown by a distance field, so concave parts of the outline do not fold over themselves
    const trace = (d: number) =>
      outlines(mask, threshold, d, scale)
        .map((l) => resample(l.map(([x, y]): [number, number] => [x + pad, y + pad]), 3))
        .filter((x): x is Ring => x !== null);
    s = { w: Math.ceil(dw + 2 * pad), h: Math.ceil(dh + 2 * pad), pad, dw, dh, rings: trace(border), outer: trace(border * 1.3), border };
    sheets.set(key, s);
  }
  return s;
}

export interface SheetLook {
  edge: Edge;
  /** The border's paper. */
  paper: string;
  /** The back of the sheet. */
  back: string;
  /** The fibre fringe of a torn edge, and its loose fibres. */
  fringe: string;
  fibre: string;
  /** A paper's grain multiplied over the flat colour, or a scan that is the paper itself. */
  grain?: string;
  scan?: string;
  /** A picture multiplied over the border and the back (optional, a project file path). */
  texture?: string;
  /** Creases over the whole sheet, picture included: how much of the light and the heavy crease map to multiply in
   *  (0..1 each), and the key that places them. */
  wrinkle?: { light: number; heavy: number; key: string };
}

export const DEFAULT_SHEET: SheetLook = { edge: EDGES.torn, ...STOCKS.white };

/** What one side of the sheet shows: the front (border and picture), the back (plain paper), or the silhouette in
 *  one colour (for shading a facet). Drawn in sheet px. */
export type Face = 'front' | 'back' | 'dark' | 'light';

export function drawFace(ctx: Ctx, s: Sheet, src: string, look: SheetLook, key: string, face: Face) {
  const { edge } = look;
  const fringe = edge.style === 'torn';
  const outline = () => {
    ctx.beginPath();
    edgePath(ctx, s.rings, edge, `${key}-edge`, s.border * 0.6, false);
  };
  const outer = () => {
    ctx.beginPath();
    edgePath(ctx, s.outer, edge, `${key}-fringe`, s.border * 0.6, true);
  };
  if (face === 'dark' || face === 'light') {
    ctx.fillStyle = face === 'dark' ? '#000' : '#fff';
    outline();
    ctx.fill('evenodd');
    if (fringe) { outer(); ctx.fill('evenodd'); }
    return;
  }
  if (fringe) {
    ctx.fillStyle = look.fringe;
    outer();
    ctx.fill('evenodd');
    // fibres: short pale hairs standing off the torn rim
    const r = rng(`${key}-fibres`);
    ctx.strokeStyle = look.fibre;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const ring of s.outer) {
      for (let i = 0; i < ring.n; i += 2) {
        if (r() > 0.45) continue;
        const o = (r() - 0.5) * s.border * 0.4, len = (r() < 0.5 ? -1 : 1) * (1.5 + r() * s.border * 0.18), tilt = (r() - 0.5) * 1.2;
        const x = ring.x[i] + ring.nx[i] * o, y = ring.y[i] + ring.ny[i] * o;
        const ca = Math.cos(tilt), sa = Math.sin(tilt);
        ctx.moveTo(x, y);
        ctx.lineTo(x + (ring.nx[i] * ca - ring.ny[i] * sa) * len, y + (ring.nx[i] * sa + ring.ny[i] * ca) * len);
      }
    }
    ctx.stroke();
  }
  ctx.fillStyle = face === 'front' ? look.paper : look.back;
  outline();
  ctx.fill('evenodd');
  const paperPicture = (file: string, mode: 'source-over' | 'multiply', zoom: number, alpha = 1) => {
    ctx.save();
    outline();
    ctx.clip('evenodd');
    ctx.globalCompositeOperation = mode;
    ctx.globalAlpha = alpha;
    layTexture(ctx, s, file, `${key}-${face}-paper`, zoom);
    ctx.restore();
  };
  if (look.scan) paperPicture(look.scan, 'source-over', 1.6, face === 'back' ? 0.85 : 1);
  if (look.grain) paperPicture(look.grain, 'multiply', 1.6);
  if (look.texture) paperPicture(look.texture, 'multiply', 1.05);
  if (face === 'front') {
    const img = new Image();
    img.src = src;
    ctx.drawImage(img as never, s.pad, s.pad, s.dw, s.dh);
  }
  // creases over everything, the picture too
  const w = look.wrinkle;
  if (w && (w.light > 0.01 || w.heavy > 0.01)) {
    ctx.save();
    if (fringe) outer(); else outline();
    ctx.clip('evenodd');
    ctx.globalCompositeOperation = 'multiply';
    if (w.light > 0.01) { ctx.globalAlpha = Math.min(1, w.light); layTexture(ctx, s, TEXTURES.creaseLight, `${w.key}-light`, 1.15); }
    if (w.heavy > 0.01) { ctx.globalAlpha = Math.min(1, w.heavy); layTexture(ctx, s, TEXTURES.creaseHeavy, `${w.key}-heavy`, 0.9); }
    ctx.restore();
  }
}

// ---- crumpling ----

interface Mesh {
  /** Flat positions, sheet px. */
  u: Float64Array;
  v: Float64Array;
  /** Per vertex: where it is thrown when the sheet is balled up (-1..1), and its height in the ball. */
  jx: Float64Array;
  jy: Float64Array;
  jz: Float64Array;
  tris: [number, number, number][];
}

const meshes = new Map<string, Mesh>();

/** A jittered grid over the sheet, each cell split along a random diagonal. `cells` across the longer side. */
function meshOf(s: Sheet, cells: number, key: string): Mesh {
  const id = `${s.w}x${s.h}|${cells}|${key}`;
  let m = meshes.get(id);
  if (m) return m;
  const r = rng(`${key}-mesh`);
  const cw = Math.max(s.w, s.h) / cells;
  const nx = Math.max(2, Math.round(s.w / cw)), ny = Math.max(2, Math.round(s.h / cw));
  const n = (nx + 1) * (ny + 1);
  const u = new Float64Array(n), v = new Float64Array(n), jx = new Float64Array(n), jy = new Float64Array(n), jz = new Float64Array(n);
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      const k = j * (nx + 1) + i;
      const edgeX = i === 0 || i === nx, edgeY = j === 0 || j === ny;
      u[k] = (i / nx) * s.w + (edgeX ? 0 : (r() - 0.5) * 0.7 * (s.w / nx));
      v[k] = (j / ny) * s.h + (edgeY ? 0 : (r() - 0.5) * 0.7 * (s.h / ny));
      jx[k] = r() * 2 - 1;
      jy[k] = r() * 2 - 1;
      jz[k] = r() * 2 - 1;
    }
  }
  const tris: [number, number, number][] = [];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
      if (r() < 0.5) tris.push([a, b, d], [a, d, c]);
      else tris.push([a, b, c], [b, d, c]);
    }
  }
  m = { u, v, jx, jy, jz, tris };
  meshes.set(id, m);
  return m;
}

export interface Fold {
  /** 0: folded up. 1: flat. */
  open: number;
  /** Folds made in the sheet (each halves it, roughly); they open last fold first. */
  folds: number;
  /** The packet's size against the flat sheet, before the folds shrink it further. */
  ball: number;
  /** How crumpled the packet is: facets thrown about, against its size. */
  crumple: number;
  /** Turn of the packet, degrees, unwound as it opens. */
  turn: number;
  /** Wrinkles left in the flat sheet; drawn by `wrinkles` on the layer, not here. */
  creases: number;
  /** Triangle cells across the sheet's longer side. */
  cells: number;
}

/** One fold, made in the sheet as it is once the folds before it are closed: a line through (px, py) with normal
 *  (nx, ny), and which vertices it turns over. */
interface FoldLine {
  px: number;
  py: number;
  nx: number;
  ny: number;
  side: number;
  moves: Uint8Array;
}

const foldings = new Map<string, FoldLine[]>();

/** The folds: each one across the packet's longest extent (its principal axis), near its middle, at a slant. */
function foldsOf(m: Mesh, s: Sheet, count: number, key: string): FoldLine[] {
  const id = `${s.w}x${s.h}|${m.u.length}|${count}|${key}`;
  let out = foldings.get(id);
  if (out) return out;
  const r = rng(`${key}-folds`);
  const n = m.u.length;
  const X = Float64Array.from(m.u, (u) => u - s.w / 2), Y = Float64Array.from(m.v, (v) => v - s.h / 2);
  out = [];
  for (let j = 0; j < count; j++) {
    let mx = 0, my = 0;
    for (let k = 0; k < n; k++) { mx += X[k]; my += Y[k]; }
    mx /= n; my /= n;
    let sxx = 0, syy = 0, sxy = 0;
    for (let k = 0; k < n; k++) { const dx = X[k] - mx, dy = Y[k] - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
    // the principal axis is the fold's normal: the fold runs across the long way
    const axis = 0.5 * Math.atan2(2 * sxy, sxx - syy) + (r() - 0.5) * 0.7;
    const nx = Math.cos(axis), ny = Math.sin(axis);
    const spread = Math.sqrt(Math.max(sxx, syy) / n);
    const px = mx + nx * (r() - 0.5) * 0.5 * spread, py = my + ny * (r() - 0.5) * 0.5 * spread;
    // the side away from the sheet's middle folds over, so the panel that stays put holds the middle
    const mid = (0 - px) * nx + (0 - py) * ny;
    const side = Math.abs(mid) > 1 ? -Math.sign(mid) : r() < 0.5 ? 1 : -1;
    const moves = new Uint8Array(n);
    for (let k = 0; k < n; k++) {
      const d = (X[k] - px) * nx + (Y[k] - py) * ny;
      if (d * side > 0) {
        moves[k] = 1;
        X[k] -= 2 * d * nx;
        Y[k] -= 2 * d * ny;
      }
    }
    out.push({ px, py, nx, ny, side, moves });
  }
  foldings.set(id, out);
  return out;
}

/** Eased 0..1 of one fold's opening. */
const swing = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 2));

/** The sheet drawn at canvas point (cx, cy) (its centre), folded by `fold`. */
export function drawFolded(ctx: Ctx, s: Sheet, src: string, look: SheetLook, key: string, fold: Fold, cx: number, cy: number) {
  const surface = (face: Face) => {
    const c = new OffscreenCanvas(s.w, s.h);
    drawFace(c.getContext('2d'), s, src, look, key, face);
    return c;
  };
  const e = Math.max(0, Math.min(1, fold.open));
  const front = surface('front');
  if (e >= 1) {
    ctx.drawImage(front as never, cx - s.w / 2, cy - s.h / 2);
    return;
  }
  const back = surface('back'), dark = surface('dark'), light = surface('light');
  const m = meshOf(s, fold.cells, key);
  const lines = foldsOf(m, s, fold.folds, key);
  const size = Math.max(s.w, s.h);
  const n = m.u.length;
  const X = Float64Array.from(m.u, (u) => u - s.w / 2), Y = Float64Array.from(m.v, (v) => v - s.h / 2);
  const Z = new Float64Array(n), lay = new Float64Array(n);
  // the folds in the order they were made; the last made opens first, each over its share of `open`
  const k = lines.length;
  // one fold moves at a time, the ones made before it still closed: its hinge is where it was made
  lines.forEach((f, j) => {
    const local = swing(e * k - (k - 1 - j));
    const th = Math.PI * (1 - local);
    const c = Math.cos(th), sn = Math.sin(th);
    let top = 0;
    for (let q = 0; q < n; q++) top = Math.max(top, lay[q]);
    for (let q = 0; q < n; q++) {
      if (!f.moves[q]) continue;
      const d = ((X[q] - f.px) * f.nx + (Y[q] - f.py) * f.ny) * f.side;
      const d2 = d * c - Z[q] * sn, z2 = d * sn + Z[q] * c;
      X[q] += (d2 - d) * f.side * f.nx;
      Y[q] += (d2 - d) * f.side * f.ny;
      Z[q] = z2;
      // a flap past upright lies on the stack, its own layers reversed
      if (th > Math.PI / 2) lay[q] = top + 1 + (top - lay[q]);
    }
  });
  // crumpled on top of the folds, flattening as it opens; turned and shrunk about the panel no fold moves, which
  // stays where it lies when flat
  const sc = fold.ball + (1 - fold.ball) * e;
  const thrown = Math.pow(1 - e, 1.2) * fold.crumple * size * sc;
  const a = ((1 - e) * fold.turn * Math.PI) / 180;
  const ca = Math.cos(a), sa = Math.sin(a);
  let bx = 0, by = 0, bn = 0;
  for (let q = 0; q < n; q++) {
    if (lines.some((f) => f.moves[q])) continue;
    bx += m.u[q] - s.w / 2; by += m.v[q] - s.h / 2; bn++;
  }
  if (bn) { bx /= bn; by /= bn; }
  for (let q = 0; q < n; q++) {
    const rx = (X[q] - bx) * sc + m.jx[q] * thrown, ry = (Y[q] - by) * sc + m.jy[q] * thrown;
    X[q] = cx + bx + rx * ca - ry * sa;
    Y[q] = cy + by + rx * sa + ry * ca;
    Z[q] = Z[q] * sc + m.jz[q] * thrown * 0.6;
  }
  // lit from the top left; a flat facet gets no shade
  const L = [-0.45, -0.55, 0.7];
  const ll = Math.hypot(L[0], L[1], L[2]);
  const flat = L[2] / ll;
  const order = m.tris
    .map((t, i) => ({ t, i, z: Math.max(lay[t[0]], lay[t[1]], lay[t[2]]) * size + (Z[t[0]] + Z[t[1]] + Z[t[2]]) / 3 }))
    .sort((p, q) => p.z - q.z || p.i - q.i);
  for (const { t } of order) {
    const [p, q, w] = t;
    const su = [m.u[p], m.u[q], m.u[w]], sv = [m.v[p], m.v[q], m.v[w]];
    const dx = [X[p], X[q], X[w]], dy = [Y[p], Y[q], Y[w]];
    const den = su[0] * (sv[1] - sv[2]) + su[1] * (sv[2] - sv[0]) + su[2] * (sv[0] - sv[1]);
    if (Math.abs(den) < 1e-6) continue;
    const A = (dx[0] * (sv[1] - sv[2]) + dx[1] * (sv[2] - sv[0]) + dx[2] * (sv[0] - sv[1])) / den;
    const C = (dx[0] * (su[2] - su[1]) + dx[1] * (su[0] - su[2]) + dx[2] * (su[1] - su[0])) / den;
    const B = (dy[0] * (sv[1] - sv[2]) + dy[1] * (sv[2] - sv[0]) + dy[2] * (sv[0] - sv[1])) / den;
    const D = (dy[0] * (su[2] - su[1]) + dy[1] * (su[0] - su[2]) + dy[2] * (su[1] - su[0])) / den;
    const E = dx[0] - A * su[0] - C * sv[0], F = dy[0] - B * su[0] - D * sv[0];
    // turned over when the map flips the triangle
    const facing = A * D - B * C > 0;
    // the facet's slope in 3D: its normal, turned to the viewer
    const ux = dx[1] - dx[0], uy = dy[1] - dy[0], uz = Z[q] - Z[p];
    const vx = dx[2] - dx[0], vy = dy[2] - dy[0], vz = Z[w] - Z[p];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const nl = Math.hypot(nx, ny, nz) || 1;
    if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
    const lit = (nx * L[0] + ny * L[1] + nz * L[2]) / (nl * ll) - flat;
    // the clip, grown half a pixel about the centre so neighbours overlap and no seam shows
    const gx = (dx[0] + dx[1] + dx[2]) / 3, gy = (dy[0] + dy[1] + dy[2]) / 3;
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const ox = dx[i] - gx, oy = dy[i] - gy, ol = Math.hypot(ox, oy) || 1;
      const x = dx[i] + (ox / ol) * 0.8, y = dy[i] + (oy / ol) * 0.8;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.clip();
    ctx.setTransform(A, B, C, D, E, F);
    ctx.drawImage((facing ? front : back) as never, 0, 0);
    // a back is plain white paper: it greys less than the picture darkens
    const shade = lit < 0 ? Math.min(facing ? 0.38 : 0.2, -lit * (facing ? 1.2 : 0.6)) : Math.min(0.22, lit * 0.8);
    if (shade > 0.01) {
      ctx.globalAlpha = shade;
      ctx.drawImage((lit < 0 ? dark : light) as never, 0, 0);
    }
    ctx.restore();
  }
}
