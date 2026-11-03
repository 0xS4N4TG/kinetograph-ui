# Lengthens the pauses of the one take at sentence ends, as the first launch film did (its tools/narration/respace.py):
# cuts in the quietest 10 ms of the gap after a word and inserts silence there. Words are never cut, stretched or moved
# relative to each other inside a sentence; only the silences between sentences grow. The generated voice reads straight
# through its full stops, so without this the film has no room to breathe.
#   python3 tools/respace.py public/vo/asr.json public/vo/take.wav public/vo/take-spaced.wav public/vo/asr-spaced.json
import array, json, sys, wave

asr_path, src, out, out_asr = sys.argv[1:5]
asr = json.load(open(asr_path))
words = asr['words']

# seconds of silence to add, by the index of the word the pause follows (the ASR's own 125 tokens)
PAUSES = {
    7: 0.4,    # studio,
    10: 0.4,   # Maria,
    19: 1.2,   # sun.        (the spark, then the chart)
    22: 0.5,   # ours.
    24: 0.5,   # Studio.
    27: 1.0,   # you.        (into the library)
    37: 1.6,   # story.      (the chart world holds)
    46: 1.8,   # in.         (the dive)
    51: 1.0,   # work,       (the library wide)
    56: 1.6,   # screen.     (a template world)
    62: 1.0,   # look.
    66: 1.2,   # grade.      (Hexed rolls and locks)
    70: 1.2,   # out.        (Paper)
    76: 1.2,   # screen.     (VJ)
    81: 1.0,   # hand        (brushes)
    88: 1.2,   # voice.
    92: 0.5,   # agent.
    95: 0.5,   # frame.
    98: 0.5,   # cut.
    101: 0.5,  # prop.
    102: 1.0,  # Export      (runs straight into "still" in the take)
    105: 0.7,  # browser.
    111: 1.2,  # GPU.
    114: 0.6,  # .3.
    119: 0.7,  # code.
}
if len(words) != 125:
    sys.exit(f'expected 125 words, got {len(words)}')

r = wave.open(src)
assert r.getnchannels() == 1 and r.getsampwidth() == 2, 'expects 16-bit mono'
rate = r.getframerate()
smp = array.array('h', r.readframes(r.getnframes()))

def quietest(a, b):
    win = int(0.01 * rate)
    lo, hi = int(a * rate), max(int(a * rate) + 1, int(b * rate) - win)
    best = min(range(lo, hi, max(1, win // 4)), key=lambda k: sum(abs(v) for v in smp[k:k + win]))
    return best + win // 2

cuts = []
for i, add in PAUSES.items():
    e, s_ = words[i]['end'], words[i + 1]['start']
    k = quietest(e - 0.03, max(s_, e + 0.04))
    cuts.append((k, add, i))
    print(f'  after {words[i]["word"]!r}: gap {s_ - e:.2f} s, cut at {k / rate:.3f} s, +{add} s')
cuts.sort()

fade = int(0.006 * rate)
for k, _, _ in cuts:
    for j in range(fade):
        g = j / fade
        smp[k - 1 - j] = int(smp[k - 1 - j] * g)
        smp[k + j] = int(smp[k + j] * g)

outp = array.array('h')
prev = 0
for k, add, _ in cuts:
    outp.extend(smp[prev:k])
    outp.extend(array.array('h', [0]) * int(add * rate))
    prev = k
outp.extend(smp[prev:])
w = wave.open(out, 'wb')
w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate)
w.writeframes(outp.tobytes())
w.close()

# move the word times by the silence added before them
shift = lambda t: t + sum(add for k, add, _ in cuts if k / rate <= t)
for wd in words:
    wd['start'] = round(shift(wd['start']), 3)
    wd['end'] = round(shift(wd['end']), 3)
for ln in asr['lines']:
    ln['start'] = round(shift(ln['start']), 3)
    ln['end'] = round(shift(ln['end'] - 0.001) + 0.001, 3)
asr['duration'] = round(len(outp) / rate, 3)
asr['respaced'] = {'from': src.split('/')[-1], 'pauses': {str(k): v for k, v in PAUSES.items()}}
json.dump(asr, open(out_asr, 'w'), indent=1)
print(f'{len(smp) / rate:.2f} s -> {len(outp) / rate:.2f} s')
