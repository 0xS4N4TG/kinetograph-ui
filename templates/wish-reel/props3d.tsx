// The 3D props the reel scatters through its shots, built from the 3D layer's primitives: road signs, gems,
// gradient cards, ground rings, roman numerals, gradient crosses and white pillars. Every one faces +z at rest and
// is about one unit across.

import React from 'react';
import { staticFile } from 'remotion';
import { Extrude, Group3D, Mesh, Text3D } from '@kinetographdev/core';
import { JP, PAL, SANS, SERIF } from './lib.js';
import type { V3 } from './lib.js';

type Rot = V3;
interface Place {
  position: V3;
  rotation?: Rot;
  scale?: number | V3;
}

const flat = (color: string) => ({ color, unlit: true, doubleSided: true });
const DISC = { kind: 'cylinder' as const, radiusTop: 0.5, radiusBottom: 0.5, height: 0.05, segments: 40 };
const ARROW = 'M 0 -10 L 8 0 L 3 0 L 3 10 L -3 10 L -3 0 L -8 0 Z';
const PLUS = 'M -3 -9 L 3 -9 L 3 -3 L 9 -3 L 9 3 L 3 3 L 3 9 L -3 9 L -3 3 L -9 3 L -9 -3 L -3 -3 Z';

export type SignKind = 'speed' | 'blue' | 'stop' | 'warn' | 'park' | 'tomare' | 'nopark' | 'walk' | 'octa' | 'info';
export const SIGN_KINDS: SignKind[] = ['speed', 'blue', 'stop', 'warn', 'park', 'tomare', 'nopark', 'walk', 'octa', 'info', 'blue', 'walk'];
const TRI = 'M -10 -8.66 L 10 -8.66 L 0 8.66 Z';
const UP_TRI = 'M 0 -8 L 7 5 L -7 5 Z';

/** A Japanese road sign: a disc or a plate with its mark, facing +z. */
export const Sign: React.FC<Place & { kind: SignKind }> = ({ kind, position, rotation, scale }) => (
  <Group3D position={position} rotation={rotation} scale={scale}>
    {kind === 'speed' && (
      <>
        <Mesh geometry={DISC} rotation={[90, 0, 0]} material={flat('#ffffff')} />
        <Mesh geometry={{ kind: 'torus', radius: 0.44, tube: 0.07, ringSegments: 40 }} material={flat('#e8262f')} position={[0, 0, 0.03]} />
        <Text3D font={SANS} weight={700} size={0.42} depth={0.02} position={[0, 0, 0.04]} material={flat('#1b3fa8')}>
          40
        </Text3D>
      </>
    )}
    {kind === 'blue' && (
      <>
        <Mesh geometry={DISC} rotation={[90, 0, 0]} material={flat('#1d5fd6')} />
        <Extrude path={ARROW} size={0.6} depth={0.02} position={[0, 0, 0.04]} material={flat('#ffffff')} />
      </>
    )}
    {kind === 'stop' && (
      <>
        <Mesh geometry={DISC} rotation={[90, 0, 0]} material={flat('#e8262f')} />
        <Mesh geometry={{ kind: 'box', width: 0.62, height: 0.14, depth: 0.02 }} position={[0, 0, 0.04]} material={flat('#ffffff')} />
      </>
    )}
    {kind === 'warn' && (
      <>
        <Mesh geometry={{ kind: 'box', width: 0.72, height: 0.72, depth: 0.05 }} rotation={[0, 0, 45]} material={flat('#ffd21a')} />
        <Text3D font={SANS} weight={700} size={0.5} depth={0.02} position={[0, 0, 0.04]} material={flat('#111111')}>
          !
        </Text3D>
      </>
    )}
    {kind === 'park' && (
      <>
        <Mesh geometry={{ kind: 'box', width: 0.8, height: 0.8, depth: 0.05 }} material={flat('#1d5fd6')} />
        <Text3D font={SANS} weight={700} size={0.6} depth={0.02} position={[0, 0, 0.04]} material={flat('#ffffff')}>
          P
        </Text3D>
      </>
    )}
    {kind === 'tomare' && (
      <>
        <Extrude path={TRI} size={1} depth={0.05} material={flat('#e8262f')} />
        <Text3D font={JP} weight={700} size={0.2} depth={0.02} position={[0, 0.12, 0.05]} material={flat('#ffffff')}>
          止まれ
        </Text3D>
      </>
    )}
    {kind === 'nopark' && (
      <>
        <Mesh geometry={DISC} rotation={[90, 0, 0]} material={flat('#1d5fd6')} />
        <Mesh geometry={{ kind: 'torus', radius: 0.44, tube: 0.07, ringSegments: 40 }} material={flat('#e8262f')} position={[0, 0, 0.03]} />
        <Mesh geometry={{ kind: 'box', width: 0.84, height: 0.1, depth: 0.02 }} rotation={[0, 0, -45]} position={[0, 0, 0.04]} material={flat('#e8262f')} />
      </>
    )}
    {kind === 'walk' && (
      <>
        <Mesh geometry={{ kind: 'box', width: 0.8, height: 0.8, depth: 0.05 }} material={flat('#1d5fd6')} />
        <Extrude path={UP_TRI} size={0.62} depth={0.02} position={[0, 0, 0.04]} material={flat('#ffffff')} />
        <Mesh geometry={{ kind: 'box', width: 0.1, height: 0.22, depth: 0.02 }} position={[0, -0.02, 0.06]} material={flat('#111111')} />
      </>
    )}
    {kind === 'octa' && (
      <>
        <Mesh geometry={{ kind: 'cylinder', radiusTop: 0.5, radiusBottom: 0.5, height: 0.05, segments: 8 }} rotation={[90, 22.5, 0]} material={flat('#e8262f')} />
        <Text3D font={SANS} weight={700} size={0.28} depth={0.02} position={[0, 0, 0.04]} material={flat('#ffffff')}>
          STOP
        </Text3D>
      </>
    )}
    {kind === 'info' && (
      <>
        <Mesh geometry={{ kind: 'box', width: 1.3, height: 0.75, depth: 0.05 }} material={flat('#1d5fd6')} />
        <Mesh geometry={{ kind: 'box', width: 1.2, height: 0.65, depth: 0.03 }} position={[0, 0, 0.01]} material={flat('#ffffff')} />
        <Mesh geometry={{ kind: 'box', width: 1.12, height: 0.57, depth: 0.03 }} position={[0, 0, 0.02]} material={flat('#1d5fd6')} />
        <Extrude path={ARROW} size={0.4} depth={0.02} position={[-0.3, 0, 0.04]} material={flat('#ffffff')} />
        <Text3D font={JP} weight={700} size={0.16} depth={0.02} position={[0.22, 0.08, 0.04]} material={flat('#ffffff')}>
          江の島
        </Text3D>
        <Text3D font={SANS} weight={700} size={0.11} depth={0.02} position={[0.22, -0.12, 0.04]} material={flat('#ffffff')}>
          Enoshima
        </Text3D>
      </>
    )}
  </Group3D>
);

/** A faceted gem: two four-sided cones, lit so the faces catch the coloured lights. */
export const Gem: React.FC<Place & { color: string }> = ({ color, position, rotation, scale }) => {
  const mat = { color, roughness: 0.25, metallic: 0.1 };
  return (
    <Group3D position={position} rotation={rotation} scale={scale}>
      <Mesh geometry={{ kind: 'cylinder', radiusTop: 0, radiusBottom: 0.5, height: 0.7, segments: 4 }} position={[0, 0.35, 0]} material={mat} />
      <Mesh geometry={{ kind: 'cylinder', radiusTop: 0.5, radiusBottom: 0, height: 0.5, segments: 4 }} position={[0, -0.25, 0]} material={mat} />
    </Group3D>
  );
};

/** A thin card with one of the gradient textures, seen from both sides. */
export const Card: React.FC<Place & { grad: number; w?: number; h?: number }> = ({ grad, w = 1, h = 0.7, position, rotation, scale }) => (
  <Mesh
    geometry={{ kind: 'plane', width: w, height: h }}
    position={position}
    rotation={rotation}
    scale={scale}
    material={{ color: '#ffffff', texture: staticFile(`grad${grad % 6}.png`), unlit: true, doubleSided: true }}
  />
);

/** A flat ring lying on the ground. */
export const Ring: React.FC<Place & { color: string; r: number; tube?: number }> = ({ color, r, tube = 0.05, position, rotation, scale }) => (
  <Mesh
    geometry={{ kind: 'torus', radius: r, tube, ringSegments: 64, tubeSegments: 6 }}
    position={position}
    rotation={rotation ?? [90, 0, 0]}
    scale={scale ?? [1, 1, 0.15]}
    material={flat(color)}
  />
);

/** A roman numeral, white, upright. */
export const Numeral: React.FC<Place & { n: string; color?: string }> = ({ n, color = '#ffffff', position, rotation, scale }) => (
  <Text3D font={SERIF} weight={400} size={1} depth={0.04} position={position} rotation={rotation} scale={scale} material={{ color, unlit: true }}>
    {n}
  </Text3D>
);
export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

/** A puffy plus sign, lit by the scene's coloured lights so it reads as a gradient. */
export const Cross: React.FC<Place & { color: string; grad?: number }> = ({ color, grad = 1, position, rotation, scale }) => (
  <Extrude
    path={PLUS}
    size={1}
    depth={0.32}
    position={position}
    rotation={rotation}
    scale={scale}
    material={{ color, texture: staticFile(`grad${grad}.png`), roughness: 0.35 }}
  />
);

/** A white pole with a white ball on top. */
export const Pillar: React.FC<Place & { h: number }> = ({ h, position, rotation, scale }) => (
  <Group3D position={position} rotation={rotation} scale={scale}>
    <Mesh geometry={{ kind: 'cylinder', radiusTop: 0.09, radiusBottom: 0.09, height: h, segments: 16 }} position={[0, h / 2, 0]} material={flat(PAL.white)} />
    <Mesh geometry={{ kind: 'sphere', radius: 0.42 }} position={[0, h + 0.2, 0]} material={flat(PAL.white)} />
  </Group3D>
);
