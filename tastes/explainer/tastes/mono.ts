// Read from a contact sheet only, not yet measured: replace with its reference's spec once one is written.
import { defineTaste } from '../taste.js';

/** Warm off-white with a grey vignette, upright near-black type, no accent colour, no corner shapes. */
export const mono = defineTaste({
  meta: {
    id: 'mono', title: 'Mono, vignetted', source: 'contact sheet', measured: false,
    useWhen: 'calm, serious advice; finance, careers, anything that should feel quiet rather than loud',
  },
  paper: '#efeeea', dark: '#111111', vignette: 0.32, grid: false,
  ink: '#5e5e5b', inkOnDark: '#eeeeee', keyword: '#262626', keywordOnDark: '#ffffff', accentMode: 'ink', highlight: '#262626',
  font: 'Poppins', leadWeight: 500, keyWeight: 700, italic: false, star: null, starOnDark: null,
  shapes: { corner: 'none', cornerOnDark: 'none', smallPrint: 'none' },
  transition: { wipe: 'cut' },
});
