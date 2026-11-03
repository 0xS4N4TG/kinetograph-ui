// The person montage: a central black-and-white portrait among landmark cut-outs and the same face at other ages, on
// flat coloured paper with an accent disc, a torn name tag stamped on at the bottom and the name typed into it.
// Measured off a reference reel f861-f945:
//   - images on twos, the first image held four frames
//   - every piece starts displaced and eases to rest by the same ratio, 0.71 of the remaining offset per image, no
//     overshoot, no rotation of the camera; pieces enter staggered (side portraits from the sides, the rest rising)
//   - the tag arrives 20 % too big and shrinks to rest; the first name types one letter per image, the surname is there
//     at once, faint and letter-spaced wide, and its tracking closes by 0.4 per image
//   - the camera: still while building, a slow drift (+0.15 % an image), a small push (to 1.05), then a punch to 1.26
//     settling to 1.18 before the cut
//   - cut-outs graded black and white with warm whites (#f5edec) and purple-brown blacks (#171316), a 1 px blue / orange
//     edge split, a short soft shadow straight down; paper flat to 0.3 H then a little darker to the bottom; one static
//     lattice screen (4.47 px at -12 deg) over everything
import React from 'react';
import { Layer, gradientMap } from '@kinetographdev/core';
import { AbsoluteFill, staticFile, useVideoConfig } from 'remotion';
import { family } from '../explainer/type.js';
import { CutOut } from '../../plugins/paper/src/index.js';
import { tab } from './time.js';
import { tornPoints } from './pieces.js';

const R = 0.71;
/** the montage's own image clock: the first image held four frames, then twos */
export const montageImage = (t: number) => (t < 4 ? 0 : Math.floor((t - 4) / 2) + 1);
const decay = (k: number, at: number, r = R) => (k < at ? null : Math.pow(r, k - at));

export const MONTAGE_GRADE = [{ offset: 0, color: '#171316' }, { offset: 0.35, color: '#4a4248' }, { offset: 0.7, color: '#b4aaaa' }, { offset: 1, color: '#f5edec' }];

/** Ground papers (top, bottom): the reference's cream and teal, plus tan and grey in the same family. */
export const GROUNDS = {
  cream: ['#ecddb8', '#dacca4'],
  teal: ['#4babb0', '#3c969f'],
  tan: ['#d9b48c', '#c49f78'],
  grey: ['#d9d6d0', '#c4c0b8'],
  kraft: ['#a7825c', '#8f6c49'],
} as const;

export interface MontagePiece {
  src: string;
  /** rest centre (fractions of W, H) and width (fraction of W) */
  x: number; y: number; w: number;
  /** offset at arrival, px (decays by 0.71 an image); default rising from 200 px below */
  from?: [number, number];
  /** the image it arrives on */
  at?: number;
  /** scale at arrival (grows to 1 by the same decay) */
  grow?: number;
  /** rest tilt and extra tilt at arrival, degrees */
  tilt?: number; tiltFrom?: number;
  flip?: boolean;
  /** false keeps the file's own colours (the one colour piece) */
  grade?: boolean;
}

export interface MontageProps {
  id: string;
  /** frames since the shot started */
  t: number;
  /** the shot's length in frames (sets when the camera pushes and punches) */
  frames: number;
  ground?: readonly [string, string];
  /** an accent disc behind the pieces: solid colour, or a halftone print disc */
  disc?: { x: number; y: number; r: number; color?: string; dots?: boolean; at?: number };
  pieces: MontagePiece[];
  name?: { first: string; last?: string; at?: number; y?: number };
  /** the quick build of the reference's variants (f943-f981): every piece eases x0.47 an image, the first images
   *  defocused (sigma 5, 2.5, 1.5, 1, 0.5 px), the tag stamping on at the second image */
  quick?: boolean;
  base?: string;
}

const Tape: React.FC<{ x: number; y: number; w: number; h: number; angle: number; seed: string }> = ({ x, y, w, h, angle, seed }) => (
  <svg width={w + 16} height={h + 16} style={{ position: 'absolute', left: x - w / 2 - 8, top: y - h / 2 - 8, transform: `rotate(${angle}deg)` }}>
    <polygon points={tornPoints(w, h, 4, seed, 8)} transform="translate(8,8)" fill="rgba(200,184,160,0.72)" />
  </svg>
);

export const Montage: React.FC<MontageProps> = ({ id, t, frames, ground = GROUNDS.cream, disc, pieces, name, quick = false, base = 'collage-textures' }) => {
  const { width: W, height: H } = useVideoConfig();
  const k = montageImage(t);
  const last = montageImage(frames - 1);
  // camera: still, drift from image 16, push 6 images before the punch, punch 7 images before the end
  const punch = last - 7, push = punch - 6;
  const cam = k >= punch
    ? tab([[0, 1.26], [2, 1.233], [4, 1.208], [6, 1.196], [8, 1.194], [12, 1.183], [16, 1.176]], (k - punch) * 2)
    : k >= push ? tab([[0, 1.035], [1, 1.045], [2, 1.046], [3, 1.051], [5, 1.05]], k - push)
    : 1 + Math.max(0, k - 16) * 0.0015;
  const px = (v: number, d: number | null, from: number) => v + (d === null ? 0 : from * d);

  const r = quick ? 0.47 : R;
  const defocus = quick ? [5, 2.5, 1.5, 1, 0.5][k] ?? 0 : 0;
  const tagAt = name?.at ?? (quick ? 1 : 7);
  const tagD = decay(k, tagAt, quick ? 0.4 : 0.66);
  const tagS = tagD === null ? 0 : 1 + 0.2 * tagD;
  const tagY = (name?.y ?? 0.737) * H;
  const bold = family('Poppins', 600, false), light = family('Poppins', 300, false);
  const typed = name ? Math.max(0, Math.min(name.first.length, k - (tagAt + 2) + 1)) : 0;
  const lastD = decay(k, tagAt + 2, 0.4);

  return (
    <AbsoluteFill style={{ background: `linear-gradient(${ground[0]} 0%, ${ground[0]} 30%, ${ground[1]} 100%)` }}>
      <AbsoluteFill style={{ transform: `scale(${cam.toFixed(4)})`, transformOrigin: '50% 50%', filter: defocus > 0.3 ? `blur(${defocus}px)` : undefined }}>
        {disc && (disc.at ?? 0) <= k && (() => {
          const d = decay(k, disc.at ?? 0, r)!;
          const rad = disc.r * W * (1 - 0.46 * d);
          return <div style={{ position: 'absolute', left: disc.x * W - rad, top: disc.y * H - rad, width: 2 * rad, height: 2 * rad, borderRadius: '50%',
            background: disc.dots ? 'radial-gradient(circle, #807c91 1.6px, transparent 2.2px) 0 0 / 8px 8px, #e0d5cd' : disc.color ?? '#e8742c' }} />;
        })()}
        <Layer id={`${id}-cut`} effects={[gradientMap({ stops: MONTAGE_GRADE })]}>
          <AbsoluteFill>
            {pieces.map((p, i) => {
              if (p.grade === false) return null;
              return <PieceImg key={i} p={p} k={k} r={r} W={W} H={H} px={px} />;
            })}
          </AbsoluteFill>
        </Layer>
        {pieces.map((p, i) => (p.grade === false ? <PieceImg key={i} p={p} k={k} r={r} W={W} H={H} px={px} /> : null))}
        {name && tagD !== null && (
          <AbsoluteFill style={{ transform: `scale(${tagS.toFixed(4)})`, transformOrigin: `51% ${((tagY / H) * 100).toFixed(1)}%` }}>
            <CutOut id={`${id}-tag`} src={staticFile(`${base}/tag-paper.png`)} x={0.513 * W} y={tagY} width={0.56 * W}
              edge={{ style: 'torn', thickness: 0.04, intensity: 1.6, detail: 1.3 }} paper="#dfd5d4" back="#dfd5d4" fringe="rgba(207,154,98,0.9)" creases={0.2} shadow={0.35} seed={`${id}-tag`} />
            {k >= tagAt + 3 && <Tape x={0.74 * W} y={tagY - 0.062 * H} w={120} h={46} angle={-32} seed={`${id}-t1`} />}
            {k >= tagAt + 4 && <Tape x={0.28 * W} y={tagY + 0.055 * H} w={110} h={42} angle={-28} seed={`${id}-t2`} />}
            <div style={{ position: 'absolute', left: 0, width: W * 1.026, top: tagY - 0.058 * H, textAlign: 'center', whiteSpace: 'pre', fontFamily: bold, fontWeight: 600, fontSize: (0.037 * H) / 0.7, lineHeight: 1, letterSpacing: '0.04em', paddingLeft: '0.04em', color: '#322c2c',
              textShadow: '-1px 0 0 rgba(48,80,160,0.35), 1px 0 0 rgba(180,106,60,0.35)' }}>
              {[...name.first].map((c, i) => <span key={i} style={{ opacity: i < typed ? 1 : i === typed && typed > 0 ? 0.2 : 0 }}>{c}</span>)}
            </div>
            {name.last && lastD !== null && (
              <div style={{ position: 'absolute', left: 0, width: W * 1.026, top: tagY + 0.012 * H, textAlign: 'center', whiteSpace: 'pre', fontFamily: light, fontWeight: 300, fontSize: (0.0205 * H) / 0.7, lineHeight: 1,
                letterSpacing: `${(0.12 + 0.67 * lastD).toFixed(3)}em`, paddingLeft: `${(0.12 + 0.67 * lastD).toFixed(3)}em`, color: '#231923', opacity: k === tagAt + 2 ? 0.4 : 1,
                textShadow: '-1px 0 0 rgba(48,80,160,0.45), 1px 0 0 rgba(180,106,60,0.45)' }}>{name.last}</div>
            )}
          </AbsoluteFill>
        )}
      </AbsoluteFill>
      <img src={staticFile(`${base}/lattice.png`)} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, mixBlendMode: 'overlay', opacity: 0.55 }} />
    </AbsoluteFill>
  );
};

const PieceImg: React.FC<{ p: MontagePiece; k: number; r: number; W: number; H: number; px: (v: number, d: number | null, from: number) => number }> = ({ p, k, r, W, H, px }) => {
  const d = decay(k, p.at ?? 0, r);
  if (d === null) return null;
  const [fx, fy] = p.from ?? [0, 200];
  const s = 1 - (1 - (p.grow ?? 1)) * d;
  const rot = (p.tilt ?? 0) + (p.tiltFrom ?? 0) * d;
  return (
    <img src={p.src} style={{ position: 'absolute', left: px(p.x * W, d, fx), top: px(p.y * H, d, fy), width: p.w * W,
      transform: `translate(-50%, -50%) scale(${(p.flip ? -s : s).toFixed(4)}, ${s.toFixed(4)}) rotate(${rot.toFixed(2)}deg)`,
      filter: 'drop-shadow(-1px -1px 0 rgba(60,80,160,0.45)) drop-shadow(1px 1px 0 rgba(180,106,60,0.45)) drop-shadow(0 4px 3px rgba(30,20,20,0.3))' }} />
  );
};
