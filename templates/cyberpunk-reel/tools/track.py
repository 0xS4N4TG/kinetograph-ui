# Writes track.ts: where the person is in each frame of public/matte.mp4, as the
# x of the matte's centroid (canvas pixels), smoothed over 9 frames. The rays
# and the flying shapes start from the chest at that x.
#   python3 -I tools/track.py public/matte.mp4 > track.ts
import subprocess
import sys

W, H = 192, 108
raw = subprocess.run(
    ['ffmpeg', '-v', 'error', '-i', sys.argv[1], '-vf', f'scale={W}:{H},format=gray', '-f', 'rawvideo', '-'],
    check=True, capture_output=True).stdout
n = W * H
xs = []
for i in range(len(raw) // n):
    f = raw[i * n:(i + 1) * n]
    sx = c = 0
    for p in range(n):
        if f[p] > 128:
            sx += p % W
            c += 1
    xs.append(sx / c * (1920 / W) if c else 960)
smooth = []
for i in range(len(xs)):
    win = xs[max(0, i - 4):i + 5]
    smooth.append(round(sum(win) / len(win)))
print('// Made by tools/track.py from public/matte.mp4: the x of the person (canvas pixels) for each frame of the clip.')
print(f'export const TRACK_X: number[] = {smooth};')
