// The app window the camera flies over, drawn flat in "window units": the window is WIN_W x WIN_H with its top left
// at the origin, and at the end of the shot one unit is one pixel of the 1920x1080 frame. Everything the camera does
// to it (push-in, tilt, pull-back) happens in camera.ts; this file only knows where things sit and when they appear.

import React from 'react';
import { Ellipse, Layer, Path, Rect, Text, dropShadow, linearGradient } from '@kinetographdev/core';
import { measureText } from '@remotion/layout-utils';
import { makeGoogleFont } from '@kinetographdev/core/google-fonts';

export const WIN_W = 1072;
export const WIN_H = 608;
export const SIDEBAR = 63;
export const CONTENT_X = 99;

export const CARD = { y: 266.5, w: 218, h: 131, gap: 21.7, radius: 14 };
export const INPUT = { y: 512, w: 940, h: 60 };

export interface Palette {
  ground: string;
  glowCool: string;
  glowWarm: string;
  window: string;
  windowEdge: string;
  sidebar: string;
  ink: string;
  muted: string;
  faint: string;
  surface: string;
  field: string;
  greetA: string;
  greetB: string;
  brandStops: string[];
}

export interface UiProps {
  /** The font family (Google Fonts) used for every line of UI type. */
  font: string;
  appName: string;
  /** Typed in blue: "Hello, <name>." */
  name: string;
  question: string;
  cards: string[];
  placeholder: string;
  palette: Palette;
}

/** Loads a Google font family at the weights the UI uses and returns the registered family name. */
export const useFont = (family: string): string => makeGoogleFont(family).loadFont('normal', { weights: ['400', '500'] }).fontFamily;

/** Characters shown of `text` at frame f: one every `every` frames from `start`. */
export const typed = (f: number, start: number, every: number, text: string) =>
  Math.max(0, Math.min(text.length, Math.floor((f - start) / every) + 1));

/** Reveal timings, in frames of the 60 fps reference (its content steps every second frame). */
export const T = {
  /** Frame at which each character of "Hello, <name>." has appeared (the reference types it unevenly). */
  greet: [42, 44, 46, 48, 52, 54, 58, 58, 60, 62, 64],
  questionStart: 57,
  questionEvery: 1,
  /** Cards and the prompt box cut in, one 30 fps step each. */
  cardAt: [80, 92, 104, 116],
  inputAt: 128,
};

/** Characters of a greeting shown at frame f: follows T.greet, then one every 2 frames for a longer name. */
const greetCount = (f: number, len: number) => {
  let n = 0;
  for (let i = 0; i < len; i++) {
    const t = i < T.greet.length ? T.greet[i] : T.greet[T.greet.length - 1] + 2 * (i - T.greet.length + 1);
    if (f >= t) n = i + 1;
  }
  return n;
};

const roundRectLeft = (w: number, h: number, r: number) =>
  `M ${r} 0 H ${w} V ${h} H ${r} A ${r} ${r} 0 0 1 0 ${h - r} V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;

export const Window: React.FC<{ f: number; ui: UiProps; family: string }> = ({ f, ui, family }) => {
  const p = ui.palette;
  const nameWidth = measureText({ text: ui.appName, fontFamily: family, fontSize: 25.5, fontWeight: '400' }).width;
  const greet = `Hello, ${ui.name}.`;
  const nGreet = greetCount(f, greet.length);
  const nQuestion = typed(f, T.questionStart, T.questionEvery, ui.question);
  const hide = (n: number) => (_c: string, i: number) => (i < n ? null : { opacity: 0 });
  return (
    <Layer id="window">
      <Rect id="win-body" width={WIN_W} height={WIN_H} radius={24} fill={p.window} stroke={{ color: p.windowEdge, width: 1.5 }}
        effects={[dropShadow({ y: 6, blur: 26, color: 'rgba(60,50,40,0.05)' })]} />
      <Path id="win-sidebar" d={roundRectLeft(SIDEBAR, WIN_H, 24)} fill={p.sidebar} />
      {[21, 49, 77].map((y) => (
        <Rect key={y} id={`burger-${y}`} x={18} y={y - 1.2} width={29} height={2.4} radius={1.2} fill={p.faint} />
      ))}
      <Ellipse id="new-chat" x={31 - 15} y={138 - 15} width={30} height={30} fill="#eeede9" />
      <Rect id="plus-h" x={31 - 4.75} y={138 - 0.9} width={9.5} height={1.8} fill={p.muted} />
      <Rect id="plus-v" x={31 - 0.9} y={138 - 4.75} width={1.8} height={9.5} fill={p.muted} />

      <Text id="app-name" font={family} weight={400} size={25.5} color={p.ink} x={CONTENT_X - 1} y={36.4}>{ui.appName}</Text>
      <Path id="app-chev" d="M 0 0 H 10 L 5 5 Z" fill={p.muted} x={CONTENT_X + 11 + nameWidth} y={50} />

      <Text id="greet" font={family} weight={400} size={41} x={CONTENT_X - 1} y={122.5}
        color={linearGradient([p.greetA, p.greetB], { angle: 90 })} chars={hide(nGreet)}>{greet}</Text>
      <Text id="question" font={family} weight={400} size={44} x={CONTENT_X - 2} y={176} color={p.muted} chars={hide(nQuestion)}>
        {ui.question}
      </Text>

      {ui.cards.map((label, i) => {
        const a = T.cardAt[i] ?? T.cardAt[T.cardAt.length - 1] + 12 * (i - T.cardAt.length + 1);
        const o = f >= a ? 1 : 0;
        const lift = 0;
        return (
          <Layer key={label + i} id={`card-${i}`} x={CONTENT_X + i * (CARD.w + CARD.gap)} y={CARD.y + lift} opacity={o}>
            <Rect id={`card-bg-${i}`} width={CARD.w} height={CARD.h} radius={CARD.radius} fill={p.surface} />
            <Text id={`card-t-${i}`} font={family} weight={400} size={19.1} color={p.ink} x={14} y={15.2}>{label}</Text>
          </Layer>
        );
      })}

      <Layer id="input" x={CONTENT_X} y={INPUT.y} opacity={f >= T.inputAt ? 1 : 0}>
        <Rect id="input-bg" width={INPUT.w} height={INPUT.h} radius={30} fill={p.field} />
        <Text id="input-t" font={family} weight={400} size={19} color={p.muted} x={24} y={19.2}>{ui.placeholder}</Text>
      </Layer>
    </Layer>
  );
};
