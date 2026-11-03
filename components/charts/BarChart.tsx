// Bar chart.
// A button becomes the number it produces: an Export button settles from the press that opened the shot, its label
// dissolves, and the pill collapses inward into a square that runs from black through brown into the accent -- the
// tallest cell of a histogram that then fades up around it, on one clock, no stagger. The whole shot is inside the
// chart at 3.15x; a hard cut at 1.2 s pulls out to the full chart (the number, the legend, the axis) and holds.
//
// Authored in the reference's 960x540 pixels and doubled by one root scale. The histogram is a measured grid
// (`cells`), 52 columns by 11 rows, '#' this week, '.' last week only.
//
// Principles: anticipation (the press, with its settle), slow in (the collapse is an ease-in that arrives at full
// speed and slams into the grid), staging (one object moves, then the chart arrives as one), appeal of the hard cut
// (the reveal is the cut, with nothing between it and the zoomed shot).

import React from 'react';
import { z } from 'zod';
import { Ellipse, Layer, Path, Rect, Text } from '@kinetographdev/core';
import { clamp01, hex, lerp, stroke, useFonts } from './lib.js';

export const BAR_FPS = 60;

export const barSchema = z.object({
  label: z.string().describe('The button label (the export that makes the number).'),
  title: z.string().describe('Small heading over the number in the finished chart.'),
  value: z.string().describe('The stat, as written.'),
  deltaLead: z.string().describe('Bold lead of the line after the stat, e.g. "5.8k".'),
  delta: z.string().describe('The rest of that line.'),
  series: z.tuple([z.string(), z.string()]).describe('The two legend entries: last period, this period.'),
  days: z.array(z.string()).describe('X axis labels, spread evenly under the chart.'),
  ticks: z.array(z.string()).describe('Y axis labels, top to bottom.'),
  cells: z.array(z.string()).describe('The histogram, one string per row from the top: "#" a cell of this period, "." a cell of the last period, " " empty. Rows must be 52 wide.'),
  settle: z.number().min(0).max(1).describe('Seconds the button spends settling from the press before the collapse starts (measured: the collapse starts at 0.4 s).'),
  collapseAt: z.number().min(0).max(3).describe('Seconds when the label starts to dissolve and the pill to collapse.'),
  collapseFor: z.number().min(0.1).max(2).describe('Seconds the collapse takes, ease-in: it arrives at full speed.'),
  chartFor: z.number().min(0.1).max(3).describe('Seconds the chart takes to fade up around the square, starting as the square lands.'),
  cutAt: z.number().min(0.3).max(6).describe('Seconds when the shot cuts out to the whole chart.'),
  zoom: z.number().min(1.5).max(4).describe('Magnification of the close-up. 2.4 frames the whole column stack; the reference used 3.15, which runs the chart off the bottom edge.'),
  holdSeconds: z.number().min(0).max(8).describe('Seconds the whole chart holds after the cut.'),
  accent: hex.describe('The colour of this period and of the button after it collapses.'),
  accentTop: hex.describe('A lighter accent, the top of each cell.'),
  muted: hex.describe('Last period cells.'),
  color: hex.describe('The button and the stat.'),
  background: hex.describe('Background.'),
});
export type BarProps = z.infer<typeof barSchema>;

const CELLS = ["              .       .                             ", "   .   ..    .#.     .#                             ", "   ..  ..    .#.    ..#.      .      .              ", "  ...#....  ..##    ..#.     .       #.             ", "  ...#. ..# ..##.  ...#.     ..     ##.           . ", "   .### ..# .###.  ...##.    ..    ### .         .. ", "   .### .# ..####. ..###.    #.   ####  #       ##. ", "  ..### #.#.######. .####.  ###  # .##  ##     #..#.", " ..###  #..######..  .###. #####. #### ###.   ######", " .#### ##..#.#####.  ####.#######  .## ####..# #####", "####################################################"];

export const barDefaults: BarProps = {
  label: 'Export',
  title: 'Renders this week',
  value: '24,815',
  deltaLead: '5.8k',
  delta: ' more than the week before',
  series: ['Last week', 'This week'],
  days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  ticks: ['25k', '20k', '15k', '10k', '5k', '0k'],
  cells: CELLS,
  settle: 0.4,
  collapseAt: 0.4,
  collapseFor: 0.233,
  chartFor: 0.533,
  cutAt: 1.2,
  zoom: 2.4,
  holdSeconds: 0.533,
  accent: '#f79364',
  accentTop: '#fb996b',
  muted: '#e0e0de',
  color: '#000000',
  background: '#f6f6f4',
};

const S = (s: number) => Math.round(s * BAR_FPS);
export const barDuration = (p: BarProps) => S(p.cutAt) + S(p.holdSeconds);

// The grid of the finished chart, in 960x540 pixels.
const COL_LEFT = 145; // left edge of column 0
const PITCH_X = 13.85;
const ROW_TOP = 202.8; // top edge of row 0
const PITCH_Y = 13.7;
const CELL = 12.2;
const HERO = { col: 5, row: 3 }; // the tallest cell of the first group, where the pill lands
const smooth = (t: number) => t * t * (3 - 2 * t);
const keys = (n: number, k: [number, number][]) => {
  if (n <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) if (n <= k[i][0]) return lerp(k[i - 1][1], k[i][1], (n - k[i - 1][0]) / (k[i][0] - k[i - 1][0]));
  return k[k.length - 1][1];
};
const rgb = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const mixHex = (a: string, b: string, t: number) => {
  const x = rgb(a), y = rgb(b);
  return `rgb(${Math.round(lerp(x[0], y[0], t))},${Math.round(lerp(x[1], y[1], t))},${Math.round(lerp(x[2], y[2], t))})`;
};

const Upload: React.FC<{ id: string; x: number; y: number; color: string }> = ({ id, x, y, color }) => (
  <Path id={id} x={x} y={y} d="M-6 2.5V6H6V2.5M0 3.5V-5.5M-3.8 -1.7L0 -5.5L3.8 -1.7" stroke={stroke(color, 1.4, { cap: 'round', join: 'round' })} />
);

export const BarChart: React.FC<{ f: number } & BarProps> = ({ f, ...p }) => {
  const fonts = useFonts();
  const n = f + 0.5; // the reference changes every other frame: sit half a frame back
  const cut = f >= S(p.cutAt);
  const rows = p.cells.length;
  const cols = p.cells[0]?.length ?? 0;
  const c0 = S(p.collapseAt) + 0.5; // frame the collapse begins on (reference frame 25)
  const cEnd = c0 + S(p.collapseFor); // lands (reference frame 39)
  const k = (cEnd - c0) / 14; // keys below are measured over 14 frames
  const at = (v: number) => c0 + (v - 25) * k;

  // ------------------------------------------------------------------------------------------------------
  // The chart's own pieces, in 960x540 pixels at the finished size.
  const cx = (c: number) => COL_LEFT + PITCH_X * c;
  const cy = (r: number) => ROW_TOP + PITCH_Y * r;
  const heroC = HERO.col, heroR = HERO.row;

  const cellsLayer = (alpha: number, skipHero: boolean) => {
    const greys: React.ReactNode[] = [];
    const oranges: React.ReactNode[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const ch = p.cells[r][c];
        if (ch === ' ') continue;
        const isHero = r === heroR + 0 && c === heroC + 0;
        if (ch === '#') {
          if (isHero && skipHero) continue;
          oranges.push(
            <Rect key={`o${r}-${c}`} id={`o${r}-${c}`} x={cx(c)} y={cy(r)} width={CELL} height={CELL} radius={CELL * 0.22}
              fill={{ type: 'linear', units: 'box', x0: 0, y0: 0, x1: 0, y1: 1, stops: [{ offset: 0, color: p.accentTop }, { offset: 1, color: p.accent }] }} />,
          );
        } else {
          greys.push(<Rect key={`g${r}-${c}`} id={`g${r}-${c}`} x={cx(c)} y={cy(r)} width={CELL} height={CELL} radius={CELL * 0.22} fill={p.muted} />);
        }
      }
    }
    return (
      <Layer id="cells" opacity={alpha}>
        <Layer id="greys">{greys}</Layer>
        <Layer id="oranges">{oranges}</Layer>
      </Layer>
    );
  };

  const ground = <Rect id="ground" width={1920} height={1080} fill={p.background} />;
  const root = (children: React.ReactNode) => (
    <Layer id="root">
      {ground}
      <Layer id="scene" scale={2}>{children}</Layer>
    </Layer>
  );

  const tickY = (i: number) => 195 + 30 * i;

  // ------------------------------------------------------------------------------------------------------
  // The whole chart, after the cut.
  if (cut) {
    const day = (i: number) => 191 + (815 - 191) * (i / (p.days.length - 1));
    const uneven = [191, 280, 369, 458, 549, 636, 725, 815];
    return root(
      <>
        <Text id="title" x={112} y={131.5} font={fonts.sans} weight={400} size={9.2} color="#6e6f6b">{p.title}</Text>
        <Text id="value" x={112} y={147} font={fonts.sans} weight={600} size={21} color={p.color}>{p.value}</Text>
        <Ellipse id="dot" x={178.5} y={153.5} width={12} height={12} fill="#e44853" />
        <Text id="lead" x={199} y={155} font={fonts.sans} weight={600} size={8.4} color={p.color}>{p.deltaLead}</Text>
        <Text id="delta" x={199 + p.deltaLead.length * 5 + 4} y={155} font={fonts.sans} weight={400} size={8.4} color="#6e6f6b">{p.delta.trim()}</Text>
        <Rect id="lg1" x={723} y={131} width={14} height={14} radius={4.5} fill={p.muted} />
        <Text id="lg1t" x={743} y={132} font={fonts.sans} weight={400} size={10} color="#787773">{p.series[0]}</Text>
        <Rect id="lg2" x={795} y={131} width={14} height={14} radius={4.5} fill={p.accent} />
        <Text id="lg2t" x={815} y={132} font={fonts.sans} weight={400} size={10} color="#787773">{p.series[1]}</Text>
        {p.ticks.map((t, i) => (
          <React.Fragment key={t}>
            <Text id={`yl${i}`} x={143 - 60} y={tickY(i) - 11} font={fonts.sans} weight={400} size={17} color="#66675f" maxWidth={60} align="right">{t}</Text>
            <Path id={`yt${i}`} d={`M148 ${tickY(i)}H163`} stroke={stroke('#e1e1e1', 1)} />
          </React.Fragment>
        ))}
        {cellsLayer(1, false)}
        {p.days.map((d, i) => (
          <Text key={i} id={`xl${i}`} x={(uneven[i] ?? day(i)) - 30} y={357.5} font={fonts.sans} weight={400} size={10.5} color="#7f807b" maxWidth={60} align="center">{d}</Text>
        ))}
      </>,
    );
  }

  // ------------------------------------------------------------------------------------------------------
  // Inside the chart at 3.15x. The camera sits on the hero cell.
  const Z = p.zoom;
  const camX = cx(heroC) + CELL / 2 + 0.0;
  const camY = cy(heroR) + CELL / 2;
  // Frame the close-up on the button's spot, high enough that the bottom row sits inside the frame (y 500 at most).
  const gridBottom = cy(rows - 1) + CELL;
  const screenAt = { x: 476.5, y: Math.min(267.5, 500 - (gridBottom - camY) * Z) };
  // the axis labels follow column 0 (at 3.15x it sits at x 239.5)
  const labelDx = screenAt.x - (camX - COL_LEFT) * Z - 239.5;
  const grow = smooth(clamp01((n - at(37)) / (at(69) - at(37))));
  // axis labels in screen space: they do not scale with the cells
  const labelOpacity = grow;

  // the button
  const press = 1 + 0.074 * Math.exp(-(n - 1) / 7);
  const wDrop = keys(n, [[25, 0], [27, 4], [29, 6], [31, 12], [33, 20], [35, 39], [37, 66], [39, 98]].map(([a, b]) => [at(a), b] as [number, number]));
  const bw = 135 * press - wDrop * (1 - 0) + (n > at(39) ? 0 : 0);
  const finalSide = CELL * Z;
  const w = Math.max(finalSide, bw - (n >= at(39) ? 0 : 0));
  const hBase = keys(n, [[at(25), 47], [at(31), 46], [at(35), 44], [at(37), 41], [at(39), finalSide]]);
  const h = hBase * (n < at(25) ? press : 1);
  const colorT = keys(n, [[at(29), 0], [at(31), 0.03], [at(33), 0.09], [at(35), 0.29], [at(37), 0.59], [at(39), 1]]);
  const labelA = 1 - clamp01((n - at(25)) / (at(29) - at(25)));
  const radius = lerp(11.5, CELL * Z * 0.22, clamp01((n - at(31)) / (at(39) - at(31))));
  const landed = n >= at(39);

  // the axis ticks, measured in the reference at 3.15x, put back into chart space and through this zoom
  const ticksZ = [100, 192.3, 284.6, 376.9, 469.2].map((y) => screenAt.y + ((y - 267.5) / 3.15) * Z);

  return root(
    <>
      {/* the chart: fades up as one object, the hero cell excepted */}
      <Layer id="cam">
        <Layer id="eye" x={screenAt.x} y={screenAt.y} scale={Z} anchorX={camX} anchorY={camY}>
          {cellsLayer(grow, true)}
          {landed ? (
            <Rect id="hero" x={cx(heroC)} y={cy(heroR)} width={CELL} height={CELL} radius={CELL * 0.22}
              fill={{ type: 'linear', units: 'box', x0: 0, y0: 0, x1: 0, y1: 1, stops: [{ offset: 0, color: p.accentTop }, { offset: 1, color: p.accent }] }} />
          ) : null}
        </Layer>
      </Layer>
      {p.ticks.slice(0, 5).map((t, i) => (
        <React.Fragment key={t}>
          <Text id={`yl${i}`} x={183 - 90 + labelDx} y={ticksZ[i] - 17} font={fonts.sans} weight={400} size={28} color="#66675f" maxWidth={90} align="right" opacity={labelOpacity}>{t}</Text>
          <Path id={`yt${i}`} d={`M${197 + labelDx} ${ticksZ[i]}H${240 + labelDx}`} stroke={stroke('#e1e1e1', 1.5)} opacity={labelOpacity} />
        </React.Fragment>
      ))}

      {/* the button, until it is the cell */}
      {!landed ? (
        <Layer id="button" x={screenAt.x} y={screenAt.y} anchorX={0} anchorY={0}>
          <Rect id="b-bg" x={-w / 2} y={-h / 2} width={w} height={h} radius={radius}
            fill={mixHex('#000000', p.accent, colorT)} />
          <Layer id="b-label" opacity={labelA} scale={press}>
            <Upload id="b-ic" x={-31} y={0} color="#ffffff" />
            <Text id="b-t" x={-11} y={-10.5} font={fonts.sans} weight={500} size={17} color="#ffffff">{p.label}</Text>
          </Layer>
        </Layer>
      ) : null}
    </>,
  );
};
