#!/bin/bash
# Create a new 9:16 viral-short project folder wired to the reusable engine and tools.
#   bash new_project.sh <project_dir>                         -> starter project (project.json + scenes.js templates)
#   bash new_project.sh <project_dir> --example inemaccbot-v2 -> copy of the full INEMACCBOT v2 reference project (config + scenes)
# Result:
#   <dir>/project.json  <dir>/scenes.js  <dir>/engine/ (mg_core.js + fonts + node_modules)  <dir>/tools/*.py
#   <dir>/assets  <dir>/audio/sfx  <dir>/broll  <dir>/out
set -euo pipefail
SK="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR="${1:-}"
if [ -z "$DIR" ]; then echo "usage: new_project.sh <project_dir> [--example NAME]"; exit 1; fi
[ ! -e "$DIR" ] || { echo "Destination exists: $DIR"; exit 1; }
mkdir -p "$DIR"/{assets,audio/sfx,broll,out}
DIR="$(cd "$DIR" && pwd)"
rm -rf "$DIR/engine.tmp" && cp -r "$SK/templates/engine" "$DIR/engine.tmp"
if [ -d "$DIR/engine/node_modules" ]; then mv "$DIR/engine/node_modules" "$DIR/engine.tmp/"; fi
rm -rf "$DIR/engine" && mv "$DIR/engine.tmp" "$DIR/engine"
mkdir -p "$DIR/tools" && cp "$SK/scripts/"*.py "$DIR/tools/"
if [ "${2:-}" = "--example" ]; then
  EX="$SK/templates/examples/$3"; [ -d "$EX" ] || { echo "example not found: $3"; exit 1; }
  cp "$EX/project.json" "$EX/scenes.js" "$DIR/"
else
  [ -f "$DIR/project.json" ] || cp "$SK/templates/project.template.json" "$DIR/project.json"
  [ -f "$DIR/scenes.js" ] || cp "$SK/templates/scenes.template.js" "$DIR/scenes.js"
fi
if [ ! -d "$DIR/engine/node_modules/@napi-rs/canvas" ]; then (cd "$DIR/engine" && npm ci --no-audit --no-fund); fi
missing=""
command -v ffmpeg >/dev/null || missing="$missing ffmpeg"
command -v node >/dev/null || missing="$missing node"
python3 -c "import numpy, PIL" 2>/dev/null || missing="$missing python:numpy/pillow"
python3 -c "import librosa" 2>/dev/null || echo "note: librosa not installed (only needed for 'music_tool.py analyze'): pip install librosa"
[ -n "$missing" ] && echo "MISSING:$missing"
echo "project ready: $DIR"
echo "next: put narration in audio/, transcribe locally with inemavox (word timestamps), then python3 tools/words_from_stt.py <stt.json> audio/words.json"
