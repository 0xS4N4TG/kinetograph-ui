// A switch: the track blends from the taste's off to on colour, the knob slides across.

import React from 'react';
import { Ellipse, Layer, Rect, dropShadow } from '@kinetographdev/core';
import { useTaste } from '../taste.js';

export const Toggle: React.FC<{ on: number; w: number; h: number }> = ({ on, w, h }) => {
  const { toggle } = useTaste();
  const k = Math.max(0, Math.min(1, on));
  const c = toggle.off.map((v, i) => Math.round(v + (toggle.on[i] - v) * k));
  const knob = h - 6;
  return (
    <Layer>
      <Rect
        width={w}
        height={h}
        radius={h / 2}
        fill={`rgb(${c.join(',')})`}
        effects={[dropShadow({ y: 2, blur: 4, color: k > 0.5 ? '#3cc85c40' : '#00000014' })]}
      />
      <Ellipse
        x={3 + (w - knob - 6) * k}
        y={3}
        width={knob}
        height={knob}
        fill="#fff"
        effects={[dropShadow({ y: 1.5, blur: 2, color: '#00000030' })]}
      />
    </Layer>
  );
};
