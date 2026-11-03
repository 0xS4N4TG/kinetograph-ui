// Scrapline demo: the cyberpunk reel's cut-out subject (its footage and matte, linked in public/) cycling through the
// five line styles and four papers, 2.5 s each, then a still image with alpha. Render:
//
//   node ../kinetograph/packages/cli/dist/cli.js render templates/scrapline/index.tsx -o templates/scrapline/out/scrapline-demo.mp4
//   node ../kinetograph/packages/cli/dist/cli.js render templates/scrapline/index.tsx --comp ScraplineStill -o templates/scrapline/out/scrapline-still.mp4

import React from 'react';
import { AbsoluteFill, Composition, Img, registerRoot, staticFile, useCurrentFrame } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Montserrat';
import { Layer, Rect, Text, Video } from '@kinetographdev/core';
import { LINES, Scrapline, type LineName, type PaperName } from '../../plugins/paper/src/index.js';

const { fontFamily } = loadFont('normal', { weights: ['700'] });

const FPS = 24;
const SECTION = 60; // frames per style/paper pair
const STYLES = Object.keys(LINES) as LineName[];
const PAPER_NAMES: PaperName[] = ['white', 'kraft', 'binder', 'cardboard'];
const COUNT = STYLES.length * PAPER_NAMES.length; // 20 pairs: style i % 5, paper i % 4 visits all of them
const CLIP = 177; // frames in the footage (7.4 s at 24 fps); it loops

const SUBJECT = staticFile('subject.mp4');
const MATTE = staticFile('matte.mp4');

/** Ink for each style, chosen to read on every paper. */
const INK: Record<LineName, string> = {
  marker: '#111111',
  pencil: '#2b2b30',
  crayon: '#c4301f',
  scribble: '#1f3fa8',
  brush: '#16120f',
};

const Subject = () => (
  <>
    <Video id="subject-matte" src={MATTE} width={1920} height={1080} loop />
    <Video id="subject" src={SUBJECT} width={1920} height={1080} loop matte={{ layer: 'subject-matte', mode: 'luminance' }} />
  </>
);

const Demo: React.FC = () => {
  const frame = useCurrentFrame();
  const i = Math.min(COUNT - 1, Math.floor(frame / SECTION));
  const style = STYLES[i % STYLES.length];
  const paper = PAPER_NAMES[i % PAPER_NAMES.length];
  return (
    <AbsoluteFill style={{ backgroundColor: '#4a6670' }}>
      <Scrapline trace={{ src: MATTE, loop: CLIP }} line={style} paper={paper} color={INK[style]} offset={26} threshold={40} seed={i}>
        <Subject />
      </Scrapline>
      <Layer id="label" x={56} y={950}>
        <Rect width={430} height={74} radius={10} fill="rgba(0,0,0,0.55)" />
        <Text font={fontFamily} weight={700} size={30} color="#ffffff" x={22} y={20}>{`${style} / ${paper}`}</Text>
      </Layer>
    </AbsoluteFill>
  );
};

/** A still image with alpha (public/cutout.png, made by tools/make-cutout.sh) on kraft, in crayon. The line still boils. */
const Still: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: '#e7e2d6' }}>
    <Scrapline trace={{ src: staticFile('cutout.png') }} line="crayon" paper="kraft" color="#c4301f" offset={14} paperMargin={30}>
      <Img src={staticFile('cutout.png')} width={1280} height={720} />
    </Scrapline>
  </AbsoluteFill>
);

registerRoot(() => (
  <>
    <Composition id="ScraplineDemo" component={Demo} durationInFrames={COUNT * SECTION} fps={FPS} width={1920} height={1080} />
    <Composition id="ScraplineStill" component={Still} durationInFrames={48} fps={FPS} width={1280} height={720} />
  </>
));
