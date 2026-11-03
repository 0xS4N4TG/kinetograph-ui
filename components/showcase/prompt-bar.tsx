// Prompt Bar (shot 2 of AppLaunch, and of the hybrid reel in tastes/explainer/demo-lessons; f197-f423): one chat input bar seen through three hard-cut framings (x1.808, x1.0, x2.115) with a
// pan in each. Shot A: the bar's bottom edge draws on as guide lines cross the frame, our mark scales in and dissolves,
// four chips drop in 10 frames apart, a plus spins in, the prompt starts typing. Shot B: the whole bar, typing goes on,
// a cursor flies in. Shot C: close on the send button, the cursor settles and clicks, the button blooms orange and
// squashes, the frame flashes and the camera falls away. Every table is the spec's (SPEC.md, "Spec 0197-0423"), in
// frame numbers of the film (pass the film's frame); the bar is designed once at shot B's scale (1183 x 165) and the camera frames it.
//
// Ours in the reference's roles: the mark in the leading slot, the four model chips (our names and glyphs), the words.
// Not built yet: the liquid warp on the bar outline and the chromatic smear on the text (f390-f416).

import React from 'react';
import { AbsoluteFill } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Comfortaa';
import { RISE_PALETTES, RiseGlow, riseGlowDefaults, type RisePalette } from '../backgrounds/rise-glow.js';

const FONT = loadFont('normal', { weights: ['400', '700'] }).fontFamily;

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
const seq = (f0: number, vals: number[]): Table => vals.map((v, i) => [f0 + i, v] as const);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const [x, y] = [hex(a), hex(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * clamp01(t))).join(',')})`;
};

const W = 1916;
const H = 1078;
const LINE = '#e1dbdf';
const GUIDE = '#ece7e8';
const TEXT = '#f4eaed';
const CORAL = '#fc99a0';
const WHITE = '#fffbfc';

// ---------------------------------------------------------------- the bar in world units (shot B scale, origin = bar top-left)

const BW = 1183;
const BH = 165;
const PLUS = { x: 89.5, y: 84, size: 61, arm: 3.8 };
const MARK = { x: 108.4, y: 84, w: 58.6, h: 59.2 };
const CHIPS = [91, 256, 420, 585]; // pill left edges; pill 150 x 42, y -65..-23
const SEND = { x: 1094.5, y: 82.5, d: 66 };
const TEXT_X = 163;
const BASE = 96; // text baseline below the bar top
const SIZE = 44.6;

// ---------------------------------------------------------------- the camera: screen = world * z + (tx, ty)

/** Shot A: the bar's bottom edge on screen, f201-f297 (cubic-bezier pan down, rms 1.16 px), before f201 extrapolated. */
const BL_A = seq(201, [0.0, 33.7, 64.4, 92.5, 118.5, 142.5, 165.0, 186.2, 206.2, 225.0, 243.0, 260.0, 276.3, 291.7, 306.6, 321.0, 334.5,
  347.7, 360.4, 372.5, 384.2, 395.5, 406.4, 416.9, 427.0, 436.8, 446.3, 455.5, 464.3, 472.9, 481.3, 489.3, 497.1, 504.5, 511.9, 518.9,
  525.8, 532.4, 538.8, 545.1, 551.1, 557.0, 562.6, 568.1, 573.3, 578.5, 583.4, 588.2, 592.8, 597.4, 601.8, 606.0, 610.2, 614.1, 617.9,
  621.6, 625.2, 628.6, 631.9, 635.2, 638.2, 641.2, 644.0, 646.7, 649.3, 651.9, 654.4, 656.7, 658.9, 661.1, 663.1, 665.1, 666.9, 668.7,
  670.4, 671.9, 673.4, 674.8, 676.1, 677.4, 678.5, 679.6, 680.6, 681.6, 682.5, 683.2, 683.9, 684.6, 685.2, 685.7, 686.1, 686.4, 686.7,
  687.0, 687.1, 687.3, 687.3]);
const BL_PRE: Table = [[197, -175], [198, -128], [199, -84], [200, -41], [201, 0]];
/** Shot A: bar left edge on screen (still until f240, then an accelerating pan left). */
const L_A: Table = [[240, 537.3], [242, 536.8], [244, 536.4], [246, 535.6], [248, 534.6], [250, 533.5], [252, 531.7], [254, 530],
  [256, 528], [258, 526], [260, 523], [262, 520], [264, 516], [266, 512], [268, 508], [270, 503], [272, 497], [274, 491], [276, 484],
  [278, 477], [280, 468], [282, 459], [284, 448], [286, 436], [288, 422], [290, 405], [291, 396], [292, 385], [293, 373], [294, 360],
  [295, 343], [296, 322], [297, 280]];
/** Shot B: bar left edge (ease-out, then a whip). */
const L_B = seq(298, [510, 490, 480, 472, 465, 459, 454, 449, 444, 440, 437, 433, 430, 427, 424, 421, 418, 416, 413, 411, 409, 407, 405,
  403, 401, 399, 397, 396, 394, 393, 391, 390, 388, 387, 386, 385, 383, 382, 381, 380, 379, 379, 378, 377, 375, 374, 372, 371, 369, 367,
  364, 361, 358, 355, 351, 347, 342, 337, 330, 323, 314, 303, 288, 256]);
/** Shot C: send button centre x, then the fall (content moves down, ease-in). */
const BTN_X: Table = [[362, 1345.5], [363, 1319.5], [364, 1298], [365, 1279], [366, 1262.5], [367, 1246.5], [368, 1232.5], [369, 1219.5],
  [370, 1207.5], [371, 1196.5], [372, 1186.5], [373, 1177], [374, 1168.5], [375, 1160], [376, 1152.5], [377, 1145.5], [378, 1138.5],
  [379, 1132.5], [380, 1127.5], [381, 1122], [382, 1117], [383, 1112.5], [384, 1108.5], [385, 1105.5], [390, 1097], [395, 1089.5],
  [398, 1086.5], [400, 1084]];
const DROP_C: Table = [[390, 0], [391, 1], [392, 2], [393, 3], [394, 5], [395, 6], [396, 8], [397, 11], [398, 14], [399, 17], [400, 21],
  [401, 25], [402, 30], [403, 35], [404, 40], [405, 46], [406, 53], [407, 61], [408, 69], [409, 78], [410, 88], [411, 97], [412, 111],
  [413, 124], [414, 138], [415, 153], [416, 171], [417, 189], [418, 212], [419, 237], [420, 267], [421, 304], [422, 352], [423, 455]];

const camera = (f: number) => {
  if (f < 298) {
    const z = 1.808;
    const bl = f < 201 ? tbl(f, BL_PRE) : tbl(f, BL_A);
    return { z, tx: tbl(f, L_A), ty: bl - BH * z };
  }
  if (f < 362) return { z: 1, tx: tbl(f, L_B), ty: 456 };
  const z = 2.115;
  return { z, tx: tbl(f, BTN_X) - SEND.x * z, ty: 536 + tbl(f, DROP_C) - SEND.y * z };
};

// ---------------------------------------------------------------- shot A's guide lines (screen units)

const BOTTOM_LEFT: Table = [[201, 1707], [202, 1562], [203, 1432], [204, 1312], [205, 1202], [206, 1099], [207, 1001], [208, 910],
  [209, 823], [210, 740], [211, 660], [221, 660], [222, 624], [223, 582], [224, 532], [225, 506], [226, 469], [227, 434], [228, 401],
  [229, 369], [230, 338], [231, 308], [232, 280], [233, 252], [234, 227], [235, 201], [236, 177], [237, 154], [238, 132], [239, 111],
  [240, 91], [241, 71], [242, 53], [243, 35], [244, 18], [245, 2], [246, 0]];
const BOTTOM_PIECE: Table = [[257, 607], [258, 557], [259, 509], [260, 464], [261, 421], [262, 381], [263, 343], [264, 306], [265, 271],
  [266, 238], [267, 206], [268, 176], [269, 147], [270, 120], [271, 95], [272, 70], [273, 47], [274, 24]];
const TOP_LEFT: Table = [[230, 0], [231, 2], [232, 62], [233, 136], [234, 226], [235, 334], [236, 460], [237, 537]];
const VERT_BOTTOM: Table = [[211, 343], [212, 408], [213, 469], [214, 527], [215, 583], [216, 635], [217, 686], [218, 734], [219, 780],
  [220, 824], [221, 866], [222, 907], [223, 945], [224, 983], [225, 1019], [226, 1053], [227, 1078]];
const VERT_TOP_LATE: Table = [[240, 221], [241, 312], [242, 388], [243, 393], [244, 396], [245, 407], [246, 409], [247, 417], [248, 419],
  [249, 426], [250, 433], [252, 440]];

const Guide: React.FC<{ x1: number; y1: number; x2: number; y2: number; a?: number }> = ({ x1, y1, x2, y2, a = 1 }) => (
  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={GUIDE} strokeWidth={2} opacity={a} />
);

const Guides: React.FC<{ f: number; bl: number }> = ({ f, bl }) => {
  if (f < 201 || f > 275) return null;
  const top = bl - BH * 1.808;
  const L = tbl(f, L_A);
  return (
    <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, filter: 'drop-shadow(0 0 6px rgba(255,240,240,0.45))' }}>
      {/* the bottom edge drawing on from the right, then running out past the bar to the left edge */}
      {f < 257 && <Guide x1={tbl(f, BOTTOM_LEFT)} y1={bl} x2={W} y2={bl} />}
      {f >= 257 && f < 275 && <Guide x1={0} y1={bl} x2={tbl(f, BOTTOM_PIECE)} y2={bl} a={tbl(f, [[257, 1], [274, 0.4]])} />}
      {/* the top guide, full width, then retracting to the bar's left end */}
      {f >= 215 && f < 238 && <Guide x1={f < 230 ? 0 : tbl(f, TOP_LEFT)} y1={top} x2={W} y2={top} />}
      {/* the vertical guide at the bar's left end */}
      {f >= 211 && f < 252 && (
        <Guide
          x1={L}
          x2={L}
          y1={f < 215 ? tbl(f, [[211, 189], [213, 185], [214, 135]]) : f < 240 ? top : tbl(f, VERT_TOP_LATE)}
          y2={tbl(f, VERT_BOTTOM)}
          a={f >= 250 ? tbl(f, [[250, 1], [252, 0]]) : 1}
        />
      )}
    </svg>
  );
};

// ---------------------------------------------------------------- pieces of the bar

/** Our mark in the maker's slot: a blocky K (a stem with a rounded foot and an open chevron). */
export const Mark: React.FC<{ letter?: string; size?: number; color?: string }> = ({ letter, size = MARK.w, color = WHITE }) =>
  letter ? (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 700, fontSize: size * 1.12, lineHeight: 1, color }}>
      {letter}
    </div>
  ) : (
    <svg width={size} height={size} viewBox="0 0 59 59" style={{ display: 'block' }}>
      <path d="M0 0 H16 V59 H6 Q0 59 0 53 Z M19 25 L44 0 H59 L35 29.5 L59 59 H44 L19 34 Z" fill={color} />
    </svg>
  );

/** The chips' glyphs: shapes for model chips (the reel), or icons that say what the chip is. */
export type ChipIcon = 'hex' | 'tri' | 'diamond' | 'dots' | 'lines' | 'check' | 'flag' | 'mail';
const DEFAULT_ICONS: ChipIcon[] = ['hex', 'tri', 'diamond', 'dots'];

export const ChipGlyph: React.FC<{ icon: ChipIcon }> = ({ icon }) => {
  const st = { fill: 'none', stroke: TEXT, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg width={26} height={26} viewBox="0 0 26 26" style={{ display: 'block' }}>
      {icon === 'hex' && <path d="M13 3 L22 8 V18 L13 23 L4 18 V8 Z" {...st} />}
      {icon === 'tri' && <path d="M13 3 L23 21 H3 Z" fill={TEXT} />}
      {icon === 'diamond' && <path d="M13 3 L23 13 L13 23 L3 13 Z" {...st} />}
      {icon === 'dots' && [6, 13, 20].map((x) => <circle key={x} cx={x} cy={13} r={1.8} fill={TEXT} />)}
      {icon === 'lines' && <path d="M5 7 H21 M5 13 H21 M5 19 H15" {...st} />}
      {icon === 'check' && <><rect x="4" y="4" width="18" height="18" rx="4" {...st} /><path d="M8.5 13 L12 16.5 L18 9.5" {...st} /></>}
      {icon === 'flag' && <path d="M6 23 V4 M6 5 H19 L16 9.5 L19 14 H6" {...st} />}
      {icon === 'mail' && <><rect x="3" y="6" width="20" height="14" rx="2" {...st} /><path d="M3 7 L13 14 L23 7" {...st} /></>}
    </svg>
  );
};

const CHIP_START = [220, 230, 240, 250];

const Chip: React.FC<{ f: number; i: number; name: string; icon: ChipIcon }> = ({ f, i, name, icon }) => {
  const f0 = CHIP_START[i];
  if (f < f0) return null;
  const lift = 55.3 * 0.89 ** (f - f0); // drops 55 px (100 at shot A's scale), exponential ease-out 0.89/frame
  const fill = clamp01((f - f0 - 5) / 36); // the pill fades in after its content
  return (
    <div
      style={{
        position: 'absolute',
        left: CHIPS[i],
        top: -65 - lift,
        width: 150,
        height: 42,
        borderRadius: 21,
        boxSizing: 'border-box',
        background: `rgba(255,255,255,${0.19 * fill})`,
        border: `1px solid rgba(255,255,255,${0.6 * fill})`,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 13,
        gap: 12,
      }}
    >
      <ChipGlyph icon={icon} />
      <span style={{ fontFamily: FONT, fontSize: name.length > 7 ? 18.5 : 21, color: TEXT, lineHeight: '42px', whiteSpace: 'nowrap' }}>{name}</span>
    </div>
  );
};

/** The plus spins in: half-diagonal R per frame (rest 54.5 at shot A's scale) and rotation (deg). */
const PLUS_R: Table = [[239, 2], [240, 6], [241, 9.3], [242, 13.4], [243, 19.4], [244, 23.9], [245, 28.3], [246, 31.6], [247, 34.2],
  [248, 36.4], [249, 38.4], [250, 40.3], [251, 41.7], [252, 43.2], [253, 44.4], [254, 45.3], [255, 46.4], [256, 47.4], [257, 48.2],
  [258, 49.0], [259, 49.4], [260, 50.2], [262, 51.2], [265, 52.4], [270, 53.5], [275, 54.5]];
const PLUS_ROT: Table = [[240, 90], [241, 82.3], [242, 73.3], [243, 63.4], [244, 55.1], [245, 47.8], [246, 41.8], [247, 36.8], [248, 32.5],
  [249, 28.7], [250, 25.5], [251, 22.6], [252, 20.1], [253, 17.8], [254, 15.7], [255, 14.0], [256, 12.3], [257, 10.9], [258, 9.5],
  [259, 8.3], [260, 7.2], [262, 5.4], [265, 3.2], [270, 0.9], [275, 0]];

const Plus: React.FC<{ f: number }> = ({ f }) => {
  if (f < 239) return null;
  const s = tbl(f, PLUS_R) / 54.5;
  return (
    <div
      style={{
        position: 'absolute',
        left: PLUS.x - PLUS.size / 2,
        top: PLUS.y - PLUS.size / 2,
        width: PLUS.size,
        height: PLUS.size,
        transform: `rotate(${tbl(f, PLUS_ROT)}deg) scale(${s})`,
        filter: f >= 243 ? 'drop-shadow(0 0 9px rgba(255,250,250,0.35))' : undefined,
      }}
    >
      <div style={{ position: 'absolute', left: (PLUS.size - PLUS.arm) / 2, top: 0, width: PLUS.arm, height: PLUS.size, background: WHITE }} />
      <div style={{ position: 'absolute', top: (PLUS.size - PLUS.arm) / 2, left: 0, height: PLUS.arm, width: PLUS.size, background: WHITE }} />
    </div>
  );
};

/** The prompt: frame each character lands (index for index with the reference's 29 characters). */
const AT = [260, 281, 281, 286, 289, 292, 295, 295, 297, 298, 298, 299, 300, 301, 301, 301, 302, 304, 304, 305, 308, 308, 311, 314, 318,
  323, 329, 339, 355];

/** The reference's landing frames stretched to a prompt of n characters. */
const stretch = (n: number) => Array.from({ length: n }, (_, i) => AT[Math.min(AT.length - 1, Math.round((i * (AT.length - 1)) / Math.max(1, n - 1)))]);

const Prompt: React.FC<{ f: number; text: string }> = ({ f, text }) => {
  const at = text.length === AT.length ? AT : stretch(text.length);
  const n = at.filter((a) => a <= f).length;
  if (!n) return null;
  return (
    <div style={{ position: 'absolute', left: TEXT_X, top: BASE - SIZE * 0.98, whiteSpace: 'pre', fontFamily: FONT, fontSize: SIZE, lineHeight: `${SIZE * 1.2}px` }}>
      {text.slice(0, n).split('').map((ch, i) => {
        const age = f - at[i];
        // the first letter blurs in (sigma 8 at shot A's scale, sharp in ~20 frames); the rest pop coral and turn white in ~12
        const blur = i === 0 ? Math.max(0, 4.4 * (1 - age / 20)) : 0;
        const c = i === 0 ? mix(TEXT, CORAL, tbl(age, [[0, 0], [8, 0], [16, 0.8], [22, 0.6], [28, 0]])) : mix(CORAL, TEXT, (age - 2) / 12);
        const a = i === 7 && age < 2 ? 0.5 : 1;
        return (
          <span key={i} style={{ color: c, opacity: a, filter: blur > 0.2 ? `blur(${blur}px)` : undefined }}>
            {ch}
          </span>
        );
      })}
    </div>
  );
};

/** The send button, with the click: an orange bloom, a pinch and squash (bbox per frame at shot C's scale, rest 139). */
const SQUASH: Table = [[389, 1], [390, 1], [392, 0.92], [394, 0.82], [396, 0.73], [397, 0.78], [398, 0.88], [399, 0.99], [400, 1.04],
  [401, 1.04], [402, 1]];
const STRETCH: Table = [[389, 1], [390, 1.04], [392, 1.12], [394, 1.1], [396, 0.88], [397, 0.73], [398, 0.63], [399, 0.68], [400, 0.76],
  [401, 0.86], [402, 1]];
const Send: React.FC<{ f: number }> = ({ f }) => {
  const peach = tbl(f, [[383, 0], [386, 0.5], [388, 1], [389, 0.6], [390, 0], [395, 0], [396, 0.8], [398, 0.2], [400, 0]]);
  const glyph = tbl(f, [[386, 1], [387, 0.6], [388, 0.5], [390, 0.8], [392, 1]]);
  const halo = tbl(f, [[384, 0], [386, 0.6], [388, 1], [390, 0.9], [392, 0.6], [395, 0.15], [397, 0]]);
  const bloom = tbl(f, [[396, 0], [398, 0.8], [402, 0.6], [416, 0.4], [417, 0]]);
  return (
    <>
      {halo > 0 && (
        <div
          style={{
            position: 'absolute',
            left: SEND.x - 90,
            top: SEND.y - 90,
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(248,187,145,0.95) 0%, rgba(180,118,76,0.85) 38%, rgba(157,111,86,0.5) 58%, rgba(78,44,36,0) 100%)',
            opacity: halo,
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          left: SEND.x - SEND.d / 2,
          top: SEND.y - SEND.d / 2,
          width: SEND.d,
          height: SEND.d,
          borderRadius: '50%',
          background: mix('#f3e9ee', '#f8bb91', peach),
          transform: `scale(${tbl(f, SQUASH)}, ${tbl(f, STRETCH)})`,
          boxShadow: bloom > 0 ? `0 0 ${10 * bloom}px ${4 * bloom}px rgba(255,255,255,${0.35 * bloom})` : undefined,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width={20} height={28} viewBox="0 0 20 28" style={{ opacity: glyph }}>
          <path d="M10 27 V3 M2 10 L10 2 L18 10" fill="none" stroke="#1b1217" strokeWidth={4} strokeLinecap="butt" />
        </svg>
      </div>
    </>
  );
};

// ---------------------------------------------------------------- the cursor (screen units in B, relative to the button in C)

const CURSOR_B: ReadonlyArray<readonly [number, number, number]> = [[327, 1051, 1063], [328, 1105, 1028], [329, 1146, 1000], [330, 1179, 975],
  [331, 1207, 952], [332, 1232, 932], [333, 1254, 914], [334, 1273, 895], [335, 1290, 878], [336, 1306, 863], [337, 1320, 847],
  [338, 1333, 833], [339, 1345, 819], [340, 1356, 806], [341, 1365, 793], [342, 1374, 781], [343, 1382, 770], [344, 1389, 758],
  [345, 1395, 747], [346, 1400, 737], [347, 1405, 728], [348, 1408, 717], [349, 1411, 708], [350, 1414, 700], [351, 1415, 691],
  [352, 1416, 683], [353, 1416, 675], [354, 1414, 667], [355, 1412, 660], [356, 1409, 653], [357, 1405, 647], [358, 1399, 641],
  [359, 1390, 634], [360, 1377, 628], [361, 1347, 623]];
const CURSOR_C: ReadonlyArray<readonly [number, number, number]> = [[362, -6, 167], [363, -2, 156], [364, 1, 146], [365, 4, 136],
  [366, 6, 127], [367, 10, 118], [368, 12, 110], [369, 14, 102], [370, 16, 95], [371, 18, 88], [372, 19, 82], [373, 20, 76], [374, 22, 70],
  [375, 23, 66], [376, 24, 60], [377, 24, 55], [378, 26, 51], [379, 27, 48], [380, 26, 44], [381, 28, 42], [382, 29, 40], [383, 30, 38],
  [384, 31, 37], [385, 31, 36]];

const Pointer: React.FC<{ x: number; y: number; s: number }> = ({ x, y, s }) => (
  <svg
    width={39}
    height={66}
    viewBox="-3 -3 42 70"
    style={{ position: 'absolute', left: x - 3, top: y - 3, transform: `scale(${s})`, transformOrigin: '3px 3px' }}
  >
    <path d="M0 0 L0 54 L13 42 L22 63 L30 59 L21 39 L37 39 Z" fill="#0a0a0a" stroke="#ffffff" strokeWidth={3} strokeLinejoin="round" />
  </svg>
);

const Cursor: React.FC<{ f: number; cam: ReturnType<typeof camera> }> = ({ f, cam }) => {
  if (f < 327) return null;
  if (f < 362) {
    const xs: Table = CURSOR_B.map(([k, x]) => [k, x]);
    const ys: Table = CURSOR_B.map(([k, , y]) => [k, y]);
    return <Pointer x={tbl(f, xs)} y={tbl(f, ys)} s={1} />;
  }
  const xs: Table = CURSOR_C.map(([k, x]) => [k, x]);
  const ys: Table = CURSOR_C.map(([k, , y]) => [k, y]);
  const bx = SEND.x * cam.z + cam.tx;
  const by = SEND.y * cam.z + cam.ty;
  return <Pointer x={bx + tbl(f, xs)} y={by + tbl(f, ys)} s={1.97} />;
};

// ---------------------------------------------------------------- the shot

/** The glow under each framing: strength (and which side it leans), from the spec's bottom-corner samples. */
const glowFor = (f: number) => {
  if (f < 298) return { a: tbl(f, [[197, 0.72], [200, 0.6], [210, 0.48], [230, 0.36], [255, 0.2], [297, 0.17]]), flip: false };
  if (f < 362) return { a: tbl(f, [[298, 0.3], [361, 0.55]]), flip: true };
  return { a: tbl(f, [[362, 0.33], [385, 0.4], [394, 0.5], [397, 0.6], [410, 0.45], [423, 0.3]]), flip: true };
};

export interface BarShotProps {
  f: number;
  palette: RisePalette;
  prompt: string;
  chips: string[];
  /** the chips' glyphs (shapes by default) */
  chipIcons?: ChipIcon[];
  /** the mark in the bar's leading slot: a letter, or our K when empty */
  mark?: string;
}

export const BarShot: React.FC<BarShotProps> = ({ f, palette, prompt, chips, chipIcons = DEFAULT_ICONS, mark }) => {
  const cam = camera(f);
  const g = glowFor(f);
  const fall = f >= 362 ? tbl(f, DROP_C) : 0;
  const flash = tbl(f, [[393, 0], [395, 0.03], [396, 0.05], [397, 0.1], [398, 0.1], [400, 0.07], [405, 0.04], [411, 0]]);
  const markIn = f >= 205 && f < 240;
  const markScale = 1 - 0.32 * 0.88 ** Math.max(0, f - 208);
  const markA = f < 226 ? 1 : 1 - 0.055 * (f - 226);
  const markDx = tbl(f, [[222, 0], [225, 2.5], [226, 4], [227, 5], [228, 7.5], [229, 9.5], [230, 12.5], [236, 47], [237, 56], [238, 68], [239, 85]]) / 1.808;
  const markBlur = f < 216 ? tbl(f, [[205, 4], [212, 3.3], [216, 1]]) : tbl(f, [[226, 0.8], [232, 2.2], [238, 3.3]]);
  const outlineA = f < 298 ? tbl(f, [[211, 0], [215, 1]]) : 1;
  return (
    <AbsoluteFill style={{ background: RISE_PALETTES[palette][0], overflow: 'hidden' }}>
      {/* the glow, riding the camera's fall in C */}
      <AbsoluteFill style={{ opacity: g.a, transform: `translateY(${fall}px) scaleX(${g.flip ? -1 : 1})` }}>
        <div style={{ width: 1920, height: 1080, transform: `scale(${W / 1920}, ${H / 1080})`, transformOrigin: '0 0' }}>
          <RiseGlow {...riseGlowDefaults} palette={palette} ring={0} height={1.25} />
        </div>
      </AbsoluteFill>

      {f < 298 && <Guides f={f} bl={cam.ty + BH * cam.z} />}

      {/* the bar and everything in it, framed by the camera */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: BW, height: BH, transform: `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.z})`, transformOrigin: '0 0' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: BW,
            height: BH,
            borderRadius: BH / 2,
            boxSizing: 'border-box',
            border: `${f < 298 ? 1.1 : f < 362 ? 1 : 0.95}px solid ${LINE}`,
            opacity: outlineA,
          }}
        />
        {[0, 1, 2, 3].map((i) => <Chip key={i} f={f} i={i} name={chips[i] ?? ''} icon={chipIcons[i] ?? 'dots'} />)}
        {markIn && (
          <div
            style={{
              position: 'absolute',
              left: MARK.x - MARK.w / 2 + markDx,
              top: MARK.y - MARK.h / 2,
              transform: `scale(${markScale})`,
              opacity: clamp01(markA),
              filter: `blur(${markBlur / 1.808}px)`,
            }}
          >
            <Mark letter={mark} />
          </div>
        )}
        <Plus f={f} />
        <Prompt f={f} text={prompt} />
        {f >= 298 && <Send f={f} />}
      </div>

      <Cursor f={f} cam={cam} />
      {flash > 0 && <AbsoluteFill style={{ background: '#ffd8c8', opacity: flash, mixBlendMode: 'screen' }} />}
    </AbsoluteFill>
  );
};
