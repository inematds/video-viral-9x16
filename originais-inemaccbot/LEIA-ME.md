# Scripts originais dos vídeos INEMACCBOT

Arquivos exatamente como foram usados nos vídeos 1 e 2, guardados para referência.
Para criar vídeos novos, use a versão reutilizável em `../skill/video-viral-9x16`: ela dá o mesmo resultado e é configurada por `project.json`.

| Arquivo | Função |
|---|---|
| `v1/mg.js` | Motion graphics do vídeo 1 (overlay completo) |
| `v1/build_base.py`, `v1/mix_audio.py`, `v1/render_final.sh` | Base de vídeo, mixagem e render do vídeo 1 |
| `v1/manifest.md` | Notas de produção e fatos do INEMACCBOT |
| `v2/mg2.js` | Motion graphics do vídeo 2 (montado a partir de `parts_v2_*.js` por `build_mg2.sh`) |
| `v2/build_base2.py`, `v2/mix_audio2.py`, `v2/render_final2.sh`, `v2/preview.py` | Base, remix + mixagem, render e prévia do vídeo 2 |
| `v*/transcricao_narracao_*.txt` | Transcrição palavra a palavra das narrações escolhidas |

Os caminhos dentro desses scripts apontam para a pasta de trabalho original (`/home/ubuntu/inemaccbot_video`).
