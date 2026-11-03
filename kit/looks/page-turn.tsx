// CC Page Turn, as a WGSL shader on the turning page. The reference's panel: Controls = Bottom
// Right Corner, Fold Radius 50, Light Direction -60 deg, Render = Front & Back Page with the layer itself as the back
// (so the back is the mirrored front), Back Opacity 85 over a light paper colour. Measured on the turn: about 12
// frames of slow lift off the corner, then a constant sweep of about 44 px a frame at 1080 wide, the fold line
// tilting from 8.6 to 23 degrees as the fold position runs from corner to corner; no hard crease, soft shading
// across the bend; on the revealed page a shadow beside the fold, -15% at the edge, gone in about 100 px. The page
// that turns sits above the page it reveals.
//
// The geometry is a cylinder of radius R lying on the fold line. Along the fold normal, page material up to the line
// stays flat; the next pi R of it wraps over the cylinder; the rest lies flat on top, upside down, coming back over
// the page. Each output pixel takes the topmost of those that covers it: the flat back, the back of the cylinder, the
// front of the cylinder, the flat front; where none does, the page below shows through, shaded by the curl's shadow.
import React from 'react';
import { Layer, shader, useCurrentFrame, useVideoConfig } from '@kinetographdev/core';
import { AbsoluteFill, interpolate } from 'remotion';

const CURL = /* wgsl */ `
const PI: f32 = 3.14159265;

fn inPage(p: vec2<f32>) -> bool {
  return p.x >= 0.0 && p.y >= 0.0 && p.x <= globals.canvas.x && p.y <= globals.canvas.y;
}

fn effect(px: vec2<f32>) -> vec4<f32> {
  let corner = vec2<f32>(u.cx, u.cy);
  let fold = vec2<f32>(u.fx, u.fy);
  let span = corner - fold;
  if (length(span) < 0.5) { return layer(px); }
  // n points from the fold line toward the corner; the line passes through the middle of corner and fold point
  let n = normalize(span);
  let mid = (corner + fold) * 0.5;
  let r = max(u.radius, 1.0);
  let x = dot(px - mid, n);
  let paper = vec4<f32>(u.pr, u.pg, u.pb, 1.0);
  // light from the panel's direction, as a 2D vector on the page
  let light = vec2<f32>(cos(u.light), sin(u.light));
  let lit = 0.5 + 0.5 * dot(n, light);

  // 1. the flat back, upside down on top: material m = pi r - x, for x <= 0
  if (x <= 0.0) {
    let m = PI * r - x;
    let src = px + n * (m - x);
    if (inPage(src)) {
      let c = layer(src);
      if (c.a > 0.01) {
        let back = mix(paper, c, u.back);
        return vec4<f32>(back.rgb * (0.86 + 0.1 * lit), 1.0);
      }
    }
  }
  if (x >= 0.0 && x <= r) {
    // 2. the back of the cylinder (angle past 90 degrees), seen from above
    let phiB = PI - asin(x / r);
    let srcB = px + n * (r * phiB - x);
    if (inPage(srcB)) {
      let c = layer(srcB);
      if (c.a > 0.01) {
        let back = mix(paper, c, u.back);
        let shade = 0.72 + 0.26 * sin(phiB) * lit + 0.1 * (1.0 - sin(phiB));
        return vec4<f32>(back.rgb * shade, 1.0);
      }
    }
    // 3. the front of the cylinder (angle up to 90 degrees), curving up away from the page
    let phiF = asin(x / r);
    let srcF = px + n * (r * phiF - x);
    if (inPage(srcF)) {
      let c = layer(srcF);
      if (c.a > 0.01) {
        let shade = 1.0 - 0.38 * (1.0 - cos(phiF)) * (1.1 - 0.4 * lit);
        return vec4<f32>(c.rgb * shade, c.a);
      }
    }
  }
  // 4. the flat front, before the fold
  if (x < 0.0) {
    return layer(px);
  }
  // 5. nothing of this page here: the page below shows, under the curl's shadow (strongest at the cylinder's edge)
  let d = max(0.0, x - r * 0.6);
  let a = u.shadow * (1.0 - smoothstep(0.0, u.shadowWidth, d));
  return vec4<f32>(0.0, 0.0, 0.0, a);
}
`;

const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const hexLinear = (hex: string) => { const n = parseInt(hex.replace('#', ''), 16); return [lin(((n >> 16) & 255) / 255), lin(((n >> 8) & 255) / 255), lin((n & 255) / 255)]; };

export interface PageTurnProps {
  /** a unique layer id */
  id: string;
  /** the page that turns (drawn full frame) and the page it reveals */
  page: React.ReactNode;
  under?: React.ReactNode;
  /** the turn's first frame and length */
  start: number;
  duration: number;
  /** the corner that lifts */
  corner?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Fold Radius in px at 1080 wide (the reference's 50) */
  radius?: number;
  /** Light Direction in degrees (-60) */
  light?: number;
  /** Back Opacity, 0..1 (0.85), and the paper the back is printed on */
  back?: number;
  paper?: string;
  /** the shadow on the revealed page: strength at the fold (0.15) and how far it reaches in px at 1080 (100) */
  shadow?: number;
  shadowWidth?: number;
  /** turn the page in (it lands) instead of out */
  reverse?: boolean;
}

/** Where the dragged corner is, 0..1 of the turn: a slow lift for the first 40%, then a constant sweep. */
const travel = (t: number) => (t < 0.4 ? 0.12 * (t / 0.4) ** 2 : 0.12 + 0.88 * ((t - 0.4) / 0.6));

export const PageTurn: React.FC<PageTurnProps> = ({ id, page, under, start, duration, corner = 'bottom-right', radius = 50, light = -60, back = 0.85, paper = '#d8d6d0', shadow = 0.15, shadowWidth = 100, reverse }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  let t = interpolate(f, [start, start + duration], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (reverse) t = 1 - t;
  const k = travel(t);
  const right = corner.endsWith('right'), bottom = corner.startsWith('bottom');
  const cx = right ? W : 0, cy = bottom ? H : 0;
  // the fold position runs from the corner past the opposite corner, so the page leaves the frame completely; the
  // vertical part lags the horizontal, which tilts the fold line as it travels (8.6 to 23 degrees in the reference)
  const ox = right ? -1.15 * W : 2.15 * W, oy = bottom ? -0.35 * H : 1.35 * H;
  const fx = cx + (ox - cx) * k, fy = cy + (oy - cy) * k * k;
  const [pr, pg, pb] = hexLinear(paper);
  const s = W / 1080;
  return (
    <AbsoluteFill>
      {under}
      {k < 0.999 && (
        <Layer id={id} effects={[shader({ code: CURL, uniforms: { cx, cy, fx, fy, radius: radius * s, light: (light * Math.PI) / 180, back, pr: pr!, pg: pg!, pb: pb!, shadow, shadowWidth: shadowWidth * s } })]}>
          <AbsoluteFill>{page}</AbsoluteFill>
        </Layer>
      )}
    </AbsoluteFill>
  );
};
