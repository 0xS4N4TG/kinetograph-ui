// The measured explainer tastes, each cut in its own reference's grammar: its beat layouts (tastes/explainer/layouts.tsx),
// its camera, its transitions and its kind of object, each with a script and pictures of its own. One composition per
// taste (`Taste-<id>`). `ember` is the original reel (tastes/explainer/demo-original); `mono` and `ledger` are drafts read
// from contact sheets and have no reel. Pictures: Met Open Access, CC0 (public/CREDITS.md).
//
//   node ../kinetograph/packages/cli/dist/cli.js render tastes/explainer/demo-tastes/index.tsx --comp Taste-pulse -o tastes/explainer/demo-tastes/out/pulse.mp4

import React from 'react';
import { AbsoluteFill, Composition, registerRoot, staticFile, useCurrentFrame } from 'remotion';
import {
  BleedSide, Camera, CentreStage, Corner, EndCard, FloorSide, HeadlineOver, HeroRise, Interlude, ListBeat, Paper, Ringed, Sandwich,
  StandOn, Texture, Wipe, Wordmark, agency, cornerLength, graph, pulse, push, red, type Pic,
} from '../index.js';

const pic = (name: string, w: number, h: number): Pic => ({ src: staticFile(`${name}.png`), aspect: w / h });
const NAPOLEON = pic('bust-napoleon', 912, 1400), HERODOTOS = pic('bust-herodotos', 777, 1400), MAN = pic('bust-man', 879, 1400);
const KING = pic('king', 200, 642), WATCH = pic('watch', 955, 1332), COIN = pic('coin', 784, 794), FLASK = pic('flask', 838, 1522);

/* red (pin 1119): bust rising behind the keyword, a layered push out, a floor object under needle stars, the circle
   wipe into a black interlude */
const Red: React.FC = () => {
  const f = useCurrentFrame(), T = red, [pl, pk, po] = T.motion.push;
  const A = { push: 58, end: 72 }, B = { from: 73, wipe: 160, end: 168 }, C = { from: 169 };
  return (
    <AbsoluteFill>
      <Paper taste={T} dark={f > B.end} />
      {f <= A.end && <HeroRise taste={T} from={0} pic={NAPOLEON} lead="the one rule nobody teaches" lines={[{ words: ['cut'] }, { words: ['on', 'the'] }, { words: ['beat'] }]}
        dx={[push(f, A.push, pl), push(f, A.push + 1, pk), push(f, A.push + 4, po)]} />}
      {f >= B.from && f <= B.end && (
        <>
          <Corner taste={T} cx={1} cy={0.115} length={cornerLength(T, f, B.from + 9, 0.42, -0.5)} />
          <Corner taste={T} cx={0.02} cy={0.97} length={cornerLength(T, f, B.from + 7, 0.42, -1.5)} />
          <FloorSide taste={T} from={B.from} pic={KING} lead="An edit without any rhythm" lines={[{ words: ['feels'] }, { words: ['twice', 'as'] }, { words: ['long'] }]} />
        </>
      )}
      {f <= C.from + 60 && <Wipe taste={T} f={f} t0={B.wipe} cx={0.68} cy={0.6}>
        {f >= C.from && (
          <AbsoluteFill>
            <Corner taste={T} dark cx={0} cy={0.015} length={0.55} />
            <Corner taste={T} dark cx={1} cy={0.985} length={0.6} />
            <Interlude taste={T} from={C.from} lead="and long is" line={{ words: ['where', 'they', 'scroll'] }} size={0.052} />
          </AbsoluteFill>
        )}
      </Wipe>}
      <Texture taste={T} dark={f > B.end} />
    </AbsoluteFill>
  );
};

/* pulse (pin 933): push into an object bleeding off the left, flicker out; springy two-weight lines glowing on black;
   an object centre stage on the grey band, rolled out; a black iris to the call to action */
const Pulse: React.FC = () => {
  const f = useCurrentFrame(), T = pulse;
  const B1 = { end: 40 }, B2 = { from: 41, end: 80 }, B3 = { from: 81, end: 122 }, B4 = { from: 123, roll: 150, end: 160 }, B5 = { from: 161, iris: 196, end: 205 }, B6 = { from: 201 };
  const dark = (f >= B2.from && f <= B3.end) || f >= B5.iris + 4;
  return (
    <AbsoluteFill style={{ background: dark ? T.dark : T.paper }}>
      {f <= B1.end && (
        <Camera taste={T} move="flicker" t0={34}>
          <Camera taste={T} move="push" t0={0}>
            <AbsoluteFill><Paper taste={T} />
              <BleedSide taste={T} from={0} pic={WATCH} lead="You've got the"
                lines={[{ words: ['skills', 'and'], plain: [1] }, { words: ['the', 'footage'], plain: [0] }]} />
            </AbsoluteFill>
          </Camera>
        </Camera>
      )}
      {f >= B2.from && f <= B2.end && <Interlude taste={T} from={B2.from} line={{ words: ['But', 'your', 'reach?'], plain: [0, 1] }} size={0.09} />}
      {f >= B3.from && f <= B3.end && <Interlude taste={T} from={B3.from} line={{ words: ['Because', 'posting'], plain: [0] }} size={0.075} />}
      {f >= B4.from && f <= B4.end && (
        <Camera taste={T} move="roll-out" t0={B4.roll}>
          <AbsoluteFill><Paper taste={T} />
            <CentreStage taste={T} from={B4.from} pic={COIN} line={{ words: ['is', 'just', 'guessing'], plain: [0, 1] }} />
          </AbsoluteFill>
        </Camera>
      )}
      {f >= B5.from && f <= B5.end && (
        <AbsoluteFill><Paper taste={T} />
          <Interlude taste={T} dark={false} from={B5.from} line={{ words: ['It', 'rewards'], plain: true }} size={0.075} />
          <div style={{ position: 'absolute', inset: 0, transform: 'translateY(5%)' }}>
            <Interlude taste={T} dark={false} from={B5.from + 8} line={{ words: ['strategy'] }} size={0.15} />
          </div>
        </AbsoluteFill>
      )}
      {f >= B5.iris && <Wipe taste={T} f={f} t0={B5.iris}>
        {f >= B6.from && <Interlude taste={T} from={B6.from} line={{ words: ['Hit', 'the', 'follow'], plain: [0, 1] }} size={0.085} />}
      </Wipe>}
      <Texture taste={T} dark={dark} />
    </AbsoluteFill>
  );
};

/* graph (pin 971): a ringed object on graph paper, a rigid pan down into a headline over the next object on a dotted
   patch, a zoom-out to the closing card; no cuts until the end */
const Graph: React.FC = () => {
  const f = useCurrentFrame(), T = graph;
  const S1 = { pan: 70 }, S2 = { from: 78, zoom: 160 }, S3 = { from: 180 };
  const scene1 = <AbsoluteFill><Paper taste={T} id="p1" /><Ringed taste={T} from={0} pic={FLASK} top={['watch how', 'one glass flask']} bottom={['went from', 'a tomb to a museum']} /></AbsoluteFill>;
  return (
    <AbsoluteFill style={{ background: T.paper }}>
      {f < S1.pan + 30 && <Camera taste={T} move="pan" t0={S1.pan} gap={[0, -1.03]} leaving>{scene1}</Camera>}
      {f >= S1.pan && f < S3.from && (
        <Camera taste={T} move="zoom-out" t0={S2.zoom}>
          <Camera taste={T} move="pan" t0={S1.pan} gap={[0, -1.03]}>
            <Camera taste={T} move="arrive" t0={S2.from - 4}>
              <AbsoluteFill style={{ background: T.paper }}>
                <HeadlineOver taste={T} from={S2.from} pic={COIN} kicker="2,000 YEARS OF" word="value" line="In one silver coin"
                  paragraph={['Small things keep their worth when the story', 'around them is told with care, frame by frame.']} />
              </AbsoluteFill>
            </Camera>
          </Camera>
        </Camera>
      )}
      {f >= S3.from && <AbsoluteFill><Paper taste={T} id="p3" /><EndCard taste={T} from={S3.from} lead="follow for" word="MORE CASES" /></AbsoluteFill>}
      <Texture taste={T} dark={false} />
    </AbsoluteFill>
  );
};

/* agency (pin 1061): vignetted grid, wordmark and corner stars held through the reel; centred stacks around one
   object per beat; blur out, cut, blur in */
const Agency: React.FC = () => {
  const f = useCurrentFrame(), T = agency;
  const B1 = { out: 79, end: 85 }, B2 = { from: 86, out: 160, end: 166 }, B3 = { from: 167 };
  const beat = (from: number, out: number | undefined, body: React.ReactNode) => (
    <Camera taste={T} move="defocus" t0={out ?? 1e9}><Camera taste={T} move="arrive" t0={from}><AbsoluteFill>{body}</AbsoluteFill></Camera></Camera>
  );
  return (
    <AbsoluteFill>
      <Paper taste={T} />
      {f <= B1.end && beat(0, B1.out, <Sandwich taste={T} from={0} pic={HERODOTOS} width={0.62} top={["If you're", 'Comparing']} bottom={['Us with other', 'Editors']} />)}
      {f >= B2.from && f <= B2.end && beat(B2.from, B2.out, <StandOn taste={T} from={B2.from} pic={KING} width={0.2} lead="We're probably not" line="In the same" word="League" />)}
      {f >= B3.from && beat(B3.from, undefined, <ListBeat taste={T} from={B3.from} pic={MAN} items={['Cuts per minute', 'Effects used', 'Hours logged']} gap={24} />)}
      <Corner taste={T} cx={0.02} cy={0.02} length={cornerLength(T, f, 0, 0.3, Math.sin(f / 22))} />
      <Corner taste={T} cx={0.98} cy={0.98} length={cornerLength(T, f, 0, 0.3, Math.cos(f / 26))} />
      <Wordmark text="FIELD STUDIO" taste={T} />
      <Texture taste={T} dark={false} />
    </AbsoluteFill>
  );
};

registerRoot(() => (
  <>
    <Composition id="Taste-red" component={Red} durationInFrames={230} fps={30} width={1080} height={1920} />
    <Composition id="Taste-pulse" component={Pulse} durationInFrames={240} fps={30} width={1080} height={1920} />
    <Composition id="Taste-graph" component={Graph} durationInFrames={230} fps={30} width={1080} height={1920} />
    <Composition id="Taste-agency" component={Agency} durationInFrames={260} fps={30} width={1080} height={1920} />
  </>
));
