// BoilStack: three stacked words in a heavy condensed sans, animated on twelves like hand-made type. The block starts
// as a speck and grows in steps, the letters boiling every frame (widths, slants and baselines jump) while the three
// colours swap between the words; white hand-drawn marks (rays, squiggles, swirls) flicker round it. It jumps to fill
// the frame, each line is painted over with a dry-brush wipe into a solid band that knocks its letters out dark (small
// white arrows show the strokes), it holds boiling, then the bands crop in to the centre one after another and it ends
// on black.
//
// Measured with the kinetograph-taste-clone skill from a 4:5 kinetic-typography poster loop (12 fps, 64 frames):
// every table below is measured on its frames (block width per frame, the
// growth centre, the colour rotation at f11 and f22, the band rows, the wipe fronts, the staggered crop-out). The
// letters are drawn by hand with p5.brush every frame, like the poster's, not set in a font. It runs
// on twelves at any fps: reference frame r = floor(frame * 12 / fps). Laid out in the reference's 1080 x 1350 and
// scaled to the composition.

import React from 'react';
import { AbsoluteFill, GlslShader, random, useCurrentFrame, useVideoConfig } from '@kinetographdev/core';
import { BrushCanvas, type Brush } from '@kinetographdev/p5-brush';
import { layOut } from './hand-letters.js';


const RW = 1080;
const RH = 1350;
const CX = 538; // the block grows, and crops out, about this point (measured)
const CY = 673;
const BAND = 449; // each line's band at full size (rows 0-452, 452-900, 900-1348)
/** A band's box, for laying a row out (poster-boil captions scale it to their rows). */
export const BAND_W = RW;
export const BAND_H = BAND;

export interface BoilStackProps {
  /** Three lines, top to bottom. Short words read best (the reference's are 5, 3 and 5 letters). */
  lines?: [string, string, string];
  /** The three colours, in the order they land on the lines at the end: top, middle, bottom. */
  colors?: [string, string, string];
  /** The ground. */
  ground?: string;
  /** The colour letters turn when their band is painted over; empty takes a near-black of each band's own hue. */
  knockout?: string;
  /** The white marks round the block. */
  marks?: boolean;
  /** The film's frame the animation starts on. */
  from?: number;
}

export const BOIL_DEFAULTS: Required<BoilStackProps> = {
  lines: ['SHAKE', 'THE', 'FLOOR'],
  colors: ['#fa00ec', '#fa4c08', '#fa0644'], // the bands' median colours, picked on the reference's every pixel
  ground: '#0c0c0a',
  knockout: '',
  marks: true,
  from: 0,
};

/** The length of the animation in reference frames (12 fps). */
export const BOIL_FRAMES = 64;

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

/** The block's width per reference frame (px of 1080): two growth steps, then a jump to the full frame. */
const WIDTH: Table = [[0, 0], [1, 44], [2, 104], [3, 140], [4, 150], [5, 156], [6, 160], [8, 160], [9, 152], [10, 140], [11, 188],
  [12, 272], [13, 320], [14, 356], [15, 368], [16, 376], [17, 372], [19, 364], [20, 356], [21, 376], [22, 690], [23, 840], [24, 900],
  [25, 950], [26, 972], [27, 1000], [28, 1040], [29, 1080]];
/** Each word's own width once it is full size (px of 1080): the middle word stays narrower until its band is painted. */
const FULL = [1004, 684, 1016];
/** The jump to full size, a line at a time: each line's width per reference frame from f21 (the top line leads). */
const JUMP: [Table, Table, Table] = [
  [[21, 376], [22, 692], [23, 840], [24, 908], [25, 948], [26, 972], [27, 1000], [28, 1004]],
  [[21, 230], [22, 212], [23, 460], [24, 584], [25, 644], [26, 680], [27, 684]],
  [[21, 376], [22, 244], [23, 372], [24, 700], [25, 860], [26, 960], [27, 980], [28, 1016]],
];
/** Which colour (index into `colors`) each line wears: the colours rotate at f11 and at f22. */
const ROTATION = (r: number): [number, number, number] => (r < 11 ? [1, 2, 0] : r < 22 ? [2, 0, 1] : [0, 1, 2]);
/** The wipes: the painted fraction of each band per reference frame (top and bottom from the left, middle from the right). */
const WIPES: [Table, Table, Table] = [
  [[32, 0], [33, 0.89], [34, 1]],
  [[33, 0], [34, 0.25], [35, 0.78], [36, 0.96], [37, 1]],
  [[35, 0], [36, 0.35], [37, 0.75], [38, 1]],
];
const FROM_RIGHT = [false, true, false];
/** The crop-out: each band's scale about the block centre, the middle one a frame behind the top, the bottom two. */
const OUT: Table = [[50, 1], [51, 0.995], [52, 0.978], [53, 0.941], [54, 0.878], [55, 0.767], [56, 0.541], [57, 0.1], [58, 0.1], [59, 0]];
/** Each word's lean (deg): the top and bottom lines lean forward 13, the middle one back 12. */
const LEAN = [13, -12, 13];

const h01 = (key: string) => random(key);
/** A near-black of a colour's own hue (the reference's knockouts: #28010c on magenta, #2c0400 on orange, #1c0000 on red). */
export const knockOf = (c: string) => {
  const n = parseInt(c.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return `#${[r * 0.16, g * 0.02 + 1, b * 0.05].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
};

/** One word, its letters boiling: each letter's width, slant and baseline drawn afresh every reference frame. */
/** One word, drawn by hand with a flat brush (p5.brush): centre lines per letter, nudged afresh every reference frame
 *  and stretched to the word's box, the whole word leaning its line's way. Letters glow in their colour (a soft halo as
 *  on the poster's print), until a band paints over them and they turn to the band's dark. */
export const Word: React.FC<{ text: string; r: number; line: number; color: string; knock: string; dark: (x: number) => boolean; w: number; h: number }> = ({
  text, r, line, color, knock, dark, w, h,
}) => {
  const PAD = 40;
  const lean = Math.tan((LEAN[line]! * Math.PI) / 180);
  const anyLit = text.split('').some((_, i) => !dark((i + 0.5) / text.length));
  return (
    <div style={{ position: 'absolute', left: -PAD, top: -PAD, filter: `brightness(${BRUSH_GAIN})${anyLit ? ` drop-shadow(0 0 2.5px ${color}aa)` : ''}` }}>
      <BrushCanvas
        seed={`boil-${line}-${r}`}
        width={Math.ceil(w + PAD * 2)}
        height={Math.ceil(h + PAD * 2)}
        origin="top-left"
        draw={(b) => {
          ensureBrush(b);
          const { strokes, stem } = layOut(text, w, h, (k) => h01(`${k}-${r}`), 0.42, `w${line}`);
          for (const st of strokes) {
            // letters print a shade under the bands (picked: #ee4812 letters on #fa4c08 bands)
            b.set('poster', brushIn(dark(st.cx) ? knock : color, dark(st.cx) ? 1 : 0.955), (stem * 1.05) / 10);
            // lean: shear x by the height above the baseline
            const pts = st.pts.map(([x, y]) => [PAD + x + (h - y) * lean * 0.5 - h * lean * 0.25, PAD + y]);
            // two passes make the marker solid, the second a little off the first so the edges go lumpy
            for (let pass = 0; pass < 3; pass++) {
              const q = pass ? pts.map(([x, y], k) => [x + (h01(`p${line}-${r}-${k}-${st.letter}`) - 0.5) * stem * 0.25, y]) : pts;
              if (q.length === 2) b.line(q[0]![0], q[0]![1], q[1]![0], q[1]![1]);
              else b.spline(q, 0.25);
            }
          }
        }}
      />
    </div>
  );
};

/** p5.brush's marks come out darker than the colour asked for, the low channels most (fitted on the render: out =
 *  0.755 * in^1.25, per channel, in 0..1). BRUSH_GAIN lifts the canvas back; brushIn() asks for the colour that lands on
 *  the wanted one after both, so hues keep their low channels (orange's green, red's blue). */
const BRUSH_GAIN = 1.25;
const brushIn = (c: string, k = 1) => {
  const n = parseInt(c.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const want = Math.min(1, (v * k) / 255 / BRUSH_GAIN / 0.755);
    return Math.round(255 * Math.min(1, want ** 0.8));
  });
  return `rgb(${ch.join(',')})`;
};

let brushReady = false;
/** The poster brush: a flat, solid marker with a slightly wandering width and no soft tips. */
const ensureBrush = (b: Brush) => {
  if (brushReady) return;
  // a square tip, so stems end square-cut like the poster's
  b.add('poster', {
    type: 'custom', weight: 10, scatter: 0.5, opacity: 255, spacing: 0.12, pressure: [1.12, 0.93, 1.06], markerTip: false, rotate: 'natural',
    tip: (m: Brush) => { m.fill(0); m.noStroke(); m.rect(-46, -46, 92, 92); },
  });
  brushReady = true;
};

/** The dry-brush band: horizontal strokes of slightly different reach, so the front is ragged. */
export const Band: React.FC<{ t: number; fromRight: boolean; color: string; line: number; r: number; dots: number }> = ({ t, fromRight, color, line, r, dots }) => {
  if (t <= 0) return null;
  const strokes = 28;
  return (
    <>
      {Array.from({ length: strokes }, (_, i) => {
        const reach = t >= 1 ? 1.05 : t + (h01(`br${line}-${i}-${r}`) - 0.5) * 0.12 - (i % 5 === 0 ? 0.05 : 0);
        const w = Math.max(0, Math.min(1.05, reach)) * RW;
        return (
          <div key={i} style={{ position: 'absolute', top: (i * BAND) / strokes, height: BAND / strokes + 1, width: w, [fromRight ? 'right' : 'left']: 0, background: color }} />
        );
      })}
      {/* the print's halftone screen, pitch 5 px: heavy on the orange, faint on the others (picked: spread 13.8 vs 4-5) */}
      <div style={{ position: 'absolute', top: 0, height: BAND, width: `${Math.min(1, t) * 100}%`, [fromRight ? 'right' : 'left']: 0,
        background: `radial-gradient(circle, rgba(0,0,0,${dots}) 1px, rgba(0,0,0,0) 1.7px) 0 0 / 5px 5px` }} />
    </>
  );
};

export const Arrow: React.FC<{ x: number; y: number; dx: number; dy: number }> = ({ x, y, dx, dy }) => {
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const hx = x + dx;
  const hy = y + dy;
  return (
    <path
      d={`M${x} ${y} L${hx} ${hy} M${hx - ux * 16 - uy * 9} ${hy - uy * 16 + ux * 9} L${hx} ${hy} L${hx - ux * 16 + uy * 9} ${hy - uy * 16 - ux * 9}`}
      fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round"
    />
  );
};

/** The white marks round the block for a reference frame: rays off the top, squiggles across the middle, a swirl by the
 *  bottom, a few dots; redrawn every frame. */
export const Marks: React.FC<{ r: number; box: { x0: number; y0: number; x1: number; y1: number } }> = ({ r, box }) => {
  const on = (r >= 4 && r <= 8) || (r >= 13 && r <= 15) || (r >= 22 && r <= 27);
  if (!on) return null;
  const w = box.x1 - box.x0;
  const hgt = box.y1 - box.y0;
  const paths: React.ReactNode[] = [];
  const k = (s: string) => h01(`m${r}-${s}`);
  // rays: short strokes standing out from the top edge and the sides
  const rays = r >= 22 ? 9 : 7;
  for (let i = 0; i < rays; i++) {
    const a = -Math.PI * (0.1 + (0.8 * i) / (rays - 1)) + (k(`a${i}`) - 0.5) * 0.25;
    const cx = (box.x0 + box.x1) / 2;
    const cy = r >= 22 ? box.y0 + hgt * 0.18 : (box.y0 + box.y1) / 2;
    const rx = w * (r >= 22 ? 0.5 : 0.62);
    const ry = r >= 22 ? hgt * 0.28 : hgt * 0.62;
    const l = (r >= 22 ? 60 : 22) * (0.7 + 0.6 * k(`l${i}`));
    const x = cx + Math.cos(a) * rx;
    const y = cy + Math.sin(a) * ry;
    paths.push(<path key={`r${i}`} d={`M${x} ${y} l${Math.cos(a) * l} ${Math.sin(a) * l}`} stroke="#fff" strokeWidth={r >= 22 ? 4 : 2.2} strokeLinecap="round" />);
  }
  // squiggle across the middle line
  if ((r >= 13 && r <= 15) || r === 24 || r === 25) {
    const y = box.y0 + hgt * (r >= 22 ? 0.55 : 0.62);
    const amp = r >= 22 ? 34 : 12;
    let d = `M${box.x0 - w * 0.08} ${y}`;
    for (let i = 1; i <= 16; i++) d += ` L${box.x0 - w * 0.08 + (w * 1.16 * i) / 16} ${y + Math.sin(i * 1.7 + r) * amp * (0.6 + 0.8 * k(`s${i}`))}`;
    paths.push(<path key="sq" d={d} fill="none" stroke="#fff" strokeWidth={r >= 22 ? 3.5 : 2} strokeLinecap="round" strokeLinejoin="round" />);
  }
  // swirl by the bottom line
  if (r >= 26 || r === 14) {
    const sx = box.x0 + w * (0.3 + 0.4 * k('sw'));
    const sy = box.y0 + hgt * 0.85;
    let d = '';
    for (let i = 0; i <= 30; i++) {
      const t = i / 30;
      const a = t * Math.PI * 3.2;
      const rr = (r >= 22 ? 46 : 16) * t;
      d += `${i ? 'L' : 'M'}${sx + Math.cos(a) * rr} ${sy + Math.sin(a) * rr}`;
    }
    paths.push(<path key="sw" d={d} fill="none" stroke="#fff" strokeWidth={r >= 22 ? 3.5 : 2} strokeLinecap="round" />);
  }
  return <>{paths}</>;
};

/** The ground: a warm near-black with a fine grain and white specks of dust, measured on the reference's empty frames
 *  (measure.py grain: mean luma 9.9, spread 5.5, specks 0.17%, grain size 0.54), redrawn on twos in a loop of six. */
const GRAIN = `
precision highp float;
uniform vec2 u_res; uniform vec3 u_ground; uniform float u_seed;
float h(vec2 p){ p = fract(p * vec2(123.34, 456.21) + u_seed * 17.13); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y); }
void main(){
  vec2 p = gl_FragCoord.xy;
  float g = (vn(p / 1.8) - 0.5) * 0.085 + (h(p) - 0.5) * 0.03;
  vec2 cell = floor(p / 2.0);
  float speck = step(0.9983, h(cell + 3.7)) * (0.16 + 0.45 * h(cell + 9.1));
  vec3 c = u_ground + vec3(g, g, g * 0.85) + vec3(speck);
  gl_FragColor = vec4(c, 1.0);
}`;
const hexRgb = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255) as [number, number, number];
const Grain: React.FC<{ width: number; height: number; ground: string; seed: number }> = ({ width, height, ground, seed }) => (
  <GlslShader id="boil-grain" width={width} height={height} fragment={GRAIN} uniforms={{ u_res: [width, height], u_ground: hexRgb(ground), u_seed: seed }} />
);

export const BoilStack: React.FC<BoilStackProps> = (props) => {
  const p = { ...BOIL_DEFAULTS, ...props };
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const r = Math.floor(((frame - p.from) * 12) / fps);
  if (r < 0 || r >= BOIL_FRAMES) return <AbsoluteFill style={{ background: p.ground }} />;

  const rot = ROTATION(r);
  const s = tbl(r, WIDTH) / RW;
  // the block: three bands of the full frame, scaled about the growth centre, with a little jitter while it is small
  const jx = r < 28 ? (h01(`jx${r}`) - 0.5) * 8 : 0;
  const jy = r < 28 ? (h01(`jy${r}`) - 0.5) * 8 : 0;
  const box = { x0: CX - CX * s + jx, y0: CY - CY * s + jy, x1: CX + (RW - CX) * s + jx, y1: CY + (RH - CY) * s + jy };
  // dust on the ground: a new pattern every two reference frames, six patterns looping every twelve
  const dustKey = Math.floor((r % 12) / 2);

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Grain width={width} height={height} ground={p.ground} seed={dustKey} />
      <div style={{ position: 'absolute', left: 0, top: 0, width: RW, height: RH, transform: `scale(${width / RW}, ${height / RH})`, transformOrigin: '0 0' }}>
        {s > 0 &&
          p.lines.map((text, line) => {
            const color = p.colors[rot[line]!]!;
            if (r < 1 + line) return null; // the words enter a frame apart
            const wipe = r >= 30 ? tbl(r, WIPES[line]!) : 0;
            const out = r >= 50 ? tbl(r - line, OUT) : 1;
            if (out <= 0) return null;
            // the line's scale: the block's while it grows, then its own through the jump (the top line leads); each word
            // keeps its own width at full size (the bands are full width; the middle word's letters span 684 of them)
            const wordW = FULL[line]!;
            const sc = r < 21 ? s : r < 29 ? tbl(r, JUMP[line]!) / wordW : 1;
            const top = line * (BAND + 1.5);
            const fromRight = FROM_RIGHT[line]!;
            const dark = (x: number) => (wipe >= 1 ? true : fromRight ? x > 1 - wipe : x < wipe);
            // the crop-out: the band's rect shrinks about the block centre and its content rides the rect's centre,
            // full size, cropped by it
            const rx0 = CX + (0 - CX) * out;
            const ry0 = CY + (top - CY) * out;
            const rw = RW * out;
            const rh = BAND * out;
            const shiftX = rx0 + rw / 2 - RW / 2;
            const shiftY = ry0 + rh / 2 - (top + BAND / 2);
            return (
              <div key={line} style={r >= 50 ? { position: 'absolute', left: rx0, top: ry0, width: rw, height: rh, overflow: 'hidden' } : { position: 'absolute', left: 0, top: 0 }}>
              <div
                style={{
                  position: 'absolute', left: r >= 50 ? -rx0 + shiftX : 0, top: r >= 50 ? top - ry0 + shiftY : top, width: RW, height: BAND,
                  transform: r >= 50 ? undefined : `translate(${jx}px, ${jy}px) scale(${sc})`, transformOrigin: `${CX}px ${CY - top}px`,
                }}
              >
                <Band t={wipe} fromRight={fromRight} color={color} line={line} r={r} dots={rot[line] === 1 ? 0.32 : 0.06} />
                <div style={{ position: 'absolute', left: (RW - wordW) / 2, top: 6 }}>
                  <Word text={text} r={r} line={line} color={color} knock={p.knockout || knockOf(color)} dark={wipe > 0 ? dark : () => false} w={wordW} h={BAND - 12} />
                </div>
              </div>
              </div>
            );
          })}
        <svg width={RW} height={RH} style={{ position: 'absolute', left: 0, top: 0 }}>
          {p.marks && <Marks r={r} box={box} />}
          {/* arrows on the wipes and the crop-out */}
          {r >= 32 && r <= 33 && <Arrow x={520} y={95} dx={110} dy={0} />}
          {r >= 34 && r <= 35 && <Arrow x={1010} y={590} dx={-110} dy={0} />}
          {r >= 36 && r <= 38 && <Arrow x={560 + (r - 36) * 120} y={1060} dx={110} dy={0} />}
          {r >= 52 && r <= 56 && (
            <>
              <Arrow x={box.x0 + 40 + (r - 52) * 60} y={70 + (r - 52) * 70} dx={60} dy={60} />
              <Arrow x={990 - (r - 52) * 60} y={1290 - (r - 52) * 70} dx={-60} dy={-60} />
              <Arrow x={1050 - (r - 52) * 70} y={620} dx={-90} dy={0} />
            </>
          )}
        </svg>
      </div>
    </AbsoluteFill>
  );
};
