// Collage burst: a UI promo in three beats, timed to a measured 4.4 s, 1280x720 reference.
//   0 - 14   a wordmark fades in on black, holds, and pulls back
//  14 - 70   screenshot cards burst out of one point and the camera flies in; the cards settle into a dense wall that
//            drifts, then whips off to the right
//  68 - 130  big white type on black: "One" slides in from the left, the line completes; the second line is a cut
// Everything is authored in the reference's 1280x720 pixels (a camera maps them to 1920x1080 through K).
//
// Render from the kinetograph-ui root:
//   node ../kinetograph/packages/cli/dist/cli.js render templates/collage-burst/index.tsx -o templates/collage-burst/out/collage-burst.mp4

import React from 'react';
import { Composition, registerRoot, useCurrentFrame } from 'remotion';
import { Camera, Layer, Rect, Text } from '@kinetographdev/core';
import { CARD_KINDS, CamIcon } from './cards.js';
import { DURATION, FPS, H, K, W, easeInOut, ensureFont, glide, lerpKeys, ramp, rrPath, textWidth } from './lib.js';
import { DEFAULT_PROPS, DEFAULT_TEXTS, ThemeContext } from './theme.js';
import type { CollageBurstProps, Theme } from './theme.js';
import { WALL, motionFor, poseAt } from './wall.js';

const CX = 640;
const CY = 360;

// ---- the wall ---------------------------------------------------------------------------------------------------

const Wall: React.FC<{ seed: number }> = ({ seed }) => {
  const f = useCurrentFrame();
  const out: React.ReactNode[] = [];
  WALL.forEach((card, i) => {
    const pose = poseAt(card, f);
    if (!pose) return;
    const [, , rw, rh] = card.rect;
    const hw = (rw * pose.s) / 2 + 30;
    const hh = (rh * pose.s) / 2 + 30;
    if (pose.x + hw < 0 || pose.x - hw > 1280 || pose.y + hh < 0 || pose.y - hh > 720) return;
    const m = motionFor(i, seed);
    const tiltOn = card.from <= 21;
    const flat = tiltOn ? ramp(f, card.from, card.from + 7, 1, 0) : 0; // 1 = tilted, 0 = flat
    const pop = card.tilts ? ramp(f, card.from, card.from + 3, 0.7, 1) : 1;
    const fade = card.from <= 17 ? ramp(f, card.from, card.from + 1.2, 0, 1, (t) => t) : 1;
    const Card = CARD_KINDS[card.kind];
    const clipW = rw + (card.kind === 'automated' ? 92 : 0);
    out.push(
      <Layer
        key={card.id}
        id={`card-${card.id}`}
        x={pose.x * K}
        y={pose.y * K}
        anchorX={rw / 2}
        anchorY={rh / 2}
        scale={K * pose.s * pop}
        opacity={fade}
        rotateX={flat > 0.002 ? m.tiltX * flat : undefined}
        rotateY={flat > 0.002 ? m.tiltY * flat : undefined}
      >
        <Layer id={`clip-${card.id}`} clip={{ kind: 'path', d: rrPath(clipW, rh, 5) }}>
          <Card w={rw} h={rh} seed={i + seed} />
        </Layer>
      </Layer>,
    );
  });
  return <>{out}</>;
};

// ---- type: the reference sets it a little tight ----------------------------------------------------------------------

/** Tracking in em. */
const TRACK = -0.024;
const tracked = (size: number) => (_c: string, idx: number) => ({ x: idx * TRACK * size });
const trackedWidth = (text: string, font: string, size: number, weight: number) =>
  textWidth(text, font, size, weight) + (Array.from(text).length - 1) * TRACK * size;

// ---- the wordmark -----------------------------------------------------------------------------------------------

const LOGO_SIZE = 94;
const LOGO_WEIGHT = 500;
// opacity is blended in linear light here, so these are the reference's grey levels (63, 117, 178, 217 of 255) as linear values
const LOGO_FADE: [number, number][] = [[0, 0], [1, 0.05], [2, 0.178], [3, 0.445], [4, 0.694], [5, 1]];

const Logo: React.FC<{ theme: Theme; suffix: string; color: string }> = ({ theme, suffix, color }) => {
  const f = useCurrentFrame();
  if (f > 14) return null;
  const label = suffix ? `${theme.brand} ${suffix}` : theme.brand;
  const tw = trackedWidth(label, theme.sans, LOGO_SIZE, LOGO_WEIGHT);
  const iconW = 90;
  const gap = 15;
  const total = iconW + gap + tw;
  // the logo pulls back over the three frames before the cards take over
  const s = lerpKeys(f, [[12, 1], [13, 0.92], [14, 0.78]]);
  return (
    <Layer id="logo" x={CX * K} y={CY * K} scale={K * s} opacity={lerpKeys(f, LOGO_FADE)}>
      <CamIcon x={-total / 2} y={-46} s={1} color={color} />
      <Text x={-total / 2 + iconW + gap} y={-LOGO_SIZE * 0.63 - 3} font={theme.sans} weight={LOGO_WEIGHT} size={LOGO_SIZE} lineHeight={1.2} color={color} chars={tracked(LOGO_SIZE)}>
        {label}
      </Text>
    </Layer>
  );
};

// ---- the tagline ------------------------------------------------------------------------------------------------

const TAG_SIZE = 93.5;
const TAG_WEIGHT = 500;

interface PhraseSpec {
  /** Frame the line is cut in. */
  start: number;
  /** The first word slides left to make room over `slideFrom`..`slideTo`. */
  slideFrom: number;
  slideTo: number;
  /** The rest of the line fades in over `restFrom`..`restTo`. */
  restFrom: number;
  restTo: number;
  /** The gap between the words is tight at `slideTo` and opens to a normal space by `gapTo`. */
  gapTo: number;
  scale: [number, number][];
}

const PHRASES: PhraseSpec[] = [
  { start: 68, slideFrom: 84, slideTo: 88.5, restFrom: 87, restTo: 88, gapTo: 92, scale: [[83, 1], [88, 0.978], [92, 1], [96, 0.983], [100, 0.955], [102, 0.917]] },
  { start: 104, slideFrom: 112, slideTo: 116, restFrom: 114.4, restTo: 115.4, gapTo: 116.6, scale: [[104, 1], [106, 0.977], [110, 0.965], [112, 0.958], [116, 0.935], [118, 0.935], [124, 0.902], [129, 0.885]] },
];

// "One" enters from the left while the wall whips away: its offset from where it will rest, per frame
const ENTRY: [number, number][] = [[68, -794], [69, -531], [70, -192], [72, -89], [75, -35], [78, -11], [80, -3], [83, 0]];

const Tagline: React.FC<{ theme: Theme; lines: [string, string]; color: string }> = ({ theme, lines, color }) => {
  const f = useCurrentFrame();
  const idx = f >= PHRASES[1].start ? 1 : 0;
  const p = PHRASES[idx];
  if (f < p.start) return null;
  const words = lines[idx].split(' ');
  const first = words[0];
  const rest = words.slice(1).join(' ');
  const space = textWidth(' ', theme.sans, TAG_SIZE, TAG_WEIGHT) || TAG_SIZE * 0.26;
  const gap = space * (0.2 + 0.8 * ramp(f, p.slideTo, p.gapTo, 0, 1, easeInOut));
  const w0 = trackedWidth(first, theme.sans, TAG_SIZE, TAG_WEIGHT);
  const w1 = rest ? trackedWidth(rest, theme.sans, TAG_SIZE, TAG_WEIGHT) : 0;
  const total = w0 + (rest ? gap + w1 : 0);
  const left = -total / 2;
  const slide = ramp(f, p.slideFrom, p.slideTo, 1, 0, easeInOut); // 1: first word alone and centred, 0: in its place
  const entry = idx === 0 ? glide(f, ENTRY) : 0;
  const x0 = left + ((total - w0) / 2) * slide + entry;
  const s = lerpKeys(f, p.scale);
  const restOpacity = ramp(f, p.restFrom, p.restTo, 0, 1, (t) => t);
  const y = -TAG_SIZE * 0.6 + 2;
  return (
    <Layer id="tagline" x={CX * K} y={CY * K} scale={K * s}>
      <Text id="tag-first" x={x0} y={y} font={theme.sans} weight={TAG_WEIGHT} size={TAG_SIZE} lineHeight={1.2} color={color} chars={tracked(TAG_SIZE)}>
        {first}
      </Text>
      {rest ? (
        <Text id="tag-rest" x={left + w0 + gap} y={y} opacity={restOpacity} font={theme.sans} weight={TAG_WEIGHT} size={TAG_SIZE} lineHeight={1.2} color={color} chars={tracked(TAG_SIZE)}>
          {rest}
        </Text>
      ) : null}
    </Layer>
  );
};

// ---- the composition --------------------------------------------------------------------------------------------

export const CollageBurst: React.FC<CollageBurstProps> = (props) => {
  const f = useCurrentFrame();
  const p = { ...DEFAULT_PROPS, ...props };
  ensureFont(p.sansFont, ['400', '500', '600', '700']);
  ensureFont(p.monoFont, ['400', '500']);
  ensureFont(p.serifFont, ['400', '500', '700']);
  const theme: Theme = {
    sans: p.sansFont,
    mono: p.monoFont,
    serif: p.serifFont,
    ink: p.textColor,
    paper: p.paper,
    dark: p.dark,
    accent: p.accent,
    brand: p.brand,
    texts: { ...DEFAULT_TEXTS, ...p.cardTexts },
    images: p.images,
  };
  return (
    <ThemeContext.Provider value={theme}>
      <Rect id="bg" width={W} height={H} fill={p.background} />
      <Camera perspective={1700} />
      <Logo theme={theme} suffix={p.brandSuffix} color={p.textColor} />
      <Tagline theme={theme} lines={p.lines} color={p.textColor} />
      {f >= 14 && f < 70 ? <Wall seed={p.seed} /> : null}
    </ThemeContext.Provider>
  );
};

registerRoot(() => (
  <Composition
    id="CollageBurst"
    component={CollageBurst}
    width={W}
    height={H}
    fps={FPS}
    durationInFrames={DURATION}
    defaultProps={DEFAULT_PROPS}
  />
));
