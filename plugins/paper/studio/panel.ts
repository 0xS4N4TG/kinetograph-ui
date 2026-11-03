// Paper's panel for Kinetograph Studio's Props tab. Three views, by the field schema's `kinetographView`: a match cut's
// `look` (below), a cut-out's or fold-out's look (sheet.ts), and a scrapline's look (scrapline.ts).
//
// Framework-free DOM. The match cut view has preset cards with a drawn swatch, a page-layout picker with schematic thumbnails, sliders for the look's numbers, and (when Studio
// gives it `ctx.preview`) a draggable, resizable keyword box on the preview picture that writes `anchorY` (drag) and
// `keySize` (resize). It imports only pure modules (the preset table and the layout list), never the engine.
//
// Picking a preset replaces `look` with that preset's fields, so what is left out falls back to MatchCut's defaults,
// which is what the preset means on its own. Use it with a composition whose schema has `look: matchCutLookSchema`
// and no separate `preset` prop.

import { PRESETS } from '../presets/index.js';
import { LAYOUTS, PAGE_LAYOUTS } from '../src/layouts.js';
import type { Layout } from '../src/layouts.js';
import { CSS } from './style.js';
import { mountSheet } from './sheet.js';
import { mountScrapline } from './scrapline.js';

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
type Look = Record<string, any>;

// MatchCut's own defaults (DEFAULT_LOOK in src/match-cut.tsx), for sliders whose field is not set.
const DEFAULTS: Look = { cutsPerSecond: 10, zoom: 1.5, keySize: 0.075, anchorY: 0.5, blur: 7, streak: 14, crumple: 1, grain: 0.06, wander: 1, screen: 0, pixel: 6, curve: 0.05, highlight: '#f6e04a', tint: '#efede6' };
const RANGES: Record<string, [number, number, number]> = {
  cutsPerSecond: [1, 30, 1],
  zoom: [1, 4, 0.05],
  keySize: [0.02, 0.3, 0.005],
  anchorY: [0, 1, 0.01],
  blur: [0, 40, 1],
  streak: [0, 60, 1],
  crumple: [0, 3, 0.05],
  grain: [0, 0.5, 0.01],
  wander: [0, 1, 0.01],
  screen: [0, 1, 0.05],
  pixel: [2, 24, 1],
  curve: [0, 0.3, 0.01],
};
const FEEL: [string, string][] = [['cutsPerSecond', 'Cuts per second'], ['zoom', 'Push-in'], ['blur', 'Blur'], ['streak', 'Streak'], ['crumple', 'Crumple'], ['grain', 'Grain'], ['wander', 'Wander'], ['screen', 'Screen'], ['pixel', 'Screen pixel'], ['curve', 'Lens curve']];
const PLACE: [string, string][] = [['keySize', 'Keyword size'], ['anchorY', 'Keyword height']];

const PRESET_NAMES = Object.keys(PRESETS)
  .filter((k) => k.startsWith('match-cut/'))
  .map((k) => k.slice('match-cut/'.length));
const presetLook = (name: string) => PRESETS[`match-cut/${name}`] as Look;

// The keyword's box, as the panel draws it: the baseline sits on anchorY; the box rises 0.85 of the type size above it
// and falls 0.25 below; its width is a rough five type sizes (the real width depends on the keyword, which `look` lacks).
const UP = 0.85;
const DOWN = 0.25;
const WIDE = 5;



/** The overlay's box, drawn in composition pixels. Pixel sizes below are composition pixels, divided by the overlay's
 *  on-screen scale for the pointer. */
const BOX_CSS = `
.kg-paper-box { position: absolute; pointer-events: auto; cursor: grab; border: 2px solid #2f6bff; border-radius: 4px; background: rgb(47 107 255 / 0.12); touch-action: none; user-select: none; -webkit-user-select: none; }
.kg-paper-box[data-drag] { cursor: grabbing; }
.kg-paper-box .kg-paper-tag { position: absolute; left: -2px; bottom: 100%; margin-bottom: 4px; padding: 3px 8px; border-radius: 4px; background: #2f6bff; color: #fff; font: 600 22px/1.2 system-ui, sans-serif; white-space: nowrap; pointer-events: none; }
.kg-paper-box .kg-paper-base { position: absolute; left: 0; right: 0; height: 0; border-top: 2px dashed #2f6bff; pointer-events: none; }
.kg-paper-box .kg-paper-grip { position: absolute; width: 26px; height: 26px; border-radius: 50%; background: #fff; border: 3px solid #2f6bff; box-shadow: 0 2px 6px rgb(0 0 0 / 0.35); }
`;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Schematic thumbnails, 40 x 52: grey bars for text, the keyword's bar in the highlight colour. */
function thumb(layout: Layout, key: string): string {
  const t = (x: number, y: number, w: number, h = 2, o = 0.4) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1" fill="currentColor" opacity="${o}"/>`;
  const k = (x: number, y: number, w: number, h = 5) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${key}"/><rect x="${x + 2}" y="${y + h / 2 - 1}" width="${w - 4}" height="2" rx="1" fill="currentColor" opacity="0.85"/>`;
  const body = (y: number, n: number, x = 4, w = 32) => Array.from({ length: n }, (_, i) => t(x, y + i * 4, i === n - 1 ? w * 0.6 : w)).join('');
  let inner = '';
  switch (layout) {
    case 'pull': // a pull quote: big quote marks, short centred lines round the keyword
      inner = `<text x="6" y="17" font-size="16" font-family="Georgia, serif" fill="currentColor" opacity="0.5">“</text>${t(10, 20, 20)}${k(8, 25, 24)}${t(10, 34, 20)}${t(14, 38, 12)}${body(44, 2, 6, 28)}`;
      break;
    case 'italic': // an italic headline over copy
      inner = `<g transform="skewX(-10) translate(5 0)">${t(8, 8, 30, 3, 0.55)}${k(8, 15, 22, 6)}${t(8, 24, 28, 3, 0.55)}</g>${body(33, 4)}`;
      break;
    case 'kicker': // the keyword starts a short line, then copy
      inner = `${k(4, 8, 16)}${t(23, 10, 13, 2, 0.55)}${t(4, 17, 32, 3, 0.55)}${body(25, 6)}`;
      break;
    case 'body': // plain text, the keyword inside a line
      inner = `${body(6, 3)}${t(4, 19, 10)}${k(16, 17, 14)}${t(32, 19, 4)}${body(26, 6)}`;
      break;
    case 'web': // an article page: nav bar, sans headline, image
      inner = `<rect x="0" y="0" width="40" height="6" fill="currentColor" opacity="0.2"/>${t(3, 2.5, 8, 1.5, 0.5)}${t(26, 2.5, 3, 1.5, 0.5)}${t(31, 2.5, 3, 1.5, 0.5)}${t(4, 10, 32, 3, 0.55)}${k(4, 16, 18, 5)}<rect x="4" y="25" width="32" height="10" rx="1.5" fill="currentColor" opacity="0.14"/>${body(38, 3)}`;
      break;
    case 'post': // a blog post: author row, headline
      inner = `<circle cx="8" cy="9" r="3.5" fill="currentColor" opacity="0.3"/>${t(14, 6.5, 12, 2, 0.5)}${t(14, 10.5, 8, 1.5, 0.3)}${t(4, 18, 32, 3, 0.55)}${k(4, 24, 20, 5)}${body(34, 5)}`;
      break;
    case 'tweet': // a feed of short posts: avatar, name row, text, actions, a rule between
      inner = `<rect width="40" height="52" fill="currentColor" opacity="0.08"/>${[3, 21, 39].map((y, i) => `<circle cx="6" cy="${y + 3}" r="3" fill="currentColor" opacity="0.35"/>${t(11, y + 1, 12, 1.5, 0.55)}${i === 1 ? `${t(11, y + 5, 6)}${k(18, y + 3.5, 14, 4)}` : t(11, y + 5, 25)}${t(11, y + 9, 18)}${t(11, y + 13, 3, 1.2, 0.3)}${t(20, y + 13, 3, 1.2, 0.3)}${t(29, y + 13, 3, 1.2, 0.3)}<rect x="0" y="${y + 16.5}" width="40" height="0.5" fill="currentColor" opacity="0.25"/>`).join('')}`;
      break;
    case 'reddit': // a forum post: community row, bold title, flair, body, action pills
      inner = `<rect width="40" height="52" fill="currentColor" opacity="0.08"/><circle cx="7" cy="6" r="3" fill="currentColor" opacity="0.35"/>${t(12, 4, 12, 1.5, 0.45)}${t(12, 7.5, 8, 1.2, 0.3)}${t(4, 13, 32, 3, 0.6)}${t(4, 18, 20, 3, 0.6)}<rect x="4" y="24" width="10" height="3" rx="1.5" fill="currentColor" opacity="0.3"/>${t(4, 31, 10)}${k(15, 29.5, 14, 4)}${body(36, 2)}${[4, 14, 22, 30].map((x) => `<rect x="${x}" y="45" width="7" height="4" rx="2" fill="currentColor" opacity="0.25"/>`).join('')}`;
      break;
    case 'comments': // a comment thread: avatars, nested replies on a thread line
      inner = `<rect width="40" height="52" fill="currentColor" opacity="0.08"/>${[[3, 0], [19, 6], [35, 12]].map(([y, x], i) => `<circle cx="${5 + x}" cy="${y + 2}" r="2.5" fill="currentColor" opacity="0.35"/>${t(9 + x, y + 1, 10, 1.4, 0.5)}${i === 1 ? `${t(9 + x, y + 5, 5)}${k(15 + x, y + 3.5, 13, 4)}` : t(9 + x, y + 5, 26 - x)}${t(9 + x, y + 9, 20 - x)}${t(9 + x, y + 12.5, 16, 1.2, 0.3)}`).join('')}<rect x="4.7" y="6" width="0.6" height="16" fill="currentColor" opacity="0.3"/><rect x="10.7" y="22" width="0.6" height="16" fill="currentColor" opacity="0.3"/>`;
      break;
    case 'display': // a display-serif headline, big
      inner = `${t(4, 8, 26, 4, 0.55)}${k(4, 16, 30, 8)}${t(4, 28, 24, 4, 0.55)}${body(38, 3, 4, 28)}`;
      break;
  }
  return `<svg viewBox="0 0 40 52" aria-hidden="true">${inner}</svg>`;
}

/** A preset's swatch: tint, creases from `crumple`, a sharp keyword on a highlight bar, lines that blur with `blur`. */
function swatch(look: Look): HTMLElement {
  const box = el('div', 'kg-paper-swatch');
  box.style.background = String(look.tint ?? DEFAULTS.tint);
  const soft = clamp((look.blur ?? DEFAULTS.blur) / 6, 0, 3);
  for (const top of [7, 15, 33, 41]) {
    const i = el('i');
    i.style.top = `${top}px`;
    i.style.width = `${top % 2 ? 62 : 74}%`;
    i.style.filter = soft > 0.2 ? `blur(${soft.toFixed(1)}px)` : '';
    box.append(i);
  }
  const bar = el('b');
  bar.style.background = String(look.highlight ?? DEFAULTS.highlight);
  box.append(bar);
  const creases = el('u');
  const c = clamp((look.crumple ?? DEFAULTS.crumple) / 2, 0, 1);
  if (c > 0) {
    const line = `rgb(0 0 0 / ${(0.16 * c).toFixed(3)})`;
    const hi = `rgb(255 255 255 / ${(0.35 * c).toFixed(3)})`;
    creases.style.background = `linear-gradient(115deg, transparent 28%, ${line} 29%, ${hi} 31%, transparent 33%), linear-gradient(25deg, transparent 58%, ${line} 59%, ${hi} 61%, transparent 63%), linear-gradient(160deg, transparent 70%, ${line} 71%, transparent 74%)`;
  }
  box.append(creases);
  return box;
}

const fillRange = (r: HTMLInputElement) => {
  const min = Number(r.min);
  const span = Number(r.max) - min || 1;
  r.style.setProperty('--fill', `${clamp(((Number(r.value) - min) / span) * 100, 0, 100).toFixed(1)}%`);
};

const decimals = (step: number) => (step >= 1 ? 0 : step >= 0.1 ? 1 : 2);

export function mount(el0: HTMLElement, initial: PanelContext): { update(ctx: PanelContext): void; unmount(): void } {
  // Studio may keep the panel mounted across compositions and only call `update` with another field's schema, so the
  // view is picked again on every update and swapped when it changes.
  const viewOf = (ctx: PanelContext) => String(ctx.schema.kinetographView ?? 'match-cut');
  const open = (ctx: PanelContext) => {
    const v = viewOf(ctx);
    if (v === 'scrapline') return mountScrapline(el0, ctx);
    return v === 'cut-out' || v === 'fold-out' ? mountSheet(el0, ctx, v === 'fold-out') : mountMatchCut(el0, ctx);
  };
  let view = viewOf(initial);
  let inner = open(initial);
  return {
    update(ctx) {
      if (viewOf(ctx) === view) return inner.update(ctx);
      inner.unmount();
      view = viewOf(ctx);
      inner = open(ctx);
    },
    unmount: () => inner.unmount(),
  };
}

/** The match cut view, for `matchCutLookSchema`. */
function mountMatchCut(el0: HTMLElement, initial: PanelContext): { update(ctx: PanelContext): void; unmount(): void } {
  let ctx = initial;
  let showBox = true;
  const look = (): Look => (ctx.value && typeof ctx.value === 'object' ? (ctx.value as Look) : {});
  const val = (k: string): any => look()[k] ?? DEFAULTS[k];
  /** Sets the look (and shows it at once; Studio's `update` follows with the same value). */
  const set = (next: Look) => {
    ctx = { ...ctx, value: next };
    sync();
    ctx.onChange(next);
  };
  const patch = (p: Look) => set({ ...look(), ...p });

  const root = el('div', 'kg-paper');
  root.append(el('style', undefined, CSS));
  const section = (title: string, extra?: HTMLElement) => {
    const s = el('div', 'kg-paper-sec');
    const h = el('div', 'kg-paper-h');
    h.append(el('span', undefined, title));
    if (extra) h.append(extra);
    s.append(h);
    root.append(s);
    return s;
  };

  // presets
  const cards = el('div', 'kg-paper-cards');
  const cardOf = new Map<string, HTMLButtonElement>();
  for (const name of PRESET_NAMES) {
    const p = presetLook(name);
    const b = el('button', 'kg-paper-card');
    b.type = 'button';
    b.dataset.preset = name;
    b.title = `Use the ${name} look`;
    b.append(swatch(p), el('span', 'kg-paper-name', name), el('span', 'kg-paper-meta', `${p.cutsPerSecond ?? DEFAULTS.cutsPerSecond} cuts/s · ${p.zoom ?? DEFAULTS.zoom}x`));
    b.addEventListener('click', () => set({ ...p }));
    cards.append(b);
    cardOf.set(name, b);
  }
  section('Preset').append(cards);

  // layouts
  const lay = el('div', 'kg-paper-layouts');
  const layBtn = new Map<Layout, HTMLButtonElement>();
  const chosen = (): Layout[] => (Array.isArray(look().layouts) && look().layouts.length ? look().layouts : [...PAGE_LAYOUTS]);
  for (const name of LAYOUTS) {
    const b = el('button', 'kg-paper-lay');
    b.type = 'button';
    b.dataset.layout = name;
    b.title = `Use ${name} pages`;
    b.innerHTML = `${thumb(name, 'var(--kg-key)')}<span>${name}</span>`;
    b.addEventListener('click', () => {
      const now = chosen();
      const next = now.includes(name) ? now.filter((l) => l !== name) : LAYOUTS.filter((l) => l === name || now.includes(l));
      if (next.length) patch({ layouts: next }); // the schema wants at least one
    });
    lay.append(b);
    layBtn.set(name, b);
  }
  section('Page layouts').append(lay);

  // sliders
  const sliders = new Map<string, { input: HTMLInputElement; num: HTMLElement }>();
  const slider = (k: string, label: string, into: HTMLElement) => {
    const prop = (ctx.schema.properties as Json | undefined)?.[k] as Json | undefined;
    const [lo, hi, step] = RANGES[k];
    const row = el('div', 'kg-paper-row');
    const lab = el('label', undefined, label);
    const input = el('input');
    input.type = 'range';
    input.min = String(prop?.minimum ?? lo);
    input.max = String(prop?.maximum ?? hi);
    input.step = String(step);
    input.dataset.field = k;
    input.id = `kg-paper-${k}`;
    lab.htmlFor = input.id;
    const num = el('span', 'kg-paper-num');
    input.addEventListener('input', () => patch({ [k]: Number(input.value) }));
    row.append(lab, input, num);
    into.append(row);
    sliders.set(k, { input, num });
  };
  const place = section('Keyword');
  const hint = el('div', 'kg-paper-hint');
  const toggle = el('button', 'kg-paper-switch');
  toggle.type = 'button';
  toggle.setAttribute('role', 'switch');
  toggle.setAttribute('aria-checked', 'true');
  toggle.append(el('span', 'kg-paper-track'), el('span', undefined, 'Box on preview'));
  toggle.addEventListener('click', () => {
    showBox = !showBox;
    sync();
  });
  if (initial.preview) place.querySelector('.kg-paper-h')!.append(toggle);
  for (const [k, label] of PLACE) slider(k, label, place);
  place.append(hint);
  const feel = section('Feel');
  for (const [k, label] of FEEL) slider(k, label, feel);

  // colours
  const colors = el('div', 'kg-paper-colors');
  const colorIn = new Map<string, HTMLInputElement>();
  for (const [k, label] of [['highlight', 'Highlight'], ['tint', 'Paper tint']] as const) {
    const w = el('label', 'kg-paper-color');
    const i = el('input');
    i.type = 'color';
    i.dataset.field = k;
    i.addEventListener('input', () => patch({ [k]: i.value }));
    w.append(i, el('span', undefined, label));
    colors.append(w);
    colorIn.set(k, i);
  }
  section('Colour').append(colors);
  el0.append(root);

  // the keyword box on the preview
  let box: HTMLElement | null = null;
  let boxStyle: HTMLStyleElement | null = null;
  let tag: HTMLElement;
  let preview = initial.preview;
  let stopDrag: (() => void) | null = null;

  function geometry() {
    const p = preview!;
    const size = Math.min(p.width, p.height) * val('keySize');
    const base = p.height * val('anchorY');
    const w = size * WIDE;
    return { size, base, w, left: p.width / 2 - w / 2, top: base - size * UP, h: size * (UP + DOWN) };
  }

  /** The overlay's on-screen size / composition size, so pointer deltas become composition pixels. */
  const scale = () => {
    const r = preview!.overlay.getBoundingClientRect();
    return r.width > 0 && preview!.width > 0 ? r.width / preview!.width : 1;
  };

  function drag(e: MouseEvent, move: (dx: number, dy: number) => void) {
    e.preventDefault();
    e.stopPropagation();
    stopDrag?.();
    const sc = scale();
    const x0 = e.clientX;
    const y0 = e.clientY;
    box!.dataset.drag = '1';
    const onMove = (m: MouseEvent) => move((m.clientX - x0) / sc, (m.clientY - y0) / sc);
    const onUp = () => {
      stopDrag?.();
    };
    stopDrag = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      delete box?.dataset.drag;
      stopDrag = null;
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  }

  function buildBox() {
    if (!preview) return;
    boxStyle = el('style', undefined, BOX_CSS);
    box = el('div', 'kg-paper-box');
    box.dataset.role = 'keybox';
    tag = el('div', 'kg-paper-tag');
    const baseLine = el('div', 'kg-paper-base');
    const gripR = el('div', 'kg-paper-grip');
    gripR.dataset.role = 'resize-width';
    gripR.style.cursor = 'ew-resize';
    const gripT = el('div', 'kg-paper-grip');
    gripT.dataset.role = 'resize-height';
    gripT.style.cursor = 'ns-resize';
    box.append(tag, baseLine, gripR, gripT);
    preview.overlay.append(boxStyle, box);

    // move: the keyword's line, so vertical only (it is centred across the frame)
    box.addEventListener('pointerdown', (e) => {
      if (e.target !== box && e.target !== tag) return;
      const a0 = val('anchorY');
      const { height } = preview!;
      drag(e, (_dx, dy) => patch({ anchorY: round(clamp(a0 + dy / height, 0, 1), 3) }));
    });
    // resize from the right edge: the width grows with the type size, about the frame's middle
    gripR.addEventListener('pointerdown', (e) => {
      const g = geometry();
      const right0 = g.left + g.w;
      drag(e, (dx) => patch({ keySize: sizeToKey((2 * (right0 + dx - preview!.width / 2)) / WIDE) }));
    });
    // resize from the top: the baseline stays put and the type grows upward
    gripT.addEventListener('pointerdown', (e) => {
      const g = geometry();
      drag(e, (_dx, dy) => patch({ keySize: sizeToKey((g.base - (g.top + dy)) / UP) }));
    });
  }

  const keyRange = () => {
    const p = (ctx.schema.properties as Json | undefined)?.keySize as Json | undefined;
    return [p?.minimum ?? RANGES.keySize[0], p?.maximum ?? RANGES.keySize[1]] as const;
  };
  const sizeToKey = (size: number) => {
    const [lo, hi] = keyRange();
    return round(clamp(size / Math.min(preview!.width, preview!.height), lo, hi), 4);
  };
  const round = (v: number, d: number) => Number(v.toFixed(d));

  function drawBox() {
    if (!box || !preview) return;
    box.style.display = showBox ? '' : 'none';
    const g = geometry();
    Object.assign(box.style, { left: `${g.left}px`, top: `${g.top}px`, width: `${g.w}px`, height: `${g.h}px` });
    const grips = box.querySelectorAll<HTMLElement>('.kg-paper-grip');
    Object.assign(grips[0].style, { right: '-13px', top: `${g.size * UP - 13}px` });
    Object.assign(grips[1].style, { left: `${g.w / 2 - 13}px`, top: '-13px' });
    const base = box.querySelector<HTMLElement>('.kg-paper-base')!;
    base.style.top = `${g.size * UP}px`;
    tag.textContent = `keyword  size ${val('keySize').toFixed(3)}  height ${val('anchorY').toFixed(2)}`;
  }

  /** Puts the current value into the controls and the box. */
  function sync() {
    const l = look();
    for (const [name, b] of cardOf) b.setAttribute('aria-pressed', String(same(l, presetLook(name))));
    const key = String(val('highlight'));
    root.style.setProperty('--kg-key', key);
    const on = chosen();
    for (const [name, b] of layBtn) b.setAttribute('aria-pressed', String(on.includes(name)));
    for (const [k, s] of sliders) {
      const v = Number(val(k));
      s.input.value = String(v);
      fillRange(s.input);
      s.num.textContent = v.toFixed(decimals(RANGES[k][2]));
    }
    for (const [k, i] of colorIn) {
      const v = String(val(k));
      i.value = /^#[0-9a-f]{6}$/i.test(v) ? v : String(DEFAULTS[k]);
    }
    toggle.setAttribute('aria-checked', String(showBox));
    hint.textContent = preview ? 'Drag the box on the preview to place the keyword; drag its handles to size it. It stays centred across.' : 'Size and height of the keyword line.';
    drawBox();
  }

  buildBox();
  sync();

  return {
    update(next) {
      const hadBox = !!preview;
      ctx = next;
      if (next.preview && next.preview !== preview && next.preview.overlay !== preview?.overlay) {
        box?.remove();
        boxStyle?.remove();
        preview = next.preview;
        buildBox();
      } else {
        preview = next.preview ?? preview;
      }
      if (!hadBox && preview && !toggle.isConnected) place.querySelector('.kg-paper-h')!.append(toggle);
      sync();
    },
    unmount() {
      stopDrag?.();
      box?.remove();
      boxStyle?.remove();
      box = boxStyle = null;
      root.remove();
    },
  };
}

/** One line for the folded card in Studio: the look's layouts, cut rate and paper tint. */
export function summary(value: unknown): string {
  if (typeof value !== 'object' || value === null) return '';
  const sheet = value as { edge?: unknown; stock?: unknown; folds?: unknown; line?: unknown; paper?: unknown };
  if (typeof sheet.edge === 'string' || typeof sheet.stock === 'string') {
    const line = typeof sheet.line === 'string' ? `${sheet.line} line` : '';
    return [sheet.edge ?? 'torn', sheet.stock ?? 'white', typeof sheet.folds === 'number' ? `${sheet.folds} folds` : '', line].filter(Boolean).join(', ');
  }
  if (typeof sheet.line === 'string') return [`${sheet.line} line`, typeof sheet.paper === 'string' ? `${sheet.paper} paper` : 'no paper'].join(', ');
  const look = value as { layouts?: unknown; cutsPerSecond?: unknown; tint?: unknown };
  const parts: string[] = [];
  if (Array.isArray(look.layouts)) parts.push(`${look.layouts.length} layout${look.layouts.length === 1 ? '' : 's'}`);
  if (typeof look.cutsPerSecond === 'number') parts.push(`${look.cutsPerSecond} cuts/s`);
  if (typeof look.tint === 'string') parts.push(`tint ${look.tint}`);
  return parts.join(', ');
}
