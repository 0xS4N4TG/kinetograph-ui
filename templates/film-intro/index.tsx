// A film opening, timed to a measured quiz-landing-page opening (October 2026): an old film
// fades up over the paper as a field of soft ink dots and pushes slowly in; a thin serif line types itself across the
// middle, drawn into the film as its negative (ink over the light, paper over the dark); it lifts away in a blur, a
// second line types and holds, and the whole film lifts and blurs away to a title over the paper. 1920x1080, 60 fps.
//
// The timing is the reference page's own (its constants, read from its script): the film fades in over 0.8 s and
// zooms 1 to 1.12 over 6 s; each line types in 0.044 s a letter, the letters coming slow, fast, slow (an arccos
// curve); the first holds 1.3 s and leaves in 0.42 s (power4.out, rising 20 px, scaling to 0.985, blurring 10 px);
// the second holds 0.7 s; then the film leaves the same way over 0.9 s (sine in-out) as the title, phonetic line and
// lead fade up 10 px (1.1 s at 1.6x, power2 in-out). The film is dithered as the page dithers it (film.ts).
//
// Everything on screen is a prop. The default film (public/film.mp4) is public-domain archive film, cut on the
// reference's beats (tools/make-film.sh); the default display face is Instrument Serif, the closest Google font to
// the reference's Awesome Serif. For the side-by-side check, `reference/` holds the reference's film and face,
// never committed (README).
//
//   node ../kinetograph/packages/cli/dist/cli.js still templates/film-intro/index.tsx 150 --comp FilmIntro -o out/f150.png
//   node ../kinetograph/packages/cli/dist/cli.js render templates/film-intro/index.tsx -o templates/film-intro/out/film-intro.mp4

import React from 'react';
import { z } from 'zod';
import { Canvas, Composition, Layer, Rect, Text, blur, registerFont, registerRoot, staticFile, useCurrentFrame } from '@kinetographdev/core';
import { makeGoogleFont } from '@kinetographdev/core/google-fonts';
import { measureText } from '@remotion/layout-utils';
import { dither, toneAround, type RGB } from './film.js';

export const W = 1920;
export const H = 1080;
export const FPS = 60;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/).describe('A colour, #rrggbb.');

export const filmIntroSchema = z.object({
  line1: z.string().describe('The first line, typed over the film.'),
  line2: z.string().describe('The second line.'),
  title: z.string().describe('The title the film leaves behind. Empty for none.'),
  phonetic: z.string().describe('The italic line under the title. Empty for none.'),
  lead: z.string().describe('The grey line under that. Empty for none.'),
  film: z.object({
    src: z.string().describe('The video under the opening: a file in public/, or a path or URL.'),
    start: z.number().min(0).describe('Seconds into the video when the film appears.'),
    rate: z.number().min(0.1).max(4).describe('Playback rate.'),
  }).describe('The film.'),
  display: z.string().describe('Google Fonts family for the lines, the title and the phonetic line (a thin serif).'),
  displayFile: z.string().describe('A font file to use for the display face instead (a variable font with a weight axis works); empty to use `display`. Not for committing.'),
  ui: z.string().describe('Google Fonts family for the lead.'),
  lineWeight: z.number().min(1).max(900).describe('Weight of the typed lines. 200 in the reference (Awesome Serif); Instrument Serif has only 400.'),
  lineSize: z.number().min(10).max(160).describe('Size of the typed lines, px.'),
  titleSize: z.number().min(10).max(200).describe('Size of the title, px.'),
  titleTop: z.number().min(0).max(1080).describe('Top of the title block, px. 474 centres it; the reference sets it at 120, over a diagram.'),
  ditherWidth: z.number().int().min(100).max(1920).describe('Dots across the film. More is finer. 942 in the reference.'),
  zoom: z.number().min(1).max(2).describe('How far the film pushes in over 6 s.'),
  pace: z.number().min(0.25).max(4).describe('Speed of the whole opening; 1 is the reference.'),
  paper: hex.describe('The paper: the background and the light dots.'),
  ink: hex.describe('The ink: the type and the dark dots.'),
});
export type FilmIntroProps = z.infer<typeof filmIntroSchema>;

export const defaults: FilmIntroProps = {
  line1: 'Every frame starts as an idea',
  line2: 'What’s yours?',
  title: 'Kinetograph',
  phonetic: 'noun, 1891',
  lead: 'Motion, written in code.',
  film: { src: 'film.mp4', start: 0, rate: 1 },
  display: 'Instrument Serif',
  displayFile: '',
  ui: 'Inter',
  lineWeight: 400,
  lineSize: 44,
  titleSize: 64,
  titleTop: 474,
  ditherWidth: 942,
  zoom: 1.12,
  pace: 1,
  paper: '#F7F6F3',
  ink: '#18181A',
};

// ---- timing (seconds), the reference's ----

const PRE = 0.25; // paper before the film
const T = { fadeIn: 0.8, zoomFor: 6, beat: 0.5, per: 0.044, hold1: 1.3, hold2: 0.7, morph: 0.42, out: 0.9, after: 1.0 };
const EXPLAINER = 1.6; // the title's timeline plays 1.6x, entered 0.62 s in
const HEAD = { term: (0.7 - 0.62) / EXPLAINER, rest: (0.9 - 0.62) / EXPLAINER, dur: 1.1 / EXPLAINER };

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const power1Out = (t: number) => 1 - (1 - t) ** 2;
const power4Out = (t: number) => 1 - (1 - t) ** 5;
const sineInOut = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const power2InOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** When each letter of a line appears, from the start of its typing: 0.044 s a letter in all, slow-fast-slow. */
const letterTimes = (n: number) => {
  const total = T.per * n;
  return Array.from({ length: n }, (_, a) => (Math.acos(1 - 2 * ((a + 0.5) / n)) / Math.PI) * total);
};

export function plan(p: Pick<FilmIntroProps, 'line1' | 'line2'>) {
  const n1 = [...p.line1].length, n2 = [...p.line2].length;
  const type1 = T.beat;
  const morph1 = type1 + T.per * n1 + T.hold1;
  const type2 = morph1 + T.morph;
  const out = type2 + T.per * n2 + T.hold2;
  const end = out + T.out + T.after;
  return { n1, n2, type1, morph1, type2, out, end };
}

const durationOf = (p: FilmIntroProps) => Math.ceil(((PRE + plan(p).end) / p.pace) * FPS);

const rgb = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;

// ---- fonts ----

const googleFamily = (family: string, styles: ('normal' | 'italic')[], weights: string[]) => {
  const font = makeGoogleFont(family.replace(/\s+/g, ''));
  let name = family;
  for (const s of styles) name = font.loadFont(s, { weights }).fontFamily;
  return name;
};

const registered = new Set<string>();
/** The display family: the file when given (registered over its whole weight axis), else the Google family. */
function displayFamily(p: FilmIntroProps): string {
  if (p.displayFile) {
    const family = 'Film Intro Display';
    if (!registered.has(p.displayFile)) {
      // one registration per weight the opening sets; a variable file is set at that weight on its axis
      for (const weight of new Set([400, p.lineWeight])) {
        registerFont({ family, path: p.displayFile, weight });
        registerFont({ family, path: p.displayFile, weight, style: 'italic' });
      }
      registered.add(p.displayFile);
    }
    return family;
  }
  return googleFamily(p.display, ['normal', 'italic'], [...new Set(['400', String(p.lineWeight)])]);
}

// ---- the typed line ----

/** Letter opacities of a line `t` s after its typing began (each letter fades in over 0.03 s). */
const letters = (n: number, t: number) => letterTimes(n).map((a) => clamp((t - a) / 0.03));

interface LineState { text: string; shown: number[]; alpha: number; lift: number; scale: number; blur: number }

function lineAt(p: FilmIntroProps, t: number): LineState | null {
  const q = plan(p);
  const leave = (from: number) => {
    const e = power4Out(clamp((t - from) / T.morph));
    return { alpha: 1 - e, lift: -20 * e, scale: 1 - 0.015 * e, blur: 10 * e };
  };
  if (t < q.type1) return null;
  if (t < q.type2) return { text: p.line1, shown: letters(q.n1, t - q.type1), ...leave(q.morph1) };
  return { text: p.line2, shown: letters(q.n2, t - q.type2), ...leave(q.out) };
}

// ---- wrapping: the reference's line is at most 17em wide and balanced (CSS text-wrap: balance) ----

interface Row { text: string; start: number; width: number }

/** The line broken at spaces into rows no wider than `max`, as even as they will go; `start` is each row's first
 *  letter in the whole line, so the typing runs on across rows. */
function rows(text: string, max: number, widthOf: (s: string) => number): Row[] {
  const words = text.split(' ');
  const fill = (limit: number) => {
    const out: string[][] = [[]];
    for (const w of words) {
      const row = out[out.length - 1];
      if (row.length && widthOf([...row, w].join(' ')) > limit) out.push([w]);
      else row.push(w);
    }
    return out;
  };
  const count = fill(max).length;
  // balance: the narrowest limit that keeps the same number of rows
  let lo = 0, hi = max;
  for (let k = 0; k < 18 && count > 1; k++) {
    const mid = (lo + hi) / 2;
    if (fill(mid).length > count) lo = mid; else hi = mid;
  }
  let start = 0;
  return fill(count > 1 ? hi : max).map((r) => {
    const t = r.join(' ');
    const row = { text: t, start, width: widthOf(t) };
    start += [...t].length + 1; // and the space the break took
    return row;
  });
}

// ---- the composition ----

export const FilmIntro: React.FC<FilmIntroProps> = (p) => {
  const frame = useCurrentFrame();
  const time = (frame / FPS) * p.pace;
  const t = time - PRE; // seconds since the film appeared
  const q = plan(p);
  const paper = rgb(p.paper), ink = rgb(p.ink);
  const display = displayFamily(p);
  const ui = googleFamily(p.ui, ['normal'], ['400']);

  // the film's own fade in and its leaving
  const fadeIn = power1Out(clamp(t / T.fadeIn));
  const gone = sineInOut(clamp((t - q.out) / T.out));
  const filmAlpha = t < 0 ? 0 : fadeIn * (1 - gone);
  const zoom = 1 + (p.zoom - 1) * clamp(t / T.zoomFor);
  const film = { ...p.film, src: /^(\/|[a-z]+:)/i.test(p.film.src) ? p.film.src : staticFile(p.film.src) };
  const d = filmAlpha > 0 ? dither(film, Math.max(0, t), zoom, W, H, p.ditherWidth, paper, ink) : null;

  // the line, centred on the frame, letter-spaced -0.01em as the reference sets it
  const line = t >= 0 ? lineAt(p, t) : null;
  const track = -0.01 * p.lineSize;
  const widthOf = (text: string) =>
    measureText({ text, fontFamily: display, fontSize: p.lineSize, fontWeight: String(p.lineWeight) }).width + track * ([...text].length - 1);
  const lw = 17 * p.lineSize;
  const lh = p.lineSize * 1.2;
  const laid = line ? rows(line.text, lw, widthOf) : [];
  const blockH = laid.length * lh;
  const blockW = Math.max(0, ...laid.map((r) => r.width));
  const pad = 40;
  const box = { x: Math.floor(W / 2 - blockW / 2 - pad), y: Math.floor(H / 2 - blockH / 2 - pad - 20), w: Math.ceil(blockW + 2 * pad), h: Math.ceil(blockH + 2 * pad + 20) };

  // the title block, fading up as the film leaves
  const head = (delay: number) => power2InOut(clamp((t - q.out - delay) / HEAD.dur));
  const termK = head(HEAD.term), restK = head(HEAD.rest);

  return (
    <Layer>
      <Rect width={W} height={H} fill={p.paper} />

      {t > q.out && p.title ? (
        <Layer id="head">
          <Text font={display} weight={400} size={p.titleSize} color={p.ink} opacity={termK}
            x={0.015 * p.titleSize * ([...p.title].length - 1) / 2} y={p.titleTop + 10 * (1 - termK)} maxWidth={W} align="center"
            chars={(_c, i) => ({ x: -0.015 * p.titleSize * i })}>{p.title}</Text>
          {p.phonetic ? (
            <Text font={display} fontStyle="italic" weight={400} size={22} color={p.ink} opacity={0.62 * restK}
              x={0} y={p.titleTop + 72 + 10 * (1 - restK)} maxWidth={W} align="center">{p.phonetic}</Text>
          ) : null}
          {p.lead ? (
            <Text font={ui} weight={400} size={19} color={p.ink} opacity={0.62 * restK}
              x={0} y={p.titleTop + 113 + 10 * (1 - restK)} maxWidth={W} align="center">{p.lead}</Text>
          ) : null}
        </Layer>
      ) : null}

      {d ? (
        <Layer id="film" x={W / 2} y={H / 2 - 20 * gone} scale={1 - 0.015 * gone} opacity={filmAlpha}
          effects={gone > 0.001 ? [blur(10 * gone)] : []}>
          <Layer x={-W / 2} y={-H / 2}>
            {/* the page stretches the dots with bilinear smoothing; a picture in a canvas here is drawn unsmoothed, so a blur
                of about 0.42 dot widths (a tent filter's spread) stands in for it */}
            <Layer id="film-soft">
            <Canvas id="film-dots" width={W} height={H} draw={(ctx: any) => {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.filter = `blur(${((0.42 * d.w) / d.dw).toFixed(3)}px)`;
              ctx.drawImage(d.picture, d.x, d.y, d.w, d.h);
            }} />
            </Layer>
            {line && line.alpha > 0.001 ? (
              <>
                <Canvas id="say-tone" x={box.x} y={box.y} width={box.w} height={box.h}
                  matte={{ layer: 'say-glyphs', mode: 'alpha' }}
                  draw={(ctx: any) => ctx.drawImage(toneAround(d, box.x, box.y, box.w, box.h, paper, ink), 0, 0)} />
                <Layer id="say-glyphs" x={W / 2} y={H / 2 + line.lift} scale={line.scale} opacity={line.alpha}
                  effects={line.blur > 0.01 ? [blur(line.blur)] : []}>
                  {laid.map((r, k) => (
                    <Text key={k} font={display} weight={p.lineWeight} size={p.lineSize} color="#000000" x={-r.width / 2}
                      y={-blockH / 2 + k * lh} lineHeight={1.2}
                      chars={(_c, i) => ({ opacity: line.shown[r.start + i] ?? 1, x: track * i })}>
                      {r.text}
                    </Text>
                  ))}
                </Layer>
              </>
            ) : null}
          </Layer>
        </Layer>
      ) : null}
    </Layer>
  );
};

registerRoot(() => (
  <Composition id="FilmIntro" component={FilmIntro} schema={filmIntroSchema} defaultProps={defaults}
    durationInFrames={durationOf(defaults)} fps={FPS} width={W} height={H}
    calculateMetadata={({ props }: { props: FilmIntroProps }) => ({ durationInFrames: durationOf(props) })} />
));
