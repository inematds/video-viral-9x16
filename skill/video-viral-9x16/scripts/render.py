#!/usr/bin/env python3
"""Final composite: base footage + motion-graphics overlay (streamed RGBA from the engine) + mixed audio -> H.264/AAC MP4.

Usage:  python3 render.py project.json
Speed is ~0.4x realtime for 1080x1920 (a 48 s video takes ~2 min) - run it as a background job.
project.json "render": {"out": "out/FINAL_9x16.mp4", "crf": 18, "preset": "slow"}
"""
import json, os, subprocess, sys

proj_path = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'project.json')
ROOT = os.path.dirname(proj_path); P = json.load(open(proj_path)); R = lambda p: os.path.join(ROOT, p)
V = P.get('video', {}); W, H, FPS = V.get('width', 1080), V.get('height', 1920), V.get('fps', 30)
RD = P.get('render', {})
base = R(P['base'].get('out', 'out/base.mp4')); audio = R(P['audio'].get('out', 'out/audio_mix.wav'))
out = R(RD.get('out', 'out/FINAL_9x16.mp4'))
for f in (base, audio):
    if not os.path.exists(f): sys.exit(f'missing {f} - run build_base.py / mix_audio.py first')
node = subprocess.Popen(['node', R('engine/mg_core.js'), proj_path, 'stream'], stdout=subprocess.PIPE)
cmd = ['ffmpeg', '-v', 'error', '-stats', '-y', '-i', base,
       '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', f'{W}x{H}', '-r', str(FPS), '-i', 'pipe:0', '-i', audio,
       '-filter_complex', '[0:v][1:v]overlay=0:0:format=auto,format=yuv420p[v]',
       '-map', '[v]', '-map', '2:a', '-c:v', 'libx264', '-preset', RD.get('preset', 'slow'), '-crf', str(RD.get('crf', 18)),
       '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', str(FPS), '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
       '-movflags', '+faststart', '-shortest', out]
ff = subprocess.run(cmd, stdin=node.stdout)
node.wait()
if ff.returncode or node.returncode: sys.exit(f'render failed (ffmpeg {ff.returncode}, node {node.returncode})')
print('RENDER_DONE', out)
