#!/usr/bin/env python3
"""Mix narration + ducked music + SFX cues (from mg/sfx_cues.json) into out/audio_mix.wav (53.5s)."""
import json, subprocess, collections
ROOT = '/home/ubuntu/inemaccbot_video'
A = f'{ROOT}/audio'
DUR = 53.5
cues = json.load(open(f'{ROOT}/mg/sfx_cues.json'))
SFX = {k: f'{A}/sfx_{k}.mp3' for k in ['impact', 'whoosh', 'pop', 'riser', 'chime', 'glitch']}
BASE = {'impact': 0.85, 'whoosh': 0.55, 'pop': 0.45, 'riser': 0.6, 'chime': 0.5, 'glitch': 0.45}
by = collections.defaultdict(list)
for c in cues: by[c['k']].append(c)

inputs = ['-i', f'{A}/narr_fenrir.wav', '-i', f'{A}/music.mp3']
kinds = [k for k in SFX if by[k]]
for k in kinds: inputs += ['-i', SFX[k]]
fc = []
# narration: gentle compression, light presence boost
fc.append('[0:a]aresample=48000,aformat=channel_layouts=stereo,highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=120:makeup=2,equalizer=f=3500:t=q:w=1.2:g=2,volume=1.0,apad=whole_dur=%.2f,asplit=2[nar][key]' % DUR)
# music: duck under narration via sidechain
fc.append('[1:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:%.2f,volume=0.62,afade=t=out:st=%.2f:d=1.1[mus0]' % (DUR, DUR - 1.1))
fc.append('[mus0][key]sidechaincompress=threshold=0.05:ratio=4:attack=15:release=320:makeup=1[mus]')
mix = ['[nar]', '[mus]']
for j, k in enumerate(kinds):
    idx = 2 + j
    n = len(by[k])
    labels = [f'[{k}{i}]' for i in range(n)]
    fc.append(f'[{idx}:a]aresample=48000,aformat=channel_layouts=stereo,asplit={n}' + ''.join(labels) if n > 1 else f'[{idx}:a]aresample=48000,aformat=channel_layouts=stereo,anull{labels[0]}')
    for i, c in enumerate(by[k]):
        ms = max(0, int(round(c['t'] * 1000)))
        g = BASE[k] * c['g']
        fc.append(f'{labels[i]}adelay={ms}|{ms},volume={g:.3f}[{k}d{i}]')
        mix.append(f'[{k}d{i}]')
fc.append(''.join(mix) + f'amix=inputs={len(mix)}:duration=first:normalize=0,atrim=0:{DUR},alimiter=limit=0.95:level=false[pre]')
fc.append('[pre]loudnorm=I=-14:TP=-1.2:LRA=9[out]')
cmd = ['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(fc), '-map', '[out]', '-ar', '48000', '-ac', '2', f'{ROOT}/out/audio_mix.wav']
subprocess.run(cmd, check=True)
print('mixed', len(cues), 'cues')
