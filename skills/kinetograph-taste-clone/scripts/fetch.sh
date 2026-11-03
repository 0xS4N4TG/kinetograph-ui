#!/bin/sh
# fetch.sh URL OUTDIR
# Downloads a reel (Pinterest, Instagram, X, YouTube Shorts, TikTok, Vimeo… anything yt-dlp reads) at its best quality
# as OUTDIR/<id>.mp4 with OUTDIR/<id>.info.json beside it, then probes it. OUTDIR must be gitignored: references are
# other people's work and are never committed. No custom User-Agent or other identifying headers are set.
set -e
[ -n "$2" ] || { echo "usage: fetch.sh URL OUTDIR" >&2; exit 2; }
mkdir -p "$2"
yt-dlp --no-playlist --write-info-json -f 'bv*+ba/b' --merge-output-format mp4 -o "$2/%(id)s.%(ext)s" "$1"
f=$(ls -t "$2"/*.mp4 | head -1)
echo "$f"
"$(dirname "$0")/probe.sh" "$f"
# Instagram and YouTube often serve VP9 or AV1, which QuickTime cannot play: make an H.264 copy for watching
# (<id>.view.mov). The original stays the one every script measures.
codec=$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 "$f")
if [ "$codec" != "h264" ]; then
  ffmpeg -v error -y -i "$f" -c:v libx264 -pix_fmt yuv420p -crf 16 -c:a aac -b:a 192k -movflags +faststart "${f%.mp4}.view.mov"
  echo "${f%.mp4}.view.mov (H.264 copy for viewing; the source is $codec)"
fi
if git -C "$2" rev-parse >/dev/null 2>&1 && ! git -C "$2" check-ignore -q "$f"; then
  echo "WARNING: $f is not gitignored; move it under a gitignored _reference folder" >&2
fi
