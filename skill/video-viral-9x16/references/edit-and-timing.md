# Montagem, layout e armadilhas

## 1. Mapa de edição (`base.segments`)

1. Rode `python3 tools/analyze_clip.py broll/clipX.mp4` em cada clipe para obter os cortes reais e a folha de contato com tempos.
2. Rode `node engine/mg_core.js project.json words` e marque os cortes **nas pausas entre frases** (o `words_from_stt.py` lista as pausas maiores que 0,25 s).
3. Para cada beat da narração, escolha o trecho do clipe que ilustra a fala e escreva um segmento:
   `{"t0": 1.30, "t1": 3.95, "src": "D", "ss": 1.55, "sd": 1.45, "mode": "mci"}`
   - velocidade = `sd / (t1 - t0)`. Aqui 1,45 s de fonte cobrem 2,65 s: câmera lenta de 0,55x.
   - `1x` serve para velocidades entre 0,8x e 2x (duplica ou descarta frames).
   - `mci` dá câmera lenta suave abaixo de 0,8x, mas renderiza a ~0,3x do tempo real. Use só onde aparece.
   - `blend` é câmera lenta barata, boa sob desfoque (`"blur": 6`).
   - `image` usa a imagem fixa com zoom lento (`"zoom": [1.0, 1.12]`), por exemplo a capa do curso.
   - `black` é fundo sólido para o cartão final opaco.
4. Os segmentos precisam ser contínuos e cobrir 0 até `duration`. O script verifica e no fim confere se a base tem `duration × fps` frames.
5. Para refazer só alguns segmentos: `python3 tools/build_base.py project.json 3 7`.

Escolha do trecho: rosto em close na fala emocional; plano aberto na escala ("mil tarefas", "maior plataforma"); mão e objeto em "pluga", "manda"; nunca o mesmo enquadramento em dois cortes seguidos.

## 2. Zonas seguras (1080x1920)

| Zona | y | Uso |
|---|---|---|
| Topo reservado | 0 a 160 | Barra de progresso; interface do app cobre |
| **Faixa de títulos superior** | 160 a 760 | Títulos quando o rosto está embaixo ou no centro |
| Centro | 760 a 1050 | Normalmente o rosto. Evite texto |
| **Faixa inferior** | 1050 a 1650 | Títulos grandes **ou** legenda (y ~1335), nunca os dois |
| Rodapé reservado | 1650 a 1920 | Legenda/descrição do app cobre |
| Laterais | x < 60 e x > 1020 | Botões do app à direita (like, comentar). Selos à direita só acima de y 1300 |

- Sempre `topShade`/`botShade` atrás de texto sobre vídeo claro.
- Um título grande por beat. A palavra-chave usa gradiente da marca; o resto fica em branco.
- Faça a prévia (`preview.py`) **antes** do render, nos tempos de cada seção, e olhe: texto sobre rosto, texto sobre texto, caixas vazias (glifo inexistente), corte de palavra.

## 3. Áudio

- Narração: compressão leve + presença (3,5 kHz). A música entra a 0,62 com sidechain da voz (abaixa quando ele fala).
- Masterização: **-14 LUFS integrado, pico real -1,2 dB** (padrão de Reels, TikTok e Shorts). O `mix_audio.py` mostra o valor final.
- Viradas da trilha (drops) devem cair **na palavra-chave**. Se a trilha gerada não encaixar, use `music_tool.py analyze` + `plan` + `remix`.
- SFX: whoosh 0,1 s antes de cada corte; impacto/sub-drop na palavra-chave; pop quando surge um chip; riser de 2 a 3 s antes da virada; chime no "grátis" e no domínio.

## 4. Armadilhas já resolvidas (não repetir)

| Problema | Causa | Solução |
|---|---|---|
| Quadrado vazio no lugar de ✓ ou ▸ | Glifo inexistente na fonte | Use `check()`/`icon()` desenhados; teste na prévia |
| Gradiente "lavado" ou deslocado | Coordenadas absolutas depois de `translate` | `color: gradFill` (gradiente relativo à origem do texto) |
| Base com menos frames, render dessincroniza | Arredondamento por segmento | `n = round(t1·fps) − round(t0·fps)` + `tpad`; o script confere a contagem |
| Render muito lento | Muitos segmentos `mci` | `mci` só em câmera lenta forte e visível; `blend` sob desfoque |
| Legenda em cima de título | Janela de legenda sobrepõe seção com título inferior | Ajuste `captions.windows` |
| Palavra não encontrada no `at()` | O STT separou ou escreveu diferente ("CCBot?") | Use o prefixo como aparece em `words` |
| Marca escrita errada na legenda | Grafia do STT | `captions.displayFix` |
| `generate_music` falhando | Instabilidade do serviço ou prompt longo | Simplificar e tentar de novo; plano B: remixar trilha existente |
| Clipe gerado com texto ilegível | Pedido de texto na cena | Pedir "no readable text"; texto só no overlay |
| Rosto muda entre clipes | Sem referência | Sempre `references: [hero_char.png]` |
| Primeiro frame preto ou vazio | Fade-in no t=0 | O gancho já começa visível no frame 0 (sem fade) |

## 5. Tempo de produção (referência)

| Etapa | Duração aproximada |
|---|---|
| Pesquisa + roteiro | 10 min |
| Voz (2 versões) + transcrição | 3 min |
| Personagem + 2 a 3 clipes Seedance (em paralelo) | 8 a 15 min |
| Trilha + SFX | 3 min |
| Mapa de edição + `scenes.js` + prévias | 30 a 60 min (a maior parte) |
| Base (com `mci`) + mix + render | 5 a 10 min |
