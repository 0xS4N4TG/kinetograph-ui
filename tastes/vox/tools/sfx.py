"""Procedural sound effects for the vox taste: no third-party audio, fixed seeds, so a re-run reproduces them exactly.

  python3 tastes/vox/tools/sfx.py <out dir>     (needs numpy)

Each is a short mono 48 kHz WAV, built from noise, filters and envelopes the way the tactile-SFX reels describe them
(paper movement, quick page flick, mechanical click, typewriter, a deep boom, a whoosh for camera moves, a bed):

  boom.wav     a far explosion: a sub sweep 70 to 28 Hz plus low-passed noise, 40 ms attack, 3 s decay
  rumble.wav   a low bed: brown noise low-passed at 120 Hz with a slow swell, 6 s
  whoosh.wav   air past the lens: band-passed noise sweeping up then down, 0.7 s
  paper.wav    a sheet slid across a table: high-passed noise with crackle grains, 0.45 s
  flick.wav    a quick page flick: two short noise bursts, 0.25 s
  tick.wav     an odometer wheel click: a 6 ms filtered click
  pop.wav      a word landing: a bright noise burst, 2-16 kHz, about 6 ms decay (as measured in the SFX reel)
  type.wav     a typewriter key: a click and a metallic ring at 2.4 kHz, 0.12 s
  marker.wav   a felt marker squeaking along paper, 0.45 s
  snap.wav     a film camera shutter: two clicks 38 ms apart
  click.wav    the hard-cut click: a 5 ms bright burst
  bed.wav      a dark pad for documentary pacing: D minor drone with slow movement, 32 s
"""
import os
import sys
import wave
import numpy as np

SR = 48000
rng = np.random.default_rng(1883)


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


def onepole_lp(x, hz):
    a = np.exp(-2 * np.pi * hz / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def fft_band(x, lo, hi):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))


def env(n, attack, decay, sec):
    tt = np.arange(n) / SR
    e = np.minimum(1, tt / max(attack, 1e-4)) * np.exp(-np.maximum(0, tt - attack) / decay)
    return e


def main(out):
    os.makedirs(out, exist_ok=True)
    # boom
    tt = t(3.6)
    sweep = np.sin(2 * np.pi * np.cumsum(28 + 42 * np.exp(-tt * 2.2)) / SR)
    noise = fft_band(rng.standard_normal(len(tt)), 20, 260)
    crack = fft_band(rng.standard_normal(len(tt)), 300, 3000) * np.exp(-tt / 0.08)
    save(os.path.join(out, 'boom.wav'), (1.0 * sweep + 0.9 * noise / np.std(noise) * 0.4 + 0.25 * crack / np.std(crack)) * env(len(tt), 0.04, 1.1, 3.6))
    # rumble
    tt = t(6.0)
    brown = np.cumsum(rng.standard_normal(len(tt)))
    brown = fft_band(brown - np.mean(brown), 18, 120)
    swell = 0.6 + 0.4 * np.sin(2 * np.pi * tt / 6.0 - np.pi / 2) ** 2
    fade = np.minimum(1, tt / 0.5) * np.minimum(1, (6.0 - tt) / 0.5)
    save(os.path.join(out, 'rumble.wav'), brown * swell * fade, -3)
    # whoosh: a moving band
    tt = t(0.7)
    n = rng.standard_normal(len(tt))
    out_w = np.zeros_like(n)
    for k in range(14):
        a, b = int(k * len(tt) / 14), int((k + 1) * len(tt) / 14)
        c = 600 + 2600 * np.sin(np.pi * (k + 0.5) / 14)
        seg = fft_band(n, c * 0.6, c * 1.4)[a:b]
        out_w[a:b] = seg
    save(os.path.join(out, 'whoosh.wav'), out_w * np.sin(np.pi * tt / 0.7) ** 1.5, -4)
    # paper slide
    tt = t(0.45)
    hiss = fft_band(rng.standard_normal(len(tt)), 1800, 9000)
    grains = np.zeros_like(tt)
    for i in rng.integers(0, len(tt), 60):
        grains[i:i + 30] += rng.uniform(0.4, 1.0) * np.hanning(30)[: len(grains[i:i + 30])]
    save(os.path.join(out, 'paper.wav'), (hiss / np.std(hiss) * 0.4 + fft_band(grains * rng.standard_normal(len(tt)), 1500, 8000) * 3) * np.sin(np.pi * tt / 0.45) ** 0.8, -6)
    # page flick
    tt = t(0.25)
    a = fft_band(rng.standard_normal(len(tt)), 900, 7000)
    e = np.exp(-tt / 0.03) + 0.7 * np.exp(-np.maximum(0, tt - 0.09) / 0.04) * (tt > 0.09)
    save(os.path.join(out, 'flick.wav'), a * e, -4)
    # odometer tick
    tt = t(0.02)
    save(os.path.join(out, 'tick.wav'), fft_band(rng.standard_normal(len(tt)), 2000, 9000) * np.exp(-tt / 0.0015), -8)
    # word pop: the measured kind: a bright noise burst, 2-16 kHz, 5-50 ms, no body
    tt = t(0.06)
    click = fft_band(rng.standard_normal(len(tt)), 2000, 14000) * np.exp(-tt / 0.006)
    save(os.path.join(out, 'pop.wav'), click, -9)
    # typewriter key
    tt = t(0.12)
    key = fft_band(rng.standard_normal(len(tt)), 1000, 6000) * np.exp(-tt / 0.004)
    ring = np.sin(2 * np.pi * 2400 * tt) * np.exp(-tt / 0.03) * 0.25
    save(os.path.join(out, 'type.wav'), key + ring, -8)
    # bed: D minor drone (D2, A2, F3, D3), slow filtered swell, 32 s
    tt = t(32.0)
    tones = [73.42, 110.0, 174.61, 146.83]
    pad = sum(np.sin(2 * np.pi * fr * tt + 0.3 * np.sin(2 * np.pi * 0.07 * (i + 1) * tt)) * (0.9 - 0.15 * i) for i, fr in enumerate(tones))
    pad += 0.25 * fft_band(rng.standard_normal(len(tt)), 60, 400)
    lfo = 0.65 + 0.35 * np.sin(2 * np.pi * tt / 11.0) ** 2
    fade = np.minimum(1, tt / 2.0) * np.minimum(1, (32.0 - tt) / 2.0)
    save(os.path.join(out, 'bed.wav'), pad * lfo * fade, -6)
    # felt marker on paper (the sound reel: "felt marker"): stick-slip squeak, band noise 1.2-5 kHz, amplitude chattering
    # at about 35 Hz, swelling over the stroke, 0.45 s
    tt = t(0.45)
    band = fft_band(rng.standard_normal(len(tt)), 1200, 5000)
    chatter = 0.55 + 0.45 * np.abs(np.sin(2 * np.pi * 35 * tt + 3 * np.sin(2 * np.pi * 3 * tt)))
    save(os.path.join(out, 'marker.wav'), band * chatter * np.sin(np.pi * tt / 0.45) ** 0.6, -10)
    # film camera shutter snap: two bright clicks 38 ms apart and a short mechanical buzz between
    tt = t(0.12)
    c1 = fft_band(rng.standard_normal(len(tt)), 2500, 12000) * np.exp(-tt / 0.003)
    c2 = np.zeros_like(tt)
    i2 = int(0.038 * SR)
    c2[i2:] = c1[: len(tt) - i2] * 0.8
    buzz = np.sign(np.sin(2 * np.pi * 180 * tt)) * np.exp(-tt / 0.02) * (tt < 0.04) * 0.08
    save(os.path.join(out, 'snap.wav'), c1 + c2 + buzz, -8)
    # cut click: the measured hard-cut sound, a 5 ms bright burst, 2-16 kHz
    tt = t(0.03)
    save(os.path.join(out, 'click.wav'), fft_band(rng.standard_normal(len(tt)), 2000, 16000) * np.exp(-tt / 0.0025), -10)
    print('wrote', sorted(os.listdir(out)))


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'sfx')
