// Layouts made from the objects themselves:
//   PlateMat       a daguerreotype's brass mat (the window a plate sits behind in its case), as a foreground layer:
//                  use it as the near layer of a parallax (factor 3, defocused) and the camera slides past the mat
//   ParallaxPlate  a photo cut into layers (kit/looks Parallax, factors 3 : 1 : 0.6) with a slow push, on twos,
//                  printed as its process
//   AlbumPage      a page of a 19th-century album: card stock, prints mounted with photo corners, typed labels; the
//                  page to turn with kit/looks PageTurn (posterized to 8 fps)
import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from 'remotion';
import { Parallax, type ParallaxLayer } from '../../kit/looks/parallax.js';
import { Posterize } from '../../kit/looks/posterize.js';
import { Toned, type ToneProps } from './photo.js';
import { ARCHIVE } from './tokens.js';
import { typewriter } from './type.js';

/** The brass mat of a cased daguerreotype, full frame, the window in the middle: an arched top, cut corners below,
 *  engraved bead lines, velvet outside. `window` is the opening in fractions of the frame. */
export const PlateMat: React.FC<{ window?: [number, number, number, number]; velvet?: boolean }> = ({ window: win = [0.09, 0.07, 0.91, 0.9], velvet = true }) => {
  const { width: W, height: H } = useVideoConfig();
  const [x0, y0, x1, y1] = [win[0] * W, win[1] * H, win[2] * W, win[3] * H];
  const r = (x1 - x0) / 2, c = 0.06 * W;
  // the opening: a semicircular arch on top, straight sides, cut corners at the bottom
  const open = `M${x0} ${y0 + r} A${r} ${r} 0 0 1 ${x1} ${y0 + r} L${x1} ${y1 - c} L${x1 - c} ${y1} L${x0 + c} ${y1} L${x0} ${y1 - c} Z`;
  const pad = 0.035 * W;
  const outer = `M${x0 - pad} ${y0 + r} A${r + pad} ${r + pad} 0 0 1 ${x1 + pad} ${y0 + r} L${x1 + pad} ${y1 - c + pad * 0.4} L${x1 - c + pad * 0.4} ${y1 + pad} L${x0 + c - pad * 0.4} ${y1 + pad} L${x0 - pad} ${y1 - c + pad * 0.4} Z`;
  return (
    <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
      <defs>
        <linearGradient id="brass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e4c27e" /><stop offset="0.35" stopColor={ARCHIVE.brass} /><stop offset="0.55" stopColor="#d6b06a" /><stop offset="0.8" stopColor={ARCHIVE.brassDark} /><stop offset="1" stopColor="#c59e5c" />
        </linearGradient>
        <radialGradient id="velvet" cx="0.5" cy="0.45" r="0.75"><stop offset="0.5" stopColor="#3a1a1d" /><stop offset="1" stopColor="#140708" /></radialGradient>
      </defs>
      {velvet && <path d={`M0 0 H${W} V${H} H0 Z ${outer}`} fillRule="evenodd" fill="url(#velvet)" />}
      <path d={`${outer} ${open}`} fillRule="evenodd" fill="url(#brass)" />
      {/* engraved bead lines and the tarnish at the window's edge */}
      <path d={outer} fill="none" stroke="rgba(60,40,10,0.55)" strokeWidth={0.003 * W} transform={`translate(${W / 2} ${H / 2}) scale(0.985) translate(${-W / 2} ${-H / 2})`} />
      <path d={open} fill="none" stroke="rgba(40,26,8,0.8)" strokeWidth={0.006 * W} />
      <path d={open} fill="none" stroke="rgba(255,236,190,0.5)" strokeWidth={0.002 * W} transform={`translate(${W / 2} ${H / 2}) scale(1.012) translate(${-W / 2} ${-H / 2})`} />
    </svg>
  );
};

export interface ParallaxPlateProps extends ToneProps {
  id: string;
  /** back to front: background (hole filled), subject cut-out, an optional near layer */
  layers: ParallaxLayer[];
  start: number;
  duration: number;
  travel?: number;
  rise?: number;
  /** a push over the move, scale per frame */
  push?: number;
  /** what the picture is framed on: position and zoom of every layer (they share it, so they stay registered) */
  zoom?: number;
  origin?: string;
  /** frames per step: 2 = on twos, as in the reference */
  step?: number;
  /** a near layer drawn untoned (a brass mat keeps its colour) */
  near?: React.ReactNode;
  nearFactor?: number;
  nearBlur?: number;
}

/** A photo cut into layers sliding in depth, printed as its process, on twos. */
export const ParallaxPlate: React.FC<ParallaxPlateProps> = ({ id, layers, start, duration, travel = -0.05, rise = 0, push = 0.0008, zoom = 1, origin = '50% 40%', step = 2, near, nearFactor = 3, nearBlur = 6, ...tone }) => {
  const f = useCurrentFrame();
  const s = zoom * (1 + push * Math.max(0, f - start));
  return (
    <Posterize step={step}>
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <Toned id={id} {...tone}>
          <AbsoluteFill style={{ transform: `scale(${s.toFixed(4)})`, transformOrigin: origin }}>
            <Parallax layers={layers} start={start} duration={duration} travel={travel} rise={rise} />
          </AbsoluteFill>
        </Toned>
        {near && <Parallax layers={[{ node: near, factor: nearFactor, blur: nearBlur }]} start={start} duration={duration} travel={travel} rise={rise} />}
      </AbsoluteFill>
    </Posterize>
  );
};

export interface Mounted {
  src: string;
  /** box in fractions of the page (x, y top-left) */
  x: number;
  y: number;
  w: number;
  h: number;
  tilt?: number;
  position?: string;
  /** the typed label under the print */
  label?: string;
}

/** A 19th-century album page: card stock with a ruled border, prints with photo corners, typed labels in ink. */
export const AlbumPage: React.FC<{ items: Mounted[]; title?: string; children?: React.ReactNode }> = ({ items, title, children }) => {
  const { width: W, height: H } = useVideoConfig();
  const k = W / 1080;
  return (
    <AbsoluteFill style={{ background: ARCHIVE.paper, backgroundImage: 'radial-gradient(ellipse 80% 70% at 45% 40%, rgba(255,250,235,0.6), rgba(150,120,70,0.25))' }}>
      {/* ruled border */}
      <div style={{ position: 'absolute', left: 0.045 * W, top: 0.03 * H, right: 0.045 * W, bottom: 0.03 * H, border: `${2 * k}px solid rgba(70,50,25,0.55)`, outline: `${1 * k}px solid rgba(70,50,25,0.35)`, outlineOffset: `${6 * k}px` }} />
      {title && <div style={{ position: 'absolute', left: 0, width: W, top: 0.055 * H, textAlign: 'center', fontFamily: typewriter(700), fontWeight: 700, fontSize: 0.03 * W, letterSpacing: '0.3em', color: ARCHIVE.ink }}>{title}</div>}
      {items.map((m, i) => {
        const corner = 0.045 * W;
        const cornerStyle = (pos: React.CSSProperties, rot: number): React.CSSProperties => ({ position: 'absolute', width: corner, height: corner, background: '#1a1410', clipPath: 'polygon(0 0, 100% 0, 0 100%)', transform: `rotate(${rot}deg)`, ...pos });
        return (
          <div key={i} style={{ position: 'absolute', left: m.x * W, top: m.y * H, width: m.w * W, height: m.h * H, transform: `rotate(${m.tilt ?? 0}deg)` }}>
            <div style={{ position: 'absolute', inset: 0, background: '#d9cdb0', padding: 0.012 * W, boxSizing: 'border-box', boxShadow: `0 ${4 * k}px ${14 * k}px rgba(40,25,10,0.4)` }}>
              <Img src={m.src} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: m.position ?? '50% 40%' }} />
            </div>
            <div style={cornerStyle({ left: -0.008 * W, top: -0.008 * W }, 0)} />
            <div style={cornerStyle({ right: -0.008 * W, top: -0.008 * W }, 90)} />
            <div style={cornerStyle({ right: -0.008 * W, bottom: -0.008 * W }, 180)} />
            <div style={cornerStyle({ left: -0.008 * W, bottom: -0.008 * W }, 270)} />
            {m.label && <div style={{ position: 'absolute', left: 0, width: '100%', top: '100%', marginTop: 0.018 * W, textAlign: 'center', fontFamily: typewriter(400), fontSize: 0.03 * W, color: ARCHIVE.ink, whiteSpace: 'pre' }}>{m.label}</div>}
          </div>
        );
      })}
      {children}
    </AbsoluteFill>
  );
};
