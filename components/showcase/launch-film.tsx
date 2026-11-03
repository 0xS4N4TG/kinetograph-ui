// Launch Film: a 20.8 second product-launch film in nine shots. A dock of app icons re-flows around a new one, which stays
// alone and gives way to a typed headline; the headline is swept off by a coral mosaic and a prompt box is typed and sent;
// a burst of pictures leaves the box and a full-frame dot matrix wipes across, scrambling a "Connecting" line into a
// dashboard whose words and letters fly through it; thin grid lines then frame a footage box that grows, cuts between
// shots, shrinks onto a title and opens out into a closing line; an iris closes to black on the brand mark, which pulses
// and slides aside for a serif wordmark rising out of a mask; a letter strikes in white, glitches, and becomes a glowing
// extruded letter that yaws, is cut by light, flashes and lands as a flat gradient mark on white.
//
// Built in the reference's own 736 x 414 units inside one scale layer (so a measurement from a frame is the number in the
// code), with the closing 3D letter drawn in output pixels. Every beat is a pure function of the frame: dock icons are
// weights that re-flow a row, the typed lines are per-character opacity, the dots are one path per colour, the mosaic is
// one path per colour and row band, the footage cuts are image layers with a push and motion blur, and the extruded
// letter is a stack of text slices in one 3D group.
//
// Principles: staging (one idea per beat, the eye always at the centre), timing (a typed line pauses where a person
// would), anticipation and follow through (the mark swells and shrinks before it slides, the letter overshoots before it
// yaws), overlap (the dashboard resolves while the dots still clear), slow in and out, arcs (the pointer), solid drawing
// (one perspective for the extrusion), secondary action (drifting squares under the dock, motion blur on the cuts).
// Follows the layout and timing of a product-launch film reference (measured frame by frame); the words, marks, icons and
// pictures are our own and are all props.

import React from 'react';
import { z } from 'zod';
import { Camera, Ellipse, Image, Layer, Path, Rect, Text, blur, chromaticAberration, dropShadow, glow, grayscale, linearGradient, radialGradient, saturate, staticFile } from '@kinetographdev/core';
import { measureText } from '@remotion/layout-utils';
import { useCurrentFrame } from 'remotion';
import { ease, easeIn, easeOut, keys, prog, ramp, rr, spring, useFamily } from './lib.js';

export const W = 1920;
export const H = 1080;
export const FPS = 30;
export const DURATION = 623;

const hex = z.string().describe('A CSS colour.');
const APPS = z.enum(['folder', 'play', 'gear', 'list', 'note']);

export const launchFilmSchema = z.object({
  product: z.string().describe('The product name: in the headline, the closing line and the wordmark.'),
  version: z.string().describe('The version, set in the accent colour in the headline.'),
  headline: z.string().describe('The typed headline. {product} and {version} are replaced; the version is set in the accent colour.'),
  dock: z.array(APPS).length(5).describe('The five app icons in the dock, left to right. The product icon joins between the third and fourth.'),
  prompt: z.string().describe('The text typed into the prompt box. It wraps at the box width; a newline starts a new line.'),
  tags: z.array(z.string()).length(3).describe('The three chips that pop above the prompt box.'),
  connecting: z.string().describe('The line scrambled over the dots. {product} is replaced.'),
  glyphs: z.string().describe('Loose characters that fly across the dashboard.'),
  dashWord: z.string().describe('The word the loose letters settle into on the dashboard.'),
  dashTitle: z.string().describe('The dashboard page title.'),
  dashNav: z.array(z.string()).length(9).describe('The nine sidebar entries; the seventh is the selected one.'),
  dashPill: z.string().describe('The label in the pill beside the logo.'),
  dashPanel: z.array(z.string()).length(2).describe('The two lines of the panel at the lower left (the first in small grey capitals).'),
  dashSearch: z.string().describe('The placeholder in the panel search field.'),
  dashTiles: z.array(z.string()).length(2).describe('The two stat tiles.'),
  dashCta: z.string().describe('The coral button at the lower left.'),
  dashStats: z.array(z.object({ title: z.string(), sub: z.string() })).length(2).describe('The two cards at the top of the dashboard.'),
  dashRows: z.array(z.object({ title: z.string(), sub: z.string() })).length(6).describe('The six table rows.'),
  dashCols: z.array(z.string()).length(2).describe('The two lines repeated in each table column.'),
  dashAction: z.string().describe('The outlined button at the end of each row.'),
  filmTitle: z.string().describe('The title over the footage box and on the grid. {product} and {version} are replaced.'),
  tryLine: z.array(z.string()).length(3).describe('The closing line on the grid, in three words or phrases. {product} and {version} are replaced.'),
  markLetter: z.string().describe('The letter that strikes, extrudes, spins and lands as the closing mark. Empty uses the first letter of the product.'),
  accent: hex.describe('The product tile, the version in the headline, the prompt button flash, the mark on black and the call to action.'),
  ground: hex.describe('The light ground.'),
  ink: hex.describe('The text colour on the light ground.'),
  markA: hex.describe('Closing mark gradient, light end.'),
  markB: hex.describe('Closing mark gradient, deep end.'),
  uiFont: z.string().describe('Google Fonts family for interface text and the closing letter.'),
  headlineFont: z.string().describe('Google Fonts family for the typed headline.'),
  serifFont: z.string().describe('Google Fonts family for the wordmark.'),
  photos: z.array(z.string()).min(4).describe('Pictures for the poster burst: names of files under public/photos, without ".jpg". The defaults are public-domain artworks and posters from Wikimedia Commons.'),
  footage: z.array(z.string()).min(4).describe('The footage shots, in order: names of files under public/photos, without ".jpg". The first two are shown in black and white. The defaults are public-domain photos of runners from Wikimedia Commons.'),
});
export type LaunchFilmProps = z.infer<typeof launchFilmSchema>;

export const launchFilmDefaults: LaunchFilmProps = {
  product: 'Lumen',
  version: '5',
  headline: 'Meet {product} {version}',
  dock: ['folder', 'play', 'gear', 'list', 'note'],
  prompt: 'Build a modern web design that showcases good interfaces\nResponsive layouts, typography, focusing on usability\nUI interactions',
  tags: ['Web', 'Page', 'UI'],
  connecting: 'Connecting with {product}',
  glyphs: 'qCFbN</>',
  dashWord: 'Code',
  dashTitle: 'Services',
  dashNav: ['Dashboard', 'Transactions', 'Accounts', 'Investments', 'Credit Cards', 'Loans', 'Services', 'My Privileges', 'Setting'],
  dashPill: 'Money infos....',
  dashPanel: ['MANAGE YOUR', 'MONEY STATS'],
  dashSearch: 'Search for the best result',
  dashTiles: ['%30', '%70'],
  dashCta: 'Manage my business',
  dashStats: [{ title: 'Life Insurance', sub: 'Unlimited protection' }, { title: 'Safety', sub: 'We are your allies' }],
  dashRows: [
    { title: 'Business loans', sub: 'It is a long established' },
    { title: 'Checking accounts', sub: 'It is a long established' },
    { title: 'Savings accounts', sub: 'It is a long established' },
    { title: 'Debit and credit cards', sub: 'It is a long established' },
    { title: 'Life Insurance', sub: 'It is a long established' },
    { title: 'Business loans', sub: 'It is a long established' },
  ],
  dashCols: ['Lorem Ipsum', 'Many publishing'],
  dashAction: 'View Details',
  filmTitle: '{product} {version}',
  tryLine: ['Try', '{product} {version}', 'now'],
  markLetter: '',
  accent: '#d4553f',
  ground: '#ecebec',
  ink: '#111111',
  markA: '#ff58f4',
  markB: '#b72fdc',
  uiFont: 'Inter',
  headlineFont: 'Source Sans 3',
  serifFont: 'Fraunces',
  photos: ['art-01', 'art-02', 'art-03', 'art-04', 'art-05', 'art-06', 'art-07', 'art-08', 'art-09', 'art-10', 'art-11', 'art-12'],
  footage: ['run-01', 'run-02', 'run-03', 'run-04', 'run-05', 'run-06', 'run-07', 'run-08'],
};

// ---- small helpers -------------------------------------------------------------------------------------------------

const S = W / 736; // the reference is 736 x 414; everything but the closing 3D letter is authored in its units
const lin = (t: number) => t;
const fill = (s: string, p: LaunchFilmProps) => s.replace(/\{product\}/g, p.product).replace(/\{version\}/g, p.version);
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const hash2 = (i: number, j: number, k = 0) => hash(i * 37.7 + j * 91.3 + k * 17.1);
const vnoise = (x: number, y: number, k: number) => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash2(xi, yi, k);
  const b = hash2(xi + 1, yi, k);
  const c = hash2(xi, yi + 1, k);
  const d = hash2(xi + 1, yi + 1, k);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
};
// two octaves of value noise, 0..1
const fbm = (x: number, y: number, k: number) => (vnoise(x, y, k) * 0.68 + vnoise(x * 2.1 + 5.3, y * 2.1 + 1.7, k + 1) * 0.32);
const mixHex = (a: string, b: string, t: number): string => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * Math.min(1, Math.max(0, t))));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};
const circ = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`;
/** The product mark: four overlapping circles (a quatrefoil), `s` across. */
const cloverD = (s: number) => {
  const r = 0.27 * s;
  const q = 0.3814 * s;
  return `M0 ${-q}A${r} ${r} 0 1 1 ${q} 0A${r} ${r} 0 1 1 0 ${q}A${r} ${r} 0 1 1 ${-q} 0A${r} ${r} 0 1 1 0 ${-q}Z`;
};
const rect = (x: number, y: number, w: number, h: number) => `M${x} ${y}h${w}v${h}h${-w}Z`;

interface TxProps {
  id: string;
  x: number;
  cy: number;
  size: number;
  color: string;
  font: string;
  weight?: number;
  align?: 'left' | 'center' | 'right';
  w?: number;
  op?: number;
  children: string;
}
/** A single line of text centred on a y, in the unit layer. */
const Tx: React.FC<TxProps> = ({ id, x, cy, size, color, font, weight = 400, align = 'left', w = 400, op = 1, children }) => (
  <Text id={id} font={font} weight={weight} size={size} color={color} align={align} x={align === 'center' ? x - w / 2 : align === 'right' ? x - w : x} y={cy - size * 0.52} maxWidth={w} lineHeight={1} opacity={op}>
    {children}
  </Text>
);

// ---- the product mark and app icons --------------------------------------------------------------------------------

const Clover: React.FC<{ id: string; size: number; color: string; hole?: string }> = ({ id, size, color, hole }) => (
  <Layer id={id}>
    <Path id={`${id}-p`} d={cloverD(size)} fill={color} />
    {hole ? <Ellipse id={`${id}-h`} x={-size * 0.1} y={-size * 0.1} width={size * 0.2} height={size * 0.2} fill={hole} /> : null}
  </Layer>
);

/** The product's app tile, 60 x 60 with its centre at the origin. */
const BrandTile: React.FC<{ id: string; accent: string }> = ({ id, accent }) => (
  <Layer id={id} effects={[dropShadow({ y: 2.2, blur: 2.6, color: '#00000030' }), dropShadow({ y: 5, blur: 9, color: '#0000001a' })]}>
    <Path id={`${id}-t`} x={-30} y={-30} d={rr(60, 60, 14)} fill={linearGradient([[0, mixHex(accent, '#ffffff', 0.16)], [1, mixHex(accent, '#000000', 0.1)]], { angle: 180 })} />
    <Clover id={`${id}-c`} size={36} color="#ffffff" hole={accent} />
  </Layer>
);

const AppIcon: React.FC<{ id: string; kind: z.infer<typeof APPS> }> = ({ id, kind }) => {
  const tile = (fillP: string | ReturnType<typeof linearGradient>) => <Path id={`${id}-t`} x={-30} y={-30} d={rr(60, 60, 14)} fill={fillP} />;
  let body: React.ReactNode = null;
  if (kind === 'folder') {
    body = (
      <>
        {tile(linearGradient([[0, '#3aa0ff'], [0.5, '#2275ee'], [0.5, '#e9eef8'], [1, '#d5deee']], { angle: 90 }))}
        <Path id={`${id}-g`} d="M-14 -9h11l4 5h17a3 3 0 0 1 3 3v15a3 3 0 0 1-3 3h-32a3 3 0 0 1-3-3v-20a3 3 0 0 1 3-3z" fill="#ffffff" />
      </>
    );
  } else if (kind === 'play') {
    body = (
      <>
        {tile(linearGradient([[0, '#2a3030'], [1, '#080b0b']], { angle: 180 }))}
        <Path id={`${id}-g`} d="M-9 -13L15 0L-9 13Z" fill="#ffffff" stroke={{ color: '#ffffff', width: 3, join: 'round' } as never} />
      </>
    );
  } else if (kind === 'gear') {
    body = (
      <>
        {tile(linearGradient([[0, '#ffffff'], [0.55, '#f6f6f9'], [1, '#e2e2e9']], { angle: 180 }))}
        {Array.from({ length: 8 }, (_, i) => (
          <Layer key={i} id={`${id}-b${i}`} rotation={i * 45}>
            <Rect id={`${id}-bk${i}`} x={-3} y={-20} width={6} height={9} radius={2} fill="#3d4466" />
          </Layer>
        ))}
        <Ellipse id={`${id}-r`} x={-15} y={-15} width={30} height={30} stroke={{ color: '#3d4466', width: 5 }} />
        <Ellipse id={`${id}-r2`} x={-6} y={-6} width={12} height={12} stroke={{ color: '#8a90ab', width: 2.5 }} />
      </>
    );
  } else if (kind === 'list') {
    body = (
      <>
        {tile(linearGradient([[0, '#ffffff'], [0.55, '#f7f6f9'], [1, '#e4e3e9']], { angle: 180 }))}
        {[['#3a7bf0', -14], ['#e0453f', 0], ['#f0a53a', 14]].map(([c, y], i) => (
          <React.Fragment key={i}>
            <Ellipse id={`${id}-dr${i}`} x={-20.5} y={(y as number) - 5} width={10} height={10} stroke={{ color: c as string, width: 1.5 }} />
            <Ellipse id={`${id}-d${i}`} x={-18.5} y={(y as number) - 3} width={6} height={6} fill={c as string} />
            <Rect id={`${id}-l${i}`} x={-8} y={(y as number) - 0.7} width={26} height={1.4} fill="#c8c8cf" />
          </React.Fragment>
        ))}
      </>
    );
  } else {
    body = (
      <>
        {tile(linearGradient([[0, '#fbfaf5'], [0.6, '#f3f1e9'], [1, '#e2dfd3']], { angle: 180 }))}
        <Path id={`${id}-y`} d="M-30 -16V-16a14 14 0 0 1 14-14H16a14 14 0 0 1 14 14V-14H-30Z" fill={linearGradient([[0, '#fde36a'], [1, '#f0c21f']], { angle: 180 })} />
        {[-2, 9, 20].map((y, i) => (
          <Rect key={i} id={`${id}-l${i}`} x={-30} y={y} width={60} height={1.2} fill="#d9d5c8" />
        ))}
      </>
    );
  }
  return (
    <Layer id={id} effects={[dropShadow({ y: 2.2, blur: 2.6, color: '#00000030' }), dropShadow({ y: 5, blur: 9, color: '#0000001a' })]}>
      {body}
    </Layer>
  );
};

// ---- the prompt card ------------------------------------------------------------------------------------------------

const CARD_W = 482;
const CARD_H = 138;

const Pointer: React.FC<{ id: string }> = ({ id }) => (
  <Layer id={id} scale={0.95}>
    <Path id={`${id}-o`} d="M0 -2L-6.4 9.5L-2.3 8.6L-3.6 15.2L1.2 15.2L2.5 8.4L6.4 9.5Z" fill="#ffffff" stroke={{ color: '#ffffff', width: 1.6, join: 'round' } as never} />
    <Path id={`${id}-p`} d="M0 -1L-5.2 9L-1.6 8.2L-2.9 14.2L0.4 14.2L1.6 8.1L5.2 9Z" fill="#202022" />
  </Layer>
);

// ---- the dashboard (drawn in the card's own 570 x 386 units) -----------------------------------------------------------

const Dash: React.FC<{ id: string; p: LaunchFilmProps; ui: string; accent: string; widgets: number }> = ({ id, p, ui, accent, widgets }) => {
  const grey = '#8c8c96';
  const dark = '#1b1b22';
  const pastel = ['#fbd7e2', '#fde9bf', '#fcd5e0', '#d8e0fb', '#cdf3ec', '#fbd7e2'];
  const strong = ['#e86a92', '#f0b43a', '#e65b86', '#4d63d6', '#2bc4a8', '#e86a92'];
  return (
    <Layer id={id}>
      <Path id={`${id}-card`} d={rr(570, 386, 16)} fill="#ffffff" effects={[dropShadow({ y: 6, blur: 22, color: '#0000001c' })]} />
      {/* logo and pill */}
      <Path id={`${id}-logo1`} d="M38 14h16a4 4 0 0 1 4 4v6" stroke={{ color: '#3a42b8', width: 1.8, cap: 'round', join: 'round' } as never} />
      <Path id={`${id}-logo2`} d={rr(20, 12, 4)} x={36} y={19} stroke={{ color: '#3a42b8', width: 1.8 }} />
      {/* sidebar */}
      {p.dashNav.map((n, k) => {
        const y = 100 + k * 31.5;
        const sel = k === 6;
        return (
          <Layer id={`${id}-nav${k}`} key={k}>
            <Rect id={`${id}-ni${k}`} x={20} y={y - 5} width={10} height={10} radius={3} fill={sel ? '#3a42b8' : '#c9c9d1'} />
            <Tx id={`${id}-nt${k}`} x={38} cy={y} size={7} color={sel ? '#3a42b8' : '#b6b6bf'} font={ui} weight={sel ? 600 : 400} w={90}>{n}</Tx>
          </Layer>
        );
      })}
      {sel(p, id)}
      {/* header */}
      <Tx id={`${id}-h`} x={142} cy={25} size={8} color={dark} font={ui} weight={600}>{p.dashTitle}</Tx>
      <Rect id={`${id}-sr`} x={246} y={20} width={88} height={10} radius={5} fill="#f1f1f4" />
      <Ellipse id={`${id}-i1`} x={346} y={20.5} width={9} height={9} fill="#ececf1" />
      <Ellipse id={`${id}-i2`} x={364} y={20.5} width={9} height={9} fill="#fbd0d6" />
      {/* the two cards */}
      {p.dashStats.map((s, k) => (
        <Layer id={`${id}-st${k}`} key={k} x={k === 0 ? 168 : 392} y={70}>
          <Ellipse id={`${id}-sc${k}`} x={0} y={0} width={20} height={20} fill={k === 0 ? '#e6e8fb' : '#d4f5ee'} />
          <Ellipse id={`${id}-sd${k}`} x={6} y={6} width={8} height={8} fill={k === 0 ? '#4d63d6' : '#2bc4a8'} />
          <Tx id={`${id}-sa${k}`} x={28} cy={7} size={7} color={dark} font={ui} weight={600}>{s.title}</Tx>
          <Tx id={`${id}-sb${k}`} x={28} cy={16} size={5.2} color={grey} font={ui}>{s.sub}</Tx>
        </Layer>
      ))}
      {/* the table */}
      {p.dashRows.map((r, k) => {
        const y = 132 + k * 42.3;
        return (
          <Layer id={`${id}-r${k}`} key={k}>
            <Ellipse id={`${id}-rb${k}`} x={160} y={y - 10} width={20} height={20} fill={pastel[k]} />
            <Ellipse id={`${id}-rd${k}`} x={165} y={y - 5} width={10} height={10} fill={strong[k]} />
            <Tx id={`${id}-rt${k}`} x={188} cy={y - 4} size={6.4} color={dark} font={ui} weight={500}>{r.title}</Tx>
            <Tx id={`${id}-rs${k}`} x={188} cy={y + 5} size={5} color={grey} font={ui}>{r.sub}</Tx>
            {[286, 356, 426].map((cx, c) => (
              <React.Fragment key={c}>
                <Tx id={`${id}-c${k}-${c}a`} x={cx} cy={y - 4} size={6} color={dark} font={ui} weight={500}>{p.dashCols[0]}</Tx>
                <Tx id={`${id}-c${k}-${c}b`} x={cx} cy={y + 5} size={5} color={grey} font={ui}>{p.dashCols[1]}</Tx>
              </React.Fragment>
            ))}
            <Path id={`${id}-rbtn${k}`} x={488} y={y - 8.5} d={rr(66, 17, 8.5)} stroke={{ color: k === 2 ? '#4655c7' : '#c8c8d0', width: 1 }} />
            <Tx id={`${id}-rbt${k}`} x={521} cy={y} size={5.6} color={k === 2 ? '#4655c7' : '#b3b3bd'} font={ui} weight={500} align="center" w={66}>{p.dashAction}</Tx>
          </Layer>
        );
      })}
      {/* the widgets that slide in from the left and overhang the card */}
      <Layer id={`${id}-widgets`} x={-(1 - widgets) * 180} opacity={Math.min(1, widgets * 3)}>
        <Rect id={`${id}-pillsq`} x={-9} y={36} width={22} height={22} radius={6} fill="#6b5fd6" effects={[dropShadow({ y: 2, blur: 5, color: '#0000002a' })]} />
        <Path id={`${id}-pill`} x={22} y={37} d={rr(84, 20, 8)} fill="#ffffff" effects={[dropShadow({ y: 2, blur: 6, color: '#00000020' })]} />
        <Tx id={`${id}-pilltx`} x={30} cy={47} size={7.2} color={dark} font={ui} weight={500} w={80}>{p.dashPill}</Tx>
        <Path id={`${id}-panel`} x={-8} y={142} d={rr(146, 66, 8)} fill="#ffffff" effects={[dropShadow({ y: 2, blur: 8, color: '#0000001a' })]} />
        <Tx id={`${id}-pa`} x={0} cy={154} size={7.4} color="#8d8d95" font={ui} weight={500} w={130}>{p.dashPanel[0]}</Tx>
        <Tx id={`${id}-pb`} x={0} cy={168} size={7.6} color={dark} font={ui} weight={700} w={130}>{p.dashPanel[1]}</Tx>
        <Path id={`${id}-pfield`} x={0} y={182} d={rr(130, 15, 3)} fill="#efeff2" />
        <Tx id={`${id}-pfx`} x={5} cy={189.5} size={4.8} color="#8d8d95" font={ui} w={120}>{p.dashSearch}</Tx>
        {p.dashTiles.map((t, k) => (
          <Layer id={`${id}-tile${k}`} key={k} x={-6 + k * 68} y={222}>
            <Path id={`${id}-tb${k}`} d={rr(66, 86, 7)} fill="#e6e5e8" />
            <Tx id={`${id}-tt${k}`} x={33} cy={43} size={12.5} color={dark} font={ui} weight={500} align="center" w={66}>{t}</Tx>
          </Layer>
        ))}
        <Path id={`${id}-cta`} x={-10} y={326} d={rr(142, 30, 6)} fill={accent} effects={[dropShadow({ y: 2, blur: 6, color: '#0000002a' })]} />
        <Tx id={`${id}-ctat`} x={0} cy={341} size={8.6} color="#ffffff" font={ui} weight={500} w={110}>{p.dashCta}</Tx>
        <Path id={`${id}-ctab`} x={106} y={330} d={rr(22, 22, 5)} fill="#ffffff" />
        <Path id={`${id}-ctaa`} d="M111 341h12M119 336l5 5l-5 5" stroke={{ color: '#2a2a30', width: 1.5, cap: 'round', join: 'round' } as never} />
      </Layer>
    </Layer>
  );
};
/** The row highlight behind the selected sidebar entry. */
const sel = (_p: LaunchFilmProps, id: string) => <Rect id={`${id}-selbar`} x={0} y={94 + 6 * 31.5 - 8} width={3} height={16} radius={1.5} fill="#3a42b8" />;

// ---- the composition -------------------------------------------------------------------------------------------------

export const LaunchFilm: React.FC<LaunchFilmProps> = (p) => {
  const frame = useCurrentFrame();
  const F = frame + 1; // the reference's frame numbers (1-based)
  const ui = useFamily(p.uiFont, ['400', '500', '600', '700', '800']);
  const head = useFamily(p.headlineFont, ['400', '500', '600']);
  const serif = useFamily(p.serifFont, ['500', '600', '700']);
  const accent = p.accent;
  const ink = p.ink;
  const product = p.product;
  const letter = (p.markLetter || product.charAt(0) || 'L').slice(0, 1);

  // ---- which shot is on ------------------------------------------------------------------------------------------
  const light = F < 432; // the light ground
  const black = F >= 424 && F < 580;
  const white = F >= 580;

  // ---- beat 1 and 2: the dock ------------------------------------------------------------------------------------
  const GAP = 17;
  const leave = [46, 55, 63, 55, 46];
  const wBrand = Math.max(0, Math.min(1.08, spring(F, 6, 24, 0.12)));
  const dockW = p.dock.map((_, i) => 1 - prog(F, leave[i], leave[i] + 9, ease));
  const order: { key: string; w: number }[] = [
    { key: 'd0', w: dockW[0] }, { key: 'd1', w: dockW[1] }, { key: 'd2', w: dockW[2] },
    { key: 'brand', w: wBrand }, { key: 'd3', w: dockW[3] }, { key: 'd4', w: dockW[4] },
  ];
  const sumW = order.reduce((a, o) => a + Math.max(0, o.w), 0);
  const total = Math.max(60, sumW * (60 + GAP) - GAP);
  let cursor = 368 - total / 2;
  const slots: Record<string, { x: number; w: number }> = {};
  order.forEach((o) => {
    const w = Math.max(0, o.w);
    slots[o.key] = { x: cursor + (w * 60) / 2, w };
    cursor += w * (60 + GAP);
  });
  const dockOp = Math.min(1, Math.max(0, (sumW - 1) * 1.7));
  const brandGone = prog(F, 93, 96, easeIn);
  const beat1 = F < 97;
  const DOCK_Y = 204;

  // ---- beat 3: the typed headline ---------------------------------------------------------------------------------
  const headText = fill(p.headline, p);
  const headSize = 41;
  const headW = measureText({ text: headText, fontFamily: head, fontSize: headSize, fontWeight: 500 }).width;
  const typedFrac = keys(F, [[95, 0], [97, 6 / 19], [98, 9 / 19], [102, 10 / 19], [106, 11 / 19], [110, 11 / 19], [120, 15 / 19], [130, 17.5 / 19], [140, 1]], lin);
  const typedN = typedFrac * headText.length;
  const verAt = headText.lastIndexOf(p.version);
  const shiftX = 43 * Math.pow(Math.max(0, 1 - typedFrac) / 0.53, 1.6) * (headW / 308);
  // once typed, the line keeps drifting left, slowly and then faster, until the coral wash takes it
  const drift = keys(F, [[140, 0], [150, 2], [160, 8], [166, 16], [170, 26], [173, 36], [176, 54], [178, 82], [180, 128], [182, 178]], lin);
  const headX = 368 - headW / 2 + shiftX - drift;
  const headOp = 1 - prog(F, 180, 182, lin);
  const beat3 = F >= 95 && F < 185;

  // ---- beat 4: the mosaic sweep -----------------------------------------------------------------------------------
  const mosaicOn = F >= 176 && F < 190;

  // ---- beat 4 / 5: the prompt card --------------------------------------------------------------------------------
  const cardScale = keys(F, [[180, 1.3], [184, 1.17], [187, 1.07], [192, 0.97], [200, 0.9], [215, 0.85], [235, 0.82], [262, 0.79], [300, 0.77]], ease);
  const cardOp = prog(F, 180, 183, lin) * (1 - prog(F, 256, 263, lin));
  const cardOn = F >= 180 && F < 264;
  const typedChars = keys(F, [[186, 0], [196, 25], [208, 100], [214, 140]], lin);
  const btnPress = prog(F, 217, 221, ease) * (1 - prog(F, 224, 234, ease));
  const ptr = {
    x: keys(F, [[194, 556], [200, 539], [214, 549], [218, 549]], ease),
    y: keys(F, [[194, 358], [200, 356], [214, 250], [218, 248]], ease),
    op: prog(F, 193, 198, lin) * (1 - prog(F, 228, 233, lin)),
  };
  const sendDown = 1 - 0.1 * Math.sin(Math.PI * Math.min(1, Math.max(0, (F - 217) / 7)));
  const glowTint = prog(F, 222, 230, ease) * (1 - prog(F, 258, 272, lin));
  const promptChars = (c: string, i: number) => {
    const a = Math.min(1, Math.max(0, (typedChars - i) / 6));
    return a >= 1 ? null : { opacity: a };
  };
  const tagPop = (k: number) => spring(F, 225 + k * 5, 14, 0.25);

  // ---- the poster burst -------------------------------------------------------------------------------------------
  const burstOn = F >= 224 && F < 263;
  const burstOp = (1 - prog(F, 255, 262, lin));
  // the posters ride a drum that spins about a horizontal axis through the card: the near ones are large and pass in
  // front of the card's right side moving up, the far ones are small and pass behind it, peeking out above and below.
  // The drum's axis is turned a little, so the near side sits to the right of the far side.
  const grow = prog(F, 221, 229, easeOut);
  const drum = Array.from({ length: 10 }, (_, j) => {
    const th = (j / 10) * Math.PI * 2 + ((F - 222) * 6 * Math.PI) / 180;
    const z = Math.cos(th);
    const w = (48 + 72 * Math.pow((z + 1) / 2, 1.6)) * (0.45 + 0.55 * grow);
    const h = w * (j % 4 === 0 ? 1.12 : 1);
    return { j, z, w, h, x: 375 + 82 * z * grow, y: 205 - 90 * Math.sin(th) * grow };
  }).sort((u, v) => u.z - v.z);

  // ---- beat 6: the dots ---------------------------------------------------------------------------------------------
  const dotsOn = F >= 240 && F < 316;
  const dotLayerOp = 1 - 0.18 * prog(F, 294, 300, lin);

  // ---- beat 7: the dashboard ----------------------------------------------------------------------------------------
  const dashOn = F >= 288 && F < 341;
  const dashOp = prog(F, 289, 297, lin) * (1 - prog(F, 336, 340, lin));
  const kd = keys(F, [[300, 1.07], [308, 1.045], [314, 1.005], [320, 0.96], [326, 0.955], [332, 1.07], [339, 1.13]], ease);
  const dcx = keys(F, [[300, 369], [308, 369], [314, 355], [320, 346], [326, 346], [332, 342], [339, 340]], ease);
  const dcy = keys(F, [[300, 203], [320, 205], [339, 200]], ease);
  const widgets = prog(F, 304, 318, easeOut);

  // ---- beat 8: grid and footage ----------------------------------------------------------------------------------------
  const gridOn = F >= 340 && F < 431;
  const boxW = keys(F, [[340, 247], [346, 350], [352, 419], [358, 463], [364, 488], [370, 498], [376, 490], [384, 316], [392, 172], [400, 172], [401, 172], [408, 295], [416, 312], [431, 312]], lin);
  const boxH = keys(F, [[340, 131], [346, 185], [352, 222], [358, 245], [364, 258], [370, 264], [376, 258], [384, 150], [392, 59], [431, 56]], lin);
  const footOp = 1 - prog(F, 378, 390, lin);
  const titleCol = mixHex('#ffffff', ink, prog(F, 380, 394, lin));
  const filmTitle = fill(p.filmTitle, p);
  const tryWords = p.tryLine.map((s) => fill(s, p));
  const tW = measureText({ text: tryWords[1], fontFamily: ui, fontSize: 34, fontWeight: 700 }).width;
  const tryA = measureText({ text: tryWords[0], fontFamily: ui, fontSize: 34, fontWeight: 700 }).width;
  const shot = Math.max(0, Math.min(p.footage.length - 1, Math.floor((F - 340) / 6.2)));
  const shotT = ((F - 340) / 6.2) - shot;

  // ---- beat 9 and 10: black, the mark and the wordmark ---------------------------------------------------------------
  const iris = keys(F, [[419, 1800], [424, 640], [428, 200], [430.5, 0]], ease);
  const irisOn = F >= 419 && F < 431;
  const markSize = keys(F, [[431, 0], [432, 40], [440, 60], [450, 66], [462, 38], [470, 56], [480, 66], [490, 38], [500, 58], [506, 74]], ease);
  const wmSize = 76;
  const wmW = measureText({ text: product, fontFamily: serif, fontSize: wmSize, fontWeight: 600 }).width;
  const lockW = 74 + 14 + wmW;
  const markFinal = 368 - lockW / 2 + 37;
  const markFrac = keys(F, [[462, 0], [470, 0.45], [480, 0.96], [490, 0.98], [506, 1]], ease);
  const markX = 368 + (markFinal - 368) * markFrac;
  const wmRise = prog(F, 482, 502, easeOut);

  // the strike
  const strike = F >= 531 && F < 542;
  const strikeSlash = prog(F, 531, 533, lin);
  const letterIn = prog(F, 533, 534, lin);
  const glitch = F >= 535 && F < 538 ? 1 : 0;
  const dark = F >= 538 && F < 540 ? 1 : 0;
  const lettersMagenta = F >= 540 && F < 542;
  const fadeOutLock = 1 - prog(F, 537, 541, lin) * 0.45;

  // the 3D letter
  const threeD = F >= 542 && F < 579;
  const letH = keys(F, [[541, 135], [543, 230], [546, 285], [562, 272], [566, 228], [570, 126], [574, 96], [577, 220]], ease);
  const letYaw = keys(F, [[541, 0], [545, -44], [548, -52], [560, -58], [565, -70], [570, -30], [574, -4], [577, 0]], ease);
  const letX = keys(F, [[541, 368], [546, 357], [562, 367], [570, 368]], ease);
  const letY = keys(F, [[541, 207], [546, 214], [562, 209], [570, 207]], ease);
  const flash = F >= 577 && F < 579;

  const markEnd = spring(F, 579, 16, 0.18);

  // ---- drawing -----------------------------------------------------------------------------------------------------------
  const squares = Array.from({ length: 26 }, (_, i) => {
    const sz = 14 + 12 * hash(i * 1.7);
    const x = ((hash(i * 3.3) * 800 - 30 + F * (0.05 + 0.1 * hash(i))) % 800) - 30;
    const y = ((hash(i * 5.9) * 440 - F * 0.08 * (0.4 + hash(i * 2.2))) % 440 + 440) % 440 - 12;
    const o = 0.07 + 0.1 * (0.5 + 0.5 * Math.sin(F * 0.04 + i * 2.1));
    return <Rect key={i} id={`sq${i}`} x={x} y={y} width={sz} height={sz} radius={2} fill="#dad9dc" opacity={o} />;
  });

  // dots: a few smooth noise fields cut into colour bands, like a posterised picture shown as a dot matrix, so the
  // colours gather in clusters and veins, with empty patches where no dot is drawn. The fields drift, so the clusters
  // crawl; the dots land scattered, and each later stage sweeps up from the bottom.
  const dotPaths: Record<string, string> = {};
  const dotTops: Record<string, string> = {};
  if (dotsOn) {
    const cols = 53;
    const rows = 30;
    const k = 14 / 19.5; // the field was tuned on a 19.5 px grid; keep its clusters the same size in pixels
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const x = 7 + i * 14;
        const y = 4 + j * 14;
        const h1 = hash2(i, j, 1);
        const h2 = hash2(i, j, 2);
        const up = 1 - j / (rows - 1); // 0 at the bottom row, 1 at the top
        // the shape field (bands), a family field (which colours) and a slow one (when each stage lands)
        const v = fbm(i * k * 0.24 + F * 0.05, j * k * 0.28 - F * 0.07, 11) * 0.9 + vnoise(i * k * 0.8, j * k * 0.8 + F * 0.1, 15) * 0.1 + (h2 - 0.5) * 0.05;
        const w = fbm(i * k * 0.11 - F * 0.02, j * k * 0.13 + F * 0.03, 23);
        const s = fbm(i * k * 0.08, j * k * 0.09, 37);
        const tA = 244 + 9 * s + 8 * h1 + 4 * up;
        const u = F - tA;
        if (u < 0) continue;
        const tB = 260 + 12 * up + 5 * s + 3 * h2;
        const tC = 276 + 9 * (1 - s) + 6 * up + 3 * h1;
        let color: string | null;
        if (u < 3) color = '#ffffff';
        else if (F < tB) {
          // the first picture: dark red veins, orange edges, blue pockets (more toward the top), white and gaps between
          const blue = w + 0.18 * up > 0.62;
          // red runs along a band of the field, so it draws veins and loops with paler dots inside them
          // the top of the frame stays sparse (blue and white dots on the ground) until the picture settles
          const gap = 0.3 + 0.24 * up * up * (1 - prog(F, 252, 264, lin));
          color = v < gap ? null
            : v < gap + 0.06 ? '#ffffff'
            : v < 0.45 ? (blue ? '#7aa9e6' : h1 < 0.55 ? null : '#f3cbc0')
            : v < 0.5 ? (blue ? '#2e66bb' : h1 < 0.45 ? '#e3711b' : '#f3cbc0')
            : v < 0.62 ? '#a50f1d'
            : v < 0.67 ? (h1 < 0.3 ? '#e3711b' : '#f3cbc0')
            : '#f3cbc0';
        } else if (F < tC) {
          // the second, paler picture: peach and blush with red specks along the ridges
          color = v < 0.34 ? '#ffffff'
            : v < 0.46 ? '#f7dad2'
            : v < 0.54 ? '#f1c4b8'
            : v < 0.58 ? (w > 0.55 ? '#e6a0b8' : '#e98a5f')
            : v < 0.63 ? '#a50f1d'
            : '#f6dbd2';
        } else {
          // the third: big green clusters on blush and peach, red still in the ridges
          color = w > 0.6 ? '#27a98a'
            : w > 0.56 ? '#7fd0b8'
            : v < 0.38 ? '#f7dad2'
            : v < 0.5 ? '#f1c4b8'
            : v < 0.57 ? '#e6a0b8'
            : v < 0.62 ? '#a50f1d'
            : '#f3cbc0';
        }
        if (!color) continue;
        const tc = 299 + 14 * (x / 736) + 4 * h1;
        const r = 5 * Math.min(1, u / 3) * (1 - prog(F, tc, tc + 5, lin)) * (u < 3 ? 0.55 : 1);
        if (r < 0.25) continue;
        // each dot is a bead: a darker rim, the colour inside it nudged up and left, so it reads as lit from above
        const rim = mixHex(color, '#3a1010', color === '#ffffff' ? 0.1 : 0.28);
        dotPaths[rim] = (dotPaths[rim] ?? '') + circ(x, y, r);
        dotTops[color] = (dotTops[color] ?? '') + circ(x - r * 0.08, y - r * 0.1, r * 0.8);
      }
    }
  }

  // the connecting line
  const connText = fill(p.connecting, p);
  const connChars = connText.length;
  const scramble = (i: number) => {
    const done = 287 + i * 0.25;
    if (F >= done) return connText[i];
    const alpha = 'abcdefghijklmnopqrstuvwxyzCDEFHNPRSTU';
    return connText[i] === ' ' ? ' ' : alpha[Math.floor(hash(i * 7 + F * 3.1) * alpha.length)];
  };
  const connShown = Array.from({ length: connChars }, (_, i) => scramble(i)).join('');
  const split = prog(F, 297, 303, easeOut);
  const connOn = F >= 286 && F < 312;
  const connOp = prog(F, 286, 290, lin) * (1 - prog(F, 304, 311, lin));
  const words = connText.split(' ');
  const pieces: { t: string; ox: number; oy: number; tx: number; ty: number }[] = [];
  {
    const sizeC = 26;
    let x = 0;
    const toks: string[] = [];
    words.forEach((w) => {
      if (w.length > 8) {
        toks.push(w.slice(0, 7), w.slice(7));
      } else toks.push(w);
    });
    const spaceW = measureText({ text: ' ', fontFamily: ui, fontSize: sizeC, fontWeight: 500 }).width;
    const widths = toks.map((t) => measureText({ text: t, fontFamily: ui, fontSize: sizeC, fontWeight: 500 }).width);
    const totalW = widths.reduce((a, b) => a + b, 0) + spaceW * (toks.length - 1) * 0.5;
    x = 360 - totalW / 2;
    const targets = [[266, 119], [338, 291], [390, 352], [520, 205], [190, 330], [600, 90]];
    toks.forEach((t, i) => {
      pieces.push({ t, ox: x, oy: 206, tx: targets[i % targets.length][0] - widths[i] / 2, ty: targets[i % targets.length][1] });
      x += widths[i] + spaceW * 0.5;
    });
  }

  // loose letters on the dashboard
  const floaters = Array.from({ length: 6 }, (_, i) => {
    const t0 = 304 + i * 1.8;
    const t = (F - t0) / 9;
    return { ch: p.glyphs[i % p.glyphs.length], t, x0: 40 + 650 * hash(i * 4.1), y0: 40 + 330 * hash(i * 8.7), x1: 80 + 570 * hash(i * 2.9 + 1), y1: 60 + 300 * hash(i * 6.3 + 1) };
  });
  const dashWordOn = F >= 312 && F < 333;
  const dashWordCh = Array.from(p.dashWord);

  // the coral wash: a soft band of coarse, blurred cells that rises through the frame in about eight frames, streaked
  // row by row like a smear, deepest at its middle and at the frame's sides, uncovering the prompt card behind it
  const mosaic: React.ReactNode[] = [];
  if (mosaicOn) {
    const yc = keys(F, [[177, 620], [179, 480], [181, 370], [183, 110], [185, -50], [188, -270]], ease);
    const rowH = 3;
    for (let j = 0; j * rowH < 414; j++) {
      const y = j * rowH + rowH / 2;
      const d = (y - yc) / 165;
      // the row smear: brightness varies smoothly from row to row, so the band reads as streaked
      const band = Math.exp(-d * d) * (0.84 + 0.16 * vnoise(y / 20, 3.3, 41));
      if (band < 0.03) continue;
      // across the row, soft blocks (cell noise, interpolated) and more colour at the frame's sides
      const stops: [number, string][] = Array.from({ length: 11 }, (_, k) => {
        const x = k / 10;
        const side = 0.78 + 0.22 * Math.abs(x - 0.5) * 2;
        const cell = 0.72 + 0.28 * vnoise(x * 736 / 34, y / 34, 43);
        const al = Math.min(1, band * side * cell);
        const c = mixHex('#f2d6cf', '#d47862', Math.min(1, al * 1.15));
        return [x, `${c}${Math.round(Math.min(1, al * 1.35) * 255).toString(16).padStart(2, '0')}`];
      });
      mosaic.push(<Rect key={j} id={`mos${j}`} x={0} y={j * rowH} width={736} height={rowH + 0.6} fill={linearGradient(stops, { angle: 90 })} />);
    }
  }

  // the footage box
  const fx = 368 - boxW / 2;
  const fy = 207 - boxH / 2;
  const shotImg = `photos/${p.footage[shot]}.jpg`;
  const shotDir = shot % 2 === 0 ? 1 : -1;
  const panX = (shotT - 0.5) * 60 * shotDir;
  const bwShot = shot < 2;

  // 3D letter slices
  const slices = 18;
  const depth = letH * 0.32;
  const sliceNodes: React.ReactNode[] = [];
  if (threeD) {
    for (let k = 0; k < slices; k++) {
      const t = k / (slices - 1); // 0 back, 1 front
      const c = k === slices - 1 ? mixHex(p.markA, '#ffffff', 0.35) : mixHex(mixHex(p.markB, '#000000', 0.35), mixHex(p.markA, p.markB, 0.4), t);
      sliceNodes.push(
        <Layer key={k} id={`ex${k}`} z={(t - 0.5) * depth}>
          <Text id={`ex${k}-t`} font={ui} weight={800} size={letH / 0.72} color={c} align="center" x={-300} y={-(letH / 0.72) * 0.5} maxWidth={600} lineHeight={1}>
            {letter}
          </Text>
        </Layer>,
      );
    }
  }
  const streak1 = prog(F, 542, 544, lin) * (1 - prog(F, 546, 558, ease));
  const streak2 = prog(F, 567, 574, lin) * (1 - prog(F, 575, 578, lin));
  const haze = prog(F, 542, 546, lin) * (1 - prog(F, 575, 579, lin));

  const letterSize = 190;

  const drumPosters = (list: typeof drum) =>
    list.map((d) => (
      <Layer key={d.j} id={`pic${d.j}`} x={d.x - d.w / 2} y={d.y - d.h / 2}>
        <Layer id={`pic${d.j}-c`} clip={{ kind: 'path', d: rect(0, 0, d.w, d.h) }}>
          <Image id={`pic${d.j}-i`} src={staticFile(`photos/${p.photos[d.j % p.photos.length]}.jpg`)} x={0} y={0} width={d.w} height={d.h} fit="cover" effects={[saturate(1.3)]} />
        </Layer>
      </Layer>
    ));

  return (
    <Layer id="lf-root">
      <Camera perspective={1800} />
      <Rect id="lf-ground" x={0} y={0} width={W} height={H} fill={black ? '#000000' : white ? '#ffffff' : p.ground} />

      {/* ============ the light shots, in reference units ============ */}
      {light && (
        <Layer id="lf-u" scale={S}>
          <Layer id="lf-lightclip">
            {F < 340 && squares}

            {/* dock and product icon */}
            {beat1 && (
              <>
                <Path id="dock-bg" x={368 - (total + 26) / 2} y={DOCK_Y - 47.5} d={rr(total + 26, 95, 22)} fill={linearGradient([[0, '#ffffff'], [0.8, '#fdfdfd'], [1, '#f3f3f5']], { angle: 180 })} opacity={dockOp} effects={[dropShadow({ y: 1.5, blur: 2.5, color: '#00000014' }), dropShadow({ y: 9, blur: 22, color: '#00000026' })]} />
                {p.dock.map((k, i) => {
                  const key = `d${i}`;
                  const sl = slots[key];
                  return sl.w > 0.01 ? (
                    <Layer key={key} id={`ic-${key}`} x={sl.x} y={DOCK_Y} scale={sl.w} opacity={Math.min(1, sl.w * 1.2)}>
                      <AppIcon id={`icon-${key}`} kind={k} />
                    </Layer>
                  ) : null;
                })}
                <Layer id="ic-brand" x={slots.brand.x} y={DOCK_Y} scale={Math.max(0, slots.brand.w * (1 - brandGone))} opacity={Math.min(1, slots.brand.w * 1.5)}>
                  <BrandTile id="icon-brand" accent={accent} />
                </Layer>
              </>
            )}

            {/* the coral wash that sweeps the headline off; the headline and the card sit over it */}
            {mosaicOn && <Layer id="mosaic">{mosaic}</Layer>}

            {/* the headline */}
            {beat3 && (
              <Text
                id="head"
                font={head}
                weight={500}
                size={headSize}
                color={ink}
                x={headX}
                y={207 - headSize * 0.56}
                maxWidth={700}
                lineHeight={1}
                opacity={headOp}
                chars={(c, i) => {
                  // each letter lands whole, as typed letters do
                  const a = typedN - i >= 0.5 ? 1 : 0;
                  const col = i >= verAt && verAt >= 0 ? accent : undefined;
                  return a >= 1 && !col ? null : { opacity: a, ...(col ? { color: col } : {}) };
                }}
              >
                {headText}
              </Text>
            )}

            {/* the dot matrix */}
            {dotsOn && (
              <Layer id="dots" opacity={dotLayerOp}>
                {Object.entries(dotPaths).map(([c, d], k) => (
                  <Path key={k} id={`dot${k}`} d={d} fill={c} />
                ))}
                {Object.entries(dotTops).map(([c, d], k) => (
                  <Path key={`t${k}`} id={`dott${k}`} d={d} fill={c} />
                ))}
              </Layer>
            )}

            {/* the far half of the poster drum, behind the card */}
            {burstOn && <Layer id="burst-far" opacity={burstOp}>{drumPosters(drum.filter((d) => d.z < 0.05))}</Layer>}

            {/* the prompt card */}
            {cardOn && (
              <Layer id="card" x={368} y={204} scale={cardScale} anchorX={CARD_W / 2} anchorY={CARD_H / 2} opacity={cardOp}>
                <Path id="card-bg" d={rr(CARD_W, CARD_H, 11)} fill="#ffffff" effects={[dropShadow({ y: 3, blur: 12, color: '#0000001a' })]} />
                <Path id="card-tint" d={rr(CARD_W, CARD_H, 11)} fill={linearGradient([[0, `${accent}55`], [0.4, `${accent}14`], [1, `${accent}00`]], { angle: 90 })} opacity={glowTint} />
                <Path id="card-wash" d={rr(CARD_W, CARD_H, 11)} fill={linearGradient([[0, '#d47862d9'], [0.55, '#e7a4947a'], [1, '#f6e0da30']], { angle: 180 })} opacity={1 - prog(F, 184, 190, ease)} />
                <Text id="card-text" font={ui} weight={400} size={15} color="#2b2b30" x={19} y={17} maxWidth={458} lineHeight={1.4} chars={promptChars}>
                  {p.prompt}
                </Text>
                {/* toolbar */}
                <Ellipse id="tb-gear" x={22} y={102} width={16} height={16} stroke={{ color: '#9a9aa2', width: 1.4 }} />
                <Ellipse id="tb-gear2" x={27.5} y={107.5} width={5} height={5} stroke={{ color: '#9a9aa2', width: 1.2 }} />
                <Path id="tb-plus" d="M58 110h16M66 102v16" stroke={{ color: '#9a9aa2', width: 1.4, cap: 'round' } as never} />
                <Layer id="tb-mark" x={102} y={110}>
                  <Clover id="tb-clover" size={19} color={accent} />
                </Layer>
                {/* send */}
                <Layer id="send" x={453} y={110} scale={sendDown}>
                  <Path id="send-bg" x={-15.5} y={-15.5} d={rr(31, 31, 8)} fill={mixHex('#0a0a0b', '#7a352a', btnPress)} />
                  <Path id="send-a" d="M0 8V-8M-7 -1L0 -8L7 -1" stroke={{ color: '#ffffff', width: 1.8, cap: 'round', join: 'round' } as never} />
                </Layer>
                {/* chips */}
                {p.tags.map((t, k) => {
                  const w = 27 + t.length * 7.6;
                  const x0 = 18 + k * (w + 6) + (k > 0 ? (p.tags[0].length + (k > 1 ? p.tags[1].length : 0)) * 0 : 0);
                  const xs = 18 + p.tags.slice(0, k).reduce((a, s) => a + 27 + s.length * 7.6 + 7, 0);
                  void x0;
                  return (
                    <Layer key={k} id={`chip${k}`} x={xs + w / 2} y={-27} scale={tagPop(k) * 1.0} anchorX={w / 2} anchorY={0}>
                      <Path id={`chip${k}-bg`} d={rr(w, 20, 10)} fill={accent} />
                      <Text id={`chip${k}-t`} font={ui} weight={600} size={10.5} color="#ffffff" x={8} y={4.8} maxWidth={w} lineHeight={1}>{`${t}  ×`}</Text>
                    </Layer>
                  );
                })}
              </Layer>
            )}

            {/* the pointer */}
            {F >= 193 && F < 234 && (
              <Layer id="ptr" x={ptr.x} y={ptr.y} opacity={ptr.op}>
                <Pointer id="ptr-p" />
              </Layer>
            )}

            {/* the near half of the poster drum, over the card */}
            {burstOn && <Layer id="burst-near" opacity={burstOp}>{drumPosters(drum.filter((d) => d.z >= 0.05))}</Layer>}


            {/* the dashboard */}
            {dashOn && (
              <Layer id="dashwrap" x={dcx} y={dcy} scale={kd} anchorX={285} anchorY={193} opacity={dashOp}>
                <Dash id="dash" p={p} ui={ui} accent={accent} widgets={widgets} />
              </Layer>
            )}

            {/* the connecting line */}
            {connOn && F < 297 && (
              <>
                <Rect id="conn-wash" x={150} y={186} width={420} height={40} radius={8} fill="#ffffff" opacity={0.35 * connOp} effects={[blur(8)]} />
                <Text id="conn" font={ui} weight={500} size={26} color="#101012" align="center" x={0} y={206 - 14} maxWidth={720} lineHeight={1} opacity={connOp}>
                  {connShown}
                </Text>
              </>
            )}
            {connOn && F >= 297 && (
              <Layer id="conn-pieces" opacity={connOp} motionBlur={{ samples: 6, shutter: 1 }}>
                {pieces.map((q, i) => (
                  <Text key={i} id={`cp${i}`} font={ui} weight={500} size={26} color="#101012" x={q.ox + (q.tx - q.ox) * split} y={q.oy + (q.ty - q.oy) * split - 14 + (F - 303) * (F > 303 ? 14 : 0)} maxWidth={300} lineHeight={1}>
                    {q.t}
                  </Text>
                ))}
              </Layer>
            )}

            {/* loose letters and the word they settle into */}
            {dashOn && F >= 304 && F < 334 && (
              <Layer id="floaters" motionBlur={{ samples: 6, shutter: 0.9 }} opacity={1 - prog(F, 328, 333, lin)}>
                {floaters.map((fl, i) => {
                  if (fl.t < 0 || fl.t > 1) return null;
                  const e = ease(fl.t);
                  return (
                    <Text key={i} id={`fl${i}`} font={ui} weight={500} size={26} color="#101012" x={fl.x0 + (fl.x1 - fl.x0) * e} y={fl.y0 + (fl.y1 - fl.y0) * e} maxWidth={90} lineHeight={1} rotation={0} opacity={Math.sin(Math.PI * fl.t)}>
                      {fl.ch}
                    </Text>
                  );
                })}
              </Layer>
            )}
            {dashWordOn && (
              <Layer id="dashword" motionBlur={{ samples: 6, shutter: 0.9 }} opacity={prog(F, 312, 316, lin) * (1 - prog(F, 328, 332, lin))}>
                {dashWordCh.map((ch, i) => {
                  const t = prog(F, 309 + i, 318 + i, easeOut);
                  const tx = 368 + (i - (dashWordCh.length - 1) / 2) * 15 - 8;
                  return (
                    <Text key={i} id={`dw${i}`} font={ui} weight={500} size={27} color="#101012" x={tx + (1 - t) * (hash(i * 3.3) - 0.5) * 500} y={207 - 14 + (1 - t) * (hash(i * 6.1) - 0.5) * 300} maxWidth={40} lineHeight={1}>
                      {ch}
                    </Text>
                  );
                })}
              </Layer>
            )}

            {/* the grid and the footage box */}
            {gridOn && (
              <>
                {[fx, fx + boxW].map((x, i) => (
                  <Rect key={`gv${i}`} id={`gv${i}`} x={x - 0.45} y={0} width={0.9} height={414} fill="#1a1a1a" />
                ))}
                {[fy, fy + boxH].map((y, i) => (
                  <Rect key={`gh${i}`} id={`gh${i}`} x={0} y={y - 0.45} width={736} height={0.9} fill="#1a1a1a" />
                ))}
                {footOp > 0 && F < 392 && (
                  <Layer id="foot" x={fx} y={fy} clip={{ kind: 'path', d: rect(0, 0, boxW, boxH) }} opacity={footOp}>
                    <Rect id="foot-bg" x={0} y={0} width={boxW} height={boxH} fill="#9a9a9e" />
                    <Layer id="foot-pan" motionBlur={{ samples: 6, shutter: 1 }}>
                      <Image
                        id="foot-img"
                        src={staticFile(shotImg)}
                        x={boxW / 2 - (boxW * 1.5) / 2 + panX}
                        y={boxH / 2 - (boxH * 1.5) / 2}
                        width={boxW * 1.5 * (1 + 0.1 * shotT)}
                        height={boxH * 1.5 * (1 + 0.1 * shotT)}
                        fit="cover"
                        effects={bwShot ? [grayscale(1)] : [saturate(1.15)]}
                      />
                    </Layer>
                    <Rect id="foot-shade" x={0} y={0} width={boxW} height={boxH} fill="#00000022" />
                  </Layer>
                )}
                {F < 401 ? (
                  <Tx id="film-title" x={368} cy={207} size={34} color={titleCol} font={ui} weight={700} align="center" w={500}>{filmTitle}</Tx>
                ) : (
                  <>
                    <Tx id="try-a" x={ramp(F, 401, 408, 368 - tW / 2 - 8 - tryA, 368 - tW / 2 - 22 - tryA, easeOut)} cy={207} size={34} color={ink} font={ui} weight={700} w={160} op={prog(F, 401, 407, lin)}>{tryWords[0]}</Tx>
                    <Tx id="try-b" x={368} cy={207} size={34} color={ink} font={ui} weight={700} align="center" w={500}>{tryWords[1]}</Tx>
                    <Tx id="try-c" x={ramp(F, 401, 408, 368 + tW / 2 + 8, 368 + tW / 2 + 22, easeOut)} cy={207} size={34} color={ink} font={ui} weight={700} w={160} op={prog(F, 401, 407, lin)}>{tryWords[2]}</Tx>
                  </>
                )}
              </>
            )}
          </Layer>
        </Layer>
      )}

      {/* ============ the iris that closes the light scene on the product mark ============ */}
      {irisOn && (
        <>
          <Rect id="iris-black" x={0} y={0} width={W} height={H} fill="#000000" />
          <Layer id="iris-hole" x={W / 2} y={H / 2} rotation={(F - 419) * 11} scale={S} clip={{ kind: 'path', d: cloverD(iris) }}>
            <Layer id="iris-counter" rotation={-(F - 419) * 11} anchorX={368} anchorY={207}>
              <Rect id="iris-ground" x={0} y={0} width={736} height={414} fill={p.ground} />
              <Rect id="iris-v1" x={282.5} y={0} width={0.9} height={414} fill="#1a1a1a" />
              <Rect id="iris-v2" x={527} y={0} width={0.9} height={414} fill="#1a1a1a" />
              <Rect id="iris-h1" x={0} y={178.6} width={736} height={0.9} fill="#1a1a1a" />
              <Rect id="iris-h2" x={0} y={234.6} width={736} height={0.9} fill="#1a1a1a" />
              <Tx id="iris-a" x={368 - tW / 2 - 22 - tryA} cy={207} size={34} color={ink} font={ui} weight={700} w={160}>{tryWords[0]}</Tx>
              <Tx id="iris-b" x={368} cy={207} size={34} color={ink} font={ui} weight={700} align="center" w={500}>{tryWords[1]}</Tx>
              <Tx id="iris-c" x={368 + tW / 2 + 22} cy={207} size={34} color={ink} font={ui} weight={700} w={160}>{tryWords[2]}</Tx>
            </Layer>
          </Layer>
        </>
      )}

      {/* ============ black: mark, wordmark, strike ============ */}
      {black && F >= 431 && F < 542 && (
        <Layer id="lf-black" scale={S} opacity={fadeOutLock}>
          {markSize > 0.5 && (
            <Layer id="mark" x={markX} y={207}>
              <Clover id="mark-c" size={markSize / 0.94} color={accent} />
            </Layer>
          )}
          <Layer id="wm-clip" x={markFinal + 37 + 14} y={0} clip={{ kind: 'path', d: rect(-4, 100, 420, 135) }}>
            <Text id="wm" font={serif} weight={600} size={wmSize} color="#ffffff" x={0} y={207 - wmSize * 0.56 + (1 - wmRise) * 90} maxWidth={500} lineHeight={1} opacity={prog(F, 480, 484, lin)}>
              {product}
            </Text>
          </Layer>
        </Layer>
      )}
      {strike && (
        <Layer id="lf-strike" scale={S}>
          {F < 534 && (
            <Path id="slash" d="M-10 54L52 54L74 -54L12 -54Z" x={368} y={207} fill="#ffffff" opacity={strikeSlash} />
          )}
          {((F >= 533 && F < 538) || lettersMagenta) && (
            <Layer id="strike-letter" x={368} y={207} effects={[glow({ radius: lettersMagenta ? 26 : 18, color: lettersMagenta ? p.markA : glitch ? '#ff3a8a' : '#2ab0e8', intensity: 1.2 })]}>
              {glitch ? (
                <>
                  <Text id="sl-r" font={ui} weight={800} size={letterSize} color="#ff2a60" align="center" x={-150 - 6} y={-letterSize * 0.5} maxWidth={300} lineHeight={1}>{letter}</Text>
                  <Text id="sl-b" font={ui} weight={800} size={letterSize} color="#2a3cff" align="center" x={-150 + 6} y={-letterSize * 0.5} maxWidth={300} lineHeight={1} opacity={0.8}>{letter}</Text>
                </>
              ) : (
                <Text id="sl-w" font={ui} weight={800} size={letterSize} color={lettersMagenta ? mixHex(p.markA, '#ffffff', 0.25) : '#f2f2f4'} align="center" x={-150} y={-letterSize * 0.5} maxWidth={300} lineHeight={1} opacity={letterIn}>{letter}</Text>
              )}
            </Layer>
          )}
          {dark ? (
            <Layer id="strike-dark" x={368} y={207} effects={[glow({ radius: 34, color: '#ffffff', intensity: 1.4 })]}>
              <Text id="sd" font={ui} weight={800} size={letterSize} color="#4a1050" align="center" x={-150} y={-letterSize * 0.5} maxWidth={300} lineHeight={1}>{letter}</Text>
            </Layer>
          ) : null}
        </Layer>
      )}

      {/* ============ the extruded letter ============ */}
      {threeD && (
        <>
          <Rect id="tr-haze" x={0} y={0} width={W} height={H} opacity={haze} fill={radialGradient([[0, '#3a0d4a'], [0.5, '#1a0522'], [1, '#000000']], { cx: 0.5, cy: 0.5, r: 0.6 })} />
          <Layer id="tr-glow" x={0} y={0} effects={[glow({ radius: 40, color: p.markA, intensity: 1.1 })]} opacity={flash ? 0 : 1}>
            <Layer id="tr-wrap" preserve3d x={letX * S} y={letY * S} rotateY={letYaw} scale={S}>
              {sliceNodes}
            </Layer>
          </Layer>
          {streak1 > 0.01 && (
            <Layer id="streak1" opacity={streak1} blendMode="screen" effects={[blur(5)]}>
              <Path id="s1a" d="M330 1010L1060 90L1080 105L420 1040Z" fill={linearGradient([[0, '#ffffff00'], [0.6, '#ffffffcc'], [1, '#ffffff00']], { angle: 55 })} />
              <Path id="s1b" d="M520 1000L1180 80L1188 88L550 1006Z" fill="#ffffffc0" />
              <Path id="s1c" d="M180 980L900 160L915 172L230 1000Z" fill="#ffffff50" />
            </Layer>
          )}
          {streak2 > 0.01 && (
            <Layer id="streak2" opacity={streak2} blendMode="screen" effects={[blur(2)]}>
              <Path id="s2a" d="M1180 360L1320 170L1330 176L1200 372Z" fill="#ffffff" />
            </Layer>
          )}
          {flash && (
            <Layer id="flash-letter" x={W / 2} y={H / 2} effects={[blur(28)]}>
              <Text id="fl-t" font={ui} weight={800} size={560} color="#2b32c8" align="center" x={-500} y={-290} maxWidth={1000} lineHeight={1}>{letter}</Text>
            </Layer>
          )}
        </>
      )}

      {/* ============ white: the flat mark ============ */}
      {white && (
        <Layer id="lf-end" x={W / 2} y={H / 2} scale={markEnd > 0 ? 0.92 + 0.08 * markEnd : 0.92}>
          <Text id="end-t" font={ui} weight={800} size={136 * S / 0.72 * 0.72} color={linearGradient([[0, p.markA], [1, p.markB]], { angle: 160 })} align="center" x={-300} y={-136 * S * 0.5 / 0.72 * 0.72} maxWidth={600} lineHeight={1}>
            {letter}
          </Text>
        </Layer>
      )}
    </Layer>
  );
};
