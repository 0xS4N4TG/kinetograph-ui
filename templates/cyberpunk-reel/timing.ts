// When the look is on: frames of the reference reel (24 fps), measured from the share of saturated pixels.

export interface Window { in: [number, number]; out: [number, number]; origin: [number, number] }
export const WINDOWS: Window[] = [
  { in: [16, 31], out: [67, 87], origin: [760, 620] },
  { in: [111, 123], out: [185, 208], origin: [1300, 470] },
];
export const DROPOUT = 62; // one plain frame inside the first window
export const FLASH = 110; // the yellow frame before the second window
