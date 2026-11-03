// A 30-second documentary explainer in the vox taste (tastes/vox): "The loudest sound in recorded history", Krakatoa,
// 27 August 1883. Six beats, each a move from the vox reels: an italic lead with caps popping yellow over a tinted,
// halftoned photo card; a full-bleed lithograph with the title appearing letter by letter on a boom; an old chart with
// a burn-in region, a drawn arrow and an odometer distance; a ship in a coral highlight; a printed chart page that
// turns (CC Page Turn); barograms and a barometer with an odometer count. Scanned magazine texture, film dust and a
// vignette over everything. Sounds are procedural (tastes/vox/tools/sfx.py). Pictures: public domain (public/raw/SOURCES.md,
// public/CREDITS.md).
//
//   node ../kinetograph/packages/cli/dist/cli.js render tastes/vox/demo/index.tsx --comp Krakatoa -o tastes/vox/demo/out/krakatoa.mp4

import React from 'react';
import { AbsoluteFill, Audio, Composition, Easing, Img, Sequence, interpolate, random, registerRoot, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import {
  Arrow, Boil, BurnIn, Card, Clouds, GridPaper, Highlight, Line, MagazineTexture, MapLabel, MapOverlay, MapView, Odometer, Pin, PopWord, PrintPhoto,
  RandomLetters, Rings, VOX,
} from '../index.js';
import { Dust, EdgeBlur, Flicker, GateWeave, Vignette, WindowLight } from '../../../kit/looks/film.js';
import { PageTurn } from '../../../kit/looks/page-turn.js';
import { CurveCut } from '../../../kit/looks/curve-cut.js';
import { Posterize } from '../../../kit/looks/posterize.js';

// beats, frames at 30 fps
const B1 = { from: 0, end: 130 };
const B2 = { from: 130, end: 255 };
const B3 = { from: 255, end: 520 };
const B4 = { from: 520, end: 640 };
const B5 = { from: 640, turn: 735, end: 765 };
const B6 = { from: 765, end: 900 };

const MAP = { src: 'raw/map-indian-ocean.jpg', size: [3840, 2164] as [number, number] };
const KRAKATOA: [number, number] = [0.517 * 3840, 0.42 * 2164];
const RODRIGUES: [number, number] = [0.291 * 3840, 0.545 * 2164];
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

const sfx = (name: string, at: number, volume = 1) => (
  <Sequence key={`${name}${at}`} from={at} durationInFrames={150} layout="none"><Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} /></Sequence>
);

/* 1: the hook. A tinted, halftoned photo card of a steaming crater; the lead in italic serif, then the caps pop. */
const Hook: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <GridPaper />
      <Card x={0.5} y={0.29} w={0.84} h={0.36} tilt={-2.5} at={3}>
        <PrintPhoto id="crater" src={staticFile('crater.jpg')} dark={VOX.ink} light={VOX.cream} halftone={0.6} cell={10} lo={0.12} hi={0.5} position="50% 45%" zoom={1.15 + 0.0012 * f} />
      </Card>
      <Line text="In 1883," x={0.08} y={0.565} size={0.075} at={12} />
      <Line text="a volcano made" x={0.08} y={0.625} size={0.06} at={22} />
      <PopWord text="the loudest" face="caps" weight={800} x={0.075} y={0.715} size={0.105} at={36} />
      <PopWord text="sound" face="caps" weight={800} x={0.075} y={0.8} size={0.105} at={52} />
      <Line text="in recorded history." x={0.08} y={0.895} size={0.055} at={76} />
    </AbsoluteFill>
  );
};

/* 2: the title on the lithograph: a boom, a flash, a shake; the name appears letter by letter. The picture comes in
   through the curve cut from the hook, so it is drawn apart from the words over it. */
const TitlePicture: React.FC = () => {
  const f = useCurrentFrame();
  const { width: W } = useVideoConfig();
  const a = Math.max(0, f - B2.from);
  const shake = Math.max(0, 1 - a / 16) ** 2 * 0.022 * W * (f >= B2.from ? 1 : 0);
  const sx = (random(`sx${a}`) - 0.5) * shake, sy = (random(`sy${a}`) - 0.5) * shake;
  // the blurred copy needs its own layer ids: the picture is made twice
  const litho = (id: string) => <PrintPhoto id={id} src={staticFile('raw/krakatoa-litho.jpg')} dark="#1b1714" light="#f6ecd4" tint={0.72} halftone={0.35} cell={7} position="50% 40%" />;
  return (
    <AbsoluteFill style={{ background: VOX.night }}>
      {/* an archival picture moves like a filmed print: gate weave and exposure flicker */}
      <Flicker><GateWeave>
        <AbsoluteFill style={{ transform: `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) scale(${(1.02 + 0.0011 * a).toFixed(4)})` }}>
          {litho('litho')}
          <EdgeBlur radius={40}>{litho('litho-blur')}</EdgeBlur>
        </AbsoluteFill>
      </GateWeave></Flicker>
    </AbsoluteFill>
  );
};

const TitleText: React.FC = () => {
  const f = useCurrentFrame();
  const a = f - B2.from;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: 'linear-gradient(rgba(0,0,0,0) 45%, rgba(10,8,6,0.75) 85%)' }} />
      <RandomLetters text="Krakatoa" face="serif" weight={800} italic color={VOX.cream} x={0.5} y={0.71} size={0.18} align="center" at={B2.from + 10} spread={22} />
      <Line text="27 August 1883" color={VOX.cream} x={0.5} y={0.79} size={0.05} align="center" at={B2.from + 40} />
      <AbsoluteFill style={{ background: '#fff', opacity: Math.max(0, 1 - a / 4) }} />
    </AbsoluteFill>
  );
};

/* 3: the map. Push in on the strait, pull back across the ocean; the reach burns in, rings spread, an arrow draws to
   Rodrigues and the distance rolls in */
const MapBeat: React.FC = () => {
  const f = useCurrentFrame();
  const t = interpolate(f, [B3.from + 20, B3.from + 150], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
  const c0 = [0.517, 0.43], c1 = [0.404, 0.5];
  const center: [number, number] = [c0[0]! + (c1[0]! - c0[0]!) * t, c0[1]! + (c1[1]! - c0[1]!) * t];
  // at most 0.31 of the chart's width, so it always fills the frame's height
  const span = 0.2 + (0.31 - 0.2) * t;
  const reach = Math.hypot(RODRIGUES[0] - KRAKATOA[0], RODRIGUES[1] - KRAKATOA[1]);
  const burn = clamp01((f - (B3.from + 60)) / 50);
  const label = (on: number) => MAP.size[0] * span * 0.035 * on;
  return (
    <AbsoluteFill>
      <MapView id="chart" src={staticFile(MAP.src)} size={MAP.size} center={center} span={span} tone={0.8} />
      {/* the reach of the sound: a flat region in overlay, burnt in (CC Burn Film 100 to 0) */}
      <AbsoluteFill style={{ mixBlendMode: 'multiply', opacity: 0.85 }}>
        <BurnIn id="reach" progress={burn} scale={70}>
          <MapOverlay size={MAP.size} center={center} span={span}>
            <circle cx={KRAKATOA[0]} cy={KRAKATOA[1]} r={reach * 1.04} fill="#e59a70" />
          </MapOverlay>
        </BurnIn>
      </AbsoluteFill>
      {/* the drawn lines boil like hand animation */}
      <Boil id="map-lines">
      <MapOverlay size={MAP.size} center={center} span={span}>
        <Rings at={B3.from + 14} x={KRAKATOA[0]} y={KRAKATOA[1]} speed={7 + 40 * t} every={14} count={14} max={reach * 1.1} width={label(0.12)} />
        <Pin at={B3.from + 6} x={KRAKATOA[0]} y={KRAKATOA[1]} r={label(0.22)} />
        <MapLabel at={B3.from + 12} x={KRAKATOA[0] + label(0.5)} y={KRAKATOA[1] - label(0.4)} text="Krakatoa" size={label(1)} />
        <Arrow a={[KRAKATOA[0] - label(0.3), KRAKATOA[1] + label(0.3)]} b={[RODRIGUES[0] + label(0.4), RODRIGUES[1] - label(0.2)]} bend={0.22} at={B3.from + 120} dur={24} width={label(0.14)} />
        <Pin at={B3.from + 144} x={RODRIGUES[0]} y={RODRIGUES[1]} r={label(0.22)} />
        <MapLabel at={B3.from + 148} x={RODRIGUES[0]} y={RODRIGUES[1] + label(1.3)} text="Rodrigues Island" size={label(1)} anchor="middle" />
      </MapOverlay>
      </Boil>
      <Clouds count={3} drift={1.1} opacity={0.28} />
      <AbsoluteFill style={{ background: 'linear-gradient(rgba(12,10,8,0.8), rgba(12,10,8,0.45) 22%, rgba(12,10,8,0) 40%)' }} />
      <Line text="It was heard" color={VOX.cream} x={0.5} y={0.085} size={0.06} align="center" at={B3.from + 100} />
      <Odometer text="4,800 KM" face="caps" weight={800} color={VOX.yellow} x={0.5} y={0.165} size={0.13} align="center" at={B3.from + 160} />
      <Line text="away." color={VOX.cream} x={0.5} y={0.245} size={0.06} align="center" at={B3.from + 190} />
    </AbsoluteFill>
  );
};

/* 4: the ship. Full bleed, tinted teal and screened; a coral highlight; the line underneath */
const Ship: React.FC = () => {
  const f = useCurrentFrame();
  const a = f - B4.from;
  const ship = (id: string) => <PrintPhoto id={id} src={staticFile('ship.jpg')} dark="#0f2a33" light="#eaf0e6" halftone={0.5} cell={9} lo={0.3} hi={0.82} position="62% 50%" />;
  return (
    <AbsoluteFill style={{ background: VOX.night }}>
      <Flicker seed="ship"><GateWeave seed="ship">
        <AbsoluteFill style={{ transform: `scale(${(1.05 + 0.0016 * a).toFixed(4)})`, transformOrigin: '62% 50%' }}>
          {ship('ship')}
          <EdgeBlur radius={35}>{ship('ship-blur')}</EdgeBlur>
        </AbsoluteFill>
      </GateWeave></Flicker>
      <AbsoluteFill style={{ background: 'linear-gradient(rgba(0,0,0,0) 40%, rgba(8,20,24,0.7) 90%)' }} />
      <Line text="On a ship" color={VOX.cream} x={0.08} y={0.6} size={0.055} at={B4.from + 6} />
      <Highlight text="64 KM AWAY," face="caps" weight={800} x={0.06} y={0.675} size={0.09} at={B4.from + 18} />
      <Line text="sailors' eardrums" color={VOX.cream} x={0.08} y={0.765} size={0.07} at={B4.from + 40} />
      <PopWord text="burst." face="caps" weight={800} settle={VOX.cream} x={0.075} y={0.85} size={0.13} at={B4.from + 58} />
    </AbsoluteFill>
  );
};

/* 5: a printed page: the 1884 chart of the island before and after, a headline; then the page turns */
const ChartPage: React.FC = () => (
  <AbsoluteFill style={{ background: VOX.cream }}>
    <GridPaper color={VOX.cream} />
    <div style={{ position: 'absolute', left: '5%', right: '5%', top: '30%', height: '40%', background: '#f4eedd', boxShadow: '0 10px 30px rgba(0,0,0,0.18)' }}>
      <PrintPhoto id="chart-page" src={staticFile('raw/krakatau-1.jpg')} dark="#22201c" light="#f4eedd" halftone={0} />
    </div>
    <Line text="By morning," x={0.08} y={0.15} size={0.06} at={B5.from + 6} />
    <Line text="two-thirds of the island" x={0.08} y={0.21} size={0.06} at={B5.from + 16} />
    {/* light from a window drifting across the page */}
    <WindowLight strength={0.3} drift={0.1} />
    <PopWord text="had vanished." face="caps" weight={800} x={0.075} y={0.82} size={0.1} at={B5.from + 34} />
  </AbsoluteFill>
);

/* 6: barograms and a barometer; the count rolls; the close */
const Barometers: React.FC = () => {
  const f = useCurrentFrame();
  const a = f - B6.from;
  const rise = 1 - (1 - clamp01(a / 22)) ** 3;
  return (
    <AbsoluteFill>
      <GridPaper />
      <Card x={0.37} y={0.3} w={0.6} h={0.46} tilt={-3} at={B6.from + 2}>
        <PrintPhoto id="baro" src={staticFile('raw/barograph.png')} dark="#22201c" light="#f4eedd" halftone={0} position="50% 40%" />
      </Card>
      <Img src={staticFile('barometer.png')} style={{ position: 'absolute', left: '64%', top: `${(10 + (1 - rise) * 60).toFixed(1)}%`, height: '52%', filter: 'grayscale(0.6) contrast(1.05) drop-shadow(-10px 14px 18px rgba(0,0,0,0.3))' }} />
      <Line text="Barometers on every continent jumped" x={0.07} y={0.625} size={0.046} at={B6.from + 10} />
      <Odometer text="7 TIMES" face="caps" weight={800} x={0.065} y={0.705} size={0.13} at={B6.from + 30} />
      <Line text="as its pressure wave" x={0.07} y={0.795} size={0.055} at={B6.from + 62} />
      <PopWord text="circled the Earth." face="caps" weight={800} x={0.065} y={0.865} size={0.08} at={B6.from + 72} />
    </AbsoluteFill>
  );
};

const Reel: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: VOX.night }}>
      {/* cutting the curve: one push across both shots, cut on its fastest frame, on twos */}
      {f < B2.end && <Posterize step={f < B2.from + 18 ? 2 : 1}><CurveCut start={B2.from - 18} duration={36} cut={B2.from} scale={[1, 1.35]} pivot={[0.5, 0.29]} a={<Hook />} b={<TitlePicture />} /></Posterize>}
      {f >= B2.from && f < B2.end && <TitleText />}
      {f >= B3.from && f < B3.end && <MapBeat />}
      {f >= B4.from && f < B4.end && <Ship />}
      {/* the page turns on threes */}
      {f >= B5.from && <Posterize step={f >= B5.turn && f < B5.end ? 3 : 1}><PageTurn id="page" start={B5.turn} duration={30} radius={60} paper="#e8e2d0" page={f < B5.end ? <ChartPage /> : null} under={f >= B5.turn ? <Barometers /> : null} /></Posterize>}
      {/* the finish over every beat: scanned magazine, dust, vignette */}
      <MagazineTexture strength={0.32} />
      <Dust strength={0.32} density={120} />
      <Vignette strength={0.45} />
      {/* sound */}
      <Sequence from={0} durationInFrames={900} layout="none"><Audio src={staticFile('score.wav')} volume={0.8} /></Sequence>
      {sfx('rumble', 0, 0.55)}{sfx('snap', 3, 0.6)}{sfx('paper', 5, 0.4)}{sfx('marker', 36, 0.55)}{sfx('marker', 52, 0.55)}
      {sfx('whoosh', 124, 0.35)}{sfx('boom', 130, 1)}
      {sfx('click', B3.from - 1, 0.7)}{sfx('whoosh', B3.from, 0.35)}{sfx('pop', B3.from + 6, 0.45)}{sfx('rumble', B3.from + 60, 0.4)}{sfx('marker', B3.from + 120, 0.5)}{sfx('pop', B3.from + 144, 0.45)}
      {Array.from({ length: 8 }, (_, i) => sfx('tick', B3.from + 160 + i * 2, 0.35))}
      {sfx('click', B4.from - 1, 0.7)}{sfx('whoosh', B4.from - 4, 0.35)}{sfx('paper', B4.from + 18, 0.5)}{sfx('pop', B4.from + 58, 0.6)}
      {sfx('click', B5.from - 1, 0.7)}{sfx('paper', B5.from, 0.45)}{sfx('marker', B5.from + 34, 0.5)}{sfx('flick', B5.turn + 4, 0.8)}{sfx('paper', B5.turn + 10, 0.4)}
      {Array.from({ length: 7 }, (_, i) => sfx('tick', B6.from + 30 + i * 2, 0.35))}{sfx('snap', B6.from + 2, 0.55)}{sfx('marker', B6.from + 72, 0.5)}
    </AbsoluteFill>
  );
};

registerRoot(() => <Composition id="Krakatoa" component={Reel} durationInFrames={B6.end} fps={30} width={1080} height={1920} />);
