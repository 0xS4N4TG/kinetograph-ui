// Shot 12: the reminder feed rises in; the camera scrolls down the posts, the first picture pushes in on its
// Button and a hand presses it.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Layer } from '@kinetographdev/core';
import type { Media } from '../lib.js';
import { FeedWorld } from './d-feed.js';

// The Sequence starts 3 frames before the feed shows, so the motion blur of its first frame (450) has sub-frames to
// average; before 449.5 (sub-frame time) it is hidden under shot 11.
const FROM = 447;
const SHOWS = 449.5;

export const Feed: React.FC<{ media: Media }> = ({ media }) => {
  const f = FROM + useCurrentFrame();
  return (
    <Layer opacity={f >= SHOWS ? 1 : 0}>
      <FeedWorld id="feed-12" frame={f} media={media} />
    </Layer>
  );
};
