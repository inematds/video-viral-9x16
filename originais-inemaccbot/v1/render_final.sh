#!/bin/bash
# Final composite: base footage + MG overlay (piped RGBA) + mixed audio
set -e
cd /home/ubuntu/inemaccbot_video
node mg/mg.js stream | ffmpeg -v error -stats -y \
  -i out/base.mp4 \
  -f rawvideo -pix_fmt rgba -s 1080x1920 -r 30 -i pipe:0 \
  -i out/audio_mix.wav \
  -filter_complex "[0:v][1:v]overlay=0:0:format=auto,format=yuv420p[v]" \
  -map "[v]" -map 2:a -c:v libx264 -preset slow -crf 18 -profile:v high -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart -shortest out/INEMACCBOT_viral_9x16.mp4
