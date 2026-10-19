# Biblioteca de prompts (geração de mídia)

Os prompts abaixo foram **reconstruídos a partir do que foi gerado** nos dois vídeos do INEMACCBOT (as chamadas originais não ficaram registradas). Eles reproduzem as mesmas cenas e servem de modelo: troque produto, personagem e cores.

Regras gerais:
- Prompts de **imagem e vídeo em inglês** (os modelos seguem melhor). Texto que deve aparecer na tela fica no idioma final.
- **Não peça texto legível dentro do vídeo gerado.** Telas, cards e painéis saem com "texto falso". Todo texto real entra pelo overlay (`scenes.js`).
- Gere **um personagem-mestre primeiro** e passe como `references` em todos os clipes. É isso que mantém o mesmo rosto em todas as cenas.
- `generate_video` deve ser chamado pelo agente principal, nunca por um subagente.

## 1. Personagem-mestre (`generate_image`)

| Parâmetro | Valor usado |
|---|---|
| model | `gpt-image-2.5` |
| aspect_ratio | `9:16` (saiu 1440x2560) |
| transparent_background | `""` (opaco) |

```text
Photorealistic studio portrait of a Brazilian man in his early 30s, short curly black hair with faded sides,
neatly trimmed full beard, warm brown skin, confident subtle smile. He wears a black zip-up bomber jacket over a
charcoal t-shirt and a silver smartwatch, hands loosely clasped at waist height. Deep navy-blue seamless background,
warm amber key light from the left, cool blue rim light from the right, 85mm lens, shallow depth of field,
cinematic color grade, vertical framing from mid-thigh up, ultra-detailed skin texture.
```

Variações úteis: trocar etnia/idade/roupa conforme o público; manter fundo escuro (o overlay dourado/ciano se destaca melhor).

## 2. Clipes de B-roll (`generate_video`)

Parâmetros usados em todos:

| Parâmetro | Valor |
|---|---|
| model | `seedance-2-5` (melhor qualidade; aceita 4 a 30 s, até 30 imagens de referência) |
| aspect_ratio | `portrait` |
| resolution | `720p` (sai 720x1280, 24 fps; o `build_base.py` sobe para 1080x1920) |
| references | `["/abs/path/assets/hero_char.png"]` |
| generate_audio | `false` (o áudio do clipe é descartado na montagem) |
| duration_seconds | 22, 16, 7, 10, 10 (ver cada clipe) |

Estrutura que funciona: **um clipe longo com vários planos e minutagem explícita**. Isso sai mais barato e mais coerente do que muitos clipes curtos. Depois, `analyze_clip.py` encontra os cortes reais.

### Clipe A - "da dor à máquina de agentes" (22 s)

```text
Cinematic vertical commercial, same man from the reference image in every shot, dark teal-and-amber sci-fi look.
Shot 1 (0-4s): night, he sits at a cluttered desk lit by a monitor showing a slow progress dashboard with a red error
badge; he rubs his face, exhausted and frustrated.
Shot 2 (4-6s): he stands up in a vast dark hall; thousands of glowing golden particles burst outward around him.
Shot 3 (6-8.5s): wide shot, he raises a hand and a ring of curved holographic screens full of data assembles around him.
Shot 4 (8.5-12.5s): slow push-in close-up on his face lit by cyan holograms, determined, then a confident smile.
Shot 5 (12.5-13.7s): close-up of his hand holding a smartphone with a chat app, messages being sent.
Shot 6 (13.7-16.7s): top-down view of long glowing conveyor lanes carrying small task cards, green lights pulsing.
Shot 7 (16.7-18.7s): rows of white humanoid robots working at glass desks, processing glowing cards.
Shot 8 (18.7-20.2s): a golden energy core / globe pulsing at the center of the hall.
Shot 9 (20.2-22s): finished results fly out as floating panels (images, charts, audio waveforms) around the core.
Smooth camera moves, volumetric light, high contrast, photorealistic, no readable text.
```

### Clipe B - "orquestração e monitoramento" (16 s)

```text
Cinematic vertical commercial, same man from the reference image, dark navy background with amber and cyan holograms.
Shot 1 (0-2.7s): close-up, his fingers pick up a glowing amber holographic cube and plug it into a chain of connected cubes.
Shot 2 (2.7-6.1s): a holographic map; a bright node in the center lights up and golden connections spread out into a
dense network.
Shot 3 (6.1-8.8s): he walks along a wall of monitoring dashboards (charts, gauges, status panels) and taps one panel.
Shot 4 (8.8-12.2s): tiny silhouette on a platform in an enormous dark space; hundreds of floating amber and cyan panels
rise around him like a skyline.
Shot 5 (12.2-16s): medium shot, he turns to camera against a blurred wall of glowing panels and gives a confident smile.
Photorealistic, volumetric light, smooth camera, no readable text.
```

### Clipe C - "plataforma global" (7 s, sem personagem)

```text
A glowing golden holographic Earth globe rotating slowly over a reflective black floor, South America facing camera.
Light arcs launch from Brazil and connect to cities on every continent, multiplying until the globe is wrapped in
golden routes. Teal ambient haze, cinematic, photorealistic, no text.
```

### Clipe D - gancho "PARE" (10 s, vídeo 2)

```text
Vertical social-media ad, same man from the reference image, dark studio with subtle blue rim light.
Shot 1 (0-1.5s): extreme close-up, he looks into the camera wide-eyed and shocked.
Shot 2 (1.5-3s): he thrusts his open palm toward the lens in a STOP gesture, the hand fills the frame (motion blur).
Shot 3 (3-6s): medium shot, he holds a smartphone at chest height; a burst of golden light and dozens of glowing
task cards explode out of the phone around him.
Shot 4 (6.4-8s): he lowers the phone and gives a knowing smile to camera.
Shot 5 (8-10s): he points straight at the camera (finger in foreground), behind him a curved wall of golden UI cards.
Photorealistic, punchy, no readable text.
```

### Clipe E - "do caos manual ao exército de agentes" (10 s, vídeo 2)

```text
Vertical cinematic transformation, same man from the reference image.
Shot 1 (0-4s): night office, he sits at a desk buried in paper, holding his head in stress while papers fly around him.
Shot 2 (4-4.5s): he snaps his fingers; every flying paper freezes and turns into a glowing amber holographic task card.
Shot 3 (4.5-6s): the cards organize themselves into neat rows around him.
Shot 4 (6-10s): pull back to reveal him standing, arms crossed, in an immense hall with endless rows of white humanoid
robots at glowing teal desks, cards streaming to each desk, central light beam. Photorealistic, epic scale, no text.
```

## 3. Narração (`generate_speech`)

Leia o skill `tts-prompter` antes. Gere **duas versões com vozes diferentes** e escolha ouvindo (energia, clareza, duração).

| Vídeo | Vozes testadas | Escolhida | Duração |
|---|---|---|---|
| 1 (explicativo) | Fenrir, Orus | **Fenrir** (empolgado) | 50,9 s |
| 2 ("Você já tá usando?") | Puck, Fenrir | **Puck** (animado, mais rápido) | 45,0 s |

`language_code: "pt-BR"`. Formato do prompt: instrução de estilo em uma linha + texto falado.

```text
Leia como um locutor brasileiro de anúncio viral de tecnologia: energia alta, ritmo rápido, sorriso na voz,
ênfase forte nas palavras-chave, pausas curtas e dramáticas antes das revelações. Pronuncie "Inema CCBot" como
"Inema Cê Cê Bót" e "inema.club" como "inema ponto club".

Para tudo! Você já tá usando o Inema CCBot? Ele é de graça. ...
```

Dicas de pronúncia: escreva marcas como se fala ("Inema CCBot"), números por extenso quando o ritmo importa ("dez, cem, mil tarefas") e o domínio como ele aparece ("inema.club").

Roteiros completos: ver `roteiro-e-ganchos.md`.

## 4. Trilha (`generate_music`)

```text
High-energy cinematic electronic trailer track for a vertical tech product ad, 126 BPM, 4/4, dark and triumphant.
Structure: 0-3s tense riser with ticking hi-hats and a reverse cymbal; at 3s a HARD drop with punchy sidechained
synth bass, huge drums and bright arpeggiated synths; 3-37s driving groove with small 8-bar build-ups and fills;
37-43s breakdown with filtered pads and rising tension; at 44s the biggest drop of the track; ends on a final
impact hit with a short reverb tail around 52s. Modern, glossy, energetic, designed for short-form video.
Instrumental only, no vocals.
```

- Saiu 53,9 s (~126 BPM, compasso de 1,905 s).
- No vídeo 2 o serviço falhou 4 vezes. Plano B: `music_tool.py remix` reorganiza a trilha anterior (+1 semitom) para as viradas caírem nas palavras certas.
- Se falhar, simplifique o prompt (gênero + BPM + "instrumental only, no vocals") e tente de novo.

## 5. Efeitos sonoros (`generate_sound_effect`)

Kit padrão (deixe o modelo escolher a duração):

| Arquivo | Prompt |
|---|---|
| `impact.mp3` | Deep cinematic boom impact with sub-bass hit and short metallic tail, trailer style |
| `whoosh.mp3` | Fast airy whoosh transition, swish passing left to right, clean, short |
| `pop.mp3` | Short bright UI pop, bubbly click for a graphic appearing on screen |
| `riser.mp3` | Tension riser, rising synth noise sweep building up for 3 seconds and stopping abruptly |
| `chime.mp3` | Bright magical success chime with sparkling shimmer, positive notification |
| `glitch.mp3` | Short digital glitch stutter, data corruption buzz, electronic |
| `scratch.mp3` | Vinyl record scratch stop, abrupt DJ scratch, comedic "wait, what?" moment |
| `subdrop.mp3` | Deep sub-bass drop, 808 boom falling in pitch, heavy and clean |
| `notify.mp3` | Modern smartphone notification ding, two soft bright tones |
