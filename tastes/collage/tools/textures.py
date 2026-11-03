"""Rebuild the collage taste's textures (needs numpy and Pillow).

  python3 tastes/collage/tools/textures.py <scans dir> <newspaper scan> <out dir>
  python3 tastes/collage/tools/textures.py --montage <out dir>      (lattice.png and tag-paper.png only)

  <scans dir>  the Texturelabs paper scans
  <newspaper scan>      a public-domain old front page (the demo uses the Atlanta Journal, 8 May 1915, Internet Archive)

Writes dither.png (static ~2.7 px screen, 8 levels, 1080x1920), label-short/mid/long.png (yellow paper), strip-paper.png
(charcoal paper), page-scan.jpg (the scan, greyscale, 1674 px wide) and page-patch.png (blank paper at the scan's tone).
"""
import os
import sys
import numpy as np
from PIL import Image


def grain(img, w, h, seed):
    rng = np.random.default_rng(seed)
    x, y = int(rng.integers(0, img.width - w)), int(rng.integers(0, img.height - h))
    a = np.asarray(img.crop((x, y, x + w, y + h))).astype(np.float32) / 255
    return (a - a.mean()) / max(a.std(), 1e-3)


def tinted(a, lo, hi, gain, path):
    rgb = np.array(lo) + (np.array(hi) - np.array(lo)) * np.clip(0.5 + a[..., None] * gain, 0, 1)
    Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), 'RGB').convert('RGBA').save(path)


def main(res, scan, out):
    os.makedirs(out, exist_ok=True)
    p338 = Image.open(os.path.join(res, 'Callouts/(Footage)/Texturelabs_Paper_338L.jpg')).convert('L')
    p300 = Image.open(os.path.join(res, 'Callouts/(Footage)/Texturelabs_Paper_300XL.jpg')).convert('L')
    tinted(grain(p338, 1430, 626, 1), (28, 26, 30), (98, 94, 102), 0.16, os.path.join(out, 'strip-paper.png'))
    for name, (w, h), seed in [('short', (560, 216), 2), ('mid', (704, 238), 3), ('long', (1076, 222), 4)]:
        tinted(grain(p300 if seed % 2 else p338, w, h, seed), (218, 160, 0), (255, 214, 40), 0.18, os.path.join(out, f'label-{name}.png'))
    page = Image.open(scan).convert('L')
    page = page.resize((1674, round(1674 * page.height / page.width)), Image.LANCZOS)
    page.save(os.path.join(out, 'page-scan.jpg'), quality=92)
    a = np.asarray(page).astype(np.float32)
    paper = np.percentile(a, 80)
    g = grain(p300, 1674, 700, 7)
    Image.fromarray(np.clip(paper + g * np.std(a[a > paper - 15]) * 0.9, 0, 255).astype(np.uint8)).save(os.path.join(out, 'page-patch.png'))
    # the static dither: three cosines at the measured screen frequencies (cycles/px) plus fine noise, std 8.3 levels
    H, W = 1920, 1080
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    rng = np.random.default_rng(78)
    d = sum(np.cos(2 * np.pi * (fx * x + fy * y) + rng.uniform(0, 6.28)) for fx, fy in [(-0.355, 0.085), (0.360, 0.150), (0.150, -0.360)]) / 3
    d = d * 0.8 + rng.standard_normal((H, W)).astype(np.float32) * 0.45
    Image.fromarray(np.clip(128 + d / d.std() * 8.3, 0, 255).astype(np.uint8)).save(os.path.join(out, 'dither.png'))
    montage_textures(out)
    print('wrote', sorted(os.listdir(out)))


def montage_textures(out):
    """lattice.png: the montage shots' static screen (square lattice, period 4.47 px at -12 deg, std ~10 levels, measured
    in spec-0420-0945 section 0.0); tag-paper.png: lilac-grey ledger paper with a pale blue-grey grid (period 18 px)."""
    H, W = 1920, 1080
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    rng = np.random.default_rng(447)
    a = np.deg2rad(-12)
    u, v = x * np.cos(a) + y * np.sin(a), -x * np.sin(a) + y * np.cos(a)
    d = np.cos(2 * np.pi * u / 4.47) + np.cos(2 * np.pi * v / 4.47) + rng.standard_normal((H, W)).astype(np.float32) * 0.6
    Image.fromarray(np.clip(128 + d / d.std() * 10, 0, 255).astype(np.uint8)).save(os.path.join(out, 'lattice.png'))
    h, w = 260, 640
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    base = np.array([223, 213, 212], np.float32) + rng.standard_normal((h, w, 1)).astype(np.float32) * 5
    grid = ((x % 18) < 1.2) | ((y % 18) < 1.2)
    base[grid] = base[grid] * 0.9 + np.array([150, 160, 190], np.float32) * 0.1
    Image.fromarray(np.clip(base, 0, 255).astype(np.uint8), 'RGB').convert('RGBA').save(os.path.join(out, 'tag-paper.png'))


if __name__ == '__main__':
    if sys.argv[1:2] == ['--montage']:
        montage_textures(sys.argv[2])
    else:
        main(*sys.argv[1:4])
