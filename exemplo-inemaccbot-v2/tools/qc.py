#!/usr/bin/env python3
"""QC of the rendered video: specs, frame count, loudness, timeline contact sheet and (optionally) a transcript.

Usage:  python3 qc.py project.json [--stt]
  --stt  transcribe the final mix with manus-speech-to-text to confirm the narration is intelligible over music/SFX
Outputs out/qc/final_sheet.jpg (24 frames, 8x3) and out/qc/transcript.txt
"""
import json, os, shutil, subprocess, sys
from PIL import Image

proj_path = os.path.abspath(sys.argv[1]); ROOT = os.path.dirname(proj_path); P = json.load(open(proj_path)); R = lambda p: os.path.join(ROOT, p)
FPS = P.get('video', {}).get('fps', 30); DUR = P['duration']
out = R(P.get('render', {}).get('out', 'out/FINAL_9x16.mp4'))
QC = R('out/qc'); os.makedirs(QC, exist_ok=True)
pr = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height,r_frame_rate,nb_frames:format=duration,size', '-of', 'json', out], capture_output=True, text=True).stdout)
for s in pr['streams']: print(s)
print('format', pr['format'])
v = next(s for s in pr['streams'] if s['codec_type'] == 'video')
ok = int(v.get('nb_frames', 0)) == round(DUR * FPS)
print('frame count', v.get('nb_frames'), 'expected', round(DUR * FPS), 'OK' if ok else 'MISMATCH')
lo = subprocess.run(['ffmpeg', '-i', out, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr.splitlines()
summ = [l.strip() for l in lo if l.strip().startswith(('I:', 'LRA:', 'Peak:'))]
print('loudness', ' | '.join(summ[-3:]), '(target I -14 LUFS, peak <= -1 dBFS)')
n = 24; tiles = []
for i in range(n):
    t = min(DUR - 0.05, 0.05 + i * (DUR - 0.1) / (n - 1)); f = f'{QC}/q{i:02d}.png'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t:.2f}', '-i', out, '-frames:v', '1', '-vf', 'scale=270:480', f], check=True); tiles.append(f)
sheet = Image.new('RGB', (8 * 270, 3 * 480))
for i, f in enumerate(tiles): sheet.paste(Image.open(f).convert('RGB'), ((i % 8) * 270, (i // 8) * 480))
sheet.save(f'{QC}/final_sheet.jpg', quality=85); print('contact sheet', f'{QC}/final_sheet.jpg')
if not ok: sys.exit('QC failed: frame count mismatch')
if v.get('width') != P['video']['width'] or v.get('height') != P['video']['height']: sys.exit('QC failed: dimensions')
if not any(s['codec_type'] == 'audio' for s in pr['streams']): sys.exit('QC failed: audio missing')
if '--stt' in sys.argv:
    if not shutil.which('manus-speech-to-text'): print('manus-speech-to-text not available; skipping transcript')
    else:
        wav = f'{QC}/final_audio.wav'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', out, '-vn', '-ac', '1', '-ar', '16000', wav], check=True)
        r = subprocess.run(['manus-speech-to-text', wav], capture_output=True, text=True, cwd=QC)
        open(f'{QC}/transcript.txt', 'w').write(r.stdout); print(r.stdout[-3000:])
