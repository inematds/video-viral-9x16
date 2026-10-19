
const FLASHES = [[TT.c1, 0.6], [4.64, 0.85], [TT.c4, 0.3], [TT.c6, 0.5], [TT.c7, 0.4], [TT.c11, 0.4], [TT.c13, 0.3], [TT.c15, 0.4], [32.98, 0.6], [36.92, 0.9], [TT.c18, 0.45], [TT.c19, 0.6]];
function drawFrame(ctx, t) {
  ctx.clearRect(0, 0, W, H);
  if (t < TT.c19) vignette(ctx, 0.5);
  S1_hook(ctx, t); S2_free(ctx, t); S3_look(ctx, t); S4_jarvis(ctx, t); S5_counter(ctx, t); S6_pipeline(ctx, t);
  S7_plug(ctx, t); S8_monitor(ctx, t); S9_course(ctx, t); S10_manual(ctx, t); S11_free2(ctx, t); S12_platform(ctx, t);
  captions(ctx, t);
  S13_end(ctx, t);
  flash(ctx, t, FLASHES);
  progressBar(ctx, t);
}
function sfxCues() {
  const ev = []; const add = (t, k, g = 1) => ev.push({ t: +Math.max(0, t).toFixed(3), k, g });
  add(0.0, 'scratch', 1.0); add(0.02, 'impact', 0.9); add(at('tudo', 0.5) - 0.06, 'glitch', 0.6);
  add(TT.c1 - 0.1, 'whoosh', 0.7); add(at('inema', 2.5) - 0.06, 'impact', 0.7);
  add(1.6, 'riser', 0.75); add(4.64, 'subdrop', 1.0); add(4.64, 'impact', 0.8); add(at('graça', 4.4) + 0.24, 'pop', 0.8);
  add(TT.c3 - 0.1, 'whoosh', 0.55); add(TT.c4 - 0.1, 'whoosh', 0.6); add(at('agentes', 7.8) - 0.08, 'pop', 0.7);
  add(TT.c5 - 0.05, 'glitch', 0.5); add(at('jarvis', 9.5) - 0.08, 'impact', 0.7);
  add(TT.c6 - 0.1, 'whoosh', 0.7);
  add(at('dez', 11.0) - 0.06, 'impact', 0.55); add(at('cem', 11.6) - 0.06, 'impact', 0.7); add(at('mil', 12.0) - 0.06, 'impact', 0.95); add(at('tarefas', 12.4) - 0.06, 'pop', 0.6);
  add(TT.c7 - 0.1, 'whoosh', 0.7);
  NODES.forEach((n) => add(at(n.w, n.after) - 0.06, 'pop', 0.75));
  add(TT.c11 - 0.1, 'whoosh', 0.7);
  [['skill', 19.9], ['workflow', 20.4], ['sistema', 21.2]].forEach(([w, a]) => add(at(w, a) - 0.08, 'pop', 0.8));
  add(at('orquestra', 22.0) - 0.08, 'impact', 0.9);
  add(TT.c13 - 0.1, 'whoosh', 0.6);
  add(at('acompanha', 23.6), 'notify', 0.8); add(at('tempo', 25.0) - 0.05, 'notify', 0.8); add(at('telegram', 26.5) - 0.05, 'notify', 0.8);
  add(TT.c14 - 0.08, 'whoosh', 0.5);
  add(TT.c15 - 0.1, 'whoosh', 0.7);
  [['curso', 28.0], ['vídeos', 29.0], ['inúmeros', 29.5]].forEach(([w, a]) => add(at(w, a) - 0.06, 'pop', 0.75));
  add(at('apps', 30.0) - 0.08, 'chime', 0.45);
  add(TT.c16 - 0.1, 'whoosh', 0.7);
  add(at('agentes', 32.9) - 0.08, 'impact', 0.75); add(at('agentes', 32.9) - 0.06, 'glitch', 0.45);
  add(at('manual', 34.5) - 0.08, 'impact', 0.75); add(at('manual', 34.5) + 0.05, 'glitch', 0.6);
  add(TT.c17 - 0.1, 'whoosh', 0.6); add(35.0, 'riser', 0.55);
  add(36.92, 'subdrop', 1.0); add(36.92, 'impact', 1.0); add(37.05, 'chime', 0.6);
  add(TT.c18 - 0.1, 'whoosh', 0.7); add(at('brasil', 39.8) - 0.08, 'impact', 0.6);
  [['português', 40.5], ['espanhol', 41.2], ['inglês', 41.8]].forEach(([w, a]) => add(at(w, a) - 0.08, 'pop', 0.7));
  add(TT.c19 - 0.1, 'whoosh', 0.9); add(at('corre', 42.8) - 0.06, 'impact', 0.8); add(at('corre', 42.8) - 0.04, 'glitch', 0.5);
  add(at('inema.club', 43.2) - 0.08, 'subdrop', 0.9); add(at('inema.club', 43.2) + 0.3, 'chime', 0.7);
  add(at('inema.club', 43.2) + 1.25, 'pop', 0.6); add(at('inema.club', 43.2) + 2.2, 'pop', 0.7);
  return ev;
}

async function main() {
  await loadAssets();
  const mode = process.argv[2];
  const canvas = createCanvas(W, H); const ctx = canvas.getContext('2d');
  if (mode === 'frame') {
    const t = parseFloat(process.argv[3]); const out = process.argv[4]; const bg = process.argv[5];
    if (bg) { const out2 = createCanvas(W, H); const c2 = out2.getContext('2d'); const im = await loadImage(bg); c2.drawImage(im, 0, 0, W, H); drawFrame(ctx, t); c2.drawImage(canvas, 0, 0); fs.writeFileSync(out, out2.toBuffer('image/png')); }
    else { drawFrame(ctx, t); fs.writeFileSync(out, canvas.toBuffer('image/png')); }
    return;
  }
  if (mode === 'sfx') { console.log(JSON.stringify(sfxCues())); return; }
  if (mode === 'chunks') { for (const c of CHUNKS) console.log(c.start.toFixed(2), c.end.toFixed(2), c.words.map((w) => w.txt).join(' ')); return; }
  if (mode === 'stream') {
    const n = Math.round(DUR * FPS);
    for (let i = 0; i < n; i++) {
      const t = i / FPS; drawFrame(ctx, t);
      const buf = Buffer.from(ctx.getImageData(0, 0, W, H).data.buffer);
      if (!process.stdout.write(buf)) await new Promise((r) => process.stdout.once('drain', r));
      if (i % 150 === 0) process.stderr.write(`frame ${i}/${n}\n`);
    }
    process.stdout.end();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
