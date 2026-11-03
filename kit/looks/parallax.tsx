// Parallax from one photo cut into layers: foreground, midground and background cut-outs (the
// hole behind a cut-out filled), spaced in depth so a sideways camera slide moves them at different speeds. Measured:
// the plugin's 50 mm camera with layers 1000 apart gives shift factors 3.0 : 1.0 : 0.6 (foreground 382 px against
// background 78 px over the same 80 frames), no scale change, the foreground out of focus, all on twos.
import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

export interface ParallaxLayer {
  /** a picture (a cut-out PNG for all but the back) or any node */
  src?: string;
  node?: React.ReactNode;
  /** how far it moves for one unit of camera travel: 3 for the foreground, 1 for the subject, 0.6 for the background */
  factor: number;
  /** defocus in px at 1080 wide (the foreground's) */
  blur?: number;
  /** its own extra drift over the move, fractions of W, e.g. a cable car travelling the other way */
  drift?: number;
}

export interface ParallaxProps {
  /** back to front */
  layers: ParallaxLayer[];
  start: number;
  duration: number;
  /** camera travel for factor 1, fractions of W (negative: the picture moves left) */
  travel?: number;
  /** vertical travel for factor 1, fractions of H */
  rise?: number;
}

export const Parallax: React.FC<ParallaxProps> = ({ layers, start, duration, travel = -0.07, rise = 0 }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const t = interpolate(f, [start, start + duration], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {layers.map((ly, i) => {
        const k = ly.factor, x = (travel * k + (ly.drift ?? 0)) * t * W, y = rise * k * t * H;
        // drawn large enough that its edge never enters the frame over the whole move
        const grow = 1 + 2 * Math.max(Math.abs(travel * k), Math.abs(rise * k));
        return (
          <AbsoluteFill key={i} style={{ transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${grow.toFixed(3)})`, filter: ly.blur ? `blur(${((ly.blur * W) / 1080).toFixed(1)}px)` : undefined }}>
            {ly.node ?? (ly.src && <Img src={ly.src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />)}
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
