// Pieces shots 03 to 07 share: text widths, the dark warm gradient, the post chip, the big 3D pointer and the
// video thumbnails of the collection grid.

import React from 'react';
import { measureText } from '@remotion/layout-utils';
import { Image, Layer, Path, Rect, blur, dropShadow, linearGradient } from '@kinetographdev/core';
import { H, W, line, rrect, thumbSrc } from '../lib.js';
import { POST } from '../post.js';
import { Poster } from './a-feed.js';

/** The width the renderer gives `text` in a font, size and weight. */
export const textWidth = (text: string, fontFamily: string, fontSize: number, fontWeight: number) =>
  measureText({ text, fontFamily, fontSize, fontWeight: String(fontWeight) }).width;

/** Charcoal above, olive orange to magenta along the bottom: the taste's interlude. */
export { WarmGradient as DarkGradient } from '../../../kit/core/backgrounds.js';
export { BigArrow, FlatArrow } from '../../../kit/core/pointers.js';

/** The post's picture in small, with a dashed selection round it. */
export const PostChip: React.FC<{ width: number; height: number; dashed?: boolean }> = ({ width, height, dashed = true }) => {
  const sw = width * 0.48;
  return (
    <Layer>
      <Layer clip={{ kind: 'path', d: rrect(width, height, 3) }}>
        {/* the post's own picture (shot 01), drawn at its full size and scaled down */}
        <Layer scale={width / POST.width}>
          <Poster w={POST.width} h={(POST.width * height) / width} />
        </Layer>
      </Layer>
      {dashed && (
        <Rect
          x={-3}
          y={-3}
          width={width + 6}
          height={height + 6}
          stroke={line({ color: '#ffffffcc', width: 1.4, dashArray: [4, 3] })}
        />
      )}
    </Layer>
  );
};

export const TILE_W = 260;
export const TILE_H = 185;
export const PITCH_X = 280;
export const PITCH_Y = 210;

/** One video thumbnail: photo `seed` of the ten (see `thumbSrc`). */
export const Thumb: React.FC<{ seed: number; w?: number; h?: number }> = ({ seed, w = TILE_W, h = TILE_H }) => (
  <Layer clip={{ kind: 'path', d: rrect(w, h, 8) }}>
    <Image src={thumbSrc(seed)} width={w} height={h} fit="cover" />
  </Layer>
);

/** cols x 5 rows of thumbnails from (0, 0); row 0 is a partial row above the frame. */
export const ThumbGrid: React.FC<{ cols: number; skip?: (c: number, r: number) => boolean }> = ({ cols, skip }) => (
  <Layer effects={[dropShadow({ y: 3, blur: 4, color: '#00000030' })]}>
    {Array.from({ length: cols * 5 }, (_, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      if (skip?.(c, r)) return null;
      return (
        <Layer key={i} x={c * PITCH_X} y={(r - 1) * PITCH_Y}>
          <Thumb seed={i * 7 + 3} />
        </Layer>
      );
    })}
  </Layer>
);
