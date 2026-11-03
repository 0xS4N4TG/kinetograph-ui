#!/bin/sh
# Makes public/cutout.png (1280x720, with alpha) for the still-image example: one frame of the cyberpunk reel's
# subject (public/subject.mp4) with its matte (public/matte.mp4) as the alpha channel. Needs ffmpeg.
set -eu
cd "$(dirname "$0")/.."
ffmpeg -v error -y -ss 1.0 -i public/subject.mp4 -ss 1.0 -i public/matte.mp4 -frames:v 1 \
  -filter_complex "[0:v]scale=1280:720,format=rgba[a];[1:v]scale=1280:720,format=gray[m];[a][m]alphamerge" \
  public/cutout.png
