// Gallery Push: a wall of photographs opens column by column, from the middle outward, each column unrolling top to
// bottom tile by tile, while the camera, which opens close on the middle column, pulls back with the reveal to a wide turned view, holds,
// winds up, then whips round and trucks across with motion blur and pushes in to a straight view of the middle columns,
// landing with an overshoot and a settle. Alternate columns stand a little off the plane, so the push reads as depth, and the wall drifts in opposite
// directions column to column once it is open.

import React from 'react';
import { z } from 'zod';
import { Easing, random, useCurrentFrame } from 'remotion';
import { Camera, Layer, Rect, linearGradient } from '@kinetographdev/core';
import { keys, DEFAULT_PHOTOS, Ground, H, Label, Photo, W, easeCam, hex, imagesSchema, lerp, pick, prog, ramp, src, useFont, useFontItalic } from './kit.js';

export const galleryPushSchema = z.object({
  images: imagesSchema,
  columns: z.number().int().min(3).max(13).describe('How many columns are in the wall.'),
  tilesPerColumn: z.number().int().min(2).max(8).describe('How many photographs stack in each column.'),
  columnWidth: z.number().min(120).max(420).describe('Width of a column, in px.'),
  gap: z.number().min(4).max(60).describe('Space between tiles, in px.'),
  depth: z.number().min(0).max(300).describe('How far alternate columns stand off the plane, in px.'),
  perspective: z.number().min(600).max(4000).describe('Camera perspective distance, in px.'),
  openStart: z.number().int().min(0).describe('Frame the middle column starts to open.'),
  openStagger: z.number().min(1).max(20).describe('Frames between one column starting to open and the next, outward from the middle.'),
  openFrames: z.number().int().min(10).describe('Frames a column takes to open.'),
  pushStart: z.number().int().min(0).describe('Frame the camera push starts.'),
  pushFrames: z.number().int().min(20).describe('Frames the push takes, eased in and out.'),
  pushTo: z.number().min(0).max(1400).describe('How far the camera starts back from the wall, in px; it ends about a third of that distance in front of it.'),
  motionBlur: z.number().min(0).max(1).describe('Camera motion blur shutter in frames, used while the camera moves fast. 0 turns it off.'),
  turn: z.number().min(0).max(40).describe('How far the wall is turned at the start, in degrees; it comes square as the camera pushes in.'),
  drift: z.number().min(0).max(200).describe('How far alternate columns slide, in px, over the shot.'),
  seed: z.number().int().describe('Seed for the tile heights. Same seed, same wall.'),
  title: z.string().describe('Title at the bottom left, over the wall. Empty for none.'),
  caption: z.string().describe('Smaller line under the title. Empty for none.'),
  font: z.string().describe('Google Fonts family for the label.'),
  serif: z.string().describe('Google Fonts family for the title (italic).'),
  colors: z.object({ ground: hex.describe('Background.'), ink: hex.describe('Title.'), muted: hex.describe('Caption.') }).describe('Colours.'),
});
export type GalleryPushProps = z.infer<typeof galleryPushSchema>;

export const galleryPushDefaults: GalleryPushProps = {
  images: DEFAULT_PHOTOS,
  columns: 9,
  tilesPerColumn: 5,
  columnWidth: 260,
  gap: 16,
  depth: 90,
  perspective: 1500,
  openStart: 6,
  openStagger: 6,
  openFrames: 34,
  pushStart: 22,
  pushFrames: 170,
  pushTo: 900,
  turn: 18,
  motionBlur: 0,
  drift: 70,
  seed: 11,
  title: 'Gallery Push',
  caption: 'Opened column by column',
  font: 'Geist',
  serif: 'Instrument Serif',
  colors: { ground: '#12110f', ink: '#f3f0e8', muted: '#8d897d' },
};

export const GALLERY_PUSH_DURATION = 270;
const open = Easing.bezier(0.2, 0.7, 0.2, 1);

export const GalleryPush = (p: GalleryPushProps) => {
  const f = useCurrentFrame();
  const font = useFont(p.font);
  const mid = (p.columns - 1) / 2;
  const pitchX = p.columnWidth + p.gap;
  const wide = -p.pushTo * 0.85;
  const camAt = (t: number) => ({
    z: keys(t, [[0, 520], [26, 520], [112, wide], [142, wide], [158, wide - 100], [182, p.pushTo * 0.42], [204, p.pushTo * 0.35]], easeCam),
    ry: keys(t, [[0, -p.turn * 0.6], [112, p.turn], [142, p.turn], [158, p.turn * 1.15], [182, -p.turn * 0.4], [206, 0]], easeCam),
    rx: keys(t, [[0, 2], [112, -4], [142, -4], [206, 0]], easeCam),
    x: keys(t, [[0, 0], [150, 0], [182, -pitchX * 1.1], [206, -pitchX]], easeCam),
  });
  const cam = camAt(f);
  const speedZ = Math.abs(camAt(f + 0.5).z - camAt(f - 0.5).z) + Math.abs(camAt(f + 0.5).x - camAt(f - 0.5).x) + Math.abs(camAt(f + 0.5).ry - camAt(f - 0.5).ry) * 14;
  const moving = p.motionBlur > 0 && speedZ > 11;
  const pitch = p.columnWidth + p.gap;
  const cols = Array.from({ length: p.columns }, (_, c) => {
    const heights = Array.from({ length: p.tilesPerColumn }, (_, t) => Math.round(lerp(0.9, 1.6, random(`h${p.seed}-${c}-${t}`)) * p.columnWidth));
    const total = heights.reduce((a, b) => a + b, 0) + (heights.length - 1) * p.gap;
    return { c, heights, total, order: Math.abs(c - mid) };
  });
  return (
    <Layer id="root">
      <Ground color={p.colors.ground} />
      <Layer id="shutter" motionBlur={moving ? { samples: 10, shutter: p.motionBlur } : undefined}>
      <Camera perspective={p.perspective} />
      <Layer
        id="wall"
        x={W / 2 + cam.x}
        y={H / 2}
        z={cam.z}
        rotateY={cam.ry}
        rotateX={cam.rx}
        preserve3d
      >
        {cols.map(({ c, heights, total, order }) => {
          const x = (c - mid) * pitch;
          const dir = c % 2 ? 1 : -1;
          const slide = dir * p.drift * prog(f, p.openStart, GALLERY_PUSH_DURATION - 1, easeCam);
          let y = -total / 2 + slide;
          return (
            <Layer key={c} id={`col${c}`} x={x} z={c % 2 ? p.depth : 0}>
              {heights.map((h, t) => {
                const top = y;
                y += h + p.gap;
                const start = p.openStart + order * p.openStagger + t * 3;
                const o = prog(f, start, start + p.openFrames, open);
                return (
                  <Layer key={t} id={`col${c}-t${t}`} y={top + h / 2}>
                    <ClippedTile file={pick(p.images, c * p.tilesPerColumn + t + c * 2)} w={p.columnWidth} h={h} reveal={o} />
                  </Layer>
                );
              })}
            </Layer>
          );
        })}
      </Layer>
      </Layer>
      <Rect id="scrim" y={H - 360} width={W} height={360} fill={linearGradient([[0, 'rgba(18,17,15,0)'], [1, 'rgba(18,17,15,0.85)']], { angle: 90 })} opacity={ramp(f, 40, 70, 0, 1)} />
      <Label x={72} y={H - 130} title={p.title} sub={p.caption} font={font} ink={p.colors.ink} muted={p.colors.muted} opacity={ramp(f, 40, 70, 0, 1)} />
    </Layer>
  );
};

/** A tile that unrolls from its top edge: a clip opens downward over the picture. */
const ClippedTile = ({ file, w, h, reveal }: { file: string; w: number; h: number; reveal: number }) =>
  reveal <= 0.001 ? null : <Photo file={file} w={w} h={h} radius={4} reveal={reveal} />;
