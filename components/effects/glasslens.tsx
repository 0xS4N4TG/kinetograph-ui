// Glass Lens. A disc of glass slides in, rests near centre-right over the reef, drifts a little and leaves. Inside it the picture is refracted the way a
// ball lens bends it (a real refraction of the view ray at the sphere's surface, with a touch of dispersion so the edges
// split into colour); the rim catches light, a soft highlight sits upper left, and the lens throws a faint shadow on the
// picture. The rest of the picture is untouched.
//
// Principles: arcs (the lens travels a curve, never a straight line), slow in and slow out (it eases across), solid
// drawing (one light, upper left: the highlight, the rim and the shadow all agree), follow through (the shadow trails the
// lens by a few frames), secondary action (the picture's own slow push-in), restraint (no bloom, no flares: glass is
// shown by what it bends).

import React from 'react';
import { z } from 'zod';
import { Layer, shader } from '@kinetographdev/core';
import { Easing, useCurrentFrame } from 'remotion';
import { NOISE } from './shaders.js';
import { H, Picture, W } from './picture.js';

export const glassLensSchema = z.object({
  src: z.string().describe('Picture in public/ (used when no children are given).'),
  radius: z.number().min(60).max(520).describe('Radius of the lens in pixels.'),
  path: z.array(z.tuple([z.number(), z.number(), z.number()])).min(2).describe('Where the lens is: [frame, x, y] keys, x and y as fractions of the frame width and height. It eases (slow in, slow out) between keys, so a key is a rest; two close keys make a hold with a little drift.'),
  ior: z.number().min(1.05).max(2).describe('Index of refraction of the glass. 1.5 is crown glass; higher bends more.'),
  depth: z.number().min(0.2).max(2).describe('How thick the lens is, as a share of its radius. More depth is more magnification.'),
  dispersion: z.number().min(0).max(0.08).describe('How far the colours split at the edge (0 for none).'),
  rim: z.number().min(0).max(1).describe('Strength of the bright rim and highlight.'),
  shadow: z.number().min(0).max(0.6).describe("Darkness of the lens's shadow on the picture."),
  push: z.number().min(0).max(0.12).describe('How far the picture pushes in over the shot.'),
});
export type GlassLensProps = z.infer<typeof glassLensSchema>;

export const glassLensDefaults: GlassLensProps = {
  src: 'photos/nasa-reef-1.jpg',
  radius: 300,
  path: [
    [0, -0.1, 0.62],
    [16, 0.3, 0.52],
    [52, 0.58, 0.44],
    [96, 0.66, 0.5],
    [128, 0.76, 0.46],
    [150, 1.2, 0.4],
  ],
  ior: 1.5,
  depth: 0.55,
  dispersion: 0.025,
  rim: 0.55,
  shadow: 0.3,
  push: 0.03,
};

const CODE = /* wgsl */ `
${NOISE}
fn bend(px: vec2<f32>, c: vec2<f32>, R: f32, ior: f32) -> vec2<f32> {
  let n = (px - c) / R;
  let r2 = min(dot(n, n), 0.9801);
  let nz = sqrt(1.0 - r2);
  let N = vec3<f32>(n.x, n.y, nz);
  let rd = refract(vec3<f32>(0.0, 0.0, -1.0), N, 1.0 / ior);
  let travel = R * u.depth / max(-rd.z, 0.25);
  return clamp(px + rd.xy * travel, vec2<f32>(1.0, 1.0), globals.canvas - vec2<f32>(1.0, 1.0));
}
fn effect(px: vec2<f32>) -> vec4<f32> {
  let c = vec2<f32>(u.cx, u.cy);
  let R = u.radius;
  let d = px - c;
  let dist = length(d);
  let t = dist / R;
  // The light is upper left; the shadow falls lower right, and trails the lens (u.lagx, u.lagy).
  let sd = (px - c - vec2<f32>(u.lagx, u.lagy) - vec2<f32>(R * 0.08, R * 0.14)) / (R * 1.04);
  let sh = (1.0 - smoothstep(0.55, 1.18, length(sd))) * u.shadow;

  let base = layer(px);
  let lr = layer(bend(px, c, R, u.ior * (1.0 - u.disp))).r;
  let lg = layer(bend(px, c, R, u.ior)).g;
  let lb = layer(bend(px, c, R, u.ior * (1.0 + u.disp))).b;
  var glass = vec3<f32>(lr, lg, lb);

  let n = d / R;
  let inside = 1.0 - smoothstep(R - 0.9, R + 0.9, dist);
  // Glass is a little darker and cooler towards its edge (more glass in the way).
  glass = glass * (1.0 - 0.2 * smoothstep(0.55, 1.0, t));
  glass = glass * vec3<f32>(0.985, 1.0, 1.01);
  // The rim: a fresnel-like rise at the edge, stronger on the lit side, plus a hairline right on the edge.
  let lit = clamp(0.5 - 0.5 * dot(normalize(n + vec2<f32>(0.0001, 0.0)), vec2<f32>(0.7071, 0.7071)), 0.0, 1.0);
  let fres = pow(clamp(t, 0.0, 1.0), 5.0);
  let hair = smoothstep(R - 3.0, R - 0.5, dist) * (1.0 - smoothstep(R - 0.5, R + 0.8, dist));
  glass = glass + vec3<f32>(1.0, 0.98, 0.95) * (fres * 0.28 * (0.4 + 0.9 * lit) + hair * 0.55 * (0.3 + 0.9 * lit)) * u.rim;
  // The highlight: a soft elongated spot upper left, and a faint counter-glow on the opposite rim.
  let hp = (n - vec2<f32>(-0.40, -0.44)) * vec2<f32>(1.0, 1.7);
  let spec = (1.0 - smoothstep(0.0, 0.34, length(hp))) * 0.55;
  let cp = n - vec2<f32>(0.52, 0.56);
  let counter = (1.0 - smoothstep(0.0, 0.42, length(cp))) * 0.10 * smoothstep(0.55, 1.0, t);
  glass = glass + vec3<f32>(1.0, 0.99, 0.97) * (spec + counter) * u.rim;

  let shaded = base.rgb * (1.0 - sh * (1.0 - inside));
  let outc = mix(shaded, glass, inside);
  return vec4<f32>(outc, base.a);
}
`;

export const GlassLens: React.FC<GlassLensProps & { children?: React.ReactNode }> = (p) => {
  const f = useCurrentFrame();
  const ease = Easing.bezier(0.45, 0, 0.15, 1);
  const at = (frame: number) => {
    const k = p.path;
    if (frame <= k[0][0]) return [k[0][1] * W, k[0][2] * H] as const;
    let i = 1;
    while (i < k.length - 1 && frame > k[i][0]) i++;
    const [f0, x0, y0] = k[i - 1];
    const [f1, x1, y1] = k[i];
    const t = ease(Math.min(1, Math.max(0, (frame - f0) / (f1 - f0))));
    return [(x0 + (x1 - x0) * t) * W, (y0 + (y1 - y0) * t) * H] as const;
  };
  const [cx, cy] = at(f);
  const [px, py] = at(f - 4);
  const push = 1 + p.push * Easing.inOut(Easing.quad)(Math.min(1, f / 150));
  return (
    <Layer
      id="glass-lens"
      effects={[
        shader({
          code: CODE,
          uniforms: { cx, cy, radius: p.radius, ior: p.ior, depth: p.depth, disp: p.dispersion, rim: p.rim, shadow: p.shadow, lagx: px - cx, lagy: py - cy },
          padding: 0,
        }),
      ]}
    >
      <Picture id="lens-pic" src={p.src} scale={push}>{p.children}</Picture>
    </Layer>
  );
};
