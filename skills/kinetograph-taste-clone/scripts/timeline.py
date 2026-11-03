#!/usr/bin/env python3
"""timeline.py VIDEO [CLONE] [--json OUT]

The film's clock, measured instead of guessed. Decodes every frame small and grey (via ffmpeg, no numpy) and reports
for each frame the mean luma and the change from the previous frame. From that:
  cuts     frames where the picture jumps (a hard cut or a pop): change far above its neighbours
  moves    runs of motion between holds: start frame, end (settle) frame, peak change
With a CLONE it prints both timelines and pairs each reference event with the clone's nearest one, flagging any that
are more than 1 frame apart. Timing is gate G1; this is how it is checked.
"""
import json
import subprocess
import sys

W = 64


def probe(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                          'stream=width,height,r_frame_rate', '-of', 'csv=p=0', path],
                         capture_output=True, text=True, check=True).stdout.strip().split(',')
    w, h = int(out[0]), int(out[1])
    num, den = out[2].split('/')
    return w, h, float(num) / float(den)


def frames(path):
    w, h, fps = probe(path)
    hh = max(2, round(W * h / w / 2) * 2)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vf', f'scale={W}:{hh}:flags=area', '-f', 'rawvideo',
                          '-pix_fmt', 'gray', '-'], capture_output=True, check=True).stdout
    n = W * hh
    return [raw[i:i + n] for i in range(0, len(raw) - n + 1, n)], fps


def analyse(path):
    fs, fps = frames(path)
    luma = [sum(f) / len(f) for f in fs]
    diff = [0.0] + [sum(abs(a - b) for a, b in zip(fs[i], fs[i - 1])) / len(fs[i]) for i in range(1, len(fs))]
    cuts = []
    for i in range(1, len(diff)):
        near = sorted(diff[max(1, i - 6):i] + diff[i + 1:i + 7]) or [0]
        med = near[len(near) // 2]
        # a cut jumps against its neighbours; a reframe cut (the same scene at another zoom) jumps less but still drops
        # straight back to the next frame's level, while a fast move or a whip keeps changing on both sides
        nxt = diff[i + 1] if i + 1 < len(diff) else 0
        if (diff[i] > 12 and diff[i] > 4 * med + 3) or (diff[i] > 4 and diff[i] >= 1.5 * diff[i - 1] and diff[i] >= 4 * nxt):
            cuts.append(i)
    # a frame is moving when it changes more than the noise floor; a single still frame between moving ones is bridged,
    # because 30 fps content in a 60 fps file repeats every frame (and a hold of one frame is not a settle)
    still = sum(1 for d in diff[1:] if d < 0.02)
    dup = still / max(1, len(diff) - 1) > 0.4
    mv = [d > 0.15 and i not in cuts for i, d in enumerate(diff)]
    for i in range(1, len(mv) - 1):
        if not mv[i] and mv[i - 1] and mv[i + 1]:
            mv[i] = True
    moves, cur = [], None
    for i, m in enumerate(mv):
        if m and cur is None:
            cur = [i, i, diff[i]]
        elif m:
            cur[1], cur[2] = i, max(cur[2], diff[i])
        elif cur is not None:
            if cur[1] - cur[0] >= 1:
                moves.append({'start': cur[0], 'settle': cur[1] + 1, 'peak': round(cur[2], 2)})
            cur = None
    if cur is not None and cur[1] - cur[0] >= 1:
        moves.append({'start': cur[0], 'settle': cur[1] + 1, 'peak': round(cur[2], 2)})
    return {'file': path, 'fps': fps, 'frames': len(fs), 'cuts': cuts, 'moves': moves, 'duplicated': dup,
            'luma': [round(v, 1) for v in luma], 'diff': [round(v, 2) for v in diff]}


def show(t):
    print(f"{t['file']}: {t['frames']} frames at {t['fps']:g} fps"
          + ("  (every other frame repeats: the content runs at half the file's rate)" if t.get('duplicated') else ''))
    print('  cuts:', ' '.join(f'f{c}' for c in t['cuts']) or 'none')
    for m in t['moves']:
        print(f"  move f{m['start']}-f{m['settle']} ({m['settle'] - m['start']} f, peak {m['peak']})")


def pair(name, ref, clone):
    bad = 0
    for r in ref:
        c = min(clone, key=lambda v: abs(v - r)) if clone else None
        d = None if c is None else c - r
        flag = '' if d is not None and abs(d) <= 1 else '   <-- off'
        bad += bool(flag)
        print(f'  {name} f{r} -> clone {"f" + str(c) if c is not None else "none"} ({"" if d is None else f"{d:+d}"}){flag}')
    return bad


def main():
    args = sys.argv[1:]
    out = None
    if '--json' in args:
        k = args.index('--json')
        out = args[k + 1]
        args = args[:k] + args[k + 2:]
    if not args:
        print(__doc__)
        sys.exit(2)
    ref = analyse(args[0])
    show(ref)
    res = {'ref': ref}
    if len(args) > 1:
        clone = analyse(args[1])
        show(clone)
        res['clone'] = clone
        print('G1 timing (reference event -> nearest clone event):')
        bad = pair('cut', ref['cuts'], clone['cuts'])
        bad += pair('move start', [m['start'] for m in ref['moves']], [m['start'] for m in clone['moves']])
        bad += pair('settle', [m['settle'] for m in ref['moves']], [m['settle'] for m in clone['moves']])
        if not ref['cuts'] and not ref['moves']:
            print('  the reference has no cuts or moves this tool can see: G1 is not tested; check timing on gate frames')
            bad += 1
        # the change curve: on films whose background keeps drifting, move boundaries are threshold artefacts, so also
        # compare how much each frame changes and how bright it is, frame by frame
        n = min(ref['frames'], clone['frames'])
        dd = [abs(ref['diff'][i] - clone['diff'][i]) for i in range(n)]
        dl = [abs(ref['luma'][i] - clone['luma'][i]) for i in range(n)]
        bad_d = [i for i in range(n) if dd[i] > max(1.0, 0.5 * ref['diff'][i])]
        print(f"  change curve: {len(bad_d)} of {n} frames differ by more than 1 (or half the reference's change)"
              + (': f' + ' f'.join(str(i) for i in bad_d[:12]) + (' ...' if len(bad_d) > 12 else '') if bad_d else ''))
        print(f"  brightness: mean gap {sum(dl) / max(1, n):.1f}, worst {max(dl) if dl else 0:.1f} at f{dl.index(max(dl)) if dl else 0} (0-255)")
        if ref['frames'] != clone['frames']:
            print(f"  length {ref['frames']} vs {clone['frames']} frames   <-- off")
            bad += 1
        print('G1', 'PASS' if bad == 0 else f'FAIL ({bad} events off by more than 1 frame)')
    if out:
        with open(out, 'w') as fh:
            json.dump(res, fh)


if __name__ == '__main__':
    main()
