// A greeting intro, timed to a measured 3.5 s UI promo: a gradient wordmark on a soft ground shrinks away as an app
// window grows in behind it; the camera pushes in tilted, types "Hello, <name>." and the question across the window in
// large perspective type, slides the suggestion cards in, then pulls back and flattens to the whole window with its
// prompt box. 1920x1080 at 60 fps.
//
// Everything you read on screen is a prop (brand, name, question, card labels, placeholder, caption, colours, font).
// The camera (camera.ts) is the reference's, tracked frame by frame and smoothed into keys; the content steps every
// second frame like the reference (the `step` prop). The window is drawn flat
// in ui.tsx; the camera tilts it with the layer's own 3D transform.
//
//   node ../kinetograph/packages/cli/dist/cli.js still templates/greeting-intro/index.tsx 120 --comp GreetingIntro -o out/f120.png
//   node ../kinetograph/packages/cli/dist/cli.js render templates/greeting-intro/index.tsx -o templates/greeting-intro/out/greeting-intro.mp4

import React from 'react';
import { z } from 'zod';
import { Composition, registerRoot, useCurrentFrame } from 'remotion';
import { Camera, Layer, Rect, Text, linearGradient, radialGradient } from '@kinetographdev/core';
import { measureText } from '@remotion/layout-utils';
import { camera } from './camera.js';
import { Window, useFont } from './ui.js';
import type { UiProps } from './ui.js';
import { ease, keys } from '../../kit/core/timing.js';

export const W = 1920;
export const H = 1080;
export const FPS = 60;
export const DURATION = 212;

const hex = z.string().describe('A CSS colour.');

export const greetingSchema = z.object({
  brand: z.string().describe('The wordmark, also the app name at the top of the window.'),
  name: z.string().describe('Who is greeted: "Hello, <name>."'),
  question: z.string().describe('The grey line under the greeting.'),
  cards: z.array(z.string()).min(1).max(4).describe('Suggestion card labels, left to right (up to four).'),
  placeholder: z.string().describe('Placeholder of the prompt box at the bottom of the window.'),
  caption: z.string().describe('Small grey line at the bottom left of the frame. Empty for none.'),
  font: z.string().describe('Google Fonts family for all type. The reference is set in Google Sans, which Google Fonts now carries.'),
  step: z.number().int().min(1).max(4).describe('Hold every N frames. 2 reproduces the reference, which is 30 fps content shown twice; 1 is smooth 60 fps.'),
  colors: z
    .object({
      ground: hex.describe('The pale ground behind the window.'),
      glowCool: hex.describe('Soft blur at the top left of the ground.'),
      glowWarm: hex.describe('Soft blur at the bottom right of the ground.'),
      window: hex,
      sidebar: hex,
      surface: hex.describe('Cards.'),
      field: hex.describe('Prompt box.'),
      ink: hex.describe('Dark type.'),
      muted: hex.describe('Grey type and icons.'),
      greetingStart: hex.describe('Left end of the gradient on the greeting.'),
      greetingEnd: hex.describe('Right end of the gradient on the greeting.'),
      wordmark: z.array(hex).min(2).describe('Gradient stops of the wordmark, left to right.'),
    })
    .describe('Colours.'),
});
export type GreetingProps = z.infer<typeof greetingSchema>;

export const defaults: GreetingProps = {
  brand: 'Kinetograph',
  name: 'Sri',
  question: 'What are we shipping today?',
  cards: ['Ship the demo', 'Cut a launch video', 'Render the changelog', 'Draft the release post'],
  placeholder: 'Describe your video',
  caption: 'Scenes shortened and simulated.',
  font: 'Google Sans',
  step: 2,
  colors: {
    ground: '#faf9f6',
    glowCool: '#ecf0f5',
    glowWarm: '#f8eeeb',
    window: '#ffffff',
    sidebar: '#f8f6f5',
    surface: '#f4f3ef',
    field: '#f6f5f1',
    ink: '#1b1b1b',
    muted: '#85837f',
    greetingStart: '#2d6bea',
    greetingEnd: '#6a5dd0',
    wordmark: ['#396ee9', '#4e61e0', '#6557dc', '#7c52d0', '#9b42c8', '#ae3dbf', '#c834a4', '#ca348b', '#d2306d', '#d62b61', '#e0284e', '#dc1a18'],
  },
};

const rgba = (hex: string, a: number) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a.toFixed(4)})`;
};

/** A soft gaussian glow: an elliptical radial gradient whose alpha falls off as exp(-d^2 / 2 sigma^2) out to 3 sigma. */
const Glow: React.FC<{ id: string; color: string; cx: number; cy: number; sx: number; sy: number }> = ({ id, color, cx, cy, sx, sy }) => (
  <Rect id={id} x={cx - 3 * sx} y={cy - 3 * sy} width={6 * sx} height={6 * sy}
    fill={radialGradient(Array.from({ length: 49 }, (_, i): [number, string] => [i / 48, rgba(color, Math.exp(-0.5 * (i / 16) ** 2))]), { cx: 0.5, cy: 0.5, r: 0.5 })} />
);

const Ground: React.FC<{ c: GreetingProps['colors'] }> = ({ c }) => (
  <Layer id="ground">
    <Rect id="ground-base" width={W} height={H} fill={c.ground} />
    <Glow id="glow-cool" color={c.glowCool} cx={583} cy={351} sx={349} sy={225} />
    <Glow id="glow-warm" color={c.glowWarm} cx={1342} cy={709} sx={350} sy={232} />
  </Layer>
);

// The wordmark: held until frame 8, then (as in the reference) it shrinks 6% a frame, rises 23 px a frame and fades
// linearly until it is gone at about frame 23.
const WORD_SIZE = 161.5;
const Wordmark: React.FC<{ text: string; stops: string[]; family: string; f: number }> = ({ text, stops, family, f }) => {
  const m = measureText({ text, fontFamily: family, fontSize: WORD_SIZE, fontWeight: '500' });
  const fit = Math.min(1, 760 / m.width);
  const k = Math.max(0, f - 8);
  const opacity = Math.max(0, 1 - 0.0655 * k);
  if (opacity <= 0) return null;
  const scale = (1 - 0.06 * k) * fit;
  const y = 570 - 23.4 * k;
  return (
    <Layer id="wordmark" x={W / 2} y={y} scale={scale} opacity={opacity}>
      <Text id="wordmark-text" font={family} weight={500} size={WORD_SIZE} x={-m.width / 2} y={-m.height * 0.56 - 19}
        color={linearGradient(stops, { angle: 90 })}>{text}</Text>
    </Layer>
  );
};

export const GreetingIntro: React.FC<GreetingProps> = (p) => {
  const frame = useCurrentFrame();
  const f = p.step > 1 ? Math.floor(frame / p.step) * p.step : frame;
  const family = useFont(p.font);
  const c = p.colors;
  const ui: UiProps = {
    font: p.font,
    appName: p.brand,
    name: p.name,
    question: p.question,
    cards: p.cards,
    placeholder: p.placeholder,
    palette: {
      ground: c.ground, glowCool: c.glowCool, glowWarm: c.glowWarm, window: c.window, windowEdge: '#ebe9e4',
      sidebar: c.sidebar, ink: c.ink, muted: c.muted, faint: '#8f8e8a', surface: c.surface, field: c.field,
      greetA: c.greetingStart, greetB: c.greetingEnd, brandStops: c.wordmark,
    },
  };
  const cam = camera(f);
  return (
    <Layer id="root">
      <Camera perspective={cam.perspective} />
      <Ground c={c} />
      <Layer id="world" x={cam.x} y={cam.y} scale={cam.s} rotation={cam.c} rotateX={cam.a} rotateY={cam.b}
        anchorX={536} anchorY={304} opacity={cam.opacity}>
        <Window f={f} ui={ui} family={family} />
      </Layer>
      <Wordmark text={p.brand} stops={c.wordmark} family={family} f={f} />
      {p.caption ? (
        <Text id="caption" font={family} size={18.8} color="#a2a2a2" x={76} y={1000} opacity={Math.min(1, Math.max(0, (f - 8) / 15))}>
          {p.caption}
        </Text>
      ) : null}
    </Layer>
  );
};

registerRoot(() => (
  <Composition id="GreetingIntro" component={GreetingIntro} schema={greetingSchema} defaultProps={defaults}
    durationInFrames={DURATION} fps={FPS} width={W} height={H} />
));
