# API do motor (`engine/mg_core.js`)

O motor desenha **apenas o overlay transparente** (textos, legendas, adesivos, HUDs e cartão final). O `render.py` sobrepõe esse overlay à base de vídeo. Tudo o que é específico do vídeo fica em `scenes.js`.

## Contrato do `scenes.js`

```js
module.exports = (K) => {
  const { W, H, TT, at, txt, env, prog, eOut5, lerp, gradFill, captions, flash, progressBar } = K;
  function S1(ctx, t) {
    const a = TT.c1, b = TT.c2; if (t < a || t > b) return;      // janela da seção
    const tk = at('graça', 3.5) - 0.04;                           // sincroniza com a palavra falada
    txt(ctx, 'DE GRAÇA', W / 2, 1495, { font: 'Anton', size: 210, color: gradFill,
      alpha: env(t, tk, b, 0.05, 0.12), scale: lerp(2.4, 1, eOut5(prog(t, tk, tk + 0.18))) });
  }
  function drawFrame(ctx, t) { S1(ctx, t); captions(ctx, t); flash(ctx, t, [[TT.c1, 0.6]]); progressBar(ctx, t); }
  function sfxCues() { return [{ t: at('graça', 3.5) - 0.02, k: 'subdrop', g: 1 }]; }
  return { drawFrame, sfxCues };
};
```

- `drawFrame(ctx, t)` é chamado para cada frame (30 fps) com a tela já limpa. A ordem das chamadas define as camadas (o que vem depois fica por cima).
- `sfxCues()` devolve `[{t, k, g}]`: tempo em segundos, tipo (chave de `audio.sfx`) e ganho.

## Comandos

| Comando | Para quê |
|---|---|
| `node engine/mg_core.js project.json words` | Tabela numerada de palavras com tempos (para escolher cortes e âncoras) |
| `node engine/mg_core.js project.json chunks` | Blocos de legenda resultantes |
| `node engine/mg_core.js project.json frame 4.9 out.png [fundo.png]` | Um frame de prévia |
| `node engine/mg_core.js project.json sfx` | Lista de deixas de SFX (o `mix_audio.py` chama sozinho) |
| `node engine/mg_core.js project.json stream` | Frames RGBA crus (o `render.py` chama sozinho) |

## Kit `K`

**Constantes:** `W, H, FPS, DUR`; cores `GOLD` (brand.primary), `GOLD2`, `CYAN` (brand.accent), `RED` (brand.alert), `GREEN` (brand.ok), `GRAD`, `BG`; `P` (o project.json inteiro), `TT` (timeline), `IMG` (imagens carregadas de `images`), `WORDS`, `CHUNKS`.

**Tempo e easing**

| Função | Descrição |
|---|---|
| `prog(t, a, b)` | 0 a 1 entre a e b (com limite) |
| `env(t, a, b, fadeIn, fadeOut)` | Opacidade da janela: entra em a, sai até b |
| `eOut`, `eOut5`, `eIn`, `eInOut`, `eBack` | Easings (`eOut5` = pancada seca, `eBack` = elástico) |
| `lerp(a, b, x)`, `clamp`, `rnd(seed)` | Interpolação, limite, aleatório determinístico (tremidas e partículas) |
| `at(word, after)` | Início da 1ª palavra que começa com `word` a partir de `after` s (ignora maiúsculas e pontuação; acentos contam: use `'grátis'`, não `'gratis'`). Dá erro se não achar |
| `atEnd(word, after)` | Fim dessa palavra |
| `atOr(word, after, fallback)` | Igual a `at`, mas devolve `fallback` se não achar |
| `tv(v)` | Resolve chave da timeline ou número |

**Desenho básico**

| Função | Descrição |
|---|---|
| `txt(ctx, s, x, y, {font, size, color, align, glow, blur, stroke, sw, alpha, scale, ls, rot})` | Texto com contorno, brilho, escala e espaçamento. `color` pode ser `gradFill` (gradiente da marca) |
| `glitchTxt(ctx, s, x, y, opts, k, seed)` | Texto com cópias RGB deslocadas enquanto k > 0 |
| `measure`, `fitSize(ctx, s, font, size, maxW)` | Mede e encontra o maior tamanho que cabe |
| `rrect`, `pill(ctx, cx, cy, label, {...})` | Retângulo arredondado; chip/etiqueta (devolve a largura) |
| `icon(ctx, kind, cx, cy, s, col)` | Ícones vetoriais: bot, fluxo, fila, worker, agente, skill, bolt, play, bell, globe |
| `check(ctx, x, y, s, col)` | Check desenhado (as fontes não têm ✓) |
| `imageCard(ctx, img, cx, cy, w, {alpha, scale, rot, border, glow, zoom})` | Imagem com cantos e brilho |
| `topShade`, `botShade`, `capShade`, `vignette` | Sombreamentos para legibilidade |
| `flash(ctx, t, [[t, força, cor?], ...])` | Flash branco nos cortes e viradas |
| `gridBg(ctx, t, a, opaque)` | Fundo tecnológico animado (cartão final) |

**Componentes prontos**

| Componente | Uso típico |
|---|---|
| `alertBorder(ctx, t, a)` | Borda vermelha pulsando no gancho |
| `wordRow(ctx, t, [[palavra, tempo], ...], y, {size})` | Palavras surgindo uma a uma |
| `stampWord(ctx, t, t0, tEnd, 'DE GRAÇA', cx, cy, {w, h, size, rot, col})` | Carimbo + onda de choque (viradas). Devolve a opacidade |
| `stampBox`, `shock` | Peças do carimbo, se quiser montar o seu |
| `starSticker(ctx, cx, cy, r, rot, sc, a, 'R$0')` | Selo estrela de preço |
| `confetti(ctx, t, t0, cx, cy, n)` | Explosão de confete |
| `notif(ctx, y, título, msg, 'check'|'dot'|'play', p, a, {avatarIcon, time})` | Notificação de celular deslizando |
| `hudRings(ctx, t, t0, cx, cy, a, cor)` | Anéis de HUD "Jarvis" |
| `ctaButton(ctx, t, t0, 'ACESSE AGORA  ›', cx, cy, {w, h, size, tap})` | Botão pulsando + cursor tocando |
| `fadeOut(ctx, t, d)` | Fade para preto no fim |
| `progressBar(ctx, t)` | Barra de progresso no topo (retenção) |
| `captions(ctx, t, {y, size})` | Legenda karaokê (palavra ativa na cor da marca) dentro de `captions.windows` |

## Legendas

`project.json → captions`:
- `windows`: janelas `[início, fim]` (chave da timeline ou segundos). Fora delas não aparece legenda, o que deixa espaço para os títulos grandes.
- `groups` (opcional): número de palavras por bloco em cada janela, por exemplo `[[2,4],[3,2,3]]`. A soma precisa bater com as palavras da janela; se não bater, o motor mostra o erro com a lista.
- Sem `groups`: agrupamento automático (até 3 palavras/17 caracteres; não termina em artigo ou preposição; quebra na pontuação).
- `displayFix`: corrige a grafia exibida (`{"ia": "IA", "ccbot": "CCBOT"}`) sem mexer nos tempos.

## Fontes

O motor registra `Anton` (títulos condensados), `MBlack`, `MXBold`, `MBold`, `MSemi` (Montserrat) e `Mono` (JetBrains Mono). Para outras fontes, use `project.json → "fonts": {"MinhaFonte": "assets/fonte.ttf"}`.
