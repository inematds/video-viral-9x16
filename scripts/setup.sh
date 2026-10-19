#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
for cmd in python3 node npm ffmpeg ffprobe; do command -v "$cmd" >/dev/null || { echo "Missing: $cmd"; exit 1; }; done
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
(cd skill/video-viral-9x16/templates/engine && npm ci --no-audit --no-fund)
(cd exemplo-inemaccbot-v2/engine && npm ci --no-audit --no-fund)
echo 'Setup OK. Use .venv/bin/python scripts/viral.py --help'
