# fill the hole a cut-out leaves in its background: dilate the matte, then fill inward by repeated blurred
# diffusion from the edge (a pyramid push-pull), then add back noise matched to the plate's grain.
# usage: fillhole.py <photo.jpg> <subject.png> <out.jpg> [dilate px]
import sys
import numpy as np
from PIL import Image, ImageFilter
photo = Image.open(sys.argv[2]).size
sub = Image.open(sys.argv[2])
img = Image.open(sys.argv[1]).convert('RGB').resize(sub.size, Image.LANCZOS)
a = np.asarray(sub.split()[-1]).astype(np.float32) / 255
d = int(sys.argv[4]) if len(sys.argv) > 4 else 24
mask = Image.fromarray((a > 0.05).astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(2 * (d // 2) + 1))
hole = np.asarray(mask).astype(np.float32) / 255 > 0.5
X = np.asarray(img).astype(np.float32)
known = (~hole).astype(np.float32)

def down(x):
    h, w = x.shape[:2]; h2, w2 = h // 2 * 2, w // 2 * 2
    x = x[:h2, :w2]
    return (x[0::2, 0::2] + x[1::2, 0::2] + x[0::2, 1::2] + x[1::2, 1::2]) / 4

def pushpull(c, w):
    if min(w.shape) < 4:
        s = (c * w[..., None]).sum((0, 1)) / max(w.sum(), 1e-6)
        return np.broadcast_to(s, c.shape).copy()
    cw = down(c * w[..., None]); ww = down(w)
    small = pushpull(cw / np.maximum(ww, 1e-6)[..., None], np.minimum(ww * 4, 1))
    up = np.asarray(Image.fromarray(small.clip(0, 255).astype(np.uint8)).resize((c.shape[1], c.shape[0]), Image.BILINEAR)).astype(np.float32)
    return c * w[..., None] + up * (1 - w[..., None])

F = pushpull(X, known)
# grain: borrow high-pass texture from a shifted known region
rng = np.random.default_rng(3)
blur = np.asarray(Image.fromarray(X.astype(np.uint8)).filter(ImageFilter.GaussianBlur(3))).astype(np.float32)
hp = X - blur
sd = hp[~hole].std()
nz = rng.standard_normal(X.shape[:2])[..., None] * sd * 0.8
F = np.where(hole[..., None], F + nz, X)
Image.fromarray(F.clip(0, 255).astype(np.uint8)).save(sys.argv[3], quality=92)
print('filled', hole.mean())
