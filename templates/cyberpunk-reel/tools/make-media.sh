#!/bin/sh
# Makes public/subject.mp4 and public/matte.mp4 from a public-domain clip on
# destockd.com: shot_031 of "Military Assistance Advisory Group (MAAG), Sea
# Swallow OPN Strategic Hamlet, Tuy Hoa, Phu-Yen Province, South Vietnam"
# (US National Archives, via archive.org's FedFlix). The clip is 4:3 inside a
# 16:9 frame; this crops the picture, fills 1920x1080 with it, then runs macOS
# Vision's person segmentation (tools/matte.swift) over every frame for the
# matte. The outputs are committed, so this is only needed to regenerate them.
set -eu
cd "$(dirname "$0")/.."
SRC_URL="https://clips.destockd.com/clips/Military%20Assistance%20Advisory%20Group%20%28MAAG%29%2C%20Sea%20Swallow%20OPN%20Strategic%20Hamlet%2C%20Tuy%20Hoa%2C%20Phu-Yen%20Province%2C%20South%20Vietnam/shot_031.mp4"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

curl -sL -o "$WORK/src.mp4" "$SRC_URL"
mkdir -p public "$WORK/frames"
# 1440x1080 picture -> 1920x1440, keep a 1080-tall band a little above centre (the face).
ffmpeg -v error -y -i "$WORK/src.mp4" -an \
  -vf "crop=1440:1080:240:0,scale=1920:1440:flags=lanczos,crop=1920:1080:0:150,setsar=1" \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -movflags +faststart public/subject.mp4
ffmpeg -v error -y -i public/subject.mp4 -vf scale=960:540 "$WORK/frames/%04d.png"
swift tools/matte.swift "$WORK/frames" "$WORK/matte"
ffmpeg -v error -y -framerate 24 -i "$WORK/matte/%04d.png" \
  -vf "scale=1920:1080:flags=bicubic,format=yuv420p" \
  -c:v libx264 -preset slow -crf 20 -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -movflags +faststart public/matte.mp4
python3 -I tools/track.py public/matte.mp4 > track.ts
