// 04 The library: one continuous camera through a wall of our renders, no cuts.
//
// A curved wall of cards (templates and components, every one playing) stands on a dark glossy floor. The sequence
// opens on Studio's preview exactly as the previous shot leaves it (film.tsx S03), pulls back to show that the preview
// is one card in a library, glides on an arc to the donut chart and dives until the card is the frame, holds it
// full frame ("the numbers tell a story"), pulls out and glides to the flyover map, dives again, then pulls all the way
// back for the hero still of the whole wall ("A wall of your work") and dives into the three-phone template, ending
// held full frame on it for the next sequence.
//
// The camera is keyed pose to pose (cubic Hermite through pass keys, zero velocity at the holds) on target, distance
// (in log space, so pushes feel even), orbit and pitch. A dive lands with the card head on at exactly 1:1 (layer
// scale 1, no rotation), so the card's video is the full frame, pixel for pixel. Motion blur only while the screen
// moves fast. Every frame is a pure function of the frame.
//
//   node ../kinetograph-0.3.0/packages/cli/dist/cli.js render templates/inside/library.tsx --comp Library \
//     -o templates/inside/public/worlds/library.mp4 --concurrency 2
// Cards: templates/inside/tools/library-clips.sh bakes public/library/.
import React from 'react';
import { Composition, Freeze, registerRoot, staticFile, useCurrentFrame } from 'remotion';
import { Camera, Image, Layer, Rect, Video, grain, linearGradient, radialGradient } from '@kinetographdev/core';
import { clamp, project, projectPoint, rotX, rotY, rrPath } from '../../components/grids/kit.js';
import type { Cam, Item, M3, V3 } from '../../components/grids/kit.js';

const W = 1920;
const H = 1080;
export const LIBRARY_FRAMES = 378;

// ---- the wall ---------------------------------------------------------------------------------------------------
// Seven columns, 480 wide. A column is four 16:9 cards, or one 9:16 card over or under a 16:9 one; the gap makes both
// stack to the same height. The wall bends round a cylinder whose axis is on the camera's side, so its ends come
// toward the viewer and every card faces the middle.

const CW = 480;
const RH = 270;
const TH = (CW * 16) / 9; // 853.3
const GAP = (TH + RH - 4 * RH) / 2; // 21.7: so [T, W] stacks as tall as [W, W, W, W]
const WALL_H = 4 * RH + 3 * GAP;
const R = 4000;
const FLOOR = WALL_H / 2 + 46; // y is down
const FOCAL = 1400;

type Kind = 'w' | 't';
interface Card { id: string; src: string; kind: Kind; col: number; row: number; still?: boolean; loop?: boolean; off?: number }

const C = (id: string, kind: Kind, col: number, row: number, extra: Partial<Card> = {}): Card => ({ id, src: `library/${id}.mp4`, kind, col, row, loop: true, off: 0, ...extra });

const CARDS: Card[] = [
  C('recap-dial', 't', 0, 0, { off: 30 }), C('phone-orbit', 'w', 0, 3),
  C('greeting', 'w', 1, 0), C('studio', 'w', 1, 1, { src: 'library/studio.png', still: true }), C('collage', 'w', 1, 2, { off: 20 }), C('wish', 'w', 1, 3, { off: 40 }),
  C('candlestick', 'w', 2, 0), C('word-flash', 't', 2, 1),
  C('grid-reel', 'w', 3, 0, { off: 10 }), C('donut', 'w', 3, 1, { loop: false }), C('three-phone', 'w', 3, 2, { loop: false }), C('cyberpunk', 'w', 3, 3, { off: 24 }),
  C('dostoevsky', 't', 4, 0, { off: 60 }), C('app-launch', 'w', 4, 3),
  C('wait-ship', 'w', 5, 0), C('prompt-reply', 'w', 5, 1, { off: 30 }), C('flyover', 'w', 5, 2, { loop: false }), C('film-intro', 'w', 5, 3, { off: 45 }),
  C('globe', 'w', 6, 0, { off: 60 }), C('stack-credits', 't', 6, 1),
];

const colU = (col: number) => (col - 3) * (CW + GAP);
const rowTop = (row: number) => -WALL_H / 2 + row * (RH + GAP);
const cardY = (c: Card) => rowTop(c.row) + (c.kind === 'w' ? RH : TH) / 2;
const cardBottom = (c: Card) => rowTop(c.row) + (c.kind === 'w' ? RH : TH);
const local = (c: Card) => (c.kind === 'w' ? { w: 1920, h: 1080, k: CW / 1920 } : { w: 1080, h: 1920, k: CW / 1080 });
/** A point on the wall from arc length u and height y. */
const onWall = (u: number, y: number): V3 => [R * Math.sin(u / R), y, R - R * Math.cos(u / R)];
const deg = (r: number) => (r * 180) / Math.PI;
const cardPos = (c: Card) => onWall(colU(c.col), cardY(c));
const byId = (id: string) => CARDS.find((c) => c.id === id)!;

// ---- the camera -------------------------------------------------------------------------------------------------

interface Key { f: number; u: number; y: number; d: number; yo?: number; p?: number; hold?: boolean }

/** The camera pose that frames card `id` exactly: head on, the card 1:1 with the frame. */
const full = (f: number, id: string): Key => {
  const c = byId(id);
  return { f, u: colU(c.col), y: cardY(c), d: FOCAL * local(c).k, hold: true };
};

// sequence frames (take time - 9.90 s, 30 fps): chart 51, numbers 64, story 82, place 157, dives 176, wall 244,
// work 259, app 300, every screen 317
const KEYS: Key[] = [
  full(0, 'studio'),
  { f: 20, u: colU(1) + 230, y: -170, d: 1450, yo: -5, p: 1.5 },
  { f: 35, u: colU(2) + 170, y: -160, d: 1250, yo: -3.5, p: 1 },
  full(55, 'donut'),
  full(118, 'donut'),
  { f: 146, u: colU(4) + 40, y: -10, d: 1750, yo: 7, p: -2.5 },
  full(175, 'flyover'),
  full(219, 'flyover'),
  { f: 254, u: -40, y: 150, d: 3350, yo: -2.2, p: -3 },
  { f: 281, u: 40, y: 170, d: 2750, yo: 1.4, p: -2.2 },
  full(304, 'three-phone'),
  full(LIBRARY_FRAMES, 'three-phone'),
];

/** Cubic Hermite through the keys: zero slope at holds, a monotone Catmull-Rom slope through pass keys. */
const spline = (f: number, pick: (k: Key) => number): number => {
  const ks = KEYS;
  if (f <= ks[0]!.f) return pick(ks[0]!);
  if (f >= ks[ks.length - 1]!.f) return pick(ks[ks.length - 1]!);
  const slope = (i: number) => {
    const k = ks[i]!;
    if (k.hold || i === 0 || i === ks.length - 1) return 0;
    const a = ks[i - 1]!, b = ks[i + 1]!;
    const m0 = (pick(k) - pick(a)) / (k.f - a.f);
    const m1 = (pick(b) - pick(k)) / (b.f - k.f);
    if (m0 * m1 <= 0) return 0; // a turning point: rest there (no overshoot)
    const m = (pick(b) - pick(a)) / (b.f - a.f);
    return Math.sign(m) * Math.min(Math.abs(m), 3 * Math.abs(m0), 3 * Math.abs(m1));
  };
  let i = 0;
  while (ks[i + 1]!.f < f) i += 1;
  const a = ks[i]!, b = ks[i + 1]!;
  const h = b.f - a.f;
  const t = (f - a.f) / h;
  const t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * pick(a) + (t3 - 2 * t2 + t) * h * slope(i) + (-2 * t3 + 3 * t2) * pick(b) + (t3 - t2) * h * slope(i + 1);
};

interface Pose { u: number; y: number; d: number; yo: number; p: number }
const poseAt = (f: number): Pose => ({
  u: spline(f, (k) => k.u),
  y: spline(f, (k) => k.y),
  d: Math.exp(spline(f, (k) => Math.log(k.d))),
  yo: spline(f, (k) => k.yo ?? 0),
  p: spline(f, (k) => k.p ?? 0),
});

export const camAt = (f: number): Cam => {
  const q = poseAt(f);
  // a little bank into lateral moves (screen speed of the target along the wall)
  const du = (poseAt(f + 0.5).u - poseAt(f - 0.5).u) * (FOCAL / q.d);
  // no bank as the camera settles onto a card (a full-frame landing is exactly square)
  const settle = clamp((q.d / (FOCAL * (CW / 1920)) - 1) / 0.4);
  return { yaw: deg(q.u / R) + q.yo, pitch: q.p, roll: clamp(-du * 0.02, -1.2, 1.2) * settle, dist: q.d, focal: FOCAL, target: onWall(q.u, q.y) };
};

/** Screen speed (px per frame) of a few points round what the camera looks at. */
export const speedAt = (f: number) => {
  const a = camAt(f - 0.5), b = camAt(f + 0.5);
  const half = (camAt(f).dist * 960) / FOCAL;
  const t = camAt(f).target;
  const probes: V3[] = [t, [t[0] - half * 0.5, t[1], t[2]], [t[0] + half * 0.5, t[1], t[2]], [t[0], t[1] - half * 0.3, t[2]], [t[0], t[1] + half * 0.3, t[2]]];
  let top = 0;
  for (const p of probes) {
    const pa = projectPoint(p, a), pb = projectPoint(p, b);
    top = Math.max(top, Math.hypot(pb.x - pa.x, pb.y - pa.y));
  }
  return top;
};

const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// ---- drawing ----------------------------------------------------------------------------------------------------

// the reflection fades out over about 150 world px below the floor line, whatever the card's height
/** The engine flips a layer with scaleY (SCENE.md transform); the TS props lack it. */
const FLIP = { scaleY: -1 } as {};
const reflect = (kind: Kind) => {
  const a = 1 - 150 / (kind === 'w' ? RH : TH);
  return { gradient: linearGradient([[0, '#ffffff00'], [a, '#ffffff00'], [1, '#ffffffcc']]) };
};
const CardFace: React.FC<{ c: Card; id: string; w: number; h: number; r: number; frame: number; mirror?: boolean }> = ({ c, id, w, h, r, frame, mirror }) => {
  const mask = mirror ? reflect(c.kind) : undefined;
  const clip = r > 0.5 ? { kind: 'path' as const, d: rrPath(w, h, r) } : undefined;
  if (c.still) return <Image id={`${id}-v`} src={staticFile(c.src)} width={w} height={h} fit="cover" clip={clip} mask={mask} />;
  // the camera's motion blur samples sub-frames (frame +- 0.25); the cards' own pictures stay on the frame's picture,
  // or a clip that changes picture inside the shutter strobes into two copies
  return (
    <Freeze frame={frame}>
      <Video id={`${id}-v`} src={staticFile(c.src)} width={w} height={h} fit="cover" muted loop={c.loop} trimBefore={c.loop ? c.off : 0} clip={clip} mask={mask} />
    </Freeze>
  );
};

export const Library: React.FC = () => {
  const f = useCurrentFrame();
  const cam = camAt(f);
  const halfW = (cam.dist * 960) / FOCAL; // half the frame's width in world units at the target
  // how close the frame is to a card held full frame (0 out in the library, 1 on the card)
  const fullness = smooth(0.62, 0.98, (FOCAL * (CW / 1920)) / cam.dist);

  const items: (Item & { card: Card; mirror?: boolean })[] = [];
  for (const c of CARDS) {
    const L = local(c);
    const pos = cardPos(c);
    const orient: M3 = rotY(-deg(colU(c.col) / R));
    items.push({ key: c.id, pos, orient, photo: 0, w: L.w, h: L.h, scale: L.k, card: c });
    // its reflection in the floor (only the bottom row is close enough to the floor to show one)
    if (cardBottom(c) > WALL_H / 2 - 1) items.push({ key: `${c.id}-m`, pos: [pos[0], 2 * FLOOR - pos[1], pos[2]], orient, photo: 0, w: L.w, h: L.h, scale: L.k, card: c, mirror: true });
  }
  const placed = project(items, cam);
  // the floor: a plane of soft light pooled under the middle of the wall, seen through the same camera
  const floorItem: Item = { key: 'floor', pos: [0, FLOOR, 900], orient: rotX(90), photo: 0, w: 7000, h: 3400, scale: 1 };
  const [floor] = project([floorItem], cam);
  const speed = speedAt(f);
  const blurOn = speed > 14;

  // light: the card the camera looks at is lit, the light falls off with distance across the wall
  const tgt = cam.target;
  const lightR = Math.max(halfW, 380);
  const lightOf = (pos: V3) => {
    const d = Math.hypot(pos[0] - tgt[0], (pos[1] - tgt[1]) * 1.3, pos[2] - tgt[2]);
    return 1 - 0.72 * smooth(lightR * 0.55, lightR * 1.9, d);
  };
  // a soft back light behind the wall, where the camera looks
  const glow = projectPoint(onWall(poseAt(f).u * 0.6, -60), cam);
  const glowR = Math.min(2600, 1500 * glow.s * 2.2);

  return (
    <Layer id="lib" effects={fullness < 0.98 ? [grain(0.03 * (1 - fullness), { seed: 7, size: 1.2, animate: true, monochrome: true })] : []}>
      <Rect id="bg" width={W} height={H} fill="#060708" />
      <Layer id="shutter" motionBlur={blurOn ? { samples: speed > 60 ? 12 : 8, shutter: 0.5 } : undefined}>
        <Rect id="backlight" x={glow.x - glowR} y={glow.y - glowR * 0.55} width={glowR * 2} height={glowR * 1.1}
          fill={radialGradient([[0, '#1a1c22'], [0.55, '#0c0d10'], [1, '#06070800']])} opacity={1 - fullness} />
        <Camera perspective={FOCAL} />
        {floor ? (
          <Layer id="floor" x={floor.sx} y={floor.sy} anchorX={floorItem.w / 2} anchorY={floorItem.h / 2} scale={floor.s} rotateX={floor.rx} rotateY={floor.ry} rotation={floor.rz} opacity={1 - fullness}>
            <Rect id="floor-r" width={floorItem.w} height={floorItem.h} fill={radialGradient([[0, '#15171c'], [0.45, '#0b0c0f'], [1, '#06070800']], { cx: 0.5, cy: 0.18, r: 0.55 })} />
          </Layer>
        ) : null}
        {placed.map((p) => {
          const it = p.item as (typeof items)[number];
          const c = it.card;
          const sc = p.s * (it.scale ?? 1);
          if (sc < 0.004) return null;
          // corners: about 7 px on screen in the library, square as the card becomes the frame
          const r = Math.min(46, 7 / Math.max(sc, 0.05)) * (1 - smooth(0.55, 0.985, sc));
          const lit = lightOf(it.pos);
          const id = `k-${it.key}`;
          if (it.mirror) {
            const fade = 0.32 * (1 - fullness);
            if (fade < 0.01) return null;
            return (
              <Layer key={id} id={id} x={p.sx} y={p.sy} anchorX={it.w / 2} anchorY={it.h / 2} scale={sc} {...FLIP}
                rotateX={p.rx} rotateY={p.ry} rotation={p.rz} opacity={fade * lit}>
                <CardFace c={c} id={id} w={it.w} h={it.h} r={r} frame={Math.round(f)} mirror />
              </Layer>
            );
          }
          return (
            <Layer key={id} id={id} x={p.sx} y={p.sy} anchorX={it.w / 2} anchorY={it.h / 2} scale={sc}
              rotateX={p.rx} rotateY={p.ry} rotation={p.rz}>
              <CardFace c={c} id={id} w={it.w} h={it.h} r={r} frame={Math.round(f)} />
              {lit < 0.995 ? <Rect id={`${id}-shade`} width={it.w} height={it.h} radius={r} fill="#040506" opacity={1 - lit} /> : null}
            </Layer>
          );
        })}
      </Layer>
      {/* lens: a slight vignette (and the grain above) in the library, gone when a card is the frame */}
      <Rect id="vignette" width={W} height={H} opacity={0.85 * (1 - fullness)}
        fill={radialGradient([[0, '#00000000'], [0.62, '#00000000'], [1, '#000000b0']], { r: 0.75 })} />
    </Layer>
  );
};

registerRoot(() => <Composition id="Library" component={Library} durationInFrames={LIBRARY_FRAMES} fps={30} width={W} height={H} />);
