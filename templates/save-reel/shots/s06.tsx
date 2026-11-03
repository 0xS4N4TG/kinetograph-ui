// Shot 06 (176-197): "COLLECTION" is typed out as the pan slows, then the camera eases back.
// The strip itself is shots/b-strip.tsx, shared with the neighbouring shots.

import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Strip } from './b-strip.js';

const FROM = 176;

export const Collection: React.FC = () => {
  const g = useCurrentFrame() + FROM;
  return g >= 180 ? <Strip g={g} /> : null;
};
