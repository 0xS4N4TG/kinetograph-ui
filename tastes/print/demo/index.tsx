// "One ink at a time": a 28-second reel in the print taste (tastes/print) on how colour was printed before computers,
// from Edo woodblock prints to the risograph's own way of working. Every mark on screen is an ink pass multiplied over
// paper; pictures are public-domain prints from the Met (public/CREDITS.md); sound is procedural (tastes/print/tools).
//
//   node ../kinetograph/packages/cli/dist/cli.js render tastes/print/demo/index.tsx --comp OneInk -o tastes/print/demo/out/one-ink.mp4
//
// Beats (30 fps):
//   1 hook        the Great Wave as three riso passes (blue, yellow, pink), camera pushing on twos; typewriter line,
//                 then the title registers in (pink pass pulled into register under green)
//   2 1765        a Harunobu print as three passes (green key, pink, yellow) on mint paper; the date stamps in
//   3 the block   a carved woodblock as a one-ink newsprint halftone; the camera pushes 2.4x and the dots grow with
//                 it (DUJWPrqCYGX); a yellow marker behind the second line
//   4 the passes  on graph paper, the Great Wave printed pass by pass: each ink slides in off register and lands
//   5 the kento   close on the sheet's corner: boiling strokes draw the L-shaped kento and the edge mark (DZdCD2YNk4d)
//   6 the close   three impressions of the Great Wave stamp in one by one, each a little different; "no two alike"
import React from 'react';
import { AbsoluteFill, Audio, Composition, Sequence, registerRoot, staticFile, useCurrentFrame } from 'remotion';
import { Posterize } from '../../../kit/looks/posterize.js';
import {
  BoilStroke, HalftonePhoto, InkPass, Marker, PAPER, PhotoArt, PrintCamera, Riso, RisoPhoto, PrintCadence, RATES, RisoType, cornerPath, focus, loopPath, zoomAt,
} from '../index.js';

const B1 = { from: 0, end: 140 };
const B2 = { from: 140, end: 285 };
const B3 = { from: 285, end: 430 };
const B4 = { from: 430, end: 590 };
const B5 = { from: 590, end: 715 };
const B6 = { from: 715, end: 840 };

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const inOut = (t: number) => { const x = clamp01(t); return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; };

const WAVE_A = staticFile('wave-a.jpg');
const WAVE_B = staticFile('wave-b.jpg');
const WAVE_C = staticFile('wave-c.jpg');

/* 1. The hook */
const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const s = 1 + 0.12 * inOut(f / B1.end);
  const box = { x: -260, y: 860, w: 1620, h: 1090 };
  // each ink prints in top to bottom over 15 frames; the screen ramps coarse to fine (2.6x to 1x) over 36 frames
  const sweep = (at: number) => clamp01((f - at) / RATES.sweep);
  const pitch = 7 * (1 + 1.6 * (1 - clamp01(f / RATES.pitchRamp)) ** 2);
  return (
    <Riso paper={{ color: PAPER.cream }} finish={{ moire: 0.05 }}>
      <PrintCamera cam={zoomAt(s, 420, 1250)}>
        <RisoPhoto id="hook-wave" src={WAVE_A} box={box} position="0% 50%" passes={[
          { ink: 'sea', sep: 'blue', sweep: sweep(0), pitch },
          { ink: 'yellow', sep: 'yellow', lo: 0.04, hi: 0.45, sweep: sweep(18), pitch },
          { ink: 'pink', sep: 'warm', lo: 0.1, hi: 0.45, sweep: sweep(36), pitch },
        ]} />
      </PrintCamera>
      <RisoType id="hook-kicker" move="type" ink="federal" second={null} at={4} lines={[{ text: 'BEFORE COMPUTERS,', x: 0.075, y: 0.1, size: 0.05, face: 'mono' }]} />
      <RisoType id="hook-title" move="register" ink="blue" second="pink" at={26} dur={14} lines={[
        { text: 'COLOUR WAS', x: 0.07, y: 0.19, size: 0.13 },
        { text: 'PRINTED ONE', x: 0.07, y: 0.29, size: 0.13 },
        { text: 'INK AT A TIME.', x: 0.07, y: 0.39, size: 0.13 },
      ]} />
    </Riso>
  );
};

/* 2. Edo, 1765: Harunobu */
const Edo: React.FC = () => {
  const f = useCurrentFrame() - B2.from;
  const s = 1.04 + 0.05 * inOut(f / 145);
  const box = { x: 380, y: 455, w: 640, h: 883 };
  return (
    <Riso paper={{ color: PAPER.mint }} finish={{ moire: 0.05 }}>
      <PrintCamera cam={zoomAt(s, 675, 950)}>
        <RisoPhoto id="edo-print" src={staticFile('harunobu.jpg')} box={box} passes={[
          { ink: 'green', sep: 'key', lo: 0.5, hi: 0.8 },
          { ink: 'pink', sep: 'red', lo: 0.25, hi: 0.7 },
          { ink: 'yellow', sep: 'yellow', lo: 0.08, hi: 0.5 },
        ]} />
      </PrintCamera>
      <RisoType id="edo-date" move="stamp" ink="blue" second="pink" at={B2.from + 4} lines={[{ text: '1765', x: 0.07, y: 0.135, size: 0.2 }]} />
      <RisoType id="edo-lead" move="type" ink="federal" second={null} at={B2.from + 20} lines={[{ text: 'EDO, JAPAN.', x: 0.075, y: 0.215, size: 0.045, face: 'mono' }]} />
      <RisoType id="edo-line" move="register" ink="blue" second="pink" at={B2.from + 44} lines={[
        { text: '"Brocade" prints:', x: 0.07, y: 0.785, size: 0.085 },
        { text: 'full colour,', x: 0.07, y: 0.85, size: 0.085 },
        { text: 'block by block.', x: 0.07, y: 0.915, size: 0.085 },
      ]} />
      <RisoType id="edo-credit" move="none" ink="federal" second={null} at={B2.from + 6} lines={[{ text: 'Suzuki Harunobu, 1764-72', x: 0.945, y: 0.715, size: 0.026, face: 'mono', align: 'right' }]} />
    </Riso>
  );
};

/* 3. The carved block: one ink, a newsprint screen in a window; the camera pushes and the dots grow with it */
const Block: React.FC = () => {
  const f = useCurrentFrame() - B3.from;
  const k = inOut((f - 24) / 100);
  const s = 1 + 1.6 * k;
  const box = { x: 140, y: 540, w: 800, h: 1067 };
  return (
    <Riso paper={{ color: PAPER.white }} finish={{ moire: 0.04 }}>
      <PrintCamera cam={zoomAt(s, 400, 1130, 140 * k, 40 * k)}>
        <HalftonePhoto id="block-photo" src={staticFile('block.jpg')} box={box} ink="federal" pitch={9} angle={45} lo={0.3} hi={0.78} gamma={1.2} window={{ x: 60, y: 520, w: 960, h: 1290 }} />
      </PrintCamera>
      <Marker id="block-mark" ink="yellow" x={0.055} y={0.193} w={0.86} h={0.075} at={B3.from + 34} />
      <RisoType id="block-line" move="register" ink="blue" second="pink" at={B3.from + 6} lines={[
        { text: 'One carved block', x: 0.07, y: 0.15, size: 0.09 },
        { text: 'for each colour.', x: 0.07, y: 0.225, size: 0.09, delay: 22 },
      ]} />
      <RisoType id="block-credit" move="none" ink="federal" second={null} at={B3.from} out={B3.from + 60} lines={[{ text: 'A carved woodblock, 19th century', x: 0.94, y: 0.96, size: 0.026, face: 'mono', align: 'right' }]} />
    </Riso>
  );
};

/* 4. Pass by pass, on graph paper: each ink slides in off register and lands */
const Passes: React.FC = () => {
  const f = useCurrentFrame() - B4.from;
  const box = { x: 40, y: 700, w: 1000, h: 683 };
  const sweep = (at: number) => clamp01((f - at) / RATES.sweep);
  const labels = [
    { at: 8, text: '1  BLUE' },
    { at: 44, text: '2  YELLOW' },
    { at: 80, text: '3  PINK' },
  ];
  return (
    <Riso paper={{ color: PAPER.white, graph: 0.75 }} finish={{ moire: 0.04 }}>
      <InkPass id="pass-blue" ink="sea" sweep={sweep(8)} lo={0.18} hi={0.85} weights={[1, 0, 0]} angle={15} boil={0}><PhotoArt src={WAVE_B} box={box} /></InkPass>
      <InkPass id="pass-yellow" ink="yellow" sweep={sweep(44)} offset={[2, -1]} weights={[-0.5, -0.5, 1]} bias={1} lo={0.02} hi={0.3} angle={75} boil={0}><PhotoArt src={WAVE_B} box={box} /></InkPass>
      <InkPass id="pass-pink" ink="pink" sweep={sweep(80)} offset={[-1, 2]} weights={[-1, 1, 0]} bias={1} lo={0.08} hi={0.4} angle={45} boil={0}><PhotoArt src={WAVE_B} box={box} /></InkPass>
      <RisoType id="pass-line" move="register" ink="blue" second="pink" at={B4.from + 112} lines={[
        { text: 'One pass', x: 0.07, y: 0.15, size: 0.12 },
        { text: 'per ink.', x: 0.07, y: 0.245, size: 0.12 },
      ]} />
      {labels.map((l, i) => (
        <RisoType key={i} id={`pass-label-${i}`} move="type" ink="federal" second={null} at={B4.from + l.at + 4} lines={[{ text: l.text, x: 0.075 + i * 0.3, y: 0.79, size: 0.04, face: 'mono' }]} />
      ))}
    </Riso>
  );
};

/* 5. The kento: close on the sheet's corner; boiling strokes draw the marks */
const Kento: React.FC = () => {
  const f = useCurrentFrame() - B5.from;
  const s = 2.25 + 0.2 * inOut(f / 125);
  const box = { x: 0, y: 0, w: 1080, h: 746 };
  // the sheet's bottom-left corner on the page, shown low on the left of the screen
  const cx = 0, cy = 746;
  return (
    <Riso paper={{ color: PAPER.cream }} finish={{ moire: 0.04 }}>
      <PrintCamera cam={focus(s, cx, cy, 250, 1690)}>
        <RisoPhoto id="kento-wave" src={WAVE_C} box={box} window={{ x: 0, y: 720, w: 1080, h: 1200 }} passes={[
          { ink: 'sea', sep: 'blue' },
          { ink: 'yellow', sep: 'yellow', lo: 0.02, hi: 0.35 },
        ]} />
        <BoilStroke id="kento-l" ink="pink" d={cornerPath(cx - 12, cy + 12, 70)} width={7} at={B5.from + 22} dur={12} boil={0.8} />
        <BoilStroke id="kento-bar" ink="pink" d={`M${cx + 190} ${cy + 12} L${cx + 270} ${cy + 12}`} width={7} at={B5.from + 40} dur={8} boil={0.8} />
        <BoilStroke id="kento-loop" ink="green" d={loopPath(cx + 20, cy, 75, 52, -150, 0.12, -6)} width={4.5} at={B5.from + 58} dur={16} boil={0.8} />
      </PrintCamera>
      <RisoType id="kento-name" move="stamp" ink="blue" second="pink" at={B5.from + 6} lines={[{ text: 'Kento:', x: 0.07, y: 0.12, size: 0.13 }]} />
      <RisoType id="kento-line" move="register" ink="blue" second="pink" at={B5.from + 52} lines={[
        { text: 'two notches', x: 0.07, y: 0.2, size: 0.085 },
        { text: 'that kept every', x: 0.07, y: 0.265, size: 0.085 },
        { text: 'sheet in register.', x: 0.07, y: 0.33, size: 0.085 },
      ]} />
    </Riso>
  );
};

/* 6. The close: three impressions, each a little different */
const Close: React.FC = () => {
  const f = useCurrentFrame() - B6.from;
  const prints = [
    { src: WAVE_A, y: 560, at: 4, off: [[0, 0], [12, -7]] as [number, number][], hi: 0.32 },
    { src: WAVE_B, y: 1000, at: 12, off: [[-5, 3], [-13, 6]] as [number, number][], hi: 0.45 },
    { src: WAVE_C, y: 1440, at: 20, off: [[4, -4], [5, 13]] as [number, number][], hi: 0.26 },
  ];
  return (
    <PrintCadence every={f > 30 ? RATES.hold : RATES.grain}>
    <Riso paper={{ color: PAPER.cream }} finish={{ moire: 0.05 }}>
      {prints.map((p, i) => f >= p.at && (
        <RisoPhoto key={i} id={`close-${i}`} src={p.src} box={{ x: 150, y: p.y, w: 780, h: 400 }} rotate={[-1.2, 0.8, -0.5][i]} passes={[
          { ink: 'sea', sep: 'blue', offset: p.off[0], starve: 0.15 + 0.12 * i },
          { ink: 'yellow', sep: 'yellow', lo: 0.02, hi: p.hi, offset: p.off[1] },
        ]} />
      ))}
      <RisoType id="close-kicker" move="type" ink="federal" second={null} at={B6.from + 26} lines={[{ text: 'THE GREAT WAVE, c. 1831', x: 0.075, y: 0.095, size: 0.042, face: 'mono' }]} />
      <RisoType id="close-line" move="stamp" ink="blue" second="pink" at={B6.from + 54} lines={[
        { text: 'No two', x: 0.07, y: 0.17, size: 0.12 },
        { text: 'alike.', x: 0.07, y: 0.255, size: 0.12, delay: 8 },
      ]} />
    </Riso>
    </PrintCadence>
  );
};

const Picture: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: PAPER.cream }}>
      {f < B1.end && <Hook />}
      {f >= B2.from && f < B2.end && <Edo />}
      {f >= B3.from && f < B3.end && <Block />}
      {f >= B4.from && f < B4.end && <Passes />}
      {f >= B5.from && f < B5.end && <Kento />}
      {f >= B6.from && <Close />}
    </AbsoluteFill>
  );
};

const sfx = (name: string, at: number, volume = 1) => (
  <Sequence key={`${name}${at}`} from={Math.max(0, at)} durationInFrames={120} layout="none"><Audio src={staticFile(`sfx/${name}.wav`)} volume={volume * (name === 'press' || name === 'stamp' ? 0.65 : 1)} /></Sequence>
);

const Reel: React.FC = () => (
  <AbsoluteFill>
    <Posterize step={2}><Picture /></Posterize>
    <Sequence from={0} durationInFrames={B6.end} layout="none"><Audio src={staticFile('score.wav')} volume={0.78} /></Sequence>
    {/* 1 */}
    {sfx('press', 0, 0.8)}{sfx('press', 17, 0.7)}{sfx('press', 35, 0.7)}{Array.from({ length: 9 }, (_, i) => sfx('type', 4 + i * 2, 0.3))}{sfx('roller', 25, 0.6)}
    {/* 2 */}
    {sfx('press', B2.from - 1, 0.8)}{sfx('stamp', B2.from + 4, 0.8)}{Array.from({ length: 6 }, (_, i) => sfx('type', B2.from + 20 + i * 2, 0.3))}{sfx('roller', B2.from + 43, 0.55)}
    {/* 3 */}
    {sfx('press', B3.from - 1, 0.7)}{sfx('roller', B3.from + 5, 0.55)}{sfx('marker', B3.from + 33, 0.55)}{sfx('whoosh', B3.from + 32, 0.3)}
    {/* 4 */}
    {sfx('paper', B4.from - 1, 0.5)}{sfx('press', B4.from + 7, 0.8)}{sfx('press', B4.from + 43, 0.8)}{sfx('press', B4.from + 79, 0.8)}
    {[8, 44, 80].map((a) => Array.from({ length: 4 }, (_, i) => sfx('type', B4.from + a + 4 + i * 2, 0.25)))}{sfx('roller', B4.from + 111, 0.55)}
    {/* 5 */}
    {sfx('whoosh', B5.from - 2, 0.3)}{sfx('stamp', B5.from + 6, 0.7)}{sfx('marker', B5.from + 22, 0.5)}{sfx('marker', B5.from + 40, 0.4)}{sfx('roller', B5.from + 51, 0.5)}{sfx('marker', B5.from + 58, 0.55)}
    {/* 6 */}
    {sfx('press', B6.from + 3, 0.75)}{sfx('press', B6.from + 11, 0.7)}{sfx('press', B6.from + 19, 0.7)}
    {Array.from({ length: 11 }, (_, i) => sfx('type', B6.from + 26 + i * 2, 0.25))}{sfx('stamp', B6.from + 54, 0.85)}{sfx('stamp', B6.from + 62, 0.85)}
  </AbsoluteFill>
);

registerRoot(() => <Composition id="OneInk" component={Reel} durationInFrames={B6.end} fps={30} width={1080} height={1920} />);
