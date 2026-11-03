// The wish style as a component: an 18 s edit timed to its reference, with every shot taking its footage from
// a prepared clip (tools/prepare.mjs) instead of from this reel. The looks anchor everything to each clip's
// tracked camera and vanishing point, so they sit on any handheld footage.
//
//   WishStyle  the edit, given five clips (one per look), photos for the collage and the words
//   filterClips  five windows of one long clip, to run the whole style over a single video

import React from 'react';
import { Sequence, useCurrentFrame } from 'remotion';
import { Layer, Rect, shader } from '@kinetographdev/core';
import { H, PAL, RAINBOW, W, ZOOM, pick, rnd, twos, vpOf } from './lib.js';
import type { Clip } from './lib.js';
import { TitleLook } from './street.js';
import { RaysLook } from './walk.js';
import { Collage, Tell, Typewriter, Warning } from './titles.js';
import { FramedLook, HelixShot, StormLook, TunnelLook } from './scenes.js';

export interface StyleProps extends Record<string, unknown> {
  clips: { rays: Clip; title: Clip; storm: Clip; tunnel: Clip; framed: Clip };
  photos?: string[];
  warning?: string;
  title?: string;
  titleSub?: string;
  tell?: string;
  corners?: [string, string];
  lines?: [string, string];
}

/** How long each look runs, in frames (30 fps), from the reference. */
export const LOOK_LENGTHS = { rays: 33, title: 40, storm: 63, tunnel: 60, framed: 21 };

/** A shot: its children get the shot's own frame. */
const At: React.FC<{ from: number; len: number; name: string; children: (l: number) => React.ReactNode }> = ({ from, len, name, children }) => (
  <Sequence from={from} durationInFrames={len} name={name}>
    <Local render={children} />
  </Sequence>
);
const Local: React.FC<{ render: (l: number) => React.ReactNode }> = ({ render }) => <>{render(useCurrentFrame())}</>;

const White: React.FC = () => <Rect width={W} height={H} fill="#ffffff" />;

/** White with a few coloured streaks, between the storm and the helix. */
const Streaks: React.FC<{ l: number }> = ({ l }) => (
  <Layer id="streaks">
    <Rect width={W} height={H} fill={PAL.white} />
    {Array.from({ length: 9 }, (_, i) => (
      <Rect key={i} x={520 + rnd(`st${i}-${twos(l)}`) * 260} y={430 + i * 14} width={60 + rnd(`sw${i}`) * 140} height={4} fill={pick(RAINBOW, `sc${i}`)} />
    ))}
  </Layer>
);

/** The whip montage: zoom-blurred flashes of the first two looks, 18 frames. */
const Whip: React.FC<{ l: number; p: StyleProps }> = ({ l, p }) => {
  const vp = vpOf(p.clips.rays);
  const amount = l >= 3 && l < 6 ? 0 : 0.5;
  const inner = l < 9 ? <RaysLook l={8 + l} trim={8} clip={p.clips.rays} /> : <TitleLook l={22 + l} trim={22} clip={p.clips.title} title={p.title} sub={p.titleSub} />;
  return (
    <Layer id="whip" effects={amount > 0 ? [shader({ code: ZOOM, uniforms: { cx: vp.x, cy: vp.y, amount } })] : []}>
      {inner}
    </Layer>
  );
};

/** A look's camera move and transitions: a slow push in over the shot (the footage and its tracked props
 *  together, so the tracking holds), a zoom whip into its first frames and out of its last. */
const Move: React.FC<{ l: number; len: number; vp: { x: number; y: number }; whipIn?: number; whipOut?: number; children: React.ReactNode }> = ({
  l,
  len,
  vp,
  whipIn = 4,
  whipOut = 4,
  children,
}) => {
  const inA = whipIn > 0 ? Math.max(0, 1 - l / whipIn) : 0;
  const outA = whipOut > 0 ? Math.max(0, (l - (len - whipOut)) / whipOut) : 0;
  const amount = 0.55 * Math.max(inA, outA);
  return (
    <Layer
      id="move"
      x={vp.x}
      y={vp.y}
      anchorX={vp.x}
      anchorY={vp.y}
      scale={1 + 0.08 * (l / len) + 0.12 * outA}
      effects={amount > 0.01 ? [shader({ code: ZOOM, uniforms: { cx: vp.x, cy: vp.y, amount } })] : []}
    >
      {children}
    </Layer>
  );
};

/** The edit: 540 frames at 30 fps, 1440 x 1080. */
export const WishStyle: React.FC<StyleProps> = (p) => (
  <Layer id="reel">
    <Rect width={W} height={H} fill="#000000" />
    <At from={0} len={18} name="warning">{(l) => <Warning l={l} text={p.warning} />}</At>
    <At from={18} len={33} name="rays">
      {(l) => (
        <Move l={l} len={33} vp={vpOf(p.clips.rays)} whipIn={0}>
          <RaysLook l={l} clip={p.clips.rays} />
        </Move>
      )}
    </At>
    <At from={51} len={3} name="flash">{() => <White />}</At>
    <At from={54} len={36} name="title">
      {(l) => (
        <Move l={l} len={36} vp={vpOf(p.clips.title)} whipOut={0}>
          <TitleLook l={l} clip={p.clips.title} title={p.title} sub={p.titleSub} />
        </Move>
      )}
    </At>
    <At from={90} len={3} name="white">{() => <White />}</At>
    <At from={93} len={63} name="collage">{(l) => <Collage l={l} photos={p.photos} />}</At>
    <At from={156} len={3} name="white">{() => <White />}</At>
    <At from={159} len={21} name="tell">{(l) => <Tell l={l} text={p.tell} corners={p.corners} />}</At>
    <At from={180} len={18} name="whip">{(l) => <Whip l={l} p={p} />}</At>
    <At from={198} len={3} name="white">{() => <White />}</At>
    <At from={201} len={63} name="storm">
      {(l) => (
        <Move l={l} len={63} vp={vpOf(p.clips.storm)} whipIn={0} whipOut={5}>
          <StormLook l={l} clip={p.clips.storm} />
        </Move>
      )}
    </At>
    <At from={264} len={3} name="streaks">{(l) => <Streaks l={l} />}</At>
    <At from={267} len={51} name="helix">{(l) => <HelixShot l={l} />}</At>
    <At from={318} len={21} name="framed">{(l) => <FramedLook l={l} clip={p.clips.framed} />}</At>
    <At from={339} len={60} name="tunnel">
      {(l) => (
        <Move l={l} len={60} vp={vpOf(p.clips.tunnel)} whipOut={0}>
          <TunnelLook l={l} clip={p.clips.tunnel} />
        </Move>
      )}
    </At>
    <At from={399} len={141} name="type">{(l) => <Typewriter l={l} lines={p.lines} />}</At>
  </Layer>
);

/** Where each look starts in the edit, in frames. */
export const LOOK_STARTS = { rays: 18, title: 54, storm: 201, framed: 318, tunnel: 339 };

/** One clip for all five looks, playing straight through: each look shows the clip at the edit's own time, so
 *  the video runs on under the changing effects (wrapping round if it is shorter than the edit). */
export function filterClips(c: Clip): StyleProps['clips'] {
  const n = c.track.frames.length;
  const out = {} as StyleProps['clips'];
  (Object.keys(LOOK_STARTS) as (keyof typeof LOOK_STARTS)[]).forEach((k) => {
    const room = Math.max(1, n - LOOK_LENGTHS[k]);
    out[k] = { ...c, trim: LOOK_STARTS[k] % room };
  });
  return out;
}
