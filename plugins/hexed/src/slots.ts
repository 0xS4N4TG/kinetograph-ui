// The slot names, with no imports, so the Studio panel can use them without the engine.

export type EffectSlot = 'isolate' | 'grade' | 'screen' | 'optics' | 'damage' | 'mirror';
export type MotionSlot = 'crop' | 'shake' | 'fps';
export type Slot = MotionSlot | EffectSlot | 'time' | 'grunge';
/** Every slot, in the order the panel lists them. */
export const SLOTS: readonly Slot[] = ['crop', 'shake', 'fps', 'time', 'mirror', 'isolate', 'grade', 'screen', 'optics', 'damage', 'grunge'];

/** What each slot does, in a few words. */
export const SLOT_NOTES: Record<Slot, string> = {
  crop: 'how the picture sits in the frame (zoom, tilt, black bars)',
  shake: 'a camera that will not keep still',
  fps: 'frames held, so footage steps like 12 fps animation',
  time: 'what happens between frames (echo, repeat, reverse)',
  mirror: 'the frame folded, tiled or split',
  isolate: 'keep one hue and drain the rest',
  grade: 'the tone of the whole picture',
  screen: 'a print or display pattern over the picture',
  optics: 'what the lens does (fringing, bloom, streaks)',
  damage: 'what the tape or film did to it',
  grunge: 'a texture laid over the finished picture',
};
