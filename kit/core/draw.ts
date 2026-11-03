// Small drawing helpers: a fully typed stroke and rounded-rectangle path data.

import type { Stroke } from '@kinetographdev/scene';

// SCENE.md's stroke takes cap, join and dashes; the TS type only names colour and width.
export interface Line {
  color: string;
  width: number;
  cap?: 'butt' | 'round' | 'square';
  join?: 'miter' | 'round' | 'bevel';
  dashArray?: number[];
  dashOffset?: number;
}
export const line = (l: Line) => l as Stroke;

/** A rounded rectangle as path data, for clips (a group's clip takes a path, not a box). */
export const rrect = (w: number, h: number, r: number, x = 0, y = 0) =>
  `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}` +
  `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;

/** Points as a polyline's path data. */
export const polyD = (pts: number[][]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ');
