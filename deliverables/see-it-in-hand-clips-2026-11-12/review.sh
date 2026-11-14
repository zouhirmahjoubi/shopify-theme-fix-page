#!/usr/bin/env bash
# usage: review.sh <name> <attempt> <url>   downloads raw/<name>-<attempt>.mp4 and writes review sheets to the scratchpad
set -e
name="$1"; att="$2"; url="$3"
SP="C:/Users/LENOVO/AppData/Local/Temp/claude/f3a3011a1e731730/6a2a561f-0a69-4d26-8a3a-0873f58e7d2f/scratchpad/review/$name"
mkdir -p "$SP"
f="raw/$name-$att.mp4"
[ -f "$f" ] || curl -s -o "$f" -w "%{http_code} %{size_download}\n" "$url"
ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,r_frame_rate,nb_frames,duration -of csv=p=0 "$f"
ffmpeg -v error -y -i "$f" -vf "fps=2,scale=300:-1,tile=5x2" -frames:v 1 -q:v 3 "$SP/$att-overview.jpg"
ffmpeg -v error -y -i "$f" -vf "select='not(mod(n\,5))',crop=iw*0.80:ih*0.68:iw*0.10:ih*0.13,tile=8x3" -fps_mode passthrough -frames:v 1 -q:v 2 "$SP/$att-frames.jpg"
echo "$SP/$att-overview.jpg"; echo "$SP/$att-frames.jpg"
