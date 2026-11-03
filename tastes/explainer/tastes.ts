// The catalogue of tastes. One file per taste in tastes/, one row per taste in TASTES.md (what an agent reads to choose).
// What a taste is, and BASE, the measured numbers a taste inherits: taste.ts.
//
// Fonts: the measured reference sets its type in a geometric sans, italic, which Poppins (Google, OFL) matches: the kit's
// default. Many such reels use Gilroy, a paid font (only its Light and ExtraBold are free, for personal use, from its
// designer); with a licence, load it with `loadFont` and set `font: 'Gilroy'`.

import { agency } from './tastes/agency.js';
import { ember } from './tastes/ember.js';
import { graph } from './tastes/graph.js';
import { ledger } from './tastes/ledger.js';
import { mono } from './tastes/mono.js';
import { pulse } from './tastes/pulse.js';
import { red } from './tastes/red.js';

export { agency, ember, graph, ledger, mono, pulse, red };
export { BASE, defineTaste } from './taste.js';
export type { CornerKind, ExplainerTaste, Hop, TasteCamera, TasteInput, TasteMeta, WipeKind } from './taste.js';

export const TASTES = { red, ember, graph, pulse, agency, mono, ledger } as const;
export type TasteName = keyof typeof TASTES;

/** A taste by name; throws with the list when there is none, so an agent sees what it can pick. */
export const taste = (name: string) => {
  const t = (TASTES as Record<string, (typeof TASTES)[TasteName]>)[name];
  if (!t) throw new Error(`no explainer taste "${name}"; have ${Object.keys(TASTES).join(', ')}`);
  return t;
};
