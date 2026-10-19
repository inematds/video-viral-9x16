#!/bin/bash
# V2 final composite: base footage + MG overlay (piped RGBA) + mixed audio
set -e
cd /home/ubuntu/inemaccbot_video
node mg/mg2.js stream | ffmpeg -v error -stats -y \
  -i v2/out/base.mp4 \
  -f rawvideo -pix_fmt rgba -s 1080x1920 -r 30 -i pipe:0 \
  -i v2/out/audio_mix.wav \
  -filter_complex "[0:v][1:v]overlay=0:0:format=auto,format=yuv420p[v]" \
  -map "[v]" -map 2:a -c:v libx264 -preset slow -crf 18 -profile:v high -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart -shortest v2/out/INEMACCBOT_v2_ja_ta_usando_9x16.mp4
echo RENDER_DONE
