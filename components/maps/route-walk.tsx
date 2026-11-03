// Route Walk. Portrait, 24 fps; its length and pace come from the capture (pace 2 by default: twice the reference's time). A walking route draws itself through a 3D city (a real MapLibre GL map of
// OpenStreetMap buildings, captured frame by frame: capture/capture.mjs route-walk) while the camera rides its head, zooming
// out, flattening and turning until the whole walk stands in frame. Over the map, drawn live from the capture's projected
// points: the route card with a progress bar that fills with the line, a ringed dot on the line's head, a label for each
// place the line passes (it pops as the head goes by), and at the end a pin that drops from the top of the frame with the
// destination's label.
//
// Timing is measured frame by frame from a reference reel's map shot (t = 0 is its first clean map frame): the line draws
// over 0..20, labels pop as it passes them, the pin falls 22..26 and the end label lands with it, the start's label
// returns at 25 once the pull-out has brought the start back into view.
//
// Principles: staging (one thing moves at a time: the line, then the pin), slow in and out (the camera eases out of a
// fast start), follow through (pin squash and settle, labels overshoot a little), anticipation (the head dot leads the
// line), solid drawing (real 3D buildings, one sun for walls and shadows).

import React from 'react';
import { z } from 'zod';
import { Ellipse, Layer, Path, Rect, Text, Video, dropShadow, linearGradient, staticFile } from '@kinetographdev/core';
import { makeGoogleFont } from '@kinetographdev/core/google-fonts';
import { measureText } from '@remotion/layout-utils';
import { Easing, useCurrentFrame } from 'remotion';
import { at, ramp } from './ui.js';
import type { Track, XY } from './ui.js';

export const RW_W = 1080;
export const RW_H = 1920;
export const RW_FPS = 24;
/** The length comes from the capture (its pace setting stretches the reference's timing). */
export const rwDuration = (t: Track) => t.meta.frames;

const hex = z.string().describe('A CSS colour.');

export const routeWalkSchema = z.object({
  clip: z.string().describe('The captured map in public/ (node capture/capture.mjs route-walk). It fixes the route and the camera.'),
  title: z.string().describe('The card title: where from and to.'),
  time: z.string().describe('The walking time, in the accent on the card.'),
  details: z.string().describe('The rest of the card line, after the time.'),
  places: z.array(z.string()).describe('Names of the places the line passes, in the order the capture lists them.'),
  start: z.string().describe('Label at the start of the route.'),
  end: z.string().describe('Label over the pin at the end of the route.'),
  haze: z.number().min(0).max(1).describe('Strength of the haze over the far city at the top of the frame (measured: 0.92).'),
  attribution: z.string().describe('Map data credit, bottom right. Required by the OpenStreetMap licence: keep it.'),
  font: z.string().describe('Google Fonts family for all type.'),
  colors: z
    .object({
      accent: hex.describe('The route, card icon, time and progress bar (match the capture\'s line).'),
      pin: hex.describe('The destination pin.'),
      ink: hex.describe('Titles and labels.'),
      muted: hex.describe('The card details.'),
      card: hex.describe('Card and label background.'),
    })
    .describe('Colours.'),
});
export type RouteWalkProps = z.infer<typeof routeWalkSchema>;

export const routeWalkDefaults: RouteWalkProps = {
  clip: 'route-walk.mp4',
  title: 'Washington Square to Union Square',
  time: '9 min',
  details: ' · 0.7 km · New York',
  places: ['E 8th St', 'E 11th St', 'E 13th St'],
  start: 'Washington Square',
  end: 'Union Square',
  haze: 0.92,
  attribution: '© OpenStreetMap contributors · OpenFreeMap · OpenMapTiles',
  font: 'Inter',
  colors: { accent: '#2e6bfe', pin: '#e15342', ink: '#1d1d1f', muted: '#707072', card: '#ffffff' },
};

interface Props extends RouteWalkProps {
  track: Track;
}

/** The screen point a fraction q along the projected route. */
const onArc = (arc: XY[], q: number): XY => {
  const x = Math.min(arc.length - 1, Math.max(0, q * (arc.length - 1)));
  const i = Math.floor(x);
  const j = Math.min(arc.length - 1, i + 1);
  const t = x - i;
  return [arc[i][0] + (arc[j][0] - arc[i][0]) * t, arc[i][1] + (arc[j][1] - arc[i][1]) * t];
};

/** A pop: 0 to 1 over n frames with a small overshoot. */
const pop = (f: number, a: number, n = 4) => {
  const t = (f - a) / n;
  if (t <= 0) return 0;
  if (t >= 1.6) return 1;
  return t < 1 ? Easing.out(Easing.back(2.2))(t) : 1;
};

/** A teardrop pin whose point is the origin: 56 px wide, 82 tall, squashed by sx, sy. */
const pinPath = (sx: number, sy: number) => {
  const X = (v: number) => (v * sx).toFixed(2);
  const Y = (v: number) => (v * sy).toFixed(2);
  return `M 0 0 C ${X(-5)} ${Y(-14)} ${X(-28)} ${Y(-32)} ${X(-28)} ${Y(-54)} A ${X(28)} ${Y(28)} 0 1 1 ${X(28)} ${Y(-54)} C ${X(28)} ${Y(-32)} ${X(5)} ${Y(-14)} 0 0 Z`;
};

/** A walking figure, white, in a 72 px icon circle centred on the origin. */
const WALKER =
  'M 2 -21 a 5 5 0 1 1 0.01 0 Z M -3 -12 L 6 -12 L 10 -3 L 16 0 L 14 4 L 6 0 L 4 -4 L 2 6 L 9 14 L 11 24 L 6 25 L 4 16 L -3 10 L -7 24 L -12 23 L -7 6 L -5 -4 L -9 1 L -13 8 L -17 6 L -11 -6 Z';

const Label: React.FC<{ id: string; family: string; text: string; x: number; y: number; s: number; ink: string; card: string; dot?: boolean }> = ({
  id, family, text, x, y, s, ink, card, dot = true,
}) => {
  const size = 27;
  const w = measureText({ text, fontFamily: family, fontSize: size, fontWeight: '600' }).width + 44;
  const h = 50;
  return (
    <Layer id={id} x={x} y={y} opacity={Math.min(1, s * 1.4)}>
      {dot ? <Ellipse id={`${id}-dot`} x={-8} y={-8} width={16} height={16} fill="#ffffff" stroke={{ color: '#5d5f63', width: 2.5 }} /> : null}
      <Layer id={`${id}-pill`} y={dot ? -28 : 0} scale={0.7 + 0.3 * s}>
        <Rect id={`${id}-bg`} x={-w / 2} y={-h} width={w} height={h} radius={h / 2} fill={card} effects={[dropShadow({ x: 0, y: 3, blur: 7, color: 'rgba(30,32,36,0.16)' })]} />
        <Text id={`${id}-t`} font={family} weight={600} size={size} color={ink} x={-w / 2 + 22} y={-h + (h - size * 1.2) / 2} lineHeight={1.2}>
          {text}
        </Text>
      </Layer>
    </Layer>
  );
};

export const RouteWalk: React.FC<Props> = (p) => {
  const f = useCurrentFrame();
  const family = makeGoogleFont(p.font.replace(/\s+/g, '')).loadFont('normal', { weights: ['400', '500', '600', '700'] }).fontFamily;
  const fr = at(p.track, f);
  const arc = fr.arc ?? [];
  const prog = fr.progress ?? 1;
  const nPlaces = fr.places.length - 2;
  const startXY = fr.places[nPlaces];
  const endXY = fr.places[nPlaces + 1];
  const head = onArc(arc, prog);

  // Where on the route each place sits (0..1): the nearest point of the route in frame 0's projection does not hold
  // through the camera move, so use the capture's ground positions: the place nearest each arc point, measured on the
  // last frame where all of the route is in view.
  const last = at(p.track, p.track.track.length - 1);
  const lastArc = last.arc ?? [];
  const placeAt = (i: number) => {
    const [px, py] = last.places[i];
    let best = 0;
    let bd = Infinity;
    lastArc.forEach(([x, y], k) => {
      const d = (x - px) ** 2 + (y - py) ** 2;
      if (d < bd) { bd = d; best = k; }
    });
    return best / Math.max(1, lastArc.length - 1);
  };
  // The frame the head passes a fraction q of the route.
  const passFrame = (q: number) => {
    for (let k = 0; k < p.track.track.length; k++) if ((p.track.track[k].progress ?? 1) >= q) return k;
    return 0;
  };

  // The pin: falls from above the frame over frames 22..26, squashes on landing and settles.
  // The reference's timing (frames at 24 fps), stretched by the capture's pace.
  const pace = p.track.meta.pace ?? 1;
  const PIN_LAND = 26 * pace;
  const FALL = 4 * pace;
  const START_BACK = 25 * pace;
  const POP = Math.round(4 * Math.sqrt(pace));
  const tPin = f - PIN_LAND;
  const fallY = tPin < -FALL ? null : tPin < 0 ? -(endXY[1] + 80) * (1 - Easing.in(Easing.quad)((tPin + FALL) / FALL)) : 0;
  const squash = tPin >= 0 && tPin < 10 ? Math.sin((tPin / 10) * Math.PI) * Math.exp(-tPin / 4) : 0;

  // The card: in place from the first frame; its bar fills with the line.
  const cx = 70;
  const cy = 283;
  const cw = 920;
  const ch = 154;
  const timeW = measureText({ text: p.time, fontFamily: family, fontSize: 27, fontWeight: '700' }).width;
  const done = prog >= 0.999;

  return (
    <Layer id="route-walk">
      <Video id="map" muted src={staticFile(p.clip)} width={RW_W} height={RW_H} fit="cover" />
      {/* haze over the far city, as measured on the reference: #e9eced, near opaque at the top edge, gone by 0.34 H */}
      <Rect
        id="haze"
        width={RW_W}
        height={RW_H * 0.34}
        fill={linearGradient([[0, `rgba(233,236,237,${p.haze})`], [0.35, `rgba(233,236,237,${p.haze * 0.8})`], [1, 'rgba(233,236,237,0)']], { angle: 180 })}
      />

      {/* the head of the line: a white ring round an accent dot, leading the line, then resting under the pin */}
      <Layer id="head" x={head[0]} y={head[1]}>
        <Ellipse id="head-ring" x={-17} y={-11} width={34} height={22} fill="#ffffff" effects={[dropShadow({ x: 0, y: 2, blur: 4, color: 'rgba(20,40,90,0.3)' })]} />
        <Ellipse id="head-dot" x={-11} y={-7} width={22} height={14} fill={p.colors.accent} opacity={done ? 0.85 : 1} />
      </Layer>

      {/* places along the way: each pops as the head passes it */}
      {p.places.slice(0, nPlaces).map((name, i) => {
        const s = pop(f, passFrame(placeAt(i)), POP);
        if (s <= 0) return null;
        const [x, y] = fr.places[i];
        return <Label key={i} id={`place-${i}`} family={family} text={name} x={x} y={y} s={s} ink={p.colors.ink} card={p.colors.card} />;
      })}

      {/* the start's label returns once the pull-out has it back in frame */}
      {f >= START_BACK ? <Label id="start" family={family} text={p.start} x={startXY[0]} y={startXY[1]} s={pop(f, START_BACK, POP)} ink={p.colors.ink} card={p.colors.card} /> : null}

      {fallY !== null ? (
        <Layer id="pin" x={endXY[0]} y={endXY[1] - 26}>
          <Ellipse id="pin-shadow" x={-12} y={-4} width={24} height={8} fill="rgba(0,0,0,0.22)" opacity={ramp(f, PIN_LAND - FALL, PIN_LAND, 0.2, 1)} />
          <Layer id="pin-body" y={fallY}>
            <Path id="pin-shape" d={pinPath(1 + squash * 0.14, 1 - squash * 0.18)} fill={p.colors.pin} effects={[dropShadow({ x: 0, y: 4, blur: 6, color: 'rgba(120,30,20,0.3)' })]} />
            <Ellipse id="pin-hole" x={-10 * (1 + squash * 0.14)} y={(-54 - 10) * (1 - squash * 0.18)} width={20 * (1 + squash * 0.14)} height={20 * (1 - squash * 0.18)} fill="#ffffff" />
          </Layer>
        </Layer>
      ) : null}
      {f >= PIN_LAND ? <Label id="end" family={family} text={p.end} x={endXY[0] - 10} y={endXY[1] - 118} s={pop(f, PIN_LAND, POP)} ink={p.colors.ink} card={p.colors.card} dot={false} /> : null}

      <Layer id="card" x={cx} y={cy}>
        <Rect id="card-bg" width={cw} height={ch} radius={24} fill={p.colors.card} effects={[dropShadow({ x: 0, y: 6, blur: 14, color: 'rgba(30,32,36,0.14)' })]} />
        <Layer id="card-icon" x={65} y={62}>
          <Ellipse id="card-icon-bg" x={-36} y={-36} width={72} height={72} fill={p.colors.accent} />
          <Path id="card-icon-walker" d={WALKER} fill="#ffffff" />
        </Layer>
        <Text id="card-title" font={family} weight={700} size={30} color={p.colors.ink} x={122} y={26} lineHeight={1.2}>
          {p.title}
        </Text>
        <Text id="card-time" font={family} weight={700} size={27} color={p.colors.accent} x={122} y={68} lineHeight={1.2}>
          {p.time}
        </Text>
        <Text id="card-details" font={family} weight={400} size={27} color={p.colors.muted} x={122 + timeW} y={68} lineHeight={1.2}>
          {p.details}
        </Text>
        <Rect id="card-track" x={30} y={122} width={cw - 60} height={7} radius={3.5} fill="#e6e9f0" />
        <Rect id="card-bar" x={30} y={122} width={Math.max(7, (cw - 60) * prog)} height={7} radius={3.5} fill={p.colors.accent} />
      </Layer>

      <Text id="attribution" font={family} weight={400} size={17} color="#3a3b3e" opacity={0.5} align="right" x={RW_W - 28} y={RW_H - 46}>
        {p.attribution}
      </Text>
    </Layer>
  );
};
