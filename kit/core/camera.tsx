// A 2D camera with motion blur, and the letterbox bars that open and close with the shots.

import React from 'react';
import { useVideoConfig } from 'remotion';
import { Layer, Rect } from '@kinetographdev/core';
import { useTaste } from './taste.js';
import { keys } from './timing.js';

/** Children are in world pixels; the point (x, y) lands in the middle of the canvas, magnified zoom times. Moving
 *  it fast is a whip: the motion blur (shutter in frames, the taste's by default) smears it.
 *
 *  Two things keep the blur whole across cuts. Give every Cam an `id`, unique among the shots on screen at once: a
 *  blurred layer's sub-frames are matched by id, and automatic ids shift when a neighbouring Sequence mounts or
 *  unmounts, which drops samples (the layer fades). And sub-frames before a Sequence's first frame draw nothing, so
 *  start a whipping shot's Sequence a few frames early, hide it with `opacity` until `start - 0.5`, and give its
 *  camera a key there so it is already moving. */
export const Cam: React.FC<{
  id?: string;
  x: number;
  y: number;
  zoom?: number;
  rotation?: number;
  /** shutter, frames; 0 turns the blur off */
  blur?: number;
  children: React.ReactNode;
}> = ({ id, x, y, zoom = 1, rotation = 0, blur, children }) => {
  const { width, height } = useVideoConfig();
  const { camera } = useTaste();
  const shutter = blur ?? camera.shutter;
  return (
    <Layer id={id} motionBlur={shutter > 0 ? { samples: camera.samples, shutter } : undefined}>
      <Layer x={width / 2} y={height / 2} scale={zoom} rotation={rotation}>
        <Layer x={-x} y={-y}>{children}</Layer>
      </Layer>
    </Layer>
  );
};

/** Bars top and bottom, `bars` keyframes of their height ([[frame, px], ...], eased between). */
export const Letterbox: React.FC<{ frame: number; bars: [number, number][] }> = ({ frame, bars }) => {
  const { width, height } = useVideoConfig();
  const taste = useTaste();
  const h = keys(frame, bars);
  if (h < 0.5) return null;
  return (
    <Layer>
      <Rect width={width} height={h} fill={taste.bars} />
      <Rect y={height - h} width={width} height={h} fill={taste.bars} />
    </Layer>
  );
};
