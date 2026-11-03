// Shot 13: the page goes dark round the last post's photo, which glows and is pushed in on slowly.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import type { Media } from '../lib.js';
import { FeedWorld } from './d-feed.js';

const FROM = 560;
// shot 14 draws the same world from here on
const HANDOVER = 740;

export const Photo: React.FC<{ media: Media }> = ({ media }) => {
  const f = FROM + useCurrentFrame();
  return f < HANDOVER ? <FeedWorld id="feed-13" frame={f} media={media} /> : null;
};
