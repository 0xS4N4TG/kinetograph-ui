// The signal behind the visualisers, read from the decoded audio (useAudioData). It works like After Effects' Audio
// Waveform effect: at each frame a short window of the raw signal (windowMs, centred on the frame's time) is drawn as
// `samples` points, each the signed mean of a few samples at that point, so a bass note reads as a slow wave and a hat as
// fuzz. Values come out in -1..1 against the file's own peak.

import type { MediaUtilsAudioData } from '@kinetographdev/core/media-utils';

const peaks = new WeakMap<MediaUtilsAudioData, { peak: number; rms: number }>();

/** The loudest sample and the loudest 50 ms RMS of the file (for normalising), once per file. */
function stats(data: MediaUtilsAudioData) {
  const known = peaks.get(data);
  if (known) return known;
  const ch = data.channelWaveforms[0];
  let peak = 0;
  for (let i = 0; i < ch.length; i++) peak = Math.max(peak, Math.abs(ch[i]));
  const win = Math.round(data.sampleRate * 0.05);
  let rms = 0;
  for (let s = 0; s + win < ch.length; s += win) {
    let sum = 0;
    for (let i = s; i < s + win; i++) sum += ch[i] * ch[i];
    rms = Math.max(rms, Math.sqrt(sum / win));
  }
  const out = { peak: peak || 1, rms: rms || 1 };
  peaks.set(data, out);
  return out;
}

/** Channel 0..n-1 averaged, at sample index i (0 outside the file). */
const at = (data: MediaUtilsAudioData, i: number) => {
  if (i < 0 || i >= data.channelWaveforms[0].length) return 0;
  let v = 0;
  for (const ch of data.channelWaveforms) v += ch[i];
  return v / data.channelWaveforms.length;
};

/** The waveform at time t (seconds): `samples` signed values in -1..1 over `windowMs`, shifted by `delayMs`. */
export function scope(data: MediaUtilsAudioData, t: number, windowMs: number, samples: number, delayMs = 0): number[] {
  const { peak } = stats(data);
  const sr = data.sampleRate;
  const span = (windowMs / 1000) * sr;
  const start = (t - delayMs / 1000) * sr - span / 2;
  // A few samples per point, not the whole stretch: After Effects picks points off the raw signal, so a hat or a
  // vocal edge stays as jitter on the trace instead of being averaged into a smooth sine.
  const block = Math.max(1, Math.min(6, Math.floor(span / samples)));
  const out: number[] = [];
  for (let k = 0; k < samples; k++) {
    const c = Math.round(start + (k / Math.max(1, samples - 1)) * span);
    let sum = 0;
    for (let j = -Math.floor(block / 2); j < Math.ceil(block / 2); j++) sum += at(data, c + j);
    out.push(Math.max(-1, Math.min(1, sum / block / peak)));
  }
  return out;
}

/** Loudness at time t, 0..1: the RMS of the 50 ms before t against the file's loudest 50 ms, with a fast attack and a
 *  120 ms release (followed back from t, so it is a pure function of the frame). */
export function level(data: MediaUtilsAudioData, t: number): number {
  const { rms } = stats(data);
  const sr = data.sampleRate;
  const hop = 0.01;
  let env = 0;
  for (let back = 0.3; back >= 0; back -= hop) {
    const end = Math.round((t - back) * sr);
    const win = Math.round(0.05 * sr);
    let sum = 0;
    for (let i = end - win; i < end; i++) {
      const v = at(data, i);
      sum += v * v;
    }
    const x = Math.sqrt(sum / win) / rms;
    env = x > env ? x : env * Math.exp(-hop / 0.12);
  }
  return Math.min(1, env);
}
