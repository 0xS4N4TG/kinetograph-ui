// Shots 01 and 02 share one world: a pale feed column with our post on top and three more posts under it. Shot 01
// pulls back out of the post's picture, likes it, and saves it (red ink notes); shot 02 whips down the feed and the
// column slides off to the left onto the dark. Both draw this scene from the reel's frame number, so where they
// overlap they draw the same picture.

import React from 'react';
import { random } from 'remotion';
import { Ellipse, Image, Layer, Path, Rect, Text, blur, dropShadow, linearGradient, radialGradient } from '@kinetographdev/core';
import {
  H,
  ICON,
  Icon,
  InkLines,
  Ink,
  PAPER,
  RED_INK,
  W,
  WIDE,
  curve,
  handLine,
  line,
  keys,
  ramp,
  easeOut,
  photoSrc,
} from '../lib.js';
import { POST, PostCard } from '../post.js';

const IMG_H = 355; // our post's picture is a little taller than the feed's
const GAP = 650; // one post to the next, in world pixels
const DARK = '#1e1e20';

// ---- camera ----

// Catmull-Rom through [frame, value] keys: the camera's path, measured on the reference every 2 to 4 frames.
function spline(f: number, k: [number, number][]): number {
  if (f <= k[0][0]) return k[0][1];
  if (f >= k[k.length - 1][0]) return k[k.length - 1][1];
  let i = 0;
  while (f > k[i + 1][0]) i++;
  const p0 = k[Math.max(0, i - 1)];
  const p1 = k[i];
  const p2 = k[i + 1];
  const p3 = k[Math.min(k.length - 1, i + 2)];
  const t = (f - p1[0]) / (p2[0] - p1[0]);
  // tangents scaled for uneven key spacing
  const m1 = ((p2[1] - p0[1]) / (p2[0] - p0[0] || 1)) * (p2[0] - p1[0]);
  const m2 = ((p3[1] - p1[1]) / (p3[0] - p1[0] || 1)) * (p2[0] - p1[0]);
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * p1[1] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[1] + (t3 - t2) * m2;
}

const ZOOM: [number, number][] = [
  [0, 2.9], [2, 2.85], [4, 2.6], [8, 2.35], [12, 2.2], [16, 2.07], [20, 1.5], [24, 1.39], [28, 1.41], [32, 1.46], [36, 1.5],
  [40, 1.75], [48, 1.8], [81, 1.8],
];
const CX: [number, number][] = [
  [0, 300], [2, 296], [4, 267], [8, 244], [12, 244], [16, 241], [20, 240], [24, 246], [28, 255], [32, 277], [36, 315], [40, 351],
  [48, 365], [52, 368], [66, 368], [70, 423], [73, 479], [76, 590], [80, 923],
];
const CY: [number, number][] = [
  [0, 200], [2, 205], [4, 224], [8, 240], [12, 243], [16, 247], [20, 277], [24, 291], [28, 299], [32, 321], [36, 374], [40, 400],
  [48, 413], [52, 438], [55, 463], [57, 494], [59, 557], [61, 676], [63, 900], [65, 1060], [67, 1290], [70, 1554],
  [73, 1731], [76, 1951], [80, 2200],
];
// where the pale column ends on the right of the screen (screen px); the dark shows past it
const EDGE: [number, number][] = [
  [48, 1180], [52, 1046], [55, 945], [57, 878], [59, 855], [61, 844], [63, 833], [65, 815], [67, 795], [70, 742],
  [73, 641], [76, 450], [79, 40], [80, -20],
];
// ---- the poster: our post's picture (our own headline panel over a public-domain photo) ----

const HEAD = '#6ea6ee';

/** panel: how far the headline panel has come in (0 is the bare photo, as the reel opens on it) */
export const Poster: React.FC<{ w: number; h: number; panel?: number }> = ({ w, h, panel = 1 }) => {
  const split = w * 0.57;
  return (
    <Layer>
      {/* the photo: a 1906 exhibition poster (1212 x 1600), its car and cyclist, which fill the top half */}
      <Layer clip={{ kind: 'path', d: `M0 0H${w}V${h}H0Z` }}>
        <Image src={photoSrc('poster.jpg')} y={-h * 0.08} width={w} height={(w * 1600) / 1212} />
      </Layer>
      <Rect width={split} height={h} fill="#fbfbfa" opacity={panel} />
      {/* headline panel: our own words */}
      <Text font={WIDE} size={112} color={HEAD} x={12} y={-14} lineHeight={0.9} opacity={panel}>
        {'GO\nUP!!'}
      </Text>
      <Layer opacity={panel}>
        <Rect x={14} y={232} width={split - 22} height={34} fill={HEAD} />
        <Text font={WIDE} size={12} color="#ffffffcc" x={26} y={279}>
          {'s k y   d a y'}
        </Text>
        <Rect x={14} y={300} width={split - 22} height={38} fill={HEAD} />
      </Layer>
      {/* the picture's thin white keyline */}
      <Path
        d={`M${w - 8} 14 L${w - 8} ${h - 20} Q${w - 8} ${h - 8} ${w - 20} ${h - 8}`}
        stroke={{ color: '#ffffffaa', width: 1.6 }}
      />
    </Layer>
  );
};

// ---- the other posts' pictures (warm photos, seen only at speed) ----

// A warm street or room, built from seeded columns of light and shade: it is only ever seen smeared by the whip,
// so what matters is the busy vertical texture and the palette.
const WarmPhoto: React.FC<{ w: number; h: number; seed: string; sky: string[]; tones: string[]; glow: string }> = ({
  w,
  h,
  seed,
  sky,
  tones,
  glow,
}) => (
  <Layer effects={[blur(2.5)]}>
    <Rect width={w} height={h} fill={linearGradient(sky, { angle: 180 })} />
    {Array.from({ length: 34 }, (_, i) => {
      const x = random(`${seed}-x-${i}`) * w;
      const top = h * (0.1 + random(`${seed}-t-${i}`) * 0.5);
      return (
        <Rect
          key={i}
          x={x}
          y={top}
          width={6 + random(`${seed}-w-${i}`) * 40}
          height={h - top}
          fill={tones[Math.floor(random(`${seed}-c-${i}`) * tones.length)]}
          opacity={0.55 + random(`${seed}-o-${i}`) * 0.45}
        />
      );
    })}
    {Array.from({ length: 10 }, (_, i) => (
      <Ellipse
        key={i}
        x={random(`${seed}-gx-${i}`) * w}
        y={h * (0.3 + random(`${seed}-gy-${i}`) * 0.6)}
        width={8 + random(`${seed}-gs-${i}`) * 18}
        height={8 + random(`${seed}-gs-${i}`) * 18}
        fill={glow}
      />
    ))}
    <Rect y={h * 0.78} width={w} height={h * 0.22} fill={linearGradient(['#00000000', '#00000088'], { angle: 180 })} />
  </Layer>
);

const Interior: React.FC<{ w: number; h: number }> = ({ w, h }) => (
  <Layer>
    <WarmPhoto w={w} h={h} seed="interior" sky={['#4a3020', '#2a1a0e']} tones={['#1e130b', '#6b4522', '#c98a3e', '#f0c070', '#3a2414']} glow="#ffd27a" />
    <Ellipse x={w - 140} y={-30} width={200} height={230} fill="#e8d2a6" effects={[blur(6)]} />
  </Layer>
);

const Dusk: React.FC<{ w: number; h: number }> = ({ w, h }) => (
  <WarmPhoto w={w} h={h} seed="dusk" sky={['#7484b8', '#d9a07c', '#e8a466']} tones={['#1c2030', '#2b2a33', '#4d86d8', '#6a4a3a', '#c88a5a']} glow="#ffcf8a" />
);

const Plaza: React.FC<{ w: number; h: number }> = ({ w, h }) => (
  <WarmPhoto w={w} h={h} seed="plaza" sky={['#e8b474', '#9a6236']} tones={['#3a2414', '#7d5030', '#e0a050', '#5a3a22']} glow="#fff0c0" />
);

// ---- ink ----

function arrow(points: number[][], seed: string, head = 9) {
  const shaft = handLine(points, seed, 1.2);
  const n = points.length;
  const [ex, ey] = points[n - 1];
  const [px, py] = points[n - 2];
  const a = Math.atan2(ey - py, ex - px);
  const h1 = handLine([[ex - head * Math.cos(a - 0.5), ey - head * Math.sin(a - 0.5)], [ex, ey]], `${seed}-h1`, 0.6);
  const h2 = handLine([[ex, ey], [ex - head * Math.cos(a + 0.5), ey - head * Math.sin(a + 0.5)]], `${seed}-h2`, 0.6);
  return [shaft, h1, h2];
}

const LIKE_ARROW = arrow(curve([-44, 398], [-56, 440], [8, 456], 14), 'like', 11);
// from under "it...", along to the right and up in a hook to the bookmark
const SAVE_ARROW = arrow([...curve([392, 568], [492, 592], [474, 500], 18)], 'save', 16);
const RAYS = [
  // a burst either side: two short dashes before "Like", three after "it!!"
  handLine([[-104, 330], [-94, 337]], 'ray1', 0.4),
  handLine([[-104, 346], [-93, 346]], 'ray2', 0.4),
  handLine([[-2, 364], [8, 357]], 'ray3', 0.4),
  handLine([[0, 376], [12, 374]], 'ray4', 0.4),
  handLine([[-2, 388], [8, 392]], 'ray5', 0.4),
];
const STRIKE = [handLine([[150, 512], [170, 500]], 'strike', 0.6)];

// ---- the scene ----

export const FeedScene: React.FC<{ frame: number }> = ({ frame: f }) => {
  const zoom = spline(f, ZOOM);
  const cx = spline(f, CX);
  const cy = spline(f, CY);
  const edge = keys(f, EDGE, (t) => t);
  const capY = POST.captionY(IMG_H);

  // the double-tap heart on the picture
  const pop = ramp(f, 12, 19, 0, 1, easeOut);
  const popScale = pop * (1 + 0.12 * Math.sin(ramp(f, 17, 24, 0, Math.PI, (t) => t)));
  const popAlpha = ramp(f, 12, 15, 0, 0.8) * ramp(f, 29, 35, 1, 0);

  // the save button: pressed (a dark dot), then a grey halo while the mark fills
  const press = ramp(f, 39, 45, 0, 1, easeOut);
  const halo = press * ramp(f, 52, 58, 1, 0);

  return (
    <Layer>
      <Rect width={W} height={H} fill={DARK} />
      {/* the next shot's warm glow comes up on the dark */}
      <Ellipse x={-W * 0.15} y={H * 0.7} width={W * 1.1} height={H * 0.7} fill={radialGradient(['#8a5a2266', '#8a5a2200'])} opacity={ramp(f, 66, 80, 0, 1)} />
      <Rect width={Math.max(0, edge)} height={H} fill={PAPER} />
      <Rect x={edge - 2} width={14} height={H} fill="#00000022" effects={[blur(6)]} opacity={f > 49 ? 1 : 0} />
      <Layer
        effects={f < 12 ? [blur(ramp(f, 0, 11, 9, 0))] : undefined}
        // no shutter on the first frame: its earlier half would sample before the reel starts
        motionBlur={{ samples: 24, shutter: f < 1 ? 0 : f > 60 ? 1.0 : f > 52 ? 0.6 : f > 22 && f < 50 ? 0.6 : 1.2 }}
      >
        <Layer x={W / 2} y={H / 2} scale={zoom}>
          <Layer x={-cx} y={-cy}>
            {/* the save button's press */}
            <Layer x={POST.width - 29} y={POST.actionsY(IMG_H) + 1} opacity={halo}>
              <Ellipse
                x={-26 * press}
                y={-26 * press}
                width={52 * press}
                height={52 * press}
                fill={f < 43 ? '#2a2a2c' : '#a3a3a6'}
                opacity={f < 43 ? 0.9 : 0.55}
              />
              {f < 43 && (
                <Layer x={-9} y={-10}>
                  <Icon d={ICON.bookmark} size={20} fill="#ffffff" color="#ffffff" />
                </Layer>
              )}
            </Layer>

            <PostCard
              name="yourhandle"
              sub="Amsterdam, 1906"
              follow={false}
              imageHeight={IMG_H}
              image={
                <Layer>
                  <Poster w={POST.width} h={IMG_H} panel={ramp(f, 2, 7, 0, 1)} />
                  <Layer x={262} y={170} scale={popScale} opacity={popAlpha}>
                    <Layer x={-58} y={-56} scale={4.8} effects={[dropShadow({ y: 2, blur: 6, color: '#0000002a' })]}>
                      <Path d={ICON.heart} fill="#ffffff" />
                    </Layer>
                  </Layer>
                </Layer>
              }
              likes="2.1K"
              comments="115"
              reposts="50"
              liked={ramp(f, 19, 24, 0, 1, easeOut)}
              save={f >= 41 ? 'filled' : 'outline'}
              saveScale={1 + 0.15 * Math.sin(ramp(f, 41, 47, 0, Math.PI, (t) => t))}
              caption={[
                'Spent the whole week drawing this one',
                'frame by frame. No templates, no presets,',
                'just pencil, patience and a lot of coffee. Tell me',
                'More...',
              ]}
            />
            {/* red ink */}
            <Ink text="Like" frame={f} start={16} end={21} x={-88} y={360} size={40} color={RED_INK} rotation={-10} />
            <Ink text="it!!" frame={f} start={21} end={24} x={-52} y={388} size={36} color={RED_INK} rotation={-10} />
            <InkLines strokes={RAYS} progress={ramp(f, 22, 25, 0, 1, (t) => t)} color={RED_INK} width={2.6} />
            <InkLines strokes={LIKE_ARROW} progress={ramp(f, 24, 28, 0, 1, (t) => t)} color={RED_INK} width={3} />
            <InkLines strokes={STRIKE} progress={ramp(f, 29, 31, 0, 1, (t) => t)} color={RED_INK} width={2.2} />
            <Ink text="Save" frame={f} start={30} end={34} x={330} y={capY + 70} size={58} color={RED_INK} rotation={-7} />
            <Ink text="it..." frame={f} start={34} end={37} x={386} y={capY + 86} size={38} color={RED_INK} rotation={-4} />
            <InkLines strokes={SAVE_ARROW} progress={ramp(f, 36, 41, 0, 1, (t) => t)} color={RED_INK} width={3.6} />

            {/* the rest of the feed */}
            <Layer y={GAP}>
              <PostCard name="dariaslens" image={<Interior w={POST.width} h={POST.imageHeight} />} likes="8.4K" comments="231" reposts="96"
                caption={['golden hour never misses', 'shot on film, scanned at home']} />
            </Layer>
            <Layer y={GAP * 2}>
              <PostCard name="cityafter6" image={<Dusk w={POST.width} h={POST.imageHeight} />} likes="12K" comments="402" reposts="210"
                caption={['the skyline did that again', 'no edits, just luck']} />
            </Layer>
            <Layer y={GAP * 3}>
              <PostCard name="mornings.kept" image={<Plaza w={POST.width} h={POST.imageHeight} />} likes="3.9K" comments="88" reposts="41"
                caption={['slow mornings only']} />
            </Layer>
          </Layer>
        </Layer>
      </Layer>
    </Layer>
  );
};
