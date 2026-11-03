// The paper panel's scrapline view, for `scraplineLookSchema`: line cards with the stroke drawn, paper cards (and none),
// the line colour, and sliders for the offsets, the paper's boil, the seed and the matte threshold. `lineCards` is also
// the cut-out view's Line section. Framework-free DOM; imports nothing from src/, so the engine never reaches the
// browser. The defaults mirror src/scrapline.tsx and LINES, PAPERS in src/scrap.ts.

import { CSS } from './style.js';
import type { PanelContext } from './panel.js';

type Json = Record<string, any>;

export const LINES = ['marker', 'pencil', 'crayon', 'scribble', 'brush'] as const;
/** The papers' colours, for the swatches: the scan's average and its rim. */
const PAPERS: Record<string, [string, string]> = {
  white: ['#f3f1ea', '#fffefa'],
  kraft: ['#b58b5a', '#d9bd92'],
  binder: ['#f5f2e6', '#fffdf4'],
  cardboard: ['#a67a4d', '#c9a577'],
  newsprint: ['#e9e6df', '#f4f2ec'],
};

/** Field, label, [min, max, step] (the schema's bounds win), default. */
type Slide = [string, string, [number, number, number], number];
const SLIDES: Slide[] = [
  ['offset', 'Line offset', [0, 120, 1], 14],
  ['paperMargin', 'Paper margin', [0, 160, 1], 34],
  ['paperBoil', 'Paper boil (/s)', [0, 24, 1], 6],
  ['seed', 'Seed', [0, 50, 1], 0],
  ['threshold', 'Threshold', [0, 255, 1], 128],
];

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const hex = (v: unknown, dflt: string) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : dflt);
const fillRange = (r: HTMLInputElement) => {
  const min = Number(r.min);
  const span = Number(r.max) - min || 1;
  r.style.setProperty('--fill', `${clamp(((Number(r.value) - min) / span) * 100, 0, 100).toFixed(1)}%`);
};

/** A loop round a blob in the line's manner: one ribbon, passes side by side, dry gaps or a wide brush. */
function lineSwatch(line: string, color: string, paper: string | null): string {
  const loop = (spread: number, wob: number, seed: number) => {
    const pts: string[] = [];
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2.08 + seed;
      const r = 1 + spread + wob * Math.sin(a * 5 + seed * 3) * 0.06;
      pts.push(`${(35 + Math.cos(a) * 20 * r).toFixed(1)},${(27 + Math.sin(a) * 15 * r).toFixed(1)}`);
    }
    return `M${pts.join(' L')}`;
  };
  const path = (d: string, w: number, extra = '') => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`;
  const strokes =
    line === 'pencil' ? [path(loop(0, 1, 0), 1, 'opacity="0.8"'), path(loop(0.05, 1, 1), 0.8, 'opacity="0.7"'), path(loop(-0.04, 1, 2), 0.9, 'opacity="0.75"')].join('')
    : line === 'crayon' ? [path(loop(0, 1, 0), 2.6, 'stroke-dasharray="5 1 3 1" opacity="0.9"'), path(loop(0.06, 1, 1), 2, 'stroke-dasharray="2 1 6 1" opacity="0.8"')].join('')
    : line === 'scribble' ? [0, 1, 2].map((k) => path(loop((k - 1) * 0.1, 3, k * 1.7), 1)).join('')
    : line === 'brush' ? path(loop(0, 1, 0), 4.2, 'stroke-dasharray="30 1.5 12 1"')
    : path(loop(0, 1, 0), 2.2);
  const sheet = paper ? `<ellipse cx="35" cy="27" rx="31" ry="24" fill="${paper}"/>` : '';
  return `<svg viewBox="0 0 70 54" aria-hidden="true" style="width:100%;height:40px;display:block;background:#4c636b;border-radius:4px">${sheet}<ellipse cx="35" cy="27" rx="15" ry="11" fill="#e89a6a"/>${strokes}</svg>`;
}

/**
 * A row of line cards into `into`: the five styles, and "none" first when `none` is given. `get` reads the chosen line,
 * the colour and the paper behind it; `pick` writes a new one (undefined for none).
 */
export function lineCards(into: HTMLElement, none: boolean, get: () => { line?: string; color: string; paper: string | null }, pick: (line: string | undefined) => void): () => void {
  const cards = el('div', 'kg-paper-cards');
  const names = [...(none ? ['none'] : []), ...LINES];
  cards.style.gridTemplateColumns = `repeat(${names.length > 5 ? 3 : 5}, minmax(0, 1fr))`;
  const of = new Map<string, HTMLButtonElement>();
  for (const name of names) {
    const b = el('button', 'kg-paper-card');
    b.type = 'button';
    b.dataset.line = name;
    b.title = name === 'none' ? 'No line' : `A ${name} line`;
    b.addEventListener('click', () => pick(name === 'none' ? undefined : name));
    cards.append(b);
    of.set(name, b);
  }
  into.append(cards);
  return () => {
    const { line, color, paper } = get();
    for (const [name, b] of of) {
      b.setAttribute('aria-pressed', String((line ?? (none ? 'none' : 'marker')) === name));
      b.innerHTML = `${name === 'none' ? lineSwatch('marker', 'transparent', paper) : lineSwatch(name, color, paper)}<span class="kg-paper-name">${name}</span>`;
    }
  };
}

export function mountScrapline(host: HTMLElement, initial: PanelContext): { update(ctx: PanelContext): void; unmount(): void } {
  let ctx = initial;
  const value = (): Json => (ctx.value && typeof ctx.value === 'object' ? (ctx.value as Json) : {});
  const set = (next: Json) => {
    ctx = { ...ctx, value: next };
    sync();
    ctx.onChange(next);
  };
  const patch = (p: Json) => set({ ...value(), ...p });
  const fields = (): Json => (ctx.schema.properties as Json | undefined) ?? {};
  const color = () => hex(value().color, '#141414');

  const root = el('div', 'kg-paper');
  root.append(el('style', undefined, CSS));
  const section = (title: string) => {
    const s = el('div', 'kg-paper-sec');
    s.append(el('div', 'kg-paper-h', title));
    root.append(s);
    return s;
  };
  const refresh: (() => void)[] = [];

  // the line
  const lineSec = section('Line');
  refresh.push(lineCards(lineSec, false, () => ({ line: value().line, color: color(), paper: PAPERS[value().paper as string]?.[0] ?? null }), (line) => patch({ line })));
  const colorRow = el('div', 'kg-paper-colors');
  const w = el('label', 'kg-paper-color');
  const colorIn = el('input');
  colorIn.type = 'color';
  colorIn.dataset.field = 'color';
  colorIn.addEventListener('input', () => patch({ color: colorIn.value }));
  w.append(colorIn, el('span', undefined, 'Line colour'));
  colorRow.append(w);
  lineSec.append(colorRow);

  // the paper: none, or one of the scans
  const paperCards = el('div', 'kg-paper-cards');
  paperCards.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
  const paperOf = new Map<string, HTMLButtonElement>();
  for (const name of ['none', ...Object.keys(PAPERS)]) {
    const b = el('button', 'kg-paper-card');
    b.type = 'button';
    b.dataset.paper = name;
    b.title = name === 'none' ? 'No paper' : `${name} paper`;
    const sw = el('div', 'kg-paper-swatch');
    sw.style.height = '30px';
    const c = PAPERS[name];
    sw.style.background = c ? `linear-gradient(135deg, ${c[1]} 0 18%, ${c[0]} 18%)` : 'repeating-linear-gradient(45deg, transparent 0 6px, color-mix(in srgb, var(--foreground) 10%, transparent) 6px 7px)';
    b.append(sw, el('span', 'kg-paper-name', name));
    b.addEventListener('click', () => {
      const { paper: _p, ...rest } = value();
      set(name === 'none' ? rest : { ...rest, paper: name });
    });
    paperCards.append(b);
    paperOf.set(name, b);
  }
  section('Paper').append(paperCards);

  const tune = section('Tune');
  for (const [k, label, [lo, hi, step], dflt] of SLIDES) {
    const prop = fields()[k] as Json | undefined;
    const row = el('div', 'kg-paper-row');
    const lab = el('label', undefined, label);
    const input = el('input');
    input.type = 'range';
    input.min = String(prop?.minimum ?? lo);
    input.max = String(prop?.maximum ?? hi);
    input.step = String(step);
    input.dataset.field = k;
    input.id = `kg-paper-scrap-${k}`;
    lab.htmlFor = input.id;
    const num = el('span', 'kg-paper-num');
    input.addEventListener('input', () => patch({ [k]: Number(input.value) }));
    row.append(lab, input, num);
    tune.append(row);
    refresh.push(() => {
      const v = Number(value()[k] ?? dflt);
      input.value = String(v);
      fillRange(input);
      num.textContent = String(v);
    });
  }
  host.append(root);

  function sync() {
    colorIn.value = color();
    for (const [name, b] of paperOf) b.setAttribute('aria-pressed', String((value().paper ?? 'none') === name));
    refresh.forEach((r) => r());
  }
  sync();
  return {
    update(next: PanelContext) {
      ctx = next;
      sync();
    },
    unmount() {
      root.remove();
    },
  };
}
