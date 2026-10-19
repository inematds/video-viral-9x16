---
name: video-viral-9x16
description: Produzir vídeos verticais a partir de mídias locais, com o motor Canvas e FFmpeg deste kit.
---

# Vídeo viral 9:16 — execução local

Leia o README do repositório e as referências desta pasta. O fluxo original Manus está preservado em docs/SKILL-manus-original.md; seus nomes de ferramentas não são comandos disponíveis neste projeto.

1. Defina uma promessa, roteiro, gancho e CTA. Use references/roteiro-e-ganchos.md.
2. Crie um projeto com `python3 scripts/viral.py new <pasta>`; para copiar também as mídias fornecidas, acrescente `--example`.
3. Prepare mídias locais. Não chamar APIs nem carregar chaves sem autorização expressa. Download/transcrição: inemavox local primeiro; Kling somente pela assinatura do usuário. Música/SFX pelo inemavox. O exemplo já inclui os arquivos necessários.
4. Converta transcrição com palavras usando `tools/words_from_stt.py entrada.json audio/words.json`.
5. Ajuste project.json (cortes, áudio e legenda) e scenes.js (texto e motion). Use references/engine-api.md.
6. Rode `python3 scripts/viral.py validate <pasta>/project.json`, depois `preview` e inspecione a folha visual.
7. Rode `python3 scripts/viral.py build <pasta>/project.json`. O pipeline para em qualquer falha e o QC verifica contagem de frames, resolução e presença de áudio.
8. Revise visualmente e escute a mixagem antes de publicar. O nome “viral” descreve o estilo; não garante alcance. APIs geradoras, publicação em redes e clonagem de voz não fazem parte da execução local.

Os comandos scripts/viral.py são executados da raiz do repositório. Use o Python do ambiente .venv após scripts/setup.sh. Coordenadas das cenas: 1080×1920. Originais v1/v2 são referência histórica; não executar automaticamente.
