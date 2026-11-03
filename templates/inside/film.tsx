// Launch film 2 (Kinetograph 0.3). The story: in 1893 Edison built the first film studio, the Black Maria, a shed that
// turned to follow the sun. Ours follows you. Every shot is timed from the narrator's word timestamps (timing.ts); the
// shot list and the motion plan are in SCRIPT.md.
//   node ../kinetograph-0.3.0/packages/cli/dist/cli.js render templates/inside/film.tsx --comp Launch2 -o templates/inside/out/launch2.mp4
import React from 'react';
import { AbsoluteFill, Composition, Sequence, interpolate, random, registerRoot, staticFile, useCurrentFrame } from 'remotion';
import { Audio, Image, Layer, Rect, Text, Video, blur, glow, gradientMap, grain } from '@kinetographdev/core';
import { loadFont as loadCaveat } from '@remotion/google-fonts/Caveat';
import { CREAM, Clip, Fall, Flash, H, INK, MONO, RED, Rise, SANS, SERIF, StudioShot, W, clamp, ease, out, type Cam, type Capture } from './kit.js';
import { Captions, type CaptionLine, type Point } from './captions.js';
import { FPS, PRE, TOTAL, WORDS, at, line } from './timing.js';
import { Captions as KCaptions } from '../../plugins/kinetic-typography/src/index.js';
import { measureText } from '@remotion/layout-utils';
import smithTrack from './track/blacksmith.json' with { type: 'json' };

const HAND = loadCaveat('normal', { weights: ['700'] }).fontFamily;
const CAP: Capture = { file: '', w: 3840, h: 2160, scale: 2 };
const cap = (file: string): Capture => ({ ...CAP, file });

// ---------------------------------------------------------------------------------------------------------------------
// Shot boundaries, all from the voice

const L = (n: number) => line(n);
const CUT = {
  s02: PRE,
  s03: L(2).from - 10,
  lib: PRE + Math.round(9.9 * FPS),
  plug: PRE + Math.round(22.45 * FPS),
  s09: PRE + Math.round(36.3 * FPS),
  s10: L(9).from - 4,
  s11: L(10).from - 4,
  end: TOTAL,
};

// ---------------------------------------------------------------------------------------------------------------------
// Archive: the film grade, gate weave and flicker of the first film

const TONE = [{ offset: 0, color: '#060708' }, { offset: 0.5, color: '#7d766b' }, { offset: 1, color: '#fff2dc' }];
const BAR = Math.round((H - W / 2.39) / 2);

function weave(f: number, push = 0.05) {
  const s = 1.04 + push * (f / 60);
  const jx = (random(`wx-${f}`) - 0.5) * 3, jy = (random(`wy-${f}`) - 0.5) * 2.5;
  return { s, jx, jy, map: (p: Point): Point => ({ x: W / 2 + (p.x - W / 2) * s + jx, y: H / 2 + (p.y - H / 2) * s + jy }) };
}

const Archive: React.FC<{ id: string; still?: string; src?: string; push?: number; turn?: number }> = ({ id, still, src, push = 0.05, turn = 0 }) => {
  const f = useCurrentFrame();
  const c = weave(f, push);
  const flicker = 0.93 + random(`fl-${id}-${f}`) * 0.08;
  return (
    <Layer id={id} x={(1 - c.s) * (W / 2) + c.jx} y={(1 - c.s) * (H / 2) + c.jy} scale={c.s} opacity={flicker} rotation={turn}
      anchorX={W / 2} anchorY={H / 2}
      effects={[gradientMap({ stops: TONE }), glow({ radius: 40, intensity: 0.3 }), grain(0.1, { seed: 11 })]}>
      {still ? <Image id={`${id}-i`} src={staticFile(still)} width={W} height={H} fit="cover" /> : null}
      {src ? <Video id={`${id}-v`} src={staticFile(src)} width={W} height={H} fit="cover" muted /> : null}
    </Layer>
  );
};

const Letterbox: React.FC = () => (
  <AbsoluteFill>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: BAR, background: '#000' }} />
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: BAR, background: '#000' }} />
  </AbsoluteFill>
);
const Vignette: React.FC<{ k?: number }> = ({ k = 0.6 }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 75% at 50% 50%, rgba(0,0,0,0) 50%, rgba(0,0,0,${k}) 100%)` }} />
);

// ---------------------------------------------------------------------------------------------------------------------
// 01 Leader: 3 → 2, the 2-pop, black

const S01: React.FC = () => {
  const f = useCurrentFrame();
  const flick = 0.88 + random(`lead-${f}`) * 0.16;
  const jx = (random(`lx-${f}`) - 0.5) * 4, jy = (random(`ly-${f}`) - 0.5) * 5;
  const s = 1.03 + 0.02 * (f / PRE);
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {f < PRE - 3 ? (
        <Layer id="leader" x={(1 - s) * (W / 2) + jx} y={(1 - s) * (H / 2) + jy} scale={s} opacity={flick}
          effects={[gradientMap({ stops: [{ offset: 0, color: '#0b0806' }, { offset: 0.55, color: '#8a7458' }, { offset: 1, color: '#fff0d6' }] }), grain(0.12, { seed: 3 })]}>
          <Video id="leader-v" src={staticFile('footage/leader.mp4')} width={W} height={H} fit="cover" muted />
        </Layer>
      ) : null}
      <Vignette k={0.7} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// 02 The Black Maria: the photo, the shed turning on its track, then Blacksmith Scene, shot inside it

const S02_LINES: CaptionLine[] = [{ n: 1, split: [4, 4, 3, 5, 4], hot: ['1893', 'studio', 'maria', 'sun'] }];

const S02: React.FC = () => {
  const f = useCurrentFrame() + CUT.s02;
  const DRAW = at(1, 'a') - 3; // "A black shed that turned..."
  const SMITH = at(1, 'follow') - 2;
  const end = CUT.s03;
  // the shed turns to follow the sun: a slow arc on its track while the line says so
  const turn = interpolate(f, [DRAW, SMITH], [-4, 6], { ...clamp, easing: ease });
  // anchors: the roof flap on the photo, the shed on the drawing, the anvil in the film
  const anchor = (fr: number): Point | null => {
    if (fr < DRAW) return weave(fr - CUT.s02, 0.06).map({ x: 1180, y: 330 });
    if (fr < SMITH) return weave(fr - DRAW, 0.03).map({ x: 960 + turn * 6, y: 470 });
    const pts = (smithTrack as { points: number[][] }).points;
    const [x, y] = pts[Math.min(pts.length - 1, Math.max(0, fr - SMITH))]!;
    return weave(fr - SMITH).map({ x: x!, y: y! });
  };
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Sequence from={0} durationInFrames={DRAW - CUT.s02}><Archive id="photo" still="archive/black-maria-exterior-1890s.jpg" push={0.06} /></Sequence>
      <Sequence from={DRAW - CUT.s02} durationInFrames={SMITH - DRAW}><Archive id="drawing" still="archive/black-maria-exterior-1894-meeker.jpg" push={0.03} turn={turn} /></Sequence>
      <Sequence from={SMITH - CUT.s02} durationInFrames={end - SMITH}><Archive id="smith" src="footage/blacksmith.mp4" /></Sequence>
      <Vignette />
      <Sequence from={-CUT.s02}>
        <Captions lines={S02_LINES} anchor={anchor} width={W} height={H} top={BAR + 30} />
      </Sequence>
      <Letterbox />
      {[DRAW, SMITH].map((a) => (f >= a && f < a + 4 ? <AbsoluteFill key={a} style={{ background: '#FFE9C8', opacity: interpolate(f, [a, a + 1, a + 4], [0.6, 0.3, 0], clamp) }} /> : null))}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// Captions after the archive: the kinetic-typography plugin's 16:9 look (cinematic-caps: spaced small capitals, the
// line's key word big in an italic serif in the open side), timed from the take's word stamps.

const kWords = (lines: number[], skip: string[] = []) =>
  WORDS.filter((w) => lines.includes(w.line) && !skip.includes(`${w.line}:${w.i}`)).map((w) => ({ text: w.word, from: w.from, to: w.to }));

const Voice: React.FC<{ lines: number[]; split: number[]; big: string[]; base: number; skip?: string[]; look?: Record<string, unknown> }> = ({ lines, split, big, base, skip, look }) => (
  <Sequence from={-base}>
    <KCaptions words={kWords(lines, skip)} split={split} big={big} preset="cinematic-caps" look={look as never} hold={10} />
  </Sequence>
);

// ---------------------------------------------------------------------------------------------------------------------
// 03 Reveal: the spark flashes white, the chart plays full frame, the camera pulls out into Studio on "Kinetograph
// Studio", then on "It follows you" pushes back into the preview, which becomes the library's first card

/** Studio's preview canvas in window css px, measured on 00-reveal (the drawn video area). */
const PREVIEW = { x: 389, y: 121, w: 1142, h: 642 };
const ZOOM_PREVIEW = (W / (PREVIEW.w * 0.86)) * 1.07;
const PC = { cx: PREVIEW.x + PREVIEW.w / 2, cy: PREVIEW.y + PREVIEW.h / 2 };
const S03: React.FC = () => {
  const f = useCurrentFrame();
  const base = CUT.s03;
  const pull = (at(2, 'kinetograph') - base - 4) / FPS;
  const push = (at(2, 'follows') - base) / FPS;
  const end = (CUT.lib - base) / FPS;
  const keys: Cam[] = [
    { t: 0, s: ZOOM_PREVIEW, ...PC },
    { t: pull, s: ZOOM_PREVIEW * 1.03, ...PC },
    { t: pull + 0.95, s: 0.87 },
    { t: pull + 1.1, s: 0.88 },
    { t: push, s: 1.02, ...PC },
    { t: end, s: ZOOM_PREVIEW, ...PC },
  ];
  return (
    <AbsoluteFill style={{ background: INK }}>
      <StudioShot id="s03" cap={cap('00-reveal.mp4')} from={Math.max(0.4, 7.6 - pull)} keys={keys} />
      <Flash id="s03-spark" t={f} len={4} color="#FFE9C8" />
    </AbsoluteFill>
  );
};

/** A rendered sequence played full frame. */
const Seq: React.FC<{ id: string; src: string }> = ({ id, src }) => (
  <Video id={id} src={staticFile(`worlds/${src}`)} width={W} height={H} fit="cover" muted />
);

// 04 The library: one continuous camera through our templates and components, diving into the chart, the map and a
// template (library.tsx, rendered to worlds/library.mp4)
const S04: React.FC = () => <AbsoluteFill style={{ background: INK }}><Seq id="lib" src="library.mp4" /></AbsoluteFill>;

// 05 The plugins: one subject, Blacksmith Scene, and each plugin changes its look (plugins.tsx → worlds/plugin-run.mp4)
const S05: React.FC = () => <AbsoluteFill style={{ background: '#000' }}><Seq id="plug" src="plugin-run.mp4" /></AbsoluteFill>;

// 09 Studio taken apart, panel by panel, each phrase set beside its panel (teardown.tsx → worlds/teardown.mp4)
const S09: React.FC = () => <AbsoluteFill style={{ background: INK }}><Seq id="tear" src="teardown.mp4" /></AbsoluteFill>;

// 10 No browser: struck through, then the line
const S10: React.FC = () => {
  const n = 9, base = CUT.s10;
  const f = useCurrentFrame();
  const b = at(n, 'browser') - base;
  const strike = interpolate(f - b - 6, [0, 8], [0, 1], { ...clamp, easing: out });
  const second = at(n, 'every') - base;
  const w = measureText({ text: 'no browser.', fontFamily: SANS, fontSize: 130, fontWeight: 700 }).width * 1.05;
  return (
    <AbsoluteFill style={{ background: INK }}>
      {f < second ? (
        <>
          <Rise id="s10-a" t={f + 2} text="no browser." x={W / 2} y={H / 2 - 70} size={130} align="center" weight={700} stagger={4} />
          <Rect id="s10-strike" x={W / 2 - w / 2} y={H / 2 + 8} width={w * strike} height={12} fill={RED} />
        </>
      ) : (
        <Rise id="s10-b" t={f - second} text="every frame, straight on the GPU." x={W / 2} y={H / 2 - 40} size={78} align="center" weight={600} stagger={4} />
      )}
    </AbsoluteFill>
  );
};

// 11 End card
const S11: React.FC = () => {
  const n = 10, base = CUT.s11;
  const f = useCurrentFrame();
  const sub = at(n, 'motion') - base;
  const url = at(n, 'try') - base;
  return (
    <AbsoluteFill style={{ background: INK }}>
      <Rise id="s11-mark" t={f} text="kinetograph" x={W / 2} y={H / 2 - 90} size={150} align="center" weight={700} tracking={-0.035} dot stagger={0} />
      <Rise id="s11-v" t={f - 8} text="0.3" x={W / 2 + 470} y={H / 2 - 120} size={40} font={MONO} weight={500} color={RED} />
      {f >= sub ? <Rise id="s11-sub" t={f - sub} text={'MOTION PICTURES, WRITTEN IN CODE.'} x={W / 2} y={H / 2 + 110} size={26} font={MONO} align="center" tracking={0.3} stagger={2} /> : null}
      {f >= url ? <Rise id="s11-url" t={f - url} text="kinetograph.dev" x={W / 2} y={H / 2 + 190} size={34} align="center" weight={500} color="#9a968f" /> : null}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------------------------------
// Sound: the one voice take, the drone, and the effects on the moves

const Sfx: React.FC<{ file: string; at: number; volume?: number }> = ({ file, at: a, volume = 1 }) => (
  <Sequence from={a}><Audio src={staticFile(`sfx/${file}.wav`)} volume={volume} /></Sequence>
);

const Sound: React.FC = () => (
  <>
    <Sequence from={PRE}><Audio src={staticFile('vo/take-spaced.wav')} /></Sequence>
    <Audio src={staticFile('sfx/drone.wav')} volume={(f) => interpolate(f, [0, 30, TOTAL - 40, TOTAL], [0, 0.2, 0.2, 0], clamp)} loop />
    <Sfx file="click" at={22} volume={0.8} />
    <Sfx file="swish" at={CUT.s03 - 4} volume={0.5} />
    <Sfx file="whoosh" at={at(2, 'kinetograph') - 6} volume={0.4} />
    <Sfx file="riser" at={at(2, 'follows') - 4} volume={0.35} />
    <Sfx file="whoosh" at={CUT.lib - 4} volume={0.5} />
    {['chart', 'place'].map((w, i) => <Sfx key={w} file="whoosh" at={at(i + 3, w) - 10} volume={0.4} />)}
    <Sfx file="swish" at={at(5, 'wall') - 6} volume={0.35} />
    <Sfx file="whoosh" at={at(5, 'app') - 10} volume={0.4} />
    {['talk', 'mark', 'hear', 'tune', 'export'].map((w) => <Sfx key={w} file="click" at={at(8, w)} volume={0.5} />)}
    <Sfx file="thump" at={at(9, 'browser') + 6} volume={0.5} />
    <Sfx file="hit" at={CUT.s11} volume={0.7} />
  </>
);

// ---------------------------------------------------------------------------------------------------------------------

const SHOTS: [keyof typeof CUT, React.FC][] = [['s02', S02], ['s03', S03], ['lib', S04], ['plug', S05], ['s09', S09], ['s10', S10], ['s11', S11]];
const ORDER = Object.keys(CUT) as (keyof typeof CUT)[];

export const Launch2: React.FC = () => (
  <AbsoluteFill style={{ background: '#000' }}>
    <Sequence from={0} durationInFrames={PRE}><S01 /></Sequence>
    {SHOTS.map(([k, C]) => {
      const next = ORDER[ORDER.indexOf(k) + 1]!;
      return <Sequence key={k} from={CUT[k]} durationInFrames={CUT[next] - CUT[k]}><C /></Sequence>;
    })}
    {/* the voice on screen, in the plugin's cinematic look */}
    <Voice lines={[2]} split={[3, 2, 3]} big={['ours', 'studio', 'you']} base={0} look={{ shadow: 0.7 }} />
    <Voice lines={[3, 4, 5]} split={[4, 6, 4, 5, 5, 5]} big={["chart", "story", "place", "dives", "work", "screen"]} base={0} />
    <Voice lines={[6, 7]} split={[2, 4, 4, 4, 6, 5]} big={['plugins', 'hexed', 'paper', 'vj', 'brushes']} base={0}
      skip={WORDS.filter((w) => w.line === 7 && w.i >= at7and).map((w) => `${w.line}:${w.i}`)} />
    <Sound />
  </AbsoluteFill>
);
const at7and = WORDS.find((w) => w.line === 7 && /^and$/i.test(w.word))!.i;

registerRoot(() => <Composition id="Launch2" component={Launch2} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />);
