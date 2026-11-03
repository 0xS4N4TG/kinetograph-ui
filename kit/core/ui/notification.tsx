// A phone notification at a big design size (NOTIFICATION, 1265 x 281): app icon, title, a body line with an
// optional trailing piece (an emoji, a badge), and "now". Bring your own app icon; no app's branding is built in.

import React from 'react';
import { measureText } from '@remotion/layout-utils';
import { Layer, Rect, Text, dropShadow } from '@kinetographdev/core';
import { useTaste } from '../taste.js';

export const NOTIFICATION = { width: 1265, height: 281, radius: 40 };

export const NotificationCard: React.FC<{
  /** the app icon, drawn in a 189 px box */
  icon: React.ReactNode;
  title: string;
  body: string;
  /** drawn just after the body's last letter, with its top at the body's top */
  trailing?: React.ReactNode;
  /** 0..1: a card behind another greys its words, not its icon */
  dim?: number;
  /** 0..1: a pink wash, for a card still landing */
  tint?: number;
  now?: boolean;
}> = ({ icon, title, body, trailing, dim = 0, tint = 0, now = true }) => {
  const taste = useTaste();
  const UI = taste.fonts.ui;
  const { width: w, height: h, radius } = NOTIFICATION;
  const bodyEnd = 254 + measureText({ text: body, fontFamily: UI, fontSize: 46, fontWeight: '500' }).width;
  return (
    <Layer>
      <Rect width={w} height={h} radius={radius} fill="#fff" effects={[dropShadow({ y: 6, blur: 16, color: '#00000016' })]} />
      <Layer x={35} y={46}>
        {icon}
      </Layer>
      <Layer opacity={1 - dim}>
        <Text font={UI} weight={700} size={60} color={taste.ink} x={254} y={58}>
          {title}
        </Text>
        <Text font={UI} weight={500} size={46} color="#2a2a2e" x={254} y={145}>
          {body}
        </Text>
        {trailing && (
          <Layer x={bodyEnd} y={136}>
            {trailing}
          </Layer>
        )}
      </Layer>
      {now && (
        <Text font={UI} weight={500} size={30} color="#a2a2a8" x={w - 100} y={32}>
          now
        </Text>
      )}
      {tint > 0 && <Rect width={w} height={h} radius={radius} fill="#f6b6c9" opacity={tint} />}
    </Layer>
  );
};
