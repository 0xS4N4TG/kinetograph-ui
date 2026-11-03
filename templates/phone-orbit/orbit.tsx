// The chat bubbles, avatars and icon chips that pop in around the phone (frames 78 to 104) and then hold.
// Each group scales up about its own centre with a short spring; positions are canvas pixels.

import React from 'react';
import { spring } from 'remotion';
import { measureText } from '@remotion/layout-utils';
import { Ellipse, Layer, Path, Text } from '@kinetographdev/core';
import { Avatar, Flame, Heart, HeartEyes, Rocket, srcOf } from './art.js';
import { FPS, stroke } from './lib.js';
import type { PhoneOrbitProps } from './props.js';

const BUBBLE_H = 54;

/** scale of a group popping in at `start`: up past 1 by about 20% and back (measured on the reference) */
const popScale = (frame: number, start: number) => {
  if (frame < start) return 0;
  return spring({ frame: frame - start, fps: FPS, config: { damping: 18, stiffness: 400, mass: 1 } });
};

const Pop: React.FC<{ frame: number; at: [number, number]; start: number; children: React.ReactNode }> = ({ frame, at, start, children }) => {
  const s = popScale(frame, start);
  if (s <= 0.001) return null;
  return (
    <Layer x={at[0]} y={at[1]} scale={s} opacity={Math.min(1, s * 3)}>
      <Layer x={-at[0]} y={-at[1]}>
        {children}
      </Layer>
    </Layer>
  );
};

/** a message bubble with a tail; (x, y) is its top-left, the tail sits on the `tail` side */
const Bubble: React.FC<{
  x: number;
  y: number;
  width: number;
  fill: string;
  tail: 'left' | 'right';
  children?: React.ReactNode;
}> = ({ x, y, width, fill, tail, children }) => (
  <Layer x={x} y={y}>
    <Path
      d={
        tail === 'left'
          ? 'M20 34C20 46 12 54 -3 57C12 60 28 55 36 44Z'
          : `M${width - 20} 34C${width - 20} 46 ${width - 12} 54 ${width + 3} 57C${width - 12} 60 ${width - 28} 55 ${width - 36} 44Z`
      }
      fill={fill}
    />
    <Path
      d={`M27 0H${width - 27}A27 27 0 0 1 ${width - 27} ${BUBBLE_H}H27A27 27 0 0 1 27 0Z`}
      fill={fill}
    />
    {children}
  </Layer>
);

const textWidth = (text: string, font: string, size: number, weight = 500) =>
  Math.ceil(measureText({ text, fontFamily: font, fontSize: size, fontWeight: String(weight) }).width);

const Chip: React.FC<{ cx: number; cy: number; d: number; children: React.ReactNode }> = ({ cx, cy, d, children }) => (
  <Layer x={cx} y={cy}>
    <Ellipse x={-d / 2} y={-d / 2} width={d} height={d} fill="#232326" stroke={stroke('#ffffff14', 2)} />
    {children}
  </Layer>
);

export const Orbit: React.FC<{ p: PhoneOrbitProps; frame: number }> = ({ p, frame }) => {
  const av = (i: number) => srcOf(p.avatars[i]);
  const ui = p.uiFont;
  const size = 23;
  const wBlueLeft = textWidth(p.replyBlueLeft, ui, size) + 52;
  const wBlueRight = textWidth(p.replyBlueRight, ui, size) + 52;
  const wGrey = textWidth(p.replyGrey, ui, size) + 52 + 36;
  const ty = (BUBBLE_H - size) / 2 - 2;
  return (
    <>
      {/* top left: avatar and an emoji bubble */}
      <Pop frame={frame} at={[611, 322]} start={79}>
        <Layer x={554} y={320}>
          <Avatar size={92} seed={0} src={av(0)} />
        </Layer>
        <Bubble x={614} y={302} width={104} fill={p.bubbleGrey} tail="left">
          <Layer x={34} y={BUBBLE_H / 2}>
            <HeartEyes size={30} />
          </Layer>
          <Layer x={72} y={BUBBLE_H / 2}>
            <Flame size={36} />
          </Layer>
        </Bubble>
      </Pop>

      <Pop frame={frame} at={[464, 476]} start={80}>
        <Chip cx={464} cy={476} d={86}>
          <Heart size={44} />
        </Chip>
      </Pop>

      {/* left: the blue question */}
      <Pop frame={frame} at={[609, 650]} start={77}>
        <Layer x={436} y={648}>
          <Avatar size={100} seed={1} src={av(1)} />
        </Layer>
        <Bubble x={508} y={624} width={wBlueLeft} fill={p.bubbleBlue} tail="left">
          <Text font={ui} weight={500} size={size} color="#fff" x={26} y={ty} lineHeight={1}>
            {p.replyBlueLeft}
          </Text>
        </Bubble>
      </Pop>

      <Pop frame={frame} at={[1394, 320]} start={79}>
        <Chip cx={1394} cy={320} d={56}>
          <Heart size={28} />
        </Chip>
      </Pop>

      {/* right: the blue answer */}
      <Pop frame={frame} at={[1301, 499]} start={78}>
        <Bubble x={1372 - wBlueRight} y={472} width={wBlueRight} fill={p.bubbleBlue} tail="right">
          <Text font={ui} weight={500} size={size} color="#fff" x={26} y={ty} lineHeight={1}>
            {p.replyBlueRight}
          </Text>
        </Bubble>
        <Layer x={1422} y={492}>
          <Avatar size={82} seed={2} src={av(2)} />
        </Layer>
      </Pop>

      <Pop frame={frame} at={[1516, 662]} start={77}>
        <Chip cx={1516} cy={662} d={90}>
          <Rocket size={40} />
        </Chip>
      </Pop>

      {/* lower right: the grey reply */}
      <Pop frame={frame} at={[1218, 760]} start={84}>
        <Bubble x={1270 - wGrey} y={696} width={wGrey} fill={p.bubbleGrey} tail="left">
          <Text font={ui} weight={500} size={size} color="#17171a" x={26} y={ty} lineHeight={1}>
            {p.replyGrey}
          </Text>
          <Layer x={wGrey - 36} y={BUBBLE_H / 2}>
            <Flame size={36} />
          </Layer>
        </Bubble>
        <Layer x={1332} y={780}>
          <Avatar size={88} seed={3} src={av(3)} />
        </Layer>
      </Pop>
    </>
  );
};
