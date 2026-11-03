// App Launch: a 21 s launch film for an AI app, in the taste of a SaaS launch reel measured with the
// kinetograph-taste-clone skill. Every beat runs on the reference's
// measured frames and eases; the content is a prop. Default: Recap AI, an AI meeting-notes app.
//
//   1  f0-196     PromptIntro: the problem line types, deletes under a blue flash; the answer types; arrows; drop.
//   2  f197-423   Prompt Bar: guides draw the chat bar, our mark, four model chips, a plus spins in, the request types,
//                 a cursor flies in and clicks; three hard-cut framings.
//   3  f424-715   Three screens on a wall of screens with light gaps: the first types a transcript, a whip down to the
//                 second (cards rise and pop), a pan left to the third (a flow draws on), a push in and a cut.
//   4  f716-842   A glass button with the product mark settles as rings of dots ripple outward twice.
//   5  f843-997   The button stretches into a glass pill, the product name types with a salmon sweep, eight
//                 connected apps pop round it with lines and pulses, and the camera pulls back.
//   6  f998-1280  The closing line types and deletes into an app icon that grows and rises, the name types under it,
//                 a slanted wipe clears it, and the end mark draws on.
//
// Principles: staging (one idea per beat), anticipation (the arrow dips, the button swells before it morphs), slow in
// and out (all measured eases), overlap (chips 10 frames apart, layers drifting at their own rates), follow through
// (nodes overshoot 4%), secondary action (the glow under every beat), timing (typing gaps grow like a person's).

import React from 'react';
import { z } from 'zod';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Comfortaa';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { RISE_PALETTES, RiseGlow, riseGlowDefaults, type RisePalette } from '../backgrounds/rise-glow.js';
import { PromptIntro, promptIntroDefaults } from './prompt-intro.js';
import { BarShot, ChipGlyph, Mark, type ChipIcon } from './prompt-bar.js';

export const W = 1920;
export const H = 1080;
export const FPS = 60;
export const DURATION = 1281;

const UI = loadFont('normal', { weights: ['400', '700'] }).fontFamily;
const GROT = loadInter('normal', { weights: ['400'] }).fontFamily;

const hexC = z.string().describe('A CSS colour as #rrggbb.');
const screen = z.object({
  title: z.string().describe('The screen title, typed.'),
  tint: hexC.describe('The colour that pulses through the title as it types.'),
});

export const appLaunchSchema = z.object({
  product: z.string().describe('The product name, typed in the pill and under the app icon.'),
  mark: z.string().max(2).describe('The product mark: one or two letters, on the button, the app icon and the end mark.'),
  problem: z.string().max(40).describe('Beat 1: the problem, typed then deleted.'),
  answer: z.string().max(40).describe('Beat 1: the answer.'),
  request: z.string().max(40).describe('Beat 2: what the user types in the chat bar.'),
  chips: z.array(z.string()).length(4).describe('Beat 2: the four chips above the bar: what the product can make.'),
  chipIcons: z.array(z.enum(['hex', 'tri', 'diamond', 'dots', 'lines', 'check', 'flag', 'mail'])).length(4).describe('Beat 2: each chip\'s icon.'),
  actions: z.array(z.tuple([z.string(), z.string(), z.string()])).length(3).describe('Beat 3, third screen: action items as [owner initial, task, due].'),
  summary: z.object({
    keyLines: z.tuple([z.number(), z.number(), z.number()]).describe('Which transcript lines (index, 1 = first after the comment) the scan picks out.'),
    bullets: z.tuple([z.string(), z.string(), z.string()]).describe('What those lines become on the summary card.'),
    owners: z.tuple([z.string(), z.string(), z.string()]).describe('The owners\' names under their avatars.'),
    title: z.string().describe('The summary card\'s title.'),
    sent: z.string().describe('The message the recap folds into.'),
  }).describe('Beats 3b-3d (0:09-0:16): scan, summarise, assign, send.'),
  screens: z.tuple([screen, screen, screen]).describe('Beat 3: the three screens.'),
  transcript: z.array(z.string()).describe('Beat 3, first screen: the lines that type on (up to 15; the first is a comment).'),
  cards: z.tuple([z.string(), z.string(), z.string(), z.string()]).describe('Beat 3, second screen: card label, big figure, small figure, chip figure.'),
  closing: z.string().max(40).describe('Beat 6: the closing line.'),
  palette: z.enum(Object.keys(RISE_PALETTES) as [RisePalette, ...RisePalette[]]).describe('The glow under every beat: a RiseGlow palette.'),
  accent: hexC.describe('The mark on the app icon.'),
});
export type AppLaunchProps = z.infer<typeof appLaunchSchema>;

export const appLaunchDefaults: AppLaunchProps = {
  product: 'Recap AI',
  mark: 'R',
  problem: 'Who said what in that call?',
  answer: 'Stop taking notes by hand.',
  request: 'Summarise my call with the team',
  chips: ['Summary', 'Actions', 'Decisions', 'Email'],
  chipIcons: ['lines', 'check', 'flag', 'mail'],
  actions: [['J', 'Write the release notes', 'Thu'], ['L', 'Book the launch call', 'Fri'], ['P', 'Freeze the budget at 40k', 'Mon']],
  summary: {
    keyLines: [1, 3, 6],
    bullets: ['Beta ships Friday', 'Code freeze Thursday', 'Budget stays under 40k'],
    owners: ['Jon', 'Leo', 'Priya'],
    title: 'Summary',
    sent: 'Recap sent to 6 people',
  },
  screens: [
    { title: 'Transcribing', tint: '#efb1ae' },
    { title: 'Summarising', tint: '#aab0f5' },
    { title: 'Assigning actions', tint: '#9ef0dc' },
  ],
  transcript: [
    '// Weekly sync · 6 people · 42 min',
    'Maya: Can we ship the beta by Friday?',
    'Jon: Design is ready, QA needs two days.',
    'Priya: Then Thursday is the freeze.',
    'Maya: Agreed. Jon writes the release notes.',
    'Leo: I will book the launch call.',
    'Priya: Budget stays under 40k.',
    'Maya: Support needs a heads-up.',
    'Jon: I will brief them tomorrow.',
    'Leo: Press list is ready.',
    'Maya: Demo video by Wednesday?',
    'Priya: On it.',
    'Jon: Beta invites go out Friday.',
    'Maya: Next sync Monday 10:00.',
    'Maya: Thanks, everyone.',
  ],
  cards: ['Decisions', '42m', '6', '89%'],
  closing: 'From call to notes. In seconds.',
  palette: 'liquid',
  accent: '#dc3a21',
};

// ---------------------------------------------------------------- helpers

type Table = ReadonlyArray<readonly [number, number]>;
const tbl = (f: number, t: Table): number => {
  if (f <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) {
    if (f <= t[i][0]) {
      const [f0, v0] = t[i - 1];
      const [f1, v1] = t[i];
      return v0 + ((v1 - v0) * (f - f0)) / (f1 - f0);
    }
  }
  return t[t.length - 1][1];
};
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const hx = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const [x, y] = [hx(a), hx(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * clamp01(t))).join(',')})`;
};
/** Landing frames of a reference string of length m, stretched to n characters. */
const stretch = (at: number[], n: number) =>
  Array.from({ length: n }, (_, i) => at[Math.min(at.length - 1, Math.round((i * (at.length - 1)) / Math.max(1, n - 1)))]);

const SW = 1916; // the reference's frame; everything after beat 1 is laid out in its pixels and scaled to 1920 x 1080
const SH = 1078;
const WHITE = '#f7f2f4';

/** The glow layer in reference pixels. */
const Glow: React.FC<{ palette: RisePalette; a: number; dy?: number; flip?: boolean; height?: number }> = ({ palette, a, dy = 0, flip, height = 1 }) => (
  <AbsoluteFill style={{ opacity: a, transform: `translateY(${dy}px) scaleX(${flip ? -1 : 1})` }}>
    <div style={{ width: 1920, height: 1080, transform: `scale(${SW / 1920}, ${SH / 1080})`, transformOrigin: '0 0' }}>
      <RiseGlow {...riseGlowDefaults} palette={palette} ring={0} height={height} />
    </div>
  </AbsoluteFill>
);

// ================================================================ beat 3: three screens

const GAP = 46;
const GAP_C = '#efedf0';

/** Shot timing (spec "Spec f424-f700" and "B1 f701-f715"). */
const GLOW_SINK: Table = [[424, 0], [426, 31], [428, 52], [430, 70], [432, 88], [434, 102], [436, 116], [438, 130], [440, 142], [444, 165],
  [448, 183], [452, 200], [458, 222], [464, 245], [470, 261], [476, 278], [482, 291], [488, 306], [494, 320], [500, 328], [506, 334]];
const HERO_DY: Table = [[424, 0], [426, 28], [428, 48], [430, 68], [432, 84], [434, 98], [436, 110], [438, 122], [440, 134], [444, 154],
  [448, 170], [452, 186], [456, 198], [460, 210], [464, 220], [468, 228], [472, 235], [476, 242], [480, 246], [484, 250], [488, 254],
  [492, 258], [496, 260], [500, 262]];
const TITLE_TOP: Table = [[424, -100], [441, 45], [444, 60], [448, 79], [452, 93], [456, 107], [460, 120], [466, 137], [472, 150],
  [478, 162], [484, 171], [490, 179], [496, 185], [504, 191]];
/** The horizontal gap's top edge on screen during the whip down (cubic-bezier(0.5,0,0,1)). */
const GAP_TOP: Table = [[504, 1078], [506, 1077], [510, 1071], [514, 1060], [518, 1042], [522, 1012], [526, 963], [528, 928], [530, 881],
  [532, 821], [534, 748], [536, 672], [538, 605], [540, 549], [542, 502], [544, 463], [546, 430], [548, 401], [550, 375], [552, 353],
  [554, 333], [556, 315], [558, 299], [560, 284], [564, 259], [568, 237], [572, 220], [576, 206], [580, 192], [584, 182], [590, 170],
  [596, 160], [604, 152], [612, 148], [688, 148], [693, 146], [697, 142], [700, 136], [715, 136]];
/** The vertical gap's left edge on screen during the pan left. */
const GAP_LEFT: Table = [[578, -45], [580, -40], [582, -32], [584, -20], [586, -4], [588, 16], [590, 45], [592, 82], [594, 129], [596, 188],
  [598, 261], [600, 345], [602, 439], [604, 535], [606, 628], [608, 715], [610, 793], [612, 864], [614, 929], [616, 987], [618, 1040],
  [620, 1088], [624, 1173], [628, 1245], [632, 1308], [636, 1363], [640, 1411], [648, 1491], [656, 1554], [664, 1605], [672, 1645],
  [680, 1677], [686, 1696], [690, 1707], [694, 1722], [698, 1740], [700, 1752]];
/** The push in before the cut: screen = s * p + (tx, ty). */
const PUSH: ReadonlyArray<readonly [number, number, number, number]> = [[688, 1, 0, 0], [694, 1.01, -4, -3], [700, 1.031, -12, -10],
  [702, 1.038, -17, -13], [704, 1.054, -29, -23], [706, 1.081, -49, -35], [708, 1.109, -75, -51], [710, 1.15, -111, -73],
  [711, 1.176, -136, -88], [712, 1.211, -168, -106], [713, 1.257, -211, -132], [714, 1.324, -274, -168], [715, 1.479, -425, -255]];

/** Transcript line timing: frame a line starts and frame it is complete (the reference's code lines). */
const LINES: ReadonlyArray<readonly [number, number]> = [[444, 444], [444, 444], [444, 449], [450, 454], [455, 455], [455, 456], [457, 458],
  [458, 459], [459, 460], [460, 461], [461, 464], [464, 468], [468, 475], [475, 483], [483, 497]];
const TITLE_A_AT = [441, 442, 443, 444, 445, 446, 447, 449, 453, 457, 466, 467];
const TITLE_B_AT = [540, 540, 540, 542, 542, 544, 544, 546, 554, 560, 562];
const TITLE_C_AT = [631, 632, 633, 633, 634, 634, 637, 638, 639, 640, 641, 642, 644, 648, 653, 661, 662];

const TypedTitle: React.FC<{ f: number; text: string; at: number[]; tint: string; x: number; y: number; size?: number }> = ({
  f, text, at, tint, x, y, size = 92,
}) => {
  const times = stretch(at, text.length);
  return (
    <div style={{ position: 'absolute', left: x, top: y, fontFamily: GROT, fontSize: size, lineHeight: 1, whiteSpace: 'pre', color: WHITE, letterSpacing: '-0.01em' }}>
      {text.split('').map((ch, i) => {
        const age = f - times[i];
        if (age < 0) return null;
        // appears grey, whitens in 2 frames, the tint pulses through at 4-8 frames and cools by ~16
        const tintK = tbl(age, [[0, 0], [3, 0.2], [6, 0.9], [10, 0.8], [16, 0]]);
        const c = age < 2 ? mix('#7a7578', WHITE, age / 2) : mix(WHITE, tint, tintK);
        return <span key={i} style={{ color: c }}>{ch}</span>;
      })}
    </div>
  );
};

/** Screen A's hero: a live voice waveform, forty rounded bars whose heights move like speech (bursts and pauses that
 *  travel along the line), brightest where the voice is loudest. It rides the screen's drift like the reference's hero
 *  layer. */
const VoiceWave: React.FC<{ f: number }> = ({ f }) => {
  const N = 40;
  const t = f / 60;
  return (
    <svg width={820} height={560} viewBox="0 0 820 560" style={{ position: 'absolute', left: -410, top: -280, overflow: 'visible' }}>
      <defs>
        <linearGradient id="al-voice" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#d97a5e" stopOpacity="0.35" />
          <stop offset="0.5" stopColor="#f0a07e" />
          <stop offset="1" stopColor="#d97a5e" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      {Array.from({ length: N }, (_, i) => {
        const x = 10 + i * 20;
        // speech: syllables (fast), words (slower) and phrases with pauses (slowest), travelling along the line
        const syl = 0.5 + 0.5 * Math.sin(t * 17 - i * 0.9);
        const word = 0.5 + 0.5 * Math.sin(t * 5.3 - i * 0.35 + 1.3);
        const phrase = clamp01(0.3 + 0.7 * Math.sin(t * 1.7 - i * 0.12));
        const env = Math.sin((Math.PI * (i + 0.5)) / N); // quieter at the ends
        const h = 24 + 480 * env * phrase * (0.35 + 0.65 * word) * (0.55 + 0.45 * syl);
        return <rect key={i} x={x - 6} y={280 - h / 2} width={12} height={h} rx={6} fill="url(#al-voice)" opacity={0.55 + 0.45 * phrase} />;
      })}
    </svg>
  );
};

/** Where transcript line i (0 = the comment) sits on screen A at rest. */
const lineTop = (i: number) => 191 + (i === 0 ? 122 : i <= 8 ? 199 + 32.8 * (i - 1) - 14 : 495 + 32.8 * (i - 9) - 14);

const ScreenA: React.FC<{ f: number; p: AppLaunchProps; bare?: boolean; hide?: number[]; fade?: number }> = ({ f, p, bare, hide = [], fade = 0 }) => {
  const T = tbl(f, TITLE_TOP);
  const lines = p.transcript.slice(0, LINES.length);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: SW, height: SH, background: bare ? undefined : RISE_PALETTES[p.palette][0], overflow: 'hidden' }}>
      {!bare && <Glow palette={p.palette} a={1} dy={tbl(f, GLOW_SINK) - 160} height={1.6} />}
      <div style={{ position: 'absolute', left: 1500, top: 660 + tbl(f, HERO_DY) * 0.6, transform: 'scale(0.95)', opacity: 1 - fade }}>
        <VoiceWave f={f} />
      </div>
      <div style={{ opacity: 1 - fade, transform: `translateY(${-60 * fade}px)` }}>
        <TypedTitle f={f} text={p.screens[0].title} at={TITLE_A_AT} tint={p.screens[0].tint} x={444} y={T} />
      </div>
      {lines.map((line, i) => {
        const [a, b] = LINES[i];
        if (f < a || hide.includes(i)) return null;
        const shown = b <= a ? line.length : Math.round(line.length * clamp01((f - a + 1) / (b - a + 1)));
        const cool = clamp01((f - b) / 10);
        const y = i === 0 ? T + 122 : i <= 8 ? T + 199 + 32.8 * (i - 1) - 14 : T + 495 + 32.8 * (i - 9) - 14;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 445 - 140 * fade * fade,
              top: y,
              opacity: 1 - fade,
              fontFamily: GROT,
              fontSize: 25,
              lineHeight: '30px',
              whiteSpace: 'pre',
              color: i === 0 ? mix('#c88c66', '#ded7d6', cool) : mix('#c88c66', '#e5e0e1', cool),
              textShadow: cool < 1 ? `0 0 10px rgba(200,140,102,${0.6 * (1 - cool)})` : undefined,
            }}
          >
            {line.slice(0, shown)}
          </div>
        );
      })}
    </div>
  );
};

/** Screen B: a blue glow, a concave three-point spike at the right, the title and three cards. */
const ScreenB: React.FC<{ f: number; p: AppLaunchProps }> = ({ f, p }) => {
  const tbTop = tbl(f, [[544, 600], [546, 558], [548, 544], [550, 536], [552, 528], [554, 522], [556, 518], [558, 514], [560, 512], [562, 510]]);
  const tbGrey = clamp01((f - 546) / 16);
  const dark = clamp01(tbl(f, [[548, 0.02], [550, 0.1], [552, 0.3], [556, 0.62], [560, 0.85], [566, 1]]));
  const white = clamp01(tbl(f, [[562, 0.15], [564, 0.45], [566, 0.65], [568, 0.76], [570, 0.84], [572, 0.9], [574, 0.95], [578, 1]]));
  const card = (x: number, y: number, w: number, h: number, s: number, fill: string, r: number, kids: React.ReactNode) => (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: r,
        background: fill,
        transform: `scale(${s})`,
        boxShadow: '0 0 24px rgba(220,225,255,0.18)',
        overflow: 'hidden',
      }}
    >
      {kids}
    </div>
  );
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: SW, height: SH, background: RISE_PALETTES[p.palette][0], overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: `linear-gradient(to bottom, ${RISE_PALETTES[p.palette][0]} 0%, ${RISE_PALETTES[p.palette][0]} 40%, #202f5f 65%, #637bc1 84%, #949dbb 100%)` }} />
      <svg width={SW} height={SH} style={{ position: 'absolute', left: 0, top: 0 }}>
        <defs>
          <linearGradient id="al-spike" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#9d6bd0" />
            <stop offset="0.5" stopColor="#7978cb" />
            <stop offset="1" stopColor="#4592d8" />
          </linearGradient>
        </defs>
        <path d="M1845 333 Q1700 640 1315 666 Q1700 700 1960 900 Q1880 600 1845 333 Z" fill="url(#al-spike)" />
        <path d="M1315 666 Q1700 700 1960 900 L1960 940 Q1700 740 1315 666 Z" fill="#b0b2c0" opacity={0.7} />
      </svg>
      <TypedTitle f={f} text={p.screens[1].title} at={TITLE_B_AT} tint={p.screens[1].tint} x={452} y={173} />
      {f >= 546 &&
        card(447, tbTop, 278, 266, 1, mix('#9a9aa3', '#f0eef2', tbGrey), 28, (
          <>
            <div style={{ position: 'absolute', left: 22, top: 20, fontFamily: UI, fontSize: 18, color: '#4a9be8' }}>{p.cards[0]}</div>
            {[115, 149, 183, 217].map((y, i) => (
              <div key={y} style={{ position: 'absolute', left: 22, top: y, height: 14, width: [220, 170, 200, 130][i], borderRadius: 7, background: 'linear-gradient(90deg, #39c7b1, #4a9be8)' }} />
            ))}
            <div style={{ position: 'absolute', right: 20, top: 18, width: 34, height: 18, borderRadius: 9, background: '#99d7cc' }} />
          </>
        ))}
      {f >= 548 &&
        card(594, 327, 132, 166, dark, '#29272a', 20, (
          <>
            <div style={{ position: 'absolute', left: 18, top: 18, fontFamily: UI, fontSize: 30, color: '#99d7cc' }}>{p.cards[1]}</div>
            <div style={{ position: 'absolute', left: 18, top: 70, fontFamily: UI, fontSize: 30, color: '#99d7cc' }}>{p.cards[2]}</div>
            <div style={{ position: 'absolute', right: 18, bottom: 18, width: 24, height: 24, transform: 'rotate(45deg)', background: '#3fb2c6', borderRadius: 4 }} />
          </>
        ))}
      {f >= 562 &&
        card(439, 320, 134, 168, white, mix('#a2a2aa', '#f4f2f6', white), 20, (
          <>
            <div style={{ position: 'absolute', left: 16, top: 20, fontFamily: UI, fontSize: 30, color: '#39c7b1' }}>{p.cards[3]}</div>
            <div style={{ position: 'absolute', left: 16, bottom: 22, width: 60, height: 14, borderRadius: 7, background: '#4a9be8' }} />
            <div style={{ position: 'absolute', left: 16, bottom: 44, width: 90, height: 14, borderRadius: 7, background: '#b9d6f5' }} />
          </>
        ))}
    </div>
  );
};

/** Screen C: a tall screen beside the A/B column (its right edge is the vertical gap). Its own pixels are the
 *  reference's f701 screen positions + (159, 942). In the reference this screen drew a flow beside a model's logo; here
 *  it is the meeting's action items: rows slide in on the flow's draw-on frames (f615-f633) and each is ticked off on
 *  the branch's frames (f640-f670), owner and due date beside it. */
const CH = SH * 2 + GAP;
const ScreenC: React.FC<{ f: number; p: AppLaunchProps }> = ({ f, p }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: SW, height: CH, background: RISE_PALETTES[p.palette][0], overflow: 'hidden' }}>
    <div style={{ position: 'absolute', left: 0, top: 1400, width: SW, height: CH - 1400, background: `linear-gradient(to bottom, ${RISE_PALETTES[p.palette][0]} 0%, #152b27 22%, #1d5145 55%, #277663 100%)` }} />
    <TypedTitle f={f} text={p.screens[2].title} at={TITLE_C_AT} tint={p.screens[2].tint} x={545} y={1063} size={96} />
    {p.actions.map(([who, task, due], i) => {
      const f0 = 615 + 9 * i;
      const k = clamp01((f - f0) / 14);
      const e = 1 - (1 - k) ** 3;
      const tick = clamp01((f - (642 + 12 * i)) / 8);
      return (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: 545 + (1 - e) * 120,
            top: 1300 + i * 128,
            width: 980,
            height: 104,
            borderRadius: 26,
            opacity: e,
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.22)',
            boxShadow: '0 0 30px rgba(158,240,220,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: 28,
            padding: '0 34px',
            boxSizing: 'border-box',
            fontFamily: GROT,
          }}
        >
          <svg width={44} height={44} viewBox="0 0 44 44">
            <rect x={2} y={2} width={40} height={40} rx={11} fill={tick > 0 ? `rgba(158,240,220,${tick})` : 'none'} stroke="#e5e0e1" strokeWidth={3} />
            <path d="M12 23 L19 30 L32 15" fill="none" stroke="#10241f" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${tick} 1`} />
          </svg>
          <div style={{ flex: 1, fontSize: 38, color: mix('#e5e0e1', '#9aa8a3', tick * 0.6), textDecoration: tick >= 1 ? 'line-through' : undefined, textDecorationColor: 'rgba(229,224,225,0.5)' }}>{task}</div>
          <div style={{ fontSize: 28, color: '#9ef0dc' }}>{due}</div>
          <div style={{ width: 56, height: 56, borderRadius: 28, background: '#2a7a68', color: '#f7f2f4', fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{who}</div>
        </div>
      );
    })}
  </div>
);

const ScreensShot: React.FC<{ f: number; p: AppLaunchProps }> = ({ f, p }) => {
  // camera: the whip down moves the column up by (1078 - gapTop); the pan moves the wall right by (gapLeft + 47)
  const camY = f < 504 ? 0 : SH - tbl(f, GAP_TOP);
  const camX = f < 578 ? 0 : tbl(f, GAP_LEFT) + 47;
  const push = f < 688 ? null : PUSH.reduce((acc, row) => (row[0] <= f ? row : acc), PUSH[0]);
  const next = push ? PUSH.find((r) => r[0] > f) : undefined;
  let s = 1;
  let tx = 0;
  let ty = 0;
  if (push) {
    const k = next ? (f - push[0]) / (next[0] - push[0]) : 0;
    const lerp = (i: 1 | 2 | 3) => push[i] + ((next ? next[i] : push[i]) - push[i]) * k;
    [s, tx, ty] = [lerp(1), lerp(2), lerp(3)];
  }
  // world: A at (0,0), B under it, C left of B (gaps 46 / 47 px wide)
  return (
    <AbsoluteFill style={{ background: GAP_C, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${tx}px, ${ty}px) scale(${s})`, transformOrigin: '0 0' }}>
        <div style={{ position: 'absolute', left: camX, top: -camY }}>
          <div style={{ position: 'absolute', left: 0, top: 0 }}><ScreenA f={f} p={p} /></div>
          <div style={{ position: 'absolute', left: 0, top: SH + GAP }}><ScreenB f={f} p={p} /></div>
          <div style={{ position: 'absolute', left: -SW - 47, top: 0 }}><ScreenC f={f} p={p} /></div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ================================================================ beat 4: the glass button and the dot rings

const BTN_R: Table = [[716, 273.8], [717, 250.5], [718, 239.5], [719, 231.2], [720, 225], [722, 214.2], [724, 206], [726, 199.5], [728, 193.8],
  [730, 189], [734, 180.8], [738, 174], [742, 168.2], [746, 164], [750, 160], [756, 154.2], [760, 151.5], [766, 147.2], [770, 145],
  [776, 142], [780, 140], [786, 137.8], [790, 136], [796, 134], [800, 133], [806, 131], [810, 130], [816, 128.8], [822, 127], [828, 126],
  [835, 126], [836, 126.5], [838, 128], [840, 130], [842, 134]];
const RING_N = [20, 26, 32, 37, 43, 49, 54, 60, 66, 71, 76, 82, 87, 93, 99, 104, 110, 115];
const RING_ON1 = [726.7, 728.8, 731.2, 733.2, 735.7, 737.5, 738.7, 741.7, 742.8, 745.9, 748, 748.6, 751.8, 753.8, 755.7];
const RING_OFF1 = [754.1, 756.1, 758.3, 760.1, 761.6, 763.9, 766, 767.4, 769.5, 772.2, 773.5, 776.2, 778.1, 778.5, 781.8];
const RING_ON2 = [766.1, 767.7, 768.5, 772.1, 775, 776.6, 777.5, 777.9, 782.3, 784, 787.2, 787.4, 788.3, 793.6, 795];
const RING_OFF2 = [781.4, 782.5, 785.3, 787.4, 787.7, 791.4, 793, 793.9, 797.5, 798.5, 798.7, 803.6, 805.2, 805.8, 809.1];
const ringAt = (arr: number[], k: number, base: number, step: number) => (k < arr.length ? arr[k] : base + step * k);

const ringLight = (f: number, k: number) => {
  const gate = (on: number, off: number) => clamp01((f - on + 2.5) / 5) * (1 - clamp01((f - off + 1.5) / 3));
  const w = [1, 0.5, 0.65][k % 3];
  return w * Math.max(gate(ringAt(RING_ON1, k, 726.7, 1.97), ringAt(RING_OFF1, k, 754.1, 1.95)), gate(ringAt(RING_ON2, k, 766.1, 2.1), ringAt(RING_OFF2, k, 781.4, 1.98)));
};

/** The glass disc: dark cool top-left, warm bottom-right, a 1 px rim (0.009 R), the mark with a soft glow. */
const GlassDisc: React.FC<{ cx: number; cy: number; rx: number; ry: number; flash?: number; mark?: string; markA?: number }> = ({
  cx, cy, rx, ry, flash = 0, mark, markA = 1,
}) => (
  <div
    style={{
      position: 'absolute',
      left: cx - rx,
      top: cy - ry,
      width: rx * 2,
      height: ry * 2,
      borderRadius: ry,
      boxSizing: 'border-box',
      border: `${Math.max(1, ry * (0.009 + 0.012 * flash))}px solid ${mix('#d6cbcb', '#e8e3e3', flash)}`,
      background: flash > 0.5
        ? 'linear-gradient(to bottom, #3f3a3d 0%, #222528 12%, #1c1f25 30%, #191b1f 50%, #29292d 64%, #5b595e 86%, #7a7477 100%)'
        : 'radial-gradient(ellipse 60% 60% at 68% 88%, #7a6058 0%, #6f524d 30%, #2e282b 75%), linear-gradient(135deg, #1a1c20 0%, #221d22 55%, #423434 100%)',
      boxShadow: '0 0 6px rgba(255,230,220,0.18)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    }}
  >
    {mark !== undefined && (
      <div style={{ opacity: markA, filter: 'drop-shadow(3px 4px 5px rgba(255,255,255,0.35))' }}>
        <Mark letter={mark} size={ry * 0.85} color="#ede8ec" />
      </div>
    )}
  </div>
);

const ButtonShot: React.FC<{ f: number; p: AppLaunchProps }> = ({ f, p }) => {
  const R = tbl(f, BTN_R);
  const cx = 958;
  const cy = 538.8;
  const dots: React.ReactNode[] = [];
  for (let k = 0; k < RING_N.length; k++) {
    const a = ringLight(f, k);
    if (a <= 0.01) continue;
    const r = R * (1.097 + 0.2994 * k);
    const n = RING_N[k];
    const d = R * 0.17;
    for (let j = 0; j < n; j++) {
      const t = -Math.PI / 2 + (j * 2 * Math.PI) / n;
      const x = cx + r * Math.cos(t);
      const y = cy + r * Math.sin(t);
      if (x < -d || x > SW + d || y < -d || y > SH + d) continue;
      dots.push(
        <div key={`${k}-${j}`} style={{ position: 'absolute', left: x - d, top: y - d, width: d * 2, height: d * 2, borderRadius: '50%', background: `radial-gradient(circle, rgba(232,80,28,${0.3 * a}) 0%, rgba(232,80,28,${0.22 * a}) 45%, rgba(232,80,28,0) 100%)` }} />,
      );
    }
  }
  return (
    <AbsoluteFill style={{ background: RISE_PALETTES[p.palette][0], overflow: 'hidden' }}>
      <Glow palette={p.palette} a={tbl(f, [[716, 0.12], [740, 0.22], [788, 0.32], [836, 0.45], [842, 0.42]])} flip />
      {dots}
      <GlassDisc cx={cx} cy={cy} rx={R} ry={R} mark={p.mark} />
    </AbsoluteFill>
  );
};

// ================================================================ beat 5: the pill, the name, the connected apps

const PILL_R: Table = [[843, 144], [844, 147], [845, 152], [846, 164], [847, 183], [848, 209], [849, 236], [850, 263], [851, 288], [852, 310],
  [854, 350], [856, 383], [858, 413], [860, 439], [862, 462], [864, 482], [866, 500], [868, 517], [870, 531], [872, 545], [874, 555],
  [876, 563], [878, 568], [880, 569], [882, 566], [884, 560], [886, 549], [888, 533], [890, 512], [892, 486], [894, 458], [896, 430],
  [898, 406], [900, 386], [905, 350], [910, 326], [915, 310], [920, 299], [925, 290], [930, 283], [935, 278], [940, 273], [950, 267],
  [960, 262], [970, 257], [980, 249], [987, 240], [990, 235], [993, 228], [996, 217], [997, 209]];
const PILL_H: Table = [[843, 143.5], [844, 147], [846, 153.5], [848, 159.5], [850, 165.5], [852, 170], [854, 174], [856, 177.5], [858, 180.5],
  [860, 183], [864, 187.5], [868, 191], [872, 193.5], [873, 194], [877, 194], [880, 192], [884, 185.5], [888, 174], [890, 166], [892, 157.5],
  [894, 147.5], [896, 138.5], [898, 130], [900, 123], [905, 111.5], [910, 104], [915, 99], [920, 95], [925, 92], [930, 90], [935, 88],
  [940, 87], [950, 85], [959, 83.5], [970, 82], [980, 79], [990, 74.5], [993, 72], [996, 69], [997, 67]];
const NAME_AT = [861, 869, 872, 873, 874, 876, 881, 882, 891];
/** The node layout at rest, in pill half-heights from the centre, and each node's icon. */
const NODES: ReadonlyArray<readonly [number, number]> = [[-2.78, -3.8], [2.9, -3.78], [-6.88, -1.16], [-6.85, 1.08], [6.84, -1.16],
  [6.87, 1.1], [-2.76, 3.76], [2.9, 3.75]];
const NODE_R: Table = [[897, 0.02], [898, 0.04], [899, 0.06], [900, 0.114], [901, 0.195], [902, 0.26], [903, 0.316], [904, 0.366], [905, 0.404],
  [906, 0.436], [907, 0.473], [908, 0.502], [909, 0.538], [910, 0.553], [911, 0.586], [912, 0.606], [913, 0.627], [914, 0.648], [915, 0.672],
  [916, 0.694], [917, 0.711], [918, 0.725], [919, 0.749], [920, 0.758], [921, 0.762], [922, 0.771], [924, 0.736]];

const NodeIcon: React.FC<{ i: number; s: number }> = ({ i, s }) => {
  const c = '#ece8ec';
  const st = { fill: 'none', stroke: c, strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg width={s} height={s} viewBox="0 0 24 24">
      {i === 0 && <><rect x="4" y="5" width="16" height="15" rx="2" {...st} /><path d="M4 10 H20 M8 3 V7 M16 3 V7" {...st} /></>}
      {i === 1 && <><rect x="9" y="3" width="6" height="11" rx="3" {...st} /><path d="M6 11 A6 6 0 0 0 18 11 M12 17 V21" {...st} /></>}
      {i === 2 && <path d="M5 6 H19 V16 H10 L6 20 V16 H5 Z" {...st} />}
      {i === 3 && <><rect x="4" y="6" width="16" height="12" rx="2" {...st} /><path d="M4 7 L12 13 L20 7" {...st} /></>}
      {i === 4 && <><path d="M7 3 H14 L18 7 V21 H7 Z" {...st} /><path d="M10 12 H15 M10 16 H15" {...st} /></>}
      {i === 5 && <path d="M5 12 L10 17 L19 7" {...st} />}
      {i === 6 && <path d="M7 18 H17 A4 4 0 0 0 16 10 A5 5 0 0 0 7 11 A3.5 3.5 0 0 0 7 18 Z" {...st} />}
      {i === 7 && <><circle cx="12" cy="12" r="8" {...st} /><path d="M4 12 H20 M12 4 C8 8 8 16 12 20 M12 4 C16 8 16 16 12 20" {...st} /></>}
    </svg>
  );
};

/** A connector from node (nx, ny) to the pill edge, in half-heights: out from the node, a 45 degree bend, into the pill. */
const connector = (nx: number, ny: number, R: number, Hh: number) => {
  const side = Math.abs(nx) > 5;
  if (side) {
    const sx = Math.sign(nx);
    const x0 = nx - sx * 0.74;
    const x1 = sx * (R / Hh + 0.0);
    const xm = sx * (R / Hh + 0.6);
    return `M ${x0} ${ny} H ${sx * 6.0} L ${xm} ${ny * 0.05} H ${x1}`;
  }
  const sy = Math.sign(ny);
  const y0 = ny - sy * 0.74;
  const x1 = nx * 0.42;
  return `M ${nx} ${y0} V ${sy * 2.4} L ${x1} ${sy * 1.4} V ${sy * 1.0}`;
};

// ================================================================ beats 3b-3d (f540-f959): scan, summarise, assign, send
//
// Not from the reference: the meeting's own story told in its taste. The glow, the glass, the salmon sweep, the coral
// pop of new text, the thin guide lines that draw a frame on, exponential ease-outs at the reference's 0.89 a frame and
// hard cuts between framings. Scan (f540-f599): a highlight runs down the transcript and marks three lines. Summarise
// (f590-f699): the other lines fall away, the marked ones fly into a glass card and turn into bullets. Assign
// (f700-f839): the bullets peel off to their owners' avatars and are ticked. Send (f840-f899): everything folds into a
// message that becomes the glass pill, and beat 5 carries on from there.

/** Exponential ease-out at the reference's ratio: 0 at f0, approaching 1 by 0.89 a frame. */
const expo = (f: number, f0: number, r = 0.89) => (f < f0 ? 0 : 1 - r ** (f - f0));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const Glass: React.FC<{ x: number; y: number; w: number; h: number; r: number; children?: React.ReactNode; o?: number; s?: number }> = ({
  x, y, w, h, r, children, o = 1, s = 1,
}) => (
  <div
    style={{
      position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, borderRadius: r, opacity: o, transform: `scale(${s})`,
      boxSizing: 'border-box', border: '1.5px solid rgba(214,203,203,0.75)',
      background: 'linear-gradient(to bottom, rgba(42,38,41,0.92) 0%, rgba(30,27,31,0.92) 45%, rgba(60,51,55,0.92) 78%, rgba(126,116,118,0.92) 100%)',
      boxShadow: '0 0 18px rgba(255,236,230,0.16)', overflow: 'hidden',
    }}
  >
    {children}
  </div>
);

const MiddleShot: React.FC<{ f: number; p: AppLaunchProps }> = ({ f, p }) => {
  const sm = p.summary;
  const scanY = tbl(f, [[540, lineTop(1) - 14], [592, lineTop(8) + 40]]);
  // the card: in at f604, up and smaller for the owners at f700, folded away at f840
  const cardIn = expo(f, 604);
  const cardUp = expo(f, 700, 0.9);
  const fold = expo(f, 840, 0.86);
  const cardY = lerp(500, 300, cardUp);
  const cardS = lerp(lerp(0.9, 1, cardIn), 0.78, cardUp) * (1 - 0.6 * fold);
  const bulletY = (k: number) => cardY + (-70 + k * 78) * cardS;
  const bulletX = 958 - 330 * cardS;
  // the guide lines that frame the card as it lands (the taste's draw-on guides)
  const guide = clamp01((f - 598) / 14) * (1 - clamp01((f - 640) / 12));
  const avatars = [958 - 420, 958, 958 + 420];
  const msg = expo(f, 852, 0.88);
  const morph = clamp01((f - 880) / 20);
  return (
    <AbsoluteFill style={{ background: RISE_PALETTES[p.palette][0], overflow: 'hidden' }}>
      {/* the glow carries on from screen A's (a 1, sunk 174 px, height 1.6) and settles lower */}
      <Glow palette={p.palette} a={tbl(f, [[596, 1], [700, 0.62], [840, 0.5], [900, 0.4]])} dy={tbl(f, [[596, 174], [700, 0]])} height={tbl(f, [[596, 1.6], [700, 1.1]])} />
      {/* screen A stays: the scan runs over its own transcript, then its other lines and title fall away */}
      {f < 620 && <ScreenA f={f} p={p} bare hide={f >= 596 ? [...sm.keyLines] : []} fade={clamp01((f - 596) / 20)} />}

      {/* scan: a salmon highlight runs down screen A's transcript; the key lines turn salmon and are underlined */}
      {f < 596 && sm.keyLines.map((li) => {
        const marked = clamp01((scanY - lineTop(li) - 10) / 20);
        if (marked <= 0) return null;
        return (
          <div key={li} style={{ position: 'absolute', left: 445, top: lineTop(li), fontFamily: GROT, fontSize: 25, lineHeight: '30px', whiteSpace: 'pre',
            color: `rgba(249,151,132,${marked})`, textDecoration: 'underline', textDecorationColor: `rgba(249,151,132,${marked})`, textDecorationThickness: 2, textUnderlineOffset: 5 }}>
            {p.transcript[li]}
          </div>
        );
      })}
      {f < 596 && <div style={{ position: 'absolute', left: 415, top: scanY, width: 760, height: 34, borderRadius: 8, background: 'linear-gradient(90deg, rgba(249,151,132,0) 0%, rgba(249,151,132,0.22) 25%, rgba(249,151,132,0) 100%)' }} />}

      {/* guide lines draw a frame where the card will land */}
      {guide > 0 && (
        <svg width={SW} height={SH} style={{ position: 'absolute', left: 0, top: 0, opacity: guide, filter: 'drop-shadow(0 0 6px rgba(255,240,240,0.45))' }}>
          <line x1={0} y1={500 - 190} x2={SW * guide} y2={500 - 190} stroke="#ece7e8" strokeWidth={2} />
          <line x1={SW} y1={500 + 190} x2={SW * (1 - guide)} y2={500 + 190} stroke="#ece7e8" strokeWidth={2} />
          <line x1={958 - 420} y1={0} x2={958 - 420} y2={SH * guide} stroke="#ece7e8" strokeWidth={2} />
        </svg>
      )}

      {/* the summary card */}
      {f >= 604 && f < 900 && (
        <Glass x={958} y={cardY} w={840} h={380} r={44} s={cardS} o={tbl(f, [[790, 1], [812, 0.55], [852, 0.55], [866, 0]])}>
          <TypedTitle f={f} text={f < 700 ? sm.title : p.screens[2].title} at={f < 700 ? [612, 614, 616, 618, 620, 622, 624] : [702, 704, 706, 708, 710, 712, 714]}
            tint="#f99784" x={52} y={36} size={52} />
        </Glass>
      )}
      {/* the marked lines fly into the card and become bullets; then they peel off to their owners */}
      {f >= 596 && f < 870 && sm.keyLines.map((li, k) => {
        const fly = expo(f, 596 + 4 * k, 0.88);
        const fromX = 445;
        const fromY = lineTop(li);
        const peel = expo(f, 730 + 22 * k, 0.88);
        const ax = avatars[k];
        const x = lerp(lerp(fromX, bulletX, fly), ax - 150, peel);
        const y = lerp(lerp(fromY, bulletY(k), fly), 760 - 120, peel) - Math.sin(Math.PI * peel) * 120;
        const text = fly > 0.6 ? sm.bullets[k] : p.transcript[li];
        const size = lerp(lerp(25, 34, fly), 26, peel) * (peel > 0 ? 1 : lerp(1, cardS, fly));
        const pop = fly > 0.6 && fly < 0.95 ? 1 : 0;
        return (
          <div key={k} style={{ position: 'absolute', left: x, top: y, fontFamily: GROT, fontSize: size, lineHeight: 1.2, whiteSpace: 'pre',
            color: pop ? '#fc99a0' : mix('#f99784', '#f7f2f4', clamp01((f - 640) / 14)), opacity: 1 - clamp01((f - 850) / 14),
            padding: peel > 0.3 ? '10px 18px' : 0, borderRadius: 999, background: peel > 0.3 ? `rgba(255,255,255,${0.12 * peel})` : undefined,
            border: peel > 0.3 ? `1px solid rgba(255,255,255,${0.45 * peel})` : undefined }}>
            {fly > 0.6 && peel < 0.3 ? '•  ' : ''}{text}
          </div>
        );
      })}

      {/* the owners: avatars rise in, a check pops as their task lands */}
      {f >= 704 && f < 870 && avatars.map((ax, k) => {
        const inK = expo(f, 704 + 6 * k);
        const tick = expo(f, 752 + 22 * k, 0.8);
        return (
          <div key={k} style={{ position: 'absolute', left: ax - 60, top: 800 - 60 + (1 - inK) * 80, width: 120, opacity: inK * (1 - clamp01((f - 846) / 14)), textAlign: 'center' }}>
            <div style={{ width: 120, height: 120, borderRadius: 60, background: 'linear-gradient(135deg, #2a2629, #5a5253)', border: '1.5px solid rgba(214,203,203,0.8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: UI, fontSize: 52, color: '#f7f2f4', position: 'relative' }}>
              {p.actions[k][0]}
              {tick > 0.02 && (
                <div style={{ position: 'absolute', right: -8, bottom: -8, width: 46, height: 46, borderRadius: 23, background: '#9ef0dc', transform: `scale(${0.4 + 0.66 * tick - 0.06 * tick * tick})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width={26} height={26} viewBox="0 0 26 26"><path d="M6 13.5 L11 18.5 L20 8" fill="none" stroke="#10241f" strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
              )}
            </div>
            <div style={{ marginTop: 16, fontFamily: UI, fontSize: 28, color: '#d8d0d2' }}>{sm.owners[k]}</div>
          </div>
        );
      })}

      {/* send: the recap folds into a message, which becomes the pill */}
      {f >= 852 && (
        <Glass x={958} y={538.8} w={lerp(lerp(120, 900, msg), 836, morph)} h={lerp(lerp(120, 150, msg), 268, morph)} r={lerp(lerp(60, 40, msg), 134, morph)}>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22, opacity: (1 - morph) * clamp01((f - 858) / 6),
            fontFamily: UI, fontSize: 40, color: '#f7f2f4', whiteSpace: 'nowrap' }}>
            <svg width={40} height={40} viewBox="0 0 26 26"><rect x="3" y="6" width="20" height="14" rx="2" fill="none" stroke="#f99784" strokeWidth={2} /><path d="M3 7 L13 14 L23 7" fill="none" stroke="#f99784" strokeWidth={2} /></svg>
            {sm.sent.slice(0, Math.max(0, Math.round((f - 858) * 1.4)))}
          </div>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: morph, fontFamily: UI, fontSize: 0.92 * 134, color: '#ece8ec', whiteSpace: 'nowrap' }}>
            {p.product}
          </div>
        </Glass>
      )}
    </AbsoluteFill>
  );
};

/** The three output cards round the pill, in pill half-heights: [x, y, width, height], and which chip each shows. */
const OUTPUTS: ReadonlyArray<readonly [number, number, number, number]> = [[-5.9, 0.35, 3.3, 2.0], [0, -3.25, 3.3, 2.0], [5.9, 0.35, 3.3, 2.0]];
const OUTPUT_CHIP = [0, 3, 1]; // summary on the left, the email above, the actions on the right
/** A straight hairline from the pill's edge to the card's near edge. */
const outputLine = (ox: number, oy: number, R: number, Hh: number, cx: number, cy: number): [number, number, number, number] =>
  ox === 0
    ? [cx, cy - Hh, cx, cy + (oy + 1.0) * Hh]
    : [cx + Math.sign(ox) * R, cy, cx + (ox - Math.sign(ox) * 1.65) * Hh, cy + oy * Hh];

const PillShot: React.FC<{ f: number; p: AppLaunchProps }> = ({ f, p }) => {
  const cx = 958;
  const cy = 538.8;
  const R = tbl(f, PILL_R);
  const Hh = tbl(f, PILL_H);
  const flash = f === 843 ? 1 : 0;
  const at = stretch(NAME_AT, p.product.length);
  const n = at.filter((a) => a <= f).length;
  const sweepFrac = tbl(f, [[876, 0.32], [885, 0.35], [891, 0.52], [897, 0.72], [903, 0.8], [909, 0.9], [912, 1.2]]);
  const nodeR = f < 897 ? 0 : tbl(f, NODE_R);
  const draw = tbl(f, [[897, 0], [898, 0.1], [899, 0.22], [900, 0.37], [901, 0.52], [902, 0.62], [903, 0.7], [904, 0.77], [905, 0.8], [906, 0.85], [908, 0.9], [910, 0.95], [912, 1]]);
  const pulseSide = (f >= 924 && f < 940) || (f >= 969 && f < 985) ? ((f - (f < 950 ? 924 : 969)) / 15) : -1;
  const pulseTop = (f >= 939 && f < 958) || (f >= 981 && f < 997) ? ((f - (f < 970 ? 939 : 981)) / 17) : -1;
  return (
    <AbsoluteFill style={{ background: RISE_PALETTES[p.palette][0], overflow: 'hidden' }}>
      <Glow palette={p.palette} a={tbl(f, [[843, 0.42], [860, 0.38], [884, 0.42], [896, 0.62], [908, 0.8], [932, 0.92], [980, 0.98], [997, 1.05]])} flip height={1.15} />
      {/* Recap's three outputs fan out of the pill as glass cards: a hairline draws to each, then a pulse runs along it */}
      {f >= 897 && (
        <svg width={SW} height={SH} style={{ position: 'absolute', left: 0, top: 0 }}>
          {OUTPUTS.map(([ox, oy], i) => {
            const [x0, y0, x1, y1] = outputLine(ox, oy, R, Hh, cx, cy);
            const pulse = i === 1 ? pulseTop : pulseSide;
            const t = pulse >= 0 ? 1 - (1 - pulse) ** 2 : -1;
            return (
              <g key={i}>
                <line x1={x0} y1={y0} x2={lerp(x0, x1, draw)} y2={lerp(y0, y1, draw)} stroke="rgba(214,203,203,0.55)" strokeWidth={1.4} />
                {t >= 0 && <circle cx={lerp(x0, x1, t)} cy={lerp(y0, y1, t)} r={3.2} fill="#ffffff" />}
              </g>
            );
          })}
        </svg>
      )}
      {nodeR > 0 &&
        OUTPUTS.map(([ox, oy, w, h], i) => {
          const sc = nodeR / 0.736;
          const inner = clamp01((f - 902) / 14);
          const icon: ChipIcon = (p.chipIcons[OUTPUT_CHIP[i]] ?? 'lines') as ChipIcon;
          return (
            <div key={i} style={{ position: 'absolute', left: cx + ox * Hh - (w * Hh) / 2, top: cy + oy * Hh - (h * Hh) / 2, width: w * Hh, height: h * Hh,
              transform: `scale(${sc})`, borderRadius: 0.32 * Hh, boxSizing: 'border-box', border: '1.5px solid rgba(214,203,203,0.7)',
              background: f < 902 ? '#f7f2f4' : 'linear-gradient(to bottom, #2a2629 0%, #1e1b1f 50%, #3c3337 82%, #6e6466 100%)',
              boxShadow: `0 0 ${0.3 * Hh}px rgba(255,236,230,0.2)`, padding: `${0.26 * Hh}px ${0.3 * Hh}px`, overflow: 'hidden' }}>
              <div style={{ opacity: inner, display: 'flex', alignItems: 'center', gap: 0.16 * Hh, fontFamily: UI, fontSize: 0.34 * Hh, color: '#ece8ec' }}>
                <div style={{ transform: `scale(${(0.4 * Hh) / 26})`, transformOrigin: '0 50%', width: 0.4 * Hh }}><ChipGlyph icon={icon} /></div>
                {p.chips[OUTPUT_CHIP[i]]}
              </div>
              {[0, 1, 2].map((r) => {
                const grow = clamp01((f - 906 - 4 * r - 3 * i) / 10);
                return i === 2 ? (
                  <div key={r} style={{ marginTop: 0.16 * Hh, display: 'flex', alignItems: 'center', gap: 0.12 * Hh, opacity: grow }}>
                    <div style={{ width: 0.2 * Hh, height: 0.2 * Hh, borderRadius: 0.05 * Hh, background: grow > 0.6 ? '#9ef0dc' : 'none', border: '1.5px solid #cfc8ca', boxSizing: 'border-box' }} />
                    <div style={{ height: 0.1 * Hh, borderRadius: 0.05 * Hh, width: `${[70, 55, 62][r] * grow}%`, background: 'rgba(236,232,236,0.55)' }} />
                  </div>
                ) : (
                  <div key={r} style={{ marginTop: 0.16 * Hh, height: 0.1 * Hh, borderRadius: 0.05 * Hh, width: `${[88, 72, 80][r] * grow}%`,
                    background: r === 0 ? 'linear-gradient(90deg, #f99784, #ece8ec)' : 'rgba(236,232,236,0.55)' }} />
                );
              })}
            </div>
          );
        })}
      <GlassDisc cx={cx} cy={cy} rx={R} ry={Hh} flash={flash ? 1 : f < 860 ? 0.6 : 0} mark={f === 843 ? p.mark : undefined} />
      {n > 0 && (
        <div style={{ position: 'absolute', left: cx - R + 1.15 * Hh, top: cy - 0.62 * Hh, fontFamily: UI, fontSize: 0.92 * Hh, lineHeight: 1.1, whiteSpace: 'pre', color: '#ece8ec' }}>
          {p.product.slice(0, n).split('').map((ch, i) => {
            const frac = (i + 0.5) / p.product.length;
            const band = clamp01(1 - Math.abs(frac - sweepFrac) / 0.18);
            const fresh = f - at[i] < 6 ? 0.8 : 0;
            return <span key={i} style={{ color: mix('#ece8ec', '#f99784', Math.max(band, fresh)) }}>{ch}</span>;
          })}
        </div>
      )}
    </AbsoluteFill>
  );
};

// ================================================================ beat 6: the closing line, the app icon, the end mark

const CLOSE_AT = [998, 998, 998, 998, 1015, 1015, 1024, 1029, 1032, 1035, 1036, 1037, 1039, 1039, 1040, 1040, 1040, 1040, 1041, 1042,
  1042, 1044, 1046, 1047, 1050, 1053, 1058, 1064, 1076];
/** Characters left as the line deletes (of the reference's 29). */
const CLOSE_LEFT: Table = [[1104, 29], [1105, 28], [1107, 27], [1109, 26], [1110, 25], [1111, 24], [1112, 23], [1113, 22], [1114, 21],
  [1115, 20], [1116, 18], [1117, 16], [1118, 14], [1119, 12], [1120, 9], [1121, 4], [1122, 0]];
const TILE: Table = [[1114, 28], [1115, 58], [1116, 80], [1117, 101], [1118, 116], [1119, 127], [1120, 140], [1121, 150], [1122, 157],
  [1123, 165], [1124, 172], [1125, 178], [1126, 183], [1127, 187], [1128, 193], [1129, 196], [1130, 200], [1131, 206], [1132, 208],
  [1133, 209], [1134, 211], [1135, 213], [1136, 215], [1140, 220], [1150, 215]];
const TILE_Y: Table = [[1128, 538.5], [1129, 536], [1130, 533.5], [1131, 528], [1132, 519], [1133, 509.5], [1134, 503], [1135, 498.5],
  [1136, 494.5], [1137, 491.5], [1138, 489], [1139, 487], [1140, 485.5], [1142, 482.5], [1145, 479], [1150, 477.5]];
const CAPTION_AT = [1126, 1127, 1128, 1130, 1131, 1132, 1135, 1136, 1142]; // the reference's f1110-1125 blob is encoder smear (spec note 4)
/** The slanted wipe's front x at the caption line (the front leans 35 degrees, lower end further left). */
const WIPE: Table = [[1180, 700], [1181, 760], [1182, 800], [1183, 880], [1184, 960], [1185, 1040], [1186, 1170], [1187, 2400]];

const EndShot: React.FC<{ f: number; p: AppLaunchProps }> = ({ f, p }) => {
  const atLine = stretch(CLOSE_AT, p.closing.length);
  const typed = f < 1104 ? atLine.filter((a) => a <= f).length : Math.round((tbl(f, CLOSE_LEFT) / 29) * p.closing.length);
  const tile = f >= 1114 && f < 1187 ? tbl(f, TILE) : 0;
  const tileY = tbl(f, TILE_Y);
  const capAt = stretch(CAPTION_AT, p.product.length);
  const capN = capAt.filter((a) => a <= f).length;
  const wipeX = tbl(f, WIPE);
  const wiped = (x: number, y: number) => x + (y - 540) * Math.tan((35 * Math.PI) / 180) < wipeX;
  const markIn = clamp01((f - 1196) / 40);
  return (
    <AbsoluteFill style={{ background: RISE_PALETTES[p.palette][0], overflow: 'hidden' }}>
      <Glow palette={p.palette} a={tbl(f, [[998, 0.75], [1100, 0.7], [1186, 0.65], [1196, 0.5], [1280, 0.45]])} flip />
      {typed > 0 && f < 1122 && (
        <div style={{ position: 'absolute', left: 0, width: SW, top: 552 - 51, display: 'flex', justifyContent: 'center', fontFamily: UI, fontSize: 51, lineHeight: '60px', whiteSpace: 'pre', color: '#f9f4f7' }}>
          {p.closing.slice(0, typed)}
        </div>
      )}
      {capN > 0 && f < 1187 && (
        <div style={{ position: 'absolute', left: 0, width: SW, top: 664, display: 'flex', justifyContent: 'center',
          fontFamily: UI, fontSize: 84, lineHeight: '96px', whiteSpace: 'pre', color: '#fdf3f4',
          WebkitMaskImage: f >= 1181 ? `linear-gradient(55deg, transparent ${(wipeX - 700) / 5.2}%, black ${(wipeX - 600) / 5.2}%)` : undefined }}>
          {p.product.slice(0, capN)}
        </div>
      )}
      {tile > 0 && !wiped(958 + tile / 2, tileY + tile / 2) && (
        <div style={{ position: 'absolute', left: 958.5 - tile / 2, top: tileY - tile / 2, width: tile, height: tile, borderRadius: tile * 0.22, background: '#efedf0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          WebkitMaskImage: f >= 1181 ? `linear-gradient(55deg, transparent ${((wipeX - (958 - tile / 2)) / tile) * 100 - 20}%, black ${((wipeX - (958 - tile / 2)) / tile) * 100 + 20}%)` : undefined }}>
          <Mark letter={p.mark} size={tile * 0.54} color={p.accent} />
        </div>
      )}
      {f >= 1196 && (
        <div style={{ position: 'absolute', left: 958 - 134, top: 552 - 112, width: 268, height: 224, display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: markIn, transform: `scale(${0.9 + 0.1 * markIn})`, filter: `drop-shadow(0 0 ${18 * markIn}px rgba(255,236,230,0.55))`,
          WebkitMaskImage: `linear-gradient(to top, black ${markIn * 100}%, transparent ${markIn * 100 + 25}%)` }}>
          <div style={{ background: 'linear-gradient(to top, #ffffff 0%, #ffffff 30%, #9a9698 85%, #555355 100%)', WebkitBackgroundClip: 'text', color: 'transparent',
            fontFamily: UI, fontWeight: 700, fontSize: 250, lineHeight: 1 }}>
            {p.mark}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ================================================================ the film

export const AppLaunch: React.FC<AppLaunchProps> = (p) => {
  const f = useCurrentFrame();
  if (f < 197) {
    return <PromptIntro {...promptIntroDefaults} prompt={p.problem} answer={p.answer} palette={p.palette} />;
  }
  return (
    <AbsoluteFill style={{ background: RISE_PALETTES[p.palette][0] }}>
      <div style={{ width: SW, height: SH, transform: `scale(${W / SW}, ${H / SH})`, transformOrigin: '0 0', position: 'relative', overflow: 'hidden' }}>
        {f < 424 && <BarShot f={f} palette={p.palette} prompt={p.request} chips={p.chips} chipIcons={p.chipIcons as ChipIcon[]} mark={p.mark} />}
        {f >= 424 && f < 540 && <ScreenA f={f} p={p} />}
        {f >= 540 && f < 900 && <MiddleShot f={f} p={p} />}
        {/* the pill picks up at its own f897 (Hh 134, where the message hands over) and catches up by f960 */}
        {f >= 900 && f < 998 && <PillShot f={f >= 960 ? f : 897 + ((f - 900) * 63) / 60} p={p} />}
        {f >= 998 && <EndShot f={f} p={p} />}
      </div>
    </AbsoluteFill>
  );
};
