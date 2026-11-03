// The paper-cut taste kit (tastes/papercut) running on Kinetograph: an example scene (a backdrop, a
// critter on the floor line, paper props, a parallax orbit and cue-timed pops), the cover hook title, a taped banner,
// word-tag captions and the grain. public/ is a link to the kit's assets.
//
//   node ../kinetograph/packages/cli/dist/cli.js render templates/papercut-demo/index.tsx --comp Hello -o templates/papercut-demo/out/hello.mp4

import React from 'react';
import { AbsoluteFill, Composition, Sequence, registerRoot, useCurrentFrame } from 'remotion';
import { C } from '../../tastes/papercut/tokens';
import { Backdrop, BACKDROPS } from '../../tastes/papercut/paper/backdrops';
import { OrbitCamera, Depth } from '../../tastes/papercut/paper/camera';
import { Paper, PopIn, Slab, Pill, GrainOverlay, PaperDefs } from '../../tastes/papercut/paper/kit';
import { Critter } from '../../tastes/papercut/cast/Critter';
import { HookTitle } from '../../tastes/papercut/paper/hook';
import { TapeBanner, WordTagCaptions } from '../../tastes/papercut/paper/overlays';

const DUR = 150;
const words = 'every prop in this reel is cut from paper and lit like a set'.split(' ');
const captions = words.map((text, i) => ({ text: ` ${text}`, startMs: 1500 + i * 260, endMs: 1500 + i * 260 + 240, timestampMs: 1500 + i * 260 + 120, confidence: 1 }));

const Scene: React.FC = () => {
  const f = useCurrentFrame();
  const floor = BACKDROPS['home-office-day'].floorY;
  return (
    <AbsoluteFill>
      <OrbitCamera dur={DUR} yaw={14} push={1.12} origin={[540, floor]}>
        <Depth z={0}><Backdrop name="home-office-day" /></Depth>
        <Depth z={0.5}>
          <PopIn at={20}>
            <Paper><Slab x={610} y={floor - 230} w={300} h={230} color={C.wood} shade={C.woodLo} shadeH={0.22} hi={C.woodHi} hiH={0.1} r={6} /></Paper>
          </PopIn>
          <Critter x={400} y={floor} size={300} color={C.hero} shade={C.heroLo} expr={f > 50 ? 'happy' : 'idle'} acc="cap" />
        </Depth>
        <Depth z={1}>
          <PopIn at={70}><Pill x={540} y={floor - 420} text="PARALLAX" bg={C.tag} color={C.tagText} size={46} rot={-4} center /></PopIn>
        </Depth>
      </OrbitCamera>
    </AbsoluteFill>
  );
};

const Hello: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: '#1a1a1a' }}>
    <PaperDefs />
    <Scene />
    <Sequence from={40}><TapeBanner text="EVERY PROP IS PAPER" seed="S01" /></Sequence>
    <Sequence durationInFrames={41}><HookTitle lines={[['ALL', 'CUT'], ['PAPER']]} hot={['PAPER']} outAt={40} /></Sequence>
    <WordTagCaptions captions={captions} bandY={() => 0.72} />
    <GrainOverlay />
  </AbsoluteFill>
);

registerRoot(() => <Composition id="Hello" component={Hello} durationInFrames={DUR} fps={30} width={1080} height={1920} />);
