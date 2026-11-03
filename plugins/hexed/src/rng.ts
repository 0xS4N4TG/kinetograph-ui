// Seeded randomness. Each slot draws from its own stream (the seed hashed with the slot's name), so locking one
// slot or changing another never moves it.

export type Rng = () => number;

/** FNV-1a over a string, to a 32-bit whole number. */
export function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: small, fast and the same on every machine. */
export function rng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const between = (r: Rng, lo: number, hi: number) => lo + (hi - lo) * r();
export const pick = <T,>(r: Rng, list: readonly T[]): T => list[Math.floor(r() * list.length) % list.length];
