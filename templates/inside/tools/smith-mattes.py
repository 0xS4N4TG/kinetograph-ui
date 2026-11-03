#!/usr/bin/env python3
"""Offline data for plugins.tsx, from Blacksmith Scene and its person matte (public/plugins/blacksmith-matte.mp4, made
with plugins/vj/tools/matte.mjs through vj-matte, RVM landscape model):

  public/plugins/smith-alpha.png   the paper cut-out's alpha on source frame CUT_FRAME: the smiths (matte), the anvil
                                   and the raised hammer handles, holes filled, edges closed
  track/smith-contours.json        per source frame, the smiths' outlines as polygons in 1920x1080 px, each with the
                                   figure it belongs to (0 left, 1 middle, 2 right), for p5.brush to paint

  python3 -I templates/inside/tools/smith-mattes.py   (from kinetograph-ui; needs ffmpeg and Pillow)
"""
import json
import os
import subprocess
import sys
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
MATTE = os.path.join(ROOT, 'public/plugins/blacksmith-matte.mp4')
W, H = 1920, 1080
CUT_FRAME = int(sys.argv[1]) if len(sys.argv) > 1 else 42

# the anvil (it never moves) and the hammer handles on CUT_FRAME, in 1920x1080 px
ANVIL = [(846, 724), (1000, 704), (1232, 734), (1150, 762), (1062, 792), (1068, 860), (1102, 900), (1114, 1080),
         (892, 1080), (902, 900), (932, 860), (928, 792), (858, 762)]
# the left smith's dark apron and legs, which the matte loses against the dark wall
LEFT = [(492, 420), (598, 400), (640, 700), (628, 1080), (468, 1080), (466, 700)]
HANDLES = [((415, 0), (815, 305), 30), ((1185, 270), (1300, 700), 26)]


def frames(scale):
    w, h = W // scale, H // scale
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', MATTE, '-vf', f'scale={w}:{h}', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'],
                         check=True, capture_output=True).stdout
    n = len(raw) // (w * h)
    return [Image.frombytes('L', (w, h), raw[i * w * h:(i + 1) * w * h]) for i in range(n)], w, h


def fill_holes(img):
    """Binary L image: everything the outside cannot reach becomes inside."""
    w, h = img.size
    pad = Image.new('L', (w + 2, h + 2), 0)
    pad.paste(img, (1, 1))
    ImageDraw.floodfill(pad, (0, 0), 128)
    return pad.crop((1, 1, w + 1, h + 1)).point(lambda v: 0 if v == 128 else 255)


def cut_alpha():
    full, _, _ = frames(1)
    m = full[CUT_FRAME].point(lambda v: 255 if v > 90 else 0)
    d = ImageDraw.Draw(m)
    d.polygon(ANVIL, fill=255)
    d.polygon(LEFT, fill=255)
    for a, b, wd in HANDLES:
        d.line([a, b], fill=255, width=wd)
    # close small gaps, drop specks, fill holes, then a soft edge the cut-out thresholds
    m = m.filter(ImageFilter.MaxFilter(15)).filter(ImageFilter.MinFilter(15))
    m = m.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5))
    m = fill_holes(m)
    m = m.filter(ImageFilter.GaussianBlur(2))
    out = os.path.join(ROOT, 'public/plugins/smith-alpha.png')
    m.save(out)
    print('alpha ->', out)


# ---- marching squares, linked into closed loops ----

def loops(img, thr=128):
    w, h = img.size
    px = img.load()
    v = lambda x, y: 1 if 0 <= x < w and 0 <= y < h and px[x, y] > thr else 0
    segs = {}
    # edge midpoints keyed as doubled integer coordinates
    for y in range(-1, h):
        for x in range(-1, w):
            a, b, c, d = v(x, y), v(x + 1, y), v(x + 1, y + 1), v(x, y + 1)
            k = a * 8 + b * 4 + c * 2 + d
            if k in (0, 15):
                continue
            T, R, B, L = (2 * x + 1, 2 * y), (2 * x + 2, 2 * y + 1), (2 * x + 1, 2 * y + 2), (2 * x, 2 * y + 1)
            table = {1: [(L, B)], 2: [(B, R)], 3: [(L, R)], 4: [(T, R)], 5: [(L, T), (B, R)], 6: [(T, B)], 7: [(L, T)],
                     8: [(T, L)], 9: [(T, B)], 10: [(T, R), (L, B)], 11: [(T, R)], 12: [(L, R)], 13: [(B, R)], 14: [(L, B)]}
            for p, q in table[k]:
                segs.setdefault(p, []).append(q)
                segs.setdefault(q, []).append(p)
    seen = set()
    out = []
    for start in list(segs):
        if start in seen:
            continue
        loop = [start]
        seen.add(start)
        prev, cur = None, start
        while True:
            nxt = [n for n in segs[cur] if n != prev and n not in seen]
            if not nxt:
                break
            prev, cur = cur, nxt[0]
            seen.add(cur)
            loop.append(cur)
        if len(loop) > 8:
            out.append([(x / 2, y / 2) for x, y in loop])
    return out


def area(poly):
    return 0.5 * sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(poly, poly[1:] + poly[:1]))


def rdp(pts, eps):
    if len(pts) < 3:
        return pts
    (x0, y0), (x1, y1) = pts[0], pts[-1]
    dx, dy = x1 - x0, y1 - y0
    n = (dx * dx + dy * dy) ** 0.5 or 1
    far, idx = 0, 0
    for i, (x, y) in enumerate(pts[1:-1], 1):
        dist = abs(dy * x - dx * y + x1 * y0 - y1 * x0) / n
        if dist > far:
            far, idx = dist, i
    if far <= eps:
        return [pts[0], pts[-1]]
    return rdp(pts[:idx + 1], eps)[:-1] + rdp(pts[idx:], eps)


def contours():
    small, w, h = frames(6)
    k = W / w
    out = []
    for img in small:
        img = fill_holes(img.filter(ImageFilter.GaussianBlur(1)).point(lambda v: 255 if v > 110 else 0))
        polys = []
        for lp in loops(img, 128):
            if abs(area(lp)) < 150:  # specks
                continue
            # a closed loop: simplify its two halves, split at the point farthest from the start
            far = max(range(len(lp)), key=lambda i: (lp[i][0] - lp[0][0]) ** 2 + (lp[i][1] - lp[0][1]) ** 2)
            simple = rdp(lp[:far + 1], 0.7)[:-1] + rdp(lp[far:] + [lp[0]], 0.7)[:-1]
            if len(simple) < 4:
                continue
            cx = sum(p[0] for p in simple) / len(simple) * k
            fig = 0 if cx < 0.4 * W else 1 if cx < 0.6 * W else 2
            polys.append({'fig': fig, 'pts': [[round(x * k), round(y * k)] for x, y in simple]})
        out.append(polys)
    path = os.path.join(ROOT, 'track/smith-contours.json')
    with open(path, 'w') as f:
        json.dump({'fps': 30, 'width': W, 'height': H, 'anvil': [list(p) for p in ANVIL], 'frames': out}, f, separators=(',', ':'))
    print('contours ->', path, sum(len(p) for p in out), 'polygons')


if __name__ == '__main__':
    cut_alpha()
    contours()
