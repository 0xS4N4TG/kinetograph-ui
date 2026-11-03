// Cuts for another track: finds the hits in an audio file and prints the CUTS line for script.ts.
//
//   node templates/word-flash/tools/cuts.mjs <audio> [--shots 24] [--fps 30] [--from 0] [--gap 6] [--peak 0.02]
//
// A hit is a jump in loudness (log energy over 40 ms windows, every 5 ms). The strongest `shots - 1` hits at least
// `gap` frames apart become cuts, after the first shot at frame 0; `--from` skips that many seconds of the track
// first (trim the audio the same way in index.tsx). Run on the reference's own audio it gives back the reference's
// cuts to within two frames (most within one). Needs ffmpeg.

import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--') && !/^\d/.test(a));
const opt = (name, d) => {
  const i = args.indexOf(`--${name}`);
  return i < 0 ? d : Number(args[i + 1]);
};
if (!file) {
  console.error('usage: node tools/cuts.mjs <audio> [--shots 24] [--fps 30] [--from 0] [--gap 6]');
  process.exit(1);
}
const [shots, fps, from, gap] = [opt('shots', 24), opt('fps', 30), opt('from', 0), opt('gap', 6)];
const PEAK = opt('peak', 0.02);

const SR = 22050;
const raw = execFileSync('ffmpeg', ['-v', 'error', '-ss', String(from), '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], {
  maxBuffer: 1 << 30,
});
const x = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);

// loudness every 5 ms, the rise into each window, then peaks of the rise
const hop = Math.round(SR * 0.005);
const win = Math.round(SR * 0.04);
const env = [];
for (let i = 0; i + win < x.length; i += hop) {
  let e = 0;
  for (let j = 0; j < win; j++) e += x[i + j] * x[i + j];
  env.push(Math.log(1e-7 + e / win));
}
// the window ending at a hit is where the energy jumps, so the hit is at the end of the window
const rise = env.map((v, i) => (i ? Math.max(0, v - env[i - 1]) : 0));
const hits = [];
for (let i = 3; i < rise.length - 3; i++) {
  const around = rise.slice(i - 3, i + 4);
  if (rise[i] > 0.15 && rise[i] === Math.max(...around)) {
    // the cut lands where the hit is loudest, up to `--peak` seconds after it starts
    let k = i;
    for (let j = i; j < Math.min(env.length, i + PEAK / 0.005); j++) if (env[j] > env[k]) k = j;
    hits.push({ t: (k * hop + win) / SR, s: rise[i] });
  }
}

// strongest first, kept if far enough from every cut taken
const minGap = gap / fps;
const taken = [];
for (const h of [...hits].sort((a, b) => b.s - a.s)) {
  if (taken.length >= shots - 1) break;
  if (h.t < minGap) continue;
  if (taken.every((t) => Math.abs(t - h.t) >= minGap)) taken.push(h.t);
}
taken.sort((a, b) => a - b);
if (taken.length < shots - 1) console.error(`only ${taken.length + 1} cuts for ${shots} shots: lower --gap or use a busier track`);

const cuts = [0, ...taken.map((t) => Math.round(t * fps))];
const end = Math.floor((x.length / SR) * fps);
console.log(`export const CUTS = [${cuts.join(', ')}];`);
console.log(`export const END = ${end};`);
