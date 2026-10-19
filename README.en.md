# video-viral-9x16

[![Vertical videos](guia/assets/banner-en.jpg)](https://inematds.github.io/video-viral-9x16/guia/en/)

**[Português](README.md) · [English](README.en.md) · [Español](README.es.md)**

## What it is

video-viral-9x16 is a vertical video production kit for content creators who want to control editing through code. It combines an animated text engine, synchronized captions, scene assembly and audio mixing. You get a complete 48-second example and can adapt the script and media to other topics. To run it, you need Linux, Node.js, Python and FFmpeg; the example media are already included.

## User guide

[Complete guide](https://inematds.github.io/video-viral-9x16/guia/en/)

## Run

```bash
git clone https://github.com/inematds/video-viral-9x16.git
cd video-viral-9x16
bash scripts/setup.sh
.venv/bin/python scripts/viral.py validate exemplo-inemaccbot-v2/project.json
.venv/bin/python scripts/viral.py preview exemplo-inemaccbot-v2/project.json
.venv/bin/python scripts/viral.py build exemplo-inemaccbot-v2/project.json
```

Output: `exemplo-inemaccbot-v2/out/INEMACCBOT_v2_9x16.mp4`.

```bash
.venv/bin/python scripts/viral.py new ../meu-video --example
.venv/bin/python scripts/viral.py new ../novo-video
python3 -m unittest discover -s tests
```

`--example` copies the media; without it, the scaffold requires your own files. The destination must be new. Adjust text in `scenes.js` and cuts/audio in `project.json`. Scenes use 1080×1920 coordinates. Interpolation may take time; the CLI limits each subprocess to 30 minutes and stops at the first error.

## Contents

- `skill/video-viral-9x16/`: local skill, canonical scripts, engine, fonts, templates and references.
- `exemplo-inemaccbot-v2/`: complete 48-second example, with media in Portuguese.
- `originais-inemaccbot/`: preserved historical v1/v2 source files.
- `docs/`: additional documents and the original Manus skill (in Portuguese).
- `GUIA-videos-virais-9x16.pdf`: supplied original guide (in Portuguese).

## Media and limitations

Rendering runs locally, without an API. New media are not generated automatically. For downloads and transcription, use local inemavox and export word-level timestamps; `tools/words_from_stt.py` accepts JSON with `words` or `segments[].words`. Calls to external providers require explicit authorization. The original skill mentions Manus tools; those historical commands are not dependencies of this project.

“Viral” names the style and does not guarantee reach. QC checks frames, dimensions and the presence of audio, and reports loudness; visual and listening reviews are still necessary. The original files were supplied by the user; no new license has been assigned to third-party media or fonts.
