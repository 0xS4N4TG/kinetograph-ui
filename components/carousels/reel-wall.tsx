// Reel Wall: a ring of tall clips turning past in the dark. The ring is thrown hard, and its speed bleeds off through a
// long ease-out until one card sits square to the camera. As it stops the rest dim, the chosen card steps forward off
// the ring and its name comes up beneath it: one subject at the end of the beat.

import React from 'react';
import { z } from 'zod';
import { useCurrentFrame } from 'remotion';
import { Camera, Layer, Rect, Text, dropShadow, radialGradient } from '@kinetographdev/core';
import { keys, DEFAULT_PHOTOS, Ground, H, Photo, W, easeCam, easeOut, hex, imagesSchema, nameOf, pick, prog, ramp, smooth, useFont, useFontItalic } from './kit.js';

export const reelWallSchema = z.object({
  images: imagesSchema,
  labels: z.array(z.string()).describe('A name for each card, in order. Cards past the end of the list use the picture\'s own name.'),
  count: z.number().int().min(6).max(24).describe('How many cards stand on the ring.'),
  radius: z.number().min(500).max(2200).describe('Radius of the ring, in px.'),
  cardWidth: z.number().min(160).max(420).describe('Width of a card, in px.'),
  cardHeight: z.number().min(280).max(760).describe('Height of a card, in px.'),
  perspective: z.number().min(800).max(4000).describe('Camera perspective distance, in px.'),
  startPull: z.number().min(0).max(4000).describe('How far back the camera starts, in px (the ring is that much further away in the opening shot).'),
  motionBlur: z.number().min(0).max(1).describe('Camera and ring motion blur shutter in frames, used while the ring is fast. 0 turns it off.'),
  landOn: z.number().int().min(0).describe('Index of the card the ring comes to rest on.'),
  extraTurns: z.number().min(0).max(4).describe('Whole turns the ring makes before it lands (rounded to a whole number so it lands square).'),
  spinStart: z.number().int().min(0).describe('Frame the throw starts.'),
  spinFrames: z.number().int().min(30).describe('Frames from the throw to rest.'),
  step: z.number().min(0).max(300).describe('How far the chosen card steps toward the camera at rest, in px.'),
  title: z.string().describe('Small line at the top left. Empty for none.'),
  font: z.string().describe('Google Fonts family for the small type.'),
  serif: z.string().describe('Google Fonts family for the chosen card\'s name (italic).'),
  colors: z.object({ ground: hex.describe('Background, near black.'), light: hex.describe('A soft pool of light behind the ring.'), ink: hex.describe('Type.'), muted: hex.describe('Small type.') }).describe('Colours.'),
});
export type ReelWallProps = z.infer<typeof reelWallSchema>;

export const reelWallDefaults: ReelWallProps = {
  images: DEFAULT_PHOTOS,
  labels: [],
  count: 18,
  radius: 1150,
  cardWidth: 330,
  cardHeight: 590,
  perspective: 1700,
  startPull: 1700,
  motionBlur: 0,
  landOn: 7,
  extraTurns: 1,
  spinStart: 6,
  spinFrames: 150,
  step: 150,
  title: 'Reel Wall',
  font: 'Geist',
  serif: 'Instrument Serif',
  colors: { ground: '#0a0a0c', light: '#23232a', ink: '#f2efe8', muted: '#8b8a86' },
};

export const REEL_WALL_DURATION = 240;

export const ReelWall = (p: ReelWallProps) => {
  const f = useCurrentFrame();
  const font = useFont(p.font);
  const serif = useFontItalic(p.serif);
  const step = 360 / p.count;
  // the ring's turn: from a slight pre-roll (anticipation, a few degrees back) through the throw to rest on `landOn`
  const total = Math.round(p.extraTurns) * 360 + p.landOn * step;
  const throwP = prog(f, p.spinStart, p.spinStart + p.spinFrames, (t) => 1 - Math.pow(1 - t, 3.2));
  const pre = ramp(f, 0, p.spinStart, 0, -6, (t) => t * t * (3 - 2 * t));
  const turn = f < p.spinStart ? pre : -6 + (total + 6) * throwP;
  const rest = prog(f, p.spinStart + p.spinFrames - 20, p.spinFrames + p.spinStart + 24, easeCam); // 0 while moving, 1 at rest
  const end = p.spinStart + p.spinFrames;
  const dollyAt = (t: number) => {
    const approach = keys(t, [[0, -p.startPull], [p.spinStart + 4, -p.startPull * 1.06], [p.spinStart + 70, -p.startPull * 0.12], [end - 10, 40]], easeCam);
    const land = ramp(t, end - 14, end + 20, 0, 1, easeOut);
    const over = 1 + 0.5 * Math.sin(ramp(t, end + 8, end + 40, 0, 1) * Math.PI);
    return approach + 120 * land * over;
  };
  const dolly = dollyAt(f);
  const swing = ramp(f, p.spinStart, end - 10, -16, 0, easeCam);
  const speed = Math.abs(((total + 6) * (1 - Math.pow(1 - Math.min(1, Math.max(0, (f - p.spinStart) / p.spinFrames)), 3.2)) * 0 + (total + 6) * 3.2 * Math.pow(1 - Math.min(1, Math.max(0, (f - p.spinStart) / p.spinFrames)), 2.2)) / p.spinFrames);
  const blurOn = p.motionBlur > 0 && f > p.spinStart && f < end && speed > 3.2;
  const name = p.labels[p.landOn] ?? nameOf(pick(p.images, p.landOn));
  const cards = Array.from({ length: p.count }, (_, i) => {
    const a = i * step - turn; // degrees from the front of the ring
    const rad = (a * Math.PI) / 180;
    const facing = Math.cos(rad);
    return { i, a, rad, facing };
  });
  return (
    <Layer id="root">
      <Ground color={p.colors.ground} />
      <Rect id="pool" x={W / 2 - 900} y={H / 2 - 520} width={1800} height={1040} fill={radialGradient([[0, p.colors.light], [1, p.colors.ground]], { cx: 0.5, cy: 0.5, r: 0.5 })} />
      <Layer id="shutter" motionBlur={blurOn ? { samples: 12, shutter: p.motionBlur } : undefined}>
      <Camera perspective={p.perspective} />
      <Layer id="ring" x={W / 2} y={H / 2 - 20} z={-p.radius} rotateY={swing} rotateX={swing * 0.35} preserve3d>
        {cards
          .map((c) => {
            const chosen = c.i === p.landOn ? rest : 0;
            const near = smooth(1 - Math.abs(c.a) / 40);
            return (
              <Layer
                key={c.i}
                id={`reel${c.i}`}
                x={Math.sin(c.rad) * p.radius}
                z={Math.cos(c.rad) * p.radius + chosen * p.step + dolly}
                rotateY={c.a}
                opacity={ramp(f, 0, 24 + (c.i % 7) * 2, 0, 1, easeOut)}
                effects={[dropShadow({ x: 0, y: 24, blur: 40, color: 'rgba(0,0,0,0.55)' })]}
              >
                <Photo file={pick(p.images, c.i)} w={p.cardWidth} h={p.cardHeight} radius={6} />
                <Rect
                  id={`reel${c.i}-shade`}
                  x={-p.cardWidth / 2}
                  y={-p.cardHeight / 2}
                  width={p.cardWidth}
                  height={p.cardHeight}
                  radius={6}
                  fill={`rgba(0,0,0,${Math.min(0.85, (c.facing < 0 ? 0.55 : 0) + rest * 0.6 * (c.i === p.landOn ? 0 : 1))})`}
                />
                <Text id={`reel${c.i}-n`} font={font} weight={500} size={16} color="rgba(255,255,255,0.8)" x={-p.cardWidth / 2 + 16} y={p.cardHeight / 2 - 34}>{String(c.i + 1).padStart(2, '0')}</Text>
              </Layer>
            );
          })}
      </Layer>
      </Layer>
      <Text id="title" font={font} weight={500} size={22} color={p.colors.muted} x={72} y={72} opacity={ramp(f, 20, 50, 0, 1)}>{p.title}</Text>
      <Text id="name" font={serif} fontStyle="italic" size={92} color={p.colors.ink} x={0} y={H - 190} maxWidth={W} align="center" opacity={rest} >{name}</Text>
    </Layer>
  );
};
