// A photo turned to paper. `<CutOut>`: the subject (a picture with alpha) on a torn white border, with a few creases
// and a tight shadow. `<FoldOut>`: the same cut-out folded up small, opening out flap by flap in stop-motion steps.
import React from 'react';
import { Canvas, Layer, dropShadow, shader, staticFile, useCurrentFrame, useVideoConfig } from '@kinetographdev/core';
import { probeMedia } from '@kinetographdev/core/media-utils';
import { drawLine } from './scrap.js';
import { lineOf, type ScraplineProps } from './scrapline.js';
import { outlines, readMask, resample, type Ring } from './trace.js';
import { EDGES, STOCKS, drawFolded, sheetOf, type Edge, type EdgeStyle, type Fold, type SheetLook, type Stock } from './sheet.js';

export interface CutOutProps {
  /** The subject: a picture with alpha (`staticFile('me.png')`), its background already removed. */
  src: string;
  /** Layer id, if more than one is on screen. Default `cut-out`. */
  id?: string;
  /** Centre of the picture on the canvas. Default the middle. */
  x?: number;
  y?: number;
  /** Drawn width of the picture, px (the height follows). Default 62% of the canvas width. */
  width?: number;
  /** An edge style, or a style with changes: `{ style: 'torn', thickness: 0.04, intensity: 1.4, detail: 0.6 }`. */
  edge?: EdgeStyle | (Partial<Edge> & { style?: EdgeStyle });
  /** The paper: `white` (default), `newsprint`, `kraft`, `binder` or `cardboard`, from the plugin's scans. */
  stock?: Stock;
  /** Colours over the stock's: the border's paper, the sheet's back, the torn fringe; and a picture under public/
   *  multiplied over the paper. */
  paper?: string;
  back?: string;
  fringe?: string;
  texture?: string;
  /** Creases left across the flat sheet (picture included), 0 (none) to 1, from the plugin's crumpled-paper scan.
   *  Default 0.45. */
  creases?: number;
  /** Shadow strength, 0 (none) to about 2. Default 1. */
  shadow?: number;
  /** Edge redraws per second (the tear changes, as stop motion). Default 0: held. */
  boil?: number;
  /** Another tear, another crumple. */
  seed?: string | number;
  /** Alpha (0..255) that counts as the subject. Default 128. */
  threshold?: number;
  /** A hand-drawn line round the cut-out, as `<Scrapline>` draws it: marker, pencil, crayon, scribble or brush, or one
   *  with changes (`{ style: 'pencil', width: 6 }`). Default none. CutOut only; a FoldOut ignores it. */
  line?: ScraplineProps['line'];
  /** The line's colour. Default near-black. */
  lineColor?: string;
  /** Gap between the paper's edge and the line, px. Default 14. */
  lineGap?: number;
}

export interface FoldOutProps extends CutOutProps {
  /** Frames before it starts to open (it waits as a ball). Default 0. */
  delay?: number;
  /** Frames from folded to flat. Default 0.7 s. */
  duration?: number;
  /** Stop-motion rate while it opens: new positions this many times a second. Default 10. */
  steps?: number;
  /** Folds in the sheet, opened last first; each roughly halves it. Default 3. */
  folds?: number;
  /** The packet's size against the flat sheet, before the folds shrink it. Default 0.95. */
  ball?: number;
  /** How far the packet's facets are knocked about, besides the folds. Default 0.004. */
  crumple?: number;
  /** Turn of the packet, degrees, unwound as it opens. Default 14. */
  turn?: number;
  /** Facets across the sheet's longer side (finer bends the flaps more smoothly, costs more). Default 12. */
  cells?: number;
}

const edgeOf = (edge: CutOutProps['edge']): Edge => {
  if (!edge) return EDGES.torn;
  if (typeof edge === 'string') return EDGES[edge];
  return { ...EDGES[edge.style ?? 'torn'], ...edge } as Edge;
};

/** Placement, look and sheet shared by both components. */
function useSheet(p: CutOutProps) {
  const { fps, width: W, height: H } = useVideoConfig();
  const frame = useCurrentFrame();
  const { width: iw, height: ih } = probeMedia(p.src, { cache: true });
  const dw = p.width ?? W * 0.62;
  const dh = (dw * ih) / iw;
  const edge = edgeOf(p.edge);
  const stock = STOCKS[p.stock ?? 'white'];
  const look: SheetLook = {
    edge,
    ...stock,
    paper: p.paper ?? stock.paper,
    back: p.back ?? stock.back,
    fringe: p.fringe ?? stock.fringe,
    texture: p.texture ? staticFile(p.texture) : undefined,
  };
  const sheet = sheetOf(p.src, dw, dh, edge, p.threshold ?? 128);
  const boilStep = p.boil ? Math.floor((frame * p.boil) / fps + 1e-9) : 0;
  const key = `${p.seed ?? 0}-${boilStep}`;
  return { fps, W, H, frame, sheet, look, key, cx: p.x ?? W / 2, cy: p.y ?? H / 2 };
}

/** Crumpled paper: a network of crease lines (the edges of cellular noise, three sizes) read as a height field, lit
 *  from the top left and multiplied over the layer's colour, alpha kept. `cell` is the largest facet in px,
 *  `strength` 0..1, `seed` moves the pattern. Screen space: a new seed per stop-motion step re-crumples it. */
// The plugin draws its creases from scans (`creases`); this procedural stand-in is kept for a look without them.
export const wrinkles = (strength: number, cell: number, seed: number) =>
  shader({
    code: `fn h2(p: vec2<f32>) -> vec2<f32> {
  let q = vec2<f32>(dot(p, vec2<f32>(127.1, 311.7)), dot(p, vec2<f32>(269.5, 183.3)));
  return fract(sin(q) * 43758.5453);
}
fn edges(p: vec2<f32>) -> f32 {
  let i = floor(p);
  let f = fract(p);
  var d1 = 8.0;
  var d2 = 8.0;
  for (var y = -1; y <= 1; y++) {
    for (var x = -1; x <= 1; x++) {
      let g = vec2<f32>(f32(x), f32(y));
      let r = g + h2(i + g) - f;
      let d = dot(r, r);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
    }
  }
  return sqrt(d2) - sqrt(d1);
}
fn height(px: vec2<f32>) -> f32 {
  let p = px / u.cell + vec2<f32>(u.seed, u.seed * 0.7);
  return edges(p) + 0.3 * edges(p * 2.7 + 5.1) + 0.08 * edges(p * 6.1 + 9.7);
}
fn effect(px: vec2<f32>) -> vec4<f32> {
  let c = layer(px);
  if (c.a < 0.004 || u.strength <= 0.0) { return c; }
  let e = 1.5;
  let hx = height(px + vec2<f32>(e, 0.0)) - height(px - vec2<f32>(e, 0.0));
  let hy = height(px + vec2<f32>(0.0, e)) - height(px - vec2<f32>(0.0, e));
  let n = normalize(vec3<f32>(-hx * u.cell * 0.12, -hy * u.cell * 0.12, 1.0));
  let l = normalize(vec3<f32>(-0.5, -0.6, 0.65));
  let k = clamp(1.0 + (dot(n, l) - l.z) * 1.2 * u.strength, 0.72, 1.12);
  return vec4<f32>(min(c.rgb * k, vec3<f32>(c.a)), c.a);
}`,
    uniforms: { strength, cell, seed },
  });

/** A shadow a few px under thin paper; `lift` raises the sheet off the desk (a ball sits higher). */
const shadowOf = (strength: number, size: number, lift = 0) =>
  strength > 0
    ? [dropShadow({ x: size * 0.002 * (1 + lift), y: size * 0.006 * (1 + 2 * lift), blur: size * 0.008 * (1 + 2.5 * lift), color: `rgba(0,0,0,${Math.min(0.9, 0.32 * strength)})` })]
    : [];

const lines = new Map<string, Ring[]>();

/** The line's path round a sheet: the picture's alpha grown past the border by `gap`, in sheet px. */
function lineRings(src: string, dw: number, dh: number, pad: number, distance: number, threshold: number, spacing: number): Ring[] {
  const key = JSON.stringify([src, Math.round(dw), Math.round(dh), pad, distance.toFixed(1), threshold, spacing]);
  let r = lines.get(key);
  if (!r) {
    const scale = Math.max(2, Math.round(Math.max(dw, dh) / 360));
    const mask = readMask({ src, mode: 'alpha' }, 0, 30, Math.round(dw), Math.round(dh), scale);
    r = outlines(mask, threshold, distance, scale)
      .map((l) => resample(l.map(([x, y]): [number, number] => [x + pad, y + pad]), spacing))
      .filter((x): x is Ring => x !== null);
    lines.set(key, r);
  }
  return r;
}

export function CutOut(props: CutOutProps) {
  const { fps, W, H, frame, sheet, look, key, cx, cy } = useSheet(props);
  const fold: Fold = { open: 1, folds: 4, ball: 1, crumple: 0, turn: 0, creases: 0, cells: 16 };
  const size = Math.max(sheet.w, sheet.h);
  const creased: SheetLook = { ...look, wrinkle: { light: props.creases ?? 0.45, heavy: 0, key } };
  const id = props.id ?? 'cut-out';
  const paper = <Canvas width={W} height={H} draw={(ctx) => drawFolded(ctx, sheet, props.src, creased, key, fold, cx, cy)} />;
  if (!props.line) return <Layer id={id} effects={shadowOf(props.shadow ?? 1, size)}>{paper}</Layer>;
  // the line sits outside the torn edge (which reaches about 0.6 of the border past it), off the paper's shadow
  const st = lineOf(props.line);
  const step = Math.floor((frame * st.boil) / fps + 1e-9);
  const ring = lineRings(props.src, sheet.dw, sheet.dh, sheet.pad, sheet.border * 1.6 + (props.lineGap ?? 14), props.threshold ?? 128, st.grain ? 3 : 5);
  const ox = cx - sheet.w / 2, oy = cy - sheet.h / 2;
  return (
    <Layer id={id}>
      <Layer id={`${id}-paper`} effects={shadowOf(props.shadow ?? 1, size)}>{paper}</Layer>
      <Canvas
        id={`${id}-line`}
        width={W}
        height={H}
        draw={(ctx) => {
          ctx.translate(ox, oy);
          drawLine(ctx, ring, st, props.lineColor ?? '#141414', `${props.seed ?? 0}-line-${step}`);
        }}
      />
    </Layer>
  );
}

/** How open the sheet is at `frame`: 0 (folded) to 1 (flat), moved only on stop-motion steps. */
export function openAt(frame: number, fps: number, delay: number, duration: number, steps: number): number {
  const hold = fps / steps;
  const t = Math.floor(Math.max(0, frame - delay) / hold + 1e-9) * hold;
  const p = Math.min(1, t / Math.max(1, duration));
  // the first flaps (the smallest, on the smallest packet) go quicker
  return Math.pow(p, 0.75);
}

export function FoldOut(props: FoldOutProps) {
  const { fps, W, H, frame, sheet, look, key, cx, cy } = useSheet(props);
  const delay = props.delay ?? 0, steps = props.steps ?? 10;
  const open = openAt(frame, fps, delay, props.duration ?? Math.round(fps * 0.7), steps);
  const fold: Fold = {
    open,
    folds: props.folds ?? 3,
    ball: props.ball ?? 0.95,
    crumple: props.crumple ?? 0.004,
    turn: props.turn ?? 14,
    creases: props.creases ?? 0.45,
    cells: props.cells ?? 12,
  };
  // the heavy crease map in the packet, giving way to the light one as it opens; the crease maps sit on the sheet,
  // so they fold with it, and the flat sheet keeps `creases` of the light one
  const size = Math.max(sheet.w, sheet.h);
  const crushed = Math.pow(1 - open, 0.7);
  const creased: SheetLook = { ...look, wrinkle: { light: fold.creases + (1 - fold.creases) * crushed * 0.6, heavy: crushed, key } };
  return (
    <Layer id={props.id ?? 'fold-out'} effects={shadowOf(props.shadow ?? 1, size, 1 - open)}>
      <Canvas width={W} height={H} draw={(ctx) => drawFolded(ctx, sheet, props.src, creased, key, fold, cx, cy)} />
    </Layer>
  );
}
