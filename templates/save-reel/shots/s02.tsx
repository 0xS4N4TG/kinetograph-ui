// Shot 02: the whip down the feed; the pale column slides off to the left onto the dark. Starts at frame 54.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { FeedScene } from './a-feed.js';

export const FeedWhip: React.FC = () => <FeedScene frame={useCurrentFrame() + 54} />;
