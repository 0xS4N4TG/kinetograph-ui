// Read from a contact sheet only, not yet measured: replace with its reference's spec once one is written.
import { defineTaste } from '../taste.js';

/** White graph paper, upright black type, a yellow highlighter swept behind the key words. */
export const ledger = defineTaste({
  meta: {
    id: 'ledger', title: 'Ledger, highlighted', source: 'contact sheet', measured: false,
    useWhen: 'numbers, how-tos and step lists; study, productivity, business maths',
  },
  paper: '#f4f4f2', dark: '#111111', vignette: 0.14, grid: true,
  ink: '#2e2e2e', inkOnDark: '#eeeeee', keyword: '#111111', keywordOnDark: '#ffffff', accentMode: 'highlight', highlight: '#f2dc3b',
  font: 'Poppins', leadWeight: 500, keyWeight: 800, italic: false, star: null, starOnDark: null,
  shapes: { corner: 'none', cornerOnDark: 'none', smallPrint: 'none' },
  transition: { wipe: 'cut' },
});
