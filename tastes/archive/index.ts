// The archive taste: historical photographs brought to life (old-film documentary). See tokens.ts for the rules and
// the reels each comes from, README.md for when to use it.
export { ARCHIVE, FONTS, PROCESS, STEP } from './tokens.js';
export type { Process } from './tokens.js';
export { ArchivePhoto, Toned, toneEffect } from './photo.js';
export type { ToneProps } from './photo.js';
export { Dateline, Develop, Line, Scrim, Tag, serif, typewriter } from './type.js';
export { ArchiveFinish, FilmScan, Flicker, Weave } from './film.js';
export type { FinishProps } from './film.js';
export { AlbumPage, ParallaxPlate, PlateMat } from './layouts.js';
export type { Mounted, ParallaxPlateProps } from './layouts.js';
// the techniques it composes, re-exported so a reel needs one import
export { CurveCut, PageTurn, Parallax, Posterize, SPEED_SPIKE } from '../../kit/looks/index.js';
export { Dust, EdgeBlur, GateWeave, Vignette, WindowLight } from '../../kit/looks/film.js';
