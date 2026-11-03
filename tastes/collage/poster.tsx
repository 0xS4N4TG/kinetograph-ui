// The poster: a black-and-white portrait cut-out with a street map screened over its body, on beige paper with a
// stain, giant condensed numerals behind the head, red stripes, a printed strip, a black tag with a number, a torn scrap,
// a slammed ink stamp, red X-ended route marks drawn on stroke by stroke, squares and typed year ticks. It racks into
// focus while the camera settles with an undershoot, then pushes slowly.
// Measured off a reference reel f120-f178. Frame
// numbers below are frames since the shot started (reference f120 = 0); images are on twos with one 4-frame hold (8-11).
import React from 'react';
import { Layer } from '@kinetographdev/core';
import { AbsoluteFill, staticFile, useVideoConfig } from 'remotion';
import { family } from '../explainer/type.js';
import { tab } from './time.js';
import { tornPoints } from './pieces.js';

const FRINGE = 'drop-shadow(-1.5px 0 0 rgba(200,60,50,0.45)) drop-shadow(1.5px 0 0 rgba(50,90,190,0.45))';

/** the poster's own clock: twos, the image at 8 held to 11 */
const posterFrame = (t: number) => (t < 8 ? Math.floor(t / 2) * 2 : t < 12 ? 8 : 12 + Math.floor((t - 12) / 2) * 2);

/** an X-ended mark drawn on in the reference's four steps (tick, tick + stub, line + far X, complete), one per image */
const Mark: React.FC<{ a: [number, number]; b: [number, number]; at: number; t: number; dotted?: boolean; color?: string }> = ({ a, b, at, t, dotted, color = '#c7755f' }) => {
  const step = Math.floor((t - at) / 2);
  if (step < 0) return null;
  const x = 19;
  const X = ([cx, cy]: [number, number], both: boolean) => (
    <g>
      <line x1={cx - x} y1={cy - x} x2={cx + x} y2={cy + x} />
      {both && <line x1={cx - x} y1={cy + x} x2={cx + x} y2={cy - x} />}
    </g>
  );
  const frac = step >= 2 ? 1 : step === 1 ? 0.15 : 0;
  const e: [number, number] = [a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac];
  return (
    <g stroke={color} strokeWidth={3} fill="none" strokeLinecap="square">
      {X(a, step >= 1)}
      {frac > 0 && <line x1={a[0]} y1={a[1]} x2={e[0]} y2={e[1]} strokeDasharray={dotted ? '6 8' : undefined} />}
      {step >= 2 && X(b, step >= 3)}
    </g>
  );
};

/** a square outline drawn on: corner tick, L, outline, then an optional X stroke by stroke */
const Square: React.FC<{ x: number; y: number; s: number; at: number; t: number; cross?: boolean }> = ({ x, y, s, at, t, cross }) => {
  const step = Math.floor((t - at) / 2);
  if (step < 0) return null;
  const d = step === 0 ? `M${x},${y + 14} V${y} H${x + 14}` : step === 1 ? `M${x},${y + s} V${y} H${x + s}` : `M${x},${y} H${x + s} V${y + s} H${x} Z`;
  return (
    <g stroke="#4a3f42" strokeWidth={3} fill="none">
      <path d={d} />
      {cross && step >= 4 && <line x1={x} y1={y} x2={x + s} y2={y + s} />}
      {cross && step >= 5 && <line x1={x + s} y1={y} x2={x} y2={y + s} />}
    </g>
  );
};

export interface PosterProps {
  /** unique among shots on screen at once */
  id?: string;
  t: number;
  /** the portrait cut-out (alpha PNG) and its aspect (w / h) */
  portrait: { src: string; aspect: number; filter?: string };
  /** a map screened white over the body below `collar` (fraction of the portrait's height) */
  map?: { src: string; collar?: number };
  /** the giant numerals behind the head (two or three characters) */
  numerals: string;
  /** the white number on the black tag, and a small red note beside it */
  tag?: { text: string; note?: string };
  /** an oval ink stamp: up to three short lines */
  stamp?: string[];
  /** typed tick labels at the lower right (five, like years) */
  ticks?: string[];
  /** the label typed on the vertical black strip */
  strip?: string;
  base?: string;
}

export const Poster: React.FC<PosterProps> = ({ id = 'poster', t: raw, portrait, map, numerals, tag, stamp = [], ticks = [], strip = '', base = 'collage-textures' }) => {
  const { width: W, height: H } = useVideoConfig();
  const t = posterFrame(raw);
  // camera and focus (scale about the centre, blur sigma), from B.3
  const cam = t <= 16 ? tab([[0, 1.01], [2, 1.066], [4, 1.036], [6, 1.013], [8, 0.995], [12, 0.985], [14, 0.98], [16, 0.975]], t) : t <= 22 ? 0.975 : Math.min(1.02, 0.978 + (t - 22) * 0.00055);
  const blur = tab([[0, 9.2], [2, 7.3], [4, 4.7], [6, 2.7], [8, 0]], t);
  const dy = tab([[2, -39], [4, -20], [6, -11], [8, -4], [12, 3.5], [16, 16], [28, 16], [56, 0]], t);
  const cond = family('League Gothic', 400, false), black = family('Archivo Black', 400, false), mono = family('Courier Prime', 400, false);
  // portrait box: head top 0.151 H, silhouette 0.06-0.935 W wide at rest
  const ph = 0.69 * H, pw = ph * portrait.aspect;
  const pl = 0.5 * W - pw / 2 + 0.0 * W, pt = 0.151 * H;
  const collar = map?.collar ?? 0.42;
  const skullX = tab([[2, -192], [4, -119], [6, -74], [8, -52], [12, -32], [14, -20], [16, -12], [18, -6], [20, 0]], t);
  const stampS = t < 18 ? 0 : tab([[18, 1.15], [20, 1.07], [22, 1]], t);
  const news = Math.max(0, Math.min(1, (t - 6) / 12));
  const fpW = t < 12 ? 0 : tab([[12, 83], [14, 153], [16, 172], [18, 180]], t);
  const stripPattern = (id: string) => (
    <pattern id={id} width="74" height="83" patternUnits="userSpaceOnUse">
      <rect width="74" height="83" fill="#41241e" />
      <circle cx="37" cy="34" r="17" fill="#d76752" /><rect x="27" y="46" width="20" height="14" fill="#d76752" />
      <circle cx="30" cy="33" r="4.5" fill="#41241e" /><circle cx="44" cy="33" r="4.5" fill="#41241e" />
    </pattern>
  );
  return (
    <AbsoluteFill style={{ background: '#d2bba7' }}>
      <AbsoluteFill style={{ transform: `translateY(${dy}px) scale(${cam.toFixed(4)})`, transformOrigin: '50% 50%', filter: blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : undefined }}>
        {/* paper: stain top-left, a lighter panel under the numerals */}
        <div style={{ position: 'absolute', left: -60, top: -60, width: 0.62 * W, height: 0.24 * H, background: 'radial-gradient(ellipse at 20% 25%, rgba(110,80,55,0.55), rgba(110,80,55,0) 70%)' }} />
        <div style={{ position: 'absolute', left: 0.31 * W, top: 0, width: 0.15 * W, height: 0.2 * H, background: 'rgba(240,225,210,0.25)' }} />
        {/* numerals */}
        <div style={{ position: 'absolute', right: 0.094 * W, top: 0.065 * H - 0.02 * H, fontFamily: cond, fontSize: (0.384 * H) / 0.86, lineHeight: 1, color: '#f3e8e0', letterSpacing: '0.02em', filter: FRINGE }}>{numerals}</div>
        {/* stripes */}
        <svg width={0.16 * W} height={0.155 * H} style={{ position: 'absolute', left: 0.179 * W, top: 0.295 * H }}>
          <defs><pattern id={`${id}-stripes`} width="70" height="70" patternUnits="userSpaceOnUse" patternTransform="rotate(-34)"><rect width="70" height="70" fill="#f8e6dc" /><rect width="38" height="70" fill="#e5584a" /></pattern></defs>
          <polygon points={tornPoints(0.16 * W, 0.155 * H, 3, 'stripes', 12)} fill={`url(#${id}-stripes)`} />
        </svg>
        {/* news column */}
        {news > 0 && [[650, 760, 140, 190], [800, 1010, 190, 240]].map(([x, y, w, h], i) => (
          <svg key={i} width={w} height={h * news} style={{ position: 'absolute', left: x, top: y, overflow: 'hidden' }}>
            {Array.from({ length: Math.floor(h! / 11) }, (_, j) => <rect key={j} x={0} y={j * 11 + 2} width={w! * (0.7 + ((j * 37) % 30) / 100)} height={5} fill="#5a4a44" opacity={0.75} />)}
          </svg>
        ))}
        {/* scribble mountain line, drawn left to right */}
        {t >= 6 && (
          <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
            <polyline points="380,280 440,170 490,250 545,160 600,260 650,150 700,240" fill="none" stroke="#2a2220" strokeWidth={3}
              strokeDasharray="900" strokeDashoffset={tab([[6, 720], [8, 520], [12, 0]], t)} />
          </svg>
        )}
        {/* middle pattern strip, under the portrait */}
        <svg width={370} height={167} style={{ position: 'absolute', left: 40, top: 0.555 * H }}><defs>{stripPattern(`${id}-sa`)}</defs><rect width={370} height={167} fill={`url(#${id}-sa)`} /></svg>
        {/* the portrait, with the map screened over the body */}
        <div style={{ position: 'absolute', left: pl, top: pt, width: pw, height: ph, filter: FRINGE }}>
          <img src={portrait.src} style={{ position: 'absolute', inset: 0, width: pw, height: ph, filter: portrait.filter ?? 'grayscale(1) contrast(1.35) brightness(0.9) sepia(0.15)' }} />
        </div>
        {map && (
          <>
            <Layer id={`${id}-map`} blendMode="screen" matte={{ layer: `${id}-mapm`, mode: 'luminance' }}>
              <AbsoluteFill>
                <img src={map.src} style={{ position: 'absolute', left: pl, top: pt, width: pw, height: ph, objectFit: 'cover', filter: 'grayscale(1) invert(1) contrast(2.4) brightness(0.75)' }} />
              </AbsoluteFill>
            </Layer>
            <Layer id={`${id}-mapm`}>
              <AbsoluteFill style={{ background: '#000' }}>
                <img src={portrait.src} style={{ position: 'absolute', left: pl, top: pt, width: pw, height: ph, filter: 'brightness(0) invert(1)' }} />
                <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: pt + ph * collar, background: 'linear-gradient(#000 92%, rgba(0,0,0,0))' }} />
              </AbsoluteFill>
            </Layer>
          </>
        )}
        {/* tag, red tab, vertical strip, scrap */}
        {tag && (
          <div style={{ position: 'absolute', left: 0.184 * W, top: 0.658 * H, width: 0.177 * W, height: 0.11 * H, background: '#412e29', clipPath: 'polygon(0 0,100% 0,100% 86%,87% 100%,0 100%)' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: '28%', textAlign: 'center', fontFamily: black, fontSize: Math.min(0.057 * H, (0.15 * W) / (tag.text.length * 0.78)), lineHeight: 1, color: '#ebe0d3', transform: 'rotate(-4deg)' }}>{tag.text}</div>
          </div>
        )}
        {tag?.note && <div style={{ position: 'absolute', left: 0.362 * W, top: 0.698 * H, fontFamily: black, fontSize: 24, color: '#c2514a' }}>{tag.note}</div>}
        <div style={{ position: 'absolute', left: 0.347 * W, top: 0.642 * H, width: 0.13 * W, height: 0.087 * H, background: 'radial-gradient(circle at 54% 0%, #d2bba7 57px, #df785f 58px)' }} />
        <div style={{ position: 'absolute', left: 0.472 * W, top: 0.664 * H, width: 0.048 * W, height: 0.165 * H, background: '#2d2028' }}>
          <div style={{ position: 'absolute', left: 12, top: 10, writingMode: 'vertical-rl', fontFamily: cond, fontSize: 30, letterSpacing: '0.3em', color: '#dbd2d1' }}>{strip}</div>
        </div>
        <svg width={320} height={430} style={{ position: 'absolute', left: 0.48 * W, top: 0.693 * H }}>
          <polygon points={tornPoints(304, 417, 6, 'scrap', 14)} fill="#ebccac" />
          {Array.from({ length: 22 }, (_, j) => <rect key={j} x={30} y={60 + j * 14} width={220 - ((j * 53) % 60)} height={4} fill="#8a7466" opacity={0.35} />)}
        </svg>
        {/* bottom-left pattern strip, slides in from the left */}
        <svg width={360} height={170} style={{ position: 'absolute', left: -30 + skullX, top: 0.872 * H, transform: 'rotate(-5.6deg)' }}><defs>{stripPattern(`${id}-sb`)}</defs><rect width={360} height={166} fill={`url(#${id}-sb)`} /></svg>
        {/* fingerprint block, wiped on from the left, and its end square */}
        {fpW > 0 && <div style={{ position: 'absolute', left: 790, top: 930, width: fpW, height: 70, background: 'repeating-radial-gradient(circle at 30% 120%, #3a2f2f 0 2px, #6b5a55 2px 4px)' }} />}
        {/* stamp */}
        {stampS > 0 && (
          <svg width={320} height={220} style={{ position: 'absolute', left: 0.694 * W - 15, top: 0.143 * H - 15, transform: `scale(${stampS}) rotate(-2deg)`, opacity: 0.88, mixBlendMode: 'multiply' }}>
            <ellipse cx={160} cy={110} rx={142} ry={92} fill="none" stroke="#845354" strokeWidth={6} />
            <ellipse cx={160} cy={110} rx={126} ry={78} fill="none" stroke="#845354" strokeWidth={2} />
            {stamp.map((l, i) => <text key={i} x={160} y={88 + i * 34} textAnchor="middle" fontFamily={mono} fontWeight={700} fontSize={i === 0 ? 30 : 24} fill="#845354" letterSpacing={2}>{l}</text>)}
          </svg>
        )}
        {/* marks, squares, ticks: topmost */}
        <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, filter: FRINGE }}>
          <Mark a={[290, 420]} b={[290, 240]} at={20} t={t} />
          <Mark a={[775, 645]} b={[985, 645]} at={22} t={t} />
          <Mark a={[985, 640]} b={[880, 880]} at={28} t={t} />
          <Mark a={[880, 880]} b={[880, 1055]} at={32} t={t} dotted />
          <Mark a={[55, 800]} b={[185, 800]} at={24} t={t} />
          <Mark a={[740, 1680]} b={[740, 1525]} at={34} t={t} />
          <Square x={970} y={930} s={60} at={24} t={t} cross />
          <Square x={90} y={1530} s={65} at={30} t={t} />
          <Square x={380} y={1505} s={65} at={34} t={t} cross />
          {ticks.slice(0, 5).map((y, i) => {
            const at = 24 + i * 4;
            if (t < at) return null;
            const n = Math.max(0, Math.floor((t - at) / 2));
            return (
              <g key={i}>
                <line x1={855 + i * 42} y1={1660} x2={855 + i * 42} y2={1672} stroke="#2a2430" strokeWidth={2} />
                <text x={0} y={0} transform={`translate(${849 + i * 42}, 1680) rotate(90)`} fontFamily={mono} fontSize={20} fill="#2a2430">{y.slice(0, n)}</text>
              </g>
            );
          })}
        </svg>
      </AbsoluteFill>
      {/* the poster's static 8 px dot screen */}
      <AbsoluteFill style={{ background: 'radial-gradient(circle, rgba(60,40,25,0.32) 1.3px, transparent 1.9px) 0 0 / 8px 8px', mixBlendMode: 'multiply' }} />
      <img src={staticFile(`${base}/lattice.png`)} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, mixBlendMode: 'overlay', opacity: 0.35 }} />
    </AbsoluteFill>
  );
};
