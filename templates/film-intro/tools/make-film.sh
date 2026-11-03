#!/bin/sh
# Builds public/film.mp4, the default film under the opening: about six seconds of public-domain archive film cut on
# the beats of the reference's film, graded pale and grey as the reference is (the dither does the rest).
#
#   Blacksmith Scene (1893), Fred Ott's Sneeze (1894), a 1927 parade (all from templates/vj-demo/public), shot_031 of
#   "Military Assistance Advisory Group (MAAG), Sea Swallow OPN..." (US National Archives, templates/cyberpunk-reel)
#   and Eadweard Muybridge's "The Horse in Motion" (1878, Library of Congress), cut into public/film/horse-*.png.
#
#   sh templates/film-intro/tools/make-film.sh
set -e
cd "$(dirname "$0")/.."
E=..
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
# grade: grey, lifted towards the paper, soft contrast, like the reference film
GRADE="format=gray,eq=contrast=0.72:brightness=0.31:gamma=1.4,format=yuv420p"
# shot <n> <src> <start> <dur> <crop w:h:x:y or ''>
shot() {
  crop=${5:+crop=$5,}
  ffmpeg -v error -y -ss "$3" -i "$2" -t "$4" -an -vf "${crop}scale=600:338:force_original_aspect_ratio=increase,crop=600:338,fps=30,$GRADE" "$TMP/$1.mp4"
}
# the gallop: Muybridge's eleven frames on pale ground, three times a cycle, the horse small and right of centre
horse() {
  i=0
  for k in 1 2 3 4 5 6 7 8 9 10 11 1 2 3 4 5 6 7 8 9 10 11; do
    i=$((i+1))
    ffmpeg -v error -y -f lavfi -i "color=c=0x8f8e8a:s=600x338" -i "public/film/horse-$(printf %02d $k).png" \
      -filter_complex "[1]scale=150:-1[h];[0][h]overlay=330:150" -frames:v 1 "$TMP/h_$(printf %03d $i).png"
  done
  ffmpeg -v error -y -framerate 30 -i "$TMP/h_%03d.png" -t "$1" -vf "$GRADE" "$TMP/$2.mp4"
}
shot 01 $E/vj-demo/public/blacksmith.mp4 0.0 0.37 ''
shot 02 $E/vj-demo/public/fred.mp4       1.2 0.40 '960:540:520:120'
shot 03 $E/vj-demo/public/veteran.mp4    0.2 0.86 ''
shot 04 $E/cyberpunk-reel/public/subject.mp4 1.0 0.70 ''
shot 05 $E/vj-demo/public/blacksmith.mp4 1.0 0.40 '960:540:600:360'
horse 0.60 06
shot 07 $E/vj-demo/public/fred.mp4       0.0 0.70 ''
shot 08 $E/vj-demo/public/veteran.mp4    1.2 0.50 '960:540:300:200'
shot 09 $E/cyberpunk-reel/public/subject.mp4 4.0 0.30 '960:540:480:200'
shot 10 $E/vj-demo/public/blacksmith.mp4 1.6 1.20 ''
for n in 01 02 03 04 05 06 07 08 09 10; do echo "file '$TMP/$n.mp4'"; done > "$TMP/list.txt"
ffmpeg -v error -y -f concat -safe 0 -i "$TMP/list.txt" -c:v libx264 -crf 18 -pix_fmt yuv420p -movflags +faststart public/film.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 public/film.mp4
