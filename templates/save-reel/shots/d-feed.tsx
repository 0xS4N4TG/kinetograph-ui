// The reminder feed of shots 12 to 14 as one world: three posts down a pale page column on black, a camera that
// scrolls down them, pushes into the last picture, then tilts up to its header under a spotlight. Shots 12, 13
// and 14 each draw this world for their own frames (by reference frame number), so the camera never cuts.

import React from 'react';
import { Ellipse, Layer, Rect, blur, brightness, glow, insetShadow, radialGradient } from '@kinetographdev/core';
import { measureText } from '@remotion/layout-utils';
import { Spotlight } from '../../../kit/core/backgrounds.js';
import { Cam, H, Ink, PAPER, PEN, W, YELLOW_INK, glide, handLine, InkLines, keys, ramp } from '../lib.js';
import type { Media } from '../lib.js';
import { mediaSrc, photoSrc } from '../lib.js';
import { POST, PostCard, Tag } from '../post.js';
import { BUTTON, Editor, Golden, Hills } from './d-pictures.js';

// card origins (world y) and picture heights
const C1 = 0;
const C2 = 530;
const C3 = 1084;
const IMG = 330;
const IMG3 = 480;

// camera marks, measured on the reference (world point at the canvas centre, and magnification); from 744 on they
// are measured on the last post's header (the width, left edge and baseline of the name)
const CAM_Y: [number, number][] = [
  [447, -330], // pre-roll (shot 12 starts at 447, hidden): the rise is already at speed on 450
  [450, -167],
  [454, 19],
  [458, 120],
  [466, 233],
  [474, 299],
  [480, 388],
  [486, 547],
  [492, 673],
  [498, 738],
  [520, 794],
  [536, 822],
  [542, 884],
  [548, 988],
  [554, 1159],
  [560, 1271],
  [566, 1325],
  [580, 1367],
  [640, 1380],
  [700, 1357],
  [744, 1288],
  [752, 1270],
  [760, 1238],
  [780, 1180],
  [800, 1155],
  [830, 1140],
  [870, 1135],
  [905, 1132],
  [945, 1130],
];
const CAM_X: [number, number][] = [
  [450, 240],
  [566, 240],
  [640, 238],
  [700, 228],
  [744, 217],
  [752, 220],
  [760, 212],
  [780, 196],
  [800, 188],
  [830, 184],
  [870, 186],
  [905, 183],
  [945, 182],
];
const ZOOM: [number, number][] = [
  [450, 1.47],
  [566, 1.47],
  [580, 1.5],
  [640, 1.57],
  [700, 1.71],
  [744, 2.02],
  [752, 2.05],
  [760, 2.19],
  [780, 2.5],
  [800, 2.68],
  [830, 2.76],
  [870, 2.79],
  [945, 2.82],
];
// half the page column's width (world px): it narrows as the feed gives way to the photo
const COLUMN: [number, number][] = [
  [450, 380],
  [466, 380],
  [486, 354],
  [492, 331],
  [520, 324],
  [548, 296],
  [566, 278],
  [580, 270],
];
// the page's light: full, dimmed to black round the photo, back up under the spotlight
const LIGHT: [number, number][] = [
  [560, 1],
  [566, 0.82],
  [580, 0.45],
  [612, 0.06],
  [700, 0.06],
  [744, 0.5],
  [760, 0.8],
  [790, 1],
];

const SUBTITLES: [number, number, string][] = [
  [457, 480, '[ That reference ]'],
  [480, 533, '[ That tutorial ]'],
  [533, 551, '[ Orrrr... ]'],
  [551, 775, '[ that photo of him? ]'],
];

const grey = (v: number) => {
  const c = Math.round(236 * v);
  return `rgb(${c},${c},${c})`;
};

/** id: the camera layer's, unique per shot (the shots overlap and each draws this scene) */
export const FeedWorld: React.FC<{ frame: number; media: Media; id: string }> = ({ frame: f, media, id }) => {
  const cy = glide(f, CAM_Y);
  const cx = glide(f, CAM_X);
  const z = glide(f, ZOOM);
  const half = glide(f, COLUMN);
  const light = glide(f, LIGHT);

  // card 1: the picture pushes in on the Button, the hand presses it
  const pz = keys(f, [
    [470, 1],
    [473, 3.2],
    [480, 4.1],
    [486, 4.3],
    [492, 4.3],
    [496, 1],
  ]);
  const pan = keys(f, [
    [470, 0],
    [474, 45],
    [480, -67],
    [486, -80],
    [492, -80],
    [496, 0],
  ]);
  // the hand rises from below the Button and presses it (picture px from the Button's centre, measured at 478-486;
// a little higher early on, as the picture's clip would cut the fingertip where the reference's cursor overhangs it)
  const handAt: [number, number] = [
    BUTTON.x +
      keys(f, [
        [472, -90],
        [478, -52],
        [481, -28],
        [484, -12],
        [486, -2],
      ]),
    BUTTON.y +
      keys(f, [
        [472, 56],
        [478, 38],
        [481, 33],
        [484, 27],
        [486, 23],
      ]),
  ];
  const chip = ramp(f, 466, 470, 0, 1);
  const press = f < 487 ? ramp(f, 485, 487, 0, 1) : ramp(f, 489, 492, 1, 0);

  // card 3: the photo glows on the dark page, then darkens under the header's spotlight
  const glowAmt = ramp(f, 566, 640, 0, 1) * ramp(f, 730, 790, 1, 0);
  const photoLight = ramp(f, 740, 800, 1, 0.62);

  const sub = SUBTITLES.find(([a, b]) => f >= a && f < b);
  const subFade = sub
    ? Math.min(ramp(f, sub[0], sub[0] + 2, 0, 1), sub[2].startsWith('[ that') ? ramp(f, 735, 772, 1, 0) : 1)
    : 0;

  return (
    <Layer>
      <Rect width={W} height={H} fill="#000" />
      <Cam id={id} x={cx} y={cy} zoom={z} blur={0.7}>
        <Rect x={240 - half} y={-2000} width={half * 2} height={6000} fill={grey(light)} />
        <Layer y={C1}>
          <PostCard
            sub="Reminder time: "
            subStrong="Tomorrow 1:34 PM"
            imageHeight={IMG}
            image={
              <Hills h={IMG} zoom={pz} pan={pan} chip={chip} press={press} hand={handAt} src={mediaSrc(media.hills) ?? photoSrc('hills.jpg')} />
            }
            likes="18.9K"
            comments="214"
            reposts="672"
            save="reminderFilled"
            caption={['Every reference I keep, one place...']}
          />
        </Layer>
        <Layer y={C2} effects={f > 740 ? [blur(ramp(f, 740, 790, 0, 3))] : undefined}>
          <PostCard
            sub="Reminder time: "
            subStrong="Next week"
            imageHeight={IMG}
            image={<Editor h={IMG} src={mediaSrc(media.editor)} />}
            likes="5.3k"
            comments="109"
            reposts="15"
            save="reminderFilled"
            caption={["The motion tutorial I said I'd post!", 'Full walkthrough is up on my channel ...(:', '...']}
          />
        </Layer>
        <Layer y={C3}>
          <PostCard
            name="yourhandle"
            darkAvatar
            sub="Reminder time: "
            subStrong="Every day ( forever )"
            imageHeight={IMG3}
            image={
              <Layer effects={[brightness(photoLight)]}>
                <Golden h={IMG3} push={ramp(f, 560, 760, 1, 1.08, (t) => t)} src={mediaSrc(media.photo) ?? photoSrc('photo.jpg')} />
              </Layer>
            }
            likes=""
            comments=""
            reposts=""
            save="reminderFilled"
          />
          {glowAmt > 0.01 && (
            <Layer y={POST.header} opacity={glowAmt}>
              <Rect
                width={POST.width}
                height={IMG3}
                radius={POST.radius}
                fill="rgba(0,0,0,0)"
                stroke={{ color: '#ffd47a', width: 3 }}
                effects={[blur(4), glow({ radius: 26, color: '#e9a23c', intensity: 1.6 })]}
              />
              <Rect
                width={POST.width}
                height={IMG3}
                radius={POST.radius}
                fill="rgba(255,200,110,0.02)"
                effects={[insetShadow({ blur: 14, spread: 2, color: '#ffd88acc' })]}
              />
            </Layer>
          )}
        </Layer>
      </Cam>

      {/* the photo's vignette (shot 13), then the spotlight on the header (shot 14) */}
      <Rect
        width={W}
        height={H}
        fill={radialGradient([
          [0.55, 'rgba(0,0,0,0)'],
          [1, 'rgba(0,0,0,0.85)'],
        ])}
        opacity={ramp(f, 566, 620, 0, 1) * ramp(f, 740, 770, 1, 0)}
      />
      {/* a wide oval of light centred above the header; outside a narrower, taller oval round it everything goes to
          black, the card's left edge and Follow side included */}
      <Spotlight light={{ x: 500, y: 190, rx: 600, ry: 450 }} edge={{ x: 520, y: 260, rx: 470, ry: 620 }} opacity={ramp(f, 744, 800, 0, 1)} />

      {sub && (
        <Tag text={sub[2]} x={W / 2 - (sub[2].length * 23 * 0.52 + 16) / 2} y={708} size={23} opacity={subFade} />
      )}
    </Layer>
  );
};

/** The yellow note on the photo, and the fade to black (shot 14). Screen pixels, measured on the reference at 870:
 *  a thin pen print fitted to 240 px, then one long rising underline and a zigzag back under its right half. */
const NOTE_W = 240;
const NOTE_TEXT = 'Forever$';

export const ForeverNote: React.FC<{ frame: number }> = ({ frame: f }) => {
  const size = (NOTE_W / measureText({ text: NOTE_TEXT, fontFamily: PEN, fontSize: 100, fontWeight: '400' }).width) * 100;
  const underline = handLine(
    [
      [124, 590],
      [236, 571],
      [344, 547],
    ],
    'forever-underline',
    1.6,
  );
  const zigzag = handLine(
    [
      [344, 547],
      [226, 586],
      [298, 579],
      [232, 600],
      [306, 606],
    ],
    'forever-zigzag',
    1.6,
  );
  return (
    <Layer>
      <Layer effects={[glow({ radius: 5, color: '#f3e33c', intensity: 0.9 })]}>
        <Ink text={NOTE_TEXT} hand="pen" frame={f} start={798} end={821} x={118} y={552} size={size} color={YELLOW_INK} rotation={-10} />
        <InkLines strokes={[underline, zigzag]} progress={ramp(f, 821, 831, 0, 1, (t) => t)} color={YELLOW_INK} width={3.2} />
      </Layer>
      {/* a touch darker overall (from 770 the reference's frames average 67/255, ours 78), then the fade to black;
          it runs on under the end card's first frames */}
      <Rect width={W} height={H} fill="#000" opacity={ramp(f, 760, 790, 0, 0.14) + 0.86 * ramp(f, 900, 944, 0, 1, (t) => t)} />
    </Layer>
  );
};
