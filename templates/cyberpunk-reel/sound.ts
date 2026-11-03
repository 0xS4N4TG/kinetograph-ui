// The reel's sound, synthesised (the reference's own audio is not used): a glitch burst and a downward
// zap as each cut in starts, a sub thump and a bright stab when the look lands, stuttered noise on each
// cut out, and a click on the flash frame. Noise comes from `random(seed)`, never the clock.

import { random } from 'remotion';
import { onFrame } from '@kinetographdev/audio';
import type { OnFrameCallback } from '@kinetographdev/audio';
import { FLASH, WINDOWS } from './timing.js';

type Ctx = Parameters<OnFrameCallback>[0];
const FPS = 24;

const outs = new WeakMap<Ctx, { bus: GainNode; noise: AudioBuffer }>();
function out(ctx: Ctx) {
  let o = outs.get(ctx);
  if (!o) {
    const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = random(`noise-${i}`) * 2 - 1;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.15;
    const bus = ctx.createGain();
    bus.gain.value = 1.2;
    bus.connect(limiter).connect(ctx.destination);
    o = { bus, noise };
    outs.set(ctx, o);
  }
  return o;
}

/** Noise through a band-pass, gated on and off in short random steps. */
function stutter(ctx: Ctx, t: number, len: number, freq: number, key: string, level = 0.5) {
  const { bus, noise } = out(ctx);
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq;
  bp.Q.value = 1.4;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  for (let s = 0, i = 0; s < len; i++) {
    const step = 0.018 + random(`${key}-s${i}`) * 0.04;
    g.gain.setValueAtTime(random(`${key}-g${i}`) < 0.6 ? level : 0, t + s);
    bp.frequency.setValueAtTime(freq * (0.5 + random(`${key}-f${i}`) * 2), t + s);
    s += step;
  }
  g.gain.setValueAtTime(0, t + len);
  src.connect(bp).connect(g).connect(bus);
  src.start(t);
  src.stop(t + len + 0.01);
}

function zap(ctx: Ctx, t: number, from: number, to: number, len: number, level: number, type: OscillatorType = 'square') {
  const { bus } = out(ctx);
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(to, t + len);
  const g = ctx.createGain();
  g.gain.setValueAtTime(level, t);
  g.gain.exponentialRampToValueAtTime(0.0005, t + len);
  o.connect(g).connect(bus);
  o.start(t);
  o.stop(t + len + 0.01);
}

function stab(ctx: Ctx, t: number) {
  const { bus } = out(ctx);
  zap(ctx, t, 120, 38, 0.45, 0.9, 'sine'); // sub thump
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(5200, t);
  lp.frequency.exponentialRampToValueAtTime(600, t + 0.6);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.16, t);
  g.gain.exponentialRampToValueAtTime(0.0005, t + 0.7);
  lp.connect(g).connect(bus);
  for (const [i, f] of [220, 277.2, 329.6, 440, 554.4].entries()) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    o.detune.value = (i - 2) * 7;
    o.connect(lp);
    o.start(t);
    o.stop(t + 0.72);
  }
}

for (const [w, win] of WINDOWS.entries()) {
  onFrame(win.in[0], (ctx, t) => {
    stutter(ctx, t, (win.in[1] - win.in[0]) / FPS, 2400, `in${w}`);
    zap(ctx, t, 2800, 90, 0.35, 0.12);
  });
  onFrame(win.in[1], (ctx, t) => stab(ctx, t));
  onFrame(win.out[0], (ctx, t) => {
    stutter(ctx, t, (win.out[1] - win.out[0]) / FPS, 1400, `out${w}`, 0.35);
    zap(ctx, t, 400, 1600, 0.25, 0.06, 'sawtooth');
  });
}
onFrame(FLASH, (ctx, t) => {
  zap(ctx, t, 6000, 3000, 0.04, 0.3);
  zap(ctx, t, 90, 40, 0.2, 0.6, 'sine');
});
