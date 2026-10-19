#!/usr/bin/env python3
"""Preview v2 overlay frames over the matching source frames (without needing base.mp4)."""
import ast, re, subprocess, sys, os
from PIL import Image
ROOT = '/home/ubuntu/inemaccbot_video'
src = open(f'{ROOT}/build_base2.py').read()
SEGS = ast.literal_eval(re.search(r'SEGS = (\[.*?\n\])', src, re.S).group(1))
SRC = {'A': f'{ROOT}/broll/clipA.mp4', 'B': f'{ROOT}/broll/clipB.mp4', 'C': f'{ROOT}/broll/clipC.mp4',
       'D': f'{ROOT}/v2/broll/clipD.mp4', 'E': f'{ROOT}/v2/broll/clipE.mp4'}
P = f'{ROOT}/v2/mg/prev'; os.makedirs(P, exist_ok=True)
times = [float(x) for x in sys.argv[2:]]
sheet_name = sys.argv[1]
tiles = []
for t in times:
    seg = next(s for s in SEGS if s[0] <= t < s[1])
    a, b, s, ss, sd, mode, blur = seg
    bg = f'{P}/bg_{t:.2f}.png'
    if s is None:
        Image.new('RGB', (1080, 1920), (4, 6, 12)).save(bg)
    else:
        st = ss + (t - a) * sd / (b - a)
        vf = 'scale=1080:1920' + (f',gblur=sigma={blur}' if blur else '')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{st:.3f}', '-i', SRC[s], '-frames:v', '1', '-vf', vf, bg], check=True)
    out = f'{P}/f_{t:.2f}.png'
    subprocess.run(['node', f'{ROOT}/mg/mg2.js', 'frame', str(t), out, bg], check=True)
    tiles.append(out)
cols = min(6, len(tiles)); rows = (len(tiles) + cols - 1) // cols
sh = Image.new('RGB', (cols * 360, rows * 640))
for i, f in enumerate(tiles):
    sh.paste(Image.open(f).convert('RGB').resize((360, 640)), ((i % cols) * 360, (i // cols) * 640))
sh.save(f'{P}/{sheet_name}.jpg', quality=85)
print('sheet', f'{P}/{sheet_name}.jpg')
