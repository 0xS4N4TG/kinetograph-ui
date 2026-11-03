// Shot 01: out of the post's picture to the whole post; it is liked (heart pop, "like it") and saved ("Save it...").
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { FeedScene } from './a-feed.js';

export const Post: React.FC = () => <FeedScene frame={useCurrentFrame()} />;
