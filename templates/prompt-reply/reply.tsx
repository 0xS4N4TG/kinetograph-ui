// Shot 2 (frames 110-299): the agent reply. Everything sits on one tall page that a camera scrolls up through; the
// activity rows tick in, then the status line, the serif reply, the brand chip, the table and the action icons fade up
// one after another. Positions are the settled page's (reference pixels); the camera adds its offset.

import React from 'react';
import { Layer, Rect, Text } from '@kinetographdev/core';
import { measureText } from '@remotion/layout-utils';
import { CameraGlyph, ICON, Icon, easeOutCubic, easeOutQuad, fadeAlpha, glide, line, mix, ramp, tracking } from './lib.js';
import type { Faces, PromptReplyProps } from './lib.js';

// camera offsets while the page scrolls up and left to its rest position (measured frame by frame)
const CAM_Y: [number, number][] = [
  [110, 179], [112, 162], [114, 146], [116, 135], [118, 124], [120, 114], [122, 99], [124, 86], [126, 74], [128, 66],
  [130, 59], [132, 53], [134, 46], [136, 39], [138, 33], [140, 28], [142, 24], [144, 23], [146, 21], [148, 19],
  [150, 17], [152, 14], [154, 13], [156, 11], [158, 9], [160, 8], [164, 6], [168, 5], [170, 4], [174, 3], [180, 2],
  [184, 1], [194, 0],
];
const CAM_X: [number, number][] = [
  [110, 24], [112, 23], [114, 20], [116, 18], [118, 15], [120, 12], [122, 11], [124, 10], [130, 7], [135, 5], [140, 3],
  [145, 2], [150, 1], [165, 0],
];

// when each piece arrives (frame, duration)
const T = {
  planStart: 110,
  renderStart: 122,
  status: [130.5, 18],
  reply: [139.5, 15],
  chip: [153.5, 12],
  head: [166, 26],
  cell: [[188.5, 12], [199.5, 11], [207.5, 11]],
  icons: [221.2, 17.5],
} as const;

const LEFT = 61;
const COLS = [62, 464, 758];

/** a text box placed by where the top of its ink should land */
const Put: React.FC<{
  id: string;
  x: number;
  inkTop: number;
  size: number;
  font: string;
  weight?: number;
  color: string;
  opacity?: number;
  lift: number; // how far the ink top sits below the text box's top, in em
  track?: boolean; // apply the reference's interface-type letter-spacing
  children: string;
}> = ({ id, x, inkTop, size, font, weight = 400, color, opacity = 1, lift, track, children }) => (
  <Layer id={id} x={x} y={inkTop - lift * size} opacity={opacity}>
    <Text id={`${id}-t`} font={font} size={size} weight={weight} color={color} chars={track ? (_c, i) => ({ x: i * tracking(size) }) : undefined}>
      {children}
    </Text>
  </Layer>
);

const ActivityRow: React.FC<{
  id: string;
  y: number;
  text: string;
  start: number;
  f: number;
  faces: Faces;
  props: PromptReplyProps;
  size: number;
  opacity?: number;
}> = ({ id, y, text, start, f, faces, props, size, opacity = 1 }) => {
  const { colors } = props;
  // the tile starts in the active colour and settles to white over ten frames
  const t = ramp(f, start, 10);
  return (
    <Layer id={id} y={y} opacity={opacity}>
      <Rect id={`${id}-tile`} x={61.7} y={0.6} width={33.4} height={33.4} radius={8} fill={mix(colors.active, colors.ink, t)} />
      <CameraGlyph id={`${id}-cam`} color="#1b1b1b" />
      <Put id={`${id}-label`} x={LEFT + 51.2} inkTop={11.6} size={size} font={faces.ui} color={colors.label} lift={0.3} track>
        {text}
      </Put>
    </Layer>
  );
};

export const ReplyShot: React.FC<{ f: number; props: PromptReplyProps; faces: Faces }> = ({ f, props, faces }) => {
  const { colors, table } = props;
  const camX = glide(f, CAM_X);
  const camY = glide(f, CAM_Y);
  // rows the camera has scrolled clean off the top are not drawn at all
  const offscreen = (y: number, h = 34) => y + h + camY < 0;

  // fades are timed on the reference's (sRGB) look; fadeAlpha converts each to the opacity that gives it here
  const fa = (a: number, color: string) => fadeAlpha(a, color, colors.background);
  const fade = (a: readonly [number, number], e = easeOutQuad) => ramp(f, a[0], a[1], e);
  const status = fa(fade(T.status, easeOutCubic), colors.status);
  const reply = fa(fade(T.reply), colors.ink);
  const chip = fa(fade(T.chip, easeOutCubic), colors.chipText);
  const head = fa(ramp(f, T.head[0], T.head[1], (t) => t * t * (3 - 2 * t)), colors.head);
  const cells = [fa(fade(T.cell[0]), colors.value), fa(fade(T.cell[1]), colors.cell), fa(fade(T.cell[2]), colors.link)];
  const icons = fa(ramp(f, T.icons[0], T.icons[1]), colors.icons);

  const brandW = measureText({ text: props.brand, fontFamily: faces.ui, fontSize: 14.3 }).width + Array.from(props.brand).length * tracking(14.3);
  const valueW = measureText({ text: table.row[0], fontFamily: faces.mono, fontSize: 18.6 }).width;
  const linkW = measureText({ text: table.row[2], fontFamily: faces.serif, fontSize: 21.6, fontWeight: 400 }).width;

  return (
    <Layer id="reply-shot" x={camX} y={camY}>
      {offscreen(-87) ? null : (
        <ActivityRow id="act1" y={-87} text={props.activities[0]} start={T.planStart} size={19.5} f={f} faces={faces} props={props} />
      )}
      {f >= T.renderStart && !offscreen(-2) ? (
        <Layer id="act2-wrap">
          {offscreen(-45, 35) ? null : <Rect id="connector" x={77} y={-45} width={2} height={35} fill={colors.line} />}
          <ActivityRow id="act2" y={-2} text={props.activities[1]} start={T.renderStart} size={20.5} f={f} faces={faces} props={props} />
        </Layer>
      ) : null}

      <Put id="status" x={62.2} inkTop={108.3} size={17.9} font={faces.ui} color={colors.status} opacity={status} lift={0.27} track>
        {props.status}
      </Put>
      <Put id="reply" x={61.3} inkTop={152.6} size={26.35} font={faces.serif} weight={600} color={colors.ink} opacity={reply} lift={0.2}>
        {props.reply}
      </Put>

      <Layer id="brand" opacity={chip}>
        <Rect
          id="brand-box"
          x={62.5}
          y={234.5}
          width={brandW + 32}
          height={26}
          radius={7}
          stroke={line({ color: colors.line, width: 1.3 })}
        />
        <Put id="brand-t" x={75.6} inkTop={243.4} size={14.3} font={faces.ui} color={colors.chipText} lift={0.27} track>
          {props.brand}
        </Put>
      </Layer>

      <Layer id="thead" opacity={head}>
        {table.head.map((h, i) => (
          <Put key={i} id={`th${i}`} x={COLS[i]} inkTop={295} size={24.6} font={faces.serif} weight={500} color={colors.head} lift={0.2}>
            {h}
          </Put>
        ))}
      </Layer>

      <Layer id="trow0" opacity={cells[0]}>
        <Rect id="value-box" x={62.5} y={332.5} width={valueW + 27} height={31} radius={6.5} stroke={line({ color: colors.line, width: 1.3 })} />
        <Put id="value-t" x={74.4} inkTop={338} size={18.6} font={faces.mono} color={colors.value} lift={0.27}>
          {table.row[0]}
        </Put>
      </Layer>
      <Put id="trow1" x={COLS[1] + 2} inkTop={342} size={20.7} font={faces.serif} weight={400} color={colors.cell} opacity={cells[1]} lift={0.2}>
        {table.row[1]}
      </Put>
      <Layer id="trow2" opacity={cells[2]}>
        <Put id="link-t" x={COLS[2]} inkTop={342} size={21.6} font={faces.serif} weight={400} color={colors.link} lift={0.2}>
          {table.row[2]}
        </Put>
        <Rect id="link-underline" x={COLS[2]} y={362} width={linkW} height={1.1} fill={colors.link} />
      </Layer>

      <Layer id="actions" opacity={icons}>
        {(['copy', 'speaker', 'up', 'down', 'dots'] as const).map((k, i) => (
          <Icon key={k} id={`ic-${k}`} d={ICON[k]} size={17} color={colors.icons} stroke={k === 'dots' ? 2.9 : 1.55} x={75 + i * 30 - 8.5 + (k === 'copy' ? 0.5 : 0)} y={398.5 - 8.5} />
        ))}
      </Layer>
    </Layer>
  );
};
