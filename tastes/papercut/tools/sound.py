"""Procedural sound for the papercut taste: the papercut-explainer Web Audio engine (library/audio/engine.js and sfx/*.js),
ported to numpy so a reel's sounds render offline without a browser. Same recipes, same seeds where the original had them.

  python3 tastes/papercut/tools/sound.py sfx <out dir>                       every SFX below as <name>.wav (mono, 48 kHz)
  python3 tastes/papercut/tools/sound.py bed <out.wav> <seconds> [preset]    the music bed (stereo), preset = marimba-G-116 (default),
                                                                          marimba-F-108, kalimba-story-G-66

Needs numpy only. Levels: SFX are rendered at the engine's fx-bus gain (0.75 x master 0.9) and the bed at its music-bus gain,
so a reel plays them at volume 1 and lands near -15 LUFS; check with `kinetograph audio analyze`.

SFX (name: what it sounds like, when to use it)
  pop        paper card pops in: low thup + tick. The workhorse; every prop that appears.
  pop3       three rising pops: three items appear.
  drop       eight pops in a row: a pile or stack lands.
  tape-peel  sticky tape ripping off paper: the tapePull cut.
  page-flip  a page turning: the pageTurn cut.
  whip       fast whip-pan swoosh: the whip cut.
  zoom       rising zoom sweep + saw: zoomThrough cut.
  whoosh     rising air: entrances, a card sent flying.
  slide      paper sliding across paper.
  rip        paper tear: tearAway cut.
  stamp      rubber-stamp slam: stampCut, a verdict.
  thud       dull heavy thud: something lands.
  hit        deep boom: the hook's first frame.
  snip       paper cutter / scissors chop: metal shear + thunk (new for this taste).
  click      one mouse or button click.
  keys       four keyboard taps.
  type       a short burst of fast typing (12 keys).
  tick       two square ticks: a checkbox, a counter step.
  count      fast ticking counter: numbers counting up.
  printer    receipt-printer ratchet.
  scribble   pencil / marker scribble.
  ding       two-note ding: notification, correct.
  chime      three-note major chime: resolution.
  sparkle    four high glints: something good appears.
  buzz       low detuned saw buzz: wrong, error.
  end-chime  warm two-note resolving chime for the last card.
"""
import json
import math
import os
import sys
import wave

import numpy as np

SR = 48000
MASTER = 0.9
FX_BUS = 0.75


# ---------- seeded noise (mulberry32, as engine.js rng) ----------
def rng(seed):
    s = [seed & 0xFFFFFFFF]

    def nxt():
        s[0] = (s[0] + 0x6D2B79F5) & 0xFFFFFFFF
        t = s[0]
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return nxt


def noise_buf(n, seed):
    # numpy noise from the seed (fast); the exact mulberry stream is not needed for the sound
    return np.random.default_rng(seed).uniform(-1, 1, n)


def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


# ---------- RBJ biquad, optionally with an exponential cutoff sweep ----------
def biquad(x, kind, f0, q=1.0, f1=None):
    n = len(x)
    y = np.zeros(n)
    x1 = x2 = y1 = y2 = 0.0
    block = 64
    for s in range(0, n, block):
        f = f0 if f1 is None else f0 * (f1 / f0) ** (s / max(1, n))
        f = min(f, SR * 0.45)
        w = 2 * math.pi * f / SR
        cw, sw = math.cos(w), math.sin(w)
        qq = q if kind == 'bandpass' else max(0.5, q)
        a = sw / (2 * qq)
        if kind == 'lowpass':
            b0, b1, b2 = (1 - cw) / 2, 1 - cw, (1 - cw) / 2
        elif kind == 'highpass':
            b0, b1, b2 = (1 + cw) / 2, -(1 + cw), (1 + cw) / 2
        else:  # bandpass, constant 0 dB peak (Web Audio)
            b0, b1, b2 = a, 0.0, -a
        a0, a1, a2 = 1 + a, -2 * cw, 1 - a
        b0, b1, b2, a1, a2 = b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0
        for i in range(s, min(n, s + block)):
            v = x[i]
            o = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
            x2, x1, y2, y1 = x1, v, y1, o
            y[i] = o
    return y


def osc(kind, f0, n, f1=None, dur=None):
    tt = np.arange(n) / SR
    if f1 is None:
        freq = np.full(n, float(f0))
    else:
        d = dur or n / SR
        freq = f0 * (f1 / f0) ** np.minimum(1, tt / d)
    ph = np.cumsum(freq) / SR
    ph -= np.floor(ph)
    if kind == 'sine':
        return np.sin(2 * np.pi * ph)
    if kind == 'square':
        return np.where(ph < 0.5, 1.0, -1.0)
    if kind == 'sawtooth':
        return 2 * ph - 1
    return 1 - 4 * np.abs(ph - 0.5)  # triangle


class Track:
    """A mono or stereo buffer that recipes add into, at times in seconds."""

    def __init__(self, sec, ch=1):
        self.buf = np.zeros((ch, int(math.ceil(sec * SR)) + SR))

    def add(self, t, sig, pan=0.0):
        i0 = max(0, int(round(t * SR)))
        if i0 >= self.buf.shape[1]:
            return
        sig = sig[: self.buf.shape[1] - i0]
        if self.buf.shape[0] == 1:
            self.buf[0, i0:i0 + len(sig)] += sig
        else:
            l, r = math.cos((pan + 1) * math.pi / 4), math.sin((pan + 1) * math.pi / 4)
            self.buf[0, i0:i0 + len(sig)] += sig * l * math.sqrt(2)
            self.buf[1, i0:i0 + len(sig)] += sig * r * math.sqrt(2)


# ---------- fx primitives (K.noise / K.tone / K.pop / K.chime) ----------
def k_noise(tr, t, d, g=0.3, type='bandpass', f=2000, q=1, f2=None, env=2, seed=1):
    n = int(d * SR)
    x = biquad(noise_buf(n, seed), type, f, q, f2)
    tt = np.arange(n) / SR
    att = min(0.015, d * 0.2)
    e = np.minimum(1, tt / att) * g
    t0 = d * (0.3 if env == 2 else 0.8)
    e = np.where(tt > t0, g * np.exp(-(tt - t0) / (d * 0.2)), e)
    tr.add(t, x * e * FX_BUS * MASTER)


def k_tone(tr, f, t, d, g=0.2, type='sine', f2=None):
    n = int((d + 0.05) * SR)
    x = osc(type, f, n, f2, d)
    tt = np.arange(n) / SR
    e = np.where(tt < 0.004, tt / 0.004 * g, g * (0.0005 / g) ** np.clip((tt - 0.004) / max(1e-3, d - 0.004), 0, 1))
    e[tt > d] = 0
    tr.add(t, x * e * FX_BUS * MASTER)


def k_pop(tr, t, f=1.0):
    k_noise(tr, t, 0.06, g=0.32, type='lowpass', f=900 * f, q=0.8, seed=int(round(t * 100)) + 3)
    k_tone(tr, 220 * f, t, 0.07, g=0.18, f2=120 * f)
    k_tone(tr, 1400 * f, t, 0.03, g=0.05)


def k_chime(tr, t):
    k_tone(tr, 1046.5, t, 0.9, g=0.15)
    k_tone(tr, 1318.5, t + 0.07, 0.8, g=0.12)
    k_tone(tr, 1568, t + 0.14, 0.7, g=0.1)


SFX = {
    'pop': (0.2, lambda T: k_pop(T, 0)),
    'pop3': (0.45, lambda T: [k_pop(T, 0, 0.9), k_pop(T, 0.13, 1), k_pop(T, 0.26, 1.12)]),
    'drop': (0.9, lambda T: [k_pop(T, k * 0.09, 0.8 + (k % 3) * 0.12) for k in range(8)]),
    'tape-peel': (0.6, lambda T: [
        k_noise(T, 0, 0.36, g=0.09, f=900, f2=4200, q=1.8, env=1, seed=330),
        *[k_noise(T, 0.36 * (k / 24) ** 0.8, 0.012, g=0.08 + 0.05 * (k / 24), f=1900 + k * 150, q=3, seed=340 + k) for k in range(24)],
        k_noise(T, 0.4, 0.08, g=0.14, type='lowpass', f=800, f2=300, q=0.8, seed=370),
        k_noise(T, 0.45, 0.04, g=0.07, f=1800, q=1.5, seed=371)]),
    'page-flip': (0.5, lambda T: [
        k_noise(T, 0, 0.09, g=0.08, type='lowpass', f=700, q=0.6, seed=301),
        k_noise(T, 0.03, 0.26, g=0.17, f=800, f2=3800, q=0.8, env=1, seed=302),
        *[k_noise(T, 0.14 + k * 0.034, 0.018, g=0.07 * (1 - k / 9), f=2600 + (k % 2) * 800, q=2.2, seed=310 + k) for k in range(7)],
        k_noise(T, 0.34, 0.06, g=0.1, type='lowpass', f=900, q=0.7, seed=320)]),
    'whip': (0.4, lambda T: k_noise(T, 0, 0.3, g=0.32, f=600, f2=5000, q=0.7, env=1, seed=161)),
    'zoom': (0.8, lambda T: [k_noise(T, 0, 0.7, g=0.25, f=300, f2=4200, q=1.3, env=1, seed=120),
                             k_tone(T, 150, 0, 0.6, g=0.07, type='sawtooth', f2=600)]),
    'whoosh': (0.65, lambda T: k_noise(T, 0, 0.55, g=0.3, f=350, f2=3000, q=0.8, env=1, seed=21)),
    'slide': (0.45, lambda T: k_noise(T, 0, 0.35, g=0.16, f=700, f2=1500, q=0.9, env=1, seed=31)),
    'rip': (0.35, lambda T: [k_noise(T, k * 0.03, 0.05, g=0.14, f=2200 - k * 150, q=1.6, seed=180 + k) for k in range(7)]),
    'stamp': (0.4, lambda T: [k_tone(T, 80, 0, 0.3, g=0.55, f2=42), k_noise(T, 0, 0.16, g=0.4, type='lowpass', f=700, q=0.7, seed=41)]),
    'thud': (0.35, lambda T: [k_tone(T, 95, 0, 0.25, g=0.45, f2=55), k_noise(T, 0, 0.1, g=0.2, type='lowpass', f=500, seed=91)]),
    'hit': (0.7, lambda T: [k_tone(T, 55, 0, 0.6, g=0.5, f2=38), k_noise(T, 0, 0.3, g=0.18, type='lowpass', f=1200, seed=7)]),
    # new: a paper-cutter chop. A bright metal shear sweeping down, a short ring, then the blade's thunk on the board.
    'snip': (0.35, lambda T: [k_noise(T, 0, 0.07, g=0.16, f=6500, f2=3000, q=2.4, env=1, seed=501),
                              k_tone(T, 2650, 0.02, 0.12, g=0.035),
                              k_tone(T, 140, 0.05, 0.12, g=0.3, f2=70),
                              k_noise(T, 0.05, 0.06, g=0.16, type='lowpass', f=900, q=0.8, seed=502)]),
    'click': (0.1, lambda T: [k_tone(T, 3200, 0, 0.02, g=0.14, type='square'), k_noise(T, 0, 0.02, g=0.1, f=5000, q=2, seed=131)]),
    'keys': (0.7, lambda T: [[k_tone(T, 1900, k * 0.167, 0.03, g=0.1, type='square'),
                              k_noise(T, k * 0.167, 0.025, g=0.08, f=4500, q=2, seed=300 + k)] for k in range(4)]),
    'type': (0.8, lambda T: [[k_tone(T, 1600 + ((k * 37) % 11) * 55, k * 0.055 + ((k * 13) % 7 - 3) * 0.003, 0.02, g=0.06, type='square'),
                              k_noise(T, k * 0.055, 0.02, g=0.06, f=4000, q=2, seed=100 + k)] for k in range(12)]),
    'tick': (0.2, lambda T: [k_tone(T, 2400, 0, 0.035, g=0.12, type='square'), k_tone(T, 1800, 0.1, 0.035, g=0.08, type='square')]),
    'count': (1.1, lambda T: [k_tone(T, 1700 + k * 40, k * 0.07, 0.025, g=0.07 * (1 - k / 20), type='square') for k in range(14)]),
    'printer': (0.55, lambda T: [[k_tone(T, 260, k * 0.07, 0.04, g=0.12, type='square'),
                                  k_noise(T, k * 0.07, 0.05, g=0.1, f=1800, q=1.5, seed=230 + k)] for k in range(6)]),
    'scribble': (0.4, lambda T: [k_noise(T, k * 0.06, 0.05, g=0.08, f=3000 + k * 300, q=2.5, seed=80 + k) for k in range(5)]),
    'ding': (1.5, lambda T: [k_tone(T, 1318.5, 0, 1.1, g=0.14), k_tone(T, 1046.5, 0.22, 1.2, g=0.12)]),
    'chime': (1.0, lambda T: k_chime(T, 0)),
    'sparkle': (0.5, lambda T: [k_tone(T, f, k * 0.05, 0.3, g=0.05) for k, f in enumerate([2093, 2637, 3136, 4186])]),
    'buzz': (0.45, lambda T: [k_tone(T, 110, 0, 0.35, g=0.1, type='sawtooth'), k_tone(T, 116, 0, 0.35, g=0.08, type='sawtooth')]),
    'end-chime': (1.8, lambda T: [k_tone(T, 783.99, 0, 0.8, g=0.25), k_tone(T, 1568, 0, 0.35, g=0.03),
                                  k_tone(T, 1046.5, 0.22, 1.5, g=0.29), k_tone(T, 2093, 0.22, 0.5, g=0.03), k_tone(T, 523.25, 0.22, 1.3, g=0.06)]),
}


def write(path, buf):
    buf = np.atleast_2d(buf)
    data = (np.clip(buf.T, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(buf.shape[0])
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


def render_sfx(out):
    os.makedirs(out, exist_ok=True)
    for name, (sec, fn) in SFX.items():
        tr = Track(sec)
        fn(tr)
        b = tr.buf[:, : int(sec * SR)]
        fade = int(0.004 * SR)
        b[:, -fade:] *= np.linspace(1, 0, fade)
        write(os.path.join(out, f'{name}.wav'), b)
        print(name, f'{sec:.2f}s', f'peak {20 * np.log10(np.max(np.abs(b)) + 1e-9):.1f} dBFS')


# ---------- the music bed (playBed in engine.js) ----------
BEDS = {
    'marimba-G-116': {"bpm": 116, "instrument": "marimba", "prog": [[40, [64, 67, 71, 76]], [36, [60, 64, 67, 72]], [43, [62, 67, 71, 74]], [38, [62, 66, 69, 74]]],
                      "pattern": [0, 1, 2, 1, 3, 2, 1, 2], "skip": [[5, 2, 1]], "sub": [[0, 1.6, 0.45], [2, 1.6, 0.35]], "sparkleEvery4th": True,
                      "perc": "clap", "percGain": 0.16, "outro": [67, 71, 74, 79, 83]},
    'marimba-F-108': {"bpm": 108, "instrument": "marimba", "prog": [[41, [65, 69, 72, 77]], [36, [60, 64, 67, 72]], [38, [62, 65, 69, 74]], [34, [58, 62, 65, 70]]],
                      "pattern": [0, 2, 1, 3, 2, 1, 3, 0], "skip": [[5, 2, 1]], "sub": [[0, 1.6, 0.45], [2, 1.6, 0.35]], "sparkleEvery4th": True,
                      "tailSec": 1.4, "outro": [65, 69, 72, 77, 81]},
    'kalimba-story-G-66': {"bpm": 66, "instrument": "kalimba", "octave": 12, "prog": [[43, [59, 62, 66, 67]], [40, [59, 62, 64, 67]], [48, [59, 60, 64, 67]], [38, [57, 62, 64, 66]]],
                           "pattern": [0, 2, 1, 3, 2, 1, 3, 2], "skip": [[1, 1, 0], [7, 1, 0], [5, 2, 0]], "sub": [[0, 3.2, 0.26], [2.5, 1.4, 0.12]], "pad": 0.055,
                           "pluckDecay": 1.15, "pluckGain": [0.075, 0.05], "shaker": [0, 7000], "perc": None, "plips": 0.035, "sparkleEvery4th": True,
                           "musicGain": 0.3, "tailSec": 2.2, "outro": [74, 78, 79, 83, 86]},
}


def render_bed(out, dur, preset='marimba-G-116'):
    bed = BEDS[preset] if preset in BEDS else json.load(open(preset))
    gain = bed.get('musicGain', 0.3) * MASTER
    tr = Track(dur, ch=2)
    R = rng(4242)
    bed_end = dur - bed.get('tailSec', 1.3)
    kal = bed['instrument'] == 'kalimba'

    def pluck(f, t, d, g, bright=1.0, force=False, pan=0.0):
        if not force and t > bed_end:
            return
        n = int((d + 0.05) * SR)
        tt = np.arange(n) / SR
        fc = (3200 if kal else 2800) * bright
        # band-limited triangle (odd harmonics, 1/k^2) through a 2-pole lowpass response, plus the 4x (5.4x kalimba) sine partial
        x = np.zeros(n)
        if kal:
            x += np.sin(2 * np.pi * f * tt)
        else:
            for k in range(1, 16, 2):
                if f * k > SR * 0.45:
                    break
                lp = 1 / math.sqrt(1 + (f * k / fc) ** 4)
                x += ((-1) ** ((k - 1) // 2)) * (8 / math.pi ** 2) / k ** 2 * lp * np.sin(2 * np.pi * f * k * tt)
        p2 = f * (5.4 if kal else 4)
        x += (0.07 if kal else 0.12) * np.sin(2 * np.pi * p2 * tt) / math.sqrt(1 + (p2 / fc) ** 4)
        att = 0.004 if kal else 0.006
        e = np.where(tt < att, tt / att * g, g * (0.0005 / g) ** np.clip((tt - att) / d, 0, 1))
        e[tt > d] = 0
        tr.add(t, x * e * gain, pan)

    def sub(f, t, d, g):
        if t > bed_end:
            return
        n = int((d + 0.3) * SR)
        tt = np.arange(n) / SR
        e = np.where(tt < 0.02, tt / 0.02 * g, g)
        e = np.where(tt > d * 0.5, g * np.exp(-(tt - d * 0.5) / (d * 0.2)), e)
        tr.add(t, np.sin(2 * np.pi * f * tt) * e * gain)

    def burst(t, d, pw, kind, f, q, g, chop=False, seed=0):
        n = int(math.ceil(SR * d))
        i = np.arange(n)
        x = noise_buf(n, seed) * (1 - i / n) ** pw
        if chop:
            x = x * np.where((i < SR * 0.01) & ((i // int(SR * 0.0035)) % 2 == 1), 0.5, 1.0)
        tr.add(t, biquad(x, kind, f, q or 0.707) * g * gain, (R() - 0.5) * 0.5)

    def pad(notes, t, d, g):
        if t > bed_end:
            return
        n = int((d + 0.5) * SR)
        tt = np.arange(n) / SR
        e = np.clip(tt / 0.35, 0, 1) * g
        e = np.where(tt > d - 0.3, g * np.clip(1 - (tt - (d - 0.3)) / 0.5, 0, 1), e)
        x = sum(osc('triangle', hz(m) * 2 ** (det / 1200), n) for m in notes for det in (-6, 5))
        x = biquad(x, 'lowpass', 1400)
        tr.add(t, x * e * gain)

    beat = 60 / bed['bpm']
    bar = beat * 4
    skips = bed.get('skip') or []
    b, t = 0, 0.0
    while t < bed_end:
        root, ch = bed['prog'][b % len(bed['prog'])]
        s1, s2 = bed.get('sub') or [[0, 1.6, 0.45], [2, 1.6, 0.35]]
        sub(hz(root - 12), t + s1[0] * beat, beat * s1[1], s1[2])
        sub(hz(root - 12), t + s2[0] * beat, beat * s2[1], s2[2])
        if bed.get('pad'):
            pad(ch[:3], t, bar, bed['pad'])
        for k in range(8):
            tt = t + k * beat / 2
            if any(k == kk and b % mod == rem for kk, mod, rem in skips):
                continue
            pg = bed.get('pluckGain') or [0.15, 0.1]
            pluck(hz(ch[bed['pattern'][k]] + bed.get('octave', 0)), tt, bed.get('pluckDecay', 0.35), pg[k % 2], 0.9, pan=((k % 3) - 1) * 0.15)
            sh = bed.get('shaker') or [0.035, 6500]
            if sh[0]:
                burst(tt + beat / 4, 0.06, 3, 'highpass', sh[1], 0, sh[0], seed=900 + b * 8 + k)
        if bed.get('sparkleEvery4th') and b % 4 == 3:
            pluck(hz(ch[3] + 12), t + beat * 3.5, 0.7, 0.06, 1.2)
        if bed.get('perc') == 'clap' and b > 0:
            g = bed.get('percGain', 0.16)
            burst(t + beat, 0.12, 6, 'bandpass', 1500, 0.9, g, chop=True, seed=700 + b)
            burst(t + beat * 3, 0.12, 6, 'bandpass', 1500, 0.9, g, chop=True, seed=800 + b)
        b += 1
        t += bar
    # outro arpeggio (SFX 'outro'): lands about 40 frames before the end
    t_out = max(0.0, dur - 40 / 30 - 0.4)
    for k, m in enumerate(bed.get('outro') or [69, 72, 76, 81, 84]):
        pluck(hz(m), t_out + k * 0.09, 1.5, 0.13, 1.1, True)
    buf = tr.buf[:, : int(dur * SR)]
    fade = int(0.6 * SR)
    buf[:, -fade:] *= np.linspace(1, 0, fade) ** 2
    write(out, buf)
    print(out, f'{dur:.2f}s', preset, f'peak {20 * np.log10(np.max(np.abs(buf)) + 1e-9):.1f} dBFS')


if __name__ == '__main__':
    if len(sys.argv) >= 3 and sys.argv[1] == 'sfx':
        render_sfx(sys.argv[2])
    elif len(sys.argv) >= 4 and sys.argv[1] == 'bed':
        render_bed(sys.argv[2], float(sys.argv[3]), sys.argv[4] if len(sys.argv) > 4 else 'marimba-G-116')
    else:
        print(__doc__)
        sys.exit(1)
