// Scrapline (from templates/scrapline): a hand-drawn border round a cut-out subject, on torn paper.
//
//   <Scrapline trace={{ src: staticFile('matte.mp4') }} line="pencil" paper="kraft" color="#222" offset={16}>
//     {subject}
//   </Scrapline>
//
// Behind the subject, from the back: the paper (a torn copy of the outline, textured), then the line (a few
// uneven strokes). Both are redrawn a few times a second and held in between ("boil"). The outline is traced from
// the cut-out's alpha only on those redraws and kept, so a clip costs one trace per boil step.

import React from 'react';
import { Canvas, Layer, staticFile, useCurrentFrame, useVideoConfig } from '@kinetographdev/core';
import { probeMedia } from '@kinetographdev/core/media-utils';
import { LINES, PAPERS, drawLine, drawPaper, type LineName, type LineStyle, type PaperDef, type PaperName } from './scrap.js';
import { outlines, readMask, resample, type Ring, type Trace } from './trace.js';

export interface ScraplineProps {
  /** Layer id, if more than one Scrapline is on screen (ids must be unique). Default `scrapline`. */
  id?: string;
  /** Where the outline is traced from: a picture with alpha, a black and white matte video, or an SVG path. */
  trace: Trace;
  /** The line: marker, pencil, crayon, scribble or brush, or one with changes (`{ style: 'pencil', width: 6 }`).
   *  Default marker. */
  line?: LineName | (Partial<LineStyle> & { style?: LineName });
  /** Paper: white, kraft, binder, cardboard or newsprint (the plugin's scans), a picture under public/
   *  ("photos/me.jpg"), or `false` for none. Default false. */
  paper?: PaperName | (string & {}) | false;
  /** Line colour. Default near-black. */
  color?: string;
  /** How far the line sits outside the cut-out, px. Default 14. */
  offset?: number;
  /** How far the paper reaches past the line, px. Default 34. */
  paperMargin?: number;
  /** Paper redraws per second. Default 6. */
  paperBoil?: number;
  /** Changes every random number: another take of the same drawing. */
  seed?: string | number;
  /** The matte value (0..255) that counts as inside. Default 128; about 40 for a soft matte. */
  threshold?: number;
  /** The tracing grid is this many times coarser than the canvas. Default 4. */
  traceScale?: number;
  /** The subject, drawn on top. */
  children?: React.ReactNode;
}

/** A line style by name, or a style with changes, as a full `LineStyle`. */
export const lineOf = (line: ScraplineProps['line']): LineStyle =>
  !line ? LINES.marker : typeof line === 'string' ? LINES[line] : { ...LINES[line.style ?? 'marker'], ...line };

const stepOf = (frame: number, perSecond: number, fps: number) => Math.floor((frame * perSecond) / fps + 1e-9);
/** The first frame of a boil step: the frame the outline is traced on. */
const stepFrame = (step: number, perSecond: number, fps: number) => Math.ceil((step * fps) / perSecond - 1e-9);

// ---- traced outlines, kept by boil step ----

const rings = new Map<string, Ring[]>();

function ringsAt(
  trace: Trace, frame: number, fps: number, W: number, H: number, scale: number,
  threshold: number, distance: number, spacing: number,
): Ring[] {
  const key = JSON.stringify([trace, frame, fps, W, H, scale, threshold, distance, spacing]);
  let r = rings.get(key);
  if (!r) {
    const mask = readMask(trace, frame, fps, W, H, scale);
    r = outlines(mask, threshold, distance, scale)
      .map((l) => resample(l, spacing))
      .filter((x): x is Ring => x !== null);
    if (rings.size > 400) rings.delete(rings.keys().next().value as string);
    rings.set(key, r);
  }
  return r;
}

/** A built-in paper, or a picture under public/ as the paper (its torn rim washed out over white). */
function paperOf(paper: string): PaperDef {
  if (paper in PAPERS) return PAPERS[paper as PaperName];
  const file = staticFile(paper);
  const { width, height } = probeMedia(file, { cache: true });
  return { texture: { file, w: width, h: height }, rim: '#fffefa' };
}

// ---- the component ----

export function Scrapline(props: ScraplineProps) {
  const { id = 'scrapline', trace, paper = false, color = '#141414', offset = 14, paperMargin = 34, paperBoil = 6 } = props;
  const { seed = 0, threshold = 128, traceScale = 4 } = props;
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const st = lineOf(props.line);

  const lineStep = stepOf(frame, st.boil, fps);
  const lineFrame = stepFrame(lineStep, st.boil, fps);
  const lineRings = ringsAt(trace, lineFrame, fps, W, H, traceScale, threshold, offset, st.grain ? 3 : 5);

  let paperLayer: React.ReactNode = null;
  if (paper) {
    const pStep = stepOf(frame, paperBoil, fps);
    const pFrame = stepFrame(pStep, paperBoil, fps);
    const def = paperOf(paper);
    const body = ringsAt(trace, pFrame, fps, W, H, traceScale, threshold, offset + paperMargin, 5);
    const rim = ringsAt(trace, pFrame, fps, W, H, traceScale, threshold, offset + paperMargin + 5, 5);
    paperLayer = (
      <Canvas
        id={`${id}-paper`}
        width={W}
        height={H}
        draw={(ctx) => drawPaper(ctx, body, rim, def, `${seed}-paper-${pStep}`, paperMargin, W, H)}
      />
    );
  }

  return (
    <Layer id={id}>
      {paperLayer}
      <Canvas
        id={`${id}-line`}
        width={W}
        height={H}
        draw={(ctx) => drawLine(ctx, lineRings, st, color, `${seed}-line-${lineStep}`)}
      />
      {props.children}
    </Layer>
  );
}
