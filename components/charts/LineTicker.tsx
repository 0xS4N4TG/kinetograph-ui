// Line ticker. A claim, then the live number that proves it: a headline settles out of a push over a climbing line, the
// scene HARD-CUTS, and the line is now a running ticker -- a symbol card counting up, a dot riding the leading edge, a
// "now" rule and pill that follow it, and a card that flashes when somebody's install lands on the curve.
//
// Everything is authored in the reference's 960x540 pixels and doubled by one root scale. The curves are tables
// measured off the reference's frames (a hand-drawn series would not have its climb); `series` replaces the second.
//
// Principles: staging (one subject a beat: the claim, then the number), slow in/slow out (the push decays by a fixed
// share per frame, ~9% of what is left), follow through (the headline takes 0.42 of the line's push, so the two layers
// read as one camera at two depths), anticipation + exit (a whip to the left over the last 24 frames that the cut
// finishes), secondary action (the flash of the card, the marker turning from accent to bone as the camera carries it
// away).

import React from 'react';
import { z } from 'zod';
import { random } from 'remotion';
import { Ellipse, Layer, Path, Rect, Text } from '@kinetographdev/core';
import { clamp01, hex, lerp, seg, stroke, useFonts } from './lib.js';

export const LINE_FPS = 60;

export const lineSchema = z.object({
  headline: z.string().describe('The claim that opens the shot, over the climbing line.'),
  symbol: z.string().describe('Name on the ticker card (a wordmark, short).'),
  domain: z.string().describe('Small line under the name on the ticker card.'),
  from: z.number().describe('The number the ticker starts on.'),
  to: z.number().describe('The number it has counted to when the shot ends.'),
  deltaFrom: z.number().describe('Percent change shown under the number at the start.'),
  deltaTo: z.number().describe('Percent change at the end.'),
  deltaNote: z.string().describe('Words after the percent, e.g. "24h".'),
  person: z.string().describe('Name in the card that lands on the curve (the install).'),
  item: z.string().describe('What they installed, second row of that card.'),
  accent: hex.describe('Gain colour: line, dot, pill. This is the design here, not a theme token.'),
  ground: hex.describe('Background.'),
  holdSeconds: z.number().min(0).max(8).describe('Extra seconds to hold on the last frame (the reference ends on it).'),
  series: z.array(z.number()).optional()
    .describe('Your own curve for the ticker half: y of the line (pixels in a 960x540 frame, larger is lower) every 4 px of world x. Leave out for the reference curve.'),
});
export type LineProps = z.infer<typeof lineSchema>;

export const lineDefaults: LineProps = {
  headline: 'from the demos they ship',
  symbol: 'KINO',
  domain: 'kino.dev',
  from: 12180,
  to: 12540,
  deltaFrom: 1.82,
  deltaTo: 2.15,
  deltaNote: '24h',
  person: 'Maya',
  item: 'line-ticker',
  accent: '#0bb143',
  ground: '#0f0d1a',
  holdSeconds: 0,
  series: undefined,
};

const CUT = 62; // frame (0-based) of the hard cut: reference frame 63
const END = 154;
export const lineDuration = (p: LineProps) => END + Math.round(p.holdSeconds * LINE_FPS);

const HEAD_SIZE = 46.5;
const HEAD_TOP = 235;
const NUM_SIZE = 28;

// ---------------------------------------------------------------------------------------------------------------
// Measured tables (reference pixels), see the header.
export const HEAD_X0 = 20; export const HEAD_STEP = 4;
const HEAD_Y = [541.5,541.0,540.0,539.5,538.0,536.0,533.0,530.0,529.5,525.5,513.5,493.5,477.5,464.0,459.5,457.0,455.0,454.5,454.5,454.5,455.5,457.0,459.0,461.0,464.5,467.0,469.0,473.0,475.0,478.0,481.0,484.0,486.5,489.0,491.0,492.5,494.5,495.0,495.5,495.5,498.5,501.5,473.5,472.5,451.5,413.5,382.5,371.0,371.0,370.5,370.5,371.0,372.0,373.0,374.5,376.0,377.5,379.0,381.0,382.5,383.0,383.5,384.5,384.5,383.5,383.0,381.0,379.5,377.5,376.5,376.0,375.5,375.5,376.5,377.0,378.5,379.5,381.0,383.0,384.5,386.5,387.0,388.5,388.5,389.0,388.5,388.5,387.0,385.0,382.5,382.5,384.5,377.5,347.5,314.5,295.5,292.5,292.5,291.5,289.5,255.5,211.5,195.5,193.0,191.5,191.5,191.5,192.5,193.5,195.0,197.5,200.5,203.0,206.0,209.5,213.0,215.5,219.5,223.0,226.0,229.0,233.0,239.0,241.0,244.5,245.5,246.5,247.5,247.5,247.0,245.5,244.0,242.0,240.5,238.5,237.0,235.0,234.0,232.5,232.5,231.0,230.5,229.0,228.0];
export const RUN_X0 = 34; export const RUN_STEP = 4;
const RUN_Y = [443.5,441.4,437.8,434.2,431.5,430.2,429.7,429.0,428.0,426.9,425.5,423.8,422.0,420.1,417.9,414.9,411.3,407.1,402.1,396.2,389.6,383.0,377.1,372.0,367.7,364.0,360.8,358.2,356.4,355.5,355.4,356.1,357.4,359.8,362.5,365.1,367.8,370.8,373.7,376.9,380.4,383.8,387.1,390.5,394.1,397.4,400.3,403.2,405.9,408.3,410.2,411.7,412.8,413.5,413.9,413.7,413.0,411.9,410.4,408.4,405.6,401.8,397.8,393.9,387.8,377.9,364.9,350.0,335.2,322.4,312.2,305.6,301.7,298.6,296.0,294.2,293.1,292.4,292.1,292.0,292.0,292.0,292.3,293.0,294.0,295.2,296.7,298.4,300.1,302.0,303.8,305.4,307.0,308.4,309.6,310.8,311.7,312.0,312.0,311.8,311.2,310.4,309.5,308.6,307.8,307.0,306.4,306.1,306.0,306.2,306.6,307.2,308.3,309.8,311.4,313.0,314.7,316.5,318.4,320.1,321.5,322.8,323.9,324.8,325.5,325.9,325.9,325.6,324.9,324.0,323.0,321.8,320.3,318.3,315.7,312.6,308.8,304.6,300.3,295.0,287.8,279.2,269.8,260.1,252.0,246.5,242.6,239.5,236.8,234.6,232.9,231.0,229.2,227.1,224.3,220.7,216.6,212.3,207.0,199.2,189.3,178.7,168.6,160.0,155.2,152.4,145.9,137.6,133.8,134.2,135.4,135.7,135.2,135.0,135.3,136.4,138.1,140.1,142.6,145.4,148.5,151.8,155.2,158.9,162.9,167.0,170.8,174.2,178.0,182.0,185.6,188.9,191.8,194.5,196.8,198.7,199.9,200.8,201.7,201.8,201.4,200.9];
// [ref frame n, camera shift x, camera shift y, tip world x]
const RUN_CAM: [number, number, number, number][] = [[63, 0.5, -13.5, 431.0], [65, 8.7, -12.7, 584.0], [67, 25.0, -10.7, 605.3], [69, 34.3, -8.8, 626.0], [71, 42.3, -6.5, 643.3], [73, 51.3, -3.5, 658.0], [77, 59.7, -0.2, 667.3], [79, 67.8, 3.1, 673.0], [81, 73.7, 5.1, 675.7], [83, 79.3, 7.2, 678.0], [85, 86.4, 9.7, 681.3], [89, 93.2, 12.8, 685.0], [91, 99.8, 15.7, 688.3], [93, 104.7, 18.1, 692.7], [95, 109.6, 20.3, 696.7], [97, 114.4, 22.4, 701.3], [99, 119.3, 24.6, 702.7], [101, 124.1, 26.5, 705.3], [103, 128.9, 28.6, 708.7], [105, 134.1, 30.7, 713.7], [107, 139.1, 33.1, 718.3], [109, 144.0, 35.6, 723.3], [111, 148.2, 38.1, 728.3], [113, 152.7, 40.1, 733.7], [115, 157.3, 41.9, 738.0], [117, 162.3, 43.6, 743.0], [119, 166.9, 45.8, 747.7], [121, 171.6, 48.1, 752.7], [123, 177.5, 51.4, 759.7], [127, 183.3, 54.5, 766.3], [129, 189.5, 57.4, 772.7], [131, 194.3, 59.7, 777.7], [133, 199.2, 62.2, 783.0], [135, 206.9, 66.8, 792.7], [141, 214.5, 71.1, 803.7], [143, 222.1, 75.9, 815.7], [145, 226.7, 79.2, 824.3], [147, 231.4, 82.9, 831.3], [149, 236.0, 86.6, 835.3], [151, 240.9, 90.8, 837.0], [153, 243.2, 92.9, 837.0]];


// Tip of the head line (world x), by 0-based frame: it is revealed along its length, fast then slow then fast.
const HEAD_TIP: [number, number][] = [[0, 389], [9, 420], [19, 475], [29, 498], [39, 511], [49, 527], [61, 591]];

// ---------------------------------------------------------------------------------------------------------------

const lin = (f: number, k: [number, number][]) => {
  if (f <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) {
    if (f <= k[i][0]) return lerp(k[i - 1][1], k[i][1], (f - k[i - 1][0]) / (k[i][0] - k[i - 1][0]));
  }
  return k[k.length - 1][1];
};
const tab = (n: number, col: 1 | 2 | 3) => {
  const r = RUN_CAM;
  if (n <= r[0][0]) return r[0][col];
  for (let i = 1; i < r.length; i++) {
    if (n <= r[i][0]) return lerp(r[i - 1][col], r[i][col], (n - r[i - 1][0]) / (r[i][0] - r[i - 1][0]));
  }
  return r[r.length - 1][col];
};
const sample = (ys: number[], x0: number, step: number, x: number) => {
  const t = (x - x0) / step;
  if (t <= 0) return ys[0] + (ys[Math.min(2, ys.length - 1)] - ys[0]) * (t / 2);
  const i = Math.floor(t);
  if (i >= ys.length - 1) return ys[ys.length - 1];
  return lerp(ys[i], ys[i + 1], t - i);
};

/** A smooth path (Catmull-Rom to cubic Bezier) through a polyline. */
function smooth(pts: [number, number][]): string {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(2)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(2)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(2)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}
/** The series drawn from `xFrom` up to world x `tip`. */
function pathTo(ys: number[], x0: number, step: number, tip: number, xFrom: number): { d: string; tipY: number } {
  const pts: [number, number][] = [];
  for (let x = Math.max(xFrom, x0 - 3 * step); x < tip - 0.5; x += step) pts.push([x, sample(ys, x0, step, x)]);
  const ty = sample(ys, x0, step, tip);
  pts.push([tip, ty]);
  return { d: smooth(pts), tipY: ty };
}

const FILL_REACH = 95;
/** The line with its glow and the green that decays below it: copies of the stroke, each shifted down and fainter, so
 *  the fill is as deep under a climb as under a flat (an area fill with a gradient would not be). */
const Trace: React.FC<{ id: string; d: string; color: string; width: number; opacity?: number }> = ({ id, d, color, width, opacity = 1 }) => {
  const copies: React.ReactNode[] = [];
  const step = 2;
  for (let k = step; k <= FILL_REACH; k += step) {
    const a = 0.08 * Math.pow(1 - k / FILL_REACH, 1.1);
    copies.push(<Path key={k} id={`${id}-f${k}`} d={d} y={k} stroke={stroke(color, step + 0.4)} opacity={a} />);
  }
  return (
    <Layer id={id} opacity={opacity}>
      {copies}
      <Path id={`${id}-halo`} d={d} stroke={stroke(color, width + 4, { cap: 'round', join: 'round' })} opacity={0.12} />
      <Path id={`${id}-line`} d={d} stroke={stroke(color, width, { cap: 'round', join: 'round' })} />
    </Layer>
  );
};

/** A small camera glyph: a rounded box and a lens wedge. Centred on (x, y). */
const Glyph: React.FC<{ id: string; x: number; y: number; s?: number; color: string }> = ({ id, x, y, s = 1, color }) => (
  <Layer id={id} x={x} y={y} scale={s}>
    <Rect id={`${id}-b`} x={-8} y={-5.5} width={11} height={11} radius={2.5} stroke={{ color, width: 2.4 }} />
    <Path id={`${id}-l`} d="M4 -2 L9 -5 L9 5 L4 2 Z" fill={color} />
  </Layer>
);

const mix = (a: [number, number, number], b: [number, number, number], t: number) =>
  `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`;

export const LineTicker: React.FC<{ f: number } & LineProps> = ({ f, ...p }) => {
  const fonts = useFonts();
  const g = Math.min(f, END - 1);
  const ac = p.accent;
  const runY = p.series ?? RUN_Y;

  const root = (children: React.ReactNode) => (
    <Layer id="root">
      <Rect id="ground" width={1920} height={1080} fill={p.ground} />
      <Layer id="scene" scale={2}>{children}</Layer>
    </Layer>
  );

  // ----------------------------------------------------------------------------------------------------------
  // The claim: a headline over a climbing line, one camera at two depths, then the whip out.
  if (f < CUT) {
    const e = Math.exp(-f / 10.5);
    const sLine = 1 + 0.189 * e;
    const sHead = 1 + 0.42 * 0.189 * e;
    const whip = -24 * Math.pow(clamp01((f - 37) / 24), 3.5);
    const tip = lin(f, HEAD_TIP);
    const { d } = pathTo(HEAD_Y, HEAD_X0, HEAD_STEP, tip, -120);
    const chars = Array.from(p.headline).map((_, i) => ({ opacity: clamp01((f - (-26 + 24 * random(`h${i}`))) / 8) }));
    return root(
      <>
        <Layer id="cam-line" motionBlur={{ samples: 8, shutter: 0.5 }}>
          <Layer id="line-eye" x={480 + whip} y={270} anchorX={480} anchorY={270} scale={sLine}>
            <Trace id="head" d={d} color={ac} width={4.5} opacity={0.45} />
          </Layer>
        </Layer>
        <Layer id="cam-head" motionBlur={{ samples: 8, shutter: 0.5 }}>
          <Layer id="head-eye" x={480 + whip} y={270} anchorX={480} anchorY={270} scale={sHead}>
            <Text id="headline" x={9.5} y={HEAD_TOP} font={fonts.sans} weight={600} size={HEAD_SIZE} color="#f6f6f8" maxWidth={960} align="center" chars={chars}>
              {p.headline}
            </Text>
          </Layer>
        </Layer>
      </>,
    );
  }

  // ----------------------------------------------------------------------------------------------------------
  // The ticker. n is the reference's 1-based frame.
  const n = g + 0.5; // the reference's content updates every other frame (30 fps in a 60 fps file): sit half a frame back
  const sx = tab(n, 1);
  const sy = tab(n, 2);
  const tipX = tab(n, 3);
  const { d, tipY } = pathTo(runY, RUN_X0, RUN_STEP, tipX, RUN_X0 - 80);
  const dotY = tipY + sy;

  // The number counts flat: 8 per 30 fps tick.
  const k = Math.max(0, Math.floor((n - 63) / 2));
  const ticks = Math.floor((END - 63) / 2);
  const v = p.from + ((p.to - p.from) * Math.min(k, ticks)) / ticks;
  const delta = lerp(p.deltaFrom, p.deltaTo, (v - p.from) / (p.to - p.from));
  const grouped = Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // The symbol card glides in and settles.
  const hx = lin(n, [[63, 114], [65, 89], [67, 83], [71, 76], [77, 68], [80, 68], [96, 63], [112, 61], [154, 61]]);
  const hy = lin(n, [[63, 42], [130, 42], [142, 44], [154, 54]]);

  // The "now" pill: right edge fixed at 899, growing leftwards, its text clipped inside.
  const pillW = n < 65 ? 0 : clamp01((n - 65) / 36) * 100 + 4;
  const pillY = dotY + 4;
  const nowLabel = `Now ${(v / 1000).toFixed(1)}k`;

  // The install: a card lands on the curve at the marker, which is a fixed world point.
  const markN = 99;
  const mWorldX = tab(markN, 3);
  const mWorldY = sample(runY, RUN_X0, RUN_STEP, mWorldX);
  const mx = mWorldX - sx;
  const my = mWorldY + sy;
  const cardIn = seg(n, 91, 93, (t) => t);
  const flash = 1 - seg(n, 95, 111, (t) => t);
  const content = seg(n, 95, 107, (t) => t);
  const markMix = seg(n, 99, 123, (t) => 1 - (1 - t) * (1 - t));
  const CW = 151, CH = 98;
  const cx0 = mx - 27, cy0 = my - 25 - CH;

  return root(
    <>
      {/* the rule: dashed, at the dot's height, across the frame */}
      <Path id="rule" d={`M0 ${dotY.toFixed(2)}H960`} stroke={stroke('#27343b', 1.2, { dash: [3, 4] })} opacity={seg(n, 75, 81, (t) => t)} />

      <Layer id="cam" motionBlur={{ samples: 4, shutter: 0 }}>
        <Layer id="world" x={-sx} y={sy}>
          <Trace id="run" d={d} color={ac} width={4.5} />
          <Ellipse id="dot" x={tipX - 13} y={tipY - 13} width={26} height={26} fill={ac} />
          {n >= markN ? (
            <Ellipse id="marker" x={mWorldX - 14} y={mWorldY - 14} width={28} height={28} fill={mix([11, 177, 67], [255, 255, 255], markMix)} />
          ) : null}
        </Layer>
      </Layer>

      {/* the pill */}
      {pillW > 0 ? (
        <Layer id="pill" x={899 - pillW} y={pillY - 14.5} clip={{ kind: 'path', d: `M0 0H${pillW}V29H0Z` } as never}>
          <Rect id="pill-bg" width={pillW} height={29} radius={8} fill={ac} />
          <Text id="pill-t" x={pillW - 10 - 200} y={5} font={fonts.sans} weight={500} size={16} color="#ffffff" maxWidth={200} align="right">
            {nowLabel}
          </Text>
        </Layer>
      ) : null}

      {/* the install card */}
      {cardIn > 0 ? (
        <Layer id="install" x={cx0} y={cy0} opacity={cardIn}>
          <Rect id="ic-bg1" width={CW} height={CH} radius={9} fill={mix([13, 10, 29], [47, 43, 91], flash)} stroke={{ color: '#1c1a30', width: 1 }} />
          <Rect id="ic-bg2" y={49} width={CW} height={CH - 49} fill={mix([20, 17, 34], [49, 45, 94], flash)} opacity={content > 0 ? 1 : 0} />
          <Layer id="ic-c" opacity={content}>
            <Ellipse id="ic-av" x={14} y={11} width={28} height={28} fill="#3a425c" />
            <Text id="ic-m" x={14} y={16} font={fonts.sans} weight={500} size={13} color="#e7e9f2" maxWidth={28} align="center">{p.person.slice(0, 1)}</Text>
            <Text id="ic-name" x={49} y={16} font={fonts.sans} weight={500} size={13} color="#f2f2f6">{p.person}</Text>
            <Ellipse id="ic-av2" x={14} y={60} width={28} height={28} fill="#f4f4f6" />
            <Glyph id="ic-ic" x={28} y={74} s={0.75} color="#15131f" />
            <Text id="ic-item" x={49} y={64} font={fonts.sans} weight={500} size={15} color={ac}>{p.item}</Text>
          </Layer>
        </Layer>
      ) : null}

      {/* the symbol card, in screen space */}
      <Layer id="symbol" x={hx} y={hy}>
        <Ellipse id="sy-av" x={-21} y={-21} width={42} height={42} fill="#f3f3f5" />
        <Glyph id="sy-ic" x={0} y={0} s={1.05} color="#17151f" />
        <Ellipse id="sy-bd" x={9} y={9} width={15} height={15} fill={p.ground} />
        <Ellipse id="sy-b" x={11} y={11} width={11} height={11} fill="#2f63f0" />
        <Text id="sy-name" x={31} y={-17} font={fonts.sans} weight={600} size={13} color="#ffffff">{p.symbol}</Text>
        <Rect id="sy-chip" x={31 + p.symbol.length * 8.6 + 8} y={-12} width={8} height={8} radius={2} fill="#3c3a49" />
        <Text id="sy-dom" x={31} y={4} font={fonts.sans} weight={400} size={11} color="#8b8a99">{p.domain}</Text>
        <Text id="sy-num" x={-19} y={30} font={fonts.sans} weight={500} size={NUM_SIZE} color="#f6f6f8">{grouped}</Text>
        <Path id="sy-tri" d="M-19 79.5 L-12 79.5 L-15.5 74.5 Z" fill={ac} />
        <Text id="sy-d" x={-7} y={68} font={fonts.sans} weight={500} size={14.5} color={ac}>{`${delta.toFixed(2)}%`}</Text>
        <Text id="sy-n" x={36} y={68} font={fonts.sans} weight={400} size={14.5} color="#8b8a99">{p.deltaNote}</Text>
      </Layer>
    </>,
  );
};
