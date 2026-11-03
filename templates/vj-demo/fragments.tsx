// The vj plugin's `<Fragments>`: pieces of seven clips seen through detector boxes, tiles of sky and round holes, each
// on its own plane, with a camera flying through them. The colour clips are links to the wish reel's footage, the
// black-and-white ones the archive film of the other vj demos. `Inspect` shows one piece whole with its box ids and a
// grid, the view the boxes were named and placed from.
//
//   node ../kinetograph/packages/cli/dist/cli.js render templates/vj-demo/fragments.tsx --comp Fragments -o templates/vj-demo/out/fragments.mp4

import React from 'react';
import { AbsoluteFill, Composition, interpolate, registerRoot, staticFile, useCurrentFrame } from 'remotion';
import { makeGoogleFont } from '@kinetographdev/core/google-fonts';
import { Fragments, type BlobTrack, type CameraKey, type Piece, type PointTrack, type Spot } from '../../plugins/vj/src/index.js';
import smithBlobs from './track/blacksmith-blobs.json' with { type: 'json' };
import kid1 from './track/fragments/shops-kid1.json' with { type: 'json' };
import kid2 from './track/fragments/shops-kid2.json' with { type: 'json' };
import walker from './track/fragments/shops-walker.json' with { type: 'json' };
import red from './track/fragments/shops-red.json' with { type: 'json' };
import stall from './track/fragments/shops-stall.json' with { type: 'json' };
import dark from './track/fragments/shops-dark.json' with { type: 'json' };
import p1 from './track/fragments/walkway-p1.json' with { type: 'json' };
import p2 from './track/fragments/walkway-p2.json' with { type: 'json' };
import p3 from './track/fragments/walkway-p3.json' with { type: 'json' };

const W = 1920;
const H = 1080;
const FPS = 30;
const DUR = 240;
const SANS = makeGoogleFont('Inter').loadFont('normal', { weights: ['600'] }).fontFamily;

const tr = (t: unknown) => t as PointTrack;
// boxes read off `Inspect` at frame 0 (clip pixels), each moved by a tools/track.mjs track of a patch inside it
const shops: Spot[] = [
  { label: 'person', box: [500, 740, 150, 340], track: tr(kid1) },
  { label: 'backpack', box: [545, 790, 75, 110], track: tr(kid1), from: 8 },
  { label: 'person', box: [640, 700, 160, 370], track: tr(kid2), from: 4 },
  { label: 'backpack', box: [680, 760, 90, 120], track: tr(kid2), from: 14 },
  { label: 'person', box: [140, 630, 100, 190], track: tr(walker), from: 10 },
  { label: 'person', box: [395, 650, 80, 190], track: tr(red), from: 6 },
  { label: 'person', box: [1035, 640, 100, 150], track: tr(stall), from: 12 },
  { label: 'person', box: [1280, 620, 160, 460], track: tr(dark), from: 2 },
];
const walkway: Spot[] = [
  { label: 'person', box: [405, 595, 80, 290], track: tr(p1) },
  { label: 'person', box: [490, 595, 80, 280], track: tr(p2), from: 5 },
  { label: 'person', box: [560, 595, 70, 270], track: tr(p3), from: 9 },
];
const veteran: Spot[] = [
  { label: 'person', box: [0, 280, 400, 800] },
  { label: 'person', box: [600, 280, 420, 800], from: 6 },
  { label: 'person', box: [1040, 220, 480, 860], from: 3 },
  { label: 'person', box: [1520, 160, 400, 920], from: 9 },
  { label: 'person', box: [420, 300, 160, 200], from: 14 },
  { label: 'tie', box: [160, 730, 80, 50], from: 18 },
  { label: 'tie', box: [1240, 620, 60, 100], from: 20 },
];
const platform: Spot[] = [
  { label: 'person', box: [815, 585, 90, 240] },
  { label: 'traffic light', box: [895, 290, 50, 70], from: 6 },
  { label: 'traffic light', box: [1270, 350, 70, 150], from: 10 },
];

export const PIECES: Piece[] = [
  { src: 'shops.mp4', width: 1440, height: 1080, at: [-350, 250, 1.4], size: 0.7, rate: 0.6, loop: true, show: [{ spots: shops }] },
  { src: 'walkway.mp4', width: 1440, height: 1080, at: [450, -150, 1.0], size: 0.7, rate: 0.5, loop: true, show: [{ spots: walkway }] },
  { src: 'shrine.mp4', width: 1440, height: 1080, at: [-200, -350, 2.7], size: 0.8, rate: 0.5, loop: true, from: 40, until: 200, pop: 10,
    show: [{ dots: 70, radius: [14, 40], drift: 18 }] },
  { src: 'rocks.mp4', width: 1440, height: 1080, at: [0, 0, 3.4], size: 1.1, rate: 0.4, loop: true, from: 150,
    show: [{ tiles: [[280, 60, 560, 250], [840, 0, 380, 330], [560, 310, 280, 120], [1000, 330, 220, 110]], stagger: 5 }] },
  { src: 'blacksmith.mp4', at: [550, 200, 2.2], size: 0.8, rate: 0.6, loop: true, from: 20,
    show: [{ boxes: smithBlobs as BlobTrack, labels: { 6: 'person', 7: 'person', 12: 'person', 17: 'person' }, only: true }] },
  { src: 'veteran.mp4', at: [-1050, -150, 3.0], size: 0.75, rate: 0.6, loop: true, until: 186, show: [{ spots: veteran }] },
  { src: 'platform.mp4', width: 1440, height: 1080, at: [650, -250, 1.9], size: 0.6, rate: 0.6, loop: true, from: 30, show: [{ spots: platform }] },
].map((p) => ({ ...p, src: staticFile(p.src) }) as Piece);

const CAMERA: CameraKey[] = [{ frame: 0, x: -100, z: 0 }, { frame: 120, x: 150, y: -40, z: 1.3 }, { frame: DUR - 1, x: 0, z: 2.6 }];

/** The line over the middle of the flight, its second row spread to the width of the first. */
const Line: React.FC = () => {
  const f = useCurrentFrame();
  const o = interpolate(f, [100, 108, 168, 176], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (o <= 0) return null;
  const row = { display: 'flex', justifyContent: 'space-between', width: 540 } as const;
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: o, fontFamily: SANS, fontWeight: 600, fontSize: 64,
      lineHeight: 1, letterSpacing: '-0.03em', color: '#fff', textShadow: '0 0 12px rgba(0,0,0,0.6)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={row}><span>i</span><span>only</span><span>kept</span></div>
        <div style={row}><span>the</span><span>small</span><span>parts</span></div>
      </div>
    </AbsoluteFill>
  );
};

const Film: React.FC = () => (
  <AbsoluteFill style={{ background: '#000' }}>
    <Fragments pieces={PIECES} camera={CAMERA} />
    <Line />
  </AbsoluteFill>
);

const Inspect: React.FC<{ piece: number }> = ({ piece }) => (
  <AbsoluteFill style={{ background: '#000' }}>
    <Fragments pieces={PIECES} inspect={piece} />
  </AbsoluteFill>
);

registerRoot(() => (
  <>
    <Composition id="Fragments" component={Film} durationInFrames={DUR} fps={FPS} width={W} height={H} />
    <Composition id="Inspect" component={Inspect} durationInFrames={DUR} fps={FPS} width={W} height={H} defaultProps={{ piece: 0 }} />
  </>
));
