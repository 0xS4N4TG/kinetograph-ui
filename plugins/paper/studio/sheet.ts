// The paper panel's sheet view, for `cutOutLookSchema` and `foldOutLookSchema`: edge cards with the edge drawn, stock
// cards, the three paper colours (cleared when the stock changes, so the stock's own show), sliders for the sheet and,
// for a fold-out, the folds and the timing; for a cut-out, a hand-drawn line round it (scrapline.ts's line cards). With `ctx.preview` the picture's place is a handle on the preview: drag the
// centre to move it, drag either end of the width bar to size it. Framework-free DOM; imports nothing from src/, so the
// engine never reaches the browser. The defaults mirror src/cut-out.tsx and STOCKS in src/sheet.ts.

import { CSS } from './style.js';
import type { PanelContext } from './panel.js';
import { lineCards } from './scrapline.js';

type Json = Record<string, any>;

const EDGES = ['torn', 'cut', 'wavy', 'sticker'] as const;
const STOCKS: Record<string, { paper: string; back: string; fringe: string }> = {
  white: { paper: '#fbfbf8', back: '#f1f0ec', fringe: '#d6d6d0' },
  newsprint: { paper: '#e9e6df', back: '#e4e1da', fringe: '#cdc9c0' },
  kraft: { paper: '#c49a6c', back: '#b98f62', fringe: '#d6ba96' },
  binder: { paper: '#f5f2e6', back: '#f5f2e6', fringe: '#d6d2c4' },
  cardboard: { paper: '#a67a4d', back: '#9c7146', fringe: '#c9a577' },
};

/** Field, label, [min, max, step] (the schema's bounds win), default. */
type Slide = [string, string, [number, number, number], number];
const SHEET: Slide[] = [['creases', 'Creases', [0, 1, 0.01], 0.45], ['shadow', 'Shadow', [0, 2, 0.05], 1], ['boil', 'Boil (per s)', [0, 24, 1], 0], ['seed', 'Seed', [0, 50, 1], 0]];
const FOLD: Slide[] = [['folds', 'Folds', [1, 5, 1], 3], ['ball', 'Packet size', [0.3, 1.5, 0.01], 0.95], ['turn', 'Turn', [-90, 90, 1], 14], ['crumple', 'Crumple', [0, 0.03, 0.001], 0.004], ['cells', 'Facets', [4, 24, 1], 12]];
const TIMING: Slide[] = [['delay', 'Delay (frames)', [0, 120, 1], 0], ['duration', 'Open (frames)', [1, 90, 1], 21], ['steps', 'Steps per s', [2, 30, 1], 10]];

const OVERLAY_CSS = `
.kg-paper-place { position: absolute; height: 0; pointer-events: none; }
.kg-paper-place .kg-paper-bar { position: absolute; left: 0; right: 0; top: -1px; border-top: 2px dashed #2f6bff; }
.kg-paper-place .kg-paper-mid { position: absolute; left: 50%; top: 0; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%; border: 3px solid #2f6bff; background: rgb(47 107 255 / 0.15); pointer-events: auto; cursor: grab; touch-action: none; }
.kg-paper-place .kg-paper-end { position: absolute; top: 0; width: 26px; height: 26px; margin-top: -13px; border-radius: 50%; background: #fff; border: 3px solid #2f6bff; box-shadow: 0 2px 6px rgb(0 0 0 / 0.35); pointer-events: auto; cursor: ew-resize; touch-action: none; }
.kg-paper-place .kg-paper-tag { position: absolute; left: 0; bottom: 30px; padding: 3px 8px; border-radius: 4px; background: #2f6bff; color: #fff; font: 600 22px/1.2 system-ui, sans-serif; white-space: nowrap; }
`;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const decimals = (step: number) => (step >= 1 ? 0 : step >= 0.1 ? 1 : step >= 0.01 ? 2 : 3);
const hex = (v: unknown, dflt: string) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : dflt);
const fillRange = (r: HTMLInputElement) => {
  const min = Number(r.min);
  const span = Number(r.max) - min || 1;
  r.style.setProperty('--fill', `${clamp(((Number(r.value) - min) / span) * 100, 0, 100).toFixed(1)}%`);
};

/** An edge drawn on a strip of paper: the paper on the left, the edge running down its right side. */
function edgeSwatch(edge: string, paper: string): string {
  const pts: string[] = [];
  for (let i = 0; i <= 20; i++) {
    const y = (i / 20) * 54;
    const x = edge === 'torn' ? 48 + Math.sin(i * 2.7) * 3 + Math.sin(i * 7.1) * 2 : edge === 'wavy' ? 48 + Math.sin(i * 1.3) * 4 : 48 + i * 0.15;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const shape = `M0,0 L${pts.join(' L')} L0,54 Z`;
  const fringe = edge === 'torn' ? `<path d="M0,0 L${pts.map((p) => { const [x, y] = p.split(',').map(Number); return `${(x! + 2.5).toFixed(1)},${y}`; }).join(' L')} L0,54 Z" fill="#fff" opacity="0.85"/>` : '';
  const sticker = edge === 'sticker' ? `<rect x="-6" y="6" width="${48 - 4}" height="42" rx="8" fill="#e89a6a"/>` : '';
  return `<svg viewBox="0 0 70 54" preserveAspectRatio="none" aria-hidden="true" style="width:100%;height:40px;display:block;background:#2f8a46;border-radius:4px">${fringe}<path d="${shape}" fill="${paper}"/>${sticker || '<rect x="-4" y="10" width="40" height="34" fill="#e89a6a"/>'}</svg>`;
}

export function mountSheet(host: HTMLElement, initial: PanelContext, folding: boolean): { update(ctx: PanelContext): void; unmount(): void } {
  let ctx = initial;
  let preview = initial.preview;
  const value = (): Json => (ctx.value && typeof ctx.value === 'object' ? (ctx.value as Json) : {});
  const stock = () => STOCKS[value().stock as string] ?? STOCKS.white!;
  const set = (next: Json) => {
    ctx = { ...ctx, value: next };
    sync();
    ctx.onChange(next);
  };
  const patch = (p: Json) => set({ ...value(), ...p });
  const fields = (): Json => (ctx.schema.properties as Json | undefined) ?? {};

  const root = el('div', 'kg-paper');
  root.append(el('style', undefined, CSS));
  const section = (title: string) => {
    const s = el('div', 'kg-paper-sec');
    s.append(el('div', 'kg-paper-h', title));
    root.append(s);
    return s;
  };
  const refresh: (() => void)[] = [];

  // edges
  const edgeCards = el('div', 'kg-paper-cards');
  edgeCards.style.gridTemplateColumns = 'repeat(4, minmax(0, 1fr))';
  const edgeOf = new Map<string, HTMLButtonElement>();
  for (const e of EDGES) {
    const b = el('button', 'kg-paper-card');
    b.type = 'button';
    b.dataset.edge = e;
    b.title = `A ${e} edge`;
    edgeCards.append(b);
    edgeOf.set(e, b);
    b.addEventListener('click', () => patch({ edge: e }));
  }
  section('Edge').append(edgeCards);

  // stocks
  const stockCards = el('div', 'kg-paper-cards');
  stockCards.style.gridTemplateColumns = 'repeat(5, minmax(0, 1fr))';
  const stockOf = new Map<string, HTMLButtonElement>();
  for (const [name, c] of Object.entries(STOCKS)) {
    const b = el('button', 'kg-paper-card');
    b.type = 'button';
    b.dataset.stock = name;
    b.title = `${name} paper`;
    const sw = el('div', 'kg-paper-swatch');
    sw.style.height = '34px';
    sw.style.background = `linear-gradient(135deg, ${c.paper} 0 60%, ${c.back} 60%)`;
    b.append(sw, el('span', 'kg-paper-name', name));
    // a new stock clears the colour overrides, so its own colours show
    b.addEventListener('click', () => {
      const { paper: _p, back: _b, fringe: _f, ...rest } = value();
      set({ ...rest, stock: name });
    });
    stockCards.append(b);
    stockOf.set(name, b);
  }
  const stockSec = section('Paper');
  stockSec.append(stockCards);

  // colours
  const colorRow = el('div', 'kg-paper-colors');
  const colorIn = new Map<string, HTMLInputElement>();
  for (const [k, label] of [['paper', 'Face'], ['back', 'Back'], ['fringe', 'Fringe']] as const) {
    const w = el('label', 'kg-paper-color');
    const i = el('input');
    i.type = 'color';
    i.dataset.field = k;
    i.addEventListener('input', () => patch({ [k]: i.value }));
    w.append(i, el('span', undefined, label));
    colorRow.append(w);
    colorIn.set(k, i);
  }
  stockSec.append(colorRow);

  const slide = (into: HTMLElement, [k, label, [lo, hi, step], dflt]: Slide) => {
    const prop = fields()[k] as Json | undefined;
    const row = el('div', 'kg-paper-row');
    const lab = el('label', undefined, label);
    const input = el('input');
    input.type = 'range';
    input.min = String(prop?.minimum ?? lo);
    input.max = String(prop?.maximum ?? hi);
    input.step = String(step);
    input.dataset.field = k;
    input.id = `kg-paper-sheet-${k}`;
    lab.htmlFor = input.id;
    const num = el('span', 'kg-paper-num');
    input.addEventListener('input', () => patch({ [k]: Number(input.value) }));
    row.append(lab, input, num);
    into.append(row);
    refresh.push(() => {
      const v = Number(value()[k] ?? dflt);
      input.value = String(v);
      fillRange(input);
      num.textContent = v.toFixed(decimals(step));
    });
  };
  const sheetSec = section('Sheet');
  SHEET.forEach((s) => slide(sheetSec, s));
  if (!folding) {
    const lineSec = section('Line');
    const face = () => hex(value().paper, stock().paper);
    refresh.push(lineCards(lineSec, true, () => ({ line: value().line, color: hex(value().lineColor, '#141414'), paper: face() }), (line) => {
      const { line: _l, ...rest } = value();
      set(line ? { ...rest, line } : rest);
    }));
    const row = el('div', 'kg-paper-colors');
    const w = el('label', 'kg-paper-color');
    const i = el('input');
    i.type = 'color';
    i.dataset.field = 'lineColor';
    i.addEventListener('input', () => patch({ lineColor: i.value }));
    w.append(i, el('span', undefined, 'Line colour'));
    row.append(w);
    lineSec.append(row);
    refresh.push(() => { i.value = hex(value().lineColor, '#141414'); });
    slide(lineSec, ['lineGap', 'Gap', [0, 80, 1], 14]);
  }
  if (folding) {
    const foldSec = section('Folds');
    FOLD.forEach((s) => slide(foldSec, s));
    const timeSec = section('Timing');
    TIMING.forEach((s) => slide(timeSec, s));
  }
  const hint = el('div', 'kg-paper-hint');
  sheetSec.append(hint);
  host.append(root);

  // the picture's place on the preview
  let style: HTMLStyleElement | null = null;
  let place: HTMLElement | null = null;
  let tag: HTMLElement;
  let stopDrag: (() => void) | null = null;
  const where = () => {
    const p = preview!, v = value();
    return { x: Number(v.x ?? p.width / 2), y: Number(v.y ?? p.height / 2), w: Number(v.width ?? p.width * 0.62) };
  };
  function drag(e: PointerEvent, target: HTMLElement, move: (dx: number, dy: number) => void) {
    e.preventDefault();
    e.stopPropagation();
    stopDrag?.();
    const r = preview!.overlay.getBoundingClientRect();
    const sc = r.width > 0 && preview!.width > 0 ? r.width / preview!.width : 1;
    const x0 = e.clientX, y0 = e.clientY;
    target.dataset.drag = '1';
    const onMove = (m: PointerEvent) => move((m.clientX - x0) / sc, (m.clientY - y0) / sc);
    const onUp = () => stopDrag?.();
    stopDrag = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      delete target.dataset.drag;
      stopDrag = null;
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  }
  function build() {
    if (!preview) return;
    style = el('style', undefined, OVERLAY_CSS);
    place = el('div', 'kg-paper-place');
    place.dataset.role = 'cut-out-place';
    tag = el('div', 'kg-paper-tag');
    const mid = el('div', 'kg-paper-mid');
    mid.dataset.role = 'move';
    const left = el('div', 'kg-paper-end');
    const right = el('div', 'kg-paper-end');
    left.style.left = '-13px';
    right.style.right = '-13px';
    right.dataset.role = 'resize';
    place.append(el('div', 'kg-paper-bar'), tag, mid, left, right);
    preview.overlay.append(style, place);
    mid.addEventListener('pointerdown', (e) => {
      const p0 = where();
      drag(e, mid, (dx, dy) => patch({ x: Math.round(p0.x + dx), y: Math.round(p0.y + dy) }));
    });
    for (const [end, sign] of [[left, -1], [right, 1]] as const) {
      end.addEventListener('pointerdown', (e) => {
        const p0 = where();
        drag(e, end, (dx) => patch({ width: Math.round(Math.max(20, p0.w + 2 * sign * dx)) }));
      });
    }
  }
  function teardown() {
    stopDrag?.();
    style?.remove();
    place?.remove();
    style = place = null;
  }
  function draw() {
    if (!place || !preview) return;
    const p = where();
    Object.assign(place.style, { left: `${p.x - p.w / 2}px`, top: `${p.y}px`, width: `${p.w}px` });
    tag.textContent = `picture  x ${Math.round(p.x)}  y ${Math.round(p.y)}  width ${Math.round(p.w)}`;
  }

  function sync() {
    const v = value();
    const c = stock();
    const face = hex(v.paper, c.paper);
    for (const [e, b] of edgeOf) {
      b.setAttribute('aria-pressed', String((v.edge ?? 'torn') === e));
      b.innerHTML = `${edgeSwatch(e, face)}<span class="kg-paper-name">${e}</span>`;
    }
    for (const [name, b] of stockOf) b.setAttribute('aria-pressed', String((v.stock ?? 'white') === name));
    for (const [k, i] of colorIn) i.value = hex(v[k], c[k as 'paper']!);
    refresh.forEach((r) => r());
    hint.textContent = preview ? "Drag the circle on the preview to move the picture; drag the bar's ends to size it." : '';
    draw();
  }

  build();
  sync();
  return {
    update(next: PanelContext) {
      ctx = next;
      if (next.preview && next.preview.overlay !== preview?.overlay) {
        teardown();
        preview = next.preview;
        build();
      } else if (next.preview) {
        preview = next.preview;
      }
      sync();
    },
    unmount() {
      teardown();
      root.remove();
    },
  };
}

