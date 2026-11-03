// Screen Touch, scene tap-through: a phone hangs in the dark with a feed on it; the camera falls down the glass
// until the two actions at the bottom are all that is left; one is tapped (a scale and a flash together); the fall keeps
// going until the frame is the phone's own milled edge; and then the picture is gone and only the sentence is left.
// Four beats, three hard cuts.
//
// The whole shot lives on one plane, so the camera is a projective map: per frame the phone's half width, its tilt and the
// row of its bottom edge, fitted to the reference and played back through one perspective. The tilt flips nothing and the
// lens never leaves the glass, which is what makes the fall read as a fall rather than a zoom.
//
// Principles: staging (feed, then the two buttons alone, then type), anticipation (the press is a quick scale down before
// the flash), follow through (the button springs back inside four frames, the flash outlives the press), slow in and out
// (the fall in the first beat accelerates in), timing (the closing lines climb slowly so they never sit dead).

import React from 'react';
import { z } from 'zod';
import { Camera, Ellipse, Layer, Path, Rect, Text, blur, grain, linearGradient } from '@kinetographdev/core';
import { useCurrentFrame } from 'remotion';
import { easeIn, easeOut, prog, ramp, useFamily } from './lib.js';

export const W = 1920;
export const H = 1080;
export const FPS = 60;
export const DURATION = 156;

const hex = z.string().describe('A CSS colour.');

export const screenTouchSchema = z.object({
  tabs: z.array(z.string()).length(2).describe('The two tabs at the top of the feed.'),
  posts: z
    .array(
      z.object({
        name: z.string().describe('Who posted.'),
        tag: z.string().describe('The small blue chip after the name.'),
        age: z.string().describe('How long ago.'),
        subject: z.string().describe('The bold subject line.'),
        stat: z.string().describe('The number after the subject.'),
        delta: z.string().describe('The green change after the number.'),
        body: z.array(z.string()).max(2).describe('Up to two lines of text.'),
        likes: z.string().describe('The count beside the heart.'),
      }),
    )
    .length(2)
    .describe('The two posts on the feed.'),
  actions: z.array(z.string()).length(2).describe('The two buttons: the plain one, then the one that is tapped.'),
  line1: z.string().describe('The first closing line.'),
  line2: z.array(z.string()).length(2).describe('The second closing line: a bright part, then a dimmer part.'),
  tapAt: z.number().int().min(30).max(80).describe('The frame the press lands on.'),
  font: z.string().describe('Google Fonts family of the screen and the closing lines.'),
  buttonFont: z.string().describe('Google Fonts family (with italics) of the button labels.'),
  ground: hex.describe('The dark ground.'),
  glass: hex.describe('The phone glass.'),
  rim: hex.describe('The phone edge.'),
  action: hex.describe('The colour of the tapped button.'),
  speed: z.number().min(0.5).max(2).describe('Playback speed of the move.'),
  grain: z.number().min(0).max(0.2).describe('Film grain over the whole frame.'),
});
export type ScreenTouchProps = z.infer<typeof screenTouchSchema>;

export const screenTouchDefaults: ScreenTouchProps = {
  tabs: ['Global', 'Friends'],
  posts: [
    { name: 'Maya', tag: 'Shipped', age: '44s', subject: 'scene-pack', stat: '1,284', delta: '+12', body: ['Shipped the launch video this morning.', 'Wrote none of the animation. Own all of it.'], likes: '293' },
    { name: 'Maya', tag: 'Shipped', age: '59s', subject: 'scene-pack', stat: '1,272', delta: '+9', body: ['One afternoon, one install.', 'The demo is in the pull request already.'], likes: '165' },
  ],
  actions: ['Docs', 'Install'],
  line1: 'the code is yours',
  line2: ['and so is', 'the credit'],
  tapAt: 55,
  font: 'Geist',
  buttonFont: 'Inter',
  ground: '#05060f',
  glass: '#070918',
  rim: '#41425e',
  action: '#0bb644',
  speed: 1,
  grain: 0,
};

// ---- the camera, fitted to the reference ---------------------------------------------------------------------------
const P = 1400; // reference pixels
const K = 2;
// beat two: one sample every 3 frames from frame 21
const F0 = 21;
const SW = [344.5, 408.8, 427.6, 455.0, 455.7, 464.4, 466.3, 469.9, 472.1, 478.4, 482.2, 489.5, 494.6, 503.2, 509.2, 531.0, 541.8];
const TH = [17.4, 25.6, 29.4, 34.9, 34.6, 35.2, 35.0, 34.7, 34.9, 36.2, 36.8, 37.4, 38.3, 38.8, 39.3, 41.8, 42.7];
const YB = [453, 487, 479, 471, 465, 459, 456, 452, 450, 447, 446, 444, 444, 441, 441, 437, 434, 430, 427, 409, 396, 335, 253, 150];

function samp(tab: number[], f: number): number {
  const u = Math.max(0, (f - F0) / 3);
  const i = Math.min(tab.length - 2, Math.floor(u));
  const t = Math.min(1, u - i);
  const at = (j: number) => tab[Math.max(0, Math.min(tab.length - 1, j))];
  const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
}

const CUT1 = 20; // feed to buttons
const CUT2 = 88; // buttons to type

const pose = (f: number) => {
  if (f < CUT1) {
    // the feed: near head-on, the phone rising as the lens drops down the glass
    const shift = 44 * easeIn(prog(f, 0, 19, (t) => t));
    return { sw: 247, th: 1.5, yb: 5 + 1013 - shift };
  }
  const last = F0 + 3 * (SW.length - 1); // 69
  if (f <= last) return { sw: samp(SW, f), th: samp(TH, f), yb: samp(YB, f) };
  const d = f - last;
  // the fall carries on: the glass swells and the bottom edge sweeps up through the frame
  return { sw: SW[SW.length - 1] * Math.exp(0.02 * d + 0.0002 * d * d), th: TH[TH.length - 1] + 0.3 * d, yb: ybLate(f) };
};
const ybLate = (f: number) => {
  const pts: [number, number][] = [[69, 434], [72, 430], [75, 427], [78, 409], [81, 396], [84, 335], [87, 253]];
  for (let i = 1; i < pts.length; i++) if (f <= pts[i][0]) return pts[i - 1][1] + ((pts[i][1] - pts[i - 1][1]) * (f - pts[i - 1][0])) / (pts[i][0] - pts[i - 1][0]);
  return 253 - (f - 87) * 40;
};

const PW = 390;
const PH = 800;

export const ScreenTouch: React.FC<ScreenTouchProps> = (p) => {
  const frame = useCurrentFrame();
  const f = frame * p.speed;
  const ui = useFamily(p.font, ['400', '500', '600', '700']);
  const btn = useFamily(p.buttonFont, ['600', '700'], true);

  // the press: a scale and a flash together
  const dt = f - p.tapAt;
  const press = dt < 0 ? 1 : dt < 2 ? 1 - 0.13 * (dt / 2) : dt < 6 ? 0.87 + 0.13 * ((dt - 2) / 4) : 1;
  const flash = dt < 0 ? 0 : dt < 3 ? 0.36 * (dt / 3) : dt < 11 ? 0.36 * (1 - (dt - 3) / 8) : 0;

  const phoneLayer = (() => {
    const ps = pose(f);
    const s = (4 * ps.sw) / PW; // plane units to render pixels
    return (
      <Layer id="tt-plane" x={W / 2} y={K * ps.yb} anchorX={(PW / 2) * s} anchorY={PH * s} rotateX={ps.th}>
        <Layer id="tt-scale" scale={s}>
          <Rect id="tt-glow" x={-30} y={-30} width={PW + 60} height={PH + 60} radius={90} fill="#2342d8" opacity={f < CUT1 ? 0.08 : 0} effects={[blur(60)]} />
          <Rect id="tt-body" width={PW} height={PH} radius={62} fill={p.glass} />
          <Rect id="tt-rim" x={1.5} y={1.5} width={PW - 3} height={PH - 3} radius={61} stroke={{ color: p.rim, width: 3 }} />
          {f < CUT1 ? <Feed ui={ui} p={p} /> : null}
          <Buttons ui={btn} p={p} press={press} flash={flash} />
        </Layer>
      </Layer>
    );
  })();

  // the closing lines
  const t1 = f - CUT2;
  const climb = (a: number) => a * -0.55;
  const showLine1 = f >= 90 && f < 119;
  const showLine2 = f >= 119;

  return (
    <Layer id="tt-root" effects={p.grain > 0 ? [grain(p.grain, { seed: 4, size: 1.3 })] : undefined}>
      <Camera perspective={P * K} />
      <Rect id="tt-ground" width={W} height={H} fill={p.ground} />
      {f < CUT2 ? phoneLayer : null}
      {showLine1 ? (
        <Text id="tt-l1" font={ui} weight={500} size={170} color="#ffffff" align="center" x={0} y={H / 2 - 85 + 80 - (f - 92) * 5} maxWidth={W} lineHeight={1} opacity={prog(f, 90, 92, (t) => t)}>
          {p.line1}
        </Text>
      ) : null}
      {showLine2 ? (
        <Layer id="tt-l2" y={-(f - 119) * 0.6}>
          <Text id="tt-l2a" font={ui} weight={500} size={86} color="#ffffff" align="left" x={533} y={H / 2 - 43} maxWidth={W} lineHeight={1}>
            {p.line2[0]}
          </Text>
          <Text id="tt-l2b" font={ui} weight={400} size={86} color="#c9cbd6" align="left" x={533 + ([...p.line2[0]].length + 1) * 41} y={H / 2 - 43} maxWidth={W} lineHeight={1} opacity={prog(f, 124, 128, (t) => t)}>
            {p.line2[1]}
          </Text>
        </Layer>
      ) : null}
      <Rect id="tt-void" width={0} height={0} fill="#000" opacity={t1 > 0 ? 0 : 0} />
    </Layer>
  );
};

const Feed: React.FC<{ ui: string; p: ScreenTouchProps }> = ({ ui, p }) => (
  <Layer id="tt-feed">
    <Text id="tt-time" font={ui} weight={600} size={17} color="#ffffff" x={70} y={28} lineHeight={1}>9:41</Text>
    <Rect id="tt-bat" x={314} y={30} width={26} height={12} radius={4} fill="#ffffff" />
    <Text id="tt-tab0" font={ui} weight={600} size={14} color="#ffffff" align="center" x={72} y={68} maxWidth={100} lineHeight={1}>{p.tabs[0]}</Text>
    <Text id="tt-tab1" font={ui} weight={400} size={14} color="#7d7f95" align="center" x={203} y={68} maxWidth={100} lineHeight={1}>{p.tabs[1]}</Text>
    <Rect id="tt-ul" x={72} y={92} width={100} height={3} radius={1.5} fill="#2b59ff" />
    {p.posts.map((po, i) => {
      const y = 112 + i * 137;
      return (
        <Layer id={`tt-post${i}`} key={i} y={y}>
          <Rect id={`tt-card${i}`} x={21} y={0} width={348} height={124} radius={14} fill="#0b0d22" />
          <Ellipse id={`tt-av${i}`} x={31} y={14} width={24} height={24} fill="#3c4468" />
          <Text id={`tt-avl${i}`} font={ui} weight={600} size={11} color="#ffffff" align="center" x={31} y={21} maxWidth={24} lineHeight={1}>{po.name.slice(0, 1)}</Text>
          <Text id={`tt-nm${i}`} font={ui} weight={600} size={11} color="#ffffff" x={65} y={13} lineHeight={1}>{po.name}</Text>
          <Rect id={`tt-chip${i}`} x={103} y={12} width={40} height={14} radius={4} fill="#1b2a6b" />
          <Text id={`tt-chipt${i}`} font={ui} weight={500} size={9} color="#6f8cff" align="center" x={103} y={15} maxWidth={40} lineHeight={1}>{po.tag}</Text>
          <Text id={`tt-age${i}`} font={ui} weight={400} size={10} color="#7d7f95" x={150} y={14} lineHeight={1}>{po.age}</Text>
          <Ellipse id={`tt-ic${i}`} x={63} y={32} width={14} height={14} fill="#3c4468" />
          <Text id={`tt-sj${i}`} font={ui} weight={600} size={13} color="#ffffff" x={82} y={31} lineHeight={1}>{po.subject}</Text>
          <Text id={`tt-st${i}`} font={ui} weight={500} size={12} color="#e9eaf3" x={168} y={32} lineHeight={1}>{po.stat}</Text>
          <Text id={`tt-dl${i}`} font={ui} weight={500} size={11} color="#27c46a" x={208} y={33} lineHeight={1}>{`▲ ${po.delta}`}</Text>
          <Ellipse id={`tt-dot${i}`} x={248} y={36} width={6} height={6} fill="#2b59ff" />
          {po.body.map((l, j) => (
            <Text id={`tt-b${i}-${j}`} key={j} font={ui} weight={400} size={10} color="#b6b8cc" x={65} y={56 + j * 17} lineHeight={1}>{l}</Text>
          ))}
          <Text id={`tt-lk${i}`} font={ui} weight={400} size={10} color="#8c8ea4" x={80} y={102} lineHeight={1}>{`♡ ${po.likes}`}</Text>
        </Layer>
      );
    })}
  </Layer>
);

const Buttons: React.FC<{ ui: string; p: ScreenTouchProps; press: number; flash: number }> = ({ ui, p, press, flash }) => (
  <Layer id="tt-btns">
    <Layer id="tt-b0" x={22} y={690}>
      <Rect id="tt-b0bg" width={170} height={46} radius={23} fill="#000000" />
      <Text id="tt-b0t" font={ui} weight={700} fontStyle="italic" size={19} color="#ffffff" align="center" x={0} y={13} maxWidth={170} lineHeight={1}>{p.actions[0]}</Text>
    </Layer>
    <Layer id="tt-b1" x={197 + 85} y={690 + 23} anchorX={85} anchorY={23} scale={press}>
      <Rect id="tt-b1bg" width={170} height={46} radius={23} fill={p.action} />
      <Rect id="tt-b1fl" width={170} height={46} radius={23} fill="#ffffff" opacity={flash} />
      <Text id="tt-b1t" font={ui} weight={700} fontStyle="italic" size={19} color="#ffffff" align="center" x={0} y={13} maxWidth={170} lineHeight={1}>{p.actions[1]}</Text>
    </Layer>
  </Layer>
);
export { easeOut, ramp, Path, linearGradient };
