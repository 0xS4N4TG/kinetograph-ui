// The component's props: every piece of text, number, colour, font and picture. `defaultProps` on the Composition is
// `DEFAULTS`; `phoneOrbitSchema` lets Studio draw a form for them.

import { z } from 'zod';

/** A picture slot: the name of a file in `public/` (resolved with `staticFile`). Empty means "draw the stand-in". */
const picture = z.string().describe('file in public/, empty for the drawn stand-in');

export const phoneOrbitSchema = z.object({
  // text
  brand: z.string().describe('name in the post header'),
  postText: z.string().describe('the black caption pill on the post; use a line break for two lines'),
  subtitleBefore: z.string().describe('small caption on the photo, first half'),
  subtitleAfter: z.string().describe('small caption on the photo, second half (swaps in as the orbit opens)'),
  countFrom: z.number().describe('view count at the first frame, in thousands'),
  countTo: z.number().describe('view count it climbs to, in thousands'),
  countUnit: z.string().describe('suffix after the number'),
  countReachedAt: z.number().describe('frame where the count reaches countTo'),
  replyBlueLeft: z.string(),
  replyBlueRight: z.string(),
  replyGrey: z.string().describe('text of the grey bubble (a drawn flame follows it)'),
  appTitle: z.string().describe('title on the second screen state'),
  appLabelA: z.string().describe('first card label on the second screen state'),
  appTimeA: z.string(),
  appDayA: z.string(),
  appLabelB: z.string().describe('second card label'),
  appTimeB: z.string(),
  appDayB: z.string(),
  appTotal: z.string().describe('total under the dial'),
  appNote: z.string().describe('small note under the total'),
  appFooter: z.string().describe('link at the bottom of the second screen'),
  holdFps: z.number().describe('source frame rate the motion is held to: 24 matches the reference, 60 is fully smooth'),
  statusTime: z.string().describe('clock in the phone status bar'),
  // colours
  background: z.string(),
  bubbleBlue: z.string(),
  bubbleGrey: z.string(),
  accent: z.string().describe('logo and verified badge'),
  noteColor: z.string().describe('the sticky note in the drawn desk'),
  // fonts: families that are registered (the defaults load from Google Fonts)
  uiFont: z.string(),
  monoFont: z.string(),
  captionFont: z.string(),
  // pictures
  photo: picture.describe('the post photo (a picture or mp4/webm/mov video file); empty draws a desk from above'),
  photoStart: z.number().min(0).describe('seconds into photo where a video starts (ignored for a still)'),
  photoAfter: picture.describe('the second photo or video that replaces the first near the end'),
  photoAfterStart: z.number().min(0).describe('seconds into photoAfter where a video starts (ignored for a still)'),
  logo: picture,
  avatars: z.array(picture).describe('four avatar pictures; empty slots draw a stand-in portrait'),
});

export type PhoneOrbitProps = z.infer<typeof phoneOrbitSchema>;

export const DEFAULTS: PhoneOrbitProps = {
  brand: 'Kinetograph',
  postText: 'Our whole launch video is Kinetograph\ncomponents. Shipped in an afternoon',
  subtitleBefore: 'This...',
  subtitleAfter: 'is a phone.',
  countFrom: 10,
  countTo: 999,
  countUnit: 'k',
  countReachedAt: 178,
  replyBlueLeft: 'Which component is this?!',
  replyBlueRight: 'NEED THIS ASAP',
  replyGrey: 'This is peak',
  appTitle: 'Edit sleep schedule',
  appLabelA: 'GO TO BED',
  appTimeA: '21:15',
  appDayA: 'Tonight',
  appLabelB: 'WAKE UP',
  appTimeB: '00:50',
  appDayB: 'Tomorrow',
  appTotal: '3 h 35 min',
  appNote: "These times won't reach your sleep goal.",
  appFooter: 'Edit schedules in the Health app',
  holdFps: 24,
  statusTime: '9:41',
  background: '#000000',
  bubbleBlue: '#0a84ff',
  bubbleGrey: '#e6e6e9',
  accent: '#1a73ff',
  noteColor: '#f2c230',
  uiFont: 'Geist',
  monoFont: 'Geist Mono',
  captionFont: 'Roboto Condensed',
  photo: '',
  photoStart: 0,
  photoAfter: '',
  photoAfterStart: 0,
  logo: '',
  avatars: ['', '', '', ''],
};
