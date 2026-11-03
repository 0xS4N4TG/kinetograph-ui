// Stop-motion time for the collage taste: new images on twos with a 3-frame hold once a second, as the reference (a
// 24 fps clip padded to 25: holds at f12, f37, f60, ...). Curves are measured keys, linear between them.

/** The frames a new image starts on, up to `frames`: twos, with the images starting on `holds` held for three
 *  (measured: 12, 37, 60; after that one a second). */
export function imageStarts(frames: number, holds: number[] = [12, 37, 60]): number[] {
  const all = [...holds];
  while (all[all.length - 1]! < frames) all.push(all[all.length - 1]! + 24);
  const out: number[] = [];
  let f = 0;
  while (f < frames) {
    out.push(f);
    f += all.includes(f) ? 3 : 2;
  }
  return out;
}

/** The image a frame shows (the start frame of its image). */
export const heldImage = (starts: number[], f: number) => {
  let last = 0;
  for (const s of starts) { if (s > f) break; last = s; }
  return last;
};

/** Linear through keys [frame, value], clamped at both ends. */
export const tab = (keys: [number, number][], f: number) => {
  if (f <= keys[0]![0]) return keys[0]![1];
  for (let i = 1; i < keys.length; i++) {
    const [f1, v1] = keys[i]!, [f0, v0] = keys[i - 1]!;
    if (f <= f1) return v0 + ((v1 - v0) * (f - f0)) / (f1 - f0);
  }
  return keys[keys.length - 1]![1];
};

export type Box4 = [number, number, number, number];
/** A box (x0, y0, x1, y1 as fractions of the frame) through keys. */
export const boxAt = (keys: [number, Box4][], f: number): Box4 => [0, 1, 2, 3].map((k) => tab(keys.map(([t, b]) => [t, b[k]!] as [number, number]), f)) as Box4;
