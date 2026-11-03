// Prepares any video for the wish style:
//
//   node tools/prepare.mjs <video> <name> [eye height m = 1.6] [starting tilt deg = 0] [start s] [length s]
//
// writes public/<name>.mp4 (1440 x 1080, 30 fps, cropped to fill), cams/<name>.ts (the camera, tracked by
// tools/track-camera.mjs) and public/<name>_photo0..7.jpg (stills for the collage). The footage should be
// handheld or moving with a floor in view; the tilt is how far the camera looks below the horizon at the start
// (negative looks down). Then use { src: '<name>.mp4', track: <name> } as a clip (index.tsx).
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [src, name, eye = '1.6', tilt = '0', start, length] = process.argv.slice(2);
if (!src || !name) {
  console.error('usage: node tools/prepare.mjs <video> <name> [eye height m] [starting tilt deg] [start s] [length s]');
  process.exit(1);
}
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 1 << 30 });
  if (r.status !== 0) process.exit(r.status ?? 1);
  return r.stdout.toString();
};

const plate = join(root, 'public', `${name}.mp4`);
const cut = [...(start ? ['-ss', start] : []), ...(length ? ['-t', length] : [])];
run('ffmpeg', ['-v', 'error', '-y', ...cut, '-i', src, '-an', '-vf', 'scale=1440:1080:force_original_aspect_ratio=increase,crop=1440:1080,fps=30,setsar=1',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
  '-movflags', '+faststart', plate]);
console.log(`wrote public/${name}.mp4`);

const track = run('node', [join(root, 'tools', 'track-camera.mjs'), plate, eye, tilt]);
mkdirSync(join(root, 'cams'), { recursive: true });
writeFileSync(join(root, 'cams', `${name}.ts`), `// Made by tools/prepare.mjs from ${name}.mp4; do not edit.\nexport default ${track}`);
console.log(`wrote cams/${name}.ts`);

const dur = Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', plate]));
for (let i = 0; i < 8; i++) {
  const t = ((i + 0.5) / 8) * dur;
  run('ffmpeg', ['-v', 'error', '-y', '-ss', t.toFixed(2), '-i', plate, '-frames:v', '1', '-vf', 'scale=640:-1', '-q:v', '3', join(root, 'public', `${name}_photo${i}.jpg`)]);
}
console.log(`wrote public/${name}_photo0..7.jpg`);
