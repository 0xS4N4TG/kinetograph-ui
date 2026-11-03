// Bklit UI theme, ported to Kinetograph frames. Chart design after Bklit UI (MIT), https://bklit.com.
//
// What lives here: the Bklit colour tokens (the `--chart-*` palettes and the neutral chart variables, light and
// dark, converted from oklch to hex), the numbers the Bklit components animate with (reveal easing, spring values,
// stagger delays), a few path helpers, and the camera director every Bklit chart here shares. Nothing keeps state.

import { z } from 'zod';
import { Easing } from 'remotion';
import { clamp01, lerp } from './lib.js';

// ---------------------------------------------------------------------------------------------------------------
// oklch -> hex

/** Convert a CSS `oklch(L C H)` string (L 0..1, C, H degrees) to `#rrggbb`. */
export function oklchHex(css: string): string {
  const m = css.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (!m) throw new Error('bad oklch: ' + css);
  const L = +m[1];
  const C = +m[2];
  const h = (+m[3] * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
  const enc = (v: number) => {
    const c = Math.max(0, Math.min(1, v));
    const g = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
    return Math.round(Math.max(0, Math.min(1, g)) * 255);
  };
  return '#' + lin.map((v) => enc(v).toString(16).padStart(2, '0')).join('');
}

const toRgb = (hex: string) => {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
/** Mix two hex colours: t=0 gives a, t=1 gives b. The opaque stand-in for "colour at some opacity over a ground". */
export function mix(a: string, b: string, t: number): string {
  const A = toRgb(a);
  const B = toRgb(b);
  return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp01(t))).toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------------------------------------------
// Palettes: bklit packages/studio/src/lib/chart-palettes.ts (values verbatim, oklch)

type Pal = { light: string[]; dark: string[] };
const TREND = {
  light: ['oklch(0.696 0.17 162.48)', 'oklch(0.637 0.237 25.331)'],
  dark: ['oklch(0.765 0.177 163.223)', 'oklch(0.704 0.191 22.216)'],
};
const RAW: Record<string, Pal> = {
  primary: {
    light: ['oklch(0.585 0.233 277.117)', 'oklch(0.852 0.199 91.936)', 'oklch(0.667 0.295 322.15)', 'oklch(0.56 0.021 213.5)', 'oklch(0 0 0)'],
    dark: ['oklch(0.585 0.233 277.117)', 'oklch(0.852 0.199 91.936)', 'oklch(0.667 0.295 322.15)', 'oklch(0.56 0.021 213.5)', 'oklch(1 0 0)'],
  },
  monochrome: {
    light: ['oklch(0.268 0.007 34.298)', 'oklch(0.444 0.011 73.639)', 'oklch(0.709 0.01 56.259)', 'oklch(0.869 0.005 56.366)', 'oklch(0.923 0.003 48.717)'],
    dark: ['oklch(0.967 0.001 286.375)', 'oklch(0.871 0.006 286.286)', 'oklch(0.705 0.015 286.067)', 'oklch(0.552 0.016 285.938)', 'oklch(0.442 0.017 285.786)'],
  },
  ocean: {
    light: ['oklch(0.546 0.245 262.881)', 'oklch(0.715 0.143 215.221)', 'oklch(0.777 0.152 181.912)', 'oklch(0.673 0.182 276.935)', 'oklch(0.828 0.111 230.318)'],
    dark: ['oklch(0.623 0.214 259.815)', 'oklch(0.789 0.154 211.53)', 'oklch(0.855 0.138 181.071)', 'oklch(0.785 0.115 274.713)', 'oklch(0.901 0.058 230.902)'],
  },
  sunset: {
    light: ['oklch(0.705 0.213 47.604)', 'oklch(0.645 0.246 16.439)', 'oklch(0.828 0.189 84.429)', 'oklch(0.627 0.265 303.9)', 'oklch(0.823 0.12 346.018)'],
    dark: ['oklch(0.75 0.183 55.934)', 'oklch(0.712 0.194 13.428)', 'oklch(0.879 0.169 91.605)', 'oklch(0.714 0.203 305.504)', 'oklch(0.899 0.061 343.231)'],
  },
  grove: {
    light: ['oklch(0.596 0.145 163.225)', 'oklch(0.768 0.233 130.85)', 'oklch(0.511 0.096 186.391)', 'oklch(0.769 0.188 70.08)', 'oklch(0.709 0.01 56.259)'],
    dark: ['oklch(0.765 0.177 163.223)', 'oklch(0.841 0.238 128.85)', 'oklch(0.6 0.118 184.704)', 'oklch(0.828 0.189 84.429)', 'oklch(0.709 0.01 56.259)'],
  },
  vivid: {
    light: ['oklch(0.606 0.25 292.717)', 'oklch(0.656 0.241 354.308)', 'oklch(0.715 0.143 215.221)', 'oklch(0.768 0.233 130.85)', 'oklch(0.705 0.213 47.604)'],
    dark: ['oklch(0.702 0.183 293.541)', 'oklch(0.718 0.202 349.761)', 'oklch(0.865 0.127 207.078)', 'oklch(0.897 0.196 126.665)', 'oklch(0.75 0.183 55.934)'],
  },
};
export const PALETTE_IDS = ['primary', 'monochrome', 'ocean', 'sunset', 'grove', 'vivid'] as const;

export const bkPaletteSchema = z.enum(PALETTE_IDS).describe('Bklit chart palette: primary (indigo, yellow, fuchsia, mist, black), monochrome, ocean, sunset, grove or vivid.');
export const bkModeSchema = z.enum(['light', 'dark']).describe('Colour theme: light or dark (Bklit tokens for each).');

export interface BkTokens {
  dark: boolean;
  /** --chart-background */
  bg: string;
  /** --foreground */
  fg: string;
  /** --muted-foreground */
  mutedFg: string;
  /** --border (the Ring track, tooltip border) */
  border: string;
  /** --chart-tooltip-background */
  popover: string;
  popoverFg: string;
  /** --chart-grid */
  grid: string;
  /** --chart-label: axis text */
  label: string;
  /** --chart-crosshair */
  crosshair: string;
  /** --chart-1 .. --chart-5 */
  series: string[];
  /** --chart-positive / --chart-negative */
  positive: string;
  negative: string;
  /** --chart-scale-01 .. 05 */
  scale: string[];
  /** The date-ticker pill (zinc-900 on white, zinc-100 on dark). */
  pill: string;
  pillFg: string;
  /** --legend-track */
  track: string;
}

export function tokens(mode: 'light' | 'dark', palette: string): BkTokens {
  const dark = mode === 'dark';
  const pal = RAW[palette] ?? RAW.primary;
  const series = pal[mode].map(oklchHex);
  const [positive, negative] = TREND[mode].map(oklchHex);
  const bg = oklchHex(dark ? 'oklch(0.145 0 0)' : 'oklch(1 0 0)');
  const fg = oklchHex(dark ? 'oklch(0.985 0 0)' : 'oklch(0.145 0 0)');
  // --chart-scale-0N: color-mix(in oklab, chart-1 N%, scale-mix); 01 is the neutral
  const mixTo = oklchHex(dark ? 'oklch(0.25 0 0)' : 'oklch(1 0 0)');
  const scale = [
    oklchHex(dark ? 'oklch(0.3 0 0)' : 'oklch(0.922 0 0)'),
    mix(mixTo, series[0], 0.35),
    mix(mixTo, series[0], 0.55),
    mix(mixTo, series[0], 0.78),
    series[0],
  ];
  return {
    dark, bg, fg, positive, negative, series, scale,
    mutedFg: oklchHex(dark ? 'oklch(0.708 0 0)' : 'oklch(0.556 0 0)'),
    border: dark ? mix(bg, '#ffffff', 0.1) : oklchHex('oklch(0.922 0 0)'),
    popover: oklchHex(dark ? 'oklch(0.205 0 0)' : 'oklch(1 0 0)'),
    popoverFg: fg,
    // dark grid is oklch(0.6 0.0124 243.77 / 0.25) over the background
    grid: dark ? mix(bg, oklchHex('oklch(0.6 0.0124 243.77)'), 0.25) : oklchHex('oklch(0.9 0 0)'),
    label: oklchHex(dark ? 'oklch(0.75 0.01 260)' : 'oklch(0.45 0.01 260)'),
    crosshair: oklchHex(dark ? 'oklch(0.72 0.0158 281.84)' : 'oklch(0.4 0.1828 274.34)'),
    pill: dark ? '#f4f4f5' : '#18181b',
    pillFg: dark ? '#18181b' : '#ffffff',
    track: oklchHex(dark ? 'oklch(0.274 0.006 286.033)' : 'oklch(0.92 0.004 286.32)'),
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Bklit motion numbers

/** DEFAULT_ANIMATION_EASING: the clip reveal of the cartesian charts. */
export const easeBk = Easing.bezier(0.85, 0, 0.15, 1);
/** A softer in-out for a reveal the camera has to ride (the same family, less abrupt). */
export const easeRide = Easing.bezier(0.6, 0, 0.3, 1);
/** Grid ring and spoke enter stagger (seconds), from animation.ts. */
export const GRID_RING_STAGGER_S = 0.08;
export const GRID_SPOKE_STAGGER_S = 0.05;

/** Scale factor from Bklit's CSS pixels (a ~700 px wide card) to a 1920 px frame. */
export const PX = 2;

// ---------------------------------------------------------------------------------------------------------------
// Camera direction

/** One move of the camera. s is 0..1 progress of the move. The result w is where the camera is between the "from"
 *  and "to" poses: an eased 0..1 with a small pull back before it goes (anticipation) and a small overshoot at the
 *  end that settles back. `ant` and `over` are fractions of the move. */
export function moveCurve(s: number, ant = 0.035, over = 0.06): number {
  const t = clamp01(s);
  const base = Easing.bezier(0.55, 0, 0.2, 1)(t);
  const pull = -ant * Math.sin(Math.PI * clamp01(t / 0.2));
  const settle = over * Math.sin(Math.PI * clamp01((t - 0.72) / 0.28));
  return base + pull + settle;
}

/** Shutter (in frames) for the motion blur of a camera that went from pose a to pose b in one frame, poses as
 *  [x, y, zoom] in world pixels. Pixels of screen travel per frame decide it; a slow drift gets none. */
export function shutterFor(a: [number, number, number], b: [number, number, number]): number {
  const zm = (a[2] + b[2]) / 2;
  const dx = (b[0] - a[0]) * zm;
  const dy = (b[1] - a[1]) * zm;
  const dz = Math.abs(b[2] / a[2] - 1) * 900;
  const speed = Math.hypot(dx, dy) + dz;
  if (speed < 9) return 0;
  return Math.min(0.85, speed / 70);
}

/** A blur radius that is zero where the subject is in focus and rises with `depth` (0..1) to `max` px. Under 1 px
 *  the engine drops a blur, so return 0 there. */
export const soft = (depth: number, max = 5) => {
  const r = clamp01(depth) * max;
  return r < 1 ? 0 : r;
};

// ---------------------------------------------------------------------------------------------------------------
// Geometry

/** Angles in radians, clockwise from 12 o'clock (d3's arc convention). Point at radius r. */
export const polar = (cx: number, cy: number, r: number, a: number): [number, number] => [cx + Math.sin(a) * r, cy - Math.cos(a) * r];

const f2 = (v: number) => v.toFixed(2);

/** A filled annular sector from a0 to a1 (radians, clockwise from 12), outer radius r1, inner r0, with rounded
 *  corners of radius `corner` (a quadratic round-off, as d3's cornerRadius draws). r0 = 0 gives a pie slice. */
export function arcPath(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number, corner = 0): string {
  if (a1 - a0 < 0.0005) return '';
  const full = a1 - a0 >= Math.PI * 2 - 0.0005;
  if (full) {
    const o = `M${f2(cx)} ${f2(cy - r1)}A${r1} ${r1} 0 1 1 ${f2(cx)} ${f2(cy + r1)}A${r1} ${r1} 0 1 1 ${f2(cx)} ${f2(cy - r1)}Z`;
    if (r0 <= 0) return o;
    return o + `M${f2(cx)} ${f2(cy - r0)}A${r0} ${r0} 0 1 0 ${f2(cx)} ${f2(cy + r0)}A${r0} ${r0} 0 1 0 ${f2(cx)} ${f2(cy - r0)}Z`;
  }
  const cr = Math.max(0, Math.min(corner, (r1 - r0) / 2 - 0.01, ((a1 - a0) * Math.max(r0, 1)) / 2 - 0.01));
  const da1 = cr / r1;
  const da0 = r0 > 0 ? cr / r0 : 0;
  const large = (aa: number, bb: number) => (bb - aa > Math.PI ? 1 : 0);
  if (cr <= 0.01) {
    const [ox0, oy0] = polar(cx, cy, r1, a0);
    const [ox1, oy1] = polar(cx, cy, r1, a1);
    if (r0 <= 0) return `M${f2(cx)} ${f2(cy)}L${f2(ox0)} ${f2(oy0)}A${r1} ${r1} 0 ${large(a0, a1)} 1 ${f2(ox1)} ${f2(oy1)}Z`;
    const [ix1, iy1] = polar(cx, cy, r0, a1);
    const [ix0, iy0] = polar(cx, cy, r0, a0);
    return `M${f2(ox0)} ${f2(oy0)}A${r1} ${r1} 0 ${large(a0, a1)} 1 ${f2(ox1)} ${f2(oy1)}L${f2(ix1)} ${f2(iy1)}A${r0} ${r0} 0 ${large(a0, a1)} 0 ${f2(ix0)} ${f2(iy0)}Z`;
  }
  // outer arc between the rounded corners
  const P = (r: number, a: number) => polar(cx, cy, r, a).map(f2).join(' ');
  let d = `M${P(r1 - cr, a0)}`;
  d += `Q${P(r1, a0)} ${P(r1, a0 + da1)}`;
  d += `A${r1} ${r1} 0 ${large(a0 + da1, a1 - da1)} 1 ${P(r1, a1 - da1)}`;
  d += `Q${P(r1, a1)} ${P(r1 - cr, a1)}`;
  if (r0 <= 0) {
    d += `L${f2(cx)} ${f2(cy)}Z`;
    return d;
  }
  d += `L${P(r0 + cr, a1)}`;
  d += `Q${P(r0, a1)} ${P(r0, a1 - da0)}`;
  d += `A${r0} ${r0} 0 ${large(a0 + da0, a1 - da0)} 0 ${P(r0, a0 + da0)}`;
  d += `Q${P(r0, a0)} ${P(r0 + cr, a0)}Z`;
  return d;
}

/** Closed polygon through points. */
export const poly = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f2(x)} ${f2(y)}`).join('') + 'Z';

/** Rounded top corners only (a bar, a candle body), as a path. */
export const roundRectPath = (x: number, y: number, w: number, h: number, r: number) => {
  const rr = Math.min(r, w / 2, h / 2);
  return `M${f2(x + rr)} ${f2(y)}H${f2(x + w - rr)}Q${f2(x + w)} ${f2(y)} ${f2(x + w)} ${f2(y + rr)}V${f2(y + h - rr)}Q${f2(x + w)} ${f2(y + h)} ${f2(x + w - rr)} ${f2(y + h)}H${f2(x + rr)}Q${f2(x)} ${f2(y + h)} ${f2(x)} ${f2(y + h - rr)}V${f2(y + rr)}Q${f2(x)} ${f2(y)} ${f2(x + rr)} ${f2(y)}Z`;
};

/** Width of a sans (Geist) string, close enough for centring a pill: 0.56 em a character. */
export const sansWidth = (text: string, size: number) => text.length * size * 0.56;

/** Thousand-grouped integer. */
export const group = (v: number) => Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** A cubic Bezier through horizontal handles (the sankey link / funnel curve): point at t. */
export function hCubic(x0: number, y0: number, x1: number, y1: number, t: number): [number, number] {
  const cx = (x0 + x1) / 2;
  const u = 1 - t;
  return [u * u * u * x0 + 3 * u * u * t * cx + 3 * u * t * t * cx + t * t * t * x1, u * u * u * y0 + 3 * u * u * t * y0 + 3 * u * t * t * y1 + t * t * t * y1];
}

/** Ease out with a small overshoot (a pop). 0..1 in, about 0..1.08..1 out. */
export const backOut = (t: number, c1 = 1.70158) => {
  const x = clamp01(t) - 1;
  return 1 + (c1 + 1) * x * x * x + c1 * x * x;
};

/** Linear sample of a function over [a, b] averaged at n points: a smoothed look-ahead for a camera that rides a line. */
export function avg(fn: (x: number) => number, a: number, b: number, n = 9): number {
  let s = 0;
  for (let i = 0; i < n; i++) s += fn(a + ((b - a) * i) / (n - 1));
  return s / n;
}
