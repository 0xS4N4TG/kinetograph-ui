// Shot 15: the end card. White on black, the credit and handle in the middle, a small line below that comes in
// a little later; all of it fades out at the end.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Layer, Text } from '@kinetographdev/core';
import { UI, W, ramp } from '../lib.js';

const FROM = 939;

export const EndCard: React.FC = () => {
  const f = FROM + useCurrentFrame();
  const out = ramp(f, 1140, 1164, 1, 0, (t) => t);
  return (
    <Layer>
      <Layer opacity={ramp(f, 936, 948, 0, 1) * out}>
        <Text font={UI} weight={700} size={37} color="#fff" x={0} y={379} maxWidth={W} align="center">
          MADE BY A HUMAN
        </Text>
        <Text font={UI} weight={400} size={23} color="#d4d4d4" x={0} y={432} maxWidth={W} align="center">
          @yourhandle
        </Text>
      </Layer>
      <Text
        font={UI}
        weight={500}
        size={20}
        color="#fff"
        x={0}
        y={676}
        maxWidth={W}
        align="center"
        opacity={ramp(f, 962, 974, 0, 1) * out}
      >
        An unofficial concept for Instagram
      </Text>
    </Layer>
  );
};
