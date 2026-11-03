// The collage wall: every card's size, stacking order and path across the shot.
//
// Authoring space is the reference's 1280x720. A card has a rest rectangle (where it sits when the wall has settled,
// frame 40, with the camera at rest) and a path: keys of [frame, centre x, centre y, scale] on the screen. The paths
// of the cards that stay in view come from `tracks.ts`; the cards that fly out of the right of the frame during the
// burst are keyed here; the cards at the far left follow the wall's pan with their own parallax.

import { random } from 'remotion';
import type { CardKind } from './cards.js';
import { glide, lerpKeys } from './lib.js';
import { TRACKS } from './tracks.js';
import type { Key } from './tracks.js';

export interface WallCard {
  id: string;
  kind: CardKind;
  /** Rest rectangle: x, y, w, h. */
  rect: [number, number, number, number];
  /** Screen path. Empty: the card follows the wall's pan (`follow`). */
  keys: Key[];
  /** First frame the card is on screen. */
  from: number;
  /** Parallax of a follower against the wall's pan. */
  follow: number;
  /** The card leaves the frame at the end of its keys: carry on at the last speed. */
  exits?: boolean;
  /** Starts tilted in 3D and flattens (the burst's cards). */
  tilts?: boolean;
  /** Frames from which the follower overrides the pan (doc and input fly out faster at the whip). */
  whip?: Key[];
}

// ---- the wall's pan, from the settled card whose path is cleanest (the terminal card) -----------------------------

const CODE: Key[] = [...TRACKS.code, [69, 986, 275, 1]];
export const REST_CODE = { x: 586, y: 275 };

/** How far the settled wall is from its rest position on a frame (x), and its scale. */
export function pan(f: number): { dx: number; s: number } {
  const ks = CODE;
  const last = ks[ks.length - 1];
  if (f >= last[0]) return { dx: last[1] - REST_CODE.x, s: 1 };
  const first = ks[0];
  if (f <= first[0]) {
    const v = (ks[1][1] - first[1]) / (ks[1][0] - first[0]);
    return { dx: first[1] - v * (first[0] - f) - REST_CODE.x, s: first[3] };
  }
  const xs: [number, number][] = ks.map((k) => [k[0], k[1]]);
  const ss: [number, number][] = ks.map((k) => [k[0], k[3]]);
  return { dx: glide(f, xs) - REST_CODE.x, s: glide(f, ss) };
}

export interface Pose {
  x: number;
  y: number;
  s: number;
}

function interp(keys: Key[], f: number): Pose {
  const xs: [number, number][] = keys.map((k) => [k[0], k[1]]);
  const ys: [number, number][] = keys.map((k) => [k[0], k[2]]);
  const ss: [number, number][] = keys.map((k) => [k[0], k[3]]);
  return { x: glide(f, xs), y: glide(f, ys), s: glide(f, ss) };
}

/** Where the card is on `f`, or null when it is not on screen yet. */
export function poseAt(card: WallCard, f: number): Pose | null {
  if (f < card.from) return null;
  if (card.whip && f >= card.whip[0][0]) return interp(card.whip, f);
  const rcx = card.rect[0] + card.rect[2] / 2;
  const rcy = card.rect[1] + card.rect[3] / 2;
  const keys = card.keys;
  if (!keys.length) {
    const p = pan(f);
    return { x: rcx + p.dx * card.follow, y: rcy, s: p.s };
  }
  const first = keys[0];
  const last = keys[keys.length - 1];
  if (f < first[0]) {
    // before its first key: slide in along the first segment's speed (the cards enter from the left edge)
    const n = keys[1];
    const vx = (n[1] - first[1]) / (n[0] - first[0]);
    const vy = (n[2] - first[2]) / (n[0] - first[0]);
    return { x: first[1] - vx * (first[0] - f), y: first[2] - vy * (first[0] - f), s: first[3] };
  }
  if (f > last[0]) {
    if (card.exits) {
      const p = keys[keys.length - 2];
      const vx = (last[1] - p[1]) / (last[0] - p[0]);
      const vy = (last[2] - p[2]) / (last[0] - p[0]);
      return { x: last[1] + vx * (f - last[0]), y: last[2] + vy * (f - last[0]), s: last[3] };
    }
    const dx = pan(f).dx - pan(last[0]).dx;
    return { x: last[1] + dx * card.follow, y: last[2], s: last[3] };
  }
  return interp(keys, f);
}

// ---- the cards ---------------------------------------------------------------------------------------------------

const k = (f: number, x: number, y: number, s: number): Key => [f, x, y, s];

/** The burst opens as a small cluster that is the f18 arrangement scaled about its middle. This builds the keys for
 *  frames 15 to 17 from a card's position and scale on frame 18. */
const CLUSTER_C18 = { x: 710, y: 383 };
const CLUSTER = [
  { f: 15, cx: 549, cy: 392, g: 0.195, sc: 0.28 },
  { f: 16, cx: 573, cy: 382, g: 0.335, sc: 0.43 },
  { f: 17, cx: 629, cy: 364, g: 0.657, sc: 0.78 },
];
function early(x18: number, y18: number, s18: number, from = 15): Key[] {
  return CLUSTER.filter((c) => c.f >= from).map((c) =>
    k(c.f, c.cx + c.g * (x18 - CLUSTER_C18.x), c.cy + c.g * (y18 - CLUSTER_C18.y), s18 * c.sc),
  );
}

function card(
  id: string,
  kind: CardKind,
  rect: [number, number, number, number],
  keys: Key[],
  from: number,
  extra: Partial<WallCard> = {},
): WallCard {
  return { id, kind, rect, keys, from, follow: 1, ...extra };
}

const t = (name: string): Key[] => TRACKS[name];

export const WALL: WallCard[] = [
  // the far left: seen as the camera whips off to the right
  card('serif', 'serif', [-108, -40, 153, 258], [], 21, { follow: 1.24 }),
  card('strip', 'strip', [-109, 250, 92, 220], [], 21, { follow: 1 }),
  card('welcome', 'welcome', [-439, 88, 330, 167], [], 21, { follow: 1 }),
  card('automated', 'automated', [-284, 255, 301, 215], [], 21, { follow: 1 }),
  card('company', 'company', [-266, 478, 190, 144], [], 21, { follow: 1 }),
  card('meet', 'meet', [-420, 529, 176, 119], [], 21, { follow: 1 }),
  // the settled view
  card('doc', 'doc', [52, -40, 449, 253], t('doc'), 21, {
    whip: [k(66, 316, 86.5, 1), k(67, 462, 86.5, 1), k(68, 891.5, 86.5, 1), k(69, 1400, 86.5, 1)],
  }),
  card('docbase', 'docbase', [52, 213, 449, 25], t('docbase'), 21),
  card('bar', 'bar', [5, 425, 465, 34], [], 22, { whip: [k(68, 857.5, 442, 1), k(69, 1371.5, 442, 1)] }),
  card('chat', 'chat', [168, 260, 236, 190], t('chat'), 22),
  card('input', 'input', [-112, 230, 269, 192], [], 22, {
    whip: [k(67, 212, 326, 1), k(68, 642, 326, 1), k(69, 1156, 326, 1)],
  }),
  card('clips', 'clips', [-59, 466, 520, 280], t('clips'), 22),
  card('chip', 'chip', [574, -30, 241, 175], [k(19, -30, 55, 0.6), k(20, 110, 55, 0.66), ...t('chip')], 19),
  card('caption', 'caption', [917, -42, 316, 205], [], 14),
  card('tile', 'tile', [800, 35, 126, 175], [], 18),
  card('mini', 'mini', [927, 78, 106, 151], [], 18),
  card('code', 'code', [433, 160, 307, 230], t('code'), 19),
  card('ring', 'ring', [820, 197, 352, 263], [], 17),
  card('panel', 'panel', [819, 277, 162, 170], t('panel'), 17),
  card('squares', 'squares', [595, 345, 225, 153], t('squares'), 20),
  card('avatars', 'avatars', [680, 657, 355, 68], [], 17),
  card('empty', 'empty', [368, 510, 330, 178], t('empty'), 22),
  card('ship', 'ship', [671, 437, 309, 223], t('ship'), 20),
  card('built', 'built', [1240, 430, 340, 270], [], 16, {}),
  card('sunset', 'sunset', [1041, 500, 247, 250], t('sunset'), 16),
  // the cards that burst out and leave through the right of the frame
  card('stack', 'stack', [568, 62, 280, 188], [], 14, { exits: true, tilts: true }),
  card('plan', 'note', [918, 200, 129, 138], [], 14, { exits: true, tilts: true }),
  card('grad', 'grad', [1055, 157, 148, 141], [], 14, { exits: true, tilts: true }),
  card('command', 'command', [695, 225, 250, 230], [], 14, { exits: true, tilts: true }),
  card('nature', 'nature', [968, 335, 215, 237], [], 14, { exits: true, tilts: true }),
  card('list', 'list', [843, 485, 190, 148], [], 14, { exits: true, tilts: true }),
];

// ---- hand-keyed paths ----------------------------------------------------------------------------------------------

function set(id: string, keys: Key[], extra: Partial<WallCard> = {}) {
  const c = WALL.find((w) => w.id === id)!;
  c.keys = keys;
  Object.assign(c, extra);
}

// the cards that fly out of the right (positions read off the frames; frame 18 is the reference arrangement)
set('stack', [...early(708, 156, 1), k(18, 708, 156, 1), k(19, 819, 122, 1.12), k(20, 939, 98, 1.14), k(21, 1010, 99, 1.15), k(22, 1148, 95, 1.08), k(23, 1215, 95, 1.05), k(24, 1270, 92, 1.03), k(26, 1323, 85, 1), k(28, 1345, 85, 1), k(30, 1355, 85, 1), k(33, 1370, 85, 1)], { exits: false });
set('command', [...early(820, 340, 1), k(18, 820, 340, 1), k(19, 965, 328, 1.19), k(20, 1115, 321, 1.3), k(21, 1182, 325, 1.3), k(22, 1250, 325, 1.3), k(23, 1420, 325, 1.3)]);
set('plan', [...early(982, 269, 1), k(18, 982, 269, 1), k(19, 1220, 216, 0.96), k(20, 1330, 200, 0.96)]);
set('grad', [...early(1129, 228, 1), k(18, 1129, 228, 1), k(19, 1250, 215, 1), k(20, 1340, 205, 1)]);
set('nature', [...early(1076, 454, 1), k(18, 1076, 454, 1), k(19, 1230, 450, 1.1), k(20, 1330, 450, 1.1)]);
set('list', [...early(938, 559, 1), k(18, 938, 559, 1), k(19, 1097, 578, 1.12), k(20, 1170, 590, 1.15), k(21, 1250, 590, 1.2), k(22, 1340, 590, 1.2)]);

// the cards that stay: arrangement at frame 18 and the way to their tracked paths
set('caption', [...early(485, 154, 0.82, 15), k(18, 485, 154, 0.82), k(19, 577, 97, 0.93), k(20, 699, 80, 0.98), k(22, 866, 60, 1.05), ...t('caption')]);
set('built', [...early(598, 540, 0.77, 16), k(18, 598, 540, 0.77), k(19, 688, 540, 0.93), k(20, 800, 545, 1), k(21, 860, 546, 1.07), k(22, 1024, 545, 1), k(23, 1110, 548, 1), k(24, 1194, 552, 1), k(26, 1298, 558, 1), k(28, 1346, 562, 1), k(31, 1385, 565, 1), k(36, 1405, 565, 1), k(40, 1410, 565, 1), k(45, 1410, 565, 1)]);
set('sunset', [...early(436, 582, 0.7, 16), ...t('sunset')]);
set('ring', [...early(591, 340, 0.6, 17), k(18, 591, 340, 0.6), k(19, 686, 334, 0.75), k(20, 785, 332, 0.85), k(21, 865, 330, 0.85), k(24, 880, 329, 0.93), ...t('ringcard')]);
set('panel', [...early(412, 349, 0.73, 17), ...t('panel')]);
set('avatars', [...early(310, 672, 0.53, 17), k(18, 310, 672, 0.53), k(21, 425, 701, 0.66), k(22, 533, 696, 0.73), ...t('avatars')]);
set('mini', [k(18, 259, 203, 0.31), k(22, 484, 96, 0.5), ...t('mini')]);

// at the last frame of the whip the near cards have already left: these carry on out of the right of the frame
for (const id of ['code', 'squares', 'clips', 'avatars', 'panel', 'ring', 'sunset', 'docbase', 'built']) {
  const c = WALL.find((x) => x.id === id)!;
  c.whip = [k(69, c.rect[0] + c.rect[2] / 2 + 1500, c.rect[1] + c.rect[3] / 2, 1)];
}

// ---- per-card burst motion -------------------------------------------------------------------------------------------

export interface CardMotion {
  tiltX: number;
  tiltY: number;
}

/** Start tilt of a card (degrees), easing to flat over the first frames it is on screen. */
export function motionFor(i: number, seed: number): CardMotion {
  return {
    tiltX: (random(`x${seed}-${i}`) - 0.5) * 30,
    tiltY: (random(`y${seed}-${i}`) - 0.5) * 60,
  };
}

export { lerpKeys };
