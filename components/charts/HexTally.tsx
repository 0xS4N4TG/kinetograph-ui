// Hex tally.
// A metric card lands while a hex unit chart fills in under a running total. The card settles up onto its resting
// place; 150 hexagons of a 22x15 field light up one at a time in a measured scatter -- faster through the middle of the
// run, seeding the blob's rim before its interior -- and the headline counts flat, 217 a frame, landing a tenth of a
// second before the chart does. The legend under it never moves relative to the card: it is the still thing the two
// moving clocks are read against, and its percentages are counted off the totals, not typed.
//
// There is no camera in this scene (the reference's frame is locked and nothing but the card moves), so there is none
// here. Authored in the reference's 960x540 pixels, doubled by one root scale. `BLOB` is the measured table.
//
// Principles: slow in/slow out (the card settles with a share of the remaining distance each frame), timing (150
// pops of 3 frames each against one counting clock, the count finishing first), staging (the card is the only thing
// that moves, the legend is the still reference), secondary action (the percent pills follow the data).

import React from 'react';
import { z } from 'zod';
import { Ellipse, Layer, Path, Rect, Text } from '@kinetographdev/core';
import { clamp01, hex, lerp, stroke, useFonts } from './lib.js';

export const HEX_FPS = 60;

export const hexSchema = z.object({
  title: z.string().describe('Card heading.'),
  link: z.string().describe('Small link at the card top right.'),
  from: z.number().describe('The headline total at the first frame.'),
  total: z.number().describe('The headline total when the count lands.'),
  segments: z.array(z.object({
    label: z.string().describe('Name of the segment.'),
    value: z.number().describe('Its figure (the pill shows its share of the sum of all of them).'),
    trend: z.enum(['up', 'down']).describe('Arrow on the figure.'),
    color: hex.describe('Colour of its hexagons and its dot.'),
  })).length(4).describe('The four segments, in the legend order.'),
  holdSeconds: z.number().min(0).max(8).describe('Seconds to hold on the finished card after the last hexagon (the reference holds 0.75 s).'),
  settleSeconds: z.number().min(0.2).max(2).describe('How long the card takes to settle (the push decays by about 9% of what is left each frame; this scales it).'),
  background: hex.describe('Page.'),
});
export type HexProps = z.infer<typeof hexSchema>;

export const hexDefaults: HexProps = {
  title: 'Registry installs',
  link: 'View registry →',
  from: 3784,
  total: 9856,
  segments: [
    { label: 'Text & titles', value: 5914, trend: 'up', color: '#3070de' },
    { label: 'Device frames', value: 2103, trend: 'up', color: '#e0a15c' },
    { label: 'Backgrounds', value: 1117, trend: 'down', color: '#2b9c8d' },
    { label: 'Transitions', value: 723, trend: 'up', color: '#7b67d8' },
  ],
  holdSeconds: 0.75,
  settleSeconds: 1,
  background: '#faf9f5',
};

const END = 63; // reference frame of the last hexagon (fully lit)
export const hexDuration = (p: HexProps) => END + Math.round(p.holdSeconds * HEX_FPS);

// ---------------------------------------------------------------------------------------------------------------
// Measured table.
// [column, row, segment (0 text, 1 device, 2 background, 3 transition), reveal frame]
const BLOB: [number, number, number, number][] = [[9,1,0,17],[10,1,0,45],[11,1,0,33],[12,1,0,35],[7,2,0,9],[8,2,0,15],[9,2,0,21],[10,2,0,3],[11,2,0,45],[12,2,0,33],[13,2,0,57],[14,2,0,37],[5,3,0,39],[6,3,0,1],[7,3,0,47],[9,3,0,35],[10,3,0,55],[11,3,1,13],[12,3,3,23],[13,3,1,17],[14,3,0,51],[15,3,1,55],[5,4,0,33],[6,4,0,39],[7,4,0,55],[8,4,0,47],[9,4,0,5],[10,4,0,41],[11,4,1,13],[12,4,1,27],[13,4,1,41],[14,4,1,59],[15,4,0,47],[16,4,0,25],[17,4,1,13],[18,4,0,31],[4,5,0,13],[5,5,0,9],[6,5,0,1],[7,5,0,41],[8,5,2,33],[9,5,2,43],[10,5,2,31],[11,5,3,41],[12,5,1,5],[13,5,1,7],[14,5,1,53],[15,5,1,43],[16,5,0,47],[17,5,1,15],[18,5,3,57],[4,6,0,5],[5,6,0,39],[6,6,0,15],[7,6,0,5],[8,6,2,35],[9,6,1,33],[10,6,3,43],[11,6,3,41],[12,6,3,53],[13,6,1,17],[14,6,1,33],[15,6,1,39],[16,6,1,55],[17,6,3,15],[18,6,0,37],[3,7,0,33],[4,7,0,19],[5,7,0,31],[6,7,0,27],[7,7,2,11],[8,7,2,41],[9,7,1,53],[10,7,3,23],[11,7,3,45],[12,7,3,31],[13,7,1,17],[14,7,1,9],[15,7,1,25],[16,7,0,3],[17,7,0,41],[18,7,0,33],[5,8,0,29],[6,8,0,29],[7,8,2,23],[8,8,2,53],[9,8,2,49],[10,8,2,43],[11,8,3,19],[12,8,3,19],[13,8,2,15],[14,8,1,49],[15,8,1,43],[16,8,0,55],[17,8,1,25],[18,8,1,37],[19,8,1,39],[4,9,0,19],[5,9,0,39],[6,9,0,47],[7,9,0,29],[8,9,2,55],[9,9,2,17],[10,9,2,17],[11,9,3,33],[12,9,2,29],[13,9,1,47],[14,9,1,47],[15,9,0,31],[16,9,0,51],[17,9,0,15],[5,10,0,3],[6,10,0,17],[7,10,0,47],[8,10,0,47],[9,10,0,11],[10,10,0,1],[11,10,0,33],[12,10,2,51],[13,10,2,25],[14,10,0,59],[15,10,0,57],[16,10,0,5],[17,10,0,25],[4,11,0,49],[5,11,0,51],[6,11,0,49],[7,11,0,43],[8,11,0,39],[9,11,0,27],[10,11,0,17],[11,11,0,57],[12,11,0,41],[13,11,0,55],[14,11,1,43],[15,11,0,55],[16,11,0,19],[3,12,0,19],[8,12,0,35],[9,12,0,57],[10,12,0,7],[11,12,0,23],[12,12,0,27],[13,12,0,39],[14,12,1,53],[15,12,0,23],[8,13,0,29],[10,13,0,9],[11,13,0,49],[13,13,1,9]];


const PITCH = 13.7; // horizontal distance between hexagon centres
const ROW = 11.86; // row distance (pointy-top hexagons)
const X0 = 334.7;
const Y0 = 132.7;
const HEX_R = 7.75; // circumradius
const EMPTY = '#f1f2ed';

const hexPath = (cx: number, cy: number, r: number) => {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 90);
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
};

const ROUND_R = 1.6;
/** A hexagon with softened corners: lines between points pulled in by ROUND_R and joined by a quad. */
const roundedHex = (cx: number, cy: number, r: number) => {
  const v: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 90);
    v.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  let d = '';
  for (let i = 0; i < 6; i++) {
    const p0 = v[(i + 5) % 6], p1 = v[i], p2 = v[(i + 1) % 6];
    const l0 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), l2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const a = [p1[0] + ((p0[0] - p1[0]) * ROUND_R) / l0, p1[1] + ((p0[1] - p1[1]) * ROUND_R) / l0];
    const b = [p1[0] + ((p2[0] - p1[0]) * ROUND_R) / l2, p1[1] + ((p2[1] - p1[1]) * ROUND_R) / l2];
    d += `${i === 0 ? 'M' : 'L'}${a[0].toFixed(2)} ${a[1].toFixed(2)}Q${p1[0].toFixed(2)} ${p1[1].toFixed(2)} ${b[0].toFixed(2)} ${b[1].toFixed(2)}`;
  }
  return d + 'Z';
};

const group = (v: number) => Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export const HexTally: React.FC<{ f: number } & HexProps> = ({ f, ...p }) => {
  const fonts = useFonts();
  const g = Math.min(f, 1e9);
  const n = g + 1; // the reference's 1-based frame
  const rise = 27 * Math.exp(-(n - 1) / (11 * p.settleSeconds));

  // headline: counts flat on the reference's 30 fps ticks
  const ticks = Math.floor((n - 1) / 2);
  const steps = 28;
  const v = lerp(p.from, p.total, Math.min(ticks, steps) / steps);

  const sum = p.segments.reduce((a, s) => a + s.value, 0);

  const empties: React.ReactNode[] = [];
  const lit: React.ReactNode[] = [];
  const litSet = new Map<string, true>();
  for (const [c, r, seg, t] of BLOB) litSet.set(`${c},${r}`, true);
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 22; c++) {
      const cx = X0 + PITCH * c + (r % 2 ? PITCH / 2 : 0);
      const cy = Y0 + ROW * r;
      empties.push(<Path key={`e${c}-${r}`} id={`e${c}-${r}`} d={roundedHex(cx, cy, HEX_R)} fill={EMPTY} />);
    }
  }
  for (const [c, r, seg, t] of BLOB) {
    const a = clamp01((n - (t - 1)) / 3);
    if (a <= 0) continue;
    const cx = X0 + PITCH * c + (r % 2 ? PITCH / 2 : 0);
    const cy = Y0 + ROW * r;
    lit.push(<Path key={`l${c}-${r}`} id={`l${c}-${r}`} d={roundedHex(cx, cy, HEX_R)} fill={p.segments[seg].color} opacity={a} />);
  }

  const rowY = (i: number) => 329 + 29.5 * i;
  const label = '#8b8880';

  return (
    <Layer id="root">
      <Rect id="page" width={1920} height={1080} fill={p.background} />
      <Layer id="scene" scale={2}>
        <Layer id="card" y={rise}>
          <Rect id="card-bg" x={317} y={68.5} width={326} height={392.5} radius={14} fill="#ffffff"
            stroke={{ color: '#f3efe9', width: 1 }} />
          <Text id="title" x={329} y={79} font={fonts.sans} weight={500} size={12} color="#111111">{p.title}</Text>
          <Text id="link" x={632 - 120} y={79} font={fonts.sans} weight={400} size={10.8} color="#85837b" maxWidth={120} align="right">{p.link}</Text>
          <Text id="total" x={328} y={92} font={fonts.sans} weight={500} size={25.5} color="#0a0a0a">{group(v)}</Text>
          <Layer id="field">{empties}</Layer>
          <Layer id="blob">{lit}</Layer>

          <Rect id="legend" x={328} y={329} width={304} height={122} radius={7} fill="#f1f0eb" />
          {[1, 2, 3].map((i) => (
            <Path key={i} id={`div${i}`} d={`M328 ${rowY(i)}H632`} stroke={stroke('#e1e0db', 1)} />
          ))}
          {p.segments.map((s, i) => {
            const cy = rowY(i) + 14.8;
            const val = group(s.value);
            const valW = val.length * 7 - 1;
            const pct = `${Math.round((s.value / sum) * 100)}%`;
            const pillX = 355 + s.label.length * 6.1 + 6;
            const pillW = pct.length * 5.4 + 9;
            const iconX = 622 - valW - 9.5;
            return (
              <React.Fragment key={s.label}>
                <Ellipse id={`dot${i}`} x={342.5 - 3.6} y={cy - 3.6} width={7.2} height={7.2} fill={s.color} />
                <Text id={`lab${i}`} x={355} y={cy - 7} font={fonts.sans} weight={400} size={12} color={label}>{s.label}</Text>
                <Rect id={`pill${i}`} x={pillX} y={cy - 6.2} width={pillW} height={12.4} radius={4} fill="#ffffff" />
                <Text id={`pct${i}`} x={pillX} y={cy - 5.6} font={fonts.sans} weight={600} size={9.8} color="#1b1b1b" maxWidth={pillW} align="center">{pct}</Text>
                <Ellipse id={`ic${i}`} x={iconX - 6.25} y={cy - 6.25} width={12.5} height={12.5} fill={s.trend === 'up' ? '#27a362' : '#d92d20'} />
                <Path id={`ar${i}`} d={s.trend === 'up' ? `M${iconX} ${cy + 2.4}V${cy - 2.2}M${iconX - 2.3} ${cy - 0.2}L${iconX} ${cy - 2.5}L${iconX + 2.3} ${cy - 0.2}` : `M${iconX} ${cy - 2.4}V${cy + 2.2}M${iconX - 2.3} ${cy + 0.2}L${iconX} ${cy + 2.5}L${iconX + 2.3} ${cy + 0.2}`}
                  stroke={stroke('#ffffff', 1.3, { cap: 'round', join: 'round' })} />
                <Text id={`val${i}`} x={622 - 80} y={cy - 7.5} font={fonts.sans} weight={600} size={12.5} color="#0d0d0d" maxWidth={80} align="right">{val}</Text>
              </React.Fragment>
            );
          })}
        </Layer>
      </Layer>
    </Layer>
  );
};
