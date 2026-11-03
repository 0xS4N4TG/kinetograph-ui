// The social pages: app screens laid out around the keyword, in light or dark mode. `tweet` is a feed of short posts
// (author row, text, sometimes a link or a video card, an action row), sometimes joined as a thread; `reddit` is a
// forum post (community row, title, flair, body, action pills); `comments` is a nested comment thread. The keyword sits
// inside a line of one post's text (or a forum title), and posts fill the reach above and below it.
//
// The look is the apps' layout and proportions, in Inter, with plain line icons. No logos and no real accounts:
// names, handles, communities and copy are invented.

import { random } from '@kinetographdev/core';
import { measure, type FaceKey } from './look.js';
import type { Layout } from './layouts.js';
import type { Page, Run } from './pages.js';

const KEY = '\u0000';

// ---- palettes ----

interface Theme {
  bg: string;
  text: string;
  /** body text where it is softer than titles (the forum) */
  body: string;
  grey: string;
  line: string;
  link: string;
  /** buttons and pills */
  pill: string;
  accent: string;
}

const X_DARK: Theme = { bg: '#000000', text: '#e7e9ea', body: '#e7e9ea', grey: '#71767b', line: '#2f3336', link: '#1d9bf0', pill: '#16181c', accent: '#1d9bf0' };
const X_LIGHT: Theme = { bg: '#ffffff', text: '#0f1419', body: '#0f1419', grey: '#536471', line: '#eff3f4', link: '#1d9bf0', pill: '#f7f9f9', accent: '#1d9bf0' };
const R_DARK: Theme = { bg: '#0e1113', text: '#eef1f3', body: '#c8d1d5', grey: '#8ba2ad', line: '#33464c', link: '#b18cfe', pill: '#1f292d', accent: '#648efc' };
const R_LIGHT: Theme = { bg: '#ffffff', text: '#0f1a1c', body: '#2a3c42', grey: '#5c6c74', line: '#d1dbdf', link: '#6a5cff', pill: '#e5ebee', accent: '#2a5bd7' };

// ---- copy ----

const NAMES = ['Mira Castellanos', 'Jonah Pike', 'Theo Varga', 'Ama Boateng', 'Rhea Kapoor', 'Sven Holm', 'Kit Okonkwo', 'Lena Duarte', 'Oskar Brandt', 'Yui Tanaka'];
const HANDLES = ['mirac', 'jonahpike_', 'theovarga', 'ama_builds', 'rheakapoor', 'svenholm', 'kit_ok', 'lenaduarte', 'obrandt', 'yuitanaka_'];
const USERS = ['quiet_lamp_42', 'velvet-otter', 'Solid-Plum4471', 'notadesigner', 'tabs_over_spaces', 'mossy_keyboard', 'Brave-Kettle9133', 'late_night_diff', 'paper_crane_7', 'Odd-Turnip2210'];
const COMMUNITIES = ['r/WebDev', 'r/Design', 'r/SideProjects', 'r/Productivity', 'r/AskTech', 'r/Frontend', 'r/Startups', 'r/NoStupidQuestions'];
const FLAIRS: [string, string][] = [['Discussion', '#8bb05a'], ['Question', '#e8a33d'], ['Showcase', '#5aa0d8'], ['Help', '#d86a5a'], ['Workflow', '#9b7fd4']];
const TIMES = ['2m', '6m', '15m', '38m', '1h', '3h', '10h', '22h'];
const AVATARS = ['#f2994a', '#56ccf2', '#6fcf97', '#bb6bd9', '#eb5757', '#f2c94c', '#2d9cdb', '#9b51e0'];
const LINKS = ['example.dev/notes', 'blog.example.com/2025/why', 'docs.example.org/guide', 'example.app'];
const TITLES = [
  `What ${KEY} setup are you all using?`,
  `Is ${KEY} actually worth it in 2025?`,
  `I finally tried ${KEY} and here is what happened`,
  `Unpopular opinion: ${KEY} is overrated`,
  `How do you explain ${KEY} to your manager?`,
  `${KEY} broke our whole release, ask me anything`,
];
const SAY = [
  'honestly did not expect this to work as well as it did.',
  'we tried this last quarter and the numbers did not move at all.',
  'the docs say one thing and the code does another.',
  'is anyone else seeing this or is it just me?',
  'took me three evenings to figure out, writing it down so you do not have to.',
  'the second half of the thread is where it gets interesting.',
  'not saying it is bad, just saying read the fine print.',
  'this is the kind of thing that only shows up at scale.',
  'my team argued about this for an hour on Friday.',
  'source: spent the weekend on it.',
  'it works until it does not, and then it really does not.',
  'the old way was slower but at least you knew why.',
  'we shipped it anyway. it was fine. mostly.',
  'curious what other people landed on here.',
  'every guide online skips the one step that matters.',
  'the replies on this are better than the post.',
];

// ---- icons (24-unit boxes, drawn as strokes) ----

const ICONS = {
  reply: 'M4.5 11.5a7.5 7 0 0 1 7.5-7h.5a7.5 7 0 0 1 0 14H10l-5 3.5v-4.6a7 7 0 0 1-.5-5.9',
  repost: 'M17 7H6.5A2.5 2.5 0 0 0 4 9.5V12 M14 4l3 3-3 3 M7 17h10.5a2.5 2.5 0 0 0 2.5-2.5V12 M10 20l-3-3 3-3',
  heart: 'M12 20s-7.5-4.6-9-9.4A4.7 4.7 0 0 1 12 7a4.7 4.7 0 0 1 9 3.6C19.5 15.4 12 20 12 20z',
  views: 'M5 20v-7 M10 20V6 M15 20v-9 M20 20v-4',
  bookmark: 'M6.5 3.5h11v17l-5.5-4-5.5 4z',
  share: 'M12 3.5v11 M7.5 8L12 3.5 16.5 8 M4.5 14v4.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V14',
  more: 'M5 12h.01 M12 12h.01 M19 12h.01',
  up: 'M12 3.5l7.5 8.5H15v8H9v-8H4.5z',
  down: 'M12 20.5l7.5-8.5H15V4H9v8H4.5z',
  comment: 'M12 4a8 8 0 1 1-3.7 15.1L4 20l1-4.1A8 8 0 0 1 12 4z',
  award: 'M12 3a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11z M8.6 13.3L7.2 21l4.8-2.6 4.8 2.6-1.4-7.7',
  forward: 'M13.5 5l7 6.5-7 6.5v-4c-5 0-8 1.5-10 5 .5-5.5 3.5-9.5 10-10z',
  loop: 'M19.5 12a7.5 7.5 0 0 1-13.3 4.8 M4.5 12a7.5 7.5 0 0 1 13.3-4.8 M18 3.5v4h-4 M6 20.5v-4h4',
  back: 'M19 12H5 M11 6l-6 6 6 6',
  collapse: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z M8 12h8',
  check: 'M7.5 12.5l3 3 6-6.5',
} as const;
type Icon = keyof typeof ICONS;

/** A scalloped badge outline, 24 units: sixteen points on two radii. */
const BADGE = (() => {
  const pts: string[] = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r = i % 2 ? 9.4 : 11;
    pts.push(`${(12 + Math.cos(a) * r).toFixed(2)} ${(12 + Math.sin(a) * r).toFixed(2)}`);
  }
  return `M${pts.join(' L')}Z`;
})();

// ---- building ----

type Built = Pick<Page, 'runs' | 'rules' | 'shapes'> & { paths: NonNullable<Page['paths']> };

/** A page in progress, in page pixels with y down; `shift` moves everything drawn so far. */
class Sheet implements Built {
  runs: Run[] = [];
  rules: Page['rules'] = [];
  shapes: Page['shapes'] = [];
  paths: NonNullable<Page['paths']> = [];
  text(text: string, x: number, y: number, face: FaceKey, size: number, color: string) {
    this.runs.push({ text, x, y, face, size, color });
    return measure(text, face, size);
  }
  rule(x: number, y: number, w: number, h: number, color: string) {
    this.rules.push({ x, y, w, h, color });
  }
  box(x: number, y: number, w: number, h: number, r: number, color: string, stroke?: string) {
    this.shapes.push({ x, y, w, h, r, color, stroke });
  }
  dot(cx: number, cy: number, d: number, color: string) {
    this.box(cx - d / 2, cy - d / 2, d, d, d / 2, color);
  }
  /** An icon `size` px across with its top left at (x, y). */
  icon(name: Icon, x: number, y: number, size: number, color: string, fill?: string) {
    this.paths.push({ d: ICONS[name], x, y, scale: size / 24, stroke: color, width: 2, fill });
  }
  badge(x: number, y: number, size: number, color: string, mark: string) {
    this.paths.push({ d: BADGE, x, y, scale: size / 24, fill: color });
    this.paths.push({ d: ICONS.check, x, y, scale: size / 24, stroke: mark, width: 2.4 });
  }
  /** Moves everything drawn since `from` (counts of runs, rules, shapes and paths) down by dy. */
  mark() {
    return [this.runs.length, this.rules.length, this.shapes.length, this.paths.length] as const;
  }
  shift(from: readonly [number, number, number, number], dy: number) {
    this.runs.slice(from[0]).forEach((r) => (r.y += dy));
    this.rules.slice(from[1]).forEach((r) => (r.y += dy));
    this.shapes.slice(from[2]).forEach((r) => (r.y += dy));
    this.paths.slice(from[3]).forEach((r) => (r.y += dy));
  }
}

const count = (r: number, big: boolean) => {
  const n = big ? Math.floor(Math.pow(r, 3) * 40000) : Math.floor(r * 60);
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : `${n}`;
};

/** Words of filler, sentence by sentence from the seed, lower case as people post. */
function words(seed: string) {
  let n = 0;
  let last = -1;
  let left: string[] = [];
  return () => {
    if (!left.length) {
      // never the same sentence twice running
      let i = Math.floor(random(`${seed}-say${n}`) * SAY.length);
      if (i === last) i = (i + 1 + Math.floor(random(`${seed}-again${n}`) * (SAY.length - 1))) % SAY.length;
      last = i;
      n++;
      const s = SAY[i];
      left = (n === 1 ? s[0].toUpperCase() + s.slice(1) : s).split(' ');
    }
    return left.shift()!;
  };
}

/** `count` lines of filler wrapped to w. */
function lines(seed: string, face: FaceKey, size: number, w: number, count: number): string[] {
  const next = words(seed);
  const out: string[] = [];
  let carry = next();
  for (let i = 0; i < count; i++) {
    let text = carry;
    for (;;) {
      carry = next();
      if (measure(`${text} ${carry}`, face, size) > w) break;
      text += ` ${carry}`;
    }
    out.push(text);
  }
  return out;
}

/**
 * The keyword's line inside a block of text: `pre` words, the keyword, then words to the column's end. Returns the
 * column's left edge (the keyword's left end is x 0) and the lines above and below it.
 */
function keyLine(seed: string, keyword: string, face: FaceKey, size: number, w: number, r: (k: string) => number) {
  const kw = measure(keyword, face, size);
  const sp = measure(' ', face, size);
  const next = words(`${seed}-pre`);
  let pre = '';
  const want = (w - kw) * (0.1 + r('pre') * 0.5);
  for (;;) {
    const word = next();
    const t = pre ? `${pre} ${word}` : word;
    if (measure(t, face, size) > want) break;
    pre = t;
  }
  const left = pre ? -(measure(pre, face, size) + sp) : 0;
  const room = w + left - kw - sp;
  const post = room > size * 2 ? lines(`${seed}-post`, face, size, room, 1)[0].toLowerCase() : '';
  return { left, pre, post, kw, sp };
}

interface Ctx {
  keyword: string;
  seed: string;
  r: (k: string) => number;
  pick: <T>(k: string, a: readonly T[]) => T;
  reach: { x: number; y: number };
}

/** Lays out posts above and below the keyword's post until the reach is covered. `post(i, top)` draws post i (0 is
 *  the keyword's) with its top at `top` and returns its height; the keyword's post is drawn first and placed so the
 *  keyword's baseline lands on y 0. */
function feed(s: Sheet, c: Ctx, post: (i: number, top: number) => { h: number; keyY?: number }) {
  const m = s.mark();
  const first = post(0, 0);
  s.shift(m, -(first.keyY ?? 0));
  let top = -(first.keyY ?? 0);
  let bottom = top + first.h;
  for (let i = 1; bottom < c.reach.y && i < 40; i++) bottom += post(i, bottom).h;
  for (let i = -1; top > -c.reach.y && i > -40; i--) {
    const mk = s.mark();
    const h = post(i, 0).h;
    s.shift(mk, top - h);
    top -= h;
  }
  return { top, bottom };
}

// ---- tweet ----

function tweetPage(c: Ctx, dark: boolean): Built & { tint: string; key: Page['key'] } {
  const t = dark ? X_DARK : X_LIGHT;
  const s = new Sheet();
  const S = 30; // text size; 2x the app's 15 px
  const step = S * 1.33;
  const w = 1000 + c.r('w') * 140;
  const k = keyLine(`${c.seed}-tweet`, c.keyword, 'sans', S, w, c.r);
  const L = k.left; // the text column's left edge
  const av = 80;
  const AX = L - av - 24; // avatars
  const right = L + w; // the column's right edge
  const thread = c.r('thread') < 0.45;

  const post = (i: number, top: number) => {
    const r = (q: string) => c.r(`t${i}-${q}`);
    const pick = <T,>(q: string, a: readonly T[]) => a[Math.floor(r(q) * a.length)];
    const who = Math.floor(r('who') * NAMES.length);
    const pad = 24;
    let y = top + pad;
    // author row
    const nameY = y + S * 0.95;
    s.dot(AX + av / 2, y + av / 2, av, pick('av', AVATARS));
    let x = L + s.text(NAMES[who], L, nameY, 'sansBold', S, t.text) + 8;
    if (r('ver') < 0.6) {
      s.badge(x, nameY - S * 0.84, S * 1.05, t.accent, '#ffffff');
      x += S * 1.05 + 8;
    }
    s.text(`@${HANDLES[who]} · ${pick('time', TIMES)}`, x, nameY, 'sans', S, t.grey);
    s.icon('more', right - S * 1.1, nameY - S * 0.75, S * 1.1, t.grey);
    y = nameY + step;
    // text: the keyword's post has its keyword line, the rest filler
    let keyY: number | undefined;
    const n = 1 + Math.floor(r('n') * 4);
    if (i === 0) {
      const above = Math.floor(r('above') * Math.min(2, n));
      lines(`${c.seed}-t0-a`, 'sans', S, w, above).forEach((l) => { s.text(l, L, y, 'sans', S, t.text); y += step; });
      keyY = y;
      if (k.pre) s.text(k.pre, L, y, 'sans', S, t.text);
      if (k.post) s.text(k.post, k.kw + k.sp, y, 'sans', S, t.text);
      y += step;
      lines(`${c.seed}-t0-b`, 'sans', S, w, Math.max(0, n - above - 1)).forEach((l) => { s.text(l, L, y, 'sans', S, t.text); y += step; });
    } else {
      lines(`${c.seed}-t${i}`, 'sans', S, w, n).forEach((l) => { s.text(l, L, y, 'sans', S, t.text); y += step; });
    }
    // a link, a blank line before it as people write them
    if (r('link') < 0.3) {
      y += step * 0.6;
      s.text(pick('url', LINKS), L, y, 'sans', S, t.link);
      y += step;
    }
    // a video card: a rounded frame, a soft picture, the time in a pill
    if (r('media') < 0.35) {
      const mh = w * (0.42 + r('mh') * 0.16);
      const my = y - S * 0.4;
      s.box(L, my, w, mh, 32, dark ? '#16181c' : '#f7f9f9', t.line);
      s.box(L + w * 0.18, my + mh * 0.28, w * 0.64, mh * 0.44, 18, dark ? '#202327' : '#e7ecf0');
      s.box(L + w * 0.3, my + mh * 0.45, w * 0.4, S * 0.5, S * 0.25, dark ? '#3a3f45' : '#c9d2d9');
      const pill = `${Math.floor(r('m') * 2)}:${String(Math.floor(r('sec') * 60)).padStart(2, '0')}`;
      const pw = measure(pill, 'sans', S * 0.85) + S * 0.8;
      s.box(L + 24, my + mh - 24 - S * 1.3, pw, S * 1.3, 10, 'rgba(0,0,0,0.75)');
      s.text(pill, L + 24 + S * 0.4, my + mh - 24 - S * 0.38, 'sans', S * 0.85, '#ffffff');
      y = my + mh + S * 1.2;
    }
    // actions: reply, repost, like, views, then bookmark and share at the right
    const ay = y + S * 0.45;
    const is = S * 1.25;
    const span = w - is * 3;
    (['reply', 'repost', 'heart', 'views'] as const).forEach((icon, j) => {
      const ix = L - 8 + (span * j) / 3.4;
      s.icon(icon, ix, ay - is * 0.75, is, t.grey);
      s.text(count(r(`c${j}`), j === 3), ix + is + 8, ay + S * 0.1, 'sans', S * 0.9, t.grey);
    });
    s.icon('bookmark', right - is * 2.6, ay - is * 0.75, is, t.grey);
    s.icon('share', right - is, ay - is * 0.75, is, t.grey);
    const h = ay + is * 0.6 + pad - top;
    // a thread joins the avatars; a feed rules between posts
    if (thread) s.rule(AX + av / 2 - 2, top + pad + av + 8, 4, h - av - 8, t.line);
    else s.rule(AX - 32, top + h, right - AX + 64, 2, t.line);
    return { h, keyY };
  };
  const { top, bottom } = feed(s, c, post);
  // the column's side rules
  s.rule(AX - 32, top, 2, bottom - top, t.line);
  s.rule(right + 32, top, 2, bottom - top, t.line);
  return { ...s, tint: t.bg, key: { w: k.kw, size: S, face: 'sans', color: '#0f1419' } };
}

// ---- reddit post ----

function redditPage(c: Ctx, dark: boolean): Built & { tint: string; key: Page['key'] } {
  const t = dark ? R_DARK : R_LIGHT;
  const s = new Sheet();
  const S = 28; // body size
  const TS = 50; // title size
  const step = S * 1.45;
  const w = 1100 + c.r('w') * 160;
  const inTitle = c.r('where') < 0.4;
  const template = c.pick('title', TITLES);

  // the title: wrapped, the keyword's line known
  const titleLines: string[][] = [[]];
  let lw = 0;
  for (const word of template.split(' ')) {
    const tw = measure(word.replace(KEY, c.keyword), 'sansBold', TS);
    const line = titleLines[titleLines.length - 1];
    if (line.length && lw + measure(' ', 'sansBold', TS) + tw > w) {
      titleLines.push([word]);
      lw = tw;
    } else {
      lw += (line.length ? measure(' ', 'sansBold', TS) : 0) + tw;
      line.push(word);
    }
  }

  // the column's left edge: from the title's keyword when it is there, else from the body's keyword line
  let L: number;
  let key: Page['key'];
  let bodyKey: ReturnType<typeof keyLine> | null = null;
  const tli = titleLines.findIndex((l) => l.some((x) => x.includes(KEY)));
  const tl = titleLines[tli];
  const ki = tl.findIndex((x) => x.includes(KEY));
  const [kpre, kpost] = tl[ki].split(KEY);
  const tBefore = (ki ? `${tl.slice(0, ki).join(' ')} ` : '') + kpre;
  const tAfter = kpost + (ki + 1 < tl.length ? ` ${tl.slice(ki + 1).join(' ')}` : '');
  if (inTitle) {
    L = -measure(tBefore, 'sansBold', TS);
    key = { w: measure(c.keyword, 'sansBold', TS), size: TS, face: 'sansBold', color: '#0f1a1c' };
  } else {
    bodyKey = keyLine(`${c.seed}-rb`, c.keyword, 'sans', S, w, c.r);
    L = bodyKey.left;
    key = { w: bodyKey.kw, size: S, face: 'sans', color: '#0f1a1c' };
  }

  let y = 0;
  // back button, community avatar, community and time, the poster
  const av = 64;
  s.dot(L - 90 + 32, y + av / 2, 64, t.pill);
  s.icon('back', L - 90 + 14, y + av / 2 - 18, 36, t.text);
  s.dot(L + av / 2, y + av / 2, av, c.pick('cav', AVATARS));
  const community = c.pick('community', COMMUNITIES);
  s.text(community[2], L + av / 2 - measure(community[2], 'sansBold', 30) / 2, y + av / 2 + 11, 'sansBold', 30, '#ffffff');
  const cx = L + av + 16;
  const cw = s.text(community, cx, y + 26, 'sansBold', 24, t.grey);
  s.text(` · ${c.pick('time', TIMES)} ago`, cx + cw, y + 26, 'sans', 24, t.grey);
  s.text(`u/${c.pick('user', USERS)}`, cx, y + 58, 'sans', 24, t.grey);
  y += av + TS * 1.2;

  // title
  let keyY = 0;
  titleLines.forEach((l, i) => {
    if (i === tli) {
      keyY = y;
      if (tBefore) s.text(tBefore, L, y, 'sansBold', TS, t.text);
      if (inTitle) {
        if (tAfter) s.text(tAfter, L + measure(tBefore, 'sansBold', TS) + measure(c.keyword, 'sansBold', TS), y, 'sansBold', TS, t.text);
      } else {
        s.text(l.join(' ').replace(KEY, c.keyword), L, y, 'sansBold', TS, t.text);
      }
    } else {
      s.text(l.join(' ').replace(KEY, c.keyword), L, y, 'sansBold', TS, t.text);
    }
    y += TS * 1.2;
  });
  // flair
  const [flair, fc] = c.pick('flair', FLAIRS);
  const fw = measure(flair, 'sans', 24) + 28;
  s.box(L, y - TS * 0.35, fw, 40, 20, fc);
  s.text(flair, L + 14, y - TS * 0.35 + 29, 'sans', 24, '#111111');
  y += 40 + step * 0.9;

  // body: paragraphs; the keyword's line in the first or second when it is not in the title
  const paras = 3 + Math.floor(c.r('paras') * 3);
  for (let p = 0; p < paras; p++) {
    const n = 1 + Math.floor(c.r(`pl${p}`) * 3);
    const text = lines(`${c.seed}-rp${p}`, 'sans', S, w, n);
    text.forEach((l, j) => {
      if (bodyKey && p === 1 && j === 0) {
        keyY = y;
        if (bodyKey.pre) s.text(bodyKey.pre, L, y, 'sans', S, t.body);
        if (bodyKey.post) s.text(bodyKey.post, bodyKey.kw + bodyKey.sp, y, 'sans', S, t.body);
      } else {
        s.text(l, L, y, 'sans', S, t.body);
      }
      y += step;
    });
    y += step * 0.7;
  }

  // the action pills: votes, comments, crosspost, share
  y += 10;
  const ph = 64;
  let x = L;
  const pill = (w2: number, draw: (x: number, mid: number) => void) => {
    s.box(x, y, w2, ph, ph / 2, t.pill);
    draw(x, y + ph / 2);
    x += w2 + 18;
  };
  const votes = count(c.r('votes'), false);
  pill(150 + measure(votes, 'sansBold', 26), (px, mid) => {
    s.icon('up', px + 16, mid - 18, 36, t.text);
    s.text(votes, px + 66, mid + 9, 'sansBold', 26, t.text);
    s.icon('down', px + 76 + measure(votes, 'sansBold', 26), mid - 18, 36, t.text);
  });
  const replies = count(c.r('replies'), false);
  pill(96 + measure(replies, 'sansBold', 26), (px, mid) => {
    s.icon('comment', px + 18, mid - 17, 34, t.text);
    s.text(replies, px + 64, mid + 9, 'sansBold', 26, t.text);
  });
  pill(ph * 1.3, (px, mid) => s.icon('loop', px + ph * 0.65 - 17, mid - 17, 34, t.text));
  pill(ph * 1.3, (px, mid) => s.icon('forward', px + ph * 0.65 - 17, mid - 17, 34, t.text));
  y += ph + 50;
  s.rule(L, y, w, 2, t.line);

  // the comments below, to fill the reach
  const m = s.mark();
  const below = commentsInto(s, { ...c, seed: `${c.seed}-rc` }, t, L, 2000, false).h;
  s.shift(m, y + 40);
  y += 40 + below;
  // everything so far was laid out from the top: move it so the keyword's baseline is at y 0
  s.shift([0, 0, 0, 0], -keyY);
  return { ...s, tint: t.bg, key };
}

// ---- comments ----

/**
 * A comment thread drawn from y 0 down at column L until `until` px: comments nested up to two deep, each with an
 * avatar, a name row, text, and an action row, a thread line from the avatar down to its replies. With `keyAt`, the
 * comment `keyAt` holds the keyword's line (its left end at x 0) and its baseline is returned.
 */
function commentsInto(s: Sheet, c: Ctx, t: Theme, L: number, until: number, withKey: boolean, keyAt = 0): { h: number; keyY?: number } {
  const S = 28;
  const step = S * 1.45;
  const av = 48;
  const indent = 64;
  let y = 0;
  let keyY: number | undefined;
  let depth = 0;
  for (let i = 0; y < until && i < 30; i++) {
    const r = (q: string) => c.r(`c${i}-${q}`);
    const x = L + depth * indent;
    const w = 1000 - depth * indent;
    // a reply hangs off its parent's line with a curve
    if (depth > 0) s.paths.push({ d: `M0 0 V${av * 0.2} Q0 ${av * 0.5} ${indent * 0.45} ${av * 0.5}`, x: x - indent + av / 2, y: y - 12, scale: 1, stroke: t.line, width: 2.5 });
    s.dot(x + av / 2, y + av / 2, av, AVATARS[Math.floor(r('av') * AVATARS.length)]);
    const tx = x + av + 16;
    let nx = tx + s.text(USERS[Math.floor(r('who') * USERS.length)], tx, y + 32, 'sansBold', 26, t.text);
    if (depth > 0 && r('op') < 0.3) nx += s.text(' OP', nx, y + 32, 'sansBold', 26, t.accent);
    s.text(` · ${TIMES[Math.floor(r('time') * TIMES.length)]} ago`, nx, y + 32, 'sans', 26, t.grey);
    let ly = y + 32 + step;
    const n = 1 + Math.floor(r('n') * 3);
    if (withKey && i === keyAt) {
      const k = keyLine(`${c.seed}-ck`, c.keyword, 'sans', S, w, c.r);
      // the key comment's text starts at the keyword line's left edge, which the caller placed at tx
      keyY = ly;
      if (k.pre) s.text(k.pre, tx, ly, 'sans', S, t.body);
      if (k.post) s.text(k.post, k.kw + k.sp, ly, 'sans', S, t.body);
      ly += step;
      lines(`${c.seed}-c${i}`, 'sans', S, w, n - 1).forEach((l) => { s.text(l, tx, ly, 'sans', S, t.body); ly += step; });
    } else {
      const text = lines(`${c.seed}-c${i}`, 'sans', S, w, n);
      text.forEach((l, j) => {
        // now and then a link at the end of a comment
        if (j === n - 1 && r('link') < 0.25) {
          const lw = s.text(`${l} `, tx, ly, 'sans', S, t.body);
          s.text('this thread', tx + lw, ly, 'sans', S, t.link);
          s.rule(tx + lw, ly + 5, measure('this thread', 'sans', S), 2, t.link);
        } else s.text(l, tx, ly, 'sans', S, t.body);
        ly += step;
      });
    }
    // actions: votes, reply, award, share, more
    const ay = ly - S * 0.25;
    const is = 34;
    let ax = tx - 6;
    s.icon('up', ax, ay - is * 0.7, is, t.grey);
    ax += is + 10;
    ax += s.text(count(r('v'), false), ax, ay + 4, 'sansBold', 24, t.grey) + 10;
    s.icon('down', ax, ay - is * 0.7, is, t.grey);
    ax += is + 34;
    for (const [icon, label] of [['comment', 'Reply'], ['award', 'Award'], ['forward', 'Share']] as const) {
      s.icon(icon, ax, ay - is * 0.7, is, t.grey);
      ax += is + 10 + s.text(label, ax + is + 10, ay + 4, 'sansBold', 24, t.grey) + 36;
    }
    s.icon('more', ax, ay - is * 0.7, is, t.grey);
    const h = ay + 40 - y;
    // the next comment: a reply (deeper) or a sibling (shallower)
    const nextDepth = depth < 2 && r('deeper') < 0.55 ? depth + 1 : r('up') < 0.5 ? 0 : Math.max(0, depth - 1);
    if (nextDepth > depth) {
      s.rule(x + av / 2 - 1.25, y + av + 8, 2.5, h - av + 8, t.line);
      s.icon('collapse', x + av / 2 - 15, y + av + 18, 30, t.grey);
    }
    y += h + 8;
    depth = nextDepth;
  }
  return { h: y, keyY };
}

function commentsPage(c: Ctx, dark: boolean): Built & { tint: string; key: Page['key'] } {
  const t = dark ? R_DARK : R_LIGHT;
  const s = new Sheet();
  // the key comment is a top-level one, so its text column starts at av + 16 from L; L is set so the keyword line's
  // left edge (keyLine's `left`) lands there
  const k = keyLine(`${c.seed}-ck`, c.keyword, 'sans', 28, 1000, c.r);
  const L = k.left - 48 - 16;
  const keyAt = 0;
  const { h, keyY = 0 } = commentsInto(s, c, t, L, c.reach.y * 2 + 400, true, keyAt);
  // comments above the key one, so the keyword can sit mid-frame
  const m = s.mark();
  const above = commentsInto(s, { ...c, seed: `${c.seed}-up` }, t, L, c.reach.y + 200, false).h;
  s.shift(m, -above);
  s.shift([0, 0, 0, 0], -keyY);
  void h;
  return { ...s, tint: t.bg, key: { w: k.kw, size: 28, face: 'sans', color: '#0f1a1c' } };
}

/** A social page for `layout`, dark or light from the seed. */
export function socialPage(layout: Layout, keyword: string, seed: string, reach: { x: number; y: number }): Page {
  const r = (k: string) => random(`${seed}-${k}`);
  const pick = <T,>(k: string, a: readonly T[]) => a[Math.floor(r(k) * a.length)];
  const c: Ctx = { keyword, seed, r, pick, reach };
  const dark = r('dark') < 0.65;
  const p = layout === 'tweet' ? tweetPage(c, dark) : layout === 'reddit' ? redditPage(c, dark) : commentsPage(c, dark);
  return { tint: p.tint, runs: p.runs, rules: p.rules, shapes: p.shapes, paths: p.paths, key: p.key, screen: true };
}
