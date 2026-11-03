#!/bin/bash
# Synthesises the film's sound effects with ffmpeg alone (no samples, so no licences): 48 kHz stereo WAVs in public/sfx.
set -e
cd "$(dirname "$0")/../public/sfx"
R=48000
f() { ffmpeg -v error -y "$@"; }
# whoosh: pink noise through a band that opens, swells and dies (into a world)
f -f lavfi -i "anoisesrc=d=1.1:c=pink:r=$R:a=0.9" -af "highpass=f=180,lowpass=f=5200,aphaser=in_gain=0.6:out_gain=0.9:delay=4:decay=0.5:speed=0.9,afade=t=in:d=0.75:curve=exp,afade=t=out:st=0.8:d=0.3:curve=tri,volume=1.6,aformat=channel_layouts=stereo" whoosh.wav
# whoosh out: shorter, brighter, front-loaded (pulling back to Studio)
f -f lavfi -i "anoisesrc=d=0.7:c=white:r=$R:a=0.6" -af "highpass=f=600,lowpass=f=7000,aphaser=speed=1.6,afade=t=in:d=0.12,afade=t=out:st=0.15:d=0.55:curve=qsin,volume=1.2,aformat=channel_layouts=stereo" swish.wav
# riser: a detuned sine pair gliding up over noise, ending abruptly (into a hit)
f -f lavfi -i "aevalsrc='0.25*sin(2*PI*(120*t+260*t*t))+0.25*sin(2*PI*(123*t+268*t*t))+0.12*sin(4*PI*(120*t+260*t*t))':d=1.4:s=$R" -f lavfi -i "anoisesrc=d=1.4:c=pink:r=$R:a=0.25" -filter_complex "[1]highpass=f=1500[n];[0][n]amix=inputs=2:normalize=0,afade=t=in:d=1.3:curve=exp,volume=1.4,aformat=channel_layouts=stereo" riser.wav
# hit: a sub drop and a short noise crack, long tail
f -f lavfi -i "aevalsrc='0.9*sin(2*PI*(62*t-14*t*t))*exp(-3.2*t)':d=2.2:s=$R" -f lavfi -i "anoisesrc=d=2.2:c=brown:r=$R:a=0.8" -filter_complex "[1]lowpass=f=900,afade=t=out:st=0:d=0.35[n];[0][n]amix=inputs=2:normalize=0,aecho=0.8:0.5:60|140:0.3|0.2,alimiter=limit=0.9,aformat=channel_layouts=stereo" hit.wav
# soft thump (stamp, panels landing)
f -f lavfi -i "aevalsrc='0.8*sin(2*PI*(95*t-30*t*t))*exp(-14*t)':d=0.5:s=$R" -f lavfi -i "anoisesrc=d=0.5:c=brown:r=$R:a=0.5" -filter_complex "[1]lowpass=f=1400,afade=t=out:d=0.06[n];[0][n]amix=inputs=2:normalize=0,aformat=channel_layouts=stereo" thump.wav
# UI click: a 6 ms tick with a little body
f -f lavfi -i "aevalsrc='(0.6*sin(2*PI*2400*t)+0.4*sin(2*PI*900*t))*exp(-900*t)':d=0.06:s=$R" -af "aformat=channel_layouts=stereo" click.wav
# keystrokes: four variants of a damped tick in band-passed noise
for k in 1 2 3 4; do
  fc=$((1600 + k * 450)); dec=$((380 + k * 70))
  f -f lavfi -i "aevalsrc='(random(0)*2-1)*exp(-$dec*t)*0.9+0.3*sin(2*PI*$((fc/4))*t)*exp(-600*t)':d=0.07:s=$R" -af "bandpass=f=$fc:t=h:w=2400,volume=3,aformat=channel_layouts=stereo" key$k.wav
done
# shutter: two clicks 70 ms apart (each Hexed roll)
f -i click.wav -i click.wav -filter_complex "[1]adelay=70|70,volume=0.7[b];[0][b]amix=inputs=2:normalize=0" shutter.wav
# CRT off: a high whine falling, a pop, then hum dying
f -f lavfi -i "aevalsrc='0.18*sin(2*PI*(15700*t-9000*t*t))*exp(-4*t)+0.4*sin(2*PI*60*t)*exp(-6*t)':d=0.9:s=$R" -af "aformat=channel_layouts=stereo" crt.wav
# paper tear: crackling noise with a ragged envelope
f -f lavfi -i "anoisesrc=d=0.55:c=white:r=$R:a=0.8:seed=9" -af "highpass=f=1200,lowpass=f=9000,tremolo=f=38:d=0.85,afade=t=in:d=0.04,afade=t=out:st=0.25:d=0.3,aformat=channel_layouts=stereo" tear.wav
# low drone bed: two detuned saws filtered dark, 12 s, loops under the worlds
f -f lavfi -i "aevalsrc='0.2*sin(2*PI*55*t)+0.15*sin(2*PI*55.4*t)+0.1*sin(2*PI*82.5*t)+0.06*sin(2*PI*110.3*t)':d=12:s=$R" -af "lowpass=f=420,tremolo=f=0.25:d=0.3,afade=t=in:d=2,afade=t=out:st=10:d=2,aformat=channel_layouts=stereo" drone.wav
ls -la
