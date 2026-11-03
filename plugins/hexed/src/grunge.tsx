// The grunge slot: a texture laid over the finished picture. Procedural ones are drawn from the engine's noise;
// scans come in through `textures`. Every texture boils: every few frames it jumps to a new placement (and the
// procedural ones to a new pattern), as dust and paper do on a real gate or a rescanned print.

import React from 'react';
import { Image, Layer, Noise, Rect, gradientMap } from '@kinetographdev/core';
import type { BlendMode, Turbulence } from '@kinetographdev/core';
import { between, hash, pick, rng } from './rng.js';
import type { Rng } from './rng.js';

/** A scan to lay over the picture. `kind` picks how it blends (dust screens, paper multiplies, ...). A `surface`
 *  is expected high-passed (grit on mid grey, see the demo's textures), so overlay leaves the picture's tones alone.
 *  A `picture` is a whole image, not a texture: it comes in faintly as a double exposure. */
export interface Texture {
  src: string;
  /** a surface's unprocessed scan (grey, full tone): when given, the slot sometimes lays it on soft instead of as
   *  grit, a faint softLight wash where cracks and stains read as part of the print */
  raw?: string;
  kind: 'film' | 'paper' | 'print' | 'photo' | 'surface' | 'light' | 'picture';
}

export const PROCEDURAL = ['creases', 'stains', 'speckle', 'scratches', 'fibre', 'toner'] as const;
export type Procedural = (typeof PROCEDURAL)[number];

const BLENDS: Record<Texture['kind'], BlendMode[]> = {
  film: ['screen', 'multiply'],
  paper: ['multiply', 'softLight'],
  print: ['multiply', 'overlay'],
  photo: ['overlay', 'softLight'],
  surface: ['overlay', 'softLight', 'hardLight'],
  picture: ['screen', 'multiply', 'lighten'],
  light: ['screen', 'colorDodge'],
};

type Stops = [number, string][];
const map = (stops: Stops) => gradientMap({ stops: stops.map(([offset, color]) => ({ offset, color })) });

interface Props {
  gene: string;
  seed: number;
  k: number;
  textures: readonly Texture[];
  /** the frame, already held by the fps slot */
  frame: number;
  width: number;
  height: number;
}

export const Grunge: React.FC<Props> = ({ gene, seed, k, textures, frame, width, height }) => {
  if (gene === 'none' || k <= 0) return null;
  const r = rng(seed);
  const every = Math.round(between(r, 2, 5));
  const tick = Math.floor(frame / every);
  const hop = rng(hash(`${seed}:${tick}`));
  const hopSeed = hash(`${seed}:${tick}:pattern`);

  if (gene.startsWith('tex-')) {
    const tex = textures[Number(gene.slice(4))];
    if (!tex) return null;
    // soft or grit comes from a stream of its own, so the draws below land as they did before it existed
    const soft = !!tex.raw && rng(hash(`${seed}:soft`))() < 0.5;
    const blend = pick(r, BLENDS[tex.kind]);
    // a double exposure holds still and stays faint; textures jump with the boil
    const ghost = tex.kind === 'picture';
    const place = ghost ? r : hop;
    const scale = between(place, 1.05, 1.4);
    const opacity = ghost ? between(r, 0.25, 0.5) : between(r, 0.55, 0.95);
    return (
      <Layer blendMode={soft ? 'softLight' : blend} opacity={k * (soft ? opacity * 0.6 : opacity)}>
        <Layer x={width / 2 + between(place, -0.1, 0.1) * width} y={height / 2 + between(place, -0.1, 0.1) * height} scale={scale} rotation={ghost ? 0 : pick(hop, [0, 180])} origin="center">
          <Image src={soft ? tex.raw! : tex.src} x={-width / 2} y={-height / 2} width={width} height={height} fit="cover" />
        </Layer>
      </Layer>
    );
  }
  return <Procedural kind={gene as Procedural} r={r} hop={hop} seed={hopSeed} k={k} width={width} height={height} />;
};

const Procedural: React.FC<{ kind: Procedural; r: Rng; hop: Rng; seed: number; k: number; width: number; height: number }> = ({
  kind,
  r,
  hop,
  seed,
  k,
  width,
  height,
}) => {
  const noise = (turbulence: Omit<Turbulence, 'seed'>, stops: Stops, blend: BlendMode, opacity: number) => (
    <Layer blendMode={blend} opacity={opacity * k}>
      <Noise width={width} height={height} channels="gray" turbulence={{ ...turbulence, seed }} effects={[map(stops)]} />
    </Layer>
  );
  switch (kind) {
    // crumpled paper: the ridges of turbulence noise, cut thin and laid on in white
    case 'creases': {
      const w = between(r, 0.025, 0.05);
      return noise(
        { type: 'turbulence', baseFrequency: between(r, 0.0025, 0.006), numOctaves: 3 },
        [[0, '#ffffff'], [w * 0.5, '#d8d8d8'], [w, '#000000'], [1, '#000000']],
        'screen',
        between(r, 0.5, 0.85),
      );
    }
    // water and tea stains: big soft blotches, multiplied in brown
    case 'stains': {
      const ink = pick(r, ['#5a4632', '#3a3a2a', '#4a2a2a']);
      return noise({ type: 'fractalNoise', baseFrequency: between(r, 0.0015, 0.004), numOctaves: 4 }, [[0, ink], [0.35, '#d8d0c4'], [0.5, '#ffffff'], [1, '#ffffff']], 'multiply', between(r, 0.35, 0.7));
    }
    // dust: specks where fine noise peaks, in white or black
    case 'speckle': {
      const t = between(r, 0.86, 0.92);
      const white = r() < 0.6;
      const [a, b] = white ? ['#000000', '#ffffff'] : ['#ffffff', '#000000'];
      return noise({ type: 'fractalNoise', baseFrequency: between(r, 0.5, 0.9), numOctaves: 1 }, [[0, a], [t, a], [t + 0.01, b], [1, b]], white ? 'screen' : 'multiply', between(r, 0.4, 0.75));
    }
    // print fibre: noise stretched along one axis, soft
    case 'fibre':
      return noise({ type: 'fractalNoise', baseFrequency: [between(r, 0.004, 0.01), between(r, 0.15, 0.4)], numOctaves: 3 }, [[0, '#000000'], [0.5, '#808080'], [1, '#ffffff']], 'overlay', between(r, 0.15, 0.35));
    // photocopier toner: blotchy dark noise, hard cut, multiplied
    case 'toner': {
      const t = between(r, 0.2, 0.27);
      return noise({ type: 'fractalNoise', baseFrequency: between(r, 0.02, 0.06), numOctaves: 4 }, [[0, '#000000'], [t, '#000000'], [t + 0.08, '#ffffff'], [1, '#ffffff']], 'multiply', between(r, 0.25, 0.5));
    }
    // film scratches: a few thin vertical lines that move every boil
    case 'scratches': {
      const n = Math.round(between(hop, 2, 7));
      return (
        <Layer blendMode={pick(r, ['screen', 'multiply'] as BlendMode[])} opacity={k}>
          {Array.from({ length: n }, (_, i) => {
            const x = hop() * width;
            const top = hop() * height * 0.6;
            return <Rect key={i} x={x} y={top} width={between(hop, 0.6, 2.2)} height={height * between(hop, 0.3, 1)} fill={r() < 0.6 ? '#ffffffcc' : '#000000aa'} />;
          })}
        </Layer>
      );
    }
  }
};
