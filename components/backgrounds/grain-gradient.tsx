// Grain Gradient: a soft mesh of colour that drifts slowly, with fine film grain over it. Twelve mesh points take colours
// from the palette and each wanders on a small closed loop, so the field breathes and comes back to where it began. The
// mesh is drawn past the frame and blurred, so its patches never show.
//
// Principles: slow in and out (every point moves on a sine), overlap (each point has its own phase, so nothing moves
// together), arcs (closed elliptical paths), restraint (movement under a tenth of a cell), texture makes it made (grain on
// the whole frame, not per element).

import React from 'react';
import { z } from 'zod';
import { Layer, MeshGradient, Rect, blur, grain } from '@kinetographdev/core';
import { useCurrentFrame } from 'remotion';
import { phase } from './lib.js';

export const W = 1920;
export const H = 1080;
export const FPS = 30;
export const DURATION = 300;

const hex = z.string().describe('A CSS colour.');

export const grainGradientSchema = z.object({
  palette: z.array(hex).min(2).max(8).describe('Colours of the mesh, spread over its points in a fixed pattern. Two to eight.'),
  speed: z.number().min(0).max(4).describe('How fast the field drifts. Whole numbers loop seamlessly over 10 seconds.'),
  scale: z.number().min(0.3).max(3).describe('How far the points wander, as a multiple of the default. 1 is about a tenth of a cell.'),
  softness: z.number().min(0).max(120).describe('Blur over the mesh in pixels: higher is smoother, lower shows more of the patches.'),
  grain: z.number().min(0).max(0.5).describe('Grain amount. 0.1 is a visible film grain.'),
  grainSize: z.number().min(1).max(4).describe('Size of a grain cell in pixels.'),
});
export type GrainGradientProps = z.infer<typeof grainGradientSchema>;

export const grainGradientDefaults: GrainGradientProps = {
  palette: ['#f6d9c3', '#e9a58d', '#7b8fd6', '#f3efe6', '#4a5aa8'],
  speed: 1,
  scale: 1,
  softness: 0,
  grain: 0.14,
  grainSize: 1.3,
};

const COLS = 4;
const ROWS = 3;
const OVER = 420; // how far the mesh extends past the frame

export const GrainGradient: React.FC<GrainGradientProps> = (p) => {
  const frame = useCurrentFrame();
  const ph = phase(frame, DURATION, p.speed);
  const bw = W + 2 * OVER;
  const bh = H + 2 * OVER;
  const cw = bw / (COLS - 1);
  const ch = bh / (ROWS - 1);
  const amp = 0.18 * p.scale;
  const points: [number, number][] = [];
  const colors: string[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c;
      // edge points slide along the edge only, so the mesh keeps covering the frame
      const dx = c === 0 || c === COLS - 1 ? 0 : amp * cw * Math.sin(ph * (1 + (i % 2)) + i * 1.9);
      const dy = r === 0 || r === ROWS - 1 ? 0 : amp * ch * Math.cos(ph * (1 + ((i + 1) % 2)) + i * 2.7);
      const ex = r === 0 || r === ROWS - 1 ? amp * cw * 0.8 * Math.sin(ph + i * 1.3) : 0;
      const ey = c === 0 || c === COLS - 1 ? amp * ch * 0.8 * Math.cos(ph + i * 0.9) : 0;
      points.push([c * cw + dx + ex, r * ch + dy + ey]);
      colors.push(p.palette[(r * 2 + c * 3 + (r % 2)) % p.palette.length]);
    }
  }
  return (
    <Layer id="gg-root" effects={p.grain > 0 ? [grain(p.grain, { seed: 3, size: p.grainSize })] : undefined}>
      <Rect id="gg-base" width={W} height={H} fill={p.palette[0]} />
      <Layer id="gg-mesh" x={-OVER} y={-OVER} effects={p.softness > 0 ? [blur(p.softness)] : undefined}>
        <MeshGradient id="gg-m" width={bw} height={bh} columns={COLS} rows={ROWS} points={points} colors={colors} />
      </Layer>
    </Layer>
  );
};
