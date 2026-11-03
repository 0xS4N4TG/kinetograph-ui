// Audio Visualiser, after a reel on stylised waveforms ("not the boring default ones"): the trick is the stack, not the
// effect. The same audio is drawn several times, each copy in its own style (analog lines, analog dots or digital bars),
// its own colour and a slight offset, so they layer into one signal; two glows on top of each other give it the hot
// analog bloom, and grain over everything takes the digital edge off.
//
// Two looks ship as presets, both drawn from the audio itself (waveform.ts reads the decoded samples per frame):
//   scope   an oscilloscope: a dark graticule, two red line traces either side of a yellow digital trace, condensed
//           type with a script word, a slow push in
//   plasma  a white-hot trace in a blue bloom, a playhead, and the running time in huge soft numerals behind
//
// Measured on the reference: scope traces 58 px apart (red #fc453d, 4 px core, dark-red bloom to about 40 px), the
// digital trace a dot every 13 px, graticule cells of 62 px on #0f0f0f.
//
// Principles: staging (the signal on the centre line, type above it), timing (everything that moves is driven by the
// audio; the only free motion is the slow push), secondary action (the bloom and the push breathe with the loudness),
// appeal (layered colour rather than one flat trace).

import React from 'react';
import { z } from 'zod';
import { Audio } from 'remotion';
import { Ellipse, Layer, Path, Rect, Text, blur, chromaticAberration, glow, grain, linearGradient, staticFile } from '@kinetographdev/core';
import { makeGoogleFont } from '@kinetographdev/core/google-fonts';
import { useAudioData } from '@kinetographdev/core/media-utils';
import { measureText } from '@remotion/layout-utils';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { level, scope } from './waveform.js';

const hex = z.string().describe('A CSS colour.');

const layerSchema = z.object({
  style: z.enum(['lines', 'dots', 'digital']).describe('Analog lines (a trace), analog dots (a dot per sample) or digital (mirrored bars).'),
  color: hex.describe('Colour of this copy of the signal.'),
  y: z.number().describe('Offset from the centre line, px (stack copies a little apart).'),
  height: z.number().min(0).max(900).describe('Maximum height of the signal, px (the loudest sample reaches this).'),
  thickness: z.number().min(0.5).max(40).describe('Line width, dot size or bar width, px.'),
  samples: z.number().int().min(8).max(400).describe('Points across the width (After Effects: displayed samples).'),
  windowMs: z.number().min(5).max(2000).describe('How much audio is spread across the width, ms (After Effects: audio duration).'),
  delayMs: z.number().describe('Shift this copy in time, ms (After Effects: audio offset).'),
  opacity: z.number().min(0).max(1).describe('Opacity of this copy.'),
  glow: z.boolean().describe('Put this copy under the two stacked glows.'),
});
export type WaveLayer = z.infer<typeof layerSchema>;

export const audioVizSchema = z.object({
  audio: z.string().describe('The audio file in public/ the signal is read from (and that plays).'),
  layers: z.array(layerSchema).min(1).max(8).describe('The copies of the signal, bottom first.'),
  ground: hex.describe('Background.'),
  grid: z
    .object({
      show: z.boolean().describe('Draw the graticule.'),
      cell: z.number().min(10).max(400).describe('Grid cell size, px.'),
      color: hex.describe('Grid line colour.'),
      width: z.number().min(0.5).max(8).describe('Grid line width, px.'),
    })
    .describe('The oscilloscope graticule.'),
  glowNear: z.number().min(0).max(60).describe('Radius of the tight glow, px (the first of the two stacked glows).'),
  glowFar: z.number().min(0).max(200).describe('Radius of the wide bloom, px (the second glow).'),
  bloomStrength: z.number().min(0).max(2).describe('Strength of the wide bloom (keep it low where copies of different colours meet, or they smear together).'),
  bloomWithLevel: z.number().min(0).max(2).describe('How much the bloom swells with the loudness.'),
  bloomTint: z.string().describe('Colour of the wide bloom; empty to bloom in each copy\'s own colour.'),
  push: z.number().min(0).max(0.5).describe('Slow camera push over the whole clip (0.08 = 8% closer at the end).'),
  bump: z.number().min(0).max(0.1).describe('How much the frame swells on loud hits.'),
  title: z
    .object({
      kicker: z.string().describe('Small line above the headline. Empty for none.'),
      headline: z.string().describe('The big word. Empty for none.'),
      script: z.string().describe('Script word overlapping the headline. Empty for none.'),
      y: z.number().min(0).max(1).describe('Vertical position of the headline, as a fraction of the height.'),
      kickerColor: hex,
      headlineColor: hex,
      scriptColor: hex,
      headlineFont: z.string().describe('Google Fonts family, condensed.'),
      scriptFont: z.string().describe('Google Fonts family, italic serif.'),
      headlineSize: z.number().min(20).max(500),
    })
    .describe('Type.'),
  timecode: z
    .object({
      show: z.boolean().describe('Show the running time as huge soft numerals and a playhead.'),
      color: hex,
      blur: z.number().min(0).max(30).describe('Softness of the numerals, px.'),
      playhead: hex.describe('Colour of the playhead line.'),
    })
    .describe('Running time.'),
  streak: z.number().min(0).max(1).describe('A horizontal light streak along the centre line (anamorphic flare), swelling with the loudness.'),
  streakColor: hex.describe('Colour of the streak.'),
  grain: z.number().min(0).max(0.3).describe('Film grain over everything.'),
  chroma: z.number().min(0).max(6).describe('Chromatic aberration, px.'),
});
export type AudioVizProps = z.infer<typeof audioVizSchema>;

const red = '#fc453d';

export const scopeDefaults: AudioVizProps = {
  audio: 'beat.wav',
  layers: [
    { style: 'lines', color: red, y: -29, height: 8, thickness: 4, samples: 220, windowMs: 140, delayMs: 0, opacity: 1, glow: true },
    { style: 'lines', color: red, y: 29, height: 8, thickness: 4, samples: 220, windowMs: 140, delayMs: 18, opacity: 1, glow: true },
    { style: 'digital', color: '#f6ea5a', y: 0, height: 7, thickness: 7, samples: 83, windowMs: 140, delayMs: 8, opacity: 1, glow: true },
  ],
  ground: '#050505',
  grid: { show: true, cell: 62, color: '#4a4a4a', width: 2 },
  glowNear: 3,
  glowFar: 10,
  bloomStrength: 0.2,
  bloomWithLevel: 0.5,
  bloomTint: '',
  push: 0.12,
  bump: 0.012,
  title: {
    kicker: 'LISTEN TO',
    headline: 'SIGNAL',
    script: 'in colour',
    y: 0.3,
    kickerColor: '#d8d8d8',
    headlineColor: red,
    scriptColor: '#f6ea5a',
    headlineFont: 'Bebas Neue',
    scriptFont: 'Instrument Serif',
    headlineSize: 230,
  },
  timecode: { show: false, color: '#5a5d63', blur: 3, playhead: '#7fb2ff' },
  streak: 0,
  streakColor: '#ff6a5a',
  grain: 0.035,
  chroma: 1,
};

export const plasmaDefaults: AudioVizProps = {
  audio: 'beat.wav',
  layers: [
    { style: 'lines', color: '#2a63ff', y: 0, height: 22, thickness: 22, samples: 240, windowMs: 90, delayMs: 0, opacity: 0.55, glow: true },
    { style: 'lines', color: '#a9c8ff', y: 0, height: 22, thickness: 8, samples: 240, windowMs: 90, delayMs: 0, opacity: 0.9, glow: true },
    { style: 'lines', color: '#ffffff', y: 0, height: 22, thickness: 3.5, samples: 240, windowMs: 90, delayMs: 0, opacity: 1, glow: true },
  ],
  ground: '#070a12',
  grid: { show: false, cell: 120, color: '#14181f', width: 1.5 },
  glowNear: 8,
  glowFar: 42,
  bloomStrength: 0.8,
  bloomWithLevel: 1,
  bloomTint: '#2f6bff',
  push: 0.05,
  bump: 0.02,
  title: {
    kicker: '',
    headline: 'ON AIR?',
    script: '',
    y: 0.5,
    kickerColor: '#d8d8d8',
    headlineColor: '#f4f7ff',
    scriptColor: '#9cc1ff',
    headlineFont: 'Bebas Neue',
    scriptFont: 'Instrument Serif',
    headlineSize: 170,
  },
  timecode: { show: true, color: '#4d525b', blur: 4, playhead: '#7fb2ff' },
  streak: 0.85,
  streakColor: '#7fa8ff',
  grain: 0.05,
  chroma: 2.2,
};

/** One copy of the signal, centred on y = 0, x from 0 to w. */
const Wave: React.FC<{ id: string; v: number[]; w: number; layer: WaveLayer }> = ({ id, v, w, layer }) => {
  const n = v.length;
  const xs = (k: number) => (k / Math.max(1, n - 1)) * w;
  if (layer.style === 'lines') {
    const d = v.map((s, k) => `${k ? 'L' : 'M'}${xs(k).toFixed(1)} ${(-s * layer.height).toFixed(1)}`).join(' ');
    return (
      <Path
        id={id}
        d={d}
        stroke={{ color: layer.color, width: layer.thickness, cap: 'round', join: 'round' } as unknown as { color: string; width: number }}
      />
    );
  }
  if (layer.style === 'dots') {
    const r = layer.thickness / 2;
    return (
      <Layer id={id}>
        {v.map((s, k) => (
          <Ellipse key={k} id={`${id}-${k}`} x={xs(k) - r} y={-s * layer.height - r} width={2 * r} height={2 * r} fill={layer.color} />
        ))}
      </Layer>
    );
  }
  // digital: a mirrored bar per sample (side A and B), never shorter than a dot
  const bw = layer.thickness;
  return (
    <Layer id={id}>
      {v.map((s, k) => {
        const h = Math.max(bw, Math.abs(s) * layer.height * 2);
        return <Rect key={k} id={`${id}-${k}`} x={xs(k) - bw / 2} y={-h / 2} width={bw} height={h} radius={bw / 2} fill={layer.color} />;
      })}
    </Layer>
  );
};

export const AudioViz: React.FC<AudioVizProps> = (p) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H, durationInFrames } = useVideoConfig();
  const t = f / fps;
  const src = staticFile(p.audio);
  const data = useAudioData(src);
  const lv = data ? level(data, t) : 0;

  const head = makeGoogleFont(p.title.headlineFont.replace(/\s+/g, '')).loadFont('normal', { weights: ['400'] }).fontFamily;
  const script = makeGoogleFont(p.title.scriptFont.replace(/\s+/g, '')).loadFont('italic', { weights: ['400'] }).fontFamily;

  // the camera: a slow push over the clip, and a small swell with the loudness
  const s = 1 + p.push * (f / Math.max(1, durationInFrames - 1)) + p.bump * lv;
  const bloom = 1 + p.bloomWithLevel * lv;

  const glows = (on: boolean) =>
    on && (p.glowNear > 0 || p.glowFar > 0)
      ? [
          glow({ radius: p.glowNear, intensity: 1.1 }),
          glow({ radius: p.glowFar * bloom, intensity: p.bloomStrength * (1 + 0.6 * lv), ...(p.bloomTint ? { color: p.bloomTint } : {}) }),
        ]
      : undefined;
  // type keeps its letters: a tight glow and a modest halo, never the signal's full bloom
  const typeGlow = [glow({ radius: 3, intensity: 0.9 }), glow({ radius: 18, intensity: 0.45, ...(p.bloomTint ? { color: p.bloomTint } : {}) })];

  const waves = p.layers.map((l, i) => (data ? scope(data, t, l.windowMs, l.samples, l.delayMs) : new Array(l.samples).fill(0)));

  const hs = p.title.headlineSize;
  const headW = p.title.headline ? measureText({ text: p.title.headline, fontFamily: head, fontSize: hs, fontWeight: '400' }).width : 0;
  const kickW = p.title.kicker ? measureText({ text: p.title.kicker, fontFamily: head, fontSize: hs * 0.42, fontWeight: '400' }).width : 0;
  const scriptSize = hs * 0.5;
  const scriptW = p.title.script ? measureText({ text: p.title.script, fontFamily: script, fontSize: scriptSize, fontWeight: '400', fontStyle: 'italic' }).width : 0;
  const ty = H * p.title.y;
  const secs = Math.floor(t);
  const tc1 = `0:${String(secs).padStart(2, '0')}`;
  const tc2 = `00:${String(Math.floor((t % 1) * 100)).padStart(2, '0')}`;

  return (
    <Layer id="av" effects={[...(p.chroma > 0 ? [chromaticAberration(p.chroma)] : []), ...(p.grain > 0 ? [grain(p.grain, { seed: 11, size: 1.4 })] : [])]}>
      <Audio src={src} />
      <Rect id="av-ground" width={W} height={H} fill={p.ground} />
      <Layer id="av-cam" x={W / 2} y={H / 2} anchorX={W / 2} anchorY={H / 2} scale={s}>
        {p.grid.show ? (
          <Layer id="av-grid">
            {Array.from({ length: Math.ceil(W / p.grid.cell) + 1 }, (_, i) => (
              <Rect key={`v${i}`} id={`av-gv${i}`} x={W / 2 + (i - Math.floor(W / p.grid.cell / 2)) * p.grid.cell - p.grid.width / 2} y={0} width={p.grid.width} height={H} fill={p.grid.color} />
            ))}
            {Array.from({ length: Math.ceil(H / p.grid.cell) + 1 }, (_, i) => (
              <Rect key={`h${i}`} id={`av-gh${i}`} x={0} y={H / 2 + (i - Math.floor(H / p.grid.cell / 2)) * p.grid.cell - p.grid.width / 2} width={W} height={p.grid.width} fill={p.grid.color} />
            ))}
          </Layer>
        ) : null}

        {p.timecode.show ? (
          <Layer id="av-tc" effects={[blur(p.timecode.blur)]}>
            <Text id="av-tc1" font={head} weight={400} size={300} color={p.timecode.color} x={-30} y={H * 0.2}>
              {tc1}
            </Text>
            <Text id="av-tc2" font={head} weight={400} size={230} color={p.timecode.color} x={W * 0.58} y={H * 0.72} opacity={0.8}>
              {tc2}
            </Text>
            <Rect id="av-playhead" x={W * 0.15} y={H * 0.36} width={3} height={H * 0.28} fill={p.timecode.playhead} opacity={0.55} />
          </Layer>
        ) : null}

        {p.title.kicker ? (
          <Text id="av-kicker" font={head} weight={400} size={hs * 0.42} color={p.title.kickerColor} x={W / 2 - kickW / 2} y={ty - hs * 0.95}>
            {p.title.kicker}
          </Text>
        ) : null}

        {/* the streak: a thin horizontal flare along the centre line, brightest in the middle, swelling with the loudness */}
        {p.streak > 0 ? (
          <Layer id="av-streak" y={H / 2} opacity={p.streak * (0.55 + 0.45 * lv)} effects={[blur(10)]}>
            <Rect id="av-streak-wide" x={0} y={-14} width={W} height={28} fill={linearGradient([[0, `${p.streakColor}00`], [0.5, `${p.streakColor}cc`], [1, `${p.streakColor}00`]], { angle: 90 })} />
            <Rect id="av-streak-core" x={W * 0.1} y={-3} width={W * 0.8} height={6} fill={linearGradient([[0, '#ffffff00'], [0.5, '#ffffffee'], [1, '#ffffff00']], { angle: 90 })} />
          </Layer>
        ) : null}

        {/* the signal: every copy on the centre line, each under the two stacked glows */}
        <Layer id="av-signal" x={0} y={H / 2}>
          {p.layers.map((l, i) => (
            <Layer key={i} id={`av-l${i}`} y={l.y} opacity={l.opacity} effects={glows(l.glow)}>
              <Wave id={`av-w${i}`} v={waves[i]} w={W} layer={l} />
            </Layer>
          ))}
        </Layer>

        {p.title.headline ? (
          <Layer id="av-head" effects={typeGlow}>
            <Text id="av-headline" font={head} weight={400} size={hs} color={p.title.headlineColor} x={W / 2 - headW / 2} y={ty - hs * 0.55}>
              {p.title.headline}
            </Text>
          </Layer>
        ) : null}
        {p.title.script ? (
          <Layer id="av-script" effects={[glow({ radius: 6, intensity: 0.8 })]}>
            <Text id="av-scripttext" font={script} fontStyle="italic" weight={400} size={scriptSize} color={p.title.scriptColor} x={W / 2 + headW / 2 - scriptW * 0.85} y={ty + hs * 0.18}>
              {p.title.script}
            </Text>
          </Layer>
        ) : null}
      </Layer>
    </Layer>
  );
};
