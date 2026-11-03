// The kinetic-typography plugin's hand-written captions on Blacksmith Scene (1893, public domain): `Tracked` hangs the
// line off the anvil (track/blacksmith.json, made with plugins/vj/tools/track.mjs), `Centred` sets it low in the frame
// with no subject. The word timings are typed in here; a real film takes them from the voiceover's timestamps with
// `wordsFrom`.
//
// Render from the kinetograph-ui root:
//   node ../kinetograph/packages/cli/dist/cli.js render templates/kinetic-type-demo/index.tsx --comp Tracked -o templates/kinetic-type-demo/out/tracked.mp4

import React from 'react';
import { AbsoluteFill, Composition, Video, registerRoot, staticFile } from 'remotion';
import { BOIL_FRAMES, BoilStack, Captions, HandCaptions, type Word } from '../../plugins/kinetic-typography/src/index.js';
import { pointAt, type PointTrack } from '../../plugins/vj/src/index.js';
import anvil from './track/blacksmith.json' with { type: 'json' };

const W = 1920;
const H = 1080;
const FPS = 30;

/** "In 1891, the Kinetograph learned to move": a word every 7 or 8 frames, as a voice would say it. */
const WORDS: Word[] = ['In', '1891,', 'the', 'Kinetograph', 'learned', 'to', 'move.'].map((text, i) => {
  const from = 4 + [0, 7, 22, 30, 46, 56, 62][i]!;
  return { text, from, to: from + Math.max(5, text.length * 1.6) };
});
const HOT = ['1891', 'kinetograph', 'move'];

const Film: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: '#000' }}>
    <Video src={staticFile('blacksmith.mp4')} width={W} height={H} fit="cover" muted />
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse 80% 75% at 50% 50%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.6) 100%)' }} />
  </AbsoluteFill>
);

const Tracked: React.FC = () => (
  <AbsoluteFill>
    <Film />
    <HandCaptions words={WORDS} split={[2, 2, 3]} hot={HOT} anchor={(f) => pointAt(anvil as PointTrack, f, FPS)} />
  </AbsoluteFill>
);

const Centred: React.FC = () => (
  <AbsoluteFill>
    <Film />
    <HandCaptions words={WORDS} split={[2, 2, 3]} hot={HOT} size={110} />
  </AbsoluteFill>
);

/** The poster-boil caption style on a voiceover: three lines, a word every 7 to 10 frames at 24 fps. */
const SAID: Word[] = [
  ['Turn', 6], ['it', 14], ['up', 21], ['shake', 64], ['the', 73], ['floor', 80], ['make', 124], ['some', 132], ['noise', 141],
].map(([text, from]) => ({ text: text as string, from: from as number, to: (from as number) + 8 }));

const PosterBoil: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: '#0c0c0a' }}>
    <Captions words={SAID} split={[3, 3, 3]} preset="poster-boil" hold={40} />
  </AbsoluteFill>
);

registerRoot(() => (
  <>
    <Composition id="Tracked" component={Tracked} durationInFrames={78} fps={FPS} width={W} height={H} />
    <Composition id="Centred" component={Centred} durationInFrames={78} fps={FPS} width={W} height={H} />
    {/* BoilStack at the reference's own size and rate (4:5, 12 fps), and at 9:16 and 24 fps (it runs on twelves) */}
    <Composition id="BoilStack" component={BoilStack} durationInFrames={BOIL_FRAMES} fps={12} width={1080} height={1350} />
    <Composition id="PosterBoil" component={PosterBoil} durationInFrames={192} fps={24} width={1080} height={1920} />
    <Composition id="BoilStackTall" component={BoilStack} durationInFrames={BOIL_FRAMES * 2} fps={24} width={1080} height={1920} />
  </>
));
