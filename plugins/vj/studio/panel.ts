// The VJ panel for Kinetograph Studio's Props tab. Framework-free DOM. Two views, picked by the field schema's
// `kinetographView`:
//
//   look   (vjLookSchema): a card per look with a drawn swatch, sliders and colours for the chosen look's settings, and
//          on the preview (when Studio gives `ctx.preview`) the CRT's tube face as a box to drag and resize, or the
//          magnifier's centre as a point to drag.
//   blobs  (blobStyleSchema): segmented choices for the marks, links and blend, sliders, a colour.
//
// It imports nothing from the plugin, so the engine never reaches the browser; the defaults below mirror
// src/looks.ts and src/blobs.tsx.

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
interface Mounted { update(ctx: PanelContext): void; unmount(): void }

const CSS = `
.kg-vj { --kg-r: var(--radius, 0.5rem); font: 12px/1.4 system-ui, sans-serif; color: var(--foreground); display: flex; flex-direction: column; gap: 14px; }
.kg-vj * { box-sizing: border-box; }
.kg-vj button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; text-align: left; }
.kg-vj button:focus-visible, .kg-vj input:focus-visible { outline: 2px solid var(--ring, var(--primary)); outline-offset: 1px; }
.kg-vj-sec { display: flex; flex-direction: column; gap: 6px; }
.kg-vj-h { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--muted-foreground); font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }
.kg-vj-cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
.kg-vj-card { display: flex; flex-direction: column; gap: 5px; padding: 5px; border: 1px solid var(--border); border-radius: var(--kg-r); background: var(--background); transition: border-color 0.12s, box-shadow 0.12s; }
.kg-vj-card:hover { border-color: color-mix(in srgb, var(--foreground) 30%, var(--border)); }
.kg-vj-card[aria-pressed="true"] { border-color: var(--primary); box-shadow: 0 0 0 1px var(--primary); }
.kg-vj-name { font-weight: 600; padding: 0 2px; }
.kg-vj-swatch { position: relative; height: 40px; border-radius: calc(var(--kg-r) - 3px); overflow: hidden; border: 1px solid color-mix(in srgb, var(--foreground) 12%, transparent); }
.kg-vj-row { display: grid; grid-template-columns: 96px minmax(0, 1fr) 44px; align-items: center; gap: 8px; }
.kg-vj-row label { color: var(--muted-foreground); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kg-vj-num { text-align: right; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
.kg-vj input[type=range] { --fill: 50%; width: 100%; min-width: 0; height: 16px; margin: 0; background: transparent; cursor: pointer; -webkit-appearance: none; appearance: none; }
.kg-vj input[type=range]::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: linear-gradient(to right, var(--primary) var(--fill), var(--input) var(--fill)); }
.kg-vj input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; margin-top: -4px; border-radius: 50%; background: var(--background); border: 2px solid var(--primary); box-shadow: 0 1px 2px rgb(0 0 0 / 0.2); }
.kg-vj input[type=range]::-moz-range-track { height: 4px; border-radius: 2px; background: var(--input); }
.kg-vj input[type=range]::-moz-range-progress { height: 4px; border-radius: 2px; background: var(--primary); }
.kg-vj input[type=range]::-moz-range-thumb { width: 8px; height: 8px; border-radius: 50%; background: var(--background); border: 2px solid var(--primary); }
.kg-vj-seg { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); padding: 2px; gap: 2px; border-radius: var(--kg-r); background: var(--muted); }
.kg-vj-seg button { padding: 4px 6px; border-radius: calc(var(--kg-r) - 2px); text-align: center; color: var(--muted-foreground); }
.kg-vj-seg button[aria-pressed="true"] { background: var(--background); color: var(--foreground); box-shadow: 0 1px 2px rgb(0 0 0 / 0.12); }
.kg-vj-segrow { display: grid; grid-template-columns: 96px minmax(0, 1fr); align-items: center; gap: 8px; }
.kg-vj-segrow > span { color: var(--muted-foreground); }
.kg-vj-colors { display: flex; gap: 8px; }
.kg-vj-color { flex: 1; display: flex; align-items: center; gap: 8px; padding: 4px 6px; border: 1px solid var(--input); border-radius: calc(var(--kg-r) - 2px); background: var(--background); color: var(--muted-foreground); }
.kg-vj-color input { width: 20px; height: 20px; padding: 0; border: 0; border-radius: 4px; background: none; cursor: pointer; }
.kg-vj-hint { color: var(--muted-foreground); font-size: 11px; }
`;

const OVERLAY_CSS = `
.kg-vj-face { position: absolute; pointer-events: auto; cursor: grab; border: 2px solid #2f6bff; border-radius: 6%; background: rgb(47 107 255 / 0.08); touch-action: none; user-select: none; -webkit-user-select: none; }
.kg-vj-face[data-drag], .kg-vj-dot[data-drag] { cursor: grabbing; }
.kg-vj-tag { position: absolute; left: -2px; bottom: 100%; margin-bottom: 4px; padding: 3px 8px; border-radius: 4px; background: #2f6bff; color: #fff; font: 600 22px/1.2 system-ui, sans-serif; white-space: nowrap; pointer-events: none; }
.kg-vj-grip { position: absolute; width: 26px; height: 26px; border-radius: 50%; background: #fff; border: 3px solid #2f6bff; box-shadow: 0 2px 6px rgb(0 0 0 / 0.35); cursor: nwse-resize; }
.kg-vj-dot { position: absolute; width: 44px; height: 44px; margin: -22px 0 0 -22px; pointer-events: auto; cursor: grab; border-radius: 50%; border: 3px solid #2f6bff; background: rgb(47 107 255 / 0.15); touch-action: none; }
.kg-vj-dot::before, .kg-vj-dot::after { content: ''; position: absolute; background: #2f6bff; }
.kg-vj-dot::before { left: 50%; top: -14px; bottom: -14px; width: 2px; margin-left: -1px; }
.kg-vj-dot::after { top: 50%; left: -14px; right: -14px; height: 2px; margin-top: -1px; }
`;

// ---- small DOM helpers ----

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round = (v: number, d: number) => Number(v.toFixed(d));
const decimals = (step: number) => (step >= 1 ? 0 : step >= 0.1 ? 1 : step >= 0.01 ? 2 : 3);
const fillRange = (r: HTMLInputElement) => {
  const min = Number(r.min);
  const span = Number(r.max) - min || 1;
  r.style.setProperty('--fill', `${clamp(((Number(r.value) - min) / span) * 100, 0, 100).toFixed(1)}%`);
};
const props = (schema: Json | undefined): Json => (schema?.properties as Json | undefined) ?? {};
const hex = (v: unknown, dflt: string) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : dflt);

function section(root: HTMLElement, title: string): HTMLElement {
  const s = el('div', 'kg-vj-sec');
  s.append(el('div', 'kg-vj-h', title));
  root.append(s);
  return s;
}

/** A labelled slider. `get` reads the value shown, `set` writes it. Returns a function that refreshes it. */
function slider(into: HTMLElement, label: string, field: Json | undefined, range: [number, number, number], get: () => number, set: (v: number) => void): () => void {
  const [lo, hi, step] = range;
  const row = el('div', 'kg-vj-row');
  const lab = el('label', undefined, label);
  const input = el('input');
  input.type = 'range';
  input.min = String(field?.minimum ?? lo);
  input.max = String(field?.maximum ?? hi);
  input.step = String(step);
  input.id = `kg-vj-${Math.random().toString(36).slice(2)}`;
  lab.htmlFor = input.id;
  const num = el('span', 'kg-vj-num');
  input.addEventListener('input', () => set(Number(input.value)));
  row.append(lab, input, num);
  into.append(row);
  return () => {
    const v = get();
    input.value = String(v);
    fillRange(input);
    num.textContent = v.toFixed(decimals(step));
  };
}

/** A labelled segmented choice. Returns a refresher. */
function segmented(into: HTMLElement, label: string, options: string[], get: () => string, set: (v: string) => void): () => void {
  const row = el('div', 'kg-vj-segrow');
  const seg = el('div', 'kg-vj-seg');
  const btns = options.map((o) => {
    const b = el('button', undefined, o);
    b.type = 'button';
    b.addEventListener('click', () => set(o));
    seg.append(b);
    return b;
  });
  row.append(el('span', undefined, label), seg);
  into.append(row);
  return () => btns.forEach((b, i) => b.setAttribute('aria-pressed', String(options[i] === get())));
}

function colors(into: HTMLElement, list: [string, string, () => string, (v: string) => void][]): () => void {
  const wrap = el('div', 'kg-vj-colors');
  const inputs = list.map(([label, dflt, get, set]) => {
    const w = el('label', 'kg-vj-color');
    const i = el('input');
    i.type = 'color';
    i.addEventListener('input', () => set(i.value));
    w.append(i, el('span', undefined, label));
    wrap.append(w);
    return { i, dflt, get };
  });
  into.append(wrap);
  return () => inputs.forEach(({ i, dflt, get }) => { i.value = hex(get(), dflt); });
}

/** Pointer drag in composition pixels: `move(dx, dy)` with the offset since the press. */
function dragger(target: HTMLElement, preview: () => PanelPreview) {
  let stop: (() => void) | null = null;
  const start = (e: PointerEvent, move: (dx: number, dy: number) => void) => {
    e.preventDefault();
    e.stopPropagation();
    stop?.();
    const p = preview();
    const r = p.overlay.getBoundingClientRect();
    const sc = r.width > 0 && p.width > 0 ? r.width / p.width : 1;
    const x0 = e.clientX, y0 = e.clientY;
    target.dataset.drag = '1';
    const onMove = (m: PointerEvent) => move((m.clientX - x0) / sc, (m.clientY - y0) / sc);
    const onUp = () => stop?.();
    stop = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      delete target.dataset.drag;
      stop = null;
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  };
  return { start, stop: () => stop?.() };
}

// ---- the look view ----

type Kind = 'none' | 'crt' | 'vhs' | 'oneBit' | 'thermal' | 'depth' | 'pixels' | 'glow' | 'acid' | 'night' | 'grainy' | 'halftone';
const KINDS: [Kind, string][] = [['none', 'None'], ['crt', 'CRT'], ['vhs', 'VHS'], ['oneBit', '1-bit'], ['thermal', 'Thermal'], ['depth', 'Depth'], ['pixels', 'Pixels'],
  ['glow', 'Glow'], ['acid', 'Acid heat'], ['night', 'Night vision'], ['grainy', 'Grainy B&W'], ['halftone', 'Halftone']];

/** Each look's sliders: field, label, [min, max, step] (the schema's bounds win), default. */
const SLIDERS: Record<string, [string, string, [number, number, number], number][]> = {
  crt: [
    ['curve', 'Curve', [0, 0.3, 0.005], 0.06], ['pitch', 'Line pitch', [1, 12, 0.5], 4], ['scan', 'Scanlines', [0, 1, 0.01], 0.7],
    ['grille', 'Grille size', [1, 6, 1], 1], ['mask', 'Grille', [0, 1, 0.01], 0.35], ['conv', 'Convergence', [0, 8, 0.1], 1.2],
    ['noise', 'Static', [0, 0.2, 0.005], 0.025], ['glass', 'Glass', [0, 2, 0.05], 1], ['off', 'Switch off', [0, 1, 0.01], 0],
  ],
  vhs: [
    ['track', 'Tracking', [0, 1, 0.01], 0.3], ['trackAt', 'Band height', [0, 1, 0.01], 0.8], ['trackW', 'Band size', [5, 200, 1], 30],
    ['bleed', 'Colour smear', [0, 40, 0.5], 14], ['delay', 'Colour delay', [0, 20, 0.5], 4], ['sat', 'Saturation', [0, 2, 0.05], 0.85],
    ['jitter', 'Jitter', [0, 6, 0.1], 1.2], ['wobble', 'Wobble', [0, 6, 0.1], 1.5], ['snow', 'Snow', [0, 0.4, 0.01], 0.06],
    ['drops', 'Dropouts', [0, 0.05, 0.001], 0.004],
  ],
  oneBit: [['size', 'Cell', [1, 8, 0.5], 3], ['punch', 'Contrast', [0.5, 3, 0.05], 1.6]],
  thermal: [['soft', 'Softness', [0, 20, 0.5], 3]],
  depth: [['soft', 'Softness', [0, 30, 0.5], 9], ['punch', 'Contrast', [0.5, 3, 0.05], 1.5]],
  pixels: [['zoom', 'Zoom', [1, 40, 0.5], 8]],
  glow: [['v', 'Variant', [1, 8, 1], 1]],
  acid: [['v', 'Variant', [1, 4, 1], 1]],
  night: [['v', 'Variant', [1, 6, 1], 1]],
  grainy: [['v', 'Variant', [1, 6, 1], 1]],
  halftone: [['size', 'Dot size', [3, 40, 0.5], 10], ['angle', 'Angle', [0, 90, 1], 45], ['punch', 'Contrast', [0.5, 4, 0.05], 1.6], ['bias', 'Ink', [-0.5, 0.5, 0.01], 0]],
};
const IRON = ['#04000f', '#2a0a6e', '#8a1197', '#d8333e', '#f77f1f', '#fcd44a', '#fffbe0'];
const RAINBOW = ['#050a40', '#1336c8', '#14c6e0', '#3ee05a', '#f4e83a', '#f0461e', '#fff4f0'];
const ramp = (stops: string[]) => `linear-gradient(90deg, ${stops.join(', ')})`;

/** A look's swatch: a small drawing of what it does to a picture. */
function swatch(kind: Kind): HTMLElement {
  const s = el('div', 'kg-vj-swatch');
  const scene = 'radial-gradient(circle at 35% 45%, #f2d2b0 0 18%, transparent 19%), linear-gradient(180deg, #6fa8dc 0 55%, #4b7b3a 55%)';
  switch (kind) {
    case 'none':
      s.style.background = scene;
      break;
    case 'crt':
      s.style.background = `repeating-linear-gradient(180deg, rgb(0 0 0 / 0.55) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgb(255 0 0 / 0.12) 0 1px, rgb(0 255 0 / 0.12) 1px 2px, rgb(0 0 255 / 0.12) 2px 3px), ${scene}`;
      s.style.borderRadius = '10px / 18px';
      s.style.boxShadow = 'inset 0 0 12px rgb(0 0 0 / 0.75)';
      break;
    case 'vhs':
      s.style.background = 'linear-gradient(180deg, transparent 62%, rgb(255 255 255 / 0.35) 63% 66%, transparent 67%), linear-gradient(90deg, #c0c0c0 0 14%, #c0c000 14% 28%, #00c0c0 28% 42%, #00c000 42% 57%, #c000c0 57% 71%, #c00000 71% 85%, #0000c0 85%)';
      s.style.filter = 'blur(0.6px) saturate(0.8)';
      break;
    case 'oneBit':
      s.style.background = 'radial-gradient(circle, #050605 0.9px, transparent 1.1px) 0 0 / 3px 3px, linear-gradient(90deg, #d9ecd9, #d9ecd9 40%, #050605)';
      break;
    case 'halftone':
      s.style.background = 'radial-gradient(circle, #1d3fd1 1.6px, transparent 1.9px) 0 0 / 5px 5px, #f4d63a';
      break;
    case 'thermal':
      s.style.background = `radial-gradient(circle at 35% 45%, #fffbe0 0 8%, #fcd44a 12%, #d8333e 20%, transparent 30%), ${ramp(IRON.slice(0, 4))}`;
      break;
    case 'depth':
      s.style.background = 'radial-gradient(ellipse at 40% 60%, #f2f2f2 0 15%, #5c5c5c 40%, #000 80%)';
      break;
    case 'pixels':
      s.style.background = 'repeating-linear-gradient(90deg, #ff3030 0 4px, #30ff30 4px 8px, #3060ff 8px 12px), #000';
      s.style.maskImage = 'repeating-linear-gradient(180deg, #000 0 10px, transparent 10px 12px)';
      break;
    case 'glow':
      s.style.background = 'radial-gradient(circle at 45% 50%, #f2fbff 0 14%, #46b4ff 30%, transparent 55%), linear-gradient(180deg, #3a2a8a, #0a1450)';
      s.style.filter = 'blur(0.4px)';
      break;
    case 'acid':
      s.style.background = 'radial-gradient(ellipse at 45% 50%, #ffffff 0 10%, #3c6cff 22%, #ff4ad8 40%, #ff9a2a 60%, #ff60c0 80%)';
      break;
    case 'night':
      s.style.background = 'radial-gradient(circle at 40% 45%, #e8ffd8 0 10%, #8cee6c 22%, #3c9430 45%, #0b1d0b 85%)';
      s.style.filter = 'blur(0.5px)';
      break;
    case 'grainy':
      s.style.background = 'radial-gradient(circle at 40% 45%, #000 0 22%, transparent 23%), linear-gradient(90deg, #fff 0 60%, #000 60%)';
      break;
  }
  return s;
}

function mountLook(host: HTMLElement, initial: PanelContext): Mounted {
  let ctx = initial;
  let preview = initial.preview;
  const value = (): Json => (ctx.value && typeof ctx.value === 'object' ? (ctx.value as Json) : {});
  const kind = (): Kind => (value().kind as Kind) ?? 'none';
  const sub = (k: string): Json => (value()[k] as Json | undefined) ?? {};
  const set = (next: Json) => {
    ctx = { ...ctx, value: next };
    sync();
    ctx.onChange(next);
  };
  const patchSub = (k: string, p: Json) => set({ ...value(), [k]: { ...sub(k), ...p } });
  const schemaOf = (k: string) => props(props(ctx.schema)[k]);

  const root = el('div', 'kg-vj');
  root.append(el('style', undefined, CSS));
  const cards = el('div', 'kg-vj-cards');
  const cardOf = new Map<Kind, HTMLButtonElement>();
  for (const [k, name] of KINDS) {
    const b = el('button', 'kg-vj-card');
    b.type = 'button';
    b.dataset.kind = k;
    b.title = k === 'none' ? 'No look' : `Use the ${name} look`;
    b.append(swatch(k), el('span', 'kg-vj-name', name));
    b.addEventListener('click', () => set({ ...value(), kind: k }));
    cards.append(b);
    cardOf.set(k, b);
  }
  section(root, 'Look').append(cards);

  // one settings group per look, shown when it is on
  const groups = new Map<Kind, HTMLElement>();
  const refresh: (() => void)[] = [];
  const hint = el('div', 'kg-vj-hint');
  for (const [k, name] of KINDS) {
    if (k === 'none') continue;
    const g = section(root, name);
    groups.set(k, g);
    for (const [f, label, range, dflt] of SLIDERS[k] ?? []) {
      refresh.push(slider(g, label, schemaOf(k)[f], range, () => Number(sub(k)[f] ?? dflt), (v) => patchSub(k, { [f]: v })));
    }
    if (k === 'oneBit') {
      refresh.push(colors(g, [
        ['Ink', '#050605', () => sub('oneBit').ink, (v) => patchSub('oneBit', { ink: v })],
        ['Paper', '#d9ecd9', () => sub('oneBit').paper, (v) => patchSub('oneBit', { paper: v })],
      ]));
    }
    if (k === 'halftone') {
      refresh.push(segmented(g, 'Shape', ['circle', 'line', 'square'], () => String(sub('halftone').shape ?? 'circle'), (v) => patchSub('halftone', { shape: v })));
      refresh.push(colors(g, [
        ['Ink', '#1d3fd1', () => sub('halftone').ink, (v) => patchSub('halftone', { ink: v })],
        ['Paper', '#f4d63a', () => sub('halftone').paper, (v) => patchSub('halftone', { paper: v })],
      ]));
    }
    if (k === 'thermal') {
      refresh.push(segmented(g, 'Palette', ['iron', 'rainbow'], () => String(sub('thermal').palette ?? 'iron'), (v) => patchSub('thermal', { palette: v })));
    }
    if (k === 'crt' || k === 'pixels') g.append(hint);
  }
  host.append(root);

  // on the preview: the CRT's face (move, resize from the corner), the magnifier's centre
  let style: HTMLStyleElement | null = null;
  let face: HTMLElement | null = null;
  let dot: HTMLElement | null = null;
  let tag: HTMLElement;
  let faceDrag: ReturnType<typeof dragger> | null = null;
  let dotDrag: ReturnType<typeof dragger> | null = null;
  const crtBox = () => {
    const p = preview!, c = sub('crt');
    return { cx: c.cx ?? p.width / 2, cy: c.cy ?? p.height / 2, hw: c.hw ?? p.width / 2, hh: c.hh ?? p.height / 2 };
  };
  const zoomAt = () => ({ cx: sub('pixels').cx ?? preview!.width / 2, cy: sub('pixels').cy ?? preview!.height / 2 });

  function build() {
    if (!preview) return;
    style = el('style', undefined, OVERLAY_CSS);
    face = el('div', 'kg-vj-face');
    face.dataset.role = 'crt-face';
    tag = el('div', 'kg-vj-tag');
    const grip = el('div', 'kg-vj-grip');
    grip.dataset.role = 'crt-resize';
    face.append(tag, grip);
    dot = el('div', 'kg-vj-dot');
    dot.dataset.role = 'zoom-centre';
    preview.overlay.append(style, face, dot);
    faceDrag = dragger(face, () => preview!);
    dotDrag = dragger(dot, () => preview!);
    face.addEventListener('pointerdown', (e) => {
      if (e.target !== face && e.target !== tag) return;
      const b = crtBox();
      faceDrag!.start(e, (dx, dy) => patchSub('crt', { cx: Math.round(b.cx + dx), cy: Math.round(b.cy + dy) }));
    });
    grip.addEventListener('pointerdown', (e) => {
      const b = crtBox();
      faceDrag!.start(e, (dx, dy) => patchSub('crt', { cx: Math.round(b.cx), cy: Math.round(b.cy), hw: Math.round(Math.max(20, b.hw + dx)), hh: Math.round(Math.max(20, b.hh + dy)) }));
    });
    dot.addEventListener('pointerdown', (e) => {
      const z = zoomAt();
      dotDrag!.start(e, (dx, dy) => {
        const p = preview!;
        patchSub('pixels', { cx: Math.round(clamp(z.cx + dx, 0, p.width)), cy: Math.round(clamp(z.cy + dy, 0, p.height)) });
      });
    });
  }
  function teardown() {
    faceDrag?.stop();
    dotDrag?.stop();
    style?.remove();
    face?.remove();
    dot?.remove();
    style = face = dot = null;
  }
  function draw() {
    if (!preview || !face || !dot) return;
    const k = kind();
    face.style.display = k === 'crt' ? '' : 'none';
    dot.style.display = k === 'pixels' ? '' : 'none';
    const b = crtBox();
    Object.assign(face.style, { left: `${b.cx - b.hw}px`, top: `${b.cy - b.hh}px`, width: `${2 * b.hw}px`, height: `${2 * b.hh}px` });
    const grip = face.querySelector<HTMLElement>('.kg-vj-grip')!;
    Object.assign(grip.style, { right: '-13px', bottom: '-13px' });
    tag.textContent = `tube  ${Math.round(2 * b.hw)} x ${Math.round(2 * b.hh)}`;
    const z = zoomAt();
    Object.assign(dot.style, { left: `${z.cx}px`, top: `${z.cy}px` });
  }

  function sync() {
    const k = kind();
    for (const [name, b] of cardOf) b.setAttribute('aria-pressed', String(name === k));
    for (const [name, g] of groups) g.style.display = name === k ? '' : 'none';
    refresh.forEach((r) => r());
    hint.textContent = !preview ? '' : k === 'crt' ? "Drag the box on the preview to place the tube's face; drag its corner to size it." : 'Drag the cross on the preview to move the magnifier.';
    draw();
  }

  build();
  sync();
  return {
    update(next) {
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

// ---- the blobs view ----

const BLOB_DEFAULTS: Json = { box: 'frame', label: 'both', links: 'nearest', blend: 'normal', reach: 0.3, invert: 0, min: 0, max: 60, color: '#ffffff', stroke: 1.5, fontSize: 14 };

function mountBlobs(host: HTMLElement, initial: PanelContext): Mounted {
  let ctx = initial;
  const value = (): Json => (ctx.value && typeof ctx.value === 'object' ? (ctx.value as Json) : {});
  const get = (k: string) => value()[k] ?? BLOB_DEFAULTS[k];
  const patch = (p: Json) => {
    ctx = { ...ctx, value: { ...value(), ...p } };
    sync();
    ctx.onChange(ctx.value);
  };
  const fields = () => props(ctx.schema);
  const root = el('div', 'kg-vj');
  root.append(el('style', undefined, CSS));
  const refresh: (() => void)[] = [];

  const marks = section(root, 'Marks');
  refresh.push(segmented(marks, 'Box', ['frame', 'corners', 'cross', 'none'], () => get('box'), (v) => patch({ box: v })));
  refresh.push(segmented(marks, 'Label', ['both', 'id', 'xy', 'none'], () => get('label'), (v) => patch({ label: v })));
  refresh.push(segmented(marks, 'Links', ['nearest', 'chain', 'all', 'none'], () => get('links'), (v) => patch({ links: v })));
  refresh.push(segmented(marks, 'Blend', ['normal', 'difference'], () => get('blend'), (v) => patch({ blend: v })));

  const amount = section(root, 'Which blobs');
  refresh.push(slider(amount, 'Most blobs', fields().max, [1, 60, 1], () => Number(get('max')), (v) => patch({ max: v })));
  refresh.push(slider(amount, 'Smallest', fields().min, [0, 0.05, 0.001], () => Number(get('min')), (v) => patch({ min: v })));
  refresh.push(slider(amount, 'Link reach', fields().reach, [0.05, 1, 0.01], () => Number(get('reach')), (v) => patch({ reach: v })));
  refresh.push(slider(amount, 'Inverted', fields().invert, [0, 1, 0.01], () => Number(get('invert')), (v) => patch({ invert: v })));

  const style = section(root, 'Style');
  refresh.push(slider(style, 'Line width', fields().stroke, [0.5, 6, 0.1], () => Number(get('stroke')), (v) => patch({ stroke: v })));
  refresh.push(slider(style, 'Label size', fields().fontSize, [8, 40, 1], () => Number(get('fontSize')), (v) => patch({ fontSize: v })));
  refresh.push(colors(style, [['Colour', '#ffffff', () => get('color'), (v) => patch({ color: v })]]));
  const note = el('div', 'kg-vj-hint', 'The blobs themselves come from tools/blobs.mjs, run once on the clip; this sets only how they are drawn.');
  style.append(note);
  host.append(root);

  function sync() {
    refresh.forEach((r) => r());
  }
  sync();
  return {
    update(next) {
      ctx = next;
      sync();
    },
    unmount() {
      root.remove();
    },
  };
}

export function mount(host: HTMLElement, initial: PanelContext): Mounted {
  // Studio may keep the panel mounted across compositions and only call `update` with another field's schema, so the
  // view is picked again on every update and swapped when it changes.
  const viewOf = (ctx: PanelContext) => (ctx.schema.kinetographView === 'blobs' ? 'blobs' : 'look');
  const open = (ctx: PanelContext) => (viewOf(ctx) === 'blobs' ? mountBlobs(host, ctx) : mountLook(host, ctx));
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

/** One line for the folded card in Studio. */
export function summary(value: unknown): string {
  if (typeof value !== 'object' || value === null) return '';
  const v = value as Json;
  if (typeof v.kind === 'string') return KINDS.find(([k]) => k === v.kind)?.[1] ?? v.kind;
  const parts = [v.box, v.links && `${v.links} links`, typeof v.max === 'number' && `max ${v.max}`].filter(Boolean);
  return parts.join(', ');
}
