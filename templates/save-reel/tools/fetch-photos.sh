#!/bin/sh
# Re-downloads the photos in public/photos/ from archive.org and resizes them (long edge 1600 px, JPEG).
# Sources, dates and why each is public domain are in public/photos/CREDITS.md. The outputs are committed, so this
# is only needed to regenerate them. Downloads go into a fresh temp directory and are only ever read by ffmpeg.
set -eu
cd "$(dirname "$0")/.."
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
mkdir -p public/photos

# fetch <archive.org identifier> <output name> [ffmpeg crop filter]
fetch() {
  id=$1; out=$2; crop=${3:-}
  name=$(curl -sf "https://archive.org/metadata/$id" | python3 -I -c '
import sys, json
files = json.load(sys.stdin)["files"]
print([f["name"] for f in files if f["name"].lower().endswith((".jpg", ".jpeg")) and "thumb" not in f["name"].lower()][0])')
  enc=$(python3 -I -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1]))' "$name")
  curl -sfL --retry 3 -o "$WORK/$out.src" "https://archive.org/download/$id/$enc"
  vf="scale='if(gt(iw,ih),min(1600,iw),-2)':'if(gt(iw,ih),-2,min(1600,ih))':flags=lanczos"
  [ -n "$crop" ] && vf="$crop,$vf"
  ffmpeg -v error -y -f image2 -i "$WORK/$out.src" -vf "$vf" -q:v 3 -pix_fmt yuvj420p "public/photos/$out.jpg"
}

fetch clevelandart-2018.216-darjeeling-kinchinju          hills "crop=iw:trunc(ih*0.92/2)*2:0:0"
fetch 391404main_ED09-0286-103                            photo
fetch ISS016-E-027586_tokyo                               night
fetch tentoonstelling-van-automobielen-en-rijwielen-1907  poster
fetch C-2008-1179                                         thumb-01 "crop=iw*0.895:ih*0.87:iw*0.05:ih*0.065"
fetch C-2003-2295                                         thumb-02 "crop=iw*0.88:ih*0.86:iw*0.06:ih*0.07"
fetch sts121-s-024                                        thumb-03
fetch 401205main_EC92-2131-01                             thumb-04
fetch 402930main_2009-6295                                thumb-05
fetch GPN-2006-000025                                     thumb-06
fetch s92e5029                                            thumb-07
fetch 337997main_chalkings-smile-dman_full                thumb-08
fetch ISS006-E-18382_lrg                                  thumb-09
fetch sts108-383-024                                      thumb-10
