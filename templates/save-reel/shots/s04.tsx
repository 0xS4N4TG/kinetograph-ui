// Shot 04 (134-152): the huge pink to orange "IN YOUR" pans past; the pointer flips face up as it rises.
// The strip itself is shots/b-strip.tsx, shared with the neighbouring shots. Each shot draws it only on frames
// whose motion-blur sub-frames fall inside its own Sequence (a sub-frame outside it draws nothing and would fade the
// average), so the hand-overs are at 153 and 180 rather than where the Sequences start. The cut in from shot 03 is
// at 135, as in the reference.

import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Strip } from './b-strip.js';

const FROM = 134;

export const InYour: React.FC = () => {
  const g = useCurrentFrame() + FROM;
  return g >= 134.5 && g < 153 ? <Strip g={g} /> : null;
};
