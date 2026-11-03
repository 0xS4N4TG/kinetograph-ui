// Word flash: a black-and-white type spot cut on every hit of its track, timed frame by frame to a reference
// reel (positions, sizes, scales and entry moves measured off its frames). One word, or a two-word lockup, per cut;
// the background swaps black/white at every cut. The intro rises out of a blur, slides in from the left and pushes
// in; the run of words lands 1.2x large and settles, under film dust; the last word types on and blurs away.
//
// A component: the copy and the cuts are in script.ts, and tools/cuts.mjs makes cuts for another track. The audio
// (public/audio.m4a) is the reference's and is not committed.
//
// Render from the kinetograph-ui root:
//   node ../kinetograph/packages/cli/dist/cli.js strip templates/word-flash/index.tsx -n 24 -o templates/word-flash/out/strip.png
//   node ../kinetograph/packages/cli/dist/cli.js render templates/word-flash/index.tsx -o templates/word-flash/out/word-flash.mp4

import React from 'react';
import { Audio, Composition, interpolate, registerRoot, staticFile, useCurrentFrame } from 'remotion';
import { Ellipse, Layer, Rect, blur } from '@kinetographdev/core';
import { clamp } from '../../kit/core/timing.js';
import { DARK, Dust, FPS, H, LIGHT, W, Word, ribbon, smear, directionalBlur, fit, grainBlur, ink } from './lib.js';
import { CUTS, END, SCRIPT } from './script.js';

/** a measured curve, one value a frame from the cut, held after its end */
const curve = (t: number, v: number[]) => interpolate(t, v.map((_, i) => i), v, clamp);

/** how a run word settles: scale against its resting size, frame by frame from the cut (measured) */
const SETTLE = [1.216, 1.134, 1.1, 1.08, 1.062, 1.046, 1.035, 1.024, 1.015, 1.008, 1.002, 0.998, 0.995, 0.993, 0.991];
/** the run's type size and baseline */
const RUN_W = { word: 'precision', width: 638 };
const RUN_BASELINE = 975;
/** run words whose ink centre sits off the middle in the reference */
const RUN_CX: Record<number, number> = { 0: 533, 1: 534, 2: 533, 3: 539 };

type ShotProps = { t: number; f: number; ink: string; bg: string };

// ---- intro ----

const [FIRST, SECOND, THIRD, FOURTH, FIFTH] = SCRIPT.intro;
const SMALL = { cx: 541.5, bottom: 916, width: 308 };
const BIG = { left: 151, bottom: 1136, width: 784 };
const SIDE = { left: 108, bottom: 814, width: 276 };
const SIDE_BIG = { left: 109, bottom: 1115, width: 849 };
const PUSH = { cx: 532, bottom: 1109, width: 693 };

/** the small word, rising out of a grainy vertical blur */
const Small: React.FC<{ color: string; t?: number }> = ({ color, t = 99 }) => {
  const sy = curve(t, [16, 8, 5, 3.5, 2.5, 2.2, 1.5, 1.2, 0.8, 0.5, 0]);
  return (
    <Layer effects={sy > 0.3 ? [grainBlur(sy * 0.5, sy * 1.6)] : []}>
      <Word text={FIRST} size={fit(FIRST, SMALL.width)} at={SMALL} color={color} />
    </Layer>
  );
};

const Intro: React.FC<ShotProps & { i: number }> = ({ i, t, ink }) => {
  if (i === 0) return <Small color={ink} t={t} />;
  if (i === 1) {
    const len = curve(t, [50, 6, 2, 0]);
    return (
      <>
        <Small color={ink} />
        <Layer effects={len > 0.5 ? [smear(len)] : []}>
          <Word text={SECOND} size={fit(SECOND, BIG.width)} at={BIG} color={ink} />
        </Layer>
      </>
    );
  }
  const side = <Word text={THIRD} size={fit(THIRD, SIDE.width)} at={SIDE} color={ink} />;
  if (i === 2) {
    const dx = curve(t, [-130, -83, -61, -46, -36, -27, -21, -16, -12, -9, -6, -4, -2, -1, -1, 0]);
    const v = Math.abs(curve(t + 1, [-130, -83, -61, -46, -36, -27, -21, -16, -12, -9, -6, -4, -2, -1, -1, 0]) - dx);
    return <Layer x={dx} effects={t < 6 ? [directionalBlur(Math.max(v, 14) * 0.35, 1, 0)] : []}>{side}</Layer>;
  }
  if (i === 3)
    return (
      <>
        {side}
        <Word text={FOURTH} size={fit(FOURTH, SIDE_BIG.width)} at={SIDE_BIG} color={ink} />
      </>
    );
  const s = curve(t, [0.871, 0.913, 0.943, 0.959, 0.971, 0.978, 0.984, 0.987, 0.991, 0.994, 0.995, 0.997, 0.998, 0.999, 1]);
  return <Word text={FIFTH} size={fit(FIFTH, PUSH.width)} at={PUSH} color={ink} scale={s} />;
};

// ---- the run ----

const runSize = () => fit(RUN_W.word, RUN_W.width);

/** The first run word bends in on a sine that flattens out over six frames, then settles a little. */
const Bent: React.FC<ShotProps> = ({ t, ink: color }) => {
  const text = SCRIPT.run[0];
  const amp = curve(t, [95, 55, 18, 7, 2, 0]);
  const thin = curve(t, [0.03, 0.12, 0.45, 0.8, 0.95, 1]);
  const s = curve(t, [1.051, 1.051, 1.051, 1.051, 1.051, 1.051, 1.04, 1.031, 1.022, 1.013, 1.009, 1.004, 1, 1]);
  const size = runSize();
  const k = ink(text);
  return (
    <Layer effects={thin < 0.995 ? [ribbon(amp, thin, RUN_CX[0] - ((k.r - k.l) * size) / 2, (k.r - k.l) * size, RUN_BASELINE - 0.25 * size)] : []}>
      <Word text={text} size={size} at={{ cx: RUN_CX[0], baseline: RUN_BASELINE }} color={color} scale={s} />
    </Layer>
  );
};

/** The second run word lands large like the rest, but its i comes in dotless and the dot drops onto it. */
const Dotted: React.FC<ShotProps> = ({ t, ink: color }) => {
  const text = SCRIPT.run[1];
  const size = runSize();
  const s = curve(t, [1.226, 1.144, 1.112, 1.089, 1.071, 1.055, 1.043, 1.033, 1.024, 1.016, 1.012, 1.008, 1.004, 1]);
  const at = { cx: RUN_CX[1], baseline: RUN_BASELINE };
  const i = Array.from(text).indexOf('i');
  if (i < 0) return <Word text={text} size={size} at={at} color={color} scale={s} />;
  const stem = ink('ı');
  const dot = ink('i');
  const d = (stem.r - stem.l) * size * 1.12;
  const drop = curve(t, [-999, -0.2, -0.09, 0]) * size;
  const k = ink(text);
  return (
    <Word
      text={text.replace('i', 'ı')}
      size={size}
      at={at}
      color={color}
      scale={s}
      extra={(pen) =>
        t >= 1 ? (
          <Ellipse
            x={pen.x + (k.pens[i] + (dot.l + dot.r) / 2) * size - d / 2}
            y={pen.y + dot.top * size + drop}
            width={d}
            height={d}
            fill={color}
          />
        ) : null
      }
    />
  );
};

const Settle: React.FC<ShotProps & { n: number }> = ({ n, t, ink: color }) => (
  <Word text={SCRIPT.run[n]} size={runSize()} at={{ cx: RUN_CX[n] ?? 540, baseline: RUN_BASELINE }} color={color} scale={curve(t, SETTLE)} />
);

// ---- the outro ----

const FINAL = SCRIPT.outro[SCRIPT.outro.length - 1];
const OUT = { width: 491, baseline: 971 };
/** how far each typed stage settles, by stage from the first (measured: the first shrinks most, the last not at all) */
const STAGE_SETTLE = [
  [1.145, 1.076, 1.055, 1.034, 1.028, 1.014, 1],
  [1.042, 1.037, 1.028, 1.022, 1.017, 1.014, 1.008, 1.003, 1],
  [1.015, 1.015, 1.01, 1.01, 1.005, 1.005, 1.002, 1],
];

const Typed: React.FC<ShotProps & { n: number; hold?: boolean }> = ({ n, t, ink: color, hold }) => {
  const text = SCRIPT.outro[n];
  const settle = STAGE_SETTLE[n];
  const s = settle ? curve(t, settle) : 1;
  const out = hold && t >= CUTS[CUTS.length - 1] - CUTS[CUTS.length - 2] - 1;
  return (
    <Layer effects={out ? [blur(3.5)] : []}>
      <Word text={text} size={fit(FINAL, OUT.width)} at={{ cx: 540.5, baseline: OUT.baseline }} color={color} scale={out ? 0.985 : s} />
    </Layer>
  );
};

// ---- the spot ----

const INTRO = SCRIPT.intro.length;
const RUN = SCRIPT.run.length;
const OUTRO = SCRIPT.outro.length;

export const WordFlash: React.FC = () => {
  const f = useCurrentFrame();
  let i = CUTS.length - 1;
  while (i > 0 && CUTS[i] > f) i--;
  const t = f - CUTS[i];
  // black and white swap every cut through the hold; the blank after it keeps the hold's
  const swaps = Math.min(i, INTRO + RUN + OUTRO);
  const light = swaps % 2 === 0;
  const p: ShotProps = { t, f, ink: light ? DARK : LIGHT, bg: light ? LIGHT : DARK };
  const run = i - INTRO;
  const out = i - INTRO - RUN;
  const dusty = run >= 2 && run < RUN;
  return (
    <Layer>
      <Rect width={W} height={H} fill={p.bg} />
      {i < INTRO ? <Intro {...p} i={i} /> : null}
      {run === 0 ? <Bent {...p} /> : null}
      {run === 1 ? <Dotted {...p} /> : null}
      {run >= 2 && run < RUN ? <Settle {...p} n={run} /> : null}
      {out >= 0 && out < OUTRO ? <Typed {...p} n={out} /> : null}
      {out === OUTRO ? <Typed {...p} n={OUTRO - 1} hold /> : null}
      {dusty ? <Dust f={f} color={light ? '#2a2a2a' : '#e8e8e8'} /> : null}
      <Audio src={staticFile('audio.m4a')} />
    </Layer>
  );
};

registerRoot(() => <Composition id="WordFlash" component={WordFlash} durationInFrames={END} fps={FPS} width={W} height={H} />);
