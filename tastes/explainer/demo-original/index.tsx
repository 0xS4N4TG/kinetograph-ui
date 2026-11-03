// An original 16-second explainer reel in the kit's own taste `ember` (tastes/explainer/tastes/ember.ts): our script
// about editing, the measured family's type and motion (the lead writing on letter by letter, keywords fading up out of a
// blur, objects on exponential ease-outs with one top-right light), but its own cut: six beats, a mirrored opener with
// the keyword top right and the bust bottom left, one dark beat reached by a blinds wipe, a beat that carries two
// thoughts, ink asterisks in the corners, no small print, and a type-only end card. The objects are public-domain
// sculpture and objects from the Met's Open Access collection, cut out and graded black and white (public/CREDITS.md).
//
//   node ../kinetograph/packages/cli/dist/cli.js render tastes/explainer/demo-original/index.tsx --comp Reel -o tastes/explainer/demo-original/out/reel.mp4

import React from 'react';
import { AbsoluteFill, Composition, registerRoot, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Corner, Keyword, Lead, Paper, Prop, Texture, Wipe, cornerLength, ember, push } from '../index.js';

const T = ember;
const [pl, pk, po] = T.motion.push;
// beats, in frames at 30 fps
const B1 = { from: 0, out: 70, end: 84 };
const B2 = { from: 85, wipe: 172, end: 186 };
const B3 = { from: 180, out: 238, end: 250 };
const B4 = { from: 251, second: 312, push: 356, end: 370 };
const B5 = { from: 371, out: 428, end: 440 };
const B6 = { from: 441, end: 480 };

/** A cut-out's box: `w` wide (fraction of W) at aspect `a`, its top at `top` (fraction of H), its centre at `x`. */
const box = (w: number, a: number, top: number, x: number, W: number, H: number) => ({ size: w, aspect: a, x, y: top + ((w * W) / a / H) / 2 });

const Reel: React.FC = () => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const dark = f >= B2.wipe + 8 && f <= B3.end;

  return (
    <AbsoluteFill>
      <Paper taste={T} dark={dark} />

      {/* 1: mirrored opener. The lead writes on centred at the top, the keyword stacks top right, the bust rises bottom
          left under it; the type leaves by a dissolve wave and the beat cuts. */}
      {f <= B1.end && (
        <>
          <Corner taste={T} cx={0.08} cy={0.06} length={cornerLength(T, f, 6, 0.175)} />
          <Corner taste={T} cx={0.93} cy={0.6} length={cornerLength(T, f, 9, 0.112, -1)} />
          <Lead taste={T} text="what nobody tells new editors" x={0.5} y={0.16} align="center" at={1} out={B1.out} />
          <Keyword taste={T} size={0.17} out={B1.out + 2} lines={[
            { words: ['speed'], x: 0.4, y: 0.25, at: [36] },
            { words: ["isn't"], x: 0.47, y: 0.343, at: [40] },
            { words: ['skill'], x: 0.43, y: 0.436, at: [44] },
          ]} />
          <Prop taste={T} src={staticFile('bust-napoleon.png')} from={B1.from} at={2} enter="rise" {...box(0.86, 912 / 1400, 0.5, 0.3, W, H)} />
        </>
      )}

      {/* 2: the king stands on the floor at the right, covering the tail of the last line; asterisks bottom left and top
          right; the beat leaves by the blinds wipe */}
      {f >= B2.from && f <= B2.end && (
        <>
          <Corner taste={T} cx={0.07} cy={0.93} length={cornerLength(T, f, B2.from + 8, 0.275, -1)} />
          <Corner taste={T} cx={0.92} cy={0.07} length={cornerLength(T, f, B2.from + 10, 0.15)} />
          <Lead taste={T} text="A timeline full of effects" x={0.11} y={0.2} at={B2.from + 1} rate={1} />
          <Keyword taste={T} size={0.13} lines={[
            { words: ['is', 'just'], x: 0.11, y: 0.28, at: [B2.from + 36, B2.from + 40] },
            { words: ['noise', 'in'], x: 0.11, y: 0.35, at: [B2.from + 45, B2.from + 49] },
            { words: ['a', 'hurry'], x: 0.11, y: 0.42, at: [B2.from + 54, B2.from + 58] },
          ]} />
          <Prop taste={T} src={staticFile('king.png')} from={B2.from} at={2} enter="right" keep={0.84} {...box(0.19, 200 / 642, 0.33, 0.74, W, H)} />
        </>
      )}

      {/* 3: inside the blinds, the one dark beat; amber type glows, soft dots in the corners */}
      {f <= B3.end && <Wipe taste={T} f={f} t0={B2.wipe}>
        {f >= B2.wipe + 6 && (
          <AbsoluteFill>
            <Corner taste={T} dark cx={0.1} cy={0.1} length={0.27} />
            <Corner taste={T} dark cx={0.86} cy={0.88} length={0.47} />
            <Lead taste={T} text="and noise is" x={0.5} y={0.455} align="center" at={B3.from + 8} dark out={B3.out} />
            <Keyword taste={T} size={0.062} dark out={B3.out} lines={[{ words: ['where', 'people', 'scroll'], x: 0.2, y: 0.495, at: [B3.from + 24, B3.from + 27, B3.from + 30] }]} />
          </AbsoluteFill>
        )}
      </Wipe>}

      {/* 4: two thoughts in one beat. The hourglass slides in from the left; "earn its own second" pops in at the right;
          then "or hand the moment to the next" writes on underneath. Everything pushes out left. */}
      {f >= B4.from && f <= B4.end && (
        <>
          <Corner taste={T} cx={0.91} cy={0.09} length={cornerLength(T, f, B4.from + 9, 0.163)} />
          <Lead taste={T} text="Every cut in a reel should" x={0.5} y={0.17} align="center" at={B4.from + 2} dx={push(f, B4.push, pl)} />
          <Keyword taste={T} size={0.13} pop dx={push(f, B4.push + 1, pk)} lines={[
            { words: ['earn'], x: 0.47, y: 0.25, at: [B4.from + 30] },
            { words: ['its', 'own'], x: 0.47, y: 0.32, at: [B4.from + 38, B4.from + 41] },
            { words: ['second'], x: 0.47, y: 0.39, at: [B4.from + 47] },
          ]} />
          <Lead taste={T} text="or hand the moment" x={0.47} y={0.5} at={B4.second} dx={push(f, B4.push, pl)} />
          <Keyword taste={T} size={0.075} dx={push(f, B4.push + 1, pk)} lines={[{ words: ['to', 'the', 'next'], x: 0.47, y: 0.55, at: [B4.second + 20, B4.second + 23, B4.second + 26] }]} />
          <Prop taste={T} src={staticFile('hourglass.png')} from={B4.from} at={2} enter="left" keep={0.86} {...box(0.25, 470 / 1400, 0.24, 0.24, W, H)} dx={push(f, B4.push + 4, po)} />
        </>
      )}

      {/* 5: a bust slides in from the right and stands in front of the last line's tail */}
      {f >= B5.from && f <= B5.end && (
        <>
          <Corner taste={T} cx={0.06} cy={0.9} length={cornerLength(T, f, B5.from + 8, 0.225, -1)} />
          <Lead taste={T} text="Cutting on autopilot does" x={0.1} y={0.22} at={B5.from + 1} out={B5.out} />
          <Keyword taste={T} size={0.1} out={B5.out + 2} lines={[
            { words: ['neither', 'of'], x: 0.1, y: 0.28, at: [B5.from + 30, B5.from + 34] },
            { words: ['those'], x: 0.1, y: 0.335, at: [B5.from + 39] },
            { words: ['well'], x: 0.1, y: 0.39, at: [B5.from + 44] },
          ]} />
          <Prop taste={T} src={staticFile('bust-caligula.png')} from={B5.from} at={2} enter="right" keep={0.85} {...box(0.8, 929 / 1270, 0.4, 0.68, W, H)} />
        </>
      )}

      {/* 6: the end card, type only: one big word, the line under it, an asterisk turning beside it */}
      {f >= B6.from && (
        <>
          <Keyword taste={T} size={0.2} lines={[{ words: ['follow'], x: 0.16, y: 0.45, at: [B6.from + 1] }]} />
          <Lead taste={T} text="for more editing notes" x={0.18} y={0.535} at={B6.from + 6} rate={2} />
          <div style={{ position: 'absolute', inset: 0, transform: `rotate(${((f - B6.from) * 1.2).toFixed(1)}deg)`, transformOrigin: `${0.84 * W}px ${0.4 * H}px` }}>
            <Corner taste={T} cx={0.84} cy={0.4} length={cornerLength(T, f, B6.from + 3, 0.125)} />
          </div>
        </>
      )}
      <Texture taste={T} dark={dark} />
    </AbsoluteFill>
  );
};

registerRoot(() => <Composition id="Reel" component={Reel} durationInFrames={B6.end} fps={30} width={1080} height={1920} />);
