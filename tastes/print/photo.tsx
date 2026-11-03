// Pictures in print.
//
//   HalftonePhoto  one ink, a hard screen (DUJWPrqCYGX): dark is bigger, denser dots; the dots sit on the picture and
//                  zoom with the camera; they never re-roll. Default newsprint 10 px at 45 deg.
//   RisoPhoto      a picture split into two or three ink passes (DVd9Ls2gHWM): each pass a separation of the picture
//                  (SEP presets) printed in its own ink on its own screen angle, a few px off register, grain re-rolling
//   PhotoArt       the picture itself, placed on the page in px (cover-fit in its box), for use inside an InkPass
//   Riso           the whole sheet: paper, the passes you give it, the finish
import React from 'react';
import { Img } from 'remotion';
import { InkPass, type InkProps } from './ink.js';
import { Paper, PrintFinish, type FinishProps, type PaperProps } from './paper.js';
import { REGISTER, SCREENS, type InkName } from './tokens.js';

export interface Box { x: number; y: number; w: number; h: number }

/** A picture on the page, `fit` cover inside its box (page px), `position` as CSS object-position. */
export const PhotoArt: React.FC<{ src: string; box: Box; position?: string; rotate?: number }> = ({ src, box, position = '50% 50%', rotate = 0 }) => (
  <div style={{ position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, overflow: 'hidden', transform: rotate ? `rotate(${rotate}deg)` : undefined }}>
    <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: position }} />
  </div>
);

/** Separation presets: which part of a colour picture a pass prints (density = 1 - (bias + weights . rgb)). */
export const SEP = {
  /** the shadows only: a key / outline plate */
  key: { weights: [0.2126, 0.7152, 0.0722] as [number, number, number], lo: 0.45, hi: 0.85 },
  /** all the tone, light to dark */
  tone: { weights: [0.2126, 0.7152, 0.0722] as [number, number, number], lo: 0.05, hi: 0.85 },
  /** what absorbs red: blues and darks (a cyan / blue plate) */
  blue: { weights: [1, 0, 0] as [number, number, number], lo: 0.18, hi: 0.85 },
  /** what absorbs green: reds, pinks and darks (a magenta / pink plate) */
  red: { weights: [0, 1, 0] as [number, number, number], lo: 0.2, hi: 0.85 },
  /** the colour's lack of blue: yellows, ochres, warm paper tones (a yellow plate) */
  yellow: { weights: [-0.5, -0.5, 1] as [number, number, number], bias: 1, lo: 0.04, hi: 0.4 },
  /** warmth: red over green (skin, vermilion) */
  warm: { weights: [-1, 1, 0] as [number, number, number], bias: 1, lo: 0.05, hi: 0.4 },
} as const;

export type Pass = Omit<InkProps, 'id' | 'children'> & { sep?: keyof typeof SEP };

/** One ink, a hard dot screen: the newspaper halftone. */
export const HalftonePhoto: React.FC<{ id: string; src: string; box: Box; ink?: InkName | string; position?: string; pitch?: number; angle?: number; lo?: number; hi?: number; gamma?: number; fade?: number; strength?: number; window?: Box; offset?: [number, number] }> = ({
  id, src, box, ink = 'federal', position, pitch = SCREENS.news.pitch, angle = SCREENS.news.angle, lo = 0.05, hi = 0.95, gamma = 1, fade, strength = 1, window, offset,
}) => (
  <InkPass id={id} ink={ink} pitch={pitch} angle={angle} lo={lo} hi={hi} gamma={gamma} strength={strength} grain={0.12} jitter={0} boil={0} rough={0.6} starve={0.12} speckle={0.1} fade={fade} window={window} offset={offset}>
    <PhotoArt src={src} box={box} position={position} />
  </InkPass>
);

/** A picture as two or three riso passes. Each pass: an ink, a separation, an angle; registers default to REGISTER. */
export const RisoPhoto: React.FC<{ id: string; src: string; box: Box; passes: Pass[]; position?: string; rotate?: number; window?: Box }> = ({ id, src, box, passes, position, rotate, window }) => (
  <>
    {passes.map(({ sep, ...p }, i) => (
      <InkPass key={i} id={`${id}-${i}`} angle={SCREENS.angles[i]} offset={REGISTER[i % REGISTER.length]} boil={0} window={window} {...(sep ? SEP[sep] : {})} {...p}>
        <PhotoArt src={src} box={box} position={position} rotate={rotate} />
      </InkPass>
    ))}
  </>
);

/** The sheet: paper under, the finish over, the passes between. */
export const Riso: React.FC<{ paper?: PaperProps; finish?: FinishProps; children: React.ReactNode }> = ({ paper, finish, children }) => (
  <>
    <Paper {...paper} />
    {children}
    <PrintFinish {...finish} />
  </>
);
