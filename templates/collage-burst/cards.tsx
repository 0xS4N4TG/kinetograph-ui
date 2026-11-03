// The screenshot cards, drawn in code: simple UI mock layouts with text lines, buttons and abstract photo-like
// gradients. Each is drawn in its own local pixels (origin at the card's top left, 1 unit = 1 pixel of the 1280x720
// reference at rest scale) at the size the wall gives it. With `images` set, the photo cards (and the screens of the
// UI cards) show those pictures instead.

import React from 'react';
import { Ellipse, Image, Layer, Path, Rect, Text, blur, grain, linearGradient, radialGradient } from '@kinetographdev/core';
import { staticFile, useCurrentFrame } from 'remotion';
import { lerpKeys, rrPath, textWidth } from './lib.js';
import { WALL, pan, poseAt } from './wall.js';
import { useTheme } from './theme.js';

// ---- primitives -----------------------------------------------------------------------------------------------

interface RProps {
  x?: number;
  y?: number;
  w: number;
  h: number;
  r?: number;
  fill?: any;
  stroke?: { color: string; width: number };
  opacity?: number;
}
const R: React.FC<RProps> = ({ x = 0, y = 0, w, h, r = 0, fill, stroke, opacity }) => (
  <Rect x={x} y={y} width={w} height={h} radius={r} fill={fill} stroke={stroke} opacity={opacity} />
);

interface TProps {
  x: number;
  y: number;
  size: number;
  color?: string;
  weight?: number;
  mono?: boolean;
  serif?: boolean;
  /** y is the middle of the line (default) or its top. */
  top?: boolean;
  w?: number;
  align?: 'left' | 'center' | 'right';
  lh?: number;
  children: string;
}
const Tx: React.FC<TProps> = ({ x, y, size, color = '#1a1a1b', weight = 400, mono, serif, top, w, align, lh = 1.2, children }) => {
  const t = useTheme();
  const oy = top ? y : y - (size * lh) / 2;
  return (
    <Text
      x={x}
      y={oy}
      font={mono ? t.mono : serif ? t.serif : t.sans}
      weight={weight}
      size={size}
      color={color}
      lineHeight={lh}
      maxWidth={w}
      align={align}
    >
      {children}
    </Text>
  );
};

/** Font size at which `text` is `target` px wide. */
function fit(text: string, font: string, weight: number, target: number): number {
  return (20 * target) / textWidth(text, font, 20, weight);
}

/** Grey bars standing in for small lines of text. */
const Lines: React.FC<{ x: number; y: number; widths: number[]; gap?: number; h?: number; color?: string }> = ({
  x,
  y,
  widths,
  gap = 7,
  h = 3,
  color = '#d4d3ce',
}) => (
  <>
    {widths.map((wd, i) => (
      <R key={i} x={x} y={y + i * gap} w={wd} h={h} r={h / 2} fill={color} />
    ))}
  </>
);

/** The wordmark's camera glyph, 90 x 72.5 at s = 1: a thick C-shaped body with a notch at the bottom left, and a lens
 *  wedge pointing at its open side. */
export const CamIcon: React.FC<{ x: number; y: number; s: number; color?: string }> = ({ x, y, s, color = '#ffffff' }) => (
  <Layer x={x} y={y} scale={s}>
    <Path
      d="M6 0 H60 Q63 0 63 3 V15 H23 Q15 15 15 23 V49 Q15 57 23 57 H63 V69.5 Q63 72.5 60 72.5 H16 Q13 72.5 13 69.5 V61 Q13 58 10 58 H3 Q0 58 0 55 V6 Q0 0 6 0 Z"
      fill={color}
    />
    <Path d="M64.5 36 L88.8 10.5 Q90 9.6 90 11 V61.5 Q90 62.8 88.8 61.8 Z" fill={color} />
  </Layer>
);

// ---- abstract photos --------------------------------------------------------------------------------------------

const clipOf = (w: number, h: number, r: number) => ({ kind: 'path' as const, d: rrPath(w, h, r) });

/** A head and shoulders in profile, facing left (or right with `flip`), as path data in a w x h box. */
const profilePath = (w: number, h: number, ox = 0, oy = 0, flip = false) => {
  const p = (x: number, y: number) => `${(ox + (flip ? 1 - x : x) * w).toFixed(1)} ${(oy + y * h).toFixed(1)}`;
  return (
    `M${p(0.62, 0.04)} C${p(0.46, 0.03)} ${p(0.38, 0.14)} ${p(0.37, 0.26)} C${p(0.36, 0.33)} ${p(0.33, 0.36)} ${p(0.28, 0.42)} ` +
    `C${p(0.26, 0.45)} ${p(0.25, 0.48)} ${p(0.28, 0.49)} L${p(0.33, 0.5)} C${p(0.31, 0.53)} ${p(0.32, 0.55)} ${p(0.34, 0.56)} ` +
    `C${p(0.32, 0.6)} ${p(0.34, 0.63)} ${p(0.38, 0.65)} C${p(0.44, 0.68)} ${p(0.5, 0.7)} ${p(0.52, 0.76)} ` +
    `C${p(0.5, 0.82)} ${p(0.3, 0.84)} ${p(0.12, 0.92)} L${p(0.05, 1)} L${p(1, 1)} L${p(0.98, 0.9)} ` +
    `C${p(0.9, 0.8)} ${p(0.78, 0.78)} ${p(0.74, 0.7)} C${p(0.88, 0.5)} ${p(0.9, 0.3)} ${p(0.8, 0.15)} C${p(0.74, 0.07)} ${p(0.68, 0.04)} ${p(0.62, 0.04)}Z`
  );
};

/** A drawn picture. `art` picks one of the looks: duotone portraits, sunsets, rays, foliage. */
export const Photo: React.FC<{ x?: number; y?: number; w: number; h: number; art: number; r?: number }> = ({ x = 0, y = 0, w, h, art, r = 0 }) => {
  const t = useTheme();
  const clip = clipOf(w, h, r);
  if (t.images.length) {
    return <Image x={x} y={y} src={staticFile(t.images[Math.abs(art) % t.images.length])} width={w} height={h} fit="cover" clip={clip} />;
  }
  const head = (cx: number, cy: number, rr: number, col: string, op = 1) => (
    <>
      <Ellipse x={cx - rr * 0.8} y={cy - rr} width={rr * 1.6} height={rr * 2} fill={col} opacity={op} />
      <Path d={`M${cx - rr * 1.9} ${h} Q${cx - rr * 1.7} ${cy + rr * 1.5} ${cx} ${cy + rr * 1.4} Q${cx + rr * 1.7} ${cy + rr * 1.5} ${cx + rr * 1.9} ${h}Z`} fill={col} opacity={op} />
    </>
  );
  let body: React.ReactNode;
  switch (Math.abs(art) % 10) {
    case 0: // cream card, black head in profile with a sunset inside it
      body = (
        <>
          <Rect width={w} height={h} fill="#f0ead9" />
          <Path d={profilePath(w, h, 0, 0, true)} fill="#0b0908" />
          <Layer clip={{ kind: 'path', d: profilePath(w, h, 0, 0, true) }}>
            <Ellipse x={w * 0.2} y={h * 0.02} width={w * 0.55} height={h * 0.5} fill={linearGradient(['#ffd36a', '#f2761c', '#6a240e'], { angle: 180 })} />
            <Rect x={w * 0.2} y={h * 0.46} width={w * 0.55} height={h * 0.06} fill="rgba(14,10,8,0.85)" />
          </Layer>
        </>
      );
      break;
    case 1: // red-orange haze with a dark blurred figure
      body = (
        <>
          <Rect width={w} height={h} fill={linearGradient(['#7a1208', '#e8421c', '#ff8a2c', '#e8421c'], { angle: 100 })} />
          <Layer effects={[blur(4)]}>
            <Path d={profilePath(w * 0.9, h * 1.05, w * 0.15, h * 0.05, true)} fill="#16070a" opacity={0.85} />
          </Layer>
          <Ellipse x={w * 0.02} y={h * 0.3} width={w * 0.45} height={h * 0.4} fill="rgba(255,170,60,0.45)" />
        </>
      );
      break;
    case 2: // deep blue with a glowing profile line
      body = (
        <>
          <Rect width={w} height={h} fill={linearGradient(['#0d2a78', '#2d62d0', '#1b8cb0'], { angle: 190 })} />
          <Path d={profilePath(w, h, 0, 0)} fill="#0b1c52" opacity={0.75} />
          <Path d={profilePath(w, h, 0, 0)} stroke={{ color: '#ffb83d', width: 2.2 }} />
          <Ellipse x={w * 0.1} y={h * 0.3} width={w * 0.5} height={h * 0.18} fill="rgba(255,205,90,0.55)" />
        </>
      );
      break;
    case 3: // teal sky, small standing figure, pink flowers
      body = (
        <>
          <Rect width={w} height={h} fill={linearGradient(['#2a7f95', '#7fc0cf', '#e8d8d0'], { angle: 180 })} />
          <Ellipse x={w * 0.6} y={h * 0.36} width={w * 0.07} height={h * 0.06} fill="#101820" />
          <Path d={`M${w * 0.6} ${h * 0.42} l${w * 0.08} 0 l${w * 0.02} ${h * 0.2} l${-w * 0.03} ${h * 0.1} l${-w * 0.02} ${-h * 0.1} l${-w * 0.02} ${h * 0.1} l${-w * 0.03} ${-h * 0.12}Z`} fill="#101820" />
          <Ellipse x={w * 0.14} y={h * 0.82} width={w * 0.7} height={h * 0.22} fill="#c8416c" opacity={0.85} />
          <Ellipse x={w * 0.5} y={h * 0.86} width={w * 0.6} height={h * 0.2} fill="#e0709a" opacity={0.8} />
        </>
      );
      break;
    case 4: // dark with light rays and a warm base
      body = (
        <>
          <Rect width={w} height={h} fill={linearGradient(['#0a1626', '#14395c', '#2a3a40'], { angle: 180 })} />
          <Path d={`M${w * 0.1} 0 L${w * 0.55} ${h} L${w * 0.35} ${h}Z`} fill="rgba(210,235,255,0.35)" />
          <Path d={`M${w * 0.4} 0 L${w * 0.95} ${h} L${w * 0.7} ${h}Z`} fill="rgba(190,220,255,0.25)" />
          <Ellipse x={w * 0.25} y={h * 0.82} width={w * 0.5} height={h * 0.3} fill="rgba(255,150,70,0.8)" />
        </>
      );
      break;
    case 5: // sunset over a hill
      body = (
        <>
          <Rect width={w} height={h} fill={linearGradient(['#f7b04a', '#e0561f', '#4a1a10'], { angle: 170 })} />
          <Ellipse x={w * 0.15} y={h * 0.05} width={w * 0.7} height={h * 0.55} fill={radialGradient(['rgba(255,236,190,0.85)', 'rgba(255,255,255,0)'])} />
          <Path d={`M0 ${h} L0 ${h * 0.72} Q${w * 0.3} ${h * 0.55} ${w * 0.55} ${h * 0.75} Q${w * 0.8} ${h * 0.6} ${w} ${h * 0.7} V${h}Z`} fill="#0d0a0b" opacity={0.6} />
        </>
      );
      break;
    case 6: // violet to blue portrait
      body = (
        <>
          <Rect width={w} height={h} fill={linearGradient(['#3b2a8a', '#4d6fe0', '#f0a07a'], { angle: 200 })} />
          <Path d={profilePath(w, h, 0, 0)} fill="#150f2a" opacity={0.78} />
          <Ellipse x={w * 0.1} y={h * 0.12} width={w * 0.6} height={h * 0.22} fill="rgba(255,190,120,0.45)" />
        </>
      );
      break;
    case 7: // foliage with a pale petal
      body = (
        <>
          <Rect width={w} height={h} fill={linearGradient(['#07140a', '#143a1a', '#0a2210'], { angle: 140 })} />
          <Layer effects={[blur(5)]}>
            {[
              [0.05, 0.05, 0.5, 0.28, -20, '#2f6a2c'],
              [0.45, 0.02, 0.5, 0.3, 25, '#3f7f34'],
              [0.0, 0.4, 0.4, 0.3, 40, '#1e5222'],
              [0.55, 0.5, 0.45, 0.35, -30, '#2d6a2a'],
              [0.1, 0.72, 0.6, 0.3, 10, '#5d9a3a'],
              [0.5, 0.78, 0.5, 0.25, -15, '#86b04a'],
            ].map((l, i) => (
              <Layer key={i} x={w * (l[0] as number) + (w * (l[2] as number)) / 2} y={h * (l[1] as number) + (h * (l[3] as number)) / 2} rotation={l[4] as number} anchorX={(w * (l[2] as number)) / 2} anchorY={(h * (l[3] as number)) / 2}>
                <Ellipse width={w * (l[2] as number)} height={h * (l[3] as number)} fill={l[5] as string} opacity={0.85} />
              </Layer>
            ))}
          </Layer>
          <Layer effects={[blur(2)]}>
            <Layer x={w * 0.62} y={h * 0.5} rotation={-28} anchorX={w * 0.14} anchorY={h * 0.16}>
              <Ellipse width={w * 0.28} height={h * 0.32} fill={linearGradient(['#f4efb4', '#d9d27a'], { angle: 200 })} opacity={0.95} />
            </Layer>
          </Layer>
        </>
      );
      break;
    case 8: // cool grey stone
      body = (
        <>
          <Rect width={w} height={h} fill={linearGradient(['#e6e8ea', '#8a9096', '#3a3e44'], { angle: 160 })} />
          <Ellipse x={w * 0.1} y={h * 0.15} width={w * 0.5} height={h * 0.4} fill="rgba(255,255,255,0.4)" />
        </>
      );
      break;
    default: // warm wood
      body = (
        <>
          <Rect width={w} height={h} fill={linearGradient(['#d89a6a', '#a8603a', '#5a2c1a'], { angle: 150 })} />
          <Rect y={h * 0.3} width={w} height={h * 0.06} fill="rgba(60,24,10,0.35)" />
          <Rect y={h * 0.62} width={w} height={h * 0.05} fill="rgba(60,24,10,0.3)" />
        </>
      );
  }
  return (
    <Layer x={x} y={y} clip={clip} effects={[grain(0.05, { seed: 3 + art, size: 1.2, animate: false })]}>
      {body}
    </Layer>
  );
};

/** A screen: a user image when given, else the drawn children. */
const Screen: React.FC<{ w: number; h: number; r?: number; seed: number; children: React.ReactNode }> = ({ w, h, r = 0, seed, children }) => {
  const t = useTheme();
  return t.images.length ? <Photo w={w} h={h} art={seed} r={r} /> : <>{children}</>;
};

// ---- cards ------------------------------------------------------------------------------------------------------

export interface CardProps {
  w: number;
  h: number;
  seed: number;
}

/** Greedy word wrap with the measured width of each word. */
function wrap(text: string, font: string, size: number, weight: number, maxW: number): { text: string; start: number; end: number }[] {
  const words = text.split(' ');
  const lines: { text: string; start: number; end: number }[] = [];
  let cur = '';
  let start = 0;
  words.forEach((wd, i) => {
    const tryLine = cur ? `${cur} ${wd}` : wd;
    if (cur && textWidth(tryLine, font, size, weight) > maxW) {
      lines.push({ text: cur, start, end: i - 1 });
      cur = wd;
      start = i;
    } else cur = tryLine;
  });
  if (cur) lines.push({ text: cur, start, end: words.length - 1 });
  return lines;
}

/** A monitor on a stand: black bezel, a paper screen with a pill, a paragraph with a phrase highlighted, a base. */
export const DocCard: React.FC<CardProps> = ({ w, h, seed }) => {
  const t = useTheme();
  const sh = h - 11;
  const size = 9.55;
  const lh = 19;
  const lines = wrap(t.texts.docBody, t.sans, size, 400, 249);
  return (
    <>
      <R w={w} h={h} r={8} fill="#0a0a0b" />
      <R x={6} y={0} w={w - 12} h={sh} r={3} fill={t.paper} />
      <Screen w={w - 12} h={sh} r={3} seed={seed}>
        <R x={94} y={64} w={118} h={12} r={6} fill="#fdfdfb" />
        <Tx x={99} y={70} size={5.4} color="#a3a29d">
          {t.texts.docQuestion}
        </Tx>
        {lines.map((ln, i) => {
          const words = ln.text.split(' ');
          const a = Math.max(6, ln.start);
          const b = Math.min(9, ln.end);
          const y = 104 + i * lh;
          const x0 = 93;
          return (
            <React.Fragment key={i}>
              {a <= b ? (
                <R
                  x={x0 + textWidth(words.slice(0, a - ln.start).join(' ') + (a > ln.start ? ' ' : ''), t.sans, size, 400) - 1}
                  y={y - 9}
                  w={textWidth(words.slice(a - ln.start, b - ln.start + 1).join(' '), t.sans, size, 400) + 2}
                  h={18}
                  r={3}
                  fill="#dbe3f2"
                />
              ) : null}
              <Tx x={x0} y={y} size={size} color="#25262a">
                {ln.text}
              </Tx>
            </React.Fragment>
          );
        })}
      </Screen>
    </>
  );
};

/** The monitor's base: a dark slab that stays on the wall when the screen flies off. */
export const DocBaseCard: React.FC<CardProps> = ({ w, h }) => (
  <>
    <R w={w - 6} h={h} r={5} fill={linearGradient(['#4d4d52', '#2a2a2d', '#1c1c1e'])} />
  </>
);

export const ChipCard: React.FC<CardProps> = ({ w, h }) => {
  const t = useTheme();
  const lead = `${t.brand} is`;
  const base = fit('installed', t.sans, 400, 74);
  const natural = textWidth(lead + ' ', t.sans, base, 400) + textWidth(t.texts.chipTag, t.sans, base, 400) + 6;
  const size = Math.min(base, (base * (w - 28)) / natural);
  const lw = textWidth(lead + ' ', t.sans, size, 400);
  const cw = textWidth(t.texts.chipTag, t.sans, size, 400) + 6;
  const x0 = (w - lw - cw) / 2;
  const cy = 73.5;
  return (
    <>
      <R w={w} h={h} fill="#3c80e0" />
      <Tx x={x0} y={cy} size={size} color="#17274a">
        {lead}
      </Tx>
      <R x={x0 + lw} y={cy - 10.5} w={cw} h={21} r={5} fill="#131415" />
      <Tx x={x0 + lw + 3} y={cy} size={size} color="#ffffff">
        {t.texts.chipTag}
      </Tx>
    </>
  );
};

export const CodeCard: React.FC<CardProps> = ({ w, h }) => {
  const t = useTheme();
  const size = fit(`${t.texts.codeLead} ${t.texts.codeTail}`, t.mono, 400, 160);
  const lw = textWidth(t.texts.codeLead + ' ', t.mono, size, 400);
  return (
    <>
      <R w={w} h={h} r={6} fill={linearGradient(['#0b0b0c', '#040404'])} />
      <R w={w} h={76} r={6} fill="#1b1b1e" />
      <R x={0} y={30} w={w} h={46} fill="#1b1b1e" />
      <Tx x={16} y={45} size={size} mono color="#8e9fc2">
        {t.texts.codeLead}
      </Tx>
      <Tx x={16 + lw} y={45} size={size} mono color="#f2f2f4" weight={500}>
        {t.texts.codeTail}
      </Tx>
      <R w={w} h={10} r={6} fill="#242428" />
      <Layer effects={[blur(2.5)]}>
        <R x={90} y={90} w={60} h={9} r={3} fill="#1d1d21" />
        <R x={160} y={90} w={44} h={9} r={3} fill="#1d1d21" />
        <R x={118} y={108} w={90} h={9} r={3} fill="#18181b" />
      </Layer>
    </>
  );
};

export const TileCard: React.FC<CardProps> = ({ w, h }) => (
  <>
    <R w={w} h={h} fill="#060707" />
    <CamIcon x={w / 2 - 12} y={h * 0.5 - 9} s={0.27} color="#eceded" />
  </>
);

/** A small screenshot of the chat UI on a black card. */
export const MiniCard: React.FC<CardProps> = ({ w, h, seed }) => (
  <>
    <R w={w} h={h} fill="#030303" />
    <R x={0} y={28} w={w} h={98} fill="#f3f3f0" />
    <Screen w={w} h={98} seed={seed + 1}>
      <R x={5} y={34} w={64} h={5} r={2.5} fill="#d4d3cf" />
      <Lines x={3} y={44} widths={[72, 58, 66, 40]} gap={4} h={1.5} color="#b9b8b3" />
      {[4, 30, 56].map((x, i) => (
        <R key={i} x={x} y={64} w={24.5} h={27} r={2} fill="#ffffff" stroke={{ color: '#e1e0dc', width: 0.6 }} />
      ))}
      <R x={2} y={98} w={92} h={26} r={5} fill="#ffffff" stroke={{ color: '#dedcd7', width: 0.6 }} />
      <R x={84} y={113} w={7} h={7} r={2} fill="#2b6be3" />
    </Screen>
    <R x={0} y={126} w={w} h={7} fill="#202022" />
  </>
);

export const CaptionCard: React.FC<CardProps> = ({ w, h, seed }) => {
  const t = useTheme();
  const cap = t.texts.caption;
  const size = fit(DEFAULT_CAPTION, t.sans, 600, 250);
  const cw = textWidth(cap, t.sans, size, 600) + 8;
  return (
    <>
      <R w={w} h={h} r={14} fill="#3b3b3e" />
      <R x={6} y={0} w={w - 12} h={h - 7} r={10} fill="#fafaf8" />
      <Screen w={w - 12} h={h - 7} r={10} seed={seed + 2}>
        <></>
      </Screen>
      <R x={25} y={155} w={cw} h={15} fill="#08080a" />
      <Tx x={29} y={162.5} size={size} color="#ffffff" weight={600}>
        {cap}
      </Tx>
    </>
  );
};
const DEFAULT_CAPTION = 'Acme reconciles every transaction automatically';

export const ChatCard: React.FC<CardProps> = ({ w, h, seed }) => {
  const t = useTheme();
  return (
    <>
      <R w={w} h={h} r={6} fill="#0f0f11" />
      <R x={5} y={5} w={w - 10} h={h - 11} r={2} fill="#fcfcfb" />
      <Screen w={w - 10} h={h - 11} r={2} seed={seed + 3}>
        <R x={134} y={9} w={72} h={9} r={4.5} fill="#f4f3f0" />
        <Tx x={134} y={13.5} w={72} align="center" size={3.9} color="#3a3a3c">
          {t.texts.chatQuestion}
        </Tx>
        <Tx x={23} y={33} size={4.6} color="#1a1a1b" weight={700} serif>
          Analyzing your prompt gaps ...
        </Tx>
        <Tx x={23} y={39} size={3.8} color="#3a3a3c" weight={500} serif>
          Found 27 prompts you should rank for and don't yet, so your
        </Tx>
        <Tx x={23} y={43} size={3.8} color="#3a3a3c" weight={500} serif>
          name shows up everywhere AI looks.
        </Tx>
        <Tx x={23} y={58.5} size={6} color="#2a2a2c" serif>
          Your AI visibility score: 34%
        </Tx>
        {[23.5, 70.5, 116.5].map((x, i) => (
          <R key={i} x={x} y={68} w={43.5} h={50} r={3} fill="#ffffff" stroke={{ color: '#dbdad5', width: 0.8 }} />
        ))}
        <Lines x={29} y={86} widths={[24, 30, 20]} gap={4} h={1.6} color="#d2d1cc" />
        <Lines x={76} y={86} widths={[24, 30, 20]} gap={4} h={1.6} color="#d2d1cc" />
        <R x={21} y={130} w={191} h={44} r={9} fill="#fefefd" stroke={{ color: '#dddcd7', width: 0.8 }} />
        <Tx x={31} y={142} size={5} color="#222224">
          {t.texts.chatQuestion}
        </Tx>
        <Tx x={30} y={163} size={7} color="#7a7a76">
          +
        </Tx>
        <Tx x={186} y={164} size={4.2} color="#9a9a96">
          Auto
        </Tx>
        <R x={198} y={162} w={9} h={9} r={2.5} fill="#2f6bdb" />
      </Screen>
    </>
  );
};

export const InputCard: React.FC<CardProps> = ({ w, h, seed }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  // the line is longer than the card and right-aligned, so only its tail shows; the caret blinks
  const typed = t.texts.typed;
  const size = fit('look exp', t.sans, 400, 71);
  const tw = textWidth(typed, t.sans, size, 400);
  const caret = Math.floor(f / 8) % 2 === 0;
  const right = 208;
  return (
    <>
      <R w={w + 8} h={h + 8} r={5} fill="#2d2d2f" />
      <R w={w} h={h} r={3} fill="#fbfbfa" />
      <Screen w={w} h={h} r={3} seed={seed + 4}>
        <R x={0} y={72} w={w} h={1} fill="#dcdbd6" />
        <R x={0} y={124} w={w} h={1} fill="#dcdbd6" />
        <Tx x={right - tw} y={98} size={size} color="#1c1c1e">
          {typed}
        </Tx>
        {caret ? <R x={right + 1} y={86} w={1.6} h={24} fill="#1c1c1e" /> : null}
      </Screen>
    </>
  );
};

export const BarCard: React.FC<CardProps> = ({ w, h }) => (
  <>
    <R w={w} h={h} r={5} fill={linearGradient(['#49494d', '#2a2a2d', '#1b1b1d'])} />
    <R x={w * 0.4} y={0} w={w * 0.2} h={4} r={2} fill="#1c1c1f" />
  </>
);

const tileFill = (i: number) =>
  [
    linearGradient(['#f4f4f2', '#a9aaad'], { angle: 140 }),
    linearGradient(['#2f6b34', '#0e2b12'], { angle: 140 }),
    linearGradient(['#d8d7d4', '#7e8084'], { angle: 160 }),
    linearGradient(['#bd7348', '#6e3a1f'], { angle: 140 }),
    linearGradient(['#e9edf0', '#9ba7b3'], { angle: 120 }),
    linearGradient(['#4a4b4f', '#16171a'], { angle: 140 }),
  ][i % 6];

/** Where the ring and its title sit on the screen (centre, 1280x720 pixels), measured on the reference: they fly in
 *  ahead of the dark card they sit on, then hold still on the screen while the wall settles under them. */
const RING_X: [number, number][] = [[18, 576], [21, 840], [24, 1160], [26, 1130], [28, 1140], [34, 1165], [40, 1182]];
const RING_Y: [number, number][] = [[18, 303], [21, 282], [24, 275], [26, 330], [28, 368], [40, 368]];

/** The dark ring card: a ring of small photo tiles around a title. The ring is laid out in screen space and
 *  mapped into the card, so it can lead the card while both fly in. */
export const RingCard: React.FC<CardProps> = ({ w, h }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const card = WALL.find((c) => c.id === 'ring')!;
  const pose = poseAt(card, f) ?? { x: 640, y: 360, s: 1 };
  const left = pose.x - (w / 2) * pose.s;
  const top = pose.y - (h / 2) * pose.s;
  const sx = lerpKeys(f, RING_X) + (f > 40 ? pan(f).dx - pan(40).dx : 0);
  const sy = lerpKeys(f, RING_Y);
  const cx = (sx - left) / pose.s;
  const cy = (sy - top) / pose.s;
  const n = 34;
  const size = fit('A whole new universe', t.sans, 500, 226);
  return (
    <Layer clip={{ kind: 'path', d: `M0 0H${w}V${h}H0Z` }}>
      <R w={w} h={h} fill="#0b0b0c" />
      {Array.from({ length: n }).map((_, i) => {
        const outer = i % 2 === 0;
        const a = ((i / n) * 360 + f * 0.6 + (outer ? 0 : 7)) * (Math.PI / 180);
        const rx = outer ? 158 : 128;
        const ry = outer ? 128 : 102;
        const tx = cx + Math.cos(a) * rx;
        const ty = cy + Math.sin(a) * ry;
        const sc = 0.85 + 0.35 * (0.5 + 0.5 * Math.sin(a + 0.8));
        return (
          <Layer key={i} x={tx} y={ty} anchorX={13} anchorY={13} rotation={((i * 47) % 80) - 40 + f * 0.6} scale={sc}>
            <Photo w={26} h={26} r={3.5} art={[8, 7, 9, 8, 4, 7, 9, 5][i % 8]} />
          </Layer>
        );
      })}
      <Tx x={cx - 130} y={cy} w={260} align="center" size={size} weight={500} color="#ffffff">
        {t.texts.ringTitle}
      </Tx>
      <Tx x={cx - 80} y={cy + 24} w={160} align="center" size={5.5} color="#6a6a6e">
        Article — The Design Process
      </Tx>
      <R x={cx - 20} y={cy + 36} w={40} h={13} r={6.5} fill="#2b2b2e" />
      <Tx x={cx - 20} y={cy + 42.5} w={40} align="center" size={5.5} color="#c9c9cc">
        Explore
      </Tx>
    </Layer>
  );
};

/** The grey rounded panel on the ring card's left, with a landscape slice. */
export const PanelCard: React.FC<CardProps> = ({ w, h }) => (
  <>
    <Path
      d={`M3 0 H${w - 14} Q${w} 0 ${w} 14 V${h} H0 V3 Q0 0 3 0Z`}
      fill={linearGradient(['#d6d6d8', '#b2b3b6', '#6a6b6e', '#16171a'], { angle: 180 })}
    />
    <R x={0} y={53} w={43} h={h - 53} fill={linearGradient(['#0a1d3c', '#1a5f88', '#7fb8b4', '#1b3a52'], { angle: 180 })} />
  </>
);

export const SquaresCard: React.FC<CardProps> = ({ w, h, seed }) => {
  const t = useTheme();
  return (
    <>
      <R w={w} h={h} r={6} fill="#f6f5f0" />
      <Screen w={w} h={h} r={6} seed={seed + 5}>
        {Array.from({ length: 6 }).map((_, i) => (
          <R key={i} x={53.5 + i * 20.5} y={66.5} w={19.5} h={19} r={3} fill="#0a0aff" />
        ))}
      </Screen>
    </>
  );
};

export const ShipCard: React.FC<CardProps> = ({ w, h }) => {
  const t = useTheme();
  const size = fit(DEFAULT_SHIP, t.sans, 600, 238);
  return (
    <>
      <R w={w} h={h} r={5} fill="#f9f9f9" />
      <R w={w} h={12} r={0} fill="#222224" />
      <Tx x={0} y={118.5} w={w} align="center" size={size} weight={600} color="#15171a">
        {t.texts.ship}
      </Tx>
    </>
  );
};
const DEFAULT_SHIP = 'Ship. Test. Deploy. Repeat.';

export const EmptyCard: React.FC<CardProps> = ({ w, h }) => (
  <>
    <R w={w} h={h} r={6} fill="#0d0d0e" />
    <R x={5} y={5} w={w - 10} h={h - 10} r={2} fill="#f8f8f6" />
    <Ellipse x={218} y={109} width={7} height={7} stroke={{ color: '#cfcfcf', width: 1 }} />
    <Path d="M221.5 113 L221.5 119 L223 117.8 L224 120 L225 119.6 L224 117.5 L225.8 117.3Z" fill="#111" />
  </>
);

export const ClipsCard: React.FC<CardProps> = ({ w, h }) => {
  const t = useTheme();
  const size = fit(DEFAULT_CLIPS, t.sans, 400, 62);
  const cw = textWidth(t.texts.clips, t.sans, size, 400) + 26;
  return (
    <>
      <R w={w} h={h} fill="#fbfbfb" />
      <R w={w} h={4} fill="#101011" />
      <R x={w - 4} y={0} w={4} h={h} fill="#232325" />
      <Photo x={176} y={3} w={83} h={82} art={0} />
      <Photo x={264} y={3} w={83} h={82} art={1} />
      <Photo x={176} y={89} w={83} h={101} art={2} />
      <Photo x={264} y={89} w={83} h={101} art={3} />
      <Photo x={264} y={195} w={83} h={85} art={4} />
      <R x={214} y={125} w={cw} h={29} r={7} fill="#ffffff" />
      <Tx x={214} y={139.5} w={cw} align="center" size={size} color="#4b75a6">
        {t.texts.clips}
      </Tx>
    </>
  );
};
const DEFAULT_CLIPS = '5 clips';

const FACES = [
  ['#d9a37d', '#2a1a12'],
  ['#c88a62', '#17110e'],
  ['#e8c4a0', '#5a3a22'],
  ['#9a6a4a', '#0e0a08'],
  ['#f0d2b4', '#8a5a30'],
  ['#b88060', '#241810'],
  ['#e0b890', '#3a2a20'],
  ['#7a5a46', '#0a0806'],
];

export const AvatarsCard: React.FC<CardProps> = ({ w, h }) => {
  const t = useTheme();
  const n = 21;
  const [name, rest] = [t.texts.followers.split(' and ')[0], 'and ' + t.texts.followers.split(' and ').slice(1).join(' and ')];
  const bw = textWidth(name + ' ', t.sans, 11, 700);
  return (
    <>
      <R w={w} h={h + 10} r={6} fill="#101011" />
      <R x={4} y={0} w={w - 8} h={h + 10} r={3} fill="#fcfcfb" />
      {Array.from({ length: n }).map((_, i) => {
        const x = 14 + i * 16.4;
        const y = 10 + 7 * Math.sin(i * 0.62 + 0.6) + 2.5 * Math.sin(i * 1.7);
        const [skin, hair] = FACES[(i * 3) % FACES.length];
        const blue = i % 7 === 2;
        const bg = ['#cfd9e2', '#dcccb8', '#a3b8c8', '#e6d6c4', '#b9c4cf'][i % 5];
        return (
          <Layer key={i} x={x} y={y} scale={20 / 17} clip={{ kind: 'path', d: 'M8.5 0A8.5 8.5 0 1 1 8.4 0Z' }}>
            <Ellipse width={17} height={17} fill={blue ? '#69a7c8' : bg} />
            {blue ? null : <Ellipse x={3.5} y={3.5} width={10} height={12} fill={skin} />}
            {blue ? null : <Path d="M3.2 7.5 Q8.5 -1 13.8 7.5 Q8.5 4 3.2 7.5Z" fill={hair} />}
            <Path d="M0 17 Q8.5 10.5 17 17Z" fill={blue ? '#e8f2f8' : '#46566c'} opacity={0.9} />
          </Layer>
        );
      })}
      <Tx x={56} y={59} size={13} weight={700} color="#141415">
        {name}
      </Tx>
      <Ellipse x={56 + bw * 13 / 11 - 3} y={56} width={6} height={6} fill="#2f6bdb" />
      <Tx x={56 + bw * 13 / 11 + 5} y={59} size={13} color="#68686a">
        {rest}
      </Tx>
    </>
  );
};

export const SunsetCard: React.FC<CardProps> = ({ w, h }) => {
  const t = useTheme();
  if (t.images.length) {
    return (
      <>
        <R w={w} h={h} r={6} fill="#1d1d1f" />
        <Photo x={0} y={10} w={w} h={h - 10} art={5} />
      </>
    );
  }
  const top = 10;
  return (
    <>
      <R w={w} h={h} r={6} fill="#1d1d1f" />
      <Layer y={top} clip={clipOf(w, h - top, 2)} effects={[grain(0.11, { seed: 9, size: 1.4, animate: false })]}>
        <Rect width={w} height={h - top} fill={linearGradient([[0, '#c9661c'], [0.25, '#ea9f31'], [0.42, '#f7cf6e'], [0.58, '#eda038'], [0.8, '#b9501a'], [1, '#7a3410']], { angle: 180 })} />
        <Ellipse x={w * 0.2} y={24} width={w * 0.7} height={96} fill={radialGradient(['rgba(255,232,150,0.9)', 'rgba(255,232,150,0)'])} />
        <Rect y={44} width={w} height={9} fill="rgba(170,70,16,0.32)" />
        <Rect y={122} width={w} height={12} fill="rgba(150,56,12,0.34)" />
        <Rect y={156} width={w} height={24} fill="rgba(96,34,8,0.38)" />
        <Path d="M0 0 H66 L50 26 L22 50 L0 74Z" fill="#f3ead4" />
        <Path d="M0 148 Q28 116 70 124 Q92 150 74 192 L0 204Z" fill="#9a4012" />
        <Layer x={42} y={6} rotation={21} effects={[grain(0.45, { seed: 4, size: 1.2, animate: false })]}>
          <R w={112} h={26} fill="#c6c6c6" />
          <R x={30} y={4} w={70} h={9} fill="#101010" />
          <R x={0} y={14} w={44} h={12} fill="#2a2a2a" />
        </Layer>
        <Path d="M112 80 q4 -9 10 -5 l6 6 q-3 5 -9 7 l-7 -4z" fill="#0a0605" />
        <Path d={`M${w - 24} 72 Q${w - 8} 112 ${w - 28} 194 L${w} 194 V72Z`} fill="#0d0705" />
      </Layer>
    </>
  );
};

/** Dark card with a cascade of duotone portraits. */
export const StackCard: React.FC<CardProps> = ({ w, h }) => (
  <>
    <R w={w} h={h} r={4} fill="#2b2b2d" />
    {[
      { x: 176, y: 40, a: 1, r: 3 },
      { x: 120, y: 2, a: 3, r: -2 },
      { x: 74, y: 16, a: 6, r: 2 },
      { x: 128, y: 44, a: 4, r: -1 },
      { x: 62, y: 52, a: 2, r: -2 },
    ].map((p, i) => (
      <Layer key={i} x={p.x + 41} y={p.y + 60} anchorX={41} anchorY={60} rotation={p.r}>
        <Photo w={82} h={120} art={p.a} />
      </Layer>
    ))}
  </>
);

/** White card with a heavy bezel; its big line overflows both sides and is cut by the card. */
export const CommandCard: React.FC<CardProps> = ({ w, h }) => {
  const t = useTheme();
  const size = fit('ne command. Own', t.sans, 600, 237);
  const tw = textWidth(t.texts.command, t.sans, size, 600);
  return (
    <>
      <R w={w} h={h} r={13} fill="#2a2a2c" />
      <Layer x={7} y={7} clip={{ kind: 'path', d: rrPath(w - 14, h - 14, 8) }}>
        <R w={w - 14} h={h - 14} fill="#f6f6f3" />
        <Tx x={(w - 14 - tw) / 2 + 4} y={(h - 14) / 2 + 2} size={size} weight={600} color="#141416">
          {t.texts.command}
        </Tx>
      </Layer>
    </>
  );
};

/** A white card holding a phone-shaped photo of foliage. */
export const NatureCard: React.FC<CardProps> = ({ w, h }) => (
  <>
    <R w={w} h={h} r={10} fill="#f6f6f4" />
    <R w={w} h={14} r={0} fill="#232325" />
    <R x={7} y={24} w={w - 14} h={h - 31} r={24} fill="#0d0d0d" />
    <Photo x={11} y={28} w={w - 22} h={h - 39} art={7} r={21} />
  </>
);

export const GradInputCard: React.FC<CardProps> = ({ w, h }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const tw = textWidth(t.texts.gradPrompt, t.sans, 11, 400);
  return (
    <>
      <R w={w} h={h} r={2} fill="#fbfcfe" />
      <R w={w} h={53} fill={linearGradient(['#b8cdf0', '#d9e5f7'])} />
      <R x={0} y={h - 4} w={w} h={4} fill="#e4e8f0" />
      <Tx x={w - 10 - tw} y={70} size={11} color="#1c1c1e">
        {t.texts.gradPrompt}
      </Tx>
      {Math.floor(f / 8) % 2 === 0 ? <R x={w - 9} y={62} w={1.4} h={16} fill="#1c1c1e" /> : null}
    </>
  );
};

export const NoteCard: React.FC<CardProps> = ({ w, h }) => {
  const t = useTheme();
  const tw = textWidth(t.texts.plan, t.sans, 9.5, 400);
  return (
    <>
      <R w={w} h={h} r={3} fill="#fcfcfb" />
      <R w={w} h={46} fill="#f2f1ef" />
      <Path d="M107 9 L109 14 L114 15 L110 18 L111 23 L107 20 L103 23 L104 18 L100 15 L105 14Z" fill="#3a7de0" />
      <Tx x={w - 8 - tw} y={64} size={9.5} color="#2a2a2c">
        {t.texts.plan}
      </Tx>
      <Lines x={w - 60} y={80} widths={[50]} h={2} color="#e4e3df" />
    </>
  );
};

export const ListCard: React.FC<CardProps> = ({ w, h }) => {
  const t = useTheme();
  return (
    <>
      <R w={w} h={h} r={3} fill={linearGradient(['#e5edfa', '#f7f9fd', '#e3ecfa'], { angle: 180 })} />
      <R x={0} y={20} w={34} h={30} r={3} fill="#ecebe9" />
      <R x={30} y={18} w={150} h={30} r={4} fill="#f3f2f0" />
      <Ellipse x={37} y={22} width={22} height={22} fill="#2f6fd6" />
      <Tx x={37} y={33} w={22} align="center" size={8} weight={600} color="#ffffff">
        PS
      </Tx>
      <Tx x={65} y={29} size={8.2} weight={600} color="#1c1c1e">
        Prompt Send
      </Tx>
      <Tx x={65} y={38} size={4.5} color="#9a9a96">
        Composition
      </Tx>
      <R x={0} y={56} w={34} h={26} r={3} fill="#ecebe9" />
      <R x={54} y={67} w={81} h={17} r={4} fill="#2e74e0" />
      <Tx x={54} y={75.5} w={66} align="center" size={8} weight={600} color="#ffffff">
        Install all
      </Tx>
      <R x={150} y={62} w={40} h={24} r={4} fill="#f1f0ee" />
      <R x={0} y={100} w={188} h={26} r={4} fill="#efeeec" />
      <Ellipse x={5} y={103} width={22} height={22} fill="#ffffff" />
      <Tx x={5} y={114} w={22} align="center" size={6.5} weight={600} color="#3a3a3c">
        OG
      </Tx>
      <Tx x={33} y={110} size={7.5} weight={600} color="#1c1c1e">
        Orbit Gallery
      </Tx>
      <Tx x={33} y={118} size={4.5} color="#9a9a96">
        Composition
      </Tx>
      <Tx x={129} y={114} size={7.5} weight={600} color="#1c1c1e">
        Karaoke Cap
      </Tx>
    </>
  );
};

export const BuiltCard: React.FC<CardProps> = ({ w, h }) => {
  const t = useTheme();
  return (
    <>
      <R w={w} h={h} r={4} fill={linearGradient(['#fafaf8', '#f4f6fa', '#fafaf8'], { angle: 180 })} />
      <R x={w * 0.2} y={0} w={64} h={28} fill="#8a908d" />
      <Tx x={w * 0.2} y={14} w={64} align="center" size={6} color="#d6dad8">
        Figma
      </Tx>
      <R x={w - 85} y={64} w={44} h={44} r={4} fill="#f0f0ee" />
      <Tx x={w - 85} y={85} w={44} align="center" size={14} weight={600} color="#1c1c1e">
        sh
      </Tx>
      <Tx x={83} y={139} size={12.4} weight={500} color="#2a2a2c">
        {t.texts.built}
      </Tx>
      <R x={w - 45} y={186} w={46} h={50} fill="#ebebe9" />
      <Tx x={w - 45} y={210} w={46} align="center" size={16} weight={500} color="#1c1c1e">
        N
      </Tx>
      <R x={w * 0.5 - 8} y={212} w={38} h={38} r={2} fill="#1b2133" />
      <Tx x={w * 0.5 - 8} y={231} w={38} align="center" size={11} weight={600} color="#ffffff">
        Rm
      </Tx>
    </>
  );
};

// ---- the far left of the wall (seen during the whip) ---------------------------------------------------------------

export const SerifCard: React.FC<CardProps> = ({ w, h }) => {
  const t = useTheme();
  const lines = t.texts.serif.split('\n');
  const size = fit(lines[0], t.serif, 700, w - 4);
  return (
    <>
      <R w={w} h={h} r={3} fill="#faf9f6" />
      {lines.map((ln, i) => (
        <Tx key={i} x={0} y={44 + i * 14} w={w - 3} align="right" size={size} weight={700} color="#2a2a2c" serif>
          {ln}
        </Tx>
      ))}
      <R x={3} y={118} w={57} h={117} r={5} fill="#ffffff" stroke={{ color: '#e5e4df', width: 1 }} />
    </>
  );
};

export const StripCard: React.FC<CardProps> = ({ w, h }) => (
  <>
    <R w={w} h={h} r={4} fill="#f4f4f2" />
    <R w={w} h={12} r={4} fill="#202022" />
  </>
);

export const WelcomeCard: React.FC<CardProps> = ({ w, h }) => {
  const t = useTheme();
  const text = t.texts.welcome;
  const parts = text.split(' ');
  const last = parts.pop() ?? '';
  const lead = parts.join(' ') + ' ';
  const size = 20;
  const lw = textWidth(lead, t.sans, size, 500);
  const lastW = textWidth(last, t.sans, size, 500);
  const right = w - 28;
  return (
    <>
      <R w={w} h={h} r={4} fill="#fcfcfb" />
      <R w={w} h={10} fill="#232325" />
      <Tx x={right - lastW - lw} y={111} size={size} weight={500} color="#18181a">
        {lead}
      </Tx>
      <Tx x={right - lastW} y={111} size={size} weight={500} color="#3b6aa8">
        {last}
      </Tx>
    </>
  );
};

export const AutomatedCard: React.FC<CardProps> = ({ w, h }) => {
  const t = useTheme();
  const size = 20;
  const tw = textWidth(t.texts.automated, t.sans, size, 500);
  return (
    <>
      <R w={w} h={h} r={4} fill="#ffffff" />
      <Tx x={w + 92 - 12 - tw} y={110} size={size} weight={500} color="#18181a">
        {t.texts.automated}
      </Tx>
    </>
  );
};

export const CompanyCard: React.FC<CardProps> = ({ w, h }) => {
  const t = useTheme();
  const tw = textWidth(t.texts.company, t.sans, 9, 600);
  const x0 = (w - tw - 13) / 2;
  return (
    <>
      <R w={w} h={h} r={5} fill="#fcfcfb" stroke={{ color: '#e6e5e0', width: 1 }} />
      <CamIcon x={x0} y={h / 2 - 3.4} s={0.095} color={t.accent} />
      <Tx x={x0 + 13} y={h / 2} size={9} weight={600} color={t.accent}>
        {t.texts.company}
      </Tx>
    </>
  );
};

export const MeetCard: React.FC<CardProps> = ({ w, h }) => {
  const t = useTheme();
  return (
    <>
      <R w={w} h={h} r={4} fill="#fcfcfb" />
      <Tx x={12} y={h - 22} size={7.4} weight={500} color="#2a2a2c">
        {t.texts.meet}
      </Tx>
    </>
  );
};

export const CARD_KINDS = {
  doc: DocCard,
  docbase: DocBaseCard,
  chip: ChipCard,
  code: CodeCard,
  tile: TileCard,
  mini: MiniCard,
  caption: CaptionCard,
  chat: ChatCard,
  input: InputCard,
  bar: BarCard,
  ring: RingCard,
  panel: PanelCard,
  squares: SquaresCard,
  ship: ShipCard,
  empty: EmptyCard,
  clips: ClipsCard,
  avatars: AvatarsCard,
  sunset: SunsetCard,
  stack: StackCard,
  command: CommandCard,
  nature: NatureCard,
  grad: GradInputCard,
  note: NoteCard,
  list: ListCard,
  built: BuiltCard,
  serif: SerifCard,
  strip: StripCard,
  welcome: WelcomeCard,
  automated: AutomatedCard,
  company: CompanyCard,
  meet: MeetCard,
} as const;

export type CardKind = keyof typeof CARD_KINDS;
