# Makes public/patch0..5.png: quilt-like cards of pastel pop patches with soft gradients, for the road shot's
# storm of cards. Run with python3 -I tools/patchwork.py from the effect folder (needs Pillow).
import random
from PIL import Image, ImageDraw

PAL = ['#2fd8e0', '#43e89a', '#a6f25a', '#ffe24d', '#ff9a3c', '#ff6b6b', '#ff67b3', '#a77bff', '#5ab8ff', '#fff6a0']

def hex2(c):
    return tuple(int(c[i:i + 2], 16) for i in (1, 3, 5))

for k in range(6):
    rnd = random.Random(40 + k)
    im = Image.new('RGB', (256, 256))
    # a soft two-colour base
    a, b = hex2(rnd.choice(PAL)), hex2(rnd.choice(PAL))
    for y in range(256):
        t = y / 255
        ImageDraw.Draw(im).line([(0, y), (255, y)], fill=tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3)))
    d = ImageDraw.Draw(im)
    # patches: a grid of jittered cells, each a flat pastel quad
    n = rnd.choice([3, 4, 5])
    s = 256 / n
    pts = [[(x * s + rnd.uniform(-s * 0.3, s * 0.3) * (0 < x < n), y * s + rnd.uniform(-s * 0.3, s * 0.3) * (0 < y < n)) for x in range(n + 1)] for y in range(n + 1)]
    for y in range(n):
        for x in range(n):
            if rnd.random() < 0.8:
                q = [pts[y][x], pts[y][x + 1], pts[y + 1][x + 1], pts[y + 1][x]]
                d.polygon(q, fill=hex2(rnd.choice(PAL)))
    # a few diagonal splits for the triangle facets
    for _ in range(4):
        x0, y0 = rnd.uniform(0, 256), rnd.uniform(0, 256)
        d.polygon([(x0, y0), (x0 + rnd.uniform(40, 120), y0 + rnd.uniform(-30, 30)), (x0 + rnd.uniform(0, 80), y0 + rnd.uniform(40, 110))], fill=hex2(rnd.choice(PAL)))
    im.save(f'public/patch{k}.png')
print('ok')
