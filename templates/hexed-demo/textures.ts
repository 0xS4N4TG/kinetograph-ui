// The grunge scans this demo hands Hexed: the picks from a local texture library (not committed), cut to 1920x1080 by the steps in
// public/textures/textures.json ('surface' high-passed to grit on mid grey, 'film' marks on black; raw/ holds the
// surfaces ungraded, grey and full tone, for the soft wash). Credits: public/textures/CREDITS.md.
// The four whole pictures (house, moon, print, film still) are left out: as a double exposure they read as a second
// photo over the clip, not as texture.

import { staticFile } from 'remotion';
import type { Texture } from '../../plugins/hexed/src/index.js';

export const TEXTURES: Texture[] = [
  { src: staticFile('textures/film-scratches-001-07.jpg'), kind: 'film' },
  { src: staticFile('textures/film-scratches-002-12.jpg'), kind: 'film' },
  { src: staticFile('textures/film-scratches-003-14.jpg'), kind: 'film' },
  { src: staticFile('textures/film-scratches-004-13.jpg'), kind: 'film' },
  { src: staticFile('textures/film-scratches-005-15.jpg'), kind: 'film' },
  { src: staticFile('textures/film-smear-001-04.jpg'), kind: 'film' },
  { src: staticFile('textures/surface-concrete-floor-painted-16.jpg'), raw: staticFile('textures/raw/surface-concrete-floor-painted-16.jpg'), kind: 'surface' },
  { src: staticFile('textures/surface-corrugated-steel-007-b-01.jpg'), raw: staticFile('textures/raw/surface-corrugated-steel-007-b-01.jpg'), kind: 'surface' },
  { src: staticFile('textures/surface-cracked-concrete-wall-04.jpg'), raw: staticFile('textures/raw/surface-cracked-concrete-wall-04.jpg'), kind: 'surface' },
  { src: staticFile('textures/surface-metal-017-48.jpg'), raw: staticFile('textures/raw/surface-metal-017-48.jpg'), kind: 'surface' },
  { src: staticFile('textures/surface-metal-022-07.jpg'), raw: staticFile('textures/raw/surface-metal-022-07.jpg'), kind: 'surface' },
  { src: staticFile('textures/surface-painted-metal-002-08.jpg'), raw: staticFile('textures/raw/surface-painted-metal-002-08.jpg'), kind: 'surface' },
  { src: staticFile('textures/surface-painted-plaster-010-22.jpg'), raw: staticFile('textures/raw/surface-painted-plaster-010-22.jpg'), kind: 'surface' },
  { src: staticFile('textures/surface-plaster-007-44.jpg'), raw: staticFile('textures/raw/surface-plaster-007-44.jpg'), kind: 'surface' },
  { src: staticFile('textures/surface-rusted-shutter-40.jpg'), raw: staticFile('textures/raw/surface-rusted-shutter-40.jpg'), kind: 'surface' },
];
