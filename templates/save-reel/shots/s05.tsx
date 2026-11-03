// Shot 05 (150-180): the collection grid sweeps left under the pointer; the tile under it pops up.
// The strip itself is shots/b-strip.tsx, shared with the neighbouring shots.

import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Strip } from './b-strip.js';

const FROM = 150;

export const Grid: React.FC = () => {
  const g = useCurrentFrame() + FROM;
  return g >= 153 && g < 180 ? <Strip g={g} /> : null;
};
