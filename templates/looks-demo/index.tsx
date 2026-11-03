// Showroom for kit/looks: each technique on its own composition, built from measured notes.
// Pictures: Met Open Access, CC0.
//
//   node ../kinetograph/packages/cli/dist/cli.js render templates/looks-demo/index.tsx --comp PageTurn -o templates/looks-demo/out/page-turn.mp4

import React from 'react';
import { AbsoluteFill, Composition, Img, registerRoot, staticFile } from 'remotion';
import { CurveCut, Dust, PageTurn, Parallax, Posterize, VoxFinish, WindowLight } from '../../kit/looks/index.js';
import { family } from '../../tastes/explainer/index.js';

const SERIF = family('Playfair Display', 700, false);

/** A newspaper-like page: masthead, rule, headline, a picture, columns of grey lines. */
const NewsPage: React.FC<{ title: string; pic: string; tint?: string }> = ({ title, pic, tint = '#efece4' }) => (
  <AbsoluteFill style={{ background: tint, padding: '6% 7%', fontFamily: SERIF, color: '#1b1a18' }}>
    <div style={{ fontSize: 92, fontWeight: 700, textAlign: 'center', letterSpacing: '-0.02em' }}>The Daily Cut</div>
    <div style={{ borderTop: '4px solid #1b1a18', borderBottom: '1px solid #1b1a18', height: 10, margin: '14px 0 28px' }} />
    <div style={{ fontSize: 86, fontWeight: 700, lineHeight: 1.02, marginBottom: 30 }}>{title}</div>
    <div style={{ display: 'flex', gap: 30, height: '66%' }}>
      <div style={{ flex: 1.3, background: '#d9d5cb', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden' }}>
        <Img src={staticFile(pic)} style={{ height: '96%', filter: 'grayscale(1) contrast(1.1)' }} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {Array.from({ length: 22 }, (_, i) => <div key={i} style={{ height: 12, background: '#8d8a83', width: `${70 + ((i * 37) % 30)}%` }} />)}
      </div>
    </div>
  </AbsoluteFill>
);

const Table: React.FC = () => <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 30% 20%, #4a2230 0%, #200d13 70%)' }} />;

/* The page turn: three turns, at 30 fps, then on threes (Posterize step 3) as the reference's 8 fps version */
const PageTurnDemo: React.FC = () => (
  <AbsoluteFill>
    <Table />
    <PageTurn id="turn-1" start={20} duration={30} page={<NewsPage title="Speed isn't skill" pic="bust-napoleon.png" />}
      under={<PageTurn id="turn-2" start={70} duration={30} page={<NewsPage title="Every cut should earn its second" pic="bust-herodotos.png" tint="#ece7dc" />}
        under={<Posterize step={3}><PageTurn id="turn-3" start={120} duration={30} corner="bottom-left" page={<NewsPage title="Noise is where people scroll" pic="bust-caligula.png" tint="#f0ede6" />} under={<Table />} /></Posterize>} />} />
  </AbsoluteFill>
);

/* Cutting the curve: a push out of one bust's face into another's, cut on the fastest frame, on twos */
const Face: React.FC<{ pic: string; bg: string }> = ({ pic, bg }) => (
  <AbsoluteFill style={{ background: bg, alignItems: 'center', justifyContent: 'flex-end' }}>
    <Img src={staticFile(pic)} style={{ height: '78%' }} />
  </AbsoluteFill>
);
const CurveCutDemo: React.FC = () => (
  <Posterize step={2}>
    <CurveCut start={10} duration={50} scale={[3.2, 1]} pivot={[0.5, 0.45]}
      a={<Face pic="bust-napoleon.png" bg="#e9e4d8" />} b={<Face pic="bust-herodotos.png" bg="#d9e1e4" />} />
  </Posterize>
);

/* Parallax: background plate, the subject, a coin close to the lens and out of focus; a sideways slide, on twos */
const ParallaxDemo: React.FC = () => (
  <Posterize step={2}>
    <Parallax start={5} duration={80} travel={-0.06} layers={[
      { factor: 0.6, node: <AbsoluteFill style={{ background: 'linear-gradient(#cfd6d8, #eae6dc 60%, #b9b3a5)' }}>
        <div style={{ position: 'absolute', left: '-10%', right: '-10%', top: '30%', textAlign: 'center', fontFamily: SERIF, fontSize: 300, color: '#c2bfb5', fontWeight: 700 }}>DEPTH</div></AbsoluteFill> },
      { factor: 1, node: <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end' }}><Img src={staticFile('bust-caligula.png')} style={{ height: '70%' }} /></AbsoluteFill> },
      { factor: 3, blur: 10, node: <AbsoluteFill><Img src={staticFile('coin.png')} style={{ position: 'absolute', left: '-12%', top: '62%', width: '60%' }} /></AbsoluteFill> },
    ]} />
  </Posterize>
);

/* The Vox finish over a still: slow push, edge blur, film dust, gate weave, flicker, vignette; split screen at the
   start (left half without) so the difference reads */
const Still: React.FC = () => (
  <AbsoluteFill style={{ background: 'linear-gradient(#b9c3c4, #d9d2c2 55%, #8c7f6a)', alignItems: 'center', justifyContent: 'flex-end' }}>
    <Img src={staticFile('bust-herodotos.png')} style={{ height: '72%' }} />
  </AbsoluteFill>
);
const VoxDemo: React.FC = () => <VoxFinish picture={<Still />} />;

/* Window light drifting over a still, with drifting dust (the stock-overlay reel) */
const WindowDemo: React.FC = () => (
  <AbsoluteFill>
    <Still />
    <WindowLight />
    <Dust strength={0.6} drift={5.3} density={75} hairs={0} />
  </AbsoluteFill>
);

registerRoot(() => (
  <>
    <Composition id="PageTurn" component={PageTurnDemo} durationInFrames={170} fps={30} width={1080} height={1920} />
    <Composition id="CurveCut" component={CurveCutDemo} durationInFrames={80} fps={30} width={1080} height={1920} />
    <Composition id="Parallax" component={ParallaxDemo} durationInFrames={100} fps={30} width={1080} height={1920} />
    <Composition id="VoxFinish" component={VoxDemo} durationInFrames={120} fps={30} width={1080} height={1920} />
    <Composition id="WindowLight" component={WindowDemo} durationInFrames={120} fps={30} width={1080} height={1920} />
  </>
));
