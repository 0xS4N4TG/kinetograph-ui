// The film's "wall of work" worlds: the grid and reel-wall components re-rendered with stills of our own renders
// (public/photos/w01-w29, grabbed from components/*/out and effects/*/out), in place of their stock photos.
//   node ../kinetograph-0.3.0/packages/cli/dist/cli.js render templates/inside/worlds.tsx --comp WorkSphere -o templates/inside/public/worlds/sphere.mp4
import React from 'react';
import { Composition, Sequence, registerRoot, staticFile } from 'remotion';
import { Layer, Rect, Text, Video } from '@kinetographdev/core';
import { Hexed, describe, roll } from '../../plugins/hexed/src/index.js';
import { MONO } from './kit.js';
import { BrushCanvas } from '@kinetographdev/p5-brush';
import { FPS, H, W } from '../../components/grids/kit.js';
import { Spherical, SPHERICAL_DURATION, sphericalDefaults, sphericalSchema } from '../../components/grids/spherical.js';
import { REEL_WALL_DURATION, ReelWall, reelWallDefaults, reelWallSchema } from '../../components/carousels/reel-wall.js';

const WORK = Array.from({ length: 29 }, (_, i) => `w${String(i + 1).padStart(2, '0')}.jpg`);
// the reel wall's cards are tall: lead with the portrait renders, then the rest
const TALL = ['w25.jpg', 'w26.jpg', 'w27.jpg', 'w28.jpg', 'w29.jpg', 'w23.jpg', 'w22.jpg', 'w24.jpg', 'w21.jpg', 'w18.jpg', 'w10.jpg', 'w08.jpg'];

// Hexed rolling looks over Blacksmith Scene (1893, public domain): a new seed every few frames, then it locks.
const ROLLS = [11, 23, 7, 42, 3, 58];
const ROLL_LEN = 7;
const HEX_LEN = 78;
const Seed: React.FC<{ seed: number }> = ({ seed }) => {
  const text = `#${seed}  ${describe(roll(seed), ['grunge']) || 'clean'}`;
  return (
    <Layer x={48} y={1080 - 84}>
      <Rect width={text.length * 22 * 0.62 + 28} height={40} radius={4} fill="#000000c0" />
      <Text font={MONO} size={22} weight={500} color="#fff" x={14} y={8}>{text}</Text>
    </Layer>
  );
};
export const HexedWorld: React.FC = () => (
  <>
    {ROLLS.map((seed, i) => {
      const last = i === ROLLS.length - 1;
      return (
        <Sequence key={seed} from={i * ROLL_LEN} durationInFrames={last ? HEX_LEN - i * ROLL_LEN : ROLL_LEN}>
          <Sequence from={-i * ROLL_LEN}>
            <Hexed seed={seed} off={['grunge']}>
              <Video src={staticFile('footage/blacksmith.mp4')} width={1920} height={1080} fit="cover" muted />
            </Hexed>
          </Sequence>
          <Seed seed={seed} />
        </Sequence>
      );
    })}
  </>
);

// p5.brush painting the "plugins" title card: watercolour washes bleed in, charcoal sketches a film frame round them,
// pencil hatching fills the shadows. Every stroke grows with the frame, redrawn from scratch (BrushCanvas reseeds).
const BRUSH_LEN = 90;
const grow = (f: number, a: number, b: number) => Math.min(1, Math.max(0, (f - a) / (b - a)));
const easeO = (p: number) => 1 - Math.pow(1 - p, 3);
export const BrushWorld: React.FC = () => (
  <BrushCanvas seed={7} background="#efe9dd" origin="top-left" draw={(b, f) => {
    // washes
    const washes: [number, number, number, string, number][] = [
      [700, 520, 330, '#E0261B', 0], [1180, 470, 260, '#1d2440', 8], [960, 640, 200, '#d9a441', 16],
    ];
    b.noStroke();
    for (const [x, y, r, c, d] of washes) {
      const p = easeO(grow(f, d, d + 24));
      if (p <= 0) continue;
      b.fill(c, 190);
      b.fillBleed(0.25);
      b.circle(x, y, r * p);
    }
    b.noFill();
    // charcoal film frame, drawn edge by edge
    b.set('charcoal', '#1b1714', 1.6);
    const fx = 380, fy = 230, fw = 1160, fh = 620;
    const edges: [number, number, number, number][] = [[fx, fy, fx + fw, fy], [fx + fw, fy, fx + fw, fy + fh], [fx + fw, fy + fh, fx, fy + fh], [fx, fy + fh, fx, fy]];
    edges.forEach(([x1, y1, x2, y2], i) => {
      const p = easeO(grow(f, 18 + i * 7, 30 + i * 7));
      if (p > 0) b.line(x1, y1, x1 + (x2 - x1) * p, y1 + (y2 - y1) * p);
    });
    // sprocket holes
    b.set('2B', '#1b1714', 1.1);
    for (let i = 0; i < 12; i++) {
      if (f < 40 + i * 2) continue;
      const x = fx + 30 + i * (fw - 60) / 11;
      b.rect(x - 14, fy - 52, 28, 30);
      b.rect(x - 14, fy + fh + 22, 28, 30);
    }
    // pencil hatching sweeping across the bottom
    b.set('HB', '#3a332c', 1);
    const hp = easeO(grow(f, 48, 80));
    for (let i = 0; i < 40 * hp; i++) {
      const x = fx + 20 + i * 28;
      b.line(x, fy + fh - 20, x + 60, fy + fh - 140);
    }
  }} />
);

registerRoot(() => (
  <>
    <Composition id="WorkSphere" component={Spherical} schema={sphericalSchema}
      defaultProps={{ ...sphericalDefaults, photos: WORK }} durationInFrames={SPHERICAL_DURATION} fps={FPS} width={W} height={H} />
    <Composition id="WorkWall" component={ReelWall} schema={reelWallSchema}
      defaultProps={{ ...reelWallDefaults, images: TALL.map((f) => `photos/${f}`), landOn: 2, labels: ['Krakatoa', 'Tokens', 'Collage', 'Anna', 'Rhythm', 'Halftone', 'Thermal', 'Fragments', 'Paper', 'Hexed', 'Devices', 'Globe'] }}
      width={1920} height={1080} fps={30} durationInFrames={REEL_WALL_DURATION} />
    <Composition id="HexedWorld" component={HexedWorld} durationInFrames={HEX_LEN} fps={30} width={1920} height={1080} />
    <Composition id="BrushWorld" component={BrushWorld} durationInFrames={BRUSH_LEN} fps={30} width={1920} height={1080} />
  </>
));
