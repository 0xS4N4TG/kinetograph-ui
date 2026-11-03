// Pin 933230354043913635, read frame by frame at 25 fps, numbers at 30. Set here: colours, type, the word fade and rise, the black-beat bob and glow, the down-right shadow
// and the eased iris; the camera's push, roll and flicker are BASE's, which were measured off this pin. Not measured:
// the hop table (unused in words mode), the grey S-band and card (a reel draws them).
import { defineTaste } from '../taste.js';

/** Cream paper and pure black beats, a neo-grotesque in two weights on one line: near-black (white on black) small
 *  words and a heavy red keyword. Words fade up from 0.3 out of a blur and rise into place; on black they spring and
 *  glow. The camera pushes in, rolls and flickers; beats change on hard cuts and an eased black iris. */
export const pulse = defineTaste({
  meta: {
    id: 'pulse', title: 'Red pulse, camera push', source: '933230354043913635', measured: false,
    useWhen: 'growth and marketing advice with a call to action (DM me); fast, loud, social-media native',
    layouts: ['BleedSide', 'Interlude', 'CentreStage'],
  },
  paper: '#fdf7f0', dark: '#030303', vignette: 0, grid: false,
  ink: '#0a0404', inkOnDark: '#f8f8f8', keyword: '#f4101a', keywordOnDark: '#f4101a', accentMode: 'ink', highlight: '#f4101a',
  muted: '#0a0404', mutedWeight: 600,
  font: 'Inter', leadWeight: 600, keyWeight: 900, italic: false,
  star: null, starOnDark: null,
  text: {
    leadMode: 'words', fade: 11, fadeFrom: 0.3, blur: 8 / 720,
    leadBob: [0.3, 0.225, 0.169, 0.127, 0.095, 0.071, 0.053, 0.04, 0.03, 0.023, 0.017, 0.013, 0.01, 0.007, 0],
    keyTracking: -0.04, keyLineHeight: 0.9, keyGap: 0.22,
    // paper beats: rise 0.3 em at 0.75 a frame; black beats: the measured bob ("DM", cap 57 px), red 2 frames late, 1.4x
    rise: 0.3, riseKeep: 0.75,
    bob: [0.2, 0, -0.15, -0.22, -0.2, -0.15, -0.07, 0, 0.025, 0.05, 0.05, 0.025, 0.025, 0], bobLag: 2, bobGain: 1.4,
  },
  // bulb and card: down-right, 0.37 at the edge, gone by 60 px; white glow 0.17 at the glyph, half at 20 px, out to 120
  light: { castAlpha: 0.37, castOffset: [0.022, 0.014], castBlur: 0.05, glowTight: 0.25, glowWide: 1.1, glowStrength: 0.35 },
  shapes: { corner: 'none', cornerOnDark: 'none', smallPrint: 'none' },
  // the iris: 54, 190, 355, 559, 700, 740 px at 720 about the centre
  transition: { wipe: 'circle', radii: [0.075, 0.264, 0.493, 0.776, 0.972, 1.028] },
  texture: { paper: 0.3, ink: 0.4, grain: 0.35, scan: 0.25, moire: 0.1, halftone: 0 },
});
