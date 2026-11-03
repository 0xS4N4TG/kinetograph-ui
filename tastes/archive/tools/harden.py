# harden a soft rembg matte so a semi-transparent body does not ghost: <in.png> <out.png> lo hi
import sys
import numpy as np
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGBA'); a = np.asarray(im).astype(np.float32)
lo, hi = float(sys.argv[3]), float(sys.argv[4])
al = np.clip((a[..., 3] / 255 - lo) / (hi - lo), 0, 1)
a[..., 3] = al * 255
Image.fromarray(a.astype(np.uint8)).save(sys.argv[2]); print('ok')
