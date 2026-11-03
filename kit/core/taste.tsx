// A taste: the style a component is cut in (palette, fonts, camera blur, easing, bars), as one value. Kit components
// read it from context, so a component wraps its root in <TasteProvider taste={...}> and the same blocks restyle
// when the taste changes. Tastes live in kit/tastes/.

import React, { createContext, useContext } from 'react';
import { paleWhip } from '../../tastes/pale-whip.js';

export type Rgb = [number, number, number];

export interface Taste {
  name: string;
  /** the page the UI sits on */
  canvas: string;
  /** body text and icon strokes */
  ink: string;
  /** secondary text */
  muted: string;
  /** buttons, links, the selected state */
  accent: string;
  /** a toggle's track, off and on (rgb, so it can be blended) */
  toggle: { off: Rgb; on: Rgb };
  /** the ring round an avatar */
  avatarRing: string[];
  fonts: {
    /** interface type */
    ui: string;
    /** big display words */
    display: string;
    /** the felt-tip notes */
    marker: string;
    /** the thin pen notes */
    pen: string;
  };
  /** colours of the hand-written notes */
  notes: { red: string; yellow: string };
  /** the dark interludes between UI shots: a warm gradient along the bottom under a dark shade from the top */
  interlude: { colors: string[]; shade: string };
  camera: {
    /** motion-blur samples per frame */
    samples: number;
    /** default shutter, in frames (0 to 2); whips read best at 1.4 to 1.6 */
    shutter: number;
  };
  /** letterbox bar colour */
  bars: string;
}

const TasteContext = createContext<Taste>(paleWhip);

export const TasteProvider: React.FC<{ taste: Taste; children: React.ReactNode }> = ({ taste, children }) => (
  <TasteContext.Provider value={taste}>{children}</TasteContext.Provider>
);

/** The taste in effect (Pale Whip outside a provider). */
export const useTaste = () => useContext(TasteContext);
