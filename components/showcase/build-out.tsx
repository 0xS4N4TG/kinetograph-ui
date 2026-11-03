// Build Out: a send button that fills the frame, and the app that comes out of it. Act one opens inside the button (the
// arrow alone, about thirty times life size and still turned) and the camera falls back off it onto a prompt that is being
// typed; a pointer arrives edge-on, turns flat as it lands, presses and holds. Then a hard cut: the app the prompt asked
// for draws itself in block by block on a tilted plane, backs off into the frame, and is worked on by people who are not
// you: two presence labels pop, the wordmark is selected and re-set in a serif, the artwork in the grid is swapped, and
// the cream behind it turns to colour as the camera pushes in.
//
// Principles: staging (one thing on screen at each beat), slow in and out (the pull-back eases onto the prompt), arcs (the
// pointer comes up on a curve), anticipation (the press dips before it holds), overlap and stagger (blocks draw a few
// frames apart), follow through (labels overshoot as they pop), solid drawing (one perspective, one yaw that swings
// through the move).
// Timed to a measured reference scene; copy is our own.

import React from 'react';
import { z } from 'zod';
import { Camera, Ellipse, Layer, Path, Rect, Text, linearGradient, radialGradient } from '@kinetographdev/core';
import { useCurrentFrame } from 'remotion';
import { ease, easeOut, keys, prog, ramp, rr, useFamily } from './lib.js';

export const W = 1920;
export const H = 1080;
export const FPS = 60;
export const DURATION = 232;

const hex = z.string().describe('A CSS colour.');

export const buildOutSchema = z.object({
  prompt: z.string().describe('The prompt typed into the box, and shown again in the app\'s chat.'),
  reply: z.string().describe('The assistant line under the prompt in the app\'s chat.'),
  notes: z.array(z.string()).length(2).describe('Two paragraphs of the assistant\'s working notes in the chat column.'),
  wordmark: z.string().describe('The shop name in the app header. Shown in spaced capitals, then re-set in an italic serif.'),
  tiles: z
    .array(z.object({ title: z.string(), sub: z.string(), tag: z.string() }))
    .length(3)
    .describe('The three grid cards: title, small line, and tag.'),
  presence: z.array(z.string()).length(2).describe('The two collaborator labels that pop on the page, in order.'),
  uiFont: z.string().describe('Google Fonts family for the interface.'),
  serifFont: z.string().describe('Google Fonts family the wordmark is re-set in (used italic).'),
  accent: hex.describe('The send button, the app\'s buttons and the field.'),
  accentB: hex.describe('The far corner of the field behind the app.'),
  cream: hex.describe('The ground behind the app and the opening.'),
  speed: z.number().min(0.5).max(2).describe('Playback speed of the move.'),
});
export type BuildOutProps = z.infer<typeof buildOutSchema>;

export const buildOutDefaults: BuildOutProps = {
  prompt: 'Make a landing page for a small furniture shop. Include scenes for the hero, the products, and pricing',
  reply: 'I\'ll lay out a quiet editorial page from your catalogue.',
  notes: [
    'The first draft buries the products: the hero eats too much height before the grid begins. The tiles should lead from the first scroll. I need to shorten the header, drop the decorative padding and let the grid breathe.',
    'Thinner borders between cells, more room for each piece to sit. Type needs to step back: the wordmark stays, but everything else goes minimal sans, because the pieces are the hero here, not the labels.',
  ],
  wordmark: 'OAKLINE',
  tiles: [
    { title: 'STONE VASE', sub: 'Ceramic · 001', tag: '$48' },
    { title: 'LINEN CHAIR', sub: 'Seating · 002', tag: '$210' },
    { title: 'BRASS LAMP', sub: 'Lighting · 003', tag: '$96' },
  ],
  presence: ['Design', 'QA / UX'],
  uiFont: 'Figtree',
  serifFont: 'Instrument Serif',
  accent: '#3074dd',
  accentB: '#8a58c8',
  cream: '#faf8f5',
  speed: 1,
};

const WIN_W = 500;
const WIN_H = 336;
const BX = 471; // the send button's centre, on screen, in 960 x 540 units
const BY = 350;

const spaced = (s: string) => s.split('').join(' ');

/** A rounded rectangle as a Path (so it can take a radius per corner and a stroke). */
const Round: React.FC<{ id: string; x: number; y: number; w: number; h: number; r: number; fill?: string; stroke?: { color: string; width: number }; opacity?: number }> = ({ id, x, y, w, h, r, fill, stroke, opacity }) => (
  <Path id={id} x={x} y={y} d={rr(w, h, r)} fill={fill} stroke={stroke} opacity={opacity} />
);

// ---- the pointing hand ---------------------------------------------------------------------------------------------

/** A pointing hand cursor, fingertip at the origin, in screen units (about 28 x 38). Flat: white with a dark outline. */
const Pointer: React.FC<{ id: string; fill: string }> = ({ id, fill }) => {
  const shapes: [number, number, number, number, number][] = [
    [-4.5, 0, 9, 22, 4.5], // finger
    [-13, 14, 26, 21, 9], // palm
    [4, 13, 7, 14, 3.5], // knuckle
    [10, 15, 7, 14, 3.5], // knuckle
    [-17, 17, 9, 14, 4.5], // thumb
  ];
  const o = 1.6;
  return (
    <Layer id={id}>
      {shapes.map(([x, y, w, h, r], i) => (
        <Round key={`o${i}`} id={`${id}-o${i}`} x={x - o} y={y - o} w={w + 2 * o} h={h + 2 * o} r={r + o} fill="#14161c" />
      ))}
      {shapes.map(([x, y, w, h, r], i) => (
        <Round key={`f${i}`} id={`${id}-f${i}`} x={x} y={y} w={w} h={h} r={r} fill={fill} />
      ))}
    </Layer>
  );
};

/** A collaborator's arrow cursor with its name pill. The tip is at the origin. */
const Presence: React.FC<{ id: string; label: string; color: string; font: string; pop: number }> = ({ id, label, color, font, pop }) => {
  const w = label.length * 4.6 + 12;
  return (
    <Layer id={id} scale={pop * 1.22} opacity={Math.min(1, pop * 3)}>
      <Path id={`${id}-arrow`} d="M0 0L0 10.5L2.8 8L4.8 12.4L6.6 11.6L4.6 7.3L8.2 7.1Z" fill={color} />
      <Round id={`${id}-pill`} x={7} y={9} w={w} h={13} r={6.5} fill={color} />
      <Text id={`${id}-txt`} font={font} weight={500} size={6.6} color="#ffffff" align="center" x={7} y={11.9} maxWidth={w} lineHeight={1}>
        {label}
      </Text>
    </Layer>
  );
};

// ---- the app -------------------------------------------------------------------------------------------------------

interface AppProps {
  f: number;
  p: BuildOutProps;
  ui: string;
  serif: string;
}

/** One block of the app: fades and rises as it is drawn. */
const Block: React.FC<{ id: string; at: number; f: number; rise?: number; children: React.ReactNode }> = ({ id, at, f, rise = 7, children }) => {
  const t = prog(f, at, at + 9, easeOut);
  return (
    <Layer id={id} y={(1 - t) * rise} opacity={t}>
      {children}
    </Layer>
  );
};

const ART = [
  { bg: '#e4ecfb', a: '#8fb4f0', b: '#3f78e0' },
  { bg: '#fbe6f1', a: '#e48ac4', b: '#b8449e' },
  { bg: '#ece6fb', a: '#b79af0', b: '#8056d8' },
];

const Tile: React.FC<{ id: string; x: number; cw: number; art: number; swap: number; title: string; sub: string; tag: string; ui: string }> = ({ id, x, cw, art, swap, title, sub, tag, ui }) => {
  const cx = x + cw / 2;
  const a = ART[art % 3];
  const bArt = ART[(art + 2) % 3];
  const pop = 1 + 0.06 * Math.sin(Math.PI * swap);
  return (
    <Layer id={id}>
      <Layer id={`${id}-art`} x={cx - 39} y={119}>
        <Layer id={`${id}-a`} scale={pop} anchorX={39} anchorY={39} x={39} y={39} opacity={1 - swap}>
          <ArtCard id={`${id}-ca`} c={a} />
        </Layer>
        <Layer id={`${id}-b`} scale={pop} anchorX={39} anchorY={39} x={39} y={39} opacity={swap}>
          <ArtCard id={`${id}-cb`} c={bArt} />
        </Layer>
      </Layer>
      <Text id={`${id}-t`} font={ui} weight={500} size={4.6} color="#262833" align="center" x={x} y={224} maxWidth={cw} lineHeight={1}>
        {spaced(title)}
      </Text>
      <Text id={`${id}-s`} font={ui} weight={400} size={4} color="#9a9ca6" align="center" x={x} y={236} maxWidth={cw} lineHeight={1}>
        {sub}
      </Text>
      <Text id={`${id}-g`} font={ui} weight={500} size={4.2} color="#4a4c58" align="center" x={x} y={252} maxWidth={cw} lineHeight={1}>
        {tag}
      </Text>
    </Layer>
  );
};

const ArtCard: React.FC<{ id: string; c: { bg: string; a: string; b: string } }> = ({ id, c }) => (
  <Layer id={id}>
    <Rect id={`${id}-bg`} width={78} height={78} fill={c.bg} />
    <Rect id={`${id}-card`} x={20} y={14} width={38} height={48} fill="#ffffff" />
    <Rect id={`${id}-img`} x={24} y={18} width={30} height={26} fill={linearGradient([c.a, c.b], { angle: 150 })} />
    <Rect id={`${id}-l1`} x={24} y={48} width={30} height={1.6} fill="#c9cbd2" />
    <Rect id={`${id}-l2`} x={24} y={52} width={24} height={1.6} fill="#c9cbd2" />
    <Rect id={`${id}-l3`} x={24} y={56} width={16} height={1.6} fill="#c9cbd2" />
  </Layer>
);

const App: React.FC<AppProps> = ({ f, p, ui, serif }) => {
  const g = '#8c8f9a';
  const line = (id: string, x: number, y: number, w: number, c = '#d9dae0') => <Rect key={id} id={id} x={x} y={y} width={w} height={1.8} radius={0.9} fill={c} />;

  // the wordmark: caps, then selected, then re-set in a serif with a caret
  const sel = prog(f, 164, 172, ease);
  const swapT = f >= 176 ? 1 : 0;
  const caretOn = f >= 176 && Math.floor((f - 176) / 18) % 2 === 0;
  const wmX = 124 + (WIN_W - 124 - 12) / 2 - 90;

  // the grid art is swapped, one card after another
  const swaps = [prog(f, 196, 206), prog(f, 201, 211), prog(f, 206, 216)];

  const cols = [124, 238, 356];
  const cw = [114, 118, 132];

  return (
    <Layer id="bo-app">
      {/* window */}
      <Round id="bo-win" x={0} y={0} w={WIN_W} h={WIN_H} r={9} fill="#ffffff" />
      <Layer id="bo-clip" clip={{ kind: 'path', d: rr(WIN_W, WIN_H, 9) }}>
        {/* sidebar */}
        <Rect id="bo-side" width={122} height={WIN_H} fill="#ffffff" />
        <Rect id="bo-sidel" x={122} width={1} height={WIN_H} fill="#e6e7ec" />
        <Block id="bo-sh" at={98} f={f}>
          <Rect id="bo-sh-sq" x={11} y={9} width={6} height={6} radius={1} fill="#14161c" />
          <Text id="bo-sh-t" font={ui} weight={500} size={4.6} color="#2c2e38" x={21} y={9.6} lineHeight={1}>launch-reel</Text>
        </Block>
        <Rect id="bo-sh-l" y={24} width={WIN_W} height={0.8} fill="#eceef2" opacity={prog(f, 102, 110)} />
        <Block id="bo-bub" at={100} f={f}>
          <Round id="bo-bub-r" x={9} y={30} w={105} h={30} r={5} fill="#f2f1ee" />
          <Text id="bo-bub-t" font={ui} weight={400} size={4.8} color="#2a2c36" x={14} y={34} maxWidth={94} lineHeight={1.38}>{p.prompt}</Text>
        </Block>
        <Block id="bo-rep" at={103} f={f}>
          <Text id="bo-rep-t" font={ui} weight={400} size={4.8} color="#2a2c36" x={11} y={70} maxWidth={100} lineHeight={1.38}>{p.reply}</Text>
        </Block>
        <Block id="bo-bar1" at={105} f={f}>
          <Round id="bo-bar1-r" x={11} y={88} w={100} h={5.5} r={2.7} fill="#ececf0" />
        </Block>
        <Block id="bo-n1" at={112} f={f}>
          <Text id="bo-n1-t" font={ui} weight={400} size={4.6} color="#34363f" x={11} y={118} maxWidth={100} lineHeight={1.42}>{p.notes[0]}</Text>
        </Block>
        <Block id="bo-n2" at={119} f={f}>
          <Text id="bo-n2-t" font={ui} weight={400} size={4.6} color="#34363f" x={11} y={176} maxWidth={100} lineHeight={1.42}>{p.notes[1]}</Text>
        </Block>
        <Block id="bo-bar2" at={126} f={f}>
          <Round id="bo-bar2-r" x={11} y={232} w={100} h={5.5} r={2.7} fill="#ececf0" />
          {line('bo-ln1', 11, 247, 100)}
          {line('bo-ln2', 11, 252, 100)}
          {line('bo-ln3', 11, 257, 100)}
          {line('bo-ln4', 11, 262, 62)}
        </Block>
        <Block id="bo-input" at={101} f={f}>
          <Round id="bo-in-r" x={9} y={288} w={104} h={36} r={5} fill="#ffffff" stroke={{ color: '#dcdde3', width: 0.8 }} />
          <Text id="bo-in-plus" font={ui} weight={400} size={6} color={g} x={14} y={314} lineHeight={1}>+</Text>
          <Ellipse id="bo-in-send" x={100} y={311} width={9} height={9} fill={p.accent} />
          <Path id="bo-in-arr" d="M104.5 316V311.5M102.6 313.2L104.5 311.2L106.4 313.2" stroke={{ color: '#ffffff', width: 0.9, cap: 'round', join: 'round' } as never} />
        </Block>

        {/* main header */}
        <Block id="bo-mh" at={98} f={f} rise={4}>
          <Ellipse id="bo-mh-dot" x={128} y={10} width={5} height={5} fill="#7a55d0" />
          <Text id="bo-mh-t" font={ui} weight={500} size={4.4} color="#2c2e38" x={137} y={10} lineHeight={1}>Preview</Text>
          <Round id="bo-mh-url" x={168} y={8} w={276} h={8} r={4} fill="#f1f1f4" />
          <Round id="bo-mh-btn" x={452} y={7} w={28} h={10} r={5} fill={p.accent} />
          <Text id="bo-mh-bt" font={ui} weight={500} size={4} color="#ffffff" align="center" x={452} y={10.4} maxWidth={28} lineHeight={1}>Publish</Text>
        </Block>
        <Rect id="bo-mh-l" x={123} y={24} width={WIN_W} height={0.8} fill="#eceef2" opacity={prog(f, 102, 110)} />
        <Block id="bo-tabs" at={100} f={f} rise={4}>
          <Round id="bo-tab-a" x={128} y={30} w={22} h={9} r={4.5} fill="#f1f1f4" />
          <Text id="bo-tab-at" font={ui} weight={500} size={4} color="#2c2e38" align="center" x={128} y={33.2} maxWidth={22} lineHeight={1}>Pages</Text>
          <Text id="bo-tab-bt" font={ui} weight={400} size={4} color={g} x={158} y={33.2} lineHeight={1}>Timeline</Text>
        </Block>

        {/* wordmark and nav */}
        <Block id="bo-wm" at={99} f={f} rise={5}>
          <Layer id="bo-wm-wrap" opacity={1 - swapT}>
            <Text id="bo-wm-t" font={ui} weight={400} size={12} color="#2a2c36" align="center" x={wmX} y={70} maxWidth={180} lineHeight={1}>{spaced(p.wordmark)}</Text>
          </Layer>
        </Block>
        <Layer id="bo-wm-sel" opacity={sel * (1 - swapT)}>
          <Rect id="bo-wm-selr" x={wmX + 35} y={67} width={110} height={17} fill="#3074dd33" />
        </Layer>
        {swapT ? (
          <Layer id="bo-wm-serif">
            <Text id="bo-wm-st" font={serif} fontStyle="italic" weight={400} size={20} color="#14161c" align="center" x={wmX} y={67} maxWidth={180} lineHeight={1}>{p.wordmark.toLowerCase()}</Text>
            {caretOn ? <Rect id="bo-wm-caret" x={wmX + 90 + p.wordmark.length * 4.2 + 2} y={67} width={1.2} height={17} fill="#14161c" /> : null}
          </Layer>
        ) : null}
        <Block id="bo-nav" at={101} f={f} rise={3}>
          <Text id="bo-nav-a" font={ui} weight={400} size={3.8} color={g} x={128} y={84} lineHeight={1}>{spaced('SCENES')}   {spaced('DOCS')}</Text>
          <Text id="bo-nav-b" font={ui} weight={400} size={3.8} color={g} x={462} y={73} lineHeight={1}>GET</Text>
        </Block>
        <Block id="bo-filt" at={102} f={f} rise={3}>
          <Text id="bo-f-a" font={ui} weight={400} size={3.8} color={g} x={128} y={98} lineHeight={1}>FILTER</Text>
          <Round id="bo-f-pill" x={155} y={94} w={15} h={9} r={4.5} fill="#eeeef2" />
          <Text id="bo-f-all" font={ui} weight={500} size={3.8} color="#2c2e38" align="center" x={155} y={97} maxWidth={15} lineHeight={1}>ALL</Text>
          <Text id="bo-f-b" font={ui} weight={400} size={3.8} color={g} x={181} y={98} lineHeight={1}>TEXT</Text>
          <Text id="bo-f-c" font={ui} weight={400} size={3.8} color={g} x={202} y={98} lineHeight={1}>PIECES</Text>
          <Text id="bo-f-d" font={ui} weight={400} size={3.8} color={g} x={232} y={98} lineHeight={1}>BACKGROUNDS</Text>
          <Text id="bo-f-e" font={ui} weight={400} size={3.8} color={g} align="right" x={380} y={98} maxWidth={100} lineHeight={1}>BY NAME ⌄</Text>
        </Block>
        <Rect id="bo-rowl" x={124} y={109} width={WIN_W - 124} height={0.8} fill="#eceef2" opacity={prog(f, 112, 120)} />

        {/* cards, drawn left to right */}
        {p.tiles.map((t, i) => {
          const at = [99, 108, 116][i];
          return (
            <Block key={i} id={`bo-card${i}`} at={at} f={f} rise={10}>
              <Tile id={`bo-tile${i}`} x={cols[i]} cw={cw[i]} art={i} swap={swaps[i]} title={t.title} sub={t.sub} tag={t.tag} ui={ui} />
            </Block>
          );
        })}
        <Rect id="bo-div1" x={cols[1]} y={109} width={0.8} height={160} fill="#eceef2" opacity={prog(f, 118, 126)} />
        <Rect id="bo-div2" x={cols[2]} y={109} width={0.8} height={160} fill="#eceef2" opacity={prog(f, 124, 132)} />
        <Rect id="bo-div3" x={cols[0] + 6} y={280} width={WIN_W - cols[0] - 18} height={0.8} fill="#e6e7ec" opacity={prog(f, 122, 130)} />

        {/* pagination and footer */}
        <Block id="bo-pg" at={100} f={f} rise={3}>
          <Text id="bo-pg-a" font={ui} weight={400} size={3.8} color={g} x={252} y={303} lineHeight={1}>‹ PREV    1</Text>
          <Ellipse id="bo-pg-dot" x={298} y={302} width={9} height={9} fill="#14161c" />
          <Text id="bo-pg-two" font={ui} weight={500} size={3.8} color="#ffffff" align="center" x={298} y={305} maxWidth={9} lineHeight={1}>2</Text>
          <Text id="bo-pg-b" font={ui} weight={400} size={3.8} color={g} x={312} y={303} lineHeight={1}>3     NEXT ›</Text>
          <Text id="bo-pg-c" font={ui} weight={400} size={3.4} color="#a8aab4" align="center" x={124} y={333} maxWidth={WIN_W - 124} lineHeight={1}>SHOWING 1-3 OF 32</Text>
        </Block>
      </Layer>
    </Layer>
  );
};

// ---- the shot --------------------------------------------------------------------------------------------------------

export const BuildOut: React.FC<BuildOutProps> = (p) => {
  const frame = useCurrentFrame();
  const f = frame * p.speed;
  const ui = useFamily(p.uiFont, ['400', '500', '600']);
  const serif = useFamily(p.serifFont, ['400'], true);

  const act1 = f < 98;

  // ---- act one: a pure scale about the button's centre
  const lnS = keys(f, [[0, Math.log(34)], [10, Math.log(9.4)], [25, Math.log(1.5)]], (t) => t);
  const tail = f < 25 ? 0 : ramp(f, 25, 70, 0, 1, (t) => 1 - Math.pow(1 - t, 2.6));
  const s = f < 25 ? Math.exp(lnS) : 1.5 * Math.pow(1 / 1.5, tail);
  const rot = keys(f, [[0, -19], [10, -6.5], [24, 0]], ease);
  const panX = ramp(f, 0, 10, 0, 0, ease);

  const chars = Math.max(0, Math.floor((f + 38) * 1.32));
  const typed = p.prompt.slice(0, Math.min(chars, p.prompt.length));
  const showCaret = chars < p.prompt.length + 18 && Math.floor(f / 18) % 2 === 0;

  const fieldIn = prog(f, 8, 20, ease);
  const boxIn = prog(f, 11, 19, ease);
  const wash = prog(f, 78, 94, ease);
  const press = keys(f, [[52, 0], [57, 1], [88, 1], [94, 0]], ease);
  const btnScale = 1 - 0.07 * press;

  // the pointer: tip offsets from the button, flips from edge-on, blue until it lands
  const tipX = keys(f, [[26, 46], [36, 62], [42, 40], [50, 20], [56, 24], [66, 21], [88, 21], [97, 12]], ease);
  const tipY = keys(f, [[26, 110], [36, 47], [42, 26], [50, 21], [56, 18], [66, 12], [88, 12], [97, 32]], ease);
  const flip = ramp(f, 28, 43, 88, 0, easeOut);
  const handS = ramp(f, 28, 42, 1.7, 1, easeOut) * (1 - 0.1 * press);
  const handFill = f < 38 ? '#3f7ae0' : '#ffffff';
  const handAlpha = prog(f, 27, 31) * (1 - prog(f, 93, 97));

  // ---- act two
  const winIn = prog(f, 97, 104, easeOut);
  const yaw = keys(f, [[98, 17], [121, 13.7], [135, 10.5], [160, 2.5], [172, 1], [200, -12], [231, -20]], ease);
  const zoom = f < 171 ? keys(f, [[98, 1.06], [121, 1.0], [135, 0.97], [160, 0.92], [171, 0.92]], ease) : keys(f, [[171, 0.92], [190, 1.2], [231, 1.23]], ease);
  const cxw = keys(f, [[98, 498], [121, 495], [160, 482], [190, 474], [231, 464]], ease);
  const cyw = keys(f, [[98, 268], [121, 266], [231, 268]], ease);
  const bgIn = prog(f, 172, 198, ease);
  const halo = 1 - prog(f, 168, 192);

  const presence1 = ramp(f, 138, 150, 0, 1, (t) => 1 - Math.pow(1 - t, 3) * Math.cos(t * 7));
  const presence2 = ramp(f, 162, 174, 0, 1, (t) => 1 - Math.pow(1 - t, 3) * Math.cos(t * 7));

  // the cursor of each collaborator drifts a little
  const d1x = keys(f, [[138, 0], [180, 16], [231, 22]], ease);
  const d1y = keys(f, [[138, 0], [180, 6], [231, 4]], ease);
  const d2x = keys(f, [[162, 0], [200, -6], [231, 4]], ease);
  const d2y = keys(f, [[162, 0], [200, 8], [231, 0]], ease);

  return (
    <Layer id="bo-root">
      <Camera perspective={3000} />
      <Rect id="bo-cream" width={W} height={H} fill={p.cream} />
      <Layer id="bo-scale" scale={2}>
        {act1 ? (
          <>
            {/* the world, scaled about the button */}
            <Layer id="bo-cam" x={BX + panX} y={BY} scale={s} rotation={0}>
              <Layer id="bo-field" opacity={fieldIn}>
                {/* the page */}
                <Rect id="bo-page" x={-1400} y={-900} width={2800} height={1500} fill="#c8d8f3" />
                {/* the panel */}
                <Layer id="bo-panel" x={-235} y={-346} opacity={1 - 0.8 * wash}>
                  <Rect id="bo-panel-bg" width={719} height={381} fill={linearGradient(['#cbdaf4', '#b4caf0'], { angle: 90 })} />
                  <Rect id="bo-panel-blue" x={-300} y={-300} width={1100} height={800} fill={radialGradient([[0, '#2a6fe0'], [0.35, '#4d85e6e6'], [0.7, '#a3c0ee55'], [1, '#c4d6f400']], { cx: 0.84, cy: 0.5, r: 0.5 })} />
                </Layer>
                <Rect id="bo-below" x={-1400} y={35} width={2800} height={500} fill={linearGradient(['#dbe4f6f0', '#f5f6fbf8'], { angle: 180 })} opacity={1} />
                <Ellipse id="bo-purple" x={150} y={-90} width={680} height={680} opacity={1 - 0.7 * wash} fill={radialGradient([[0, '#7440bc'], [0.5, '#9068cfcc'], [1, '#b79ad800']])} />
              </Layer>
              {/* the button's glow */}
              <Ellipse id="bo-glow" x={-32} y={-32} width={64} height={64} fill={radialGradient([[0, '#ffffff'], [0.4, '#ffffff'], [0.48, '#ffffff'], [0.58, '#a3c0f2'], [0.75, '#c9d8f4'], [0.96, '#dbe5f5dd'], [1, '#dde6f600']])} />
              {/* the prompt box */}
              <Layer id="bo-box" opacity={boxIn}>
                <Rect id="bo-box-sh" x={-224} y={-79} width={247} height={104} radius={8} fill="#2a4a9a14" />
                <Round id="bo-box-r" x={-222} y={-81} w={243} h={100} r={6} fill="#ffffff" />
                <Text id="bo-box-t" font={ui} weight={400} size={10} color="#1d1f27" x={-209} y={-68} maxWidth={224} lineHeight={1.4}>
                  {typed + (showCaret && chars < p.prompt.length + 18 ? '' : '')}
                </Text>
                <Ellipse id="bo-plus-c" x={-210} y={-9} width={17} height={17} fill="#ffffff" stroke={{ color: '#d4d6dc', width: 0.7 }} />
                <Path id="bo-plus" d="M-204 -0.5H-197M-201.5 -4V3" stroke={{ color: '#6a6d78', width: 0.8, cap: 'round' } as never} />
              </Layer>
              {/* the button: a circle and an arrow */}
              <Layer id="bo-btn" scale={btnScale} rotation={rot}>
                <Ellipse id="bo-btn-c" x={-12} y={-12} width={24} height={24} fill={p.accent} />
                <Path id="bo-btn-a" d="M0 5.4V-5.4M-5 -1.1L0 -5.6L5 -1.1" stroke={{ color: '#ffffff', width: 1.05, cap: 'round', join: 'round' } as never} />
              </Layer>
            </Layer>
            {/* the pointer */}
            <Layer id="bo-hand" x={BX + tipX} y={BY + tipY} scale={handS} opacity={handAlpha}>
              <Layer id="bo-hand-flip" rotateY={flip} anchorX={0} anchorY={20} y={0}>
                <Layer id="bo-hand-sz" scale={1.3}><Pointer id="bo-hand-p" fill={handFill} /></Layer>
              </Layer>
            </Layer>
          </>
        ) : (
          <>
            {/* act two */}
            <Rect id="bo-vivid" width={960} height={540} opacity={bgIn} fill={linearGradient([[0, '#6f3f96'], [0.18, '#2f5eb0'], [0.5, '#2b5fb4'], [0.8, '#2a5aae'], [1, '#2b58a8']], { angle: 90 })} />
            <Rect id="bo-vivid-m" width={960} height={540} opacity={bgIn} fill={radialGradient([[0, '#8a3d9a'], [1, '#8a3d9a00']], { cx: 0.92, cy: 0.02, r: 0.45 })} />
            <Rect id="bo-vivid-p" width={960} height={540} opacity={bgIn} fill={radialGradient([[0, '#7f3f96'], [1, '#7f3f9600']], { cx: 0.0, cy: 1.0, r: 0.4 })} />
            <Rect id="bo-vivid-b" width={960} height={540} opacity={bgIn * 0.7} fill={radialGradient([[0, '#3a78d8'], [1, '#3a78d800']], { cx: 0.5, cy: 0.35, r: 0.3 })} />
            <Layer id="bo-win-layer" x={cxw} y={cyw} anchorX={WIN_W / 2} anchorY={WIN_H / 2} scale={zoom} opacity={winIn}>
              <Ellipse id="bo-halo" x={-70} y={-70} width={WIN_W + 140} height={WIN_H + 140} opacity={halo * 0.9} fill={radialGradient([[0, '#c9d9f5'], [0.55, '#a9c2f0cc'], [0.8, '#a9c2f066'], [1, '#a9c2f000']])} />
              <Layer id="bo-win-yaw" anchorX={WIN_W / 2} anchorY={WIN_H / 2} x={WIN_W / 2} y={WIN_H / 2} rotateY={-yaw * 2.1}>
                <App f={f} p={p} ui={ui} serif={serif} />
                {/* presence */}
                <Layer id="bo-pres1" x={288 + d1x} y={92 + d1y}>
                  <Presence id="bo-p1" label={p.presence[0]} color="#c9532a" font={ui} pop={presence1} />
                </Layer>
                <Layer id="bo-pres2" x={296 + d2x} y={262 + d2y}>
                  <Presence id="bo-p2" label={p.presence[1]} color="#6a45a8" font={ui} pop={presence2} />
                </Layer>
              </Layer>
            </Layer>
          </>
        )}
      </Layer>
    </Layer>
  );
};
