#!/usr/bin/env bash
# The library's cards (library.tsx): trimmed, 30 fps H.264 copies of our renders in public/library/.
# Wall cards are 1280x720 (720x1280 tall) loops; the three cards the camera dives into are full 1920x1080 and timed to
# the sequence (card time = sequence time), held on their first and last pictures with tpad.
#   bash templates/inside/tools/library-clips.sh   (from the repo root)
set -euo pipefail
cd "$(dirname "$0")/../../.."
OUT=templates/inside/public/library
mkdir -p "$OUT"
ENC=(-c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -movflags +faststart -an -r 30)

# wall card: name src start duration size(w:h)
wall() {
  ffmpeg -v error -y -ss "$3" -t "$4" -i "$2" -vf "fps=30,scale=$5:force_original_aspect_ratio=increase,crop=$5,setsar=1" "${ENC[@]}" "$OUT/$1.mp4"
}
W=1280:720
T=720:1280
wall recap-dial      components/showcase/out/recap-dial.mp4         0   8   $T
wall phone-orbit     templates/phone-orbit/out/phone-orbit.mp4      0   3.2 $W
wall greeting        templates/greeting-intro/out/greeting-intro.mp4 0  3.5 $W
wall collage         templates/collage-burst/out/collage-burst.mp4  0   4.3 $W
wall wish            templates/wish-reel/out/wish-reel.mp4          0   6   $W
wall candlestick     components/charts/out/candlestick-chart.mp4    3   6.8 $W
wall word-flash      templates/word-flash/out/word-flash.mp4        0   9.4 $T
wall grid-reel       templates/grid-reel/out/opener.mp4             0   4.5 $W
wall cyberpunk       templates/cyberpunk-reel/out/cyberpunk-reel.mp4 0  9.2 $W
wall dostoevsky      templates/dostoevsky/out/dostoevsky.mp4        0   12  $T
wall app-launch      components/showcase/out/app-launch.mp4         4   10  $W
wall wait-ship       templates/wait-ship/out/wait-ship.mp4          0   2.45 $W
wall prompt-reply    templates/prompt-reply/out/prompt-reply.mp4    0   5   $W
wall film-intro      templates/film-intro/out/film-intro-1to1.mp4   0   7   $W
wall globe           components/maps/out/spinning-globe.mp4         0   8   $W
wall stack-credits   templates/stack-credits/out/stack-credits.mp4  0   4.7 $T

# dive cards, 12.6 s each (378 frames). src = sequence time + offset; holds pad the ends.
# donut: src = t + 0.5
ffmpeg -v error -y -ss 0.5 -i components/charts/out/donut-chart.mp4 -vf "fps=30,tpad=stop_mode=clone:stop_duration=6,trim=duration=12.6,setsar=1" "${ENC[@]}" "$OUT/donut.mp4"
# flyover: src = t - 2.67 (the arc leaves Dubai as the camera lands, at t = 5.8)
ffmpeg -v error -y -i components/maps/out/a-to-b-flyover.mp4 -vf "fps=30,tpad=start_mode=clone:start_duration=2.67:stop_mode=clone:stop_duration=4,trim=duration=12.6,setsar=1" "${ENC[@]}" "$OUT/flyover.mp4"
# three phones: src = t - 5.7 (lands on the close-up, the three phones pull back into view on "every screen")
ffmpeg -v error -y -i components/showcase/out/three-phone.mp4 -vf "fps=30,tpad=start_mode=clone:start_duration=5.7:stop_mode=clone:stop_duration=2,trim=duration=12.6,setsar=1" "${ENC[@]}" "$OUT/three-phone.mp4"
# Studio's preview as the previous shot (film.tsx S03) leaves it: 00-reveal at 9.533 s, cropped to match that shot's last frame (measured against a still of film.tsx frame 330)
ffmpeg -v error -y -ss 9.533 -i templates/inside/public/studio/00-reveal.mp4 -frames:v 1 -vf "scale=7680:4320:flags=lanczos,crop=4288:2412:1697:563,scale=1920:1080:flags=lanczos" "$OUT/studio.png"
ls -la "$OUT"
