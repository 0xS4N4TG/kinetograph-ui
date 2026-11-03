// The reel's flat cards: the warning that shrinks away, the white collage of colour blocks, photos and editor
// panels, "So tell me" falling flat onto black, and the typewriter ending.

import React from 'react';
import { staticFile } from 'remotion';
import { Image, Layer, Rect, Text, linearGradient } from '@kinetographdev/core';
import { H, PAL, SANS, W, clamp, easeIn, easeOut, pick, prog, rnd, twos } from './lib.js';

/** A line of small text on black, shrinking to nothing over 18 frames. */
export const Warning: React.FC<{ l: number; text?: string }> = ({ l, text = 'epilepsy warning' }) => {
  const s = 1 - 0.9 * easeIn(clamp((l - 4) / 13));
  return (
    <Layer id="warning">
      <Rect width={W} height={H} fill="#000000" />
      <Text font={SANS} weight={400} size={34} color="#ffffff" x={0} y={H / 2 - 18} maxWidth={W} originX={0.5} originY={0.5} scale={s} align="center">
        {text}
      </Text>
    </Layer>
  );
};

const BLOCKS = [PAL.cyan, PAL.mint, PAL.orange, PAL.pink, PAL.yellow];
export const DEFAULT_PHOTOS = [
  'photo_enoshima_5.jpg',
  'photo_enoshima_20.jpg',
  'photo_enoshima_26.jpg',
  'photo_enoshima_31.jpg',
  'photo_enoshima_36.jpg',
  'photo_enoshima_42.jpg',
  'photo_enoshima_47.jpg',
  'photo_kokomae22_6.jpg',
  'photo_inamura_28.jpg',
  'photo_enoden_9.jpg',
  'photo_enoden_30.jpg',
];

/** A dark editor panel: a toolbar strip, or a colour picker with its hue bar, or a list of layer rows. */
const Panel: React.FC<{ kind: number; x: number; y: number; s: number; id: string }> = ({ kind, x, y, s, id }) => {
  if (kind === 0) {
    const icons = Array.from({ length: 16 }, (_, i) => (
      <Rect key={i} x={10 + i * 15} y={6} width={9} height={9} radius={2} fill={i === 1 ? '#3b8bff' : '#9aa0aa'} />
    ));
    return (
      <Layer id={id} x={x} y={y} scale={s}>
        <Rect width={420} height={22} radius={3} fill="#22252b" />
        {icons}
        <Rect x={300} y={6} width={60} height={9} radius={2} fill="#5a5f69" />
      </Layer>
    );
  }
  if (kind === 1) {
    return (
      <Layer id={id} x={x} y={y} scale={s}>
        <Rect width={250} height={180} radius={4} fill="#1d2025" />
        <Rect x={8} y={8} width={234} height={12} fill="#2b2f36" />
        <Rect x={10} y={28} width={150} height={140} fill={linearGradient(['#ffffff', '#1e8bff'], { angle: 90 })} />
        <Rect x={10} y={28} width={150} height={140} fill={linearGradient(['#00000000', '#000000'], { angle: 180 })} />
        <Rect x={166} y={28} width={12} height={140} fill={linearGradient(['#ff0000', '#ff00ff', '#0000ff', '#00ffff', '#00ff00', '#ffff00', '#ff0000'])} />
        <Rect x={186} y={30} width={30} height={30} fill="#ffffff" />
        <Rect x={186} y={64} width={30} height={30} fill="#eaf4ff" />
        {Array.from({ length: 6 }, (_, i) => (
          <Rect key={i} x={186} y={102 + i * 11} width={50} height={6} radius={2} fill="#4a4f58" />
        ))}
      </Layer>
    );
  }
  const rows = Array.from({ length: 7 }, (_, i) => (
    <Layer key={i} id={`${id}-r${i}`} x={8} y={24 + i * 13}>
      <Rect width={8} height={8} fill={i === 2 ? '#3b8bff' : '#6b717c'} />
      <Rect x={14} width={70 + ((i * 37) % 50)} height={7} radius={2} fill="#8c929c" />
      <Rect x={190} width={50} height={7} radius={2} fill="#3b8bff" opacity={0.7} />
    </Layer>
  ));
  return (
    <Layer id={id} x={x} y={y} scale={s}>
      <Rect width={300} height={120} radius={4} fill="#1b1e23" />
      <Rect x={8} y={6} width={120} height={10} radius={2} fill="#3b8bff" opacity={0.85} />
      {rows}
    </Layer>
  );
};

/** The collage, 63 frames: colour blocks flash on white, then photos and editor panels pile up and drift upward. */
export const Collage: React.FC<{ l: number; photos?: string[] }> = ({ l, photos = DEFAULT_PHOTOS }) => {
  const t = twos(l);
  const blocks: React.ReactNode[] = [];
  // flashing blocks: a few at a time, re-rolled every other frame, the whole way through
  const nb = l < 14 ? 3 + Math.floor(l / 4) : 5;
  for (let i = 0; i < nb; i++) {
    const k = `blk${i}-${t}`;
    const w = 60 + rnd(`${k}w`) * 260;
    const h = 30 + rnd(`${k}h`) * 170;
    blocks.push(<Rect key={i} x={rnd(`${k}x`) * (W - w)} y={rnd(`${k}y`) * (H - h)} width={w} height={h} fill={pick(BLOCKS, `${k}c`)} />);
    if (rnd(`${k}bar`) < 0.4) {
      blocks.push(<Rect key={`b${i}`} x={rnd(`${k}bx`) * W - 200} y={rnd(`${k}by`) * H} width={500 + rnd(`${k}bw`) * 400} height={14 + rnd(`${k}bh`) * 18} fill={pick(BLOCKS, `${k}bc`)} />);
    }
  }
  // the pile, in stop motion: every few frames (irregularly, as the reference holds and jumps) the column
  // jumps up a notch and a piece or two snaps in at once, with no easing in between
  const pile: React.ReactNode[] = [];
  let steps = 0;
  for (let k = 10; k <= l; k++) if (rnd(`jump${k}`) < 0.4) steps++;
  const scroll = -steps * 46;
  const count = l < 10 ? 0 : clamp(2 + Math.floor(steps * 1.4), 0, 30);
  for (let i = 0; i < count; i++) {
    const y = 180 + i * 64 + scroll;
    const x = 380 + (rnd(`px${i}`) - 0.5) * 560;
    const pop = 1;
    if (i % 4 === 3) {
      pile.push(<Panel key={i} id={`panel${i}`} kind={i % 3} x={x - 120} y={y} s={(1.3 + rnd(`ps${i}`) * 0.6) * pop} />);
    } else {
      const w = 300 + rnd(`pw${i}`) * 150;
      pile.push(<Image key={i} src={staticFile(photos[i % photos.length])} x={x} y={y} width={w * pop} height={w * 0.62 * pop} fit="cover" />);
    }
  }
  return (
    <Layer id="collage">
      <Rect width={W} height={H} fill={PAL.white} />
      <Layer id="pile" x={W * 0.12}>
        {pile}
      </Layer>
      {blocks}
    </Layer>
  );
};

const Corners: React.FC<{ a: string; b: string }> = ({ a, b }) => (
  <>
    <Text font={SANS} weight={400} size={14} color="#d8d8d8" x={36} y={28}>
      {a}
    </Text>
    <Text font={SANS} weight={400} size={14} color="#d8d8d8" x={36} y={28} maxWidth={W - 72} align="right">
      {b}
    </Text>
    <Text font={SANS} weight={400} size={14} color="#d8d8d8" x={36} y={H - 46}>
      {b}
    </Text>
    <Text font={SANS} weight={400} size={14} color="#d8d8d8" x={36} y={H - 46} maxWidth={W - 72} align="right">
      {a}
    </Text>
  </>
);

/** "So tell me", 21 frames: drops in big and tilted, lands flat in the middle, shrinks, then goes. */
export const Tell: React.FC<{ l: number; text?: string; corners?: [string, string] }> = ({ l, text = 'So tell me', corners = ['Get Your Wish', "let's go to Mirai"] }) => {
  const land = easeOut(prog(l, 1, 7, (v) => v));
  const shown = l >= 1 && l < 15;
  const scale = (2.6 - 1.6 * land) * (1 - 0.18 * prog(l, 8, 15));
  return (
    <Layer id="tell">
      <Rect width={W} height={H} fill="#000000" />
      {l >= 1 && <Corners a={corners[0]} b={corners[1]} />}
      {shown && (
        <Text
          font={SANS}
          weight={400}
          size={64}
          color="#ffffff"
          x={260 * (1 - land)}
          y={H / 2 - 40 + 300 * (1 - land)}
          maxWidth={W}
          align="center"
          originX={0.5}
          originY={0.5}
          scale={scale}
          rotation={-22 * (1 - land)}
          rotateX={40 * (1 - land)}
          rotateY={-30 * (1 - land)}
        >
          {text}
        </Text>
      )}
    </Layer>
  );
};

// What the ending types, with the frame (from the cut) each step starts on: type, pause, delete, type.
function typed(a: string, b: string): [number, string][] {
  const steps: [number, string][] = [];
  let f = 1;
  for (let i = 1; i <= a.length; i++, f += 0.95) steps.push([Math.round(f), a.slice(0, i)]);
  f += 7;
  for (let i = a.length - 1; i >= 1; i--, f += 0.2) steps.push([Math.round(f), a.slice(0, i)]);
  f += 1;
  for (let i = 2; i <= b.length; i++, f += 0.95) steps.push([Math.round(f), b.slice(0, i)]);
  return steps;
}

/** The typewriter ending on black, with a blinking cursor. */
export const Typewriter: React.FC<{ l: number; lines?: [string, string] }> = ({ l, lines = ["IT'S MY BIRTHDAY", 'I TURNED 20 TODAY ^_^'] }) => {
  const TYPED = typed(lines[0], lines[1]);
  let text = '';
  for (const [f, s] of TYPED) if (l >= f) text = s;
  const lastStep = TYPED.reduce((m, [f]) => (f <= l ? f : m), 0);
  const typing = l - lastStep < 6;
  const cursor = typing || Math.floor(l / 15) % 2 === 0;
  return (
    <Layer id="type">
      <Rect width={W} height={H} fill="#000000" />
      {l >= 1 && (
        <Text font={SANS} weight={400} size={40} color="#ffffff" x={0} y={H / 2 - 24} maxWidth={W} align="center">
          {text + (cursor ? '|' : ' ')}
        </Text>
      )}
    </Layer>
  );
};
