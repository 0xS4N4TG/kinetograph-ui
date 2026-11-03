#!/usr/bin/env python3
"""trace.py FRAMES_DIR OUT_DIR GROUND name=#hex [name=#hex ...] [--fps N] [--size WxH] [--keep name,...]

Trace a drawn reference: every frame vectorised with potrace, one layer per ink. Each pixel goes to the nearest of the
given inks or the ground (nearest in RGB); each ink's pixels become one potrace path set. Writes OUT_DIR/trace.json
({frame: {ink: {t: transform, d: [path, ...]}}}) and OUT_DIR/study.tsx, a Kinetograph composition that redraws the
frames in flat inks (add glow, halftone, grain there). Needs potrace and PIL.

For references whose look *is* the drawing (hand lettering, illustration, cut paper, scribbles): the frames are traced,
not re-imagined. The traced shapes are the reference author's artwork, so OUT_DIR must be inside the git-ignored
_reference folder (the script refuses otherwise): a private 1:1 study, never a shipped component. A shipped component
redraws its own content in the manner the study shows (see SKILL.md, "Drawn references").
"""
import json
import os
import re
import subprocess
import sys

from PIL import Image


def main():
    args = sys.argv[1:]
    if len(args) < 4:
        print(__doc__)
        sys.exit(2)
    fps = 30
    size = None
    if '--fps' in args:
        k = args.index('--fps'); fps = int(args[k + 1]); args = args[:k] + args[k + 2:]
    if '--size' in args:
        k = args.index('--size'); size = args[k + 1]; args = args[:k] + args[k + 2:]
    frames_dir, out_dir, ground = args[0], args[1], args[2]
    if '_reference' not in os.path.abspath(out_dir).split(os.sep):
        sys.exit('trace.py: OUT_DIR must be inside a git-ignored _reference folder (the traced shapes are the reference\'s artwork)')
    os.makedirs(out_dir, exist_ok=True)
    inks = {}
    for a in args[3:]:
        name, col = a.split('=')
        inks[name] = tuple(int(col.lstrip('#')[i:i + 2], 16) for i in (0, 2, 4))
    g = tuple(int(ground.lstrip('#')[i:i + 2], 16) for i in (0, 2, 4))
    names = list(inks)
    cols = [inks[n] for n in names] + [g]
    files = sorted(f for f in os.listdir(frames_dir) if f.endswith('.png'))
    out = {}
    pbm = os.path.join(out_dir, '.layer.pbm')
    for i, fn in enumerate(files):
        im = Image.open(os.path.join(frames_dir, fn)).convert('RGB')
        w, h = im.size
        if size is None:
            size = f'{w}x{h}'
        data = im.getdata()
        idx = []
        for p in data:
            best, bd = 0, 1e9
            for j, c in enumerate(cols):
                d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2
                if d < bd:
                    best, bd = j, d
            idx.append(best)
        out[i] = {}
        for j, name in enumerate(names):
            m = Image.new('1', (w, h), 1)
            m.putdata([0 if v == j else 1 for v in idx])
            if sum(1 for v in idx if v == j) < 40:
                continue
            m.save(pbm)
            svg = subprocess.run(['potrace', '-s', '-o', '-', '--turdsize', '6', '--alphamax', '1.0', '--opttolerance', '0.3', pbm],
                                 capture_output=True, text=True, check=True).stdout
            grp = re.search(r'<g transform="([^"]+)"[^>]*>(.*?)</g>', svg, re.S)
            if grp:
                out[i][name] = {'t': grp.group(1), 'd': re.findall(r' d="([^"]+)"', grp.group(2))}
        print(f'{fn}: {", ".join(out[i]) or "ground only"}')
    if os.path.exists(pbm):
        os.remove(pbm)
    with open(os.path.join(out_dir, 'trace.json'), 'w') as fh:
        json.dump(out, fh)
    w, h = size.split('x')
    hexes = {n: '#%02x%02x%02x' % inks[n] for n in names}
    study = f"""// Private 1:1 study made by trace.py: the reference's frames vectorised per ink and redrawn flat. The shapes are the
// reference's artwork; this file and trace.json stay in the git-ignored _reference folder.
import React from 'react';
import {{ AbsoluteFill, Composition, registerRoot, useCurrentFrame }} from 'remotion';
import trace from './trace.json' with {{ type: 'json' }};

const INKS: Record<string, string> = {json.dumps(hexes)};
type Layer = {{ t: string; d: string[] }};

const Study: React.FC = () => {{
  const fr = (trace as Record<string, Record<string, Layer>>)[String(useCurrentFrame())] ?? {{}};
  return (
    <AbsoluteFill style={{{{ background: '{ground}' }}}}>
      {{Object.keys(INKS).map((k) => fr[k] && (
        <svg key={{k}} width={{{w}}} height={{{h}}} viewBox="0 0 {w} {h}" style={{{{ position: 'absolute', inset: 0 }}}}>
          <g transform={{fr[k]!.t}} fill={{INKS[k]}}>{{fr[k]!.d.map((d, i) => <path key={{i}} d={{d}} />)}}</g>
        </svg>
      ))}}
    </AbsoluteFill>
  );
}};

registerRoot(() => <Composition id="Study" component={{Study}} durationInFrames={{{len(files)}}} fps={{{fps}}} width={{{w}}} height={{{h}}} />);
"""
    with open(os.path.join(out_dir, 'study.tsx'), 'w') as fh:
        fh.write(study)
    print(os.path.join(out_dir, 'trace.json'))
    print(os.path.join(out_dir, 'study.tsx'))


if __name__ == '__main__':
    main()
