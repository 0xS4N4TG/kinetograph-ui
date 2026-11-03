// The three feed pictures of shots 12 to 14, drawn here so the reel carries no one else's photos: green hills under a
// teal sky (with the "pressed this Button" line), a dark motion-graphics editor, and a warm backlit portrait.
// Each fills a box POST.width wide; pass `src` (a file in public/media/) to show your own picture instead.

import React from 'react';
import { measureText } from '@remotion/layout-utils';
import { random } from 'remotion';
import {
  Ellipse,
  Image,
  Layer,
  Path,
  Rect,
  Text,
  blur,
  brightness,
  glow,
  linearGradient,
  radialGradient,
} from '@kinetographdev/core';
import { BLUE, Hand, UI, line } from '../lib.js';
import { POST } from '../post.js';

const PW = POST.width;

// ---- hills ----

/** Where the Button chip sits in the hills picture: the picture zooms about this point. */
export const BUTTON = { x: 321, y: 168 };
const LINE = "We've all pressed this";

function hill(y0: number, amp: number, phase: number, freq: number, h: number) {
  let d = `M-20 ${h + 20} L-20 ${y0}`;
  for (let x = -20; x <= PW + 20; x += 10) {
    const y =
      y0 -
      amp * Math.sin((x / PW) * Math.PI * freq + phase) -
      amp * 0.4 * Math.sin((x / PW) * Math.PI * freq * 2.3 + phase * 1.7);
    d += ` L${x} ${y.toFixed(1)}`;
  }
  return `${d} L${PW + 20} ${h + 20} Z`;
}

export const Hills: React.FC<{
  h: number;
  zoom?: number;
  chip?: number; // 0..1: the Button chip fades in
  pan?: number; // picture px the zoomed picture slides right
  press?: number; // 0..1: the hand presses
  hand?: [number, number]; // the hand's fingertip, picture px
  src?: string;
}> = ({ h, zoom = 1, chip = 0, pan = 0, press = 0, hand = [147, 218], src }) => {
  const specks = Array.from({ length: 140 }, (_, i) => {
    const x = random(`speck-x-${i}`) * PW;
    const y = h * 0.55 + random(`speck-y-${i}`) * h * 0.45;
    const r = 1.2 + random(`speck-r-${i}`) * 2.2 * ((y - h * 0.5) / (h * 0.5));
    const c = ['#e2683a', '#f0a24a', '#d8413c', '#f2d36b'][Math.floor(random(`speck-c-${i}`) * 4)];
    return <Ellipse key={i} x={x} y={y} width={r * 2} height={r * 1.4} fill={c} opacity={0.85} />;
  });
  return (
    <Layer x={BUTTON.x + pan} y={BUTTON.y} scale={zoom}>
      <Layer x={-BUTTON.x} y={-BUTTON.y}>
        {src ? (
          <Image src={src} width={PW} height={h} fit="cover" />
        ) : (
          <Layer effects={[blur(1.6)]}>
            <Rect
              width={PW}
              height={h}
              fill={linearGradient(['#164d60', '#2f7480', '#7fb3a8', '#c9dcc0'], { angle: 180 })}
            />
            <Path
              d={hill(h * 0.5, 14, 0.4, 1.6, h)}
              fill={linearGradient(['#6f9c5a', '#3d6e33'], { angle: 180 })}
              opacity={0.85}
            />
            <Path d={hill(h * 0.58, 18, 2.1, 1.2, h)} fill={linearGradient(['#7fae4c', '#3f7a2a'], { angle: 180 })} />
            <Path
              d={hill(h * 0.72, 22, 4.0, 1.4, h)}
              fill={linearGradient(['#8fbd45', '#4b8a2b', '#2f6421'], { angle: 180 })}
            />
            <Path d={hill(h * 0.87, 16, 1.1, 2.1, h)} fill={linearGradient(['#86b83f', '#3c7425'], { angle: 180 })} />
            {specks}
          </Layer>
        )}
        {/* the line runs up to the chip and on past it, as on the reference ("this [Button] b...") */}
        <Text
          font={UI}
          weight={500}
          size={21}
          color="#ffffffee"
          x={BUTTON.x - 39 - measureText({ text: LINE, fontFamily: UI, fontSize: 21, fontWeight: '500' }).width}
          y={BUTTON.y - 13}
          effects={[glow({ radius: 6, color: '#00000055' })]}
        >
          {LINE}
        </Text>
        <Text
          font={UI}
          weight={500}
          size={21}
          color="#ffffffee"
          x={BUTTON.x + 39}
          y={BUTTON.y - 13}
          opacity={chip}
          effects={[glow({ radius: 6, color: '#00000055' })]}
        >
          before
        </Text>
        <Layer x={BUTTON.x - 33} y={BUTTON.y - 12} opacity={chip}>
          <Rect width={66} height={24} radius={5} fill={BLUE} />
          <Text font={UI} weight={600} size={14} color="#fff" x={0} y={4} maxWidth={66} align="center">
            Button
          </Text>
        </Layer>
        <Layer x={hand[0] - 4} y={hand[1] - press * 2}>
          <Hand size={20} pressed={press} />
        </Layer>
        <Text font={UI} weight={500} size={6} color="#ffffffaa" x={PW - 130} y={h - 12}>
          © All rights reserved by yourhandle
        </Text>
      </Layer>
    </Layer>
  );
};

// ---- editor ----

export const Editor: React.FC<{ h: number; src?: string }> = ({ h, src }) => {
  if (src) return <Image src={src} width={PW} height={h} fit="cover" />;
  const rows = 16;
  const top = h * 0.56;
  const bars = Array.from({ length: rows }, (_, i) => {
    const c = ['#d9536b', '#e88aa0', '#5cbf6a', '#e6d453', '#4d8fe0', '#c46ad8'][i % 6];
    const x0 = 210 + random(`bar-x-${i}`) * 40;
    const w = 120 + random(`bar-w-${i}`) * 140;
    return <Rect key={i} x={x0} y={top + 14 + i * 8.5} width={w} height={5} radius={1} fill={c} opacity={0.9} />;
  });
  const names = Array.from({ length: rows }, (_, i) => (
    <Layer key={i}>
      <Rect x={8} y={top + 14 + i * 8.5} width={40 + random(`nm-${i}`) * 30} height={3} fill="#8a8a90" />
      <Rect x={96} y={top + 14 + i * 8.5} width={14} height={3} fill="#5d5d62" />
      <Rect x={118} y={top + 14 + i * 8.5} width={22} height={3} fill="#5d5d62" />
      <Rect x={150} y={top + 14 + i * 8.5} width={30} height={3} fill="#5d5d62" />
    </Layer>
  ));
  const gx = 70;
  const gw = 190;
  const gh = h * 0.42;
  return (
    <Layer>
      <Rect width={PW} height={h} fill="#1b1b1e" />
      {/* menu strip */}
      <Rect width={PW} height={12} fill="#2a2a2e" />
      {Array.from({ length: 12 }, (_, i) => (
        <Rect key={i} x={8 + i * 38} y={4} width={22} height={3} fill="#77777d" />
      ))}
      {/* project panel */}
      <Rect x={4} y={16} width={gx - 8} height={gh} fill="#232327" />
      {Array.from({ length: 9 }, (_, i) => (
        <Rect key={i} x={10} y={24 + i * 12} width={30 + (i % 3) * 8} height={3} fill="#6d6d73" />
      ))}
      {/* graph editor */}
      <Rect x={gx} y={16} width={gw} height={gh} fill="#18181b" stroke={line({ color: '#3a3a40', width: 1 })} />
      <Rect x={gx} y={16} width={gw} height={8} fill={BLUE} opacity={0.8} />
      {Array.from({ length: 7 }, (_, i) => (
        <Path
          key={i}
          d={`M${gx} ${30 + i * ((gh - 20) / 7)} H${gx + gw}`}
          stroke={line({ color: '#2b2b30', width: 1 })}
        />
      ))}
      <Path
        d={`M${gx + 12} ${16 + gh - 14} C${gx + gw * 0.55} ${16 + gh - 14} ${gx + gw * 0.45} ${30} ${gx + gw - 12} ${30}`}
        stroke={line({ color: '#f1e7b0', width: 1.8, cap: 'round' })}
      />
      <Rect x={gx + 10} y={16 + gh - 16} width={4} height={4} fill="#f1e7b0" />
      <Rect x={gx + gw - 14} y={28} width={4} height={4} fill="#f1e7b0" />
      {Array.from({ length: 6 }, (_, i) => (
        <Path key={i} d={`M${gx + gw - 26} ${40 + i * 18} l6 -8 l6 8`} stroke={line({ color: '#9a9aa0', width: 1 })} />
      ))}
      {/* preview */}
      <Rect x={gx + gw + 8} y={16} width={PW - gx - gw - 12} height={gh} fill="#2a2a2e" />
      <Rect x={gx + gw + 18} y={28} width={170} height={gh - 30} fill="#f4f4f4" />
      <Rect x={gx + gw + 22} y={34} width={60} height={16} fill="#7aa9ef" />
      <Rect x={gx + gw + 22} y={54} width={44} height={16} fill="#7aa9ef" />
      <Rect x={gx + gw + 22} y={78} width={70} height={8} fill="#7aa9ef" />
      <Rect
        x={gx + gw + 84}
        y={34}
        width={98}
        height={70}
        fill={linearGradient(['#3d8ee8', '#9cc8f0', '#ffffff'], { angle: 180 })}
      />
      <Path d={`M${gx + gw + 150} ${118} q14 -10 26 0`} stroke={line({ color: '#c4122f', width: 1.4, cap: 'round' })} />
      <Rect x={gx + gw + 26} y={96} width={60} height={2} fill="#9a9aa0" />
      <Rect x={gx + gw + 26} y={101} width={50} height={2} fill="#9a9aa0" />
      {/* timeline */}
      <Rect y={top} width={PW} height={h - top} fill="#151517" />
      <Rect y={top} width={PW} height={8} fill="#26262a" />
      <Rect x={200} y={top} width={2} height={h - top} fill="#4d8fe0" />
      {names}
      {bars}
    </Layer>
  );
};

// ---- golden portrait ----

/** A warm, hazy portrait of my own: someone with long wavy hair seen from behind, lit from the back, in a wood. */
export const Golden: React.FC<{ h: number; push?: number; src?: string }> = ({ h, push = 1, src }) => {
  if (src)
    return (
      // the photo, pushed in from its centre and warmed towards the reference's gold
      <Layer clip={{ kind: 'path', d: `M0 0H${PW}V${h}H0Z` }}>
        <Layer x={PW / 2} y={h / 2} scale={push}>
          <Image src={src} x={-PW / 2} y={-h / 2} width={PW} height={h} fit="cover" effects={[brightness(0.5), blur(1.2)]} />
        </Layer>
        <Rect width={PW} height={h} fill="#e8901a" opacity={0.42} />
        <Rect
          width={PW}
          height={h}
          fill={radialGradient([
            [0.45, 'rgba(0,0,0,0)'],
            [1, 'rgba(20,10,0,0.7)'],
          ])}
        />
      </Layer>
    );
  const bokeh = Array.from({ length: 20 }, (_, i) => {
    const x = random(`bk-x-${i}`) * PW;
    const y = random(`bk-y-${i}`) * h * 0.85;
    const r = 14 + random(`bk-r-${i}`) * 26;
    const a = 0.12 + random(`bk-a-${i}`) * 0.4;
    return (
      <Ellipse
        key={i}
        x={x - r}
        y={y - r * 0.7}
        width={r * 2}
        height={r * 1.4}
        fill={radialGradient([
          [0, `rgba(255,214,120,${a})`],
          [1, 'rgba(255,200,90,0)'],
        ])}
      />
    );
  });
  // dappled foliage: dark leaf masses and a few hot spots of sun through them
  const leaves = Array.from({ length: 26 }, (_, i) => {
    const x = random(`lf-x-${i}`) * PW;
    const y = random(`lf-y-${i}`) * h;
    const r = 30 + random(`lf-r-${i}`) * 50;
    return (
      <Ellipse
        key={i}
        x={x - r}
        y={y - r * 0.6}
        width={r * 2}
        height={r * 1.2}
        fill={radialGradient([
          [0, 'rgba(38,40,10,0.55)'],
          [1, 'rgba(38,40,10,0)'],
        ])}
      />
    );
  });
  // the figure: long wavy hair seen from behind, backlit from the top right. A bright copy of the silhouette with a
  // darker copy over it, nudged down and left, leaves a lit rim on the light's side.
  const hairOutline = (() => {
    const pts: string[] = [];
    // down the left side, round the bottom, up the right side, over the head
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const x = 222 - t * 40 + 9 * Math.sin(t * 19 + 1) + 4 * Math.sin(t * 41);
      pts.push(`${x.toFixed(1)} ${(205 + t * 245).toFixed(1)}`);
    }
    for (let i = 0; i <= 24; i++) {
      const t = 1 - i / 24;
      const x = 322 + t * 44 + 10 * Math.sin(t * 17 + 2) + 4 * Math.sin(t * 37 + 1);
      pts.push(`${x.toFixed(1)} ${(205 + t * 245).toFixed(1)}`);
    }
    for (let i = 1; i < 16; i++) {
      const a = Math.PI * (i / 16);
      pts.push(`${(272 + 52 * Math.cos(a)).toFixed(1)} ${(208 - 62 * Math.sin(a) + 3 * Math.sin(i * 2.3)).toFixed(1)}`);
    }
    return `M${pts.join(' L')} Z`;
  })();
  const curls = Array.from({ length: 16 }, (_, i) => {
    const x = 236 + random(`cu-x-${i}`) * 100;
    const y = 190 + random(`cu-y-${i}`) * 230;
    const lit = Math.max(0.15, Math.min(1, (x - 230) / 110)) * (1 - (y - 190) / 400);
    return (
      <Layer key={i} x={x} y={y} rotation={-30 + random(`cu-r-${i}`) * 60} opacity={lit}>
        <Path d="M0 0 A9 7 0 0 1 16 3" stroke={line({ color: '#fff0c6', width: 2.6, cap: 'round' })} />
      </Layer>
    );
  });
  return (
    <Layer x={PW / 2} y={h / 2} scale={push}>
      <Layer x={-PW / 2} y={-h / 2}>
        <Layer effects={[blur(4)]}>
          <Rect
            width={PW}
            height={h}
            fill={linearGradient(['#3c3810', '#7a6b20', '#b48c34', '#463a12'], { angle: 210 })}
          />
          <Ellipse
            x={180}
            y={-160}
            width={420}
            height={420}
            fill={radialGradient([
              [0, 'rgba(255,214,110,0.95)'],
              [0.5, 'rgba(220,170,60,0.4)'],
              [1, 'rgba(200,150,50,0)'],
            ])}
          />
          {leaves}
          {bokeh}
          {/* shoulders and back */}
          <Path
            d={`M150 ${h + 10} C160 ${h * 0.84} 200 ${h * 0.84} 230 ${h * 0.8} L330 ${h * 0.8} C366 ${h * 0.82} 392 ${h * 0.88} 400 ${h + 10} Z`}
            fill={linearGradient(['#ffd27a', '#a8712a', '#4e3410'], { angle: 250 })}
          />
          <Layer x={272} y={330} scale={1.3} effects={[glow({ radius: 24, color: '#ffbf55', intensity: 1.1 })]}>
            <Layer x={-272} y={-330}>
              <Path d={hairOutline} fill="#ffe7a8" />
              <Layer x={-9} y={10} effects={[blur(5)]}>
                <Path
                  d={hairOutline}
                  fill={radialGradient(
                    [
                      [0, '#f2bb5c'],
                      [0.45, '#b07a2a'],
                      [1, '#5e3c12'],
                    ],
                    { cx: 0.75, cy: 0.1, r: 0.9 },
                  )}
                />
              </Layer>
              {curls}
            </Layer>
          </Layer>
        </Layer>
      </Layer>
    </Layer>
  );
};
