// Photo stand-ins painted in code: layered gradients, soft light, blur and grain, composed like the cards in the clip
// this component follows (a sunset head, a hand in rays of light, a dusk ribbon, a coast at night, a haze figure, a
// hill, a smeared figure on orange). Every shape is written by hand from scratch; nothing is sampled from the
// reference. They exist so the component ships without anyone's photographs; pass `images` to use your own.

import React from 'react';
import { Ellipse, Image, Layer, Path, Rect, blur, glow, grain, linearGradient, radialGradient } from '@kinetographdev/core';
import { boxPath } from './lib.js';

export interface ArtProps {
  w: number;
  h: number;
}

type Pt = [number, number];

/** Fractions of the card -> a path scaled to w x h. */
const P = (w: number, h: number, d: string) => boxPath(w, h, d);

/** Closed or open smooth curve through points (Catmull-Rom as cubics), in card fractions. */
const smooth = (pts: Pt[], closed = true): string => {
  const n = pts.length;
  const at = (i: number) => (closed ? pts[(i + n) % n] : pts[Math.min(n - 1, Math.max(0, i))]);
  const f = (v: number) => v.toFixed(4);
  let d = `M ${f(pts[0][0])} ${f(pts[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    d += ` C ${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return closed ? d + ' Z' : d;
};

/** A polygon through points, in fractions. */
const poly = (pts: Pt[]) => 'M ' + pts.map(([x, y]) => `${x.toFixed(4)} ${y.toFixed(4)}`).join(' L ') + ' Z';

/** Adds small deterministic bumps along a polyline (curly hair, torn paper), in fractions. */
const jag = (pts: Pt[], per: number, amp: number, seed = 1): Pt[] => {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const s = Math.sin((i * per + k) * 2.9 + seed) * 0.5 + (k % 2 ? 0.5 : -0.5);
      out.push([x0 + dx * t + (-dy / len) * amp * s, y0 + dy * t + (dx / len) * amp * s]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
};

/** An ellipse placed by its centre, turning about it. */
const Ov: React.FC<React.ComponentProps<typeof Ellipse> & { x: number; y: number; width: number; height: number }> = ({ x, y, width, height, ...rest }) => (
  <Ellipse x={x - width / 2} y={y - height / 2} width={width} height={height} origin="center" {...rest} />
);

const clipPath = (d: string) => ({ kind: 'path' as const, d });

/** Cream card, a sunset-filled head in profile with a curly dark crown, a neck holding the sunset's reflection. */
export const SunsetHead: React.FC<ArtProps> = ({ w, h }) => {
  // authored in a 560 x 560 sketch box, mapped onto the card (the card is cropped by the frame's top edge)
  const m = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [(x / 4.17 - 1) / w, (y / 4.17 + 30) / h]);
  const U = (x: number) => (x / 4.17 - 1) / w;
  const V = (y: number) => (y / 4.17 + 30) / h;
  const top = jag(m([[205, 72], [240, 52], [270, 40], [300, 32], [330, 30], [360, 40], [395, 48], [425, 70], [455, 95], [482, 132]]), 3, 0.006, 2);
  const left = jag(m([[385, 400], [300, 402], [150, 398], [95, 375], [72, 335], [75, 300], [95, 255], [130, 215], [160, 170], [185, 115], [205, 72]]), 3, 0.005, 5);
  const face = poly([...top, ...m([[470, 200], [450, 250], [430, 300], [400, 340]]), ...left]);
  const hair = poly([
    ...jag(m([[470, 112], [500, 140], [522, 190], [528, 250], [512, 305], [472, 355], [432, 392], [386, 428]]), 3, 0.009, 7),
    ...m([[385, 400], [405, 340], [435, 300], [452, 250], [470, 200], [482, 132]]),
  ]);
  const neck = poly(m([[150, 398], [386, 400], [386, 428], [430, 470], [476, 505], [488, 560], [150, 560], [140, 500], [150, 450]]));
  return (
    <>
      <Rect width={w} height={h} fill={linearGradient(['#f1e9d6', '#ece3cf'], { angle: 180 })} />
      <Layer clip={clipPath(P(w, h, face))}>
        <Rect
          width={w}
          height={h}
          fill={linearGradient(
            [
              [V(30), '#b83d17'],
              [V(110), '#d9631d'],
              [V(170), '#f09a2a'],
              [V(215), '#fcc84c'],
              [V(280), '#f08a28'],
              [V(340), '#d9692a'],
              [V(400), '#a84a22'],
            ],
            { angle: 180 },
          )}
        />
        <Ov x={w * U(250)} y={h * V(170)} width={w * 0.7} height={h * 0.22} fill={radialGradient(['#fff0a0cc', '#ffd05a00'])} blendMode="screen" />
        <Layer effects={[blur(2.6)]}>
          {[
            [48, 0.16, 7, '#8f2c14', 0.1, 0.55], [66, 0.12, 5, '#ffd9a0', 0.2, 0.4], [92, 0.2, 9, '#a53a18', 0.05, 0.7], [112, 0.14, 6, '#ffcf80', 0.25, 0.35],
            [134, 0.18, 8, '#9a3216', 0.0, 0.75], [152, 0.1, 5, '#ffe0a0', 0.3, 0.3], [176, 0.2, 10, '#b84818', 0.08, 0.8], [200, 0.12, 6, '#fff0b8', 0.2, 0.3],
            [226, 0.2, 9, '#a8421a', 0.12, 0.8], [252, 0.14, 6, '#ffd488', 0.0, 0.4], [276, 0.2, 10, '#903016', 0.05, 0.8], [304, 0.14, 6, '#ffbe68', 0.15, 0.4],
            [330, 0.18, 9, '#842c16', 0.0, 0.85], [356, 0.12, 6, '#f0a85a', 0.2, 0.4], [380, 0.2, 10, '#7a2814', 0.05, 0.8],
          ].map(([y, o, hh, c, x0, ww], i) => (
            <Rect key={i} x={w * U(40 + (x0 as number) * 120)} y={h * V(y as number)} width={w * (0.9 + (ww as number) * 0.2)} height={hh as number} fill={c as string} opacity={(o as number) * 1.8} />
          ))}
        </Layer>
      </Layer>
      {/* a grey cloud patch across the forehead, a small bird */}
      <Layer clip={clipPath(P(w, h, face))}>
        <Path d={P(w, h, poly(m([[160, 148], [218, 116], [326, 150], [300, 186], [238, 172], [172, 162]])))} fill={linearGradient(['#f3f1ee', '#6c6a68', '#d9d6d2'], { angle: 100 })} />
        <Path d={P(w, h, smooth(m([[212, 150], [250, 156], [290, 164]]), false))} stroke={{ color: '#1c1a19', width: 1.4 }} />
      </Layer>
      <Path d={P(w, h, smooth(m([[268, 238], [282, 226], [296, 236], [306, 224]]), false))} stroke={{ color: '#1a1210', width: 1.5 }} />
      <Path d={P(w, h, hair)} fill="#0f0c0b" />
      <Path d={P(w, h, neck)} fill={linearGradient(['#17100e', '#120d0c'], { angle: 180 })} />
      <Layer clip={clipPath(P(w, h, poly(m([[160, 404], [380, 404], [380, 524], [160, 524]]))))}>
        <Layer effects={[blur(1)]}>
          {Array.from({ length: 22 }, (_, i) => (
            <Rect
              key={i}
              x={w * U(168 + ((i * 37) % 60))}
              y={h * V(414 + i * 4.6)}
              width={w * (0.12 + ((i * 13) % 7) * 0.03)}
              height={1.1 + (i % 3) * 0.4}
              fill={i % 3 ? '#d98a38' : '#a9561f'}
              opacity={0.75 - i * 0.025}
            />
          ))}
        </Layer>
      </Layer>
    </>
  );
};

/** Teal-black frame cut by soft diagonal light, a hand open and glowing orange from within. */
export const HandLight: React.FC<ArtProps> = ({ w, h }) => (
  <>
    <Rect width={w} height={h} fill={linearGradient([[0, '#0b3a54'], [0.45, '#1a5a7a'], [1, '#08253a']], { angle: 155 })} />
    <Layer effects={[blur(2)]}>
      {[
        [0.0, 5, 0.3, '#bfe6f6'], [0.1, 12, 0.2, '#9fd2ea'], [0.2, 3, 0.45, '#f4d6b0'], [0.28, 9, 0.22, '#aedcf0'],
        [0.38, 4, 0.4, '#e6b887'], [0.47, 14, 0.16, '#9acbe4'], [0.56, 3, 0.4, '#d9ecf6'], [0.66, 8, 0.24, '#b5def0'],
        [0.76, 3, 0.36, '#f0c8a0'], [0.86, 12, 0.18, '#a4d4ec'], [0.96, 4, 0.3, '#c8e8f6'],
      ].map(([x, bw, o, c], i) => (
        <Rect
          key={i}
          id={`hl-ray-${i}`}
          x={w * (x as number) - w * 0.25}
          y={-h * 0.25}
          width={bw as number}
          height={h * 1.8}
          rotation={-33}
          fill={linearGradient(['#ffffff00', c as string, '#ffffff00'], { angle: 180 })}
          opacity={o as number}
          blendMode="screen"
        />
      ))}
    </Layer>
    {/* far hand, a faint warm blur at the right edge */}
    <Path d={P(w, h, smooth([[0.8, 0.6], [0.88, 0.52], [0.97, 0.54], [1.02, 0.6], [0.95, 0.62]]))} fill="#ff8a40" opacity={0.4} effects={[blur(2.5)]} />
    {/* a hand open to the light: dark, rim-lit orange, bright in the palm */}
    <Layer anchorX={w * 0.55} anchorY={h * 0.78} x={w * 0.56} y={h * 0.78} rotation={14} scale={1.3} effects={[glow({ radius: 4, color: '#ff7a2a', intensity: 1 })]}>
      {([
        [[0.455, 0.7], [0.49, 0.6], [0.505, 0.55], [0.525, 0.57], [0.52, 0.64], [0.5, 0.7]],
        [[0.52, 0.68], [0.555, 0.58], [0.575, 0.52], [0.598, 0.535], [0.59, 0.62], [0.565, 0.7]],
        [[0.59, 0.7], [0.63, 0.6], [0.655, 0.54], [0.68, 0.555], [0.665, 0.64], [0.635, 0.72]],
        [[0.65, 0.74], [0.69, 0.66], [0.71, 0.6], [0.73, 0.62], [0.715, 0.7], [0.69, 0.78]],
        [[0.42, 0.78], [0.38, 0.72], [0.34, 0.67], [0.355, 0.64], [0.4, 0.68], [0.45, 0.72]],
      ] as Pt[][]).map((f, i) => (
        <Path key={i} d={P(w, h, smooth(f))} fill={linearGradient(['#ff9a40', '#7a2a12'], { angle: 200 })} />
      ))}
      <Path
        d={P(w, h, smooth([[0.4, 0.77], [0.47, 0.7], [0.57, 0.69], [0.67, 0.72], [0.73, 0.77], [0.7, 0.86], [0.64, 0.97], [0.6, 1.1], [0.34, 1.1], [0.34, 0.95], [0.38, 0.85]]))}
        fill={linearGradient([[0, '#ffc36a'], [0.1, '#e0702a'], [0.24, '#5a200e'], [0.42, '#0c0708']], { angle: 180 })}
      />
    </Layer>
    <Ov x={w * 0.5} y={h * 0.72} width={w * 0.2} height={h * 0.07} rotation={-20} fill="#fff0b8" opacity={0.75} effects={[blur(2)]} />
  </>
);

/** Dusk sky from indigo to pink, a pearly pastel ribbon through a hoop, a raised arm, a head of dark curls. */
export const DuskRibbon: React.FC<ArtProps> = ({ w, h }) => {
  const ribbon: Pt[] = [[0.43, 0.04], [0.56, 0.1], [0.64, 0.15], [0.68, 0.25], [0.75, 0.26], [0.86, 0.25], [0.94, 0.33], [0.99, 0.46], [0.98, 0.63], [0.94, 0.73], [0.86, 0.76], [0.78, 0.71], [0.74, 0.62], [0.75, 0.51], [0.72, 0.47], [0.64, 0.5], [0.53, 0.47], [0.41, 0.39], [0.34, 0.3], [0.33, 0.14]];
  return (
    <>
      <Rect width={w} height={h} fill={linearGradient([[0, '#4a5cc2'], [0.45, '#6f76cb'], [0.75, '#b58cbd'], [1, '#d99aa8']], { angle: 180 })} />
      <Ov x={w * 0.8} y={h * 0.1} width={w * 0.7} height={h * 0.4} fill={radialGradient(['#7a80dc66', '#7a80dc00'])} />
      <Layer effects={[blur(0.6)]}>
        <Path d={P(w, h, smooth(ribbon))} fill={linearGradient(['#f9dcc8', '#e9b3c6', '#f2c4b0'], { angle: 120 })} opacity={0.95} />
        <Layer clip={clipPath(P(w, h, smooth(ribbon.map(([x, y]) => [0.5 + (x - 0.5) * 0.97, 0.3 + (y - 0.3) * 0.94] as Pt))))}>
          <Rect width={w} height={h} fill={linearGradient([[0, '#aeb0ec'], [0.4, '#7a86dc'], [0.7, '#6670d0'], [1, '#a688d8']], { angle: 135 })} />
          <Layer effects={[blur(3)]}>
            <Ov x={w * 0.48} y={h * 0.2} width={w * 0.2} height={h * 0.1} rotation={25} fill="#ff8a86" opacity={0.85} />
            <Ov x={w * 0.42} y={h * 0.14} width={w * 0.1} height={h * 0.05} rotation={30} fill="#ffb27a" opacity={0.8} />
            <Ov x={w * 0.54} y={h * 0.31} width={w * 0.22} height={h * 0.06} rotation={-12} fill="#2d3c9e" opacity={0.7} />
            <Ov x={w * 0.6} y={h * 0.4} width={w * 0.14} height={h * 0.06} fill="#ff7fa0" opacity={0.8} />
            <Ov x={w * 0.67} y={h * 0.36} width={w * 0.08} height={h * 0.04} fill="#5aa0f0" opacity={0.8} />
            <Ov x={w * 0.82} y={h * 0.59} width={w * 0.1} height={h * 0.16} fill="#ff6f90" opacity={0.85} />
            <Ov x={w * 0.86} y={h * 0.66} width={w * 0.1} height={h * 0.08} fill="#ffc67a" opacity={0.7} />
            <Ov x={w * 0.4} y={h * 0.34} width={w * 0.16} height={h * 0.06} rotation={20} fill="#ffc9a0" opacity={0.7} />
          </Layer>
        </Layer>
      </Layer>
      {/* the hoop, its pole, and a bright arrow through it */}
      <Ellipse x={w * 0.29} y={h * 0.03} width={w * 0.14} height={h * 0.37} rotation={14} stroke={{ color: '#241a3a', width: 1.2 }} />
      <Path d={P(w, h, 'M 0.3 0.4 L 0.24 0.69')} stroke={{ color: '#2a2040', width: 1.1 }} />
      <Path d={P(w, h, 'M 0.05 0.02 L 0.39 0.22')} stroke={{ color: '#ffffff', width: 1.5 }} opacity={0.85} effects={[blur(0.4)]} />
      {/* the raised arm with its fist, and a head of dark curls */}
      <Path d={P(w, h, smooth([[0.27, 0.6], [0.3, 0.6], [0.35, 0.72], [0.41, 1.03], [0.31, 1.03], [0.285, 0.8]]))} fill="#3b2034" />
      <Ov x={w * 0.285} y={h * 0.53} width={w * 0.075} height={h * 0.12} fill="#3b2034" />
      <Layer>
        {[[0.52, 0.91, 0.1, 0.12], [0.47, 0.94, 0.08, 0.1], [0.58, 0.93, 0.08, 0.1], [0.53, 0.86, 0.08, 0.08], [0.48, 0.88, 0.06, 0.07], [0.58, 0.88, 0.06, 0.07], [0.52, 1.0, 0.14, 0.1]].map(([x, y, ew, eh], i) => (
          <Ov key={i} x={w * (x as number)} y={h * (y as number)} width={w * (ew as number)} height={h * (eh as number)} fill="#24162e" />
        ))}
      </Layer>
    </>
  );
};

/** Night coast seen through a face in profile: blue ground, an orange rim light, a landscape inside the head. */
export const CoastFace: React.FC<ArtProps> = ({ w, h }) => {
  const rim: Pt[] = [[0.47, 0.0], [0.4, 0.04], [0.33, 0.1], [0.27, 0.19], [0.24, 0.31], [0.23, 0.4], [0.2, 0.47], [0.13, 0.52], [0.1, 0.59], [0.12, 0.64], [0.16, 0.68], [0.2, 0.73], [0.19, 0.8], [0.24, 0.88], [0.23, 0.97], [0.24, 1.0]];
  const inside = poly([...rim, [1, 1], [1, 0]]);
  return (
    <>
      <Rect width={w} height={h} fill={linearGradient([[0, '#2a44dc'], [0.6, '#3a5ce4'], [1, '#4a6ee8']], { angle: 170 })} />
      <Layer clip={clipPath(P(w, h, inside))}>
        <Layer x={0} y={h * 0.53} rotation={-11}>
          <Rect
            x={-w * 0.3}
            y={-h * 0.7}
            width={w * 1.8}
            height={h * 1.9}
            fill={linearGradient(
              [
                [0, '#061a54'],
                [0.2, '#082c6a'],
                [0.31, '#0c5276'],
                [0.37, '#137a84'],
                [0.4, '#2c9a8c'],
                [0.418, '#d0b83a'],
                [0.428, '#ffb02e'],
                [0.438, '#e8782a'],
                [0.452, '#15204c'],
                [0.55, '#0a1640'],
                [1, '#060b2a'],
              ],
              { angle: 180 },
            )}
          />
        </Layer>
        {/* lights along the horizon, a green gleam on the water */}
        {Array.from({ length: 26 }, (_, i) => (
          <Rect key={i} x={w * (0.5 + i * 0.019)} y={h * (0.425 - i * 0.0042 + ((i * 7) % 4) * 0.004)} width={1.2} height={1.2} fill="#ffe9b0" opacity={0.55 + ((i * 3) % 4) * 0.1} />
        ))}
        <Layer effects={[blur(2.5)]}>
          <Ov x={w * 0.6} y={h * 0.6} width={w * 0.6} height={h * 0.02} rotation={-10} fill="#33c6a0" opacity={0.6} />
          <Ov x={w * 0.18} y={h * 0.5} width={w * 0.3} height={h * 0.08} fill="#ffb02e" opacity={0.5} />
          <Ov x={w * 0.55} y={h * 0.86} width={w * 0.6} height={h * 0.25} fill="#4a1a60" opacity={0.12} />
        </Layer>
        <Rect width={w * 0.6} height={h} fill={linearGradient(['#040a2a', '#040a2a00'], { angle: 90 })} opacity={0.8} y={h * 0.5} />
      </Layer>
      <Layer effects={[glow({ radius: 7, color: '#ff8a2a', intensity: 1.3 })]}>
        <Path d={P(w, h, smooth(rim, false))} stroke={{ color: '#ff9a30', width: 5 }} />
        <Path d={P(w, h, smooth(rim, false))} stroke={{ color: '#ffe48a', width: 1.8 }} />
        {[[0.34, 0.07, 7, 12], [0.27, 0.24, 6, 15], [0.26, 0.31, 5, 9], [0.1, 0.57, 9, 10], [0.16, 0.66, 8, 6], [0.2, 0.73, 9, 7], [0.19, 0.81, 6, 10], [0.25, 0.9, 8, 12]].map(([x, y, bw, bh], i) => (
          <Ov key={i} x={w * (x as number)} y={h * (y as number)} width={bw as number} height={bh as number} fill="#ffa832" />
        ))}
        <Ov x={w * 0.13} y={h * 0.6} width={9} height={5} fill="#d4284c" opacity={0.85} />
      </Layer>
    </>
  );
};

/** A soft, out-of-focus morning: teal sky, a pink haze across the left, muddy blue water, a lone figure, pink flowers. */
export const HazeFigure: React.FC<ArtProps> = ({ w, h }) => (
  <>
    <Rect width={w} height={h} fill={linearGradient([[0, '#5aa2b8'], [0.3, '#5ea5ba'], [0.55, '#8cb4c6'], [0.66, '#5f90ac'], [1, '#3f6f8e']], { angle: 180 })} />
    <Layer effects={[blur(10)]}>
      <Ov x={w * 0.12} y={h * 0.05} width={w * 0.4} height={h * 0.2} fill="#b9bfe0" opacity={0.7} />
      <Ov x={w * 0.2} y={h * 0.45} width={w * 0.9} height={h * 0.45} fill="#d2b0c6" opacity={0.5} />
      <Ov x={w * 0.75} y={h * 0.58} width={w * 0.7} height={h * 0.1} fill="#c9aec8" opacity={0.6} />
      <Ov x={w * 0.6} y={h * 0.2} width={w * 0.6} height={h * 0.2} fill="#7fb9c8" opacity={0.5} />
      <Rect y={h * 0.65} width={w} height={h * 0.05} fill="#7a98b8" opacity={0.7} />
      <Rect x={w * 0.05} y={h * 0.76} width={w * 0.8} height={h * 0.03} fill="#2e5878" opacity={0.5} />
      <Rect x={w * 0.3} y={h * 0.86} width={w * 0.7} height={h * 0.03} fill="#6b95b0" opacity={0.4} />
    </Layer>
    <Layer effects={[blur(1.8)]}>
      <Ov x={w * 0.485} y={h * 0.45} width={w * 0.06} height={h * 0.1} rotation={-8} fill="#101a2e" />
      <Path d={P(w, h, smooth([[0.49, 0.5], [0.55, 0.53], [0.6, 0.6], [0.62, 0.78], [0.62, 1.02], [0.5, 1.02], [0.48, 0.85], [0.47, 0.7], [0.47, 0.56]]))} fill="#101a2e" />
    </Layer>
    <Layer effects={[blur(3)]}>
      <Ov x={w * 0.37} y={h * 0.95} width={w * 0.12} height={h * 0.1} fill="#ee4a82" opacity={0.85} />
      <Ov x={w * 0.43} y={h * 0.9} width={w * 0.06} height={h * 0.08} fill="#f98aa0" opacity={0.8} />
    </Layer>
  </>
);

/** A hill at golden hour: near-black green slopes, a lit ridge, gold grass in front, a small figure in a pale shirt. */
export const HillFigure: React.FC<ArtProps> = ({ w, h }) => (
  <>
    <Rect width={w} height={h} fill={linearGradient([[0, '#26331c'], [1, '#1c2814']], { angle: 180 })} />
    <Layer effects={[blur(3)]}>
      <Ov x={w * 0.9} y={h * 0.02} width={w * 0.5} height={h * 0.1} rotation={-10} fill="#a07a42" opacity={0.5} />
      <Ov x={w * 0.55} y={h * 0.12} width={w * 0.9} height={h * 0.12} rotation={-14} fill="#3b4c26" opacity={0.35} />
    </Layer>
    <Path
      d={P(w, h, 'M 0 0.4 C 0.25 0.3 0.5 0.17 0.75 0.11 C 0.88 0.08 0.95 0.07 1 0.07 L 1 1 L 0 1 Z')}
      fill={linearGradient([[0, '#0e180a'], [0.45, '#14210d'], [0.8, '#213816'], [1, '#1d3015']], { angle: 170 })}
    />
    <Layer effects={[blur(1.1)]}>
      <Path d={P(w, h, 'M 0.3 0.26 C 0.5 0.17 0.75 0.11 1 0.06')} stroke={{ color: '#d9a85a', width: 1.3 }} opacity={0.55} />
      <Path d={P(w, h, 'M 0.0 0.4 C 0.12 0.35 0.2 0.31 0.3 0.26')} stroke={{ color: '#8a8a4a', width: 1.2 }} opacity={0.35} />
    </Layer>
    <Layer effects={[blur(3)]}>
      <Ov x={w * 0.75} y={h * 0.6} width={w * 1.0} height={h * 0.16} rotation={-16} fill="#31501a" opacity={0.4} />
      <Ov x={w * 0.3} y={h * 0.52} width={w * 0.8} height={h * 0.3} fill="#0a1507" opacity={0.55} />
    </Layer>
    <Path
      d={P(w, h, 'M 0 0.8 C 0.25 0.76 0.55 0.74 0.78 0.73 C 0.9 0.73 0.97 0.74 1 0.75 L 1 1 L 0 1 Z')}
      fill={linearGradient([[0, '#e9aa28'], [0.4, '#c08a20'], [0.72, '#4c5a1a'], [1, '#26361a']], { angle: 85 })}
    />
    <Layer effects={[blur(1.2)]}>
      <Ov x={w * 0.25} y={h * 0.86} width={w * 0.5} height={h * 0.08} fill="#ffd650" opacity={0.25} />
      <Ov x={w * 0.95} y={h * 0.97} width={w * 0.6} height={h * 0.16} fill="#223616" opacity={0.9} />
    </Layer>
    {/* the figure's long shadow, then the figure facing right */}
    <Path d={P(w, h, 'M 0.5 0.86 L 0.0 0.99 L 0.05 1.02 L 0.54 0.88 Z')} fill="#3a2a0c" opacity={0.7} effects={[blur(0.8)]} />
    <Layer effects={[blur(0.5)]}>
      <Path d={P(w, h, smooth([[0.46, 0.66], [0.52, 0.66], [0.53, 0.86], [0.49, 0.875], [0.47, 0.86]]))} fill="#0f0f14" />
      <Path d={P(w, h, smooth([[0.455, 0.49], [0.5, 0.485], [0.545, 0.5], [0.55, 0.56], [0.545, 0.66], [0.47, 0.68], [0.455, 0.6]]))} fill={linearGradient([[0, '#efe9dc'], [1, '#bdb6a6']], { angle: 100 })} />
      <Path d={P(w, h, smooth([[0.55, 0.5], [0.57, 0.56], [0.56, 0.62], [0.54, 0.62]]))} fill="#8c8678" />
      <Ov x={w * 0.47} y={h * 0.41} width={w * 0.06} height={h * 0.07} fill="#1a1210" />
      <Ov x={w * 0.505} y={h * 0.445} width={w * 0.025} height={h * 0.035} fill="#6a4a38" />
    </Layer>
  </>
);

/** The dark figure of the smear card: a big head of hair and a coat falling away to the lower left. */
const Figure: React.FC<ArtProps & { opacity?: number }> = ({ w, h, opacity = 1 }) => (
  <Layer opacity={opacity}>
    {[[0.54, 0.22, 0.34, 0.26], [0.45, 0.2, 0.16, 0.14], [0.6, 0.12, 0.18, 0.12], [0.66, 0.2, 0.14, 0.14], [0.5, 0.31, 0.16, 0.12], [0.4, 0.27, 0.12, 0.1], [0.58, 0.3, 0.16, 0.12]].map(([x, y, ew, eh], i) => (
      <Ov key={i} x={w * (x as number)} y={h * (y as number)} width={w * (ew as number)} height={h * (eh as number)} fill="#0d0807" />
    ))}
    <Path d={P(w, h, smooth([[0.62, 0.5], [0.59, 0.57], [0.61, 0.7], [0.66, 0.9], [0.66, 1.05], [0.2, 1.05], [0.08, 0.78], [0.14, 0.73], [0.35, 0.7], [0.27, 0.55], [0.38, 0.46], [0.5, 0.45]]))} fill="#100a09" />
  </Layer>
);

/** Orange-red field, banded by sideways motion, with a dark figure dragged into streaks and a glimpse of face. */
export const OrangeSmear: React.FC<ArtProps> = ({ w, h }) => (
  <>
    <Rect width={w} height={h} fill={linearGradient([[0, '#ff9a34'], [0.14, '#ff6a22'], [0.4, '#ff4216'], [0.75, '#ee2c14'], [1, '#c01a12']], { angle: 180 })} />
    <Ov x={w * 0.85} y={h * 0.0} width={w * 0.9} height={h * 0.22} fill={radialGradient(['#ffc25acc', '#ffc25a00'])} />
    <Layer effects={[blur(2.5)]}>
      <Rect x={0} y={h * 0.355} width={w * 0.62} height={h * 0.05} fill="#ffa63a" opacity={0.9} />
      <Rect x={0} y={h * 0.33} width={w * 0.8} height={h * 0.03} fill="#ff8a2a" opacity={0.5} />
      <Rect x={0} y={h * 0.5} width={w * 0.7} height={h * 0.02} fill="#ffb04a" opacity={0.4} />
      <Rect x={0} y={h * 0.58} width={w * 0.5} height={h * 0.03} fill="#c81e12" opacity={0.6} />
      <Rect x={0} y={h * 0.22} width={w * 0.5} height={h * 0.02} fill="#c8321a" opacity={0.5} />
    </Layer>
    {/* the figure: smeared copies first, then streaks of coat, then a sharper pass on top */}
    <Layer effects={[blur(3.5)]}>
      {Array.from({ length: 16 }, (_, i) => (
        <Layer key={i} x={-i * w * 0.026} opacity={0.11}>
          <Figure w={w} h={h} />
        </Layer>
      ))}
    </Layer>
    <Layer effects={[blur(3)]}>
      {[[0.56, 0.0, 0.5], [0.64, 0.06, 0.45], [0.72, 0.02, 0.55], [0.8, 0.08, 0.4], [0.88, 0.0, 0.5], [0.95, 0.05, 0.4]].map(([y, x0, len], i) => (
        <Ov key={i} x={w * ((x0 as number) + (len as number) * 0.5)} y={h * (y as number)} width={w * (len as number)} height={h * 0.035} fill="#0d0807" opacity={0.6} />
      ))}
    </Layer>
    <Layer effects={[blur(1.1)]}>
      <Figure w={w} h={h} opacity={0.95} />
      <Ov x={w * 0.62} y={h * 0.44} width={w * 0.13} height={h * 0.15} fill="#26231f" opacity={0.95} />
      <Ov x={w * 0.64} y={h * 0.42} width={w * 0.06} height={h * 0.07} fill="#55493f" opacity={0.5} />
      <Ov x={w * 0.62} y={h * 0.37} width={w * 0.14} height={h * 0.04} rotation={-6} fill="#1e0807" opacity={0.9} />
    </Layer>
  </>
);

export const ARTS = [SunsetHead, HandLight, DuskRibbon, CoastFace, HazeFigure, HillFigure, OrangeSmear];

/** A photo in a card: the user's image if given, else the drawn stand-in. Soft focus and grain on the art. */
export const Photo: React.FC<{ index: number; src?: string; w: number; h: number; seed: number; grainAmount: number }> = ({ index, src, w, h, seed, grainAmount }) => {
  const Art = ARTS[index % ARTS.length];
  return (
    <Layer
      id={`photo-${index}`}
      effects={[grain(grainAmount, { seed, size: 1, animate: false })]}
      clip={{ kind: 'polygon', points: [[0, 0], [w, 0], [w, h], [0, h]] }}
    >
      {src ? (
        <Image src={src} width={w} height={h} fit="cover" />
      ) : (
        <Layer id={`art-${index}`} effects={[blur(0.8)]}>
          <Art w={w} h={h} />
        </Layer>
      )}
    </Layer>
  );
};
