#!/usr/bin/env python3
"""Local, fail-fast CLI for the supplied video kit. No generation APIs."""
import argparse, json, math, shutil, subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / 'skill/video-viral-9x16/scripts'

def validate(path):
    p = json.loads(path.read_text()); base = path.parent
    def require(condition, message):
        if not condition: raise ValueError(message)
    dur = p['duration']; v = p['video']; fps = v['fps']
    require(isinstance(dur, (float, int)) and math.isfinite(dur) and 0 < dur <= 600, 'duration must be 0..600 seconds')
    require(v['width'] == 1080 and v['height'] == 1920, 'Scenes use 1080x1920 coordinates')
    require(fps in (24, 25, 30, 60), 'Unsupported fps')
    files = [p['words'], p['scenes'], p['audio']['narration'], *p.get('images', {}).values(), *p['audio'].get('sfx', {}).values()]
    music = p.get('music_remix')
    if music:
        require(music['out'] == p['audio']['music'], 'music_remix.out must match audio.music')
        files.append(music['source'])
        for a,b,t in music['chunks']: require(0 <= a < b and 0 <= t < dur, 'Invalid music chunk')
    else: files.append(p['audio']['music'])
    prev = 0
    for i, s in enumerate(p['base']['segments']):
        if isinstance(s, list): s = dict(zip(('t0','t1','src','ss','sd','mode'), s))
        require(abs(s['t0'] - prev) < 1e-6 and s['t1'] > s['t0'], f'Segment {i}: gap, overlap or invalid length')
        require(round(s['t1']*fps) > round(s['t0']*fps), f'Segment {i}: shorter than one frame')
        require(s['mode'] in ('1x','mci','blend','image','black'), f'Segment {i}: invalid mode')
        if s['mode'] != 'black':
            require(s['src'] in p['base']['sources'], f'Segment {i}: missing source')
            files.append(p['base']['sources'][s['src']])
            require(s.get('ss',0) >= 0 and s.get('sd',s['t1']-s['t0']) > 0, f'Segment {i}: invalid source interval')
        prev = s['t1']
    require(abs(prev-dur) < 1e-6, 'Segments must cover duration')
    for f in files: require((base/f).is_file(), f'Missing input: {f}')
    w = json.loads((base/p['words']).read_text()); words = w.get('words',[]) if isinstance(w,dict) else w
    require(bool(words), 'Word timestamps are empty')
    last = -1
    for word in words:
        require(0 <= word['start'] < word['end'] <= dur and word['start'] >= last and bool(word['text'].strip()), 'Invalid word timestamps/text')
        last = word['start']
    for a,b in p.get('captions',{}).get('windows',[]):
        a = p['timeline'][a] if isinstance(a,str) else a
        b = p['timeline'][b] if isinstance(b,str) else b
        require(0 <= a < b <= dur, 'Invalid caption window')
    return p

def run(cmd, cwd=None):
    print('+', ' '.join(map(str,cmd)), flush=True)
    subprocess.run(list(map(str,cmd)), cwd=cwd, check=True, timeout=1800)

def main():
    ap=argparse.ArgumentParser(description=__doc__); sub=ap.add_subparsers(dest='command',required=True)
    for name in ('validate','build','preview'):
        s=sub.add_parser(name); s.add_argument('project',type=Path)
    s=sub.add_parser('new'); s.add_argument('directory',type=Path); s.add_argument('--example',action='store_true')
    args=ap.parse_args()
    if args.command=='new':
        if args.directory.exists(): raise ValueError('Destination already exists; choose a new directory')
        if args.example:
            shutil.copytree(ROOT/'exemplo-inemaccbot-v2',args.directory,ignore=shutil.ignore_patterns('out','node_modules','music_remix.wav'))
            run(['npm','ci','--no-audit','--no-fund'],args.directory/'engine')
        else: run(['bash',TOOLS/'new_project.sh',args.directory])
        return
    path=args.project.resolve(); p=validate(path)
    print(f'VALID: {p["duration"]}s / {len(p["base"]["segments"])} segments')
    if args.command=='validate': return
    if args.command=='preview':
        times=[min(p['duration']-.1,t) for t in (0.5,4.9,12,24,36,p['duration']-2)]
        run([sys.executable,TOOLS/'preview.py',path,'review',*times]); return
    if p.get('music_remix'): run([sys.executable,TOOLS/'music_tool.py','remix',path])
    for name in ('build_base','mix_audio','render','qc'): run([sys.executable,TOOLS/f'{name}.py',path])

if __name__=='__main__':
    try: main()
    except (ValueError,KeyError,OSError,subprocess.SubprocessError) as e:
        print(f'ERROR: {e}',file=sys.stderr); sys.exit(1)
