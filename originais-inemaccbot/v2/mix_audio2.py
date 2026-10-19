#!/usr/bin/env python3
"""V2 audio: (1) remix v1 music (+1 semitone, re-structured so drops land on 'graça' and 'grátis'),
(2) mix Puck narration + ducked remix + SFX cues into v2/out/audio_mix.wav (48.0s)."""
import json, subprocess, collections
import numpy as np
ROOT = '/home/ubuntu/inemaccbot_video'
A1, A2 = f'{ROOT}/audio', f'{ROOT}/v2/audio'
OUT = f'{ROOT}/v2/out'
DUR = 48.0
SR = 48000
K = 2 ** (1 / 12)  # +1 semitone => also ~5.9% faster

def decode(path, sr=SR, extra_af=None):
    af = ['-af', extra_af] if extra_af else []
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, *af, '-ac', '2', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()

# ---- 1. music remix ----
src_sr = int(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=sample_rate', '-of', 'csv=p=0', f'{A1}/music.mp3'], capture_output=True, text=True).stdout.strip())
shifted = decode(f'{A1}/music.mp3', extra_af=f'asetrate={src_sr * K:.3f},aresample={SR}')
print('shifted music len', len(shifted) / SR)
DROP1_SRC, DROP1_OUT = 2.92, 4.66      # first drop lands on "graça"
DROP2_SRC, DROP2_OUT = 44.0, 36.96     # final drop lands on "grátis"
BAR = 1.905
o1 = DROP1_OUT - (DROP1_SRC - 0.6) / K
e1 = DROP1_OUT + (DROP1_SRC + 17 * BAR - DROP1_SRC) / K
s1_end = DROP1_SRC + 17 * BAR
s2 = DROP2_SRC - (DROP2_OUT - e1) * K
chunks = [  # (src_start, src_end, out_start)
    (0.6, s1_end, o1),
    (s2, DROP2_SRC + BAR, e1),
]
t = e1 + (DROP2_SRC + BAR - s2) / K
for _ in range(1):  # loop the first bar of the final drop once so the natural ending lands at ~47.8s
    chunks.append((DROP2_SRC, DROP2_SRC + BAR, t)); t += BAR / K
chunks.append((DROP2_SRC, 53.9, t))
music = np.zeros((int(DUR * SR) + SR, 2), dtype=np.float32)
XF = int(0.012 * SR)
for i, (ss, se, os_) in enumerate(chunks):
    a, b = int(ss / K * SR), min(int(se / K * SR), len(shifted))
    seg = shifted[a:b].copy()
    if i > 0: seg[:XF] *= np.linspace(0, 1, XF)[:, None]
    else: seg[:int(0.3 * SR)] *= np.linspace(0, 1, int(0.3 * SR))[:, None]
    if i < len(chunks) - 1: seg[-XF:] *= np.linspace(1, 0, XF)[:, None]
    o = int(os_ * SR) - (XF // 2 if i > 0 else 0)
    n = min(len(seg), len(music) - o)
    music[o:o + n] += seg[:n]
    print(f'chunk {i}: src {ss:6.2f}-{se:6.2f} -> out {os_:6.2f}-{os_ + (se - ss) / K:6.2f}')
music = music[:int(DUR * SR)]
fo = int(0.3 * SR); music[-fo:] *= np.linspace(1, 0, fo)[:, None]
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', f'{A2}/music_remix.wav'], input=music.tobytes(), check=True)
print('music remix written; drop1 at', DROP1_OUT, 'drop2 at', DROP2_OUT)

# ---- 2. final mix ----
cues = json.load(open(f'{ROOT}/v2/mg/sfx_cues.json'))
SFX = {k: f'{A1}/sfx_{k}.mp3' for k in ['impact', 'whoosh', 'pop', 'riser', 'chime', 'glitch']}
SFX.update({k: f'{A2}/sfx_{k}.mp3' for k in ['scratch', 'subdrop', 'notify']})
BASE = {'impact': 0.85, 'whoosh': 0.55, 'pop': 0.45, 'riser': 0.6, 'chime': 0.5, 'glitch': 0.45, 'scratch': 0.8, 'subdrop': 0.9, 'notify': 0.6}
by = collections.defaultdict(list)
for c in cues: by[c['k']].append(c)
inputs = ['-i', f'{A2}/narr_puck.wav', '-i', f'{A2}/music_remix.wav']
kinds = [k for k in SFX if by[k]]
for k in kinds: inputs += ['-i', SFX[k]]
fc = []
fc.append('[0:a]aresample=48000,aformat=channel_layouts=stereo,highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=120:makeup=2,equalizer=f=3500:t=q:w=1.2:g=2,volume=1.0,apad=whole_dur=%.2f,asplit=2[nar][key]' % DUR)
fc.append('[1:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:%.2f,volume=0.62[mus0]' % DUR)
fc.append('[mus0][key]sidechaincompress=threshold=0.05:ratio=4:attack=15:release=320:makeup=1[mus]')
mix = ['[nar]', '[mus]']
for j, k in enumerate(kinds):
    idx = 2 + j; n = len(by[k])
    labels = [f'[{k}{i}]' for i in range(n)]
    fc.append(f'[{idx}:a]aresample=48000,aformat=channel_layouts=stereo,asplit={n}' + ''.join(labels) if n > 1 else f'[{idx}:a]aresample=48000,aformat=channel_layouts=stereo,anull{labels[0]}')
    for i, c in enumerate(by[k]):
        ms = max(0, int(round(c['t'] * 1000)))
        fc.append(f'{labels[i]}adelay={ms}|{ms},volume={BASE[k] * c["g"]:.3f}[{k}d{i}]')
        mix.append(f'[{k}d{i}]')
fc.append(''.join(mix) + f'amix=inputs={len(mix)}:duration=first:normalize=0,atrim=0:{DUR},alimiter=limit=0.95:level=false[pre]')
fc.append('[pre]loudnorm=I=-14:TP=-1.2:LRA=9[out]')
subprocess.run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(fc), '-map', '[out]', '-ar', '48000', '-ac', '2', f'{OUT}/audio_mix.wav'], check=True)
print('mixed', len(cues), 'cues ->', f'{OUT}/audio_mix.wav')
