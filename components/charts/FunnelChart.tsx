// Funnel chart, after Bklit UI's Funnel Chart (MIT): a horizontal funnel of curved stages, each drawn as layered halo
// rings (three copies shrinking to 65%, 18% to 83% opaque) in one --chart colour, with the value above, a dark
// percentage pill in the middle and the stage name below. Stages enter 0.12 s apart growing from their centre; on
// hover the halo rings of a stage breathe out in turn (spring 300/24, softer for each ring in) and the other stages
// drop to 40%.
//
// Shot: the camera starts tight on the first stage as it blooms, then dollies stage to stage along the funnel. Each
// stage blooms just before the camera lands on it, holds so the number can be read, and the camera leaves with a small
// pull back. Neighbouring stages are soft while it holds. After the last stage it pulls out to the whole funnel with
// motion blur and overshoot, and the final stage takes the hover: its halos breathe, the others dim.
//
// Principles: staging (one stage a beat, the camera arrives as the subject does), anticipation (pull back before each
// leave), follow-through (the pill and numbers count after the bloom), overlap (rings breathe one after another),
// timing (holds to read), focus that lands on the stage in frame.

import React from 'react';
import { z } from 'zod';
import { Layer, Path, Rect, Text } from '@kinetographdev/core';
import { Cam, H, W, clamp01, easeOut, lerp, seg, useFonts } from './lib.js';
import { PX, backOut, bkModeSchema, bkPaletteSchema, easeBk, group, moveCurve, shutterFor, soft, tokens, sansWidth } from './bklit.js';
import { Backdrop, Heading, Soft } from './bklitParts.js';

export const FUNNEL_FPS = 60;

export const funnelSchema = z.object({
  data: z.array(z.object({
    label: z.string().describe('Stage name.'),
    value: z.number().min(0).describe('Stage value; the first is 100%.'),
  })).min(2).max(6).describe('The stages, widest first.'),
  title: z.string().describe('Heading.'),
  subtitle: z.string().describe('Muted line under the heading.'),
  mode: bkModeSchema,
  palette: bkPaletteSchema,
  color: z.number().int().min(0).max(4).describe('Which palette colour (0 to 4) the funnel is drawn in.'),
  layers: z.number().int().min(1).max(5).describe('Halo rings per stage (Bklit default 3).'),
  gap: z.number().min(0).max(40).describe('Gap between stages in pixels.'),
  stageSeconds: z.number().min(0.5).max(4).describe('Time on each stage: the dolly in and the hold.'),
  holdSeconds: z.number().min(0).max(8).describe('How long the last frame holds.'),
  camera: z.object({
    tightZoom: z.number().min(1.2).max(3).describe('Zoom while on a stage.'),
    wideZoom: z.number().min(0.7).max(1.3).describe('Zoom of the whole funnel.'),
    motionBlur: z.number().min(0).max(1.5).describe('Strength of the motion blur on the fast moves; 0 turns it off.'),
    rackFocus: z.number().min(0).max(12).describe('Blur in pixels on the stages beside the one in frame.'),
  }).describe('Camera.'),
});
export type FunnelProps = z.infer<typeof funnelSchema>;

export const funnelDefaults: FunnelProps = {
  data: [
    { label: 'Visitors', value: 12000 }, { label: 'Signups', value: 4800 }, { label: 'Activated', value: 2100 }, { label: 'Paid', value: 840 },
  ],
  title: 'Signup funnel',
  subtitle: 'Visitors to paying customers, last 90 days',
  mode: 'light',
  palette: 'primary',
  color: 0,
  layers: 3,
  gap: 8,
  stageSeconds: 1.45,
  holdSeconds: 1.8,
  camera: { tightZoom: 1.3, wideZoom: 1, motionBlur: 1, rackFocus: 4 },
};

const S = (s: number) => Math.round(s * FUNNEL_FPS);
const times = (p: FunnelProps) => {
  const n = p.data.length;
  const st = S(p.stageSeconds);
  const t0 = S(0.15);
  // camera arrives at stage i at arrive[i]; leaves after the hold
  const arrive: number[] = [];
  for (let i = 0; i < n; i++) arrive[i] = i === 0 ? t0 : t0 + i * st;
  const lastHold = arrive[n - 1] + S(0.9);
  const a0 = lastHold;
  const m0 = a0 + S(0.3);
  const m1 = m0 + S(1.6);
  const h0 = m1 + S(0.15);
  const h1 = h0 + S(0.8);
  return { st, arrive, a0, m0, m1, h0, h1, end: h1 + S(p.holdSeconds) };
};
export const funnelDuration = (p: FunnelProps) => times(p).end;

const X0 = 150;
const X1 = 1770;
const CY = 600;
const FH = 800; // the funnel's height

export const FunnelChart: React.FC<{ f: number } & FunnelProps> = ({ f, ...p }) => {
  const fonts = useFonts();
  const tk = tokens(p.mode, p.palette);
  const col = tk.series[p.color];
  const n = p.data.length;
  const T = times(p);
  const segW = (X1 - X0 - p.gap * (n - 1)) / n;
  const segX = (i: number) => X0 + i * (segW + p.gap);
  const cxOf = (i: number) => segX(i) + segW / 2;
  const max = p.data[0].value;
  const norms = p.data.map((d) => d.value / max);

  // the bloom of each stage: lands as the camera does
  const bloomAt = (i: number) => (i === 0 ? 0 : T.arrive[i] - S(0.35));
  const bloom = (i: number) => seg(f, bloomAt(i), bloomAt(i) + S(0.9), easeBk);

  // ---- camera
  const wide: [number, number, number] = [W / 2, 548, p.camera.wideZoom];
  const camAt = (ff: number): [number, number, number] => {
    // dolly between stage positions with anticipation and overshoot
    let x = cxOf(0);
    let z = p.camera.tightZoom;
    for (let i = 1; i < n; i++) {
      const t0 = T.arrive[i] - S(0.55);
      const t1 = T.arrive[i];
      if (ff >= t0) {
        const w = moveCurve(seg(ff, t0, t1, (t) => t), 0.05, 0.035);
        x = lerp(cxOf(i - 1), cxOf(i), w);
        // a breath out in the middle of the dolly
        z = p.camera.tightZoom * (1 - 0.07 * Math.sin(Math.PI * clamp01(seg(ff, t0, t1, (t) => t))));
      }
    }
    const a = seg(ff, T.a0, T.m0, (t) => t * t * (3 - 2 * t));
    z *= 1 + 0.05 * a;
    const w = moveCurve(seg(ff, T.m0, T.m1, (t) => t), 0, 0.055);
    return [lerp(x, wide[0], w), lerp(CY, wide[1], w), Math.exp(lerp(Math.log(z), Math.log(wide[2]), w))];
  };
  const cam = camAt(f);
  const shutter = shutterFor(camAt(Math.max(0, f - 1)), cam) * p.camera.motionBlur;
  const sharp = seg(f, T.m0 + S(0.2), T.m1 - S(0.3), easeOut);
  // which stage the camera is on (nearest centre)
  let cur = 0;
  for (let i = 1; i < n; i++) if (Math.abs(cxOf(i) - cam[0]) < Math.abs(cxOf(cur) - cam[0])) cur = i;

  // ---- final hover on the last stage
  const hov = seg(f, T.h0, T.h1, easeOut);
  const hovI = n - 1;
  const reveal = seg(f, 0, S(0.3), easeOut);

  // stage path: smooth trapezoid from this stage's height to the next stage's
  const stagePath = (i: number, scale: number) => {
    const h0 = norms[i] * FH * 0.4 * scale;
    const h1 = norms[Math.min(i + 1, n - 1)] * FH * 0.4 * scale;
    const my = FH / 2;
    const cx = segW * 0.55;
    return `M0 ${my - h0}C${cx} ${my - h0} ${segW - cx} ${my - h1} ${segW} ${my - h1}L${segW} ${my + h1}C${segW - cx} ${my + h1} ${cx} ${my + h0} 0 ${my + h0}Z`;
  };

  return (
    <Layer id="funnel-root">
      <Backdrop tk={tk} W={W} H={H} />
      <Cam id="funnel-cam" x={cam[0]} y={cam[1]} zoom={cam[2]} blur={shutter}>
        <Heading id="funnel-head" x={X0} y={96} title={p.title} sub={p.subtitle} tk={tk} fonts={fonts} opacity={seg(f, T.m0 + S(0.3), T.m1 - S(0.2), easeOut)} />

        {p.data.map((d, i) => {
          const b = bloom(i);
          if (b <= 0.001) return null;
          const isHov = hov > 0 && i === hovI;
          const dim = hov > 0 && i !== hovI ? 1 - 0.45 * hov : 1;
          const depth = i === cur ? 0 : 1 - sharp;
          const lab = seg(f, bloomAt(i) + S(0.25), bloomAt(i) + S(0.65), easeOut);
          const pctN = (d.value / max) * 100;
          const valueNow = d.value * clamp01(lab * 1.0 + (b - 1) * 0) * easeOut(seg(f, bloomAt(i) + S(0.2), bloomAt(i) + S(1.0), (t) => t));
          const pctNow = pctN * easeOut(seg(f, bloomAt(i) + S(0.2), bloomAt(i) + S(1.0), (t) => t));
          const pillText = `${Math.round(pctNow)}%`;
          const pw = sansWidth('100%', 12 * PX) + 24 * PX;
          const ph = 12 * PX * 1.25 + 8 * PX;
          return (
            <Soft key={i} id={`funnel-soft-${i}`} r={soft(depth, p.camera.rackFocus)} opacity={dim * reveal}>
              {/* the halo rings, outermost first */}
              <Layer id={`funnel-seg-${i}`} x={segX(i) + segW / 2} y={CY} anchorX={segW / 2} anchorY={FH / 2} scale={b}>
                {Array.from({ length: p.layers }, (_, l) => {
                  const sc = 1 - (l / p.layers) * 0.35;
                  const op = 0.18 + (l / (p.layers - 1 || 1)) * 0.65;
                  // hover: rings breathe out one after another (inner rings further)
                  const k = isHov ? backOut(clamp01(hov * 1.4 - l * 0.18), 2) : 0;
                  const sy = 1 + (l / Math.max(p.layers - 1, 1)) * 0.12 * k;
                  return <Path key={l} id={`funnel-p-${i}-${l}`} d={stagePath(i, sc * sy)} fill={col} opacity={op} />;
                })}
              </Layer>
              {/* value above, pill in the middle, name below */}
              <Layer id={`funnel-lab-${i}`} opacity={lab} y={(1 - lab) * 8}>
                <Text id={`funnel-val-${i}`} x={segX(i)} y={CY - FH * 0.5 + 14} maxWidth={segW} align="center" font={fonts.sans} weight={600} size={14 * PX} color={tk.fg}>{group(valueNow)}</Text>
                <Rect id={`funnel-pill-${i}`} x={segX(i) + segW / 2 - pw / 2} y={CY - ph / 2} width={pw} height={ph} radius={ph / 2} fill={tk.fg} />
                <Text id={`funnel-pct-${i}`} x={segX(i) + segW / 2 - pw / 2} y={CY - (12 * PX * 1.25) / 2} maxWidth={pw} align="center" font={fonts.sans} weight={600} size={12 * PX} color={tk.bg}>{pillText}</Text>
                <Text id={`funnel-name-${i}`} x={segX(i)} y={CY + FH * 0.5 - 14 - 12 * PX * 1.25} maxWidth={segW} align="center" font={fonts.sans} weight={500} size={12 * PX} color={tk.mutedFg}>{d.label}</Text>
              </Layer>
            </Soft>
          );
        })}
      </Cam>
    </Layer>
  );
};

void lerp;
