// "How a chatbot answers you": a 28-second reel in the papercut taste (tastes/papercut). Eight paper-diorama sets cut on the
// story beats with the kit's paper transitions (tape pull, zoom through, whip, page turn, pop-up book, tear, tape pull); a
// torn-tag hook title on frame 0, a taped banner per set, word-tag captions, film weave and grain over everything.
// Sound is procedural: the papercut engine's SFX and marimba bed, ported to numpy (tastes/papercut/tools/sound.py).
//
//   python tastes/papercut/tools/sound.py sfx tastes/papercut/demo/public/sfx
//   python tastes/papercut/tools/sound.py bed tastes/papercut/demo/public/bed.wav 28.4
//   node ../kinetograph/packages/cli/dist/cli.js render tastes/papercut/demo/index.tsx --comp PapercutReel -o tastes/papercut/demo/out/papercut-reel.mp4

import React from 'react';
import type {Caption} from '@remotion/captions';
import {AbsoluteFill, Audio, Composition, Sequence, registerRoot, staticFile} from 'remotion';
import {GrainOverlay, PaperDefs} from '../paper/kit';
import {HookTitle} from '../paper/hook';
import {TapeBanner, WordTagCaptions} from '../paper/overlays';
import {CutSeries, type CutSpec} from '../paper/transitions';
import {FilmWeave} from '../paper/look';
import {DUR, S1Ask, S2Cut, S3Numbers, S4Odds, S5Loop, S6Books, S7Sure, S8Check} from './scenes';

const SCENES = [
  {id: 'S1', component: S1Ask, banner: 'YOU TYPE A QUESTION'},
  {id: 'S2', component: S2Cut, banner: 'STEP 1: CUT IT INTO TOKENS'},
  {id: 'S3', component: S3Numbers, banner: 'STEP 2: TOKENS BECOME NUMBERS'},
  {id: 'S4', component: S4Odds, banner: 'STEP 3: SCORE EVERY NEXT TOKEN'},
  {id: 'S5', component: S5Loop, banner: 'STEP 4: ADD IT, GUESS AGAIN'},
  {id: 'S6', component: S6Books, banner: 'THE ODDS COME FROM TRAINING TEXT'},
  {id: 'S7', component: S7Sure, banner: 'SOUNDING SURE IS NOT BEING RIGHT'},
  {id: 'S8', component: S8Check, banner: 'ASK IT. THEN CHECK IT.'},
].map((s) => ({...s, durationInFrames: DUR[s.id as keyof typeof DUR]}));

const FROM: Record<string, number> = {};
SCENES.reduce((a, s) => ((FROM[s.id] = a), a + s.durationInFrames), 0);
const TOTAL = SCENES.reduce((a, s) => a + s.durationInFrames, 0);

// Cuts keyed by the incoming scene; each fires its sound on the scene's first frame (stampCut would be +3).
const CUTS: Record<string, CutSpec> = {
  S2: {kind: 'tapePull'},
  S3: {kind: 'zoomThrough', x: 540, y: 860},
  S4: {kind: 'whip'},
  S5: {kind: 'pageTurn'},
  S6: {kind: 'popUpBook'},
  S7: {kind: 'tearAway'},
  S8: {kind: 'tapePull'},
};
const CUT_SFX: Record<string, string> = {tapePull: 'tape-peel', zoomThrough: 'zoom', whip: 'whip', pageTurn: 'page-flip', popUpBook: 'pop3', tearAway: 'rip'};

// No voice: the captions are the narration, one word every 9 frames (about 3.3 words a second), three to a tag page.
const say = (text: string, from: number, fpw = 9): Caption[] =>
  text.split(' ').map((w, i) => {
    const s = ((from + i * fpw) / 30) * 1000, e = ((from + i * fpw + fpw - 1) / 30) * 1000;
    return {text: ` ${w}`, startMs: s, endMs: e, timestampMs: s, confidence: 1};
  });
const CAPTIONS: Caption[] = [
  ...say('You ask a chatbot a question.', 8),
  ...say('What happens next?', 64),
  ...say('First, it chops your words into tokens:', FROM.S2 + 4),
  ...say('small pieces of text.', FROM.S2 + 72),
  ...say('Each token becomes a number,', FROM.S3 + 4),
  ...say('because the model works on numbers.', FROM.S3 + 54),
  ...say('Then it scores every token that could come next', FROM.S4 + 4),
  ...say('and picks one.', FROM.S4 + 86),
  ...say('It adds that word, then guesses again,', FROM.S5 + 4),
  ...say('one token at a time.', FROM.S5 + 72),
  ...say('It learned those odds from huge piles of text.', FROM.S6 + 4),
  ...say('So it can sound sure and still be wrong.', FROM.S7 + 4),
  ...say('Ask it anything. Then check it.', FROM.S8 + 4),
];

const HOOK_OUT = 48;

// ---------- sound ----------
// The engine's levels assume a voice on top; with no voice the whole mix is lifted (SFX_GAIN, BED_GAIN) to about -15 LUFS.
const SFX_GAIN = 2.2, BED_GAIN = 3.9;
const sfx = (name: string, at: number, volume = 1) => (
  <Sequence key={`${name}-${at}`} from={Math.max(0, at)} durationInFrames={60} layout="none"><Audio src={staticFile(`sfx/${name}.wav`)} volume={volume * SFX_GAIN} /></Sequence>
);
const SOUND: React.ReactNode[] = [
  sfx('hit', 0, 0.4), sfx('type', 12, 1.4), sfx('click', 44, 1.2), sfx('pop', 46), sfx('whoosh', 52),
  // cuts, 1 frame early
  ...Object.entries(CUTS).map(([id, c]) => sfx(CUT_SFX[c.kind], FROM[id] - 1, c.kind === 'tapePull' || c.kind === 'tearAway' ? 2.2 : 0.6)),
  // S2: strip slides in, scissors snip x5, chips settle
  sfx('slide', FROM.S2 + 1, 1.8), ...[0, 1, 2, 3, 4].map((k) => sfx('snip', FROM.S2 + 22 + k * 9 - 1, 0.45)), sfx('pop3', FROM.S2 + 62, 0.9),
  // S3: six flips, six drops into the hopper, the model hums awake
  ...[0, 1, 2, 3, 4, 5].map((i) => sfx('tick', FROM.S3 + 10 + i * 6, 0.9)), ...[0, 1, 2, 3, 4, 5].map((i) => sfx('pop', FROM.S3 + 52 + i * 5 + 13, 0.8)),
  sfx('ding', FROM.S3 + 92, 0.8),
  // S4: bars count up, the pick, the marker ring, the chip flies at the lens
  sfx('count', FROM.S4 + 14, 1), sfx('ding', FROM.S4 + 84, 1.1), sfx('scribble', FROM.S4 + 86, 2.2), sfx('whoosh', FROM.S4 + 100, 0.9),
  // S5: the printer ticks out each word; each word lands back in the intake
  ...[0, 1, 2, 3, 4].map((i) => sfx('printer', FROM.S5 + 10 + i * 18 - 1, 1.1)), ...[0, 1, 2, 3].map((i) => sfx('pop', FROM.S5 + 10 + i * 18 + 15, 0.7)),
  sfx('scribble', FROM.S5 + 20, 2), sfx('pop', FROM.S5 + 30, 0.9),
  // S6: the pull-back, late books landing
  sfx('whoosh', FROM.S6 + 6, 0.7), sfx('drop', FROM.S6 + 38, 0.9), sfx('sparkle', FROM.S6 + 64, 1.3),
  // S7: the bubble, the stamp
  sfx('pop', FROM.S7 + 8), sfx('stamp', FROM.S7 + 75, 0.7), sfx('buzz', FROM.S7 + 77, 0.9),
  // S8: the answer streams in, the note slaps on, the end chime
  sfx('keys', FROM.S8 + 4, 1.1), sfx('pop', FROM.S8 + 44), sfx('sparkle', FROM.S8 + 46, 1.2), sfx('end-chime', FROM.S8 + 48, 0.3),
];

const bandY = () => 0.745;

export const PapercutReel: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: '#1a1a1a'}}>
    <PaperDefs />
    <FilmWeave>
      <CutSeries scenes={SCENES} cuts={CUTS} />
    </FilmWeave>
    {SCENES.map((s) => {
      const a = s.id === 'S1' ? HOOK_OUT : FROM[s.id];
      return (
        <Sequence key={s.id} name={`Banner ${s.id}`} from={a} durationInFrames={FROM[s.id] + s.durationInFrames - a}>
          <TapeBanner text={s.banner} seed={s.id} />
        </Sequence>
      );
    })}
    <Sequence name="Hook title" durationInFrames={HOOK_OUT + 1}>
      <HookTitle lines={[['HOW', 'A', 'CHATBOT'], ['ANSWERS', 'YOU']]} hot={['ANSWERS']} outAt={HOOK_OUT} size={90} />
    </Sequence>
    <WordTagCaptions captions={CAPTIONS} bandY={bandY} />
    <GrainOverlay />
    <Sequence from={0} durationInFrames={TOTAL} layout="none"><Audio src={staticFile('bed.wav')} volume={BED_GAIN} /></Sequence>
    {SOUND}
  </AbsoluteFill>
);

registerRoot(() => <Composition id="PapercutReel" component={PapercutReel} durationInFrames={TOTAL} fps={30} width={1080} height={1920} />);
