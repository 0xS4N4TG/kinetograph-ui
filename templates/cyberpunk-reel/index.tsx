// A 9.2 s reel (a TouchDesigner pop-art effect) in Kinetograph: plain
// footage of a person keeps cutting to an anime poster look, built the way the
// reference's own breakdown describes it:
//
//   1. the person: a matte, the camera turned grey and flattened into anime tones
//      (a Kuwahara filter), painted in blue gradients, light above and dark below,
//      with ink lines, yellow and orange lines on the lit edge and coral on the other;
//   2. the background: the camera as a halftone, cyan above and purple below;
//      18 jagged rays from behind the chest, reshaped three times a second; 188
//      low-poly shapes of 8 kinds flying out from the person, cel shaded with dotted
//      shadows, some in front of the person and some behind; flames around the body
//      in three colour layers; the title in three tilted rows.
//
// The cuts in spread out as shards from a line burst, the cuts out break into
// slices, and one cut opens on a yellow flash frame. The on/off timing is the
// reference's, measured frame by frame (24 fps, timing.ts).
//
// The footage is public domain: shot_031 of "Military Assistance Advisory Group
// (MAAG), Sea Swallow OPN Strategic Hamlet, Tuy Hoa, Phu-Yen Province, South
// Vietnam" (US National Archives, found on destockd.com). tools/make-media.sh
// crops it, makes the person matte with macOS Vision and tracks the person
// (track.ts). Everything else is drawn here from `random(seed)`, at 12 drawings
// a second like cel animation.
//
// Render on the M4:
//   npx kinetograph strip examples/cyberpunk-reel/index.tsx -n 12 -o examples/cyberpunk-reel/out/strip.png
//   npx kinetograph render examples/cyberpunk-reel/index.tsx -o examples/cyberpunk-reel/out/cyberpunk-reel.mp4
// The reference reel (not committed) goes in reference/reel.mp4.

import React from 'react';
import { AbsoluteFill, Composition, Sequence, random, registerRoot, staticFile, useCurrentFrame } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Montserrat';
import { Layer, Path, Rect, Text, Video, blur, halftone, linearGradient, shader } from '@kinetographdev/core';
import { DROPOUT, FLASH, WINDOWS } from './timing.js';
import { TRACK_X } from './track.js';
import './sound.js';

const { fontFamily } = loadFont('normal', { weights: ['800', '900'] });

const W = 1920;
const H = 1080;
const FPS = 24;
const DURATION = 221;
// The clip is 7.4 s; slowed to fill the reel's 9.2 s.
const RATE = 0.8;
const SUBJECT = staticFile('subject.mp4');
const MATTE = staticFile('matte.mp4');

const YELLOW = '#ffe41a';
// the title strips: a lime yellow of our own, cooler than the rays
const STRIP = '#d9ff2e';
const NAVY = '#0c0f4f';
const PURPLE = '#2b1660';

// ---- timing ----

interface State {
  p: number;
  phase: 'off' | 'in' | 'full' | 'out';
  w: number;
}

function stateAt(f: number): State {
  if (f === DROPOUT) return { p: 0, phase: 'off', w: 0 };
  for (let w = 0; w < WINDOWS.length; w++) {
    const {
      in: [a, b],
      out: [c, d],
    } = WINDOWS[w];
    if (f >= a && f < b) return { p: (f - a + 1) / (b - a + 1), phase: 'in', w };
    if (f >= b && f < c) return { p: 1, phase: 'full', w };
    if (f >= c && f < d) return { p: 1 - (f - c + 1) / (d - c + 1), phase: 'out', w };
  }
  return { p: 0, phase: 'off', w: 0 };
}

/** Holds each drawing for two frames: 12 drawings a second. */
const twos = (f: number) => f - (f % 2);
const rnd = (...k: (string | number)[]) => random(k.join('-'));

/** Behind the chest: the person's x in this frame of the clip, a fixed height. */
function chest(f: number): [number, number] {
  return [TRACK_X[Math.min(TRACK_X.length - 1, Math.floor(f * RATE))], 820];
}

function poly(pts: [number, number][]): string {
  return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ') + ' Z';
}

/** A hex colour as linear RGB, for shader uniforms. */
function linear(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.pow(c / 255, 2.2)) as [number, number, number];
}

// ---- WGSL ----

const COMMON = `
fn hash2(p: vec2<f32>) -> f32 {
  let q = fract(p * vec2<f32>(123.34, 456.21));
  let r = q + dot(q, q + 45.32);
  return fract(r.x * r.y);
}
fn vnoise(p: vec2<f32>) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let s = f * f * (3.0 - 2.0 * f);
  let a = hash2(i);
  let b = hash2(i + vec2<f32>(1.0, 0.0));
  let c = hash2(i + vec2<f32>(0.0, 1.0));
  let d = hash2(i + vec2<f32>(1.0, 1.0));
  return mix(mix(a, b, s.x), mix(c, d, s.x), s.y);
}
fn lin(c: vec3<f32>) -> vec3<f32> { return pow(c, vec3<f32>(2.2)); }
fn lum(c: vec4<f32>) -> f32 {
  let s = pow(max(c.rgb, vec3<f32>(0.0)), vec3<f32>(1.0 / 2.2));
  return dot(s, vec3<f32>(0.2126, 0.7152, 0.0722));
}
`;

// Step 1a: the camera in grey, flattened by a Kuwahara filter. Each pixel takes the mean of whichever of its four
// neighbouring squares varies least, which keeps edges and wipes out fine shading. Writes the tone into red.
const KUWAHARA = `${COMMON}
fn effect(px: vec2<f32>) -> vec4<f32> {
  var best = 1e9;
  var tone = 0.0;
  for (var q = 0; q < 4; q++) {
    let sx = select(-1.0, 1.0, (q & 1) == 1);
    let sy = select(-1.0, 1.0, (q & 2) == 2);
    var sum = 0.0;
    var sq = 0.0;
    for (var j = 0; j <= 5; j++) {
      for (var i = 0; i <= 5; i++) {
        let v = lum(layer(px + vec2<f32>(sx * f32(i), sy * f32(j)) * 3.0));
        sum += v;
        sq += v * v;
      }
    }
    let mean = sum / 36.0;
    let variance = sq / 36.0 - mean * mean;
    if (variance < best) { best = variance; tone = mean; }
  }
  return vec4<f32>(tone, tone, tone, 1.0);
}`;

// Step 1b: the flattened tones in four blues, lighter above and darker below, with ink where the tone steps.
const TONES = `${COMMON}
fn level(px: vec2<f32>) -> f32 {
  let l = clamp((layer(px).r - 0.08) * 2.6, 0.0, 1.0);
  return floor(min(l, 0.999) * 4.0);
}
fn effect(px: vec2<f32>) -> vec4<f32> {
  let k = level(px);
  let ink = abs(level(px + vec2<f32>(2.0, 0.0)) - k) + abs(level(px + vec2<f32>(0.0, 2.0)) - k);
  var top = vec3<f32>(0.07, 0.11, 0.42);
  var bot = vec3<f32>(0.02, 0.02, 0.11);
  if (k >= 1.0) { top = vec3<f32>(0.17, 0.30, 0.86); bot = vec3<f32>(0.07, 0.10, 0.40); }
  if (k >= 2.0) { top = vec3<f32>(0.33, 0.56, 1.0); bot = vec3<f32>(0.12, 0.20, 0.66); }
  if (k >= 3.0) { top = vec3<f32>(0.60, 0.80, 1.0); bot = vec3<f32>(0.18, 0.31, 0.86); }
  let s = smoothstep(0.25, 1.0, px.y / globals.canvas.y);
  var col = mix(top, bot, s);
  if (ink >= 1.0 && k >= 1.0) { col = vec3<f32>(0.03, 0.03, 0.15); }
  return vec4<f32>(lin(col), 1.0);
}`;

// Step 1c: lines on the edges, read from the matte. Light comes from the upper right: where the matte ends a little
// way towards the light the pixel is on the lit edge (orange, then yellow right at the edge); where it ends a
// little way the other way it is on the shadow edge (coral). The orange band's width wanders like a brush.
const RIM = `${COMMON}
fn m(px: vec2<f32>) -> f32 { return step(0.5, layer(px).r); }
fn effect(px: vec2<f32>) -> vec4<f32> {
  if (m(px) < 0.5) { return vec4<f32>(0.0); }
  let L = normalize(vec2<f32>(1.0, -0.7));
  // the orange reaches far in, cut into spiky tufts: coarse noise for its depth, fine noise for the spikes
  let deep = vnoise(px * 0.006 + vec2<f32>(u.seed * 0.11, 3.0));
  let spikes = vnoise(vec2<f32>(px.x * 0.05, px.y * 0.018) + vec2<f32>(u.seed * 0.7, 0.0));
  let wide = 30.0 + 190.0 * deep * deep + 70.0 * spikes * spikes * spikes;
  if (m(px + L * 7.0) < 0.5) { return vec4<f32>(lin(vec3<f32>(1.0, 0.9, 0.3)), 1.0); }
  if (m(px + L * wide) < 0.5) { return vec4<f32>(lin(vec3<f32>(1.0, 0.6, 0.16)), 1.0); }
  if (m(px - L * 6.0) < 0.5) { return vec4<f32>(lin(vec3<f32>(1.0, 0.42, 0.42)), 1.0); }
  return vec4<f32>(0.0);
}`;

// A thin light-blue line just outside the figure: the blurred matte above a low level.
const OUTLINE = `
fn effect(px: vec2<f32>) -> vec4<f32> {
  if (layer(px).r < 0.1) { return vec4<f32>(0.0); }
  return vec4<f32>(pow(vec3<f32>(0.62, 0.9, 1.0), vec3<f32>(2.2)), 1.0);
}`;

// Flames: the blurred matte, read from a little lower so they rise above the figure, cut at a level that tall
// noise columns push outwards into tongues. One colour per layer; three layers.
const FLAMES = `${COMMON}
fn effect(px: vec2<f32>) -> vec4<f32> {
  let v = layer(px + vec2<f32>(0.0, u.lift)).r;
  let cols = vnoise(vec2<f32>(px.x * 0.016 + u.seed * 7.1, u.seed * 0.9));
  let wob = vnoise(vec2<f32>(px.x * 0.03, px.y * 0.012 + u.seed * 0.6));
  let n = 0.6 * cols + 0.4 * wob;
  if (v < u.base - u.reach * smoothstep(0.4, 0.85, n)) { return vec4<f32>(0.0); }
  return vec4<f32>(u.r, u.g, u.b, 1.0);
}`;

// Glitch slices: some horizontal bands slide sideways, the red channel a little further.
const SLICES = `${COMMON}
fn effect(px: vec2<f32>) -> vec4<f32> {
  if (u.amount <= 0.0) { return layer(px); }
  let band = floor(px.y / (18.0 + 40.0 * hash2(vec2<f32>(floor(px.y / 64.0), u.seed))));
  let h = hash2(vec2<f32>(band, u.seed + 3.0));
  var dx = 0.0;
  if (h > 0.62) { dx = (hash2(vec2<f32>(band, u.seed + 9.0)) - 0.5) * 320.0 * u.amount; }
  let c = layer(px + vec2<f32>(dx, 0.0));
  let r = layer(px + vec2<f32>(dx + 14.0 * u.amount, 0.0));
  return vec4<f32>(r.r, c.g, c.b, max(c.a, r.a));
}`;

// ---- step 2: the background ----

/** The camera as a halftone over a cyan-to-purple gradient. */
function HalftoneCamera() {
  return (
    <Layer id="bg-camera">
      <Rect width={W} height={H} fill={linearGradient(['#5cc8ff', '#4b86f2', '#6b46d6', '#7a33c4'])} />
      <Video
        id="bg-dots"
        src={SUBJECT}
        width={W}
        height={H}
        playbackRate={RATE}
        opacity={0.8}
        effects={[halftone({ size: 11, angle: 45, color: '#1b2a8e', invert: true })]}
      />
    </Layer>
  );
}

/** 18 jagged rays from behind the chest, reshaped every 8 frames (three times a second). */
function Rays({ f }: { f: number }) {
  const [ox, oy] = chest(f);
  const shape = Math.floor(f / 8);
  const rays: React.ReactNode[] = [];
  for (let i = 0; i < 18; i++) {
    const a = ((i + rnd('ray-a', i, shape) * 0.7) / 18) * Math.PI * 2;
    // wide wedges: together the 18 rays cover more than half of the circle
    const span = 0.11 + rnd('ray-s', i, shape) * 0.12;
    const near = 120 + rnd('ray-n', i, shape) * 160;
    const far = 2300;
    // each edge zigzags outwards: teeth every so often, alternately cut in and pushed out
    const edge = (side: number) => {
      const pts: [number, number][] = [];
      const teeth = 5 + Math.floor(rnd('ray-t', i, shape, side) * 4);
      for (let k = 0; k <= teeth; k++) {
        const d = near + ((far - near) * k) / teeth;
        const kick = k > 0 && k < teeth ? (k % 2 ? 1 : -0.6) * span * 0.45 : 0;
        const ang = a + side * (span / 2) * (d / far + 0.15) + side * kick * (d / far);
        pts.push([ox + Math.cos(ang) * d, oy + Math.sin(ang) * d]);
      }
      return pts;
    };
    const d = poly([...edge(-1), ...edge(1).reverse()]);
    rays.push(<Path key={i} d={d} fill={i % 7 === 6 ? NAVY : i % 5 === 4 ? '#5ab8ff' : YELLOW} />);
  }
  return <Layer id="rays">{rays}</Layer>;
}

// Eight low-poly kinds, each a list of vertices and faces (any winding; faces are turned to face outwards).
type V3 = [number, number, number];
interface Mesh {
  v: V3[];
  f: number[][];
}

function ring(n: number, r: number, y: number, phase = 0): V3[] {
  return Array.from({ length: n }, (_, i) => {
    const a = phase + (i / n) * Math.PI * 2;
    return [Math.cos(a) * r, y, Math.sin(a) * r] as V3;
  });
}
function prism(n: number, r: number, h: number): Mesh {
  const v = [...ring(n, r, -h, Math.PI / n), ...ring(n, r, h, Math.PI / n)];
  const f = [Array.from({ length: n }, (_, i) => i), Array.from({ length: n }, (_, i) => n + i)];
  for (let i = 0; i < n; i++) f.push([i, (i + 1) % n, n + ((i + 1) % n), n + i]);
  return { v, f };
}
function cone(n: number, r: number, h: number, both: boolean): Mesh {
  const v: V3[] = [...ring(n, r, 0, Math.PI / 4), [0, -h, 0], [0, h, 0]];
  const f: number[][] = [];
  for (let i = 0; i < n; i++) {
    f.push([i, (i + 1) % n, n]);
    if (both) f.push([i, (i + 1) % n, n + 1]);
  }
  if (!both) f.push(Array.from({ length: n }, (_, i) => i));
  return { v, f };
}
const MESHES: Mesh[] = [
  cone(3, 1.1, 1.0, false), // tetrahedron
  prism(4, 1.0, 0.72), // cube
  cone(4, 1.0, 1.0, true), // octahedron
  prism(3, 1.0, 0.9), // triangular prism
  cone(4, 1.1, 1.3, false), // square pyramid
  prism(4, 1.2, 0.22), // slab
  prism(6, 0.9, 0.5), // hexagonal prism
  cone(5, 0.8, 1.5, true), // long diamond
];

const SHAPE_COLOURS = ['#ff3b5c', '#3a8dff', '#ffd31a', '#8e44ff', '#ff6fa8', '#2fd4ff', '#3fe08f', '#f2f4ff'];
const LIGHT: V3 = (() => {
  const l: V3 = [0.5, -0.6, 0.62];
  const n = Math.hypot(...l);
  return [l[0] / n, l[1] / n, l[2] / n];
})();

function turn([x, y, z]: V3, ax: number, ay: number, az: number): V3 {
  let y1 = y * Math.cos(ax) - z * Math.sin(ax);
  let z1 = y * Math.sin(ax) + z * Math.cos(ax);
  const x1 = x * Math.cos(ay) + z1 * Math.sin(ay);
  z1 = -x * Math.sin(ay) + z1 * Math.cos(ay);
  const x2 = x1 * Math.cos(az) - y1 * Math.sin(az);
  y1 = x1 * Math.sin(az) + y1 * Math.cos(az);
  return [x2, y1, z1];
}

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(k >= 1 ? v + (255 - v) * (k - 1) : v * k));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

const SHAPES = 188;
const FLIGHT = 84; // frames from the chest to the edge of the picture

/**
 * The 188 shapes, flying out from the person and growing as they come closer. Faces are cel shaded in three
 * tones; the shadow faces also go into a second layer screened into dots. `front` picks the ones in front of
 * the person.
 */
function Shapes({ f, front }: { f: number; front: boolean }) {
  const t = twos(f);
  const [ox, oy] = chest(f);
  const faces: React.ReactNode[] = [];
  const dots: React.ReactNode[] = [];
  for (let i = 0; i < SHAPES; i++) {
    if (rnd('sh-front', i) < 0.25 !== front) continue;
    const age = (t / FLIGHT + rnd('sh-phase', i)) % 1;
    const dir = rnd('sh-dir', i) * Math.PI * 2;
    const dist = Math.pow(age, 1.4) * (900 + rnd('sh-far', i) * 900);
    const x = ox + Math.cos(dir) * dist;
    const y = oy - 180 + Math.sin(dir) * dist * 0.75;
    const big = rnd('sh-big', i) < 0.06 ? 2.4 : 1;
    const s = (6 + rnd('sh-size', i) * 22) * big * (0.35 + age * 1.6);
    const mesh = MESHES[i % MESHES.length];
    // the big ones are red, as in the reference; white stays small
    const colour = big > 1 ? '#ff3b5c' : SHAPE_COLOURS[Math.floor(rnd('sh-col', i) * SHAPE_COLOURS.length)];
    const spin = (rnd('sh-spin', i) - 0.5) * 0.3;
    const verts = mesh.v.map((p) => turn(p, t * spin + i, t * spin * 1.3 + i * 2, t * spin * 0.7));
    const centre = verts.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]] as V3, [0, 0, 0] as V3);
    const drawn = mesh.f
      .map((face) => {
        const p = face.map((k) => verts[k]);
        const e1 = [p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]];
        const e2 = [p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]];
        let nrm: V3 = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
        const len = Math.hypot(...nrm) || 1;
        nrm = [nrm[0] / len, nrm[1] / len, nrm[2] / len];
        const fc = p.reduce((acc, q) => [acc[0] + q[0], acc[1] + q[1], acc[2] + q[2]] as V3, [0, 0, 0] as V3);
        const out =
          (fc[0] / p.length - centre[0] / verts.length) * nrm[0] +
          (fc[1] / p.length - centre[1] / verts.length) * nrm[1] +
          (fc[2] / p.length - centre[2] / verts.length) * nrm[2];
        if (out < 0) nrm = [-nrm[0], -nrm[1], -nrm[2]];
        return { p, nrm, z: fc[2] / p.length };
      })
      .filter((fc) => fc.nrm[2] > 0)
      .sort((a, b) => a.z - b.z);
    drawn.forEach((fc, k) => {
      const lit = fc.nrm[0] * LIGHT[0] + fc.nrm[1] * LIGHT[1] + fc.nrm[2] * LIGHT[2];
      const d = poly(fc.p.map(([px, py]) => [x + px * s, y + py * s]));
      const tone = lit > 0.55 ? 1.25 : lit > 0.1 ? 1 : 0.62;
      faces.push(<Path key={`${i}-${k}`} d={d} fill={shade(colour, tone)} />);
      if (lit <= 0.1 && s > 14) dots.push(<Path key={`${i}-${k}`} d={d} fill="#808080" />);
    });
  }
  const tag = front ? 'front' : 'back';
  return (
    <Layer id={`shapes-${tag}`}>
      <Layer id={`shapes-${tag}-faces`}>{faces}</Layer>
      <Layer id={`shapes-${tag}-dots`} opacity={0.55} effects={[halftone({ size: 7, angle: 45, color: NAVY })]}>
        {dots}
      </Layer>
    </Layer>
  );
}

const FLAME_LAYERS = [
  { colour: '#ff4fa8', blur: 130, lift: 160, base: 0.44, reach: 0.4 },
  { colour: '#ff8a1c', blur: 95, lift: 100, base: 0.46, reach: 0.4 },
  { colour: '#ffd21f', blur: 60, lift: 55, base: 0.48, reach: 0.4 },
];

/** Flames around the body, in three colour layers. */
function Flames({ f }: { f: number }) {
  return (
    <Layer id="flames">
      {FLAME_LAYERS.map((l, i) => {
        const [r, g, b] = linear(l.colour);
        return (
          <Video
            key={i}
            id={`flame-${i}`}
            src={MATTE}
            width={W}
            height={H}
            playbackRate={RATE}
            effects={[
              blur(l.blur),
              shader({
                code: FLAMES,
                uniforms: { seed: twos(f) / 2 + i * 13, lift: l.lift, base: l.base, reach: l.reach, r, g, b },
              }),
            ]}
          />
        );
      })}
    </Layer>
  );
}

/** A strip with torn edges: a box whose outline is cut into short steps that wobble in and out. */
function torn(x0: number, y0: number, x1: number, y1: number, key: string, t: number): string {
  const pts: [number, number][] = [];
  const j = (k: string | number, amp: number) => (rnd('torn', key, k, t) - 0.5) * amp;
  for (let x = x0; x < x1; x += 34) pts.push([x, y0 + j(`t${x}`, 16)]);
  for (let y = y0; y < y1; y += 30) pts.push([x1 + j(`r${y}`, 22), y]);
  for (let x = x1; x > x0; x -= 34) pts.push([x, y1 + j(`b${x}`, 16)]);
  for (let y = y1; y > y0; y -= 30) pts.push([x0 + j(`l${y}`, 22), y]);
  return poly(pts);
}

/**
 * The title in three tilted rows, behind the person: a small white kicker straight on the background, then
 * two rows of dark heavy letters, each on its own torn yellow strip, the second shifted right over a dark slab.
 * A row now and then jumps sideways for a drawing, as a glitch.
 */
function Title({ f, kicker, line1, line2 }: { f: number; kicker: string; line1: string; line2: string }) {
  const t = twos(f);
  const jx = (k: string) => (rnd('title', k, t) < 0.2 ? (rnd('title-x', k, t) - 0.5) * 30 : 0);
  // Montserrat Black caps run about 0.7 of the size per letter; the strips end a little past the text
  const w1 = line1.length * 128 * 0.7;
  const w2 = line2.length * 118 * 0.72;
  return (
    <Layer id="title" x={10} y={330} rotation={-10}>
      <Path id="title-slab" d={torn(-60, 205, 0.6 * w2, 400, 'slab', t)} fill={PURPLE} />
      <Path id="title-strip-1" d={torn(-40, 98, w1, 218, 'one', t)} fill={STRIP} />
      <Path id="title-strip-2" d={torn(90, 222, 110 + w2, 340, 'two', t)} fill={STRIP} />
      <Text id="title-kicker" font={fontFamily} weight={800} size={44} color="#ffffff" x={300 + jx('k')} y={40}>
        {kicker}
      </Text>
      <Text id="title-1" font={fontFamily} weight={900} size={128} color={PURPLE} x={0 + jx('a')} y={84}>
        {line1}
      </Text>
      <Text id="title-2" font={fontFamily} weight={900} size={118} color={PURPLE} x={110 + jx('b')} y={210}>
        {line2}
      </Text>
    </Layer>
  );
}

// ---- step 1: the person ----

function Figure({ f }: { f: number }) {
  return (
    <>
      <Video
        id="outline"
        src={MATTE}
        width={W}
        height={H}
        playbackRate={RATE}
        effects={[blur(5), shader({ code: OUTLINE })]}
      />
      <Video id="figure-matte" src={MATTE} width={W} height={H} playbackRate={RATE} />
      <Video
        id="figure"
        src={SUBJECT}
        width={W}
        height={H}
        playbackRate={RATE}
        effects={[blur(2), shader({ code: KUWAHARA }), shader({ code: TONES })]}
        matte={{ layer: 'figure-matte', mode: 'luminance' }}
      />
      <Video
        id="rim"
        src={MATTE}
        width={W}
        height={H}
        playbackRate={RATE}
        effects={[shader({ code: RIM, uniforms: { seed: twos(f) } })]}
      />
    </>
  );
}

// ---- cuts ----

/** Shards around the burst origin, each showing once the cut's progress passes its own threshold. */
function Reveal({ s, f }: { s: State; f: number }) {
  if (s.p >= 1) return <Rect id="reveal" width={W} height={H} fill="#ffffff" />;
  const [ox, oy] = WINDOWS[s.w].origin;
  const t = twos(f);
  const shards: React.ReactNode[] = [];
  const maxD = Math.hypot(W, H);
  for (let i = 0; i < 90; i++) {
    const x = rnd('sh-x', s.w, i) * W;
    const y = rnd('sh-y', s.w, i) * H;
    const d = Math.hypot(x - ox, y - oy) / maxD;
    // cuts in spread from the origin; cuts out leave the far right last, as the reference does
    const order = s.phase === 'in' ? d * 1.6 : 1 - x / W;
    const th = order * 0.75 + rnd('sh-t', s.w, i) * 0.25;
    if (s.p < th) continue;
    const grow = Math.min(1, (s.p - th) * 4 + 0.3);
    const w = (140 + rnd('sh-w', s.w, i) * 420) * grow;
    const h = (50 + rnd('sh-h', s.w, i) * 260) * grow;
    const a = (rnd('sh-a', s.w, i) - 0.5) * 1.2 + (rnd('sh-aj', i, t) - 0.5) * 0.1;
    const c = Math.cos(a);
    const sn = Math.sin(a);
    const k = (rnd('sh-k', s.w, i) - 0.5) * w * 0.6; // skew into a parallelogram
    const corners: [number, number][] = [
      [-w / 2 + k, -h / 2],
      [w / 2 + k, -h / 2],
      [w / 2 - k, h / 2],
      [-w / 2 - k, h / 2],
    ];
    shards.push(
      <Path key={i} d={poly(corners.map(([px, py]) => [x + px * c - py * sn, y + px * sn + py * c]))} fill="#ffffff" />,
    );
  }
  return <Layer id="reveal">{shards}</Layer>;
}

/** Thin lines and confetti thrown out of the burst origin as a cut starts. */
function Burst({ s, f }: { s: State; f: number }) {
  const {
    in: [a],
    origin: [ox, oy],
  } = WINDOWS[s.w];
  const k = (f - a) / 9;
  if (s.phase !== 'in' || k > 1) return null;
  const items: React.ReactNode[] = [];
  const colors = ['#111111', '#ffffff', '#ff2a4a', YELLOW, '#1e9bff'];
  for (let i = 0; i < 46; i++) {
    const ang = rnd('bl-a', s.w, i) * Math.PI * 2;
    const r0 = 20 + rnd('bl-r0', s.w, i) * 80 * (1 + k * 3);
    const r1 = r0 + (200 + rnd('bl-r1', s.w, i) * 900) * Math.min(1, k * 2 + 0.2);
    const wd = 1.5 + rnd('bl-w', s.w, i) * 4;
    const n = [-Math.sin(ang) * wd, Math.cos(ang) * wd];
    items.push(
      <Path
        key={`l${i}`}
        d={poly([
          [ox + Math.cos(ang) * r0, oy + Math.sin(ang) * r0],
          [ox + Math.cos(ang) * r1 + n[0], oy + Math.sin(ang) * r1 + n[1]],
          [ox + Math.cos(ang) * r1 - n[0], oy + Math.sin(ang) * r1 - n[1]],
        ])}
        fill={colors[i % colors.length]}
      />,
    );
  }
  for (let i = 0; i < 24; i++) {
    const ang = rnd('bc-a', s.w, i) * Math.PI * 2;
    const r = (30 + rnd('bc-r', s.w, i) * 260) * (0.4 + k);
    const sz = 8 + rnd('bc-s', s.w, i) * 22;
    items.push(
      <Rect
        key={`c${i}`}
        x={ox + Math.cos(ang) * r}
        y={oy + Math.sin(ang) * r}
        width={sz}
        height={sz * 0.6}
        rotation={rnd('bc-rot', s.w, i) * 180}
        fill={i % 2 ? YELLOW : '#ff2a4a'}
      />,
    );
  }
  return <Layer id="burst">{items}</Layer>;
}

/** The single yellow frame: the figure's outline traced in broken orange strokes, and one dark card. */
function Flash() {
  const strokes: React.ReactNode[] = [];
  for (let i = 0; i < 26; i++) {
    const a = Math.PI * (0.9 + rnd('fs-a', i) * 1.2);
    const cx = 960 + Math.cos(a) * 330 * (0.9 + rnd('fs-r', i) * 0.2);
    const cy = 560 + Math.sin(a) * 420 * (0.9 + rnd('fs-r2', i) * 0.2);
    const len = 30 + rnd('fs-l', i) * 70;
    const t = a + Math.PI / 2;
    strokes.push(
      <Path
        key={i}
        d={poly([
          [cx, cy],
          [cx + Math.cos(t) * len, cy + Math.sin(t) * len],
          [cx + Math.cos(t) * len + 4, cy + Math.sin(t) * len + 5],
        ])}
        fill={i % 3 ? '#ff8a1c' : '#23b6d8'}
      />,
    );
  }
  return (
    <Layer id="flash">
      <Rect width={W} height={H} fill={YELLOW} />
      {strokes}
      <Rect x={1285} y={398} width={118} height={82} fill={NAVY} />
    </Layer>
  );
}

// ---- the reel ----

interface Props {
  kicker: string;
  line1: string;
  line2: string;
}

const Reel: React.FC<Props> = ({ kicker, line1, line2 }) => {
  const f = useCurrentFrame();
  const s = stateAt(f);
  const glitch = s.phase === 'in' || s.phase === 'out' ? 1 - Math.abs(s.p * 2 - 1) * 0.6 : f % 23 === 0 ? 0.25 : 0;
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <Layer id="reel">
        <Video id="plate" src={SUBJECT} width={W} height={H} playbackRate={RATE} />
        {s.p > 0 ? (
          <>
            <Reveal s={s} f={f} />
            <Layer
              id="poster"
              matte={{ layer: 'reveal', mode: 'alpha' }}
              effects={[shader({ code: SLICES, uniforms: { amount: glitch, seed: twos(f) } })]}
            >
              <HalftoneCamera />
              <Rays f={f} />
              <Shapes f={f} front={false} />
              <Flames f={f} />
              <Title f={f} kicker={kicker} line1={line1} line2={line2} />
              <Figure f={f} />
              <Shapes f={f} front />
            </Layer>
            <Burst s={s} f={f} />
          </>
        ) : null}
        <Sequence from={FLASH} durationInFrames={1}>
          <Flash />
        </Sequence>
      </Layer>
    </AbsoluteFill>
  );
};

registerRoot(() => (
  <Composition
    id="CyberpunkReel"
    component={Reel}
    durationInFrames={DURATION}
    fps={FPS}
    width={W}
    height={H}
    defaultProps={{ kicker: 'TRANSMISSION 07', line1: 'NIGHT SIGNAL', line2: 'AFTERBURNERS' }}
  />
));
