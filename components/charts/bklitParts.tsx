// Pieces every Bklit chart here draws: the tooltip panel, the date pill, a blur wrapper for rack focus, the heading.
// Chart design after Bklit UI (MIT). Sizes are Bklit's CSS pixels times PX (2).

import React from 'react';
import { Ellipse, Layer, Rect, Text, blur, dropShadow } from '@kinetographdev/core';
import type { Fonts } from './lib.js';
import { PX, mix, sansWidth, type BkTokens } from './bklit.js';

export interface TipRow {
  color: string;
  label: string;
  value: string;
}

/** Bklit's tooltip panel: rounded-xl, 1 px border, a header row split off by a border, then rows of a 8 px dot, a
 *  muted label and a medium value. (x, y) is the panel's top-left; scale and opacity pivot on its middle. */
export const BkTooltip: React.FC<{
  id: string;
  x: number;
  y: number;
  title?: string;
  rows: TipRow[];
  tk: BkTokens;
  fonts: Fonts;
  width?: number;
  opacity?: number;
  scale?: number;
  /** Local point the scale pivots on; default the middle. */
  pivot?: [number, number];
}> = ({ id, x, y, title, rows, tk, fonts, width = 160 * PX, opacity = 1, scale = 1, pivot }) => {
  const headH = title ? 40 * PX : 0;
  const bodyH = (24 + rows.length * 20 + Math.max(0, rows.length - 1) * 8) * PX;
  const h = headH + bodyH;
  const [px, py] = pivot ?? [width / 2, h / 2];
  return (
    <Layer id={id} x={x + px} y={y + py} anchorX={px} anchorY={py} opacity={opacity} scale={scale}
      effects={[dropShadow({ y: 10 * PX, blur: 15 * PX, color: tk.dark ? '#00000066' : '#0000000d' }), dropShadow({ y: 4 * PX, blur: 6 * PX, color: tk.dark ? '#00000044' : '#0000000a' })]}>
      <Rect id={id + '-bg'} width={width} height={h} radius={12 * PX} fill={tk.popover} stroke={{ color: tk.border, width: 1 * PX }} />
      {title ? (
        <>
          <Text id={id + '-title'} x={14 * PX} y={(40 - 14 * 1.25) / 2 * PX} font={fonts.sans} weight={500} size={14 * PX} color={tk.popoverFg}>{title}</Text>
          <Rect id={id + '-rule'} x={1 * PX} y={headH - 1 * PX} width={width - 2 * PX} height={1 * PX} fill={tk.border} />
        </>
      ) : null}
      {rows.map((r, i) => {
        const ry = headH + (12 + i * 28) * PX;
        return (
          <Layer id={`${id}-row${i}`} key={i}>
            <Ellipse id={`${id}-dot${i}`} x={14 * PX} y={ry + 6 * PX} width={8 * PX} height={8 * PX} fill={r.color} />
            <Text id={`${id}-lab${i}`} x={30 * PX} y={ry + (20 - 14 * 1.25) / 2 * PX} font={fonts.sans} size={14 * PX} color={tk.mutedFg}>{r.label}</Text>
            <Text id={`${id}-val${i}`} x={width - 14 * PX - 200 * PX} y={ry + (20 - 14 * 1.25) / 2 * PX} maxWidth={200 * PX} align="right" font={fonts.sans} weight={500} size={14 * PX} color={tk.popoverFg}>{r.value}</Text>
          </Layer>
        );
      })}
    </Layer>
  );
};

/** Natural width of a tooltip with these rows (so a panel never clips its text). */
export const tipWidth = (title: string | undefined, rows: TipRow[], size = 14 * PX) => {
  const w = Math.max(
    title ? sansWidth(title, size) + 28 * PX : 0,
    ...rows.map((r) => sansWidth(r.label, size) + sansWidth(r.value, size) + (14 + 8 + 8 + 24 + 14) * PX),
    160 * PX,
  );
  return Math.ceil(w);
};

/** Bklit's date ticker: a dark rounded-full pill with the date in it. Centred on x, top at y. */
export const Pill: React.FC<{ id: string; x: number; y: number; text: string; tk: BkTokens; fonts: Fonts; opacity?: number; scale?: number }> = ({
  id, x, y, text, tk, fonts, opacity = 1, scale = 1,
}) => {
  const size = 14 * PX;
  const w = sansWidth(text, size) + 32 * PX;
  const h = 32 * PX;
  return (
    <Layer id={id} x={x} y={y + h / 2} anchorX={w / 2} anchorY={h / 2} opacity={opacity} scale={scale}
      effects={[dropShadow({ y: 8 * PX, blur: 12 * PX, color: tk.dark ? '#00000055' : '#00000026' })]}>
      <Rect id={id + '-bg'} width={w} height={h} radius={h / 2} fill={tk.pill} />
      <Text id={id + '-t'} x={0} y={(h - size * 1.25) / 2} maxWidth={w} align="center" font={fonts.sans} weight={500} size={size} color={tk.pillFg}>{text}</Text>
    </Layer>
  );
};

/** Rack focus: blur what is not the subject. r is in px; under 1 the layer is left sharp (the engine drops it). */
export const Soft: React.FC<{ id: string; r: number; opacity?: number; children: React.ReactNode }> = ({ id, r, opacity = 1, children }) => (
  <Layer id={id} opacity={opacity} effects={r >= 1 ? [blur(r)] : []}>
    {children}
  </Layer>
);

/** The heading over a chart: a title and a muted line. */
export const Heading: React.FC<{ id: string; x: number; y: number; title: string; sub?: string; tk: BkTokens; fonts: Fonts; opacity?: number; size?: number }> = ({
  id, x, y, title, sub, tk, fonts, opacity = 1, size = 40,
}) => (
  <Layer id={id} x={x} y={y} opacity={opacity}>
    <Text id={id + '-t'} font={fonts.sans} weight={500} size={size} color={tk.fg}>{title}</Text>
    {sub ? <Text id={id + '-s'} y={size * 1.5} font={fonts.sans} size={size * 0.62} color={tk.mutedFg}>{sub}</Text> : null}
  </Layer>
);

/** Page background. */
export const Backdrop: React.FC<{ tk: BkTokens; W: number; H: number }> = ({ tk, W, H }) => <Rect id="bk-bg" width={W} height={H} fill={tk.bg} />;

export { mix };
