// The gene ids each slot can roll, "none" first, with no imports, so tools.ts can list and roll genes without loading
// the engine. They mirror the gene tables (genes.ts, motion.ts, time.tsx, grunge.tsx); the procedural grunge ids are
// listed here, scans (`tex-<n>`) are not. Keep in step with `genesOf`.

import type { Slot } from './slots.js';

export const GENE_IDS: Record<Slot, readonly string[]> = {
  crop: ['none', 'punch-in', 'off-centre', 'tilt', 'letterbox', 'pillarbox'],
  shake: ['none', 'handheld', 'jitter', 'impact', 'breathe'],
  fps: ['none', 'fps-12', 'fps-8', 'fps-6', 'stutter'],
  time: ['none', 'echo', 'ghost', 'strobe', 'repeat', 'reverse', 'blend'],
  mirror: ['none', 'mirror-x', 'mirror-y', 'quad', 'tile-2', 'tile-3', 'kaleido', 'split-offset'],
  isolate: ['none', 'keep-red', 'keep-warm', 'keep-green', 'keep-blue', 'keep-any', 'shift-one'],
  grade: ['none', 'negative', 'threshold', 'press', 'night-tint', 'monotone', 'sepia-print', 'thermal', 'posterize', 'duotone', 'solarize', 'acid', 'teal-crush', 'bleach'],
  screen: ['none', 'halftone', 'line-screen', 'dither', 'scanlines', 'crt', 'two-ink', 'engraving', 'crosshatch', 'painterly', 'ascii', 'pixelate'],
  optics: ['none', 'fringe', 'split', 'bloom', 'halation', 'soft-focus', 'fringe-bloom', 'zoom-blur', 'streaks', 'anamorphic', 'light-leak', 'vignette', 'lens-wobble', 'smear'],
  damage: ['none', 'slice-glitch', 'rgb-slice', 'fine-grain', 'coarse-grain', 'film-wear', 'tape', 'glitch', 'warp'],
  grunge: ['none', 'creases', 'stains', 'speckle', 'scratches', 'fibre', 'toner'],
};
