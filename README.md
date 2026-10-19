# video-viral-9x16

[![Vídeos verticais](guia/assets/banner.jpg)](https://inematds.github.io/video-viral-9x16/guia/)

**[Português](README.md) · [English](README.en.md) · [Español](README.es.md)**

## O que é

O video-viral-9x16 é um kit de produção de vídeos verticais para quem cria conteúdo e quer controlar a edição por código. Ele reúne um motor de textos animados, legendas sincronizadas, montagem de cenas e mixagem de áudio. Você recebe um exemplo completo de 48 segundos e pode adaptar o roteiro e as mídias para outros temas. Para executar, precisa de Linux, Node.js, Python e FFmpeg; as mídias do exemplo já estão incluídas.

## Guia de uso

[Guia completo](https://inematds.github.io/video-viral-9x16/guia/)

## Executar

```bash
git clone https://github.com/inematds/video-viral-9x16.git
cd video-viral-9x16
bash scripts/setup.sh
.venv/bin/python scripts/viral.py validate exemplo-inemaccbot-v2/project.json
.venv/bin/python scripts/viral.py preview exemplo-inemaccbot-v2/project.json
.venv/bin/python scripts/viral.py build exemplo-inemaccbot-v2/project.json
```

Saída: `exemplo-inemaccbot-v2/out/INEMACCBOT_v2_9x16.mp4`.

```bash
.venv/bin/python scripts/viral.py new ../meu-video --example
.venv/bin/python scripts/viral.py new ../novo-video
python3 -m unittest discover -s tests
```

`--example` copia as mídias; sem a opção, o esqueleto exige arquivos próprios. O destino deve ser novo. Ajuste textos em `scenes.js` e cortes/áudio em `project.json`. As cenas usam coordenadas 1080×1920. Interpolação pode demorar; o CLI limita cada subprocesso a 30 minutos e para ao primeiro erro.

## Conteúdo

- `skill/video-viral-9x16/`: skill local, scripts canônicos, motor, fontes, modelos e referências.
- `exemplo-inemaccbot-v2/`: exemplo completo de 48 segundos, com mídias em português.
- `originais-inemaccbot/`: fontes históricas v1/v2 preservadas.
- `docs/`: documentos adicionais e skill Manus original.
- `GUIA-videos-virais-9x16.pdf`: guia original fornecido.

## Mídias e limites

O render é local, sem API. Novas mídias não são geradas automaticamente. Para download e transcrição, use inemavox local e exporte tempos por palavra; `tools/words_from_stt.py` aceita JSON com `words` ou `segments[].words`. Chamadas a provedores externos exigem autorização explícita. A skill original menciona ferramentas Manus; esses comandos históricos não são dependências deste projeto.

“Viral” nomeia o estilo e não garante alcance. O QC verifica frames, dimensões e presença de áudio, e informa loudness; revisão visual e auditiva continua necessária. Os arquivos originais foram fornecidos pelo usuário; não foi atribuída uma nova licença às mídias ou fontes de terceiros.
