// A drawn desktop app for the laptop screen (made-up "Orbit" analytics: no brand). Drawn in the screen box, LSW x LSH.

import React from 'react';
import { Ellipse, Image, Layer, Path, Rect, Text, linearGradient, staticFile } from '@kinetographdev/core';
import type { Stroke } from '@kinetographdev/core';
import { LSH, LSW } from './devices.js';
import { ease, prog } from './lib.js';

const line = (color: string, width: number): Stroke => ({ color, width, cap: 'round', join: 'round' }) as unknown as Stroke;

export interface DesktopStyle {
  font: string;
  accent: string;
  ink: string;
}

export const Desktop: React.FC<{ id: string; screen: string; st: DesktopStyle; t: number }> = ({ id, screen, st, t }) => {
  if (screen !== 'desk') {
    return <Image id={`${id}-img`} src={staticFile(screen)} width={LSW} height={LSH} fit="cover" />;
  }
  const side = 74;
  const cards: [string, string, string][] = [
    ['Sessions', '48,210', '+12.4%'],
    ['Active now', '1,284', '+3.1%'],
    ['Conversion', '6.8%', '+0.9%'],
  ];
  const pts = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i): [number, number] => [
    side + 44 + i * 84,
    470 - 30 * Math.sin(i * 0.6) - i * 9 - 18 * Math.sin(i * 1.7),
  ]);
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const mx = (pts[i - 1][0] + pts[i][0]) / 2;
    d += ` C${mx} ${pts[i - 1][1]} ${mx} ${pts[i][1]} ${pts[i][0]} ${pts[i][1]}`;
  }
  const reveal = ease(prog(t, 0.2, 0.9));
  return (
    <Layer id={id}>
      <Rect id={`${id}-bg`} width={LSW} height={LSH} fill="#f5f4f0" />
      <Rect id={`${id}-side`} width={side} height={LSH} fill="#17181a" />
      <Ellipse id={`${id}-logo`} x={22} y={26} width={30} height={30} fill={st.accent} />
      {[0, 1, 2, 3, 4].map((i) => (
        <Rect key={i} id={`${id}-nav${i}`} x={24} y={100 + i * 54} width={26} height={26} radius={8} fill={i === 0 ? '#ffffff' : '#ffffff33'} />
      ))}
      <Text id={`${id}-h`} font={st.font} weight={600} size={30} color={st.ink} x={side + 36} y={30} lineHeight={1}>
        Overview
      </Text>
      <Text id={`${id}-hs`} font={st.font} weight={400} size={14} color="#7b7d78" x={side + 36} y={68} lineHeight={1}>
        Last 30 days, all channels
      </Text>
      <Rect id={`${id}-pill`} x={LSW - 190} y={28} width={150} height={38} radius={19} fill="#fff" stroke={{ color: '#00000012', width: 1 }} />
      <Text id={`${id}-pt`} font={st.font} weight={500} size={13} color={st.ink} x={LSW - 168} y={41} lineHeight={1}>
        Export report
      </Text>
      {cards.map(([a, b, c], i) => {
        const w = (LSW - side - 72 - 2 * 20) / 3;
        const k = ease(prog(t, 0.05 + i * 0.1, 0.5 + i * 0.1));
        return (
          <Layer key={a} id={`${id}-c${i}`} x={side + 36 + i * (w + 20)} y={110 + (1 - k) * 16} opacity={k}>
            <Rect id={`${id}-c${i}-bg`} width={w} height={116} radius={18} fill="#fff" stroke={{ color: '#0000000d', width: 1 }} />
            <Text id={`${id}-c${i}-a`} font={st.font} weight={400} size={13} color="#7b7d78" x={20} y={20} lineHeight={1}>
              {a}
            </Text>
            <Text id={`${id}-c${i}-b`} font={st.font} weight={600} size={36} color={st.ink} x={20} y={46} lineHeight={1}>
              {b}
            </Text>
            <Rect id={`${id}-c${i}-p`} x={20} y={90} width={62} height={20} radius={10} fill={`${st.accent}`} />
            <Text id={`${id}-c${i}-t`} font={st.font} weight={600} size={11} color="#3c4a10" x={30} y={95} lineHeight={1}>
              {c}
            </Text>
          </Layer>
        );
      })}
      <Rect id={`${id}-panel`} x={side + 36} y={254} width={LSW - side - 72} height={LSH - 254 - 36} radius={20} fill="#fff" stroke={{ color: '#0000000d', width: 1 }} />
      <Text id={`${id}-pn`} font={st.font} weight={600} size={16} color={st.ink} x={side + 60} y={276} lineHeight={1}>
        Sessions over time
      </Text>
      {[0, 1, 2, 3].map((i) => (
        <Rect key={i} id={`${id}-gl${i}`} x={side + 56} y={336 + i * 66} width={LSW - side - 112} height={1} fill="#00000010" />
      ))}
      <Layer id={`${id}-plot`} clip={{ kind: 'path', d: `M0 0H${(side + 44 + 924 * reveal).toFixed(1)}V${LSH}H0Z` }}>
        <Path id={`${id}-area`} d={`${d} L${pts[11][0]} 520 L${pts[0][0]} 520Z`} fill={linearGradient([[0, `${st.accent}aa`], [1, `${st.accent}00`]], { angle: 180 })} />
        <Path id={`${id}-line`} d={d} stroke={line('#8da02f', 3)} />
      </Layer>
    </Layer>
  );
};
