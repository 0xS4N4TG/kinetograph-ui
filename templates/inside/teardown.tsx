// 09 Studio teardown: Kinetograph Studio taken apart, panel by panel, on "Talk to the agent. Mark the frame. Hear the
// cut. Tune every prop. Export". The window lifts apart in depth (top bar, agent, preview, timeline, inspector), the
// camera visits each panel on its word and the panels fly back together on "Export", into black.
//   node ../kinetograph-0.3.0/packages/cli/dist/cli.js render templates/inside/teardown.tsx --comp Teardown -o templates/inside/public/worlds/teardown.mp4
//
// Every panel is the same Studio recording (public/studio, 2x) cut out with an inset clip, so it keeps playing. The
// camera is the grids kit's projection (project: world in window css px, z toward the viewer); each panel is placed
// flat at its projected position and scale (sharp, from the 4K source) and turned by the engine's 3D warp.
// Measurements (window css px) are from the recordings with a pixel probe:
//   cards: agent 12,64 340x1004 · preview 364,64 1192x820 · timeline 364,896 1192x172 (expanded 364,728 1192x340)
//          · inspector 1568,64 340x1004 · top bar 0,0 1920x62; card fill #181a1a, window #060908
//   06-markup: box appears (with its popover) at frame 305, box 982.5,306 – 1234.5,452, pin "2" at its corner
//   07-timeline: playhead x 627 (00:00), 97 px a second, knob y 817, big timecode box 381,781 97x32
//   08-props (t 7.1–9.4 s): color slider track 1587–1781 at y 357, value box 1795,341 96x32
import React from 'react';
import { Composition, registerRoot, staticFile, useCurrentFrame } from 'remotion';
import { Camera, Layer, Rect, Text, Video, Ellipse, Path, blur, dropShadow, shader } from '@kinetographdev/core';
import { measureText } from '@remotion/layout-utils';
import { CREAM, INK, MONO, RED, SANS, Wallpaper } from './kit.js';
import { project, rotX, rotY, mul, type Cam, type Item, type M3 } from '../../components/grids/kit.js';

const W = 1920, H = 1080, FPS = 30;
export const TEARDOWN_FRAMES = 162;

// ---------------------------------------------------------------------------------------------------------------------
// Easing and keys (every value is a function of the frame)

const cl = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const outC = (t: number) => 1 - Math.pow(1 - t, 3);
const outQ = (t: number) => 1 - Math.pow(1 - t, 5);
const inC = (t: number) => t * t * t;
const ramp = (f: number, a: number, b: number, e: (t: number) => number = inOut) => e(cl((f - a) / Math.max(1e-6, b - a)));
/** piecewise keys [frame, value], eased per segment */
const keys = (f: number, k: [number, number][], e: (t: number) => number = inOut) => {
  if (f <= k[0]![0]) return k[0]![1];
  for (let i = 0; i + 1 < k.length; i++) {
    const [fa, va] = k[i]!, [fb, vb] = k[i + 1]!;
    if (f <= fb) return lerp(va, vb, e((f - fa) / Math.max(1e-6, fb - fa)));
  }
  return k[k.length - 1]![1];
};

// ---------------------------------------------------------------------------------------------------------------------
// The beats (sequence frames; the sequence starts at take 36.30 s)

const WORD = { talk: 4, to: 8, the1: 12, agent: 15, mark: 43, the2: 46, frame: 50, hear: 80, the3: 83, cut: 88, tune: 112, every: 116, prop: 122, export: 154 };
const BACK = [146, 161] as const; // on "Export" the panels fly back together (ease-in, at speed, into the cut)

// ---------------------------------------------------------------------------------------------------------------------
// The panels

type PanelKey = 'top' | 'agent' | 'prev' | 'tl' | 'insp';
interface Panel { key: PanelKey; rect: [number, number, number, number]; off: [number, number, number]; rx: number; ry: number; start: number }
const PANELS: Panel[] = [
  { key: 'prev', rect: [364, 64, 1192, 820], off: [0, -30, -60], rx: 0, ry: 0, start: 12 },
  { key: 'tl', rect: [364, 896, 1192, 172], off: [0, 175, 140], rx: 7, ry: 0, start: 10 },
  { key: 'top', rect: [0, 0, 1920, 62], off: [0, -230, 110], rx: -7, ry: 0, start: 9 },
  { key: 'insp', rect: [1568, 64, 340, 1004], off: [190, 10, 210], rx: 0, ry: -12, start: 8 },
  { key: 'agent', rect: [12, 64, 340, 1004], off: [-190, 10, 250], rx: 0, ry: 12, start: 6 },
];

/** how far apart the window is: each panel lifts on its own start (z leads xy, so the path arcs) and all fly back together */
const apart = (f: number, p: Panel) => {
  const back = 1 - ramp(f, BACK[0], BACK[1], inC);
  return { xy: ramp(f, p.start, p.start + 24, inOut) * back, z: ramp(f, p.start, p.start + 20, outC) * back, turn: ramp(f, p.start + 2, p.start + 26, inOut) * back };
};
/** the timeline opens to its detailed view ("Show details") while it is apart */
const tlOpen = (f: number) => ramp(f, 16, 32, inOut) * (1 - ramp(f, BACK[0] + 4, BACK[1], inOut));
const tlRect = (f: number): [number, number, number, number] => {
  const top = lerp(896, 728, tlOpen(f));
  return [364, top, 1192, 1068 - top];
};

// ---------------------------------------------------------------------------------------------------------------------
// The camera: pose to pose, slow in and out, a dolly-out bump on each travel so it moves on an arc and shows the depth

interface Pose { f: number; t: [number, number, number]; s: number; yaw: number; pitch: number; bump?: number; e?: (t: number) => number }
const FOCAL = 2100;
const POSES: Pose[] = [
  { f: 0, t: [0, 0, 0], s: 0.86, yaw: 0, pitch: 0 },
  { f: 5, t: [0, 0, 0], s: 0.862, yaw: 0, pitch: 0 },
  // apart: the panels lift toward the lens while the camera orbits round to the left and takes in the whole window
  { f: 19, t: [-400, -30, 90], s: 0.74, yaw: -11, pitch: 5 },
  // talk to the agent: push in on the agent column
  { f: 33, t: [-1060, 300, 250], s: 1.28, yaw: -7.5, pitch: 2.5 },
  { f: 43, t: [-1052, 302, 250], s: 1.31, yaw: -7.1, pitch: 2.4 },
  // mark the frame (the move starts on "Mark")
  { f: 56, t: [260, -250, -60], s: 1.28, yaw: -2, pitch: -2.5, bump: 0.3 },
  { f: 80, t: [270, -246, -60], s: 1.33, yaw: -1.5, pitch: -2.5 },
  // hear the cut
  { f: 93, t: [-90, 600, 140], s: 1.3, yaw: 1.5, pitch: -5, bump: 0.25 },
  { f: 112, t: [-80, 598, 140], s: 1.34, yaw: 1.8, pitch: -5 },
  // tune every prop
  { f: 125, t: [930, -150, 150], s: 1.14, yaw: 5, pitch: -1, bump: 0.22 },
  { f: 141, t: [940, -150, 150], s: 1.18, yaw: 5.4, pitch: -1 },
  // export: pull back to see the whole window apart, then push in at speed as it slams back together, into black
  { f: 153, t: [30, -80, 60], s: 0.68, yaw: 3, pitch: 3 },
  { f: 161, t: [0, -40, 0], s: 1.04, yaw: 0, pitch: 0, e: inC },
];

const camAt = (f: number): Cam => {
  let a = POSES[0]!, b = POSES[0]!, p = 0;
  if (f >= POSES[POSES.length - 1]!.f) { a = b = POSES[POSES.length - 1]!; }
  else for (let i = 0; i + 1 < POSES.length; i++) {
    if (f <= POSES[i + 1]!.f) { a = POSES[i]!; b = POSES[i + 1]!; p = (f - a.f) / Math.max(1e-6, b.f - a.f); break; }
  }
  const e = (b.e ?? inOut)(cl(p));
  const ls = lerp(Math.log(a.s), Math.log(b.s), e);
  const bump = (b.bump ?? 0) * Math.sin(Math.PI * cl(p));
  const s = Math.exp(ls) * (1 - bump);
  // a little straight-ahead drift on the holds (under 0.3 degree)
  const dy = 0.22 * Math.sin(f * 0.09 + 1.3) + 0.12 * Math.sin(f * 0.23);
  const dp = 0.15 * Math.sin(f * 0.07 + 0.4);
  const t: [number, number, number] = [lerp(a.t[0], b.t[0], e), lerp(a.t[1], b.t[1], e), lerp(a.t[2], b.t[2], e)];
  return { yaw: lerp(a.yaw, b.yaw, e) + dy * cl(f / 10), pitch: lerp(a.pitch, b.pitch, e) + dp * cl(f / 10), roll: 0, dist: FOCAL / s, focal: FOCAL, target: t };
};

// ---------------------------------------------------------------------------------------------------------------------
// Staging: the subject is lit, the rest of the window steps back

const SUBJECT: Record<PanelKey, [number, number]> = { agent: [26, 45], prev: [50, 82], tl: [86, 114], insp: [118, 144], top: [999, 999] };
const stageOn = (f: number) => ramp(f, 20, 30) * (1 - ramp(f, 140, 150));
const dimOf = (f: number, k: PanelKey) => {
  const [a, b] = SUBJECT[k];
  const lit = ramp(f, a - 8, a, inOut) * (1 - ramp(f, b, b + 8, inOut));
  return 0.5 * stageOn(f) * (1 - lit);
};

// ---------------------------------------------------------------------------------------------------------------------
// Sources

const src = (f: string) => staticFile(`studio/${f}`);
/** a whole-window recording, cut to `rect` (window css px) */
const Cut: React.FC<{ id: string; file: string; rect: [number, number, number, number]; radius: number; trim: number; rate?: number; opacity?: number; effects?: unknown[] }> = ({ id, file, rect, radius, trim, rate = 1, opacity = 1, effects }) => {
  const [x, y, w, h] = rect;
  return (
    <Video id={id} src={src(file)} width={W} height={H} fit="fill" trimBefore={Math.round(trim)} playbackRate={rate} muted opacity={opacity}
      clip={{ kind: 'inset', left: x, top: y, right: W - x - w, bottom: H - y - h, radius }} effects={effects as never} />
  );
};

// Recolour only the series (indigo, hue ~242°) to another palette colour: the preview reacting to the color prop.
const RECOLOUR = `
fn rgb2hsv(c: vec3<f32>) -> vec3<f32> {
  let K = vec4<f32>(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  let p = mix(vec4<f32>(c.bg, K.wz), vec4<f32>(c.gb, K.xy), step(c.b, c.g));
  let q = mix(vec4<f32>(p.xyw, c.r), vec4<f32>(c.r, p.yzx), step(p.x, c.r));
  let d = q.x - min(q.w, q.y);
  return vec3<f32>(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-6)), d / (q.x + 1e-6), q.x);
}
fn hsv2rgb(c: vec3<f32>) -> vec3<f32> {
  let K = vec4<f32>(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  let p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, vec3<f32>(0.0), vec3<f32>(1.0)), c.y);
}
fn tint(c: vec3<f32>, hue: f32, lift: f32) -> vec3<f32> {
  let h = rgb2hsv(c);
  return hsv2rgb(vec3<f32>(hue, h.y, min(1.0, h.z * lift)));
}
fn effect(px: vec2<f32>) -> vec4<f32> {
  let s = layer(px);
  if (s.a < 0.0001) { return s; }
  let lin = s.rgb / s.a;
  let c = pow(max(lin, vec3<f32>(0.0)), vec3<f32>(1.0 / 2.2));
  let h = rgb2hsv(c);
  let w = (1.0 - smoothstep(0.05, 0.1, abs(h.x - 0.665))) * smoothstep(0.2, 0.4, h.y);
  let a = tint(c, u.hueA, u.liftA);
  let b = tint(c, u.hueB, u.liftB);
  let t = mix(a, b, u.mixAB);
  let o = mix(c, t, w * u.amount);
  return vec4<f32>(pow(o, vec3<f32>(2.2)) * s.a, s.a);
}`;

// ---------------------------------------------------------------------------------------------------------------------
// The inspector beat: the cursor takes the color slider 0 → 2; the value snaps, the chart follows

const SLIDER = { x0: 1587, x1: 1781, y: 357, box: [1795, 341, 96, 32] as const };
const DRAG = { from: 123, to: 136 };
const sliderV = (f: number) => keys(f, [[DRAG.from, 0], [DRAG.to, 2.06], [DRAG.to + 4, 2]], (t) => inOut(t));
const PALETTE = [{ hue: 0.665, lift: 1 }, { hue: 0.125, lift: 1.25 }, { hue: 0.86, lift: 1.08 }];
const snapAt = [DRAG.from + 4, DRAG.from + 10]; // value crosses 0.5 and 1.5 (inOut): frames where it snaps
const snapped = (f: number) => (sliderV(f) >= 1.5 ? 2 : sliderV(f) >= 0.5 ? 1 : 0);
const recolour = (f: number) => {
  // ease 3 frames into each new colour
  const v = snapped(f);
  let since = 99;
  for (let g = f; g > f - 4; g--) if (snapped(g - 1) !== v) { since = f - g; break; }
  const prev = since < 99 ? Math.max(0, v - 1) : v;
  const m = since < 99 ? outC(cl((since + 1) / 4)) : 1;
  return { hueA: PALETTE[prev]!.hue, liftA: PALETTE[prev]!.lift, hueB: PALETTE[v]!.hue, liftB: PALETTE[v]!.lift, mixAB: m, amount: v === 0 && since >= 99 ? 0 : 1 };
};

// ---------------------------------------------------------------------------------------------------------------------
// Overlays drawn in window css px over the recordings

const BG = '#181a1a';
/** letterSpacing is drawn by the engine but missing from the Text types */
const ls = (v: number) => ({ letterSpacing: v } as object);
const INPUT_BG = '#131515';

/** the agent column: the prompt types, sends, a tool call runs and the reply streams in */
const PROMPT = 'make the numbers move';
const TYPE = [14, 28] as const;
const SEND = 30;
const REPLY = 'Done. The counters now count up on the beat.';
const REPLY_AT = [36, 46] as const;
const AgentChat: React.FC<{ f: number }> = ({ f }) => {
  const n = Math.round(cl((f - TYPE[0]) / (TYPE[1] - TYPE[0])) * PROMPT.length);
  const typed = f < SEND ? PROMPT.slice(0, n) : '';
  const caretOn = f >= TYPE[0] - 2 && f < SEND && (f >= TYPE[0] && f < TYPE[1] ? true : Math.floor(f / 8) % 2 === 0);
  const tw = measureText({ text: typed || ' ', fontFamily: SANS, fontSize: 14, fontWeight: '400' }).width;
  const sent = f >= SEND;
  const press = f >= SEND - 1 && f < SEND + 3 ? 0.9 : 1;
  const clear = ramp(f, SEND - 1, SEND + 5); // the empty state steps away
  const bub = ramp(f, SEND, SEND + 7, outQ);
  const tool = ramp(f, SEND + 3, SEND + 10, outQ);
  const toolDone = f >= REPLY_AT[0] - 1;
  const words = REPLY.split(' ');
  const shown = Math.floor(cl((f - REPLY_AT[0]) / (REPLY_AT[1] - REPLY_AT[0])) * words.length + (f >= REPLY_AT[0] ? 1 : 0));
  const status = f < SEND ? null : f < REPLY_AT[1] ? 'Working' : 'Done';
  const bw = measureText({ text: PROMPT, fontFamily: SANS, fontSize: 14, fontWeight: '400' }).width + 28;
  return (
    <Layer id="ag-ov">
      {/* the input: the placeholder gives way to the prompt */}
      {f >= TYPE[0] - 2 ? <Rect id="ag-ph" x={34} y={957} width={298} height={50} fill={INPUT_BG} /> : null}
      {typed ? <Text id="ag-typed" x={40} y={961} font={SANS} size={14} weight={400} color="#e9e7e2">{typed}</Text> : null}
      {caretOn ? <Rect id="ag-caret" x={40 + (typed ? tw : 0) + 1} y={962} width={1.5} height={17} fill="#e9e7e2" /> : null}
      {sent && f < SEND + 30 ? <Text id="ag-ph2" x={40} y={961} font={SANS} size={14} weight={400} color="#5f6262" opacity={ramp(f, SEND + 4, SEND + 10)}>Ask for the next change</Text> : null}
      {/* the send button lights while there is text, and presses */}
      {n > 0 && f < SEND + 2 ? (
        <Layer id="ag-send" x={312} y={1028} scale={press}>
          <Ellipse id="ag-send-c" x={-16} y={-16} width={32} height={32} fill="#f2f0eb" />
          <Path id="ag-send-a" d="M0 6.5 L0 -6 M-5 -1 L0 -6 L5 -1" stroke={{ color: '#121414', width: 1.9, cap: 'round', join: 'round' } as never} />
        </Layer>
      ) : null}
      {/* the empty state steps away */}
      {clear > 0 ? <Rect id="ag-clear" x={20} y={112} width={326} height={800} fill={BG} opacity={clear} /> : null}
      {/* status */}
      {status ? (
        <>
          <Rect id="ag-st-bg" x={99} y={83} width={120} height={20} fill={BG} />
          <Ellipse id="ag-st-dot" x={101.5} y={89.5} width={6} height={6} fill={status === 'Done' ? '#4cc38a' : '#e5a54b'} />
          <Text id="ag-st" x={113} y={84} font={SANS} size={13} weight={400} color="#8b8e8d">{status}</Text>
        </>
      ) : null}
      {/* the conversation, bottom up: your message, the tool call, the reply */}
      {bub > 0 ? (
        <Layer id="ag-bub" x={338 - 14 - bw} y={676 + (1 - bub) * 14} opacity={bub}>
          <Rect id="ag-bub-r" width={bw} height={36} radius={12} fill="#26292a" />
          <Text id="ag-bub-t" x={14} y={9} font={SANS} size={14} weight={400} color="#ecebe6">{PROMPT}</Text>
        </Layer>
      ) : null}
      {tool > 0 ? (
        <Layer id="ag-tool" x={28} y={736 + (1 - tool) * 10} opacity={tool}>
          <Rect id="ag-tool-r" width={300} height={34} radius={9} fill="#1d2020" stroke={{ color: '#2a2e2e', width: 1 }} />
          {toolDone ? (
            <>
              <Rect id="ag-tool-c1" x={14} y={17} width={1.8} height={6} fill="#4cc38a" rotation={-45} anchorX={0.9} anchorY={0} />
              <Rect id="ag-tool-c2" x={16.4} y={21} width={1.8} height={11} fill="#4cc38a" rotation={-135} anchorX={0.9} anchorY={0} />
            </>
          ) : (
            <Ellipse id="ag-tool-sp" x={11} y={12} width={10} height={10} stroke={{ color: '#e5a54b', width: 1.6 }} fill="rgba(0,0,0,0)" />
          )}
          <Text id="ag-tool-t" x={32} y={9} font={MONO} size={12.5} weight={400} color="#b8bab9">edit index.tsx</Text>
          <Text id="ag-tool-p" x={196} y={9} font={MONO} size={12.5} weight={400} color="#4cc38a">+14</Text>
          <Text id="ag-tool-m" x={232} y={9} font={MONO} size={12.5} weight={400} color="#e5534b">−3</Text>
        </Layer>
      ) : null}
      {shown > 0 ? (
        <Text id="ag-reply" x={30} y={788} font={SANS} size={14.5} weight={400} color="#d9d7d2" maxWidth={290} lineHeight={1.5}>{words.slice(0, shown).join(' ')}</Text>
      ) : null}
    </Layer>
  );
};

/** the preview: a pin drops on the tooltip and a box is dragged round it; the recording takes over at frame 305 */
const BOX = { x0: 982.5, y0: 306, x1: 1234.5, y1: 452 };
const PIN_AT = 55;
const BOX_AT = [58, 66] as const;
const BOX_REC = 68; // the recording's own box and popover from here
const Markup: React.FC<{ f: number }> = ({ f }) => {
  if (f >= BOX_REC || f < PIN_AT - 1) return null;
  const drop = ramp(f, PIN_AT, PIN_AT + 6, outQ);
  const p = ramp(f, BOX_AT[0], BOX_AT[1], outC);
  const bx = lerp(BOX.x0, BOX.x1, p), by = lerp(BOX.y0, BOX.y1, p);
  return (
    <Layer id="mk">
      {p > 0 ? (
        <Rect id="mk-box" x={BOX.x0} y={BOX.y0} width={Math.max(1, bx - BOX.x0)} height={Math.max(1, by - BOX.y0)} fill="rgba(0,0,0,0)" stroke={{ color: '#ee4444', width: 2 }} />
      ) : null}
      <Layer id="mk-pin" x={BOX.x0} y={BOX.y0 - (1 - drop) * 26} scale={lerp(1.35, 1, drop)} opacity={ramp(f, PIN_AT, PIN_AT + 2)}>
        <Layer id="mk-pin-sh" y={2 + (1 - drop) * 10} opacity={0.5 * drop}>
          <Ellipse id="mk-pin-shc" x={-12} y={-12} width={24} height={24} fill="#000" />
        </Layer>
        <Ellipse id="mk-pin-c" x={-12} y={-12} width={24} height={24} fill="#ee4444" stroke={{ color: '#f4f2ee', width: 2 }} />
        <Text id="mk-pin-n" x={-4} y={-8.5} font={SANS} size={13} weight={600} color="#fff">2</Text>
      </Layer>
    </Layer>
  );
};

/** the timeline: the playhead scrubs across the frames and the beat, the timecode follows */
const PLAY = { x0: 627, pxPerS: 97 };
const scrubS = (f: number) => keys(f, [[88, 0], [102, 5.35], [109, 4.6]], (t) => inOut(t));
const tc = (s: number) => {
  const fr = Math.max(0, Math.round(s * 30));
  const ss = Math.floor(fr / 30), ff = fr % 30;
  return { big: `00:${String(ss).padStart(2, '0')}.${String(ff).padStart(2, '0')}`, n: fr };
};
const Scrub: React.FC<{ f: number }> = ({ f }) => {
  const s = scrubS(f);
  const x = PLAY.x0 + s * PLAY.pxPerS;
  const t = tc(s);
  return (
    <Layer id="sc">
      {/* paint out the recorded playhead at 00:00 and the two timecodes */}
      <Rect id="sc-po1" x={619.5} y={809.5} width={15} height={15} fill="#181a1a" />
      <Rect id="sc-po2" x={623.5} y={824} width={5} height={159} fill="#181a1a" />
      <Rect id="sc-po3" x={385} y={785} width={90} height={24} fill="#1f2121" />
      <Rect id="sc-po4" x={482} y={743} width={110} height={20} fill="#181a1a" />
      <Text id="sc-tc" x={391} y={787} font={MONO} size={17} weight={500} color="#f3f5f4" {...ls(-0.3)}>{t.big}</Text>
      <Text id="sc-tc2" x={484} y={745} font={MONO} size={12.5} weight={400} color="#6f7372">{`${t.big} 282 f`}</Text>
      {/* the playhead */}
      <Rect id="sc-line" x={x - 0.8} y={823} width={1.6} height={158} fill="#f3f5f4" />
      <Ellipse id="sc-knob" x={x - 6} y={811} width={12} height={12} fill="#f3f5f4" />
    </Layer>
  );
};

/** the inspector's color slider, redrawn so it can be dragged */
const Slider: React.FC<{ f: number }> = ({ f }) => {
  const v = sliderV(f);
  const kx = SLIDER.x0 + (SLIDER.x1 - SLIDER.x0) * (v / 4);
  const [bx, by, bw, bh] = SLIDER.box;
  const held = f >= DRAG.from - 1 && f <= DRAG.to + 2;
  return (
    <Layer id="sl">
      <Rect id="sl-po" x={SLIDER.x0 - 10} y={SLIDER.y - 12} width={SLIDER.x1 - SLIDER.x0 + 16} height={24} fill="#181a1a" />
      <Rect id="sl-tr" x={SLIDER.x0} y={SLIDER.y - 2} width={SLIDER.x1 - SLIDER.x0} height={4} radius={2} fill="#2a2c2c" />
      <Rect id="sl-fill" x={SLIDER.x0} y={SLIDER.y - 2} width={Math.max(0, kx - SLIDER.x0)} height={4} radius={2} fill="#eef0ef" />
      {held ? <Ellipse id="sl-halo" x={kx - 13} y={SLIDER.y - 13} width={26} height={26} fill="rgba(255,255,255,0.12)" /> : null}
      <Ellipse id="sl-knob" x={kx - 8.5} y={SLIDER.y - 8.5} width={17} height={17} fill="#f7f9f8" />
      <Rect id="sl-box" x={bx + 2} y={by + 2} width={bw - 4} height={bh - 4} radius={7} fill="#1c1f1e" />
      <Text id="sl-v" x={bx + 14} y={by + 7} font={SANS} size={14} weight={400} color="#f1f4f3">{String(snapped(f))}</Text>
    </Layer>
  );
};

/** Export: the button presses and a red bar runs along it */
const EXPORT_BTN = [1815.5, 17, 87.5, 30] as const;
const ExportPress: React.FC<{ f: number }> = ({ f }) => {
  if (f < WORD.export - 1) return null;
  const [x, y, w, h] = EXPORT_BTN;
  const press = f >= WORD.export && f < WORD.export + 4 ? 1 : 0;
  const prog = ramp(f, WORD.export + 1, WORD.export + 12, outC);
  return (
    <Layer id="ex">
      {press ? <Rect id="ex-press" x={x} y={y} width={w} height={h} radius={8} fill="#000" opacity={0.18} /> : null}
      <Rect id="ex-bar" x={x + 6} y={y + h - 4} width={(w - 12) * prog} height={2} radius={1} fill={RED} />
    </Layer>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// Spec-sheet labels, set in each panel's plane beside it: a red dot, the index, the phrase, word by word on the voice

interface Label { n: string; words: [string, number][]; out: number; at: [number, number]; size: number; align: 'left' | 'right' }
const LABELS: Record<PanelKey, Label> = {
  agent: { n: '01', words: [['talk', WORD.talk], ['to', WORD.to], ['the', WORD.the1], ['agent.', WORD.agent]], out: 46, at: [-52, 610], size: 44, align: 'right' },
  prev: { n: '02', words: [['mark', WORD.mark], ['the', WORD.the2], ['frame.', WORD.frame]], out: 82, at: [618, -124], size: 44, align: 'left' },
  tl: { n: '03', words: [['hear', WORD.hear], ['the', WORD.the3], ['cut.', WORD.cut]], out: 113, at: [263, 0], size: 44, align: 'left' },
  insp: { n: '04', words: [['tune', WORD.tune], ['every', WORD.every], ['prop.', WORD.prop]], out: 144, at: [392, 250], size: 44, align: 'left' },
  top: { n: '05', words: [['export.', WORD.export]], out: 157, at: [1907, 96], size: 44, align: 'right' },
};

const SpecLabel: React.FC<{ id: string; f: number; l: Label; x: number; y: number }> = ({ id, f, l, x, y }) => {
  const sz = l.size;
  const inline = false;
  const gone = 1 - ramp(f, l.out, l.out + 8, inOut);
  const first = l.words[0]![1] - 2;
  if (f < first - 1 || gone <= 0) return null;
  const adv = (s: string) => measureText({ text: s, fontFamily: SANS, fontSize: sz, fontWeight: '500', letterSpacing: -0.02 * sz }).width;
  const space = sz * 0.27;
  const phrase = l.words.reduce((a, [w], i) => a + adv(w) + (i ? space : 0), 0);
  const idxSize = inline ? sz * 0.62 : 18;
  const idxW = measureText({ text: l.n, fontFamily: SANS, fontSize: idxSize, fontWeight: '500' }).width;
  const head = ramp(f, first, first + 8, outQ);
  // inline (05): ● 05 export.   stacked: ● 01 over the phrase
  const lead = inline ? 14 + idxW + 12 : 0;
  const total = Math.max(phrase + lead, 14 + idxW);
  const x0 = l.align === 'right' ? x - total : x;
  const py = inline ? y : y + 30;
  let cx = x0 + lead;
  return (
    <Layer id={id} opacity={gone}>
      <Layer id={`${id}-h`} opacity={head} x={(1 - head) * -10 * (l.align === 'right' ? -1 : 1)}>
        <Ellipse id={`${id}-dot`} x={x0} y={(inline ? py + sz * 0.42 : y + 6) - 4} width={8} height={8} fill={RED} />
        <Text id={`${id}-n`} x={x0 + 14} y={inline ? py + sz * 0.2 : y - 2} font={SANS} size={idxSize} weight={500} color={CREAM} opacity={0.55} {...ls(0.5)}>{l.n}</Text>
      </Layer>
      {l.words.map(([w, at], i) => {
        const lt = f - (at - 1);
        const p = ramp(lt, 0, 9, outQ);
        const node = lt >= 0 ? (
          <Layer key={i} id={`${id}-w${i}`} x={cx} y={py + (1 - p) * sz * 0.35} opacity={ramp(lt, 0, 5)}>
            <Text id={`${id}-w${i}-t`} font={SANS} size={sz} weight={500} color={CREAM} {...ls(-0.02 * sz)}>{w}</Text>
          </Layer>
        ) : null;
        cx += adv(w) + space;
        return node;
      })}
    </Layer>
  );
};


// ---------------------------------------------------------------------------------------------------------------------
// The pointer: a macOS arrow, on an arced path, pressed while it holds something (no smoothing, so it stays on the knob)

const ARROW = 'M0 0 L0 22 L5.6 16.8 L9.6 26 L13.2 24.4 L9.4 15.6 L16.6 15.6 Z';
interface Ptr { x: number; y: number; down: boolean; o: number }
const Arrow: React.FC<{ id: string; f: number } & Ptr> = ({ id, x, y, down, o }) => (
  <Layer id={id} x={x} y={y} scale={down ? 0.86 : 0.95} opacity={o}>
    <Layer id={`${id}-sh`} x={1.2} y={2.2} opacity={0.4} effects={[blur(1.6)]}>
      <Path id={`${id}-shp`} d={ARROW} fill="#000" />
    </Layer>
    <Path id={`${id}-p`} d={ARROW} fill="#111" stroke={{ color: '#fff', width: 1.5 }} />
  </Layer>
);
/** travel from a to b with an ease and a slight arc (perpendicular lift) */
const travel = (f: number, f0: number, f1: number, a: [number, number], b: [number, number], arc = 0.12) => {
  const p = ramp(f, f0, f1, inOut);
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const lift = Math.sin(Math.PI * p) * arc;
  return { x: a[0] + dx * p - dy * lift, y: a[1] + dy * p + dx * lift };
};
const markCursor = (f: number): Ptr => {
  const o = ramp(f, 44, 48) * (1 - ramp(f, BOX_REC + 3, BOX_REC + 9));
  if (f < BOX_AT[0]) return { ...travel(f, 44, PIN_AT, [1130, 560], [BOX.x0, BOX.y0]), down: f >= PIN_AT, o };
  const p = ramp(f, BOX_AT[0], BOX_AT[1], outC);
  const q = ramp(f, BOX_AT[1] + 1, BOX_REC + 9, outC);
  return { x: lerp(BOX.x0, BOX.x1, p) + 26 * q, y: lerp(BOX.y0, BOX.y1, p) + 34 * q, down: f <= BOX_AT[1], o };
};
const tuneCursor = (f: number): Ptr => {
  const o = ramp(f, 110, 114) * (1 - ramp(f, 141, 147));
  const kx = (g: number) => SLIDER.x0 + (SLIDER.x1 - SLIDER.x0) * (sliderV(g) / 4);
  if (f < DRAG.from) return { ...travel(f, 110, DRAG.from - 1, [1720, 560], [SLIDER.x0, SLIDER.y]), down: f >= DRAG.from - 1, o };
  const q = ramp(f, DRAG.to + 4, 147, outC);
  return { x: kx(f) + 30 * q, y: SLIDER.y + 60 * q, down: f <= DRAG.to + 3, o };
};

// ---------------------------------------------------------------------------------------------------------------------
// One panel: the cut-out recording, its overlays, the staging dim, an edge lit from above and a soft shadow

const PanelBody: React.FC<{ p: Panel; f: number; rect: [number, number, number, number]; radius: number }> = ({ p, f, rect, radius }) => {
  const [x, y, w, h] = rect;
  const k = p.key;
  const id = `pn-${k}`;
  let body: React.ReactNode = null;
  if (k === 'top') {
    body = (
      <>
        <Cut id={`${id}-v`} file="01-overview.mp4" rect={rect} radius={radius} trim={180} />
        <Rect id={`${id}-ver`} x={1630} y={18} width={110} height={26} fill="#0a0a0a" />
        <ExportPress f={f} />
      </>
    );
  } else if (k === 'agent') {
    body = (
      <>
        <Cut id={`${id}-v`} file="01-overview.mp4" rect={rect} radius={radius} trim={180} />
        <AgentChat f={f} />
      </>
    );
  } else if (k === 'prev') {
    const fx = f >= DRAG.from - 2 ? [shader({ code: RECOLOUR, uniforms: recolour(f) })] : undefined;
    body = (
      <>
        {f < BOX_REC ? <Cut id={`${id}-va`} file="06-markup.mp4" rect={rect} radius={radius} trim={7.2 * FPS} rate={0.4} effects={fx} /> : null}
        {f >= BOX_REC ? <Cut id={`${id}-vb`} file="06-markup.mp4" rect={rect} radius={radius} trim={305 - BOX_REC} effects={fx} /> : null}
        <Markup f={f} />
        {f >= 44 && f < BOX_REC + 10 ? <Arrow id={`${id}-cur`} f={f} {...markCursor(f)} /> : null}
      </>
    );
  } else if (k === 'tl') {
    const o = tlOpen(f);
    body = (
      <>
        {o < 1 ? <Cut id={`${id}-va`} file="06-markup.mp4" rect={rect} radius={radius} trim={7.2 * FPS} rate={0.4} opacity={1 - ramp(o, 0, 0.45)} /> : null}
        {o > 0 ? (
          <Layer id={`${id}-x`} opacity={ramp(o, 0, 0.45)}>
            <Cut id={`${id}-vb`} file="07-timeline.mp4" rect={rect} radius={radius} trim={7.5 * FPS} rate={0.3} />
            <Layer id={`${id}-scl`} clip={{ kind: 'polygon', points: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]] }}>
              <Scrub f={f} />
            </Layer>
          </Layer>
        ) : null}
      </>
    );
  } else if (k === 'insp') {
    body = (
      <>
        <Cut id={`${id}-v`} file="08-props.mp4" rect={rect} radius={radius} trim={7.1 * FPS} rate={0.4} />
        <Slider f={f} />
        {f >= 110 && f < 148 ? <Arrow id={`${id}-cur`} f={f} {...tuneCursor(f)} /> : null}
      </>
    );
  }
  const dim = dimOf(f, k);
  return (
    <Layer id={`${id}-body`}>
      {body}
      {dim > 0.005 ? <Rect id={`${id}-dim`} x={x} y={y} width={w} height={h} radius={radius} fill="#050606" opacity={dim} /> : null}
      <Rect id={`${id}-edge`} x={x + 0.5} y={y + 0.5} width={w - 1} height={h - 1} radius={radius} fill="rgba(0,0,0,0)" stroke={{ color: 'rgba(255,255,255,0.075)', width: 1 }} />
    </Layer>
  );
};

// ---------------------------------------------------------------------------------------------------------------------

export const Teardown: React.FC = () => {
  const f = useCurrentFrame();
  const cam = camAt(f);
  const chassis = 1 - ramp(f, 8, 26) * (1 - ramp(f, 152, BACK[1]));
  const items: (Item & { p?: Panel; rect: [number, number, number, number] })[] = PANELS.map((p) => {
    const a = apart(f, p);
    const rect = p.key === 'tl' ? tlRect(f) : p.rect;
    const [x, y, w, h] = rect;
    const orient: M3 = mul(rotY(p.ry * a.turn), rotX(p.rx * a.turn));
    return { key: p.key, p, rect, pos: [x + w / 2 - W / 2 + p.off[0] * a.xy, y + h / 2 - H / 2 + p.off[1] * a.xy, p.off[2] * a.z], orient, photo: 0, w, h };
  });
  const placed = project(items, cam);
  const base = project([{ key: 'chassis', pos: [0, 0, -20 * (1 - chassis)], photo: 0, w: W, h: H }], cam)[0]!;
  const ink = ramp(f, 155, 161, (t) => t * t);
  // motion blur only while the camera travels fast
  const c1 = camAt(f - 1);
  const speed = Math.abs(Math.log(c1.dist / cam.dist)) * 900 + Math.hypot(c1.target[0] - cam.target[0], c1.target[1] - cam.target[1]) * (FOCAL / cam.dist) / 1 + Math.abs(c1.yaw - cam.yaw) * 30;
  const blurOn = speed > 16 || f > 154;
  return (
    <Layer id="td">
      <Wallpaper id="td-wall" />
      <Camera perspective={FOCAL} />
      <Layer id="td-scene" motionBlur={blurOn ? { samples: 16, shutter: 0.25 } : undefined}>
        {chassis > 0.01 ? (
          <Layer id="td-chassis" x={base.sx} y={base.sy} anchorX={W / 2} anchorY={H / 2} scale={base.s} rotateX={base.rx} rotateY={base.ry} rotation={base.rz} opacity={chassis}
            effects={[dropShadow({ y: 30, blur: 40, color: '#00000099' })]}>
            <Rect id="td-chassis-r" width={W} height={H} radius={18} fill="#060908" />
          </Layer>
        ) : null}
        {placed.map((pl) => {
          const it = pl.item as (typeof items)[number];
          const p = it.p!;
          const a = apart(f, p);
          const [x, y, w, h] = it.rect;
          const radius = p.key === 'top' ? lerp(18, 12, a.xy) : 12;
          const lift = a.z;
          const l = LABELS[p.key];
          const lx = l.at[0], ly = p.key === 'tl' ? h + 38 : l.at[1];
          return (
            <Layer key={p.key} id={`pl-${p.key}`} x={pl.sx} y={pl.sy} anchorX={w / 2} anchorY={h / 2} scale={pl.s} rotateX={pl.rx} rotateY={pl.ry} rotation={pl.rz}>
              <Layer id={`pl-${p.key}-card`} effects={[dropShadow({ y: 6 + 26 * lift, blur: 10 + 22 * lift, color: '#000000b3' })]}>
                <Layer id={`pl-${p.key}-win`} x={-x} y={-y}>
                  <PanelBody p={p} f={f} rect={it.rect} radius={radius} />
                </Layer>
              </Layer>
              <SpecLabel id={`lb-${p.key}`} f={f} l={l} x={lx} y={ly} />
            </Layer>
          );
        })}
      </Layer>
      {ink > 0 ? <Rect id="td-ink" width={W} height={H} fill={INK} opacity={ink} /> : null}
    </Layer>
  );
};

registerRoot(() => <Composition id="Teardown" component={Teardown} durationInFrames={TEARDOWN_FRAMES} fps={FPS} width={W} height={H} />);
