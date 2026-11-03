// Torn yellow labels typed on over any shot (the dolly shot's labels, without its camera): for shots whose own
// design carries no words, like the taped photo. Rows are fractions of the frame; each types at the measured
// 1.05 letters a frame from two, the paper running ahead of the letters, and they all fly off past the lens at `out`.
import React from 'react';
import { useVideoConfig } from 'remotion';
import { TornLabel, type LabelSize } from './pieces.js';
import { tab } from './time.js';
import { didoneWidth } from './tokens.js';

export interface CaptionRow { text: string; x0: number; y0: number; h?: number; at: number }

const FLY: [number, number][] = [[0, 1], [2, 1.206], [4, 1.268], [6, 1.416], [8, 1.899], [10, 2.296], [12, 3.19], [14, 4.2]];
const FLY_B: [number, number][] = [[2, 0], [4, 2], [6, 6], [8, 12], [10, 20], [14, 26]];

export const Captions: React.FC<{ id: string; t: number; rows: CaptionRow[]; out?: number; base?: string }> = ({ id, t, rows, out = Infinity, base }) => {
  const { width: W, height: H } = useVideoConfig();
  const ft = Math.max(0, t - out);
  if (ft > 14) return null;
  const fly = tab(FLY, ft);
  return (
    <>
      {rows.map((r, i) => {
        if (t < r.at) return null;
        let h = (r.h ?? 0.058) * H;
        const size = (n: number) => didoneWidth(r.text.slice(0, n), h / 1.95 / 0.7, 0.01);
        const pad = (k: number) => (h / 1.95) * k;
        let full = pad(0.45) + size(r.text.length) + pad(0.5);
        if (full > 0.94 * W) { h *= (0.94 * W) / full; full = 0.94 * W; }
        const x0 = Math.max(0.03, Math.min(r.x0, 0.97 - full / W));
        const typed = Math.min(r.text.length, 2 + (t - r.at) * 1.05);
        const shown = Math.min(r.text.length, Math.floor(typed) + 1);
        const wNow = typed >= r.text.length ? full : pad(0.45) + didoneWidth(r.text.slice(0, shown), h / 1.95 / 0.7, 0.01) + pad(0.5);
        const box = [x0, r.y0, x0 + wNow / W, r.y0 + h / H].map((v) => 0.5 + (v - 0.5) * fly) as [number, number, number, number];
        const kind: LabelSize = full / h < 2.7 ? 'short' : full / h < 3.6 ? 'mid' : 'long';
        return <TornLabel key={i} id={`${id}-c${i}`} text={r.text} size={kind} box={box} typed={typed} blur={tab(FLY_B, ft)} base={base} fitPaper />;
      })}
    </>
  );
};
