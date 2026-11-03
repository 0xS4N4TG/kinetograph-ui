// "Hold still": the first photographs, 1839 to the 1860s, a 30-second reel cut entirely in the archive taste
// (tastes/archive). Seven beats, each a technique from the kit looks:
//   1 a Boston daguerreotype in its brass mat, cut into layers, the camera sliding past the mat (parallax, on twos)
//   2 cut on the curve (speed-spike push, cut on the fastest frame) into a French daguerreotype landscape, 1844
//   3 a sitter in window light (multiply plate drifting), parallax, edge blur
//   4 a standing sitter, parallax, a catalogue tag
//   5 Talbot's 1843 Paris street, salted paper print, slow push and heavy flicker
//   6 an album page of plates, typed labels in ink; the page turns (CC Page Turn, posterized to 7.5 fps)
//   7 Marville's 1866 Paris street, albumen print from a glass negative, the close
// Film over everything: gate weave (the reference's preset), exposure flicker, dust, the scanned film texture,
// vignette. Pictures: The Met, Open Access (CC0), public/CREDITS.md. Sound: procedural, tastes/archive/tools.
//
//   node ../kinetograph/packages/cli/dist/cli.js render tastes/archive/demo/index.tsx --comp HoldStill -o tastes/archive/demo/out/hold-still.mp4

import React from 'react';
import { AbsoluteFill, Audio, Composition, Sequence, registerRoot, staticFile, useCurrentFrame } from 'remotion';
import {
  ARCHIVE, AlbumPage, ArchiveFinish, ArchivePhoto, CurveCut, Dateline, Develop, Dust, FilmScan, Line, PageTurn, ParallaxPlate, PlateMat, Posterize, Scrim, Tag, Toned, Vignette,
} from '../index.js';

const P = (f: string) => staticFile(`photos/${f}`);

// beats, frames at 30 fps
const CUT1 = { start: 112, dur: 40 }; // the curve cut: its middle frame, 132, is the cut
const B1 = { from: 0, end: 132 };
const B2 = { from: 132, end: 270 };
const B3 = { from: 270, end: 420 };
const B4 = { from: 420, end: 560 };
const B5 = { from: 560, end: 690 };
const B6 = { from: 690, turn: 776, end: 804 };
const B7 = { from: 776, end: 900 };

const sfx = (name: string, at: number, volume = 1) => (
  <Sequence key={`${name}${at}`} from={at} durationInFrames={120} layout="none"><Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} /></Sequence>
);

/* 1: the plate in its case. The picture is cut into the backdrop (hole filled) and the sitter; the brass mat is the
   near layer, defocused, moving 3x */
const Plate: React.FC = () => (
  <AbsoluteFill style={{ background: ARCHIVE.velvet }}>
    <ArchiveFinish weave="preset" blur={0} push={0} dust={0} scan={0} vignette={0} picture={(c) => (
      <ParallaxPlate id={`mckay-${c}`} process="daguerreotype" start={0} duration={150} travel={-0.035} rise={-0.012} push={0.0009} zoom={1.12} origin="55% 22%"
        layers={[{ src: P('mckay-back.jpg'), factor: 0.6 }, { src: P('mckay-mid.png'), factor: 1 }]}
        near={<PlateMat window={[0.08, 0.045, 0.92, 0.655]} />} nearFactor={2.2} nearBlur={3} />
    )} />
  </AbsoluteFill>
);

/* 2: Paris. A daguerreotype view of 1844 */
const Landscape: React.FC = () => (
  <ArchiveFinish push={0.0006} from={B2.from} blur={40} focus={[0.5, 0.45]} picture={(c) => <ArchivePhoto id={`land-${c}`} src={P('choiselat-landscape.jpg')} process="daguerreotype" position="68% 50%" zoom={1.08} />} dust={0} scan={0} vignette={0} />
);

const Reel: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: ARCHIVE.soot }}>
      {/* 1 -> 2: one push on a speed spike, cut on its fastest frame, on twos */}
      {f < B2.end && (
        <Posterize step={2}>
          <CurveCut start={CUT1.start} duration={CUT1.dur} scale={[1, 2.1]} pivot={[0.55, 0.27]}
            a={<Plate />} b={<AbsoluteFill style={{ transform: 'scale(0.645)', transformOrigin: '55% 27%' }}><Landscape /></AbsoluteFill>} />
        </Posterize>
      )}
      {f < B1.end && (
        <>
          <Dateline text="Boston, c. 1850" x={0.1} y={0.725} size={0.044} at={10} out={104} />
          <Develop lines={['Hold still.']} x={0.09} y={0.82} size={0.165} at={34} italic={[true]} out={104} />
        </>
      )}
      {f >= B2.from && f < B2.end && (
        <>
          <Scrim reach={0.55} strength={0.85} />
          <Dateline text="Paris, 1839" x={0.08} y={0.66} size={0.044} at={B2.from + 18} out={B2.end - 8} />
          <Develop lines={['France gives', 'photography', 'to the world.']} x={0.075} y={0.735} size={0.1} at={B2.from + 36} out={B2.end - 8} />
        </>
      )}

      {/* 3: window light on a sitter; how long the sitting took */}
      {f >= B3.from && f < B3.end && (
        <AbsoluteFill>
          <ArchiveFinish light={0.26} lightAngle={-28} blur={26} focus={[0.5, 0.22]} push={0} dust={0} scan={0} vignette={0} picture={(c) => (
            <ParallaxPlate id={`hodges-${c}`} process="daguerreotype" start={B3.from} duration={150} travel={0.03} rise={0.006} push={0.0007} zoom={1.0} origin="50% 18%"
              layers={[{ src: P('hodges-back.jpg'), factor: 0.6 }, { src: P('hodges-mid.png'), factor: 1 }]} />
          )} />
          <Scrim reach={0.42} strength={0.88} />
          <Line text="In the 1840s, one sitting could last" x={0.08} y={0.775} size={0.05} italic at={B3.from + 8} out={B3.end - 8} />
          <Develop lines={['a minute or more.']} x={0.075} y={0.85} size={0.115} at={B3.from + 30} out={B3.end - 8} />
        </AbsoluteFill>
      )}

      {/* 4: a standing sitter, and what held her */}
      {f >= B4.from && f < B4.end && (
        <AbsoluteFill>
          <ArchiveFinish blur={36} focus={[0.55, 0.4]} push={0} dust={0} scan={0} vignette={0} picture={(c) => (
            <ParallaxPlate id={`lace-${c}`} process="daguerreotype" start={B4.from} duration={140} travel={-0.03} rise={0} push={0.0008} zoom={1.05} origin="58% 35%"
              layers={[{ src: P('lace-back.jpg'), factor: 0.6 }, { src: P('lace-mid.png'), factor: 1 }]} />
          )} />
          <Scrim reach={0.42} strength={0.88} />
          <Line text="Iron stands, hidden behind them," x={0.08} y={0.765} size={0.05} italic at={B4.from + 8} out={B4.end - 8} />
          <Develop lines={['kept them still.']} x={0.075} y={0.84} size={0.115} at={B4.from + 28} out={B4.end - 8} />
          <Tag x={0.55} y={0.47} w={0.4} at={B4.from + 70} no="37.14.4" lines={['DAGUERREOTYPE', 'SOUTHWORTH & HAWES', 'BOSTON, c. 1850']} tilt={3} out={B4.end - 8} />
        </AbsoluteFill>
      )}

      {/* 5: Talbot's street; who is missing */}
      {f >= B5.from && f < B5.end && (
        <AbsoluteFill>
          <ArchiveFinish heavy push={0.0011} from={B5.from} pivot={[0.45, 0.5]} blur={42} focus={[0.45, 0.45]} dust={0} scan={0} vignette={0}
            picture={(c) => <ArchivePhoto id={`talbot-${c}`} src={P('talbot-paris.jpg')} process="salted" position="44% 50%" zoom={1.05} />} />
          <Scrim reach={0.5} strength={0.88} />
          <Dateline text="Paris, 1843" x={0.08} y={0.69} size={0.044} at={B5.from + 8} out={B5.end - 8} />
          <Develop lines={['Anyone who kept moving', 'barely left a trace.']} x={0.075} y={0.77} size={0.083} at={B5.from + 28} out={B5.end - 8} />
        </AbsoluteFill>
      )}

      {/* 6 -> 7: the album page, then the page turns onto Marville's street */}
      {f >= B6.from && (
        <Posterize step={f >= B6.turn && f < B6.end ? 4 : 1}>
          <PageTurn id="album-turn" start={B6.turn} duration={28} radius={70} paper={ARCHIVE.paper} corner="bottom-right"
            page={f < B6.end ? (
              <Toned id="album" process="albumen" grain={0.04} curve={0.15} fade={0.02}>
                <AlbumPage items={[
                  { src: P('plate-268310.jpg'), x: 0.1, y: 0.33, w: 0.37, h: 0.25, tilt: -1.5, label: 'No. 37.14.13' },
                  { src: P('plate-268334.jpg'), x: 0.53, y: 0.31, w: 0.37, h: 0.25, tilt: 1.2, label: 'No. 37.14.35' },
                  { src: P('plate-268315.jpg'), x: 0.3, y: 0.62, w: 0.4, h: 0.27, tilt: -0.6, label: 'No. 37.14.18' },
                ]}>
                  <Line text="Each daguerreotype was" x={0.5} y={0.11} size={0.055} italic align="center" color={ARCHIVE.ink} shadow={false} at={B6.from + 8} />
                  <Develop lines={['one of a kind.']} x={0.5} y={0.18} size={0.11} align="center" color={ARCHIVE.ink} shadow={false} at={B6.from + 26} />
                  <Line text="no negative · no copies" face="type" weight={700} x={0.5} y={0.255} size={0.034} align="center" color={ARCHIVE.stamp} shadow={false} at={B6.from + 52} />
                </AlbumPage>
              </Toned>
            ) : null}
            under={f >= B6.turn ? (
              <AbsoluteFill>
                <ArchiveFinish push={0.0009} from={B7.from} pivot={[0.5, 0.45]} blur={40} focus={[0.5, 0.42]} dust={0} scan={0} vignette={0}
                  picture={(c) => <ArchivePhoto id={`marville-${c}`} src={P('marville-constantine.jpg')} process="albumen" position="38% 50%" zoom={1.04} />} />
                <Scrim reach={0.52} strength={0.88} />
                <Dateline text="Paris, 1866" x={0.08} y={0.67} size={0.044} at={B6.end + 6} />
                <Develop lines={['One glass negative,', 'printed again', 'and again.']} x={0.075} y={0.745} size={0.095} at={B6.end + 24} />
              </AbsoluteFill>
            ) : null} />
        </Posterize>
      )}

      {/* the film over every beat */}
      <Dust strength={0.5} density={150} hairs={3} />
      <FilmScan strength={0.32} />
      <Vignette strength={0.85} />
      {/* fade from black and to black, like a reel's head and tail */}
      <AbsoluteFill style={{ background: '#000', opacity: Math.max(0, 1 - f / 8, (f - 884) / 16) }} />

      {/* sound */}
      <Sequence from={0} durationInFrames={900} layout="none"><Audio src={staticFile('sfx/score.wav')} volume={0.82} /></Sequence>
      <Sequence from={0} durationInFrames={900} layout="none"><Audio src={staticFile('sfx/projector.wav')} volume={0.4} /></Sequence>
      {sfx('shutter', 2, 0.6)}
      {Array.from({ length: 15 }, (_, i) => sfx(`key${i % 3}`, 10 + i, 0.32))}{sfx('bell', 26, 0.22)}
      {sfx('advance', CUT1.start + 4, 0.55)}{sfx('shutter', B2.from - 1, 0.7)}
      {Array.from({ length: 11 }, (_, i) => sfx(`key${i % 3}`, B2.from + 18 + i, 0.32))}
      {sfx('shutter', B3.from - 1, 0.7)}{sfx('rustle', B3.from + 6, 0.25)}
      {sfx('shutter', B4.from - 1, 0.7)}{sfx('rustle', B4.from + 70, 0.45)}{sfx('thud', B4.from + 71, 0.5)}
      {sfx('shutter', B5.from - 1, 0.7)}
      {Array.from({ length: 11 }, (_, i) => sfx(`key${i % 3}`, B5.from + 8 + i, 0.32))}
      {sfx('rustle', B6.from - 2, 0.5)}{sfx('thud', B6.from, 0.4)}
      {Array.from({ length: 6 }, (_, i) => sfx(`key${i % 3}`, B6.from + 52 + i * 3, 0.3))}
      {sfx('flick', B6.turn + 2, 0.8)}{sfx('rustle', B6.turn + 10, 0.4)}
      {Array.from({ length: 11 }, (_, i) => sfx(`key${i % 3}`, B6.end + 6 + i, 0.32))}
      {sfx('runout', 868, 0.5)}
    </AbsoluteFill>
  );
};

registerRoot(() => <Composition id="HoldStill" component={Reel} durationInFrames={900} fps={30} width={1080} height={1920} />);
