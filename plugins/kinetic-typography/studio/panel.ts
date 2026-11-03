// The kinetic-typography panel for Kinetograph Studio's Props tab, for a `captionLookSchema` field (view `captions`).
//
// Framework-free DOM, after the caption tools' panels: style cards drawn in the style's own type; "Changing: Caption |
// Big text" to pick which text the font, case, size and colour controls change; layout cards; the moving style and
// finish; the motion keys with an In / Out switch, How far, Bounce, Flicker and Flash switches and the Shake and
// Soft knobs; the accent (a colour, or from the footage) and the shadow; and, on the preview, a Hook and a Caption pin to
// drag up and down. It imports only styles.ts (pure data), never the engine.
//
// The value is a look patch: `style` and the fields changed from it. Picking a style card replaces the value with
// `{ style }`, so the card means the style as it ships; every control after that writes one field over it.

import { ABOUT, FINISHES, FONTS, FONT_NAMES, INS, LAYOUTS, MARKS, OUTS, STYLE_NAMES, TREATMENTS, resolveLook } from '../src/styles.js';
import type { CaptionLook, FontInfo, Layout, LookPatch, StyleName, TextLook } from '../src/styles.js';
import { CSS } from './style.js';

export interface PanelPreview {
  overlay: HTMLElement;
  width: number;
  height: number;
  frame: number;
}

export interface PanelContext {
  value: unknown;
  schema: Record<string, unknown>;
  path: string[];
  onChange(value: unknown): void;
  preview?: PanelPreview;
}

type Json = Record<string, any>;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round = (v: number, step: number) => Math.round(v / step) * step;
const fillRange = (r: HTMLInputElement) => {
  const min = Number(r.min);
  const span = Number(r.max) - min || 1;
  r.style.setProperty('--fill', `${clamp(((Number(r.value) - min) / span) * 100, 0, 100).toFixed(1)}%`);
};

// the styles' fonts, for the cards: one stylesheet link a family, so one that fails leaves the rest
let fontsLinked = false;
function linkFonts() {
  if (fontsLinked || typeof document === 'undefined') return;
  fontsLinked = true;
  for (const [name, f] of Object.entries(FONTS) as [string, FontInfo][]) {
    if (f.files) {
      const style = document.createElement('style');
      style.textContent = f.files.map((file) => `@font-face { font-family: '${name}'; src: url('${file.url}') format('woff2'); font-weight: ${file.weight}; font-display: swap; }`).join('\n');
      style.dataset.kgKt = name;
      document.head.append(style);
      continue;
    }
    const axes = f.italic ? [...f.weights.map((w) => `0,${w}`), ...f.weights.map((w) => `1,${w}`)].join(';') : f.weights.join(';');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = f.css ?? `https://fonts.googleapis.com/css2?family=${name.replace(/ /g, '+')}:${f.italic ? 'ital,wght' : 'wght'}@${axes}&display=swap`;
    link.dataset.kgKt = name;
    document.head.append(link);
  }
}

const cased = (s: string, c: TextLook['case']) => (c === 'upper' ? s.toUpperCase() : c === 'lower' ? s.toLowerCase() : s);
const fontCss = (t: TextLook) => `font-family: '${t.font}', system-ui, sans-serif; font-weight: ${t.weight}; font-style: ${t.italic ? 'italic' : 'normal'}; letter-spacing: ${t.tracking}em;`;
const accentOf = (l: CaptionLook) => (l.accent === 'footage' ? '#e2552b' : l.accent);
const colourOf = (l: CaptionLook, c: string) => (c === 'accent' ? accentOf(l) : c);

/** A style card's tile: "keep / watching / this" in the look's type, dressed by its treatment and finish. */
function tile(l: CaptionLook): string {
  const big = colourOf(l, l.big.color);
  const acc = accentOf(l);
  const a = l.layout === 'left' || l.layout === 'beside' ? 'flex-start' : 'center';
  let deco = '';
  if (l.treatment === 'highlight' || l.treatment === 'box-first') deco = `background:${acc};`;
  else if (l.treatment === 'select') deco = 'background:rgba(46,120,255,0.6);';
  else if (l.treatment === 'underline') deco = `box-shadow: inset 0 -3px 0 ${acc};`;
  let paint = `color:${big};`;
  if (l.finish === 'shine') paint = `color:transparent;background-image:linear-gradient(105deg,#bbb 30%,#fff 50%,#bbb 70%);-webkit-background-clip:text;background-clip:text;`;
  if (l.finish === 'glow') paint += `text-shadow:0 0 4px ${big},0 0 10px ${big}99;`;
  if (l.blend === 'difference') paint += 'mix-blend-mode:difference;';
  const small = (text: string, after = false) =>
    `<span class="s${after ? ' after' : ''}" style="${fontCss(l.caption)}color:${colourOf(l, l.caption.color)};">${cased(text, l.caption.case)}</span>`;
  const word = cased('watching', l.big.case);
  const bigSpan = `<span class="b" style="${fontCss(l.big)}${deco}${paint}${l.treatment === 'typewriter' ? 'border-right:2px solid #fff;' : ''}">${word}</span>`;
  const dot = l.dot ? `<span style="position:absolute;right:16%;top:16%;width:5px;height:5px;border-radius:50%;background:${acc};box-shadow:0 0 5px ${acc}"></span>` : '';
  const after = a === 'center' && l.layout !== 'centre' ? 'flex-end' : a;
  const body = l.layout === 'one-line' ? `<span style="align-self:center">${small('keep')} ${bigSpan}</span>` : `${small('keep')}${bigSpan}${small('this', true)}`;
  return `<div class="kg-kt-tile"${l.blend === 'difference' ? ' data-split' : ''} style="--a:${a};--after:${after}">${dot}${body}</div>`;
}

/** A layout's schematic: small words as thin bars, the big word as a thick one, a figure where the subject is. */
function layoutThumb(name: Layout): string {
  const bar = (x: number, y: number, w: number, h: number, o = 0.9) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1" fill="currentColor" opacity="${o}"/>`;
  const person = (cx: number) => `<circle cx="${cx}" cy="22" r="6" fill="currentColor" opacity="0.18"/><path d="M${cx - 12} 52 Q${cx} 26 ${cx + 12} 52Z" fill="currentColor" opacity="0.18"/>`;
  const shapes: Record<Layout, string> = {
    over: person(20) + bar(15, 9, 10, 2.5) + bar(6, 13, 28, 6) + bar(24, 21, 10, 2.5),
    centre: person(20) + bar(15, 20, 10, 2.5) + bar(6, 24, 28, 6) + bar(15, 32, 10, 2.5),
    left: person(26) + bar(4, 10, 10, 2.5) + bar(4, 14, 22, 6) + bar(4, 22, 10, 2.5),
    beside: person(29) + bar(3, 17, 9, 2.5) + bar(3, 21, 16, 5) + bar(3, 28, 12, 2.5),
    'one-line': person(20) + bar(5, 34, 7, 3) + bar(14, 33, 14, 4.5) + bar(30, 34, 6, 3),
    plain: person(20) + bar(9, 40, 22, 3),
  };
  return `<svg viewBox="0 0 40 52" aria-hidden="true">${shapes[name]}</svg>`;
}

const LABEL: Record<string, string> = {
  rise: 'Rise', fall: 'Fall', left: 'From left', right: 'From right', focus: 'Focus', fade: 'Fade', instant: 'Instant', pop: 'Pop',
  'box-first': 'Box first', typewriter: 'Typewriter', cut: 'Cut', blur: 'Blur away',
};
const OUT_LABEL: Record<string, string> = { cut: 'Cut', fade: 'Fade', rise: 'Rise away', fall: 'Fall away', left: 'To the left', right: 'To the right', blur: 'Blur away' };
const TREAT_LABEL: Record<string, string> = { simple: 'Simple', 'box-first': 'Box first', typewriter: 'Typewriter', select: 'Select', highlight: 'Highlight', underline: 'Underline' };

export function mount(host: HTMLElement, initial: PanelContext): { update(ctx: PanelContext): void; unmount(): void } {
  linkFonts();
  let ctx = initial;
  let editing: 'caption' | 'big' = 'big';
  let motion: 'in' | 'out' = 'in';
  const value = (): Json => (ctx.value && typeof ctx.value === 'object' ? (ctx.value as Json) : {});
  const look = (): CaptionLook => resolveLook(value() as LookPatch);
  const set = (next: Json) => {
    ctx = { ...ctx, value: next };
    sync();
    ctx.onChange(next);
  };
  const patch = (p: Json) => set({ ...value(), ...p });
  const patchText = (p: Partial<TextLook>) => patch({ [editing]: { ...(value()[editing] ?? {}), ...p } });

  const root = el('div', 'kg-kt');
  root.append(el('style', undefined, CSS));
  const refresh: (() => void)[] = [];
  const section = (title: string, extra?: HTMLElement) => {
    const s = el('div', 'kg-kt-sec');
    const h = el('div', 'kg-kt-h');
    h.append(el('span', undefined, title));
    if (extra) h.append(extra);
    s.append(h);
    root.append(s);
    return s;
  };
  const seg = <T extends string>(options: readonly T[], label: (o: T) => string, get: () => T, put: (o: T) => void, full = false) => {
    const box = el('div', `kg-kt-seg${full ? ' full' : ''}`);
    const of = new Map<T, HTMLButtonElement>();
    for (const o of options) {
      const b = el('button', undefined, label(o));
      b.type = 'button';
      b.dataset.value = o;
      b.addEventListener('click', () => put(o));
      box.append(b);
      of.set(o, b);
    }
    refresh.push(() => { const v = get(); for (const [o, b] of of) b.setAttribute('aria-pressed', String(o === v)); });
    return box;
  };
  const slider = (label: string, lo: number, hi: number, step: number, get: () => number, put: (v: number) => void, fmt: (v: number) => string = String) => {
    const row = el('div', 'kg-kt-row');
    const input = el('input');
    input.type = 'range';
    input.min = String(lo); input.max = String(hi); input.step = String(step);
    input.id = `kg-kt-${label.replace(/\W+/g, '-').toLowerCase()}`;
    const lab = el('label', undefined, label);
    lab.htmlFor = input.id;
    const num = el('span', 'kg-kt-num');
    input.addEventListener('input', () => put(Number(input.value)));
    row.append(lab, input, num);
    refresh.push(() => { const v = get(); input.value = String(v); fillRange(input); num.textContent = fmt(v); });
    return row;
  };
  const toggle = (label: string, get: () => boolean, put: (v: boolean) => void) => {
    const b = el('button', 'kg-kt-switch');
    b.type = 'button';
    b.setAttribute('role', 'switch');
    b.append(el('i'), el('span', undefined, label));
    b.addEventListener('click', () => put(!get()));
    refresh.push(() => b.setAttribute('aria-checked', String(get())));
    return b;
  };
  /** A knob: drag up or down (or the arrow keys, or the wheel) to turn it, 0..100. */
  const knob = (label: string, get: () => number, put: (v: number) => void) => {
    const k = el('div', 'kg-kt-knob');
    k.tabIndex = 0;
    k.setAttribute('role', 'slider');
    k.setAttribute('aria-label', label);
    k.setAttribute('aria-valuemin', '0');
    k.setAttribute('aria-valuemax', '100');
    const dial = el('b');
    const text = el('span');
    k.append(dial, text);
    k.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      k.setPointerCapture(e.pointerId);
      const y0 = e.clientY, v0 = get();
      const move = (m: PointerEvent) => put(clamp(Math.round(v0 + (y0 - m.clientY) * 0.6), 0, 100));
      const up = () => { k.removeEventListener('pointermove', move); k.removeEventListener('pointerup', up); k.removeEventListener('pointercancel', up); };
      k.addEventListener('pointermove', move);
      k.addEventListener('pointerup', up);
      k.addEventListener('pointercancel', up);
    });
    k.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 5 : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? -5 : 0;
      if (d) { e.preventDefault(); put(clamp(get() + d, 0, 100)); }
    });
    k.addEventListener('wheel', (e) => { e.preventDefault(); put(clamp(get() - Math.sign(e.deltaY) * 5, 0, 100)); }, { passive: false });
    refresh.push(() => {
      const v = get();
      dial.style.setProperty('--turn', `${-135 + v * 2.7}deg`);
      text.textContent = `${label} ${v}`;
      k.setAttribute('aria-valuenow', String(v));
    });
    return k;
  };

  // ---- styles ----
  const styles = el('div', 'kg-kt-styles');
  const styleOf = new Map<StyleName, HTMLButtonElement>();
  for (const name of STYLE_NAMES) {
    const b = el('button', 'kg-kt-style');
    b.type = 'button';
    b.dataset.style = name;
    b.title = ABOUT[name];
    b.innerHTML = `${tile(resolveLook({ style: name }))}<span class="kg-kt-name">${name.replace(/-/g, ' ')}</span>`;
    b.addEventListener('click', () => set({ style: name }));
    styles.append(b);
    styleOf.set(name, b);
  }
  const about = el('div', 'kg-kt-hint');
  const styleSec = section('Style');
  styleSec.append(styles, about);
  refresh.push(() => {
    const v = value().style as StyleName | undefined;
    for (const [n, b] of styleOf) b.setAttribute('aria-pressed', String(n === v));
    const changed = Object.keys(value()).filter((k) => k !== 'style');
    about.textContent = v ? `${ABOUT[v]}${changed.length ? ` Changed: ${changed.join(', ')}.` : ''}` : 'No style: the base look. Pick one to start from.';
  });

  // ---- text: caption or big ----
  const changing = el('div', 'kg-kt-changing');
  const changingText = el('span');
  changing.append(changingText, seg(['caption', 'big'] as const, (o) => (o === 'big' ? 'Big text' : 'Caption'), () => editing, (o) => { editing = o; sync(); }));
  refresh.push(() => { changingText.innerHTML = `Changing: <strong>${editing === 'big' ? 'the big word' : 'the captions'}</strong>`; });
  const textSec = section('Text');
  textSec.append(changing);
  const fontRow = el('div', 'kg-kt-grid2');
  const fontSel = el('select');
  fontSel.setAttribute('aria-label', 'Font');
  for (const f of FONT_NAMES) { const o = el('option', undefined, f); o.value = f; fontSel.append(o); }
  fontSel.addEventListener('change', () => patchText({ font: fontSel.value as TextLook['font'] }));
  fontRow.append(fontSel, seg(['as-is', 'upper', 'lower'] as const, (o) => (o === 'as-is' ? 'Aa' : o === 'upper' ? 'AA' : 'aa'), () => look()[editing].case, (o) => patchText({ case: o }), true));
  refresh.push(() => { fontSel.value = look()[editing].font; });
  textSec.append(fontRow);
  textSec.append(slider('Weight', 100, 900, 100, () => look()[editing].weight, (v) => patchText({ weight: v })));
  textSec.append(slider('Size', 0.01, 8, 0.005, () => look()[editing].size, (v) => patchText({ size: v }), (v) => (editing === 'big' ? `${v.toFixed(1)}x` : v.toFixed(3))));
  textSec.append(slider('Tracking', -0.1, 0.3, 0.005, () => look()[editing].tracking, (v) => patchText({ tracking: round(v, 0.005) }), (v) => v.toFixed(3)));
  // the size slider's range depends on which text is changed
  refresh.push(() => {
    const r = textSec.querySelector<HTMLInputElement>('#kg-kt-size')!;
    const [lo, hi, step] = editing === 'big' ? [1, 8, 0.1] : [0.015, 0.1, 0.001];
    if (r.min !== String(lo)) { r.min = String(lo); r.max = String(hi); r.step = String(step); r.value = String(look()[editing].size); fillRange(r); }
  });
  const colours = el('div', 'kg-kt-swatches');
  const swatchOf: [string, HTMLButtonElement][] = [];
  for (const [name, c] of [['White', '#ffffff'], ['Accent', 'accent'], ['Black', '#111111']] as const) {
    const b = el('button', 'kg-kt-swatch');
    b.type = 'button';
    const dot = el('i');
    b.append(dot, el('span', undefined, name));
    b.addEventListener('click', () => patchText({ color: c }));
    colours.append(b);
    swatchOf.push([c, b]);
    refresh.push(() => { dot.style.background = c === 'accent' ? accentOf(look()) : c; });
  }
  const custom = el('label', 'kg-kt-swatch');
  const pick = el('input');
  pick.type = 'color';
  pick.addEventListener('input', () => patchText({ color: pick.value }));
  custom.append(pick, el('span', undefined, 'Other'));
  colours.append(custom);
  refresh.push(() => {
    const c = look()[editing].color;
    for (const [v, b] of swatchOf) b.setAttribute('aria-pressed', String(v === c));
    custom.setAttribute('aria-pressed', String(!swatchOf.some(([v]) => v === c)));
    pick.value = /^#[0-9a-f]{6}$/i.test(c) ? c : colourOf(look(), c);
  });
  textSec.append(el('div', 'kg-kt-lab', 'Colour'), colours, toggle('Italic', () => look()[editing].italic, (v) => patchText({ italic: v })));

  // ---- layout ----
  const layouts = el('div', 'kg-kt-cards');
  const layOf = new Map<Layout, HTMLButtonElement>();
  for (const name of LAYOUTS) {
    const b = el('button', 'kg-kt-card');
    b.type = 'button';
    b.dataset.layout = name;
    b.innerHTML = `${layoutThumb(name)}<span>${name.replace('-', ' ')}</span>`;
    b.addEventListener('click', () => patch({ layout: name }));
    layouts.append(b);
    layOf.set(name, b);
  }
  const laySec = section('Layout');
  laySec.append(layouts);
  const sideRow = el('div', 'kg-kt-grid2');
  sideRow.append(el('span', 'kg-kt-lab', 'Open side'), seg(['auto', 'left', 'right'] as const, (o) => o[0]!.toUpperCase() + o.slice(1), () => look().side, (o) => patch({ side: o }), true));
  laySec.append(sideRow);
  laySec.append(slider('Big fit', 0.1, 1, 0.01, () => look().fit, (v) => patch({ fit: v }), (v) => `${Math.round(v * 100)}%`));
  laySec.append(slider('Hook at', 0, 1, 0.01, () => look().y, (v) => patch({ y: v }), (v) => `${Math.round(v * 100)}%`));
  laySec.append(slider('Caption at', 0, 1, 0.01, () => look().captionY, (v) => patch({ captionY: v }), (v) => `${Math.round(v * 100)}%`));
  refresh.push(() => { for (const [n, b] of layOf) b.setAttribute('aria-pressed', String(n === look().layout)); sideRow.style.display = look().layout === 'beside' ? '' : 'none'; });

  // ---- look: moving style, finish, marks ----
  const treat = el('div', 'kg-kt-keys');
  treat.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
  const treatOf = new Map<string, HTMLButtonElement>();
  for (const t of TREATMENTS) {
    const b = el('button', 'kg-kt-key', TREAT_LABEL[t]);
    b.type = 'button';
    b.dataset.treatment = t;
    b.addEventListener('click', () => patch({ treatment: t }));
    treat.append(b);
    treatOf.set(t, b);
  }
  refresh.push(() => { for (const [t, b] of treatOf) b.setAttribute('aria-pressed', String(t === look().treatment)); });
  const lookSec = section('Moving style');
  lookSec.append(treat);
  const finRow = el('div', 'kg-kt-grid2');
  finRow.append(el('span', 'kg-kt-lab', 'Finish'), seg(FINISHES, (o) => o[0]!.toUpperCase() + o.slice(1), () => look().finish, (o) => patch({ finish: o }), true));
  const markRow = el('div', 'kg-kt-grid2');
  markRow.append(el('span', 'kg-kt-lab', 'Caption mark'), seg(MARKS, (o) => (o === 'none' ? 'None' : o === 'weight' ? 'Bold' : o === 'colour' ? 'Colour' : 'Box'), () => look().mark, (o) => patch({ mark: o }), true));
  const extras = el('div', 'kg-kt-switches');
  extras.append(
    toggle('Difference', () => look().blend === 'difference', (v) => patch({ blend: v ? 'difference' : 'normal' })),
    toggle('Dot', () => look().dot, (v) => patch({ dot: v })),
    toggle('Whole line', () => look().reveal === 'line', (v) => patch({ reveal: v ? 'line' : 'word' })),
  );
  lookSec.append(finRow, markRow, extras);

  // ---- motion ----
  const inOut = seg(['in', 'out'] as const, (o) => (o === 'in' ? 'In' : 'Out'), () => motion, (o) => { motion = o; build(); sync(); });
  const motionSec = section('Motion');
  const motionHead = el('div', 'kg-kt-grid2');
  const motionHint = el('span', 'kg-kt-lab');
  motionHint.style.textAlign = 'right';
  motionHead.append(inOut, motionHint);
  motionSec.append(motionHead);
  const keys = el('div', 'kg-kt-keys');
  motionSec.append(keys);
  let keyOf = new Map<string, HTMLButtonElement>();
  const build = () => {
    keys.replaceChildren();
    keyOf = new Map();
    const list = motion === 'in' ? INS : OUTS;
    for (const m of list) {
      const b = el('button', 'kg-kt-key', motion === 'in' ? LABEL[m] : OUT_LABEL[m]);
      b.type = 'button';
      b.dataset.motion = m;
      b.addEventListener('click', () => patch({ [motion]: m }));
      keys.append(b);
      keyOf.set(m, b);
    }
  };
  build();
  refresh.push(() => {
    motionHint.textContent = motion === 'in' ? 'How words arrive' : 'How lines leave';
    const cur = motion === 'in' ? look().in : look().out;
    for (const [m, b] of keyOf) b.setAttribute('aria-pressed', String(m === cur));
    bigInRow.style.display = motion === 'in' ? '' : 'none';
  });
  const bigInRow = el('div', 'kg-kt-grid2');
  const bigSel = el('select');
  bigSel.setAttribute('aria-label', 'Big word arrives');
  for (const m of ['same', 'vary', ...INS]) { const o = el('option', undefined, m === 'same' ? 'Same as the words' : m === 'vary' ? 'A new way each line' : LABEL[m]); o.value = m; bigSel.append(o); }
  bigSel.addEventListener('change', () => patch({ bigIn: bigSel.value }));
  refresh.push(() => { bigSel.value = look().bigIn; });
  bigInRow.append(el('span', 'kg-kt-lab', 'Big word'), bigSel);
  motionSec.append(bigInRow);
  motionSec.append(slider('How far', 0, 3, 0.05, () => look().far, (v) => patch({ far: round(v, 0.05) }), (v) => `${Math.round(v * 100)}%`));
  const sw = el('div', 'kg-kt-switches');
  sw.append(
    toggle('Bounce', () => look().bounce, (v) => patch({ bounce: v })),
    toggle('Flicker', () => look().flicker, (v) => patch({ flicker: v })),
    toggle('Flash', () => look().flash, (v) => patch({ flash: v })),
  );
  motionSec.append(sw);
  const feel = el('div', 'kg-kt-feel');
  feel.append(el('span', 'kg-kt-lab', 'Feel'), knob('Shake', () => look().shake, (v) => patch({ shake: v })), knob('Soft', () => look().soft, (v) => patch({ soft: v })), toggle('Steps', () => look().steps, (v) => patch({ steps: v })));
  motionSec.append(feel);

  // ---- colour and reading ----
  const colSec = section('Accent and reading');
  const accRow = el('div', 'kg-kt-swatches');
  const accLabel = el('label', 'kg-kt-swatch');
  const accPick = el('input');
  accPick.type = 'color';
  accPick.addEventListener('input', () => patch({ accent: accPick.value }));
  accLabel.append(accPick, el('span', undefined, 'Accent'));
  accRow.append(accLabel, toggle('From footage', () => look().accent === 'footage', (v) => patch({ accent: v ? 'footage' : accPick.value })));
  refresh.push(() => { accPick.value = accentOf(look()); });
  colSec.append(accRow);
  colSec.append(slider('Shadow', 0, 1, 0.05, () => look().shadow, (v) => patch({ shadow: round(v, 0.05) }), (v) => v.toFixed(2)));
  const read = el('div', 'kg-kt-switches');
  read.append(toggle('Fix what does not read', () => look().readable, (v) => patch({ readable: v })));
  colSec.append(read, el('div', 'kg-kt-hint', 'From footage and the reading fix use the Captions footage prop: the accent is the strongest colour in the clip; the shadow deepens, with a soft scrim, where the picture under a line is bright.'));

  host.append(root);

  // ---- the pins on the preview: drag the Hook and Caption lines up and down ----
  let preview = initial.preview;
  let pins: HTMLElement[] = [];
  const buildPins = () => {
    pins.forEach((p) => p.remove());
    pins = [];
    if (!preview) return;
    const p = preview;
    // the pins sit in Studio's overlay, outside the panel, so they bring their styles
    const style = el('style', undefined, CSS);
    p.overlay.append(style);
    pins.push(style);
    const scale = () => { const r = p.overlay.getBoundingClientRect(); return r.height > 0 ? r.height / p.height : 1; };
    for (const [field, label] of [['y', 'Hook'], ['captionY', 'Caption']] as const) {
      const pin = el('div', 'kg-kt-pin');
      pin.dataset.field = field;
      const tag = el('span', undefined, label);
      pin.append(tag);
      tag.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        tag.setPointerCapture(e.pointerId);
        const y0 = e.clientY, v0 = look()[field];
        const move = (m: PointerEvent) => patch({ [field]: round(clamp(v0 + (m.clientY - y0) / scale() / p.height, 0.02, 0.98), 0.005) });
        const up = () => { tag.removeEventListener('pointermove', move); tag.removeEventListener('pointerup', up); };
        tag.addEventListener('pointermove', move);
        tag.addEventListener('pointerup', up);
      });
      p.overlay.append(pin);
      pins.push(pin);
    }
  };
  buildPins();
  const placePins = () => {
    if (!preview) return;
    for (const pin of pins) {
      if (!pin.dataset.field) continue;
      const f = pin.dataset.field as 'y' | 'captionY';
      const at = f === 'y' && look().layout === 'centre' ? 0.5 : look()[f];
      pin.style.top = `${(at * preview.height).toFixed(1)}px`;
      pin.style.display = look().layout === 'beside' && f === 'captionY' ? 'none' : '';
    }
  };

  function sync() {
    refresh.forEach((r) => r());
    placePins();
  }
  sync();
  return {
    update(next: PanelContext) {
      const moved = next.preview?.overlay !== preview?.overlay;
      ctx = next;
      if (moved) { preview = next.preview; buildPins(); }
      sync();
    },
    unmount() {
      pins.forEach((p) => p.remove());
      root.remove();
    },
  };
}

/** One line for the folded card in Studio: the style and how many fields change it. */
export function summary(value: unknown): string {
  if (typeof value !== 'object' || value === null) return '';
  const v = value as Json;
  const changed = Object.keys(v).filter((k) => k !== 'style').length;
  return [typeof v.style === 'string' ? v.style : 'base look', changed ? `${changed} change${changed === 1 ? '' : 's'}` : ''].filter(Boolean).join(', ');
}

