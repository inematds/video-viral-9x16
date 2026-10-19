#!/usr/bin/env python3
"""V2: assemble the 1080x1920 30fps base footage track (48.0s) from B-roll segments (no overlay, no audio)."""
import subprocess, os, sys
ROOT = '/home/ubuntu/inemaccbot_video'
SEG = f'{ROOT}/v2/out/seg'; os.makedirs(SEG, exist_ok=True)
FPS = 30
DUR = 48.0
# (out_start, out_end, src, src_start, src_dur, mode, blur)  mode: '1x' (retime by fps) | 'mci' | 'blend' | 'black'
SEGS = [
    (0.00, 1.30, 'D', 1.55, 1.30, '1x', 0),      # palm STOP  - "Para tudo!"
    (1.30, 3.95, 'D', 0.00, 1.45, 'mci', 0),     # shocked face slow-mo - "Você já tá usando o INEMACCBOT?"
    (3.95, 5.75, 'D', 3.10, 2.80, '1x', 0),      # phone burst (1.56x) - "Ele é de graça" (drop)
    (5.75, 7.30, 'D', 6.45, 1.55, '1x', 0),      # smile - "E olha o que ele faz"
    (7.30, 9.15, 'D', 8.10, 1.85, '1x', 0),      # pointing - "sistema de agentes"
    (9.15, 10.90, 'A', 8.60, 1.75, '1x', 0),     # face close-up - "seu próprio Jarvis"
    (10.90, 13.35, 'A', 4.08, 1.75, 'mci', 0),   # burst - "dez, cem, mil tarefas"
    (13.35, 15.00, 'E', 8.00, 1.65, '1x', 0),    # agent hall lanes - "organiza tudo em filas"
    (15.00, 16.40, 'A', 16.80, 1.40, '1x', 0),   # robots - "distribui pros workers"
    (16.40, 17.40, 'A', 18.75, 1.00, '1x', 0),   # core - "e os agentes de IA"
    (17.40, 19.20, 'A', 20.20, 1.80, '1x', 0),   # outputs - "executam cada skill"
    (19.20, 22.20, 'B', 0.00, 2.71, 'mci', 0),   # cube plug - "Pluga qualquer skill, workflow ou sistema"
    (22.20, 23.55, 'B', 3.20, 1.35, '1x', 0),    # network - "e ele orquestra tudo"
    (23.55, 26.25, 'B', 6.125, 2.70, '1x', 0),   # dashboards - "acompanha cada fluxo em tempo real"
    (26.25, 27.65, 'A', 12.375, 1.225, 'mci', 0),  # phone - "direto do Telegram"
    (27.65, 31.55, 'B', 8.83, 3.34, 'blend', 10),  # blurred bg - course
    (31.55, 35.55, 'E', 2.20, 5.20, '1x', 0),    # chaos -> snap -> hall (1.3x) - "não volta mais pro modo manual"
    (35.55, 37.70, 'B', 12.20, 2.15, '1x', 0),   # man turn/smile - "E repito, é tudo grátis!"
    (37.70, 42.90, 'C', 0.90, 5.20, '1x', 0),    # globe - platform + languages
    (42.90, 48.00, None, 0, 0, 'black', 0),      # end card
]
SRC = {'A': f'{ROOT}/broll/clipA.mp4', 'B': f'{ROOT}/broll/clipB.mp4', 'C': f'{ROOT}/broll/clipC.mp4',
       'D': f'{ROOT}/v2/broll/clipD.mp4', 'E': f'{ROOT}/v2/broll/clipE.mp4'}
GRADE = 'eq=contrast=1.07:saturation=1.10,unsharp=5:5:0.45'
ONLY = [int(x) for x in sys.argv[1:]]
files = []
for i, (a, b, s, ss, sd, mode, blur) in enumerate(SEGS):
    n = round(b * FPS) - round(a * FPS)
    out = f'{SEG}/s{i:02d}.mp4'; files.append(out)
    if ONLY and i not in ONLY: continue
    if mode == 'black':
        cmd = ['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', f'color=c=0x04060C:s=1080x1920:r={FPS}', '-frames:v', str(n)]
    else:
        speed = sd / (n / FPS)
        vf = [f'trim=start={ss}:duration={sd + 0.25}', 'setpts=PTS-STARTPTS']
        if abs(speed - 1) > 0.02: vf.append(f'setpts=PTS/{speed:.5f}')
        if mode == 'mci': vf.append(f'minterpolate=fps={FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1')
        elif mode == 'blend': vf.append(f'framerate=fps={FPS}:interp_start=0:interp_end=255')
        else: vf.append(f'fps={FPS}')
        vf.append('scale=1080:1920:flags=lanczos')
        vf.append(GRADE)
        if blur: vf.append(f'gblur=sigma={blur}')
        vf.append('tpad=stop_mode=clone:stop_duration=0.5')
        vf.append('format=yuv420p')
        cmd = ['ffmpeg', '-v', 'error', '-y', '-i', SRC[s], '-an', '-vf', ','.join(vf), '-frames:v', str(n)]
    cmd += ['-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', str(FPS), out]
    print(f'seg {i:02d} {a:6.2f}-{b:6.2f} frames={n} {mode}', flush=True)
    subprocess.run(cmd, check=True)
with open(f'{SEG}/list.txt', 'w') as f:
    for p in files: f.write(f"file '{p}'\n")
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', f'{SEG}/list.txt', '-c', 'copy', f'{ROOT}/v2/out/base.mp4'], check=True)
d = subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', f'{ROOT}/v2/out/base.mp4'], capture_output=True, text=True).stdout
print('base frames', d.strip(), 'expected', round(DUR * FPS))
