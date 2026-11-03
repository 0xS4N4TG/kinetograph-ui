// Paper sounds, synthesised with onFrame from @kinetographdev/audio (noise from `random(seed)`, never the clock, so a
// render is repeatable). Call at the top level of the composition's module, with frames in the composition's time.
//
//   flicks({ start: 0, frames: 150, fps: 30, cutsPerSecond: 10 });   // a paper flick on every cut of a <MatchCut>

import { random } from '@kinetographdev/core';
import { onFrame, type OnFrameCallback } from '@kinetographdev/audio';

type Ctx = Parameters<OnFrameCallback>[0];

const buffers = new WeakMap<Ctx, AudioBuffer>();
function noise(ctx: Ctx) {
  let b = buffers.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = random(`paper-noise-${i}`) * 2 - 1;
    buffers.set(ctx, b);
  }
  return b;
}

/** A page flicked over: a short burst of bright noise with a papery band, `key` varying each one. */
export function flick(ctx: Ctx, t: number, key: string, level = 0.18) {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  src.loop = true;
  const len = 0.05 + random(`${key}-l`) * 0.04;
  src.start(t, random(`${key}-o`) * 0.9);
  src.stop(t + len + 0.02);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1800;
  const band = ctx.createBiquadFilter();
  band.type = 'peaking';
  band.frequency.value = 3000 + random(`${key}-f`) * 3000;
  band.gain.value = 8;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(level * (0.7 + random(`${key}-g`) * 0.3), t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.001, t + len);
  src.connect(hp).connect(band).connect(g).connect(ctx.destination);
}

/** A flick on every cut: cuts begin at frame `start` and come `cutsPerSecond` a second for `frames` frames. */
export function flicks({ start = 0, frames, fps, cutsPerSecond, level }: { start?: number; frames: number; fps: number; cutsPerSecond: number; level?: number }) {
  for (let n = 0; Math.ceil((n * fps) / cutsPerSecond) < frames; n++) {
    onFrame(start + Math.ceil((n * fps) / cutsPerSecond), (ctx, t) => flick(ctx, t, `cut-${n}`, level));
  }
}

/** Paper crumpled or opened: a dense burst of crackles (each a millisecond or so of noise, loudness spread like
 *  real crumpling: mostly faint, now and then a loud snap) over a soft rustle, `length` seconds long. Built sample by
 *  sample into one buffer from `random(key)`, then shaped: high-passed, a papery presence lift. */
export function crinkle(ctx: Ctx, t: number, key: string, level = 0.3, length = 0.16) {
  const rate = ctx.sampleRate;
  const n = Math.ceil(rate * (length + 0.02));
  const buf = ctx.createBuffer(1, n, rate);
  const d = buf.getChannelData(0);
  let seed = Math.floor(random(`${key}-seed`) * 4294967296) >>> 0;
  const r = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  // the rustle: noise under a wandering envelope, swelling and dying over the burst
  let env = 0;
  for (let i = 0; i < n; i++) {
    const u = i / (rate * length);
    env += (r() - 0.5) * 0.02;
    env = Math.max(0, Math.min(1, env));
    const shape = u < 1 ? Math.sin(Math.PI * Math.min(1, u * 1.4)) : 0;
    d[i] = (r() * 2 - 1) * 0.08 * shape * (0.4 + env);
  }
  // the crackles, bunched towards the start
  const count = Math.round(length * (350 + r() * 250));
  for (let k = 0; k < count; k++) {
    const at = Math.floor(Math.pow(r(), 1.4) * length * rate);
    const tau = rate * (0.0004 + r() * 0.0025);
    const amp = Math.min(1, 0.06 / Math.pow(r() + 0.02, 0.9));
    for (let i = 0; i < tau * 5 && at + i < n; i++) d[at + i] += (r() * 2 - 1) * amp * Math.exp(-i / tau);
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 650;
  const air = ctx.createBiquadFilter();
  air.type = 'peaking';
  air.frequency.value = 3200 + random(`${key}-f`) * 1800;
  air.Q.value = 0.7;
  air.gain.value = 5;
  const top = ctx.createBiquadFilter();
  top.type = 'lowpass';
  top.frequency.value = 11000;
  const g = ctx.createGain();
  g.gain.value = level * 0.5;
  src.connect(hp).connect(air).connect(top).connect(g).connect(ctx.destination);
  src.start(t);
}

/** A sheet landing flat on a desk: a soft low thump of air and paper, with a few crackles on top. */
export function land(ctx: Ctx, t: number, key: string, level = 0.3) {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  src.loop = true;
  src.start(t, random(`${key}-o`) * 0.9);
  src.stop(t + 0.12);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 520;
  lp.Q.value = 0.9;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(level * 1.6, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  src.connect(lp).connect(g).connect(ctx.destination);
  crinkle(ctx, t, `${key}-tail`, level * 0.35, 0.06);
}

/** The sound of a <FoldOut>: a crinkle on each stop-motion step while it opens (louder as the flaps get bigger), then
 *  the sheet landing flat. Pass the FoldOut's `delay`, `duration` and `steps` (defaults the same: 0, 0.7 s, 10), and
 *  `start`, the composition frame its Sequence starts on. */
export function unfolds({ start = 0, fps, delay = 0, duration = Math.round(fps * 0.7), steps = 10, level = 0.3 }: { start?: number; fps: number; delay?: number; duration?: number; steps?: number; level?: number }) {
  const hold = fps / steps;
  const count = Math.ceil(duration / hold);
  for (let n = 0; n < count; n++) {
    const lv = level * (0.6 + (0.4 * n) / Math.max(1, count - 1));
    onFrame(start + delay + Math.round(n * hold), (ctx, t) => crinkle(ctx, t, `unfold-${start}-${n}`, lv, 0.12 + 0.05 * random(`unfold-${start}-${n}-len`)));
  }
  onFrame(start + delay + Math.round(count * hold), (ctx, t) => land(ctx, t, `unfold-${start}-land`, level));
}
