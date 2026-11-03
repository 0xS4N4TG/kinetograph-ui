"""Procedural sounds for the archive taste: no third-party audio, fixed seeds, so a re-run reproduces them exactly.
Adapted from tastes/vox/tools/sfx.py; the list follows the tactile-SFX reel plus the projector the film look implies.

  python3 tastes/archive/tools/sfx.py tastes/archive/sfx      (needs numpy)

  projector.wav  a 16 mm projector running, 31 s: motor hum (55 Hz and harmonics, slow wow), the shutter's
                 24-a-second flutter as soft clicks, a little gate hiss. Low and steady: it sits under everything.
  shutter.wav    a film camera snap for a hard cut: a sharp release click, a spring buzz, a second softer click, 0.18 s
  advance.wav    the film-advance ratchet under a camera move: a train of 7 ticks accelerating, 0.3 s
  key0-2.wav     typewriter keys (three, pitched apart so a typed line does not machine-gun), 0.09 s
  bell.wav       the carriage-return bell, small and far, 0.6 s
  rustle.wav     paper rustle as a tag or page lands: two bursts of crackly high noise, 0.4 s
  thud.wav       card stock settling on a table, 0.15 s
  flick.wav      a page turning over: a whoosh of paper with a slap at the end, 0.5 s
  runout.wav     the tail of the reel flapping on the take-up spool: ticks slowing to a stop, 1.2 s
"""
import os
import sys
import wave
import numpy as np

SR = 48000
rng = np.random.default_rng(1839)


def save(path, x, gain_db=-1.0):
    x = np.asarray(x, dtype=np.float64)
    peak = np.max(np.abs(x)) or 1.0
    x = x / peak * 10 ** (gain_db / 20)
    data = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


def t(sec):
    return np.arange(int(sec * SR)) / SR


def band(x, lo, hi):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))


def click(dur, lo, hi, tau):
    tt = t(dur)
    return band(rng.standard_normal(len(tt)), lo, hi) * np.exp(-tt / tau)


def place(track, x, at):
    i = int(at * SR)
    j = min(len(track), i + len(x))
    if i < len(track):
        track[i:j] += x[: j - i]


def main(out):
    os.makedirs(out, exist_ok=True)
    # projector
    tt = t(31.0)
    wow = 1 + 0.004 * np.sin(2 * np.pi * 0.7 * tt)
    ph = np.cumsum(55.0 * wow) / SR
    hum = sum(a * np.sin(2 * np.pi * k * ph) for k, a in ((1, 1.0), (2, 0.5), (3, 0.25), (4, 0.12)))
    flutter = np.zeros_like(tt)
    k = click(0.012, 800, 5000, 0.002)
    for n in range(int(31.0 * 24)):
        place(flutter, k * (0.7 + 0.3 * rng.random()), n / 24 + rng.normal(0, 0.0006))
    hiss = band(rng.standard_normal(len(tt)), 2000, 9000)
    rumble = band(rng.standard_normal(len(tt)), 30, 160)
    x = hum * 0.5 + flutter / np.max(np.abs(flutter)) * 0.55 + hiss / np.std(hiss) * 0.04 + rumble / np.std(rumble) * 0.12
    x *= np.minimum(1, tt / 0.6) * np.minimum(1, (31.0 - tt) / 1.0)
    save(os.path.join(out, 'projector.wav'), x, -6)
    # shutter: release click, spring buzz, second click
    s = np.zeros(int(0.18 * SR))
    place(s, click(0.03, 1500, 12000, 0.003), 0)
    tb = t(0.06)
    place(s, np.sin(2 * np.pi * 900 * tb) * np.exp(-tb / 0.015) * 0.25 + band(rng.standard_normal(len(tb)), 2000, 6000) * np.exp(-tb / 0.02) * 0.2, 0.004)
    place(s, click(0.03, 1000, 8000, 0.004) * 0.6, 0.07)
    save(os.path.join(out, 'shutter.wav'), s, -3)
    # advance ratchet
    a = np.zeros(int(0.32 * SR))
    times = np.cumsum([0, 0.06, 0.05, 0.042, 0.036, 0.032, 0.03])
    for i, tm in enumerate(times):
        place(a, click(0.015, 2500, 9000, 0.0015) * (0.6 + 0.06 * i), tm)
    save(os.path.join(out, 'advance.wav'), a, -6)
    # typewriter keys: a click with a short body, three pitches
    for i, body in enumerate((1800, 2100, 1600)):
        tk = t(0.09)
        key = click(0.09, 1200, 7000, 0.0035) + np.sin(2 * np.pi * body * tk) * np.exp(-tk / 0.012) * 0.25 + band(rng.standard_normal(len(tk)), 120, 400) * np.exp(-tk / 0.01) * 0.6
        save(os.path.join(out, f'key{i}.wav'), key, -6)
    # bell
    tb = t(0.6)
    bell = sum(a * np.sin(2 * np.pi * fr * tb) * np.exp(-tb / d) for fr, a, d in ((2637, 1, 0.25), (5274, 0.3, 0.1), (3950, 0.2, 0.15)))
    save(os.path.join(out, 'bell.wav'), bell, -10)
    # rustle
    tr = t(0.4)
    r = np.zeros_like(tr)
    for c0, d in ((0.0, 0.14), (0.16, 0.2)):
        seg = band(rng.standard_normal(len(tr)), 2500, 12000) * (rng.random(len(tr)) ** 3)
        r += seg * np.exp(-np.maximum(0, tr - c0) / d) * (tr >= c0)
    save(os.path.join(out, 'rustle.wav'), r, -6)
    # thud
    th = t(0.15)
    save(os.path.join(out, 'thud.wav'), band(rng.standard_normal(len(th)), 60, 500) * np.exp(-th / 0.025) + click(0.15, 1500, 6000, 0.004) * 0.3, -4)
    # flick: a swelling paper whoosh then a slap
    tf = t(0.5)
    w = band(rng.standard_normal(len(tf)), 700, 7000) * np.sin(np.pi * np.minimum(1, tf / 0.42)) ** 2
    slap = np.zeros_like(tf)
    place(slap, click(0.06, 300, 4000, 0.01) * 2.5, 0.4)
    save(os.path.join(out, 'flick.wav'), w + slap, -4)
    # run-out: flapping ticks slowing
    ru = np.zeros(int(1.3 * SR))
    tm, gap = 0.0, 0.035
    while tm < 1.2:
        place(ru, click(0.02, 900, 6000, 0.003) * (1 - tm / 1.3), tm)
        tm += gap
        gap *= 1.09
    save(os.path.join(out, 'runout.wav'), ru, -6)
    print('wrote', sorted(os.listdir(out)))


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'sfx')
