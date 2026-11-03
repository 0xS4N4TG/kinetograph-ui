// Recap Dial: a year in review on a dial. Twelve labels (the months, by default) and their tick marks run round a big
// wheel whose centre is off the right edge, and the year's moments ride an inner ring beside them as stickers: a pill,
// a smiley, a stack of badges, photos, a wordmark with a squiggle, a folder, rings, a check, a handwritten line, a
// letter badge and a note. Every 25 frames the wheel snaps on by one label (quick, a small overshoot, a settle, a hold),
// so the label in the middle and its sticker light up while the rest fall away into the dark. Twelve snaps bring the
// first label back, so the 10 s clip loops.
//
// After a vertical "recap" template reference (its dial, layout, timing and snap); every word, sticker and photo here is
// a prop, so it can carry a product's changelog, a team's year or a launch.
//
// Principles: anticipation and follow through (each snap overshoots and settles), timing (a fast move and a long hold,
// so each moment can be read), staging (the middle row is lit; everything else dims with its distance from it), arcs
// (everything travels on the dial), secondary action (the stickers turn to follow the dial's curve), motion blur on the
// snap only.

import React from 'react';
import { z } from 'zod';
import { Ellipse, Image, Layer, Path, Rect, Text, staticFile } from '@kinetographdev/core';
import { interpolate, useCurrentFrame } from 'remotion';
import { useFamily } from './lib.js';

export const W = 1080;
export const H = 1920;
export const FPS = 30;
export const STEP = 25;
export const DURATION = STEP * 12;

const hex = z.string().describe('A CSS colour as #rrggbb.');

const itemSchema = z.object({
  at: z.number().describe('Where on the dial, in labels: 0 is beside the first label, 1.5 halfway between the second and third.'),
  kind: z
    .enum(['pill', 'smiley', 'stickers', 'photo', 'word', 'folder', 'rings', 'check', 'script', 'badge', 'note'])
    .describe('What the sticker is.'),
  text: z.string().describe('Its words. For stickers, up to three words split by "|"; for a badge, its letter; ignored by smiley, folder, rings, check, photo.'),
  photo: z.string().describe('Photo path under public/ (photo and badge use it; empty for none).'),
  size: z.number().min(0.4).max(2).describe('Scale of the sticker; 1 is the reference size.'),
  inset: z.number().describe('Distance in from the dial, in px; about 320 sits it beside the labels.'),
});

export const recapDialSchema = z.object({
  labels: z.array(z.string()).length(12).describe('The twelve labels round the dial, in order (the months by default).'),
  items: z.array(itemSchema).describe('The stickers on the inner ring.'),
  brand: z.string().describe('Wordmark at the top left.'),
  tag: z.string().describe('Small line at the top right.'),
  footer: z.array(z.string()).length(3).describe('The three small words along the bottom: left, middle, right.'),
  accent: hex.describe('The red of the squiggle, the badges and the heart.'),
  ground: hex.describe('Background colour.'),
  font: z.string().describe('Google Fonts family for the labels and most stickers.'),
  display: z.string().describe('Google Fonts family for the badge stack (a condensed bold).'),
  serif: z.string().describe('Google Fonts family for the handwritten line (italic).'),
  blur: z.boolean().describe('Motion blur on each snap.'),
});
export type RecapDialProps = z.infer<typeof recapDialSchema>;
type Item = z.infer<typeof itemSchema>;

const it = (at: number, kind: Item['kind'], text = '', photo = '', size = 1, inset = 320): Item => ({ at, kind, text, photo, size, inset });

export const recapDialDefaults: RecapDialProps = {
  labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  items: [
    it(0, 'pill', 'LAUNCH', '', 1, 300),
    it(1, 'smiley', '', '', 1, 270),
    it(2, 'stickers', 'NEW|API|V2!', '', 1, 330),
    it(3, 'photo', '', 'photos/nasa-astronaut-1.jpg', 1, 260),
    it(4, 'word', 'Lumen', '', 1, 300),
    it(5, 'folder', '', '', 1, 300),
    it(6, 'rings', '', '', 1, 290),
    it(7, 'photo', '', 'photos/nasa-reef-1.jpg', 1, 260),
    it(8, 'check', '', '', 1, 300),
    it(9, 'script', 'Made with care', '', 1, 330),
    it(10, 'badge', 'A', 'photos/nasa-moon-2.jpg', 1, 260),
    it(11, 'note', 'Lumen 2.0 ships offline sync, shared spaces and a faster editor.\n\n— Every release this year began as a customer request.', '', 1, 220),
  ],
  brand: 'lumen',
  tag: 'RECAP 25',
  footer: ['CHANGELOG', 'YEAR IN REVIEW', '2025'],
  accent: '#e3141c',
  ground: '#000000',
  font: 'Inter',
  display: 'Anton',
  serif: 'Instrument Serif',
  blur: true,
};

// ---- the dial ----
// The labels sit on a circle of radius 1026 px whose centre is 260 px off the right edge, 19 degrees apart, so about seven
// labels show at once. Twelve labels at 19 degrees fill only 228 degrees, so each label is placed by its distance from
// the middle row, wrapped to six either side: the dial never shows the seam.
const CX = 1340;
const CY = 960;
const R = 1026;
const DEG = Math.PI / 180;

/** Point at angle phi (degrees, 0 at the left middle, positive upward), `inset` px in from the dial, and the rotation
 *  that turns something to read outward along the radius there. */
const place = (phi: number, inset: number) => {
  const a = phi * DEG;
  const r = R - inset;
  return { x: CX - r * Math.cos(a), y: CY - r * Math.sin(a), rot: phi };
};

/** The wheel's turn, in labels, at frame f: a snap of one label every STEP frames, starting on frame 0. Each snap is a
 *  damped spring (overshoot about 7%, peak at 6 frames, settled by 12), then a hold. */
const turn = (f: number) => {
  const g = f;
  const k = Math.floor(g / STEP);
  const t = g - k * STEP;
  if (g < 0) return 0;
  const zeta = 0.65;
  const w = 0.7;
  const wd = w * Math.sqrt(1 - zeta * zeta);
  const s = t >= 18 ? 1 : 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + ((zeta * w) / wd) * Math.sin(wd * t));
  return k + s;
};
const moving = (f: number) => {
  const t = f - Math.floor(f / STEP) * STEP;
  return t < 10;
};

const SPAN = 19; // degrees per label
/** distance from the middle row in labels, wrapped to [-6, 6) */
const wrap = (d: number) => ((((d + 6) % 12) + 12) % 12) - 6;

// ---- the stickers ----
const Centered: React.FC<{ id: string; font: string; size: number; weight?: number; color: string; italic?: boolean; w?: number; children: string }> = ({
  id, font, size, weight = 500, color, italic, w = 900, children,
}) => (
  <Text id={id} font={font} weight={weight} fontStyle={italic ? 'italic' : 'normal'} size={size} color={color} align="center"
    x={-w / 2} y={-size * 0.52} maxWidth={w} lineHeight={1}>{children}</Text>
);

const circle = (r: number) => `M${-r} 0A${r} ${r} 0 1 0 ${r} 0A${r} ${r} 0 1 0 ${-r} 0Z`;

const Photo: React.FC<{ id: string; src: string; r: number }> = ({ id, src, r }) => (
  <Layer id={id} clip={{ kind: 'path', d: circle(r) }}>
    {src ? <Image id={`${id}-i`} src={staticFile(src)} x={-r} y={-r} width={r * 2} height={r * 2} fit="cover" /> : <Ellipse id={`${id}-e`} x={-r} y={-r} width={r * 2} height={r * 2} fill="#3a3a3a" />}
  </Layer>
);

const squiggle = (w: number, amp: number, waves: number) => {
  let d = '';
  const n = 48;
  for (let i = 0; i <= n; i++) {
    const x = -w / 2 + (w * i) / n;
    const y = amp * Math.sin((i / n) * waves * Math.PI * 2);
    d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
};

const Sticker: React.FC<{ id: string; item: Item; fonts: { ui: string; display: string; serif: string }; accent: string }> = ({ id, item, fonts, accent }) => {
  const t = item.text;
  switch (item.kind) {
    case 'pill': {
      const h = 132;
      const w = Math.max(220, t.length * 44 + 110);
      return (
        <Layer id={id}>
          <Rect id={`${id}-r`} x={-w / 2} y={-h / 2} width={w} height={h} radius={h / 2} stroke={{ color: '#ffffff', width: 6 }} />
          <Centered id={`${id}-t`} font={fonts.ui} size={64} weight={500} color="#ffffff">{t}</Centered>
        </Layer>
      );
    }
    case 'smiley':
      return (
        <Layer id={id}>
          <Ellipse id={`${id}-f`} x={-78} y={-78} width={156} height={156} fill="#f2c315" />
          <Ellipse id={`${id}-l`} x={-30} y={-36} width={13} height={26} fill="#2a2100" />
          <Ellipse id={`${id}-r`} x={17} y={-36} width={13} height={26} fill="#2a2100" />
          <Path id={`${id}-m`} d="M-46 6 Q0 62 46 6" stroke={{ color: '#2a2100', width: 8 }} />
        </Layer>
      );
    case 'stickers': {
      const words = t.split('|').slice(0, 3);
      const spots = [
        { x: -86, y: 18, fill: '#e8e8e8', ink: accent },
        { x: 0, y: 0, fill: accent, ink: '#ffffff' },
        { x: 86, y: -18, fill: '#e8e8e8', ink: accent },
      ];
      return (
        <Layer id={id}>
          {spots.slice(0, words.length).map((s, i) => (
            <Layer key={i} id={`${id}-${i}`} x={s.x} y={s.y} rotation={-8 + i * 6}>
              <Ellipse id={`${id}-${i}-c`} x={-84} y={-84} width={168} height={168} fill={s.fill} />
              <Centered id={`${id}-${i}-t`} font={fonts.display} size={72} weight={400} color={s.ink} w={160}>{words[i]}</Centered>
            </Layer>
          ))}
        </Layer>
      );
    }
    case 'photo':
      return <Photo id={id} src={item.photo} r={84} />;
    case 'word':
      return (
        <Layer id={id}>
          <Centered id={`${id}-t`} font={fonts.ui} size={92} weight={500} color="#ffffff">{t}</Centered>
          <Path id={`${id}-s`} d={squiggle(Math.max(160, t.length * 46), 7, Math.max(3, t.length * 0.9))} y={58} stroke={{ color: accent, width: 7 }} />
        </Layer>
      );
    case 'folder':
      return (
        <Layer id={id} rotation={-14}>
          <Path id={`${id}-b`} d="M-90 -62 Q-90 -72 -80 -72 L-28 -72 L-14 -56 L80 -56 Q90 -56 90 -46 L90 60 Q90 70 80 70 L-80 70 Q-90 70 -90 60 Z" fill="#2c78bd" />
          <Path id={`${id}-f`} d="M-92 -34 Q-92 -44 -82 -44 L82 -44 Q92 -44 92 -34 L88 60 Q88 70 78 70 L-78 70 Q-88 70 -88 60 Z" fill="#4c9fe2" />
        </Layer>
      );
    case 'rings':
      return (
        <Layer id={id} rotation={-20}>
          <Ellipse id={`${id}-a`} x={-70} y={-38} width={90} height={76} stroke={{ color: '#ffffff', width: 6 }} />
          <Ellipse id={`${id}-b`} x={-24} y={-38} width={90} height={76} stroke={{ color: '#ffffff', width: 6 }} />
          <Ellipse id={`${id}-c`} x={-47} y={-6} width={90} height={76} stroke={{ color: '#ffffff', width: 6 }} />
        </Layer>
      );
    case 'check':
      return (
        <Layer id={id}>
          <Path id={`${id}-p`} d="M-62 2 L-40 -20 L-12 8 L48 -52 L70 -30 L-12 50 Z" fill="#ffffff" />
        </Layer>
      );
    case 'script':
      return (
        <Layer id={id}>
          <Path id={`${id}-h`} x={-210} y={-30} d="M0 8 C0 -6 18 -10 24 2 C30 -10 48 -6 48 8 C48 24 30 34 24 44 C18 34 0 24 0 8 Z" fill={accent} />
          <Text id={`${id}-t`} font={fonts.serif} fontStyle="italic" weight={400} size={62} color="#ffffff" x={-150} y={-30} maxWidth={700} lineHeight={1}>{t}</Text>
        </Layer>
      );
    case 'badge':
      return (
        <Layer id={id}>
          <Layer id={`${id}-pl`} x={70} y={-42}>
            <Photo id={`${id}-p`} src={item.photo} r={82} />
            <Ellipse id={`${id}-pd`} x={-82} y={-82} width={164} height={164} fill="#000000" opacity={0.45} />
          </Layer>
          <Ellipse id={`${id}-c`} x={-84} y={-84} width={168} height={168} fill="#e4e4e4" />
          <Centered id={`${id}-t`} font={fonts.ui} size={110} weight={700} color="#0a0a0a">{t.slice(0, 1)}</Centered>
        </Layer>
      );
    case 'note':
      return (
        <Layer id={id} rotation={-10}>
          <Text id={`${id}-t`} font={fonts.ui} weight={400} size={20} color="#d8d8d8" x={-100} y={-70} maxWidth={200} lineHeight={1.15}>{t}</Text>
        </Layer>
      );
  }
};

export const RecapDial: React.FC<RecapDialProps> = (p) => {
  const frame = useCurrentFrame();
  const ui = useFamily(p.font, ['400', '500', '700']);
  const display = useFamily(p.display, ['400']);
  const serif = useFamily(p.serif, ['400'], true);
  const fonts = { ui, display, serif };
  const rot = turn(frame);

  // dimming by distance from the middle row
  const labelOp = (a: number) => interpolate(Math.abs(a), [0, 8, 19, 38, 66], [1, 0.62, 0.5, 0.3, 0.1], { extrapolateRight: 'clamp' });
  const tickOp = (a: number) => interpolate(Math.abs(a), [0, 38, 72], [0.7, 0.4, 0.1], { extrapolateRight: 'clamp' });
  const itemOp = (a: number) => interpolate(Math.abs(a), [0, 19, 38, 57, 76], [1, 0.82, 0.5, 0.26, 0.1], { extrapolateRight: 'clamp' });

  const ticks: React.ReactNode[] = [];
  for (let i = 0; i < 48; i++) {
    if (i % 4 === 0) continue;
    const a = wrap(i / 4 - rot) * SPAN;
    if (Math.abs(a) > 80) continue;
    const q = place(a, -20);
    ticks.push(
      <Layer key={`t${i}`} id={`rd-t${i}`} x={q.x} y={q.y} rotation={q.rot} opacity={tickOp(a)}>
        <Rect id={`rd-t${i}-r`} x={-36} y={-1.5} width={72} height={3} fill="#9a9a9a" />
      </Layer>,
    );
  }

  const labels = p.labels.map((name, i) => {
    const a = wrap(i - rot) * SPAN;
    if (Math.abs(a) > 80) return null;
    const q = place(a, 0);
    return (
      <Layer key={`l${i}`} id={`rd-l${i}`} x={q.x} y={q.y} rotation={q.rot} opacity={labelOp(a)}>
        <Centered id={`rd-l${i}-t`} font={ui} size={26} weight={500} color="#ffffff" w={400}>{name.toUpperCase()}</Centered>
      </Layer>
    );
  });

  const items = p.items.map((item, i) => {
    const a = wrap(item.at - rot) * SPAN;
    if (Math.abs(a) > 90) return null;
    const q = place(a, item.inset);
    return (
      <Layer key={`i${i}`} id={`rd-i${i}`} x={q.x} y={q.y} rotation={q.rot} scale={item.size} opacity={itemOp(a)}>
        <Sticker id={`rd-i${i}-s`} item={item} fonts={fonts} accent={p.accent} />
      </Layer>
    );
  });

  const blur = p.blur && moving(frame) ? { samples: 8, shutter: 0.22 } : undefined;
  const corner = { font: ui, weight: 500, size: 17, color: '#ffffff', lineHeight: 1 } as const;

  return (
    <Layer id="rd-root">
      <Rect id="rd-bg" x={0} y={0} width={W} height={H} fill={p.ground} />
      <Layer id="rd-wheel" motionBlur={blur}>
        {ticks}
        {labels}
        {items}
      </Layer>
      <Text id="rd-brand" font={ui} weight={700} size={30} color="#ffffff" x={24} y={22} lineHeight={1}>{p.brand}</Text>
      <Text id="rd-tag" {...corner} align="right" x={W - 424} y={30} maxWidth={400}>{p.tag}</Text>
      <Text id="rd-f0" {...corner} x={24} y={H - 46}>{p.footer[0]}</Text>
      <Text id="rd-f1" {...corner} align="center" x={W / 2 - 300} y={H - 46} maxWidth={600}>{p.footer[1]}</Text>
      <Text id="rd-f2" {...corner} align="right" x={W - 424} y={H - 46} maxWidth={400}>{p.footer[2]}</Text>
    </Layer>
  );
};
