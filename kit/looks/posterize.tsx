// Posterize Time: hold every frame for `step` frames, so motion steps like animation on twos (12 fps at 24) or threes
// (8 fps). Measured on the references: the curve-cut and parallax reels run on twos, the posterized page turns on
// threes; nothing is motion blurred, each held pose is crisp. Wrap anything; audio inside is silent (as in a Freeze).
import React from 'react';
import { Freeze, useCurrentFrame } from 'remotion';

/** Children see only every `step`th frame (default 2: on twos). `offset` shifts which frames are held. */
export const Posterize: React.FC<{ step?: number; offset?: number; children: React.ReactNode }> = ({ step = 2, offset = 0, children }) => {
  const f = useCurrentFrame();
  if (step <= 1) return <>{children}</>;
  return <Freeze frame={Math.max(0, Math.floor((f - offset) / step) * step + offset)}>{children}</Freeze>;
};
