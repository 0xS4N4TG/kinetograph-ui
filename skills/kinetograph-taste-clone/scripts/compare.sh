#!/bin/sh
# compare.sh REF CLONE OUT.mp4 -> reference | clone side by side at the reference's size, the reference's audio if any.
set -e
[ -n "$3" ] || { echo "usage: compare.sh REF CLONE OUT.mp4" >&2; exit 2; }
size=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$1" | head -1 | sed "s/x*$//")
ffmpeg -v error -y -i "$1" -i "$2" -filter_complex "[1:v]scale=${size%x*}:${size#*x}[c];[0:v][c]hstack=2,format=yuv420p[v]" \
  -map "[v]" -map '0:a?' -c:v libx264 -crf 18 -shortest "$3"
echo "$3"
