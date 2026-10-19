#!/usr/bin/env python3
"""Music helper for short-form edits.

  python3 music_tool.py analyze <music.mp3>
      BPM, bar length, beat grid and an energy profile with drop candidates (needs librosa).
  python3 music_tool.py plan <semitones> <first_src_start> <src:out> [<src:out> ...] [--lead SECONDS]
      Suggest remix chunks so that source moments (e.g. drops) land on output times (e.g. key words).
      Each anchor chunk starts `lead` source-seconds before its anchor (build-up), default 4 bars at 126 BPM.
  python3 music_tool.py remix project.json
      Render project.json -> "music_remix" to a WAV:
        "source": "audio/music.mp3", "semitones": 1, "fade_in": 0.3, "fade_out": 0.3, "crossfade": 0.012,
        "chunks": [[src_start, src_end, out_start], ...]   # times in seconds of the ORIGINAL track / of the output
        "out": "audio/music_remix.wav"
      Pitch shift by n semitones also speeds the track up by 2^(n/12) (tape-style), which changes its feel.
"""
import json, os, subprocess, sys
import numpy as np
SR = 48000

def decode(path, extra_af=None, sr=SR):
    af = ['-af', extra_af] if extra_af else []
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, *af, '-ac', '2', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()

def analyze(path):
    import librosa
    y, sr = librosa.load(path, sr=22050, mono=True)
    tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
    tempo = float(np.atleast_1d(tempo)[0])
    bt = librosa.frames_to_time(beats, sr=sr)
    print(f'duration {len(y) / sr:.2f}s  tempo {tempo:.1f} BPM  bar(4 beats) {240 / tempo:.3f}s')
    if tempo < 95: print(f'  note: beat trackers often report half tempo - if the track feels faster it is {tempo * 2:.1f} BPM, bar {120 / tempo:.3f}s')
    print('first beats:', ' '.join(f'{b:.2f}' for b in bt[:16]))
    hop = int(0.5 * sr)
    rms = [20 * np.log10(np.sqrt((y[i:i + hop] ** 2).mean()) + 1e-9) for i in range(0, len(y) - hop, hop)]
    print('energy dB every 0.5s:')
    for k in range(0, len(rms), 12): print(f'  {k * 0.5:5.1f}s ' + ' '.join(f'{v:4.0f}' for v in rms[k:k + 12]))
    # drop candidates: biggest rise of smoothed loudness (1.5 s after vs 1.5 s before), refined to the sharpest onset
    h = int(0.1 * sr)
    e = np.array([(y[i:i + h] ** 2).mean() for i in range(0, len(y) - h, h)])
    db = 10 * np.log10(e + 1e-12)
    sdb = 10 * np.log10(np.convolve(e, np.ones(10) / 10, mode='same') + 1e-12)
    L = 15
    score = np.array([sdb[i:i + L].mean() - sdb[max(0, i - L):i].mean() if i > 5 else 0 for i in range(len(sdb))])
    idx = []
    for i in np.argsort(-score):
        if score[i] < 3 or len(idx) >= 6: break
        if all(abs(i - j) > 40 for j in idx): idx.append(i)
    drops = []
    for i in sorted(idx):
        lo, hi = max(1, i - 10), min(len(db) - 1, i + 10)
        drops.append((lo + int(np.argmax(np.diff(db[lo - 1:hi]))), score[i]))
    print('drop candidates (verify by ear / energy table):', ', '.join(f'{j * 0.1:.1f}s (+{s:.0f}dB)' for j, s in drops))

def plan(semi, first_start, anchors, lead):
    K = 2 ** (semi / 12)
    chunks = []
    for i, (src, out) in enumerate(anchors):
        cs = first_start if i == 0 else src - lead
        os_ = out - (src - cs) / K
        chunks.append([cs, None, os_])
    for i in range(len(chunks)):
        if i + 1 < len(chunks): chunks[i][1] = chunks[i][0] + (chunks[i + 1][2] - chunks[i][2]) * K
        else: chunks[i][1] = 'END_OF_TRACK'
    print('"chunks":', json.dumps([[round(a, 4) if isinstance(a, float) else a for a in c] for c in chunks]))
    print('(replace END_OF_TRACK with the source duration; first chunk out_start must be >= 0 - pad with a later first_src_start if negative)')

def remix(proj_path):
    ROOT = os.path.dirname(os.path.abspath(proj_path)); P = json.load(open(proj_path)); M = P['music_remix']
    R = lambda p: os.path.join(ROOT, p)
    DUR = P['duration']; K = 2 ** (M.get('semitones', 0) / 12)
    src = R(M['source'])
    src_sr = int(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=sample_rate', '-of', 'csv=p=0', src], capture_output=True, text=True).stdout.strip())
    sh = decode(src, extra_af=f'asetrate={src_sr * K:.3f},aresample={SR}') if abs(K - 1) > 1e-9 else decode(src)
    music = np.zeros((int(DUR * SR) + SR, 2), dtype=np.float32)
    XF = max(1, int(M.get('crossfade', 0.012) * SR)); FI = int(M.get('fade_in', 0.3) * SR)
    ch = M['chunks']
    for i, (ss, se, o) in enumerate(ch):
        a, b = int(ss / K * SR), min(int(se / K * SR), len(sh))
        seg = sh[a:b].copy()
        if i == 0 and FI: seg[:FI] *= np.linspace(0, 1, FI)[:, None]
        if i > 0: seg[:XF] *= np.linspace(0, 1, XF)[:, None]
        if i < len(ch) - 1: seg[-XF:] *= np.linspace(1, 0, XF)[:, None]
        st = int(o * SR) - (XF // 2 if i > 0 else 0)
        if st < 0: seg = seg[-st:]; st = 0
        n = min(len(seg), len(music) - st)
        if n > 0: music[st:st + n] += seg[:n]
        print(f'chunk {i}: src {ss:7.3f}-{se:7.3f} -> out {o:7.3f}-{o + (se - ss) / K:7.3f}')
    music = music[:int(DUR * SR)]
    FO = int(M.get('fade_out', 0.3) * SR)
    if FO: music[-FO:] *= np.linspace(1, 0, FO)[:, None]
    out = R(M.get('out', 'audio/music_remix.wav')); os.makedirs(os.path.dirname(out), exist_ok=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', out], input=music.tobytes(), check=True)
    print('music remix ->', out)

if __name__ == '__main__':
    if len(sys.argv) < 3: sys.exit(__doc__)
    cmd = sys.argv[1]
    if cmd == 'analyze': analyze(sys.argv[2])
    elif cmd == 'remix': remix(sys.argv[2])
    elif cmd == 'plan':
        args = sys.argv[2:]; lead = 4 * 240 / 126
        if '--lead' in args: i = args.index('--lead'); lead = float(args[i + 1]); args = args[:i] + args[i + 2:]
        semi, first = float(args[0]), float(args[1])
        anchors = [tuple(map(float, a.split(':'))) for a in args[2:]]
        plan(semi, first, anchors, lead)
    else: sys.exit(__doc__)
