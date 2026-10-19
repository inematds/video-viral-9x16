// scenes.js - STARTER TEMPLATE for a 9:16 viral promo short (hook -> benefit -> 3 features -> proof -> repeat -> CTA).
// Edit COPY (on-screen text) and SYNC (which narration word triggers each pop), then adjust positions after previewing.
// Time windows come from project.json "timeline"; every section draws only inside its window.
// Layout rules: big titles live in the TOP band (y 160-760) or BOTTOM band (y 1050-1650); keep faces clear;
// captions (karaoke) sit at y ~1335, so never put a bottom title in a section that also has a caption window.
module.exports = (K) => {
  const { W, H, DUR, GOLD, CYAN, RED, GREEN, prog, eOut, eOut5, eBack, lerp, env, rnd, atIn, TT, IMG, createCanvas,
    gradFill, txt, measure, fitSize, glitchTxt, topShade, botShade, vignette, flash, gridBg, pill, icon, check, imageCard,
    alertBorder, wordRow, stampWord, starSticker, confetti, progressBar, notif, ctaButton, fadeOut, captions } = K;

  // ---------------- on-screen copy ----------------
  const COPY = {
    stop: ['PARA', 'TUDO!'],
    question: ['VOCÊ', 'JÁ', 'CONHECE', 'O'], product: 'PRODUTO X?',
    benefitKicker: 'ELE É', benefit: 'DE GRAÇA', sticker: 'R$0',
    features: [
      { kicker: 'VOCÊ MANDA', title: '1.000', sub: 'TAREFAS DE UMA VEZ', icon: 'fila' },
      { kicker: 'ELE', title: 'ORQUESTRA', sub: 'AGENTES, SKILLS E WORKFLOWS', icon: 'agente' },
      { kicker: 'E VOCÊ', title: 'ACOMPANHA', sub: 'TUDO EM TEMPO REAL', icon: 'bolt' },
    ],
    proofTitle: 'DIRETO NO CELULAR',
    notifs: [['PRODUTO X', 'Tarefa concluída', 'check'], ['PRODUTO X', '3 tarefas na fila', 'play'], ['PRODUTO X', 'Aguardando aprovação', 'dot']],
    repeat: ['E REPITO:', 'É TUDO', 'GRÁTIS!'],
    endKicker: 'CORRE!', brand: 'SUAMARCA.COM', endLine: 'GRÁTIS · PORTUGUÊS · ESPAÑOL · ENGLISH', cta: 'ACESSE AGORA  ›',
    endImage: 'hero', // key in project.json "images" (optional)
  };
  // narration word that triggers each element: [word, windowStart, windowEnd, fallbackSeconds]
  // the word is only accepted if it starts inside the window; otherwise the fallback time is used
  const SYNC = {
    tudo: ['tudo', 0.2, TT.t_hook2, 0.6], q: ['você', TT.t_hook2 - 0.3, TT.t_benefit, TT.t_hook2 + 0.2],
    product: ['produto', TT.t_hook2, TT.t_benefit, TT.t_hook2 + 1.3], benefit: ['graça', TT.t_benefit - 0.3, TT.t_what, TT.t_benefit + 0.6],
    f0: ['mil', TT.t_feat1, TT.t_feat2, TT.t_feat1 + 0.8], f1: ['orquestra', TT.t_feat2, TT.t_feat3, TT.t_feat2 + 0.8],
    f2: ['acompanha', TT.t_feat3, TT.t_proof, TT.t_feat3 + 0.8], rep: ['grátis', TT.t_repeat, TT.t_end, TT.t_repeat + 1.2],
    corre: ['corre', TT.t_end - 0.5, DUR, TT.t_end + 0.1], brand: ['suamarca', TT.t_end - 0.3, DUR, TT.t_end + 0.6],
  };
  const T = (k) => atIn(...SYNC[k]);

  // ---------------- sections ----------------
  function S_hook(ctx, t) { // pattern interrupt: red alert + giant shaking words, then the question
    if (t > TT.t_benefit) return;
    if (t < TT.t_hook2) {
      const out = 1 - prog(t, TT.t_hook2 - 0.06, TT.t_hook2 + 0.04);
      alertBorder(ctx, t, out);
      const k = 1 - prog(t, 0, 0.35), sh = (s) => (rnd(Math.floor(t * 30) * 5 + s) - 0.5) * 16 * (0.35 + k);
      glitchTxt(ctx, COPY.stop[0], W / 2 + sh(1), 790 + sh(2), { font: 'Anton', size: 340, stroke: 'rgba(0,0,0,0.9)', sw: 20, glow: 'rgba(255,40,70,0.9)', blur: 50, alpha: out, scale: lerp(1.9, 1, eOut5(prog(t, 0, 0.14))) }, Math.max(k, 0.15), Math.floor(t * 30));
      const t2 = T('tudo') - 0.06;
      if (t >= t2) glitchTxt(ctx, COPY.stop[1], W / 2 + sh(3), 1135 + sh(4), { font: 'Anton', size: 340, color: RED, stroke: 'rgba(0,0,0,0.9)', sw: 20, glow: 'rgba(255,40,70,0.95)', blur: 55, alpha: out, scale: lerp(1.9, 1, eOut5(prog(t, t2, t2 + 0.14))) }, 1 - prog(t, t2, t2 + 0.35), Math.floor(t * 30) + 50);
      return;
    }
    const a = TT.t_hook2, b = TT.t_benefit, ea = env(t, a, b, 0.05, 0.1);
    botShade(ctx, env(t, a, b, 0.15, 0.1), 1050);
    const tq = T('q') - 0.04;
    wordRow(ctx, t, COPY.question.map((w, i) => [w, tq + i * 0.18]), 1395, { size: 74, alpha: ea });
    const tp = T('product') - 0.05;
    if (t >= tp) glitchTxt(ctx, COPY.product, W / 2, 1565, { font: 'Anton', size: fitSize(ctx, COPY.product, 'Anton', 205, 1000), color: gradFill, stroke: 'rgba(0,0,0,0.85)', sw: 14, glow: 'rgba(255,170,0,0.9)', blur: 40, alpha: ea, scale: lerp(1.6, 1, eOut5(prog(t, tp, tp + 0.2))) }, 1 - prog(t, tp, tp + 0.4), Math.floor(t * 30) + 7);
  }
  function S_benefit(ctx, t) { // the first "drop": stamped keyword + price sticker
    const a = TT.t_benefit, b = TT.t_what; if (t < a || t > b) return;
    botShade(ctx, env(t, a, b, 0.15, 0.12), 1080);
    txt(ctx, COPY.benefitKicker, W / 2, 1300, { size: 70, ls: 8, alpha: env(t, a + 0.1, b, 0.12, 0.12), stroke: 'rgba(0,0,0,0.8)', sw: 12 });
    const tg = T('benefit') - 0.04;
    const ga = stampWord(ctx, t, tg, b, COPY.benefit, W / 2, 1495);
    const ts = tg + 0.28;
    starSticker(ctx, 905, 1290, 120, 0.22 + 0.04 * Math.sin((t - ts) * 6), lerp(0.2, 1, eBack(prog(t, ts, ts + 0.25))), t >= ts ? ga : 0, COPY.sticker);
  }
  function S_feature(ctx, t, i, a, b) { // kicker + giant title + subline in the top band; captions run at the bottom
    if (t < a || t > b) return;
    const f = COPY.features[i], ea = env(t, a, b, 0.15, 0.12);
    topShade(ctx, ea, 800);
    txt(ctx, f.kicker, W / 2, 200, { size: 56, ls: 6, alpha: ea, stroke: 'rgba(0,0,0,0.7)', sw: 10 });
    const tt = T('f' + i) - 0.06;
    const size = fitSize(ctx, f.title, 'Anton', 230, 980);
    txt(ctx, f.title, W / 2, 400, { font: 'Anton', size, color: gradFill, glow: 'rgba(255,170,0,0.9)', blur: 40, stroke: 'rgba(0,0,0,0.6)', sw: 10, alpha: env(t, tt, b, 0.08, 0.12), scale: lerp(1.5, 1, eOut5(prog(t, tt, tt + 0.2))) });
    const ts = tt + 0.35;
    pill(ctx, W / 2, 590, f.sub, { size: fitSize(ctx, f.sub, 'MBlack', 42, 860), h: 88, alpha: env(t, ts, b, 0.15, 0.12), scale: lerp(0.6, 1, eBack(prog(t, ts, ts + 0.3))) });
    ctx.save(); ctx.globalAlpha = env(t, ts, b, 0.2, 0.12); icon(ctx, f.icon, W - 110, 110, 70, CYAN); ctx.restore();
  }
  function S_proof(ctx, t) { // push notifications sliding in (social/product proof)
    const a = TT.t_proof, b = TT.t_repeat; if (t < a || t > b) return;
    const ea = env(t, a, b, 0.1, 0.15);
    topShade(ctx, ea * 0.85, 760);
    COPY.notifs.forEach(([title, msg, kind], i) => { const tn = a + 0.3 + i * 0.9; if (t >= tn) notif(ctx, 200 + i * 175, title, msg, kind, prog(t, tn, tn + 0.3), ea); });
    const tl = a + 0.6;
    botShade(ctx, env(t, tl, b, 0.12, 0.15), 1150);
    txt(ctx, COPY.proofTitle, W / 2, 1560, { font: 'Anton', size: fitSize(ctx, COPY.proofTitle, 'Anton', 120, 980), glow: 'rgba(34,211,238,0.9)', blur: 30, stroke: 'rgba(0,0,0,0.6)', sw: 10, alpha: env(t, tl, b, 0.12, 0.15) });
  }
  function S_repeat(ctx, t) { // repeat the main benefit = second drop, with confetti
    const a = TT.t_repeat, b = TT.t_end; if (t < a || t > b) return;
    const ea = env(t, a, b, 0.12, 0.12);
    botShade(ctx, ea, 900);
    const tg = T('rep') - 0.04;
    txt(ctx, COPY.repeat[0], W / 2, 1060, { size: 70, ls: 8, alpha: env(t, a + 0.1, b, 0.12, 0.12), stroke: 'rgba(0,0,0,0.8)', sw: 12 });
    txt(ctx, COPY.repeat[1], W / 2, 1200, { font: 'Anton', size: 150, stroke: 'rgba(0,0,0,0.7)', sw: 10, alpha: env(t, tg - 0.45, b, 0.08, 0.12) });
    if (stampWord(ctx, t, tg, b, COPY.repeat[2], W / 2, 1480, { w: 900, h: 280, size: 245 }) > 0) confetti(ctx, t, tg, W / 2, 1480);
  }
  function S_end(ctx, t) { // opaque end card: kicker, brand with light sweep, image card, CTA with tap
    const a = TT.t_end; if (t < a) return;
    gridBg(ctx, t, prog(t, a, a + 0.15), true);
    const tc = T('corre') - 0.05;
    glitchTxt(ctx, COPY.endKicker, W / 2, 330, { font: 'Anton', size: 190, color: RED, stroke: 'rgba(0,0,0,0.8)', sw: 12, glow: 'rgba(255,40,70,0.9)', blur: 40, alpha: env(t, tc, 1e9, 0.05), scale: lerp(1.8, 1, eOut5(prog(t, tc, tc + 0.18))) }, 1 - prog(t, tc, tc + 0.45), Math.floor(t * 30) + 11);
    const ti = Math.max(T('brand') - 0.05, a + 0.2), ca = env(t, ti, 1e9, 0.05);
    if (ca > 0) {
      const oc = createCanvas(W, 320), o = oc.getContext('2d');
      txt(o, COPY.brand, W / 2, 165, { font: 'Anton', size: fitSize(o, COPY.brand, 'Anton', 215, 1000), color: gradFill, glow: 'rgba(255,170,0,0.95)', blur: 50 });
      const sp = prog(t, ti + 0.3, ti + 1.1);
      if (sp > 0 && sp < 1) { o.save(); o.globalCompositeOperation = 'source-atop'; const sx = lerp(-300, W + 300, sp); const g = o.createLinearGradient(sx - 160, 0, sx + 160, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)'); o.fillStyle = g; o.fillRect(0, 0, W, 320); o.restore(); }
      const sc = lerp(1.5, 1, eOut5(prog(t, ti, ti + 0.25)));
      ctx.save(); ctx.globalAlpha = ca; ctx.translate(W / 2, 560); ctx.scale(sc, sc); ctx.drawImage(oc, -W / 2, -165); ctx.restore();
    }
    txt(ctx, COPY.endLine, W / 2, 700, { size: fitSize(ctx, COPY.endLine, 'MBlack', 34, 980, 2), ls: 2, color: CYAN, alpha: env(t, ti + 0.3, 1e9, 0.25) });
    const img = IMG[COPY.endImage];
    if (img) { const ph = eOut5(prog(t, ti + 0.45, ti + 0.95)); imageCard(ctx, img, W / 2, lerp(1150, 1010, ph), 900, { alpha: prog(t, ti + 0.45, ti + 0.7), scale: lerp(0.9, 1, ph), glow: 'rgba(34,211,238,0.6)', border: 'rgba(34,211,238,0.85)' }); }
    ctaButton(ctx, t, ti + 1.3, COPY.cta, W / 2, 1490);
    fadeOut(ctx, t, 0.35);
  }

  const CUTS = ['t_hook2', 't_benefit', 't_what', 't_feat1', 't_feat2', 't_feat3', 't_proof', 't_repeat', 't_end'].map((k) => TT[k]);
  function drawFrame(ctx, t) {
    if (t < TT.t_end) vignette(ctx, 0.5);
    S_hook(ctx, t); S_benefit(ctx, t);
    S_feature(ctx, t, 0, TT.t_feat1, TT.t_feat2); S_feature(ctx, t, 1, TT.t_feat2, TT.t_feat3); S_feature(ctx, t, 2, TT.t_feat3, TT.t_proof);
    S_proof(ctx, t); S_repeat(ctx, t);
    captions(ctx, t);
    S_end(ctx, t);
    flash(ctx, t, [...CUTS.map((c) => [c, 0.35]), [T('benefit'), 0.85], [T('rep'), 0.9]]);
    progressBar(ctx, t);
  }
  function sfxCues() {
    const ev = [], add = (t, k, g = 1) => ev.push({ t: +Math.max(0, t).toFixed(3), k, g });
    add(0, 'scratch', 1); add(0.02, 'impact', 0.9); add(T('tudo') - 0.06, 'glitch', 0.6);
    add(T('product') - 0.06, 'impact', 0.7); add(TT.t_benefit - 2.9, 'riser', 0.75);
    add(T('benefit') - 0.02, 'subdrop', 1); add(T('benefit') - 0.02, 'impact', 0.8); add(T('benefit') + 0.24, 'pop', 0.8);
    CUTS.forEach((c) => add(c - 0.1, 'whoosh', 0.6));
    [0, 1, 2].forEach((i) => add(T('f' + i) - 0.06, 'impact', 0.7));
    COPY.notifs.forEach((_, i) => add(TT.t_proof + 0.3 + i * 0.9, 'notify', 0.8));
    add(T('rep') - 2.0, 'riser', 0.55); add(T('rep') - 0.02, 'subdrop', 1); add(T('rep') - 0.02, 'impact', 1); add(T('rep') + 0.1, 'chime', 0.6);
    add(T('corre') - 0.06, 'impact', 0.8); add(T('brand') - 0.08, 'subdrop', 0.9); add(T('brand') + 0.3, 'chime', 0.7);
    return ev;
  }
  return { drawFrame, sfxCues };
};
