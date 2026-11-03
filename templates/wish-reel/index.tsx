// The wish style: an 18 s pop-art edit built in Kinetograph from a measured reference, and made into a component
// that runs on any footage. Sunny street footage flattens into pastel pop colours under ribbons of colour, with
// 3D props tracked into it (road signs, gems, gradient and patchwork cards, crystal shards, sign poles, a
// tunnel of roman-numeral clock faces); a helix of coloured strands in a white void; a collage of photos and
// editor panels in stop motion; black title cards; a typewriter ending.
//
// No 3D package and no compositor: the props are the 3D layer's own primitives, the cameras come from
// tools/track-camera.mjs (a small tracker that solves the camera from points on the floor), the strands are
// drawn through the same cameras, and the grade is one WGSL shader (lib.ts, POP).
//
// Two compositions:
//   WishReel    the edit on this effect's own five clips
//   WishFilter  the whole style on one video of your own: prepare it as "input" first,
//                 node tools/prepare.mjs ~/Movies/walk.mov input
//
//   node ../../../kinetograph/packages/cli/dist/cli.js studio index.tsx
//   node ../../../kinetograph/packages/cli/dist/cli.js render index.tsx --comp WishReel -o out/wish-reel.mp4
//
// Shot list (30 fps), measured from the reference frame by frame: 0 warning, 18 rays, 51 flash, 54 title,
// 90 white, 93 collage, 156 white, 159 tell, 180 whip, 198 white, 201 storm, 264 streaks, 267 helix,
// 318 framed, 339 tunnel, 399 typewriter (style.tsx).
//
// Footage: CC BY / CC BY-SA clips from Wikimedia Commons (tools/make-media.sh lists them).

import React from 'react';
import { Composition, registerRoot } from 'remotion';
import input from './cams/input.js';
import platform from './cams/platform.js';
import rocks from './cams/rocks.js';
import shops from './cams/shops.js';
import shrine from './cams/shrine.js';
import walkway from './cams/walkway.js';
import { DURATION, FPS, H, W } from './lib.js';
import { WishStyle, filterClips } from './style.js';
import type { StyleProps } from './style.js';

const REEL: StyleProps = {
  clips: {
    rays: { src: 'walkway.mp4', track: walkway, vp: { x: 690, y: 560 } },
    title: { src: 'platform.mp4', track: platform },
    storm: { src: 'shops.mp4', track: shops, vp: { x: 330, y: 500 } },
    tunnel: { src: 'shrine.mp4', track: shrine },
    framed: { src: 'rocks.mp4', track: rocks },
  },
};

const FILTER: StyleProps = {
  clips: filterClips({ src: 'input.mp4', track: input }),
  photos: Array.from({ length: 8 }, (_, i) => `input_photo${i}.jpg`),
};

const Reel: React.FC<StyleProps> = (p) => <WishStyle {...p} />;

export const Root: React.FC = () => (
  <>
    <Composition id="WishReel" component={Reel} width={W} height={H} fps={FPS} durationInFrames={DURATION} defaultProps={REEL} />
    <Composition id="WishFilter" component={Reel} width={W} height={H} fps={FPS} durationInFrames={DURATION} defaultProps={FILTER} />
  </>
);

registerRoot(Root);
