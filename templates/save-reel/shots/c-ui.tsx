// UI of the reminder shots (08 to 11): the Reminder sheet, the notification card and its stack, the alarm clock,
// and the dark picture the post shows at the top of shot 08. Each is drawn at its own design size (the size it has
// on screen in the reference's closest shot) and scaled into the shot's world.

import React from 'react';
import { Ellipse, Image, Layer, Path, Rect, Text, dropShadow } from '@kinetographdev/core';
import { NotificationCard } from '../../../kit/core/ui/notification.js';
import { Toggle } from '../../../kit/core/ui/toggle.js';
import { AppGlyph, BLUE, GREY, ICON, Icon, TEXT, UI, line, photoSrc, rrect } from '../lib.js';

export { spline } from '../lib.js';
export { Toggle } from '../../../kit/core/ui/toggle.js';

// ---- the post's picture, as far as shot 08 shows it: city lights at night ----

export const NightPicture: React.FC<{ width: number; height: number }> = ({ width, height }) => (
  <Layer>
    {/* a city at night from the ISS, under the poster's pale left panel and its blue bar, cut by the frame */}
    <Layer clip={{ kind: 'path', d: `M0 0H${width}V${height}H0Z` }}>
      <Image src={photoSrc('night.jpg')} x={120} y={(height - width) / 2} width={width} height={width} />
    </Layer>
    <Rect width={244} height={height} fill="#f4f5f7" />
    <Rect x={14} y={height - 46} width={216} height={30} fill="#7fb0ef" />
    {/* a thin pale rim just inside the rounded edge */}
    <Path d={rrect(width - 2.4, height - 2.4, 20.8, 1.2, 1.2)} stroke={line({ color: '#ffffff99', width: 0.7 })} />
  </Layer>
);

// ---- the Reminder sheet: 514 x 468 at its design size ----

export const SHEET = { width: 514, height: 468 };

// a calendar whose bottom right corner is a circular arrow (repeats)
const EVERYDAY =
  'M12 20.5H5.5A1.5 1.5 0 0 1 4 19V6.5A1.5 1.5 0 0 1 5.5 5H18.5A1.5 1.5 0 0 1 20 6.5V12 M4 10H20 M8.5 3V7 M15.5 3V7' +
  ' M21.2 17.6A3.6 3.6 0 1 1 20 15 M20.4 13.2V15.3H18.3';

const Field: React.FC<{ x: number; icon: string; label: string; value: string }> = ({ x, icon, label, value }) => (
  <Layer x={x} y={154}>
    <Rect width={120} height={113} radius={14} fill="#f6f6f8" effects={[dropShadow({ y: 4, blur: 7, color: '#00000017' })]} />
    <Icon d={icon} size={28} x={8} y={8} color="#3a3a40" stroke={1.9} />
    <Text font={UI} weight={500} size={17} color="#9a9aa0" x={44} y={14}>
      {label}
    </Text>
    <Text font={UI} weight={500} size={21} color={TEXT} x={10} y={63}>
      {value}
    </Text>
    <Icon d={ICON.chevron} size={20} x={92} y={65} color="#6a6a70" stroke={2.1} />
  </Layer>
);

export const ReminderSheet: React.FC<{ toggle: number; ripple: number }> = ({ toggle, ripple }) => {
  const { width: w, height: h } = SHEET;
  return (
    <Layer>
      <Rect
        width={w}
        height={h}
        radius={42}
        fill="#fff"
        effects={[dropShadow({ y: 16, blur: 46, spread: 6, color: '#0000002a' }), dropShadow({ blur: 8, color: '#00000010' })]}
      />
      <Text font={UI} weight={700} size={40} color={TEXT} x={34} y={38}>
        Reminder
      </Text>
      <Layer x={380} y={36}>
        <Toggle on={toggle} w={96} h={54} />
      </Layer>
      <Rect x={30} y={122} width={454} height={2} fill="#ececef" />
      <Field x={27} icon={ICON.calendar} label="Month" value="Apr" />
      <Field x={197} icon={ICON.calendar} label="Day" value="15" />
      <Field x={364} icon={ICON.clock} label="Time" value="09:00" />
      <Rect x={30} y={291} width={454} height={2} fill="#ececef" />
      <Icon d={EVERYDAY} size={30} x={30} y={309} color="#3a3a40" stroke={1.9} />
      <Text font={UI} weight={500} size={25} color="#2c2c30" x={63} y={309}>
        Everyday
      </Text>
      <Layer x={412} y={307}>
        <Toggle on={0} w={60} h={35} />
      </Layer>
      <Layer clip={{ kind: 'path', d: rrect(w, h, 42) }}>
        <Rect x={42} y={364} width={429} height={74} radius={15} fill={BLUE} />
        {ripple > 0 && ripple < 1 && (
          <Ellipse
            x={256 - 20 - 70 * ripple}
            y={402 - 20 - 70 * ripple}
            width={40 + 140 * ripple}
            height={40 + 140 * ripple}
            fill="#a9c6f2"
            opacity={0.9 * (1 - ripple * ripple * ripple)}
          />
        )}
        <Text font={UI} weight={500} size={30} color="#fff" x={42} y={383} maxWidth={429} align="center">
          Apply Reminder
        </Text>
      </Layer>
    </Layer>
  );
};

// ---- the alarm clock after "when you need that post" (an emoji falls back to monochrome, so it is drawn) ----

export const AlarmClock: React.FC<{ size: number }> = ({ size }) => (
  <Layer scale={size / 24}>
    <Path d="M6 21.6L7.6 19.2M18 21.6L16.4 19.2" stroke={line({ color: '#5a5a60', width: 2, cap: 'round' })} />
    <Path d="M2.6 8A4.4 4.4 0 0 1 8.4 2.4Z" fill="#e8333f" />
    <Path d="M21.4 8A4.4 4.4 0 0 0 15.6 2.4Z" fill="#e8333f" />
    <Path d="M12 3.6A9 9 0 1 1 11.99 3.6Z" fill="#e8333f" />
    <Path d="M12 5.9A6.7 6.7 0 1 1 11.99 5.9Z" fill="#fff" />
    <Path d="M12 8.6V12.6L14.6 14" stroke={line({ color: '#2a2a2e', width: 1.8, cap: 'round', join: 'round' })} />
  </Layer>
);

// ---- the notification card: 1265 x 281 at its design size ----

export { NOTIFICATION as NOTICE } from '../../../kit/core/ui/notification.js';

export const NoticeCard: React.FC<{ dim?: number; tint?: number; now?: boolean }> = ({ dim = 0, tint = 0, now = true }) => (
  <NotificationCard
    icon={<AppGlyph size={189} />}
    title="Instagram"
    body="when you need that post"
    trailing={
      <Layer>
        <Layer x={8} y={4}>
          <AlarmClock size={60} />
        </Layer>
        <Text font={UI} weight={900} size={58} color="#e3262f" x={70} y={0}>
          !!
        </Text>
      </Layer>
    }
    dim={dim}
    tint={tint}
    now={now}
  />
);

/** Two cards: the back one tilted and paler, peeking out above the front one. Offsets in design pixels. */
export const NoticeStack: React.FC<{
  backY: number;
  backX?: number;
  backRotation: number;
  backOpacity?: number;
  tint?: number;
  backTint?: number;
  backDim?: number;
  now?: boolean;
}> = ({ backY, backX = 48, backRotation, backOpacity = 1, tint = 0, backTint = tint, backDim = 0.42, now = true }) => (
  <Layer>
    <Layer x={backX} y={backY} rotation={backRotation} opacity={backOpacity}>
      <NoticeCard dim={backDim} tint={backTint} now={false} />
    </Layer>
    <NoticeCard tint={tint} now={now} />
  </Layer>
);
