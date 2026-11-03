// One explainer shot in the collage taste: the measured choreography of the reference reel (see
// tastes/collage/demo), with reading holds added so a story can be told in it.
//
// A beat, in the reference's order: a sheet (newspaper page, map, manuscript) at half size grows under everything;
// up to three torn yellow labels type on; a wide picture rises onto a ledge while a black-and-white portrait slides in
// from the side; [hold A: the labels are read]; the camera dollies in, the labels fly off past the lens and the portrait
// comes into focus; a torn charcoal strip types two lines in white; an optional script word fades in under it; [hold B:
// the strip is read]; a small pull-back. Cut to the next beat with `Punch` (the hole torn through this one).
//
// All the camera curves are the reference's measured keys (in its frames). During the holds the reference's own drift
// keeps running, slowed down, so nothing freezes; the type always types at the reference's speed, in real frames.
import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { Depth, GridOverlay, Highlighter, TornLabel, TornStrip, type LabelSize } from './pieces.js';
import { tab, boxAt, type Box4 } from './time.js';
import { didoneWidth } from './tokens.js';

/* ---------- the reference's curves, in its frames (spec section 2) ---------- */

const NEWS_S: [number, number][] = [[0, 0.5], [2, 0.555], [4, 0.595], [6, 0.62], [8, 0.635], [10, 0.645], [15, 0.655], [19, 0.655], [21, 0.675], [23, 0.675], [25, 0.695], [27, 0.685], [29, 0.72], [31, 0.745], [33, 0.785], [35, 0.835], [37, 0.88], [40, 0.915], [42, 0.94], [44, 0.96], [46, 0.975], [48, 0.985], [50, 0.99], [52, 0.995], [56, 0.995], [58, 1], [71, 1], [73, 0.995], [75, 0.99], [77, 0.975]];
const NEWS_B: [number, number][] = [[2, 10], [4, 6], [6, 8], [10, 8], [15, 10], [19, 10], [21, 12], [23, 16], [25, 20], [27, 16], [29, 12], [31, 10], [33, 8], [35, 6], [37, 4], [40, 2], [42, 2], [44, 1], [54, 1], [58, 0], [69, 0], [71, 1], [77, 1]];
const MAN_S: [number, number][] = [[8, 0.5], [15, 0.505], [17, 0.5125], [19, 0.505], [23, 0.505], [25, 0.5125], [27, 0.5425], [29, 0.5525], [31, 0.585], [33, 0.65], [35, 0.73], [37, 0.7925], [40, 0.845], [42, 0.89], [44, 0.9275], [46, 0.955], [48, 0.975], [50, 0.9875], [52, 0.9925], [54, 0.995], [56, 0.9975], [58, 1], [63, 1], [65, 1.0025], [69, 1.005], [71, 1.005], [73, 0.9975], [75, 0.99], [77, 0.955]];
const MAN_X: [number, number][] = [[8, -0.8], [10, -0.55], [13, -0.35], [15, -0.244], [17, -0.177], [19, -0.125], [21, -0.083], [23, -0.053], [25, -0.034], [27, -0.021], [29, -0.007], [31, -0.002], [33, 0]];
const MAN_B: [number, number][] = [[8, 10], [15, 10], [17, 12], [19, 10], [21, 10], [23, 14], [25, 16], [27, 14], [29, 10], [31, 6], [33, 6], [35, 4], [48, 3.5], [50, 3], [54, 2], [58, 0], [63, 0], [69, 2], [73, 4], [75, 6], [77, 6]];
const WIDE_DY: [number, number][] = [[6, 0.13], [10, 0.1], [12, 0.07], [15, 0.048], [17, 0.034], [19, 0.024], [21, 0.011], [23, 0.004], [27, -0.02], [29, -0.022], [31, 0]];
const REFL: [number, number][] = [[6, 0], [8, 0.4], [10, 1], [12, 1], [15, 0.75], [17, 0.55], [19, 0.42], [21, 0.12], [27, 0.05], [29, 0]];
const STRIP_S: [number, number][] = [[35, 0.5], [37, 0.566], [40, 0.636], [42, 0.719], [44, 0.794], [46, 0.842], [48, 0.897], [50, 0.938], [52, 0.959], [54, 0.969], [56, 0.974], [58, 0.986], [63, 0.995], [65, 1], [69, 1], [71, 0.988], [73, 0.969], [75, 0.938], [77, 0.865]];
const STRIP_B: [number, number][] = [[35, 4], [37, 3], [40, 3], [42, 1.5], [44, 0], [73, 0], [75, 2], [77, 3]];
const LABEL_B: [number, number][] = [[29, 0], [31, 2], [33, 6], [35, 12], [37, 20], [40, 26]];
/** the labels' fly-off: a scale about the screen centre (the boxes' measured widths over their f15 widths) */
const LABEL_FLY: [number, number][] = [[15, 1], [17, 1.031], [19, 1.047], [21, 1.082], [23, 1.089], [25, 1.132], [27, 1.206], [29, 1.268], [31, 1.416], [33, 1.899], [35, 2.296], [37, 3.19], [40, 4.2]];
const EYE: [number, Box4][] = [[10, [0, 0.381, 0.135, 0.425]], [12, [0.081, 0.376, 0.161, 0.405]], [21, [0.376, 0.375, 0.561, 0.426]], [27, [0.407, 0.366, 0.644, 0.421]], [29, [0.433, 0.358, 0.665, 0.416]], [31, [0.48, 0.356, 0.683, 0.416]], [33, [0.543, 0.352, 0.709, 0.407]], [35, [0.596, 0.347, 0.733, 0.396]], [37, [0.65, 0.331, 0.757, 0.386]], [40, [0.693, 0.318, 0.772, 0.377]], [42, [0.728, 0.308, 0.791, 0.369]], [44, [0.752, 0.304, 0.8, 0.361]], [46, [0.748, 0.3, 0.811, 0.36]], [50, [0.76, 0.3, 0.8, 0.355]]];
const SEE: [number, number][] = [[61, 0], [62, 0.35], [63, 0.69], [64, 1], [72, 1], [73, 0.89], [74, 0.74], [75, 0.62], [76, 0.63], [77, 0.7]];

/** The labels' rest rows: left edge, top and height (fractions), and the frame each starts typing. */
const ROWS: { x0: number; y0: number; h: number; start: number }[] = [
  { x0: 0.13, y0: 0.38, h: 0.056, start: 4 },
  { x0: 0.554, y0: 0.456, h: 0.062, start: 6 },
  { x0: 0.206, y0: 0.555, h: 0.058, start: 10 },
];
/** characters a second at 25 fps: labels 1.05 a frame, the strip 0.72 a frame (measured), both starting at two */
const LABEL_RATE = 1.05, STRIP_RATE = 0.72;

export const DEFAULT_HOLDS: [number, number] = [25, 45];
/** A beat's length in frames: the reference's 78, less the drift it slows, plus the two holds. */
export const beatFrames = (holds: [number, number] = DEFAULT_HOLDS) => 61 + holds[0] + holds[1];

/** The reference frame a beat frame shows: 1:1, except the drift over 17–21 is stretched across hold A and 58–71
 *  across hold B. */
export const refTime = (t: number, [a, b]: [number, number] = DEFAULT_HOLDS) => {
  if (t <= 17) return t;
  if (t <= 17 + a) return 17 + (4 * (t - 17)) / a;
  const t58 = 54 + a;
  if (t <= t58) return t - a + 4;
  if (t <= t58 + b) return 58 + (13 * (t - t58)) / b;
  return 71 + (t - t58 - b);
};

export interface BeatPicture {
  src: string;
  /** width over height of the file */
  aspect: number;
  filter?: string;
}

export interface BeatProps {
  /** unique among beats on screen at once (two overlap during a Punch) */
  id: string;
  /** this beat's held frame (frames since it started, stepped to images) */
  t: number;
  /** the sheet under everything, laid out at scale 1: a PrintedPage or a PaperSheet */
  back: React.ReactNode;
  /** the black-and-white cut-out that slides in from `side`, its height 0.72 H by default */
  portrait?: BeatPicture & { side?: 'left' | 'right'; height?: number; top?: number; centre?: number };
  /** a wide cut-out standing on a ledge behind the portrait (left edge and width in px at scale 1) */
  wide?: BeatPicture & { left?: number; width?: number; ledge?: number; mirror?: boolean; reflect?: boolean };
  /** up to three label words, typed in order (keep the second to six letters or so; it sits right of centre) */
  labels: string[];
  /** the strip's two lines, right-aligned (up to about 14 letters each) */
  strip: [string, string];
  /** a handwritten word or two under the strip */
  script?: string;
  /** the yellow highlighter sweep over the portrait */
  highlight?: boolean;
  holds?: [number, number];
  base?: string;
}

export const Beat: React.FC<BeatProps> = ({ id, t, back, portrait, wide, labels, strip, script, highlight = false, holds = DEFAULT_HOLDS, base = 'collage-textures' }) => {
  const { width: W, height: H } = useVideoConfig();
  if (t < 0) return null;
  const c = refTime(t, holds);
  const right = portrait?.side === 'right';
  const flip = (x: number) => (right ? -x : x);

  /* labels: rest boxes sized to their words, the paper running ahead of the letters, flying off about the centre */
  const fly = tab(LABEL_FLY, c);
  const labelEls = c < 41 ? labels.slice(0, 3).map((text, i) => {
    const row = ROWS[i]!;
    if (t < row.start) return null;
    let h = row.h * H;
    const pad = (k: number) => (h / 1.95) * k;
    const size = (n: number) => didoneWidth(text.slice(0, n), h / 1.95 / 0.7, 0.01);
    let full = pad(0.45) + size(text.length) + pad(0.5);
    // too long for the frame: shrink the row's height until it fits within 0.94 W
    if (full > 0.94 * W) { h *= (0.94 * W) / full; full = 0.94 * W; }
    const x0 = Math.max(0.03, Math.min(row.x0, 0.97 - full / W));
    const typed = Math.min(text.length, 2 + (t - row.start) * LABEL_RATE);
    const shown = Math.min(text.length, Math.floor(typed) + 1);
    const wNow = typed >= text.length ? full : pad(0.45) + size(shown) + pad(0.5);
    const rest: Box4 = [x0, row.y0, x0 + wNow / W, row.y0 + h / H];
    const box = rest.map((v) => 0.5 + (v - 0.5) * fly) as Box4;
    const kind: LabelSize = full / h < 2.7 ? 'short' : full / h < 3.6 ? 'mid' : 'long';
    return <TornLabel key={i} id={`${id}-l${i}`} text={text} size={kind} box={box} typed={typed} blur={tab(LABEL_B, c)} base={base} fitPaper />;
  }) : null;

  /* the strip: its box sized to the longer line, right edge fixed */
  const stripStart = 31 + holds[0];
  const capPx = 0.0302 * H, stripRight = 0.799;
  const lineW = Math.max(...strip.map((l) => didoneWidth(l, capPx / 0.7)));
  const sx0 = Math.max(0.02, stripRight - (lineW + 0.173 * W) / W);
  const stripBox: Box4 = [sx0, 0.552, 0.915, 0.715];
  const stripTyped = 2 + (t - stripStart) * STRIP_RATE;

  /* the portrait */
  const ph = (portrait?.height ?? 0.7234) * H, pw = ph * (portrait?.aspect ?? 0.72);
  const pc = right ? W - (portrait?.centre ?? 350) : portrait?.centre ?? 350;

  /* the wide picture on its ledge */
  const ledge = (wide?.ledge ?? 0.806) * H;
  const ww = wide?.width ?? 2600, wh = ww / (wide?.aspect ?? 2);
  const wl = wide?.left ?? (right ? W - ww + 700 : -700);
  const wbox = { left: wl, top: ledge - wh, width: ww, height: wh };
  const r = tab(REFL, c);

  return (
    <AbsoluteFill>
      <Depth s={tab(NEWS_S, c)} b={tab(NEWS_B, c)}>{back}</Depth>
      {wide && c >= 6 && (
        <Depth s={c < 31 ? 0.505 : tab(MAN_S, c)} b={tab(MAN_B, c)} dy={tab(WIDE_DY, c)}>
          <img src={wide.src} style={{ position: 'absolute', ...wbox, transform: wide.mirror ? 'scaleX(-1)' : undefined, filter: wide.filter ?? 'grayscale(1) sepia(0.5) contrast(1.2) brightness(0.95)' }} />
          <div style={{ position: 'absolute', left: wbox.left, top: ledge - 6, width: wbox.width, height: 12, background: '#6e4a2e' }} />
          {wide.reflect !== false && r > 0.01 && (
            <img src={wide.src} style={{ position: 'absolute', ...wbox, top: ledge + 6, transform: `scale(${wide.mirror ? -1 : 1}, ${(-r).toFixed(3)})`, transformOrigin: '50% 0%', filter: 'grayscale(1) brightness(0.85) contrast(0.8)', opacity: 0.85 }} />
          )}
        </Depth>
      )}
      {portrait && c >= 8 && (
        <Depth s={tab(MAN_S, c)} b={tab(MAN_B, c)} dx={flip(tab(MAN_X, c))}>
          <img src={portrait.src} style={{ position: 'absolute', left: pc - pw / 2, top: (portrait.top ?? 0.156) * H, width: pw, height: ph, filter: portrait.filter ?? 'grayscale(1) sepia(0.15) contrast(1.35) brightness(0.85)' }} />
          {c >= 33 && <GridOverlay opacity={c >= 35 ? 1 : 0.2} />}
        </Depth>
      )}
      {highlight && c >= 10 && c < 52 && (() => {
        const [x0, y0, x1, y1] = boxAt(EYE, c);
        return <Highlighter box={right ? [1 - x1, y0, 1 - x0, y1] : [x0, y0, x1, y1]} opacity={tab([[10, 1], [44, 1], [50, 0.2], [52, 0]], c)} />;
      })()}
      {labelEls}
      {c >= 35 && (
        <TornStrip id={`${id}-strip`} lines={strip} box={stripBox} right={stripRight} s={tab(STRIP_S, c)} typed={stripTyped} blur={tab(STRIP_B, c)} base={base}
          script={script && c >= 61 ? { text: script, opacity: tab(SEE, c), blur: c >= 75 ? 2.5 : 0, align: 'right' } : undefined} />
      )}
    </AbsoluteFill>
  );
};

/** Lay beats end to end on image starts: the frame each begins (beat k's Punch tears through beat k-1). */
export const beatStarts = (lengths: number[], starts: number[]) => {
  const out: number[] = [];
  let at = 0;
  for (const len of lengths) {
    const s = starts.find((x) => x >= at) ?? at;
    out.push(s);
    at = s + len;
  }
  return { starts: out, end: at };
};
