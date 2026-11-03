// Card Rail: a rail of portrait cards lying on a tilted plane, flicked sideways. Each flick is a short pull back, a fast
// throw and a long settle, so the rail overshoots nothing and coasts to rest on a card. The card at the centre lifts off the
// plane and sharpens; the rest sit back and dim. The camera opens tight on the first card, pulls out as the first flick throws the rail (and trails the rail by a few frames, so the cards overshoot and settle back), winds up before the second throw, and ends pushing in on the centred card, which has the sharpness. Motion blur on the throws.

import React from 'react';
import { z } from 'zod';
import { useCurrentFrame } from 'remotion';
import { Camera, Layer, Rect, Text, dropShadow } from '@kinetographdev/core';
import { DEFAULT_PHOTOS, Ground, H, Label, Photo, W, ease, easeCam, easeOut, hex, imagesSchema, keys, nameOf, pick, ramp, smooth, useFont, useFontItalic } from './kit.js';

export const cardRailSchema = z.object({
  images: imagesSchema,
  labels: z.array(z.string()).describe('A name for each card, in order. Cards past the end of the list use the picture\'s own name.'),
  count: z.number().int().min(5).max(30).describe('How many cards are on the rail.'),
  cardWidth: z.number().min(160).max(480).describe('Width of a card, in px on the plane.'),
  cardHeight: z.number().min(220).max(640).describe('Height of a card, in px on the plane.'),
  gap: z.number().min(0).max(120).describe('Space between cards, in px.'),
  tiltX: z.number().min(0).max(80).describe('How far the plane leans back, in degrees.'),
  roll: z.number().min(-40).max(40).describe('How far the plane is turned in its own plane, in degrees, so the rail runs on a diagonal.'),
  perspective: z.number().min(600).max(4000).describe('Camera perspective distance, in px. Lower is more dramatic.'),
  flicks: z.array(z.object({ at: z.number().int().min(0).describe('Frame the flick begins (the pull back comes just before).'), cards: z.number().describe('How many cards the rail moves; positive moves forward along the rail.'), frames: z.number().int().min(10).describe('Frames from throw to rest.') })).describe('Each flick of the rail.'),
  startZoom: z.number().min(1).max(4).describe('Zoom of the opening shot on the first card.'),
  endZoom: z.number().min(1).max(3).describe('Zoom of the closing push on the centred card.'),
  motionBlur: z.number().min(0).max(1).describe('Camera motion blur shutter in frames, used while the rail or camera moves fast. 0 turns it off.'),
  lift: z.number().min(0).max(200).describe('How far the centred card rises off the plane, in px.'),
  title: z.string().describe('Title at the top left. Empty for none.'),
  caption: z.string().describe('Smaller line under the title. Empty for none.'),
  font: z.string().describe('Google Fonts family for the label and card numbers.'),
  serif: z.string().describe('Google Fonts family for the card names (set in italic).'),
  colors: z.object({ ground: hex.describe('Background.'), ink: hex.describe('Title.'), muted: hex.describe('Caption.'), card: hex.describe('Card colour behind the picture.'), cardText: hex.describe('Card names.') }).describe('Colours.'),
});
export type CardRailProps = z.infer<typeof cardRailSchema>;

export const cardRailDefaults: CardRailProps = {
  images: DEFAULT_PHOTOS,
  labels: [],
  count: 16,
  cardWidth: 300,
  cardHeight: 420,
  gap: 34,
  tiltX: 52,
  roll: -16,
  perspective: 1500,
  flicks: [
    { at: 22, cards: 3, frames: 62 },
    { at: 118, cards: 4, frames: 78 },
  ],
  lift: 70,
  startZoom: 2,
  endZoom: 1.45,
  motionBlur: 0,
  title: 'Card Rail',
  caption: 'Flicked, then let go',
  font: 'Geist',
  serif: 'Instrument Serif',
  colors: { ground: '#e7e3da', ink: '#16150f', muted: '#85806f', card: '#f7f5ef', cardText: '#16150f' },
};

export const CARD_RAIL_DURATION = 240;

/** Rail position in cards at frame f: for each flick a pull back of 0.12 card, a throw, a long settle. */
export const railPosition = (f: number, flicks: CardRailProps['flicks']): number => {
  let pos = 0;
  for (const fl of flicks) {
    const pull = 9;
    const back = ramp(f, fl.at - pull, fl.at, 0, -0.12 * Math.sign(fl.cards || 1), ease);
    const go = ramp(f, fl.at, fl.at + fl.frames, 0, fl.cards, easeOut);
    // after the throw has started, the pull-back is folded into it
    const fold = f >= fl.at ? 0 : back;
    const settled = f >= fl.at ? go + (-0.12 * Math.sign(fl.cards || 1)) * (1 - ramp(f, fl.at, fl.at + 8, 0, 1, ease)) : 0;
    pos += f >= fl.at ? settled : fold;
  }
  return pos;
};

export const CardRail = (p: CardRailProps) => {
  const f = useCurrentFrame();
  const font = useFont(p.font);
  const serif = useFontItalic(p.serif);
  const pitch = p.cardWidth + p.gap;
  const pos = railPosition(f, p.flicks);
  const first = 3;
  const f1 = p.flicks[0]?.at ?? 22;
  const f2 = p.flicks[1]?.at ?? 118;
  const end2 = f2 + (p.flicks[1]?.frames ?? 78);
  // the camera trails the rail by a few frames: during a throw the cards run past the middle, then come back
  const lagAt = (t: number) => railPosition(t, p.flicks) - railPosition(t - 6, p.flicks);
  const lag = lagAt(f);
  const zoomAt = (t: number) => {
    const out = keys(t, [[0, p.startZoom], [f1 - 6, p.startZoom], [f1 + 46, 0.94], [f2 - 14, 0.94], [f2 - 2, 0.98], [f2 + 40, 0.9]], easeCam);
    const push = ramp(t, end2 + 4, end2 + 34, 0, 1, easeOut);
    const over = 1 + 0.03 * Math.sin(ramp(t, end2 + 28, end2 + 56, 0, 1) * Math.PI);
    return (out + (p.endZoom - out) * push) * (push >= 1 ? over : 1);
  };
  const zoom = zoomAt(f);
  const sway = keys(f, [[0, -9], [f1 + 40, -2], [f2 + 40, 4], [CARD_RAIL_DURATION - 1, 2]], easeCam);
  const flat = ramp(f, 0, f1 + 40, 1, 0, easeCam) * 12 + ramp(f, end2 + 4, end2 + 34, 0, 1, easeOut) * -8;
  const moving = Math.abs(lag) > 0.12 || Math.abs(zoomAt(f + 0.5) - zoomAt(f - 0.5)) > 0.012;
  const cards = Array.from({ length: p.count }, (_, i) => {
    const rel = i - first - pos + 0.55 * lag; // cards from the centre, with the follow-through
    const focus = 1 - smooth(Math.abs(i - first - pos));
    const d = Math.abs(i - first - pos);
    const enter = ramp(f, 4 + Math.abs(i - first) * 2, 4 + Math.abs(i - first) * 2 + 26, 0, 1, easeOut);
    const name = p.labels[i] ?? nameOf(pick(p.images, i));
    return { i, rel, focus, d, enter, name };
  });
  return (
    <Layer id="root">
      <Ground color={p.colors.ground} />
      <Layer id="shutter" motionBlur={p.motionBlur > 0 && moving ? { samples: 10, shutter: p.motionBlur } : undefined}>
        <Camera perspective={p.perspective} />
        <Layer id="stage" x={W / 2} y={H / 2 - 20} scale={zoom} rotateX={p.tiltX + flat + sway * 0.3} rotateY={sway * 0.7} rotation={p.roll} preserve3d>
          {cards.map(({ i, rel, focus, d, enter, name }) => (
            <Layer
              key={i}
              id={`card${i}`}
              x={rel * pitch}
              y={(1 - enter) * 160}
              z={focus * p.lift}
              opacity={enter * (0.72 + 0.28 * (1 - smooth(d / 4)))}
              effects={[dropShadow({ x: 0, y: 18 + focus * 30, blur: 26 + focus * 26, color: `rgba(25,22,12,${0.22 + focus * 0.12})` })]}
            >
              <Rect id={`card${i}-bg`} x={-p.cardWidth / 2} y={-p.cardHeight / 2} width={p.cardWidth} height={p.cardHeight} radius={10} fill={p.colors.card} />
              <Layer id={`card${i}-pic`} y={-p.cardHeight / 2 + 12 + (p.cardHeight - 100) / 2}>
                <Photo file={pick(p.images, i)} w={p.cardWidth - 24} h={p.cardHeight - 100} radius={4} />
              </Layer>
              <Text id={`card${i}-n`} font={font} weight={500} size={17} color={p.colors.muted} x={-p.cardWidth / 2 + 14} y={p.cardHeight / 2 - 68}>{String(i + 1).padStart(2, '0')}</Text>
              <Text id={`card${i}-t`} font={serif} fontStyle="italic" size={38} color={p.colors.cardText} x={-p.cardWidth / 2 + 14} y={p.cardHeight / 2 - 50}>{name}</Text>
            </Layer>
          ))}
        </Layer>
      </Layer>
      <Label x={72} y={72} title={p.title} sub={p.caption} font={font} ink={p.colors.ink} muted={p.colors.muted} opacity={ramp(f, f1 + 20, f1 + 50, 0, 1)} />
    </Layer>
  );
};
