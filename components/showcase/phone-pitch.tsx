// Phone Pitch, scene phone-pitch: a phone is put down from the right, a two-line headline says itself a word at a
// time beside it, and on the glass a message thread plays out with each reply landing on its own beat. Then the headline
// leaves, the camera lifts and closes on the phone until the screen is the shot, and the thread keeps going: a typing
// indicator, a last reply, a hold.
//
// Principles: anticipation (nothing moves until the words are in), slow in and out (the camera's lift is one eased move),
// follow through (words overshoot a little right and settle), overlap (the headline leaves as the camera starts, not before),
// staging (the phone is the hero, the type is the margin note), timing (messages land at human intervals, the typing dots
// buy the last reply a beat).

import React from 'react';
import { z } from 'zod';
import { Ellipse, Layer, Path, Rect, Text, grain } from '@kinetographdev/core';
import { Easing, useCurrentFrame } from 'remotion';
import { PH, PW, Phone } from './devices.js';
import { easeIn, easeOut, prog, ramp, ease, rr, useFamily } from './lib.js';

export const W = 1920;
export const H = 1080;
export const FPS = 60;
export const DURATION = 470;
export { PW as PW_, PH as PH_ };

const hex = z.string().describe('A CSS colour.');

export const phonePitchSchema = z.object({
  headline: z.array(z.string()).length(2).describe('The two headline lines, set a word at a time.'),
  contact: z.string().describe('The name under the avatar in the thread header.'),
  thread: z
    .array(
      z.object({
        from: z.enum(['me', 'them']).describe('me is the blue right-hand bubble, them the grey left-hand one.'),
        text: z.string().describe('Message text. A newline forces a line break.'),
        at: z.number().int().min(0).describe('Frame the message lands on (60 fps). 0 means already there.'),
      }),
    )
    .describe('The conversation, in order.'),
  typing: z.object({ from: z.number().int(), to: z.number().int() }).describe('The frames the typing dots show for, before the last message.'),
  headlineFont: z.string().describe('Google Fonts family of the headline.'),
  uiFont: z.string().describe('Google Fonts family of the thread.'),
  ground: hex.describe('The ground behind the phone.'),
  ink: hex.describe('Headline colour.'),
  bubble: hex.describe('The blue of your own bubbles.'),
  frame: hex.describe('Phone frame colour.'),
  flip: z.boolean().describe('Mirror the layout: phone on the left, headline on the right.'),
  speed: z.number().min(0.5).max(2).describe('Playback speed of the move.'),
  grain: z.number().min(0).max(0.2).describe('Film grain over the whole frame.'),
});
export type PhonePitchProps = z.infer<typeof phonePitchSchema>;

export const phonePitchDefaults: PhonePitchProps = {
  headline: ['Let Orbit', 'handle it'],
  contact: 'Orbit',
  thread: [
    { from: 'me', text: 'i need a launch video by friday', at: 0 },
    { from: 'me', text: 'how am i looking', at: 0 },
    { from: 'them', text: 'i gotchu', at: 56 },
    { from: 'them', text: 'cut it from your library — script,\npacing, captions', at: 100 },
    { from: 'me', text: 'the deck still needs a hero shot', at: 190 },
    { from: 'me', text: "and i don't wanna re-record the\nvo", at: 270 },
    { from: 'them', text: 'say less — first cut lands in your\ninbox tonight', at: 404 },
  ],
  typing: { from: 368, to: 402 },
  headlineFont: 'Geist',
  uiFont: 'Inter',
  ground: '#effafe',
  ink: '#0f1a24',
  bubble: '#3f8cf7',
  frame: '#1d1e22',
  flip: false,
  speed: 1,
  grain: 0,
};

// layout of the thread, in screen units (the glass is 368 x 778)
const SIDE = 25;
const GAP = 16;
const HEAD = [185]; // top of the first bubble
const heightOf = (t: string) => (t.split('\n').length > 1 ? 64 : 36);

const Bubble: React.FC<{ id: string; y: number; from: 'me' | 'them'; text: string; color: string; font: string; t: number }> = ({ id, y, from, text, color, font, t }) => {
  const lines = text.split('\n');
  const longest = Math.max(...lines.map((l) => [...l].length));
  const w = Math.min(250, longest * 7.05 + 30);
  const h = heightOf(text);
  const me = from === 'me';
  const x = me ? 368 - SIDE - w : SIDE - 8;
  const pop = easeOut(t);
  return (
    <Layer id={id} x={x + (me ? w : 0)} y={y + h / 2} anchorX={me ? w : 0} anchorY={h / 2} scale={0.82 + 0.18 * pop} opacity={Math.min(1, t * 3)}>
      <Layer id={`${id}-in`} y={-h / 2 + (1 - pop) * 14}>
        <Rect id={`${id}-bg`} width={w} height={h} radius={18} fill={me ? color : '#e9e9eb'} />
        <Rect id={`${id}-tail`} x={me ? w - 14 : 0} y={h - 14} width={14} height={14} radius={me ? 0 : 0} fill={me ? color : '#e9e9eb'} />
        <Text id={`${id}-tx`} font={font} weight={400} size={14} color={me ? '#ffffff' : '#101114'} x={me ? 15 : 15} y={h === 36 ? 9 : 10} maxWidth={w} lineHeight={1.25}>
          {text}
        </Text>
      </Layer>
    </Layer>
  );
};

const Dots: React.FC<{ f: number; y: number }> = ({ f, y }) => (
  <Layer id="pp-dots" x={SIDE - 8} y={y} opacity={prog(f, 0, 6)}>
    <Rect id="pp-dots-bg" width={64} height={34} radius={17} fill="#e9e9eb" />
    {[0, 1, 2].map((i) => (
      <Ellipse key={i} id={`pp-dot${i}`} x={17 + i * 14} y={13} width={8} height={8} fill={i === Math.floor(f / 14) % 3 ? '#6e6f75' : '#b9bac0'} />
    ))}
  </Layer>
);

export const PhonePitch: React.FC<PhonePitchProps> = (p) => {
  const frame = useCurrentFrame();
  const f = frame * p.speed;
  const head = useFamily(p.headlineFont, ['500', '600', '700']);
  const ui = useFamily(p.uiFont, ['400', '500', '600']);
  const dir = p.flip ? -1 : 1;

  // the phone: put down from the side (keeps 87.7% of the remaining distance per frame), then the lift and close-in
  const land = 175 * Math.pow(0.877, frame);
  const lift = prog(f, 186, 250, Easing.bezier(0.5, 0, 0.3, 1));
  const zoom = 1 + 0.38 * lift;
  const ps = 2.03 * zoom;
  const cx = W / 2 + dir * (420 * (1 - lift) + land);
  const top = 66 + (-470 - 66) * lift;

  // thread layout and scroll
  let yy = HEAD[0];
  const placed = p.thread.map((m) => {
    const y = yy;
    yy += heightOf(m.text) + GAP;
    return { ...m, y };
  });
  const scroll = ramp(f, 262, 288, 0, 60) + ramp(f, 366, 392, 0, 90) + ramp(f, 400, 428, 0, 22);
  const dotsY = (placed[placed.length - 1]?.y ?? 0);

  // headline: a word at a time, a touch right, small and light, settling; then it leaves with the lift
  const words: { w: string; line: number; at: number }[] = [];
  const starts = [28, 42, 49, 56];
  let wi = 0;
  p.headline.forEach((l, li) => l.split(' ').forEach((w) => words.push({ w, line: li, at: starts[Math.min(wi++, starts.length - 1)] })));
  const exit = easeIn(prog(f, 164, 204));
  const hx = (p.flip ? W - 105 : 105) - dir * 330 * exit;
  const sizes = [84, 100];
  const lineH = [112, 112];

  const lineText = (li: number) => {
    // place words by an estimated advance so each can arrive on its own beat
    const ws = words.filter((x) => x.line === li);
    let x = 0;
    return ws.map((x0) => {
      const adv = [...x0.w].length * sizes[li] * (li === 0 ? 0.53 : 0.56) + sizes[li] * 0.3;
      const out = { ...x0, x };
      x += adv;
      return out;
    });
  };

  return (
    <Layer id="pp-root" effects={p.grain > 0 ? [grain(p.grain, { seed: 3, size: 1.3 })] : undefined}>
      <Rect id="pp-ground" width={W} height={H} fill={p.ground} />
      <Layer id="pp-head" x={hx} y={0} opacity={1 - exit}>
        {[0, 1].map((li) => (
          <Layer id={`pp-line${li}`} key={li} y={H / 2 - 100}>
            {lineText(li).map((wd, k) => {
              const t = easeOut(prog(f, wd.at, wd.at + 14));
              return (
                <Text
                  key={k}
                  id={`pp-w${li}-${k}`}
                  font={head}
                  weight={li === 0 ? 500 : 700}
                  size={sizes[li]}
                  color={li === 0 ? '#223340' : p.ink}
                  x={(p.flip ? -520 : 0) + wd.x + (1 - t) * 26}
                  y={li * 112}
                  lineHeight={1}
                  opacity={t}
                >
                  {wd.w}
                </Text>
              );
            })}
          </Layer>
        ))}
      </Layer>
      <Layer id="pp-phone" x={cx - (PW * ps) / 2} y={top} scale={ps}>
        <Phone id="pp-ph" frame={p.frame} bar="#111">
          <Rect id="pp-screen-bg" width={368} height={778} fill="#ffffff" />
          {/* status bar */}
          <Text id="pp-time" font={ui} weight={600} size={16} color="#0a0a0a" x={32} y={22} lineHeight={1}>9:41</Text>
          <Rect id="pp-sig" x={285} y={28} width={4} height={8} radius={1} fill="#0a0a0a" />
          <Rect id="pp-sig2" x={291} y={25} width={4} height={11} radius={1} fill="#0a0a0a" />
          <Rect id="pp-sig3" x={297} y={22} width={4} height={14} radius={1} fill="#0a0a0a" />
          <Rect id="pp-bat" x={316} y={24} width={26} height={13} radius={4} fill="#0a0a0a" />
          {/* header */}
          <Layer id="pp-hdr">
            <Ellipse id="pp-back" x={24} y={63} width={38} height={38} fill="#f0f0f2" />
            <Path id="pp-chev" d="M49 73 L42 82 L49 91" x={0} y={0} stroke={{ color: '#2a2a2e', width: 2.2, cap: 'round', join: 'round' } as never} />
            <Ellipse id="pp-av" x={161} y={60} width={46} height={46} fill="#1b2943" />
            <Text id="pp-avl" font={ui} weight={600} size={20} color="#ffffff" align="center" x={161} y={72} maxWidth={46} lineHeight={1}>{p.contact.slice(0, 1)}</Text>
            <Ellipse id="pp-vid" x={306} y={63} width={38} height={38} fill="#f0f0f2" />
            <Rect id="pp-vid1" x={316} y={76} width={15} height={12} radius={3} fill="#2a2a2e" />
            <Rect id="pp-pill" x={141} y={118} width={86} height={24} radius={12} fill="#f0f0f2" />
            <Text id="pp-name" font={ui} weight={500} size={12} color="#1c1c20" align="center" x={141} y={124} maxWidth={86} lineHeight={1}>{`${p.contact} ›`}</Text>
          </Layer>
          {/* thread */}
          <Layer id="pp-thread" y={-scroll} clip={undefined}>
            {placed.map((m, i) => (
              <Bubble key={i} id={`pp-m${i}`} y={m.y} from={m.from} text={m.text} color={p.bubble} font={ui} t={m.at === 0 ? 1 : prog(f, m.at, m.at + 16, easeOut)} />
            ))}
            {f >= p.typing.from && f < p.typing.to ? <Dots f={f - p.typing.from} y={dotsY} /> : null}
          </Layer>
          {/* a soft cover so messages scroll out under the header */}
          <Rect id="pp-hdr-cover" width={368} height={150} fill="#ffffff" opacity={0} />
        </Phone>
      </Layer>
    </Layer>
  );
};
export { easeIn, rr };
