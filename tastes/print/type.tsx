// Riso type: heavy letters printed in two inks, the second slightly off register (DVd9Ls2gHWM: the finished poster's
// type is its own blue pass, #5046c9, with a 1-1.3 px fringe; here a light second ink sits 3 px off so the fringe
// reads at phone size). The key ink is dark (blue, green, federal); the second is light (pink, yellow) and sits
// behind, so the overprint makes a darker third colour along one edge and the words always read.
//
// Moves (one at a time):
//   register  the second pass arrives far off register and is pulled in over `dur` frames: the print "registers"
//   stamp     each line lands whole on its frame, 6 % large, settling in 4 frames; the second ink lands 2 frames later
//   type      typewriter: the letters of a mono line appear about one a frame
//
// Marker: a light-ink box wiped in behind dark type (never light type on light paper).
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { family } from '../explainer/type.js';
import { InkPass } from './ink.js';
import { FONTS, type InkName } from './tokens.js';

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const outCubic = (t: number) => 1 - (1 - clamp01(t)) ** 3;

export interface TypeLine {
  text: string;
  /** anchor: x, y (baseline-ish centre of the line) as fractions of W and H */
  x: number;
  y: number;
  /** font size as a fraction of W */
  size: number;
  face?: 'display' | 'mono';
  align?: 'left' | 'center' | 'right';
  /** letter spacing, em */
  tracking?: number;
  /** frames after the block's `at` that this line starts */
  delay?: number;
}

export interface RisoTypeProps {
  id: string;
  lines: TypeLine[];
  /** key ink (dark) and second ink (light, behind); second may be omitted for a single pass */
  ink?: InkName | string;
  second?: InkName | string | null;
  move?: 'register' | 'stamp' | 'type' | 'none';
  at: number;
  /** frames the move takes */
  dur?: number;
  /** rest misregistration of the second pass, px */
  reg?: [number, number];
  /** a frame from which the whole block prints away (fades on twos over 6 frames) */
  out?: number;
  /** boil on the letters' edges, px */
  boil?: number;
}

const fontOf = (face: 'display' | 'mono') => (face === 'mono' ? family(FONTS.mono, FONTS.monoWeight, false) : family(FONTS.display, FONTS.displayWeight, false));

/** The lines as black art in page px; `vis(i)` gives how much of line i shows: 0..1 (letters for `type`, scale for `stamp`). */
const Lines: React.FC<{ lines: TypeLine[]; move: RisoTypeProps['move']; t: (i: number) => number }> = ({ lines, move, t }) => {
  const { width: W, height: H } = useVideoConfig();
  return (
    <>
      {lines.map((l, i) => {
        const k = t(i);
        if (k <= 0) return null;
        const face = l.face ?? 'display';
        const px = l.size * W;
        const align = l.align ?? 'left';
        const text = move === 'type' ? l.text.slice(0, Math.ceil(l.text.length * k)) : l.text;
        const sc = move === 'stamp' ? 1.06 - 0.06 * outCubic(k * 1.0) : 1;
        const pos: React.CSSProperties = align === 'left' ? { left: l.x * W } : { left: (l.x - (align === 'center' ? 0.5 : 1)) * W, width: W, justifyContent: align === 'center' ? 'center' : 'flex-end' };
        return (
          <div key={i} style={{ position: 'absolute', ...pos, top: l.y * H - px * 0.62, display: 'flex', whiteSpace: 'pre', fontFamily: fontOf(face), fontWeight: face === 'mono' ? FONTS.monoWeight : FONTS.displayWeight,
            fontSize: px, lineHeight: 1.05, letterSpacing: `${l.tracking ?? (face === 'mono' ? 0 : -0.02)}em`, color: '#000', transform: sc !== 1 ? `scale(${sc.toFixed(4)})` : undefined,
            transformOrigin: align === 'left' ? '0% 60%' : align === 'center' ? '50% 60%' : '100% 60%' }}>{text}</div>
        );
      })}
    </>
  );
};

export const RisoType: React.FC<RisoTypeProps> = ({ id, lines, ink = 'blue', second = 'pink', move = 'register', at, dur, reg = [3, -2], out, boil = 0.7 }) => {
  const f = useCurrentFrame();
  const a = f - at;
  if (a < 0) return null;
  const d = dur ?? (move === 'type' ? 0 : move === 'stamp' ? 4 : 12);
  const gone = out === undefined ? 0 : clamp01((f - out) / 6);
  if (gone >= 1) return null;
  const startOf = (i: number) => lines[i]!.delay ?? 0;
  const t = (i: number, lag = 0) => {
    const b = a - startOf(i) - lag;
    if (b < 0) return 0;
    if (move === 'type') return clamp01((b + 1) / Math.max(1, lines[i]!.text.length * 0.9));
    if (move === 'stamp') return clamp01((b + 1) / d);
    return 1;
  };
  // register: the second pass is pulled in from far off
  const pull = move === 'register' ? 1 - outCubic((a - startOf(0)) / d) : 0;
  const off: [number, number] = [reg[0] + pull * 46, reg[1] - pull * 30];
  return (
    <>
      {second && (
        <InkPass id={`${id}-2`} ink={second} offset={off} boil={boil} fade={1 - gone} strength={0.45}>
          <Lines lines={lines} move={move} t={(i) => t(i, move === 'stamp' ? 2 : 0)} />
        </InkPass>
      )}
      <InkPass id={`${id}-1`} ink={ink} boil={boil} fade={1 - gone} strength={0.45}>
        <Lines lines={lines} move={move} t={(i) => t(i)} />
      </InkPass>
    </>
  );
};

/** A light-ink box behind a line of dark type, wiped in left to right over `dur` frames. Box in fractions of W, H. */
export const Marker: React.FC<{ id: string; ink?: InkName | string; x: number; y: number; w: number; h: number; at: number; dur?: number; tilt?: number; out?: number }> = ({ id, ink = 'yellow', x, y, w, h, at, dur = 6, tilt = -1.2, out }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const a = f - at;
  if (a < 0) return null;
  const gone = out === undefined ? 0 : clamp01((f - out) / 6);
  const k = outCubic((a + 1) / dur);
  return (
    <InkPass id={id} ink={ink} boil={1} rough={2.2} offset={[-3, 2]} fade={1 - gone} grain={0.8}>
      <div style={{ position: 'absolute', left: x * W, top: y * H, width: w * W * k, height: h * H, background: '#000', transform: `rotate(${tilt}deg)`, transformOrigin: '0 50%' }} />
    </InkPass>
  );
};
