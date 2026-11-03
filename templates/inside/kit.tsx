// Building blocks for "Inside": the Studio window filmed Screen Studio style (a window on a wallpaper, a camera that
// eases onto what the cursor is doing, a drawn cursor), the fall through the preview into a world and back, and the
// on-screen type each world sets in its own style.
import React from 'react';
import { Easing, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Layer, Rect, Text, Video, blur } from '@kinetographdev/core';
import { measureText } from '@remotion/layout-utils';
import { loadFont as loadDMSans } from '@remotion/google-fonts/DMSans';
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono';
import { loadFont as loadSerif } from '@remotion/google-fonts/InstrumentSerif';

export const FPS = 30;
export const W = 1920;
export const H = 1080;
export const SANS = loadDMSans('normal', { weights: ['400', '500', '600', '700'] }).fontFamily;
export const MONO = loadMono('normal', { weights: ['400', '500'] }).fontFamily;
export const SERIF = loadSerif('normal', { weights: ['400'] }).fontFamily;
// the launch film's brand: ink, cream, signal red
export const INK = '#0b0b0c';
export const CREAM = '#efece6';
export const RED = '#E0261B';

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
export const ease = Easing.bezier(0.65, 0, 0.35, 1);
export const out = Easing.bezier(0.16, 1, 0.3, 1);
export const s2f = (s: number) => Math.round(s * FPS);

// ---------------------------------------------------------------------------------------------------------------------
// The Studio window on its wallpaper, with a Screen Studio camera

/** A capture in public/studio, in capture pixels (2x: 3840x2160 for the 1920x1080 window). */
export interface Capture {
  file: string;
  w: number;
  h: number;
  /** css px per capture px is 1/scale */
  scale: number;
}

/** A camera key: at time t (s, clip time) the camera looks at (cx, cy) in window css px with zoom s (1 = whole window). */
export interface Cam { t: number; s: number; cx?: number; cy?: number }

/** The camera at clip time t: eased between keys, holding before the first and after the last. */
export const camAt = (keys: Cam[], t: number): { s: number; cx: number; cy: number } => {
  const full = (k: Cam) => ({ s: k.s, cx: k.cx ?? W / 2, cy: k.cy ?? H / 2 });
  if (t <= keys[0]!.t) return full(keys[0]!);
  for (let i = 0; i + 1 < keys.length; i++) {
    const a = keys[i]!, b = keys[i + 1]!;
    if (t <= b.t) {
      const p = ease((t - a.t) / Math.max(1e-6, b.t - a.t));
      const A = full(a), B = full(b);
      return { s: A.s + (B.s - A.s) * p, cx: A.cx + (B.cx - A.cx) * p, cy: A.cy + (B.cy - A.cy) * p };
    }
  }
  return full(keys[keys.length - 1]!);
};

/** The window rectangle on screen when the camera looks at (cx, cy) at zoom s. The window at rest is inset on the wallpaper. */
export const INSET = 0.86;
export const windowXf = (s: number, cx: number, cy: number) => {
  // at s = 1 the window sits centred at INSET of the frame; zoom scales about the looked-at point
  const k = INSET * s;
  // keep the looked-at point at the centre of the frame, but never show past the window's edges once zoomed in
  let x = W / 2 - cx * k;
  let y = H / 2 - cy * k;
  if (k > 1) {
    x = Math.min(0, Math.max(W - W * k, x));
    y = Math.min(0, Math.max(H - H * k, y));
  } else {
    x = (W - W * k) / 2;
    y = (H - H * k) / 2;
  }
  return { x, y, k };
};

/** Screen position of a window css point under the camera. */
export const toScreen = (px: number, py: number, s: number, cx: number, cy: number) => {
  const { x, y, k } = windowXf(s, cx, cy);
  return { x: x + px * k, y: y + py * k };
};

export const Wallpaper: React.FC<{ id: string }> = ({ id }) => (
  <Layer id={id}>
    <Rect id={`${id}-bg`} width={W} height={H} fill={INK} />
    <Layer id={`${id}-glow`} effects={[blur(220)]} opacity={0.55}>
      <Rect id={`${id}-g1`} x={-200} y={H * 0.55} width={1100} height={700} radius={350} fill="#5a1410" />
      <Rect id={`${id}-g2`} x={W - 900} y={-300} width={1100} height={700} radius={350} fill="#1d2440" />
    </Layer>
  </Layer>
);

/**
 * A Studio capture filmed like Screen Studio: the window on a dark wallpaper, rounded and shadowed, the camera easing
 * between keys (zoom and look-at in window css px), with motion blur on the moves and a drawn cursor.
 */
export const StudioShot: React.FC<{
  id: string;
  cap: Capture;
  /** clip time at this shot's first frame, s */
  from?: number;
  rate?: number;
  keys: Cam[];
  mouse?: [number, number, number][];
  clicks?: number[];
  /** extra layers drawn in window css px, under the camera (e.g. a world rising out of the preview) */
  children?: React.ReactNode;
}> = ({ id, cap, from = 0, rate = 1, keys, mouse, clicks, children }) => {
  const f = useCurrentFrame();
  const t = from + (f / FPS) * rate;
  const c = camAt(keys, f / FPS);
  const prev = camAt(keys, (f - 1) / FPS);
  const { x, y, k } = windowXf(c.s, c.cx, c.cy);
  const moving = Math.abs(prev.s - c.s) > 0.012 || Math.hypot(prev.cx - c.cx, prev.cy - c.cy) > 4;
  const radius = interpolate(k, [INSET, 1], [18, 0], clamp);
  return (
    <Layer id={id}>
      <Wallpaper id={`${id}-wall`} />
      <Layer id={`${id}-cam`} x={x} y={y} scale={k} motionBlur={moving ? { samples: 8, shutter: 0.25 } : undefined}>
        <Layer id={`${id}-shadow`} opacity={0.6 * (1 - interpolate(k, [INSET, 1.05], [0, 1], clamp))} effects={[blur(40)]}>
          <Rect id={`${id}-sh`} x={0} y={30} width={W} height={H} radius={radius} fill="#000" />
        </Layer>
        <Layer id={`${id}-win`} matte={{ layer: `${id}-m`, mode: 'alpha' }}>
          <Video id={`${id}-v`} src={staticFile(`studio/${cap.file}`)} width={W} height={H} fit="fill" trimBefore={s2f(from)} playbackRate={rate} muted />
          <Rect id={`${id}-ver`} x={1630} y={18} width={110} height={26} fill="#0a0a0a" />
          {children}
        </Layer>
        <Rect id={`${id}-m`} width={W} height={H} radius={radius} fill="#fff" />
        {mouse ? <Cursor id={`${id}-cur`} mouse={mouse} clicks={clicks} t={t} scale={1 / k} /> : null}
      </Layer>
    </Layer>
  );
};

/** Interpolated cursor position at time t from a [t, x, y] path (window css px). */
export const mouseAt = (path: [number, number, number][], t: number) => {
  if (t <= path[0]![0]) return { x: path[0]![1], y: path[0]![2] };
  for (let i = 0; i + 1 < path.length; i++) {
    const a = path[i]!, b = path[i + 1]!;
    if (t <= b[0]) {
      const p = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
      return { x: a[1] + (b[1] - a[1]) * p, y: a[2] + (b[2] - a[2]) * p };
    }
  }
  const l = path[path.length - 1]!;
  return { x: l[1], y: l[2] };
};

/** macOS-like arrow cursor; it dips on a click and a ring spreads from the tip. Kept a constant size on screen. */
export const Cursor: React.FC<{ id: string; mouse: [number, number, number][]; clicks?: number[]; t: number; scale: number }> = ({ id, mouse, clicks = [], t, scale }) => {
  // smooth the recorded path a little, as Screen Studio does
  const n = 5;
  let sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { const m = mouseAt(mouse, t - i * 0.025); sx += m.x; sy += m.y; }
  const x = sx / n, y = sy / n;
  const since = clicks.map((c) => t - c).filter((d) => d >= 0 && d < 0.5).sort((a, b) => a - b)[0];
  const press = since !== undefined ? interpolate(since, [0, 0.06, 0.2], [0.82, 0.82, 1], clamp) : 1;
  const s = 1.25 * scale * press;
  const arrow = 'M0 0 L0 22 L5.6 16.8 L9.6 26 L13.2 24.4 L9.4 15.6 L16.6 15.6 Z';
  return (
    <Layer id={id}>
      {since !== undefined ? (
        <Layer id={`${id}-ring`} x={x} y={y} opacity={interpolate(since, [0, 0.45], [0.55, 0], clamp)}>
          <Rect id={`${id}-r`} x={-18 * scale * (1 + since * 3)} y={-18 * scale * (1 + since * 3)} width={36 * scale * (1 + since * 3)} height={36 * scale * (1 + since * 3)}
            radius={18 * scale * (1 + since * 3)} fill="rgba(255,255,255,0.0)" stroke={{ color: '#fff', width: 2 * scale }} />
        </Layer>
      ) : null}
      <Layer id={`${id}-a`} x={x} y={y} scale={s}>
        <Layer id={`${id}-as`} x={1.5} y={2.5} opacity={0.35} effects={[blur(2)]}>
          <PathShape id={`${id}-ps`} d={arrow} fill="#000" />
        </Layer>
        <PathShape id={`${id}-p`} d={arrow} fill="#111" stroke="#fff" strokeWidth={1.6} />
      </Layer>
    </Layer>
  );
};

import { Path } from '@kinetographdev/core';
const PathShape: React.FC<{ id: string; d: string; fill: string; stroke?: string; strokeWidth?: number }> = ({ id, d, fill, stroke, strokeWidth }) => (
  <Path id={id} d={d} fill={fill} stroke={stroke ? { color: stroke, width: strokeWidth ?? 1 } : undefined} />
);

// ---------------------------------------------------------------------------------------------------------------------
// Worlds

/** A rendered world clip, full frame, from second `from` at `rate`. */
export const Clip: React.FC<{ id: string; src: string; from?: number; rate?: number; scale?: number; x?: number; y?: number; effects?: any[] }> = ({ id, src, from = 0, rate = 1, scale = 1, x = 0, y = 0, effects }) => (
  <Layer id={id} x={W / 2 + x} y={H / 2 + y} anchorX={W / 2} anchorY={H / 2} scale={scale}>
    <Video id={`${id}-v`} src={staticFile(src)} width={W} height={H} fit="cover" trimBefore={s2f(from)} playbackRate={rate} muted effects={effects} />
  </Layer>
);

/**
 * The fall: over `frames`, the world grows out of the preview rectangle (window css px, at the camera's final zoom) to
 * full frame, sharpening as it lands. Draw it over the Studio shot's last frames.
 */
export const Fall: React.FC<{ id: string; t: number; frames: number; rect: [number, number, number, number]; children: React.ReactNode; reverse?: boolean }> = ({ id, t, frames, rect, children, reverse }) => {
  const p0 = Math.min(1, Math.max(0, t / frames));
  const p = reverse ? 1 - ease(p0) : ease(p0);
  const [rx, ry, rw, rh] = rect;
  const sc = rw / W + (1 - rw / W) * p;
  const x = rx + (0 - rx) * p;
  const y = ry + (0 - ry) * p;
  const b = (1 - p) * 10 * (reverse ? 1 : 0.6);
  return (
    <Layer id={id} x={x} y={y} scale={sc} opacity={interpolate(p, [0, 0.12], [0, 1], clamp)} effects={b > 0.4 ? [blur(b)] : []}
      motionBlur={p0 > 0 && p0 < 1 ? { samples: 8, shutter: 0.6 } : undefined}>
      <Layer id={`${id}-in`} matte={{ layer: `${id}-m`, mode: 'alpha' }}>{children}</Layer>
      <Rect id={`${id}-m`} width={W} height={H} radius={interpolate(p, [0, 1], [10, 0])} fill="#fff" />
    </Layer>
  );
};

/** A hard white flash for one or two frames on a cut. */
export const Flash: React.FC<{ id: string; t: number; len?: number; color?: string }> = ({ id, t, len = 3, color = '#fff' }) =>
  t >= 0 && t < len ? <Rect id={id} width={W} height={H} fill={color} opacity={interpolate(t, [0, len], [0.85, 0], clamp)} /> : null;

/** Words that arrive one at a time, rising and sharpening (DM Sans, the brand face) */
export const Rise: React.FC<{ id: string; t: number; text: string; x: number; y: number; size: number; color?: string; font?: string; weight?: number; stagger?: number; align?: 'left' | 'center'; tracking?: number; dot?: boolean; out?: number }> = ({
  id, t, text, x, y, size, color = CREAM, font = SANS, weight = 500, stagger = 3, align = 'left', tracking = -0.02, dot, out,
}) => {
  const words = text.split(' ');
  const adv = (s: string) => measureText({ text: s, fontFamily: font, fontSize: size, fontWeight: weight, letterSpacing: tracking * size }).width * 1.05;
  const total = words.reduce((a, w) => a + adv(w), 0) + (words.length - 1) * size * 0.28;
  let cx = align === 'center' ? x - total / 2 : x;
  const gone = out !== undefined ? interpolate(t, [out, out + 8], [1, 0], clamp) : 1;
  return (
    <Layer id={id} opacity={gone}>
      {words.map((w, i) => {
        const lt = t - i * stagger;
        const p = out_(lt / 14);
        const node = (
          <Layer key={i} id={`${id}-${i}`} x={cx} y={y + (1 - p) * size * 0.5} opacity={interpolate(lt, [0, 6], [0, 1], clamp)} effects={p < 0.95 ? [blur((1 - p) * 8)] : []}>
            <Text id={`${id}-${i}-t`} font={font} size={size} weight={weight} color={color} letterSpacing={tracking * size}>{w}</Text>
          </Layer>
        );
        cx += adv(w) + size * 0.32;
        return node;
      })}
      {dot ? <Rect id={`${id}-dot`} x={cx - size * 0.32 + size * 0.06} y={y + size * 0.78} width={size * 0.17} height={size * 0.17} radius={size} fill={RED} opacity={interpolate(t - words.length * stagger, [0, 6], [0, 1], clamp)} /> : null}
    </Layer>
  );
};
const out_ = (p: number) => out(Math.min(1, Math.max(0, p)));
