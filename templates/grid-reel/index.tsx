// The grid opener of a documentary-style reel, timed to a measured reference in its timing and mechanics, with our own footage,
// words and wordmark. A 3x3 grid sits over every shot. Shot A starts as a mosaic and each cell flashes white and comes
// sharp on its own frame while the words land one to a cell. A wash to white, a glowing silhouette, and a cut-out subject
// with a white rim stands over background plates that change behind it; the words land along the top row. The cells
// glitch to the next plate, then turn grey one by one and open on the wordmark card.
//
// The clips are links: Fred Ott (cut out in stills/fred.png) and the archive film from the vj demo, the colour clips from the wish
// reel. reference/ (ignored) holds the reel this was timed against.
//
//   node ../kinetograph/packages/cli/dist/cli.js render templates/grid-reel/index.tsx --comp Opener -o templates/grid-reel/out/opener.mp4

import React from 'react';
import { AbsoluteFill, Composition, registerRoot, staticFile, useCurrentFrame } from 'remotion';
import { Image, Layer, Rect, Video, blur, glow, grayscale, halftone, random, sepia, shader } from '@kinetographdev/core';
import type { Effect } from '@kinetographdev/core';
import { loadFont as loadSerif } from '@remotion/google-fonts/InstrumentSerif';
import { loadFont as loadBlack } from '@remotion/google-fonts/ArchivoBlack';

const W = 1920;
const H = 1080;
const FPS = 30;
const SERIF = loadSerif('italic', { weights: ['400'] }).fontFamily;
const BLACK = loadBlack('normal', { weights: ['400'] }).fontFamily;

// ---- timing, in frames (30 fps), read off the reference frame by frame ----

const A = { mosaic: 1, end: 28 };
/** The frame each cell of shot A comes sharp (row-major, 0 top-left), each after a white flash. */
const A_SHARP = [6, 5, 10, 7, 9, 11, 8, 9, 12];
const B = { start: 28, silhouette: 29, subject: 31, plate2: 48, glitch: 66, plate3: 70, settle: 74 };
/** The frame each cell turns to the wordmark card: the right column first, the left last. */
const TO_C = [96, 92, 88, 97, 90, 88, 98, 90, 86];
const C = { colour: 94 };
const FLASH = 5;

type Word = { text: string; at: number; until: number; x: number; y: number };
const WORDS: Word[] = [
  { text: 'Why', at: 4, until: A.end, x: 0.19, y: 0.5 },
  { text: 'do', at: 9, until: A.end, x: 0.5, y: 0.5 },
  { text: 'edits', at: 16, until: A.end, x: 0.81, y: 0.5 },
  { text: 'like', at: 28, until: B.glitch, x: 0.23, y: 0.225 },
  { text: 'this', at: 34, until: B.glitch, x: 0.5, y: 0.225 },
  { text: 'one', at: 44, until: B.glitch, x: 0.77, y: 0.225 },
  { text: 'look', at: 68, until: 74, x: 0.5, y: 0.225 },
  { text: 'easy', at: 74, until: 92, x: 0.5, y: 0.225 },
];

// ---- cells ----

const CW = W / 3, CH = H / 3;
const cell = (i: number) => ({ x: (i % 3) * CW, y: Math.floor(i / 3) * CH, w: CW, h: CH });
/** One clip path of the given cells (a hair over each edge so neighbours meet without a seam). */
const cellsPath = (cells: number[]) => cells.map((i) => { const c = cell(i); return `M${c.x - 0.5} ${c.y - 0.5}h${c.w + 1}v${c.h + 1}h${-c.w - 1}Z`; }).join('');
const ALL = [0, 1, 2, 3, 4, 5, 6, 7, 8];

const MOSAIC = `
fn effect(px: vec2<f32>) -> vec4<f32> {
  if (u.size <= 1.0) { return layer(px); }
  return layer((floor(px / u.size) + 0.5) * u.size);
}`;
const mosaic = (size: number): Effect => shader({ code: MOSAIC, uniforms: { size } });

/** A flat tile over a cell. */
const Tile: React.FC<{ i: number; color: string; opacity: number; id: string }> = ({ i, color, opacity, id }) => {
  const c = cell(i);
  return opacity > 0.01 ? <Rect id={id} x={c.x} y={c.y} width={c.w} height={c.h} fill={color} opacity={Math.min(1, opacity)} /> : null;
};

const Grid: React.FC<{ color: string; width: number; opacity: number; id: string }> = ({ color, width, opacity, id }) => (
  <Layer id={id} opacity={opacity}>
    {[1, 2].map((k) => <Rect key={`v${k}`} x={k * CW - width / 2} y={0} width={width} height={H} fill={color} />)}
    {[1, 2].map((k) => <Rect key={`h${k}`} x={0} y={k * CH - width / 2} width={W} height={width} fill={color} />)}
  </Layer>
);

/** The words on screen at `f`: the condensed italic serif, white with a soft glow, set instantly on their frame. */
const Words: React.FC<{ f: number }> = ({ f }) => (
  <AbsoluteFill>
    {WORDS.filter((w) => f >= w.at && f < w.until).map((w) => (
      <div key={w.text + w.at} style={{
        position: 'absolute', left: w.x * W - 300, top: w.y * H - 70, width: 600, height: 140, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: SERIF, fontStyle: 'italic', fontSize: 128, lineHeight: 1, letterSpacing: '-0.035em', color: '#ffffff',
        transform: 'scaleX(0.86)', textShadow: '0 0 14px rgba(255,255,255,0.55), 0 0 2px rgba(255,255,255,0.8)',
      }}>{w.text}</div>
    ))}
  </AbsoluteFill>
);

// ---- shot A: a mosaic that comes sharp a cell at a time ----

const ShotA: React.FC<{ f: number }> = ({ f }) => {
  const sharp = ALL.filter((i) => f >= A_SHARP[i]!);
  const rough = ALL.filter((i) => f < A_SHARP[i]!);
  const clip = (src: string, id: string, effects: Effect[] = []) => (
    <Video id={id} src={staticFile(src)} width={W} height={H} fit="cover" playbackRate={0.5} muted effects={effects} />
  );
  return (
    <Layer id="a" scale={1 + 0.04 * (f / A.end)} origin="center">
      {rough.length > 0 && <Layer id="a-rough" clip={{ kind: 'path', d: cellsPath(rough) }}>{clip('walkway.mp4', 'a-rough-clip', [blur(6), mosaic(46), blur(7)])}</Layer>}
      {sharp.length > 0 && <Layer id="a-sharp" clip={{ kind: 'path', d: cellsPath(sharp) }}>{clip('walkway.mp4', 'a-sharp-clip')}</Layer>}
      {ALL.map((i) => <Tile key={i} id={`a-flash-${i}`} i={i} color="#f4f4f4" opacity={f >= A_SHARP[i]! - 1 ? 0.9 * (1 - (f - A_SHARP[i]! + 1) / FLASH) : 0} />)}
    </Layer>
  );
};

// ---- shot B: the cut-out subject over plates that change behind it ----

const PLATES: { src: string; from: number; tint: string; dark: number; effects: Effect[] }[] = [
  { src: 'blacksmith.mp4', from: B.start, tint: '#c99a8e', dark: 0.12, effects: [blur(7), sepia(1)] },
  { src: 'veteran.mp4', from: B.plate2, tint: '#e2dedb', dark: 0.05, effects: [blur(9), grayscale(1)] },
  { src: 'shops.mp4', from: B.plate3, tint: '#8a6a52', dark: 0.5, effects: [blur(8), sepia(0.7)] },
];

const Plate: React.FC<{ f: number; i: number }> = ({ f, i }) => {
  const p = PLATES[i]!;
  const k = (f - p.from) / 60;
  return (
    <Layer id={`b-plate-${i}`} scale={1.06 + 0.05 * k} origin="center">
      <Video id={`b-plate-${i}-clip`} src={staticFile(p.src)} width={W} height={H} fit="cover" playbackRate={0.5} from={p.from} muted effects={p.effects} />
      <Rect id={`b-plate-${i}-tint`} width={W} height={H} fill={p.tint} blendMode="multiply" />
      <Rect id={`b-plate-${i}-dark`} width={W} height={H} fill="#000000" opacity={p.dark} />
      <Rect id={`b-plate-${i}-screen`} width={W} height={H} fill="#000000" opacity={0.18} effects={[halftone({ size: 9, angle: 45, color: '#ffffff', invert: true })]} />
    </Layer>
  );
};

/** The subject, a still cut-out standing in the lower frame: a white glowing silhouette for two frames, then the person
 *  with a crisp white rim and a soft glow past it. stills/fred.png is a frame of Fred Ott's Sneeze with its matte, cut
 *  hard, as alpha. */
const Subject: React.FC<{ f: number }> = ({ f }) => {
  const S = 0.66;
  const place = { x: (W - W * S) / 2, y: H - H * S, scale: S };
  const cut = (id: string) => <Image id={id} src={staticFile('stills/fred.png')} width={W} height={H} />;
  const white = (id: string) => <Rect id={`${id}-fill`} width={W} height={H} fill="#ffffff" matte={{ layer: `${id}-src`, mode: 'alpha' }} />;
  if (f < B.subject) {
    return (
      <Layer id="b-sil" {...place} effects={[glow({ radius: 30, color: '#ffffff', intensity: 1.3 })]}>
        {cut('b-sil-src')}
        {white('b-sil')}
      </Layer>
    );
  }
  return (
    <Layer id="b-subject" {...place}>
      <Layer id="b-rim" effects={[glow({ radius: 3, color: '#ffffff', intensity: 6 }), glow({ radius: 20, color: '#ffffff', intensity: 0.55 })]}>
        {cut('b-rim-src')}
        {white('b-rim')}
      </Layer>
      {cut('b-subject-cut')}
    </Layer>
  );
};

const ShotB: React.FC<{ f: number }> = ({ f }) => {
  const plate = f >= B.plate3 ? 2 : f >= B.plate2 ? 1 : 0;
  // the glitch: cells flash white or grey or show a blurred slab of the wordmark card, a new pick every two frames; for the
  // last four only the right column still flickers
  const glitch = f >= B.glitch && f < B.settle;
  const pick = (i: number) => (f >= B.plate3 && i % 3 !== 2 ? 1 : random(`glitch-${i}-${Math.floor((f - B.glitch) / 2)}`));
  return (
    <Layer id="b">
      <Plate f={f} i={glitch ? 2 : plate} />
      {glitch && ALL.map((i) => {
        const r = pick(i);
        return r < 0.32 ? <Tile key={i} id={`b-glitch-${i}`} i={i} color="#efefef" opacity={0.95} />
          : r < 0.5 ? <Tile key={i} id={`b-glitch-${i}`} i={i} color="#8f8f94" opacity={0.8} />
          : r < 0.7 && f < B.plate3 ? <Layer key={i} id={`b-peek-${i}`} clip={{ kind: 'path', d: cellsPath([i]) }} effects={[blur(10)]}>
              {/* the card blown up, so a cell shows a slab of a letter */}
              <Layer id={`b-peek-${i}-card`} scale={3.2} origin="center" x={(1 - (i % 3)) * 260} y={(1 - Math.floor(i / 3)) * 120}><Card f={f} ghost={false} /></Layer>
            </Layer>
          : null;
      })}
      {f >= B.silhouette && <Subject f={f} />}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)' }} />
    </Layer>
  );
};

// ---- shot C: the wordmark card ----

const Card: React.FC<{ f: number; ghost: boolean }> = ({ f, ghost }) => {
  const s = 1 + Math.max(0, f - 86) * 0.0012;
  const face: React.CSSProperties = { fontFamily: BLACK, fontSize: 290, lineHeight: 0.84, letterSpacing: '-0.04em', textTransform: 'lowercase', textAlign: 'center' };
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, #2c2a3b 0%, #1d1c27 60%, #16151e 100%)', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', transform: `scale(${s})` }}>
        {/* the glow and white edge under the gradient face (a clipped background drops text-shadow) */}
        <div style={{ ...face, color: ghost ? '#9c9aa6' : '#ffffff', WebkitTextStroke: ghost ? undefined : '14px #ffffff',
          textShadow: ghost ? undefined : '0 0 30px rgba(255,92,190,0.85), 0 0 80px rgba(160,70,255,0.6)' }}>kineto<br />graph</div>
        {!ghost && (
          <div style={{ ...face, position: 'absolute', inset: 0, color: 'transparent', WebkitBackgroundClip: 'text', backgroundClip: 'text',
            backgroundImage: 'linear-gradient(160deg, #ffd36b 0%, #ff7a59 38%, #ff3d9a 70%, #8f4bff 100%)' }}>kineto<br />graph</div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ---- the opener ----

const Opener: React.FC = () => {
  const f = useCurrentFrame();
  const toC = ALL.filter((i) => f >= TO_C[i]!);
  const stayB = ALL.filter((i) => f < TO_C[i]!);
  // the cut lands washed out: the first frame of shot B under a white veil
  const wash = f === B.start ? 0.62 : 0;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {f >= A.mosaic && f < A.end && <ShotA f={f} />}
      {f >= B.start && stayB.length > 0 && <Layer id="b-cells" clip={toC.length ? { kind: 'path', d: cellsPath(stayB) } : undefined}><ShotB f={f} /></Layer>}
      {toC.length > 0 && <Layer id="c-cells" clip={stayB.length ? { kind: 'path', d: cellsPath(toC) } : undefined}><Card f={f} ghost={f < C.colour} /></Layer>}
      {/* each cell turns grey for a few frames as it changes to the card */}
      {ALL.map((i) => {
        const k = f - TO_C[i]!;
        return k < 0 ? null : k < 2 ? <Tile key={i} id={`c-turn-${i}`} i={i} color="#ededed" opacity={0.95} />
          : <Tile key={i} id={`c-turn-${i}`} i={i} color="#8d8d92" opacity={0.8 * (1 - (k - 2) / 6)} />;
      })}
      {f < A.end
        ? f >= A.mosaic && <Grid id="grid-a" color="#000000" width={3} opacity={0.6} />
        : <Grid id="grid-b" color="#ffffff" width={2} opacity={f < 98 ? 0.42 : Math.max(0, 0.42 * (1 - (f - 98) / 8))} />}
      <Words f={f} />
      {wash > 0 && <Rect id="wash" width={W} height={H} fill="#ffffff" opacity={wash} />}
    </AbsoluteFill>
  );
};

registerRoot(() => (
  <Composition id="Opener" component={Opener} durationInFrames={135} fps={FPS} width={W} height={H} />
));
