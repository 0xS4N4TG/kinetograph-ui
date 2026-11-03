// Screen Tunnel, scene screen-wall: four phones form the walls of a corridor round a headline, and the camera
// backs out of them. The shot opens inside the wall, one device all you can see, and eases out until the four of them frame
// the line in the middle; the line shrinks with the pull, is swapped for the real sentence, and that builds a word at a
// time, each new word shoving the ones before it to the left hard enough to smear.
//
// Built as a true box tunnel: four phone planes meeting at the aperture's corners, one perspective in which the mouth is
// 2.35 times the aperture, so no two walls overlap; each phone is narrower than its wall (`gap`), leaving white seams between them. The camera is one scale (the aperture, 1.6 times
// its size at the start, 1.0 at the end) centred on the vanishing point, so the walls never change shape, only size.
// Each wall is one device drawn to the wall's size, so its frame closes the aperture and runs down the seams; the right
// and top devices show their island at the aperture, the left and bottom ones at the mouth.
//
// The camera holds a beat on the wall, then makes one long eased pull (interpolated in log scale, so the speed reads even
// rather than a snap and a dead stop), dead centre throughout, and finishes on a slow drift back so
// the frame keeps breathing under the sentence. The type sits on two drop shadows, a tight contact one and a soft tinted
// one, so it floats over the corridor instead of being printed on it.
//
// Principles: staging (one wall, then the whole corridor, then the line), anticipation (the hold before the pull), slow in
// and out (the pull eases both ends), overlap (the headline follows the pull with none of its
// travel), follow through (each word's shove overshoots and settles), solid drawing.

import React from 'react';
import { z } from 'zod';
import { Camera, Ellipse, Layer, Rect, Text, blur, dropShadow, grain } from '@kinetographdev/core';
import { measureText } from '@remotion/layout-utils';
import { Easing, useCurrentFrame } from 'remotion';
import { easeOut, prog, rr, useFamily } from './lib.js';

export const W = 1920;
export const H = 1080;
export const FPS = 60;
export const DURATION = 140;

const hex = z.string().describe('A CSS colour.');

export const screenTunnelSchema = z.object({
  opening: z.array(z.string()).length(2).describe('The line the shot opens on: a muted first word, then the rest in the accent.'),
  words: z.array(z.string()).min(1).max(5).describe('The sentence that builds at the end, one entry per word.'),
  uiFont: z.string().describe('Google Fonts family of the headline.'),
  ground: hex.describe('The ground, which fills the corridor.'),
  accent: hex.describe('The headline accent.'),
  muted: hex.describe('The muted opening word.'),
  frame: hex.describe('Phone frame colour.'),
  tint: hex.describe('The ground colour of the screens on the walls.'),
  tiles: z.array(hex).length(4).describe('The four colours of the tiles and dots drawn on the screens.'),
  pullBack: z.number().min(0).max(1.5).describe('How far the camera pulls back: 1 is the full move, 0 a still camera on the corridor.'),
  speed: z.number().min(0.5).max(2).describe('Playback speed of the move.'),
  gap: z.number().min(0).max(0.4).describe('Space left between neighbouring phones, as a share of each wall: 0 has the phones meet at the seams, 0.12 the reference spacing.'),
  shadow: z.number().min(0).max(2).describe('Strength of the drop shadows under the headline: 0 is flat type, 1 the default lift.'),
  grain: z.number().min(0).max(0.2).describe('Film grain over the whole frame.'),
});
export type ScreenTunnelProps = z.infer<typeof screenTunnelSchema>;

export const screenTunnelDefaults: ScreenTunnelProps = {
  opening: ['One', 'camera move.'],
  words: ['Scenes.', 'Motion.', 'Shipped.'],
  uiFont: 'Geist',
  ground: '#ffffff',
  accent: '#5a3cf0',
  muted: '#8d8a99',
  frame: '#1b1c1e',
  tint: '#efebfe',
  tiles: ['#ffcfc4', '#c6d3ff', '#d8cdfd', '#c3eedf'],
  pullBack: 1,
  speed: 1,
  gap: 0.12,
  shadow: 1,
  grain: 0,
};

const P0 = 2000; // perspective at scale 1, render px
const ZM = P0 * (1 - 1 / 2.35); // depth of the mouth: 2.35 times the aperture
const AX = 455; // half the aperture, at scale 1
const AY = 372;
const DOTS = [0, 1, 2, 3, 1, 0, 2, 3, 1, 2, 0];

/** One wall's device, drawn to the wall's own size as in the reference (each wall is one device, its long side running
 *  down the corridor): frame, black bezel, screen, and the island at its top end. Portrait coordinates, w x h. The app on
 *  the screen, after the reference: a white screen with a
 *  tinted card at each end, three tall tiles, and a small rising chart (a dot on one shared edge, a dark and a pale bar). */
const WallDevice: React.FC<{ id: string; w: number; h: number; frame: string; tint: string; accent: string; tiles: string[]; seed: number }> = ({
  id, w, h, frame, tint, accent, tiles, seed,
}) => {
  const r = w * 0.1;
  const rim = w * 0.022; // the metal frame
  const bz = w * 0.03; // frame plus black bezel
  const sw = w - 2 * bz;
  const sh = h - 2 * bz;
  const sr = r - bz;
  const u = sw / 100; // app unit: the screen is 100 units wide
  const rows = 7;
  const listTop = sh * 0.36;
  const rowGap = (sh * 0.81 - listTop) / (rows - 1);
  return (
    <Layer id={id}>
      <Rect id={`${id}-body`} width={w} height={h} radius={r} fill={frame} />
      <Rect id={`${id}-bezel`} x={rim} y={rim} width={w - 2 * rim} height={h - 2 * rim} radius={r - rim} fill="#060607" />
      <Layer id={`${id}-scr`} x={bz} y={bz} clip={{ kind: 'path', d: rr(sw, sh, sr) }}>
        <Rect id={`${id}-bg`} width={sw} height={sh} fill="#ffffff" />
        {/* a tinted card at each end: a green tick, a pair of bars and a coloured key */}
        {[
          { y0: 0.012, y1: 0.128, key: '#ff7a59' },
          { y0: 0.842, y1: 0.986, key: accent },
        ].map((c, ci) => {
          const y0 = sh * c.y0;
          const ch = sh * (c.y1 - c.y0);
          return (
            <Layer id={`${id}-c${ci}`} key={ci}>
              <Rect id={`${id}-c${ci}-p`} x={3 * u} y={y0} width={94 * u} height={ch} radius={8 * u} fill={tint} />
              <Rect id={`${id}-c${ci}-t`} x={83 * u} y={y0 + ch * 0.14} width={8 * u} height={ch * 0.12} radius={ch * 0.06} fill={accent} />
              <Rect id={`${id}-c${ci}-b1`} x={24 * u} y={y0 + ch * 0.38} width={44 * u} height={ch * 0.11} radius={ch * 0.055} fill="#b4b6b2" />
              <Rect id={`${id}-c${ci}-b2`} x={24 * u} y={y0 + ch * 0.58} width={30 * u} height={ch * 0.07} radius={ch * 0.035} fill="#dcdedb" />
              <Rect id={`${id}-c${ci}-k`} x={5 * u} y={y0 + ch * 0.3} width={14 * u} height={ch * 0.5} radius={4 * u} fill={c.key} />
            </Layer>
          );
        })}
        {/* three tall tiles */}
        {[0, 1, 2].map((i) => (
          <Rect key={i} id={`${id}-t${i}`} x={5 * u + i * 30.5 * u} y={sh * 0.15} width={28.5 * u} height={sh * 0.17} radius={6 * u} fill={tiles[(i + seed) % 4]} />
        ))}
        {/* a small rising chart: a dot on the shared edge, a dark bar and a pale one beside it, and a tick for each */}
        {Array.from({ length: rows }, (_, i) => {
          const y = listTop + i * rowGap;
          const len = (16 + i * 3.5 + ((i * 37 + seed * 23) % 10)) * u;
          const d = DOTS[(i + seed) % DOTS.length];
          return (
            <Layer id={`${id}-r${i}`} key={i}>
              <Ellipse id={`${id}-d${i}`} x={5 * u} y={y} width={7 * u} height={7 * u} fill={tiles[d]} />
              <Rect id={`${id}-b${i}`} x={16 * u} y={y + 1.2 * u} width={len} height={1.5 * u} radius={0.75 * u} fill="#b4b6b2" />
              <Rect id={`${id}-l${i}`} x={16 * u} y={y + 4 * u} width={len * 0.42} height={1 * u} radius={0.5 * u} fill="#dcdedb" />
              <Rect id={`${id}-k${i}`} x={88 * u} y={y + 1.5 * u} width={4 * u} height={1 * u} radius={0.5 * u} fill="#d6d8d4" />
            </Layer>
          );
        })}
      </Layer>
      <Rect id={`${id}-island`} x={(w - w * 0.2) / 2} y={bz + w * 0.02} width={w * 0.2} height={w * 0.045} radius={w * 0.0225} fill="#000000" />
    </Layer>
  );
};

const pullEase = Easing.bezier(0.55, 0, 0.2, 1);
const unit = (t: number) => Math.min(1, Math.max(0, t));

export const ScreenTunnel: React.FC<ScreenTunnelProps> = (p) => {
  const frame = useCurrentFrame();
  const f = frame * p.speed;
  const ui = useFamily(p.uiFont, ['500', '600', '700']);

  // the camera: starts at 1.6 times so the walls frame the shot from the first frame; a 6-frame hold on the wall, a 92-frame pull eased at both ends and interpolated in log scale (each frame
  // shrinks the aperture by the same ratio, so the speed reads even), centred on the vanishing point the whole way, then a
  // slow drift back of 4.5% so the shot never stops dead
  const pull = pullEase(unit((f - 6) / 92));
  const d = unit((f - 98) / (DURATION - 98));
  const driftK = 1 - 0.045 * d * d * (3 - 2 * d) * p.pullBack;
  const S = Math.exp(Math.log(1 + 0.6 * p.pullBack) * (1 - pull)) * driftK;
  const shiftX = 0; // dead centre: the vanishing point never moves, the corridor only grows smaller round it
  const a = AX * S;
  const b = AY * S;
  const zm = ZM * S;

  const wall = (id: string, kind: 'R' | 'L' | 'T' | 'B', seed: number) => {
    const horizontal = kind === 'T' || kind === 'B';
    const boxW = horizontal ? 2 * a : zm;
    const boxH = horizontal ? zm : 2 * b;
    // the device in portrait: its short side spans most of the wall (the rest is left white at the seams, so the four
    // phones read as separate devices, as in the reference: measured 0.87-0.90 of the wall), its long side runs the depth
    const dw = (horizontal ? boxW : boxH) * (1 - p.gap);
    const dh = horizontal ? boxH : boxW;
    // its top (the island) at the aperture for the right and top walls, at the mouth for the left and bottom ones
    const rot = kind === 'T' ? 180 : kind === 'B' ? 180 : -90;
    const pos =
      kind === 'R' ? { x: a, y: 0, z: zm / 2, rotateY: -90 }
      : kind === 'L' ? { x: -a, y: 0, z: zm / 2, rotateY: 90 }
      : kind === 'T' ? { x: 0, y: -b, z: zm / 2, rotateX: -90 }
      : { x: 0, y: b, z: zm / 2, rotateX: 90 };
    return (
      <Layer
        id={id}
        {...pos}
        anchorX={boxW / 2}
        anchorY={boxH / 2}
        clip={{ kind: 'path', d: `M0 0H${boxW}V${boxH}H0Z` }}
      >
        <Layer id={`${id}-art`} x={boxW / 2} y={boxH / 2} anchorX={dw / 2} anchorY={dh / 2} rotation={rot}>
          <WallDevice id={`${id}-dev`} w={dw} h={dh} frame={p.frame} tint={p.tint} accent={p.accent} tiles={p.tiles} seed={seed} />
        </Layer>
      </Layer>
    );
  };

  // the headline: opening line until the swap, then the sentence one word at a time. Widths are measured, so words keep
  // their spaces and the line is centred on what is really drawn.
  const SWAP = 40;
  const wordAt = [38, 72, 98, 116, 128];
  const size = 66;
  const mw = (t: string, px: number, wt: number) => measureText({ text: t, fontFamily: ui, fontSize: px, fontWeight: String(wt) }).width;
  const space = mw(' ', size, 600);
  const built = p.words.map((w, i) => ({ w, at: wordAt[i], x: 0, wd: mw(w, size, 600) }));
  let run = 0;
  built.forEach((w2) => { w2.x = run; run += w2.wd + space; });
  const shown = built.filter((w2) => f >= w2.at);
  const last = shown[shown.length - 1];
  const totalW = last ? last.x + last.wd : 0;
  const sinceLast = last ? f - last.at : 99;
  // the line is thrown left as the new word lands, overshoots once and settles
  const shove = last && shown.length > 1 ? 30 * Math.exp(-sinceLast / 4) * Math.cos(sinceLast / 5) : 0;
  const smear = last && shown.length > 1 ? Math.max(0, 6 * Math.exp(-sinceLast / 2.5)) : 0;
  const openSize = 52 * S;
  const openW = mw(p.opening.join(' '), 52, 500) * S;
  const firstW = mw(p.opening[0] + ' ', 52, 500) * S;
  // two shadows lift the type off the screen behind it: a tight contact one and a soft, tinted one further down
  const alpha = (v: number) => Math.round(Math.min(255, v * p.shadow)).toString(16).padStart(2, '0');
  const lift = (k: number) =>
    p.shadow > 0
      ? [dropShadow({ y: 2 * k, blur: 2.5 * k, color: `#0b0820${alpha(0x30)}` }), dropShadow({ y: 16 * k, blur: 20 * k, color: `#26186e${alpha(0x55)}` })]
      : [];

  return (
    <Layer id="tn-root" effects={p.grain > 0 ? [grain(p.grain, { seed: 7, size: 1.3 })] : undefined}>
      <Camera perspective={P0 * S} x={W / 2 + shiftX} y={H / 2} />
      <Rect id="tn-ground" width={W} height={H} fill={p.ground} />
      <Layer id="tn-world" preserve3d x={W / 2 + shiftX} y={H / 2}>
        {wall('tn-wb', 'B', 1)}
        {wall('tn-wt', 'T', 2)}
        {wall('tn-wl', 'L', 3)}
        {wall('tn-wr', 'R', 4)}
      </Layer>
      {f < SWAP + 1 ? (
        <Layer id="tn-open" x={W / 2 - openW / 2} y={H / 2 - 12} effects={lift(Math.min(S, 1.6))} opacity={1 - prog(f, SWAP - 6, SWAP + 1, easeOut)}>
          <Text id="tn-o1" font={ui} weight={500} size={openSize} color={p.muted} align="left" x={0} y={-openSize / 2} lineHeight={1}>
            {p.opening[0]}
          </Text>
          <Text id="tn-o2" font={ui} weight={500} size={openSize} color={p.accent} align="left" x={firstW} y={-openSize / 2} lineHeight={1}>
            {p.opening[1]}
          </Text>
        </Layer>
      ) : (
        <Layer id="tn-line" x={W / 2 - totalW / 2 + shove} y={H / 2 - 12} effects={smear > 0.6 ? [blur(smear), ...lift(1)] : lift(1)}>
          {shown.map((w2, i) => {
            const t = i === shown.length - 1 ? prog(f, w2.at, w2.at + 8, easeOut) : 1;
            return (
              <Text key={i} id={`tn-w${i}`} font={ui} weight={600} size={size} color={p.accent} align="left" x={w2.x} y={-size / 2 + 18 * (1 - t)} lineHeight={1} opacity={t}>
                {w2.w}
              </Text>
            );
          })}
        </Layer>
      )}
    </Layer>
  );
};
