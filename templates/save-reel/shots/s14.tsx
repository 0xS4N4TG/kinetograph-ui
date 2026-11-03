// Shot 14: the camera tilts up to the photo's header under a spotlight, "Forever$" is written on in yellow, and
// everything fades to black.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Layer } from '@kinetographdev/core';
import type { Media } from '../lib.js';
import { FeedWorld, ForeverNote } from './d-feed.js';

const FROM = 740;

export const Forever: React.FC<{ media: Media }> = ({ media }) => {
  const f = FROM + useCurrentFrame();
  return (
    <Layer>
      <FeedWorld id="feed-14" frame={f} media={media} />
      <ForeverNote frame={f} />
    </Layer>
  );
};
