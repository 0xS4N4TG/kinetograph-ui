// The kinetic-typography plugin's caption styles, each on a hook line and a caption line over a talking head
// (public/subject.mp4 and its matte, links to the cyberpunk reel's footage). `Styles` plays all fourteen in a row at 9:16, `Wide`
// plays the two wide-shot looks at 16:9, and `Style` is one look with its name as a prop, for stills.
//
//   node ../kinetograph/packages/cli/dist/cli.js render templates/kinetic-type-demo/styles.tsx --comp Styles -o templates/kinetic-type-demo/out/styles.mp4

import React from 'react';
import { AbsoluteFill, Composition, Video, registerRoot, staticFile, useCurrentFrame } from 'remotion';
import { Captions, FONTS, FONT_NAMES, STYLE_NAMES, checkFrames, subjectFrom, type FontName, type StyleName, type Word } from '../../plugins/kinetic-typography/src/index.js';

const FPS = 30;
const SEG = 75;
const CLIP = 221; // subject.mp4 is 7.375 s
const footage = { src: staticFile('subject.mp4'), loop: CLIP };
// the head, followed through the clip's matte (white subject on black), for the looks that sit beside it
const matte = { src: staticFile('matte.mp4'), loop: CLIP };

/** "keep watching this, it gets better": a hook (big "watching") and a caption, starting on frame `at`. */
const script = (at: number): Word[] =>
  [['keep', 3, 8], ['watching', 9, 20], ['this,', 22, 28], ['it', 40, 44], ['gets', 46, 51], ['better.', 52, 60]].map(([text, from, to]) => ({ text: text as string, from: at + (from as number), to: at + (to as number) }));

const Film: React.FC<{ width: number; height: number }> = ({ width, height }) => (
  <AbsoluteFill style={{ backgroundColor: '#000' }}>
    <Video src={footage.src} width={width} height={height} fit="cover" loop muted />
  </AbsoluteFill>
);

const Tag: React.FC<{ name: string }> = ({ name }) => (
  <div style={{ position: 'absolute', left: 36, bottom: 40, padding: '8px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.72)', color: '#fff', fontFamily: 'JetBrains Mono, monospace', fontSize: 26, letterSpacing: 1 }}>/ {name}</div>
);

const One: React.FC<{ name: StyleName; at: number; width: number; height: number }> = ({ name, at, width, height }) => (
  <Captions words={script(at)} split={[3, 3]} big={['watching']} preset={name} footage={footage} subject={width > height ? subjectFrom(matte, FPS, width, height) : undefined} />
);

const Styles: React.FC = () => (
  <AbsoluteFill>
    <Film width={1080} height={1920} />
    {STYLE_NAMES.map((name, i) => <One key={name} name={name} at={i * SEG} width={1080} height={1920} />)}
    <TagAt names={STYLE_NAMES} />
  </AbsoluteFill>
);

const TagAt: React.FC<{ names: readonly StyleName[] }> = ({ names }) => {
  const name = names[Math.min(names.length - 1, Math.floor(useCurrentFrame() / SEG))]!;
  return <Tag name={name} />;
};

const WIDE: StyleName[] = ['cinematic-caps', 'side-note'];
const Wide: React.FC = () => (
  <AbsoluteFill>
    <Film width={1920} height={1080} />
    {WIDE.map((name, i) => <One key={name} name={name} at={i * SEG} width={1920} height={1080} />)}
    <TagAt names={WIDE} />
  </AbsoluteFill>
);

const Style: React.FC<{ name: StyleName; wide?: boolean }> = ({ name, wide }) => (
  <AbsoluteFill>
    <Film width={wide ? 1920 : 1080} height={wide ? 1080 : 1920} />
    <One name={name} at={0} width={wide ? 1920 : 1080} height={wide ? 1080 : 1920} />
    <Tag name={name} />
  </AbsoluteFill>
);

// every font in the plugin on the same hook, one and a half seconds each: the big word at the heaviest weight the font
// has (up to 800), the small words at its regular
const FSEG = 45;
const hook = (at: number): Word[] =>
  [['keep', 3, 8], ['watching', 9, 20], ['this', 22, 28]].map(([text, from, to]) => ({ text: text as string, from: at + (from as number), to: at + (to as number) }));
const heaviest = (f: FontName) => Math.max(...FONTS[f].weights.filter((w) => w <= 800));
const regular = (f: FontName) => FONTS[f].weights.reduce((a, b) => (Math.abs(b - 500) < Math.abs(a - 500) ? b : a));
const Fonts: React.FC = () => {
  const name = FONT_NAMES[Math.min(FONT_NAMES.length - 1, Math.floor(useCurrentFrame() / FSEG))]!;
  return (
    <AbsoluteFill>
      <Film width={1080} height={1920} />
      {FONT_NAMES.map((f, i) => (
        <Captions key={f} words={hook(i * FSEG)} split={[3]} big={['watching']} footage={footage} hold={FSEG - 30}
          look={{ style: 'clean-hook', caption: { font: f, weight: regular(f) }, big: { font: f, weight: heaviest(f), case: 'lower', tracking: -0.02 } }} />
      ))}
      <Tag name={name} />
    </AbsoluteFill>
  );
};

/** The frames to check a look on: the hook settled, the caption settled. */
export const CHECK = checkFrames(script(0), [3, 3], ['watching']);

registerRoot(() => (
  <>
    <Composition id="Fonts" component={Fonts} durationInFrames={FSEG * FONT_NAMES.length} fps={FPS} width={1080} height={1920} />
    <Composition id="Styles" component={Styles} durationInFrames={SEG * STYLE_NAMES.length} fps={FPS} width={1080} height={1920} />
    <Composition id="Wide" component={Wide} durationInFrames={SEG * WIDE.length} fps={FPS} width={1920} height={1080} />
    <Composition id="Style" component={Style} durationInFrames={SEG} fps={FPS} width={1080} height={1920} defaultProps={{ name: 'clean-hook' as StyleName }} />
    <Composition id="StyleWide" component={Style} durationInFrames={SEG} fps={FPS} width={1920} height={1080} defaultProps={{ name: 'cinematic-caps' as StyleName, wide: true }} />
  </>
));
