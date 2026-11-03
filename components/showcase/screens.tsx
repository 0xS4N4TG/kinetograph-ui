// Drawn sample screens for the phones: a made-up fitness app called "Stride" (no brand, no real product). Each is drawn in
// the phone's 368 x 778 screen box. `t` (0..1) is the screen's own reveal: the ring sweeps, the bars fill, the line draws.

import React from 'react';
import { Ellipse, Image, Layer, Path, Rect, Text, linearGradient, radialGradient, staticFile } from '@kinetographdev/core';
import type { Stroke } from '@kinetographdev/core';
import { SH, SW } from './devices.js';
import { clamp, ease, prog } from './lib.js';

export const BUILT_IN = ['hero', 'dashboard', 'chart', 'plan'] as const;
export type BuiltIn = (typeof BUILT_IN)[number];

export interface ScreenStyle {
  /** UI font family (already registered). */
  font: string;
  /** The app's accent: a fresh lime by default. */
  accent: string;
  /** Dark ink for light screens and button type. */
  ink: string;
  /** The sage ground of the hero screen. */
  sage: string;
}

export const defaultStyle = (font: string): ScreenStyle => ({ font, accent: '#d9f26b', ink: '#18191b', sage: '#cdd8a4' });

/** Stroke with round caps: the engine draws cap and join though the type does not list them. */
const line = (color: string, width: number, extra: Record<string, unknown> = {}): Stroke =>
  ({ color, width, cap: 'round', join: 'round', ...extra }) as unknown as Stroke;

const StatusBar: React.FC<{ id: string; color: string; font: string }> = ({ id, color, font }) => (
  <Layer id={id}>
    <Text id={`${id}-t`} font={font} weight={600} size={15} color={color} x={34} y={22} lineHeight={1}>
      9:30
    </Text>
    {[0, 1, 2, 3].map((i) => (
      <Rect key={i} id={`${id}-s${i}`} x={284 + i * 4.4} y={34 - i * 2 - 4} width={2.8} height={4 + i * 2} radius={1} fill={color} />
    ))}
    <Rect id={`${id}-b`} x={313} y={25} width={22} height={11} radius={3.5} stroke={{ color, width: 1.2 }} opacity={0.9} />
    <Rect id={`${id}-bf`} x={315} y={27} width={14} height={7} radius={2} fill={color} />
  </Layer>
);

/** a point on a circle for arc paths, 0 deg = up, clockwise */
const pt = (cx: number, cy: number, r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
};
const arc = (cx: number, cy: number, r: number, from: number, to: number) =>
  `M${pt(cx, cy, r, from)}A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${pt(cx, cy, r, to)}`;

// ---- 1. hero ---------------------------------------------------------------------------------------------------

const Runner: React.FC<{ id: string; color: string; t: number }> = ({ id, color, t }) => {
  // a stick figure mid-stride, a little hop on the reveal
  const s = line(color, 5);
  return (
    <Layer id={id} x={150} y={150 + (1 - ease(t)) * 14} opacity={ease(t)}>
      <Ellipse id={`${id}-head`} x={52} y={0} width={30} height={32} fill={color} />
      <Path id={`${id}-torso`} d="M66 36 L56 112" stroke={s} />
      <Path id={`${id}-arm1`} d="M64 50 L92 78 L120 66" stroke={s} />
      <Path id={`${id}-arm2`} d="M63 52 L38 80 L14 62" stroke={s} />
      <Path id={`${id}-leg1`} d="M56 112 L92 146 L84 196" stroke={s} />
      <Path id={`${id}-leg2`} d="M56 112 L24 150 L-12 148" stroke={s} />
      <Rect id={`${id}-ground`} x={-60} y={204} width={220} height={3} radius={1.5} fill={color} opacity={0.25} />
    </Layer>
  );
};

const Hero: React.FC<{ id: string; st: ScreenStyle; t: number }> = ({ id, st, t }) => (
  <Layer id={id}>
    <Rect id={`${id}-bg`} width={SW} height={SH} fill={linearGradient([st.sage, '#bdca8f'], { angle: 165 })} />
    <Ellipse id={`${id}-glow`} x={-60} y={-80} width={340} height={340} fill={radialGradient(['#ffffff66', '#ffffff00'])} />
    <StatusBar id={`${id}-sb`} color={st.ink} font={st.font} />
    <Runner id={`${id}-run`} color="#5a6340" t={t} />
    <Text id={`${id}-h`} font={st.font} weight={600} size={42} color={st.ink} x={32} y={SH - 300} lineHeight={1.02} maxWidth={300} opacity={prog(t, 0.2, 0.7)}>
      Unleash full potential
    </Text>
    <Text id={`${id}-p`} font={st.font} weight={400} size={15} color="#3d4430" x={32} y={SH - 200} lineHeight={1.35} maxWidth={260} opacity={prog(t, 0.3, 0.8)}>
      Plans that move with you, one run at a time.
    </Text>
    <Rect id={`${id}-btn`} x={32} y={SH - 130} width={150} height={48} radius={24} fill={st.ink} opacity={prog(t, 0.4, 0.9)} />
    <Text id={`${id}-bt`} font={st.font} weight={600} size={14} color={st.accent} x={32 + 38} y={SH - 130 + 17} lineHeight={1} opacity={prog(t, 0.4, 0.9)}>
      Start now
    </Text>
  </Layer>
);

// ---- 2. dashboard ----------------------------------------------------------------------------------------------

const Dashboard: React.FC<{ id: string; st: ScreenStyle; t: number }> = ({ id, st, t }) => {
  const sweep = ease(prog(t, 0.1, 0.8));
  const rows: [string, string, number][] = [
    ['Running', '5.2 km today', 0.78],
    ['Cycling', '12 km this week', 0.5],
    ['Strength', '2 sessions', 0.62],
  ];
  return (
    <Layer id={id}>
      <Rect id={`${id}-bg`} width={SW} height={SH} fill="#17181a" />
      <StatusBar id={`${id}-sb`} color="#ffffff" font={st.font} />
      <Ellipse id={`${id}-av`} x={28} y={70} width={32} height={32} fill={st.accent} />
      <Text id={`${id}-avt`} font={st.font} weight={600} size={12} color={st.ink} x={36} y={80} lineHeight={1}>
        AL
      </Text>
      <Text id={`${id}-nm`} font={st.font} weight={600} size={14} color="#fff" x={70} y={72} lineHeight={1}>
        Alex Lind
      </Text>
      <Text id={`${id}-pm`} font={st.font} weight={400} size={11} color="#8d9096" x={70} y={91} lineHeight={1}>
        Premium member
      </Text>
      <Rect id={`${id}-card`} x={20} y={128} width={SW - 40} height={236} radius={22} fill="#232427" />
      <Text id={`${id}-wg`} font={st.font} weight={500} size={13} color="#a3a6ab" x={38} y={146} lineHeight={1}>
        Weekly goal
      </Text>
      <Layer id={`${id}-ring`} x={SW / 2} y={236}>
        <Path id={`${id}-ring-bg`} d={arc(0, 0, 62, 0, 359.9)} stroke={line('#3a3c40', 12)} />
        <Path id={`${id}-ring-fg`} d={arc(0, 0, 62, 0, Math.max(0.5, 240 * sweep))} stroke={line(st.accent, 12)} />
        <Text id={`${id}-ring-n`} font={st.font} weight={600} size={38} color="#fff" x={-26} y={-22} lineHeight={1}>
          {sweep > 0.6 ? '2' : '1'}
        </Text>
        <Text id={`${id}-ring-m`} font={st.font} weight={400} size={20} color="#8d9096" x={2} y={-12} lineHeight={1}>
          / 3
        </Text>
      </Layer>
      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => {
        const on = i < 2;
        const x = 38 + i * 44;
        return (
          <Layer key={i} id={`${id}-d${i}`}>
            <Ellipse id={`${id}-d${i}-c`} x={x} y={326} width={26} height={26} fill={on ? st.accent : '#2f3033'} />
            <Text id={`${id}-d${i}-t`} font={st.font} weight={600} size={11} color={on ? st.ink : '#7d8086'} x={x + 8.5} y={334} lineHeight={1}>
              {d}
            </Text>
          </Layer>
        );
      })}
      <Text id={`${id}-yp`} font={st.font} weight={600} size={15} color="#fff" x={26} y={392} lineHeight={1}>
        Your progress
      </Text>
      <Text id={`${id}-see`} font={st.font} weight={500} size={12} color={st.accent} x={SW - 70} y={394} lineHeight={1}>
        See all
      </Text>
      {rows.map(([n, sub, v], i) => {
        const y = 428 + i * 74;
        const k = ease(prog(t, 0.35 + i * 0.1, 0.9));
        return (
          <Layer key={n} id={`${id}-r${i}`} y={y} opacity={prog(t, 0.3 + i * 0.1, 0.6 + i * 0.1)}>
            <Rect id={`${id}-r${i}-bg`} x={20} width={SW - 40} height={62} radius={18} fill="#202124" />
            <Rect id={`${id}-r${i}-ic`} x={32} y={15} width={32} height={32} radius={10} fill="#2f3033" />
            <Ellipse id={`${id}-r${i}-dot`} x={42} y={25} width={12} height={12} fill={st.accent} />
            <Text id={`${id}-r${i}-n`} font={st.font} weight={600} size={13} color="#fff" x={76} y={14} lineHeight={1}>
              {n}
            </Text>
            <Text id={`${id}-r${i}-s`} font={st.font} weight={400} size={11} color="#8d9096" x={76} y={33} lineHeight={1}>
              {sub}
            </Text>
            <Rect id={`${id}-r${i}-tr`} x={196} y={28} width={128} height={6} radius={3} fill="#34363a" />
            <Rect id={`${id}-r${i}-fl`} x={196} y={28} width={Math.max(6, 128 * v * k)} height={6} radius={3} fill={st.accent} />
          </Layer>
        );
      })}
    </Layer>
  );
};

// ---- 3. chart --------------------------------------------------------------------------------------------------

const Chart: React.FC<{ id: string; st: ScreenStyle; t: number }> = ({ id, st, t }) => {
  const pts: [number, number][] = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [
    24 + i * 46,
    430 - 70 * (0.55 + 0.35 * Math.sin(i * 0.9 + 0.4) + 0.2 * Math.sin(i * 2.1)) - i * 8,
  ]);
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const mx = (x0 + x1) / 2;
    d += ` C${mx} ${y0} ${mx} ${y1} ${x1} ${y1}`;
  }
  const area = `${d} L${pts[7][0]} 520 L${pts[0][0]} 520Z`;
  const reveal = ease(prog(t, 0.15, 0.85));
  const kcal = Math.round(740 * ease(prog(t, 0.05, 0.7)));
  return (
    <Layer id={id}>
      <Rect id={`${id}-bg`} width={SW} height={SH} fill="#f3f3ee" />
      <StatusBar id={`${id}-sb`} color={st.ink} font={st.font} />
      <Text id={`${id}-l`} font={st.font} weight={400} size={13} color="#7b7d78" x={28} y={86} lineHeight={1}>
        Burned calories
      </Text>
      <Text id={`${id}-n`} font={st.font} weight={600} size={58} color={st.ink} x={26} y={110} lineHeight={1}>
        {String(kcal)}
      </Text>
      <Text id={`${id}-u`} font={st.font} weight={400} size={18} color="#7b7d78" x={142} y={142} lineHeight={1}>
        kcal
      </Text>
      {[0, 1, 2, 3].map((i) => (
        <Rect key={i} id={`${id}-g${i}`} x={24} y={250 + i * 66} width={SW - 48} height={1} fill="#00000010" />
      ))}
      <Layer id={`${id}-plot`} clip={{ kind: 'path', d: `M0 0H${(24 + (SW - 48) * reveal).toFixed(1)}V${SH}H0Z` }}>
        <Path id={`${id}-area`} d={area} fill={linearGradient([[0, `${st.accent}cc`], [1, `${st.accent}00`]], { angle: 180 })} />
        <Path id={`${id}-line`} d={d} stroke={line('#9aab3a', 3)} />
        <Ellipse id={`${id}-pt`} x={pts[7][0] - 6} y={pts[7][1] - 6} width={12} height={12} fill="#fff" stroke={{ color: '#9aab3a', width: 3 }} />
      </Layer>
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon'].map((dname, i) => (
        <Text key={i} id={`${id}-x${i}`} font={st.font} weight={400} size={10} color="#9a9c97" x={pts[i][0] - 9} y={538} lineHeight={1}>
          {dname}
        </Text>
      ))}
      {[
        ['Active', '540 kcal'],
        ['Rest', '200 kcal'],
      ].map(([a, b], i) => (
        <Layer key={a} id={`${id}-chip${i}`} x={24 + i * 164} y={600} opacity={prog(t, 0.5 + i * 0.1, 0.9)}>
          <Rect id={`${id}-chip${i}-bg`} width={152} height={64} radius={18} fill="#fff" />
          <Text id={`${id}-chip${i}-a`} font={st.font} weight={400} size={12} color="#7b7d78" x={18} y={14} lineHeight={1}>
            {a}
          </Text>
          <Text id={`${id}-chip${i}-b`} font={st.font} weight={600} size={17} color={st.ink} x={18} y={34} lineHeight={1}>
            {b}
          </Text>
        </Layer>
      ))}
    </Layer>
  );
};

// ---- 4. plan ---------------------------------------------------------------------------------------------------

const Plan: React.FC<{ id: string; st: ScreenStyle; t: number }> = ({ id, st, t }) => {
  const items: [string, string, string][] = [
    ['07:00', 'Easy run', '35 min'],
    ['12:30', 'Mobility', '15 min'],
    ['18:00', 'Strength', '45 min'],
    ['21:00', 'Wind down', '10 min'],
  ];
  return (
    <Layer id={id}>
      <Rect id={`${id}-bg`} width={SW} height={SH} fill={linearGradient(['#1f2a22', '#121714'], { angle: 180 })} />
      <StatusBar id={`${id}-sb`} color="#fff" font={st.font} />
      <Text id={`${id}-h`} font={st.font} weight={600} size={30} color="#fff" x={28} y={92} lineHeight={1.05}>
        Today
      </Text>
      <Text id={`${id}-s`} font={st.font} weight={400} size={14} color="#93a096" x={28} y={132} lineHeight={1}>
        Thursday, four sessions
      </Text>
      {items.map(([time, name, len], i) => {
        const y = 188 + i * 108;
        const k = ease(prog(t, 0.1 + i * 0.12, 0.55 + i * 0.12));
        const hot = i === 0;
        return (
          <Layer key={name} id={`${id}-i${i}`} x={28 + (1 - k) * 24} y={y} opacity={k}>
            <Rect id={`${id}-i${i}-bg`} width={SW - 56} height={92} radius={22} fill={hot ? st.accent : '#2a342d'} />
            <Text id={`${id}-i${i}-t`} font={st.font} weight={500} size={12} color={hot ? '#3c4a10' : '#93a096'} x={20} y={18} lineHeight={1}>
              {time}
            </Text>
            <Text id={`${id}-i${i}-n`} font={st.font} weight={600} size={22} color={hot ? st.ink : '#fff'} x={20} y={42} lineHeight={1}>
              {name}
            </Text>
            <Text id={`${id}-i${i}-l`} font={st.font} weight={500} size={13} color={hot ? '#3c4a10' : '#93a096'} x={SW - 56 - 76} y={46} lineHeight={1}>
              {len}
            </Text>
          </Layer>
        );
      })}
    </Layer>
  );
};

// ---- the picker ------------------------------------------------------------------------------------------------

/** What a `screen` prop says: a built-in name, or a path to an image under `public/`. */
export const Screen: React.FC<{ id: string; screen: string; st: ScreenStyle; t?: number }> = ({ id, screen, st, t = 1 }) => {
  switch (screen) {
    case 'hero':
      return <Hero id={id} st={st} t={t} />;
    case 'dashboard':
      return <Dashboard id={id} st={st} t={t} />;
    case 'chart':
      return <Chart id={id} st={st} t={t} />;
    case 'plan':
      return <Plan id={id} st={st} t={t} />;
    default:
      return (
        <Layer id={id}>
          <Image id={`${id}-img`} src={staticFile(screen)} width={SW} height={SH} fit="cover" />
          <Rect id={`${id}-top`} width={SW} height={110} fill={linearGradient(['#00000066', '#00000000'], { angle: 180 })} />
          <StatusBar id={`${id}-sb`} color="#fff" font={st.font} />
        </Layer>
      );
  }
};

/** Whether a screen is dark under the home bar, for its colour. */
export const barOn = (screen: string) => (screen === 'chart' || screen === 'hero' ? '#18191b' : '#ffffff');
export { clamp };
