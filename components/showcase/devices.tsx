// Our own device drawings: a phone and a laptop, flat, in their own units. One light for everything: a soft key from the
// top left, so edges catch light on the top and left, the glass has a diagonal sheen and shadows fall down and right.
// Nothing here is a real product: no logos, no notch shapes copied from a brand, no wordmarks.

import React from 'react';
import { Layer, Rect, Path, Ellipse, linearGradient, radialGradient } from '@kinetographdev/core';
import { clipRR, rr } from './lib.js';

// ---- phone -----------------------------------------------------------------------------------------------------

export const PW = 390;
export const PH = 800;
const BEZEL = 11;
export const SW = PW - 2 * BEZEL; // 368
export const SH = PH - 2 * BEZEL; // 778
export const SR = 46;

export interface PhoneProps {
  id: string;
  /** The screen content, drawn in a 368 x 778 box. */
  children?: React.ReactNode;
  /** Frame colour. */
  frame?: string;
  /** 0..1: how strongly the glass sheen shows. Slide it with `sheenAt` as the phone turns. */
  sheen?: number;
  /** -1..1: where the sheen band sits across the glass. */
  sheenAt?: number;
  /** The home bar colour: light on dark screens, dark on light. */
  bar?: string;
  /** Dim the screen (a phone not yet woken). 0..1. */
  dim?: number;
}

/** A phone at its resting size, top left at the origin. */
export const Phone: React.FC<PhoneProps> = ({ id, children, frame = '#26272b', sheen = 1, sheenAt = 0, bar = '#ffffff', dim = 0 }) => (
  <Layer id={id}>
    {/* side keys, behind the body so only the edge shows */}
    <Rect id={`${id}-k1`} x={-3} y={170} width={5} height={52} radius={2} fill={frame} />
    <Rect id={`${id}-k2`} x={-3} y={240} width={5} height={52} radius={2} fill={frame} />
    <Rect id={`${id}-k3`} x={PW - 2} y={226} width={5} height={84} radius={2} fill={frame} />
    {/* body: the frame colour with a diagonal light and a hairline highlight */}
    <Rect id={`${id}-body`} width={PW} height={PH} radius={58} fill={frame} />
    <Rect
      id={`${id}-light`}
      width={PW}
      height={PH}
      radius={58}
      fill={linearGradient([[0, '#ffffff55'], [0.28, '#ffffff10'], [0.6, '#00000000'], [1, '#00000066']], { angle: 135 })}
    />
    <Rect id={`${id}-edge`} width={PW} height={PH} radius={58} stroke={{ color: '#ffffff30', width: 1.5 }} />
    {/* black glass bezel and the screen */}
    <Rect id={`${id}-bezel`} x={6} y={6} width={PW - 12} height={PH - 12} radius={53} fill="#050506" />
    <Layer id={`${id}-screen`} x={BEZEL} y={BEZEL} clip={clipRR(SW, SH, SR)}>
      <Rect id={`${id}-screenbase`} width={SW} height={SH} fill="#000" />
      {children}
      {dim > 0 ? <Rect id={`${id}-dim`} width={SW} height={SH} fill="#000" opacity={dim} /> : null}
      <Rect
        id={`${id}-sheen`}
        x={-SW * 0.2 + sheenAt * SW * 0.5}
        y={-SH * 0.1}
        width={SW * 0.9}
        height={SH * 1.2}
        rotation={14}
        opacity={0.1 * sheen}
        fill={linearGradient([[0, '#ffffff00'], [0.5, '#ffffff'], [1, '#ffffff00']], { angle: 90 })}
      />
      <Rect id={`${id}-bar`} x={(SW - 124) / 2} y={SH - 16} width={124} height={5} radius={2.5} fill={bar} opacity={0.85} />
    </Layer>
    <Rect id={`${id}-island`} x={(PW - 112) / 2} y={24} width={112} height={32} radius={16} fill="#000" />
    <Ellipse id={`${id}-lens`} x={(PW + 112) / 2 - 26} y={33} width={14} height={14} fill={radialGradient(['#27304a', '#0b0c12'])} />
  </Layer>
);

// ---- laptop ----------------------------------------------------------------------------------------------------

export const LW = 1120;
export const LH = 700; // lid height
export const LBEZEL = 14;
export const LSW = LW - 2 * LBEZEL; // 1092
export const LSH = LH - 2 * LBEZEL - 4; // screen area height
export const BASE_D = 700; // base depth

export interface LidProps {
  id: string;
  children?: React.ReactNode;
  /** The lid's outer colour. */
  shell?: string;
  /** which face to draw: the screen (inside) or the cover (outside) */
  face: 'screen' | 'cover';
}

/** The lid, drawn flat: top left at the origin. The screen face is LW x LH; the cover is the same box mirrored by the caller. */
export const Lid: React.FC<LidProps> = ({ id, children, shell = '#c9ccd2', face }) =>
  face === 'cover' ? (
    <Layer id={id}>
      <Rect id={`${id}-shell`} width={LW} height={LH} radius={26} fill={linearGradient([shell, '#9fa3ab'], { angle: 160 })} />
      <Rect id={`${id}-spec`} width={LW} height={LH} radius={26} fill={linearGradient([[0, '#ffffff66'], [0.4, '#ffffff00'], [1, '#00000033']], { angle: 135 })} />
      {/* a small centred mark: a plain circle, ours */}
      <Ellipse id={`${id}-mark`} x={LW / 2 - 26} y={LH / 2 - 26} width={52} height={52} stroke={{ color: '#ffffff80', width: 3 }} />
    </Layer>
  ) : (
    <Layer id={id}>
      <Rect id={`${id}-shell`} width={LW} height={LH} radius={26} fill={linearGradient([shell, '#8b8f97'], { angle: 160 })} />
      <Rect id={`${id}-edge`} width={LW} height={LH} radius={26} stroke={{ color: '#ffffff40', width: 1.5 }} />
      <Rect id={`${id}-bezel`} x={7} y={7} width={LW - 14} height={LH - 14} radius={20} fill="#050506" />
      <Layer id={`${id}-screen`} x={LBEZEL} y={LBEZEL + 2} clip={clipRR(LSW, LSH, 8)}>
        <Rect id={`${id}-screenbase`} width={LSW} height={LSH} fill="#000" />
        {children}
        <Rect
          id={`${id}-sheen`}
          x={LSW * 0.1}
          y={-LSH * 0.2}
          width={LSW * 0.5}
          height={LSH * 1.5}
          rotation={20}
          opacity={0.07}
          fill={linearGradient([[0, '#ffffff00'], [0.5, '#ffffff'], [1, '#ffffff00']], { angle: 90 })}
        />
      </Layer>
      <Ellipse id={`${id}-cam`} x={LW / 2 - 3} y={5} width={6} height={6} fill="#14161c" />
    </Layer>
  );

/** The base seen from above, drawn flat: LW wide, BASE_D deep, back edge at the top. Keyboard, trackpad, a light falloff. */
export const Base: React.FC<{ id: string; shell?: string }> = ({ id, shell = '#c9ccd2' }) => {
  const keys: React.ReactNode[] = [];
  const rows = 5;
  const kw = 62;
  const gap = 10;
  const cols = 14;
  const x0 = (LW - (cols * kw + (cols - 1) * gap)) / 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      keys.push(<Rect key={`${r}-${c}`} id={`${id}-key-${r}-${c}`} x={x0 + c * (kw + gap)} y={70 + r * (kw * 0.86 + gap)} width={kw} height={kw * 0.86} radius={9} fill="#1c1d22" />);
    }
  }
  return (
    <Layer id={id}>
      <Rect id={`${id}-deck`} width={LW} height={BASE_D} radius={30} fill={linearGradient([shell, '#aeb2ba'], { angle: 180 })} />
      <Rect id={`${id}-well`} x={x0 - 22} y={46} width={cols * kw + (cols - 1) * gap + 44} height={rows * (kw * 0.86 + gap) + 40} radius={16} fill="#101115" />
      {keys}
      <Rect id={`${id}-pad`} x={LW / 2 - 200} y={BASE_D - 215} width={400} height={170} radius={14} fill="#00000014" stroke={{ color: '#00000026', width: 2 }} />
      <Rect id={`${id}-fall`} width={LW} height={BASE_D} radius={30} fill={linearGradient([[0, '#00000040'], [0.18, '#00000000'], [0.8, '#ffffff00'], [1, '#ffffff40']], { angle: 180 })} />
      <Rect id={`${id}-dent`} x={LW / 2 - 90} y={BASE_D - 14} width={180} height={14} radius={7} fill="#00000022" />
    </Layer>
  );
};

export { rr };
