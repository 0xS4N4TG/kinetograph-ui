#!/bin/sh
# Renders PluginRun in parts (one long process runs out of memory in the p5.brush frames) and joins them into
# public/worlds/plugin-run.mp4. Run from kinetograph-ui. One part at a time, two frames at once.
set -e
K="node ../kinetograph-0.3.0/packages/cli/dist/cli.js"
TMP=$(mktemp -d)
LIST="$TMP/parts.txt"
i=0
for r in 0..70 70..140 140..210 210..270 270..285 285..300 300..315 315..330 330..345 345..416; do
  i=$((i + 1))
  part="$TMP/part$(printf %02d $i).mp4"
  $K render templates/inside/plugins.tsx --comp PluginRun --range "$r" --concurrency 2 --crf 14 -o "$part" >/dev/null 2>"$TMP/err$i.log" || { tail -20 "$TMP/err$i.log"; exit 1; }
  echo "file '$part'" >> "$LIST"
  echo "part $r done"
done
ffmpeg -v error -y -f concat -safe 0 -i "$LIST" -c copy templates/inside/public/worlds/plugin-run.mp4
rm -r "$TMP"
ffprobe -v error -select_streams v -show_entries stream=nb_frames,duration -of csv=p=0 templates/inside/public/worlds/plugin-run.mp4
