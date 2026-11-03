// The props of the composition, their defaults, and the theme the cards read through context.

import React from 'react';

/** The words printed on the drawn UI cards. Every key is optional; what you leave out keeps its default. */
export interface CardTexts {
  /** Small grey question above the paragraph on the document card. */
  docQuestion: string;
  /** The paragraph on the document card. */
  docBody: string;
  /** The word in the dark chip on the blue card ("<brand> is [installed]"). */
  chipTag: string;
  /** First, blue-grey word of the dark terminal card. */
  codeLead: string;
  /** The rest of that line, in white. */
  codeTail: string;
  /** Centred line on the white "ship" card. */
  ship: string;
  /** Line on the "built for" card. */
  built: string;
  /** The black caption strip on the top-right card. */
  caption: string;
  /** Big line on the white card with the heavy bezel (it overflows the card on purpose). */
  command: string;
  /** Title over the ring of tiles on the dark card. */
  ringTitle: string;
  /** The line in the input card: longer than the card, so only its end shows (a typing snapshot). */
  typed: string;
  /** The question in the chat card's input. */
  chatQuestion: string;
  /** The chip on the photo collage card. */
  clips: string;
  /** The line under the avatar strip. */
  followers: string;
  /** Prompt typed in the pale-blue card. */
  gradPrompt: string;
  /** Short line on the small note card. */
  plan: string;
  /** Large line on the white card that slides in from the left during the whip. */
  welcome: string;
  /** Line on the white strip card that sits beside it. */
  automated: string;
  /** Small label on the little logo card. */
  company: string;
  /** Line on the small greeting card. */
  meet: string;
  /** Serif line on the narrow tall card. */
  serif: string;
}

export const DEFAULT_TEXTS: CardTexts = {
  docQuestion: 'How should we structure the demo video?',
  docBody:
    'Build one composition per scene and keep the timeline declarative, so the same props always render the same frames. Anything that reads the clock at render time is a bug you will find in the export.',
  chipTag: 'installed',
  codeLead: 'install',
  codeTail: 'One Tool',
  ship: 'Ship. Test. Deploy. Repeat.',
  built: 'Built for the stack you already use.',
  caption: 'Acme reconciles every transaction automatically',
  command: 'One command. Own it.',
  ringTitle: 'A whole new universe',
  typed: 'does this demo actually look exp',
  chatQuestion: 'How do I rank higher in AI answers?',
  clips: '5 clips',
  followers: 'Ada and 5,000 others followed you',
  gradPrompt: 'make a gradient background',
  plan: 'plan for tomorrow',
  welcome: 'One command into your project.',
  automated: 'Automated with extra checks',
  company: 'Northwind',
  meet: 'Meet Acme Billing',
  serif: 'prompts you should rank for\nname shows up everywhere AI looks.',
};

export interface CollageBurstProps extends Record<string, unknown> {
  /** Brand name in the opening wordmark and on the blue card. */
  brand: string;
  /** Second word of the wordmark, set after the brand. Empty string for none. */
  brandSuffix: string;
  /** The two tagline phrases. The first word of each shows alone, then the line completes. */
  lines: [string, string];
  /** Font for the wordmark, the tagline and the UI text inside the cards (Google Fonts family). */
  sansFont: string;
  /** Font for small code and label text inside the cards (Google Fonts family). */
  monoFont: string;
  /** Font for the small serif text on the chat and left-hand cards (Google Fonts family). */
  serifFont: string;
  /** Page and canvas colour. */
  background: string;
  /** Wordmark and tagline colour. */
  textColor: string;
  /** Blue of the accent card and the small buttons. */
  accent: string;
  /** Paper colour of the white-ish cards. */
  paper: string;
  /** Dark card colour. */
  dark: string;
  /** Your own screenshots or photos, as `staticFile` paths ("shots/home.png"). They fill the photo cards and the
   *  UI cards' screens in turn. Empty: every card is drawn in code. */
  images: string[];
  /** Words on the drawn UI cards. */
  cardTexts: Partial<CardTexts>;
  /** Seeds the tilt and timing jitter of the burst. */
  seed: number;
}

export const DEFAULT_PROPS: CollageBurstProps = {
  brand: 'Kinetograph',
  brandSuffix: '',
  lines: ['One subscription.', 'Endless videos.'],
  sansFont: 'Geist',
  monoFont: 'Geist Mono',
  serifFont: 'Noto Serif',
  background: '#000000',
  textColor: '#ffffff',
  accent: '#3b82e6',
  paper: '#f7f6f2',
  dark: '#111113',
  images: [],
  cardTexts: {},
  seed: 7,
};

export interface Theme {
  sans: string;
  mono: string;
  serif: string;
  ink: string;
  paper: string;
  dark: string;
  accent: string;
  brand: string;
  texts: CardTexts;
  images: string[];
}

export const ThemeContext = React.createContext<Theme>({
  sans: DEFAULT_PROPS.sansFont,
  mono: DEFAULT_PROPS.monoFont,
  serif: DEFAULT_PROPS.serifFont,
  ink: '#161617',
  paper: DEFAULT_PROPS.paper,
  dark: DEFAULT_PROPS.dark,
  accent: DEFAULT_PROPS.accent,
  brand: DEFAULT_PROPS.brand,
  texts: DEFAULT_TEXTS,
  images: [],
});

export const useTheme = () => React.useContext(ThemeContext);
