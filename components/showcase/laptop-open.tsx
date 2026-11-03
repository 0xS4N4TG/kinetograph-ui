// Laptop Open, scene laptop-open: a MacBook-class laptop seen from a hand's width off the glass, out of focus
// and coming into focus as the lens pulls back, a slow turn of the whole machine as the lens settles on it, a held
// moment, then a push into the glass until the screen is the frame, a cut to a field of colour and a line typing itself.
//
// Built as real 3D (a lid plane and a deck plane hinged on the lid's bottom edge, one perspective), driven by a pose
// table fitted to the reference: per frame the lid's tilt, its size and its row. The lid is 1000 x 680 units (a 16 inch
// proportion: 1.47 : 1), the deck 1000 x 685, and the hinge opens 118 degrees, which is what the reference measures.
//
// Principles: staging (the glass first, then the machine, then the glass again), slow in and out (the pose table is one
// continuous eased move, no constant-speed stretch), depth of field (a focus pull from soft to sharp as the lens arrives),
// follow through (the lens keeps turning after the pull-back stops, so the hold is never dead), restraint.

import React from 'react';
import { z } from 'zod';
import { Camera, Layer, Path, Rect, Text, blur, grain, linearGradient, radialGradient, staticFile, Image } from '@kinetographdev/core';
import { useCurrentFrame } from 'remotion';
import { Desktop } from './desktop.js';
import { LSH, LSW } from './devices.js';
import { ease, easeOut, prog, ramp, rr, useFamily } from './lib.js';

export const W = 1920;
export const H = 1080;
export const FPS = 60;
export const DURATION = 222;

const hex = z.string().describe('A CSS colour.');

export const laptopOpenSchema = z.object({
  headline: z.string().describe('The line over the opening glass, before the lens pulls back.'),
  tagline: z.string().describe('The line that types itself over the field at the end.'),
  screen: z.string().describe('The glass: "blank" (a lit empty screen), "desk" (a drawn analytics app) or a path to an image under public/.'),
  uiFont: z.string().describe('Google Fonts family for the headline, the tagline and the drawn screen.'),
  accent: hex.describe('The drawn app\'s accent colour.'),
  glass: hex.describe('The lit glass colour, also the colour of the opening frames.'),
  deck: hex.describe('The aluminium deck, mid tone (the gradient is built round it).'),
  fieldA: hex.describe('The end field: the light base.'),
  fieldB: hex.describe('The end field: the colour that rises from the lower left.'),
  focus: z.number().min(0).max(2).describe('Depth of field strength: how soft the opening is. 0 starts sharp.'),
  zoomInto: z.boolean().describe('Push in until the glass is the frame, then cut to the field. Off holds on the laptop.'),
  speed: z.number().min(0.5).max(2).describe('Playback speed of the move.'),
  grain: z.number().min(0).max(0.2).describe('Film grain over the whole frame.'),
});
export type LaptopOpenProps = z.infer<typeof laptopOpenSchema>;

export const laptopOpenDefaults: LaptopOpenProps = {
  headline: 'Make it look this good',
  tagline: 'Every screen, shipped',
  screen: 'blank',
  uiFont: 'Geist',
  accent: '#d9f26b',
  glass: '#eeeeee',
  deck: '#858282',
  fieldA: '#fcfcfc',
  fieldB: '#bb9cf7',
  focus: 1,
  zoomInto: true,
  speed: 1,
  grain: 0,
};

// ---- the pose table, fitted to the reference -----------------------------------------------------------------------
// One sample every 3 frames from frame 12: the lid's half width (reference pixels), its tilt in degrees (positive: the top
// leans away) and the row of its centre below the vanishing point.
const T0 = 12;
const STEP = 3;
const SW = [419.5, 400.4, 383.2, 369.4, 358.5, 349.1, 340.3, 332.3, 325.2, 318.8, 312.8, 307.0, 301.5, 296.5, 291.8, 287.2, 282.8, 278.9, 275.9, 273.2, 270.6, 268.0, 265.7, 263.6, 261.5, 259.3, 257.3, 255.6, 254.1, 252.8, 251.6, 250.4, 249.4, 248.6, 248.0, 247.4, 246.9, 246.5, 246.2, 246.1, 246.2, 246.6, 247.4, 248.4, 249.6, 250.9, 252.5, 254.5, 256.8, 259.2, 262.1, 265.7, 270.2, 275.5, 282.6, 294.3, 313.1, 338.5];
const TH = [-28.1, -24.1, -20.6, -17.8, -15.5, -13.2, -11.1, -8.6, -6.0, -3.7, -1.6, 0.4, 2.2, 3.6, 4.6, 5.5, 6.5, 7.5, 8.7, 10.0, 11.2, 12.2, 13.1, 13.9, 14.6, 15.3, 16.3, 17.5, 18.8, 20.0, 21.1, 22.0, 22.4, 22.7, 22.7, 22.6, 22.6, 22.7, 23.1, 23.3, 23.3, 23.3, 23.5, 23.6, 23.6, 23.7, 24.1, 24.6, 25.1, 25.2, 25.3, 25.6, 25.9, 25.7, 25.4, 25.3, 25.9, 27.1];
const CY = [-53.2, -63.7, -70.9, -74.2, -75.1, -75.2, -74.6, -73.8, -73.0, -72.0, -70.6, -68.7, -66.3, -63.7, -61.4, -59.1, -56.8, -54.6, -52.8, -51.1, -49.4, -47.6, -45.9, -44.3, -42.9, -41.4, -40.2, -39.2, -38.4, -37.6, -36.9, -36.2, -35.4, -34.4, -33.2, -32.1, -31.3, -30.7, -30.3, -29.9, -29.3, -28.7, -28.3, -27.7, -27.2, -27.0, -27.0, -27.0, -26.9, -26.8, -26.8, -26.7, -26.6, -26.5, -26.5, -26.8, -27.7, -29.1];
const LAST = T0 + STEP * (SW.length - 1); // 183

/** Catmull-Rom through the samples, with a gentle extension at both ends. */
function sample(tab: number[], f: number): number {
  const u = (f - T0) / STEP;
  const n = tab.length;
  const at = (i: number) => {
    if (i < 0) return tab[0] + (tab[0] - tab[1]) * -i;
    if (i > n - 1) return tab[n - 1] + (tab[n - 1] - tab[n - 2]) * (i - (n - 1));
    return tab[i];
  };
  const i = Math.floor(u);
  const t = u - i;
  const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
}

const ASPECT = 0.68; // lid height / width
const PERSP = 1400; // reference pixels
const OPEN = 62.5; // degrees between the lid's downward edge and the deck's forward edge
const K = 2; // reference pixels to render pixels

export interface Pose {
  sw: number;
  th: number;
  cy: number;
}

/** The camera as the lid sees it: size, tilt, row. Pure in the frame. */
export function pose(f: number): Pose {
  if (f <= LAST) {
    if (f >= T0) return { sw: sample(SW, f), th: sample(TH, f), cy: sample(CY, f) };
    // before the table: carry the first moves back, a touch accelerating, so the bottom edge enters from below
    const d = T0 - f;
    return { sw: SW[0] * Math.exp(0.0155 * d + 0.0014 * d * d), th: TH[0] - 1.35 * d - 0.05 * d * d, cy: CY[0] + 3.3 * d };
  }
  // after the table: the push keeps accelerating until the glass is the frame
  const d = f - LAST;
  return { sw: SW[SW.length - 1] * Math.exp(0.06 * d + 0.02 * d * d), th: TH[TH.length - 1] + 0.1 * d, cy: CY[CY.length - 1] - 9 * d };
}

// ---- the machine, drawn flat in lid units (1000 wide) ---------------------------------------------------------------

const LW_ = 1000;
const LH_ = 680;
const DD = 675;

/** A rounded rectangle with a radius per corner: tl, tr, br, bl. */
const rrx = (w: number, h: number, [a, b, c, d]: [number, number, number, number]) =>
  `M${a} 0H${w - b}A${b} ${b} 0 0 1 ${w} ${b}V${h - c}A${c} ${c} 0 0 1 ${w - c} ${h}H${d}A${d} ${d} 0 0 1 0 ${h - d}V${a}A${a} ${a} 0 0 1 ${a} 0Z`;

const Lid: React.FC<{ screen: string; glass: string; f: number; st: { font: string; accent: string; ink: string } }> = ({ screen, glass, f, st }) => (
  <Layer id="lo-lid">
    <Path id="lo-lid-shell" d={rrx(LW_, LH_, [22, 22, 9, 9])} fill="#080809" />
    <Layer id="lo-glass" x={8} y={8} clip={{ kind: 'path', d: rr(984, 652, 4) }}>
      <Rect id="lo-glass-fill" width={984} height={652} fill={glass} />
      {screen === 'blank' ? null : screen === 'desk' ? (
        <Layer id="lo-glass-ui" x={0} y={(652 - LSH * 0.9) / 2} scale={0.9}>
          <Desktop id="lo-ui" screen="desk" st={st} t={prog(f, 60, 170)} />
        </Layer>
      ) : (
        <Image id="lo-glass-img" src={staticFile(screen)} width={984} height={652} fit="cover" />
      )}
    </Layer>
    <Path id="lo-notch" d={rrx(126, 27, [0, 0, 9, 9])} x={437} y={8} fill="#080809" />
  </Layer>
);

const Deck: React.FC<{ tone: string }> = ({ tone }) => {
  const keys: React.ReactNode[] = [];
  // five rows of keys, staggered, in the recess
  const rows = [12, 11, 11, 10, 8];
  for (let r = 0; r < rows.length; r++) {
    const n = rows[r];
    const kw = (944 - 20 - (n - 1) * 6) / n;
    const x0 = 28 + 10 + (r % 2) * 3;
    for (let c = 0; c < n; c++) {
      keys.push(<Rect key={`${r}-${c}`} id={`lo-k${r}-${c}`} x={x0 + c * (kw + 6)} y={26 + r * 38} width={kw} height={31} radius={5} fill="#454444" />);
    }
  }
  return (
    <Layer id="lo-deck">
      <Path id="lo-deck-body" d={rrx(1000, DD, [10, 10, 74, 74])} fill={linearGradient([[0, '#7c7979'], [0.1, tone], [0.55, '#9a9797'], [0.9, '#6b6868'], [1, '#403e3e']], { angle: 180 })} />
      <Path id="lo-deck-shade" d={rrx(1000, DD, [10, 10, 74, 74])} fill={linearGradient([[0, '#00000040'], [0.16, '#00000000'], [0.84, '#00000000'], [1, '#00000040']], { angle: 90 })} />
      <Rect id="lo-well" x={28} y={14} width={944} height={232} radius={10} fill="#5d5c5c" />
      {keys}
      <Rect id="lo-pad" x={316} y={340} width={368} height={224} radius={16} fill="#ffffff10" />
      <Rect id="lo-padline" x={316} y={340} width={368} height={224} radius={16} stroke={{ color: '#6f6c6c', width: 2 }} />
      <Rect id="lo-pill" x={440} y={618} width={120} height={14} radius={7} fill="#f2f2f2" />
    </Layer>
  );
};

export const LaptopOpen: React.FC<LaptopOpenProps> = (p) => {
  const frame = useCurrentFrame();
  const f = frame * p.speed;
  const ui = useFamily(p.uiFont, ['400', '500', '600']);
  const st = { font: ui, accent: p.accent, ink: '#18191b' };

  // the push ends in the glass; without it the lens stops at the end of the table
  const fEnd = p.zoomInto ? f : Math.min(f, LAST - 3);
  const ps = pose(fEnd);
  const th = (ps.th * Math.PI) / 180;
  const sh = ASPECT * ps.sw;
  const a = sh * Math.cos(th); // half the lid's height, along the screen
  const u = sh * Math.sin(th); // and its depth
  const sc = (ps.sw * K) / (LW_ / 2); // lid units to render pixels

  // beats, in frames (the reference's, at 60 fps)
  const CUT = 188; // the glass fills the frame, then the field
  const onLid = f >= 7 && f < CUT - 1;
  const firstGlass = f < 7;
  const fieldT = prog(f, CUT, CUT + 5);
  const typed = Math.max(0, Math.min(p.tagline.length, Math.floor((f - 194) * 0.78)));
  const soft = p.focus * 6 * (1 - ease(prog(f, 8, 40)));

  const lidNode = (
    <Layer
      id="lo-lidwrap"
      x={W / 2}
      y={H / 2 + K * ps.cy}
      anchorX={(LW_ / 2) * sc}
      anchorY={(LH_ / 2) * sc}
      rotateX={ps.th}
    >
      <Layer id="lo-lidscale" scale={sc}>
        <Lid screen={p.screen} glass={p.glass} f={f} st={st} />
      </Layer>
    </Layer>
  );
  const deckNode = (
    <Layer id="lo-deckwrap" x={W / 2} y={H / 2 + K * (ps.cy + a)} z={K * u} anchorX={(LW_ / 2) * sc} anchorY={0} rotateX={ps.th + OPEN}>
      <Layer id="lo-deckscale" scale={sc}>
        <Deck tone={p.deck} />
      </Layer>
    </Layer>
  );

  return (
    <Layer id="lo-root" effects={p.grain > 0 ? [grain(p.grain, { seed: 5, size: 1.3 })] : undefined}>
      <Camera perspective={PERSP * K} />
      <Rect id="lo-bg" width={W} height={H} fill="#ffffff" />
      {onLid ? (
        <Layer id="lo-machine" effects={soft > 0.6 ? [blur(soft * K)] : undefined}>
          {deckNode}
          {lidNode}
        </Layer>
      ) : null}
      {firstGlass ? <Rect id="lo-glass0" width={W} height={H} fill={p.glass} /> : null}
      {f >= CUT - 1 && f < CUT + 5 ? <Rect id="lo-glass1" width={W} height={H} fill={p.glass} opacity={1 - fieldT} /> : null}
      {fieldT > 0 ? (
        <Layer id="lo-field" opacity={fieldT}>
          <Rect id="lo-field-a" width={W} height={H} fill={p.fieldA} />
          <Rect id="lo-field-b" width={W} height={H} fill={radialGradient([[0, p.fieldB], [0.55, `${p.fieldB}55`], [1, `${p.fieldB}00`]], { cx: 0.12, cy: 1.1, r: 0.78 })} />
          <Text id="lo-tag" font={ui} weight={500} size={50} color="#101010" align="center" x={0} y={H / 2 - 28} maxWidth={W} lineHeight={1}>
            {p.tagline.slice(0, typed)}
          </Text>
        </Layer>
      ) : null}
      {f < 7 ? (
        <Text id="lo-head" font={ui} weight={500} size={80} color="#0d0d0d" align="center" x={0} y={H / 2 - 40} maxWidth={W} lineHeight={1} opacity={1 - prog(f, 3, 6, (t) => t)}>
          {p.headline}
        </Text>
      ) : null}
    </Layer>
  );
};
export { ramp, easeOut };
