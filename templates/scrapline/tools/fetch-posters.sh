#!/bin/sh
# Re-downloads the poster scans in public/posters/ from archive.org and resizes them (long edge 2000 px, JPEG).
# Sources, dates and why each is public domain are in public/posters/CREDITS.md. The outputs are committed, so this
# is only needed to regenerate them. Downloads go into a fresh temp directory and are only ever read by ffmpeg.
set -eu
cd "$(dirname "$0")/.."
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
mkdir -p public/posters

# fetch <archive.org identifier> <output name> [ffmpeg crop filter]
fetch() {
  id=$1; out=$2; crop=${3:-}
  name=$(curl -sf "https://archive.org/metadata/$id" | python3 -I -c '
import sys, json
files = json.load(sys.stdin)["files"]
print([f["name"] for f in files if f["name"].lower().endswith((".jpg", ".jpeg")) and "thumb" not in f["name"].lower()][0])')
  enc=$(python3 -I -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1]))' "$name")
  curl -sfL --retry 3 -o "$WORK/$out.src" "https://archive.org/download/$id/$enc"
  vf="scale='if(gt(iw,ih),min(2000,iw),-2)':'if(gt(iw,ih),-2,min(2000,ih))':flags=lanczos"
  [ -n "$crop" ] && vf="$crop,$vf"
  ffmpeg -v error -y -f image2 -i "$WORK/$out.src" -vf "$vf" -q:v 3 -pix_fmt yuvj420p "public/posters/$out.jpg"
}

fetch master-pnp-ppmsca-12800-12896u                                          ccc-young-mans-opportunity
fetch spyker-autos-piet-van-der-hem-1914                                      spyker-autos
fetch naar-marseille-en-de-riviera-via-parijs-en-terug-zonder-overstappen-1913 hysm-marseille
fetch naar-keulen-via-kesteren-nijmegen-1914                                  hysm-keulen
fetch rotterdamsche-lloyd-1921                                                rotterdamsche-lloyd
fetch klm-royal-dutch-air-service-ernest-b.-h.-lander-1921                    klm-london-by-air "crop=iw:trunc(ih*0.865/2)*2:0:0"
fetch tentoonstelling-van-automobielen-en-rijwielen-1907                      automobielen-rijwielen
fetch strobridge-circus-posters-dainty-miss-leitzel-1920                      ringling-miss-leitzel
fetch strobridge-circus-posters-forepaugh-sells-bros-combined-1901            forepaugh-sells
fetch strobridge-circus-posters-hillary-long-ringling-1918                    ringling-hillary-long
