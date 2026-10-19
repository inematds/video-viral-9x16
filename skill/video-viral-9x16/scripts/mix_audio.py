#!/usr/bin/env python3
"""Mix narration + ducked music + SFX cues into the final audio track (loudness-normalized for Reels/TikTok/Shorts).

Usage:  python3 mix_audio.py project.json

SFX cues are generated fresh from the scenes file:  node engine/mg_core.js project.json sfx  -> [{"t": sec, "k": kind, "g": gain}, ...]

project.json "audio":
  "narration": "audio/narracao.wav",
  "music": "audio/music.mp3",                 # or the remix WAV
  "music_gain": 0.62,                         # bed level before ducking
  "duck": {"threshold": 0.05, "ratio": 4, "attack": 15, "release": 320},
  "sfx": {"impact": "audio/sfx/impact.mp3", "whoosh": "...", ...},   # kind -> file
  "sfx_gain": {"impact": 0.85, "whoosh": 0.55, ...},                  # per-kind base gain (x cue gain)
  "lufs": -14, "true_peak": -1.2,
  "out": "out/audio_mix.wav"
"""
import collections, json, os, subprocess, sys

proj_path = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'project.json')
ROOT = os.path.dirname(proj_path); P = json.load(open(proj_path)); A = P['audio']
R = lambda p: os.path.join(ROOT, p)
DUR = P['duration']
DEFAULT_GAIN = {'impact': 0.85, 'whoosh': 0.55, 'pop': 0.45, 'riser': 0.6, 'chime': 0.5, 'glitch': 0.45, 'scratch': 0.8, 'subdrop': 0.9, 'notify': 0.6}
GAIN = {**DEFAULT_GAIN, **A.get('sfx_gain', {})}
SFX = {k: R(v) for k, v in A.get('sfx', {}).items()}

engine = os.path.join(ROOT, 'engine', 'mg_core.js')
cues = json.loads(subprocess.run(['node', engine, proj_path, 'sfx'], capture_output=True, text=True, check=True).stdout or '[]')
os.makedirs(R('out'), exist_ok=True)
json.dump(cues, open(R('out/sfx_cues.json'), 'w'), indent=0)
missing = sorted({c['k'] for c in cues} - set(SFX))
if missing: print('WARNING: cues reference SFX kinds with no file in audio.sfx (skipped):', missing)

by = collections.defaultdict(list)
for c in cues:
    if c['k'] in SFX: by[c['k']].append(c)
inputs = ['-i', R(A['narration']), '-i', R(A['music'])]
kinds = [k for k in SFX if by[k]]
for k in kinds: inputs += ['-i', SFX[k]]
d = {'threshold': 0.05, 'ratio': 4, 'attack': 15, 'release': 320, **A.get('duck', {})}
fc = [
    '[0:a]aresample=48000,aformat=channel_layouts=stereo,highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=120:makeup=2,'
    'equalizer=f=3500:t=q:w=1.2:g=2,apad=whole_dur=%.3f,asplit=2[nar][key]' % DUR,
    '[1:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:%.3f,volume=%.3f[mus0]' % (DUR, A.get('music_gain', 0.62)),
    f'[mus0][key]sidechaincompress=threshold={d["threshold"]}:ratio={d["ratio"]}:attack={d["attack"]}:release={d["release"]}:makeup=1[mus]',
]
mix = ['[nar]', '[mus]']
for j, k in enumerate(kinds):
    idx = 2 + j; n = len(by[k]); labels = [f'[{k}{i}]' for i in range(n)]
    fc.append(f'[{idx}:a]aresample=48000,aformat=channel_layouts=stereo,' + (f'asplit={n}' + ''.join(labels) if n > 1 else f'anull{labels[0]}'))
    for i, c in enumerate(by[k]):
        ms = max(0, int(round(c['t'] * 1000)))
        fc.append(f'{labels[i]}adelay={ms}|{ms},volume={GAIN.get(k, 0.6) * c.get("g", 1):.3f}[{k}d{i}]')
        mix.append(f'[{k}d{i}]')
fc.append(''.join(mix) + f'amix=inputs={len(mix)}:duration=first:normalize=0,atrim=0:{DUR},alimiter=limit=0.95:level=false[pre]')
fc.append(f'[pre]loudnorm=I={A.get("lufs", -14)}:TP={A.get("true_peak", -1.2)}:LRA=9[out]')
out = R(A.get('out', 'out/audio_mix.wav'))
subprocess.run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(fc), '-map', '[out]', '-ar', '48000', '-ac', '2', out], check=True)
lo = subprocess.run(['ffmpeg', '-i', out, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
I = [l.strip() for l in lo.splitlines() if l.strip().startswith('I:')]
print(f'mixed {sum(len(v) for v in by.values())} SFX cues -> {out}  loudness {I[-1] if I else "?"}')
