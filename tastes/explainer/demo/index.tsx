// The explainer taste kit (tastes/explainer) in its measured palette, `red`: a four-beat reel with our own script and real
// cut-outs (Fred Ott, 1894, public domain; cut from vj-demo's matte, eroded 3 px and feathered so no fringe shows).
// Beat 1 rises a bust behind the keyword and pushes out in layers; beat 2 slides one in from the right under corner stars
// and wipes to black through a circle; beat 3 is a black interlude where the type blooms; beat 4 closes.
//
//   node ../kinetograph/packages/cli/dist/cli.js render tastes/explainer/demo/index.tsx --comp Red -o tastes/explainer/demo/out/red.mp4

import React from 'react';
import { AbsoluteFill, Composition, registerRoot, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { CircleWipe, Keyword, Lead, Paper, Prop, Star, push, red, starLength } from '../index.js';

const T = red;
const A = { from: 0, push: 56, end: 70 };
const B = { from: 71, wipe: 172, end: 180 };
const C = { from: 181, out: 220, end: 235 };
const D = { from: 236, end: 290 };

const Reel: React.FC = () => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  return (
    <AbsoluteFill>
      <Paper taste={T} dark={f >= B.end && f <= C.end} />

      {f <= A.end && (
        <>
          <Lead taste={T} text="the one rule nobody teaches" x={0.15} y={0.22} at={1} rate={1.15} dx={push(f, A.push, 0.005)} />
          <Keyword taste={T} size={0.2} dx={push(f, A.push + 1, 0.0027)} lines={[
            { words: ['cut'], x: 0.13, y: 0.33, at: [37] },
            { words: ['on', 'the'], x: 0.14, y: 0.425, at: [40, 43] },
            { words: ['beat'], x: 0.14, y: 0.52, at: [46] },
          ]} />
          <Prop src={staticFile('bust-a.png')} from={A.from} at={2} enter="rise" size={1.6} aspect={1800 / 932} x={0.88} y={1 - (1.6 / (1800 / 932)) * (W / H) / 2}
            dx={push(f, A.push + 4, 0.01)} />
        </>
      )}

      {f >= B.from && f <= B.end && (
        <>
          <Lead taste={T} text="An edit without any rhythm" x={0.113} y={0.32} at={B.from + 1} rate={0.9} />
          <Keyword taste={T} size={0.13} lines={[
            { words: ['feels'], x: 0.22, y: 0.4, at: [B.from + 65] },
            { words: ['twice', 'as'], x: 0.14, y: 0.47, at: [B.from + 72, B.from + 75] },
            { words: ['long'], x: 0.22, y: 0.54, at: [B.from + 80] },
          ]} />
          <Prop src={staticFile('bust-b.png')} from={B.from} at={2} enter="right" keep={0.82} size={1.3} aspect={1568 / 896} x={0.8} y={1 - (1.3 / (1568 / 896)) * (W / H) / 2} />
          <Star cx={1.0} cy={0.115} length={starLength(f, B.from + 9, 0.42, -0.05)} color={T.star!} />
          <Star cx={0.02} cy={0.97} length={starLength(f, B.from + 7, 0.42, -0.15)} color={T.star!} />
        </>
      )}

      {/* the circle wipe from the object's centre into the black interlude */}
      <CircleWipe f={f} t0={B.wipe} cx={0.6} cy={0.8} color={T.dark}>
        {f >= B.end - 2 && f <= C.end && (
          <AbsoluteFill>
            <Star cx={0} cy={0.015} length={0.55} color={T.starOnDark!} soft={0.03} />
            <Star cx={1} cy={0.985} length={0.6} color={T.starOnDark!} soft={0.03} />
            <Lead taste={T} text="and long is" x={0.4} y={0.465} at={C.from + 2} rate={1.2} dark out={C.out} />
            <Keyword taste={T} size={0.052} dark out={C.out} lines={[{ words: ['where', 'they', 'scroll'], x: 0.3, y: 0.497, at: [C.from + 19, C.from + 22, C.from + 25] }]} />
          </AbsoluteFill>
        )}
      </CircleWipe>

      {f >= D.from && (
        <>
          <Lead taste={T} text="Follow for more editing notes" x={0.22} y={0.5} at={D.from + 1} rate={2.5} />
        </>
      )}
    </AbsoluteFill>
  );
};

registerRoot(() => <Composition id="Red" component={Reel} durationInFrames={D.end} fps={30} width={1080} height={1920} />);
