#!/usr/bin/env python3
"""Assemble the silent 1080x1920 base footage track from B-roll segments described in project.json -> "base".

Usage:  python3 build_base.py project.json [segment indices to rebuild...]

project.json "base":
  "sources":  {"A": "broll/clipA.mp4", ...}           # video clips (or still images for mode "image")
  "grade":    "eq=contrast=1.07:saturation=1.10,unsharp=5:5:0.45"   # ffmpeg filter applied to every segment
  "segments": [ {"t0": 0.0, "t1": 1.3, "src": "D", "ss": 1.55, "sd": 1.3, "mode": "1x", "blur": 0, "note": "..."}, ... ]
     t0/t1  output start/end (s) - segments must be contiguous and cover 0..duration
     src    key in "sources" (null for mode "black")
     ss/sd  source start / source duration (s). Speed = sd / (t1 - t0): <1 = slow motion, >1 = speed-up
     mode   "1x"    retime by dropping/duplicating frames (fine for speed 0.8x-2x)
            "mci"   motion-interpolated slow motion (smooth, SLOW to render ~0.3x realtime) - use for speed < 0.8
            "blend" frame-blend slow motion (cheap; good under heavy blur)
            "image" still image with slow push-in (Ken Burns); optional "zoom": [1.0, 1.12]
            "black" solid background (for opaque end cards drawn by the overlay)
     blur   optional gaussian blur sigma (background plates behind dense graphics)
  "out": "out/base.mp4"
"""
import json, os, subprocess, sys

proj_path = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'project.json')
ROOT = os.path.dirname(proj_path)
P = json.load(open(proj_path))
Rp = lambda p: os.path.join(ROOT, p)
FPS = P.get('video', {}).get('fps', 30)
W = P.get('video', {}).get('width', 1080)
H = P.get('video', {}).get('height', 1920)
DUR = P['duration']
BASE = P['base']
SRC = {k: Rp(v) for k, v in BASE['sources'].items()}
GRADE = BASE.get('grade', 'eq=contrast=1.06:saturation=1.08,unsharp=5:5:0.4')
BGCOL = P.get('brand', {}).get('background', '#04060C').replace('#', '0x')
SEG_DIR = Rp(BASE.get('seg_dir', 'out/seg')); os.makedirs(SEG_DIR, exist_ok=True)
OUT = Rp(BASE.get('out', 'out/base.mp4'))
ONLY = [int(x) for x in sys.argv[2:]]

def seg_tuple(s):
    if isinstance(s, (list, tuple)):
        a, b, src, ss, sd, mode = s[:6]; blur = s[6] if len(s) > 6 else 0
        return dict(t0=a, t1=b, src=src, ss=ss, sd=sd, mode=mode, blur=blur)
    return dict(t0=s['t0'], t1=s['t1'], src=s.get('src'), ss=s.get('ss', 0), sd=s.get('sd', s['t1'] - s['t0']), mode=s.get('mode', '1x'), blur=s.get('blur', 0), zoom=s.get('zoom'))

segs = [seg_tuple(s) for s in BASE['segments']]
# sanity checks
prev = 0.0
for i, s in enumerate(segs):
    if abs(s['t0'] - prev) > 1e-6: sys.exit(f'segment {i} starts at {s["t0"]} but previous ended at {prev} (segments must be contiguous)')
    prev = s['t1']
if abs(prev - DUR) > 1e-6: sys.exit(f'segments end at {prev}, but duration is {DUR}')

files = []
for i, s in enumerate(segs):
    n = round(s['t1'] * FPS) - round(s['t0'] * FPS)
    out = os.path.join(SEG_DIR, f's{i:02d}.mp4'); files.append(out)
    if ONLY and i not in ONLY: continue
    mode = s['mode']
    if mode == 'black':
        cmd = ['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', f'color=c={BGCOL}:s={W}x{H}:r={FPS}', '-frames:v', str(n)]
    elif mode == 'image':
        z0, z1 = s.get('zoom') or [1.0, 1.12]
        vf = [f'scale={W * 2}:{H * 2}:force_original_aspect_ratio=increase', f'crop={W * 2}:{H * 2}',
              f"zoompan=z='{z0}+({z1}-{z0})*on/{max(n - 1, 1)}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={n}:s={W}x{H}:fps={FPS}", GRADE]
        if s['blur']: vf.append(f'gblur=sigma={s["blur"]}')
        vf.append('format=yuv420p')
        cmd = ['ffmpeg', '-v', 'error', '-y', '-loop', '1', '-i', SRC[s['src']], '-vf', ','.join(vf), '-frames:v', str(n)]
    else:
        speed = s['sd'] / (n / FPS)
        vf = [f'trim=start={s["ss"]}:duration={s["sd"] + 0.25}', 'setpts=PTS-STARTPTS']
        if abs(speed - 1) > 0.02: vf.append(f'setpts=PTS/{speed:.5f}')
        if mode == 'mci': vf.append(f'minterpolate=fps={FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1')
        elif mode == 'blend': vf.append(f'framerate=fps={FPS}:interp_start=0:interp_end=255')
        else: vf.append(f'fps={FPS}')
        vf += [f'scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos', f'crop={W}:{H}', GRADE]
        if s['blur']: vf.append(f'gblur=sigma={s["blur"]}')
        vf += ['tpad=stop_mode=clone:stop_duration=0.5', 'format=yuv420p']  # never come up short
        cmd = ['ffmpeg', '-v', 'error', '-y', '-i', SRC[s['src']], '-an', '-vf', ','.join(vf), '-frames:v', str(n)]
    cmd += ['-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', str(FPS), out]
    print(f'seg {i:02d} {s["t0"]:6.2f}-{s["t1"]:6.2f} frames={n:4d} {mode:5s} src={s["src"]}', flush=True)
    subprocess.run(cmd, check=True)

lst = os.path.join(SEG_DIR, 'list.txt')
with open(lst, 'w') as f:
    for p in files: f.write(f"file '{p}'\n")
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', OUT], check=True)
nf = subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', OUT], capture_output=True, text=True).stdout.strip()
exp = round(DUR * FPS)
print(f'base frames {nf} expected {exp}', 'OK' if str(exp) == nf else 'MISMATCH - check segment frame counts')

if str(exp) != nf: sys.exit('Base frame count mismatch')
