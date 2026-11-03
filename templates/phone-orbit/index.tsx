// phone-orbit: a short UI promo, timed to a measured 3.2 s clip. A phone showing a social post starts as a
// huge close-up of its lower edge, cuts to a pulled-back frame, glides to rest while chat bubbles, avatars and icon
// chips pop in around it, a hand reaches into the post's photo and lifts the phone, and the screen swaps to a second
// state as the view count reaches its cap.
//
// 1920x1080 at 60 fps, 193 frames (the reference is 960x540 at 60 fps; its numbers are doubled). Pictures are drawn
// in code; `photo`, `photoAfter`, `logo` and `avatars` take your own files from public/.
//
// From the kinetograph-ui root:
//   node ../kinetograph/packages/cli/dist/cli.js still templates/phone-orbit/index.tsx 100 --comp PhoneOrbit -o templates/phone-orbit/out/f100.png
//   node ../kinetograph/packages/cli/dist/cli.js render templates/phone-orbit/index.tsx -o templates/phone-orbit/out/phone-orbit.mp4

import React from 'react';
import { AbsoluteFill, Composition, Layer, Rect, registerRoot, useCurrentFrame } from '@kinetographdev/core';
import { Orbit } from './orbit.js';
import { Phone, push } from './phone.js';
import { DURATION, FPS, H, W, heldFrame } from './lib.js';
import { DEFAULTS, phoneOrbitSchema } from './props.js';
import type { PhoneOrbitProps } from './props.js';

export const PhoneOrbit: React.FC<PhoneOrbitProps> = (props) => {
  const p = { ...DEFAULTS, ...props };
  const f = heldFrame(useCurrentFrame(), p.holdFps);
  const g = push(f);
  return (
    <AbsoluteFill style={{ backgroundColor: p.background }}>
      <Layer>
        <Rect width={W} height={H} fill={p.background} />
        <Phone p={p} frame={f} />
        <Layer x={960} y={540} scale={g}>
          <Layer x={-960} y={-540}>
            <Orbit p={p} frame={f} />
          </Layer>
        </Layer>
      </Layer>
    </AbsoluteFill>
  );
};

registerRoot(() => (
  <Composition
    id="PhoneOrbit"
    component={PhoneOrbit}
    schema={phoneOrbitSchema}
    durationInFrames={DURATION}
    fps={FPS}
    width={W}
    height={H}
    defaultProps={DEFAULTS}
  />
));
