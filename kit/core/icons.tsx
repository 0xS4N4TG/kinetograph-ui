// Line icons in 24-unit boxes, drawn at size / 24 in the taste's ink.

import React from 'react';
import { Layer, Path } from '@kinetographdev/core';
import { line } from './draw.js';
import { useTaste } from './taste.js';

export const ICON = {
  heart:
    'M12 20.6C12 20.6 3 15.2 3 9.1 3 6.3 5.1 4.2 7.7 4.2 9.5 4.2 11.1 5.2 12 6.7 12.9 5.2 14.5 4.2 16.3 4.2 18.9 4.2 21 6.3 21 9.1 21 15.2 12 20.6 12 20.6Z',
  comment: 'M20.4 16.6A9 9 0 1 0 16.6 20.4L21.5 21.5Z',
  repost: 'M4.5 12.5V9.5A3 3 0 0 1 7.5 6.5H18.5M15.5 3.5L18.5 6.5 15.5 9.5M19.5 11.5V14.5A3 3 0 0 1 16.5 17.5H5.5M8.5 20.5L5.5 17.5 8.5 14.5',
  send: 'M21.5 3L3 9.4 10.3 12.6 13.6 21Z M10.3 12.6L21.5 3',
  bookmark: 'M18.5 21L12 15.3 5.5 21V3.5H18.5Z',
  dots: 'M5 12h.01M12 12h.01M19 12h.01',
  calendar: 'M4 6.5A1.5 1.5 0 0 1 5.5 5H18.5A1.5 1.5 0 0 1 20 6.5V19A1.5 1.5 0 0 1 18.5 20.5H5.5A1.5 1.5 0 0 1 4 19Z M4 10H20 M8.5 3V7 M15.5 3V7',
  clock: 'M12 3A9 9 0 1 1 11.99 3Z M12 7.5V12L15 13.5',
  chevron: 'M7 10L12 15 17 10',
};

export const Icon: React.FC<{
  d: string;
  size: number;
  color?: string;
  fill?: string;
  stroke?: number;
  x?: number;
  y?: number;
  scale?: number;
  opacity?: number;
}> = ({ d, size, color, fill, stroke = 2.3, x = 0, y = 0, scale = 1, opacity = 1 }) => {
  const taste = useTaste();
  return (
    <Layer x={x} y={y} scale={(size / 24) * scale} opacity={opacity}>
      <Path
        d={d}
        fill={fill}
        stroke={stroke > 0 ? line({ color: color ?? taste.ink, width: stroke, cap: 'round', join: 'round' }) : undefined}
      />
    </Layer>
  );
};
