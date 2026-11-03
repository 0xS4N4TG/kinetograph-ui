// Blob tracking overlays: boxes on the moving (or bright, or dark) regions of a clip, each with its id and coordinates,
// lines linking them, and a few boxes filled inverted. The regions come from tools/blobs.mjs, run once offline; this
// file only reads its JSON, so a frame is a pure function of the track and the frame number.

import React from 'react';
import { AbsoluteFill, Layer, random, useCurrentFrame, useVideoConfig } from '@kinetographdev/core';
import { makeGoogleFont } from '@kinetographdev/core/google-fonts';

export const MONO = makeGoogleFont('JetBrainsMono').loadFont('normal', { weights: ['400', '700'] }).fontFamily;

/** What tools/blobs.mjs writes: per frame, `[id, x, y, w, h, area]` per blob, in `width` x `height` pixels. */
export interface BlobTrack { fps: number; width: number; height: number; frames: number[][][] }

/** One blob on one frame, in the overlay's pixels. `area` is a fraction of the frame. */
export interface Blob { id: number; x: number; y: number; w: number; h: number; cx: number; cy: number; area: number }

/** The blobs on composition frame `frame` (at `fps`) of a clip that starts on frame `from`, scaled to `width` x
 *  `height`. The track may run at another rate than the composition: it is read by time. Past the clip's end: none. */
export function blobsAt(track: BlobTrack, frame: number, fps: number, width = track.width, height = track.height, from = 0): Blob[] {
  const i = Math.floor(((frame - from) / fps) * track.fps + 1e-6);
  const row = track.frames[i];
  if (i < 0 || !row) return [];
  const sx = width / track.width, sy = height / track.height;
  return row.map(([id, x, y, w, h, area]) => ({
    id: id!, x: x! * sx, y: y! * sy, w: w! * sx, h: h! * sy, cx: (x! + w! / 2) * sx, cy: (y! + h! / 2) * sy, area: area!,
  }));
}

/** Which blobs are linked by a line. `nearest`: each to its closest; `chain`: in id order; `all`: every pair closer
 *  than `reach` (a fraction of the frame's diagonal). */
export type BlobLinks = 'nearest' | 'chain' | 'all' | 'none';

export function linksOf(blobs: Blob[], links: BlobLinks, reach: number, diag: number): [Blob, Blob][] {
  if (links === 'none' || blobs.length < 2) return [];
  if (links === 'chain') return blobs.slice(1).map((b, i) => [blobs[i]!, b]);
  const out: [Blob, Blob][] = [];
  const seen = new Set<string>();
  const add = (a: Blob, b: Blob) => {
    const k = a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`;
    if (!seen.has(k)) { seen.add(k); out.push([a, b]); }
  };
  for (const a of blobs) {
    const others = blobs.filter((b) => b !== a).sort((p, q) => Math.hypot(p.cx - a.cx, p.cy - a.cy) - Math.hypot(q.cx - a.cx, q.cy - a.cy));
    if (links === 'nearest') add(a, others[0]!);
    else for (const b of others) if (Math.hypot(b.cx - a.cx, b.cy - a.cy) < reach * diag) add(a, b);
  }
  return out;
}

export interface BlobsProps {
  track: BlobTrack;
  /** The composition frame the tracked clip starts on. Default 0. */
  from?: number;
  /** The overlay's size: the clip's picture, filling it. Default the composition's. */
  width?: number;
  height?: number;
  /** How each blob is marked: a full box, the box's corners, a cross on its centre, or nothing. Default `frame`. */
  box?: 'frame' | 'corners' | 'cross' | 'none';
  /** The text beside each box: its id, its centre as 0..1 coordinates, both, or nothing. Default `both`. */
  label?: 'id' | 'xy' | 'both' | 'none';
  links?: BlobLinks;
  /** For `links="all"`: how far apart two blobs may be and still be linked, as a fraction of the diagonal. */
  reach?: number;
  /** 0..1: the share of blobs (picked by id) filled solid in difference blending, inverting the picture under them. */
  invert?: number;
  /** Blobs smaller than this fraction of the frame are left out. */
  min?: number;
  /** The biggest this many are kept. */
  max?: number;
  color?: string;
  /** How the boxes, lines and labels sit on the picture. `difference` keeps them readable on white and black alike
   *  (a 1-bit picture); `normal` keeps `color` as it is. Default `normal`. */
  blend?: 'normal' | 'difference';
  /** Line width, px. */
  stroke?: number;
  fontSize?: number;
  /** Prefix of the layer ids. */
  id?: string;
}

/** Boxes, labels and links on a tracked clip's blobs. Put it over the clip, the same size. */
export const Blobs: React.FC<BlobsProps> = ({
  track, from = 0, width, height, box = 'frame', label = 'both', links = 'nearest', reach = 0.3, invert = 0, min = 0, max = Infinity,
  color = '#ffffff', blend = 'normal', stroke = 1.5, fontSize = 14, id = 'blobs',
}) => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const w = width ?? W, h = height ?? H;
  const blobs = blobsAt(track, frame, fps, w, h, from).filter((b) => b.area >= min).sort((a, b) => b.area - a.area).slice(0, max).sort((a, b) => a.id - b.id);
  const lines = linksOf(blobs, links, reach, Math.hypot(w, h));
  const filled = blobs.filter((b) => random(`${id}-fill-${b.id}`) < invert);
  const c = Math.max(6, fontSize * 0.8);
  return (
    <AbsoluteFill style={{ width: w, height: h }}>
      {filled.length > 0 && (
        <Layer id={`${id}-invert`} blendMode="difference">
          {filled.map((b) => <div key={b.id} style={{ position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h, background: '#ffffff' }} />)}
        </Layer>
      )}
      <Layer id={`${id}-marks`} blendMode={blend}>
      <svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        {lines.map(([a, b]) => (
          <line key={`${a.id}-${b.id}`} x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy} stroke={color} strokeWidth={stroke * 0.7} strokeOpacity={0.75} />
        ))}
        {blobs.map((b) => (
          <g key={b.id}>
            {box === 'frame' && <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="none" stroke={color} strokeWidth={stroke} />}
            {box === 'corners' && (
              <path fill="none" stroke={color} strokeWidth={stroke * 1.6} d={[
                `M${b.x} ${b.y + c}V${b.y}H${b.x + c}`, `M${b.x + b.w - c} ${b.y}H${b.x + b.w}V${b.y + c}`,
                `M${b.x + b.w} ${b.y + b.h - c}V${b.y + b.h}H${b.x + b.w - c}`, `M${b.x + c} ${b.y + b.h}H${b.x}V${b.y + b.h - c}`,
              ].join('')} />
            )}
            {box === 'cross' && <path fill="none" stroke={color} strokeWidth={stroke} d={`M${b.cx - c} ${b.cy}H${b.cx + c}M${b.cx} ${b.cy - c}V${b.cy + c}`} />}
          </g>
        ))}
      </svg>
      {label !== 'none' && blobs.map((b) => (
        <div key={b.id} style={{
          // above the box, or inside it when the box touches the top of the frame
          position: 'absolute', left: b.x + (b.y >= fontSize * 1.4 ? 0 : 4), top: b.y >= fontSize * 1.4 ? b.y - fontSize * 1.35 : b.y + 4,
          fontFamily: MONO, fontSize, lineHeight: 1, color, whiteSpace: 'pre', textShadow: blend === 'normal' ? '0 0 3px rgba(0,0,0,0.6)' : undefined,
        }}>
          {[label !== 'xy' ? `ID ${b.id}` : '', label !== 'id' ? `${(b.cx / w).toFixed(3)} ${(b.cy / h).toFixed(3)}` : ''].filter(Boolean).join('  ')}
        </div>
      ))}
      </Layer>
    </AbsoluteFill>
  );
};
