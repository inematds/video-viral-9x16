#!/bin/bash
# Assemble mg2.js (v2 renderer) from v1 helpers + v2 parts
set -e
cd /home/ubuntu/inemaccbot_video/mg
{
  sed -n '1,33p' mg.js | sed 's/^const DUR = 53.5;/const DUR = 48.0;/' | sed 's|// INEMACCBOT viral short - motion graphics overlay renderer|// INEMACCBOT viral short V2 - motion graphics overlay renderer|'
  cat parts_v2_words.js
  sed -n '79,182p' mg.js
  cat parts_v2_sections.js
  sed -n '497,526p' mg.js
  cat parts_v2_main.js
} > mg2.js
echo "mg2.js assembled: $(wc -l < mg2.js) lines"
