// Shot 07 (197-240): "But, what if [app]" on black over an LED dot matrix. "But," blurs in big, "what", "if" and
// the app glyph follow while the camera eases back; from 214 coloured light (red above, violet below left, amber
// above right) blooms through the dots, then the line whips out to the left.

import React from 'react';
import { random, useCurrentFrame } from 'remotion';
import { Canvas, Ellipse, Layer, Rect, Text, blur, radialGradient } from '@kinetographdev/core';
import { AppGlyph, H, UI, W, keys, ramp } from '../lib.js';
import { textWidth } from './b-common.js';

const FROM = 197;
const lin = (t: number) => t;

// The line's total width at scale 1 (measured on the reference at 228), its left edge and scale over time.
const LINE_W = 476;
const LEFT: [number, number][] = [
  [197, 310], [199, 390], [203, 440], [209, 436], [212, 410], [216, 340], [222, 300], [228, 284], [234, 250],
  [237, 232], [239, 130], [241, -160],
];
const SCALE: [number, number][] = [
  [197, 2.8], [199, 2.1], [203, 1.33], [209, 1.27], [212, 1.25], [216, 1.17], [222, 1.03], [228, 1], [236, 0.98],
];
const CY = 402;

// colour light that blooms through the matrix: x, y (fractions), colour, drift per frame
const LIGHTS: [number, number, string, number, number][] = [
  [0.5, 0.0, '#e01a30', 0.0025, 0.001],
  [0.35, 1.0, '#b21ce8', 0.004, -0.002],
  [0.9, 0.15, '#d88a22', -0.002, 0.002],
  [0.95, 0.95, '#c42a70', -0.003, -0.001],
  [0.02, 0.1, '#3a40ff', 0.002, 0.003],
];

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));

/** The matrix: grey dots in lit blocks, fewer round the text, zooming out; later tinted by the lights. */
function drawDots(ctx: CanvasRenderingContext2D, g: number) {
  const pitch = keys(g, [[197, 54], [203, 46], [212, 34], [222, 27.5], [228, 26]], lin);
  const fill = keys(g, [[197, 0.3], [212, 0.5], [220, 0.65], [228, 0.85], [240, 0.95]], lin);
  const colour = ramp(g, 212, 228, 0, 1);
  const step = Math.floor(g / 3);
  const lights = LIGHTS.map(([x, y, c, dx, dy]) => ({ x: (x + dx * (g - 214)) * W, y: (y + dy * (g - 214)) * H, rgb: hex(c) }));
  const cols = Math.ceil(W / pitch / 2) + 1;
  const rows = Math.ceil(H / pitch / 2) + 1;
  const r = pitch * 0.17;
  for (let j = -rows; j <= rows; j++) {
    for (let i = -cols; i <= cols; i++) {
      const x = W / 2 + i * pitch;
      const y = H / 2 + j * pitch;
      // lit in blocks of 4 x 2 dots, re-dealt every 3 frames, then dot by dot
      const block = random(`dm-b-${Math.floor(i / 4)}-${Math.floor(j / 2)}-${step}`);
      const dot = random(`dm-d-${i}-${j}-${Math.floor(step / 2)}`);
      if (block > fill + 0.15 || dot > fill + 0.35) continue;
      // darker round the words
      const dx = (x - 540) / 520;
      const dy = (y - 400) / 170;
      const hush = Math.min(1, 0.1 + 0.9 * (dx * dx + dy * dy)) * (1 - colour * 0.3) + colour * 0.3;
      const lum = (0.22 + 0.48 * random(`dm-l-${i}-${j}-${step}`)) * hush * ramp(g, 197, 206, 0.25, 1);
      let rr = 200;
      let gg = 200;
      let bb = 200;
      let glow = 1;
      if (colour > 0) {
        // tinted only near a light; between the lights the dots go dim
        let cr = 0;
        let cg = 0;
        let cb = 0;
        let wsum = 0;
        for (const l of lights) {
          const d = Math.hypot(x - l.x, y - l.y) / 460;
          const w = Math.exp(-d * d * (l === lights[4] ? 30 : 4));
          cr += l.rgb[0] * w;
          cg += l.rgb[1] * w;
          cb += l.rgb[2] * w;
          wsum += w;
        }
        const m = Math.min(1, wsum) * colour;
        const n = Math.max(wsum, 1);
        rr = rr * (1 - m) + (cr / n) * m;
        gg = gg * (1 - m) + (cg / n) * m;
        bb = bb * (1 - m) + (cb / n) * m;
        glow = 1 - colour * 0.45 + m * 0.5;
      }
      ctx.globalAlpha = Math.min(1, lum * glow);
      ctx.fillStyle = `rgb(${rr | 0},${gg | 0},${bb | 0})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export const WhatIf: React.FC = () => {
  const g = useCurrentFrame() + FROM;

  const base = 100;
  const butW = textWidth('But', UI, base, 800);
  const wBut = butW + textWidth(',', UI, base, 400);
  const wWhat = textWidth('what', UI, base, 400);
  const wSpace = textWidth(' ', UI, base, 400);
  const wIf = textWidth('if', UI, base, 400);
  const total = wBut + 4 + wWhat + wSpace + wIf + 24 + base * 1.15;
  const size = (LINE_W / total) * base;
  const k = size / base;
  const xs = [0, (wBut + 4) * k, (wBut + 4 + wWhat + wSpace) * k, (wBut + 4 + wWhat + wSpace + wIf + 24) * k];
  const glyph = size * 1.15;

  const word = (a: number, dur: number, from: number) => ({
    opacity: ramp(g, a, a + 2, 0, 1),
    effects: g < a + dur ? [blur(ramp(g, a, a + dur, from, 0))] : undefined,
  });
  const top = CY - size * 0.6;
  const colour = ramp(g, 212, 228, 0, 1);

  return (
    <Layer>
      <Rect width={W} height={H} fill="#030303" />
      {colour > 0 && (
        <Layer opacity={colour * 0.34} effects={[blur(80)]}>
          {LIGHTS.map(([x, y, c, dx, dy], i) => i === 2 || i === 3 ? null : (
            <Ellipse
              key={i}
              x={(x + dx * (g - 214)) * W - (i === 4 ? 130 : 280)}
              y={(y + dy * (g - 214)) * H - (i === 4 ? 100 : 190)}
              width={i === 4 ? 260 : 560}
              height={i === 4 ? 200 : 380}
              fill={radialGradient([c, `${c}00`])}
            />
          ))}
        </Layer>
      )}
      <Canvas
        width={W}
        height={H}
        effects={[blur(keys(g, [[197, 7], [199, 5], [203, 2.6], [210, 2.2]], lin))]}
        draw={(ctx) => drawDots(ctx as unknown as CanvasRenderingContext2D, g)}
      />

      <Layer id="whatif-line" x={keys(g, LEFT, lin)} y={CY} scale={keys(g, SCALE, lin)} motionBlur={{ samples: 16, shutter: g < 198 ? 0 : g < 237 ? 0.6 : 1 }}>
        <Layer y={-CY}>
          <Text font={UI} weight={800} size={size} color="#fff" x={xs[0]} y={top} {...word(195, 6, 4.5)}>
            But
          </Text>
          <Text font={UI} weight={400} size={size} color="#fff" x={xs[0] + butW * k} y={top} {...word(195, 6, 4.5)}>
            ,
          </Text>
          <Text font={UI} weight={400} size={size} color="#f4f4f4" x={xs[1]} y={top} {...word(206, 4, 8)}>
            what
          </Text>
          <Text font={UI} weight={400} size={size} color="#f4f4f4" x={xs[2]} y={top} {...word(210, 4, 8)}>
            if
          </Text>
          {g >= 213 && (
            <Layer x={xs[3] + glyph / 2} y={CY} scale={ramp(g, 213, 216, 0.7, 1)} {...word(213, 4, 6)}>
              <Layer x={-glyph / 2} y={-glyph / 2}>
                <AppGlyph size={glyph} />
              </Layer>
            </Layer>
          )}
        </Layer>
      </Layer>
    </Layer>
  );
};
