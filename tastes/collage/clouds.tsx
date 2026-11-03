// The ending: clouds closing over an old map, holding, then parting as the map pushes in about a red dot. Measured off
// a reference reel f1017-f1040: the map is still for
// 14 frames, the cloud banks close from top and bottom (+98 / -85 px over 9 frames), hold 7, then part while the map
// scales about the dot (1.005, 1.02, 1.043, 1.09 an image apart); the dot is fixed at (0.553 W, 0.421 H), about 70 px,
// #b08887. No screen dither on this shot.
import React from 'react';
import { AbsoluteFill, random, useVideoConfig } from 'remotion';
import { tab } from './time.js';

export const CloudsOver: React.FC<{ t: number; map: string; dot?: [number, number]; position?: string; filter?: string; children?: React.ReactNode }> = ({ t: raw, map, dot = [0.553, 0.421], position = '50% 50%', filter = 'sepia(0.45) saturate(0.8) contrast(0.95)', children }) => {
  const { width: W, height: H } = useVideoConfig();
  const t = Math.floor(raw / 2) * 2;
  const close = tab([[0, 0], [9, 1], [16, 1], [24, -0.6], [34, -2.2]], t);
  const s = t < 16 ? 1 : tab([[16, 1.005], [18, 1.02], [20, 1.043], [22, 1.09], [26, 1.2], [34, 1.45]], t);
  const bank = (top: boolean) => Array.from({ length: 16 }, (_, c) => {
    const x = (c / 15) * W + (random(`cl${top}${c}`) - 0.5) * 120;
    const y0 = top ? 0.05 * H + random(`cy${c}`) * 0.12 * H : 0.83 * H + random(`cyb${c}`) * 0.12 * H;
    const y = y0 + (top ? 98 : -85) * close;
    const r = 170 + random(`cr${top}${c}`) * 150;
    return <div key={`${top}${c}`} style={{ position: 'absolute', left: x - r, top: y - r, width: 2 * r, height: 2 * r, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(250,248,246,0.97), rgba(250,248,246,0.6) 55%, rgba(250,248,246,0))' }} />;
  });
  return (
    <AbsoluteFill style={{ background: '#e9e2d6', overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `scale(${s})`, transformOrigin: `${dot[0] * 100}% ${dot[1] * 100}%` }}>
        <img src={map} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, objectFit: 'cover', objectPosition: position, filter }} />
        <div style={{ position: 'absolute', left: dot[0] * W - 35, top: dot[1] * H - 35, width: 70, height: 70, borderRadius: '50%', background: '#b08887', opacity: 0.9 }} />
      </AbsoluteFill>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: 0.06 * H + 98 * Math.max(0, close), background: 'rgba(250,248,246,0.97)' }} />
      <div style={{ position: 'absolute', left: 0, bottom: 0, width: W, height: 0.06 * H + 85 * Math.max(0, close), background: 'rgba(250,248,246,0.97)' }} />
      {bank(true)}{bank(false)}
      {children}
    </AbsoluteFill>
  );
};
