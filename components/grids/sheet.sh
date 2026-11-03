#!/bin/bash
# usage: sheet.sh CompId f1 f2 ...   -> out/<Id>-sheet.png (stills tiled 3 across)
cd "$(dirname "$0")/../.."
id=$1; shift
rm -f components/grids/out/_s_*.png
i=0
for f in "$@"; do
  node ../kinetograph/packages/cli/dist/cli.js still components/grids/index.tsx $f --comp $id -o components/grids/out/_s_$(printf %02d $i).png >/dev/null 2>&1 || echo "fail $f"
  i=$((i+1))
done
ffmpeg -loglevel error -y -i components/grids/out/_s_%02d.png -vf "scale=640:-1,tile=3x3" components/grids/out/$id-sheet.png
rm -f components/grids/out/_s_*.png
