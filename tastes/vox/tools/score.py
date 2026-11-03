"""A procedural documentary score for a vox reel: no third-party audio, fixed seed.

  python3 tastes/vox/tools/score.py <out.wav> [--cues '{"hit": 4.333, "lift": 8.5, "calm": 21.3, "end": 30}']   (needs numpy)

What it plays, in the manner of explainer beds (a pulse that keeps time under the voice, silence before the big
moment, a lift when the story opens out):
  - a marimba arpeggio in D minor on eighths at 96 bpm (the documentary bed the sound reels name), pizzicato bass on
    the beat, a soft pad under them (their tip: layer with soft strings or pads)
  - a soft clock tick on the off-beats
  - a warm pad (detuned saws, low-passed) that swells into each section
  - a noise riser into the hit, then about a second of near silence after it (the sound effect owns that moment)
  - after `lift` a second, higher pluck line and the pad opening; after `calm` the high line drops out; at `end` a
    held D minor chord fades
"""
import json
import sys
import wave
import numpy as np

SR = 48000
rng = np.random.default_rng(96)
BPM = 96.0
E8 = 60.0 / BPM / 2  # an eighth note in seconds


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def pluck(freq, dur, bright=0.5, decay=0.996):
    """Karplus-Strong: a burst of noise in a delay line, averaged each pass, so it rings and darkens like a string."""
    n = int(dur * SR)
    p = max(2, int(SR / freq))
    buf = rng.uniform(-1, 1, p)
    # a softer pick: low-pass the excitation
    for _ in range(int(3 * (1 - bright)) + 1):
        buf = 0.5 * (buf + np.roll(buf, 1))
    out = np.empty(n)
    for i in range(n):
        j = i % p
        v = buf[j]
        out[i] = v
        buf[j] = decay * 0.5 * (v + buf[(j + 1) % p])
    return out * np.minimum(1, np.arange(n) / (0.002 * SR))


def marimba(freq, dur=1.2, vel=1.0):
    """A struck bar: partials at 1, 3.9 and 9.2 times f0, amplitudes 1 : 0.35 : 0.1,
    2 ms attack, decays 260 / 120 / 40 ms, and a 12 ms mallet tick of noise band-passed 1.5-4 kHz at -22 dB."""
    n = int(dur * SR)
    tt = np.arange(n) / SR
    att = np.minimum(1, tt / 0.002)
    x = (np.sin(2 * np.pi * freq * tt) * np.exp(-tt / 0.26) + 0.35 * np.sin(2 * np.pi * freq * 3.9 * tt) * np.exp(-tt / 0.12)
         + 0.1 * np.sin(2 * np.pi * freq * 9.2 * tt) * np.exp(-tt / 0.04)) * att
    m = int(0.012 * SR)
    X = np.fft.rfft(rng.standard_normal(m))
    f = np.fft.rfftfreq(m, 1 / SR)
    X[(f < 1500) | (f > 4000)] = 0
    tick = np.fft.irfft(X, m)
    x[:m] += tick / (np.max(np.abs(tick)) or 1) * 10 ** (-22 / 20) * np.hanning(m)
    return x * vel


def pizz(freq, dur=0.5, vel=1.0):
    """A plucked string: partials 1-4 at 1 : 0.6 : 0.4 : 0.25, 1 ms attack, 90 ms decay."""
    n = int(dur * SR)
    tt = np.arange(n) / SR
    x = sum(a * np.sin(2 * np.pi * freq * k * tt) for k, a in zip((1, 2, 3, 4), (1, 0.6, 0.4, 0.25)))
    return x * np.minimum(1, tt / 0.001) * np.exp(-tt / 0.09) * vel


def lowpass(x, hz):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (f / hz) ** 4)
    return np.fft.irfft(X, len(x))


def saw(freq, t):
    return 2 * ((freq * t) % 1) - 1


def add(track, x, at):
    i = int(at * SR)
    if i >= len(track):
        return
    j = min(len(track), i + len(x))
    track[i:j] += x[: j - i]


def main(out, cues):
    end = cues.get('end', 30.0)
    hit, lift, calm = cues.get('hit', 4.333), cues.get('lift', 8.5), cues.get('calm', 21.3)
    n = int(end * SR)
    t = np.arange(n) / SR
    mix = np.zeros(n)

    # 1. the pulse: D minor broken chord on eighths, two bars of i - VI - III - VII (Dm Bb F C)
    chords = [[50, 53, 57, 62], [46, 50, 53, 58], [53, 57, 60, 65], [48, 52, 55, 60]]
    pattern = [0, 2, 1, 3, 2, 1, 3, 2]
    pulse = np.zeros(n)
    high = np.zeros(n)
    k = 0
    tt = 0.25
    while tt < end - 1.0:
        bar = int(k / 8) % len(chords)
        note = chords[bar][pattern[k % 8]]
        silent = hit - 0.05 < tt < hit + 1.15
        if not silent:
            # the marimba line sits an octave up (MIDI 62-77, about 290-700 Hz, where the reel's marimba is)
            vel = 0.6 + 0.2 * (k % 2 == 0)
            add(pulse, marimba(midi(note + 12), 1.0, vel), tt)
            # pizzicato bass on the beat, on the chord root
            if k % 2 == 0:
                add(high, pizz(midi(chords[bar][0] - 12), 0.45, 0.55), tt)
            if lift <= tt < calm and k % 4 == 3:
                add(pulse, marimba(midi(note + 24), 0.8, 0.35), tt + E8 * 0.5)
        k += 1
        tt += E8
    mix += pulse * 0.5 + lowpass(high, 600) * 0.45

    # 2. the clock tick on the off-beats
    tick = np.zeros(n)
    click = lowpass(rng.standard_normal(int(0.01 * SR)), 7000) * np.exp(-np.arange(int(0.01 * SR)) / (0.0012 * SR))
    tt = E8
    while tt < end - 1.5:
        if not (hit - 0.05 < tt < hit + 1.15):
            add(tick, click * 0.35, tt)
        tt += 2 * E8
    mix += tick

    # 3. the pad: detuned saws on the chord roots and fifths, low-passed, swelling into each section
    pad = np.zeros(n)
    for i, c in enumerate([50, 57, 62]):
        f0 = midi(c - 12 if i == 0 else c)
        pad += saw(f0 * 0.997, t) + saw(f0 * 1.003, t)
    pad = lowpass(pad, 650)
    env = np.interp(t, [0, 2.5, hit - 0.1, hit + 1.2, hit + 3.5, lift, lift + 2, calm, calm + 2, end - 3, end],
                    [0, 0.35, 0.45, 0.0, 0.4, 0.45, 0.7, 0.7, 0.4, 0.5, 0])
    mix += pad / np.max(np.abs(pad)) * env * 0.35

    # 4. the riser into the hit: noise swelling up through a rising band
    rs = hit - 1.6
    rn = int(1.6 * SR)
    riser = rng.standard_normal(rn)
    seg = np.zeros(rn)
    for q in range(16):
        a, b = q * rn // 16, (q + 1) * rn // 16
        X = np.fft.rfft(riser[a:b])
        f = np.fft.rfftfreq(b - a, 1 / SR)
        c = 300 * 2 ** (q / 3.0)
        X[(f < c * 0.5) | (f > c * 2)] = 0
        seg[a:b] = np.fft.irfft(X, b - a)
    add(mix, seg / np.max(np.abs(seg)) * np.linspace(0, 1, rn) ** 2 * 0.4, rs)

    # 5. the end: a held D minor chord, fading
    chord = sum(np.sin(2 * np.pi * midi(m) * t[: int(3.5 * SR)]) * (0.3 / (1 + j)) for j, m in enumerate([50, 57, 62, 65]))
    add(mix, chord * np.exp(-np.arange(int(3.5 * SR)) / (1.2 * SR)) * 0.5, end - 3.6)

    mix *= np.minimum(1, t / 0.3) * np.minimum(1, (end - t) / 0.6)
    peak = np.max(np.abs(mix)) or 1
    data = (mix / peak * 0.89 * 32767).astype('<i2')
    with wave.open(out, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
    print('wrote', out, f'{end:.1f} s')


if __name__ == '__main__':
    args = sys.argv[1:]
    cues = json.loads(args[args.index('--cues') + 1]) if '--cues' in args else {}
    main(args[0] if args and not args[0].startswith('--') else 'score.wav', cues)
