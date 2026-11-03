"""Synthesises public/beat.wav: an original 12 s, 120 bpm electronic loop for the audio visualisers (four-on-the-floor
kick, clap, hats, a sub bass line, a pad and an arpeggio coming in at bar 3). Written from scratch here, so it carries no
licence beyond the repo's own.

    python3 tools/make-beat.py          (needs numpy)
"""
import wave
from pathlib import Path

import numpy as np

SR = 44100
BPM = 120
BEAT = 60 / BPM
DUR = 12.0
N = int(SR * DUR)
t_all = np.arange(N) / SR
out = np.zeros(N)
rng = np.random.default_rng(7)


def place(sig, at, gain=1.0):
    i = int(at * SR)
    j = min(N, i + len(sig))
    if i < N:
        out[i:j] += sig[: j - i] * gain


def env(n, attack, decay):
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-t / decay)


def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for k in range(len(x)):
        acc = (1 - a) * x[k] + a * acc
        y[k] = acc
    return y


def kick():
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = 48 + 110 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * env(n, 0.001, 0.16) + 0.25 * np.sin(ph * 2) * env(n, 0.001, 0.02)


def clap():
    n = int(0.3 * SR)
    noise = rng.uniform(-1, 1, n)
    body = noise - lowpass(noise, 900)
    e = env(n, 0.001, 0.07)
    for d in (0.010, 0.021):  # the three hand slaps of a clap
        k = int(d * SR)
        e[k:] += 0.6 * env(n - k, 0.001, 0.012)
    return body * e * 0.5


def hat(open_=False):
    n = int((0.22 if open_ else 0.05) * SR)
    noise = rng.uniform(-1, 1, n)
    return (noise - lowpass(noise, 6000)) * env(n, 0.0005, 0.08 if open_ else 0.014) * 0.35


def tone(freq, length, shape='saw', cutoff=1200, attack=0.005, decay=0.3):
    n = int(length * SR)
    t = np.arange(n) / SR
    ph = (freq * t) % 1.0
    if shape == 'saw':
        x = 2 * ph - 1
    elif shape == 'square':
        x = np.sign(np.sin(2 * np.pi * freq * t))
    else:
        x = np.sin(2 * np.pi * freq * t)
    return lowpass(x, cutoff) * env(n, attack, decay)


hz = lambda m: 440 * 2 ** ((m - 69) / 12)
bars = int(DUR / (4 * BEAT))
roots = [45, 45, 41, 43, 45, 45, 41, 43]  # A, A, F, G: a minor loop
for b in range(bars):
    t0 = b * 4 * BEAT
    for q in range(4):
        place(kick(), t0 + q * BEAT, 0.95)
        place(hat(open_=True), t0 + q * BEAT + BEAT / 2, 0.8)
        for s in (1, 3):
            place(hat(), t0 + q * BEAT + s * BEAT / 4, 0.7)
    place(clap(), t0 + BEAT, 0.9)
    place(clap(), t0 + 3 * BEAT, 0.9)
    root = roots[b % len(roots)]
    # a sub bass on the off-beats, ducked under the kick
    for e in range(8):
        if e % 2 == 1:
            place(tone(hz(root - 12), BEAT / 2 * 0.95, 'saw', 260, 0.003, 0.18), t0 + e * BEAT / 2, 0.55)
    # a pad: the bar's minor or major triad, slow attack
    third = 3 if root in (45,) else 4
    for m in (root + 12, root + 12 + third, root + 19):
        place(tone(hz(m), 4 * BEAT, 'saw', 900, 0.4, 1.8), t0, 0.07)
    # the arpeggio from bar 3
    if b >= 2:
        notes = [root + 24, root + 24 + third, root + 31, root + 36]
        for s in range(16):
            place(tone(hz(notes[s % 4]), BEAT / 4 * 0.9, 'square', 2600, 0.002, 0.07), t0 + s * BEAT / 4, 0.09)

# fade in and out, then normalise to -1 dBFS
fade = np.ones(N)
k = int(0.25 * SR)
fade[:k] = np.linspace(0, 1, k)
fade[-int(0.6 * SR):] = np.linspace(1, 0, int(0.6 * SR))
out *= fade
out = np.tanh(out * 1.1)
out *= 10 ** (-1 / 20) / np.max(np.abs(out))

path = Path(__file__).resolve().parent.parent / 'public' / 'beat.wav'
with wave.open(str(path), 'wb') as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((out * 32767).astype('<i2').tobytes())
print(path, f'{DUR:.1f}s')
