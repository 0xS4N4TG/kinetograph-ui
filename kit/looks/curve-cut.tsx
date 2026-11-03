// Cutting the curve: two shots under one parent transform whose scale runs on an After Effects
// "speed spike" ease, speed 0 at both keys with influence dragged to about 97%: cubic-bezier(0.97, 0, 0.03, 1). The
// cut sits on the middle frame, where the move is fastest, so the eye reads one continuous move across two pictures.
// Measured: at the seamless cut the zoom-out runs -3.6% a frame before and -2.1% after (one continuous decay); the
// matched shape (a pediment apex) keeps its x within 4 px across the cut, its size need not match. Both shots are on
// twos in the reference (wrap in <Posterize>).
import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';

export const SPEED_SPIKE = Easing.bezier(0.97, 0, 0.03, 1);

export interface CurveCutProps {
  /** the shot before the cut and the one after */
  a: React.ReactNode;
  b: React.ReactNode;
  /** the move's first frame and length; the cut is at its middle frame unless `cut` says otherwise */
  start: number;
  duration: number;
  cut?: number;
  /** scale at the two keys (2.2 -> 1 zooms out, 1 -> 2.2 pushes in) */
  scale?: [number, number];
  /** a slide too, in fractions of the frame, at the two keys */
  shift?: [[number, number], [number, number]];
  /** the pivot, fractions of the frame: put it on the shape the two shots share */
  pivot?: [number, number];
}

export const CurveCut: React.FC<CurveCutProps> = ({ a, b, start, duration, cut, scale = [2.2, 1], shift = [[0, 0], [0, 0]], pivot = [0.5, 0.5] }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [start, start + duration], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: SPEED_SPIKE });
  const s = scale[0] + (scale[1] - scale[0]) * t;
  const dx = shift[0][0] + (shift[1][0] - shift[0][0]) * t, dy = shift[0][1] + (shift[1][1] - shift[0][1]) * t;
  const at = cut ?? start + Math.floor(duration / 2);
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `translate(${(dx * 100).toFixed(3)}%, ${(dy * 100).toFixed(3)}%) scale(${s.toFixed(4)})`, transformOrigin: `${pivot[0] * 100}% ${pivot[1] * 100}%` }}>
        {f < at ? a : b}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
