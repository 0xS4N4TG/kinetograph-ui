// The print taste: risograph, halftone and screen print. See tokens.ts for the rules and the reels they come from,
// README.md for when to use it.
export { FONTS, INKS, PAPER, RATES, REGISTER, REGISTER_HEAVY, SCREENS } from './tokens.js';
export type { InkName } from './tokens.js';
export { InkPass, OnPage, PrintCadence, PrintCamera, inkEffects, focus, inkHex, usePrintCam, zoomAt } from './ink.js';
export type { InkProps, PrintCam } from './ink.js';
export { Paper, PrintFinish } from './paper.js';
export type { FinishProps, PaperProps } from './paper.js';
export { HalftonePhoto, PhotoArt, Riso, RisoPhoto, SEP } from './photo.js';
export type { Box, Pass } from './photo.js';
export { Marker, RisoType } from './type.js';
export type { RisoTypeProps, TypeLine } from './type.js';
export { BoilStroke, arrowPaths, cornerPath, loopPath } from './boil.js';
export type { BoilStrokeProps } from './boil.js';
