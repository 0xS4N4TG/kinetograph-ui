"""Procedural textures for the explainer kit (tastes/explainer/textures), from fixed seeds: a re-run reproduces them.

No third-party material goes in: they are original work under the repository's licence.

  grain.png   tileable film grain, dark and light specks with alpha (normal blend, over the type too; the engine
              shifts it every other frame)
  paper.png   tileable paper: soft mottling and short fibres (multiply blend)
  moire.png   full-frame moire (not tiled): two fine line screens about a degree apart, one gently warped, beating in
              curved, uneven bands as when a printed page is filmed (normal blend, over the type too)
  ink.png     pale flecks and fibres where the paper's tooth shows through ink (normal blend)
  halftone.png  tileable 45-degree dot screen (multiply blend)

  python3 tastes/explainer/tools/textures.py   (needs numpy and Pillow)
"""
import os
import numpy as np
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', 'textures')
N = 512


def tile_noise(rng, n, scale):
    """Tileable smooth noise: random grid upsampled with wraparound bicubic-ish (via FFT low-pass)."""
    white = rng.standard_normal((n, n))
    f = np.fft.fft2(white)
    ky = np.fft.fftfreq(n)[:, None]
    kx = np.fft.fftfreq(n)[None, :]
    k = np.sqrt(kx * kx + ky * ky)
    f *= np.exp(-(k * scale) ** 2)
    out = np.real(np.fft.ifft2(f))
    return (out - out.mean()) / (out.std() + 1e-9)


def save(name, a):
    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).save(os.path.join(OUT, name), optimize=True)


def main():
    os.makedirs(OUT, exist_ok=True)
    rng = np.random.default_rng(1119)
    # Every file but paper.png is RGBA for normal blending, so it prints over the type as well as the paper: dark and
    # light specks (or bands) with alpha, rather than a blend mode that leaves black ink untouched.
    def rgba(signed, k):
        """Signed field -> black where negative, white where positive, alpha |v| * k."""
        a = np.clip(np.abs(signed) * k, 0, 1)
        c = np.where(signed > 0, 255, 0)
        return np.dstack([c, c, c, a * 255])

    def save_rgba(name, a):
        Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA').save(os.path.join(OUT, name), optimize=True)

    # grain: fine noise with a little clumping
    g = 0.75 * rng.standard_normal((N, N)) + 0.45 * tile_noise(rng, N, 2.0)
    save_rgba('grain.png', rgba(g / g.std(), 0.55))
    # paper: broad mottling, finer cloud, and fibres (thin streaks of brighter and darker pulp); multiply over the paper
    p = 0.55 * tile_noise(rng, N, 60) + 0.35 * tile_noise(rng, N, 12) + 0.2 * rng.standard_normal((N, N))
    fib = np.zeros((N, N))
    for _ in range(900):
        x, y = rng.integers(0, N, 2)
        ang = rng.uniform(0, np.pi)
        ln = rng.integers(6, 28)
        sgn = rng.choice([-1.0, 1.0]) * rng.uniform(0.4, 1.0)
        for t in range(ln):
            fib[int(y + t * np.sin(ang)) % N, int(x + t * np.cos(ang)) % N] += sgn
    p += 0.5 * fib
    save('paper.png', 238 + 7 * p)
    # ink: where the paper's tooth shows through printed ink: pale flecks and fibres, only the bright side (normal blend;
    # invisible on paper, it breaks up dark type and dark objects like ink on a rough sheet)
    ink = np.clip(0.6 * tile_noise(rng, N, 1.2) + 0.9 * np.maximum(fib, 0) - 0.9, 0, None)
    save_rgba('ink.png', np.dstack([np.full((N, N), 255), np.full((N, N), 245), np.full((N, N), 235), np.clip(ink * 0.9, 0, 1) * 255]))
    # moire: one full frame (1200 x 2100, not a tile, so nothing repeats). Two fine line screens (about 4 px) 1.1
    # degrees and 0.6 percent of pitch apart, the second gently warped like paper that is not quite flat, so where they
    # beat the bands come out curved and unevenly spaced (about 200 px), stronger in some patches than others (a slow
    # envelope), as when a printed page is filmed. Black and white with alpha (normal blend, over the type too).
    MH, MW = 2100, 1200
    y, x = np.mgrid[0:MH, 0:MW].astype(np.float64)
    a1, a2 = np.radians(30.0), np.radians(31.1)
    warp = 3.0 * np.sin(x / 260.0 + 0.7) + 2.4 * np.sin(y / 410.0 + x / 600.0) + 1.4 * np.sin((x - y) / 190.0)
    ph1 = 2 * np.pi * (x * np.sin(a1) + y * np.cos(a1)) / 4.2
    ph2 = 2 * np.pi * (x * np.sin(a2) + y * np.cos(a2) + warp) / 4.225
    fine = np.cos(ph1) * np.cos(ph2)
    beat = np.cos(ph1 - ph2)
    rng2 = np.random.default_rng(933)
    env = np.zeros((MH, MW))
    for _ in range(14):
        cx, cy, r = rng2.uniform(0, MW), rng2.uniform(0, MH), rng2.uniform(250, 700)
        env += np.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * r * r))
    env = 0.25 + 0.75 * np.clip(env / env.max() * 1.6, 0, 1)
    m = env * (0.75 * beat + 0.25 * fine)
    save_rgba('moire.png', rgba(m, 0.7))
    yy, xx = np.mgrid[0:N, 0:N] / N
    # halftone: 45-degree dot screen, 32 cycles a tile on each axis of the rotated grid (multiply)
    u = (xx + yy) * 32
    v = (xx - yy) * 32
    d = np.sqrt((u - np.round(u)) ** 2 + (v - np.round(v)) ** 2)
    save('halftone.png', np.where(d < 0.32, 200, 255))
    print('wrote', sorted(os.listdir(OUT)))


if __name__ == '__main__':
    main()
