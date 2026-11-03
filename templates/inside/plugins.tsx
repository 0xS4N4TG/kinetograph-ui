// Launch film 2, the plugin run: "Then plugins change the whole look. Hexed rolls a grade. Paper tears it out. VJ puts
// it on a screen. Brushes paint it by hand. And the words move with your voice."
//
// One subject all the way through: Blacksmith Scene (1893, public domain), shot in Edison's Black Maria. Nothing cuts
// away from it. Each plugin changes the same picture in turn, and the change from one plugin to the next is made by the
// plugin itself:
//   1  the archive grade, a slow push, the plugin names as a quiet title; HEXED flies up into the corner tag
//   2  Hexed rerolls the look a few times a second with a shutter blip on each roll, and locks on "grade"
//   3  the picture freezes, the smiths are cut out in torn paper (Paper's CutOut), the sheet behind tears in two and
//      falls away onto a paper ground with a red sun; a marker line boils round the cut-out (Scrapline's line)
//   4  VJ swallows the collage into a CRT; the channel flips to the live smiths in thermal with blob boxes on them, and
//      the tube switches off to a dot
//   5  the dot opens back into the picture and p5.brush tints it by hand: watercolour washes on each smith (traced from
//      their matte, boiling on 15 fps steps) and cream charcoal outlines drawn on
//   6  the paint dries away and the narrator's words write themselves onto the anvil (kinetic-typography HandCaptions)
// Sequence frame 0 is take time 22.45 s; every beat is timed from the take's word stamps (public/vo/asr-spaced.json).
//
// Offline data (made once; a render only reads files):
//   public/plugins/blacksmith-matte.mp4  plugins/vj/matte (RVM, rvm_landscape.onnx) on public/footage/blacksmith.mp4
//   public/plugins/smith-alpha.png       tools/smith-mattes.py: the cut-out's alpha on source frame 42
//   public/plugins/smith-cut.png         a still of CutSource (below) with that alpha (tools/smith-cut.sh)
//   track/smith-contours.json            tools/smith-mattes.py: the smiths' outlines per source frame, for the brush
//   track/smith-blobs.json               plugins/vj/tools/blobs.mjs on the clip (templates/vj-demo's track)
//   track/blacksmith.json                the anvil's point track (plugins/vj/tools/track.mjs)
//
//   node ../kinetograph-0.3.0/packages/cli/dist/cli.js render templates/inside/plugins.tsx --comp PluginRun -o templates/inside/public/worlds/plugin-run.mp4 --concurrency 2
import React from 'react';
import { AbsoluteFill, Composition, Freeze, Sequence, interpolate, random, registerRoot, staticFile, useCurrentFrame } from 'remotion';
import { Ellipse, Image, Layer, Path, Rect, Text, Video, blur, dropShadow, glow, gradientMap, grain } from '@kinetographdev/core';
import { measureText } from '@remotion/layout-utils';
import { BrushCanvas } from '@kinetographdev/p5-brush';
import { Hexed, describe, roll } from '../../plugins/hexed/src/index.js';
import type { Slot } from '../../plugins/hexed/src/index.js';
import { CutOut, Paper } from '../../plugins/paper/src/index.js';
import { Blobs, IRON, crt, switchOff, thermal, type BlobTrack } from '../../plugins/vj/src/index.js';
import { HandCaptions, type Word as KWord } from '../../plugins/kinetic-typography/src/index.js';
import { CREAM, MONO, RED, SANS, clamp, ease, out } from './kit.js';
import take from './public/vo/asr-spaced.json' with { type: 'json' };
import anvilTrack from './track/blacksmith.json' with { type: 'json' };
import smithBlobs from './track/smith-blobs.json' with { type: 'json' };
import contours from './track/smith-contours.json' with { type: 'json' };

const W = 1920;
const H = 1080;
const FPS = 30;

// ---------------------------------------------------------------------------------------------------------------------
// Timing, from the voice

/** Take time of sequence frame 0. */
export const T0 = 22.45;
const sf = (t: number) => Math.round((t - T0) * FPS);
const bare = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, '');
const STAMPS = (take as { words: { word: string; start: number; end: number }[] }).words.filter((w) => w.start >= T0 && w.start < 36.3);
/** Sequence frame of a spoken word after take time `after`. */
const said = (w: string, after = T0) => sf(STAMPS.find((x) => x.start >= after && bare(x.word) === w)!.start);
// Whisper hangs "and" on the end of "hand" (32.66 to 33.80); the take is silent from 32.70 and the voice comes back at
// 33.68 (RMS of take-spaced.wav), which is where "and" is said.
const AND_AT = 33.68;

export const LEN = sf(36.3); // 416: Studio takes over on the next frame
const B = {
  plugins: said('plugins'),
  hexed: said('hexed'),
  grade: said('grade'),
  paper: said('paper'),
  tears: said('tears'),
  out: said('out', 27.8),
  vj: said('vj'),
  screen: said('screen'),
  brushes: said('brushes'),
  hand: said('hand'),
  and: sf(AND_AT),
};

// the beats' own frames, from the words
const ROLL = B.hexed; // 81: the first reroll
const LOCK = B.grade; // 96: the look locks on "grade"
const FREEZE = B.paper - 4; // 140
const CUT = B.paper; // 144: the cut-out appears
const TEAR = B.tears - 2; // 150: the sheet tears and falls away
const SWALLOW = B.vj - 9; // 200: the collage goes into the tube
const SWAL_LEN = 12;
const CHANNEL = SWALLOW + SWAL_LEN; // 212: the tube flips to the live picture
const OFF = B.screen + 28; // 262: the tube switches off
const OFF_LEN = 12;
const IRIS = OFF + OFF_LEN - 2; // 272: the dot opens into the picture
const PAINT = B.brushes; // 281: the first wash
const DRY = B.and - 16; // 321: the paint starts to dry away
const HOLD = LEN - 36; // 380: the words hold from here (the last page would leave at 385)

// ---------------------------------------------------------------------------------------------------------------------
// The picture: which frame of the 2.6 s clip shows on each sequence frame (slowed, hand-cranked; each segment restarts
// under a transition, never on screen)

const SMITH = 'footage/blacksmith.mp4';
const CUT_SRC = 42; // the frozen frame: the left hammer up, the right one down
function srcAt(f: number): number {
  if (f < ROLL) return 20 + 0.6 * f; // beat 1
  if (f < FREEZE) return CUT_SRC - 0.6 * (FREEZE - f); // Hexed, landing on the cut frame
  if (f < CHANNEL) return CUT_SRC; // Paper: frozen
  if (f < IRIS) return 4 + 0.6 * (f - CHANNEL); // the tube
  return 4 + 0.5 * (f - IRIS); // brush and words
}

/** The clip on one frame, raw. */
const Frame: React.FC<{ id?: string; f: number }> = ({ id, f }) => (
  <Freeze frame={Math.min(77, Math.max(0, Math.floor(srcAt(f))))}>
    <Video id={id} src={staticFile(SMITH)} width={W} height={H} fit="cover" muted />
  </Freeze>
);

// ---------------------------------------------------------------------------------------------------------------------
// Camera: zoom s about the point (cx, cy), which stays put on screen

interface CamK { f: number; s: number; cx?: number; cy?: number }
function camAt(keys: CamK[], f: number) {
  const full = (k: CamK) => ({ s: k.s, cx: k.cx ?? W / 2, cy: k.cy ?? H / 2 });
  if (f <= keys[0]!.f) return full(keys[0]!);
  for (let i = 0; i + 1 < keys.length; i++) {
    const a = keys[i]!, b = keys[i + 1]!;
    if (f <= b.f) {
      const p = ease((f - a.f) / Math.max(1e-6, b.f - a.f));
      const A = full(a), Bk = full(b);
      return { s: A.s + (Bk.s - A.s) * p, cx: A.cx + (Bk.cx - A.cx) * p, cy: A.cy + (Bk.cy - A.cy) * p };
    }
  }
  return full(keys[keys.length - 1]!);
}
const Cam: React.FC<{ id?: string; c: { s: number; cx: number; cy: number }; children: React.ReactNode; blurOn?: boolean }> = ({ id, c, children }) => (
  <Layer id={id} x={c.cx * (1 - c.s)} y={c.cy * (1 - c.s)} scale={c.s}>{children}</Layer>
);
const toScreen = (c: { s: number; cx: number; cy: number }, x: number, y: number) => ({ x: (x - c.cx) * c.s + c.cx, y: (y - c.cy) * c.s + c.cy });

// the camera through beats 1 and 2: a slow push on the smiths, a breath in before the first roll, a punch on the lock
const PUSH: CamK[] = [{ f: 0, s: 1.0, cy: 560 }, { f: ROLL - 6, s: 1.06, cy: 560 }, { f: ROLL, s: 1.075, cy: 560 }, { f: FREEZE, s: 1.1, cy: 560 }];
function pushAt(f: number) {
  const c = camAt(PUSH, f);
  const since = f - LOCK;
  const punch = since >= 0 ? 0.035 * Math.exp(-since / 5) : 0;
  return { ...c, s: c.s + punch };
}

// ---------------------------------------------------------------------------------------------------------------------
// The archive grade: the film's sepia gradient map, halation, grain, gate weave and flicker

const TONE = [{ offset: 0, color: '#060708' }, { offset: 0.5, color: '#7d766b' }, { offset: 1, color: '#fff2dc' }];
const weaveOf = (f: number) => ({ x: (random(`wx-${f}`) - 0.5) * 3, y: (random(`wy-${f}`) - 0.5) * 2.5 });
const archiveFx = (f: number) => [gradientMap({ stops: TONE }), glow({ radius: 40, intensity: 0.3 }), grain(0.1, { seed: 11 + (f % 7) })];

const Archive: React.FC<{ id: string; f: number }> = ({ id, f }) => {
  const w = weaveOf(f);
  return (
    <Layer id={id} x={w.x} y={w.y} opacity={0.93 + random(`fl-${f}`) * 0.07} effects={archiveFx(f)}>
      <Frame id={`${id}-v`} f={f} />
    </Layer>
  );
};

const Vignette: React.FC<{ k?: number }> = ({ k = 0.55 }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 75% at 50% 50%, rgba(0,0,0,0) 50%, rgba(0,0,0,${k}) 100%)` }} />
);

// ---------------------------------------------------------------------------------------------------------------------
// The corner tag: which plugin is at work, and what it is doing (top left, clear of the caption area)

const TAG_X = 56, TAG_Y = 52, TAG_SIZE = 22;
const tw = (text: string, font: string, size: number, weight: number, track = 0) =>
  measureText({ text, fontFamily: font, fontSize: size, fontWeight: weight, letterSpacing: track * size }).width * 1.02;

const Tag: React.FC<{ id: string; name: string; detail: string; t: number; o?: number; dot?: boolean }> = ({ id, name, detail, t, o = 1, dot }) => {
  const nw = tw(name, MONO, TAG_SIZE, 700, 0.18);
  const dw = detail ? tw(detail, MONO, TAG_SIZE * 0.82, 400) : 0;
  const pad = 16, gap = detail ? 18 : 0, dotW = dot ? 20 : 0;
  const width = pad * 2 + dotW + nw + gap + dw;
  const p = out(Math.min(1, Math.max(0, t / 8)));
  return (
    <Layer id={id} x={TAG_X} y={TAG_Y + (1 - p) * 8} opacity={p * o}>
      <Rect id={`${id}-bg`} width={width} height={44} radius={6} fill="#0b0b0c" opacity={0.72} />
      {dot ? <Rect id={`${id}-dot`} x={pad} y={17} width={10} height={10} radius={5} fill={RED} /> : null}
      <Text id={`${id}-n`} font={MONO} size={TAG_SIZE} weight={700} color={CREAM} letterSpacing={0.18 * TAG_SIZE} x={pad + dotW} y={10}>{name}</Text>
      {detail ? <Text id={`${id}-d`} font={MONO} size={TAG_SIZE * 0.82} weight={400} color="#cfc8bb" x={pad + dotW + nw + gap} y={13}>{detail}</Text> : null}
    </Layer>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// 1  "Then plugins change the whole look": the archive picture, the plugin names as a quiet title

const NAMES = ['HEXED', 'PAPER', 'VJ', 'BRUSHES'];
const TITLE_SIZE = 30, TITLE_TRACK = 0.34, TITLE_Y = 112;
const TITLE_GAP = 74;

const Title: React.FC<{ f: number }> = ({ f }) => {
  const widths = NAMES.map((n) => tw(n, MONO, TITLE_SIZE, 500, TITLE_TRACK));
  const total = widths.reduce((a, b) => a + b, 0) + TITLE_GAP * (NAMES.length - 1);
  let x = W / 2 - total / 2;
  const leave = ROLL - 14; // the others fade, HEXED flies to the corner
  return (
    <Layer id="title">
      {NAMES.map((n, i) => {
        const x0 = x;
        x += widths[i]! + TITLE_GAP;
        const t = f - (B.plugins + 1 + i * 5);
        const p = out(Math.min(1, Math.max(0, t / 12)));
        if (t < 0) return null;
        if (i === 0) {
          // HEXED: from its place in the row to the tag's place, shrinking to the tag's size, on an ease in and out
          const q = ease(Math.min(1, Math.max(0, (f - leave) / 13)));
          const size = TITLE_SIZE + (TAG_SIZE - TITLE_SIZE) * q;
          const track = TITLE_TRACK + (0.18 - TITLE_TRACK) * q;
          const xx = x0 + (TAG_X + 16 - x0) * q;
          const yy = TITLE_Y + (TAG_Y + 10 - TITLE_Y) * q;
          if (f >= ROLL) return null; // the tag has it now
          return (
            <Layer key={n} id={`title-${i}`} x={xx} y={yy + (1 - p) * 14} opacity={p} effects={p < 0.97 ? [blur((1 - p) * 8)] : []}>
              <Text id={`title-${i}-t`} font={MONO} size={size} weight={q < 0.5 ? 500 : 700} color={CREAM} letterSpacing={track * size}>{n}</Text>
            </Layer>
          );
        }
        const gone = ease(Math.min(1, Math.max(0, (f - leave - (i - 1) * 2) / 9)));
        return (
          <Layer key={n} id={`title-${i}`} x={x0} y={TITLE_Y + (1 - p) * 14 - gone * 10} opacity={p * (1 - gone) * 0.92}
            effects={p < 0.97 || gone > 0.03 ? [blur((1 - p) * 8 + gone * 8)] : []}>
            <Text id={`title-${i}-t`} font={MONO} size={TITLE_SIZE} weight={500} color={CREAM} letterSpacing={TITLE_TRACK * TITLE_SIZE}>{n}</Text>
          </Layer>
        );
      })}
    </Layer>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// 2  Hexed: a new seed every few frames, a shutter blip on each, then the lock on "grade"

const HEX_OFF: Slot[] = ['grunge'];
/** The locked look keeps still: its own shake and frame blend off, so the frozen frame and the cut-out match it. */
const LOCK_OFF: Slot[] = ['grunge', 'shake', 'time'];
const SEEDS = [22, 24, 36, 12, 35];
const LOOK = 16; // impact · blend · bleach · two-ink: red and cream ink on deep teal
const ROLLS = SEEDS.map((_, i) => ROLL + i * 3); // 81, 84, 87, 90, 93; the lock at 96

function seedAt(f: number): { seed: number; off: Slot[]; i: number } | null {
  if (f < ROLL) return null;
  if (f >= LOCK) return { seed: LOOK, off: LOCK_OFF, i: SEEDS.length };
  const i = Math.max(0, ROLLS.filter((r) => f >= r).length - 1);
  return { seed: SEEDS[i]!, off: HEX_OFF, i };
}

/** The shutter: a one-frame lift on each roll, a longer one on the lock. Kept low; it reads as a blip, not a strobe. */
function shutter(f: number): number {
  for (const r of ROLLS) if (f === r) return 0.26;
  if (f === ROLLS[0]! + 1) return 0.08;
  const t = f - LOCK;
  if (t >= 0 && t < 5) return [0.4, 0.24, 0.12, 0.05, 0.02][t]!;
  return 0;
}

const HexedBeat: React.FC<{ f: number }> = ({ f }) => {
  const s = seedAt(f)!;
  const c = pushAt(f);
  return (
    <Layer id="hex">
      <Hexed seed={s.seed} off={s.off}>
        <Cam c={c}>
          <Frame f={f} />
        </Cam>
      </Hexed>
    </Layer>
  );
};

const hexDetail = (f: number) => {
  const s = seedAt(f);
  if (!s) return '';
  return `#${s.seed}  ${describe(roll(s.seed), s.off) || 'clean'}`;
};

// ---------------------------------------------------------------------------------------------------------------------
// 3  Paper: the cut-out, the tear, the ground

const CUT_PNG = 'plugins/smith-cut.png';
const ALPHA_PNG = 'plugins/smith-alpha.png';
/** The torn line through the sheet: top to bottom, between the left smith and the anvil, jagged. */
const TEAR_PTS: [number, number][] = Array.from({ length: 46 }, (_, i) => {
  const y = -40 + (i / 45) * (H + 80);
  const base = 700 + (y / H) * 40;
  const j = (random(`tear-${i}`) - 0.5) * 26 + (random(`tear2-${Math.floor(i / 3)}`) - 0.5) * 30;
  return [base + j, y];
});
const tearPoly = (side: -1 | 1) => {
  const edge = side < 0 ? -200 : W + 200;
  const pts = [...TEAR_PTS, [edge, H + 200], [edge, -200]] as [number, number][];
  return 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L') + ' Z';
};
/** The white fibres along a torn edge: a thin band between the tear and the tear pushed `w` px to one side. */
const fringe = (side: -1 | 1, seed: string) => {
  const a = TEAR_PTS.map(([x, y]) => [x, y]);
  const b = TEAR_PTS.map(([x, y], i) => [x + side * (5 + random(`${seed}-${i}`) * 9), y]).reverse();
  return 'M' + [...a, ...b].map(([x, y]) => `${x!.toFixed(1)} ${y!.toFixed(1)}`).join(' L') + ' Z';
};

/** One half of the torn sheet: the frozen locked look, with the smiths' hole, falling away. */
const Half: React.FC<{ side: -1 | 1; f: number }> = ({ side, f }) => {
  const id = side < 0 ? 'half-l' : 'half-r';
  const open = out(Math.min(1, Math.max(0, (f - (TEAR - 4)) / 5)));
  const t = Math.min(1, Math.max(0, (f - TEAR) / 15));
  const fall = t * t * t;
  const x = side * (open * 7 + fall * 1250);
  const y = fall * (side < 0 ? 260 : 160);
  const r = side * fall * (side < 0 ? 9 : 7);
  if (t >= 1) return null;
  return (
    <Layer id={`${id}-o`} x={(side < 0 ? 0 : W) + x} y={H + y} rotation={r} anchorX={side < 0 ? 0 : W} anchorY={H}
      effects={[dropShadow({ y: 10 + fall * 30, blur: 24 + fall * 40, color: '#00000080' })]}
      motionBlur={t > 0 && t < 1 ? { samples: 8, shutter: 0.5 } : undefined}>
      <Layer id={`${id}-m`} matte={{ layer: `${id}-shape`, mode: 'alpha' }}>
        <Layer id={`${id}-hole`} matte={{ layer: `${id}-a`, mode: 'luminanceInverted' }}>
          <Hexed seed={LOOK} off={[...LOCK_OFF, 'crop', 'fps', 'mirror']}>
            <Freeze frame={CUT_SRC}><Video src={staticFile(SMITH)} width={W} height={H} fit="cover" muted /></Freeze>
          </Hexed>
        </Layer>
        <Image id={`${id}-a`} src={staticFile(ALPHA_PNG)} width={W} height={H} />
        <Path id={`${id}-fr`} d={fringe(side, id)} fill="#f2ede2" opacity={open} />
      </Layer>
      <Path id={`${id}-shape`} d={tearPoly(side)} fill="#fff" />
    </Layer>
  );
};

/** A torn paper disc: a circle with a wandering radius. */
const tornDisc = (cx: number, cy: number, r: number, seed: string) => {
  const n = 120;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (1 + (random(`${seed}-a${Math.floor(i / 4)}`) - 0.5) * 0.025 + (random(`${seed}-b${i}`) - 0.5) * 0.012);
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  });
  return 'M' + pts.map(([x, y]) => `${x!.toFixed(1)} ${y!.toFixed(1)}`).join(' L') + ' Z';
};

const Ground: React.FC = () => (
  <Layer id="ground">
    <Paper w={W} h={H} tint="#ece4d4" seed={4} crumple={1.4} />
    <Layer id="sun-o" effects={[dropShadow({ y: 4, blur: 10, color: '#0000002e' })]}>
      <Path id="sun-fr" d={tornDisc(960, 470, 352, 'sunf')} fill="#f6f1e6" />
      <Path id="sun" d={tornDisc(960, 470, 340, 'sun')} fill={RED} />
    </Layer>
  </Layer>
);

// the camera on the collage: from where the push left it, a pull out as the sheet falls away, a slow drift after
const PAPER_CAM: CamK[] = [{ f: FREEZE, s: 1.1, cy: 560 }, { f: TEAR + 2, s: 1.1, cy: 560 }, { f: TEAR + 32, s: 0.86, cy: 560 }, { f: SWALLOW, s: 0.84, cy: 560 }];

/** The whole collage: the ground in screen space, the sheet and the cut-out under the camera. */
const Collage: React.FC<{ f: number; c: { s: number; cx: number; cy: number } }> = ({ f, c }) => {
  const lift = out(Math.min(1, Math.max(0, (f - CUT) / 16)));
  const pop = f >= CUT ? 1 : 0;
  const lineOn = f >= B.out ? 1 : 0;
  return (
    <Layer id="collage">
      {f >= TEAR - 6 ? <Ground /> : null}
      <Cam id="p-cam" c={c}>
      {f >= TEAR - 4 && f < TEAR + 15 ? <><Half side={-1} f={f} /><Half side={1} f={f} /></> : null}
      {f < TEAR - 4 ? (
        // before the tear: the whole frozen sheet, no hole
        <Hexed seed={LOOK} off={[...LOCK_OFF, 'crop', 'fps', 'mirror']}>
          <Freeze frame={CUT_SRC}><Video src={staticFile(SMITH)} width={W} height={H} fit="cover" muted /></Freeze>
        </Hexed>
      ) : null}
      {pop ? (
        <Layer id="cut-o" x={W / 2} y={H / 2 - lift * 14} anchorX={W / 2} anchorY={H / 2} scale={1 + 0.012 * (1 - Math.exp(-(f - CUT) / 2)) + 0.03 * lift} rotation={-1.2 * lift}>
          <CutOut id="cut" src={staticFile(CUT_PNG)} width={W} x={W / 2} y={H / 2} edge={{ style: 'torn', thickness: 0.02, intensity: 1.2 }} stock="white"
            creases={0.35} shadow={0.4 + 1.1 * lift} seed={3} threshold={110}
            line={lineOn ? { style: 'marker', width: 7, boil: 8 } : undefined} lineColor="#16161a" lineGap={16} />
        </Layer>
      ) : null}
      </Cam>
    </Layer>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// 4  VJ: into the tube, the channel flips to thermal with blob boxes, the tube switches off

const FACE = { cx: 960, cy: 500, hw: 660, hh: 371 };
const BLOBS = { ...(smithBlobs as BlobTrack), fps: 18 }; // read at 0.6x: frame index = source frame
const BLOBS_FROM = CHANNEL - 4 / 0.6;

const Tube: React.FC<{ f: number }> = ({ f }) => {
  const sw = ease(Math.min(1, Math.max(0, (f - SWALLOW) / SWAL_LEN)));
  const hw = W / 2 + (FACE.hw - W / 2) * sw, hh = H / 2 + (FACE.hh - H / 2) * sw, cy = H / 2 + (FACE.cy - H / 2) * sw;
  const offT = Math.min(0.97, Math.max(0, (f - OFF) / OFF_LEN));
  const flip = f - CHANNEL;
  const live = f >= CHANNEL;
  const noise = flip >= 0 && flip < 3 ? [0.55, 0.3, 0.1][flip]! : 0.03;
  const fx = [crt({ cx: FACE.cx, cy, hw, hh, curve: 0.09 * sw, scan: 0.7 * sw, mask: 0.35 * sw, conv: 1.4 * sw, noise, glass: sw * (1 - Math.min(1, offT * 1.6)), ...(offT > 0 ? switchOff(offT) : {}) }), glow({ radius: 26, intensity: 0.25 * sw })];
  const pc = PAPER_CAM[PAPER_CAM.length - 1]!;
  return (
    <Layer id="tube" effects={fx} opacity={interpolate(f, [IRIS + 2, IRIS + 10], [1, 0], clamp)}>
      {/* crt() maps the whole layer onto the tube's face, so what is in the tube stays full frame */}
      <Layer id="tube-in">
        {live ? (
          <>
            <Layer id="tube-live" effects={thermal({ palette: IRON, soft: 2 })}>
              <Frame id="tube-v" f={f} />
            </Layer>
            <Layer id="tube-blobs" opacity={interpolate(flip, [4, 12], [0, 1], clamp)}>
              <Blobs id="bl" track={BLOBS} from={BLOBS_FROM} width={W} height={H} box="corners" label="id" links="chain" min={0.004} max={8}
                color="#f4fff8" stroke={2.2} fontSize={22} />
            </Layer>
            {flip < 2 ? <Rect id="tube-flash" width={W} height={H} fill="#fff" opacity={flip === 0 ? 0.6 : 0.25} /> : null}
          </>
        ) : (
          <Collage f={f} c={{ s: pc.s, cx: W / 2, cy: pc.cy ?? H / 2 }} />
        )}
      </Layer>
    </Layer>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// 5  Brushes: p5.brush tints the picture by hand

type Poly = { fig: number; pts: number[][] };
const C = contours as { anvil: number[][]; frames: Poly[][] };
/** Hand-tinting inks, one per smith, and the anvil's hot iron. Laid on in `color` blend: the picture's light and shade
 *  stay, the paint gives the hue, as the hand-tinted prints of the 1890s did. */
const INKS = ['#e8321e', '#1f44e0', '#f2b21a'];
const HOT = '#ff6a14';
const WALL = '#14a6a0';
/** When each wash starts, in sequence frames: left smith on "Brushes", then the middle, the right, the anvil, the wall. */
const WASH_AT = [PAINT, PAINT + 4, PAINT + 8, PAINT + 12, PAINT + 16];
const step15 = (f: number) => f - (f % 2); // 15 drawings a second

const centroid = (pts: number[][]) => {
  let x = 0, y = 0;
  for (const p of pts) x += p[0]!, y += p[1]!;
  return [x / pts.length, y / pts.length] as const;
};
const grown = (pts: number[][], k: number) => {
  const [cx, cy] = centroid(pts);
  return pts.map(([x, y]) => [cx + (x! - cx) * k, cy + (y! - cy) * k]);
};
/** The smiths stand in three bands across the frame; a band's ink goes on whatever of the matte falls in it, so an arm
 *  that swings over a neighbour or two smiths merging in the matte never changes colour. */
const BANDS: [number, number][] = [[-100, 745], [745, 1120], [1120, W + 100]];
/** A polygon cut to the band x0..x1 (Sutherland-Hodgman against the two vertical lines). */
function band(pts: number[][], x0: number, x1: number): number[][] {
  const cut = (poly: number[][], inside: (p: number[]) => boolean, x: number) => {
    const res: number[][] = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i]!, b = poly[(i + 1) % poly.length]!;
      const ia = inside(a), ib = inside(b);
      if (ia) res.push(a);
      if (ia !== ib) {
        const t = (x - a[0]!) / (b[0]! - a[0]!);
        res.push([x, a[1]! + (b[1]! - a[1]!) * t]);
      }
    }
    return res;
  };
  const raw = cut(cut(pts, (p) => p[0]! >= x0, x0), (p) => p[0]! <= x1, x1);
  // a concave outline cut by a line runs back and forth along it; p5.brush's fill chokes on those zero-width edges,
  // so each run of points on a cut line keeps only its ends, and repeated points go
  const on = (q: number[]) => q[0] === x0 || q[0] === x1;
  const res: number[][] = [];
  for (let i = 0; i < raw.length; i++) {
    const q = raw[i]!, prev = raw[(i - 1 + raw.length) % raw.length]!, next = raw[(i + 1) % raw.length]!;
    if (on(q) && on(prev) && on(next) && prev[0] === q[0] && next[0] === q[0]) continue;
    const last = res[res.length - 1];
    if (last && Math.abs(last[0]! - q[0]!) < 0.5 && Math.abs(last[1]! - q[1]!) < 0.5) continue;
    res.push(q);
  }
  return res;
}
const bandOf = (pts: number[][]) => {
  const [cx] = centroid(pts);
  return cx < BANDS[0]![1] ? 0 : cx < BANDS[1]![1] ? 1 : 2;
};
/** Parallel strokes `dist` apart at `deg` across a polygon, each clipped to it: [x1, y1, x2, y2], top to bottom. */
function hatchLines(poly: number[][], dist: number, deg: number): [number, number, number, number][] {
  const a = (deg * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
  // into a frame where the strokes are horizontal
  const r = poly.map(([x, y]) => [x! * ca + y! * sa, -x! * sa + y! * ca]);
  const ys = r.map((p) => p[1]!);
  const out: [number, number, number, number][] = [];
  for (let y = Math.min(...ys) + dist / 2; y < Math.max(...ys); y += dist) {
    const xs: number[] = [];
    for (let i = 0; i < r.length; i++) {
      const p = r[i]!, q = r[(i + 1) % r.length]!;
      if ((p[1]! <= y) !== (q[1]! <= y)) xs.push(p[0]! + ((y - p[1]!) / (q[1]! - p[1]!)) * (q[0]! - p[0]!));
    }
    xs.sort((m, n) => m - n);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const back = (x: number) => [x * ca - y * sa, x * sa + y * ca] as const;
      const [x1, y1] = back(xs[k]! + 3), [x2, y2] = back(xs[k + 1]! - 3);
      if (Math.hypot(x2 - x1, y2 - y1) > 8) out.push([x1, y1, x2, y2]);
    }
  }
  return out;
}
const grow = (f: number, at: number, len = 9) => out(Math.min(1, Math.max(0, (f - at) / len)));

const Paint: React.FC<{ f: number }> = ({ f }) => {
  const st = step15(f);
  const polys = C.frames[Math.min(77, Math.floor(srcAt(st)))] ?? [];
  const dry = 1 - ease(Math.min(1, Math.max(0, (f - DRY) / 20)));
  if (dry <= 0 || f < PAINT - 1) return null;
  return (
    <>
      <Layer id="tint" blendMode="color" opacity={dry}>
        <BrushCanvas seed={`tint-${st}`} origin="top-left" draw={(b) => {
          b.noStroke();
          // the back wall and bench first, swept on left to right
          const pw = grow(st, WASH_AT[4]!, 12);
          if (pw > 0) {
            b.fill(WALL, 200); b.fillBleed(0.015); b.fillTexture(0.55, 0.5, false);
            // a loose sheet of wash: the left edge wanders like a brush edge, the right runs off the frame
            const x0 = 1530, x1 = x0 + 360 * pw;
            b.polygon([[x0 + 10, 300], [x1, 290], [x1, 1080], [x0 - 6, 1080], [x0 + 14, 820], [x0 - 4, 560]]);
          }
          BANDS.forEach(([x0, x1], k) => {
            const g = grow(st, WASH_AT[k]!);
            if (g <= 0) return;
            for (const p of polys) {
              const part = band(grown(p.pts, 0.35 + 0.65 * g), x0, x1);
              if (part.length < 3) continue;
              b.fill(INKS[k]!, 225); b.fillBleed(0.015); b.fillTexture(0.45, 0.6, false);
              b.polygon(part);
            }
          });
          const ga = grow(st, WASH_AT[3]!);
          if (ga > 0) {
            b.fill(HOT, 235); b.fillBleed(0.015); b.fillTexture(0.4, 0.6, false);
            b.polygon(grown(C.anvil, 0.35 + 0.65 * ga));
          }
        }} />
      </Layer>
      <Layer id="lines" opacity={dry}>
        <BrushCanvas seed={`line-${st}`} origin="top-left" draw={(b) => {
          b.noFill();
          b.set('charcoal', '#f6ecd8', 2.6);
          for (const p of polys) {
            const g = grow(st, WASH_AT[bandOf(p.pts)]! + 5, 12);
            const n = Math.floor(p.pts.length * g);
            if (n < 2) continue;
            b.beginShape(0.35);
            for (const [x, y] of p.pts.slice(0, n)) b.vertex(x!, y!);
            b.endShape(g >= 1);
          }
          // the anvil: its outline drawn on, then hatched once it is closed (p5.brush's hatch can hang on a part-grown
          // outline, so it only ever hatches the whole one)
          const ga = grow(st, WASH_AT[3]! + 2, 10);
          const na = Math.floor(C.anvil.length * ga);
          if (na >= 2) {
            b.beginShape(0.2);
            for (const [x, y] of C.anvil.slice(0, na)) b.vertex(x!, y!);
            b.endShape(ga >= 1);
          }
          // hatching across it, stroke by stroke from the top (our own scanlines: p5.brush's hatch() can hang)
          const gh = grow(st, WASH_AT[3]! + 8, 12);
          if (gh > 0) {
            b.set('2B', '#f6ecd8', 1.3);
            const segs = hatchLines(C.anvil, 13, -38);
            for (const [x1, y1, x2, y2] of segs.slice(0, Math.ceil(segs.length * gh))) b.line(x1, y1, x2, y2);
          }
        }} />
      </Layer>
    </>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// 6  The words, on the anvil

const SAID = ['and', 'the', 'words', 'move', 'with', 'your', 'voice.'];
const WORDS: KWord[] = (() => {
  const after = STAMPS.filter((w) => w.start >= 32.6);
  return SAID.map((text, i) => {
    const s = after[i]!;
    const start = i === 0 ? AND_AT : s.start;
    return { text, from: sf(start), to: Math.max(sf(start) + 3, sf(s.end)) };
  });
})();

const WORD_CAM: CamK[] = [{ f: IRIS, s: 1.0 }, { f: B.and - 4, s: 1.02, cx: 1020, cy: 700 }, { f: HOLD, s: 1.09, cx: 1020, cy: 700 }];

// ---------------------------------------------------------------------------------------------------------------------
// The run

export const PluginRun: React.FC = () => {
  const f = useCurrentFrame();
  const flash = shutter(f);
  // which tag is up
  const tag = (() => {
    if (f < ROLL) return null;
    if (f < CUT) return { key: 'hex', name: 'HEXED', detail: hexDetail(f), at: ROLL, dot: f >= LOCK };
    if (f < SWALLOW + 4) return { key: 'paper', name: 'PAPER', detail: 'CutOut · torn · marker line', at: CUT };
    if (f < IRIS + 6) return { key: 'vj', name: 'VJ', detail: f < CHANNEL ? 'crt' : 'crt · thermal · blobs', at: SWALLOW + 4 };
    if (f < B.and - 2) return { key: 'brush', name: 'BRUSHES', detail: 'p5.brush · watercolour · charcoal', at: IRIS + 6 };
    return { key: 'type', name: 'KINETIC TYPE', detail: 'HandCaptions · on the voice', at: B.and - 2 };
  })();
  const tagOut = interpolate(f, [HOLD, HOLD + 10], [1, 0], clamp);

  // beat 5/6 camera, and the anvil for the words
  const wc = camAt(WORD_CAM, f);
  const anchor = (fr: number) => {
    const c = camAt(WORD_CAM, fr);
    const pts = (anvilTrack as { points: number[][] }).points;
    const [x, y] = pts[Math.min(pts.length - 1, Math.max(0, Math.floor(srcAt(fr))))]!;
    const w = weaveOf(fr);
    return toScreen(c, x! + w.x, y! + w.y);
  };

  const irisT = ease(Math.min(1, Math.max(0, (f - IRIS) / 14)));
  return (
    <AbsoluteFill style={{ backgroundColor: '#050506' }}>
      {/* 1: the archive picture */}
      {f < ROLL ? (
        <>
          <Cam id="a-cam" c={pushAt(f)}><Archive id="a" f={f} /></Cam>
          <Vignette />
          <Title f={f} />
        </>
      ) : null}

      {/* 2: Hexed rolls, then holds the lock */}
      {f >= ROLL && f < FREEZE ? <HexedBeat f={f} /> : null}

      {/* 3: the collage (before the tube takes it) */}
      {f >= FREEZE && f < SWALLOW ? (
        <Collage f={f} c={camAt(PAPER_CAM, f)} />
      ) : null}

      {/* 4: the tube */}
      {f >= SWALLOW && f < IRIS + 14 ? <Tube f={f} /> : null}

      {/* 5 and 6: the picture comes back through the dot, painted, then written on */}
      {f >= IRIS ? (
        <Layer id="end">
          <Layer id="end-m" matte={{ layer: 'iris', mode: 'alpha' }}>
            <Cam id="w-cam" c={wc}>
              <Archive id="w" f={f} />
              <Paint f={f} />
            </Cam>
            <Vignette />
          </Layer>
          <Ellipse id="iris" x={FACE.cx - (8 + irisT * 1250)} y={FACE.cy - (8 + irisT * 1250)} width={2 * (8 + irisT * 1250)} height={2 * (8 + irisT * 1250)} fill="#fff"
            effects={irisT < 1 ? [blur(6 + irisT * 30)] : []} />
          {f >= B.and - 2 ? (
            <Freeze frame={Math.min(f, HOLD)}>
              <HandCaptions words={WORDS} split={[3, 4]} hot={['words', { word: 'voice', color: '#ffd9a8' }]} anchor={(fr) => ({ ...anchor(fr), w: 150, h: 120 })}
                size={104} top={110} halo={0.6} />
            </Freeze>
          ) : null}
        </Layer>
      ) : null}

      {tag ? <Tag key={tag.key} id={`tag-${tag.key}`} name={tag.name} detail={tag.detail} t={f - tag.at} o={tagOut} dot={'dot' in tag ? tag.dot : false} /> : null}
      {flash > 0 ? <Rect id="shutter" width={W} height={H} fill="#fff6e8" opacity={flash} /> : null}
    </AbsoluteFill>
  );
};

/** The cut-out's picture: the locked look on the frozen frame, no camera. tools/smith-cut.sh stills it and puts the
 *  alpha on it. */
export const CutSource: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: '#000' }}>
    <Hexed seed={LOOK} off={[...LOCK_OFF, 'crop', 'fps', 'mirror']}>
      <Freeze frame={CUT_SRC}><Video src={staticFile(SMITH)} width={W} height={H} fit="cover" muted /></Freeze>
    </Hexed>
  </AbsoluteFill>
);

registerRoot(() => (
  <>
    <Composition id="PluginRun" component={PluginRun} durationInFrames={LEN} fps={FPS} width={W} height={H} />
    <Composition id="CutSource" component={CutSource} durationInFrames={1} fps={FPS} width={W} height={H} />
  </>
));
