#!/usr/bin/env python3
"""Assemble the 1080x1920 30fps base footage track from B-roll segments (no overlay, no audio)."""
import subprocess, os, sys
ROOT = '/home/ubuntu/inemaccbot_video'
BR = f'{ROOT}/broll'; SEG = f'{ROOT}/out/seg'; os.makedirs(SEG, exist_ok=True)
FPS = 30
# (out_start, out_end, src, src_start, src_dur, mode)  mode: '1x' | 'mci' | 'blend' ; blur sigma optional
SEGS = [
    (0.00, 2.45, 'A', 0.80, 2.45, '1x', 0),
    (2.45, 6.15, 'A', 4.08, 2.96, 'mci', 0),
    (6.15, 7.57, 'A', 7.04, 1.42, '1x', 0),
    (7.57, 11.35, 'A', 8.59, 3.78, '1x', 0),
    (11.35, 12.70, 'A', 12.375, 1.225, 'mci', 0),
    (12.70, 14.85, 'A', 13.70, 2.15, '1x', 0),
    (14.85, 16.05, 'A', 16.80, 1.20, '1x', 0),
    (16.05, 17.60, 'A', 18.71, 1.46, 'mci', 0),
    (17.60, 18.70, 'A', 20.30, 1.10, '1x', 0),
    (18.70, 24.45, 'A', 20.17, 1.80, 'blend', 16),
    (24.45, 27.16, 'B', 0.00, 2.71, '1x', 0),
    (27.16, 29.25, 'B', 2.71, 2.09, '1x', 0),
    (29.25, 33.95, 'B', 6.125, 2.705, 'mci', 0),
    (33.95, 37.30, 'A', 14.75, 1.95, 'blend', 9),
    (37.30, 41.15, 'B', 8.83, 3.34, 'mci', 0),
    (41.15, 42.35, 'B', 12.60, 1.20, '1x', 0),
    (42.35, 48.40, 'C', 0.90, 6.05, '1x', 0),
    (48.40, 53.50, None, 0, 0, 'black', 0),
]
SRC = {'A': f'{BR}/clipA.mp4', 'B': f'{BR}/clipB.mp4', 'C': f'{BR}/clipC.mp4'}
GRADE = 'eq=contrast=1.06:saturation=1.08,unsharp=5:5:0.4'
files = []
for i, (a, b, s, ss, sd, mode, blur) in enumerate(SEGS):
    n = round(b * FPS) - round(a * FPS)
    out = f'{SEG}/s{i:02d}.mp4'; files.append(out)
    ONLY = [int(x) for x in sys.argv[1:]]
    if ONLY and i not in ONLY: continue
    if mode == 'black':
        cmd = ['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', f'color=c=0x04060C:s=1080x1920:r={FPS}', '-frames:v', str(n)]
    else:
        speed = sd / (n / FPS)
        vf = [f'trim=start={ss}:duration={sd + 0.2}', 'setpts=PTS-STARTPTS']
        if abs(speed - 1) > 0.02: vf.append(f'setpts=PTS/{speed:.5f}')
        if mode == 'mci': vf.append(f'minterpolate=fps={FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1')
        elif mode == 'blend': vf.append(f'framerate=fps={FPS}:interp_start=0:interp_end=255')
        else: vf.append(f'fps={FPS}')
        vf.append('scale=1080:1920:flags=lanczos')
        vf.append(GRADE)
        if blur: vf.append(f'gblur=sigma={blur}')
        vf.append('format=yuv420p')
        cmd = ['ffmpeg', '-v', 'error', '-y', '-i', SRC[s], '-an', '-vf', ','.join(vf), '-frames:v', str(n)]
    cmd += ['-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', str(FPS), out]
    print(f'seg {i:02d} {a:6.2f}-{b:6.2f} frames={n} {mode}', flush=True)
    subprocess.run(cmd, check=True)
with open(f'{SEG}/list.txt', 'w') as f:
    for p in files: f.write(f"file '{p}'\n")
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', f'{SEG}/list.txt', '-c', 'copy', f'{ROOT}/out/base.mp4'], check=True)
d = subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', f'{ROOT}/out/base.mp4'], capture_output=True, text=True).stdout
print('base frames', d.strip(), 'expected', round(53.5 * FPS))
