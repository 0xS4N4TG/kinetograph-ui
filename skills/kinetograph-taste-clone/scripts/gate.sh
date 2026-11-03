#!/bin/sh
# gate.sh REF CLONE OUTDIR FRAME [FRAME...]
# For each frame number (0-based): OUTDIR/gNNNN.png = reference | clone | difference x4, all at the reference's full
# size (the clone is scaled to it if it differs). Look at these, never at contact sheets, to pass a gate.
# If the clone's timeline is offset, give "R:C" pairs (e.g. 60:61) to compare different frame numbers.
set -e
[ -n "$4" ] || { echo "usage: gate.sh REF CLONE OUTDIR FRAME|R:C ..." >&2; exit 2; }
R=$1; C=$2; O=$3; shift 3
mkdir -p "$O"
size=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$R" | head -1 | sed "s/x*$//")
W=${size%x*}; H=${size#*x}
for p in "$@"; do
  case $p in *:*) a=${p%:*}; b=${p#*:} ;; *) a=$p; b=$p ;; esac
  out=$(printf '%s/g%04d.png' "$O" "$a")
  ffmpeg -v error -y -i "$R" -i "$C" -filter_complex \
    "[0:v]select=eq(n\,$a),setpts=N,format=rgb24,split[r1][r2];[1:v]select=eq(n\,$b),setpts=N,scale=$W:$H,format=rgb24,split[c1][c2];[r2][c2]blend=all_mode=difference,lutrgb=r='min(val*4\,255)':g='min(val*4\,255)':b='min(val*4\,255)'[d];[r1][c1][d]hstack=3" \
    -frames:v 1 "$out"
  echo "$out"
done
