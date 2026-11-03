#!/usr/bin/env node
// Offline blob tracker: finds the bright, dark or moving regions of a clip on every frame and follows each one from
// frame to frame under a steady id. A render only reads the JSON it writes, so frames stay pure and nothing here runs
// at render time. Needs ffmpeg and ffprobe on the PATH; nothing else.
//
//   node plugins/vj/tools/blobs.mjs --in clip.mp4 --out blobs.json [--mode motion] [--threshold 28] [--min 0.002]
//        [--max-area 0.25] [--max 12] [--fps 30] [--size 1920x1080] [--work 320] [--grow 2] [--link 0.12] [--hold 6] [--smooth 0.5]
//        [--debug out/blobs]
//
// --mode       bright: pixels brighter than --threshold; dark: darker than it; motion: pixels that changed by more than
//              it since the last frame (the default; follows people, cars, hands).
// --threshold  0..255. Defaults: bright 200, dark 50, motion 28.
// --min        smallest blob kept, as a fraction of the frame's area. --max: most blobs kept a frame (biggest first).
// --max-area   biggest blob kept, as a fraction of the frame's area: drops the frame-wide regions a cut, a flash or
//              a camera move makes. Default 0.25; 1 keeps everything.
// --size       the coordinate space written, the clip filling it (cover). Default: the clip's own size.
// --work       width of the grey copy the detector runs on. Smaller is faster and merges more.
// --grow       dilations of the mask before labelling: joins pieces of one thing (a body, a car) into one blob.
// --link       how far a blob may move between frames and keep its id, as a fraction of the frame's diagonal.
// --hold       frames a lost blob's id is kept for, in case it comes back.
// --smooth     0..1: how much each box eases toward where it was (0 is raw).
// --keep       frames a lost blob stays on screen at its last box, so a blob that drops out for a frame does not
//              blink. Default 2. (In motion mode a frame identical to the last, as in old film printed up to a
//              higher rate, is skipped and keeps the last frame's blobs.)
// --debug      writes every 10th frame with its boxes, as PNGs with this prefix, for a look by eye.
//
// Output: { clip, fps, width, height, mode, frames: [[[id, x, y, w, h, area], ...], ...] }: per frame, each blob's id,
// box (left, top, width, height) in --size pixels, and area as a fraction of the frame.

import { spawn, spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : dflt; };
const IN = opt('in');
const OUT = opt('out');
if (!IN || !OUT) {
  console.error('usage: blobs.mjs --in clip.mp4 --out blobs.json [--mode bright|dark|motion] [--threshold n] ...');
  process.exit(2);
}
const MODE = opt('mode', 'motion');
if (!['bright', 'dark', 'motion'].includes(MODE)) { console.error(`unknown --mode ${MODE}`); process.exit(2); }
const THRESHOLD = Number(opt('threshold', { bright: 200, dark: 50, motion: 28 }[MODE]));
const MIN = Number(opt('min', '0.002'));
const MAX = Number(opt('max', '12'));
const MAX_AREA = Number(opt('max-area', '0.25'));
const GROW = Number(opt('grow', '2'));
const LINK = Number(opt('link', '0.12'));
const HOLD = Number(opt('hold', '6'));
const SMOOTH = Number(opt('smooth', '0.5'));
const KEEP = Number(opt('keep', '2'));
const DEBUG = opt('debug');

const probe = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate', '-of', 'csv=p=0', IN], { encoding: 'utf8' });
if (probe.status !== 0) { console.error(probe.stderr || `ffprobe failed on ${IN}`); process.exit(1); }
const [cw, ch, rate] = probe.stdout.trim().split(',');
const [rn, rd] = rate.split('/').map(Number);
const FPS = Number(opt('fps', String(Math.round((rn / (rd || 1)) * 1000) / 1000)));
const [W, H] = (opt('size') ?? `${cw}x${ch}`).split('x').map(Number);
const w = Math.round(Number(opt('work', '320')) / 2) * 2;
const h = Math.round((w * H) / W / 2) * 2;
const S = W / w;

const ff = spawn('ffmpeg', ['-v', 'error', '-i', IN, '-vf', `fps=${FPS},scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},scale=${w}:${h},format=gray`, '-f', 'rawvideo', '-']);
const chunks = [];
ff.stdout.on('data', (c) => chunks.push(c));
ff.stderr.pipe(process.stderr);
ff.on('close', (code) => {
  if (code !== 0) process.exit(code ?? 1);
  const all = Buffer.concat(chunks);
  const n = Math.floor(all.length / (w * h));
  const frame = (i) => all.subarray(i * w * h, (i + 1) * w * h);

  /** The frame's grey, softened by a 3x3 box so single noisy pixels do not count. */
  const soften = (img) => {
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let s = 0, k = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const xx = x + i, yy = y + j;
        if (xx >= 0 && yy >= 0 && xx < w && yy < h) { s += img[yy * w + xx]; k++; }
      }
      out[y * w + x] = s / k;
    }
    return out;
  };

  const grow = (m) => {
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!m[y * w + x]) continue;
      out[y * w + x] = 1;
      if (x > 0) out[y * w + x - 1] = 1;
      if (x < w - 1) out[y * w + x + 1] = 1;
      if (y > 0) out[(y - 1) * w + x] = 1;
      if (y < h - 1) out[(y + 1) * w + x] = 1;
    }
    return out;
  };

  /** Connected regions of the mask (4-neighbour flood fill): box and area in work pixels, biggest first. */
  const regions = (m) => {
    const seen = new Uint8Array(w * h);
    const stack = new Int32Array(w * h);
    const out = [];
    for (let p = 0; p < w * h; p++) {
      if (!m[p] || seen[p]) continue;
      let top = 0, area = 0, x0 = w, y0 = h, x1 = 0, y1 = 0, sx = 0, sy = 0;
      stack[top++] = p; seen[p] = 1;
      while (top) {
        const q = stack[--top];
        const x = q % w, y = (q - x) / w;
        area++; sx += x; sy += y;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        const nb = [x > 0 ? q - 1 : -1, x < w - 1 ? q + 1 : -1, y > 0 ? q - w : -1, y < h - 1 ? q + w : -1];
        for (const r of nb) if (r >= 0 && m[r] && !seen[r]) { seen[r] = 1; stack[top++] = r; }
      }
      if (area >= MIN * w * h && area <= MAX_AREA * w * h) out.push({ x0, y0, x1: x1 + 1, y1: y1 + 1, area, cx: sx / area, cy: sy / area });
    }
    return out.sort((a, b) => b.area - a.area).slice(0, MAX);
  };

  const diag = Math.hypot(w, h);
  let nextId = 1;
  /** Live tracks: id, last box (smoothed), centre, frames since last seen. */
  let tracks = [];
  const frames = [];
  let prev = null;
  for (let f = 0; f < n; f++) {
    const g = soften(frame(f));
    if (MODE === 'motion' && prev) {
      let d = 0;
      for (let p = 0; p < w * h; p++) d += Math.abs(g[p] - prev[p]);
      if (d / (w * h) < 0.4) { frames.push(frames[frames.length - 1] ?? []); continue; }
    }
    let m = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) {
      const v = g[p];
      m[p] = MODE === 'bright' ? +(v > THRESHOLD) : MODE === 'dark' ? +(v < THRESHOLD) : prev ? +(Math.abs(v - prev[p]) > THRESHOLD) : 0;
    }
    prev = g;
    for (let i = 0; i < GROW; i++) m = grow(m);
    const found = regions(m);

    // match: closest pairs first, each track and each region used once, within LINK of the diagonal
    const pairs = [];
    for (let i = 0; i < tracks.length; i++) for (let j = 0; j < found.length; j++) {
      const d = Math.hypot(tracks[i].cx - found[j].cx, tracks[i].cy - found[j].cy);
      if (d < LINK * diag * (1 + tracks[i].lost * 0.5)) pairs.push([d, i, j]);
    }
    pairs.sort((a, b) => a[0] - b[0]);
    const usedT = new Set(), usedR = new Set();
    const next = [];
    for (const [, i, j] of pairs) {
      if (usedT.has(i) || usedR.has(j)) continue;
      usedT.add(i); usedR.add(j);
      const t = tracks[i], r = found[j], k = SMOOTH;
      next.push({
        id: t.id, lost: 0, cx: r.cx, cy: r.cy, area: r.area,
        x0: t.x0 * k + r.x0 * (1 - k), y0: t.y0 * k + r.y0 * (1 - k), x1: t.x1 * k + r.x1 * (1 - k), y1: t.y1 * k + r.y1 * (1 - k),
      });
    }
    found.forEach((r, j) => { if (!usedR.has(j)) next.push({ id: nextId++, lost: 0, ...r }); });
    tracks.forEach((t, i) => { if (!usedT.has(i) && t.lost < HOLD) next.push({ ...t, lost: t.lost + 1 }); });
    tracks = next;

    frames.push(tracks.filter((t) => t.lost <= KEEP).sort((a, b) => a.id - b.id).map((t) => [
      t.id, Math.round(t.x0 * S), Math.round(t.y0 * S), Math.round((t.x1 - t.x0) * S), Math.round((t.y1 - t.y0) * S),
      Math.round((t.area / (w * h)) * 1e5) / 1e5,
    ]));

    if (DEBUG && f % 10 === 0) {
      // the grey frame with its boxes in white, as a PGM piped through ffmpeg to PNG
      const img = Buffer.from(frame(f));
      for (const t of tracks) if (t.lost === 0) {
        const x0 = Math.max(0, Math.round(t.x0)), y0 = Math.max(0, Math.round(t.y0)), x1 = Math.min(w - 1, Math.round(t.x1)), y1 = Math.min(h - 1, Math.round(t.y1));
        for (let x = x0; x <= x1; x++) { img[y0 * w + x] = 255; img[y1 * w + x] = 255; }
        for (let y = y0; y <= y1; y++) { img[y * w + x0] = 255; img[y * w + x1] = 255; }
      }
      spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'gray', '-s', `${w}x${h}`, '-i', '-', `${DEBUG}-${String(f).padStart(4, '0')}.png`], { input: img });
    }
  }
  writeFileSync(OUT, JSON.stringify({ clip: IN, fps: FPS, width: W, height: H, mode: MODE, frames }) + '\n');
  const ids = new Set(frames.flat().map((b) => b[0]));
  const mean = frames.reduce((a, b) => a + b.length, 0) / Math.max(1, n);
  console.log(`${n} frames, ${ids.size} ids, ${mean.toFixed(1)} blobs a frame -> ${OUT}`);
});
