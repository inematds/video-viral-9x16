---
name: video-viral-9x16
description: Produz vídeos verticais 9:16 virais de divulgação (Reels, TikTok, Shorts) para produtos, cursos, apps e plataformas a partir de um link ou briefing. O pipeline cobre gancho forte, narração IA em PT/ES/EN, personagem consistente, B-roll cinematográfico Seedance, motion graphics dourado/ciano sincronizado palavra a palavra, legendas karaokê, trilha com viradas nas palavras-chave, SFX e master -14 LUFS. Use quando pedirem "vídeo viral", "vídeo para Reels/TikTok", "vídeo de divulgação vertical", "vídeo explicando esta página" ou uma nova versão/variação dos vídeos INEMACCBOT.
---

# Vídeo viral 9:16 (pipeline INEMACCBOT)

Pipeline reutilizável que produziu os vídeos INEMACCBOT v1 (explicativo, 53,5 s) e v2 ("Para tudo! Você já tá usando?", 48 s).

O overlay (textos, legendas, adesivos, cartão final) é gerado por código, o que dá **texto perfeito e sincronia ao centésimo**. Os modelos de IA geram só o que fazem bem: rosto, cenas, voz, música e efeitos.

```
link/briefing → fatos + marca → roteiro → voz (2 takes) → transcrição palavra a palavra
            → personagem-mestre → clipes Seedance (com referência) → trilha + SFX
            → mapa de edição (base.mp4) → scenes.js (overlay) → prévias → mix → render → QC
```

Leia antes de começar: `/home/ubuntu/skills/video-generation/SKILL.md` (regras gerais de vídeo), `/home/ubuntu/skills/tts-prompter/SKILL.md` (antes da voz) e `/home/ubuntu/skills/music-prompter/SKILL.md` (antes da trilha).

## Arquivos desta skill

| Caminho | Conteúdo |
|---|---|
| `scripts/new_project.sh` | Cria a pasta do projeto (motor, fontes, ferramentas, modelos) |
| `scripts/words_from_stt.py` | Transcrição → `audio/words.json` + tabela de palavras e pausas |
| `scripts/analyze_clip.py` | Cortes reais e folha de contato de um clipe gerado |
| `scripts/build_base.py` | Monta a base de vídeo 1080x1920 a partir de `base.segments` |
| `scripts/music_tool.py` | `analyze` (BPM/viradas), `plan` e `remix` (encaixar viradas nas palavras) |
| `scripts/mix_audio.py` | Voz + música com ducking + SFX → -14 LUFS |
| `scripts/preview.py` | Folha de prévia do overlay sobre os frames reais |
| `scripts/render.py` | Composição final H.264/AAC |
| `scripts/qc.py` | Specs, contagem de frames, loudness, folha final e transcrição |
| `templates/engine/` | Motor `mg_core.js` + fontes (Anton, Montserrat, JetBrains Mono) |
| `templates/project.template.json`, `templates/scenes.template.js` | Ponto de partida (gancho → promessa → 3 recursos → prova → repetição → CTA) |
| `templates/examples/inemaccbot-v2/` | Projeto completo do vídeo 2 (config + cenas) para copiar padrões |
| `references/prompts.md` | Prompts de personagem, clipes, voz, trilha e SFX + parâmetros |
| `references/roteiro-e-ganchos.md` | Estrutura do roteiro, fórmulas de gancho, roteiros e mapa de cenas |
| `references/engine-api.md` | API do motor e contrato do `scenes.js` |
| `references/edit-and-timing.md` | Mapa de edição, zonas seguras, áudio e armadilhas |

## Fluxo de trabalho

### 1. Briefing e fatos
- Use `fetch` na página do produto. Abra no navegador só para ver identidade visual (cores, logo, imagens).
- Anote em `manifest.md`: o que é, para quem, 3 a 5 recursos concretos, números, preço ("grátis"), idiomas, domínio do CTA e imagens oficiais baixadas para `assets/`.
- Defina **um** benefício principal (vai no gancho, na promessa e na repetição).

### 2. Projeto
```bash
bash /home/ubuntu/skills/video-viral-9x16/scripts/new_project.sh /home/ubuntu/<projeto>
# ou, para partir do vídeo 2 completo: ... new_project.sh /home/ubuntu/<projeto> --example inemaccbot-v2
```

### 3. Roteiro
Siga `references/roteiro-e-ganchos.md`: 40 a 50 s, cerca de 110 palavras, gancho nos primeiros 1,5 s, palavra-chave no fim da frase, benefício repetido no último terço e CTA único. Escreva marcas como se pronuncia.

### 4. Voz
`generate_speech` com `language_code` do público (pt-BR, es-US/es-ES, en-US). Gere **2 vozes** em paralelo (ex.: Puck e Fenrir) e escolha pela energia e duração. Salve em `audio/narracao.wav`.
```bash
manus-speech-to-text audio/narracao.wav -g word
python3 tools/words_from_stt.py audio/narracao_transcription_*.json audio/words.json
```
`duration` = fim da fala + 3 a 4 s para o cartão final.

### 5. Visual (em paralelo com a trilha)
1. Personagem-mestre com `generate_image` (`gpt-image-2.5`, 9:16). Ver `references/prompts.md`.
2. Clipes com `generate_video` (`seedance-2-5`, `portrait`, `720p`, `references: [personagem]`, `generate_audio: false`). Faça 2 ou 3 clipes longos (10 a 22 s) com planos minutados que cubram os beats do roteiro. **Chame `generate_video` direto do agente principal, nunca por subagente.**
3. `python3 tools/analyze_clip.py broll/clipA.mp4` em cada clipe. Veja a folha de contato.

### 6. Trilha e SFX
- `generate_music` (instrumental, ~126 BPM, virada forte em ~3 s, quebra e virada final; ver prompt). Se falhar 2 vezes, simplifique; plano B: `music_tool.py remix` de uma trilha existente.
- `python3 tools/music_tool.py analyze audio/music.mp3`. Se as viradas não caírem nas palavras-chave, use `plan` e `remix` (`project.json → music_remix`).
- `generate_sound_effect` para o kit de 9 SFX (`references/prompts.md`) em `audio/sfx/<tipo>.mp3`.

### 7. Mapa de edição e base
Preencha `timeline` (cortes nas pausas), `base.sources` e `base.segments` (ver `references/edit-and-timing.md`). Rode em segundo plano, porque `mci` é lento:
```bash
python3 tools/build_base.py project.json
```

### 8. Overlay (`scenes.js`)
- Parta de `templates/scenes.template.js` (já copiado) ou copie seções de `templates/examples/inemaccbot-v2/scenes.js`.
- Uma seção por beat, sincronizada com `at('palavra', depoisDe)`. Componentes prontos em `references/engine-api.md`.
- Respeite as zonas seguras e não sobreponha títulos inferiores às janelas de legenda.
- Valide cedo: `node engine/mg_core.js project.json chunks` e prévias:
```bash
python3 tools/preview.py project.json sheetA 0.5 2.5 4.9 6.5 9.5 12.0   # abra out/prev/sheetA.jpg
```
Corrija e repita até não haver texto sobre rosto, sobreposição ou glifo vazio.

### 9. Mix, render e QC
```bash
python3 tools/mix_audio.py project.json          # mostra o loudness final (alvo -14 LUFS)
python3 tools/render.py project.json             # ~0,4x tempo real: rode em segundo plano
python3 tools/qc.py project.json --stt           # specs, frames, loudness, folha final, transcrição
```
Veja `out/qc/final_sheet.jpg` e a transcrição (a narração precisa estar inteligível sobre a música).

### 10. Entrega
Entregue o MP4 final e um resumo curto (duração, voz, estrutura). Para variações (outro gancho, idioma ou produto), copie o projeto, troque roteiro, voz e `COPY`/seções, e reaproveite clipes e trilha quando fizer sentido.

## Padrões visuais que definem o estilo
- Paleta: fundo escuro azul-marinho, **dourado** (#FFC531 → #E58A00) para palavras-chave, **ciano** (#22D3EE) para tecnologia, **vermelho** só no gancho e no "CORRE!".
- Tipografia: Anton para palavras gigantes, Montserrat Black para apoio e legendas.
- Movimento: entrada com escala 1,5 a 2,4x → 1x em 0,15 a 0,2 s (`eOut5`), glitch RGB nas revelações, flash branco nos cortes, barra de progresso no topo.
- Duas viradas: promessa (~4 s) e repetição do benefício (~36 s), com carimbo, sub-drop e confete.
- Cartão final opaco: CTA vermelho, domínio dourado com brilho passando, foto, linha de idiomas e botão com toque animado.
