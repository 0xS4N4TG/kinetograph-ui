#!/usr/bin/env node
// Person matte for any clip: Robust Video Matting through vj-matte (plugins/vj/matte) when it is built, otherwise
// macOS Vision's person segmentation (tools/matte.swift), on every frame, written as a grey matte video (white = person) the same size and rate as the clip, and the person's place on every frame (the
// matte's centroid, smoothed) as a point track for <PopArt>'s rays and shapes to start from. A render only reads the
// two files, so frames stay pure and nothing here runs at render time. Needs ffmpeg and ffprobe, and vj-matte or (on macOS) swift.
//
//   node plugins/vj/tools/matte.mjs --in clip.mp4 --out matte.mp4 [--track person.json] [--engine rvm|vision] [--work 960] [--size 1920x1080]
//
// --engine rvm (the default when vj-matte is built) or vision.
// --work   width of the frames the model sees. Smaller is faster; the matte is scaled back up to the clip.
// --size   the coordinate space the track is written in (the clip filling it, cover). Default 1920x1080, the space
//          <PopArt> draws in.
//
// Track output: { fps, width, height, points: [[x, y], ...] } (tools/track.mjs's format, so pointAt() reads it).

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
if (!args.in || !args.out) {
  console.error('usage: matte.mjs --in clip.mp4 --out matte.mp4 [--track person.json] [--work 960] [--size 1920x1080]');
  process.exit(1);
}
const work = Number(args.work ?? 960);
const [SW, SH] = (args.size ?? '1920x1080').split('x').map(Number);

const run = (cmd, argv, opts = {}) => {
  const r = spawnSync(cmd, argv, { stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 1 << 30, ...opts });
  if (r.status !== 0) throw new Error(`${cmd} failed`);
  return r.stdout;
};

const probe = JSON.parse(
  run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate', '-of', 'json', args.in]).toString(),
).streams[0];
const [num, den] = probe.r_frame_rate.split('/').map(Number);
const fps = num / den;

// Robust Video Matting through vj-matte (plugins/vj/matte, a separate GPL-3.0 program) when it is built: faster,
// steadier from frame to frame and on any platform. macOS Vision otherwise.
const rvm = join(dirname(fileURLToPath(import.meta.url)), '..', 'matte', 'target', 'release', process.platform === 'win32' ? 'vj-matte.exe' : 'vj-matte');
if (args.engine !== 'vision' && existsSync(rvm)) {
  const extra = ['--work', String(work), '--size', `${SW}x${SH}`, ...(args.track ? ['--track', args.track] : [])];
  run(rvm, ['--in', args.in, '--out', args.out, ...extra], { stdio: ['ignore', 'inherit', 'inherit'] });
  process.exit(0);
}
if (process.platform !== 'darwin') {
  console.error('build vj-matte first (see plugins/vj/matte/README.md): macOS Vision is the only other way');
  process.exit(1);
}

const tmp = mkdtempSync(join(tmpdir(), 'vj-matte-'));
try {
  const frames = join(tmp, 'frames');
  const mattes = join(tmp, 'matte');
  run('mkdir', ['-p', frames]);
  run('ffmpeg', ['-v', 'error', '-i', args.in, '-vf', `scale=${work}:-2`, join(frames, '%06d.png')]);
  const swift = join(dirname(fileURLToPath(import.meta.url)), 'matte.swift');
  run('swift', [swift, frames, mattes], { stdio: ['ignore', 'inherit', 'inherit'] });
  run('ffmpeg', [
    '-v', 'error', '-y', '-framerate', String(fps), '-i', join(mattes, '%06d.png'),
    '-vf', `scale=${probe.width}:${probe.height}:flags=bicubic,format=yuv420p`,
    '-c:v', 'libx264', '-crf', '20', '-movflags', '+faststart', args.out,
  ]);
  console.log(`matte -> ${args.out}`);

  if (args.track) {
    // the matte at a small size in the track's space (cover), and its centroid per frame
    const tw = 192, th = Math.round((192 * SH) / SW);
    const raw = run('ffmpeg', [
      '-v', 'error', '-i', args.out,
      '-vf', `scale=${tw}:${th}:force_original_aspect_ratio=increase,crop=${tw}:${th},format=gray`, '-f', 'rawvideo', '-',
    ]);
    const n = tw * th;
    const points = [];
    for (let i = 0; i + n <= raw.length; i += n) {
      let sx = 0, sy = 0, c = 0;
      for (let p = 0; p < n; p++) {
        if (raw[i + p] > 128) { sx += p % tw; sy += Math.floor(p / tw); c++; }
      }
      // nobody on screen: hold the last place (or the middle)
      const last = points[points.length - 1] ?? [SW / 2, SH / 2];
      points.push(c ? [(sx / c + 0.5) * (SW / tw), (sy / c + 0.5) * (SH / th)] : last);
    }
    // smoothed over nine frames, so the rays do not jitter with the matte's edge
    const smooth = points.map((_, i) => {
      const win = points.slice(Math.max(0, i - 4), i + 5);
      return [0, 1].map((k) => Math.round(win.reduce((s, p) => s + p[k], 0) / win.length));
    });
    writeFileSync(args.track, JSON.stringify({ fps, width: SW, height: SH, points: smooth }));
    console.log(`${smooth.length} frames -> ${args.track}`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
