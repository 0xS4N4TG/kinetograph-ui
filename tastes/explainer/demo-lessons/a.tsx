// Lesson A: a vertical brand-lesson reel timed to a frame-by-frame spec of a reference (every frame
// read, positions measured; the spec is kept outside the repo). The edit is copied: beat lengths, every word's frame,
// the letter-hop writer, the blur-fade keywords, the exponential entrances, the corner stars, the circle wipe, the
// dissolve waves and the shadows. The content is ours: our own script in the same roles and lengths, Fred Ott (public
// domain) for the statues, and drawn stand-ins for the chess pair, the phone on its tripod, the app icons and the
// profile picture.
//
//   node ../kinetograph/packages/cli/dist/cli.js render tastes/explainer/demo-lessons/a.tsx --comp LessonA -o tastes/explainer/demo-lessons/out/a.mp4

import React from 'react';
import { AbsoluteFill, Composition, Img, Video, registerRoot, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Layer, Rect } from '@kinetographdev/core';
import { loadFont } from '@remotion/google-fonts/Poppins';
import { Barcode } from '../index.js';

const POP = loadFont('italic', { weights: ['500', '800'] }).fontFamily;
const RED = '#a24440';
const INK = '#111111';
const PAPER = '#fdfdfd';

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
/** An exponential ease-out: `from` at `t0`, then `r` of the remaining distance left each frame. */
const expo = (f: number, t0: number, from: number, to: number, r: number) => (f < t0 ? from : to + (from - to) * r ** (f - t0));

// ---- the letter-hop writer: one character at a time; each lands at 0.7 scale, 0.4 em up, -10 deg and settles in 3 frames

const HOP = [{ s: 0.7, y: 0.4, r: -10 }, { s: 0.8, y: 0.25, r: -6 }, { s: 0.9, y: 0.1, r: -3 }];

interface LeadProps {
  text: string;
  x: number; y: number;
  start: number; rate: number;
  color?: string; glow?: boolean;
  align?: 'left' | 'center';
  /** the dissolve wave: its start frame (a front moving right 0.046 W a frame) */
  wave?: number;
  size?: number;
}

const Lead: React.FC<LeadProps> = ({ text, x, y, start, rate, color = INK, glow, align = 'left', wave, size = 0.038 }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const px = W * size;
  let n = 0;
  const chars = [...text].map((c) => (c === ' ' ? { c, at: -1 } : { c, at: start + Math.floor(n++ / rate) }));
  return (
    <div style={{ position: 'absolute', left: align === 'left' ? x * W : 0, right: align === 'center' ? 0 : undefined, top: y * H - px * 0.62,
      display: 'flex', justifyContent: align === 'center' ? 'center' : 'flex-start', whiteSpace: 'pre', fontFamily: POP, fontStyle: 'italic', fontWeight: 500,
      fontSize: px, lineHeight: 1.2, letterSpacing: '-0.01em', color, textShadow: glow ? `0 0 ${px * 0.08}px rgba(255,255,255,0.7)` : undefined }}>
      {chars.map((ch, i) => {
        if (ch.c === ' ') return <span key={i}>{' '}</span>;
        const a = f - ch.at;
        if (a < 0) return <span key={i} style={{ opacity: 0 }}>{ch.c}</span>;
        const hop = HOP[a] ?? { s: 1, y: 0, r: 0 };
        // the dissolve: the letter goes as the wave front reaches it (about 0.55 em a letter)
        const gone = wave === undefined ? 0 : clamp01((f - wave - (i * px * 0.55) / (0.046 * W)) / 3);
        return (
          <span key={i} style={{ display: 'inline-block', transformOrigin: '50% 100%', transform: `translateY(${(-hop.y * px).toFixed(1)}px) scale(${hop.s}) rotate(${hop.r}deg)`,
            opacity: 1 - gone, filter: gone > 0 ? `blur(${(gone * px * 0.25).toFixed(1)}px)` : undefined }}>{ch.c}</span>
        );
      })}
    </div>
  );
};

// ---- the keyword: heavy italic red words, each fading up out of a 10 px (at 720) blur over 8 frames, or popping

interface RedLine { words: string[]; x: number; y: number; starts: number[] }
interface RedProps {
  lines: RedLine[];
  size: number;
  pop?: boolean;
  glow?: boolean;
  /** a uniform fade out over [from, to] */
  fade?: [number, number];
  /** the dissolve wave's start frame */
  wave?: number;
  /** extra x offset in W (an exit push) */
  dx?: number;
  color?: string;
}

const Red: React.FC<RedProps> = ({ lines, size, pop, glow, fade, wave, dx = 0, color = RED }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const px = W * size;
  const out = fade ? 1 - clamp01((f - fade[0]) / (fade[1] - fade[0])) : 1;
  return (
    <>
      {lines.map((ln, li) => {
        let chars = 0;
        return (
          <div key={li} style={{ position: 'absolute', left: (ln.x + dx) * W, top: ln.y * H - px * 0.55, display: 'flex', columnGap: px * 0.24, whiteSpace: 'pre',
            fontFamily: POP, fontStyle: 'italic', fontWeight: 800, fontSize: px, lineHeight: 1, letterSpacing: '-0.04em', color,
            textShadow: glow ? `0 0 ${px * 0.12}px rgba(162,68,64,0.6)` : undefined }}>
            {ln.words.map((w, wi) => {
              const t = f - ln.starts[wi]!;
              const k = pop ? (t >= 0 ? 1 : 0) : clamp01(t / 8);
              const x0 = ln.x + (chars * size * 0.56);
              chars += w.length + 1;
              const gone = wave === undefined ? 0 : clamp01((f - wave - ((x0 - 0.1) * W) / (0.046 * W)) / 3);
              const blur = pop ? 0 : (1 - k) * 10 * (W / 720) + gone * 8;
              return <span key={wi} style={{ opacity: k * out * (1 - gone), filter: blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : undefined }}>{w}</span>;
            })}
          </div>
        );
      })}
    </>
  );
};

// ---- corner stars: a four-point star with concave sides and long thin arms, a soft grey halo

const star = (L: number) => { const c = L * 0.1; return `M${L} 0 Q${c} ${c} 0 ${L} Q${-c} ${c} ${-L} 0 Q${-c} ${-c} 0 ${-L} Q${c} ${-c} ${L} 0 Z`; };

const Star: React.FC<{ cx: number; cy: number; L: number; color?: string; blur?: number; halo?: boolean }> = ({ cx, cy, L, color = '#000', blur = 0, halo = true }) => {
  const { width: W, height: H } = useVideoConfig();
  if (L <= 0.002) return null;
  const l = L * W;
  return (
    <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
      <g transform={`translate(${cx * W} ${cy * H})`}>
        {halo && <path d={star(l * 1.04)} fill="rgba(0,0,0,0.25)" style={{ filter: `blur(${(W * 0.02).toFixed(1)}px)` }} />}
        <path d={star(l)} fill={color} style={{ filter: blur > 0 ? `blur(${(blur * W).toFixed(1)}px)` : undefined }} />
      </g>
    </svg>
  );
};

/** A star's arm length growing over 6-7 frames (0.75 of the remaining length left a frame), then breathing. */
const grow = (f: number, t0: number, L: number, drift = 0, span = 100) => (f < t0 ? 0 : L * (1 - 0.75 ** (f - t0 + 1)) * (1 + drift * clamp01((f - t0 - 6) / span)));

// ---- objects ----

const SHADOW = (W: number, H: number, o = 0.35) => `drop-shadow(${(-0.02 * W).toFixed(1)}px ${(0.015 * H).toFixed(1)}px ${(0.03 * W).toFixed(1)}px rgba(0,0,0,${o}))`;

/** A Fred Ott cut-out as a bust: scaled so it runs off the bottom of the frame, its head's top at `headTop` (of H) and
 *  centred at `headX` (of W). `head` is where the head sits in the picture: its centre x and top y, fractions of it. */
const Cutout: React.FC<{ src: string; head: [number, number]; headTop: number; headX: number; tint?: boolean }> = ({ src, head, headTop, headX, tint }) => {
  const { width: W, height: H } = useVideoConfig();
  const ph = ((1.02 - headTop) * H) / (0.99 - head[1]);
  const pw = (ph * 1920) / 1080;
  return (
    <Img src={staticFile(src)} style={{ position: 'absolute', left: headX * W - head[0] * pw, top: headTop * H - head[1] * ph, width: pw, height: ph,
      filter: `${tint ? 'sepia(0.35) ' : ''}${SHADOW(W, H)}` }} />
  );
};

/** A black king with a white piece tipped against it. */
const ChessPair: React.FC = () => (
  <svg viewBox="0 0 100 135" width="100%" height="100%" style={{ overflow: 'visible' }}>
    <defs>
      <linearGradient id="bk" x1="0" x2="1"><stop offset="0" stopColor="#0d0d0d" /><stop offset="0.45" stopColor="#4a4a4a" /><stop offset="1" stopColor="#111" /></linearGradient>
      <linearGradient id="wq" x1="0" x2="1"><stop offset="0" stopColor="#bdbdb8" /><stop offset="0.5" stopColor="#fbfbf8" /><stop offset="1" stopColor="#c9c9c4" /></linearGradient>
    </defs>
    <g transform="translate(16 0) scale(2)">
      <path d="M12 0h4v4h4v3h-4v4h-4v-4h-4v-3h4z" fill="url(#bk)" />
      <path d="M6 13c0-2 3-3 8-3s8 1 8 3l-2 7h-12z" fill="url(#bk)" />
      <path d="M8 20h12l3 34h-18z" fill="url(#bk)" />
      <path d="M2 54h24l3 6h-30z" fill="#151515" /><path d="M-1 60h30v6h-30z" fill="url(#bk)" />
    </g>
    <g transform="translate(72 132) rotate(-60) scale(2.2)">
      <circle cx="0" cy="-44" r="4" fill="url(#wq)" />
      <path d="M-7 -40h14l-3 6h-8z" fill="url(#wq)" />
      <path d="M-5 -34h10l3 26h-16z" fill="url(#wq)" />
      <path d="M-10 -8h20l2 8h-24z" fill="url(#wq)" />
    </g>
  </svg>
);

/** A phone on a tripod head, landscape, cream bezel, one of our clips on its screen. */
const PhoneRig: React.FC<{ w: number }> = ({ w }) => {
  const h = w * 0.46;
  return (
    <div style={{ position: 'relative', width: w, height: w * 1.4 }}>
      {/* tripod: head, handle, leg running off the bottom */}
      <div style={{ position: 'absolute', left: w * 0.47, top: h * 0.9, width: w * 0.07, height: w * 1.2, background: 'linear-gradient(90deg,#0c0c0c,#3a3a3a,#0c0c0c)', borderRadius: w * 0.01 }} />
      <div style={{ position: 'absolute', left: w * 0.38, top: h * 0.86, width: w * 0.24, height: w * 0.09, background: 'linear-gradient(#2a2a2a,#0b0b0b)', borderRadius: w * 0.02 }} />
      <div style={{ position: 'absolute', left: w * 0.6, top: h * 1.1, width: w * 0.36, height: w * 0.035, background: '#151515', borderRadius: w * 0.02, transform: 'rotate(28deg)', transformOrigin: '0 50%' }} />
      {/* phone */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, borderRadius: h * 0.16, background: 'linear-gradient(160deg,#f4ead8,#d9cbb2)',
        boxShadow: `inset 0 0 0 ${w * 0.006}px #b9a988` }}>
        <div style={{ position: 'absolute', left: w * 0.12, top: h * 0.1, width: w * 0.5, height: h * 0.8, borderRadius: h * 0.06, overflow: 'hidden', background: '#000' }}>
          <Video src={staticFile('shops.mp4')} muted style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'sepia(0.5) saturate(1.6) hue-rotate(-12deg)' }} />
        </div>
        <div style={{ position: 'absolute', left: w * 0.67, top: h * 0.12, width: w * 0.28, height: h * 0.76, borderRadius: h * 0.08, background: 'linear-gradient(#efe4d0,#ddcdb1)', boxShadow: 'inset 0 0 6px rgba(0,0,0,0.15)' }}>
          {[[0.25, 0.28], [0.65, 0.28], [0.45, 0.68]].map(([x, y], i) => (
            <div key={i} style={{ position: 'absolute', left: `${x * 100 - 14}%`, top: `${y * 100 - 14}%`, width: '28%', aspectRatio: '1', borderRadius: '50%', background: 'radial-gradient(circle at 40% 35%, #555, #0a0a0a 60%)', boxShadow: '0 0 0 3px #cbbd9f' }} />
          ))}
        </div>
      </div>
    </div>
  );
};

/** A glossy app tile with a play glyph. */
const AppTile: React.FC<{ size: number; rot?: number; blur?: number }> = ({ size, rot = 0, blur = 0 }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.26, transform: `rotate(${rot}deg)`, background: 'linear-gradient(135deg,#ffb347,#ff4f7b 55%,#b33df0)',
    boxShadow: `inset 0 ${size * 0.06}px ${size * 0.08}px rgba(255,255,255,0.45), 0 ${size * 0.08}px ${size * 0.16}px rgba(0,0,0,0.3)`, filter: blur ? `blur(${blur}px)` : undefined,
    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ width: 0, height: 0, borderTop: `${size * 0.17}px solid transparent`, borderBottom: `${size * 0.17}px solid transparent`, borderLeft: `${size * 0.27}px solid #fff`, marginLeft: size * 0.06 }} />
  </div>
);

// ---- the reel ----

const LessonA: React.FC = () => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const black = (f >= 182 && f <= 226) || (f >= 351 && f <= 405);
  const sq = (t: number, t0: number, k: number) => (t < t0 ? 0 : -k * (t - t0) ** 2);
  const wipeR = f >= 344 ? Math.min(1.3, 0.01 + 0.115 * (f - 344)) * W : 0;

  return (
    <AbsoluteFill style={{ background: black ? '#000' : PAPER, overflow: 'hidden' }}>
      {/* B1 f0-70: the statue rises; the lead hops on; the keyword fades up behind the statue; all push left at three speeds */}
      {f <= 70 && (
        <>
          <Lead text="the one rule of good edits" x={0.196 + sq(f, 56, 0.005)} y={0.209} start={1} rate={1.15} />
          <Red size={0.215} dx={sq(f, 57, 0.0027)} lines={[
            { words: ['every'], x: 0.133, y: 0.237 + 0.05, starts: [37] },
            { words: ['frame'], x: 0.14, y: 0.332 + 0.05, starts: [40] },
            { words: ['counts'], x: 0.14, y: 0.427 + 0.05, starts: [43] },
          ]} />
          {f >= 2 && <Cutout src="fred-a.png" head={[0.436, 0.139]} headX={0.6 + sq(f, 60, 0.01)} headTop={expo(f, 2, 0.995, 0.352, 0.88)} />}
        </>
      )}

      {/* B2 f71-181: barcode pops, the chess pair slides in from the right, the corner stars grow, three red lines fade up */}
      {f >= 71 && f <= 181 && (
        <>
          <div style={{ position: 'absolute', left: 0.33 * W, top: 0.871 * H }}><Barcode seed="clone-a" width={0.345 * W} height={0.047 * H} color="#111" /></div>
          <Lead text="A timeline without any rhythm" x={0.113} y={0.285} start={72} rate={0.9} wave={172} />
          <Red size={0.127} fade={[174, 181]} lines={[
            { words: ['feels'], x: 0.22, y: 0.3 + 0.03, starts: [136] },
            { words: ['long', 'and'], x: 0.14, y: 0.37 + 0.03, starts: [143, 143] },
            { words: ['flat'], x: 0.22, y: 0.44 + 0.03, starts: [151] },
          ]} />
          {f >= 73 && (
            <>
              <div style={{ position: 'absolute', left: 0.1 * W, right: 0.1 * W, top: 0.735 * H, height: 0.035 * H, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(0,0,0,0.45), rgba(0,0,0,0))',
                transform: `translateX(${((expo(f, 73, 0.89, 0.279, 0.82) - 0.279) * W).toFixed(1)}px)` }} />
              <div style={{ position: 'absolute', left: expo(f, 73, 0.89, 0.279, 0.82) * W, top: 0.437 * H, width: 0.44 * W, height: 0.333 * H, filter: SHADOW(W, H, 0.3) }}><ChessPair /></div>
            </>
          )}
          <Star cx={1.0} cy={0.115} L={grow(f, 80, 0.42, -0.05, 95)} />
          <Star cx={f < 82 ? 0.5 - 0.48 * clamp01((f - 78) / 4) : 0.02} cy={f < 82 ? 1.05 - 0.08 * clamp01((f - 78) / 4) : 0.97} L={grow(f, 78, 0.42, -0.15, 93)} />
        </>
      )}

      {/* B3 f182-226: black, blurred red corner stars, a white line and red words, a dissolve wave */}
      {f >= 182 && f <= 226 && (
        <>
          <Star cx={0} cy={0.015} L={0.55} color="#843c38" blur={0.03} halo={false} />
          <Star cx={1} cy={0.985} L={0.55} color="#843c38" blur={0.03} halo={false} />
          <Lead text="and flat is" x={0.404} y={0.465} start={183} rate={1.2} color="#ffffff" glow wave={217} />
          <Red size={0.052} glow wave={217} lines={[{ words: ['where', 'viewers', 'leave'], x: 0.28, y: 0.495, starts: [200, 203, 206] }]} />
        </>
      )}

      {/* B4 f227-351: the phone slides in from the right, the lead writes two lines, red words pop, the tail fades in */}
      {f >= 227 && f <= 351 && (
        <>
          <Lead text="Each shot on screen" x={0.49} y={0.235} start={229} rate={0.8} align="center" wave={338} />
          <Lead text="must" x={0.49} y={0.258} start={261} rate={0.8} align="center" wave={340} />
          <Red size={0.145} pop lines={[
            { words: ['earn'], x: 0.175, y: 0.306, starts: [267] },
            { words: ['its', 'own'], x: 0.235, y: 0.37, starts: [280, 280] },
            { words: ['seconds'], x: 0.133, y: 0.435, starts: [291] },
          ]} />
          {f >= 229 && (
            <div style={{ position: 'absolute', left: expo(f, 229, 0.896, 0.129, 0.89) * W, top: (0.477 + 0.009 * 0.7 ** (f - 229)) * H, filter: SHADOW(W, H, 0.4) }}>
              <PhoneRig w={0.77 * W} />
            </div>
          )}
          {[['or', 302], ['give', 304], ['them', 307], ['back', 311], ['to', 313], ['the', 315], ['story', 318]].length && (
            <div style={{ position: 'absolute', left: 0.18 * W, top: 0.72 * H, width: 0.4 * W, fontFamily: POP, fontStyle: 'italic', fontWeight: 500, fontSize: 0.03 * W, lineHeight: 1.15 }}>
              {[['or give them', [302, 304, 307]], ['back to the', [311, 313, 315]], ['story', [318]]].map(([line, at], li) => (
                <div key={li}>{(line as string).split(' ').map((w, wi) => {
                  const k = clamp01((f - (at as number[])[wi]!) / 7);
                  const g = Math.round(200 - 183 * k);
                  return <span key={wi} style={{ color: `rgb(${g},${g},${g})`, opacity: k > 0 ? 1 : 0 }}>{w}{' '}</span>;
                })}</div>
              ))}
            </div>
          )}
          <Star cx={1.0} cy={0.045} L={grow(f, 236, 0.34, 0.05, 100)} />
        </>
      )}

      {/* the circle wipe f344-351, B5 inside it: black, darker red stars, white line, red words, a dissolve */}
      {f >= 344 && f <= 405 && (
        <Layer id="wipe" clip={f <= 351 ? { kind: 'ellipse', cx: 0.49 * W, cy: 0.48 * H, rx: wipeR, ry: wipeR } : undefined}>
          <Rect id="wipe-black" width={W} height={H} fill="#000000" />
          {f >= 349 && (
            <AbsoluteFill>
              <Star cx={0} cy={0.015} L={0.5} color="#7a2c2a" blur={0.03} halo={false} />
              <Star cx={1} cy={0.985} L={0.62} color="#7a2c2a" blur={0.03} halo={false} />
              <Lead text="or hand the moment" x={0.31} y={0.47} start={349} rate={1.5} color="#ffffff" glow wave={394} />
              <Red size={0.052} glow fade={[392, 395]} lines={[{ words: ['to', 'the', 'next'], x: 0.375, y: 0.501, starts: [377, 381, 383] }]} />
            </AbsoluteFill>
          )}
        </Layer>
      )}

      {/* B6 f406-488: the statue and app tiles rise from the bottom, a star grows, the red lines fade up behind the statue */}
      {f >= 406 && f <= 488 && (
        <>
          <Lead text="Cutting on autopilot does" x={0.21} y={0.265} start={407} rate={1} />
          <Red size={0.087} lines={[
            { words: ['neither', 'of'], x: 0.104, y: 0.317, starts: [439, 443] },
            { words: ['those'], x: 0.104, y: 0.365, starts: [447] },
            { words: ['well'], x: 0.104, y: 0.42, starts: [452] },
          ]} />
          {f >= 408 && (
            <>
              <Cutout src="fred-b.png" head={[0.412, 0.167]} headX={0.42} headTop={expo(f, 409, 0.99, 0.465, 0.9)} tint />
              <div style={{ position: 'absolute', left: 0.19 * W, top: (expo(f, 408, 0.995, 0.52, 0.9) - 0.02) * H }}><AppTile size={0.08 * W} rot={-15} /></div>
              <div style={{ position: 'absolute', left: 0.88 * W, top: expo(f, 410, 1.05, 0.8, 0.88) * H }}><AppTile size={0.12 * W} rot={12} blur={0.006 * W} /></div>
            </>
          )}
          {f >= 413 && <div style={{ position: 'absolute', left: -0.02 * W, top: expo(f, 413, 1.1, 0.83, 0.78) * H }}><AppTile size={0.22 * W} rot={-10} blur={0.02 * W} /></div>}
          <Star cx={0.98} cy={0.13} L={grow(f, 415, 0.2, -0.08, 68)} />
        </>
      )}

      {/* B7 f489-524: the profile circle pops, the call to action writes on */}
      {f >= 489 && (
        <>
          <div style={{ position: 'absolute', left: (0.5 - 0.1375) * W, top: 0.42 * H - 0.1375 * W, width: 0.275 * W, height: 0.275 * W, borderRadius: '50%', overflow: 'hidden',
            background: 'linear-gradient(135deg,#d43cff,#5b2bd6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', left: '-20%', top: '45%', width: '140%', height: '6%', background: 'rgba(255,255,255,0.85)', transform: 'rotate(-35deg)', filter: 'blur(2px)' }} />
            <span style={{ fontFamily: POP, fontWeight: 800, fontStyle: 'italic', fontSize: 0.12 * W, color: '#fff' }}>K</span>
          </div>
          <Lead text="Follow for more editing notes" x={0.22} y={0.527} start={490} rate={2.5} />
        </>
      )}
    </AbsoluteFill>
  );
};

registerRoot(() => <Composition id="LessonA" component={LessonA} durationInFrames={525} fps={30} width={1080} height={1920} />);
