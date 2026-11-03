// Prompt Intro: a 3.3 s opener for a product film. An arrow with a soft halo shrinks and slides left, a prompt types on
// beside it (letters land blurred and settle, a warm tint sweeps along behind the typing), three dots trail it; the arrow
// dips back, launches right and the prompt deletes itself into the next line while a blue flash washes over the frame and
// the glow at the bottom flares orange; the answer types on with an amber first word, a second arrow glides in after it,
// and everything drops out of frame for the cut.
//
// Built from the measured opening of a SaaS launch reel with the kinetograph-taste-clone skill: every motion is the
// reference's own per-frame table (f0-f196), so the timing, eases and
// layout are the reference's; the words, the font and the glow are ours. The glow is the RiseGlow background with any of
// its palettes (liquid by default); the typing rhythm is the reference's, stretched to the length of your lines.
//
// Principles: anticipation (the arrow dips before it launches), slow in and out (every move is a measured ease), overlap
// (the tint trails the typing, the dots trail the line), staging (one line at a time), follow through (the answer settles
// from 1.29x after it lands).

import React from 'react';
import { z } from 'zod';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Comfortaa';
import { measureText } from '@remotion/layout-utils';
import { RISE_PALETTES, RiseGlow, riseGlowDefaults, type RisePalette } from '../backgrounds/rise-glow.js';

export const W = 1920;
export const H = 1080;
export const FPS = 60;
export const DURATION = 197;

const FONT = loadFont('normal', { weights: ['400', '700'] }).fontFamily;

const hexC = z.string().describe('A CSS colour as #rrggbb.');

export const promptIntroSchema = z.object({
  prompt: z.string().min(1).max(40).describe('The first line, typed then deleted (the reference: 29 characters).'),
  answer: z.string().min(1).max(40).describe('The second line; its first word lands amber (the reference: 28 characters).'),
  palette: z.enum(Object.keys(RISE_PALETTES) as [RisePalette, ...RisePalette[]]).describe('The glow at the bottom: a RiseGlow palette.'),
  ink: hexC.describe('The text and arrows.'),
  tint: hexC.describe('The tint that sweeps along the typing.'),
  flash: z.boolean().describe('The blue flash and orange flare as the prompt deletes.'),
});
export type PromptIntroProps = z.infer<typeof promptIntroSchema>;

export const promptIntroDefaults: PromptIntroProps = {
  prompt: 'I need a film for my business',
  answer: 'Stop cutting reels manually.',
  palette: 'liquid',
  ink: '#edebef',
  tint: '#e0b4b8',
  flash: true,
};

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
const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const [x, y] = [hex(a), hex(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * clamp01(t))).join(',')})`;
};
const rgba = (c: string, a: number) => `rgba(${hex(c).join(',')},${a})`;

const CY = 540;
const SIZE = 51.5; // font px at scale 1

// ---------------------------------------------------------------- the reference's tables (SPEC.md f0-f196)

const FALL: Table = [[176, 0], [177, 1], [178, 2], [179, 3], [180, 4], [181, 6], [182, 9], [183, 12], [184, 15], [185, 20],
  [186, 25], [187, 31], [188, 39], [189, 47], [190, 57], [191, 69], [192, 84], [193, 101], [194, 123], [195, 154], [196, 222]];
const FLASH: Table = [[76, 0], [80, 0.06], [82, 0.12], [84, 0.22], [86, 0.4], [88, 0.55], [90, 0.72], [92, 0.88], [93, 1],
  [95, 0.95], [97, 0.75], [99, 0.58], [100, 0.52], [102, 0.38], [104, 0.25], [106, 0.13], [108, 0.06], [110, 0.03], [115, 0]];
const FLARE: Table = [[72, 0], [76, 0.15], [80, 0.45], [88, 1], [95, 1], [100, 0.7], [105, 0.35], [110, 0.12], [115, 0]];
const GLOW_DROP: Table = [[0, 250], [4, 240], [8, 190], [16, 110], [24, 45], [32, 12], [40, 3], [48, 1], [56, 0], [88, 12],
  [96, 40], [104, 30], [120, 10], [136, 0]];
const POST: Table = [[96, 0], [104, 0.25], [116, 0.35], [136, 0.4], [152, 0.55], [164, 0.62], [176, 0.68]];
const GAIN: Table = [[0, 0.9], [36, 0.9], [60, 1], [76, 1.09], [96, 1.09], [136, 0.9]];
const RING_IN: Table = [[0, 243], [10, 266], [20, 413], [30, 505], [45, 543], [60, 535], [70, 497]];
const RING_OUT: Table = [[0, 764], [10, 780], [20, 818], [30, 835], [45, 812], [60, 770], [70, 712]];

const A1_CX: Table = [[0, 786.5], [8, 787], [12, 790.5], [16, 795], [18, 795], [20, 791.5], [22, 783], [23, 776], [24, 767], [25, 754.5],
  [26, 737.5], [27, 712], [28, 675], [29, 626.5], [30, 588], [31, 563.5], [32, 546.5], [33, 534.5], [34, 526.5], [35, 520.5],
  [36, 515], [37, 511.5], [38, 508.5], [39, 506], [40, 504.5], [42, 502.5], [46, 501], [52, 503], [56, 500], [57, 500],
  [58, 494], [59, 484], [60, 470], [61, 452], [62, 433.5], [63, 417.5], [64, 404.5], [65, 395.5], [66, 389], [67, 385], [68, 383],
  [70, 382], [71, 383], [72, 384.5], [73, 386], [74, 388.5], [75, 391.5], [76, 399.5], [77, 418.5], [78, 441], [79, 462.5],
  [80, 482], [81, 500.5], [82, 518], [83, 534.5], [84, 551.5], [85, 570.5], [86, 591.5], [87, 614], [88, 641], [89, 671.5],
  [90, 707.5], [91, 752.5], [92, 802.5], [93, 858], [94, 927], [95, 994], [96, 1096], [97, 1189], [98, 1279], [99, 1363],
  [100, 1438], [101, 1507], [102, 1569], [103, 1625], [104, 1676], [105, 1723], [106, 1765], [107, 1805], [108, 1841],
  [109, 1875], [110, 1907], [111, 1936], [112, 1990]];
const A1_S: Table = [[0, 1], [3, 1], [4, 0.99], [6, 0.97], [8, 0.95], [9, 0.94], [10, 0.92], [11, 0.89], [12, 0.87], [13, 0.85],
  [14, 0.82], [15, 0.78], [16, 0.76], [17, 0.73], [18, 0.7], [19, 0.68], [20, 0.65], [21, 0.64], [22, 0.61], [23, 0.6], [24, 0.59],
  [25, 0.57], [26, 0.55], [28, 0.53], [29, 0.52], [31, 0.51], [33, 0.5], [34, 0.48], [37, 0.47], [39, 0.46], [40, 0.45], [46, 0.45],
  [48, 0.43], [52, 0.43], [56, 0.42], [60, 0.405], [78, 0.405], [79, 0.37], [112, 0.37]];
const A2_L: Table = [[139, 1858], [140, 1886], [141, 1757], [142, 1710], [143, 1658], [144, 1620], [145, 1584], [146, 1555],
  [147, 1530], [148, 1507], [149, 1488], [150, 1470], [151, 1456], [153, 1431], [155, 1411], [157, 1396], [159, 1383], [161, 1374],
  [163, 1367], [165, 1362], [167, 1359], [169, 1357], [171, 1356], [173, 1354], [175, 1353], [177, 1352], [179, 1351], [181, 1350],
  [183, 1349], [185, 1348], [189, 1347], [193, 1346], [196, 1346]];
const D1_X: Table = [[25, 1577], [26, 1556], [27, 1540], [28, 1526], [29, 1513], [30, 1502], [32, 1483], [34, 1466], [36, 1452],
  [38, 1440], [40, 1429], [42, 1419], [44, 1410], [46, 1403], [48, 1396], [50, 1390], [52, 1384], [54, 1379], [56, 1374],
  [58, 1370], [60, 1366], [76, 1343], [85, 1335], [86, 1328], [87, 1316], [88, 1291], [89, 1235], [90, 1111], [91, 1042], [92, 1009]];

/** The reference lines' landing frames per character, their scale, centre and the tint's centre per frame. */
const REF1 = {
  at: [11, 21, 21, 23, 25, 26, 28, 28, 29, 29, 30, 30, 30, 30, 30, 31, 31, 32, 32, 33, 34, 34, 35, 37, 39, 41, 46, 49, 54],
  scale: [[0, 1.2], [30, 1.08], [35, 1.18], [45, 1.12], [60, 1.05], [70, 1.02], [84, 1]] as Table,
  cx: [[0, 935], [25, 942], [30, 942], [33, 932], [36, 949], [40, 942], [45, 948], [50, 950], [60, 952], [85, 952]] as Table,
  // the tint's centre as a share of the finished line (reference line x 564-1340 at f60)
  sweep: [[24, 0.43], [27, 0.43], [30, 0.4], [33, 0.36], [36, 0.39], [39, 0.43], [42, 0.44], [45, 0.49], [48, 0.56], [51, 0.62],
    [54, 0.7], [57, 0.81], [60, 0.85], [63, 0.87], [66, 0.95], [68, 0.99]] as Table,
  sweepEnd: 69,
  left: [[85, 1], [86, 0.9], [87, 0.69], [88, 0.45], [89, 0.31], [90, 0.21], [91, 0.17], [92, 0.1], [93, 0.03]] as Table,
};
const REF2 = {
  at: [95, 101, 104, 106, 111, 111, 113, 113, 114, 114, 115, 115, 116, 116, 117, 119, 120, 122, 123, 123, 126, 129, 133, 136, 137, 138, 138, 139],
  scale: [[93, 1.16], [111, 1.29], [137, 1.29], [139, 1.26], [143, 1.21], [147, 1.15], [152, 1.1], [160, 1.08], [170, 1.05], [185, 1.0]] as Table,
  cx: [[93, 950], [113, 950], [139, 958], [196, 956]] as Table,
  // reference line x 518-1397 at f139
  sweep: [[94, 0.5], [100, 0.49], [106, 0.49], [109, 0.47], [112, 0.46], [115, 0.41], [118, 0.43], [121, 0.48], [124, 0.51], [127, 0.56],
    [130, 0.64], [133, 0.71], [136, 0.8], [139, 0.83], [142, 0.88], [145, 0.92], [147, 0.96]] as Table,
  sweepEnd: 148,
};

/** The reference's landing frames stretched to a line of n characters. */
const stretch = (at: number[], n: number) =>
  Array.from({ length: n }, (_, i) => at[Math.min(at.length - 1, Math.round((i * (at.length - 1)) / Math.max(1, n - 1)))]);

const width = (text: string) => measureText({ text, fontFamily: FONT, fontSize: SIZE, fontWeight: 400 }).width;

// ---------------------------------------------------------------- pieces

const Arrow: React.FC<{ cx: number; cy: number; s: number; ink: string; flip?: boolean; opacity?: number; halo?: number }> = ({
  cx, cy, s, ink, flip, opacity = 1, halo = 0,
}) => (
  <svg
    width={143}
    height={111}
    viewBox="0 0 143 111"
    style={{
      position: 'absolute',
      left: cx - 71.5,
      top: cy - 55.5,
      transform: `scale(${flip ? -s : s}, ${s})`,
      opacity,
      filter: halo > 0.01 ? `drop-shadow(0 0 14px ${rgba(ink, 0.55 * halo)}) drop-shadow(0 0 60px ${rgba(ink, 0.3 * halo)})` : undefined,
    }}
  >
    <path d="M4 55.5 H132 M84 8.5 L131 55.5 L84 102.5" fill="none" stroke={ink} strokeWidth={17} strokeLinecap="butt" strokeLinejoin="miter" />
  </svg>
);

interface LineProps {
  f: number;
  text: string;
  at: number[];
  scale: Table;
  cx: Table;
  sweep: Table;
  sweepEnd: number;
  ink: string;
  tint: string;
  dy?: number;
  alpha?: number;
  count?: number;
  amberUntil?: number;
}

const Line: React.FC<LineProps> = ({ f, text, at, scale, cx: cxT, sweep, sweepEnd, ink, tint, dy = 0, alpha = 1, count, amberUntil }) => {
  const n = count ?? at.filter((a) => a <= f).length;
  if (n <= 0) return null;
  const s = tbl(f, scale);
  const cx = tbl(f, cxT);
  const full = width(text);
  const shown = width(text.slice(0, n));
  const sweepX = f < sweepEnd ? cx - (shown / 2) * s + tbl(f, sweep) * full * s : -9999;
  const firstWord = text.indexOf(' ') < 0 ? text.length : text.indexOf(' ');
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        width: W,
        top: CY - 40 + dy,
        height: 80,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transform: `translateX(${cx - W / 2}px) scale(${s})`,
        transformOrigin: `${W / 2}px 40px`,
        opacity: alpha,
      }}
    >
      {text.slice(0, n).split('').map((ch, i) => {
        const age = f - at[i];
        const t = clamp01(age / 9);
        const ls = 1.2 - 0.2 * (1 - (1 - t) ** 2);
        const blur = 6 * (1 - t);
        const x = cx + (width(text.slice(0, i)) + width(ch) / 2 - shown / 2) * s;
        const band = clamp01(1 - Math.abs(x - sweepX) / 220);
        const amber = amberUntil !== undefined && f < amberUntil && i < firstWord;
        const color = amber ? mix('#fbe6c0', '#e49d74', clamp01(age / 12)) : mix(ink, tint, band);
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              whiteSpace: 'pre',
              fontFamily: FONT,
              fontWeight: amber || band > 0.5 ? 700 : 400,
              fontSize: SIZE,
              lineHeight: '80px',
              color,
              transform: `scale(${ls})`,
              transformOrigin: '50% 60%',
              filter: blur > 0.2 ? `blur(${blur}px)` : undefined,
              textShadow: amber ? '0 0 4px rgba(250,207,147,0.9), 0 0 9px rgba(202,136,96,0.6)' : undefined,
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------- the film

export const PromptIntro: React.FC<PromptIntroProps> = (p) => {
  const f = useCurrentFrame();
  const pal = RISE_PALETTES[p.palette];
  const ground = pal[0];
  const k = p.flash ? tbl(f, FLASH) : 0;
  const dy = tbl(f, FALL);
  const drop = tbl(f, GLOW_DROP) + dy;

  // where our lines sit against the reference's: the arrow, the dots and the second arrow keep the reference's gaps
  const w1 = width(p.prompt);
  const w2 = width(p.answer);
  const left1 = 952 - (w1 * 1.05) / 2; // the prompt's left edge at f60 (the reference's: 564)
  const right1 = 952 + (w1 * 1.05) / 2; // its right edge (the reference's: 1340)
  const right2 = 956 + w2 / 2; // the answer's right edge, settled (the reference's: 1310)
  const a1dx = (left1 - 564) * clamp01((f - 20) / 20) * (1 - clamp01((f - 86) / 8));
  const ddx = (right1 + 26 - 1366) * (1 - clamp01((f - 86) / 7));

  // the ring lifts the ground toward the palette's edge colour by at most 0.05 a channel
  const [g0, g1] = [hex(ground), hex(pal[1])];
  const kk = Math.min(0.3, 12.75 / Math.max(1, ...g1.map((v, i) => Math.abs(v - g0[i]))));
  const ringC = `rgb(${g0.map((v, i) => Math.round(v + (g1[i] - v) * kk)).join(',')})`;
  const ri = tbl(f, RING_IN);
  const ro = tbl(f, RING_OUT);

  const n1 = p.prompt.length;
  const at1 = stretch(REF1.at, n1);
  const at2 = stretch(REF2.at, p.answer.length);

  const dotsN = f < 49 ? 1 : f < 75 ? 2 : 3;
  const deleting = f >= 86;
  const dotSize = deleting ? 5 : tbl(f, [[25, 12], [37, 9]]);
  const pitch = deleting ? 9 : tbl(f, [[49, 33], [52, 28], [56, 24], [60, 22]]);

  return (
    <AbsoluteFill style={{ background: ground, overflow: 'hidden' }}>
      {/* the glow */}
      <AbsoluteFill style={{ transform: `translateY(${drop}px)`, filter: `brightness(${tbl(f, GAIN)})` }}>
        <RiseGlow {...riseGlowDefaults} palette={p.palette} ring={0} speed={0.6} height={0.85} />
      </AbsoluteFill>
      <AbsoluteFill style={{ opacity: k, background: 'linear-gradient(to bottom, #28527e 0%, #28527e 62%, rgba(40,82,126,0) 86%)' }} />
      <AbsoluteFill
        style={{
          opacity: 1 - clamp01((f - 70) / 10),
          background: `radial-gradient(circle at 0px 540px, transparent ${ri - 3}px, ${ringC} ${ri + 3}px, ${ringC} ${ro - 3}px, transparent ${ro + 3}px)`,
          mixBlendMode: 'lighten',
        }}
      />
      <AbsoluteFill style={{ transform: `translateY(${drop}px)` }}>
        {/* after the flash the glow swells into one broad lobe right of centre */}
        <AbsoluteFill
          style={{
            opacity: tbl(f, POST),
            filter: `brightness(${tbl(f, [[136, 1], [176, 1.15]])})`,
            background: [
              `radial-gradient(ellipse 62% 50% at 70% 106%, ${rgba(pal[4], 0.9)} 0%, ${rgba(pal[3], 0.8)} 22%, ${rgba(pal[2], 0.6)} 50%, ${rgba(pal[1], 0.3)} 76%, ${rgba(ground, 0)} 100%)`,
            ].join(','),
          }}
        />
        {p.flash && (
          <AbsoluteFill
            style={{
              opacity: tbl(f, FLARE),
              background: [
                'radial-gradient(ellipse 34% 34% at 25% 104%, #f6c056 0%, #f0890f 30%, #e0503a 58%, rgba(70,130,150,0.5) 80%, rgba(40,82,126,0) 100%)',
                'radial-gradient(ellipse 34% 30% at 75% 106%, #f6c056 0%, #f0890f 30%, #e0503a 58%, rgba(70,130,150,0.5) 80%, rgba(40,82,126,0) 100%)',
                'linear-gradient(to top, #f0890f 0%, #e0503a 9%, rgba(80,120,150,0.4) 17%, rgba(40,82,126,0) 24%)',
              ].join(','),
            }}
          />
        )}
      </AbsoluteFill>

      {/* the prompt, then its deletion */}
      {f < 93 && (
        <Line
          f={f}
          text={p.prompt}
          at={at1}
          scale={REF1.scale}
          cx={REF1.cx}
          sweep={REF1.sweep}
          sweepEnd={REF1.sweepEnd}
          ink={p.ink}
          tint={p.tint}
          count={deleting ? Math.max(1, Math.round(n1 * tbl(f, REF1.left))) : undefined}
          alpha={deleting ? tbl(f, [[86, 0.85], [92, 0.6]]) : 1}
        />
      )}
      {f >= 25 && f < 93 &&
        Array.from({ length: dotsN }, (_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: tbl(f, D1_X) + ddx + i * pitch,
              top: 553 - dotSize,
              width: dotSize,
              height: dotSize + (deleting ? 0 : 1),
              borderRadius: 2,
              background: p.ink,
              opacity: deleting ? 0.6 : 1,
            }}
          />
        ))}

      {/* the answer */}
      {f >= 93 && (
        <Line
          f={f}
          text={p.answer}
          at={at2}
          scale={REF2.scale}
          cx={REF2.cx}
          sweep={REF2.sweep}
          sweepEnd={REF2.sweepEnd}
          ink={p.ink}
          tint={p.tint}
          dy={dy}
          amberUntil={110}
        />
      )}

      {/* the arrows */}
      {f < 112 && (
        <Arrow
          cx={tbl(f, A1_CX) + a1dx}
          cy={CY}
          s={tbl(f, A1_S)}
          ink={p.ink}
          halo={tbl(f, [[0, 1], [6, 0.9], [11, 0.5], [16, 0]])}
          opacity={k > 0 ? tbl(f, [[82, 1], [85, 0.7], [89, 0.55], [100, 0.55], [104, 1]]) : 1}
        />
      )}
      {f >= 139 && <Arrow cx={tbl(f, A2_L) + 27.5 + (right2 - 1310)} cy={CY + 1 + dy} s={0.385} ink={p.ink} flip />}
    </AbsoluteFill>
  );
};
