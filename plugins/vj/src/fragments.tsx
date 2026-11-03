// Fragments: clips seen only through windows (the boxes a detector would draw round people and birds, a few tiles of
// sky, a scatter of round holes), each clip on its own plane at its own depth in a dark space, and a camera that flies
// through them, so near pieces slide past faster than far ones. After a piece made in Fusion with image planes and a
// 3D camera; here the depth is projected by hand (scale and shift by 1 / depth), so a frame is a pure function of the
// props and the camera can pass right through a piece.
//
// The boxes and their names come from the agent editing the video, not from a model: tools/blobs.mjs finds what
// moves and keeps an id on it, the agent looks at the ids (`inspect`) and names them (`labels`); still things it
// boxes itself (`spots`), optionally followed by tools/track.mjs.

import React from 'react';
import { Layer, Rect, Text, Video, random, useCurrentFrame, useVideoConfig } from '@kinetographdev/core';
import { MONO, type BlobTrack } from './blobs.js';
import type { PointTrack } from './track.js';

/** A box the agent placed: `box` is x, y, w, h in the piece's clip pixels on the clip's first frame; with `track`
 *  (tools/track.mjs on a patch inside it) the box moves with the patch. `from` and `to` are clip frames. */
export interface Spot { label: string; box: [number, number, number, number]; track?: PointTrack; from?: number; to?: number }

/** What of a piece's clip shows. Several are joined. */
export type Window =
  | 'whole'
  /** Every blob of a tools/blobs.mjs track, named by id (`labels`); `only` leaves out the unnamed ones. */
  | { boxes: BlobTrack; labels?: Record<string, string>; only?: boolean; min?: number; max?: number }
  | { spots: Spot[] }
  /** Fixed rectangles (x, y, w, h in clip pixels), opening one by one `stagger` frames apart. */
  | { tiles: [number, number, number, number][]; stagger?: number }
  /** `dots` round holes of radius `radius` (or between the two) scattered over `area` (default the clip), each
   *  wandering by up to `drift` px. */
  | { dots: number; radius?: number | [number, number]; area?: [number, number, number, number]; drift?: number; seed?: string };

export interface Piece {
  src: string;
  /** The clip's own size: the space its boxes, spots and tiles are in. Default the boxes' track's, else 1920x1080. */
  width?: number;
  height?: number;
  /** Where the clip's centre sits: x and y in px from the frame's centre, seen from depth 0, and its depth z. A piece
   *  at z 1 with the camera at z 0 shows at `size`. */
  at?: [number, number, number];
  /** The clip's scale on its plane. Default 1. */
  size?: number;
  /** Composition frames it is on screen; its clip starts at `from`. */
  from?: number;
  until?: number;
  trimBefore?: number;
  rate?: number;
  loop?: boolean;
  show: Window[];
  /** Draw the boxes' and spots' outlines and name tags. Default true. */
  tags?: boolean;
  /** Frames a box or tile takes to open. Default 6. */
  pop?: number;
}

export interface CameraKey { frame: number; x?: number; y?: number; z?: number }

export interface FragmentsProps {
  pieces: Piece[];
  /** Keys the camera eases between (x, y in px, z in depth units), or a function of the frame. Default: a slow push
   *  from z 0 to 0.5 over the composition. */
  camera?: CameraKey[] | ((frame: number) => { x: number; y: number; z: number });
  /** Colours of the tags by name; other names get one from a set, the same each time. */
  colors?: Record<string, string>;
  /** Tag text size, clip px. Default 22. */
  fontSize?: number;
  /** 0..1: how much a piece dims per unit of depth past 1. Default 0.25. */
  fog?: number;
  /** Show piece `inspect` flat, whole and filling the frame, at its clip's own frame (its `from` ignored), with every
   *  box's id, every spot's name and a grid in clip pixels: render stills of it to name the ids and place spots. */
  inspect?: number;
  id?: string;
}

const CLASS: Record<string, string> = {
  person: '#ff6b5e', bird: '#3fd3e6', cow: '#e9cf4f', dog: '#f2a33a', bench: '#ff9440', car: '#8f7cff', boat: '#43c47a',
  bicycle: '#ff5fa2', umbrella: '#5aa0ff', handbag: '#c9e04a', backpack: '#ffb36b', sign: '#9be7ff', train: '#b98cff',
};
const MORE = ['#ff6b5e', '#3fd3e6', '#e9cf4f', '#43c47a', '#8f7cff', '#ff9440', '#ff5fa2', '#5aa0ff'];
const colorOf = (label: string, colors: Record<string, string>) =>
  colors[label] ?? CLASS[label] ?? MORE[Math.floor(random(`fragments-${label}`) * MORE.length)]!;

const smooth = (t: number) => { const u = Math.min(1, Math.max(0, t)); return u * u * (3 - 2 * u); };
const backOut = (t: number) => { const u = Math.min(1, Math.max(0, t)) - 1; return 1 + 2.2 * u * u * u + 1.2 * u * u; };

/** The camera on `frame`: eased between the keys, held before the first and after the last. */
export function cameraAt(keys: CameraKey[], frame: number): { x: number; y: number; z: number } {
  const ks = [...keys].sort((a, b) => a.frame - b.frame);
  const fill = (k: CameraKey) => ({ x: k.x ?? 0, y: k.y ?? 0, z: k.z ?? 0 });
  if (!ks.length) return { x: 0, y: 0, z: 0 };
  if (frame <= ks[0]!.frame) return fill(ks[0]!);
  for (let i = 1; i < ks.length; i++) {
    if (frame > ks[i]!.frame) continue;
    const a = fill(ks[i - 1]!), b = fill(ks[i]!), t = smooth((frame - ks[i - 1]!.frame) / Math.max(1, ks[i]!.frame - ks[i - 1]!.frame));
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
  }
  return fill(ks[ks.length - 1]!);
}

/** The frame each blob id is first seen on, per track. */
const firsts = new WeakMap<BlobTrack, Map<number, number>>();
function firstSeen(track: BlobTrack): Map<number, number> {
  let m = firsts.get(track);
  if (!m) {
    m = new Map();
    track.frames.forEach((row, i) => row.forEach((b) => { if (!m!.has(b[0]!)) m!.set(b[0]!, i); }));
    firsts.set(track, m);
  }
  return m;
}

interface Mark { key: string; x: number; y: number; w: number; h: number; label?: string; open: number }
interface Hole { x: number; y: number; r: number }

const rectPath = (m: { x: number; y: number; w: number; h: number }) => `M${m.x} ${m.y}h${m.w}v${m.h}h${-m.w}Z`;
// clockwise like the rectangles, so the non-zero rule joins overlapping holes instead of cutting them out
const circlePath = (c: Hole) => `M${c.x - c.r} ${c.y}a${c.r} ${c.r} 0 1 1 ${2 * c.r} 0a${c.r} ${c.r} 0 1 1 ${-2 * c.r} 0Z`;

/** A box shrunk about its centre to `k` of its size. */
const opened = (m: Mark): Mark => {
  const k = backOut(m.open);
  return { ...m, x: m.x + (m.w * (1 - k)) / 2, y: m.y + (m.h * (1 - k)) / 2, w: m.w * k, h: m.h * k };
};

/** What of piece `p` shows `t` seconds into its clip (`local` frames after it started): boxes with names, tiles, holes. */
function windowsOf(p: Piece, cw: number, ch: number, t: number, local: number, fps: number, inspect: boolean) {
  const boxes: Mark[] = [], tiles: Mark[] = [], holes: Hole[] = [];
  let whole = inspect;
  const pop = Math.max(1, p.pop ?? 6);
  p.show.forEach((w, wi) => {
    if (w === 'whole') { whole = true; return; }
    if ('boxes' in w) {
      const tr = w.boxes;
      const len = tr.frames.length;
      let i = Math.floor(t * tr.fps + 1e-6);
      if (p.loop && len) i = ((i % len) + len) % len;
      const row = tr.frames[i] ?? [];
      const sx = cw / tr.width, sy = ch / tr.height, first = firstSeen(tr);
      const found = row
        .filter((b) => b[5]! >= (w.min ?? 0))
        .map(([id, x, y, bw, bh, area]) => ({ id: id!, x: x! * sx, y: y! * sy, w: bw! * sx, h: bh! * sy, area: area!, label: w.labels?.[String(id)] }))
        .filter((b) => inspect || !w.only || b.label)
        .sort((a, b) => b.area - a.area)
        .slice(0, w.max ?? Infinity);
      for (const b of found) {
        boxes.push({ key: `b${wi}-${b.id}`, x: b.x, y: b.y, w: b.w, h: b.h, label: inspect ? `ID ${b.id}` : b.label,
          open: inspect ? 1 : (i - (first.get(b.id) ?? 0)) / ((pop * tr.fps) / fps) });
      }
    } else if ('spots' in w) {
      const f = t * fps;
      w.spots.forEach((s, si) => {
        if (f < (s.from ?? 0) || (s.to !== undefined && f > s.to)) return;
        let [x, y] = s.box;
        if (s.track) {
          const n = s.track.points.length, at = Math.floor(t * s.track.fps + 1e-6);
          const i = p.loop ? ((at % n) + n) % n : Math.min(n - 1, Math.max(0, at));
          const k = cw / s.track.width, l = ch / s.track.height;
          x += (s.track.points[i]![0]! - s.track.points[0]![0]!) * k;
          y += (s.track.points[i]![1]! - s.track.points[0]![1]!) * l;
        }
        boxes.push({ key: `s${wi}-${si}`, x, y, w: s.box[2], h: s.box[3], label: s.label, open: inspect ? 1 : (f - (s.from ?? 0)) / pop });
      });
    } else if ('tiles' in w) {
      w.tiles.forEach(([x, y, tw, th], ti) => {
        const open = inspect ? 1 : (local - ti * (w.stagger ?? 0)) / pop;
        if (open > 0) tiles.push({ key: `t${wi}-${ti}`, x, y, w: tw, h: th, open });
      });
    } else {
      const [ax, ay, aw, ah] = w.area ?? [0, 0, cw, ch];
      const [r0, r1] = typeof w.radius === 'number' ? [w.radius, w.radius] : (w.radius ?? [10, 28]);
      const seed = w.seed ?? `dots-${wi}`, drift = w.drift ?? 0;
      for (let d = 0; d < w.dots; d++) {
        const rnd = (k: string) => random(`${seed}-${d}-${k}`);
        const ph = rnd('p') * Math.PI * 2, sp = 0.4 + rnd('s') * 0.8;
        const open = inspect ? 1 : Math.min(1, (local - rnd('o') * pop * 2) / pop);
        if (open <= 0) continue;
        holes.push({
          x: ax + rnd('x') * aw + Math.sin(ph + t * sp) * drift,
          y: ay + rnd('y') * ah + Math.cos(ph * 1.3 + t * sp * 0.8) * drift,
          r: (r0 + (r1 - r0) * rnd('r')) * backOut(open),
        });
      }
    }
  });
  // a box that has slid off the clip (a tracked spot on a panning shot) is cut to it, and dropped when little is left
  const inside = (m: Mark): Mark | null => {
    const x0 = Math.max(0, m.x), y0 = Math.max(0, m.y), x1 = Math.min(cw, m.x + m.w), y1 = Math.min(ch, m.y + m.h);
    return x1 - x0 > 0 && y1 - y0 > 0 && (x1 - x0) * (y1 - y0) >= 0.35 * m.w * m.h ? { ...m, x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
  };
  return { whole, boxes: boxes.map(inside).filter((m): m is Mark => m !== null), tiles, holes };
}

/** A name tag: the box outlined in the name's colour and a filled tab above it (inside it at the clip's top edge),
 *  with the name and a confidence figure that flickers as a detector's does. */
const Tag: React.FC<{ m: Mark; color: string; size: number; conf: number | null; stroke: number }> = ({ m, color, size, conf, stroke }) => {
  const text = conf === null ? m.label! : `${m.label} ${conf.toFixed(2)}`;
  const th = size * 1.3, tw = text.length * size * 0.6 + size * 0.6;
  const ty = m.y >= th ? m.y - th : m.y;
  return (
    <>
      <Rect x={m.x} y={m.y} width={m.w} height={m.h} stroke={{ color, width: stroke }} />
      <Rect x={m.x - stroke / 2} y={ty} width={tw} height={th} fill={color} />
      <Text font={MONO} weight={700} size={size} color="#ffffff" x={m.x - stroke / 2 + size * 0.3} y={ty + size * 0.12}>{text}</Text>
    </>
  );
};

/** Clips seen through windows on planes at different depths, with a camera moving through them. */
export const Fragments: React.FC<FragmentsProps> = ({ pieces, camera, colors = {}, fontSize = 22, fog = 0.25, inspect, id = 'fragments' }) => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H, durationInFrames } = useVideoConfig();
  const cam = typeof camera === 'function' ? camera(frame)
    : cameraAt(camera ?? [{ frame: 0, z: 0 }, { frame: durationInFrames - 1, z: 0.5 }], frame);

  const order = pieces.map((p, i) => ({ p, i })).filter(({ i }) => inspect === undefined || i === inspect);
  // far pieces first, so near ones cover them
  if (inspect === undefined) order.sort((a, b) => (b.p.at?.[2] ?? 1) - (a.p.at?.[2] ?? 1));

  return (
    <Layer id={id}>
      {order.map(({ p, i }) => {
        const from = p.from ?? 0;
        if (inspect === undefined && (frame < from || (p.until !== undefined && frame >= p.until))) return null;
        const first = p.show.find((w): w is Extract<Window, { boxes: BlobTrack }> => typeof w === 'object' && 'boxes' in w);
        const cw = p.width ?? first?.boxes.width ?? 1920, ch = p.height ?? first?.boxes.height ?? 1080;
        const local = inspect === undefined ? frame - from : frame;
        const t = ((p.trimBefore ?? 0) + local * (p.rate ?? 1)) / fps;
        const win = windowsOf(p, cw, ch, t, local, fps, inspect !== undefined);

        let scale: number, x: number, y: number, opacity = 1;
        if (inspect !== undefined) {
          scale = Math.min(W / cw, H / ch);
          x = (W - cw * scale) / 2; y = (H - ch * scale) / 2;
        } else {
          const [px, py, pz] = p.at ?? [0, 0, 1];
          const depth = pz - cam.z;
          if (depth < 0.04) return null;
          const s = 1 / depth;
          scale = (p.size ?? 1) * s;
          x = W / 2 + (px - cam.x) * s - (cw * scale) / 2;
          y = H / 2 + (py - cam.y) * s - (ch * scale) / 2;
          // gone as the camera passes through it; dimmer the further off it is
          opacity = smooth((depth - 0.04) / 0.16) * Math.max(0.15, 1 - Math.max(0, depth - 1) * fog);
          if (x > W || y > H || x + cw * scale < 0 || y + ch * scale < 0) return null;
        }

        const shown = [...win.boxes, ...win.tiles].filter((m) => m.open > 0).map(opened).filter((m) => m.w > 0.5 && m.h > 0.5);
        const d = win.whole ? '' : [...shown.map(rectPath), ...win.holes.filter((c) => c.r > 0.3).map(circlePath)].join('');
        if (!win.whole && !d) return null;
        const key = `${id}-${i}`;
        const tagged = (p.tags ?? true) || inspect !== undefined;
        const stroke = Math.max(1.5, 2 / scale);
        return (
          <Layer key={key} id={key} x={x} y={y} scale={scale} opacity={opacity}>
            <Layer id={`${key}-pic`} clip={win.whole ? undefined : { kind: 'path', d }}>
              <Video id={`${key}-clip`} src={p.src} width={cw} height={ch} fit="cover" from={inspect === undefined ? from : 0}
                trimBefore={p.trimBefore} playbackRate={p.rate} loop={p.loop} muted />
            </Layer>
            {inspect !== undefined && (
              // a grid every 100 clip px, numbered every 200, to read spot boxes off a still
              <Layer id={`${key}-grid`} opacity={0.55}>
                {Array.from({ length: Math.floor(cw / 100) + 1 }, (_, k) => <Rect key={`gx${k}`} x={k * 100} y={0} width={k % 2 ? 1 : 2} height={ch} fill="#00e5ff" />)}
                {Array.from({ length: Math.floor(ch / 100) + 1 }, (_, k) => <Rect key={`gy${k}`} x={0} y={k * 100} width={cw} height={k % 2 ? 1 : 2} fill="#00e5ff" />)}
                {Array.from({ length: Math.floor(cw / 200) + 1 }, (_, k) => <Text key={`tx${k}`} font={MONO} weight={700} size={20} color="#00e5ff" x={k * 200 + 4} y={4}>{String(k * 200)}</Text>)}
                {Array.from({ length: Math.floor(ch / 200) }, (_, k) => <Text key={`ty${k}`} font={MONO} weight={700} size={20} color="#00e5ff" x={4} y={(k + 1) * 200 + 4}>{String((k + 1) * 200)}</Text>)}
              </Layer>
            )}
            {tagged && (
              <Layer id={`${key}-tags`}>
                {win.boxes.filter((m) => m.label && m.open >= 0.5).map((m) => (
                  <Tag key={m.key} m={opened(m)} color={inspect !== undefined ? '#ff3b30' : colorOf(m.label!, colors)} size={inspect !== undefined ? Math.max(fontSize, 30) : fontSize} stroke={stroke}
                    conf={inspect !== undefined ? null : 0.35 + random(`${key}-${m.key}`) * 0.55 + (random(`${key}-${m.key}-${Math.floor(frame / 3)}`) - 0.5) * 0.04} />
                ))}
              </Layer>
            )}
          </Layer>
        );
      })}
    </Layer>
  );
};
