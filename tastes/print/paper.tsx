// The sheet under the inks and the finish over them.
//
//   Paper        a flat paper colour with fibre grain (std about 8 levels, re-rolled with the ink grain:
//                DVd9Ls2gHWM final, paper p50 #dbe1da, std ~8), optionally a graph-paper scan (the reel's overprint
//                poster sits on graph paper, f156-185) and a dust-and-scratch scan multiplied in
//   PrintFinish  over everything: the user's scanned halftone in soft light (DUJWPrqCYGX: "a scanned halftone texture
//                on Overlay or Linear Light, strength by Curves"), the curved moire the user liked, a faint vignette of
//                ink-room light
//
// Texture files are looked up under `base` in the effect's public folder (default `textures`):
//   textures/paper-300.jpg     graph-paper scan (Texturelabs Paper 300, downscaled; for use in videos, not redistribution)
//   textures/dust.jpg          dust and scratches: a crop of Texturelabs Paper 338, inverted and levelled to a light
//                              sheet with dark specks (downscaled; same terms)
//   textures/halftone-scan.jpg the user's own scanned halftone, a 1080x1920 crop
//   textures/moire.png         tastes/explainer/textures/moire.png
import React from 'react';
import { Layer, Rect, grain } from '@kinetographdev/core';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { PAPER, RATES } from './tokens.js';

export interface PaperProps {
  color?: string;
  /** fibre grain amount (0.06 ~ std 8 levels) */
  fibre?: number;
  /** graph-paper scan strength 0..1 */
  graph?: number;
  /** dust and scratches strength 0..1 */
  dust?: number;
  base?: string;
  id?: string;
}

export const Paper: React.FC<PaperProps> = ({ color = PAPER.cream, fibre = 0.06, graph = 0, dust = 0.5, base = 'textures', id = 'paper' }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const roll = Math.floor(f / RATES.grain);
  // the dust scan jumps a little with each roll, as a re-printed sheet would
  const jx = ((roll * 37) % 9) - 4, jy = ((roll * 53) % 9) - 4;
  return (
    <AbsoluteFill style={{ background: color }}>
      {graph > 0 && (
        <Img src={staticFile(`${base}/paper-300.jpg`)} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'multiply', opacity: graph }} />
      )}
      {dust > 0 && (
        <Img src={staticFile(`${base}/dust.jpg`)} style={{ position: 'absolute', left: -12 + jx, top: -12 + jy, width: W + 24, height: H + 24, mixBlendMode: 'multiply', opacity: dust }} />
      )}
      <Layer id={`${id}-fibre`} effects={[grain(fibre, { seed: 11 + (roll % 997), size: 1, animate: false })]} blendMode="multiply">
        <Rect width={W} height={H} fill="#ffffff" />
      </Layer>
    </AbsoluteFill>
  );
};

export interface FinishProps {
  /** the user's scanned halftone, soft light, 0..1 */
  scan?: number;
  /** the curved moire, 0..1 (0.1-0.15 reads as a texture, not a pattern) */
  moire?: number;
  /** a soft darkening at the edges, 0..1 */
  vignette?: number;
  base?: string;
}

export const PrintFinish: React.FC<FinishProps> = ({ scan = 0.35, moire = 0, vignette = 0.25, base = 'textures' }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const roll = Math.floor(f / RATES.grain);
  const jx = ((roll * 41) % 7) - 3, jy = ((roll * 29) % 7) - 3;
  return (
    <>
      {scan > 0 && (
        <AbsoluteFill style={{ pointerEvents: 'none', backgroundImage: `url(${staticFile(`${base}/halftone-scan.jpg`)})`, backgroundSize: `${W + 16}px ${H + 16}px`,
          backgroundPosition: `${jx - 8}px ${jy - 8}px`, mixBlendMode: 'soft-light', opacity: scan }} />
      )}
      {moire > 0 && (
        <AbsoluteFill style={{ pointerEvents: 'none', backgroundImage: `url(${staticFile(`${base}/moire.png`)})`, backgroundSize: '111% 109%',
          backgroundPosition: `${(-0.04 * W + f * 0.25).toFixed(1)}px ${(-0.03 * H + f * 0.6).toFixed(1)}px`, mixBlendMode: 'multiply', opacity: moire }} />
      )}
      {vignette > 0 && (
        <AbsoluteFill style={{ pointerEvents: 'none', background: `radial-gradient(ellipse 75% 60% at 50% 45%, rgba(0,0,0,0) 55%, rgba(40,30,20,${(0.35 * vignette).toFixed(3)}) 100%)` }} />
      )}
    </>
  );
};
