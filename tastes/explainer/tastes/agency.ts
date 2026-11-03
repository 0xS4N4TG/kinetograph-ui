// Pin 1061653312177886416, read frame by frame at 30 fps.
// Set here: paper, vignette, grid, palette with its grey second lines, type sizes and the drop-in entrance, the
// blur-through-cut (camera arrive / defocus), the corner stars. Not measured: the stars' chrome shading and their slow
// morph (drawn flat black, breathing), the wordmark at the top (a reel adds its own), and the zoom-through, spin-out and
// tumble exits (use Camera push, roll-out). Fonts are a guess from letterforms (Montserrat).
import { defineTaste } from '../taste.js';

/** Warm off-white paper under a strong oval vignette and a faint dashed grid, centred upright geometric type: a small
 *  lead over an extra-bold headline, second lines in grey, every line dropping in from above out of a blur. Black
 *  four-point stars in the top-left and bottom-right corners stay through the whole reel. Beats blur out, cut, and blur
 *  back in. */
export const agency = defineTaste({
  meta: {
    id: 'agency', title: 'Agency, vignetted grid', source: '1061653312177886416', measured: false,
    useWhen: 'an agency or consultant pitching how they differ; calm authority, positioning, B2B; cut-out photo objects',
    layouts: ['Sandwich', 'StandOn', 'ListBeat'],
  },
  paper: '#fbf8f5', dark: '#1d1d1d', vignette: 0.3, grid: true, gridCell: 0.131, gridInk: '#d9d4cc', gridStrength: 0.45,
  ink: '#201c1c', inkOnDark: '#ffffff', keyword: '#1a1819', keywordOnDark: '#ffffff', accentMode: 'ink', highlight: '#1a1819',
  muted: '#808080',
  font: 'Montserrat', leadWeight: 500, keyWeight: 800, italic: false, star: '#121212', starOnDark: null,
  text: {
    // each line drops 0.03-0.065 H from above at about 0.85 a frame while it fades up out of a 6 px (at 640) blur
    leadMode: 'words', leadRate: 100, leadSize: 0.034, fade: 8, blur: 6 / 640,
    leadBob: [-2.6, -2.21, -1.88, -1.6, -1.36, -1.15, -0.98, -0.83, -0.71, -0.6, -0.51, -0.44, -0.37, -0.31, -0.27, -0.23, -0.19, -0.16, -0.14, -0.12, -0.1, -0.09, -0.07, -0.06, -0.05, -0.04, 0],
    keyTracking: -0.02, keyLineHeight: 0.95, rise: -1.2, riseKeep: 0.85,
  },
  shapes: { corner: 'needle', cornerOnDark: 'none', breathe: 0.12, smallPrint: 'none' },
  // the blur-through-cut: out over 4-6 frames, cut, sharp again over 8-10
  camera: { arriveBlur: 6 / 640, arriveFrames: 10 },
  transition: { wipe: 'cut' },
  texture: { paper: 0.7, ink: 0.6, grain: 0.35, scan: 0.45, moire: 0.14, halftone: 0 },
});
