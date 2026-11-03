// Made for this kit (the original reel, tastes/explainer/demo-original), not copied from a reference. Its type, light and
// motion numbers are the measured family's (BASE); its colours, corner shapes, small print and transition are its own.
import { defineTaste } from '../taste.js';

/** Warm cream paper, upright near-black lead, burnt-orange keywords, thin ink asterisks in the corners, and a blinds
 *  wipe into deep-brown interludes where the type glows amber. */
export const ember = defineTaste({
  meta: {
    id: 'ember', title: 'Ember on cream', source: 'original', measured: false,
    useWhen: 'craft and creative advice (editing, design, writing); warm, personal, less shouty than red',
    preview: 'tastes/explainer/demo-original/out/reel.mp4',
  },
  paper: '#f6f1e7', dark: '#1d1410', vignette: 0.08, grid: false,
  ink: '#1c1a17', inkOnDark: '#fbf3e6', keyword: '#c4521c', keywordOnDark: '#ff9a52', accentMode: 'ink', highlight: '#c4521c',
  font: 'Poppins', leadWeight: 500, keyWeight: 800, italic: false, star: '#1c1a17', starOnDark: '#8a3c16',
  text: { leadRate: 1.2 },
  light: { glowStrength: 0.85 },
  shapes: { corner: 'asterisk', cornerOnDark: 'dot', breathe: 0.06, smallPrint: 'none' },
  transition: { wipe: 'blinds', speed: 7, bands: 7 },
  texture: { paper: 0.8, ink: 0.7, grain: 0.3, scan: 0.35, moire: 0.1, halftone: 0 },
});
