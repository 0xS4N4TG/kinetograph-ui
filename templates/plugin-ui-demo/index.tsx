// Plugin UI demo: two compositions with a `schema`, so Studio's Props tab draws a form for them.
//
// "HexedLook" puts the Hexed genome in its schema (`look`), so Studio mounts the Hexed panel for that field: a gene,
// an amount and a lock per slot, Reroll, and a preset menu. The graded photo sits as a print on paper's torn sheet. "PaperMatchCut" uses paper's whole <MatchCut> schema,
// minus `preset`, so Studio mounts the Paper panel for `look` (preset cards, layout picker, sliders, and a keyword box
// on the preview) and draws the rest as a generated form. "PaperCutOut" and "PaperFoldOut" put paper's sheet looks in
// `look` (edge and stock cards, colours, sliders, the picture's place on the preview; the folds and timing for the
// fold-out; a hand-drawn line round the cut-out). "PaperScrapline" puts paper's scrapline look in `look` (line and
// paper cards, the line colour, sliders). "TypeCaptions" puts kinetic-typography's caption look in `look` (style cards,
// Caption / Big text, layouts, the moving style, the motion keys and knobs, the accent; Hook and Caption pins on the
// preview) over a talking head. "VjLook" has the VJ look (`look`: a card per look, its settings, the CRT's face on the preview) and the
// blob marks (`marks`) over tracked film.
//
//   node ../kinetograph/packages/cli/dist/cli.js studio templates/plugin-ui-demo/index.tsx
//   node ../kinetograph/packages/cli/dist/cli.js still templates/plugin-ui-demo/index.tsx 40 --comp HexedLook -o out.png

import React from 'react';
import { z } from 'zod';
import { AbsoluteFill, Composition, registerRoot, staticFile } from 'remotion';
import { Image } from '@kinetographdev/core';
import { Hexed, PRESETS, adjustSchema, genomeSchema } from '../../plugins/hexed/src/index.js';
import { CutOut, FoldOut, MatchCut, PRESETS as PAPER_PRESETS, cutOutLookSchema, foldOutLookSchema, matchCutSchema, Paper, Scrapline, scraplineLookSchema } from '../../plugins/paper/src/index.js';
import { Blobs, blobStyleSchema, lookEffects, vjLookSchema, type BlobTrack } from '../../plugins/vj/src/index.js';
import { Layer, Video } from '@kinetographdev/core';
import { Captions, captionLookSchema, type Word } from '../../plugins/kinetic-typography/src/index.js';
import smithBlobs from '../vj-demo/track/blacksmith-blobs.json' with { type: 'json' };

const PRESETS_WEB = PAPER_PRESETS['match-cut/web'];
const W = 1920;
const H = 1080;
const FPS = 30;

const hexedProps = z.object({
  look: genomeSchema.describe('The rolled look. Edit it in the Hexed panel.'),
  amount: z.number().min(0).max(1).describe('Strength of the whole look, 0 to 1.'),
  adjust: adjustSchema,
});
type HexedLookProps = z.infer<typeof hexedProps>;

// The graded photo is a print: a torn white sheet with a pencil line round it (paper's Scrapline, traced from the
// print's rectangle) on a crumpled paper desk. Hexed grades the whole canvas, so the clip keeps it to the print.
const PRINT = { x: 230, y: 130, w: W - 460, h: H - 260 };
const printRect: [number, number][] = [[PRINT.x, PRINT.y], [PRINT.x + PRINT.w, PRINT.y], [PRINT.x + PRINT.w, PRINT.y + PRINT.h], [PRINT.x, PRINT.y + PRINT.h]];
const printPath = printRect.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' ') + ' Z';

export const HexedLook: React.FC<HexedLookProps> = ({ look, amount, adjust }) => (
  <AbsoluteFill style={{ backgroundColor: '#000' }}>
    <Paper w={W} h={H} tint="#cdbf9f" seed={7} crumple={1.4} />
    <Scrapline id="print" trace={{ d: printPath }} line="pencil" paper="white" color="#2b2b30" offset={22} paperMargin={30}>
      <Layer id="print-photo" clip={{ kind: 'polygon', points: printRect }}>
        <Hexed genome={look} amount={amount} adjust={adjust}>
          <Image src={staticFile('photos/hills.jpg')} x={PRINT.x} y={PRINT.y} width={PRINT.w} height={PRINT.h} fit="cover" />
        </Hexed>
      </Layer>
    </Scrapline>
  </AbsoluteFill>
);

// `preset` is left out: the panel's preset cards write their fields into `look`
const paperProps = matchCutSchema.omit({ preset: true });

export const PaperMatchCut: React.FC<z.infer<typeof paperProps>> = (props) => <MatchCut {...props} />;

const cutOutProps = z.object({ look: cutOutLookSchema });
export const PaperCutOut: React.FC<z.infer<typeof cutOutProps>> = ({ look }) => (
  <AbsoluteFill style={{ backgroundColor: '#2f8a46' }}>
    <CutOut src={staticFile('subject.png')} {...look} />
  </AbsoluteFill>
);

const scraplineProps = z.object({ look: scraplineLookSchema });
export const PaperScrapline: React.FC<z.infer<typeof scraplineProps>> = ({ look }) => (
  <AbsoluteFill style={{ backgroundColor: '#4a6670' }}>
    <Scrapline trace={{ src: staticFile('cutout.png') }} {...look}>
      <Image src={staticFile('cutout.png')} width={1280} height={720} />
    </Scrapline>
  </AbsoluteFill>
);

const foldOutProps = z.object({ look: foldOutLookSchema });
export const PaperFoldOut: React.FC<z.infer<typeof foldOutProps>> = ({ look }) => (
  <AbsoluteFill style={{ backgroundColor: '#2f8a46' }}>
    <FoldOut src={staticFile('subject.png')} {...look} />
  </AbsoluteFill>
);

const vjProps = z.object({ look: vjLookSchema, marks: blobStyleSchema });
export const VjLook: React.FC<z.infer<typeof vjProps>> = ({ look, marks }) => (
  <AbsoluteFill style={{ backgroundColor: '#000' }}>
    <Layer id="film" effects={lookEffects(look)}>
      <Video src={staticFile('blacksmith.mp4')} width={W} height={H} fit="cover" muted />
    </Layer>
    <Blobs track={smithBlobs as BlobTrack} {...marks} />
  </AbsoluteFill>
);

// kinetic-typography: a hook line and a caption over a talking head (public/subject.mp4, the cyberpunk reel's footage)
const CAPTION_WORDS: Word[] = [['keep', 3, 8], ['watching', 9, 20], ['this,', 22, 28], ['it', 40, 44], ['gets', 46, 51], ['better.', 52, 60]]
  .map(([text, from, to]) => ({ text: text as string, from: from as number, to: to as number }));
const captionProps = z.object({ look: captionLookSchema });
const TypeCaptions: React.FC<z.infer<typeof captionProps>> = ({ look }) => (
  <AbsoluteFill style={{ backgroundColor: '#000' }}>
    <Video src={staticFile('subject.mp4')} width={1080} height={1920} fit="cover" muted />
    <Captions words={CAPTION_WORDS} split={[3, 3]} big={['watching']} look={look} footage={{ src: staticFile('subject.mp4') }} />
  </AbsoluteFill>
);

registerRoot(() => (
  <>
    <Composition
      id="HexedLook"
      component={HexedLook}
      schema={hexedProps}
      durationInFrames={150}
      fps={FPS}
      width={W}
      height={H}
      defaultProps={{ look: PRESETS['moss-impact'], amount: 1, adjust: {} }}
    />
    <Composition
      id="PaperMatchCut"
      component={PaperMatchCut}
      schema={paperProps}
      durationInFrames={150}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ keyword: 'Super Bowl', look: PRESETS_WEB }}
    />
    <Composition id="PaperCutOut" component={PaperCutOut} schema={cutOutProps} durationInFrames={60} fps={FPS} width={1080} height={1920}
      defaultProps={{ look: { edge: 'torn', stock: 'white', width: 860, line: 'pencil' } }} />
    <Composition id="PaperScrapline" component={PaperScrapline} schema={scraplineProps} durationInFrames={48} fps={24} width={1280} height={720}
      defaultProps={{ look: { line: 'crayon', paper: 'kraft', color: '#c4301f' } }} />
    <Composition id="PaperFoldOut" component={PaperFoldOut} schema={foldOutProps} durationInFrames={60} fps={FPS} width={1080} height={1920}
      defaultProps={{ look: { width: 860, delay: 8 } }} />
    <Composition id="TypeCaptions" component={TypeCaptions} schema={captionProps} durationInFrames={75} fps={FPS} width={1080} height={1920}
      defaultProps={{ look: { style: 'highlighter' as const } }} />
    <Composition id="VjLook" component={VjLook} schema={vjProps} durationInFrames={78} fps={FPS} width={W} height={H}
      defaultProps={{ look: { kind: 'oneBit', oneBit: { size: 2, ink: '#000000', paper: '#ffffff' } }, marks: { links: 'all', reach: 0.25, max: 10, invert: 0.3, blend: 'difference' } }} />
  </>
));
