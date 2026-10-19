# Validação local — 19/10/2026

- `bash scripts/setup.sh`: ambiente isolado criado, dependências Python e npm instaladas.
- `python3 -m unittest discover -s tests`: 7 testes passaram (válido, mídia ausente, lacuna, duração, transcrição vazia, palavra negativa e dimensão incompatível).
- `python3 scripts/viral.py validate exemplo-inemaccbot-v2/project.json`: 48 s, 20 segmentos, entradas presentes.
- `python3 scripts/viral.py preview exemplo-inemaccbot-v2/project.json`: seis quadros gerados e inspecionados.
- `python3 scripts/viral.py build exemplo-inemaccbot-v2/project.json`: pipeline completo finalizado com saída 0; H.264 1080×1920, 30 fps, 1.440 frames, 48 s, AAC; loudness -14,4 LUFS, LRA 4,4 LU, pico -1,6 dBFS. MP4 com 44.397.321 bytes.
- `new`: esqueleto criado; segunda execução no mesmo destino recusada sem sobrescrever.

O exemplo mantém as mídias e o conteúdo em português do kit enviado pelo usuário. As medições técnicas não garantem alcance, qualidade editorial nem substituem revisão auditiva humana.
- Guias PT/EN/ES: Playwright sem erros de JavaScript ou imagens quebradas; sem rolagem horizontal em 360, 800, 1280 e 1920 px; tema claro persistiu após recarregar.
