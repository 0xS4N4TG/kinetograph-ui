// <MatchCut>: a keyword holds still, highlighted, while the page under it changes several times a second. Each cut is
// a made-up page set around the keyword (pages.ts) or one of your screenshots, its keyword box snapped to the ink
// (snap.ts); the frame pushes in, everything off the keyword's line goes soft, and the paper is the plugin's.
//
//   <MatchCut keyword="Super Bowl" preset="web" />
//   <MatchCut keyword="Super Bowl" screenshots={[{ src: 'shots/a.png', hint: [212, 1180, 388, 64] }]} everyNth={2} />
//
// Fills its composition (or Sequence) at the composition's size; every frame is a pure function of the props.

import React from 'react';
import { interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from '@kinetographdev/core';
import { Image, Layer, Path, Rect, Text, grain } from '@kinetographdev/core';
import { probeMedia } from '@kinetographdev/core/media-utils';
import { FACES, Paper, focus, screen } from './look.js';
import { PAGE_LAYOUTS, page, type Layout } from './pages.js';
import { snapBox, type Box } from './snap.js';
import { PRESETS } from '../presets/index.js';

/** A look: everything about a match cut but the keyword and the screenshots. Presets are these. */
export interface MatchCutLook {
  layouts: Layout[];
  cutsPerSecond: number;
  /** push-in by the last frame */
  zoom: number;
  /** the keyword's type size, a fraction of the frame's shorter side, and its line's height down the frame */
  keySize: number;
  anchorY: number;
  /** focus blur off the keyword's line (px), how much taller than wide it smears, and the sideways streak (px) */
  blur: number;
  smear: number;
  /** how many keyword-line heights out the blur reaches full strength */
  falloff: number;
  streak: number;
  /** paper: creases 0..1, a tint over the generated pages' own, a scan under public/ multiplied over */
  crumple: number;
  tint?: string;
  texture?: string;
  textureOpacity: number;
  grain: number;
  highlight: string;
  /** how far the keyword's size and place wander from cut to cut, 0..1 */
  wander: number;
  /** the page as a filmed screen: how much (0 off, 1 full), its pixel size (px) and the lens's barrel */
  screen: number;
  pixel: number;
  curve: number;
}

export const DEFAULT_LOOK: MatchCutLook = {
  layouts: [...PAGE_LAYOUTS],
  cutsPerSecond: 10,
  zoom: 1.5,
  keySize: 0.075,
  anchorY: 0.5,
  blur: 7,
  smear: 1,
  falloff: 6,
  streak: 14,
  crumple: 1,
  textureOpacity: 1,
  grain: 0.06,
  highlight: '#f6e04a',
  wander: 1,
  screen: 0,
  pixel: 6,
  curve: 0.05,
};

export interface Screenshot {
  /** under public/ */
  src: string;
  /** roughly where the keyword is, image pixels [x, y, w, h]; snapped to the ink unless `exact` */
  hint: Box;
  exact?: boolean;
}

export interface MatchCutProps {
  keyword: string;
  /** a look by name from presets/, under `look` */
  preset?: string;
  look?: Partial<MatchCutLook>;
  screenshots?: Screenshot[];
  /** a screenshot every nth cut (1: screenshots only); made-up pages between */
  everyNth?: number;
  /** another pile of made-up pages */
  seed?: number;
  /** draw the hint (blue) and the snapped box (red) on screenshots, to check them in a still */
  showKeyBox?: boolean;
  /** frames the push-in runs over; default the composition's */
  durationInFrames?: number;
}

/** A round-capped stroke; the engine draws `cap` and `join`, the Stroke type lacks them. */
const roundStroke = (color: string, width: number) => ({ color, width, cap: 'round', join: 'round' });

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** The cut showing at `frame`, for sound or for cutting to something else on a cut. */
export const cutOf = (frame: number, fps: number, cutsPerSecond: number) => Math.floor((frame * cutsPerSecond) / fps);

export const MatchCut: React.FC<MatchCutProps> = ({ keyword, preset, look: overrides, screenshots = [], everyNth = 3, seed = 0, showKeyBox, durationInFrames }) => {
  const frame = useCurrentFrame();
  const video = useVideoConfig();
  const [W, H] = [video.width, video.height];
  const look: MatchCutLook = { ...DEFAULT_LOOK, ...(preset ? (PRESETS[`match-cut/${preset}`] as Partial<MatchCutLook>) : {}), ...overrides };
  const n = cutOf(frame, video.fps, look.cutsPerSecond);
  const r = (k: string) => random(`${keyword}-${seed}-cut-${n}-${k}`);
  const push = interpolate(frame, [0, (durationInFrames ?? video.durationInFrames) - 1], [1, look.zoom], clamp);
  // the keyword's size and place wander a little from cut to cut, as they do when clippings are lined up by hand
  const base = Math.min(W, H) * look.keySize;
  const size = base * push * (1 + look.wander * (r('size') - 0.5) * 0.32);
  const ax = W / 2 + look.wander * (r('x') - 0.5) * W * 0.05;
  const ay = H * look.anchorY + look.wander * (r('y') - 0.5) * base * 0.25;

  const shot = screenshots.length > 0 && everyNth > 0 && n % everyNth === 0 ? screenshots[Math.floor(n / everyNth) % screenshots.length] : null;
  return (
    <Layer effects={look.grain > 0 ? [grain(look.grain, { seed: 7, animate: true, monochrome: true })] : []}>
      <Layer
        effects={[
          // the screen first: the camera's focus then softens its grid off the keyword's line, as filming one does
          ...(look.screen > 0 ? [screen(look.screen, look.pixel, look.curve, W, H)] : []),
          ...(look.blur > 0 || look.streak > 0 ? [focus(look.blur * push, look.smear, ay - size * 0.25, size * 1.1, look.falloff, ax, W * 0.3, look.streak)] : []),
        ]}
      >
        {shot ? (
          <ShotPage shot={shot} look={look} size={size} ax={ax} ay={ay} W={W} H={H} />
        ) : (
          <MadePage keyword={keyword} n={n} seed={seed} look={look} size={size} ax={ax} ay={ay} W={W} H={H} />
        )}
      </Layer>
      {shot && showKeyBox ? <KeyBoxes shot={shot} size={size} ax={ax} ay={ay} /> : null}
    </Layer>
  );
};

type Place = { look: MatchCutLook; size: number; ax: number; ay: number; W: number; H: number };

/** A made-up page, scaled about the keyword so its type comes up at `size` and its middle lands on ax. */
const MadePage: React.FC<Place & { keyword: string; n: number; seed: number }> = ({ keyword, n, seed, look, size, ax, ay, W, H }) => {
  // reach is in page pixels, so it needs the scale, which needs the keyword's size: lay out once without copy first
  const probe = page(keyword, n, { x: 0, y: 0 }, look.layouts, seed);
  const s = size / probe.key.size;
  const p = page(keyword, n, { x: W / s, y: H / s + 80 }, look.layouts, seed);
  const k = FACES[p.key.face];
  const ks = p.key.size;
  return (
    <Layer>
      {p.screen ? (
        // an app screen keeps its own background (light or dark mode) and is not paper
        <Rect width={W} height={H} fill={p.tint} />
      ) : (
        <Paper w={W} h={H} tint={look.tint ?? p.tint} seed={n + 1} crumple={look.crumple} texture={look.texture} textureOpacity={look.textureOpacity} />
      )}
      <Layer x={ax - (p.key.w * s) / 2} y={ay} scale={s}>
        {p.rules.map((r, i) => (
          <Rect key={`r${i}`} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.color} />
        ))}
        {p.shapes.map((r, i) => (
          <Rect key={`s${i}`} x={r.x} y={r.y} width={r.w} height={r.h} radius={r.r} fill={r.color} stroke={r.stroke ? { color: r.stroke, width: 2 } : undefined} />
        ))}
        {(p.paths ?? []).map((q, i) => (
          <Path
            key={`p${i}`}
            d={q.d}
            x={q.x}
            y={q.y}
            scale={q.scale}
            fill={q.fill}
            stroke={q.stroke ? (roundStroke(q.stroke, q.width ?? 2) as never) : undefined}
          />
        ))}
        {p.runs.map((r, i) => {
          const f = FACES[r.face];
          return (
            <Text key={i} font={f.family} weight={f.weight} fontStyle={f.style} size={r.size} lineHeight={1.2} color={r.color} x={r.x} y={r.y - f.base * r.size}>
              {r.text}
            </Text>
          );
        })}
        <Rect x={-ks * 0.1} y={-ks * (k.cap + 0.2)} width={p.key.w + ks * 0.2} height={ks * (k.cap + 0.44)} fill={look.highlight} />
        <Text font={k.family} weight={k.weight} fontStyle={k.style} size={ks} lineHeight={1.2} color={p.key.color} x={0} y={-k.base * ks}>
          {keyword}
        </Text>
      </Layer>
    </Layer>
  );
};

/** The screenshot's keyword box, snapped unless exact. */
function keyBox(shot: Screenshot): { box: Box; size: [number, number] } {
  const src = staticFile(shot.src);
  const { width, height } = probeMedia(src, { cache: true });
  return { box: shot.exact ? shot.hint : snapBox(src, shot.hint, [width, height]), size: [width, height] };
}

/** Where a screenshot goes: scaled so its keyword's ink is as tall as a made-up page's keyword would be, its middle on
 *  ax and its bottom on the baseline. */
function shotPlace(box: Box, size: number, ax: number, ay: number) {
  const s = (size * 0.8) / box[3];
  return { s, x: ax - (box[0] + box[2] / 2) * s, y: ay - (box[1] + box[3]) * s };
}

const ShotPage: React.FC<Place & { shot: Screenshot }> = ({ shot, look, size, ax, ay, W, H }) => {
  const { box, size: [iw, ih] } = keyBox(shot);
  const { s, x, y } = shotPlace(box, size, ax, ay);
  const pad = box[3] * 0.18;
  return (
    <Layer>
      <Paper w={W} h={H} tint={look.tint ?? '#efede6'} seed={1} crumple={0} />
      <Layer x={x} y={y} scale={s}>
        <Image src={staticFile(shot.src)} width={iw} height={ih} />
        <Layer blendMode="multiply">
          <Rect x={box[0] - pad} y={box[1] - pad} width={box[2] + pad * 2} height={box[3] + pad * 2} fill={look.highlight} />
        </Layer>
      </Layer>
      {look.crumple > 0 || look.texture ? (
        <Layer blendMode="multiply" opacity={0.6}>
          <Paper w={W} h={H} tint="#ffffff" seed={7} crumple={look.crumple} texture={look.texture} textureOpacity={look.textureOpacity} />
        </Layer>
      ) : null}
    </Layer>
  );
};

const KeyBoxes: React.FC<{ shot: Screenshot; size: number; ax: number; ay: number }> = ({ shot, size, ax, ay }) => {
  const { box } = keyBox(shot);
  const { s, x, y } = shotPlace(box, size, ax, ay);
  const at = (b: Box, color: string, key: string) => (
    <Rect key={key} x={x + b[0] * s} y={y + b[1] * s} width={b[2] * s} height={b[3] * s} stroke={{ color, width: 3 }} />
  );
  return (
    <Layer>
      {at(shot.hint, '#2f6bff', 'hint')}
      {at(box, '#ff2f2f', 'snap')}
    </Layer>
  );
};
