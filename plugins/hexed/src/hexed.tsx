// Hexed: wraps any picture and rolls a look onto it from eleven slots: crop, shake, fps, time, mirror, isolate,
// grade, screen, optics, damage and grunge. A seed picks a gene per slot; a lock pins a slot while the others reroll; `off` turns
// slots off; `adjust` sets the global exposure, shadows, contrast, saturation, hue, sharpen and invert over the whole look.
// The rolled look is a Genome, plain JSON, so it saves as a preset and plays back exactly. Every control is a
// prop, so the studio's props panel, an agent and code all drive it the same way.

import React from 'react';
import { Layer, Rect, colorGrade, hueRotate, invert, useCurrentFrame, useVideoConfig } from '@kinetographdev/core';
import type { Effect } from '@kinetographdev/core';
import { POOLS, SLOTS } from './genes.js';
import type { EffectSlot, Gene, Slot } from './genes.js';
import { Grunge, PROCEDURAL } from './grunge.js';
import type { Texture } from './grunge.js';
import { CROP, FPS, SHAKE } from './motion.js';
import { sharpen } from './shaders.js';
import type { Box } from './shaders.js';
import { TIME, TimeLayers, remap } from './time.js';
import { PRESETS } from '../presets/index.js';
import { rng } from './rng.js';
import { rollGenome } from './roll.js';
import type { Genome, Lock, Strand } from './roll.js';

export type { Genome, Lock, Strand };

/** The global controls, laid over everything. Numbers are -100..100 except hue, in degrees. */
export interface Adjust {
  exposure?: number;
  shadows?: number;
  highlights?: number;
  contrast?: number;
  saturation?: number;
  temperature?: number;
  hue?: number;
  /** 0..100 */
  sharpen?: number;
  invert?: boolean;
}

/** Every gene id a slot can roll, "none" first. */
export function genesOf(slot: Slot, textures: readonly Texture[] = []): string[] {
  switch (slot) {
    case 'crop':
      return CROP.map((g) => g.id);
    case 'shake':
      return SHAKE.map((g) => g.id);
    case 'fps':
      return FPS.map((g) => g.id);
    case 'time':
      return [...TIME];
    case 'grunge':
      return ['none', ...PROCEDURAL, ...textures.map((_, i) => `tex-${i}`)];
    default:
      return POOLS[slot].map((g) => g.id);
  }
}

/** Rolls a genome from a seed. Locked slots keep what the lock says; the rest roll fresh. */
export function roll(seed: number, lock: Partial<Record<Slot, Lock>> = {}, textures: readonly Texture[] = []): Genome {
  return rollGenome(seed, lock, (slot) => genesOf(slot, textures));
}

export interface HexedProps {
  children: React.ReactNode;
  /** the roll; ignored when `genome` is given */
  seed?: number;
  /** slots to hold while the seed changes */
  lock?: Partial<Record<Slot, Lock>>;
  /** a saved look; wins over seed and lock */
  genome?: Genome;
  /** a saved look by name, from presets/ (tools/save-preset.mjs writes them); wins over seed and lock */
  preset?: string;
  /** slots switched off */
  off?: Slot[];
  /** 0..1 over the whole look */
  amount?: number;
  /** 0..1 per slot, on top of the genome's own amounts */
  amounts?: Partial<Record<Slot, number>>;
  /** the order the effect slots run in */
  order?: EffectSlot[];
  /** scans the grunge slot picks from, beside its procedural textures */
  textures?: readonly Texture[];
  adjust?: Adjust;
  /** the picture's size; default the composition's */
  width?: number;
  height?: number;
  /** where the picture's top-left corner sits on the canvas, for the passes that read by position (mirror,
   *  streaks, slices); default [0, 0], right when Hexed fills the frame */
  at?: [number, number];
}

export const Hexed: React.FC<HexedProps> = ({
  children,
  seed = 1,
  lock,
  genome,
  preset,
  off = [],
  amount = 1,
  amounts = {},
  order = ['mirror', 'isolate', 'grade', 'screen', 'optics', 'damage'],
  textures = [],
  adjust = {},
  at = [0, 0],
  ...size
}) => {
  const frame = useCurrentFrame();
  const video = useVideoConfig();
  const width = size.width ?? video.width;
  const height = size.height ?? video.height;
  const g = genome ?? (preset ? PRESETS[preset] : undefined) ?? roll(seed, lock, textures);
  const on = (slot: Slot) => !off.includes(slot) && g[slot].gene !== 'none';
  const strength = (slot: Slot) => (on(slot) ? Math.max(0, Math.min(1, g[slot].amount * amount * (amounts[slot] ?? 1))) : 0);

  // fps: the frame everything inside shows
  const fps = FPS.find((x) => x.id === g.fps.gene);
  const timed = remap(g.time.gene, g.time.seed, strength('time'), frame);
  const held = fps && strength('fps') > 0 ? fps.hold(rng(g.fps.seed), timed, g.fps.seed) : timed;
  const box: Box = [at[0], at[1], width, height];

  // crop and shake: one transform about the centre
  const crop = (CROP.find((x) => x.id === g.crop.gene) ?? CROP[0]).frame(strength('crop'), rng(g.crop.seed));
  const shakeGene = SHAKE.find((x) => x.id === g.shake.gene) ?? SHAKE[0];
  const shake = shakeGene.at(strength('shake'), rng(g.shake.seed), held, g.shake.seed);

  // the effect slots, in order; a crossfade gene splits the chain there
  const stages: { effects: Effect[]; crossfade?: number }[] = [{ effects: [] }];
  const post: Effect[] = [];
  for (const slot of order) {
    const strand = g[slot];
    const gene: Gene | undefined = POOLS[slot].find((x) => x.id === strand.gene);
    const k = strength(slot);
    if (!gene || k <= 0) continue;
    // a colour grade lays its vignette, grain and CRT bend on a box; give it the picture's, not the canvas's
    const effects = gene
      .effects(k, rng(strand.seed), { seed: strand.seed, box })
      .map((e) => (e.type === 'colorGrade' && !e.box ? { ...e, box: [0, 0, width, height] as [number, number, number, number] } : e));
    if (gene.post) post.push(...effects);
    else if (gene.crossfade) stages.push({ effects, crossfade: k }, { effects: [] });
    else stages[stages.length - 1].effects.push(...effects);
  }

  // build from the inside out: each stage wraps the picture so far
  let picture: React.ReactNode = children;
  for (const stage of stages) {
    if (stage.crossfade !== undefined) {
      picture = (
        <Layer>
          {picture}
          <Layer opacity={stage.crossfade} effects={stage.effects}>
            {picture}
          </Layer>
        </Layer>
      );
    } else if (stage.effects.length) {
      picture = <Layer effects={stage.effects}>{picture}</Layer>;
    }
  }

  const bars = (crop.bars * height) / 2;
  const sides = (crop.sides * width) / 2;
  return (
    <Layer clip={{ kind: 'path', d: `M0 0H${width}V${height}H0Z` }} effects={[...post, ...globals(adjust, box)]}>
      <Rect width={width} height={height} fill="#000" />
      <Layer
        x={width / 2 + (crop.dx + shake.dx) * width}
        y={height / 2 + (crop.dy + shake.dy) * height}
        scale={crop.zoom * shake.zoom}
        rotation={crop.rotation + shake.rotation}
        origin="center"
      >
        <Layer x={-width / 2} y={-height / 2}>
          <TimeLayers gene={on('time') ? g.time.gene : 'none'} seed={g.time.seed} k={strength('time')} frame={held} width={width} height={height} picture={picture} />
        </Layer>
      </Layer>
      <Grunge gene={on('grunge') ? g.grunge.gene : 'none'} seed={g.grunge.seed} k={strength('grunge')} textures={textures} frame={held} width={width} height={height} />
      {bars > 0 && (
        <>
          <Rect width={width} height={bars} fill="#000" />
          <Rect y={height - bars} width={width} height={bars} fill="#000" />
        </>
      )}
      {sides > 0 && (
        <>
          <Rect width={sides} height={height} fill="#000" />
          <Rect x={width - sides} width={sides} height={height} fill="#000" />
        </>
      )}
    </Layer>
  );
};

function globals(a: Adjust, box: Box): Effect[] {
  const out: Effect[] = [];
  const n = (v: number | undefined) => (v ?? 0) / 100;
  const adjust = {
    exposure: n(a.exposure) * 2,
    shadows: n(a.shadows),
    highlights: n(a.highlights),
    contrast: n(a.contrast),
    saturation: n(a.saturation),
    temperature: n(a.temperature),
  };
  if (Object.values(adjust).some((v) => v !== 0)) out.push(colorGrade({ adjust, box }));
  if (a.sharpen) out.push(sharpen(box, a.sharpen / 25));
  if (a.hue) out.push(hueRotate(a.hue));
  if (a.invert) out.push(invert(1));
  return out;
}

/** A one-line name for a genome: the genes that play, in panel order. */
export function describe(g: Genome, off: Slot[] = []): string {
  return SLOTS.filter((s) => g[s].gene !== 'none' && !off.includes(s))
    .map((s) => g[s].gene)
    .join(' · ');
}
