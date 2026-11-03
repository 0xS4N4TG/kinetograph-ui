// The feed post the reel keeps coming back to: the kit's SocialCard with the reel's save-reminder button in its save
// slot. Laid out from (0, 0) in world pixels; every part's position is in POST so a shot can aim the camera at it.

import React from 'react';
import { SOCIAL_CARD, SocialCard } from '../../kit/core/ui/social-card.js';
import type { SocialCardProps } from '../../kit/core/ui/social-card.js';
import { ReminderMark } from './lib.js';

export { Avatar, Tag } from '../../kit/core/ui/social-card.js';

export const POST = SOCIAL_CARD;

export type SaveState = 'outline' | 'filled' | 'reminder' | 'reminderFilled' | 'none';

export type PostProps = Omit<SocialCardProps, 'save'> & { save?: SaveState };

export const PostCard: React.FC<PostProps> = ({ save = 'outline', ...props }) => (
  <SocialCard
    {...props}
    save={save === 'reminder' ? <ReminderMark size={26} /> : save === 'reminderFilled' ? <ReminderMark size={26} filled /> : save}
  />
);
