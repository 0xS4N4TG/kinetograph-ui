// Scrapline on a poster wall: the cyberpunk reel's cut-out subject in front of public-domain posters from the
// Internet Archive (public/posters/, see CREDITS.md). A poster fills the frame and changes every 8 beats; three more
// are pinned on top of it as torn paper cut-outs, each with its own Scrapline border (a traced rectangle). The
// subject's line style and paper change every 4 beats. 130 bpm, so 16 beats are one loop of the 177-frame clip.
// Render:
//
//   node ../kinetograph/packages/cli/dist/cli.js render templates/scrapline/posters.tsx -o templates/scrapline/out/scrapline-posters.mp4

import React from 'react';
import { AbsoluteFill, Composition, Img, random, registerRoot, staticFile, useCurrentFrame } from 'remotion';
import { loadFont } from '@remotion/google-fonts/AlfaSlabOne';
import { onFrame } from '@kinetographdev/audio';
import type { OnFrameCallback } from '@kinetographdev/audio';
import { Layer, Rect, Text, Video } from '@kinetographdev/core';
import { readFileSync } from 'node:fs';
import { Scrapline, type LineName, type PaperName } from '../../plugins/paper/src/index.js';

const { fontFamily } = loadFont('normal', { weights: ['400'] });

const FPS = 24;
const W = 1920;
const H = 1080;
const CLIP = 177; // frames in the footage; it loops, and 16 beats are one loop
const BEAT = CLIP / 16;
/** The frame a beat lands on. */
const beatFrame = (k: number) => Math.round(k * BEAT);
const SECTIONS = 7; // 6 posters of 8 beats, then the outro
const OUTRO = beatFrame(8 * 6);
const TOTAL = OUTRO + 62;

const SUBJECT = staticFile('subject.mp4');
const MATTE = staticFile('matte.mp4');

// ---- the posters ----

/** Width and height of a JPEG, from its header. */
function jpegSize(file: string): [number, number] {
  const b = readFileSync(file);
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + b.readUInt16BE(i + 2);
  }
  throw new Error(`posters: no size in ${file}`);
}

const NAMES = [
  'hysm-keulen', 'rotterdamsche-lloyd', 'ringling-miss-leitzel', 'ccc-young-mans-opportunity', 'hysm-marseille',
  'forepaugh-sells', 'klm-london-by-air', 'spyker-autos', 'automobielen-rijwielen', 'ringling-hillary-long',
] as const;
type PosterName = (typeof NAMES)[number];
const POSTERS = Object.fromEntries(
  NAMES.map((n) => {
    const file = staticFile(`posters/${n}.jpg`);
    const [w, h] = jpegSize(file);
    return [n, { src: staticFile(`posters/${n}.jpg`), w, h }];
  }),
) as Record<PosterName, { src: string; w: number; h: number }>;

/** The full-frame poster of each 8-beat section, then the outro's. */
const BACKDROPS: PosterName[] = ['hysm-keulen', 'rotterdamsche-lloyd', 'ringling-miss-leitzel', 'ccc-young-mans-opportunity', 'hysm-marseille', 'forepaugh-sells', 'klm-london-by-air'];
/** Cut-outs, in the order they are pinned (a poster is skipped while it is the backdrop). */
const PIN_ORDER: PosterName[] = ['ccc-young-mans-opportunity', 'ringling-hillary-long', 'spyker-autos', 'automobielen-rijwielen', 'klm-london-by-air', 'rotterdamsche-lloyd', 'ringling-miss-leitzel', 'hysm-marseille', 'forepaugh-sells', 'hysm-keulen'];

interface Slot { x: number; y: number; w: number; h: number; rot: number; beat: number }
/**
 * Where the cut-outs go, and the beat of the section each one is pinned on. The subject sits right of centre in odd
 * sections. In even ones it starts there and moves left around beat 5, so the left cut-outs come first.
 */
const LAYOUTS: Slot[][] = [
  [
    { x: 250, y: 300, w: 380, h: 440, rot: -6, beat: 1 },
    { x: 330, y: 830, w: 440, h: 330, rot: 3, beat: 3 },
    { x: 1700, y: 290, w: 400, h: 440, rot: 5, beat: 5 },
    { x: 1650, y: 820, w: 420, h: 340, rot: -4, beat: 7 },
  ],
  [
    { x: 330, y: 540, w: 450, h: 640, rot: -4, beat: 1 },
    { x: 800, y: 250, w: 440, h: 330, rot: 4.5, beat: 3 },
    { x: 760, y: 850, w: 420, h: 300, rot: -3, beat: 5 },
  ],
];

// ---- timing ----

const sectionOf = (f: number) => Math.min(SECTIONS - 1, Math.floor((f * 16) / CLIP / 8 + 1e-9));
const sectionStart = (s: number) => beatFrame(8 * s);
const STYLES: LineName[] = ['marker', 'pencil', 'crayon', 'scribble', 'brush'];
const PAPERS: PaperName[] = ['kraft', 'white', 'cardboard', 'binder'];
const INK: Record<LineName, string> = { marker: '#111111', pencil: '#2b2b30', crayon: '#c4301f', scribble: '#1f3fa8', brush: '#16120f' };
/** The pinned cut-outs' ink, by slot. */
const PIN_INK = ['#16120f', '#1f3fa8', '#c4301f'];
const rnd = (...k: (string | number)[]) => random(k.join('-'));

// ---- the backdrop: a poster filling the frame, drifting down (or up) over its height ----

function Backdrop({ f, s }: { f: number; s: number }) {
  const p = POSTERS[BACKDROPS[s]];
  const len = (s === SECTIONS - 1 ? TOTAL : sectionStart(s + 1)) - sectionStart(s);
  const t = Math.min(1, Math.floor(((f - sectionStart(s)) / 2)) * 2 / len); // redrawn at 12 fps, like the rest
  const k = Math.max(W / p.w, H / p.h) * 1.04;
  const w = p.w * k;
  const h = p.h * k;
  const dir = s % 2 === 0 ? t : 1 - t;
  return (
    <Layer id="backdrop">
      <Layer id="backdrop-poster" x={-(w - W) * 0.5} y={-(h - H) * dir}>
        <Img src={p.src} width={w} height={h} />
      </Layer>
      <Layer id="backdrop-dim">
        <Rect width={W} height={H} fill="rgba(20,12,8,0.22)" />
      </Layer>
    </Layer>
  );
}

// ---- a cut-out poster pinned on top, with a Scrapline border round its rectangle ----

function rectPath(cx: number, cy: number, w: number, h: number, rot: number) {
  const a = (rot * Math.PI) / 180;
  const c = Math.cos(a), sn = Math.sin(a);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]]
    .map(([sx, sy], i) => {
      const dx = (sx * w) / 2, dy = (sy * h) / 2;
      return `${i ? 'L' : 'M'} ${(cx + dx * c - dy * sn).toFixed(2)} ${(cy + dx * sn + dy * c).toFixed(2)}`;
    })
    .join(' ') + ' Z';
}

/** A cut-out stamped down at `age` frames ago: it lands a little big and settles, then shifts a hair every 4 frames. */
function Pin({ f, age, name, slot, i, seed, style, paper }: {
  f: number; age: number; name: PosterName; slot: Slot; i: number; seed: number; style: LineName; paper: PaperName;
}) {
  const p = POSTERS[name];
  const fit = Math.min(slot.w / p.w, slot.h / p.h);
  const step = Math.floor(f / 4);
  const land = age < 3 ? [1.1, 1.05, 1.02][age] : 1;
  const w = p.w * fit * land, h = p.h * fit * land;
  const x = slot.x + (rnd('px', seed, i, step) - 0.5) * 3;
  const y = slot.y + (rnd('py', seed, i, step) - 0.5) * 3;
  const rot = slot.rot + (rnd('pr', seed, i, step) - 0.5) * 0.8;
  return (
    <Scrapline
      id={`pin-${i}-border`}
      trace={{ d: rectPath(x, y, w, h, rot) }}
      line={style}
      paper={paper}
      color={PIN_INK[i % PIN_INK.length]}
      offset={12}
      paperMargin={26}
      seed={`${seed}-${i}`}
      traceScale={3}
    >
      <Layer id={`pin-${i}`} x={x} y={y} rotation={rot}>
        <Layer id={`pin-${i}-img`} x={-w / 2} y={-h / 2}>
          <Img src={p.src} width={w} height={h} />
        </Layer>
      </Layer>
    </Scrapline>
  );
}

function Pins({ f, s }: { f: number; s: number }) {
  if (s === SECTIONS - 1) return null;
  const layout = LAYOUTS[s % 2];
  const backdrop = BACKDROPS[s];
  const pool = PIN_ORDER.filter((n) => n !== backdrop);
  const start = (s * 3) % pool.length;
  return (
    <>
      {layout.map((slot, i) => {
        const at = beatFrame(8 * s + slot.beat);
        if (f < at) return null;
        // a different style and paper each time a cut-out is pinned
        const seed = s * 4 + i;
        return (
          <Pin
            key={`pin-${s}-${i}`}
            f={f}
            age={f - at}
            name={pool[(start + i) % pool.length]}
            slot={slot}
            i={i}
            seed={seed}
            style={STYLES[(seed + 2) % STYLES.length]}
            paper={PAPERS[(seed + 1) % PAPERS.length]}
          />
        );
      })}
    </>
  );
}

// ---- title strips ----

function Title({ id, x, y, size, rot, text, sub }: { id: string; x: number; y: number; size: number; rot: number; text: string; sub?: string }) {
  // Alfa Slab One capitals run about 0.72 of the size per letter
  const w = text.length * size * 0.72;
  const h = size * 1.2 + (sub ? size * 0.4 : 0);
  return (
    <Scrapline
      id={`${id}-border`}
      trace={{ d: rectPath(x, y, w, h, rot) }}
      line="marker"
      paper="white"
      color="#16120f"
      offset={14}
      paperMargin={30}
      seed={id}
      traceScale={3}
    >
      <Layer id={`${id}-text`} x={x} y={y} rotation={rot}>
        <Text font={fontFamily} weight={400} size={size} color="#16120f" x={-w / 2} y={-h / 2 + size * 0.08}>{text}</Text>
        {sub ? (
          <Text font={fontFamily} weight={400} size={size * 0.26} color="#c4301f" x={-w / 2 + 6} y={h / 2 - size * 0.4}>{sub}</Text>
        ) : null}
      </Layer>
    </Scrapline>
  );
}

// ---- the composition ----

const Posters: React.FC = () => {
  const f = useCurrentFrame();
  const s = sectionOf(f);
  const half = Math.floor((f * 16) / CLIP / 4 + 1e-9); // 4-beat step for the subject's look
  const style = STYLES[half % STYLES.length];
  const paper = PAPERS[half % PAPERS.length];
  return (
    <AbsoluteFill style={{ backgroundColor: '#1a1410' }}>
      <Backdrop f={f} s={s} />
      <Pins f={f} s={s} />
      <Scrapline id="subject-border" trace={{ src: MATTE, loop: CLIP }} line={style === 'pencil' ? { style, width: 6.5 } : style} paper={paper} color={INK[style]} offset={26} threshold={40} seed={half}>
        <Video id="subject-matte" src={MATTE} width={W} height={H} loop />
        <Video id="subject" src={SUBJECT} width={W} height={H} loop matte={{ layer: 'subject-matte', mode: 'luminance' }} />
      </Scrapline>
      {f < beatFrame(5) ? <Title id="title-a" x={1000} y={115} size={92} rot={-2} text="SCRAPLINE" /> : null}
      {f >= OUTRO ? <Title id="title-b" x={820} y={905} size={150} rot={-3} text="SCRAPLINE" sub="Hand-drawn borders, torn paper" /> : null}
    </AbsoluteFill>
  );
};

registerRoot(() => (
  <Composition id="ScraplinePosters" component={Posters} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
));

// ---- sound: a kick on the beat, a hat between, a paper slap for each cut-out, a bass line (all synthesised) ----

type Ctx = Parameters<OnFrameCallback>[0];
const outs = new WeakMap<Ctx, { bus: GainNode; noise: AudioBuffer }>();
function out(ctx: Ctx) {
  let o = outs.get(ctx);
  if (!o) {
    const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = random(`noise-${i}`) * 2 - 1;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.ratio.value = 12;
    const bus = ctx.createGain();
    bus.gain.value = 0.9;
    bus.connect(limiter).connect(ctx.destination);
    o = { bus, noise };
    outs.set(ctx, o);
  }
  return o;
}

function tone(ctx: Ctx, t: number, from: number, to: number, len: number, level: number, type: OscillatorType) {
  const { bus } = out(ctx);
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(to, t + len);
  const g = ctx.createGain();
  g.gain.setValueAtTime(level, t);
  g.gain.exponentialRampToValueAtTime(0.0005, t + len);
  o.connect(g).connect(bus);
  o.start(t);
  o.stop(t + len + 0.01);
}

function burst(ctx: Ctx, t: number, freq: number, q: number, len: number, level: number, type: BiquadFilterType, key: string) {
  const { bus, noise } = out(ctx);
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(level, t);
  g.gain.exponentialRampToValueAtTime(0.0005, t + len);
  src.connect(f).connect(g).connect(bus);
  src.start(t, random(key));
  src.stop(t + len + 0.01);
}

const BASS = [55, 55, 82.4, 55, 65.4, 65.4, 98, 65.4]; // A and C roots with a fifth, one note a beat
for (let k = 0; k < 48; k++) {
  const fr = beatFrame(k);
  onFrame(fr, (ctx, t) => {
    tone(ctx, t, 150, 42, 0.22, 0.85, 'sine');
    tone(ctx, t, BASS[k % BASS.length], BASS[k % BASS.length], 0.4, 0.2, 'triangle');
    if (k % 8 === 0) burst(ctx, t, 900, 0.5, 0.35, 0.5, 'bandpass', `cut-${k}`); // the backdrop's cut
  });
  onFrame(Math.round((k + 0.5) * BEAT), (ctx, t) => burst(ctx, t, 7000, 0.7, 0.05, 0.16, 'highpass', `hat-${k}`));
}
for (let s = 0; s < SECTIONS - 1; s++) {
  LAYOUTS[s % 2].forEach((slot, i) => {
    onFrame(beatFrame(8 * s + slot.beat), (ctx, t) => burst(ctx, t, 1800, 1.2, 0.09, 0.7, 'bandpass', `slap-${s}-${i}`));
  });
}
onFrame(OUTRO, (ctx, t) => {
  tone(ctx, t, 220, 55, 0.9, 0.5, 'sawtooth');
  burst(ctx, t, 1200, 0.6, 0.6, 0.6, 'bandpass', 'outro');
});
