// The opening of a double-exposure title sequence, timed to a measured reference: three
// stacked 16:9 double-exposure panels on black, two shots cut hard at f120, credits fading in, a film burn out.
// Built on the stack-credits template (templates/stack-credits/parts). 1080x1920 at 60 fps with every panel held at
// 24 fps, as measured. Our own pictures (public/CREDITS.md) and names; the reference's frames, positions and timing.
//
//   node ../kinetograph/packages/cli/dist/cli.js render templates/stack-credits/index.tsx -o templates/stack-credits/out/stack-credits.mp4
import React from 'react';
import { AbsoluteFill, Composition, registerRoot, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Credit, DoubleExposure, FadeDown, FilmBurn, GRADES, PANEL, Panel, Plate, StackFrame, XFlare, held, type BurnStep, type Grade } from './parts/index.js';

const A = (n: string) => staticFile(n);
const PW = PANEL.w, PH = PANEL.h;

/** the warm sepia grade of the first frames, stepping to the panel's own on one update */
const graded = (f: number, until: number, g: Grade) => (f < until ? GRADES.warm : g);

/* ---------------- shot A (f0-f119) ---------------- */

/** Panel 1: an aerial plate inside a brush-edged shape filling the upper left and a band along the top and right;
 *  the lower right is blank paper with a hot spot. Drifts (+0.37, +1.05) px/frame, on even frames. */
const A1: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = held(f, fps, 0);
  return (
    <Panel id="a1" index={0} grade={graded(f, 12, GRADES.aerial)}>
      <div style={{ position: 'absolute', left: 0.6 * PW - 260, top: 0.42 * PH - 200, width: 520, height: 400, background: 'radial-gradient(closest-side, #ffffff, rgba(255,255,255,0))' }} />
      <DoubleExposure id="a1-dx" edge={6}
        matte={<img src={A('a1-matte.png')} style={{ position: 'absolute', left: 0, top: 0, width: PW, height: PH }} />}
        inside={
          <div style={{ position: 'absolute', left: -670 + 0.37 * t, top: -312 + 1.05 * t, width: 2400, height: 1225, transform: 'rotate(55deg)' }}>
            <Plate src={A('aerial.jpg')} box={{ x: 0, y: 0, w: 2400, h: 1225 }} filter="grayscale(1) contrast(0.85) brightness(1.18)" />
          </div>
        } />
    </Panel>
  );
};

/** Panel 2: the headless suit. Above the deck line (v 0.525) the head is a refinery (it slides +0.43, +0.14 px/f);
 *  below it the suit is solid dark, sinking +0.03, +0.32 px/f. Shoulders 0.74 W wide, centred at 0.495 W. */
const A2: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = held(f, fps, 1);
  const deck = 0.525 * PH;
  // the suit's neck (its narrowest row, at 0.47 of the picture's height) sits on the deck line
  const suit = { x: 174, y: deck - 0.47 * 881 + 0.32 * t, w: 700, h: 881 };
  const suitImg = (style?: React.CSSProperties) => <img src={A('suit.png')} style={{ position: 'absolute', left: suit.x + 0.03 * t, top: suit.y, width: suit.w, height: suit.h, objectFit: 'contain', objectPosition: '50% 0%', ...style }} />;
  return (
    <Panel id="a2" index={1} grade={graded(f, 15, GRADES.suit)} paper="#f4f4f0">
      <DoubleExposure id="a2-head" edge={6}
        matte={<div style={{ position: 'absolute', left: 0, top: 0, width: PW, height: deck, overflow: 'hidden' }}>{suitImg()}</div>}
        inside={<Plate src={A('refinery.jpg')} box={{ x: 170 + 0.43 * t, y: -40 + 0.14 * t, w: 700, h: 360 }} position="50% 70%" filter="grayscale(1) contrast(1.3) brightness(1.08)" />} />
      <div style={{ position: 'absolute', left: 0, top: deck, width: PW, height: PH - deck, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: -deck, width: PW, height: PH }}>{suitImg({ filter: 'grayscale(1) contrast(1.6) brightness(0.55)' })}</div>
      </div>
    </Panel>
  );
};

/** Panel 3: a misty flat field, zooming out about 3.6 % over the shot. */
const A3: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = held(f, fps, 1);
  return (
    <Panel id="a3" index={2} grade={graded(f, 19, GRADES.field)}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${(1.04 - 0.0003 * t).toFixed(4)})` }}>
        <Plate src={A('field.jpg')} box={{ x: 0, y: 0, w: PW, h: PH }} filter="grayscale(1) contrast(1.1) brightness(1.05)" />
      </div>
    </Panel>
  );
};

const ShotA: React.FC = () => (
  <>
    <A1 /><A2 /><A3 />
    <Credit lines={[{ text: 'ELENA', kind: 'name' }, { text: 'VARGA', kind: 'name' }]} x={830} y={420} align="right" drift={[0.1, 0.185]} fade={[[0, 1]]} phase={0} />
    <Credit lines={[{ text: 'CASTING BY', kind: 'label' }, { text: 'ROSALIND M. HART,', kind: 'name' }, { text: 'CSA', kind: 'name' }]} x={847} y={771} at={119} align="right" drift={[0.1, 0.2]} phase={1}
      fade={[[78, 0], [79, 0.16], [83, 0.21], [86, 0.26], [89, 0.31], [93, 0.37], [96, 0.43], [99, 0.54], [103, 0.61], [105, 0.69], [107, 0.77], [109, 0.81], [113, 0.89], [115, 0.95], [117, 0.98], [119, 1]]} />
    <Credit lines={[{ text: 'THEO', kind: 'first' }, { text: 'CALLOWAY', kind: 'star' }]} x={840} y={1368} align="right" phase={1}
      fade={[[93, 0], [94, 0.01], [97, 0.1], [100, 0.15], [103, 0.2], [105, 0.26], [107, 0.37], [109, 0.5], [113, 0.65], [115, 0.8], [117, 0.95], [119, 1]]} />
    <Credit lines={[{ text: 'SAMUEL', kind: 'name' }, { text: 'McKINNEARY', kind: 'star' }]} x={236} y={1690} align="left" light phase={1}
      fade={[[102, 0], [103, 0.03], [109, 0.06], [113, 0.15], [115, 0.3], [117, 0.68], [119, 1]]} />
  </>
);

/* ---------------- shot B (f120-f266) ---------------- */

/** Panel 1: a storm cloud with a man, arms raised, double-exposed into it, and the red X flare growing. */
const B1: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = held(f, fps, 0) - 120;
  return (
    <>
      <Panel id="b1" index={0} grade={GRADES.storm}>
        <Plate src={A('storm.jpg')} box={{ x: -60 - 0.097 * t, y: -40 - 0.026 * t, w: PW + 120, h: PH + 80 }} filter="grayscale(1) contrast(1.2)" />
        <img src={A('arms.png')} style={{ position: 'absolute', left: 470 + 0.18 * t, top: -30 - 0.157 * t, height: 900, mixBlendMode: 'multiply', opacity: 0.8, filter: 'grayscale(1) contrast(1.5) brightness(0.8)' }} />
      </Panel>
      <div style={{ position: 'absolute', left: PANEL.x, top: PANEL.tops[0], width: PW, height: PH, overflow: 'hidden' }}>
        <XFlare strength={0.5 + 0.5 * Math.min(1, Math.max(0, t / 120))} barY={383 - 0.12 * t} lines={false} />
      </div>
    </>
  );
};

/** Panel 2: a pale silhouette whose head holds the storm and whose chest holds the skyline over a dark pier, fading to
 *  paper going up. The skyline plate slides +1.47 px/f; the head cloud +0.30. Body edge sharp. */
const B2: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = held(f, fps, 1) - 120;
  return (
    <Panel id="b2" index={1} grade={GRADES.pale} paper="#f2f4ee">
      <DoubleExposure id="b2-dx" edge={3}
        matte={<img src={A('suit.png')} style={{ position: 'absolute', left: 80, top: -230, width: 800, height: 1007 }} />}
        inside={
          <>
            <Plate src={A('storm.jpg')} box={{ x: 100 + 0.3 * t, y: -120, w: 800, h: 520 }} position="50% 30%" filter="grayscale(1) contrast(1.4) brightness(0.75)" />
            <div style={{ position: 'absolute', left: 0, top: 170, width: PW, height: 140, background: 'linear-gradient(rgba(242,244,238,0), rgba(242,244,238,1))' }} />
            <div style={{ position: 'absolute', left: 0, top: 310, width: PW, height: 300, background: '#f2f4ee' }} />
            <FadeDown id="b2-sky" from={300} to={400}>
              <Plate src={A('refinery.jpg')} box={{ x: -200 + 1.47 * t, y: 260, w: 1400, h: 360 }} position="50% 80%" filter="grayscale(1) contrast(1.35)" />
            </FadeDown>
          </>
        } />
    </Panel>
  );
};

/** Panel 3: a pale shirt torso cropped at the neck; inside it from the chest down, a house in a bare landscape. */
const B3: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = held(f, fps, 1) - 120;
  const shirt = (style?: React.CSSProperties) => <img src={A('shirt.png')} style={{ position: 'absolute', left: -90 - 0.43 * t, top: -40 + 0.18 * t, width: 900, height: 643, ...style }} />;
  return (
    <Panel id="b3" index={2} grade={GRADES.shirt} paper="#f6f8f0">
      {shirt({ filter: 'grayscale(1) brightness(1.5) contrast(0.7)' })}
      <DoubleExposure id="b3-dx" edge={3}
        matte={shirt()}
        inside={
          <>
            <FadeDown id="b3-house" from={190} to={300}>
              <Plate src={A('house_2.jpg')} box={{ x: -60 + 0.07 * t, y: 120 + 0.16 * t, w: 860, h: 520 }} position="50% 20%" filter="grayscale(1) contrast(1.25)" />
            </FadeDown>
          </>
        } />
    </Panel>
  );
};

const ShotB: React.FC = () => (
  <>
    <B1 /><B2 /><B3 />
    <Credit lines={[{ text: 'EDITOR', kind: 'label' }, { text: 'JUDE MARSH', kind: 'name' }]} x={496} y={462} at={200} align="right" light drift={[-0.05, -0.07]} phase={0}
      fade={[[188, 0], [189, 0.41], [192, 0.61], [196, 0.77], [200, 0.84], [202, 0.92], [208, 0.97], [220, 1]]} />
    <Credit lines={[{ text: 'MUSIC BY', kind: 'label' }, { text: 'J. WREN HOLLOWAY', kind: 'name' }]} x={635} y={883} align="left" phase={1}
      fade={[[228, 0], [229, 0.09], [231, 0.13], [235, 0.23], [237, 0.32], [239, 0.43], [241, 0.55], [245, 0.69], [247, 0.8], [249, 0.9], [251, 0.98], [255, 1]]} />
    <Credit lines={[{ text: 'COSTUME DESIGNER', kind: 'label' }, { text: 'NORA QUILLAN', kind: 'name' }]} x={678} y={1566} at={175} align="left" drift={[-0.31, 0.12]} phase={1}
      fade={[[174, 0], [175, 0.91], [191, 0.98], [200, 1]]} />
  </>
);

/* ---------------- the burn (f262-f283) ---------------- */

const BURN: BurnStep[] = [
  { from: 262, to: 266, kind: 'band', x0: 772, x1: 937, color: 'rgba(255,150,70,0.9)', bars: '#311301', ghost: 0 },
  { from: 267, to: 268, kind: 'band', x0: 16, x1: 425, color: 'rgba(240,110,40,0.95)', bars: '#c16707', ghost: 0 },
  { from: 274, to: 276, kind: 'wash', x0: 759, x1: 912, color: '#fbe8b4', bars: '#ee7905', ghost: 0.15 },
  { from: 277, to: 278, kind: 'white', x0: 0, x1: 0, color: '#fdfdfc', bars: '#fdfdfc', ghost: 0 },
  { from: 279, to: 281, kind: 'split', x0: 461, x1: 795, color: '#fbe07e', bars: '#fdfdfc', ghost: 0 },
  { from: 282, to: 283, kind: 'split', x0: 453, x1: 620, color: '#f5b54a', bars: '#fdfdfc', ghost: 0 },
];

const Reel: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <StackFrame>
      {f < 120 ? <ShotA /> : <ShotB />}
      {f >= 269 && f <= 273 && <div style={{ position: 'absolute', left: 0, top: 1895, width: 1080, height: 20, background: '#ee7905' }} />}
      <FilmBurn steps={BURN} />
    </StackFrame>
  );
};

registerRoot(() => <Composition id="StackCredits" component={Reel} durationInFrames={284} fps={60} width={1080} height={1920} />);
