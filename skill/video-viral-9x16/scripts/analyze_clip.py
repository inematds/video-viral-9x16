#!/usr/bin/env python3
"""Analyze a generated B-roll clip before editing: specs, hard-cut (shot change) times and a labeled contact sheet.

Usage:  python3 analyze_clip.py clip.mp4 [--every 0.5] [--threshold 0.3]
Writes <clip>_sheet.jpg next to the clip (one frame every N seconds, timestamp burned in).
Use the cut list + sheet to write the "segments" edit map (which source range covers which narration beat).
"""
import json, os, re, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

clip = sys.argv[1]
every = float(sys.argv[sys.argv.index('--every') + 1]) if '--every' in sys.argv else 0.5
thr = float(sys.argv[sys.argv.index('--threshold') + 1]) if '--threshold' in sys.argv else 0.3
pr = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,width,height,r_frame_rate:format=duration', '-of', 'json', clip], capture_output=True, text=True).stdout)
dur = float(pr['format']['duration'])
v = next(s for s in pr['streams'] if s['codec_type'] == 'video')
print(f'{clip}: {v["width"]}x{v["height"]} @ {v["r_frame_rate"]}  {dur:.2f}s  audio={"yes" if any(s["codec_type"] == "audio" for s in pr["streams"]) else "no"}')
log = subprocess.run(['ffmpeg', '-i', clip, '-vf', f"select='gt(scene,{thr})',showinfo", '-f', 'null', '-'], capture_output=True, text=True).stderr
cuts = [float(m) for m in re.findall(r'pts_time:([0-9.]+)', log)]
print('hard cuts at:', ', '.join(f'{c:.2f}' for c in cuts) or 'none')
shots = [0.0] + cuts + [dur]
print('shots:', ' | '.join(f'{a:.2f}-{b:.2f}' for a, b in zip(shots, shots[1:])))
ts = [round(i * every, 2) for i in range(int(dur / every) + 1) if i * every < dur - 0.05]
tw = 180; th = int(tw * int(v['height']) / int(v['width']))
cols = 10; rows = (len(ts) + cols - 1) // cols
sheet = Image.new('RGB', (cols * tw, rows * th), (0, 0, 0))
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 20)
except Exception: font = ImageFont.load_default()
tmp = '/tmp/_ac_frame.png'
for i, t in enumerate(ts):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t}', '-i', clip, '-frames:v', '1', '-vf', f'scale={tw}:{th}', tmp], check=True)
    im = Image.open(tmp).convert('RGB'); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 70, 26], fill=(0, 0, 0)); d.text((4, 2), f'{t:.1f}', fill=(255, 210, 60), font=font)
    sheet.paste(im, ((i % cols) * tw, (i // cols) * th))
out = os.path.splitext(clip)[0] + '_sheet.jpg'
sheet.save(out, quality=85); print('contact sheet:', out)
