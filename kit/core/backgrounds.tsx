// Full-frame looks: the warm dark interlude gradient, and a spotlight that takes everything outside an oval to black.

import React from 'react';
import { useVideoConfig } from 'remotion';
import { Ellipse, Layer, Rect, blur, linearGradient, radialGradient } from '@kinetographdev/core';
import { line } from './draw.js';
import { useTaste } from './taste.js';

/** The taste's interlude: its warm colours along the bottom under a dark shade from the top. warmth 0..1 lets more
 *  of the colour through. */
export const WarmGradient: React.FC<{ warmth?: number }> = ({ warmth = 1 }) => {
  const { width, height } = useVideoConfig();
  const { interlude } = useTaste();
  return (
    <Layer>
      <Rect width={width} height={height} fill={linearGradient(interlude.colors, { angle: 90 })} />
      <Rect
        width={width}
        height={height}
        opacity={Math.min(1, 1.15 - warmth * 0.15)}
        fill={linearGradient([interlude.shade, interlude.shade, `${interlude.shade}c8`, `${interlude.shade}00`], { angle: 180 })}
      />
    </Layer>
  );
};

export interface Oval {
  x: number;
  y: number;
  rx: number;
  ry: number;
}

/** A spotlight in screen pixels: a soft white bloom and falloff round `light`, and everything outside `edge`
 *  (blurred by `soft`) taken to black. `edge` is usually narrower than the falloff so the frame's sides go fully
 *  dark. */
export const Spotlight: React.FC<{ light: Oval; edge: Oval; soft?: number; opacity?: number }> = ({
  light,
  edge,
  soft = 60,
  opacity = 1,
}) => {
  if (opacity <= 0) return null;
  // the gradient's box is 1.6 times the oval each way so it covers the whole canvas
  const bw = light.rx * 3.2;
  const bh = light.ry * 3.2;
  // a black ring: a stroke 1400 wide whose inner edge is the edge oval
  const t = 1400;
  return (
    <Layer opacity={opacity}>
      <Rect
        x={light.x - bw / 2}
        y={light.y - bh / 2}
        width={bw}
        height={bh}
        fill={radialGradient([
          [0, 'rgba(255,255,255,0.25)'],
          [0.19, 'rgba(255,255,255,0)'],
          [0.39, 'rgba(0,0,0,0)'],
          [0.53, 'rgba(0,0,0,0.85)'],
          [0.625, 'rgba(0,0,0,0.97)'],
          [1, 'rgba(0,0,0,0.98)'],
        ])}
      />
      <Ellipse
        x={edge.x - edge.rx - t / 2}
        y={edge.y - edge.ry - t / 2}
        width={2 * edge.rx + t}
        height={2 * edge.ry + t}
        stroke={line({ color: '#000', width: t })}
        effects={[blur(soft)]}
      />
    </Layer>
  );
};
