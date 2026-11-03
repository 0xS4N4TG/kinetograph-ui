// The time slot: what happens between frames. Some genes remap the frame (repeat a beat, play a blip backwards);
// others draw the picture again at earlier frames (echo trails, a ghost, frames blended into a smear) or flash a frame (strobe). The picture is
// whatever Hexed built so far, so a trail of a graded picture is graded too.

import React from 'react';
import { Freeze, Layer, Rect, blur } from '@kinetographdev/core';
import type { BlendMode } from '@kinetographdev/core';
import { between, pick, rng } from './rng.js';

export const TIME = ['none', 'echo', 'ghost', 'strobe', 'repeat', 'reverse', 'blend'] as const;
export type TimeGene = (typeof TIME)[number];

/** The frame a remapping gene shows at `frame` (echo, ghost and strobe leave it alone). */
export function remap(gene: string, seed: number, k: number, frame: number): number {
  if (k <= 0) return frame;
  const r = rng(seed);
  if (gene === 'repeat') {
    // each beat of `len` frames plays twice
    const len = Math.round(between(r, 4, 10));
    return frame - (frame % (2 * len)) + (frame % len);
  }
  if (gene === 'reverse') {
    // the last few frames of every block play backwards, a scratch
    const block = Math.round(between(r, 18, 40));
    const back = Math.round(between(r, 5, 12));
    const m = frame % block;
    return m >= block - back ? frame - 2 * (m - (block - back)) : frame;
  }
  return frame;
}

/** Draws the picture at `frame`, plus the copies the gene adds. */
export const TimeLayers: React.FC<{
  gene: string;
  seed: number;
  k: number;
  frame: number;
  width: number;
  height: number;
  picture: React.ReactNode;
}> = ({ gene, seed, k, frame, width, height, picture }) => {
  const r = rng(seed);
  const at = (f: number, node: React.ReactNode = picture) => <Freeze frame={Math.max(0, f)}>{node}</Freeze>;
  if (k <= 0 || gene === 'none' || gene === 'repeat' || gene === 'reverse') return at(frame);

  if (gene === 'echo') {
    const n = Math.round(between(r, 3, 6));
    const gap = Math.round(between(r, 1, 3));
    const blend = pick(r, ['screen', 'lighten', 'normal'] as BlendMode[]);
    return (
      <Layer>
        {at(frame)}
        {Array.from({ length: n }, (_, i) => (
          <Layer key={i} blendMode={blend} opacity={k * 0.55 * (1 - (i + 1) / (n + 1))}>
            {at(frame - gap * (i + 1))}
          </Layer>
        ))}
      </Layer>
    );
  }
  if (gene === 'blend') {
    // frame blending: the last few frames melted together, oldest first and softest, each newer one laid over at
    // the same opacity, so the picture is a running average that drags behind anything that moves
    const n = Math.round(between(r, 4, 8));
    const gap = Math.round(between(r, 1, 2));
    const keep = 1 - k * between(r, 0.45, 0.7);
    const soft = between(r, 0.6, 1.6);
    return (
      <Layer>
        {Array.from({ length: n }, (_, j) => {
          const i = n - j; // frames back
          return (
            <Layer key={i} opacity={j === 0 ? 1 : keep} effects={[blur(soft * i * k)]}>
              {at(frame - gap * i)}
            </Layer>
          );
        })}
        <Layer opacity={keep}>{at(frame)}</Layer>
      </Layer>
    );
  }
  if (gene === 'ghost') {
    const lag = Math.round(between(r, 6, 18));
    const blend = pick(r, ['screen', 'difference', 'lighten'] as BlendMode[]);
    const grow = between(r, 1, 1.06);
    return (
      <Layer>
        {at(frame)}
        <Layer blendMode={blend} opacity={k * between(r, 0.35, 0.6)} x={width / 2} y={height / 2} scale={grow} origin="center">
          <Layer x={-width / 2} y={-height / 2}>
            {at(frame - lag)}
          </Layer>
        </Layer>
      </Layer>
    );
  }
  // strobe: every few frames one frame flashes white, black or inverted
  const every = Math.round(between(r, 6, 16));
  const kind = pick(r, ['white', 'black', 'difference'] as const);
  const flash = frame % every === 0;
  return (
    <Layer>
      {at(frame)}
      {flash && (
        <Rect width={width} height={height} fill={kind === 'black' ? '#000' : '#fff'} blendMode={kind === 'difference' ? 'difference' : 'normal'} opacity={kind === 'difference' ? 1 : k * 0.85} />
      )}
    </Layer>
  );
};
