# video-viral-9x16

[![Vídeos verticales](guia/assets/banner-es.jpg)](https://inematds.github.io/video-viral-9x16/guia/es/)

**[Português](README.md) · [English](README.en.md) · [Español](README.es.md)**

## Qué es

video-viral-9x16 es un kit de producción de vídeos verticales para quienes crean contenido y quieren controlar la edición mediante código. Reúne un motor de textos animados, subtítulos sincronizados, montaje de escenas y mezcla de audio. Incluye un ejemplo completo de 48 segundos cuyo guion y archivos multimedia puedes adaptar a otros temas. Para ejecutarlo necesitas Linux, Node.js, Python y FFmpeg; los archivos multimedia del ejemplo ya están incluidos.

## Guía de uso

[Guía completa](https://inematds.github.io/video-viral-9x16/guia/es/)

## Ejecutar

```bash
git clone https://github.com/inematds/video-viral-9x16.git
cd video-viral-9x16
bash scripts/setup.sh
.venv/bin/python scripts/viral.py validate exemplo-inemaccbot-v2/project.json
.venv/bin/python scripts/viral.py preview exemplo-inemaccbot-v2/project.json
.venv/bin/python scripts/viral.py build exemplo-inemaccbot-v2/project.json
```

Salida: `exemplo-inemaccbot-v2/out/INEMACCBOT_v2_9x16.mp4`.

```bash
.venv/bin/python scripts/viral.py new ../meu-video --example
.venv/bin/python scripts/viral.py new ../novo-video
python3 -m unittest discover -s tests
```

`--example` copia los archivos multimedia; sin esta opción, la estructura requiere archivos propios. La carpeta de destino debe ser nueva. Ajusta los textos en `scenes.js` y los cortes y el audio en `project.json`. Las escenas usan coordenadas de 1080×1920. La interpolación puede tardar; la CLI limita cada subproceso a 30 minutos y se detiene ante el primer error.

## Contenido

- `skill/video-viral-9x16/`: skill local, scripts canónicos, motor, fuentes, plantillas y referencias.
- `exemplo-inemaccbot-v2/`: ejemplo completo de 48 segundos, con archivos multimedia en portugués.
- `originais-inemaccbot/`: fuentes históricas v1/v2 conservadas.
- `docs/`: documentos adicionales y skill Manus original (en portugués).
- `GUIA-videos-virais-9x16.pdf`: guía original proporcionada (en portugués).

## Archivos multimedia y límites

El renderizado es local, sin API. Los nuevos archivos multimedia no se generan automáticamente. Para descargar y transcribir, usa inemavox local y exporta los tiempos por palabra; `tools/words_from_stt.py` acepta JSON con `words` o `segments[].words`. Las llamadas a proveedores externos requieren autorización explícita. La skill original menciona herramientas Manus; esos comandos históricos no son dependencias de este proyecto.

“Viral” describe el estilo y no garantiza alcance. El control de calidad (QC) comprueba los fotogramas, las dimensiones y la presencia de audio, e informa de la sonoridad; sigue siendo necesaria una revisión visual y auditiva. Los archivos originales fueron proporcionados por el usuario; no se ha asignado una nueva licencia a los archivos multimedia ni a las fuentes de terceros.
