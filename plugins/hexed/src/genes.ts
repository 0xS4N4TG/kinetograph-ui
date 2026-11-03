// The effect gene pools: every option the isolate, grade, screen, optics and damage slots can roll. A gene turns a
// strength k (0..1, the slot's amount times the global amount) and the slot's own random stream into engine
// effects, so the same gene still lands differently from seed to seed (another hue, another line size).
// Everything here is a built-in Kinetograph effect; no outside looks or presets.

import {
  blur,
  chromaticAberration,
  colorGrade,
  contrast,
  displace,
  dither,
  glow,
  gradientMap,
  grain,
  grayscale,
  halftone,
  hueRotate,
  invert,
  saturate,
  sepia,
} from '@kinetographdev/core';
import type { Effect } from '@kinetographdev/core';
import { between, hash, pick, rng } from './rng.js';
import type { Rng } from './rng.js';
import { flare, kaleido, mirror, quad, slices, smear, splitOffset, streak, tile, wobble, zoomBlur } from './shaders.js';
import type { Box } from './shaders.js';
import { lightLeak } from '@kinetographdev/core/light-leaks';

import { SLOTS } from './slots.js';
import type { EffectSlot, MotionSlot, Slot } from './slots.js';

export { SLOTS };
export type { EffectSlot, MotionSlot, Slot };

export interface GeneContext {
  /** a whole number for effects that want a seed of their own (grain, dither) */
  seed: number;
  /** the picture's box on the canvas, for the shader passes */
  box: Box;
}

export interface Gene {
  id: string;
  effects: (k: number, r: Rng, ctx: GeneContext) => Effect[];
  /** the effect has no strength of its own (halftone, dither): Hexed lays it over the untouched picture at
   *  opacity k instead */
  crossfade?: boolean;
  /** runs after crop and shake, on the frame as it sits on the canvas (the shader passes, which read by position) */
  post?: boolean;
}

const none: Gene = { id: 'none', effects: () => [] };

// ---- colour helpers ----

/** hsl (degrees, 0..1, 0..1) to #rrggbb */
export function hsl(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

type Stops = [number, string][];
const map = (stops: Stops, amount: number) => gradientMap({ stops: stops.map(([offset, color]) => ({ offset, color })), amount });

/** A tone map in one hue: black, a deep shade, the colour, a pale wash. `crush` pushes more of the picture to black. */
function tint(h: number, crush: number): Stops {
  return [
    [0, '#000000'],
    [crush, hsl(h, 0.6, 0.06)],
    [crush + (1 - crush) * 0.45, hsl(h, 0.45, 0.42)],
    [crush + (1 - crush) * 0.8, hsl(h, 0.4, 0.75)],
    [1, hsl(h, 0.35, 0.94)],
  ];
}

/** Hard bands: each colour holds flat until the next, for a posterised, screen-printed picture. */
function bands(colors: string[]): Stops {
  const out: Stops = [];
  colors.forEach((c, i) => {
    out.push([i / colors.length, c]);
    out.push([Math.min(1, (i + 1) / colors.length - 0.004), c]);
  });
  return out;
}

// hues the tints favour; any hue can still come up
const HUES = [95, 120, 150, 175, 190, 205, 270, 285, 320, 345, 25, 38];

// ---- isolate: keep one hue, drain the rest ----

/** A hue-vs-saturation curve that keeps a 50 degree band round `h` and pulls everything else toward grey. */
function keepHue(h: number, drain: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let a = 0; a < 360; a += 30) {
    const d = Math.min(Math.abs(a - h), 360 - Math.abs(a - h));
    pts.push([a, d < 30 ? 0.35 : -drain]);
  }
  return pts;
}

export const ISOLATE: Gene[] = [
  none,
  { id: 'keep-red', effects: (k) => [colorGrade({ intensity: k, hueCurves: { hueVsSaturation: keepHue(0, 1) } })] },
  { id: 'keep-warm', effects: (k, r) => [colorGrade({ intensity: k, hueCurves: { hueVsSaturation: keepHue(between(r, 20, 50), 1) } })] },
  { id: 'keep-green', effects: (k, r) => [colorGrade({ intensity: k, hueCurves: { hueVsSaturation: keepHue(between(r, 100, 140), 1) } })] },
  { id: 'keep-blue', effects: (k, r) => [colorGrade({ intensity: k, hueCurves: { hueVsSaturation: keepHue(between(r, 200, 230), 1) } })] },
  { id: 'keep-any', effects: (k, r) => [colorGrade({ intensity: k, hueCurves: { hueVsSaturation: keepHue(between(r, 0, 360), 1) } })] },
  {
    id: 'shift-one',
    effects: (k, r) => {
      const h = between(r, 0, 360);
      return [colorGrade({ intensity: k, secondaries: [{ key: { hue: { center: h, range: 40, softness: 20 } }, correction: { hueShift: between(r, 90, 200), saturation: 0.5 } }] })];
    },
  },
];

// ---- grade: the tone of the whole picture ----

// The hard-cut grades sometimes blur the picture first, so the cut falls on soft shapes and comes out in blobs (an
// x-ray, a heat camera) rather than tracing every edge. The choice has its own stream, so the grade's own draws (its
// colours, its cut) land as they did before.
const BLOBBY = new Set(['negative', 'threshold', 'thermal', 'posterize', 'duotone', 'solarize', 'acid']);
function blobby(gene: Gene): Gene {
  if (!BLOBBY.has(gene.id)) return gene;
  return {
    ...gene,
    effects: (k, r, c) => {
      const out = gene.effects(k, r, c);
      const b = rng(hash(`${c.seed}:blob`));
      // the radius is set for a 1920 wide picture and scales with the box
      return b() < 0.5 ? [blur(between(b, 5, 16) * k * (c.box[2] / 1920)), ...out] : out;
    },
  };
}

export const GRADE: Gene[] = ([
  none,
  // a negative washed into one colour, the shadows crushed: inverted mint, inverted ice
  {
    id: 'negative',
    effects: (k, r, c) => [
      invert(1),
      grain(between(r, 0.04, 0.12), { size: between(r, 1, 2), seed: c.seed, animate: true, monochrome: true }),
      contrast(between(r, 1.3, 1.8)),
      map(tint(pick(r, [110, 125, 140, 180, 190, 200]), between(r, 0.2, 0.4)), k),
    ],
  },
  // one bit: black and paper, broken up by grain before the cut so the edges go to grit
  {
    id: 'threshold',
    effects: (k, r, c) => {
      const t = between(r, 0.3, 0.48);
      const [ink, paper] = pick(r, [['#000000', '#ffffff'], ['#000000', '#ffffff'], ['#0c0a08', '#efe6d2'], ['#100808', '#f3d9c8']]);
      return [
        grayscale(1),
        grain(between(r, 0.03, 0.09), { size: between(r, 1, 2), seed: c.seed, animate: true, monochrome: true }),
        map([[0, ink], [t - 0.01, ink], [t + 0.01, paper], [1, paper]], k),
      ];
    },
  },
  // warm grey newsprint, hard contrast: the press look under a line screen
  {
    id: 'press',
    effects: (k, r) => [
      grayscale(1),
      contrast(between(r, 1.4, 1.9)),
      map([[0, '#0e0c0b'], [0.35, '#3a3330'], [0.7, '#bdb3a8'], [1, pick(r, ['#f4efe8', '#efe4d2', '#e9e9e4'])]], k),
    ],
  },
  // a night picture tinted into one deep colour, a little of the original showing through
  {
    id: 'night-tint',
    effects: (k, r) => [contrast(between(r, 1.2, 1.5)), map(tint(pick(r, HUES), between(r, 0.1, 0.25)), k * between(r, 0.8, 0.95))],
  },
  // one hue from black to blown white, as a monotone print
  {
    id: 'monotone',
    effects: (k, r, c) => [
      contrast(between(r, 1.2, 1.6)),
      grain(between(r, 0.05, 0.14), { size: 1.2, seed: c.seed, animate: true, monochrome: true }),
      map([[0, '#000000'], [0.3, hsl(pick(r, HUES), 0.55, 0.22)], [0.65, hsl(pick(r, HUES), 0.5, 0.6)], [1, '#ffffff']], k),
    ],
  },
  // old sepia print: browns crushed at the bottom, a cream top, grain
  {
    id: 'sepia-print',
    effects: (k, r, c) => [
      sepia(1),
      contrast(between(r, 1.2, 1.45)),
      grain(between(r, 0.06, 0.12), { size: 1.4, seed: c.seed, animate: true }),
      map([[0, '#0d0703'], [0.4, '#4a2c16'], [0.75, '#b88b5e'], [1, '#f1e2c8']], k),
    ],
  },
  // heat: posterised black, blood, orange, yellow, cream
  {
    id: 'thermal',
    effects: (k, r) => {
      const sets = [
        ['#000000', '#3a0202', '#9a1a00', '#f07a00', '#ffd23a', '#fff2c0'],
        ['#000000', '#1a0030', '#6a007a', '#e0207a', '#ff9a3a', '#fff0a0'],
        ['#000000', '#001a2a', '#00607a', '#20c0a0', '#e0ff70', '#ffffff'],
      ];
      const cols = pick(r, sets);
      return [contrast(between(r, 1.1, 1.4)), map(r() < 0.5 ? bands(cols) : cols.map((col, i) => [i / (cols.length - 1), col] as [number, string]), k)];
    },
  },
  // three or four flat colours
  {
    id: 'posterize',
    effects: (k, r) => {
      const h = between(r, 0, 360);
      const n = pick(r, [3, 4]);
      const cols = Array.from({ length: n }, (_, i) => hsl(h + i * between(r, 20, 140), between(r, 0.4, 0.9), 0.08 + (0.86 * i) / (n - 1)));
      return [map(bands(cols), k)];
    },
  },
  // two colours of ink
  {
    id: 'duotone',
    effects: (k, r) => {
      const h = between(r, 0, 360);
      return [map([[0, hsl(h, 0.7, 0.12)], [0.55, hsl(h + between(r, 120, 220), 0.85, 0.55)], [1, hsl(h + 30, 0.6, 0.94)]], k)];
    },
  },
  // the tones folded back at the top: solarised
  {
    id: 'solarize',
    effects: (k, r) => [
      colorGrade({ intensity: k, curves: { master: [[0, 0], [between(r, 0.45, 0.6), 1], [1, between(r, 0, 0.25)]] }, adjust: { saturation: between(r, -0.3, 0.4) } }),
    ],
  },
  // loud colour: hues spun, saturation up
  {
    id: 'acid',
    effects: (k, r) => [hueRotate(between(r, 90, 270) * k), saturate(1 + 0.9 * k), contrast(1 + 0.25 * k)],
  },
  {
    id: 'teal-crush',
    effects: (k, r) => [
      colorGrade({
        intensity: k,
        adjust: { contrast: 0.25, blacks: -0.22, saturation: -0.1 },
        wheels: { shadows: { hue: between(r, 180, 205), amount: 0.5 }, highlights: { hue: between(r, 25, 40), amount: 0.35 } },
      }),
    ],
  },
  {
    id: 'bleach',
    effects: (k, r) => [colorGrade({ intensity: k, adjust: { contrast: between(r, 0.4, 0.6), saturation: -0.65, whites: 0.12 } })],
  },
] satisfies Gene[]).map(blobby);


// ---- screen: a print or display pattern over the picture ----

// ink on paper for the line-drawn screens, ink first
const INKS: string[][] = [
  ['#1a1712', '#efe6d2'],
  ['#14213d', '#f4efe4'],
  ['#3b0d0d', '#f6e7d0'],
];

export const SCREEN: Gene[] = [
  none,
  { id: 'halftone', effects: (_k, r) => [halftone({ size: between(r, 4, 9), angle: pick(r, [15, 45, 75]), shape: 'circle' })], crossfade: true },
  // fine horizontal lines, the TV-print look; sometimes turned
  { id: 'line-screen', effects: (_k, r) => [halftone({ size: between(r, 2.5, 5), angle: pick(r, [0, 0, 0, 90, 45]), shape: 'line' })], crossfade: true },
  { id: 'dither', effects: (_k, r, c) => [dither(Math.round(between(r, 2, 4)), { mode: pick(r, ['ordered', 'random'] as const), size: between(r, 1, 2.5), seed: c.seed })], crossfade: true },
  {
    id: 'scanlines',
    effects: (k, r) => [colorGrade({ intensity: k, effects: { scanlines: between(r, 0.3, 0.6), scanlineCount: between(r, 0.6, 0.95), scanlineSoftness: between(r, 0.5, 1) } })],
  },
  {
    id: 'crt',
    effects: (k, r) => [
      colorGrade({ intensity: k, effects: { scanlines: between(r, 0.25, 0.5), scanlineCount: between(r, 0.5, 0.8), scanlineSoftness: 0.8, crtCurvature: between(r, 0.1, 0.4), chromaBleed: 0.4 } }),
    ],
  },
  { id: 'two-ink', effects: (k, r) => [colorGrade({ intensity: k, effects: { twoInkPrint: 1, twoInkPrintSize: between(r, 0.3, 0.55) } })] },
  {
    id: 'engraving',
    effects: (k, r) => [
      colorGrade({ intensity: k, palette: pick(r, INKS), effects: { engraving: 1, engravingSpacing: between(r, 0.05, 0.14), engravingAngle: r(), engravingContrast: between(r, 0.55, 0.75) } }),
    ],
  },
  { id: 'crosshatch', effects: (k, r) => [colorGrade({ intensity: k, palette: pick(r, INKS), effects: { crosshatch: 1, crosshatchSpacing: between(r, 0.15, 0.3) } })] },
  { id: 'painterly', effects: (k, r) => [colorGrade({ intensity: k, effects: { kuwahara: 1, kuwaharaRadius: between(r, 0.1, 0.3) } })] },
  { id: 'ascii', effects: (k, r) => [colorGrade({ intensity: k, effects: { ascii: 1, asciiSize: between(r, 0.04, 0.08), asciiStyle: Math.floor(r() * 8) } })] },
  { id: 'pixelate', effects: (k, r) => [colorGrade({ intensity: k, effects: { pixelate: between(r, 0.15, 0.4) } })] },
];

// ---- optics: what the lens does ----

export const OPTICS: Gene[] = [
  none,
  { id: 'fringe', effects: (k, r) => [chromaticAberration({ amount: between(r, 2, 6) * k, angle: between(r, 0, 360) })] },
  { id: 'split', effects: (k, r) => [chromaticAberration({ amount: between(r, 8, 18) * k, angle: pick(r, [0, 90]) })] },
  { id: 'bloom', effects: (k, r) => [glow({ radius: between(r, 12, 30), intensity: 0.8 * k })] },
  { id: 'halation', effects: (k, r) => [glow({ radius: between(r, 20, 40), color: pick(r, ['#ff5a2a', '#ff2a55', '#ffb02a']), intensity: 0.7 * k })] },
  { id: 'soft-focus', effects: (k, r) => [blur(between(r, 1, 3) * k), glow({ radius: 18, intensity: 0.5 * k })] },
  { id: 'fringe-bloom', effects: (k, r) => [chromaticAberration({ amount: between(r, 3, 7) * k }), glow({ radius: 20, intensity: 0.6 * k })] },
  { id: 'zoom-blur', post: true, effects: (k, r, c) => [zoomBlur(c.box, between(r, 0.03, 0.09) * k)] },
  { id: 'streaks', post: true, effects: (k, r, c) => [streak(c.box, between(r, 12, 40) * k, pick(r, [0, 0, 90, 30, -30]))] },
  {
    id: 'anamorphic',
    post: true,
    effects: (k, r, c) => [flare(c.box, c.box[2] * between(r, 0.15, 0.35), between(r, 0.55, 0.75), pick(r, [[0.3, 0.55, 1], [1, 0.5, 0.2], [0.9, 0.3, 1]] as [number, number, number][]), 1.4 * k)],
  },
  { id: 'light-leak', post: true, effects: (k, r) => [lightLeak({ seed: Math.floor(r() * 1000), hueShift: between(r, 0, 360), progress: 0.25 + 0.5 * k })] },
  { id: 'vignette', effects: (k, r) => [colorGrade({ intensity: k, vignette: { amount: between(r, 0.5, 0.9), midpoint: between(r, 0.2, 0.4), feather: between(r, 0.3, 0.6) } })] },
  { id: 'lens-wobble', post: true, effects: (k, r, c) => [wobble(c.box, between(r, 0.08, 0.2) * k, between(r, 1.5, 4))] },
  // the whole picture dragged sideways in uneven bands, as a long shutter or a smeared print
  { id: 'smear', post: true, effects: (k, r, c) => [smear(c.box, c.box[2] * between(r, 0.04, 0.12) * k, pick(r, [0, 0, 0, 180, 90]), between(r, 0.55, 0.85), c.seed)] },
];

// ---- damage: what the tape or film did to it ----

export const DAMAGE: Gene[] = [
  none,
  {
    id: 'slice-glitch',
    post: true,
    effects: (k, r, c) => [slices(c.box, between(r, 0.02, 0.08) * k, between(r, 6, 40), between(r, 0.15, 0.4), Math.round(between(r, 2, 6)), c.seed, 0)],
  },
  {
    id: 'rgb-slice',
    post: true,
    effects: (k, r, c) => [slices(c.box, between(r, 0.01, 0.05) * k, between(r, 4, 24), between(r, 0.2, 0.5), Math.round(between(r, 1, 4)), c.seed, between(r, 0.3, 1))],
  },
  { id: 'fine-grain', effects: (k, r, c) => [grain(between(r, 0.08, 0.16) * k, { size: 1, seed: c.seed, animate: true, monochrome: true })] },
  { id: 'coarse-grain', effects: (k, r, c) => [grain(between(r, 0.18, 0.35) * k, { size: between(r, 2, 3.5), seed: c.seed, animate: true })] },
  { id: 'film-wear', effects: (k, r) => [colorGrade({ intensity: k, effects: { filmArtifacts: between(r, 0.5, 0.9) }, grain: { amount: 0.3, size: 0.2 } })] },
  {
    id: 'tape',
    effects: (k, r) => [
      colorGrade({ intensity: k, effects: { tapeDamage: between(r, 0.4, 0.9), tapeTracking: between(r, 0.3, 0.9), tapeNoise: 0.3, chromaBleed: 0.5 } }),
    ],
  },
  {
    id: 'glitch',
    effects: (k, r) => [
      colorGrade({ intensity: k, effects: { digitalGlitch: between(r, 0.2, 0.6), digitalGlitchColorSplit: 0.5, digitalGlitchBlockAmount: between(r, 0.2, 0.6) } }),
    ],
  },
  {
    id: 'warp',
    effects: (k, r, c) => [
      displace({ scale: between(r, 6, 20) * k, turbulence: { type: 'fractalNoise', baseFrequency: between(r, 0.004, 0.012), numOctaves: 2, seed: c.seed } }),
    ],
  },
];

// ---- mirror: the frame folded, tiled or split ----

export const MIRROR: Gene[] = [
  none,
  { id: 'mirror-x', post: true, effects: (_k, r, c) => [mirror(c.box, 0, r() < 0.5)] },
  { id: 'mirror-y', post: true, effects: (_k, r, c) => [mirror(c.box, 1, r() < 0.5)] },
  { id: 'quad', post: true, effects: (_k, _r, c) => [quad(c.box)] },
  { id: 'tile-2', post: true, effects: (_k, r, c) => [tile(c.box, 2, r() < 0.5)] },
  { id: 'tile-3', post: true, effects: (_k, r, c) => [tile(c.box, 3, r() < 0.5)] },
  { id: 'kaleido', post: true, effects: (_k, r, c) => [kaleido(c.box, pick(r, [3, 4, 6, 8]), pick(r, [0.2, 0.4, -0.3]), between(r, 1.6, 2.6))] },
  { id: 'split-offset', post: true, effects: (k, r, c) => [splitOffset(c.box, between(r, 0.08, 0.3) * k, r() < 0.7 ? 0 : 1)] },
];

export const POOLS: Record<EffectSlot, Gene[]> = { isolate: ISOLATE, grade: GRADE, screen: SCREEN, optics: OPTICS, damage: DAMAGE, mirror: MIRROR };
