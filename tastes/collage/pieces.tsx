// The collage taste's pieces. Positions are fractions of the frame unless a prop says px. Textures live in
// tastes/collage/textures, linked into an effect's public folder as `collage-textures` (prop `base`).
import React from 'react';
import { Layer, blur, displace, gradientMap, halftone } from '@kinetographdev/core';
import { AbsoluteFill, random, staticFile, useVideoConfig } from 'remotion';
import { family } from '../explainer/type.js';
import { CutOut, TEXTURES } from '../../plugins/paper/src/index.js';
import { COLLAGE, FONTS, SEPIA } from './tokens.js';
import type { Box4 } from './time.js';

const tex = (base: string, name: string) => staticFile(`${base}/${name}`);

/** A seeded torn-edged polygon round a w x h box (for small translucent pieces; paper uses the plugin's CutOut). */
export const tornPoints = (w: number, h: number, amp: number, seed: string, step = 14) => {
  const pts: string[] = [];
  const j = (k: string) => (random(`${seed}${k}`) - 0.5) * 2 * amp;
  for (let x = 0; x <= w; x += step) pts.push(`${x + j(`tx${x}`) * 0.4},${j(`ty${x}`)}`);
  for (let y = 0; y <= h; y += step) pts.push(`${w + j(`ry${y}`)},${y + j(`rx${y}`) * 0.4}`);
  for (let x = w; x >= 0; x -= step) pts.push(`${x + j(`bx${x}`) * 0.4},${h + j(`by${x}`)}`);
  for (let y = h; y >= 0; y -= step) pts.push(`${j(`ly${y}`)},${y + j(`lx${y}`) * 0.4}`);
  return pts.join(' ');
};

/** A depth plane: everything inside scales about the screen centre by `s`, blurred by `b` (Gaussian sigma, px),
 *  shifted by (dx, dy) fractions after the scale. The taste's only camera. */
export const Depth: React.FC<{ s: number; b?: number; dx?: number; dy?: number; opacity?: number; children: React.ReactNode }> = ({ s, b = 0, dx = 0, dy = 0, opacity = 1, children }) => {
  const { width: W, height: H } = useVideoConfig();
  return (
    <AbsoluteFill style={{ transform: `translate(${(dx * W).toFixed(1)}px, ${(dy * H).toFixed(1)}px) scale(${s.toFixed(4)})`, transformOrigin: '50% 50%', filter: b > 0.3 ? `blur(${b.toFixed(1)}px)` : undefined, opacity }}>
      {children}
    </AbsoluteFill>
  );
};

export interface PageCopy {
  masthead: string;
  /** the dateline row: left, middle, right */
  dateline: [string, string, string];
  /** two big headline lines */
  headlines: [string, string];
  /** a small column head, set over a cleared patch at the upper left */
  subhead?: string;
  /** more heads set over cleared patches of the scan, to cover its own legible headlines: box in scan px
   *  (x, y, w, h; the scan is 1674 px wide), lines in the condensed gothic, centred, sized to fit the box */
  heads?: { box: [number, number, number, number]; lines: string[] }[];
}

/**
 * The page as printed, at its scale-1 size (1.55 W wide, the masthead clipped at the top). A real old front page
 * (`scan`, public domain) is the sheet; its top band is cleared under our own masthead, dateline and headlines, inked
 * (roughened and spread a little); a press `photo` is screened into it; one sepia grade then goes over the whole sheet
 * so scan and ink read as the same paper; creases and newsprint grain on top. Put it inside a Depth.
 */
export const PrintedPage: React.FC<{ copy: PageCopy; photo?: string; scan?: string; base?: string; id?: string }> = ({ copy, photo, scan, base = 'collage-textures', id = 'page' }) => {
  const { width: W } = useVideoConfig();
  const k = W / 1080;
  const left = -297 * k, pw = 1674 * k, ph = 2219 * k, top = -60 * k;
  const mast = family(FONTS.blackletter, 400, false);
  const gothic = family(FONTS.gothic, 400, false);
  const body = family(FONTS.body, 400, false);
  return (
    <AbsoluteFill>
      <Layer id={id} effects={[gradientMap({ stops: SEPIA })]}>
        <AbsoluteFill>
          <img src={scan ?? tex(base, 'page-scan.jpg')} style={{ position: 'absolute', left, top, width: pw, height: ph }} />
          <img src={tex(base, 'page-patch.png')} style={{ position: 'absolute', left, top, width: pw, height: 425 * k }} />
          {copy.subhead && <img src={tex(base, 'page-patch.png')} style={{ position: 'absolute', left: 140 * k, top: 362 * k, width: 250 * k, height: 110 * k, objectFit: 'cover' }} />}
          {copy.heads?.map((hd, i) => <img key={i} src={tex(base, 'page-patch.png')} style={{ position: 'absolute', left: left + hd.box[0] * k, top: top + hd.box[1] * k, width: hd.box[2] * k, height: hd.box[3] * k, objectFit: 'cover', objectPosition: `${(i * 37) % 100}% ${(i * 53) % 100}%` }} />)}
          {photo && (
            <Layer id={`${id}-photo`} effects={[halftone({ size: 6 * k, angle: 45 })]}>
              <AbsoluteFill>
                <img src={photo} style={{ position: 'absolute', left: 594 * k, top: 372 * k, width: 640 * k, height: 330 * k, objectFit: 'cover', filter: 'grayscale(1) contrast(1.15)' }} />
              </AbsoluteFill>
            </Layer>
          )}
          <Layer id={`${id}-ink`} blendMode="multiply" opacity={0.93}
            effects={[displace({ scale: 2.4 * k, turbulence: { type: 'fractalNoise', baseFrequency: 0.42 / k, numOctaves: 2, seed: 4 } }), blur(0.6 * k)]}>
            <AbsoluteFill>
              <div style={{ position: 'absolute', left, top: -66 * k, width: pw, textAlign: 'center', fontFamily: mast, fontSize: 176 * k, color: '#111', lineHeight: 1 }}>{copy.masthead}</div>
              <div style={{ position: 'absolute', left: left + 30 * k, top: 108 * k, width: pw - 60 * k, height: 3 * k, background: '#111' }} />
              <div style={{ position: 'absolute', left: left + 30 * k, top: 114 * k, width: pw - 60 * k, height: 1 * k, background: '#111' }} />
              <div style={{ position: 'absolute', left: left + 40 * k, top: 119 * k, width: pw - 80 * k, display: 'flex', justifyContent: 'space-between', fontFamily: body, fontSize: 17 * k, color: '#111' }}>
                {copy.dateline.map((d, i) => <span key={i}>{d}</span>)}
              </div>
              <div style={{ position: 'absolute', left: left + 30 * k, top: 142 * k, width: pw - 60 * k, height: 2 * k, background: '#111' }} />
              {copy.headlines.map((t, i) => (
                <div key={i} style={{ position: 'absolute', left: left + 20 * k, top: (150 + i * 100) * k, width: pw - 40 * k, textAlign: 'center', whiteSpace: 'nowrap', fontFamily: gothic, fontSize: 112 * k, letterSpacing: '0.02em', color: '#111', lineHeight: 0.92 }}>{t}</div>
              ))}
              <div style={{ position: 'absolute', left: left + 30 * k, top: 352 * k, width: pw - 60 * k, height: 2 * k, background: '#111' }} />
              {copy.subhead && <div style={{ position: 'absolute', left: 150 * k, top: 372 * k, width: 230 * k, textAlign: 'center', fontFamily: gothic, fontSize: 40 * k, lineHeight: 0.95, color: '#111' }}>{copy.subhead}</div>}
              {copy.heads?.map((hd, i) => {
                const [x, y, w, h] = hd.box;
                const size = Math.min((h * 0.86) / hd.lines.length / 0.95, (w * 0.94) / Math.max(...hd.lines.map((l) => l.length * 0.36)));
                return (
                  <div key={i} style={{ position: 'absolute', left: left + x * k, top: top + y * k, width: w * k, height: h * k, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', fontFamily: gothic, fontSize: size * k, lineHeight: 0.95, color: '#111' }}>
                    {hd.lines.map((l, j) => <div key={j} style={{ whiteSpace: 'nowrap' }}>{l}</div>)}
                  </div>
                );
              })}
            </AbsoluteFill>
          </Layer>
        </AbsoluteFill>
      </Layer>
      <div style={{ position: 'absolute', left: -230 * k, top: -200 * k, width: 900 * k, height: 700 * k, background: 'radial-gradient(closest-side, rgba(140,95,55,0.45), rgba(140,95,55,0))', mixBlendMode: 'multiply' }} />
      <img src={TEXTURES.creaseLight} style={{ position: 'absolute', left, top, width: pw, height: ph, mixBlendMode: 'multiply', opacity: 0.85 }} />
      <img src={TEXTURES.newsprint} style={{ position: 'absolute', left, top, width: pw, height: ph, mixBlendMode: 'multiply', opacity: 0.4 }} />
    </AbsoluteFill>
  );
};

/**
 * The opening punch: an old map on white, a torn hole showing the page under it, a red ring, a cloud-feathered edge;
 * it zooms past the lens about (0.5, 0.43) with a zoom blur that decays over three images. `t` is the held frame.
 */
export const MapPunch: React.FC<{ t: number; src: string; hole?: string; ring?: [number, number]; id?: string }> = ({ t, src, id: pre = 'map', hole = 'M 375,780 L 430,768 L 520,772 L 600,760 L 668,774 L 655,800 L 610,812 L 520,808 L 440,815 L 385,806 Z', ring = [0.57, 0.418] }) => {
  const { width: W, height: H } = useVideoConfig();
  if (t >= 8) return null;
  const at = (keys: [number, number][]) => { let v = keys[0]![1]; for (let i = 1; i < keys.length; i++) { const [f0, v0] = keys[i - 1]!, [f1, v1] = keys[i]!; if (t >= f0 && t <= f1) v = v0 + ((v1 - v0) * (t - f0)) / (f1 - f0); else if (t > f1) v = v1; } return v; };
  const s = at([[0, 1], [2, 2.8], [4, 7], [6, 12]]);
  const o = at([[0, 1], [2, 1], [4, 0.7], [6, 0.4]]);
  const streak = at([[0, 0], [2, 0.25], [4, 0.08], [6, 0]]);
  const copies = streak > 0 ? 5 : 1;
  const page = COLLAGE.page;
  return (
    <>
      {Array.from({ length: copies }, (_, k) => {
        const sk = s * (1 + streak * (k / Math.max(1, copies - 1)));
        const id = `${pre}${k}`;
        return (
          <AbsoluteFill key={k} style={{ transform: `scale(${sk.toFixed(4)})`, transformOrigin: '50% 43%', opacity: o / (k === 0 ? 1 : copies * 0.7) }}>
            <Layer id={id} matte={{ layer: `${id}-m`, mode: 'alpha' }}>
              <AbsoluteFill style={{ background: page }}>
                <img src={src} style={{ position: 'absolute', left: -40, top: 0.2 * H, width: W + 80, height: 0.62 * H, objectFit: 'cover', objectPosition: '50% 40%', filter: 'grayscale(0.55) sepia(0.7) contrast(1.05) brightness(0.98)' }} />
                {Array.from({ length: 22 }, (_, c) => {
                  const top = c % 2 === 0;
                  const x = (c / 22) * W + (random(`cx${c}`) - 0.5) * 60;
                  const y = (top ? 0.2 : 0.82) * H + (random(`cy${c}`) - (top ? 0.3 : 0.7)) * 150;
                  const r = 70 + random(`cr${c}`) * 90;
                  return <div key={c} style={{ position: 'absolute', left: x - r, top: y - r, width: 2 * r, height: 2 * r, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(250,247,250,0.95), rgba(250,247,250,0))' }} />;
                })}
                <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: 0.2 * H - 30, background: page }} />
                <div style={{ position: 'absolute', left: 0, top: 0.82 * H + 30, width: W, height: 0.18 * H, background: page }} />
                <div style={{ position: 'absolute', left: ring[0] * W - 48, top: ring[1] * H - 48, width: 97, height: 97, borderRadius: '50%', border: '9px solid #c3302a', opacity: 0.85 }} />
              </AbsoluteFill>
            </Layer>
            <Layer id={`${id}-m`} effects={[blur(3)]}>
              <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}><path d={`M0,0 H${W} V${H} H0 Z ${hole}`} fillRule="evenodd" fill="#000" /></svg>
            </Layer>
          </AbsoluteFill>
        );
      })}
    </>
  );
};

/** Shown characters to per-letter opacity: whole letters at 1, the newest one at its fraction (at least `min`). */
const typedOpacity = (i: number, n: number, min: number) => (i < Math.floor(n) ? 1 : i < n ? Math.max(min, n - Math.floor(n)) : 0);

export type LabelSize = 'short' | 'mid' | 'long';
const LABEL_PNG: Record<LabelSize, [number, number]> = { short: [560, 216], mid: [704, 238], long: [1076, 222] };

/**
 * A torn yellow label typing on: a scan of yellow paper torn by the paper plugin (fibre fringe, creases), revealed from
 * the left up to the box's right edge as the paper runs ahead of the letters; Didone caps, the newest letter at 40 %.
 * `box` is this frame's box (fractions); `typed` the characters shown (a fraction = the newest letter's opacity);
 * `blur` the zoom smear when it flies off.
 */
export const TornLabel: React.FC<{ id: string; text: string; box: Box4; typed: number; blur?: number; size?: LabelSize; base?: string; fitPaper?: boolean }> = ({ id, text, box, typed, blur: b = 0, size = 'mid', base = 'collage-textures', fitPaper = false }) => {
  const { width: W, height: H } = useVideoConfig();
  const [x0, y0, x1, y1] = box;
  const w = (x1 - x0) * W, h = (y1 - y0) * H;
  const cap = h / 1.95;
  const png = LABEL_PNG[size];
  const pw = Math.max(h * 0.84 * (png[0] / png[1]), fitPaper ? w * 1.04 : 0);
  const font = family(FONTS.didone, 400, false);
  return (
    <>
      <div style={{ position: 'absolute', left: 0, top: 0, width: Math.max(0, x1 * W + 6), height: H, overflow: 'hidden' }}>
        <Layer id={`${id}-b`} effects={b > 0.3 ? [blur(b)] : []}>
          <CutOut id={`${id}-paper`} src={tex(base, `label-${size}.png`)} x={x0 * W + pw / 2 + h * 0.06} y={((y0 + y1) / 2) * H} width={pw}
            edge={{ style: 'torn', thickness: 0.035, intensity: 1.3, detail: 1.1 }} paper={COLLAGE.yellow} back={COLLAGE.yellow} fringe="rgba(255,240,190,0.9)" creases={0.3} shadow={0} seed={id} />
        </Layer>
      </div>
      <div style={{ position: 'absolute', left: x0 * W, top: y0 * H, width: w, height: h, filter: b > 0.3 ? `blur(${b.toFixed(1)}px)` : undefined }}>
        <div style={{ position: 'absolute', left: cap * 0.45, top: (h - cap) / 2 - cap * 0.19, whiteSpace: 'pre', fontFamily: font, fontSize: cap / 0.7, lineHeight: 1, letterSpacing: '0.01em', color: COLLAGE.labelInk, textShadow: '-1px 0 0 rgba(170,60,40,0.35)' }}>
          {[...text].map((c, i) => <span key={i} style={{ opacity: typedOpacity(i, typed, 0.4) }}>{c}</span>)}
        </div>
      </div>
    </>
  );
};

/**
 * The torn charcoal strip with white Didone caps (red-left / blue-right split of 1.5 px), right-aligned at `right`;
 * a paler torn sliver under it. `box` is its scale-1 box (fractions), `s` this frame's scale about the screen centre,
 * `typed` the characters shown over both lines, `blur` the type's defocus. An optional handwritten `script` word under it.
 */
export const TornStrip: React.FC<{ lines: [string, string]; s: number; typed: number; blur?: number; box?: Box4; right?: number; script?: { text: string; opacity: number; blur?: number; align?: 'left' | 'right' }; base?: string; id?: string }> = ({ lines, s, typed, blur: b = 0, box = [0.253, 0.552, 0.915, 0.715], right = 0.799, script, base = 'collage-textures', id = 'strip' }) => {
  const { width: W, height: H } = useVideoConfig();
  const [x0, y0, x1, y1] = box;
  const bw = (x1 - x0) * W, bh = (y1 - y0) * H;
  const cx = W / 2 + (x0 * W + bw / 2 - W / 2) * s, cy = H / 2 + (y0 * H + bh / 2 - H / 2) * s;
  const capPx = 0.0302 * H;
  const font = family(FONTS.didone, 400, false);
  const typeStyle: React.CSSProperties = { position: 'absolute', right: W - right * W, whiteSpace: 'pre', fontFamily: font, fontSize: capPx / 0.7, lineHeight: 1, color: COLLAGE.white,
    textShadow: '-1.5px 0 0 rgba(175,116,86,0.95), 1.5px 0 0 rgba(82,147,186,0.95)' };
  const letters = (text: string, offset: number) => [...text].map((c, i) => <span key={i} style={{ opacity: typedOpacity(offset + i, typed, 0.45) }}>{c}</span>);
  return (
    <>
      <CutOut id={`${id}-sliver`} src={tex(base, 'strip-paper.png')} x={cx + 6 * s} y={cy + 14 * s} width={bw * 1.22 * s}
        edge={{ style: 'torn', thickness: 0.03, intensity: 2.8, detail: 1.8 }} paper={COLLAGE.sliver} back={COLLAGE.sliver} fringe="rgba(200,198,194,0.9)" creases={0.4} shadow={0} seed={id === 'strip' ? 'sliver' : `${id}-sliver`} />
      <CutOut id={`${id}-paper`} src={tex(base, 'strip-paper.png')} x={cx} y={cy} width={bw * 1.25 * s}
        edge={{ style: 'torn', thickness: 0.03, intensity: 2.6, detail: 1.7 }} paper={COLLAGE.charcoal} back={COLLAGE.charcoal} fringe="rgba(190,187,182,0.92)" creases={0.55} shadow={0} seed={id} />
      <Depth s={s}>
        <div style={{ position: 'absolute', inset: 0, filter: b > 0.3 ? `blur(${b.toFixed(1)}px)` : undefined }}>
          <div style={{ ...typeStyle, top: (y0 + 0.026) * H - capPx * 0.27 }}>{letters(lines[0], 0)}</div>
          <div style={{ ...typeStyle, top: (y0 + 0.075) * H - capPx * 0.27 }}>{letters(lines[1], lines[0].length)}</div>
        </div>
        {script && script.opacity > 0 && (
          <div style={{ position: 'absolute', ...(script.align === 'right' ? { right: W - right * W } : { left: 0.537 * W }), top: (y1 + 0.007) * H, whiteSpace: 'nowrap', fontFamily: family(FONTS.script, 400, false), fontSize: 0.05 * H, lineHeight: 1, color: '#ffffff', opacity: script.opacity, filter: (script.blur ?? 0) > 0.3 ? `blur(${script.blur}px)` : undefined }}>{script.text}</div>
        )}
      </Depth>
    </>
  );
};

/** The translucent yellow highlighter bar with torn ends (multiplied), in this frame's box. */
export const Highlighter: React.FC<{ box: Box4; opacity?: number }> = ({ box, opacity = 1 }) => {
  const { width: W, height: H } = useVideoConfig();
  const [x0, y0, x1, y1] = box;
  const w = (x1 - x0) * W, h = (y1 - y0) * H;
  return (
    <svg width={w + 20} height={h + 20} style={{ position: 'absolute', left: x0 * W - 10, top: y0 * H - 10, mixBlendMode: 'multiply', opacity: 0.68 * opacity }}>
      <polygon points={tornPoints(w, h, 5, 'eye', 10)} transform="translate(10,10)" fill={COLLAGE.highlighter} />
    </svg>
  );
};

/** Fine white grid hairlines in the lower part of the frame, fading in from `from` to `to` (fractions of H). */
export const GridOverlay: React.FC<{ opacity?: number; from?: number; to?: number; pitch?: number }> = ({ opacity = 1, from = 0.78, to = 0.93, pitch = 0.1006 }) => {
  const { width: W, height: H } = useVideoConfig();
  const p = pitch * W;
  const xs = Array.from({ length: Math.ceil(W / p) + 1 }, (_, k) => 0.048 * W + p * k);
  const ys = Array.from({ length: Math.ceil(H / p) + 1 }, (_, k) => 0.03 * H + p * k).filter((y) => y > (from - 0.04) * H);
  return (
    <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, opacity: opacity * 0.38, filter: 'blur(1.2px)' }}>
      <defs><linearGradient id="gridfade" gradientUnits="userSpaceOnUse" x1="0" y1={from * H} x2="0" y2={to * H}><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#fff" stopOpacity="1" /></linearGradient></defs>
      {xs.map((x) => <line key={`v${x}`} x1={x} y1={from * H} x2={x} y2={H} stroke="url(#gridfade)" strokeWidth={3} />)}
      {ys.map((y) => <line key={`h${y}`} x1={0} y1={y} x2={W} y2={y} stroke="url(#gridfade)" strokeWidth={3} />)}
    </svg>
  );
};

/** The one static dither screen over the whole frame (never animated). */
export const Dither: React.FC<{ strength?: number; base?: string }> = ({ strength = 0.6, base = 'collage-textures' }) => {
  const { width: W, height: H } = useVideoConfig();
  return <img src={tex(base, 'dither.png')} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, mixBlendMode: 'overlay', opacity: strength }} />;
};

/**
 * A torn hole punched through `children` (a picture on white, or the shot before), zoomed past the lens about
 * (0.5, 0.43) over three images and faded, with a blur that decays: the taste's cut between shots. Put it over the
 * next shot for its first 8 held frames; `t` is the next shot's held frame.
 */
export const Punch: React.FC<{ id: string; t: number; children: React.ReactNode; hole?: string; ring?: [number, number] | null }> = ({ id, t, children, hole = 'M 375,780 L 430,768 L 520,772 L 600,760 L 668,774 L 655,800 L 610,812 L 520,808 L 440,815 L 385,806 Z', ring = null }) => {
  const { width: W, height: H } = useVideoConfig();
  if (t >= 8) return null;
  const at = (keys: [number, number][]) => { let v = keys[0]![1]; for (let i = 1; i < keys.length; i++) { const [f0, v0] = keys[i - 1]!, [f1, v1] = keys[i]!; if (t >= f0 && t <= f1) v = v0 + ((v1 - v0) * (t - f0)) / (f1 - f0); else if (t > f1) v = v1; } return v; };
  const s = at([[0, 1], [2, 2.8], [4, 7], [6, 12]]);
  const o = at([[0, 1], [2, 1], [4, 0.7], [6, 0.4]]);
  const b = at([[0, 0], [2, 7], [4, 4], [6, 1]]);
  const k = W / 1080;
  return (
    <AbsoluteFill style={{ transform: `scale(${s.toFixed(4)})`, transformOrigin: '50% 43%', opacity: o }}>
      <Layer id={id} matte={{ layer: `${id}-m`, mode: 'alpha' }} effects={b > 0.3 ? [blur(b)] : []}>
        <AbsoluteFill>
          {children}
          {ring && <div style={{ position: 'absolute', left: ring[0] * W - 48, top: ring[1] * H - 48, width: 97, height: 97, borderRadius: '50%', border: '9px solid #c3302a', opacity: 0.85 }} />}
        </AbsoluteFill>
      </Layer>
      <Layer id={`${id}-m`} effects={[blur(3)]}>
        <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}><path d={`M0,0 H${W} V${H} H0 Z ${hole}`} transform={`scale(${k})`} fillRule="evenodd" fill="#000" /></svg>
      </Layer>
    </AbsoluteFill>
  );
};

/**
 * A plain old sheet at the page's scale-1 size (a map, a manuscript, a title page): the scan covering the sheet, one
 * sepia grade (or `grade` stops), creases and newsprint grain on top. Put it inside a Depth, like PrintedPage.
 */
export const PaperSheet: React.FC<{ id: string; src: string; position?: string; grade?: { offset: number; color: string }[] | null; filter?: string }> = ({ id, src, position = '50% 50%', grade = SEPIA, filter }) => {
  const { width: W } = useVideoConfig();
  const k = W / 1080;
  const left = -297 * k, pw = 1674 * k, ph = 2219 * k, top = -60 * k;
  return (
    <AbsoluteFill>
      <Layer id={id} effects={grade ? [gradientMap({ stops: grade })] : []}>
        <AbsoluteFill style={{ background: COLLAGE.paper }}>
          <img src={src} style={{ position: 'absolute', left, top, width: pw, height: ph, objectFit: 'cover', objectPosition: position, filter }} />
        </AbsoluteFill>
      </Layer>
      <img src={TEXTURES.creaseLight} style={{ position: 'absolute', left, top, width: pw, height: ph, mixBlendMode: 'multiply', opacity: 0.85 }} />
      <img src={TEXTURES.newsprint} style={{ position: 'absolute', left, top, width: pw, height: ph, mixBlendMode: 'multiply', opacity: 0.4 }} />
    </AbsoluteFill>
  );
};
