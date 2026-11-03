// Synthesised sound effects for the reels, written with onFrame from @kinetographdev/audio: whooshes for camera
// whips, clicks for taps, pops for things that appear, a thud, pen scratch, page flicks, and plain tones for beds and
// chimes.
// Everything runs through one bus with a limiter and a soft clip. Noise comes from `random(seed)`, never the clock,
// so a render is repeatable.
//
//   onFrame(whipFrame - 4, (ctx, t) => whoosh(ctx, t));
//   onFrame(tapFrame, (ctx, t) => click(ctx, t));
//
// These are placeholders with good timing: swap in recorded sounds at the same frames when you have them.

import { random } from 'remotion';
import type { OnFrameCallback } from '@kinetographdev/audio';

export type Ctx = Parameters<OnFrameCallback>[0];

const outs = new WeakMap<Ctx, { bus: GainNode; noise: AudioBuffer }>();
function out(ctx: Ctx) {
  let o = outs.get(ctx);
  if (!o) {
    const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = random(`noise-${i}`) * 2 - 1;
    // a hard compressor, then the make-up gain, then a soft clip so no transient goes past full scale
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -18;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.2;
    const makeup = ctx.createGain();
    makeup.gain.value = 0.7;
    const clip = ctx.createWaveShaper();
    const curve = new Float32Array(1025);
    for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh(((i / 1024) * 2 - 1) * 1.2) / Math.tanh(1.2) * 0.85;
    clip.curve = curve;
    const bus = ctx.createGain();
    bus.gain.value = 2;
    bus.connect(limiter).connect(makeup).connect(clip).connect(ctx.destination);
    o = { bus, noise };
    outs.set(ctx, o);
  }
  return o;
}

function noiseSrc(ctx: Ctx, t: number, len: number) {
  const src = ctx.createBufferSource();
  src.buffer = out(ctx).noise;
  src.loop = true;
  src.start(t, random(`off-${t}`) * 0.9);
  src.stop(t + len + 0.02);
  return src;
}

/** Filtered noise swelling and sweeping up then down: a camera whip. */
export function whoosh(ctx: Ctx, t: number, len = 0.35, level = 0.35, from = 400, peak = 3200) {
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 0.9;
  bp.frequency.setValueAtTime(from, t);
  bp.frequency.exponentialRampToValueAtTime(peak, t + len * 0.55);
  bp.frequency.exponentialRampToValueAtTime(from, t + len);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(level, t + len * 0.55);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  noiseSrc(ctx, t, len).connect(bp).connect(g).connect(out(ctx).bus);
}

/** A short tick: UI taps and toggles. */
export function click(ctx: Ctx, t: number, freq = 2400, level = 0.25) {
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * 0.5, t + 0.03);
  const g = ctx.createGain();
  g.gain.setValueAtTime(level, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
  o.connect(g).connect(out(ctx).bus);
  o.start(t);
  o.stop(t + 0.05);
}

/** A rounded pop for things that appear (the sheet, the notification). */
export function pop(ctx: Ctx, t: number, freq = 520, level = 0.3) {
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq * 0.6, t);
  o.frequency.exponentialRampToValueAtTime(freq * 1.6, t + 0.06);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(level, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  o.connect(g).connect(out(ctx).bus);
  o.start(t);
  o.stop(t + 0.14);
}

export function thud(ctx: Ctx, t: number, level = 0.6) {
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.18);
  const g = ctx.createGain();
  g.gain.setValueAtTime(level, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
  o.connect(g).connect(out(ctx).bus);
  o.start(t);
  o.stop(t + 0.27);
}

/** A page flicked over: a short burst of bright noise with a papery band, `key` varying each one. */
export function flick(ctx: Ctx, t: number, key: string, level = 0.18) {
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1800;
  const bp = ctx.createBiquadFilter();
  bp.type = 'peaking';
  bp.frequency.value = 3000 + random(`${key}-f`) * 3000;
  bp.gain.value = 8;
  const g = ctx.createGain();
  const len = 0.05 + random(`${key}-l`) * 0.04;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(level * (0.7 + random(`${key}-g`) * 0.3), t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.001, t + len);
  noiseSrc(ctx, t, len).connect(hp).connect(bp).connect(g).connect(out(ctx).bus);
}

/** Pen on paper: band-passed noise in short strokes. */
export function scratch(ctx: Ctx, t: number, len: number, key: string, level = 0.12) {
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  for (let s = 0, i = 0; s < len; i++) {
    const step = 0.05 + random(`${key}-s${i}`) * 0.08;
    g.gain.setValueAtTime(0, t + s);
    g.gain.linearRampToValueAtTime(level * (0.5 + random(`${key}-g${i}`) * 0.5), t + s + step * 0.4);
    g.gain.linearRampToValueAtTime(0, t + s + step);
    bp.frequency.setValueAtTime(2500 + random(`${key}-f${i}`) * 3500, t + s);
    s += step;
  }
  noiseSrc(ctx, t, len).connect(bp).connect(g).connect(out(ctx).bus);
}

export function tone(ctx: Ctx, t: number, len: number, freq: number, level: number, type: OscillatorType, attack: number, release: number) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1800;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(level, t + attack);
  g.gain.setValueAtTime(level, t + Math.max(attack, len - release));
  g.gain.linearRampToValueAtTime(0, t + len);
  o.connect(lp).connect(g).connect(out(ctx).bus);
  o.start(t);
  o.stop(t + len + 0.01);
}

export const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
