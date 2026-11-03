#!/bin/sh
# The paper cut-out's picture: a still of plugins.tsx's CutSource (Hexed's locked look on source frame 42) with the
# alpha from tools/smith-mattes.py, as public/plugins/smith-cut.png. Run from kinetograph-ui.
set -e
K="node ../kinetograph-0.3.0/packages/cli/dist/cli.js"
TMP=$(mktemp -d)
$K still templates/inside/plugins.tsx 0 --comp CutSource -o "$TMP/rgb.png"
python3 -I -c "
from PIL import Image
im = Image.open('$TMP/rgb.png').convert('RGB')
im.putalpha(Image.open('templates/inside/public/plugins/smith-alpha.png').convert('L'))
im.save('templates/inside/public/plugins/smith-cut.png')
print('cut-out -> templates/inside/public/plugins/smith-cut.png')
"
rm -r "$TMP"
