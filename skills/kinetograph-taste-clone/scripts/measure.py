#!/usr/bin/env python3
"""measure.py COMMAND IMAGE ...   (pure Python + ffmpeg; coordinates are pixels, or fractions of W/H when <= 1)

  color  IMG X Y [R]                 mean colour of the (2R+1)^2 square at X,Y (default R=2), as hex and RGB
  line   IMG X0 Y0 X1 Y1 [N]         N samples (default 32) along the line: luma and hex. Read shadow falloff, halo
                                     and glow width, edge fringes: start inside the object and run out onto the paper
  bbox   IMG X0 Y0 X1 Y1 BG [TOL]    bounding box of pixels that differ from BG (hex) by more than TOL (default 28)
                                     inside the region, in px and fractions: object and text extents
  diff   A B [X0 Y0 X1 Y1]           mean absolute difference per channel (0-255) of two same-size images, optionally
                                     in a region; under about 6 reads as the same at full size
  shadow IMG X Y DX DY BG [LEN]      walks from X,Y in direction DX,DY out over the paper for LEN (default 0.08 W)
                                     past the object's edge and reports the darkening against BG: strength at the edge,
                                     the distance to half strength and to zero. A dark object is skipped automatically
                                     (start inside it); for a mid-grey or light object start exactly on its edge. Compare the reference and the clone with
                                     the same walk. Run it in four directions to tell a directional shadow from a halo
  palette IMG name=#hex ... [--ground #hex] [--region X0 Y0 X1 Y1]
                                     colour picking over every pixel: each pixel goes to its nearest ink (or the
                                     ground); per ink, the median colour, its share of the frame and its texture (luma
                                     spread: halftone, grain, paper). Run it on the reference and the clone with the same
                                     inks; G3 compares the medians, G13 the spreads. Never pick one point for a colour
  grain  IMG X0 Y0 X1 Y1             an empty patch's texture: mean luma, spread, how many pixels are specks (> mean+30),
                                     and the grain size (neighbour correlation: 0 = per-pixel noise, near 1 = coarse)
"""
import subprocess
import sys


def load(path):
    size = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
                           '-of', 'csv=s=x:p=0', path], capture_output=True, text=True, check=True).stdout.strip()
    w, h = map(int, size.split('x'))
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
                          '-'], capture_output=True, check=True).stdout
    return w, h, raw


class Img:
    def __init__(self, path):
        self.w, self.h, self.raw = load(path)

    def px(self, x, y):
        x = min(self.w - 1, max(0, int(round(x))))
        y = min(self.h - 1, max(0, int(round(y))))
        i = (y * self.w + x) * 3
        return self.raw[i], self.raw[i + 1], self.raw[i + 2]


def hexc(c):
    return '#%02x%02x%02x' % tuple(int(round(v)) for v in c)


def luma(c):
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def parse_hex(s):
    s = s.lstrip('#')
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def one(s, size):
    v = float(s)
    return v * size if '.' in s and abs(v) <= 1 else v


def coord(img, sx, sy):
    return one(sx, img.w), one(sy, img.h)


def color(a):
    img = Img(a[0])
    x, y = coord(img, a[1], a[2])
    r = int(a[3]) if len(a) > 3 else 2
    cs = [img.px(x + i, y + j) for i in range(-r, r + 1) for j in range(-r, r + 1)]
    m = [sum(c[k] for c in cs) / len(cs) for k in range(3)]
    print(f'{hexc(m)}  rgb({m[0]:.0f},{m[1]:.0f},{m[2]:.0f})  luma {luma(m):.1f}  at ({x:.0f},{y:.0f}) of {img.w}x{img.h}')


def line(a):
    img = Img(a[0])
    x0, y0 = coord(img, a[1], a[2])
    x1, y1 = coord(img, a[3], a[4])
    n = int(a[5]) if len(a) > 5 else 32
    for i in range(n):
        t = i / (n - 1)
        x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
        c = img.px(x, y)
        print(f'{t:5.2f}  ({x:6.1f},{y:6.1f})  {hexc(c)}  luma {luma(c):6.1f}  ' + '#' * int(luma(c) / 8))


def bbox(a):
    img = Img(a[0])
    x0, y0 = coord(img, a[1], a[2])
    x1, y1 = coord(img, a[3], a[4])
    bg = parse_hex(a[5])
    tol = float(a[6]) if len(a) > 6 else 28
    xs, ys = [], []
    for y in range(int(y0), int(y1)):
        for x in range(int(x0), int(x1)):
            c = img.px(x, y)
            if max(abs(c[k] - bg[k]) for k in range(3)) > tol:
                xs.append(x)
                ys.append(y)
    if not xs:
        print('nothing differs from', a[5])
        return
    bx0, bx1, by0, by1 = min(xs), max(xs) + 1, min(ys), max(ys) + 1
    print(f'px x {bx0}-{bx1} y {by0}-{by1} (w {bx1 - bx0}, h {by1 - by0})')
    print(f'W/H x {bx0 / img.w:.3f}-{bx1 / img.w:.3f} y {by0 / img.h:.3f}-{by1 / img.h:.3f} '
          f'(w {(bx1 - bx0) / img.w:.3f} W, h {(by1 - by0) / img.h:.3f} H)')


def diff(a):
    A, B = Img(a[0]), Img(a[1])
    if (A.w, A.h) != (B.w, B.h):
        sys.exit(f'sizes differ: {A.w}x{A.h} vs {B.w}x{B.h}')
    if len(a) > 5:
        x0, y0 = coord(A, a[2], a[3])
        x1, y1 = coord(A, a[4], a[5])
    else:
        x0, y0, x1, y1 = 0, 0, A.w, A.h
    tot, n = [0, 0, 0], 0
    for y in range(int(y0), int(y1), 2):
        for x in range(int(x0), int(x1), 2):
            p, q = A.px(x, y), B.px(x, y)
            for k in range(3):
                tot[k] += abs(p[k] - q[k])
            n += 1
    m = [v / n for v in tot]
    print(f'mean abs diff r {m[0]:.1f} g {m[1]:.1f} b {m[2]:.1f}  (all {sum(m) / 3:.1f})')


def shadow(a):
    img = Img(a[0])
    x, y = coord(img, a[1], a[2])
    dx, dy = float(a[3]), float(a[4])
    norm = (dx * dx + dy * dy) ** 0.5 or 1
    dx, dy = dx / norm, dy / norm
    bg = luma(parse_hex(a[5]))
    ln = int(float(a[6]) * img.w if len(a) > 6 else 0.08 * img.w)
    dark = lambda s: max(0.0, (bg - luma(img.px(x + dx * s, y + dy * s))) / max(bg, 1))
    # walk off the object first (start the walk inside it): until the pixels are no longer near-black object
    start, limit = 0, int(max(img.w, img.h))
    while start < limit and dark(start) > 0.75:
        start += 1
    p = [dark(start + s) for s in range(ln)]
    peak = max(p[:max(1, ln // 10)])
    half = next((i for i, v in enumerate(p) if v <= peak / 2), None)
    zero = next((i for i, v in enumerate(p) if v <= 0.02), None)
    fmt = lambda v: f'{v} px ({v / img.w:.3f} W)' if v is not None else f'beyond {ln} px'
    ex, ey = x + dx * start, y + dy * start
    print(f'object edge at ({ex:.0f},{ey:.0f}), {start} px into the walk; darkening at the edge {peak:.2f} (0 paper, 1 black)')
    print(f'half strength at {fmt(half)}; gone at {fmt(zero)}')
    print('profile:', ' '.join(f'{v:.2f}' for v in p[:: max(1, ln // 16)]))


def palette(a):
    img = Img(a[0])
    rest = a[1:]
    ground = None
    region = (0, 0, img.w, img.h)
    if '--ground' in rest:
        k = rest.index('--ground'); ground = parse_hex(rest[k + 1]); rest = rest[:k] + rest[k + 2:]
    if '--region' in rest:
        k = rest.index('--region')
        x0, y0 = coord(img, rest[k + 1], rest[k + 2]); x1, y1 = coord(img, rest[k + 3], rest[k + 4])
        region = (int(x0), int(y0), int(x1), int(y1)); rest = rest[:k] + rest[k + 5:]
    inks = [(n, parse_hex(c)) for n, c in (r.split('=') for r in rest)]
    if ground is not None:
        inks.append(('ground', ground))
    groups = {n: [] for n, _ in inks}
    x0, y0, x1, y1 = region
    for y in range(y0, y1):
        for x in range(x0, x1):
            p = img.px(x, y)
            best = min(inks, key=lambda nc: (p[0] - nc[1][0]) ** 2 + (p[1] - nc[1][1]) ** 2 + (p[2] - nc[1][2]) ** 2)
            groups[best[0]].append(p)
    total = max(1, (x1 - x0) * (y1 - y0))
    for n, _ in inks:
        g = groups[n]
        if len(g) < 20:
            print(f'{n:8s} absent')
            continue
        med = [sorted(c[k] for c in g)[len(g) // 2] for k in range(3)]
        ls = [luma(c) for c in g]
        mean = sum(ls) / len(ls)
        sd = (sum((v - mean) ** 2 for v in ls) / len(ls)) ** 0.5
        print(f'{n:8s} median {hexc(med)}  share {100 * len(g) / total:5.1f}%  texture (luma spread) {sd:4.1f}')


def grain(a):
    img = Img(a[0])
    x0, y0 = coord(img, a[1], a[2])
    x1, y1 = coord(img, a[3], a[4])
    ls = [[luma(img.px(x, y)) for x in range(int(x0), int(x1))] for y in range(int(y0), int(y1))]
    flat = [v for row in ls for v in row]
    mean = sum(flat) / len(flat)
    sd = (sum((v - mean) ** 2 for v in flat) / len(flat)) ** 0.5
    specks = sum(1 for v in flat if v > mean + 30)
    num = sum((row[i] - mean) * (row[i + 1] - mean) for row in ls for i in range(len(row) - 1))
    den = sum((v - mean) ** 2 for v in flat) or 1
    print(f'mean luma {mean:.1f}  spread {sd:.1f}  specks {100 * specks / len(flat):.3f}%  grain size (neighbour corr) {num / den:.2f}')


CMDS = {'color': color, 'line': line, 'bbox': bbox, 'diff': diff, 'shadow': shadow, 'palette': palette, 'grain': grain}

if __name__ == '__main__':
    if len(sys.argv) < 3 or sys.argv[1] not in CMDS:
        print(__doc__)
        sys.exit(2)
    CMDS[sys.argv[1]](sys.argv[2:])
