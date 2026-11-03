// One tracked point: a reticle that sits on it and the point itself, to pin anything else to. The point comes from
// tools/track.mjs, run once offline. The reticle is the Kinetograph launch film's (examples/launch/print/captions.tsx).

import React from 'react';
import { random, useCurrentFrame, useVideoConfig } from '@kinetographdev/core';
import { MONO } from './blobs.js';

/** What tools/track.mjs writes: the patch's centre on every frame, in `width` x `height` pixels. */
export interface PointTrack { fps: number; width: number; height: number; points: number[][] }

export interface Point { x: number; y: number }

/** The tracked point on composition frame `frame` (at `fps`) of a clip that starts on `from`, scaled to `width` x
 *  `height`; held at the first or last point outside the clip. */
export function pointAt(track: PointTrack, frame: number, fps: number, width = track.width, height = track.height, from = 0): Point {
  const i = Math.min(track.points.length - 1, Math.max(0, Math.floor(((frame - from) / fps) * track.fps + 1e-6)));
  const [x, y] = track.points[i]!;
  return { x: (x! * width) / track.width, y: (y! * height) / track.height };
}

export interface ReticleProps {
  track: PointTrack;
  from?: number;
  width?: number;
  height?: number;
  /** The box's side, px. */
  size?: number;
  /** The text under the box. A confidence figure flickers beside it. */
  label?: string;
  color?: string;
  /** px the box shakes by each frame, as a lock that is never quite still. */
  jitter?: number;
}

/** A box with corner ticks and a label, on the tracked point. */
export const Reticle: React.FC<ReticleProps> = ({ track, from = 0, width, height, size = 92, label = 'TRK 01', color = '#fff4e2', jitter = 3 }) => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const at = pointAt(track, frame, fps, width ?? W, height ?? H, from);
  const jx = (random(`rx-${frame}`) - 0.5) * jitter, jy = (random(`ry-${frame}`) - 0.5) * jitter;
  return (
    <div style={{ position: 'absolute', left: at.x - size / 2 + jx, top: at.y - size / 2 + jy, width: size, height: size, border: `1px solid ${color}`,
      boxShadow: '0 0 0 1px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(0,0,0,0.45)' }}>
      {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) => (
        <div key={`${x}${y}`} style={{ position: 'absolute', left: x ? undefined : -2, right: x ? -2 : undefined, top: y ? undefined : -2, bottom: y ? -2 : undefined, width: 12, height: 12,
          [`border${y ? 'Bottom' : 'Top'}`]: `3px solid ${color}`, [`border${x ? 'Right' : 'Left'}`]: `3px solid ${color}`, filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.8))' }} />
      ))}
      <div style={{ position: 'absolute', left: 0, top: '100%', marginTop: 6, fontFamily: MONO, fontSize: 13, color, whiteSpace: 'pre', opacity: 0.85 }}>
        {`${label}  ${(0.91 + random(`c-${Math.floor(frame / 5)}`) * 0.08).toFixed(2)}`}
      </div>
    </div>
  );
};
