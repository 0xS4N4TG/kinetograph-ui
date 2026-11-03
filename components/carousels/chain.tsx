// The engine under the three Circle Carousels: covers ride a conveyor along a path, and their size is a function of
// where on the path they are, so each cover grows as it travels. The conveyor is one number, `shift`, eased over the
// clip; each cover is placed from (its index / count + shift) mod 1. Bigger covers draw over smaller ones.

import React from 'react';
import { Layer, dropShadow } from '@kinetographdev/core';
import { Photo, easeOut, pick, prog } from './kit.js';

export interface Placement {
  x: number;
  y: number;
  /** degrees */
  rot: number;
  /** side of the square, in px; 0 hides the cover */
  size: number;
}

export interface ChainProps {
  frame: number;
  images: string[];
  count: number;
  /** conveyor position in turns at this frame */
  shift: number;
  place: (u: number, i: number) => Placement;
  /** px radius of the corner */
  radius: number;
  /** frames between one cover starting its entrance and the next */
  stagger: number;
  /** shadow strength, 0 for none */
  shadow: number;
  idPrefix: string;
}

export const Chain = ({ frame, images, count, shift, place, radius, stagger, shadow, idPrefix }: ChainProps) => {
  const items = Array.from({ length: count }, (_, i) => {
    const u = (((i / count + shift) % 1) + 1) % 1;
    const p = place(u, i);
    // entrance: each cover grows from nothing in turn, round the ring, so the ring is drawn in by a sweep
    const enter = prog(frame, 2 + i * stagger, 2 + i * stagger + 22, easeOut);
    return { i, p, enter, size: p.size * enter };
  }).filter((it) => it.size > 0.4);
  items.sort((a, b) => a.size - b.size || a.i - b.i);
  return (
    <Layer id={`${idPrefix}-chain`}>
      {items.map(({ i, p, size }) => (
        <Layer
          key={i}
          id={`${idPrefix}-c${i}`}
          x={p.x}
          y={p.y}
          rotation={p.rot}
          effects={shadow > 0 ? [dropShadow({ x: 0, y: size * 0.05, blur: size * 0.12, color: `rgba(20,20,30,${0.22 * shadow})` })] : undefined}
        >
          <Photo file={pick(images, i)} w={size} h={size} radius={Math.min(radius, size * 0.1)} />
        </Layer>
      ))}
    </Layer>
  );
};
