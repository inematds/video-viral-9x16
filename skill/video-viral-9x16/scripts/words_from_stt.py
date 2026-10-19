#!/usr/bin/env python3
"""Turn a manus-speech-to-text word-level JSON into the engine's words.json and print a numbered word table.

Step 1:  manus-speech-to-text audio/narracao.wav -g word      (writes narracao_transcription_<ts>.json/.txt next to the audio)
Step 2:  python3 words_from_stt.py audio/narracao_transcription_<ts>.json audio/words.json

The table (index, start, end, word) is what you use to choose cut points ("timeline") and at('word', after) anchors.
Check brand names: STT may split or misspell them (e.g. "Inema CCBot?" -> two words). Display text is fixed in the
scenes/captions (captions.displayFix), never by editing timings.
"""
import json, sys
src, dst = sys.argv[1], sys.argv[2]
d = json.load(open(src))
words = d.get('words') or [w for s in d.get('segments', []) for w in s.get('words', [])]
if not words: sys.exit('No word timestamps found. Enable word-level transcription first.')
words = [{'start': round(float(w['start']), 3), 'end': round(float(w['end']), 3), 'text': w.get('text', w.get('word', '')).strip()} for w in words]
json.dump({'duration': d.get('duration'), 'language': d.get('language'), 'words': words}, open(dst, 'w'), ensure_ascii=False, indent=1)
for i, w in enumerate(words): print(f'{i:3d} {w["start"]:6.2f} {w["end"]:6.2f}  {w["text"]}')
gaps = [(words[i]['end'], words[i + 1]['start']) for i in range(len(words) - 1) if words[i + 1]['start'] - words[i]['end'] > 0.25]
print(f'\n{len(words)} words, speech ends at {words[-1]["end"]:.2f}s. Pauses > 0.25s (good cut points):')
print(', '.join(f'{(a + b) / 2:.2f}' for a, b in gaps))
