// The explainer engine and its tastes. A taste (tastes/<name>.ts, listed in TASTES.md) is the measured data of one
// reference; the engine draws any of them. See SKILL.md.
export { BASE, TASTES, defineTaste, agency, ember, graph, ledger, mono, pulse, red, taste } from './tastes.js';
export type { CornerKind, ExplainerTaste, Hop, TasteCamera, TasteInput, TasteMeta, TasteName, WipeKind } from './tastes.js';
export { Camera, panProgress } from './camera.js';
export type { CameraMove, CameraProps } from './camera.js';
export { Barcode, BlindsWipe, CircleWipe, Corner, Paper, Star, Wipe, Wordmark, clamp01, cornerLength, expo, prog, push, starLength, wave } from './stage.js';
export type { StarProps } from './stage.js';
export { Keyword, Lead, family } from './type.js';
export type { KeyLine, KeywordProps, LeadProps } from './type.js';
export { Prop, useFoot } from './props.js';
export type { PropProps, ShadowKind } from './props.js';
export { BleedSide, CentreStage, EndCard, FloorSide, HeadlineOver, HeroRise, Interlude, ListBeat, Ringed, Sandwich, StandOn } from './layouts.js';
export type { Line, Pic } from './layouts.js';
export { Band, GridPatch, Texture } from './stage.js';
export { Paragraph, anchor } from './type.js';
