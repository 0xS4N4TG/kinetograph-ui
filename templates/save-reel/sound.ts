// The reel's sound, synthesised (the reference's own audio is not used): a soft pulsing bed of our own chords for
// the first 19 s, a warm low pad under the photo, whooshes on every whip, clicks and pops on the UI, pen scratch
// under the ink, a thud for the bouncing bookmark and a chime on the end card. The hit frames are the reference's
// onsets. Noise comes from `random(seed)`, never the clock.

import { onFrame } from '@kinetographdev/audio';
import { click, hz, pop, scratch, thud, tone, whoosh } from '../../kit/core/sfx.js';

// our own progression, one chord a bar at 96 bpm: Dmaj9, Bm9, Gmaj7, A6
const CHORDS = [
  [50, 62, 66, 69, 76],
  [47, 62, 66, 69, 73],
  [43, 59, 62, 66, 71],
  [45, 61, 64, 66, 69],
];
const BAR = (60 / 96) * 4;

onFrame(0, (ctx, t) => {
  // the bed: plucked chord pulses on the eighths and a soft kick on the beats, for the first 19 s
  for (let bar = 0; bar * BAR < 19; bar++) {
    const ch = CHORDS[bar % 4];
    for (let e = 0; e < 8; e++) {
      const at = t + bar * BAR + (e * BAR) / 8;
      if (at - t > 19) break;
      for (const n of ch.slice(1)) tone(ctx, at, BAR / 8, hz(n), 0.022, 'triangle', 0.005, 0.12);
      if (e % 2 === 0) thud(ctx, at, 0.22);
    }
    tone(ctx, t + bar * BAR, BAR, hz(ch[0] - 12), 0.12, 'sine', 0.02, 0.2);
  }
  // under the photo and the ink: a slow warm pad, fading out on the end card
  for (let k = 0; k < 4; k++) {
    const at = t + 19 + k * 4;
    for (const n of CHORDS[(k + 2) % 4]) tone(ctx, at, 4.6, hz(n - 12), 0.035, 'sine', 1.2, 1.4);
  }
});

const WHIPS = [54, 110, 134, 150, 176, 197, 240, 280, 342, 366, 408, 446, 450, 495, 540, 744];
for (const f of WHIPS) onFrame(f - 4, (ctx, t) => whoosh(ctx, t, 0.38, 0.3));

for (const f of [17, 42, 108, 294, 324, 336, 483]) onFrame(f, (ctx, t) => click(ctx, t));
for (const f of [300, 312, 391, 422]) onFrame(f, (ctx, t) => pop(ctx, t));
onFrame(343, (ctx, t) => thud(ctx, t, 0.6));
onFrame(352, (ctx, t) => thud(ctx, t, 0.35));

onFrame(18, (ctx, t) => scratch(ctx, t, 0.5, 'like'));
onFrame(36, (ctx, t) => scratch(ctx, t, 0.45, 'save'));
onFrame(798, (ctx, t) => scratch(ctx, t, 1.1, 'forever'));

onFrame(949, (ctx, t) => {
  for (const [i, n] of [74, 78, 81, 86].entries()) tone(ctx, t + i * 0.06, 2.4, hz(n), 0.05, 'sine', 0.01, 2.2);
});
