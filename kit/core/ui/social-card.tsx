// A generic social-feed post: header (avatar, name, a grey line, Follow, more), the picture, the action row (like,
// comment, repost, send, save) and the caption, in the taste's type and colours. No app's branding: the save icon is
// a slot. Laid out from (0, 0) in world pixels; every part's position is in SOCIAL_CARD so a shot can aim the camera
// at it.

import React from 'react';
import { measureText } from '@remotion/layout-utils';
import { Ellipse, Layer, Rect, Text, linearGradient } from '@kinetographdev/core';
import { line, rrect } from '../draw.js';
import { ICON, Icon } from '../icons.js';
import { useTaste } from '../taste.js';

export const SOCIAL_CARD = {
  width: 480,
  header: 64, // header height; the picture starts here
  imageHeight: 340,
  radius: 22,
  /** y of the action row's centre, given the picture height */
  actionsY: (imageHeight: number) => 64 + imageHeight + 30,
  /** y of the caption's first line */
  captionY: (imageHeight: number) => 64 + imageHeight + 58,
};

export interface SocialCardProps {
  name?: string;
  sub?: string; // the grey line under the name
  subStrong?: string; // its bold tail
  image: React.ReactNode; // drawn into a box SOCIAL_CARD.width x imageHeight, clipped to the rounded corners
  imageHeight?: number;
  likes?: string;
  comments?: string;
  reposts?: string;
  liked?: number; // 0..1: the heart fills red
  /** the save button: a bookmark outline, filled, nothing, or your own icon (24 units, drawn at 26 px) */
  save?: 'outline' | 'filled' | 'none' | React.ReactNode;
  saveScale?: number;
  caption?: string[]; // lines; the first starts with the name in bold
  captionOpacity?: number;
  darkAvatar?: boolean; // a plain black disc instead of the blank profile picture
  tag?: string; // a dark label on the caption ("[ That reference ]")
  tagX?: number;
  headerOpacity?: number;
  follow?: boolean; // the Follow button
}

export const Avatar: React.FC<{ size: number; dark?: boolean }> = ({ size, dark = false }) => {
  const taste = useTaste();
  return dark ? (
    <Ellipse width={size} height={size} fill="#111" />
  ) : (
    <Layer>
      <Ellipse width={size} height={size} fill={linearGradient(taste.avatarRing, { angle: 45 })} />
      <Ellipse x={2.5} y={2.5} width={size - 5} height={size - 5} fill={taste.canvas} />
      <Ellipse x={5} y={5} width={size - 10} height={size - 10} fill="#d9d9de" />
      <Ellipse x={size / 2 - 5} y={size / 2 - 7} width={10} height={14} fill="#7c7c84" />
    </Layer>
  );
};

export const SocialCard: React.FC<SocialCardProps> = ({
  name = 'yourhandle',
  darkAvatar = false,
  sub,
  subStrong,
  image,
  imageHeight = SOCIAL_CARD.imageHeight,
  likes = '2.1K',
  comments = '115',
  reposts = '50',
  liked = 0,
  save = 'outline',
  saveScale = 1,
  caption = [],
  captionOpacity = 1,
  tag,
  tagX = 170,
  headerOpacity = 1,
  follow = true,
}) => {
  const taste = useTaste();
  const UI = taste.fonts.ui;
  const w = SOCIAL_CARD.width;
  const ay = SOCIAL_CARD.actionsY(imageHeight);
  const cy = SOCIAL_CARD.captionY(imageHeight);
  return (
    <Layer>
      <Layer opacity={headerOpacity}>
        <Layer x={4} y={10}>
          <Avatar size={42} dark={darkAvatar} />
        </Layer>
        <Text font={UI} weight={700} size={17} color={taste.ink} x={58} y={sub ? 12 : 20}>
          {name}
        </Text>
        {sub && (
          <Text font={UI} weight={500} size={12.5} color={taste.muted} x={58} y={34}>
            {sub}
          </Text>
        )}
        {sub && subStrong && (
          <Text
            font={UI}
            weight={600}
            size={12.5}
            color={'#4a4a50'}
            x={58 + measureText({ text: sub, fontFamily: UI, fontSize: 12.5, fontWeight: '500' }).width}
            y={34}
          >
            {subStrong}
          </Text>
        )}
        {follow && (
          <Layer>
            <Rect x={w - 120} y={14} width={72} height={32} radius={9} fill={taste.canvas} stroke={{ color: taste.ink, width: 1.8 }} />
            <Text font={UI} weight={700} size={14} color={taste.ink} x={w - 120} y={21} maxWidth={72} align="center">
              Follow
            </Text>
          </Layer>
        )}
        <Icon d={ICON.dots} size={22} x={w - 34} y={19} stroke={3} />
      </Layer>

      <Layer y={SOCIAL_CARD.header} clip={{ kind: 'path', d: rrect(w, imageHeight, SOCIAL_CARD.radius) }}>
        {image}
      </Layer>

      <Layer y={ay - 12}>
        <Layer>
          <Icon d={ICON.heart} size={24} />
          {liked > 0 && (
            <Layer x={12} y={12} scale={0.6 + 0.4 * liked} origin="center">
              <Layer x={-12} y={-12}>
                <Icon d={ICON.heart} size={24} fill={taste.notes.red} color={taste.notes.red} opacity={Math.min(1, liked * 2)} />
              </Layer>
            </Layer>
          )}
          <Text font={UI} weight={600} size={14} color={taste.ink} x={28} y={4}>
            {likes}
          </Text>
        </Layer>
        <Layer x={74}>
          <Icon d={ICON.comment} size={23} />
          <Text font={UI} weight={600} size={14} color={taste.ink} x={27} y={4}>
            {comments}
          </Text>
        </Layer>
        <Layer x={138}>
          <Icon d={ICON.repost} size={23} />
          <Text font={UI} weight={600} size={14} color={taste.ink} x={27} y={4}>
            {reposts}
          </Text>
        </Layer>
        <Icon d={ICON.send} size={22} x={192} y={1} />
        <Layer x={w - 30} y={12} scale={saveScale} origin="center">
          <Layer x={-12} y={-12}>
            {save === 'outline' && <Icon d={ICON.bookmark} size={26} />}
            {save === 'filled' && <Icon d={ICON.bookmark} size={26} fill={taste.ink} />}
            {typeof save !== 'string' && save}
          </Layer>
        </Layer>
      </Layer>

      <Layer y={cy} opacity={captionOpacity}>
        {caption.map((l, i) => {
          if (i > 0)
            return (
              <Text key={i} font={UI} weight={500} size={14.5} color={'#3a3a3f'} x={4} y={i * 21}>
                {l}
              </Text>
            );
          return (
            <Layer key={i}>
              <Text font={UI} weight={700} size={14.5} color={taste.ink} x={4} y={0}>
                {name}
              </Text>
              <Text
                font={UI}
                weight={500}
                size={14.5}
                color={'#3a3a3f'}
                x={4 + measureText({ text: name, fontFamily: UI, fontSize: 14.5, fontWeight: '700' }).width + 6}
                y={0}
              >
                {l}
              </Text>
            </Layer>
          );
        })}
        {tag && <Tag text={tag} x={tagX} y={-4} />}
      </Layer>
    </Layer>
  );
};

/** "[ That reference ]": white text on a translucent dark label, pinned on a caption or a picture. */
export const Tag: React.FC<{ text: string; x: number; y: number; size?: number; opacity?: number }> = ({
  text,
  x,
  y,
  size = 15,
  opacity = 1,
}) => {
  const { fonts } = useTaste();
  const w = text.length * size * 0.52 + 16;
  return (
    <Layer x={x} y={y} opacity={opacity}>
      <Rect width={w} height={size * 1.6} radius={2} fill="#4a4a4eda" stroke={line({ color: '#ffffff99', width: 1 })} />
      <Text font={fonts.ui} weight={500} size={size} color="#fff" x={8} y={size * 0.28}>
        {text}
      </Text>
    </Layer>
  );
};
