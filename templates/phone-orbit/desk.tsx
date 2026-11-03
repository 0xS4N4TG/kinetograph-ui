// The post's pictures, drawn in code.
//
// 1. A desk seen from above: wood, a cutting mat, a keyboard, a sticky note and a phone, all fixed in one "world", and
//    one camera (zoom, turn, centre) that swings from the keyboard to the phone and settles. The reference's photo is a
//    video shot that way; the camera path here was fitted to where its objects sit from frame to frame.
// 2. A hand that reaches in, presses the phone's camera, grips the phone and drags it away.
// 3. A second state: a phone in a hand showing a clock dial.
//
// World and screen units are phone-screen pixels (the screen is 368 x 780) with the origin at the screen's centre,
// x right and y down; the settled camera is the identity, so the world is what the final frame shows.

import React from 'react';
import { Ellipse, Layer, Path, Rect, Text, blur, dropShadow, linearGradient, radialGradient } from '@kinetographdev/core';
import { glide, ramp, stroke } from './lib.js';

type Keys = [number, number][];
const k = (f: number, keys: Keys) => glide(f, keys);

// ---- the camera over the desk ----

export interface DeskCam {
  /** zoom, turn in degrees (clockwise), and the world point at the screen's centre */
  z: number;
  rot: number;
  cx: number;
  cy: number;
}

const CAM = {
  // before the hard cut the footage is a separate stretch: tracked on the sticky notes and the mat's far edge
  z: [[0, 0.76], [37.49, 0.76], [37.5, 0.76], [43, 0.76], [48, 0.77], [53, 0.79], [58, 0.85], [63, 0.88], [68, 0.92], [73, 0.95], [78, 0.975], [83, 0.99], [90, 1], [100, 1]] as Keys,
  rot: [[0, -32], [8, -30], [15, -26], [25, -17], [35, -18.4], [37.49, -18.4], [37.5, -18.4], [43, -19.4], [48, -15.3], [53, -13.1], [58, -8.1], [63, -4.8], [68, -4], [73, -2.8], [78, -1.5], [83, -0.8], [90, 0], [100, 0]] as Keys,
  cx: [[0, 580], [8, 598], [15, 535], [25, 424], [35, 393], [37.49, 393], [37.5, 393], [43, 357], [48, 297], [53, 247], [58, 176], [63, 122], [68, 80], [73, 45], [78, 22], [83, 8], [90, 0], [100, 0]] as Keys,
  cy: [[0, 230], [8, 249], [15, 202], [25, 169], [35, 105], [37.49, 105], [37.5, 105], [43, 87], [48, 47], [53, 34], [58, 20], [63, 10], [68, 6], [73, 1], [78, 0], [100, 0]] as Keys,
};

export const deskCam = (f: number): DeskCam => ({ z: k(f, CAM.z), rot: k(f, CAM.rot), cx: k(f, CAM.cx), cy: k(f, CAM.cy) });

// ---- small helpers ----

/** thin parallel lines across a box */
const Lines: React.FC<{ w: number; h: number; gap: number; thick: number; color: string; vertical?: boolean }> = ({ w, h, gap, thick, color, vertical }) => {
  const n = Math.floor((vertical ? w : h) / gap);
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <Rect key={i} x={vertical ? i * gap : 0} y={vertical ? 0 : i * gap} width={vertical ? thick : w} height={vertical ? h : thick} fill={color} />
      ))}
    </>
  );
};

const Keyboard: React.FC = () => {
  const cols = 16;
  const rows = 5;
  return (
    <Layer effects={[dropShadow({ x: 6, y: 12, blur: 10, color: '#000000a8' })]}>
      <Rect width={470} height={215} radius={10} fill={linearGradient(['#f3da72', '#d6b844'], { angle: 160 })} />
      <Rect x={5} y={5} width={460} height={205} radius={7} fill="#4a3c16" />
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          if (r === rows - 1 && c > 0 && c < 13) return c === 1 ? <Rect key="sp" x={12 + c * 28} y={14 + r * 38} width={10 * 28 - 4} height={33} radius={4} fill="#26211b" /> : null;
          return <Rect key={`${r}-${c}`} x={12 + c * 28} y={14 + r * 38} width={24} height={33} radius={4} fill={r === 0 ? '#27221b' : '#38322a'} stroke={stroke('#5a4e2c', 1)} />;
        }),
      )}
      <Path d="M235 0C240 -22 246 -34 250 -52" stroke={stroke('#e4dcc0', 4, { cap: 'round' })} />
    </Layer>
  );
};

const Sticky: React.FC<{ color: string }> = ({ color }) => (
  <Layer effects={[dropShadow({ x: 3, y: 6, blur: 6, color: '#000000a0' })]}>
    <Rect width={115} height={120} fill={linearGradient([color, '#d9a91c'], { angle: 170 })} />
    <Rect width={115} height={18} fill="#ffffff26" />
    {[46, 62, 78, 94].map((y, i) => (
      <Rect key={y} x={14} y={y} width={i % 2 ? 60 : 80} height={2.6} fill="#5a4410" opacity={0.4} />
    ))}
  </Layer>
);

/** the phone lying on the desk, centred on (0, 0): a cream case with a camera plate */
export const DeskPhone: React.FC = () => (
  <Layer x={-62} y={-126} effects={[dropShadow({ x: 14, y: 20, blur: 12, color: '#000000a8' })]}>
    <Rect width={124} height={252} radius={26} fill={linearGradient(['#b8a468', '#9a8858'], { angle: 100 })} stroke={stroke('#d2c79e', 2)} />
    <Rect x={5} y={6} width={112} height={72} radius={17} fill="#cfc297" stroke={stroke('#bdb38e', 3)} />
    <Ellipse x={10} y={12} width={20} height={20} fill="#3a3027" />
    <Ellipse x={44} y={26} width={24} height={24} fill="#241d18" />
    <Ellipse x={15} y={42} width={24} height={24} fill="#241d18" />
    <Ellipse x={90} y={18} width={9} height={9} fill="#f6f1e0" stroke={stroke('#bdb7a2', 1.5)} />
    <Ellipse x={92} y={52} width={8} height={8} fill="#3a3027" />
  </Layer>
);

// ---- the desk world ----

export const World: React.FC<{ frame: number; noteColor: string }> = ({ frame, noteColor }) => (
  <Layer>
    {/* wood: black under the shelf, brown in its shadow, warm and bright where the lamp reaches, dark again at the front */}
    <Rect x={-1000} y={-900} width={2400} height={2000} fill={linearGradient([[0, '#1a0d06'], [0.325, '#2c170c'], [0.36, '#5e3010'], [0.395, '#8a5018'], [0.44, '#945a1c'], [0.48, '#9b5f1f'], [0.52, '#6a3a10'], [0.575, '#35140a'], [0.65, '#1c0b04'], [0.72, '#0f0703'], [1, '#050302']], { angle: 180 })} />
    <Ellipse x={-560} y={-300} width={900} height={760} fill={radialGradient(['#c9741f90', '#c9741f00'], { cx: 0.5, cy: 0.5, r: 0.5 })} />
    {/* the lamp's light falls off to the right */}
    <Rect x={150} y={-900} width={250} height={1700} fill={linearGradient(['#00000000', '#000000dc'], { angle: 90 })} />
    <Rect x={400} y={-900} width={1000} height={1700} fill="#000000dc" />
    <Layer rotation={9}>
      <Layer x={-1000} y={-900}>
        <Lines w={2400} h={2000} gap={11} thick={2} color="#2a120618" />
      </Layer>
    </Layer>
    {/* the shelf at the back of the desk, a lamp and a lit panel on it */}
    <Ellipse x={125} y={-215} width={170} height={90} opacity={0.6} fill={radialGradient(['#e8b04ad0', '#a8701e70', '#a8701e00'], { cx: 0.5, cy: 0.5, r: 0.5 })} />
    <Layer x={250} y={-420} effects={[blur(4)]}>
      <Rect width={140} height={150} radius={10} fill="#f0b83a" />
    </Layer>
    {/* the cutting mat: its top corner, and edges that lean 18 degrees */}
    <Layer x={165} y={-62} rotation={18}>
      <Rect width={1600} height={470} fill={linearGradient(['#14472a', '#0d321b', '#09230f'], { angle: 165 })} />
      <Rect width={1600} height={470} fill={radialGradient(['#2a7a4538', '#2a7a4500'], { cx: 0.25, cy: 0.1, r: 0.5 })} />
      <Lines w={1600} h={505} gap={9} thick={1.5} color="#9be3a90e" />
      <Lines w={1600} h={505} gap={44} thick={2} color="#bdf0c012" />
      <Lines w={1600} h={505} gap={44} thick={2} color="#bdf0c012" vertical />
      <Rect width={1600} height={5} fill="#5aa86a" opacity={0.5} />
      <Rect width={5} height={470} fill="#6ab87a" opacity={0.55} />
      <Rect y={464} width={1600} height={6} fill="#070402" opacity={0.7} />
    </Layer>
    {/* the other note, tall and tilted, by the mat's far corner */}
    <Layer x={524} y={377} rotation={10}>
      <Layer x={-40} y={-60}>
        <Rect width={80} height={120} fill={linearGradient(['#e8b02a', '#c98f16'], { angle: 170 })} />
      </Layer>
    </Layer>
    <Layer x={415} y={186} rotation={28}>
      <Layer x={-235} y={-107}>
        <Keyboard />
      </Layer>
    </Layer>
    <Layer x={143} y={336} rotation={-8}>
      <Layer x={-57} y={-60}>
        <Sticky color={noteColor} />
      </Layer>
    </Layer>
    {/* a cable coiled at the left edge */}
    <Path d="M-215 150C-140 150 -128 250 -215 315" stroke={stroke('#0a0705', 30, { cap: 'round' })} opacity={ramp(frame, 55, 85, 0, 1)} />
    <Path d="M-215 205C-170 210 -158 262 -215 292" stroke={stroke('#1d120b', 12, { cap: 'round' })} opacity={ramp(frame, 55, 85, 0, 1)} />
  </Layer>
);

// ---- the hand ----

const SKIN = linearGradient(['#f0a45a', '#dc8a42', '#b86a2a'], { angle: 150 });
const SKIN_SHADE = '#7a3f12';

/** one finger: two segments bent at the middle joint, tapering, lit from the top; `x`, `y` is the knuckle in the hand's frame */
const Finger: React.FC<{ x: number; y: number; angle: number; l1: number; l2: number; w: number; bend: number }> = ({ x, y, angle, l1, l2, w, bend }) => (
  <Layer x={x} y={y} rotation={angle}>
    <Rect x={-w / 2} y={-l1} width={w} height={l1 + w * 0.4} radius={w / 2} fill={SKIN} />
    <Layer y={-l1 + w * 0.2} rotation={bend}>
      <Rect x={-w * 0.46} y={-l2} width={w * 0.92} height={l2 + w * 0.4} radius={(w * 0.92) / 2} fill={SKIN} />
      <Ellipse x={-w * 0.3} y={-l2 + w * 0.12} width={w * 0.6} height={w * 0.5} fill="#f8c88f" opacity={0.5} />
      <Rect x={-w * 0.46} y={w * 0.0} width={w * 0.92} height={2} fill={SKIN_SHADE} opacity={0.3} />
    </Layer>
  </Layer>
);

/** The reference's hand: a right hand seen from above, lying on the desk with its fingers up and to the left, the index
 *  finger out, a thumb on the right, a cream knitted cuff and a band on the forearm. It is anchored at the index
 *  fingertip. `grip` (0 to 1) closes the other fingers and the thumb round a phone. `blurPx` softens it in fast moves. */
export const Hand: React.FC<{ x: number; y: number; angle: number; grip: number; blurPx?: number }> = ({ x, y, angle, grip, blurPx = 0 }) => (
  <Layer x={x} y={y} rotation={angle} effects={[dropShadow({ x: 16, y: 22, blur: 14, color: '#000000a0' }), blur(2.2 + blurPx)]}>
    <Layer x={-62} y={290} scale={1.1}>
      {/* forearm and cuff, reaching off the screen */}
      <Path d="M-52 20L52 20L66 180L-66 180Z" fill={SKIN} />
      <Layer y={105}>
        <Rect x={-86} y={0} width={172} height={700} radius={16} fill={linearGradient(['#f3e5b6', '#d9c58a'], { angle: 90 })} />
        {Array.from({ length: 17 }, (_, i) => (
          <Rect key={i} x={-82 + i * 10.2} y={10} width={3.5} height={690} fill="#8a6a30" opacity={0.2} />
        ))}
        <Rect x={-86} y={0} width={172} height={18} radius={9} fill="#e7d49c" />
        <Rect x={-82} y={150} width={164} height={30} radius={12} fill="#f7f2e4" />
      </Layer>
      {/* back of the hand */}
      <Path d="M-48 28C-78 -20 -92 -100 -84 -150L74 -150C86 -100 70 -20 48 28Z" fill={SKIN} />
      <Path d="M-30 -20C-10 -50 20 -50 40 -20" stroke={stroke('#c47a38', 3)} opacity={0.4} />
      {/* thumb on the right */}
      <Layer x={66} y={-62} rotation={39 - grip * 22}>
        <Rect x={-21} y={-80} width={42} height={104} radius={21} fill={SKIN} />
        <Ellipse x={-12} y={-76} width={24} height={20} fill="#f8c88f" opacity={0.5} />
      </Layer>
      {/* fingers */}
      <Finger x={-46} y={-138} angle={-20 - grip * 38} l1={42} l2={34} w={28} bend={-12 - grip * 40} />
      <Finger x={-20} y={-148} angle={-14 - grip * 36} l1={50} l2={40} w={32} bend={-12 - grip * 38} />
      <Finger x={6} y={-152} angle={-8 - grip * 30} l1={56} l2={44} w={34} bend={-12 - grip * 36} />
      <Finger x={42} y={-150} angle={8 - grip * 10} l1={64} l2={54} w={34} bend={-2 - grip * 20} />
    </Layer>
  </Layer>
);

// ---- the second state ----

export interface AfterText {
  title: string;
  labelA: string;
  timeA: string;
  dayA: string;
  labelB: string;
  timeB: string;
  dayB: string;
  total: string;
  note: string;
  footer: string;
  font: string;
  statusTime: string;
}

const Dial: React.FC<{ font: string }> = ({ font }) => {
  const nums = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
  const R = 63;
  return (
    <Layer x={182} y={558}>
      <Ellipse x={-104} y={-104} width={208} height={208} fill="#0d121b" />
      <Ellipse x={-72} y={-72} width={144} height={144} fill="#1b2332" stroke={stroke('#273044', 2)} />
      <Ellipse x={-56} y={-56} width={112} height={112} fill="#151c29" />
      {/* the yellow band between bedtime and wake-up */}
      <Path d={arcPath(0, 0, 88, 217, 281)} stroke={stroke('#f2b12a', 24, { cap: 'round' })} />
      <Path d={arcPath(0, 0, 88, 217, 281)} stroke={stroke('#c9891a', 2, { cap: 'round' })} opacity={0.0} />
      <Layer x={-70} y={-52}>
        <Rect x={-7} y={-3} width={14} height={7} radius={2} fill="#7a4e0a" />
        <Rect x={-7} y={-8} width={4} height={6} fill="#7a4e0a" />
      </Layer>
      <Layer x={17} y={-89}>
        <Ellipse x={-6} y={-6} width={12} height={12} stroke={stroke('#7a4e0a', 2)} />
        <Path d="M0 -3V0L3 2" stroke={stroke('#7a4e0a', 1.6, { cap: 'round' })} />
      </Layer>
      {nums.map((n, i) => {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        return (
          <Text key={n} font={font} size={n === 12 ? 11 : 9.5} weight={600} color={n === 0 || n === 12 ? '#f3f4f8' : '#9aa5ba'} x={Math.cos(a) * R - 6} y={Math.sin(a) * R - 5} maxWidth={12} align="center" lineHeight={1}>
            {String(n)}
          </Text>
        );
      })}
      <Path d="M-4 -44A7 7 0 1 0 4 -40A5.4 5.4 0 0 1 -4 -44Z" fill="#4aa0ff" />
      <Ellipse x={-5} y={36} width={10} height={10} fill="#f2c040" />
      <Path d="M0 28V32M0 50V54M-9 41H-13M13 41H9M-6 35L-9 32M6 35L9 32M-6 47L-9 50M6 47L9 50" stroke={stroke('#f2c040', 1.6, { cap: 'round' })} />
      {/* ticks */}
      {Array.from({ length: 48 }, (_, i) => {
        const a = (i / 48) * Math.PI * 2;
        return <Path key={i} d={`M${Math.cos(a) * 52} ${Math.sin(a) * 52}L${Math.cos(a) * 55} ${Math.sin(a) * 55}`} stroke={stroke('#394459', 1)} />;
      })}
    </Layer>
  );
};

/** SVG arc path of radius r about (cx, cy) from angle a0 to a1 (degrees, clockwise from 3 o'clock) */
const arcPath = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const p = (a: number) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

/** The second state. (0, 0) is the top-left of the 368 x 780 screen; `t` is frames since the swap. */
export const After: React.FC<{ text: AfterText; t: number }> = ({ text: s, t }) => {
  const f = s.font;
  const thumbX = k(t, [[0, 207], [8, 190], [14, 160], [20, 150], [30, 148]]);
  const thumbY = k(t, [[0, 350], [8, 385], [14, 425], [20, 440], [30, 446]]);
  return (
    <Layer>
      {/* a dim room: warm shelves, a bright window at the top right */}
      <Rect width={368} height={780} fill={linearGradient(['#1d140d', '#0e0a07', '#150f0a'], { angle: 180 })} />
      <Rect x={0} y={170} width={150} height={40} fill="#c28a3a" opacity={0.5} />
      <Layer effects={[blur(5)]}>
        <Rect x={236} y={0} width={140} height={76} fill="#c9d6dc" opacity={0.85} />
        <Rect x={236} y={34} width={140} height={6} fill="#171310" />
        <Rect x={296} y={0} width={8} height={76} fill="#171310" />
        <Rect x={206} y={76} width={170} height={190} fill="#2b2118" />
      </Layer>
      <Layer effects={[blur(6)]}>
        <Rect x={0} y={96} width={140} height={90} fill="#8a5a22" opacity={0.55} />
      </Layer>
      {/* the phone in its gold case, a little turned */}
      <Layer x={182} y={540} rotation={-2.5}>
        <Layer x={-160} y={-244} effects={[dropShadow({ x: 0, y: 18, blur: 22, color: '#000000b0' })]}>
          <Rect width={320} height={760} radius={56} fill={linearGradient(['#f0b52a', '#c98c12'], { angle: 90 })} />
          <Rect x={11} y={11} width={298} height={738} radius={46} fill="#161d2b" />
          <Text font={f} size={11} weight={600} color="#c9d0dc" x={36} y={30} lineHeight={1}>{s.statusTime}</Text>
          <Rect x={208} y={26} width={21} height={10} radius={3} fill="#e8ebf2" />
          <Ellipse x={32} y={52} width={28} height={28} fill="#2a3242" />
          <Path d="M41 61L51 71M51 61L41 71" stroke={stroke('#e6e9f0', 2, { cap: 'round' })} />
          <Text font={f} size={12} weight={600} color="#e8ebf2" x={0} y={60} maxWidth={342} align="center" lineHeight={1}>{s.title}</Text>
          <Ellipse x={254} y={46} width={30} height={30} fill="#f0b030" />
          <Path d="M263 61L268 66L276 56" stroke={stroke('#7a4e00', 2.4, { cap: 'round', join: 'round' })} />
          {/* the card */}
          <Rect x={14} y={104} width={314} height={338} radius={26} fill="#222a39" />
          <Text font={f} size={7.5} weight={600} color="#8b95a8" x={68} y={113} lineHeight={1}>{s.labelA}</Text>
          <Text font={f} size={17} weight={600} color="#f3f4f8" x={76} y={125} lineHeight={1}>{s.timeA}</Text>
          <Text font={f} size={8} weight={500} color="#8b95a8" x={84} y={147} lineHeight={1}>{s.dayA}</Text>
          <Text font={f} size={7.5} weight={600} color="#8b95a8" x={186} y={113} lineHeight={1}>{s.labelB}</Text>
          <Text font={f} size={17} weight={600} color="#f3f4f8" x={190} y={125} lineHeight={1}>{s.timeB}</Text>
          <Text font={f} size={8} weight={500} color="#8b95a8" x={196} y={147} lineHeight={1}>{s.dayB}</Text>
          <Layer x={-14} y={-300}>
            <Dial font={f} />
          </Layer>
          <Text font={f} size={16} weight={600} color="#f6f7fa" x={0} y={384} maxWidth={342} align="center" lineHeight={1}>{s.total}</Text>
          <Ellipse x={67} y={417} width={6} height={6} fill="#f2a52a" />
          <Text font={f} size={7.5} weight={500} color="#98a2b4" x={80} y={409} maxWidth={190} lineHeight={1.4}>{s.note}</Text>
          <Text font={f} size={10} weight={600} color="#f2a52a" x={0} y={448} maxWidth={342} align="center" lineHeight={1}>{s.footer}</Text>
        </Layer>
      </Layer>
      {/* a thumb on the dial, a watch strap, the back of the hand */}
      <Layer x={thumbX} y={thumbY} rotation={23} effects={[dropShadow({ x: 6, y: 12, blur: 10, color: '#000000a0' }), blur(2.4)]}>
        <Rect x={0} y={-28} width={250} height={56} radius={28} fill={SKIN} />
        <Ellipse x={-2} y={-22} width={30} height={30} fill="#f8c88f" opacity={0.55} />
        <Rect x={120} y={-60} width={230} height={260} radius={70} fill={SKIN} />
        <Rect x={238} y={-70} width={34} height={300} fill="#17110d" />
        <Rect x={248} y={-70} width={6} height={300} fill="#d8a53a" />
      </Layer>
    </Layer>
  );
};
