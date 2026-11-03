// A stylised hand, drawn as clean flat shapes: one index finger out, the others curled, seen from behind. The fingertip
// is at the origin and the hand points up; the caller rotates it. `press` (0..1) squashes the fingertip: it widens, the
// pad flattens and the knuckles shift forward, so a touch reads as flesh meeting glass and not as a rigid stick.
// Light is from the top left: the left of each form is lighter, the right and the gaps between fingers darker.

import React from 'react';
import { Ellipse, Layer, Path, Rect, linearGradient } from '@kinetographdev/core';
import type { Stroke } from '@kinetographdev/core';

export interface HandTone {
  light: string;
  base: string;
  shade: string;
  nail: string;
}

export const skinTones: Record<string, HandTone> = {
  warm: { light: '#f3d6bd', base: '#e6c0a2', shade: '#c99673', nail: '#f4e3d8' },
  deep: { light: '#b98462', base: '#a06e4e', shade: '#7c5039', nail: '#d9b9a4' },
  pale: { light: '#f8e3d3', base: '#efcfb8', shade: '#d3a688', nail: '#f9ece4' },
};

const line = (color: string, width: number): Stroke => ({ color, width, cap: 'round', join: 'round' }) as unknown as Stroke;

/** the finger as a path: width w, the tip a half ellipse of height ry, running down to `len` */
const fingerPath = (w: number, ry: number, len: number) =>
  `M${-w / 2} ${len}V${ry}A${w / 2} ${ry} 0 0 1 ${w / 2} ${ry}V${len}Z`;

export const FINGER_W = 74;

export const Hand: React.FC<{ id: string; tone: HandTone; press?: number; silhouette?: boolean }> = ({ id, tone, press = 0, silhouette = false }) => {
  const w = FINGER_W * (1 + 0.1 * press);
  const ry = (FINGER_W / 2) * (1 - 0.34 * press);
  const push = 9 * press; // the hand behind the tip moves forward as the pad flattens
  const g = (a: string, b: string, angle = 90) => (silhouette ? '#000' : linearGradient([a, b], { angle }));
  const crease = silhouette ? undefined : line('#7a4a2e26', 2.2);
  return (
    <Layer id={id}>
      {/* palm and back of the hand */}
      <Layer id={`${id}-body`} y={push}>
        <Rect id={`${id}-palm`} x={-70} y={400} width={330} height={760} radius={110} fill={g(tone.base, tone.shade, 100)} />
        {/* thumb, tucked beside the index base */}
        <Rect id={`${id}-thumb`} x={-132} y={360} width={84} height={290} radius={42} rotation={-26} anchorX={42} anchorY={0}
          fill={g(tone.light, tone.base, 100)} />
        {/* curled fingers, nearest the index first: their tops show as rounded knuckles */}
        <Rect id={`${id}-f4`} x={176} y={304} width={66} height={330} radius={33} fill={g(tone.base, tone.shade, 100)} />
        <Rect id={`${id}-f3`} x={108} y={262} width={76} height={350} radius={38} fill={g(tone.base, tone.shade, 100)} />
        <Rect id={`${id}-f2`} x={36} y={236} width={80} height={380} radius={40} fill={g(tone.light, tone.shade, 100)} />
        {!silhouette ? (
          <>
            <Path id={`${id}-c1`} d="M114 300C112 400 112 470 116 560" stroke={crease} />
            <Path id={`${id}-c2`} d="M184 330C182 420 182 500 186 580" stroke={crease} />
            <Path id={`${id}-c3`} d="M-24 520C20 540 70 548 120 540" stroke={line('#7a4a2e1c', 2)} />
          </>
        ) : null}
      </Layer>
      {/* the index finger */}
      <Path id={`${id}-finger`} d={fingerPath(w, ry, 520)} fill={g(tone.light, tone.base, 90)} />
      {!silhouette ? (
        <>
          {/* shade down the right side, the form turning away from the light */}
          <Path id={`${id}-fshade`} d={fingerPath(w, ry, 520)} fill={linearGradient([[0, '#00000000'], [0.62, '#00000000'], [1, `${tone.shade}99`]], { angle: 90 })} />
          {/* nail */}
          <Rect id={`${id}-nail`} x={-w * 0.3} y={ry * 0.52 - press * 3} width={w * 0.6} height={58 - press * 6} radius={w * 0.24}
            fill={tone.nail} opacity={0.95} />
          <Rect id={`${id}-nailhi`} x={-w * 0.22} y={ry * 0.52 + 6 - press * 3} width={w * 0.16} height={34 - press * 4} radius={6} fill="#ffffff" opacity={0.35} />
          {/* knuckle creases */}
          <Path id={`${id}-k1`} d="M-14 196H14M-10 206H10" stroke={line('#7a4a2e30', 2.2)} />
          <Path id={`${id}-k2`} d="M-16 322H16M-11 332H11" stroke={line('#7a4a2e24', 2.2)} />
          {/* pad: the skin goes pale where it presses the glass */}
          <Ellipse id={`${id}-pad`} x={-w * 0.3} y={ry * 0.2} width={w * 0.6} height={ry * 0.9} fill="#ffffff" opacity={0.22 * press} />
        </>
      ) : null}
    </Layer>
  );
};
