#!/bin/sh
# frames.sh VIDEO OUTDIR [SHEET_WIDTH]
# Every frame at full size (OUTDIR/full/f0000.png, 0-based like the spec) and every frame again on contact sheets of
# 30 (6x5, SHEET_WIDTH px per cell, default 240): sheet sNN holds frames 30*NN .. 30*NN+29, read left to right, top to
# bottom. Sheets are for reading motion; measurements are taken on the full frames.
set -e
[ -n "$2" ] || { echo "usage: frames.sh VIDEO OUTDIR [SHEET_WIDTH]" >&2; exit 2; }
V=$1; O=$2; SW=${3:-240}
mkdir -p "$O/full" "$O/sheets"
ffmpeg -v error -y -i "$V" -start_number 0 "$O/full/f%04d.png"
ffmpeg -v error -y -i "$V" -vf "scale=$SW:-2:flags=area,tile=6x5:padding=4:color=0x808080" -start_number 0 "$O/sheets/s%02d.png"
n=$(ls "$O/full" | wc -l | tr -d ' ')
echo "$n frames -> $O/full ; $(ls "$O/sheets" | wc -l | tr -d ' ') sheets of 30 -> $O/sheets"
