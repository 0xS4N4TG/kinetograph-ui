// The pages: each cut gets a made-up page set around the keyword, laid out in page pixels with the keyword's left end
// on the origin of its baseline. Seven layouts (a serif pull quote, an italic headline, a kicker line that starts with
// the keyword, plain body text, a web article in sans with a nav bar, a blog post with an author row, a display-serif
// headline), each with filler copy above and below; and three app screens (social.ts: a post feed, a forum post, a
// comment thread). Mastheads, authors, accounts and copy are invented; nothing is any real outlet's or person's.

import { random } from '@kinetographdev/core';
import { measure, type FaceKey } from './look.js';
import { PAGE_LAYOUTS, SCREEN_LAYOUTS, type Layout } from './layouts.js';
import { socialPage } from './social.js';

export interface Run {
  text: string;
  /** left end of the baseline, page pixels */
  x: number;
  y: number;
  face: FaceKey;
  size: number;
  color: string;
}

export interface Page {
  tint: string;
  runs: Run[];
  rules: { x: number; y: number; w: number; h: number; color: string }[];
  /** round things: avatars (a circle when w = h and r = w / 2), buttons; `stroke` outlines one */
  shapes: { x: number; y: number; w: number; h: number; r: number; color: string; stroke?: string }[];
  /** icons and curves: SVG path data at (x, y) times `scale`, stroked (`width` in path units) and/or filled */
  paths?: { d: string; x: number; y: number; scale: number; stroke?: string; width?: number; fill?: string }[];
  /** an app screen: it keeps its own background whatever the look's tint */
  screen?: boolean;
  /** the keyword's run: its left end is (0, 0) */
  key: { w: number; size: number; face: FaceKey; color: string };
}

const KEY = '\u0000';

const HEADLINES = [
  `Report: ${KEY} was the plan all along`,
  `New study links ${KEY} to basically everything`,
  `Experts baffled by ${KEY} for third year running`,
  `Governor: “${KEY} is not my problem.”`,
  `City council votes 4–3 to table ${KEY} indefinitely`,
  `Local man insists ${KEY} was his idea first`,
  `What we got wrong about ${KEY}`,
  `Inside the quiet rise of ${KEY}`,
  `Why everyone is suddenly talking about ${KEY}`,
  `“${KEY} changed everything,” say people who were there`,
  `The meeting about ${KEY} was rescheduled four times`,
  `Officials confirm ${KEY}, decline to elaborate`,
];

const KICKERS = [`${KEY}: still ongoing`, `${KEY}, explained`, `${KEY}: a timeline`, `${KEY} — official statement`, `${KEY}? Not so fast`];

const FILLER = [
  'Nobody noticed until now.',
  'Officials confirmed the smell but not the source.',
  'The meeting was rescheduled four times and then cancelled.',
  'Sources say they were told there were no sources.',
  'A second van was also seen.',
  'The consultant fee was not disclosed. It was large.',
  'Witnesses disagree on basically everything.',
  'The building has been there for years.',
  'Funding has been allocated. Its current location is unknown.',
  'Neighbours describe the street as quiet, which is what they always say.',
  'The report is nineteen pages and solves nothing.',
  'Several others checked their phones.',
  'An expert was consulted. The expert was also confused.',
  'Twelve people filed complaints. One received a reply.',
  'It turns out the licence had expired in 2019.',
  'The spokesperson smiled and said nothing that could be quoted.',
  'A full refund was promised to some of the affected customers.',
  'The statue has been removed pending further discussion.',
  'Authorities are urging calm, which is not helping.',
  'He said it twice. Nobody wrote it down.',
  'The investigation is ongoing, apparently.',
  'Most of it. Eventually.',
  'The committee will reconvene after lunch.',
  'Residents were surprised but not shocked.',
  'The app was updated. It is worse now.',
  'Several people clapped, then stopped.',
  'The minutes of the meeting were lost in the meeting.',
  'A spokesperson later clarified the clarification.',
];

const MASTHEADS = ['THE REGIONAL MURMUR', 'EVENING ECHO', 'THE DAILY RECKONING', 'GREATER AREA TODAY', 'THE WEEKLY OBSERVER', 'MORNING LEDGER'];
const NAVS = [
  ['Opinion', 'Culture', 'Science', 'Tech', 'World'],
  ['News', 'Business', 'Culture', 'Science'],
  ['Latest', 'Politics', 'Climate', 'Opinion', 'Ideas'],
];
const DECKS = [
  'The timeline does not match the official timeline, which also does not match itself',
  'What we thought we knew, and what we know now',
  'Documents obtained by this newspaper suggest someone knew',
  'A short history of a long afternoon',
];
const TITLES = ['Local Communities', 'Host Cities', 'The Long Game', 'Market Watch', 'After Hours', 'The Fine Print', 'Field Notes'];
const AUTHORS = ['Lily Nakamura', 'Marcus Webb', 'Dana Okafor', 'Priya Raman', 'Tom Reyes', 'Ines Larsen'];
const AVATARS = ['#d9534f', '#3b6fd8', '#2e9d6a', '#c98a1b', '#8a55c9'];
const TINTS = ['#efede6', '#f2f0ea', '#ebe8df', '#f4f2ec', '#e9e6dc', '#eeebe3'];
const INK = '#1c1b19';
const GREY = '#5a5750';

/** Filler words, shuffled sentence by sentence from the seed. */
function filler(seed: string) {
  let n = 0;
  let words: string[] = [];
  return () => {
    if (!words.length) words = FILLER[Math.floor(random(`${seed}-f${n++}`) * FILLER.length)].split(' ');
    return words.shift()!;
  };
}

const space = (face: FaceKey, size: number) => measure(' ', face, size);

/** Lines of filler in a column [x0, x0 + w], baselines from y0 stepping by `step` until `count` lines. */
function body(seed: string, face: FaceKey, size: number, x0: number, w: number, y0: number, step: number, count: number, color = INK): Run[] {
  const next = filler(seed);
  const out: Run[] = [];
  let carry = next();
  for (let i = 0; i < count; i++) {
    let text = carry;
    for (;;) {
      carry = next();
      if (measure(`${text} ${carry}`, face, size) > w) break;
      text += ` ${carry}`;
    }
    out.push({ text, x: x0, y: y0 + i * step, face, size, color });
  }
  return out;
}

/** A headline wrapped to w, set so the keyword's left end lands on the origin. */
function headline(template: string, keyword: string, face: FaceKey, size: number, lead: number, w: number, color = INK) {
  const tokens = template.split(' ');
  const width = (t: string) => measure(t === KEY ? keyword : t.replace(KEY, keyword), face, size);
  const lines: string[][] = [[]];
  let lw = 0;
  for (const t of tokens) {
    const tw = width(t);
    const line = lines[lines.length - 1];
    if (line.length && lw + space(face, size) + tw > w) {
      lines.push([t]);
      lw = tw;
    } else {
      lw += (line.length ? space(face, size) : 0) + tw;
      line.push(t);
    }
  }
  const li = lines.findIndex((l) => l.some((t) => t.includes(KEY)));
  const line = lines[li];
  const ki = line.findIndex((t) => t.includes(KEY));
  const [prefix, suffix] = line[ki].split(KEY);
  // the keyword's line in three runs: what comes before it (punctuation glued to it included), the keyword (drawn
  // by the shot, over its highlight), and what comes after
  const before = (ki ? `${line.slice(0, ki).join(' ')} ` : '') + prefix;
  const after = suffix + (ki + 1 < line.length ? ` ${line.slice(ki + 1).join(' ')}` : '');
  const x0 = -measure(before, face, size);
  const kw = measure(keyword, face, size);
  const runs: Run[] = [];
  lines.forEach((l, i) => {
    if (i !== li) runs.push({ text: l.join(' ').replace(KEY, keyword), x: x0, y: (i - li) * lead, face, size, color });
  });
  if (before) runs.push({ text: before, x: x0, y: 0, face, size, color });
  if (after) runs.push({ text: after, x: kw, y: 0, face, size, color });
  return { runs, x0, top: -li * lead - size, bottom: (lines.length - 1 - li) * lead, kw };
}

export { LAYOUTS, PAGE_LAYOUTS, SCREEN_LAYOUTS } from './layouts.js';
export type { Layout } from './layouts.js';

/** Page `n` for `keyword`, made from `layouts` in turn from a shuffled start so neighbours differ. `reach` is how far
 *  the copy must run above, below and to each side, page pixels; `seed` gives another pile of pages. */
export function page(keyword: string, n: number, reach: { x: number; y: number }, layouts: readonly Layout[] = PAGE_LAYOUTS, seed0 = 0): Page {
  const seed = `${keyword}-${seed0}-${n}`;
  const r = (k: string) => random(`${seed}-${k}`);
  const pick = <T,>(k: string, a: readonly T[]) => a[Math.floor(r(k) * a.length)];
  const layout = layouts[(Math.floor(random(`${keyword}-${seed0}-start`) * layouts.length) + n) % layouts.length];
  if (SCREEN_LAYOUTS.includes(layout)) return socialPage(layout, keyword, seed, reach);
  const tint = pick('tint', TINTS);
  const runs: Run[] = [];
  const rules: Page['rules'] = [];
  const shapes: Page['shapes'] = [];
  // copy on the baselines between a and b: going up, the last line sits exactly on b; going down, the first sits on a;
  // so it never runs into the headline or the keyword's line
  const lines = (face: FaceKey, size: number, x0: number, w: number, a: number, b: number, step: number, k: string, color = INK, up = false) => {
    if (b <= a) return [];
    const count = Math.floor((b - a) / step) + 1;
    return body(`${seed}-${k}`, face, size, x0, w, up ? b - (count - 1) * step : a, step, count, color);
  };

  if (layout === 'body' || layout === 'post') {
    // the keyword sits inside a line of copy, a random way along it: serif body text, or a blog post in sans
    const bf: FaceKey = layout === 'post' ? 'sans' : 'serif';
    const color = layout === 'post' ? '#2b2b2b' : INK;
    const size = layout === 'post' ? 28 + r('s') * 6 : 30 + r('s') * 8;
    const step = size * 1.5;
    const w = 760 + r('w') * 160;
    const pre = layout === 'post' && r('lead') < 0.5 ? 'The' : body(`${seed}-pre`, bf, size, 0, w * (0.15 + r('p') * 0.45), 0, step, 1)[0].text;
    const x0 = -measure(`${pre} `, bf, size);
    const kw = measure(keyword, bf, size);
    const post = body(`${seed}-post`, bf, size, 0, w - (measure(`${pre} `, bf, size) + kw), 0, step, 1)[0].text;
    runs.push({ text: `${pre} `, x: x0, y: 0, face: bf, size, color }, { text: ` ${post}`, x: kw, y: 0, face: bf, size, color });
    runs.push(...lines(bf, size, x0, w, step, reach.y, step, 'down', color));
    if (layout === 'body') {
      runs.push(...lines('serif', size, x0, w, -reach.y, -step, step, 'up', INK, true));
      return { tint, runs, rules, shapes, key: { w: kw, size, face: bf, color } };
    }
    // the post's head: reactions, the author row, a grey deck and a block title, going up from the copy
    let y = -step * 0.95;
    const small = size * 0.52;
    runs.push({ text: `${Math.floor(100 + r('likes') * 900)}`, x: x0 + small * 1.6, y, face: 'sans', size: small, color: GREY });
    shapes.push({ x: x0, y: y - small * 0.85, w: small * 1.1, h: small * 0.9, r: small * 0.2, color: '#e3b23c' });
    const cx = x0 + small * 6;
    shapes.push({ x: cx, y: y - small * 0.85, w: small * 1.1, h: small * 0.9, r: small * 0.45, color: '#7d7a73' });
    runs.push({ text: `${Math.floor(10 + r('comments') * 90)}`, x: cx + small * 1.6, y, face: 'sans', size: small, color: GREY });
    y -= small * 3.2;
    const av = size * 1.9;
    shapes.push({ x: x0, y: y - av * 0.75, w: av, h: av, r: av / 2, color: pick('av', AVATARS) });
    const name = pick('author', AUTHORS);
    const ns = size * 0.62;
    runs.push({ text: name, x: x0 + av * 1.3, y: y - av * 0.25, face: 'sansBold', size: ns, color: '#333' });
    runs.push({ text: 'Follow', x: x0 + av * 1.3 + measure(name, 'sansBold', ns) + ns, y: y - av * 0.25, face: 'sans', size: ns, color: '#d9534f' });
    runs.push({ text: `Sep ${Math.floor(1 + r('day') * 28)}, 2025 · ${Math.floor(2 + r('read') * 7)} min read`, x: x0 + av * 1.3, y: y + av * 0.2, face: 'sans', size: ns * 0.85, color: GREY });
    y -= av * 1.6;
    runs.push({ text: pick('deck', DECKS), x: x0, y, face: 'sans', size: size * 0.8, color: '#8a877f' });
    y -= size * 1.5;
    const ts = size * 2.3;
    runs.push({ text: pick('title', TITLES), x: x0, y, face: 'block', size: ts, color: '#2a2a2a' });
    runs.push(...lines('sans', size * 0.8, x0, w, -reach.y, y - ts * 1.4, size * 1.25, 'up', GREY, true));
    return { tint, runs, rules, shapes, key: { w: kw, size, face: bf, color } };
  }

  const face: FaceKey =
    layout === 'pull'
      ? 'serifBold'
      : layout === 'italic' || layout === 'kicker'
        ? 'serifItalic'
        : layout === 'web'
          ? pick('wf', ['sansBold', 'sansBold', 'condensed'] as const)
          : 'display';
  const size = layout === 'kicker' ? 46 + r('s') * 8 : 50 + r('s') * 14;
  const lead = size * (layout === 'web' ? 1.12 : 1.18);
  const template = layout === 'kicker' ? pick('k', KICKERS) : pick('h', HEADLINES);
  const quoted = layout === 'pull' && r('q') < 0.6 && !template.includes('“');
  // web headlines run long, so the keyword sits mid-line with the sentence running off both sides of the frame
  const wrap = layout === 'kicker' ? 2000 : layout === 'web' ? 1000 + r('w') * 500 : 520 + r('w') * 240;
  const h = headline(quoted ? `“${template}”` : template, keyword, face, size, lead, wrap);
  runs.push(...h.runs);
  const x0 = h.x0;
  const bodyFace: FaceKey = layout === 'web' ? 'sans' : 'serif';
  const bsize = layout === 'web' ? 22 : 15 + r('b') * 3;
  const bstep = bsize * 1.55;
  const colW = Math.max(520, Math.min(760, (h.kw - h.x0) * 1.15 + 120));

  // above the headline: a masthead or a nav bar, a rule, and copy running off the top
  let top = h.top - size * 0.6;
  if (layout === 'web') {
    const nav = pick('nav', NAVS);
    const ns = 20;
    let x = x0;
    for (const item of nav) {
      runs.push({ text: item, x, y: top - ns * 0.4, face: 'sans', size: ns, color: GREY });
      x += measure(item, 'sans', ns) + ns * 1.4;
    }
    // sign in and a subscribe button at the column's right end, on some pages
    if (r('sub') < 0.6) {
      const right = x0 + colW;
      const bw = measure('Subscribe', 'sansBold', ns * 0.8) + ns * 1.4;
      shapes.push({ x: right - bw, y: top - ns * 2.6, w: bw, h: ns * 1.5, r: ns * 0.75, color: '#2448c8' });
      runs.push({ text: 'Subscribe', x: right - bw + ns * 0.7, y: top - ns * 1.55, face: 'sansBold', size: ns * 0.8, color: '#ffffff' });
      runs.push({ text: 'Sign in', x: right - bw - measure('Sign in', 'sans', ns * 0.8) - ns, y: top - ns * 1.55, face: 'sans', size: ns * 0.8, color: GREY });
    }
    top -= ns * 2.2;
  } else {
    const m = pick('m', MASTHEADS);
    runs.push({ text: m, x: x0, y: top, face: 'serifBold', size: 10, color: GREY });
    rules.push({ x: x0, y: top + 8, w: colW, h: 1.2, color: '#8d897f' });
    top -= 30;
  }
  runs.push(...lines(bodyFace, bsize, x0, colW, -reach.y, top - bstep, bstep, 'up', layout === 'web' ? GREY : INK, true));

  // below: a deck and byline for most, a rule, then copy running off the bottom
  let below = h.bottom + size * 0.9;
  if (layout !== 'pull' && r('d') < 0.8) {
    const ds = layout === 'web' ? 24 : 13;
    const deck = body(`${seed}-deck`, layout === 'web' ? 'sans' : 'serifItalic', ds, x0, colW * 0.95, below, ds * 1.35, 2, GREY);
    deck.forEach((d, i) => (d.text = i === 0 ? pick('deck', DECKS) : d.text));
    runs.push(deck[0]);
    below += ds * 2.4;
    if (layout !== 'web') {
      runs.push({ text: `By ${pick('by', ['Our Correspondent', 'Staff Writer', 'Desk Reporter', 'A Concerned Editor'])}`, x: x0, y: below, face: 'serif', size: 10, color: GREY });
      below += 26;
    }
  }
  rules.push({ x: x0, y: below, w: colW, h: 1, color: '#b4afa4' });
  // web pages leave white space before the copy
  below += layout === 'web' ? size * 3 : 30;
  runs.push(...lines(bodyFace, bsize, x0, colW, below, reach.y, bstep, 'down', layout === 'web' ? GREY : INK));

  // a second column of copy beside the first, on some pages
  if (r('c2') < 0.5 && layout !== 'web') {
    const gutter = 34;
    runs.push(...lines(bodyFace, bsize, x0 + colW + gutter, colW, -reach.y, reach.y, bstep, 'c2'));
    if (r('c3') < 0.5) runs.push(...lines(bodyFace, bsize, x0 - colW - gutter, colW, -reach.y, reach.y, bstep, 'c3'));
  }
  return { tint, runs, rules, shapes, key: { w: h.kw, size, face, color: INK } };
}
