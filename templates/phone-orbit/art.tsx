// Small drawn pictures: icons, emoji stand-ins and portrait stand-ins. Nothing here is a third-party picture; the
// portraits, logo and photos each have a `src` slot for the user's own.

import React from 'react';
import { staticFile } from 'remotion';
import { Ellipse, Image, Layer, Path, Rect, linearGradient, radialGradient } from '@kinetographdev/core';
import { stroke } from './lib.js';

export const srcOf = (file: string | undefined) => (file ? staticFile(file) : undefined);

/** whether a picture slot holds a video file (by extension) rather than a still */
export const isVideo = (file: string | undefined) => !!file && /\.(mp4|webm|mov)(\?.*)?$/i.test(file);

const HEART = 'M12 21.3L10.6 20C5.4 15.3 2 12.2 2 8.4C2 5.3 4.4 3 7.4 3C9.2 3 10.9 3.8 12 5.1C13.1 3.8 14.8 3 16.6 3C19.6 3 22 5.3 22 8.4C22 12.2 18.6 15.3 13.4 20L12 21.3Z';

/** a red heart in a 24-unit box, drawn at `size` px, centred on (0, 0) */
export const Heart: React.FC<{ size: number; color?: string }> = ({ size, color = '#ff2d4d' }) => (
  <Layer scale={size / 24} x={-size / 2} y={-size / 2}>
    <Path d={HEART} fill={linearGradient(['#ff5a73', color, '#d80f33'])} />
  </Layer>
);

/** a flame, centred on (0, 0) */
export const Flame: React.FC<{ size: number }> = ({ size }) => (
  <Layer scale={size / 24} x={-size / 2} y={-size / 2}>
    <Path
      d="M12.4 1.5C13 5 17.5 7.6 17.5 13.4C17.5 17.4 15.2 21.5 12 21.5C8.6 21.5 6.5 18.6 6.5 15.4C6.5 13.2 7.5 11.7 8.6 10.6C8.8 12 9.4 12.8 10.2 13C9.5 9.2 10.4 4.6 12.4 1.5Z"
      fill={linearGradient(['#ffd33d', '#ff8a1f', '#f2430d'], { angle: 0 })}
    />
    <Path
      d="M12.2 12.5C13.6 14 14.6 15.4 14.6 17.4C14.6 19 13.6 20.4 12.2 20.4C10.8 20.4 9.8 19.2 9.8 17.8C9.8 16 11.2 14.6 12.2 12.5Z"
      fill={linearGradient(['#fff1a8', '#ffc24a'], { angle: 0 })}
    />
  </Layer>
);

/** a smiling face with heart eyes, centred on (0, 0) */
export const HeartEyes: React.FC<{ size: number }> = ({ size }) => (
  <Layer scale={size / 24} x={-size / 2} y={-size / 2}>
    <Ellipse width={24} height={24} fill={radialGradient(['#ffd84a', '#f6a91c'], { cx: 0.4, cy: 0.35, r: 0.8 })} />
    <Layer x={2.6} y={6.4} scale={0.34}>
      <Path d={HEART} fill="#e0172f" />
    </Layer>
    <Layer x={13} y={6.4} scale={0.34}>
      <Path d={HEART} fill="#e0172f" />
    </Layer>
    <Path d="M6.4 14C7.6 17.4 16.4 17.4 17.6 14Z" fill="#7a2a14" />
    <Path d="M8.2 15.1C9.8 16.3 14.2 16.3 15.8 15.1Z" fill="#fff" />
  </Layer>
);

/** a small rocket pointing up and to the right, centred on (0, 0) */
export const Rocket: React.FC<{ size: number }> = ({ size }) => (
  <Layer scale={size / 24} x={-size / 2} y={-size / 2}>
    <Layer x={12} y={12} rotation={45}>
      <Layer x={-12} y={-12}>
        <Path d="M12 20.5C10.8 22.2 10.8 23.6 12 24.4C13.2 23.6 13.2 22.2 12 20.5Z" fill="#ff8a1f" />
        <Path d="M8.6 14.4L5.6 18.4L9 17.8Z M15.4 14.4L18.4 18.4L15 17.8Z" fill="#e8344a" />
        <Path d="M12 1C15.6 4 16.2 9.6 15.2 18.6H8.8C7.8 9.6 8.4 4 12 1Z" fill={linearGradient(['#f4f6fb', '#aeb6c8'], { angle: 90 })} />
        <Path d="M12 1C13.4 2.2 14.4 3.8 14.9 5.6H9.1C9.6 3.8 10.6 2.2 12 1Z" fill="#e8344a" />
        <Ellipse x={10} y={8.2} width={4} height={4} fill="#3b82f6" stroke={stroke('#5a6378', 0.6)} />
      </Layer>
    </Layer>
  </Layer>
);

/** the app logo: a rounded square with a video-camera glyph (or the user's picture), top-left at (0, 0) */
export const Logo: React.FC<{ size: number; color: string; src?: string }> = ({ size, color, src }) => {
  if (src) return <Image src={src} width={size} height={size} fit="cover" clip={{ kind: 'inset', radius: size * 0.28 }} />;
  const k = size / 32;
  return (
    <Layer scale={k}>
      <Rect width={32} height={32} radius={9} fill={color} />
      <Rect x={6} y={9.5} width={14.5} height={13} radius={3.4} fill="#fff" />
      <Path d="M21.5 14.2L26.6 10.8V21.2L21.5 17.8Z" fill="#fff" />
    </Layer>
  );
};

/** the blue verified badge, top-left at (0, 0) */
export const Verified: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <Layer scale={size / 20}>
    <Ellipse width={20} height={20} fill={color} />
    <Path d="M5.6 10.4L8.7 13.4L14.4 7.2" stroke={stroke('#fff', 2, { cap: 'round', join: 'round' })} />
  </Layer>
);

interface Portrait {
  bg: [string, string];
  skin: [string, string];
  hair: string;
  hairHi: string;
  top: string;
  /** hair: 'long' falls past the shoulders, 'short' stays on the head, 'swept' falls to one side */
  style: 'long' | 'short' | 'swept';
  lips: string;
  smile: boolean;
  stubble: boolean;
  stripes?: boolean;
}

const PORTRAITS: Portrait[] = [
  { bg: ['#d9d6c0', '#2c3a34'], skin: ['#f0cdb0', '#d9a688'], hair: '#7a4a2a', hairHi: '#a8703f', top: '#27324a', style: 'long', lips: '#bf6a66', smile: false, stubble: false, stripes: true },
  { bg: ['#55565c', '#2a2b30'], skin: ['#ebc6a8', '#cf9f80'], hair: '#9a6a40', hairHi: '#c99060', top: '#18181b', style: 'swept', lips: '#b4605e', smile: false, stubble: false },
  { bg: ['#eceef0', '#c9ced3'], skin: ['#f1cfb2', '#dba98a'], hair: '#3b2c25', hairHi: '#5a4337', top: '#15171b', style: 'short', lips: '#c0706a', smile: true, stubble: false },
  { bg: ['#1b1e22', '#0b0c0e'], skin: ['#d3a583', '#a9795a'], hair: '#241a14', hairHi: '#3b2c22', top: '#2b2e29', style: 'short', lips: '#9a5a50', smile: false, stubble: true },
];

/** a round portrait: the user's picture, or a drawn head and shoulders. Centred on (0, 0). */
export const Avatar: React.FC<{ size: number; src?: string; seed: number; ring?: string }> = ({ size, src, seed, ring = '#e9e9ee' }) => {
  const p = PORTRAITS[seed % PORTRAITS.length];
  const r = size / 2;
  const u = size / 100;
  const longHair = p.style === 'long';
  const swept = p.style === 'swept';
  return (
    <Layer x={-r} y={-r}>
      <Ellipse width={size} height={size} fill="#1a1a1c" />
      <Layer clip={{ kind: 'ellipse', cx: r, cy: r, rx: r, ry: r }}>
        {src ? (
          <Image src={src} width={size} height={size} fit="cover" />
        ) : (
          <Layer scale={u}>
            <Rect width={100} height={100} fill={linearGradient(p.bg, { angle: 150 })} />
            {/* hair behind the head */}
            {longHair && <Path d="M24 40C20 14 40 6 54 8C72 10 82 26 78 52C80 70 86 84 90 100H12C20 84 28 66 24 40Z" fill={p.hair} />}
            {swept && <Path d="M26 36C24 14 44 8 58 12C74 16 82 34 76 58C80 76 90 88 96 100H30C34 84 30 60 26 36Z" fill={p.hair} />}
            {/* shoulders and top */}
            <Path d="M6 100C8 82 26 74 50 74C74 74 92 82 94 100Z" fill={p.top} />
            {p.stripes && [78, 84, 90, 96].map((y) => <Rect key={y} x={4} y={y} width={46} height={2.4} fill="#e8e8ee" opacity={0.85} />)}
            {/* neck */}
            <Path d="M42 62H58L60 78C56 82 44 82 40 78Z" fill={p.skin[1]} />
            {/* head */}
            <Ellipse x={30} y={22} width={40} height={50} fill={linearGradient(p.skin, { angle: 100 })} />
            {p.stubble && <Path d="M32 52C34 68 66 68 68 52C64 58 36 58 32 52Z" fill="#2a1d16" opacity={0.3} />}
            {/* hair on the head */}
            <Path
              d={p.style === 'short' ? 'M29 38C26 14 40 10 50 10C62 10 74 16 71 38C68 28 64 24 50 24C38 24 32 28 29 38Z' : 'M29 36C28 14 42 10 52 11C64 12 74 20 71 38C66 26 56 22 46 24C38 26 32 28 29 36Z'}
              fill={p.hair}
            />
            <Path d="M36 16C44 12 56 12 64 18" stroke={stroke(p.hairHi, 2.4, { cap: 'round' })} opacity={0.7} />
            {/* face */}
            <Ellipse x={38.4} y={38} width={6.4} height={3} fill="#2a1d18" />
            <Ellipse x={55.2} y={38} width={6.4} height={3} fill="#2a1d18" />
            <Path d="M37 34Q41.5 32 46 34M54 34Q58.5 32 63 34" stroke={stroke(p.hair, 1.6, { cap: 'round' })} />
            <Path d="M50 40L48.5 49Q50 51 52.5 49" stroke={stroke('#b88a6e', 1.2, { cap: 'round' })} opacity={0.7} />
            {p.smile ? <Path d="M42 56Q50 63 58 56Q50 59 42 56Z" fill="#fff" stroke={stroke(p.lips, 1.2)} /> : <Path d="M44 56.5Q50 59.5 56 56.5" stroke={stroke(p.lips, 2.2, { cap: 'round' })} />}
            {/* hair in front of the shoulders */}
            {longHair && <Path d="M24 40C22 60 20 76 12 92L30 92C34 76 32 58 30 40Z M70 40C72 60 74 76 82 92L66 92C66 76 68 58 70 40Z" fill={p.hair} />}
            {swept && <Path d="M26 38C26 60 28 80 24 96L42 96C40 76 34 58 30 40Z M70 40C74 62 80 78 88 96L68 96C70 78 68 60 68 42Z" fill={p.hair} />}
          </Layer>
        )}
      </Layer>
      <Ellipse width={size} height={size} stroke={stroke(ring, Math.max(2, size * 0.022))} />
    </Layer>
  );
};
