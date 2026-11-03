# cut the subject keeping the full canvas (for parallax registration): <out.png> <in.jpg> [maxside]
import sys
from rembg import remove, new_session
from PIL import Image
s = new_session('isnet-general-use')
im = Image.open(sys.argv[2]).convert('RGB')
m = int(sys.argv[3]) if len(sys.argv) > 3 else 2400
im.thumbnail((m, m))
out = remove(im, session=s, alpha_matting=True, alpha_matting_foreground_threshold=240, alpha_matting_background_threshold=12, alpha_matting_erode_size=8)
out.save(sys.argv[1]); print(out.size)
