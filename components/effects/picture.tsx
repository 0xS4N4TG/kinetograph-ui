// The picture the effect components wrap: their children when given, else a photo from public/ covering the frame.

import React from 'react';
import { Image, Layer, staticFile } from '@kinetographdev/core';

export const W = 1920;
export const H = 1080;

export const Picture: React.FC<{ id: string; src: string; children?: React.ReactNode; scale?: number; x?: number; y?: number }> = ({ id, src, children, scale = 1, x = 0, y = 0 }) => (
  <Layer id={id} x={x} y={y} scale={scale} origin="center">
    {children ?? <Image id={`${id}-img`} src={staticFile(src)} width={W} height={H} fit="cover" />}
  </Layer>
);
