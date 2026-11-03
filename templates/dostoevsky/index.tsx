// "The man they didn't shoot": a 39 s history explainer on Fyodor Dostoevsky, cut in the collage taste
// (tastes/collage) with all five of its shots, each on its own ground:
//   1 dolly-through on the 1833 Petersburg plan: he was 28 and about to die (22 December 1849)
//   2 taped photo on kraft: the mock execution, men tied to posts
//   3 poster: Nicholas I, "49", the pardon was staged
//   4 dolly-through on an 1836 map of Siberia: four years in shackles in Omsk
//   5 taped photo: the casino at Homburg, roulette and debt
//   6 poster: the 1860s portrait, "26", The Gambler dictated in 26 days
//   7 taped photo: Anna Snitkina, the stenographer he married
//   8 person montage on tan: his portraits, Petersburg landmarks, the 1867 Crime and Punishment, the name tag
//   9 clouds over the Petersburg plan: 1821-1881
// Pictures are public domain (public/CREDITS.md). Shot numbers come from the reference specs (not committed).
//
//   node ../kinetograph/packages/cli/dist/cli.js render templates/dostoevsky/index.tsx --comp Dostoevsky -o templates/dostoevsky/out/dostoevsky.mp4
import React from 'react';
import { AbsoluteFill, Composition, registerRoot, staticFile, useCurrentFrame } from 'remotion';
import {
  Beat, Captions, CloudsOver, Dither, GROUNDS, MapPunch, Montage, PaperSheet, Poster, Punch, TapedPhoto, TornStrip,
  beatFrames, heldImage, imageStarts, type BeatProps,
} from '../../tastes/collage/index.js';

const img = (name: string) => staticFile(name);

interface Shot {
  frames: number;
  /** draw the shot at its own frame t (frames since it started) */
  draw: (t: number, id: string) => React.ReactNode;
  /** how it arrives: a hard cut (the default), torn through the shot before, or punched through a map */
  enter?: 'tear' | { map: string };
  /** the beat shots carry the fine 2.7 px dither; the others bring their own screens */
  dither?: boolean;
}

const beat = (p: Omit<BeatProps, 'id' | 't'>, extra: Partial<Shot> = {}): Shot => {
  const frames = beatFrames(p.holds);
  const starts = imageStarts(frames + 2);
  return { frames, dither: true, draw: (t, id) => <Beat {...p} id={id} t={heldImage(starts, Math.min(t, frames - 1))} />, ...extra };
};

/** a typed charcoal strip laid over a poster or montage (scale 1, no camera of its own) */
const Strip: React.FC<{ id: string; t: number; at: number; lines: [string, string]; box: [number, number, number, number]; right: number; script?: string }> = ({ id, t, at, lines, box, right, script }) =>
  t < at ? null : (
    <TornStrip id={id} lines={lines} box={box} right={right} s={1} typed={2 + Math.floor((t - at) / 2) * 2 * 0.72}
      script={script && t >= at + 34 ? { text: script, opacity: Math.min(1, (t - at - 34) / 3), align: 'right' } : undefined} />
  );

const SHOTS: Shot[] = [
  beat({
    back: <PaperSheet id="b0-sheet" src={img('m1-petersburg-plan-wiebeking-1833.jpg')} position="62% 50%" />,
    portrait: { src: img('p1-young-trutovsky-1847.png'), aspect: 333 / 617, height: 0.56, top: 0.2, filter: 'grayscale(1) sepia(0.2) contrast(1.5) brightness(0.92)' },
    wide: { src: img('w1-peter-paul-fortress-felisch-1870s.jpg'), aspect: 2188 / 1244, width: 1700, left: -260, reflect: false },
    labels: ['PETERSBURG', '1849', '22 DECEMBER'],
    strip: ['HE WAS 28 AND', 'ABOUT TO DIE'],
    script: 'Fyodor Dostoevsky',
    highlight: true,
  }, { enter: { map: img('m1b-petersburg-plan-wiebeking-1833-city.jpg') } }),
  {
    frames: 110,
    draw: (t, id) => (
      <>
        <TapedPhoto t={t} frames={110} src={img('w2-mock-execution-pokrovsky-1849.jpg')} position="58% 50%" filter="grayscale(1) sepia(0.35) contrast(1.15)" />
        <Captions id={id} t={t} out={94} rows={[{ text: 'TIED TO POSTS', x0: 0.06, y0: 0.80, at: 12 }, { text: 'RIFLES RAISED', x0: 0.3, y0: 0.872, at: 34 }]} />
      </>
    ),
  },
  {
    frames: 104,
    draw: (t, id) => (
      <>
        <Poster id={id} t={t} portrait={{ src: img('p2-nicholas-i-botman-1850s.png'), aspect: 1270 / 2246 }} map={{ src: img('m1-petersburg-plan-wiebeking-1833.jpg'), collar: 0.4 }}
          numerals="49" tag={{ text: '1849', note: 'XII' }} stamp={['PARDONED', '22 DEC 1849', 'BY ORDER']} ticks={['1849', '1850', '1854', '1859', '1866']} strip="22 12 1849" />
        <Strip id={`${id}-s`} t={t} at={36} lines={['THE PARDON', 'WAS STAGED']} box={[0.1, 0.79, 0.97, 0.95]} right={0.86} script="by the Tsar himself" />
      </>
    ),
  },
  beat({
    back: <PaperSheet id="b3-sheet" src={img('m2-russia-in-asia-malte-brun-1836.jpg')} position="30% 55%" />,
    portrait: { src: img('p3-semipalatinsk-1858-leibin.png'), aspect: 305 / 949, height: 0.78, top: 0.14, centre: 330 },
    wide: { src: img('w3d-omsk-picturesque-russia-1886.jpg'), aspect: 1251 / 463, width: 2600, left: -700, reflect: false },
    labels: ['SIBERIA', 'OMSK', '1850 – 1854'],
    strip: ['FOUR YEARS', 'IN SHACKLES'],
    script: 'then the army',
  }, { enter: 'tear' }),
  {
    frames: 100,
    draw: (t, id) => (
      <>
        <TapedPhoto t={t} frames={100} src={img('w4-bad-homburg-kurhaus-1865.jpg')} position="45% 50%" filter="grayscale(1) sepia(0.3) contrast(1.1)" />
        <Captions id={id} t={t} out={84} rows={[{ text: 'ROULETTE', x0: 0.08, y0: 0.80, at: 10 }, { text: 'DEBTS', x0: 0.55, y0: 0.872, at: 24 }, { text: 'EPILEPSY', x0: 0.18, y0: 0.94, h: 0.05, at: 38 }]} />
      </>
    ),
  },
  {
    frames: 104,
    draw: (t, id) => (
      <>
        <Poster id={id} t={t} portrait={{ src: img('p4-dostoevsky-1860s-gokh.png'), aspect: 857 / 1156 }} map={{ src: img('x1-dostoevsky-pushkin-speech-draft-1880.jpg'), collar: 0.36 }}
          numerals="26" tag={{ text: '1866', note: 'X' }} stamp={['DUE', '1 NOV 1866', 'OR LOSE ALL']} ticks={['OCT 4', 'OCT 11', 'OCT 18', 'OCT 25', 'OCT 29']} strip="THE GAMBLER" />
        <Strip id={`${id}-s`} t={t} at={36} lines={['A WHOLE NOVEL', 'IN 26 DAYS']} box={[0.1, 0.79, 0.97, 0.95]} right={0.86} script="dictated" />
      </>
    ),
  },
  {
    frames: 100,
    draw: (t, id) => (
      <>
        <TapedPhoto t={t} frames={100} src={img('p5-anna-snitkina-1871.png')} position="50% 0%" filter="grayscale(1) sepia(0.2) contrast(1.1)" />
        <Captions id={id} t={t} out={86} rows={[{ text: 'HIS STENOGRAPHER', x0: 0.05, y0: 0.80, at: 10 }, { text: 'ANNA', x0: 0.66, y0: 0.872, at: 30 }, { text: 'HE MARRIED HER', x0: 0.12, y0: 0.94, h: 0.05, at: 44 }]} />
      </>
    ),
  },
  {
    frames: 140,
    draw: (t, id) => (
      <>
        <Montage id={id} t={t} frames={140} ground={GROUNDS.tan} disc={{ x: 0.488, y: 0.6, r: 0.396, color: '#e47f48' }}
          pieces={[
            { src: img('l2-st-isaac-cathedral-1890s.png'), x: 0.3, y: 0.42, w: 0.5, from: [0, 143] },
            { src: img('l1-peter-paul-cathedral-spire-1896.png'), x: 0.66, y: 0.33, w: 0.16, from: [0, 150] },
            { src: img('l3-bronze-horseman-1890s.png'), x: 0.86, y: 0.5, w: 0.26, from: [300, 120] },
            { src: img('p4-dostoevsky-1860s-gokh.png'), x: 0.2, y: 0.55, w: 0.4, from: [-190, 100], tilt: 6 },
            { src: img('p7-shapiro-1880.png'), x: 0.8, y: 0.6, w: 0.42, from: [300, 120], tilt: -5 },
            { src: img('p6-perov-1872.png'), x: 0.5, y: 0.6, w: 0.66, from: [7, 413] },
            { src: img('w6-crime-and-punishment-1867-cover.jpg'), x: 0.27, y: 0.705, w: 0.2, at: 5, grow: 0.35, tiltFrom: 12, tilt: -3, grade: false },
            { src: img('l5b-frentz-sleigh.png'), x: 0.8, y: 0.85, w: 0.36, at: 2, grow: 0.57, from: [0, 90] },
          ]}
          name={{ first: 'FYODOR', last: 'DOSTOEVSKY', y: 0.84 }} />
        <Strip id={`${id}-s`} t={t} at={58} lines={['THE MAN THEY', "DIDN'T SHOOT"]} box={[0.12, 0.035, 0.97, 0.17]} right={0.86} />
      </>
    ),
  },
  {
    frames: 72,
    draw: (t, id) => (
      <CloudsOver t={t} map={img('m1-petersburg-plan-wiebeking-1833.jpg')} position="64% 50%">
        <Captions id={id} t={t} rows={[{ text: '1821 – 1881', x0: 0.3, y0: 0.52, at: 18 }]} />
      </CloudsOver>
    ),
  },
];

const STARTS: number[] = [];
let END = 0;
for (const s of SHOTS) { STARTS.push(END); END += s.frames; }

const Reel: React.FC = () => {
  const f = useCurrentFrame();
  let k = 0;
  while (k + 1 < SHOTS.length && f >= STARTS[k + 1]!) k++;
  const t = f - STARTS[k]!;
  const shot = SHOTS[k]!;
  const enter = shot.enter;
  const held = Math.floor(t / 2) * 2;
  return (
    <AbsoluteFill style={{ background: '#dcc9b3' }}>
      {shot.draw(t, `s${k}`)}
      {enter && held < 8 && (enter === 'tear'
        ? <Punch id={`p${k}`} t={held}>{SHOTS[k - 1]!.draw(SHOTS[k - 1]!.frames - 1, `s${k - 1}`)}</Punch>
        : <MapPunch id={`m${k}`} t={held} src={enter.map} />)}
      {shot.dither && <Dither />}
    </AbsoluteFill>
  );
};

registerRoot(() => <Composition id="Dostoevsky" component={Reel} durationInFrames={END} fps={25} width={1080} height={1920} />);
