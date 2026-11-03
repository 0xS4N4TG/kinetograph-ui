"""A procedural bed for an archive reel: a slow piano over soft strings, A minor, no third-party audio, fixed seed.
Different from the vox bed on purpose (no marimba, no pulse, no clock): the archive look is still and old, so the
music is too.

  python3 tastes/archive/tools/score.py <out.wav> [--cues '{"lift": 4.4, "turn": 25.9, "end": 30}']   (needs numpy)

  - piano: a broken chord, one note a beat at 66 bpm, Am - F - C - G (then Am - Dm - F - E toward the end), each note
    a struck string (partials slightly stretched, 3 ms hammer, two-stage decay), with a three-note melody on the
    first beat of each bar after `lift`
  - strings: a low-passed ensemble of detuned saws with slow vibrato on the chord, 1.5 s swells, quiet under the piano
  - at `turn` the strings open a little; at `end` an A minor chord with the piano's low A, fading
"""
import json
import sys
import wave
import numpy as np

SR = 48000
rng = np.random.default_rng(1850)
BPM = 66.0
BEAT = 60.0 / BPM


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def piano(freq, dur=3.0, vel=1.0):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    x = np.zeros(n)
    for k in range(1, 9):
        fk = freq * k * np.sqrt(1 + 0.0004 * k * k)
        if fk > 12000:
            break
        a = (1.0 / k ** 1.3) * (1 + 0.3 * (k == 2))
        d1, d2 = 0.35 / (1 + 0.25 * k), 2.2 / (1 + 0.15 * k)
        x += a * np.sin(2 * np.pi * fk * tt) * (0.6 * np.exp(-tt / d1) + 0.4 * np.exp(-tt / d2))
    m = int(0.004 * SR)
    hammer = np.zeros(n)
    hammer[:m] = rng.standard_normal(m) * np.hanning(m) * 0.15
    x = (x + hammer) * np.minimum(1, tt / 0.003)
    # a damper at the end
    x *= np.minimum(1, (dur - tt) / 0.2)
    return x * vel


def lowpass(x, hz):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (f / hz) ** 4)
    return np.fft.irfft(X, len(x))


def add(track, x, at):
    i = int(at * SR)
    if i >= len(track):
        return
    j = min(len(track), i + len(x))
    track[i:j] += x[: j - i]


def strings(notes, dur):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    x = np.zeros(n)
    for m in notes:
        for det in (-0.004, 0.0, 0.005):
            fr = midi(m) * (1 + det) * (1 + 0.003 * np.sin(2 * np.pi * 5.2 * tt + rng.random() * 6))
            ph = np.cumsum(fr) / SR
            x += 2 * (ph % 1) - 1
    x = lowpass(x, 1400)
    env = np.minimum(1, tt / 1.5) * np.minimum(1, (dur - tt) / 1.2)
    return x * env


def main(out, cues):
    end = cues.get('end', 30.0)
    lift, turn = cues.get('lift', 4.4), cues.get('turn', 25.9)
    n = int(end * SR)
    t = np.arange(n) / SR
    pn = np.zeros(n)
    st = np.zeros(n)
    prog = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
    late = [[57, 60, 64], [50, 53, 57], [53, 57, 60], [52, 56, 59]]
    melody = {0: [76, 74, 72], 1: [72, 69, 72], 2: [72, 71, 67], 3: [71, 74, 71]}
    bar = 4 * BEAT
    b = 0
    while b * bar < end - 2.5:
        t0 = 0.4 + b * bar
        chords = late if t0 > turn - 6 else prog
        ch = chords[b % 4]
        root = ch[0] - 12
        # broken chord, one note a beat: root, fifth-ish, third, top
        for i, m in enumerate([root, ch[2] - 12, ch[1], ch[2]]):
            add(pn, piano(midi(m), 3.0, 0.55 if i else 0.75), t0 + i * BEAT + rng.normal(0, 0.006))
        if t0 >= lift:
            for i, m in enumerate(melody[b % 4]):
                add(pn, piano(midi(m), 2.5, 0.42), t0 + i * BEAT * 1.5 + 0.02)
        add(st, strings([ch[0] - 12, ch[0], ch[1]], bar + 1.2) * (0.6 if t0 < turn else 0.85), t0 - 0.3)
        b += 1
    # the close: A minor, held
    add(pn, piano(midi(45), 4.0, 0.8), end - 3.4)
    add(pn, piano(midi(57), 4.0, 0.5), end - 3.4)
    add(pn, piano(midi(64), 4.0, 0.45), end - 3.38)
    add(st, strings([45, 57, 60, 64], 3.4), end - 3.4)
    mix = pn / (np.max(np.abs(pn)) or 1) * 0.8 + st / (np.max(np.abs(st)) or 1) * 0.28
    # a small room: two early reflections and a soft tail
    rev = np.zeros(n)
    for d, g in ((0.023, 0.3), (0.041, 0.22), (0.067, 0.15), (0.11, 0.1), (0.17, 0.07)):
        rev[int(d * SR):] += mix[: n - int(d * SR)] * g
    mix = mix + lowpass(rev, 3000)
    mix *= np.minimum(1, t / 0.5) * np.minimum(1, (end - t) / 0.8)
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
