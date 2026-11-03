// BoilStroke: a drawn line in one ink that draws on and boils.
//
// AE recipe -> here:
//   Trim Paths draw-on      SVG path with pathLength 1, dash offset 1 -> 0 over `dur` frames (ease out)
//   Roughen Edges           a static fine displace (`rough`, 1-2 px: the ragged lip of the ink)
//   Turbulent Displace      displace re-seeded every 2 frames (fine, ~16 px wavelength) plus a bigger one every 6
//   (time*4 seed)           frames (~90 px wavelength): the Vox original's two rates. `boil` sets the amplitude:
//                           1 gives about 1 px mean, 3-4 px p90 (the Vox original); 3 is the tutorial's exaggeration
// Printed through an ink pass, so the line has riso grain and sits off register like everything else.
//
// Path helpers return SVG path data in page px: a hand-drawn loop that overshoots its start, an arrow with a bend,
// a registration (kento) corner.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { InkPass } from './ink.js';
import { type InkName } from './tokens.js';

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

export interface BoilStrokeProps {
  id: string;
  /** one or more SVG path data strings in page px; drawn one after another */
  d: string | string[];
  ink?: InkName | string;
  /** stroke width in page px */
  width?: number;
  at: number;
  /** frames to draw all paths */
  dur?: number;
  boil?: number;
  rough?: number;
  /** a frame from which it fades out on twos */
  out?: number;
  offset?: [number, number];
  /** a solid fill path drawn with the stroke (an arrow head), appears when the stroke is done */
  fill?: string;
}

export const BoilStroke: React.FC<BoilStrokeProps> = ({ id, d, ink = 'pink', width = 14, at, dur = 14, boil = 1.4, rough = 1.2, out, offset, fill }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const a = f - at;
  if (a < 0) return null;
  const gone = out === undefined ? 0 : clamp01((f - out) / 6);
  const paths = Array.isArray(d) ? d : [d];
  const t = 1 - (1 - clamp01((a + 1) / dur)) ** 2;
  const per = 1 / paths.length;
  return (
    <InkPass id={id} ink={ink} boil={boil} rough={rough} fade={1 - gone} grain={0.85} strength={0.4} offset={offset} speckle={0.2}>
      {/* three frames wide and tall, so strokes off the page's edge (under a camera) are not cut */}
      <svg width={3 * W} height={3 * H} viewBox={`${-W} ${-H} ${3 * W} ${3 * H}`} style={{ position: 'absolute', left: -W, top: -H }}>
        {paths.map((p, i) => {
          const k = clamp01((t - i * per) / per);
          if (k <= 0) return null;
          return <path key={i} d={p} fill="none" stroke="#000" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 2" strokeDashoffset={1 - k} />;
        })}
        {fill && t >= 1 && <path d={fill} fill="#000" />}
      </svg>
    </InkPass>
  );
};

/** A hand-drawn loop around (cx, cy): an ellipse that starts at `start` degrees and runs past it by `over` of a turn,
 *  slightly spiralling, as a pen does. */
export const loopPath = (cx: number, cy: number, rx: number, ry: number, start = -30, over = 0.12, tilt = -6) => {
  const n = 64, turn = 1 + over, tr = (tilt * Math.PI) / 180;
  let s = '';
  for (let i = 0; i <= n; i++) {
    const u = i / n, ang = ((start * Math.PI) / 180) + u * turn * Math.PI * 2;
    const grow = 1 + 0.06 * u;
    const x0 = Math.cos(ang) * rx * grow, y0 = Math.sin(ang) * ry * grow;
    const x = cx + x0 * Math.cos(tr) - y0 * Math.sin(tr), y = cy + x0 * Math.sin(tr) + y0 * Math.cos(tr);
    s += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return s;
};

/** An arrow from a to b, bowed by `bend` (fraction of its length): [shaft, head] for BoilStroke's `d`. */
export const arrowPaths = (a: [number, number], b: [number, number], bend = 0.2, head = 34): [string, string] => {
  const [ax, ay] = a, [bx, by] = b;
  const mx = (ax + bx) / 2, my = (ay + by) / 2, dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
  const cx = mx - (dy / L) * L * bend, cy = my + (dx / L) * L * bend;
  // the tangent at b
  const tx = bx - cx, ty = by - cy, tl = Math.hypot(tx, ty), ux = tx / tl, uy = ty / tl;
  const h1 = [bx - ux * head - uy * head * 0.6, by - uy * head + ux * head * 0.6], h2 = [bx - ux * head + uy * head * 0.6, by - uy * head - ux * head * 0.6];
  return [`M${ax} ${ay} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${bx} ${by}`, `M${h1[0]!.toFixed(1)} ${h1[1]!.toFixed(1)} L${bx} ${by} L${h2[0]!.toFixed(1)} ${h2[1]!.toFixed(1)}`];
};

/** A registration corner (kagi kento, an L) at (x, y) with arms of `len`, opening right and up. */
export const cornerPath = (x: number, y: number, len = 120) => `M${x} ${y - len} L${x} ${y} L${x + len} ${y}`;
