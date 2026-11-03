// Pointers: the screen cursor, a tapping hand, a fat flat block arrow, and the same arrow extruded in 3D.

import React from 'react';
import { Layer, Path, blur, dropShadow } from '@kinetographdev/core';
import { line } from './draw.js';

/** A chunky screen cursor, tip at (0, 0). */
export const Arrow: React.FC<{ size?: number; color?: string; outline?: string }> = ({ size = 28, color = '#fff', outline = '#111' }) => (
  <Layer scale={size / 24} effects={[dropShadow({ y: 1, blur: 1.5, color: '#00000055' })]}>
    <Path
      d="M2.6 2.2L2.6 19 6.9 15.3 9.8 21.6 12.9 20.3 10.1 14.2 16.2 14.2Z"
      fill={color}
      stroke={line({ color: outline, width: 1.6, join: 'round' })}
    />
  </Layer>
);

/** A pointing hand; pressed 0..1 shrinks it a little, as a tap. */
export const Hand: React.FC<{ size?: number; pressed?: number }> = ({ size = 34, pressed = 0 }) => (
  <Layer scale={(size / 24) * (1 - pressed * 0.08)}>
    <Path
      d="M8.6 12.8V4.4A1.6 1.6 0 0 1 11.8 4.4V10.6 9.4A1.6 1.6 0 0 1 15 9.4V11 10.3A1.6 1.6 0 0 1 18.2 10.3V11.8 11.6A1.5 1.5 0 0 1 21.2 11.6V16.4C21.2 20 18.8 22.6 15.4 22.6H13.2C11.2 22.6 9.9 21.8 8.7 20.3L4.6 15.2A1.6 1.6 0 0 1 6.9 12.9Z"
      fill="#fff"
      stroke={line({ color: '#111', width: 1.3, join: 'round' })}
    />
  </Layer>
);

// the block arrow both pointers share: tip at (0, 0) pointing right, tail at x = -100 (units)
const BLOCK: [number, number][] = [
  [0, 0], [-44, -30], [-44, -13], [-90, -11], [-97, -8], [-100, 0], [-97, 8], [-90, 11], [-44, 13], [-44, 30],
];
const poly = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ') + 'Z';

/** A fat white block arrow with soft round edges and no outline, tip at (0, 0) pointing right. */
export const FlatArrow: React.FC<{ size: number }> = ({ size }) => (
  <Layer scale={size / 100} effects={[dropShadow({ y: 2, blur: 3, color: '#00000040' })]}>
    <Path d={poly(BLOCK)} fill="#fbfbfb" stroke={line({ color: '#fbfbfb', width: 9, join: 'round' })} effects={[blur(1.2)]} />
  </Layer>
);

/** The block arrow extruded, seen in perspective (yawed and tilted towards the viewer), tip at (0, 0) pointing
 *  right. It spins about its long axis: spin 0 (or 180) shows the white face, 90 the dark edge. */
export const BigArrow: React.FC<{ size: number; spin?: number; yaw?: number; tilt?: number }> = ({
  size,
  spin = 0,
  yaw = -24,
  tilt = 26,
}) => {
  const k = size / 100;
  const depth = 16;
  const focal = 340;
  const ra = (spin * Math.PI) / 180;
  const rb = (yaw * Math.PI) / 180;
  const rc = (tilt * Math.PI) / 180;
  // rotate about the long (x) axis by spin, then the fixed tilt (about x) and yaw (about y), then project
  const project = ([x, y]: [number, number], z: number): [number, number, number] => {
    let y1 = y * Math.cos(ra) - z * Math.sin(ra);
    let z1 = y * Math.sin(ra) + z * Math.cos(ra);
    const y2 = y1 * Math.cos(rc) - z1 * Math.sin(rc);
    const z2 = y1 * Math.sin(rc) + z1 * Math.cos(rc);
    y1 = y2;
    z1 = z2;
    const x3 = x * Math.cos(rb) + z1 * Math.sin(rb);
    const z3 = -x * Math.sin(rb) + z1 * Math.cos(rb);
    const sc = focal / (focal - z3);
    return [x3 * sc, y1 * sc, z3];
  };
  const front = BLOCK.map((p) => project(p, depth / 2));
  const back = BLOCK.map((p) => project(p, -depth / 2));
  const xy = (pts: [number, number, number][]) => pts.map(([x, y]) => [x, y] as [number, number]);
  // which face looks at us: the front's normal (0, 0, 1) after the turns
  const nz = Math.cos(ra) * Math.cos(rc) * Math.cos(rb) - Math.sin(ra) * Math.sin(rc) * Math.cos(rb);
  const [near, far] = nz >= 0 ? [front, back] : [back, front];
  const faceTone = nz >= 0 ? '#ffffff' : '#ececf0';
  const sides = BLOCK.map((_, i) => {
    const j = (i + 1) % BLOCK.length;
    const quad = [front[i], front[j], back[j], back[i]];
    return { quad, z: quad.reduce((a, q) => a + q[2], 0) / 4 };
  }).sort((a, b) => a.z - b.z);
  return (
    <Layer scale={k}>
      <Layer x={10} y={18} opacity={0.32}>
        <Path d={poly(xy(near))} fill="#000" effects={[blur(7)]} />
      </Layer>
      <Path d={poly(xy(far))} fill="#36363a" stroke={line({ color: '#36363a', width: 2, join: 'round' })} />
      {sides.map((sd, i) => (
        <Path key={i} d={poly(xy(sd.quad))} fill="#3c3c41" stroke={line({ color: '#3c3c41', width: 1.6, join: 'round' })} />
      ))}
      <Path
        d={poly(xy(near))}
        fill={faceTone}
        stroke={line({ color: '#26262a', width: 3.4, join: 'round' })}
        opacity={Math.min(1, Math.abs(nz) * 5)}
      />
    </Layer>
  );
};
