// The halftone poster: a picture printed as a coarse screen of ink dots on a flat paper colour, the dots growing with how
// dark it is, the way a screen-printed poster or a cheap two-colour flyer prints a photo. `halftonePoster()` is the
// look on its own (one shader: ink, paper, dot size, screen angle, contrast), for any layer. `<HalftonePoster>` builds
// the whole poster from a clip and its matte: the person in dots on a ground of flat colour, side-by-side panels each
// with its own ink pair, an off-register shadow of the person in a third colour, a big title behind or over them, and
// the dots held at 12 drawings a second so they read as printed rather than boiling like video.

import React from 'react';
import { Layer, Rect, Video, shader, useCurrentFrame, useVideoConfig } from '@kinetographdev/core';
import type { Effect } from '@kinetographdev/core';
import { makeGoogleFont } from '@kinetographdev/core/google-fonts';

const ANTON = makeGoogleFont('Anton').loadFont('normal', { weights: ['400'] }).fontFamily;

// A screen of dots on a grid turned by `angle`: each cell reads the picture at its centre, and its dot covers as much
// of the cell as the picture is dark there (after `punch` contrast about mid grey, shifted by `bias`). Dots are drawn
// anti-aliased by their distance from the centre; `shape` 1 draws lines along the grid instead, 2 squares.
const HALFTONE = `
fn effect(px: vec2<f32>) -> vec4<f32> {
  let src = layer(px);
  let a = radians(u.angle);
  let cs = cos(a);
  let sn = sin(a);
  let r = vec2<f32>(cs * px.x + sn * px.y, -sn * px.x + cs * px.y);
  let cr = (floor(r / u.size) + vec2<f32>(0.5, 0.5)) * u.size;
  let s = layer(vec2<f32>(cs * cr.x - sn * cr.y, sn * cr.x + cs * cr.y));
  var rgb = s.rgb;
  if (s.a > 0.001) { rgb = s.rgb / s.a; }
  // the shader works in linear light: judge the tone on the sRGB curve, as an eye (and a printer's screen) would
  let lum = pow(max(dot(rgb, vec3<f32>(0.2126, 0.7152, 0.0722)), 0.0), 1.0 / 2.2);
  let v = clamp(0.5 + (0.5 - lum) * u.punch + u.bias, 0.0, 1.0);
  var k = 0.0;
  if (u.shape < 0.5) {
    let rad = u.size * 0.72 * sqrt(v);
    k = 1.0 - smoothstep(rad - 0.7, rad + 0.7, distance(r, cr));
  } else if (u.shape < 1.5) {
    let half = u.size * 0.5 * v;
    k = 1.0 - smoothstep(half - 0.6, half + 0.6, abs(r.y - cr.y));
  } else {
    let half = u.size * 0.5 * sqrt(v);
    let d = max(abs(r.x - cr.x), abs(r.y - cr.y));
    k = 1.0 - smoothstep(half - 0.6, half + 0.6, d);
  }
  let ink = vec4<f32>(u.ir, u.ig, u.ib, 1.0);
  let paper = vec4<f32>(u.pr * u.pa, u.pg * u.pa, u.pb * u.pa, u.pa);
  return mix(paper, ink, k) * src.a;
}`;

/** `#rrggbb` (or `#rgb`) as linear 0..1 channels, which is what a shader draws in; `transparent` gives alpha 0. */
function rgb(color: string): [number, number, number, number] {
  if (color === 'transparent') return [0, 0, 0, 0];
  const h = color.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = parseInt(full, 16);
  const lin = (c: number) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return [lin((n >> 16) & 255), lin((n >> 8) & 255), lin(n & 255), 1];
}

export interface HalftoneOptions {
  /** The dots' colour. Default a deep blue. */
  ink?: string;
  /** The colour between the dots, or `transparent` (to print a second ink over another layer). Default yellow. */
  paper?: string;
  /** Cell width, px. Default 10. */
  size?: number;
  /** Screen angle, degrees. Default 45. */
  angle?: number;
  /** Contrast before the screen: higher gives solid shadows and clean highlights. Default 1.6. */
  punch?: number;
  /** -0.5..0.5: more ink (positive) or less. Default 0. */
  bias?: number;
  shape?: 'circle' | 'line' | 'square';
}

/** The halftone look as layer effects: the layer printed as `ink` dots on `paper`. */
export function halftonePoster({ ink = '#1d3fd1', paper = '#f4d63a', size = 10, angle = 45, punch = 1.6, bias = 0, shape = 'circle' }: HalftoneOptions = {}): Effect[] {
  const [ir, ig, ib] = rgb(ink);
  const [pr, pg, pb, pa] = rgb(paper);
  return [shader({ code: HALFTONE, uniforms: { size, angle, punch, bias, shape: shape === 'circle' ? 0 : shape === 'line' ? 1 : 2, ir, ig, ib, pr, pg, pb, pa } })];
}

/** One panel of the poster: the slice `x` (fractions of the width) printed `ink` on `paper`. With a matte the person is
 *  printed and the rest is `ground` (default `paper`); `shadow` colours the off-register silhouette. */
export interface PosterPanel { x?: [number, number]; ink: string; paper: string; ground?: string; shadow?: string }

export interface PosterTitle {
  text: string;
  color?: string;
  /** Font family. Default Anton. */
  font?: string;
  /** px. Default 300. */
  size?: number;
  /** Its centre, a fraction of the height. Default 0.5. */
  y?: number;
  /** Over the person instead of behind. */
  over?: boolean;
  letterSpacing?: string;
}

export interface HalftonePosterProps {
  src: string;
  /** The person's matte (white = person), timed as `src`. Without it the whole picture is printed. */
  matte?: string;
  width?: number;
  height?: number;
  rate?: number;
  trimBefore?: number;
  /** Side by side; default one panel, blue on yellow. */
  panels?: PosterPanel[];
  /** Panel sets that cut in on composition frames, as a poster series flicking over. */
  changes?: { at: number; panels: PosterPanel[] }[];
  size?: number;
  angle?: number;
  punch?: number;
  bias?: number;
  shape?: 'circle' | 'line' | 'square';
  /** With a matte: the person's silhouette in each panel's `shadow` colour, this many px off. Without a matte: a second
   *  print of the picture in `shadow` ink, multiplied over, this far off. */
  offset?: [number, number];
  /** With a matte: the ground flat, or the clip behind the person faintly in the panel's ink. Default `flat`. */
  backdrop?: 'flat' | 'dots';
  title?: PosterTitle;
  /** Drawings a second; the picture holds between them. 0 for every frame. Default 12. */
  steps?: number;
  id?: string;
}

const PANEL: PosterPanel = { ink: '#1d3fd1', paper: '#f4d63a' };

/** A clip printed as a halftone poster: panels of ink-on-paper dots, the person over flat ground, an off-register
 *  shadow and a title. */
export const HalftonePoster: React.FC<HalftonePosterProps> = ({
  src, matte, width, height, rate, trimBefore, panels = [PANEL], changes = [], size = 10, angle = 45, punch = 1.6, bias = 0,
  shape = 'circle', offset, backdrop = 'flat', title, steps = 12, id = 'poster',
}) => {
  const frame = useCurrentFrame();
  const { fps, width: CW, height: CH } = useVideoConfig();
  const W = width ?? CW, H = height ?? CH;
  const set = [...changes].sort((a, b) => a.at - b.at).filter((c) => frame >= c.at).pop()?.panels ?? panels;
  // the frame the picture holds on: `steps` drawings a second
  const held = steps > 0 ? Math.floor((frame * steps) / fps) * (fps / steps) : frame;
  const from = frame - Math.round(held);
  const clip = (key: string, effects: Effect[], extra: object = {}) => (
    <Video id={key} src={src} width={W} height={H} fit="cover" from={from} playbackRate={rate} trimBefore={trimBefore} muted effects={effects} {...extra} />
  );
  const matteOf = (key: string) => <Video id={key} src={matte!} width={W} height={H} fit="cover" from={from} playbackRate={rate} trimBefore={trimBefore} muted />;
  const screen = (p: PosterPanel, paper = p.paper) => halftonePoster({ ink: p.ink, paper, size, angle, punch, bias, shape });
  const Title = ({ k }: { k: string }) => title ? (
    <div key={`${id}-title-${k}`} style={{
      position: 'absolute', left: 0, top: (title.y ?? 0.5) * H - (title.size ?? 300) * 0.6, width: W, height: (title.size ?? 300) * 1.2,
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: title.font ?? ANTON, fontSize: title.size ?? 300,
      lineHeight: 1, letterSpacing: title.letterSpacing ?? '0.01em', color: title.color ?? '#ffffff', textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>{title.text}</div>
  ) : null;

  return (
    <Layer id={id}>
      {set.map((p, k) => {
        const [x0, x1] = p.x ?? [0, 1];
        const key = `${id}-p${k}`;
        const d = `M${x0 * W} 0H${x1 * W}V${H}H${x0 * W}Z`;
        return (
          <Layer key={key} id={key} clip={{ kind: 'path', d }}>
            {matte ? (
              <>
                <Rect id={`${key}-ground`} width={W} height={H} fill={p.ground ?? p.paper} />
                {backdrop === 'dots' && <Layer id={`${key}-backdrop`} opacity={0.4}>{clip(`${key}-backdrop-clip`, screen(p, 'transparent'))}</Layer>}
                {!title?.over && <Title k={`${k}-under`} />}
                {offset && p.shadow && (
                  <Layer id={`${key}-shadow`} x={offset[0]} y={offset[1]}>
                    {matteOf(`${key}-shadow-matte`)}
                    <Rect id={`${key}-shadow-fill`} width={W} height={H} fill={p.shadow} matte={{ layer: `${key}-shadow-matte`, mode: 'luminance' }} />
                  </Layer>
                )}
                {matteOf(`${key}-matte`)}
                {clip(`${key}-print`, screen(p), { matte: { layer: `${key}-matte`, mode: 'luminance' } })}
                {title?.over && <Title k={`${k}-over`} />}
              </>
            ) : (
              <>
                {clip(`${key}-print`, screen(p))}
                {offset && p.shadow && (
                  <Layer id={`${key}-misprint`} x={offset[0]} y={offset[1]} blendMode="multiply">
                    {clip(`${key}-misprint-clip`, halftonePoster({ ink: p.shadow, paper: 'transparent', size, angle: angle + 30, punch, bias, shape }))}
                  </Layer>
                )}
                <Title k={String(k)} />
              </>
            )}
          </Layer>
        );
      })}
    </Layer>
  );
};
