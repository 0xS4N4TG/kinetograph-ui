// Hexed's panel for Kinetograph Studio's Props tab. Framework-free DOM; one card per slot with the gene, the amount, a
// lock and a seed readout (click to copy), plus a Shuffle button, a shuffle per slot and a preset menu. Styled with
// Studio's shadcn-style CSS variables only. It imports only browser-safe modules (roll.ts, slots.ts and the preset table),
// never the engine. Gene lists come from the field's JSON Schema, which is built from the plugin's gene tables.

import { PRESETS } from '../presets/index.js';
import { rollGenome } from '../src/roll.js';
import type { Genome, Strand } from '../src/roll.js';
import type { Slot } from '../src/slots.js';

export interface PanelContext {
  value: unknown;
  schema: Record<string, unknown>;
  path: string[];
  onChange(value: unknown): void;
  /** Panel-only state Studio kept across reloads (optional: older Studios send none). */
  state?: unknown;
  setState?(state: unknown): void;
}

type Json = Record<string, any>;

const CSS = `
.kg-hexed { --kg-r: var(--radius, 0.5rem); font: 12px/1.4 system-ui, sans-serif; color: var(--foreground); display: flex; flex-direction: column; gap: 10px; position: relative; }
.kg-hexed * { box-sizing: border-box; }
.kg-hexed button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
.kg-hexed button:focus-visible, .kg-hexed input:focus-visible { outline: 2px solid var(--ring, var(--primary)); outline-offset: 1px; }
.kg-hexed svg { width: 14px; height: 14px; flex: none; }
.kg-hexed-bar { display: flex; gap: 6px; align-items: center; }
.kg-hexed .kg-hexed-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 28px; padding: 0 10px; border-radius: calc(var(--kg-r) - 2px); font-weight: 500; white-space: nowrap; transition: background-color 0.12s, color 0.12s, border-color 0.12s; }
/* Shuffle sits beside the preset menu, so it takes the menu's outline look and height; a filled primary button reads as
   a bright white slab on dark themes. */
.kg-hexed .kg-hexed-shuffle { flex: none; padding: 0 12px 0 10px; border: 1px solid var(--input); background: var(--background); color: var(--foreground); box-shadow: 0 1px 1px rgb(0 0 0 / 0.04); }
.kg-hexed .kg-hexed-shuffle:hover { background: var(--accent); border-color: color-mix(in srgb, var(--foreground) 30%, var(--input)); }
.kg-hexed .kg-hexed-shuffle:active { transform: translateY(1px); }
.kg-hexed-ghost { width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; border-radius: calc(var(--kg-r) - 3px); color: var(--muted-foreground); transition: background-color 0.12s, color 0.12s; }
.kg-hexed-ghost:hover { background: var(--accent); color: var(--foreground); }
.kg-hexed .kg-hexed-lock[aria-pressed="true"] { color: var(--primary); background: color-mix(in srgb, var(--primary) 14%, transparent); }
.kg-hexed-list { display: flex; flex-direction: column; gap: 6px; }
.kg-hexed-row { display: grid; gap: 6px; padding: 8px; border: 1px solid var(--border); border-radius: var(--kg-r); background: var(--background); transition: border-color 0.12s, background-color 0.12s; }
.kg-hexed-row[data-locked="true"] { border-color: color-mix(in srgb, var(--primary) 55%, var(--border)); background: color-mix(in srgb, var(--primary) 6%, var(--background)); box-shadow: inset 2px 0 0 var(--primary); }
.kg-hexed-head { display: flex; align-items: center; gap: 4px; min-width: 0; }
.kg-hexed-slot { font-weight: 600; text-transform: capitalize; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; padding-left: 2px; }
.kg-hexed .kg-hexed-seed { font: 11px/1 ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--muted-foreground); padding: 4px 6px; border-radius: calc(var(--kg-r) - 3px); background: var(--muted); font-variant-numeric: tabular-nums; min-width: calc(10ch + 12px); text-align: center; } /* a seed is up to 10 digits; one width keeps every row's chip and dice lined up */
.kg-hexed .kg-hexed-seed:hover { color: var(--foreground); }
.kg-hexed .kg-hexed-seed[data-copied="true"] { color: var(--primary); }
.kg-hexed-ctl { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; align-items: center; }
.kg-hexed-amt { display: flex; align-items: center; gap: 6px; min-width: 0; }
.kg-hexed-num { color: var(--muted-foreground); text-align: right; font-variant-numeric: tabular-nums; width: 28px; flex: none; }
.kg-hexed-sel { position: relative; min-width: 0; }
.kg-hexed-sel.kg-hexed-grow { flex: 1; }
.kg-hexed .kg-hexed-trigger { width: 100%; height: 28px; display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 0 8px; text-align: left; border: 1px solid var(--input); border-radius: calc(var(--kg-r) - 2px); background: var(--background); box-shadow: 0 1px 1px rgb(0 0 0 / 0.04); transition: border-color 0.12s; }
.kg-hexed .kg-hexed-trigger:hover { border-color: color-mix(in srgb, var(--foreground) 30%, var(--input)); }
.kg-hexed .kg-hexed-trigger[aria-expanded="true"] { border-color: var(--ring, var(--primary)); }
.kg-hexed-trigger > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kg-hexed-trigger .kg-hexed-ph { color: var(--muted-foreground); }
.kg-hexed-trigger svg { width: 12px; height: 12px; color: var(--muted-foreground); }
.kg-hexed-pop { position: fixed; z-index: 2147483000; max-height: 240px; overflow: auto; padding: 4px; border: 1px solid var(--border); border-radius: var(--kg-r); background: var(--background); color: var(--foreground); box-shadow: 0 8px 24px rgb(0 0 0 / 0.18); }
.kg-hexed-pop[hidden] { display: none; }
.kg-hexed .kg-hexed-opt { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; padding: 5px 8px; text-align: left; border-radius: calc(var(--kg-r) - 4px); white-space: nowrap; }
.kg-hexed-opt:hover, .kg-hexed-opt[data-active="true"] { background: var(--accent); }
.kg-hexed-opt svg { width: 12px; height: 12px; color: var(--primary); visibility: hidden; }
.kg-hexed-opt[aria-selected="true"] svg { visibility: visible; }
.kg-hexed input[type=range] { --fill: 50%; width: 100%; min-width: 0; height: 16px; margin: 0; background: transparent; cursor: pointer; -webkit-appearance: none; appearance: none; }
.kg-hexed input[type=range]::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: linear-gradient(to right, var(--primary) var(--fill), var(--input) var(--fill)); }
.kg-hexed input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; margin-top: -4px; border-radius: 50%; background: var(--background); border: 2px solid var(--primary); box-shadow: 0 1px 2px rgb(0 0 0 / 0.2); }
.kg-hexed input[type=range]::-moz-range-track { height: 4px; border-radius: 2px; background: var(--input); }
.kg-hexed input[type=range]::-moz-range-progress { height: 4px; border-radius: 2px; background: var(--primary); }
.kg-hexed input[type=range]::-moz-range-thumb { width: 8px; height: 8px; border-radius: 50%; background: var(--background); border: 2px solid var(--primary); }
`;

const svg = (inner: string, fill = 'none') =>
  `<svg viewBox="0 0 16 16" fill="${fill}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
/** A die: a square with pips. */
const DICE = svg('<rect x="2" y="2" width="12" height="12" rx="2.5"/><circle cx="5.5" cy="5.5" r="0.9" fill="currentColor" stroke="none"/><circle cx="10.5" cy="5.5" r="0.9" fill="currentColor" stroke="none"/><circle cx="8" cy="8" r="0.9" fill="currentColor" stroke="none"/><circle cx="5.5" cy="10.5" r="0.9" fill="currentColor" stroke="none"/><circle cx="10.5" cy="10.5" r="0.9" fill="currentColor" stroke="none"/>');
const LOCKED = svg('<rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/>');
const UNLOCKED = svg('<rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5 7V5a3 3 0 0 1 5.6-1.5"/>');
const CHEVRON = svg('<path d="M4 6l4 4 4-4"/>');
const CHECK = svg('<path d="M3.5 8.5l3 3 6-7"/>');

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** The slot names in schema order. */
function slotsOf(schema: Json): Slot[] {
  return Object.keys((schema.properties as Json) ?? {}) as Slot[];
}

/** The gene ids a slot may hold, from the schema's enum (directly, or inside a union). */
function genesFrom(schema: Json, slot: string): string[] {
  const gene = schema.properties?.[slot]?.properties?.gene as Json | undefined;
  if (!gene) return [];
  if (Array.isArray(gene.enum)) return gene.enum;
  for (const part of (gene.anyOf as Json[] | undefined) ?? []) if (Array.isArray(part.enum)) return part.enum;
  return [];
}

const freshSeed = () => Math.floor(Math.random() * 4294967296);

const isGenome = (v: unknown, slots: string[]): v is Genome => !!v && typeof v === 'object' && slots.every((s) => !!(v as Json)[s]);

/** Copies text; falls back to a hidden textarea where the clipboard API is missing or refused. */
function copyText(text: string) {
  const fallback = () => {
    const t = document.createElement('textarea');
    t.value = text;
    t.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.append(t);
    t.select();
    try {
      document.execCommand('copy');
    } catch {
      /* nothing more to try */
    }
    t.remove();
  };
  try {
    const p = navigator.clipboard?.writeText(text);
    if (p) p.catch(fallback);
    else fallback();
  } catch {
    fallback();
  }
}

/** A custom select: a trigger button and a popover list (a listbox of buttons), styled like coss ui's. */
interface Select {
  root: HTMLElement;
  trigger: HTMLButtonElement;
  set(options: string[], value: string, placeholder?: string): void;
  value: string;
  destroy(): void;
}

function makeSelect(label: string, onPick: (value: string) => void, close: Set<() => void>): Select {
  const root = el('div', 'kg-hexed-sel');
  const trigger = el('button', 'kg-hexed-trigger');
  trigger.type = 'button';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-label', label);
  const text = el('span');
  trigger.append(text);
  trigger.insertAdjacentHTML('beforeend', CHEVRON);
  const pop = el('div', 'kg-hexed-pop');
  pop.setAttribute('role', 'listbox');
  pop.hidden = true;
  root.append(trigger, pop);

  let options: string[] = [];
  let placeholder = '';
  let active = -1;
  const s: Select = {
    root,
    trigger,
    value: '',
    set(opts, value, ph = '') {
      options = opts;
      placeholder = ph;
      s.value = value;
      text.textContent = value || placeholder;
      text.className = value ? '' : 'kg-hexed-ph';
      pop.replaceChildren(
        ...options.map((o, i) => {
          const b = el('button', 'kg-hexed-opt');
          b.type = 'button';
          b.dataset.value = o;
          b.setAttribute('role', 'option');
          b.setAttribute('aria-selected', String(o === value));
          b.append(el('span', undefined, o));
          b.insertAdjacentHTML('beforeend', CHECK);
          b.addEventListener('click', () => {
            shut();
            onPick(o);
          });
          b.addEventListener('mouseenter', () => mark(i));
          return b;
        }),
      );
    },
    destroy() {
      close.delete(shut);
      document.removeEventListener('pointerdown', outside, true);
    },
  };
  const items = () => Array.from(pop.children) as HTMLElement[];
  function mark(i: number) {
    active = i;
    items().forEach((b, j) => b.toggleAttribute('data-active', j === i));
    if (i >= 0) items()[i]?.scrollIntoView?.({ block: 'nearest' });
  }
  function outside(e: Event) {
    if (!root.contains(e.target as Node)) shut();
  }
  function shut() {
    if (pop.hidden) return;
    pop.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', outside, true);
  }
  function open() {
    for (const c of close) if (c !== shut) c(); // one list open at a time
    const r = trigger.getBoundingClientRect();
    pop.hidden = false;
    pop.style.left = `${r.left}px`;
    pop.style.minWidth = `${r.width}px`;
    const below = window.innerHeight - r.bottom;
    if (below < 200 && r.top > below) {
      pop.style.top = '';
      pop.style.bottom = `${window.innerHeight - r.top + 4}px`;
    } else {
      pop.style.bottom = '';
      pop.style.top = `${r.bottom + 4}px`;
    }
    trigger.setAttribute('aria-expanded', 'true');
    mark(Math.max(0, options.indexOf(s.value)));
    document.addEventListener('pointerdown', outside, true);
  }
  close.add(shut);
  trigger.addEventListener('click', () => (pop.hidden ? open() : shut()));
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') shut();
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (pop.hidden) open();
      else mark(Math.min(options.length - 1, Math.max(0, active + (e.key === 'ArrowDown' ? 1 : -1))));
    } else if ((e.key === 'Enter' || e.key === ' ') && !pop.hidden && active >= 0) {
      e.preventDefault();
      const o = options[active];
      shut();
      onPick(o);
    }
  });
  return s;
}

/** Fills the range's track up to its value (read by the track's gradient). */
const fillRange = (r: HTMLInputElement) => r.style.setProperty('--fill', `${Math.round(Number(r.value) * 100)}%`);

export function mount(el0: HTMLElement, initial: PanelContext): { update(ctx: PanelContext): void; unmount(): void } {
  let ctx = initial;
  // The locks come back after a reload: Studio keeps what `setState` is given.
  const saved = (initial.state as { locked?: unknown } | undefined)?.locked;
  const locked = new Set<string>(Array.isArray(saved) ? saved.filter((s): s is string => typeof s === 'string') : []);
  let savedLocks = [...locked].sort().join();
  const closers = new Set<() => void>();
  const selects: Select[] = [];
  const rows = new Map<string, { card: HTMLElement; gene: Select; amount: HTMLInputElement; num: HTMLElement; lock: HTMLButtonElement; seed: HTMLButtonElement }>();

  const root = el('div', 'kg-hexed');
  const style = el('style', undefined, CSS);
  const bar = el('div', 'kg-hexed-bar');
  const shuffle = el('button', 'kg-hexed-btn kg-hexed-shuffle');
  shuffle.type = 'button';
  shuffle.title = 'Roll the unlocked slots with a fresh seed';
  shuffle.innerHTML = `${DICE}<span>Shuffle</span>`;
  const preset = makeSelect('Preset', (name) => {
    const p = PRESETS[name];
    if (p) emit(p);
  }, closers);
  preset.root.classList.add('kg-hexed-grow');
  preset.trigger.classList.add('kg-hexed-preset');
  preset.trigger.title = 'Load a saved look';
  selects.push(preset);
  bar.append(shuffle, preset.root);
  const list = el('div', 'kg-hexed-list');
  root.append(style, bar, list);
  el0.append(root);

  const slots = () => slotsOf(ctx.schema);
  const genes = (slot: string) => genesFrom(ctx.schema, slot);
  const current = (): Genome => {
    if (isGenome(ctx.value, slots())) return ctx.value;
    return rollGenome(1, {}, (s) => genes(s)); // nothing set yet: show a roll so the rows have something to hold
  };
  const emit = (g: Genome) => ctx.onChange(g);

  function build() {
    for (const s of selects.splice(1)) s.destroy(); // keep the preset select
    list.replaceChildren();
    rows.clear();
    for (const slot of slots()) {
      const card = el('div', 'kg-hexed-row');
      const lock = el('button', 'kg-hexed-ghost kg-hexed-lock');
      lock.type = 'button';
      lock.title = `Keep ${slot} when shuffling`;
      lock.setAttribute('aria-label', `Lock ${slot}`);
      lock.addEventListener('click', () => {
        if (locked.has(slot)) locked.delete(slot);
        else locked.add(slot);
        sync();
      });
      const name = el('span', 'kg-hexed-slot', slot);
      const seed = el('button', 'kg-hexed-seed');
      seed.type = 'button';
      let flash = 0;
      seed.addEventListener('click', () => {
        copyText(String(current()[slot as Slot].seed));
        seed.dataset.copied = 'true';
        seed.title = 'Copied';
        clearTimeout(flash);
        flash = window.setTimeout(() => {
          delete seed.dataset.copied;
          seed.title = `Copy ${slot}'s seed`;
        }, 1200);
      });
      const one = el('button', 'kg-hexed-ghost kg-hexed-one');
      one.type = 'button';
      one.title = `Shuffle ${slot}`;
      one.setAttribute('aria-label', `Shuffle ${slot}`);
      one.innerHTML = DICE;
      one.addEventListener('click', () => {
        const g = current();
        const hold = Object.fromEntries(Object.keys(g).filter((s) => s !== slot).map((s) => [s, g[s as Slot]]));
        emit(rollGenome(freshSeed(), hold, (s) => genes(s)));
      });
      const head = el('div', 'kg-hexed-head');
      head.append(lock, name, seed, one);

      const gene = makeSelect(`${slot} gene`, (id) => {
        const g = current();
        // A gene picked by hand (`none` included, which turns the slot off) is kept: Shuffle then rolls only the rest.
        // The slot's own shuffle button still rerolls it, and the lock button unlocks it.
        locked.add(slot);
        emit({ ...g, [slot]: { ...g[slot as Slot], gene: id } });
      }, closers);
      selects.push(gene);
      const amount = el('input');
      amount.type = 'range';
      amount.min = '0';
      amount.max = '1';
      amount.step = '0.01';
      amount.setAttribute('aria-label', `${slot} amount`);
      amount.addEventListener('input', () => {
        fillRange(amount);
        const g = current();
        emit({ ...g, [slot]: { ...g[slot as Slot], amount: Number(amount.value) } });
      });
      const num = el('span', 'kg-hexed-num');
      const amt = el('div', 'kg-hexed-amt');
      amt.append(amount, num);
      const ctl = el('div', 'kg-hexed-ctl');
      ctl.append(gene.root, amt);
      card.append(head, ctl);
      list.append(card);
      rows.set(slot, { card, gene, amount, num, lock, seed });
    }
    preset.set(Object.keys(PRESETS), '', 'Preset');
  }

  /** Puts the current value into the controls. */
  function sync() {
    const g = current();
    for (const [slot, r] of rows) {
      const s: Strand = g[slot as Slot];
      const ids = genes(slot);
      r.gene.set(ids.includes(s.gene) ? ids : [...ids, s.gene], s.gene); // a gene the schema doesn't list, such as a texture
      r.amount.value = String(s.amount);
      fillRange(r.amount);
      r.num.textContent = s.amount.toFixed(2);
      r.seed.textContent = String(s.seed);
      if (!r.seed.dataset.copied) r.seed.title = `Copy ${slot}'s seed`;
      const on = locked.has(slot);
      r.card.dataset.locked = String(on);
      r.lock.setAttribute('aria-pressed', String(on));
      r.lock.title = on ? `${slot} is kept when shuffling` : `Keep ${slot} when shuffling`;
      r.lock.innerHTML = on ? LOCKED : UNLOCKED;
    }
    const match = Object.entries(PRESETS).find(([, p]) => JSON.stringify(p) === JSON.stringify(g));
    preset.set(Object.keys(PRESETS), match ? match[0] : '', 'Preset');
    const now = [...locked].sort().join();
    if (now !== savedLocks) {
      savedLocks = now;
      ctx.setState?.({ locked: [...locked] });
    }
  }

  shuffle.addEventListener('click', () => {
    const g = current();
    const hold = Object.fromEntries([...locked].map((s) => [s, g[s as Slot]]));
    emit(rollGenome(freshSeed(), hold, (s) => genes(s)));
  });

  build();
  sync();

  return {
    update(next) {
      const rebuild = JSON.stringify(slots()) !== JSON.stringify(slotsOf(next.schema)) || slots().some((s) => genes(s).join() !== genesFrom(next.schema, s).join());
      ctx = next;
      if (rebuild) build();
      sync();
    },
    unmount() {
      for (const s of selects) s.destroy();
      selects.length = 0;
      closers.clear();
      root.remove();
      rows.clear();
    },
  };
}

/** One line for the folded card in Studio: the genes of the slots that are on. */
export function summary(value: unknown): string {
  if (typeof value !== 'object' || value === null) return '';
  const genes = Object.values(value as Record<string, { gene?: unknown; amount?: unknown }>)
    .filter((s) => s && typeof s.gene === 'string' && s.gene !== 'none' && s.gene !== 'off' && s.amount !== 0)
    .map((s) => s.gene as string);
  return genes.length === 0 ? 'No slots rolled' : `${genes.length} slots: ${genes.slice(0, 4).join(', ')}${genes.length > 4 ? ', ...' : ''}`;
}
