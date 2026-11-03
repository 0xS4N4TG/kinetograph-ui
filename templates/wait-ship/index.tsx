// Wait-ship: a 2.5 s UI promo, timed to a measured reference. On a near-black ground seven photo cards float round the
// edges of the frame, out of focus at first; a camera pulls back and racks focus, "You wait..." comes up out of the
// blur, is replaced by "Ship it with <brand>" (a blur that clears left to right, last letters last), and the
// whole scene slides off to the right with depth, bringing the left card into focus.
//
// Timing is the reference's, measured frame by frame at 60 fps (reference/reel.mp4, not committed): the zoom and the
// blur settle by about frame 60, the text swaps on frame 60, the line holds and drifts slightly left on frames
// 100-130, and the slide runs from frame 120 to the clip's last frame (148), still accelerating when the clip ends.
//
// The photos are drawn in code (art.tsx). Pass `images` to use your own; text, colours and font are props.
//
//   node ../kinetograph/packages/cli/dist/cli.js studio templates/wait-ship/index.tsx
//   node ../kinetograph/packages/cli/dist/cli.js render templates/wait-ship/index.tsx -o templates/wait-ship/out/wait-ship.mp4

import React from 'react';
import { z } from 'zod';
import { Composition, registerRoot, staticFile, useCurrentFrame } from 'remotion';
import { Layer, Rect, Text, brightness, blur, glow, linearGradient, saturate } from '@kinetographdev/core';
import { measureText } from '@remotion/layout-utils';
import { makeGoogleFont } from '@kinetographdev/core/google-fonts';
import { Photo } from './art.js';
import { DURATION, FPS, H, K, W, clamp, curve, easeOutCubic, ramp, smooth } from './lib.js';

export const waitShipSchema = z.object({
  lineOne: z.string().describe('The first line, which comes up out of the blur.'),
  lineTwo: z.string().describe('The second line. {brand} is replaced by the brand text.'),
  brand: z.string().describe('The product name for {brand} in the second line.'),
  fontFamily: z.string().describe('A Google Fonts family or module name. The reference face is a tight grotesque close to Inter Tight; Geist works too.'),
  fontWeight: z.number().min(100).max(900).describe('Weight of both lines.'),
  textSize: z.number().min(10).max(120).describe('Font size in reference units (the frame is 960 wide). Long second lines shrink to fit.'),
  tracking: z.number().min(-0.1).max(0.3).describe('Letter spacing in em.'),
  textColor: z.string().describe('Colour of both lines.'),
  glowAmount: z.number().min(0).max(1).describe('Strength of the soft halo round the text.'),
  backgroundTop: z.string().describe('Top of the near-black ground.'),
  backgroundBottom: z.string().describe('Bottom of the ground.'),
  images: z
    .array(z.string())
    .describe('Photos for the seven cards in order: sunset head, hand in light, dusk ribbon, coast (the card that sharpens at the end), figure in haze, hill, smear. Paths under public/ (staticFile) or full paths. A missing or empty entry keeps the drawn stand-in.'),
  cardGrain: z.number().min(0).max(0.3).describe('Film grain on the cards.'),
  blurAmount: z.number().min(0).max(2).describe('Multiplies every depth-of-field blur: 0 is everything sharp, 1 is the reference.'),
  slideAmount: z.number().min(0).max(2).describe('Multiplies the closing slide to the right.'),
  switchAt: z.number().int().min(10).max(120).describe('Frame (60 fps) on which line one is replaced by line two.'),
});
export type WaitShipProps = z.infer<typeof waitShipSchema>;

export const defaultProps: WaitShipProps = {
  lineOne: 'You wait...',
  lineTwo: 'Ship it with {brand}',
  brand: 'Kinetograph',
  fontFamily: 'InterTight',
  fontWeight: 600,
  textSize: 47,
  tracking: -0.04,
  textColor: '#ffffff',
  glowAmount: 0.03,
  backgroundTop: '#18171c',
  backgroundBottom: '#0c0c0f',
  images: [],
  cardGrain: 0.03,
  blurAmount: 1,
  slideAmount: 1,
  switchAt: 60,
};

// ---------------------------------------------------------------------------------------------------------------
// The cards. Positions are the reference's at rest (frame 100), in 960 x 540 units; `drift` is how far the card
// creeps right by frame 120; `slide` is how far it travels in the closing slide, as a multiple of that slide's
// pan curve (near cards travel more); `blur` is its depth-of-field blur by frame, in the same units.

interface CardDef {
  x: number;
  y: number;
  w: number;
  h: number;
  drift: number;
  slide: number;
  /** crisp: the picture blurs inside a hard-edged frame (the reference's A, C, D, G); soft: the whole card blurs (B, E, F). */
  crisp: boolean;
  blur: [number, number][];
}

const CARDS: CardDef[] = [
  { x: 123, y: -30, w: 134, h: 161, drift: 5, slide: 0.76, crisp: true, blur: [[0, 13], [4, 8], [8, 3.6], [12, 1.5], [20, 0.4], [28, 0]] },
  { x: 442, y: 46, w: 98, h: 133, drift: 5, slide: 0.93, crisp: false, blur: [[0, 13], [4, 8], [8, 3.4], [12, 1.4], [20, 0.4], [28, 0]] },
  { x: 673, y: 90, w: 170, h: 117, drift: 3, slide: 0.71, crisp: true, blur: [[0, 14], [4, 8], [10, 2.5], [24, 1], [40, 3], [60, 2.8], [80, 1.5], [100, 0.4], [112, 0]] },
  { x: -132, y: 181, w: 268, h: 273, drift: 7, slide: 1.15, crisp: true, blur: [[0, 14], [6, 7], [12, 3.5], [24, 2], [40, 2.4], [60, 3.5], [100, 4.1], [124, 3.8], [136, 1.6], [147, 0]] },
  { x: 234, y: 415, w: 137, h: 93, drift: 4, slide: 0.77, crisp: false, blur: [[0, 16], [6, 9], [12, 5], [24, 5], [40, 5.5], [56, 3.5], [70, 1.8], [85, 0.8], [100, 0.3], [112, 0]] },
  { x: 563, y: 399, w: 145, h: 150, drift: 8, slide: 1.54, crisp: false, blur: [[0, 16], [6, 10], [12, 6], [18, 3], [24, 1.2], [40, 0.5], [60, 0.2], [74, 0]] },
  { x: 811, y: 316, w: 220, h: 250, drift: 5, slide: 1.7, crisp: true, blur: [[0, 16], [6, 8], [12, 1.5], [24, 0.6], [40, 0]] },
];

/** The closing slide's pan, frames 120..148, in reference units for a card with slide = 1 (measured off the text). */
const SLIDE: [number, number][] = [
  [121, 0], [123, 2], [125, 3], [127, 4], [129, 7], [131, 11], [133, 15], [135, 21], [137, 28],
  [139, 36], [141, 48], [143, 63], [145, 88], [147, 123],
];

/** The text's own x motion (relative to its rest, reference units): a small drift left, back, then the slide. */
const TEXT_DX: [number, number][] = [
  [101, 0], [103, -1], [105, -5], [107, -9], [109, -12], [111, -13], [113, -15], [115, -16], [121, -16],
  [123, -14], [125, -13], [127, -12], [129, -9], [131, -5], [133, -1], [135, 5], [137, 12], [139, 20],
  [141, 32], [143, 47], [145, 72], [147, 107],
];

const ZOOM_START = 0.26;
const ZOOM_TAU = 19;
const zoomAt = (f: number) => 1 + ZOOM_START * Math.exp(-f / ZOOM_TAU);

const CX = 480;
const CY = 270;

// ---------------------------------------------------------------------------------------------------------------
// Fonts.

const loaded = new Set<string>();
function useFont(family: string, weight: number): string {
  const key = `${family}:${weight}`;
  const font = makeGoogleFont(family);
  if (!loaded.has(key)) {
    font.loadFont('normal', { weights: [String(weight)] });
    loaded.add(key);
  }
  return font.fontFamily;
}

// ---------------------------------------------------------------------------------------------------------------
// A line of text drawn a character at a time, so each letter can carry its own blur. Letters sit where the font's
// own layout would put them (kerning included) plus the tracking.

interface LineProps {
  id: string;
  text: string;
  family: string;
  weight: number;
  size: number;
  tracking: number;
  color: string;
  glowAmount: number;
  /** Centre of the line, reference units. */
  cx: number;
  cy: number;
  scale?: number;
  opacity?: number;
  /** Blur (reference units) for letter `i` of `n` visible ones. */
  blurFor: (i: number, n: number) => number;
}

/** Where the cap-height centre sits relative to the middle of a font-sized line box (em), found by looking. */
const CAP_CENTRE = -0.008;

const Line: React.FC<LineProps> = ({ id, text, family, weight, size, tracking, color, glowAmount, cx, cy, scale = 1, opacity = 1, blurFor }) => {
  const m = (t: string) => measureText({ text: t, fontFamily: family, fontSize: size, fontWeight: weight }).width;
  const chars = Array.from(text);
  const track = tracking * size;
  const xs: number[] = [];
  let acc = '';
  chars.forEach((ch, i) => {
    acc += ch;
    xs.push(ch === ' ' ? 0 : m(acc) - m(ch) + i * track);
  });
  const total = m(text) + (chars.length - 1) * track;
  const visible = chars.map((c, i) => [c, i] as const).filter(([c]) => c !== ' ');
  return (
    <Layer id={id} x={cx * K} y={cy * K} scale={K * scale} opacity={opacity}>
      {visible.map(([ch, i], j) => {
        const sigma = blurFor(j, visible.length) * K * scale;
        const effects = [];
        if (glowAmount > 0) effects.push(glow({ radius: 3 * K, color, intensity: glowAmount }));
        if (sigma >= 0.6) effects.push(blur(sigma));
        return (
          <Layer key={i} id={`${id}-${i}`} x={xs[i] - total / 2} y={-size / 2 - CAP_CENTRE * size} effects={effects}>
            <Text font={family} weight={weight} size={size} color={color} lineHeight={1}>
              {ch}
            </Text>
          </Layer>
        );
      })}
    </Layer>
  );
};

// ---------------------------------------------------------------------------------------------------------------

const resolveSrc = (s: string | undefined): string | undefined => {
  if (!s) return undefined;
  return /^(\/|[a-z]+:)/i.test(s) ? s : staticFile(s);
};

export const WaitShip: React.FC<WaitShipProps> = (p) => {
  const f = useCurrentFrame();
  const family = useFont(p.fontFamily, p.fontWeight);
  const zoom = zoomAt(f);
  const ba = p.blurAmount;

  // --- cards
  const cards = CARDS.map((c, i) => {
    const slide = p.slideAmount * c.slide * curve(f, SLIDE);
    const rx = c.x + (c.drift * (f - 100)) / 120 + slide;
    const sigmaRef = curve(f, c.blur) * ba;
    const sigma = sigmaRef * K * zoom;
    const effects = [];
    if (i === 3) {
      const lit = smooth(ramp(f, 124, 147));
      effects.push(brightness(0.8 + 0.2 * lit), saturate(0.92 + 0.16 * lit));
    }
    const photo = <Photo index={i} src={resolveSrc(p.images[i])} w={c.w} h={c.h} seed={11 + i * 7} grainAmount={p.cardGrain} />;
    let body: React.ReactNode = photo;
    if (c.crisp) {
      // blur the picture inside a hard-edged frame; grow it a little so the blur has pixels to pull from at the edges
      const e = 1 + (2.4 * sigmaRef) / Math.min(c.w, c.h);
      body = (
        <Layer id={`frame-${i}`} clip={{ kind: 'polygon', points: [[0, 0], [c.w, 0], [c.w, c.h], [0, c.h]] }}>
          <Layer
            id={`inner-${i}`}
            x={(c.w / 2) * (1 - e)}
            y={(c.h / 2) * (1 - e)}
            scale={e}
            effects={sigma >= 0.6 ? [blur(sigma)] : []}
          >
            {photo}
          </Layer>
        </Layer>
      );
    } else if (sigma >= 0.6) {
      effects.push(blur(sigma));
    }
    const canvasX = (CX + (rx - CX) * zoom) * K;
    if (canvasX > W + sigma * 3 + 4) return null; // slid off the right edge
    return (
      <Layer
        key={i}
        id={`card-${i}`}
        x={canvasX}
        y={(CY + (c.y - CY) * zoom) * K}
        scale={K * zoom}
        effects={effects}
      >
        {body}
      </Layer>
    );
  });

  // --- text
  const lineTwoText = p.lineTwo.replace('{brand}', p.brand);
  const fit = (t: string) => {
    const w = measureText({ text: t, fontFamily: family, fontSize: p.textSize, fontWeight: p.fontWeight }).width + (Array.from(t).length - 1) * p.tracking * p.textSize;
    return w > 820 ? (p.textSize * 820) / w : p.textSize;
  };
  const size = Math.min(fit(lineTwoText), fit(p.lineOne));

  const first = f < p.switchAt;
  const u = f - p.switchAt;
  const textY = 276;
  const textDx = f > 100 ? curve(f, TEXT_DX) * p.slideAmount : 0;

  const lineOneBlur = () => 22 * Math.exp(-f / 7) * ba;
  const lineTwoBlur = (j: number, n: number) => {
    const k = j - (n - 3);
    const tailW = k >= 0 ? [0.05, 0.3, 1][k] : 0;
    const general = 1.6 * (1 - easeOutCubic(u / 12));
    const tail = 9 * tailW * Math.pow(clamp(1 - u / 46), 1.2);
    return (general + tail) * ba;
  };

  return (
    <Layer id="root">
      <Rect id="ground" width={W} height={H} fill={linearGradient([p.backgroundTop, p.backgroundBottom], { angle: 180 })} />
      {cards}
      {first ? (
        <Line
          id="line-one"
          text={p.lineOne}
          family={family}
          weight={p.fontWeight}
          size={size}
          tracking={p.tracking}
          color={p.textColor}
          glowAmount={p.glowAmount}
          cx={CX}
          cy={textY}
          scale={1 + 0.86 * Math.exp(-Math.max(f, 3) / 13.7)}
          opacity={curve(f, [[0, 0.2], [3, 0.22], [8, 0.38], [12, 0.47], [18, 0.72], [24, 0.97], [27, 1]])}
          blurFor={lineOneBlur}
        />
      ) : (
        <Line
          id="line-two"
          text={lineTwoText}
          family={family}
          weight={p.fontWeight}
          size={size}
          tracking={p.tracking}
          color={p.textColor}
          glowAmount={p.glowAmount}
          cx={CX + textDx}
          cy={textY}
          blurFor={lineTwoBlur}
        />
      )}
    </Layer>
  );
};

registerRoot(() => (
  <Composition
    id="WaitShip"
    component={WaitShip}
    schema={waitShipSchema}
    defaultProps={defaultProps}
    durationInFrames={DURATION}
    fps={FPS}
    width={W}
    height={H}
  />
));
