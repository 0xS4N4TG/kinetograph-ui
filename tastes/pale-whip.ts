// Pale Whip: flat UI on a pale grey canvas, heavy whip blur between details, felt-tip red notes and a thin yellow
// pen, warm dark interludes, letterbox bars. Taken from templates/save-reel.

import { loadFont as loadInter } from '@remotion/google-fonts/InterTight';
import { loadFont as loadArchivo } from '@remotion/google-fonts/ArchivoBlack';
import { loadFont as loadMarker } from '@remotion/google-fonts/GochiHand';
import { loadFont as loadPen } from '@remotion/google-fonts/Caveat';
import type { Taste } from '../kit/core/taste.js';

export const paleWhip: Taste = {
  name: 'Pale Whip',
  canvas: '#ececec',
  ink: '#1c1c1e',
  muted: '#8e8e93',
  accent: '#2f6fd6',
  toggle: { off: [229, 229, 234], on: [88, 214, 110] },
  avatarRing: ['#fdc468', '#e3255f', '#9b3fe0'],
  fonts: {
    // Inter Tight: narrower and heavier than Inter at the same size, close to a phone's system UI type
    ui: loadInter('normal', { weights: ['400', '500', '600', '700', '800', '900'] }).fontFamily,
    display: loadArchivo('normal', { weights: ['400'] }).fontFamily,
    marker: loadMarker().fontFamily,
    pen: loadPen('normal', { weights: ['400'] }).fontFamily,
  },
  notes: { red: '#c4122f', yellow: '#f3e33c' },
  interlude: { colors: ['#8a621f', '#7e4030', '#7b2748'], shade: '#1d1d1d' },
  camera: { samples: 16, shutter: 1.6 },
  bars: '#000',
};
