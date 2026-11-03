// The taped photo: a bordered print taped onto kraft cardboard, thrown on slightly turned and settling, then a slow
// push; it leaves with a single-image punch-in (1.36x, defocused) and a hard cut. Measured off a reference reel
// f78-f119:
//   - print 0.9076 W x 0.6674 H at rest, white border L 3.7 % R 3.5 % T 1.0 % B 1.3 % of its size (#f5f0e9, clean edge),
//     rest centre (0.4947 W, 0.4889 H), rest tilt -2.2 deg
//   - arrives at tilt -4.23 deg, the extra turn decaying x0.66 an image; scale 1 dips to 0.9765 over five images (x0.5
//     an image) then pushes linearly +0.00104 a frame; the print rises 0.35 px a frame
//   - shadow down-right (+20, +31) px, sigma 21 px, near-black at 0.54, in screen space (it does not turn with the print)
//   - two masking-tape strips (#eee4d1 at 0.78, pinked ends) at the top corners, -40 and +34 deg, rigid with the print
//   - kraft card static and full-bleed (#9a7756 top to #8b6b4c bottom); a static 4.5-4.7 px lattice screen over it all
import React from 'react';
import { AbsoluteFill, staticFile, useVideoConfig } from 'remotion';

/** pinked-end tape strip, w x h px, centred */
const Tape: React.FC<{ w: number; h: number; seed: number }> = ({ w, h, seed }) => {
  const teeth = 4, depth = 7;
  const end = (x0: number, dir: number) => Array.from({ length: teeth * 2 + 1 }, (_, i) => `${x0 + dir * (i % 2 ? depth : 0) + ((seed * 7 + i * 3) % 3)},${(i / (teeth * 2)) * h}`);
  const pts = [...end(0, 1), ...end(w, -1).reverse()].join(' ');
  return <svg width={w} height={h} style={{ position: 'absolute', left: -w / 2, top: -h / 2, overflow: 'visible' }}><polygon points={pts} fill="rgba(238,228,209,0.78)" /></svg>;
};

export interface TapedPhotoProps {
  /** frames since the shot started (held to images by the caller or not: the motion is on twos here) */
  t: number;
  /** the shot's length; the last image is the punch-in */
  frames: number;
  src: string;
  /** CSS object-position for the picture inside the border */
  position?: string;
  /** a filter for the picture (the reference keeps colour; archive photos look right with a warm grade) */
  filter?: string;
  base?: string;
}

export const TapedPhoto: React.FC<TapedPhotoProps> = ({ t, frames, src, position = '50% 30%', filter, base = 'collage-textures' }) => {
  const { width: W, height: H } = useVideoConfig();
  const img = Math.floor(t / 2);
  const f = img * 2; // on twos
  const lastImg = Math.floor((frames - 1) / 2);
  const punch = img >= lastImg;
  // scale: dip x0.5 an image to 0.9765 at image 5, then +0.00104 a frame (10-frame ease-in)
  const dip = 0.9765 + 0.0235 * Math.pow(0.5, Math.min(img, 5)) * (img < 5 ? 1 : 0);
  const push = f <= 10 ? 0 : f <= 20 ? (0.00104 * (f - 10) * (f - 10)) / 20 : 0.00104 * (f - 15);
  const s = (img < 5 ? dip : 0.9765 + push) * (punch ? 1.36 : 1);
  const tilt = -2.2 - 2.03 * Math.pow(0.66, img);
  const cx = 0.4947 * W + (punch ? 6 : 0), cy = 0.4889 * H + 13.4 - 0.35 * f + (punch ? 26 : 0);
  const pw = 0.9076 * W, ph = 0.6674 * H;
  const sh = { x: 20, y: 31 };
  return (
    <AbsoluteFill style={{ background: '#906d4d' }}>
      <img src={staticFile(`${base}/kraft.jpg`)} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, objectFit: 'cover', filter: 'brightness(0.8) saturate(0.95)' }} />
      <AbsoluteFill style={{ background: 'linear-gradient(rgba(255,235,210,0.10), rgba(0,0,0,0.06))' }} />
      <AbsoluteFill style={{ filter: punch ? 'blur(7.5px)' : undefined }}>
        {/* the shadow, offset in screen space */}
        <div style={{ position: 'absolute', left: cx - (pw * s) / 2 + sh.x, top: cy - (ph * s) / 2 + sh.y, width: pw * s, height: ph * s, transform: `rotate(${tilt}deg)`, background: 'rgba(0,0,20,0.54)', filter: 'blur(21px)' }} />
        <div style={{ position: 'absolute', left: cx - pw / 2, top: cy - ph / 2, width: pw, height: ph, transform: `scale(${s.toFixed(4)}) rotate(${tilt.toFixed(2)}deg)`, transformOrigin: '50% 50%' }}>
          <div style={{ position: 'absolute', inset: 0, background: '#f5f0e9' }} />
          <img src={src} style={{ position: 'absolute', left: 0.037 * pw, top: 0.0098 * ph, width: pw * (1 - 0.037 - 0.035), height: ph * (1 - 0.0098 - 0.0129), objectFit: 'cover', objectPosition: position, filter }} />
          <div style={{ position: 'absolute', left: 0.03 * pw, top: 0.06 * ph, transform: 'rotate(-40deg)' }}><Tape w={230} h={58} seed={1} /></div>
          <div style={{ position: 'absolute', left: 0.96 * pw, top: 0.02 * ph, transform: 'rotate(34deg)' }}><Tape w={217} h={60} seed={2} /></div>
        </div>
      </AbsoluteFill>
      <img src={staticFile(`${base}/lattice.png`)} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, mixBlendMode: 'overlay', opacity: 0.6 }} />
    </AbsoluteFill>
  );
};
