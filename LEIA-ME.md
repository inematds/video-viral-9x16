# Kit vídeo viral 9:16 (método INEMACCBOT)

Comece pelo **GUIA-videos-virais-9x16.pdf** (ou `.md`).

| Pasta | Conteúdo |
|---|---|
| `skill/video-viral-9x16/` | Skill do Manus: `SKILL.md`, scripts, motor de motion graphics, fontes, modelos e referências (prompts, roteiro, ganchos, edição) |
| `exemplo-inemaccbot-v2/` | Projeto completo do vídeo 2 com clipes, voz, trilha e SFX |
| `originais-inemaccbot/` | Scripts originais exatamente como foram usados nos vídeos 1 e 2 |

Para re-renderizar o vídeo 2 a partir do exemplo (Node 18+, Python 3.10+, FFmpeg, numpy e pillow):

```bash
cd exemplo-inemaccbot-v2/engine && npm install && cd ..
python3 tools/music_tool.py remix project.json
python3 tools/build_base.py project.json
python3 tools/mix_audio.py project.json
python3 tools/render.py project.json
python3 tools/qc.py project.json
```

O resultado sai em `out/INEMACCBOT_v2_9x16.mp4`.
