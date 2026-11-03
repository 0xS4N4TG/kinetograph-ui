// Showcase Drift: a scatter of drawn cards slides in from the right behind a
// headline and comes to rest, losing a fixed share of the remaining distance every frame (no overshoot: something heavy
// stopping). The headline never moves; the cards are laid out to leave a band for it, so the type reads on every frame.
//
// Built from watching the reference at 60 fps (the layout, the 144 px of travel at 960 wide, a 6.7 percent loss per frame
// after a two frame hold). Everything is drawn, so no pictures are needed. Composition is 60 fps, 180 frames, 1920x1080.
//
// Principles: slow out (the decay is the whole move), staging (a clear band for the headline), solid drawing (one light
// source: the grey cards shade the same way), restraint (one move, one idea).

import React from 'react';
import { z } from 'zod';
import { useCurrentFrame } from 'remotion';
import { Layer, Rect, Text, dropShadow, linearGradient } from '@kinetographdev/core';
import { H, W, hex, useFont } from './kit.js';

export const showcaseDriftSchema = z.object({
  headline: z.string().describe('The line that holds still in the middle; it wraps into the band the cards leave free.'),
  figure: z.string().describe('The big number on the accent cards.'),
  travel: z.number().min(0).max(600).describe('Distance the scatter slides, px at 1920 wide.'),
  loss: z.number().min(0.01).max(0.3).describe('Share of the remaining distance lost every frame at 60 fps (about 0.07 matches the reference).'),
  holdFrames: z.number().int().min(0).max(30).describe('Frames the scatter waits before it sets off.'),
  font: z.string().describe('Google Fonts family for the type.'),
  colors: z
    .object({
      ground: hex.describe('Background.'),
      ink: hex.describe('Headline.'),
      accent: hex.describe('The accent cards and bars.'),
      card: hex.describe('The white cards.'),
      pill: hex.describe('The pale pills and bars.'),
      greyDark: hex.describe('Dark corner of the grey cards.'),
      greyLight: hex.describe('Light corner of the grey cards.'),
    })
    .describe('Colours.'),
});
export type ShowcaseDriftProps = z.infer<typeof showcaseDriftSchema>;

export const showcaseDriftDefaults: ShowcaseDriftProps = {
  headline: 'Every frame, written as code',
  figure: '182',
  travel: 288,
  loss: 0.07,
  holdFrames: 1,
  font: 'Inter',
  colors: { ground: '#fdfdfd', ink: '#111111', accent: '#a08200', card: '#ffffff', pill: '#f3f3f2', greyDark: '#736a61', greyLight: '#d8d5ce' },
};

export const SHOWCASE_DRIFT_DURATION = 180;
export const SHOWCASE_DRIFT_FPS = 60;

const S = 2; // the reference is 960 wide; this is 1920

/** Bar heights of the little chart, in reference px (they are the same shape on every card). */
const BARS = [16, 25, 10, 21, 6, 17];

const Bars = ({ id, x, y, scale, color }: { id: string; x: number; y: number; scale: number; color: string }) => (
  <Layer id={id} x={x} y={y}>
    {BARS.map((h, i) => (
      <Rect key={i} x={i * 14.5 * S * scale} y={-h * S * scale} width={8 * S * scale} height={h * S * scale} radius={3 * scale} fill={color} />
    ))}
  </Layer>
);

export const ShowcaseDrift = (p: ShowcaseDriftProps) => {
  const f = useCurrentFrame();
  const font = useFont(p.font, ['400', '500']);
  const c = p.colors;
  // the whole scatter loses a fixed share of what is left, every frame, after the hold
  const left = p.travel * Math.pow(1 - p.loss, Math.max(0, f - p.holdFrames));
  const grey = linearGradient([c.greyDark, c.greyLight], { angle: 135 });
  const shadow = dropShadow({ x: 0, y: 2, blur: 10, color: 'rgba(20,20,20,0.06)' });
  const R = 8 * S;
  const Grey = ({ id, x, y, w, h, radius = R }: { id: string; x: number; y: number; w: number; h: number; radius?: number }) => (
    <Rect id={id} x={x * S} y={y * S} width={w * S} height={h * S} radius={radius} fill={grey} />
  );
  return (
    <Layer id="root">
      <Rect id="ground" width={W} height={H} fill={c.ground} />
      <Layer id="scatter" x={left}>
        {/* top row */}
        <Rect id="pill-a" x={20 * S} y={48 * S} width={72 * S} height={37 * S} radius={19 * S} fill={c.pill} />
        <Layer id="gold-a">
          <Rect x={120 * S} y={-80 * S} width={199 * S} height={213 * S} radius={5 * S} fill={c.accent} />
          <Text id="fig-a" x={147 * S} y={(43 - 41 * 0.74) * S - 19} font={font} weight={400} size={41 * S} color="#ffffff">{p.figure}</Text>
          <Bars id="bars-a" x={146 * S} y={97.5 * S} scale={0.98} color="#ffffff" />
        </Layer>
        <Layer id="chart-b" effects={[shadow]}>
          <Rect x={291 * S} y={12 * S} width={257 * S} height={175 * S} radius={R} fill={c.card} />
          <Bars id="bars-b" x={322 * S} y={93 * S} scale={1.12} color={c.accent} />
          <Rect x={322 * S} y={118 * S} width={109 * S} height={17 * S} radius={8.5 * S} fill={c.pill} />
        </Layer>
        <Grey id="grey-c" x={750} y={-80} w={260} h={150} />

        {/* bottom row */}
        <Grey id="grey-d" x={-80} y={367} w={269} h={260} />
        <Rect id="white-g" x={300 * S} y={407 * S} width={156 * S} height={200 * S} radius={R} fill={c.card} effects={[shadow]} />
        <Layer id="gold-e">
          <Rect x={-28 * S} y={390 * S} width={388 * S} height={127 * S} radius={5 * S} fill={c.accent} />
          <Text id="fig-e" x={-1 * S} y={(449 - 41 * 0.74) * S - 16} font={font} weight={400} size={41 * S} color="#ffffff">{p.figure}</Text>
          <Bars id="bars-e" x={-1 * S} y={500 * S} scale={0.9} color="#ffffff" />
        </Layer>
        <Grey id="grey-f" x={30} y={517} w={383} h={120} radius={R} />
        <Grey id="grey-h" x={456} y={430} w={257} h={200} />
        <Rect id="pill-h" x={628 * S} y={407 * S} width={82 * S} height={30 * S} radius={15 * S} fill={c.pill} />
        <Grey id="grey-j" x={757} y={517} w={100} h={120} radius={6 * S} />
        <Grey id="grey-i" x={812} y={392} w={260} h={260} />
      </Layer>
      {/* the headline: never moves */}
      <Text id="headline" x={W / 2 - 360} y={(248 - 22) * S - 1} font={font} weight={400} size={33 * S} color={c.ink} align="center" maxWidth={720} lineHeight={1.32}>
        {p.headline}
      </Text>
    </Layer>
  );
};
