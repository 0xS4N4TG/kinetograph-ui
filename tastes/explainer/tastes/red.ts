// Pin 1119285313673132667, read frame by frame at 30 fps.
import { defineTaste } from '../taste.js';

/** White paper, black italic lead, brick-red italic keywords, black needle stars; black interludes where the type
 *  blooms and blurred red stars sit in the other two corners. Every number is BASE, which was measured from this pin. */
export const red = defineTaste({
  meta: {
    id: 'red', title: 'Red on white', source: '1119285313673132667', measured: true,
    useWhen: 'a brand or content lesson told as a contrarian claim; busts and classic objects; punchy, a little dramatic',
    preview: 'tastes/explainer/demo/out/red.mp4',
    layouts: ['HeroRise', 'FloorSide', 'Interlude'],
  },
  paper: '#fdfdfd', dark: '#000000', vignette: 0, grid: false,
  ink: '#111111', inkOnDark: '#ffffff', keyword: '#a24440', keywordOnDark: '#e0606a', accentMode: 'ink', highlight: '#a24440',
  font: 'Poppins', leadWeight: 500, keyWeight: 800, italic: true, star: '#000000', starOnDark: '#843c38',
  texture: { paper: 0.5, ink: 0.6, grain: 0.3, scan: 0.35, moire: 0.12, halftone: 0 },
});
