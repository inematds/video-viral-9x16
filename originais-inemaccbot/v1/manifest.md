# INEMACCBOT viral video – production manifest

## Source facts (https://eventos.inema.pro/inemaccbot.html)
- INEMACCBOT is not just a Telegram bot: it is the gateway + orchestrator that receives commands, creates jobs, controls queues and keeps flow state.
- 6 components: Bot (conecta o usuário) → Fluxo (coordena) → Fila (organiza) → Worker (processa) → Agente (opera a IA) → Skill (executa).
- Two modes: simple task Bot→Fila→Worker→Agente→Skill; multi-step process via Fluxo (state machine, pause/approval/resume).
- Course: 10 modules, practical case Promoavatar (/promoavatar <assunto>), HeyGen avatar step, human approval.
- Telegram commands: /skills /fluxos /fila /status /jobs /cancelar /refazer /furar /pronto /limpar.
- Playlist: https://www.youtube.com/playlist?list=PLIhOqPRYEv-I ; community https://inema.pro ; support https://t.me/apoioinema
- INEMA.CLUB (https://www.inema.club/): Brazilian practical AI education platform, PT/EN/ES. Brand: dark navy/black, gold #FFC531, cyan #22D3EE.
- Assets: assets/capa-inemaccbot.jpg (https://eventos.inema.pro/capa-inemaccbot.jpg), assets/inema_hero.png (https://www.inema.club/doc/inema-hero-aprenda-pratique-evolua.webp)

## Generated assets
- assets/hero_char.png – character master (gpt-image-2.5), 1440x2560
- audio/narr_fenrir.wav – narration (Fenrir, pt-BR) 50.96s – CHOSEN; words in mg/words.json
- audio/music.mp3 – 53.9s score (drop ~3s, break 37-43, final drop ~44)
- audio/sfx_*.mp3 – impact, whoosh, pop, riser, chime, glitch
- broll/clipA.mp4 22.04s (seedance-2-5, 720x1280, 24fps, audio): desk 0-3.875, standing 3.875-4.08, burst 4.08-5.83, wide cards 5.83-7.04, ring 7.04-8.46, face 8.46-12.375, phone 12.375-13.67, lanes 13.67-14.75, lanes close 14.75-16.71, robots 16.71-18.71, core/globe 18.71-20.17, outputs 20.17-22.04
- broll/clipB.mp4 16.04s: cube 0-2.71, network 2.71-6.125, dashboards 6.125-8.83, rise 8.83-12.17, man turn/smile 12.17-16.04
- broll/clipC.mp4 7.04s: golden globe with routes from Brazil

## Edit map (output time -> source)
1 0.00-2.45 A 0.80-3.25 | 2 2.45-6.15 A 4.08-7.04 @0.8x | 3 6.15-7.57 A 7.04-8.46 | 4 7.57-11.35 A 8.59-12.37
5 11.35-12.70 A 12.375-13.60 | 6 12.70-14.85 A 13.70-15.85 | 7 14.85-16.05 A 16.80-18.00 | 8 16.05-17.60 A 18.71-20.17
9 17.60-18.70 A 20.30-21.40 | 10 18.70-24.45 A 20.17-22.04 slow+blur (chain MG) | 11 24.45-27.16 B 0-2.71 | 12 27.16-29.25 B 2.71-4.80
13 29.25-33.95 B 6.125-8.83 slow | 14 33.95-37.30 A 14.75-16.70 slow+blur | 15 37.30-41.15 B 8.83-12.17 | 16 41.15-42.35 B 12.6-13.8
17 42.35-48.40 C | 18 48.40-53.50 end card (opaque MG)
Overlay: mg/mg.js (node, @napi-rs/canvas), 1080x1920 30fps, DUR 53.5

## V2 ("Você já tá usando o INEMACCBOT? É de graça!")
- Narration: v2/audio/narr_puck.wav (Puck, 44.96s) – words in v2/mg/words.json. Fenrir take v2/audio/narr_fenrir.wav (49.08s) not used.
- New clips: v2/broll/clipD.mp4 (10s: shocked face 0-1.5, palm STOP 1.5-2.96, phone burst 3.0-6.0, smile 6.45-8.0, pointing 8.0-10) ; v2/broll/clipE.mp4 (10s: chaos 0-4.0, snap 4.0-4.5, cards 4.5-5.5, hall 6-10)
- generate_music failed 4x (service error) -> remix of v1 music.mp3: +1 semitone (k=1.0595), drop1 src 2.92 -> out 4.66 ("graça"), groove to src 35.31, final drop src 44.0 -> out 36.96 ("grátis"), bar loop src 44.0-45.905 x2. v1 music ~126 BPM, bar 1.905s.
- New SFX: v2/audio/sfx_scratch.mp3, sfx_subdrop.mp3, sfx_notify.mp3
- Renderer: mg/mg2.js (assembled from mg.js helpers + parts_v2_*.js), DUR 48.0
