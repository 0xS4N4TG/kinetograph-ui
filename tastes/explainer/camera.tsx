// The explainer's camera: whole-beat moves about the frame centre, numbers from the taste's `camera` group (BASE:
// measured off pins 933 and 971). Wrap a beat's layers in one or more `<Camera>`s; nest them to combine moves (a roll
// inside a push). Every move is rigid: no parallax, the whole beat moves as one picture, as in the references.
//
//   push      push in: scale 1 + amount (1 - keep^n) + drift n (933: 1.00 to 1.70 over 35 frames)
//   pan       a translation by `gap` (W, H): the next scene arrives from where it sits; speed ramps up over panRise
//             frames, then keeps panKeep of itself a frame (971: 1.03 H in 35 frames, peak 0.19 W a frame)
//   roll-in   settle from rollFrom degrees, keeping rollKeep a frame (933 B5: -65 to 0)
//   roll-out  a n + b n^2 degrees clockwise, an exit (933 B4)
//   arrive    focus pull: blurred on the first frame, sharp after arriveFrames (971 S2)
//   defocus   an exit: the arrive in reverse, fading out over half as many frames (1061's blur-through-cut: blur out,
//             cut, then `arrive` on the next beat)
//   zoom-out  an exit: the scene shrinks along the taste's table and fades to paper (971 S2)
//   flicker   an exit: brightness along the taste's table (933 B1)

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp01 } from './stage.js';
import type { ExplainerTaste } from './taste.js';

export type CameraMove = 'push' | 'pan' | 'roll-in' | 'roll-out' | 'arrive' | 'defocus' | 'zoom-out' | 'flicker';

/** How far a pan has gone, 0..1, `n` frames after it starts. Against pin 971's measured pan (1319 px over f70-f105)
 *  it is within 34 px (2.6%) on every frame. */
export const panProgress = (taste: ExplainerTaste, n: number) => {
  const { panRise: r, panKeep: k } = taste.camera;
  const v = (i: number) => (i < r ? ((i + 1) / (r + 1)) ** 1.5 : k ** (i - r));
  const total = Array.from({ length: r }, (_, i) => v(i)).reduce((a, b) => a + b, 0) + 1 / (1 - k);
  if (n < 0) return 0;
  let s = 0;
  for (let i = 0; i <= Math.floor(n); i++) s += v(i);
  return clamp01(s / total);
};

/** A table value on frame `n`, holding the last entry after the end. */
const at = (table: number[], n: number, before = table[0] ?? 1) => (n < 0 ? before : table[Math.min(table.length - 1, Math.floor(n))] ?? before);

export interface CameraProps {
  taste: ExplainerTaste;
  move: CameraMove;
  /** the frame the move starts */
  t0: number;
  /** pan: where this scene sits relative to the one before, in W and H; it travels from there to 0. The outgoing scene
   *  gets the same Camera with `leaving`, travelling from 0 to minus the gap. */
  gap?: [number, number];
  leaving?: boolean;
  /** override the taste's numbers for this move (push: amount and drift) */
  amount?: number;
  drift?: number;
  children?: React.ReactNode;
}

export const Camera: React.FC<CameraProps> = ({ taste, move, t0, gap = [0, 1], leaving, amount, drift, children }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const C = taste.camera, n = f - t0;
  let tx = 0, ty = 0, s = 1, rot = 0, blur = 0, bright = 1, fade = 0;
  if (move === 'push' && n > 0) s = 1 + (amount ?? C.pushAmount) * (1 - C.pushKeep ** n) + (drift ?? C.pushDrift) * n;
  if (move === 'pan') {
    const p = panProgress(taste, n), k = leaving ? -p : 1 - p;
    tx = k * gap[0] * W; ty = k * gap[1] * H;
  }
  if (move === 'roll-in') rot = (amount ?? C.rollFrom) * C.rollKeep ** Math.max(0, n);
  if (move === 'roll-out' && n > 0) rot = C.rollOut[0] * n + C.rollOut[1] * n * n;
  if (move === 'arrive') blur = (amount ?? C.arriveBlur) * W * (1 - clamp01(n / C.arriveFrames));
  let opacity = 1;
  if (move === 'defocus' && n > 0) { const k = clamp01(n / Math.max(1, C.arriveFrames / 2)); blur = (amount ?? C.arriveBlur) * W * k; opacity = 1 - k; }
  if (move === 'zoom-out' && n > 0) { s = at(C.zoomOut, n); fade = clamp01((n - C.zoomFade[0]) / (C.zoomFade[1] - C.zoomFade[0])); }
  if (move === 'flicker' && n >= 0) bright = at(C.flicker, n);
  const filter = [blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : '', bright !== 1 ? `brightness(${bright.toFixed(2)})` : ''].join(' ').trim();
  return (
    <AbsoluteFill style={{ transform: `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) rotate(${rot.toFixed(2)}deg) scale(${s.toFixed(4)})`, transformOrigin: '50% 50%', filter: filter || undefined, opacity: opacity < 1 ? opacity : undefined }}>
      {children}
      {fade > 0 && <AbsoluteFill style={{ background: taste.paper, opacity: fade }} />}
    </AbsoluteFill>
  );
};
