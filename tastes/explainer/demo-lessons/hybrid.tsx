// Lesson H (draft): a landscape SaaS launch reel timed to a frame-by-frame spec of a reference (the
// spec and the reference stay outside the repo). Every table
// below is copied from the spec's per-frame measurements; values between measured frames are interpolated linearly.
// Our own words in the reference's roles and lengths. Built so far: the opening, f0-f196, and the chat bar, f197-f423 (components/showcase/prompt-bar.tsx).
//
//   node ../kinetograph/packages/cli/dist/cli.js render tastes/explainer/demo-lessons/hybrid.tsx --comp LessonH -o tastes/explainer/demo-lessons/out/h.mp4
//   node ../kinetograph/packages/cli/dist/cli.js still tastes/explainer/demo-lessons/hybrid.tsx 60 --comp LessonH -o tastes/explainer/demo-lessons/out/h-f60.png

import React from 'react';
import { AbsoluteFill, Composition, registerRoot, useCurrentFrame } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Comfortaa';
import { measureText } from '@remotion/layout-utils';
import { BarShot } from '../../../components/showcase/prompt-bar.js';
import { RISE_PALETTES, RiseGlow, riseGlowDefaults, type RisePalette } from '../../../components/backgrounds/rise-glow.js';

const FONT = loadFont('normal', { weights: ['400', '700'] }).fontFamily;

const W = 1916;
const H = 1078;
const BG = '#121013';
const INK = '#edebef';
const TINT = '#e0b4b8';
const CY = 538; // the text and arrow centre line

type Table = ReadonlyArray<readonly [number, number]>;

/** Linear interpolation in a per-frame table, clamped at both ends. */
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

// ---------------------------------------------------------------- shared tables (spec section 0, B5)

/** B5: the whole group falls, exponential ease-in 1.22/frame, hard cut at f197. */
const FALL: Table = [[176, 0], [177, 1], [178, 2], [179, 3], [180, 4], [181, 6], [182, 9], [183, 12], [184, 15], [185, 20],
  [186, 25], [187, 31], [188, 39], [189, 47], [190, 57], [191, 69], [192, 84], [193, 101], [194, 123], [195, 154], [196, 222]];

/** The blue flash: 0 → 1 (peak #28527e at f93) → 0, rise 14 frames, fall 22 frames. */
const FLASH: Table = [[76, 0], [80, 0.06], [82, 0.12], [84, 0.22], [86, 0.4], [88, 0.55], [90, 0.72], [92, 0.88], [93, 1],
  [95, 0.95], [97, 0.75], [99, 0.58], [100, 0.52], [102, 0.38], [104, 0.25], [106, 0.13], [108, 0.06], [110, 0.03], [115, 0]];

/** How far below its rest the glow sits (px): the rise f4-f48 (r 0.85/frame), then the band's sink and return in the flash. */
const GLOW_DROP: Table = [[0, 250], [4, 240], [8, 190], [16, 110], [24, 45], [32, 12], [40, 3], [48, 1], [56, 0], [88, 12],
  [96, 40], [104, 30], [120, 10], [136, 0]];
/** After the flash the glow becomes one broad lobe right of centre, bright pink-white at the bottom (f100 on), and
 *  the frame keeps brightening to f176 (mean luma 33 at f120 -> 41 at f176). */
const POST: Table = [[96, 0], [104, 0.3], [116, 0.45], [136, 0.5], [152, 0.78], [164, 0.92], [176, 1]];
/** The rest glow keeps brightening through the hold (mean luma 36 at f40 -> 43 at f76). */
const GAIN: Table = [[0, 0.9], [36, 0.9], [60, 1], [76, 1.09], [96, 1.09], [136, 0.9]]; // 1 at f60, where RiseGlow was fitted

/** The ring: an annulus centred at (0, 539); radii from the measured chord edges at y 300 and 420. */
const RING_IN: Table = [[0, 243], [10, 266], [20, 413], [30, 505], [45, 543], [60, 535], [70, 497]];
const RING_OUT: Table = [[0, 764], [10, 780], [20, 818], [30, 835], [45, 812], [60, 770], [70, 712]];

// ---------------------------------------------------------------- background

const Background: React.FC<{ f: number; palette: RisePalette }> = ({ f, palette }) => {
  const k = tbl(f, FLASH);
  const ri = tbl(f, RING_IN);
  const ro = tbl(f, RING_OUT);
  const ringA = 1 - clamp01((f - 70) / 10);
  const drop = tbl(f, GLOW_DROP) + tbl(f, FALL);
  // the ring lifts the palette's ground toward its edge colour by at most 0.05 a channel (#1e1313 on #121013 in the reference)
  const [g0, g1] = [hex(RISE_PALETTES[palette][0]), hex(RISE_PALETTES[palette][1])];
  const kk = Math.min(0.3, 12.75 / Math.max(1, ...g1.map((v, i) => Math.abs(v - g0[i]))));
  const ringC = `rgb(${g0.map((v, i) => Math.round(v + (g1[i] - v) * kk)).join(',')})`;
  return (
    <AbsoluteFill style={{ background: mix(BG, '#28527e', k) }}>
      {/* the rest glow is the RiseGlow background component (its ember palette was measured from this reel) */}
      <AbsoluteFill style={{ transform: `translateY(${drop}px)`, filter: `brightness(${tbl(f, GAIN)})` }}>
        <div style={{ width: 1920, height: 1080, transform: `scale(${W / 1920}, ${H / 1080})`, transformOrigin: '0 0' }}>
          <RiseGlow {...riseGlowDefaults} palette={palette} ring={0} speed={0.6} height={0.85} />
        </div>
      </AbsoluteFill>
      {/* the blue flash fills the dark part of the frame */}
      <AbsoluteFill style={{ opacity: k, background: 'linear-gradient(to bottom, #28527e 0%, #28527e 62%, rgba(40,82,126,0) 86%)' }} />
      <AbsoluteFill
        style={{
          opacity: ringA,
          background: `radial-gradient(circle at 0px 539px, transparent ${ri - 3}px, ${ringC} ${ri + 3}px, ${ringC} ${ro - 3}px, transparent ${ro + 3}px)`,
          mixBlendMode: 'lighten',
        }}
      />
      <AbsoluteFill style={{ transform: `translateY(${drop}px)` }}>
        <AbsoluteFill
          style={{
            opacity: tbl(f, POST),
            filter: `brightness(${tbl(f, [[136, 1], [176, 1.25]])})`,
            background: [
              'radial-gradient(ellipse 46% 46% at 74% 104%, rgba(236,212,208,1) 0%, rgba(214,150,140,0.95) 22%, rgba(178,88,74,0.85) 48%, rgba(96,38,32,0.5) 74%, rgba(18,16,19,0) 100%)',
              'radial-gradient(ellipse 40% 34% at 18% 104%, rgba(190,104,92,0.85) 0%, rgba(140,60,50,0.6) 45%, rgba(18,16,19,0) 100%)',
            ].join(','),
          }}
        />
        {/* in the flash the band turns orange to yellow (peak #f0890f at f95) */}
        <AbsoluteFill
          style={{
            opacity: tbl(f, [[72, 0], [76, 0.15], [80, 0.45], [88, 1], [95, 1], [100, 0.7], [105, 0.35], [110, 0.12], [115, 0]]),
            background:
              [
                // two humps across the width (sine-like, lobes at x 0.25 and 0.75): yellow core, orange, red, a teal fringe into the blue
                'radial-gradient(ellipse 34% 34% at 25% 104%, #f6c056 0%, #f0890f 30%, #e0503a 58%, rgba(70,130,150,0.5) 80%, rgba(40,82,126,0) 100%)',
                'radial-gradient(ellipse 34% 30% at 75% 106%, #f6c056 0%, #f0890f 30%, #e0503a 58%, rgba(70,130,150,0.5) 80%, rgba(40,82,126,0) 100%)',
                'linear-gradient(to top, #f0890f 0%, #e0503a 9%, rgba(80,120,150,0.4) 17%, rgba(40,82,126,0) 24%)',
              ].join(','),
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- the arrow

/** At scale 1 the arrow is 143 x 111 px with a 17 px stroke, square ends, a 45 degree open head. */
const ArrowGlyph: React.FC<{ cx: number; cy: number; s: number; flip?: boolean; opacity?: number; halo?: number }> = ({
  cx, cy, s, flip, opacity = 1, halo = 0,
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
      filter: halo > 0.01
        ? `drop-shadow(0 0 14px rgba(225,222,236,${0.55 * halo})) drop-shadow(0 0 60px rgba(205,200,225,${0.3 * halo}))`
        : undefined,
    }}
  >
    <path d="M4 55.5 H132 M84 8.5 L131 55.5 L84 102.5" fill="none" stroke="#f2eff3" strokeWidth={17} strokeLinecap="butt" strokeLinejoin="miter" />
  </svg>
);

// A1: B1 shrink-and-slide (centre x and scale per frame), B2 dip and launch, B3 exit right (left edge + 29, width 58).
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

// A2: the left arrow enters from the right (exponential ease-out 0.88/frame), width 55.
const A2_L: Table = [[139, 1858], [140, 1886], [141, 1757], [142, 1710], [143, 1658], [144, 1620], [145, 1584], [146, 1555],
  [147, 1530], [148, 1507], [149, 1488], [150, 1470], [151, 1456], [153, 1431], [155, 1411], [157, 1396], [159, 1383], [161, 1374],
  [163, 1367], [165, 1362], [167, 1359], [169, 1357], [171, 1356], [173, 1354], [175, 1353], [177, 1352], [179, 1351], [181, 1350],
  [183, 1349], [185, 1348], [189, 1347], [193, 1346], [196, 1346]];

const Arrows: React.FC<{ f: number }> = ({ f }) => {
  const dy = tbl(f, FALL);
  const a1 = f < 112 ? (
    <ArrowGlyph
      cx={tbl(f, A1_CX)}
      cy={CY}
      s={tbl(f, A1_S)}
      halo={tbl(f, [[0, 1], [6, 0.9], [11, 0.5], [16, 0]])}
      opacity={tbl(f, [[82, 1], [85, 0.7], [89, 0.55], [100, 0.55], [104, 1]])}
    />
  ) : null;
  const a2 = f >= 139 && f < 197 ? <ArrowGlyph cx={tbl(f, A2_L) + 27.5} cy={CY + 1 + dy} s={0.385} flip /> : null;
  return <>{a1}{a2}</>;
};

// ---------------------------------------------------------------- typed lines

interface LineSpec {
  text: string;
  /** frame each character lands (index for index with the reference line) */
  at: number[];
  /** scale of the whole line */
  scale: Table;
  /** centre x of the line */
  cx: Table;
  /** centre x of the travelling salmon tint */
  sweep: Table;
  sweepEnd: number;
  /** extra amber entry glow on the first word (B3's "Stop") */
  amberUntil?: number;
  /** the reference line's width at scale 1 (px); ours is tracked to the same width */
  width: number;
}

const SIZE = 51.5; // font px at scale 1 (cap 38 px, the settled size at f84)

const Line: React.FC<{ f: number; spec: LineSpec; dy?: number; alpha?: number; count?: number }> = ({ f, spec, dy = 0, alpha = 1, count }) => {
  const n = count ?? spec.at.filter((a) => a <= f).length;
  if (n <= 0) return null;
  const s = tbl(f, spec.scale);
  const cx = tbl(f, spec.cx);
  const sweepX = f < spec.sweepEnd ? tbl(f, spec.sweep) : -9999;
  const chars = spec.text.slice(0, n).split('');
  const natural = measureText({ text: spec.text, fontFamily: FONT, fontSize: SIZE, fontWeight: 400 }).width;
  const track = (spec.width - natural) / spec.text.length;
  const shown = measureText({ text: spec.text.slice(0, n), fontFamily: FONT, fontSize: SIZE, fontWeight: 400 }).width + track * n;
  const prefix = (i: number) => measureText({ text: spec.text.slice(0, i), fontFamily: FONT, fontSize: SIZE, fontWeight: 400 }).width + track * i;
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
      {chars.map((ch, i) => {
        const age = f - spec.at[i];
        // the landing pose: 1.8x tall and blurred, down to 1x and sharp over 9 frames (spec B1 "Letter pose on entry")
        const t = clamp01(age / 9);
        // (the 1.8x height of a new letter is mostly its blur: the glyph itself lands at about 1.2x)
        const ls = 1.2 - 0.2 * (1 - (1 - t) ** 2);
        const blur = 6 * (1 - t);
        const x = cx + (prefix(i) + (prefix(i + 1) - prefix(i)) / 2 - shown / 2) * s;
        const band = clamp01(1 - Math.abs(x - sweepX) / 220);
        const amber = spec.amberUntil !== undefined && f < spec.amberUntil && i < 4;
        const color = amber ? mix('#fbe6c0', '#e49d74', clamp01(age / 12)) : mix(INK, TINT, band);
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              whiteSpace: 'pre',
              fontFamily: FONT,
              fontWeight: amber || band > 0.5 ? 700 : 400,
              fontSize: SIZE,
              letterSpacing: track,
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

// T1: "I need an app for my business" in the reference; ours has the same length and word breaks.
const T1: LineSpec = {
  text: 'I need a film for my business',
  at: [11, 21, 21, 23, 25, 26, 28, 28, 29, 29, 30, 30, 30, 30, 30, 31, 31, 32, 32, 33, 34, 34, 35, 37, 39, 41, 46, 49, 54],
  scale: [[0, 1.2], [30, 1.08], [35, 1.18], [45, 1.12], [60, 1.05], [70, 1.02], [84, 1]],
  cx: [[0, 935], [25, 942], [30, 942], [33, 932], [36, 949], [40, 942], [45, 948], [50, 950], [60, 952], [85, 952]],
  sweep: [[24, 900], [27, 902], [30, 873], [33, 844], [36, 863], [39, 900], [42, 907], [45, 943], [48, 995], [51, 1045], [54, 1109],
    [57, 1190], [60, 1223], [63, 1241], [66, 1298], [68, 1330]],
  sweepEnd: 69,
  width: 739, // 776 px at scale 1.05 (f60)
};
/** characters left of T1 while it deletes (f86-f93) */
const T1_LEFT: Table = [[85, 29], [86, 26], [87, 20], [88, 13], [89, 9], [90, 6], [91, 5], [92, 3], [93, 1]];

// T2: "Stop building apps manually." in the reference (28 characters); ours is 28 too.
const T2: LineSpec = {
  text: 'Stop cutting reels manually.',
  at: [95, 101, 104, 106, 111, 111, 113, 113, 114, 114, 115, 115, 116, 116, 117, 119, 120, 122, 123, 123, 126, 129, 133, 136, 137, 138, 138, 139],
  // cap 49 while typing (1.22x of the 40 px rest), then an exponential ease-out (0.925/frame) to 1.0 from f137
  scale: [[93, 1.16], [111, 1.29], [137, 1.29], [139, 1.26], [143, 1.21], [147, 1.15], [152, 1.1], [160, 1.08], [170, 1.05], [185, 1.0]],
  cx: [[93, 950], [113, 950], [139, 958], [196, 956]],
  sweep: [[94, 957], [100, 945], [106, 945], [109, 930], [112, 923], [115, 878], [118, 898], [121, 938], [124, 971], [127, 1013],
    [130, 1082], [133, 1143], [136, 1219], [139, 1244], [142, 1290], [145, 1330], [147, 1360]],
  sweepEnd: 148,
  amberUntil: 110,
  width: 708, // f195, settled
};

const Dots: React.FC<{ f: number }> = ({ f }) => {
  if (f < 25 || f >= 93) return null;
  // D1 slides in from x 1577 (exponential ease-out ~0.9/frame), D2 lands at f49, D3 at f75; pitch 22 px
  const d1 = tbl(f, [[25, 1577], [26, 1556], [27, 1540], [28, 1526], [29, 1513], [30, 1502], [32, 1483], [34, 1466], [36, 1452],
    [38, 1440], [40, 1429], [42, 1419], [44, 1410], [46, 1403], [48, 1396], [50, 1390], [52, 1384], [54, 1379], [56, 1374],
    [58, 1370], [60, 1366], [76, 1343], [85, 1335], [86, 1328], [87, 1316], [88, 1291], [89, 1235], [90, 1111], [91, 1042], [92, 1009]]);
  const deleting = f >= 86;
  const size = deleting ? 5 : tbl(f, [[25, 12], [37, 9]]);
  const pitch = deleting ? 9 : tbl(f, [[49, 33], [52, 28], [56, 24], [60, 22]]);
  const n = f < 49 ? 1 : f < 75 ? 2 : 3;
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: d1 + i * pitch,
            top: 551 - size,
            width: size,
            height: size + (deleting ? 0 : 1),
            borderRadius: 2,
            background: '#f3f0f4',
            opacity: deleting ? 0.6 : 1,
          }}
        />
      ))}
    </>
  );
};

// ---------------------------------------------------------------- the film

const LessonH: React.FC<{ palette?: RisePalette }> = ({ palette = 'ember' }) => {
  const f = useCurrentFrame();
  if (f >= 197 && f < 424) return <BarShot f={f} palette={palette} prompt="I need a reel for my business" chips={['Atlas', 'Nova', 'Lumen', 'Other']} />;
  if (f >= 424) return <AbsoluteFill style={{ background: BG }} />; // not built yet
  const dy = tbl(f, FALL);
  return (
    <AbsoluteFill style={{ background: BG, overflow: 'hidden' }}>
      <Background f={f} palette={palette} />
      {f < 86 && <Line f={f} spec={T1} />}
      {f >= 86 && f < 93 && <Line f={f} spec={T1} count={Math.round(tbl(f, T1_LEFT))} alpha={tbl(f, [[86, 0.85], [92, 0.6]])} />}
      <Dots f={f} />
      {f >= 93 && <Line f={f} spec={T2} dy={dy} />}
      <Arrows f={f} />
    </AbsoluteFill>
  );
};

const Root: React.FC = () => (
  <>
    <Composition id="LessonH" component={LessonH} width={W} height={H} fps={60} durationInFrames={1436} defaultProps={{ palette: 'ember' as RisePalette }} />
    <Composition id="LessonHLiquid" component={LessonH} width={W} height={H} fps={60} durationInFrames={1436} defaultProps={{ palette: 'liquid' as RisePalette }} />
    <Composition id="LessonHDrift" component={LessonH} width={W} height={H} fps={60} durationInFrames={1436} defaultProps={{ palette: 'drift' as RisePalette }} />
  </>
);

registerRoot(Root);
