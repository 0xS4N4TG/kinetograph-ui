#!/bin/sh
# probe.sh VIDEO -> width height fps frames duration (the numbers every spec starts with)
set -e
[ -n "$1" ] || { echo "usage: probe.sh VIDEO" >&2; exit 2; }
ffprobe -v error -select_streams v:0 -count_frames \
  -show_entries stream=width,height,r_frame_rate,nb_read_frames:format=duration \
  -of default=noprint_wrappers=1 "$1"
