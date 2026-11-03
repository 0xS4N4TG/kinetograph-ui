// Pin 971581319623279878, read frame by frame at 30 fps. Set
// here: colours, grid, type, the lead's word-by-word entrance, the down-right drop shadow and the transitions; the
// camera's pan and zoom-out are BASE's, which were measured off this pin. Not measured: the hop table (unused in words
// mode), keyword tracking, the flying-banknote rain (a reel adds it as its own layer), the typed paragraph.
import { defineTaste } from '../taste.js';

/** Flat white graph paper (0.136 W cells), every line of type in one dark grey: a condensed upright lead word by word,
 *  then bold italic grotesque keywords. Objects with a dashed ring and a down-right drop shadow; scenes joined by rigid
 *  camera pans and a zoom-out, not cuts. */
export const graph = defineTaste({
  meta: {
    id: 'graph', title: 'Graph paper, camera pans', source: '971581319623279878', measured: false,
    useWhen: 'brand case studies and money stories (how X went from A to B); products, cans, coins, cash; scenes that travel',
    layouts: ['Ringed', 'HeadlineOver', 'EndCard'],
  },
  paper: '#fdfdfd', dark: '#111111', vignette: 0, grid: true, gridCell: 0.136, gridInk: '#cfcfcf', gridStrength: 0.4,
  ink: '#444444', inkOnDark: '#f4f4f4', keyword: '#444444', keywordOnDark: '#ffffff', accentMode: 'ink', highlight: '#444444',
  font: 'Inter', leadFont: 'Barlow Condensed', leadItalic: false, leadWeight: 500, keyWeight: 800, italic: true,
  star: null, starOnDark: null,
  text: {
    // "watch": 18 px low (0.3 em at a 60 px lead), up past its line to 29 px above, back at 0.88 a frame
    leadMode: 'words', leadSize: 0.083, fade: 4, blur: 8 / 720,
    leadBob: [0.3, 0, -0.35, -0.48, -0.422, -0.372, -0.327, -0.288, -0.253, -0.223, -0.196, -0.173, -0.152, -0.134, -0.118, -0.104, -0.091, -0.08, -0.071, -0.062, -0.055, -0.048, 0],
  },
  // the can: offset (+14, +22) px at 720x1280, blur about 25 px, 0.4; light from the top left
  light: { castAlpha: 0.4, castOffset: [14 / 720, 22 / 1280], castBlur: 25 / 720 },
  shapes: { corner: 'none', cornerOnDark: 'none', smallPrint: 'none' },
  transition: { wipe: 'cut' },
  texture: { paper: 0.45, ink: 0.5, grain: 0.25, scan: 0.4, moire: 0.16, halftone: 0.08 },
});
