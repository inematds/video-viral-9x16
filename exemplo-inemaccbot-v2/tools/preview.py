#!/usr/bin/env python3
"""Preview overlay frames composited over the matching B-roll frames, without rendering the whole video.

Usage:  python3 preview.py project.json <sheet_name> t1 t2 t3 ...
Writes out/prev/f_<t>.png per time and out/prev/<sheet_name>.jpg (contact sheet, 6 per row). Open the sheet and check:
text over faces, text overlapping text, readability, glyphs rendered as empty boxes, timing vs. narration.
"""
import json, os, subprocess, sys
from PIL import Image

proj_path = os.path.abspath(sys.argv[1]); ROOT = os.path.dirname(proj_path); P = json.load(open(proj_path))
R = lambda p: os.path.join(ROOT, p)
W = P.get('video', {}).get('width', 1080); H = P.get('video', {}).get('height', 1920)
name = sys.argv[2]; times = [float(x) for x in sys.argv[3:]]
B = P['base']; SRC = {k: R(v) for k, v in B['sources'].items()}
def seg_dict(s):
    if isinstance(s, (list, tuple)):
        a, b, src, ss, sd, mode = s[:6]; return dict(t0=a, t1=b, src=src, ss=ss, sd=sd, mode=mode, blur=s[6] if len(s) > 6 else 0)
    return dict(t0=s['t0'], t1=s['t1'], src=s.get('src'), ss=s.get('ss', 0), sd=s.get('sd', s['t1'] - s['t0']), mode=s.get('mode', '1x'), blur=s.get('blur', 0))
SEGS = [seg_dict(s) for s in B['segments']]
PV = R('out/prev'); os.makedirs(PV, exist_ok=True)
engine = R('engine/mg_core.js')
_dur = {}
def clip_dur(p):
    if p not in _dur:
        o = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], capture_output=True, text=True).stdout.strip()
        _dur[p] = float(o) if o and o != 'N/A' else 1e9
    return _dur[p]
tiles = []
for t in times:
    s = next((s for s in SEGS if s['t0'] <= t < s['t1']), SEGS[-1])
    bg = f'{PV}/bg_{t:.2f}.png'
    if os.path.exists(bg): os.remove(bg)
    if s['mode'] == 'black' or not s['src']:
        Image.new('RGB', (W, H), (4, 6, 12)).save(bg)
    else:
        vf = f'scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}' + (f',gblur=sigma={s["blur"]}' if s['blur'] else '')
        if s['mode'] == 'image':
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', SRC[s['src']], '-frames:v', '1', '-vf', vf, bg], check=True)
        else:
            st = s['ss'] + (t - s['t0']) * s['sd'] / (s['t1'] - s['t0'])
            st = max(0.0, min(st, clip_dur(SRC[s['src']]) - 0.08))
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{st:.3f}', '-i', SRC[s['src']], '-frames:v', '1', '-vf', vf, bg], check=True)
    if not os.path.exists(bg):
        print(f'warning: no background frame for t={t} (segment source shorter than its ss/sd?) - using black')
        Image.new('RGB', (W, H), (4, 6, 12)).save(bg)
    out = f'{PV}/f_{t:.2f}.png'
    subprocess.run(['node', engine, proj_path, 'frame', str(t), out, bg], check=True)
    tiles.append(out)
cols = min(6, len(tiles)); rows = (len(tiles) + cols - 1) // cols
tw, th = 360, int(360 * H / W)
sheet = Image.new('RGB', (cols * tw, rows * th))
for i, f in enumerate(tiles): sheet.paste(Image.open(f).convert('RGB').resize((tw, th)), ((i % cols) * tw, (i // cols) * th))
sheet.save(f'{PV}/{name}.jpg', quality=85)
print('sheet', f'{PV}/{name}.jpg')
