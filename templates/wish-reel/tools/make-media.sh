#!/bin/sh
# Regenerates this effect's own footage: five plates and the collage photos, from clips on Wikimedia Commons, each
# then prepared like any other video (tools/prepare.mjs: cropped to 1440 x 1080 at 30 fps, camera tracked).
#
#   Enoshima - various scenes - 2022 Oct 31.webm         CC BY-SA 4.0   walkway, shops, shrine, rocks, photos
#   Enoden - kanagawa - 2024 july 2.webm                  CC BY-SA 4.0   platform, the WishFilter demo input
#   Treinstellen 2003 en 2002 ... Inamuragasaki ....webm  CC BY 4.0      photos
#   Kamakura kokomae 20220922.webm                        CC BY-SA 4.0   photos
#
# Download the four files from commons.wikimedia.org (the site refuses requests that send no User-Agent, so fetch
# them in a browser) into one folder and pass it:
#
#   tools/make-media.sh ~/Downloads/wish-sources
set -eu
cd "$(dirname "$0")/.."
S=$1
ENOSHIMA="$S/Enoshima_-_various_scenes_-_2022_Oct_31.webm"
ENODEN="$S/Enoden_-_kanagawa_-_2024_july_2.webm"
INAMURA=$(ls "$S"/Treinstellen_2003_en_2002*.webm)
KOKOMAE="$S/Kamakura_kokomae_20220922.webm"

#                     video      name     eye  tilt  start  length
node tools/prepare.mjs "$ENOSHIMA" walkway 1.5 -4 19.9 1.7
node tools/prepare.mjs "$ENODEN" platform 1.5 -8 0 1.6
node tools/prepare.mjs "$ENOSHIMA" shops 1.6 -3 44 2.6
node tools/prepare.mjs "$ENOSHIMA" shrine 1.6 -2 22 2.4
node tools/prepare.mjs "$ENOSHIMA" rocks 2.5 -9 14 1.0
node tools/prepare.mjs "$ENODEN" input 1.5 -8 0 9
rm -f public/walkway_photo* public/platform_photo* public/shops_photo* public/shrine_photo* public/rocks_photo*

# the collage's photos
photo() { ffmpeg -v error -y -ss "$2" -i "$1" -frames:v 1 -vf scale=640:-1 -q:v 3 "public/$3.jpg"; }
for t in 5 20 26 31 36 42 47; do photo "$ENOSHIMA" "$t" "photo_enoshima_$t"; done
photo "$KOKOMAE" 6 photo_kokomae22_6
photo "$INAMURA" 28 photo_inamura_28
photo "$ENODEN" 9 photo_enoden_9
photo "$ENODEN" 30 photo_enoden_30

# the card textures
python3 -I tools/patchwork.py
i=0
for c in "0x3fe0d0:0xfff06a:0xff6fb0" "0xff9a3c:0xffe14a:0x4ff0a0" "0x5ad1ff:0xb06bff:0xff6fb0" "0x7dff6a:0x2fd6ff:0xfff06a" "0xff6b6b:0xffd36a:0x6affd8" "0xffffff:0x9ff7ff:0xffb0f0"; do
  a=${c%%:*}; b=$(echo "$c" | cut -d: -f2); z=${c##*:}
  ffmpeg -v error -y -f lavfi -i "gradients=s=256x256:n=3:c0=$a:c1=$b:c2=$z:x0=0:y0=0:x1=256:y1=256:type=linear" -frames:v 1 "public/grad$i.png"
  i=$((i + 1))
done
