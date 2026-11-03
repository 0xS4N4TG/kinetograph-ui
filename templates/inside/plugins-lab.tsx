// Scratch compositions for building plugins.tsx (seed sheets, test stills). Not part of the film.
import React from 'react';
import { AbsoluteFill, Composition, Freeze, registerRoot, staticFile } from 'remotion';
import { Layer, Rect, Text, Video } from '@kinetographdev/core';
import { Hexed, describe, roll } from '../../plugins/hexed/src/index.js';
import type { Slot } from '../../plugins/hexed/src/index.js';
import { MONO } from './kit.js';
import { BrushCanvas } from '@kinetographdev/p5-brush';
import { gradientMap } from '@kinetographdev/core';
import contours from './track/smith-contours.json' with { type: 'json' };

type Poly = { fig: number; pts: number[][] };
const C = contours as { anvil: number[][]; frames: Poly[][] };
const TONE = [{ offset: 0, color: '#060708' }, { offset: 0.5, color: '#7d766b' }, { offset: 1, color: '#fff2dc' }];
const INKS = ['#e8321e', '#1e3fd0', '#f2b81c'];

export const BrushTest: React.FC<{ blend: string; at: number }> = ({ blend, at }) => (
  <AbsoluteFill style={{ backgroundColor: '#000' }}>
    <Layer effects={[gradientMap({ stops: TONE })]}>
      <Freeze frame={at}><Video src={staticFile('footage/blacksmith.mp4')} width={W} height={H} fit="cover" muted /></Freeze>
    </Layer>
    <Layer blendMode={blend as any}>
      <BrushCanvas seed={3} origin="top-left" draw={(b) => {
        const polys = C.frames[at]!;
        b.noStroke();
        for (const p of polys) {
          b.fill(INKS[p.fig]!, 210);
          b.fillBleed(0.06);
          b.fillTexture(0.5, 0.6);
          b.polygon(p.pts);
        }
        b.fill('#ff7a1a', 200); b.fillBleed(0.2); b.polygon(C.anvil);
        b.noFill();
        b.set('charcoal', '#fff2dc', 2.2);
        for (const p of polys) { b.beginShape(0.3); for (const [x, y] of p.pts) b.vertex(x!, y!); b.endShape(true); }
      }} />
    </Layer>
  </AbsoluteFill>
);

const W = 1920, H = 1080;
const COLS = 5, ROWS = 4, GAP = 10;
const CW = (W - GAP * (COLS + 1)) / COLS, CH = (H - GAP * (ROWS + 1)) / ROWS;

export const Sheet: React.FC<{ first: number; at: number; off: Slot[] }> = ({ first, at, off }) => (
  <AbsoluteFill style={{ backgroundColor: '#111' }}>
    {Array.from({ length: COLS * ROWS }, (_, i) => {
      const seed = first + i;
      const x = GAP + (i % COLS) * (CW + GAP), y = GAP + Math.floor(i / COLS) * (CH + GAP);
      return (
        <Layer key={i} x={x} y={y}>
          <Freeze frame={at}>
            <Hexed seed={seed} off={off} width={CW} height={CH} at={[x, y]}>
              <Video src={staticFile('footage/blacksmith.mp4')} width={CW} height={CH} fit="cover" muted />
            </Hexed>
          </Freeze>
          <Rect y={CH - 24} width={CW} height={24} fill="#000000b0" />
          <Text font={MONO} size={12} color="#fff" x={6} y={CH - 19}>{`#${seed} ${describe(roll(seed), off)}`}</Text>
        </Layer>
      );
    })}
  </AbsoluteFill>
);

registerRoot(() => (
  <>
    <Composition id="Sheet" component={Sheet} durationInFrames={1} fps={30} width={W} height={H} defaultProps={{ first: 1, at: 40, off: ['grunge'] as Slot[] }} />
    <Composition id="BrushTest" component={BrushTest} durationInFrames={1} fps={30} width={W} height={H} defaultProps={{ blend: 'normal', at: 42 }} />
  </>
));
