// Aurora Veil: soft curtains of colour drifting across the frame like the northern lights, after the Aurora background
// on shadcn.io. Two bands of repeating colour stripes, skewed 12 degrees, slide past each other in opposite directions
// (one stripe every 10 s and every 17 s), over a faint wash that fills the gaps. The layer fades out from the top right
// corner and sits at an opacity set by `intensity`, paler on a light ground and brighter on a dark one.
//
// It is one fragment shader: each pixel is un-skewed into the curtain box, sampled from the two stripe gradients and the
// wash (premultiplied, as a browser composites them), masked by the corner ellipse and laid over the ground. The drift is
// a pure function of the frame.
//
// Principles: restraint (two bands, no blur, no flicker), overlap (two periods that never line up), slow in and out
// (nothing starts or stops; the motion is constant like the real thing), staging (the fade keeps one corner lit and the
// rest of the frame free for content).

import React from 'react';
import { z } from 'zod';
import { GlslShader } from '@kinetographdev/core';
import { useCurrentFrame } from 'remotion';
import { rgb } from './lib.js';

export const W = 1920;
export const H = 1080;
export const FPS = 30;

const hex = z.string().describe('A CSS colour as #rrggbb.');

export const auroraVeilSchema = z.object({
  colors: z
    .array(hex)
    .min(1)
    .max(5)
    .describe('Up to five curtain colours, repeated when there are fewer. The third is the brightest band.'),
  mode: z.enum(['dark', 'light']).describe('Dark or light ground; the curtains are brighter on dark.'),
  ground: hex.describe('Ground colour. Leave empty to use the mode default (#0a0a0a dark, #ffffff light).').or(z.literal('')),
  intensity: z.enum(['subtle', 'medium', 'strong']).describe('How strongly the curtains show over the ground.'),
  fade: z.boolean().describe('Fade the curtains out from the top-right corner; off fills the whole frame.'),
  speed: z.number().min(0).max(6).describe('Drift speed: 2 is twice as fast, 0.5 half as fast.'),
});
export type AuroraVeilProps = z.infer<typeof auroraVeilSchema>;

export const auroraVeilDefaults: AuroraVeilProps = {
  // emerald, bright emerald, mint, light teal, teal
  colors: ['#00bc7d', '#00d492', '#5ee9b5', '#00d5be', '#00bba7'],
  mode: 'dark',
  ground: '',
  intensity: 'medium',
  fade: true,
  speed: 1,
};

/** The layer's opacity per intensity, [light, dark]. */
const INTENSITY = { subtle: [0.4, 0.5], medium: [0.6, 0.75], strong: [0.8, 0.95] } as const;

const FRAGMENT = `
precision highp float;
uniform vec2 u_res;
uniform float u_t;
uniform vec3 u_bg;
uniform vec3 u_c1; uniform vec3 u_c2; uniform vec3 u_c3; uniform vec3 u_c4; uniform vec3 u_c5;
uniform float u_opacity;
uniform float u_fade;

// a colour at an alpha, premultiplied
vec4 pm(vec3 c, float a){ return vec4(c * a, a); }

// a gradient through stops (position, premultiplied colour), clamped at both ends
vec4 ramp4(float x, float p0, vec4 s0, float p1, vec4 s1, float p2, vec4 s2, float p3, vec4 s3){
  if (x <= p0) return s0;
  if (x < p1) return mix(s0, s1, (x - p0) / (p1 - p0));
  if (x < p2) return mix(s1, s2, (x - p1) / (p2 - p1));
  if (x < p3) return mix(s2, s3, (x - p2) / (p3 - p2));
  return s3;
}
vec4 ramp5(float x, float p0, vec4 s0, float p1, vec4 s1, float p2, vec4 s2, float p3, vec4 s3, float p4, vec4 s4){
  if (x < p3) return ramp4(x, p0, s0, p1, s1, p2, s2, p3, s3);
  if (x < p4) return mix(s3, s4, (x - p3) / (p4 - p3));
  return s4;
}
vec4 over(vec4 src, vec4 dst){ return src + dst * (1.0 - src.a); }

void main(){
  float Wd = u_res.x; float Hd = u_res.y;
  // CSS pixels: x right, y down
  vec2 p = vec2(gl_FragCoord.x, Hd - gl_FragCoord.y);
  // undo skewX(-12deg) about the box centre
  float k = tan(radians(12.0));
  float xl = p.x + k * (p.y - Hd * 0.5);
  // the box runs 11% of the height past each side
  float bw = Wd + 0.22 * Hd;
  float u = xl + 0.11 * Hd;

  vec4 none = vec4(0.0);
  // the wash under the bands
  vec4 wash = ramp4(u / bw, 0.0, pm(u_c1, 0.18), 1.0/3.0, pm(u_c4, 0.22), 2.0/3.0, pm(u_c3, 0.14), 1.0, pm(u_c5, 0.22));

  // band A: stripes a quarter of the box wide, sliding left one stripe every 10 s
  float sA = 0.25 * bw;
  float tA = fract(u_t / 10.0) * sA;
  float fa = fract((u + tA) / sA);
  vec4 bandA = ramp5(fa, 0.08, none, 0.30, pm(u_c1, 0.6), 0.48, pm(u_c3, 1.0), 0.62, pm(u_c4, 0.7), 0.88, none);

  // band B: stripes a fifth of the box wide, starting 20% to the left, sliding right one stripe every 17 s
  float sB = 0.2 * bw;
  float tB = fract(u_t / 17.0) * sB;
  float fb = fract((u + 0.2 * bw - tB) / sB);
  vec4 bandB = ramp4(fb, 0.15, none, 0.40, pm(u_c2, 0.55), 0.55, pm(u_c5, 0.8), 0.80, none);

  vec4 layer = over(bandB, over(bandA, wash));

  // the fade: an ellipse at the top-right corner, through the far corner, solid to 10% and gone by 75%
  float d = length(vec2((p.x - Wd) / (Wd * 1.41421356), p.y / (Hd * 1.41421356)));
  float mask = mix(1.0, 1.0 - clamp((d - 0.10) / 0.65, 0.0, 1.0), u_fade);

  float a = u_opacity * mask;
  vec3 col = u_bg * (1.0 - layer.a * a) + layer.rgb * a;
  gl_FragColor = vec4(col, 1.0);
}
`;

export const AuroraVeil: React.FC<AuroraVeilProps> = (p) => {
  const frame = useCurrentFrame();
  const c = (n: number) => rgb(p.colors[n % p.colors.length]);
  const dark = p.mode === 'dark';
  const ground = p.ground || (dark ? '#0a0a0a' : '#ffffff');
  return (
    <GlslShader
      id="av-shader"
      width={W}
      height={H}
      fragment={FRAGMENT}
      uniforms={{
        u_res: [W, H],
        u_t: (frame / FPS) * p.speed,
        u_bg: rgb(ground),
        u_c1: c(0), u_c2: c(1), u_c3: c(2), u_c4: c(3), u_c5: c(4),
        u_opacity: INTENSITY[p.intensity][dark ? 1 : 0],
        u_fade: p.fade ? 1 : 0,
      }}
    />
  );
};
