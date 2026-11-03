// Orbit Gallery: photographs spiral in from beyond the frame, round a title, and settle onto an ellipse. Each one arrives
// on its own arc (a swirl that unwinds as it comes in), small and turning, and lands slightly askew; they arrive one after
// another so the eye follows a single spiral rather than a crowd. The title sits still in the middle the whole time;
// once the ring has settled, it floats a hair. The camera opens tight on the title, then follows the arrivals (it leans
// toward the photograph that has just been launched, so the eye rides each arc), pulls out past the mark when the ring
// closes to show the whole ring, and pushes back in on the title as it settles. Motion blur while it moves fast.

import React from 'react';
import { z } from 'zod';
import { Easing, random, useCurrentFrame } from 'remotion';
import { Layer, Text, dropShadow } from '@kinetographdev/core';
import { Rig, shutterOf, keys, DEFAULT_PHOTOS, Ground, H, Photo, W, easeCam, hex, imagesSchema, lerp, pick, prog, ramp, useFont, useFontItalic } from './kit.js';

export const orbitGallerySchema = z.object({
  images: imagesSchema,
  count: z.number().int().min(4).max(18).describe('How many photographs land on the ring.'),
  title: z.string().describe('The title in the middle.'),
  subtitle: z.string().describe('A small line under the title. Empty for none.'),
  radiusX: z.number().min(200).max(900).describe('Half the width of the ring they settle on, in px.'),
  radiusY: z.number().min(100).max(480).describe('Half the height of the ring they settle on, in px.'),
  photoWidth: z.number().min(120).max(400).describe('Width of a photograph, in px.'),
  photoHeight: z.number().min(120).max(460).describe('Height of a photograph, in px.'),
  swirl: z.number().min(0).max(720).describe('How many degrees each photograph winds round the title on its way in.'),
  startDistance: z.number().min(1.5).max(6).describe('How far out they start, as a multiple of the ring.'),
  firstFrame: z.number().int().min(0).describe('Frame the first photograph starts moving.'),
  stagger: z.number().min(1).max(14).describe('Frames between one photograph setting off and the next.'),
  travelFrames: z.number().int().min(20).describe('Frames each photograph takes to arrive.'),
  tilt: z.number().min(0).max(14).describe('How far each photograph lies from square once settled, in degrees.'),
  seed: z.number().int().describe('Seed for the tilt and the order. Same seed, same ring.'),
  motionBlur: z.number().min(0).max(1).describe('Camera motion blur shutter in frames, used while the camera moves fast. 0 turns it off.'),
  openZoom: z.number().min(1).max(3).describe('Zoom of the opening shot on the title.'),
  push: z.number().min(0).max(0.3).describe('How far the camera pushes in once the ring has settled (0.06 is 6 percent).'),
  font: z.string().describe('Google Fonts family for the subtitle.'),
  serif: z.string().describe('Google Fonts family for the title.'),
  colors: z.object({ ground: hex.describe('Background.'), ink: hex.describe('Title.'), muted: hex.describe('Subtitle.') }).describe('Colours.'),
});
export type OrbitGalleryProps = z.infer<typeof orbitGallerySchema>;

export const orbitGalleryDefaults: OrbitGalleryProps = {
  images: DEFAULT_PHOTOS.slice(2),
  count: 9,
  title: 'Orbit',
  subtitle: 'Nine photographs, one ring',
  radiusX: 770,
  radiusY: 385,
  photoWidth: 210,
  photoHeight: 250,
  swirl: 300,
  startDistance: 2.7,
  firstFrame: 8,
  stagger: 7,
  travelFrames: 78,
  tilt: 6,
  seed: 3,
  push: 0.06,
  motionBlur: 0,
  openZoom: 1.5,
  font: 'Geist',
  serif: 'Instrument Serif',
  colors: { ground: '#f1eee7', ink: '#17150f', muted: '#8a8574' },
};

export const ORBIT_DURATION = 240;
const arrive = Easing.bezier(0.18, 0.72, 0.2, 1);

export const OrbitGallery = (p: OrbitGalleryProps) => {
  const f = useCurrentFrame();
  const font = useFont(p.font);
  const serif = useFontItalic(p.serif);
  const serifUpright = useFont(p.serif, ['400']);
  const settled = p.firstFrame + (p.count - 1) * p.stagger + p.travelFrames;
  const titleIn = prog(f, 4, 40, arrive);
  const placeAt = (i: number, t: number) => {
    const k = prog(t, p.firstFrame + i * p.stagger, p.firstFrame + i * p.stagger + p.travelFrames, arrive);
    const theta = (-90 + (i * 360) / p.count + 20) * (Math.PI / 180) + ((p.swirl * (1 - k)) * Math.PI) / 180;
    const o = lerp(p.startDistance, 1, k);
    return { x: Math.cos(theta) * p.radiusX * o, y: Math.sin(theta) * p.radiusY * o, k };
  };
  // the camera: tight on the title, leaning after the latest launch, out past the mark, then back in on the title
  const pullA = settled - 34;
  const camAt = (t: number) => {
    const fr = Math.min(p.count - 1, Math.max(0, (t - p.firstFrame) / p.stagger));
    const a0 = placeAt(Math.floor(fr), t);
    const a1 = placeAt(Math.ceil(fr), t);
    const lead = { x: lerp(a0.x, a1.x, fr - Math.floor(fr)), y: lerp(a0.y, a1.y, fr - Math.floor(fr)) };
    const follow = prog(t, 10, 40, easeCam) * (1 - prog(t, pullA, pullA + 24, easeCam));
    const pull = prog(t, pullA, pullA + 36, easeCam);
    const over = 1 + 0.035 * Math.sin(prog(t, pullA + 30, pullA + 64) * Math.PI);
    const settle = prog(t, settled + 20, ORBIT_DURATION - 1, easeCam);
    const zoomRide = keys(t, [[0, p.openZoom], [40, 1.22], [pullA, 1.12]], easeCam);
    const zoom = lerp(zoomRide, 0.94, pull) * (pull >= 1 ? over : 1) * (1 + p.push * 1.4 * settle);
    return { cx: lead.x * 0.15 * follow, cy: lead.y * 0.15 * follow, zoom, roll: lerp(-2.2, 0, prog(t, 0, pullA + 20, easeCam)) };
  };
  const cam = camAt(f);
  const shutter = p.motionBlur > 0 ? shutterOf(camAt, f, 500, 24, p.motionBlur) : 0;
  const items = Array.from({ length: p.count }, (_, i) => {
    const { x, y, k: t } = placeAt(i, f);
    const lean = (random(`lean${p.seed}-${i}`) - 0.5) * 2 * p.tilt;
    const rot = lerp(lean + (i % 2 ? 40 : -40), lean, t);
    const sc = lerp(0.35, 1, t);
    const float = f > settled - 20 ? Math.sin((f - i * 11) * 0.045) * 5 * prog(f, settled - 20, settled + 20) : 0;
    return { i, x, y: y + float, rot, sc, op: ramp(f, p.firstFrame + i * p.stagger, p.firstFrame + i * p.stagger + 10, 0, 1) };
  });
  return (
    <Layer id="root">
      <Ground color={p.colors.ground} />
      <Rig cx={cam.cx} cy={cam.cy} zoom={cam.zoom} roll={cam.roll} shutter={shutter}>
      <Layer id="world">
        <Text id="title" font={serifUpright} size={190} color={p.colors.ink} x={-600} y={-130 + (1 - titleIn) * 24} maxWidth={1200} align="center" opacity={titleIn}>{p.title}</Text>
        {p.subtitle ? (
          <Text id="subtitle" font={font} weight={500} size={24} color={p.colors.muted} x={-400} y={86 + (1 - titleIn) * 24} maxWidth={800} align="center" opacity={titleIn * ramp(f, 24, 56, 0, 1)}>{p.subtitle}</Text>
        ) : null}
        {items.map(({ i, x, y, rot, sc, op }) => (
          <Layer
            key={i}
            id={`orb${i}`}
            x={x}
            y={y}
            rotation={rot}
            scale={sc}
            opacity={op}
            effects={[dropShadow({ x: 0, y: 14, blur: 26, color: 'rgba(30,24,10,0.25)' })]}
          >
            <Photo file={pick(p.images, i)} w={p.photoWidth} h={i % 3 === 1 ? p.photoWidth : p.photoHeight} radius={4} />
          </Layer>
        ))}
      </Layer>
      </Rig>
    </Layer>
  );
};
