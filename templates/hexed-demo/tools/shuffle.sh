#!/bin/bash
# Rolls a fresh seed (the render itself cannot: Kinetograph freezes Math.random so every frame draws the same) and
# renders the reel or the sheet with it. The seed is in the file name, so a look you like can be kept as a preset.
#   tools/shuffle.sh            the reel: eight new looks on the clip, 12 s
#   tools/shuffle.sh sheet      twenty new looks as one still
set -euo pipefail
cd "$(dirname "$0")/../../.."
seed=$(( $(od -An -N4 -tu4 /dev/urandom | tr -d ' ') % 1000000 ))
cli=../kinetograph/packages/cli/dist/cli.js
mkdir -p templates/hexed-demo/out
if [ "${1:-reel}" = sheet ]; then
  out=templates/hexed-demo/out/sheet-$seed.png
  node $cli still templates/hexed-demo/index.tsx 0 --comp Sheet --props "{\"first\":$seed}" -o "$out" >/dev/null
else
  out=templates/hexed-demo/out/reel-$seed.mp4
  node $cli render templates/hexed-demo/index.tsx --comp Reel --props "{\"first\":$seed}" -o "$out" >/dev/null
fi
n=19; [ "${1:-reel}" = sheet ] || n=7
echo "seeds $seed..$((seed + n)): $out"
