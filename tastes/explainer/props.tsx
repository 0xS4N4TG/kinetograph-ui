/// <reference lib="dom" />
// The explainer's object: one cut-out picture (a PNG with clean alpha: a still cut-out, never a video matte, whose fringe
// shows), with a shadow made from its own alpha. Entrances, measured at 30 fps:
//   rise   up from below the frame (a bust): exponential ease-out, 0.88 of the distance left kept each frame, about
//          0.65 H in 20 frames, no overshoot, no blur; then it creeps 3% bigger over the next 20 frames
//   right  in from the right edge: exponential ease-out, 0.82 (a quick one) to 0.89 (a long tail) kept each frame
//   left   the same from the left
//   pop    there on its frame, whole
// Not measured yet (from other references of the kind): `drop` (from above, turning, a small overshoot), `zoom` (out of a
// blur from 140%), and the dashed `ring` drawn round the object.
//
// Placement: the object sits over the keyword and covers only the tail of its last line. Pick a picture whose silhouette
// matches the reference's (a narrow head on an upright bust covers one word's end; a wide head covers the block).
//
// Shadows. The light is always top right, so a shadow only ever falls down and to the left; there is never an all-round
// glow, and the paper beside the object stays clean. Two kinds, both derived from the object itself:
//   ground  stands on the floor (a chess piece, a can, a briefcase): a thin soft dark band at the contact, darkest
//           (0.55) right at the base, 0.025 H tall, running off to the left over 0.35 W with a short tail to the right.
//           The contact span is read from the PNG's lowest opaque rows. No silhouette shadow.
//   cast    floats or is cropped by the frame (a bust rising from the bottom, an icon, a coin): the silhouette in black,
//           offset (-0.015 W, +0.012 H), blurred 0.025 W, at 0.4. Rendered with the object, so with the type drawn
//           first it also shades the keyword behind the object. No floor band.
// `shadow="auto"` (the default) picks cast when the object reaches the frame's bottom edge, ground otherwise.

import React, { useEffect, useState } from 'react';
import { Img, continueRender, delayRender, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp01, prog } from './stage.js';
import type { ExplainerTaste } from './taste.js';

const outCubic = (t: number) => 1 - (1 - clamp01(t)) ** 3;
const outBack = (t: number) => { const u = clamp01(t) - 1; return 1 + 2.7 * u * u * u + 1.7 * u * u; };

export interface PropProps {
  /** a cut-out picture (or children, for anything drawn) */
  src?: string;
  children?: React.ReactNode;
  /** the beat's first frame, and the frame in the beat the object starts to arrive */
  from: number;
  at?: number;
  /** its width as a fraction of the frame width (default 0.5), its centre (default 0.5, 0.52) */
  size?: number;
  x?: number;
  y?: number;
  /** width / height of the object (default 1) */
  aspect?: number;
  enter?: 'rise' | 'right' | 'left' | 'pop' | 'drop' | 'zoom' | 'spring' | 'none';
  /** for rise / right / left: the share of the distance left kept each frame (default 0.88 rise, 0.86 slides) */
  keep?: number;
  /** an offset in W this frame (a push exit) */
  dx?: number;
  ring?: boolean;
  ringColor?: string;
  /** 'auto' (default): cast when the object touches the frame's bottom edge, ground otherwise. false = 'none'. */
  shadow?: ShadowKind | 'auto' | false;
  /** shadow strength multiplier (default 1) */
  shadowOpacity?: number;
  /** the contact span along the object's bottom, as fractions of its width; read from the PNG's alpha when omitted */
  foot?: [number, number];
  /** float amplitude in px (default 0: the measured objects hold still) */
  float?: number;
  /** the taste whose entrance and shadow numbers to use (default BASE's, pin 1119) */
  taste?: ExplainerTaste;
}

export type ShadowKind = 'ground' | 'cast' | 'none';

const DASHES = 44;

/** Where a cut-out touches the floor: its lowest opaque rows, as fractions of the image (x0, x1 across, y down). */
interface Foot { x0: number; x1: number; y: number; aspect: number }
const footCache = new Map<string, Foot | null>();

/** Reads the PNG's alpha once (holding the render until it has) and returns its contact span, or null for children. */
export const useFoot = (src?: string): Foot | null => {
  const [foot, setFoot] = useState<Foot | null>(() => (src ? footCache.get(src) ?? null : null));
  const [handle] = useState(() => (src && !footCache.has(src) ? delayRender(`foot ${src}`) : null));
  useEffect(() => {
    if (!src || handle === null) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const done = (v: Foot | null) => { footCache.set(src, v); setFoot(v); continueRender(handle); };
    img.onerror = () => done(null);
    img.onload = () => {
      try {
        const k = Math.min(1, 400 / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const g = c.getContext('2d')!; g.drawImage(img, 0, 0, w, h);
        const a = g.getImageData(0, 0, w, h).data;
        const opaque = (x: number, y: number) => a[(y * w + x) * 4 + 3] > 128;
        let bottom = -1;
        for (let y = h - 1; y >= 0 && bottom < 0; y--) for (let x = 0; x < w; x++) if (opaque(x, y)) { bottom = y; break; }
        if (bottom < 0) return done(null);
        // the contact is the band of rows just above the lowest opaque one (2% of the height), so a single stray pixel
        // or a rounded base still gives the full width of the foot
        let x0 = w, x1 = -1;
        for (let y = Math.max(0, bottom - Math.ceil(h * 0.02)); y <= bottom; y++) for (let x = 0; x < w; x++) if (opaque(x, y)) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
        done({ x0: x0 / w, x1: (x1 + 1) / w, y: (bottom + 1) / h, aspect: img.naturalWidth / img.naturalHeight });
      } catch { done(null); }
    };
    img.src = src;
  }, [src, handle]);
  return foot;
};

/** One cut-out object with its entrance, contact shadow, float and optional dashed ring. */
export const Prop: React.FC<PropProps> = ({ src, children, from, at = 0, size = 0.5, x = 0.5, y = 0.52, aspect = 1, enter = 'rise', ring = false, ringColor = '#3a3a3a', shadow = 'auto', shadowOpacity = 1, foot: footProp, float = 0, keep, dx: pushX = 0, taste }) => {
  const M = taste?.motion, L = taste?.light;
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const f = frame - from - at;
  // hooks first: the early return below must not change the hooks this component calls
  const read = useFoot(src);
  if (f < 0 && enter !== 'none') return null;
  const w = W * size, h = w / aspect;
  let dx = pushX * W, dy = 0, rot = 0, scale = 1, soft = 0, opacity = 1;
  const top = y * H - h / 2;
  if (enter === 'rise') {
    const k = keep ?? M?.riseKeep ?? 0.88;
    dy = (H - top) * k ** f;
    scale = 1 + (M?.riseCreep ?? 0.03) * clamp01((f - 18) / 20);
  }
  if (enter === 'right' || enter === 'left') {
    const k = keep ?? M?.slideKeep ?? 0.86;
    dx += (enter === 'left' ? -1 : 1) * (enter === 'left' ? x * W + w / 2 : W - (x * W - w / 2)) * k ** f;
  }
  if (enter === 'drop') { const k = outBack(prog(f, 0, 18)); dy = -H * 0.6 * (1 - k); rot = 38 * (1 - k); soft = 8 * (1 - clamp01(k)); }
  if (enter === 'spring') { const t = taste?.motion.spring ?? []; scale = t.length ? (t[Math.min(t.length - 1, f)] ?? 1) : 1; opacity = Math.min(1, (f + 1) / 2); }
  if (enter === 'zoom') { const k = outCubic(prog(f, 0, 14)); scale = 1 + 0.4 * (1 - k); soft = 16 * (1 - k); opacity = Math.min(1, k * 2); }
  const bob = float * Math.sin((frame - from) / 22);
  const ringT = ring ? outCubic(prog(f, 12, 18)) : 0;
  const r = Math.max(w, h) * 0.62;
  const kind: ShadowKind = shadow === false ? 'none' : shadow === 'auto' ? (y * H + h / 2 >= H * 0.985 ? 'cast' : 'ground') : shadow;
  // the image is drawn object-fit: contain, so map its foot from image fractions into the box
  let foot = { x0: 0.18, x1: 0.82, y: 1 };
  if (footProp) foot = { x0: footProp[0], x1: footProp[1], y: 1 };
  else if (read) {
    const fitW = Math.min(w, h * read.aspect), fitH = fitW / read.aspect, ox = (w - fitW) / 2, oy = (h - fitH) / 2;
    foot = { x0: (ox + read.x0 * fitW) / w, x1: (ox + read.x1 * fitW) / w, y: (oy + read.y * fitH) / h };
  }
  // the band comes in as the object lands, and thins and pales while the object bobs above the floor
  const land = enter === 'rise' || enter === 'drop' ? clamp01(f / 14) : 1;
  const lift = Math.max(0, -(dy + bob)) / (H * 0.05);
  const groundA = (L?.groundAlpha ?? 0.55) * shadowOpacity * opacity * land * Math.max(0, 1 - lift);
  const castA = (L?.castAlpha ?? 0.4) * shadowOpacity * opacity;
  const [cox, coy] = L?.castOffset ?? [-0.015, 0.012], cblur = L?.castBlur ?? 0.025;
  const objTransform = `translate(${dx.toFixed(1)}px, ${(dy + bob).toFixed(1)}px) rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
  const body = src ? <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : children;
  return (
    <div style={{ position: 'absolute', left: x * W - w / 2, top: y * H - h / 2, width: w, height: h }}>
      {kind === 'ground' && groundA > 0.005 && (() => {
        // a band along the floor: away from the light over 0.35 W (left for a top-right light), a short tail the other
        // way; mirrored about the foot for a top-left light
        const fx0 = foot.x0 * w, fx1 = foot.x1 * w, left = fx0 - W * 0.35, right = fx1 + W * 0.04, bh = H * 0.025;
        const span = right - left, pct = (v: number) => `${(((v - left) / span) * 100).toFixed(2)}%`;
        const ink = (a: number) => `rgba(0,0,0,${(groundA * a).toFixed(3)})`;
        return (
          <div style={{ position: 'absolute', left, width: span, top: foot.y * h - bh * 0.62, height: bh, borderRadius: '50%',
            filter: `blur(${(H * 0.012).toFixed(1)}px)`, transform: `translateX(${dx.toFixed(1)}px)${cox > 0 ? ' scaleX(-1)' : ''}`, transformOrigin: `${((fx0 + fx1) / 2 - left).toFixed(1)}px 50%`,
            background: `linear-gradient(90deg, ${ink(0)} 0%, ${ink(0.12)} ${pct(fx0 - W * 0.22)}, ${ink(0.45)} ${pct(fx0 - W * 0.06)}, ${ink(1)} ${pct(fx0 + (fx1 - fx0) * 0.2)}, ${ink(0.9)} ${pct(fx1)}, ${ink(0)} 100%)` }} />
        );
      })()}
      {ringT > 0 && (
        // the ring draws on clockwise from the top: its dashes appear one after another
        <svg width={r * 2 + 8} height={r * 2 + 8} style={{ position: 'absolute', left: w / 2 - r - 4, top: h / 2 - r - 4, overflow: 'visible' }}>
          {Array.from({ length: DASHES }, (_, i) => i).filter((i) => i < ringT * DASHES).map((i) => {
            const a0 = (i / DASHES) * Math.PI * 2 - Math.PI / 2, a1 = a0 + (Math.PI * 2 / DASHES) * 0.58;
            const p = (a: number) => `${(r + 4 + r * Math.cos(a)).toFixed(2)} ${(r + 4 + r * Math.sin(a)).toFixed(2)}`;
            return <path key={i} d={`M${p(a0)} A${r} ${r} 0 0 1 ${p(a1)}`} fill="none" stroke={ringColor} strokeWidth={Math.max(2, W * 0.0025)} strokeLinecap="round" />;
          })}
        </svg>
      )}
      <div style={{ position: 'absolute', inset: 0, transform: objTransform }}>
        {kind === 'cast' && castA > 0.005 && (
          // the silhouette in black: brightness(0) keeps the alpha, then the blur and the down-left offset
          <div aria-hidden style={{ position: 'absolute', inset: 0, opacity: castA, transform: `translate(${(cox * W).toFixed(1)}px, ${(coy * H).toFixed(1)}px)`,
            filter: `brightness(0) blur(${(cblur * W + soft).toFixed(1)}px)` }}>{body}</div>
        )}
        <div style={{ position: 'absolute', inset: 0, opacity, filter: soft > 0.4 ? `blur(${soft.toFixed(1)}px)` : undefined }}>{body}</div>
      </div>
    </div>
  );
};
