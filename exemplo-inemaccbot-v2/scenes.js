// scenes.js - INEMACCBOT v2 ("Para tudo! Você já tá usando o INEMACCBOT? Ele é de graça")
// Reference implementation of a full 48 s viral short for engine/mg_core.js.
// Every section is a function S*(ctx, t) that draws only inside its time window (TT.* cut points from project.json)
// and syncs its pops to narration words with at('word', afterSeconds).
module.exports = (K) => {
  const { W, H, DUR, GOLD, CYAN, RED, GREEN, prog, eOut, eOut5, eInOut, eBack, lerp, env, rnd, at, TT, IMG, createCanvas,
    goldGrad, txt, measure, rrect, glitchTxt, topShade, botShade, vignette, flash, gridBg, pill, icon, check, imageCard,
    alertBorder, wordRow, stampBox, shock, starSticker, confetti, progressBar, notif, hudRings, ctaButton, fadeOut, captions } = K;


// S1: PARA TUDO! (palm) + question (shocked face)
function S1_hook(ctx, t) {
  if (t > TT.c2) return;
  if (t < TT.c1 + 0.05) {
    const out = 1 - prog(t, TT.c1 - 0.06, TT.c1 + 0.04);
    alertBorder(ctx, t, out);
    ctx.save(); ctx.globalAlpha = 0.35 * out; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore();
    const k = 1 - prog(t, 0, 0.35);
    const sh = (s) => (rnd(Math.floor(t * 30) * 5 + s) - 0.5) * 16 * (0.35 + k);
    glitchTxt(ctx, 'PARA', W / 2 + sh(1), 790 + sh(2), { font: 'Anton', size: 340, color: '#fff', stroke: 'rgba(0,0,0,0.9)', sw: 20, glow: 'rgba(255,40,70,0.9)', blur: 50, alpha: out, scale: lerp(1.9, 1, eOut5(prog(t, 0, 0.14))) }, Math.max(k, 0.15), Math.floor(t * 30));
    const t2 = at('tudo', 0.5) - 0.06;
    glitchTxt(ctx, 'TUDO!', W / 2 + sh(3), 1135 + sh(4), { font: 'Anton', size: 340, color: RED, stroke: 'rgba(0,0,0,0.9)', sw: 20, glow: 'rgba(255,40,70,0.95)', blur: 55, alpha: (t >= t2 ? 1 : 0) * out, scale: lerp(1.9, 1, eOut5(prog(t, t2, t2 + 0.14))) }, t < t2 + 0.35 ? 1 - prog(t, t2, t2 + 0.35) : 0.15, Math.floor(t * 30) + 50);
    return;
  }
  const a = TT.c1, b = TT.c2;
  botShade(ctx, env(t, a, b, 0.15, 0.1), 1050);
  const ea = env(t, a, b, 0.05, 0.1);
  const after = 1.3;
  const items = [['VOCÊ', at('você', after) - 0.04], ['JÁ', at('já', after) - 0.04], ['TÁ', at('tá', after) - 0.04], ['USANDO', at('usando', after) - 0.04], ['O', at('o', 2.5) - 0.04]];
  wordRow(ctx, t, items, 1395, { size: 74, alpha: ea });
  const ti = at('inema', 2.5) - 0.05;
  if (t >= ti) {
    let size = 205; while (measure(ctx, 'INEMACCBOT?', 'Anton', size) > 1000) size -= 4;
    const p = prog(t, ti, ti + 0.2);
    const gk = 1 - prog(t, ti, ti + 0.4);
    glitchTxt(ctx, 'INEMACCBOT?', W / 2, 1565, { font: 'Anton', size, color: (c, s) => goldGrad(c, -s / 2, s / 2), stroke: 'rgba(0,0,0,0.85)', sw: 14, glow: 'rgba(255,170,0,0.9)', blur: 40, alpha: ea, scale: lerp(1.6, 1, eOut5(p)) * (1 + 0.025 * Math.sin((t - ti) * 12)) }, gk, Math.floor(t * 30) + 7);
  }
}
// S2: ELE É DE GRAÇA (phone burst) -- the first drop
function S2_free(ctx, t) {
  const a = TT.c2, b = TT.c3; if (t < a || t > b) return;
  botShade(ctx, env(t, a, b, 0.15, 0.12), 1080);
  const te = at('ele', 4.0) - 0.05;
  txt(ctx, 'ELE É', W / 2, 1300, { font: 'MBlack', size: 70, ls: 8, alpha: env(t, te, b, 0.12, 0.12), stroke: 'rgba(0,0,0,0.8)', sw: 12, scale: lerp(1.4, 1, eOut5(prog(t, te, te + 0.15))) });
  const tg = at('graça', 4.4) - 0.04;
  const ga = env(t, tg, b, 0.03, 0.12);
  if (ga > 0) {
    const p = eOut5(prog(t, tg, tg + 0.18)); const sc = lerp(2.4, 1, p);
    stampBox(ctx, W / 2, 1495, 920, 270, -0.05, sc, ga);
    txt(ctx, 'DE GRAÇA', W / 2, 1500, { font: 'Anton', size: 210, color: (c, s) => goldGrad(c, -s / 2, s / 2), glow: 'rgba(255,170,0,0.85)', blur: 30, alpha: ga, scale: sc, rot: -0.05 });
    shock(ctx, t, tg + 0.1, W / 2, 1495, 470, 150);
    const ts = tg + 0.28; const sp = prog(t, ts, ts + 0.25);
    starSticker(ctx, 905, 1290, 120, 0.22 + 0.04 * Math.sin((t - ts) * 6), lerp(0.2, 1, eBack(sp)), t >= ts ? ga : 0, 'R$0');
  }
}
// S3: E olha o que ele faz -> bouncing chevrons under captions
function S3_look(ctx, t) {
  const a = TT.c3, b = TT.c4; if (t < a || t > b) return;
  const ea = env(t, a + 0.1, b, 0.2, 0.12);
  for (let k = 0; k < 3; k++) {
    const y = 1450 + k * 46 + 14 * Math.sin(t * 9 - k * 0.8);
    ctx.save(); ctx.globalAlpha = ea * (0.45 + 0.55 * (1 - k / 3)); ctx.strokeStyle = GOLD; ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.shadowColor = GOLD; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.moveTo(W / 2 - 50, y - 20); ctx.lineTo(W / 2, y + 20); ctx.lineTo(W / 2 + 50, y - 20); ctx.stroke(); ctx.restore();
  }
}
// S4: sistema de agentes (pointing) + Jarvis HUD (face)
function S4_jarvis(ctx, t) {
  if (t >= TT.c4 && t < TT.c5) {
    const a = TT.c4, b = TT.c5;
    topShade(ctx, env(t, a, b, 0.15, 0.12), 760);
    const ts = at('sistema', 7.3) - 0.08, tg = at('agentes', 7.8) - 0.06, tf = at('funciona', 8.5) - 0.06;
    txt(ctx, 'UM SISTEMA DE', W / 2, 205, { font: 'MBlack', size: 56, ls: 6, alpha: env(t, ts, b, 0.15, 0.12), stroke: 'rgba(0,0,0,0.7)', sw: 10 });
    txt(ctx, 'AGENTES DE IA', W / 2, 350, { font: 'Anton', size: 165, color: (c, s) => goldGrad(c, -s / 2, s / 2), glow: 'rgba(255,170,0,0.9)', blur: 40, stroke: 'rgba(0,0,0,0.6)', sw: 10, alpha: env(t, tg, b, 0.08, 0.12), scale: lerp(1.5, 1, eOut5(prog(t, tg, tg + 0.2))) });
    txt(ctx, 'QUE FUNCIONA COMO...', W / 2, 490, { font: 'MBlack', size: 42, ls: 4, color: CYAN, alpha: env(t, tf, b, 0.15, 0.12), stroke: 'rgba(0,0,0,0.7)', sw: 8 });
    return;
  }
  const a = TT.c5, b = TT.c6; if (t < a || t > b) return;
  const ea = env(t, a, b, 0.2, 0.12);
  hudRings(ctx, t, a, W / 2, 640, ea);
  txt(ctx, 'AGENT.SYS ▸ ONLINE', 80, 130, { font: 'Mono', size: 30, align: 'left', color: CYAN, alpha: ea * (0.6 + 0.4 * Math.sin(t * 14)) });
  botShade(ctx, ea * 0.95, 1020);
  const tsu = at('seu', 9.0) - 0.06, tj = at('jarvis', 9.5) - 0.06;
  txt(ctx, 'SEU PRÓPRIO', W / 2, 1300, { font: 'MBlack', size: 66, ls: 6, alpha: env(t, tsu, b, 0.14, 0.12), stroke: 'rgba(0,0,0,0.8)', sw: 10 });
  const ja = env(t, tj, b, 0.06, 0.12);
  glitchTxt(ctx, 'JARVIS', W / 2, 1475, { font: 'Anton', size: 250, color: '#FFFFFF', glow: 'rgba(34,211,238,0.95)', blur: 45, stroke: 'rgba(0,0,0,0.5)', sw: 10, alpha: ja, scale: lerp(1.6, 1, eOut5(prog(t, tj, tj + 0.2))) }, 1 - prog(t, tj, tj + 0.4), Math.floor(t * 30) + 3);
}
// S5: 10 -> 100 -> 1.000 tarefas
function S5_counter(ctx, t) {
  const a = TT.c6, b = TT.c7; if (t < a || t > b) return;
  const ea = env(t, a, b, 0.15, 0.12);
  const rg = ctx.createRadialGradient(W / 2, 880, 50, W / 2, 880, 650); rg.addColorStop(0, `rgba(0,0,0,${0.55 * ea})`); rg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 200, W, 1400);
  const steps = [['10', at('dez', 11.0) - 0.05, 10], ['100', at('cem', 11.6) - 0.05, 45], ['1.000', at('mil', 12.0) - 0.05, 140]];
  let cur = null; for (const s of steps) if (t >= s[1]) cur = s;
  // flying task cards
  const nCards = cur ? cur[2] : 0;
  for (let i = 0; i < nCards; i++) {
    const grp = i < 10 ? 0 : i < 45 ? 1 : 2; const t0 = steps[grp][1] + rnd(i * 3) * 0.25;
    const dt = t - t0; if (dt < 0) continue;
    const ang = rnd(i * 17 + 1) * Math.PI * 2, sp = 260 + rnd(i * 5) * 520;
    const x = W / 2 + Math.cos(ang) * sp * Math.min(dt, 2.2) * 0.9, y = 880 + Math.sin(ang) * sp * Math.min(dt, 2.2) * 0.9;
    const al = ea * (1 - prog(dt, 1.2, 2.2)) * 0.9;
    ctx.save(); ctx.globalAlpha = al; ctx.translate(x, y); ctx.rotate((rnd(i) - 0.5) * 0.6);
    rrect(ctx, -30, -19, 60, 38, 7); ctx.fillStyle = 'rgba(40,28,4,0.85)'; ctx.fill(); ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,220,120,0.9)'; ctx.fillRect(-20, -8, 28, 5); ctx.fillRect(-20, 3, 40, 5); ctx.restore();
  }
  const tv = at('você', 10.9) - 0.05;
  txt(ctx, 'VOCÊ MANDA', W / 2, 560, { font: 'MBlack', size: 66, ls: 8, alpha: env(t, tv, b, 0.15, 0.12), stroke: 'rgba(0,0,0,0.8)', sw: 10 });
  if (cur) {
    const p = prog(t, cur[1], cur[1] + 0.16);
    txt(ctx, cur[0], W / 2, 880, { font: 'Anton', size: 360, color: (c, s) => goldGrad(c, -s / 2, s / 2), glow: 'rgba(255,170,0,0.95)', blur: 55, stroke: 'rgba(0,0,0,0.5)', sw: 10, alpha: ea, scale: lerp(1.7, 1, eOut5(p)) });
  }
  const tt = at('tarefas', 12.4) - 0.05;
  txt(ctx, 'TAREFAS', W / 2, 1110, { font: 'Anton', size: 140, color: '#fff', glow: 'rgba(255,255,255,0.4)', blur: 20, stroke: 'rgba(0,0,0,0.6)', sw: 8, alpha: env(t, tt, b, 0.1, 0.12), scale: lerp(1.4, 1, eOut5(prog(t, tt, tt + 0.18))) });
}
// S6: pipeline track with traveling task cards
const NODES = [
  { k: 'FILAS', ic: 'fila', w: 'filas', after: 14.0 },
  { k: 'WORKERS', ic: 'worker', w: 'workers', after: 15.2 },
  { k: 'AGENTES IA', ic: 'agente', w: 'agentes', after: 16.3 },
  { k: 'SKILLS', ic: 'skill', w: 'skill', after: 18.0 },
];
function S6_pipeline(ctx, t) {
  const a = TT.c7, b = TT.c11; if (t < a || t > b) return;
  const ea = env(t, a + 0.05, b, 0.25, 0.15);
  topShade(ctx, ea, 700);
  txt(ctx, 'PIPELINE DE AGENTES', W / 2, 165, { font: 'MBlack', size: 38, ls: 10, color: CYAN, alpha: ea, stroke: 'rgba(0,0,0,0.6)', sw: 8 });
  const xs = [150, 410, 670, 930], ty = 320;
  const times = NODES.map((n) => at(n.w, n.after) - 0.05);
  // track
  ctx.save(); ctx.globalAlpha = ea; ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(40, ty); ctx.lineTo(W - 40, ty); ctx.stroke();
  let litX = 40;
  times.forEach((tm, i) => { if (t >= tm - 0.3) litX = Math.max(litX, lerp(i ? xs[i - 1] : 40, xs[i], eOut(prog(t, tm - 0.3, tm)))); });
  if (t >= times[3] + 0.2) litX = lerp(xs[3], W - 40, eOut(prog(t, times[3] + 0.2, times[3] + 0.6)));
  ctx.strokeStyle = GOLD; ctx.shadowColor = GOLD; ctx.shadowBlur = 18; ctx.beginPath(); ctx.moveTo(40, ty); ctx.lineTo(litX, ty); ctx.stroke(); ctx.shadowBlur = 0;
  ctx.restore();
  // traveling cards
  const t0 = at('organiza', 13.3) - 0.1;
  if (t > t0) {
    for (let i = 0; i < 40; i++) {
      const ts = t0 + i * 0.3; if (t < ts) break;
      const x = 40 + (t - ts) * 330; if (x > litX + 10 || x > W - 30) continue;
      const near = 1 - prog(x, litX - 60, litX + 10);
      ctx.save(); ctx.globalAlpha = ea * near; ctx.translate(x, ty);
      rrect(ctx, -26, -17, 52, 34, 7); ctx.fillStyle = 'rgba(40,28,4,0.95)'; ctx.fill(); ctx.strokeStyle = '#FFE27A'; ctx.lineWidth = 3; ctx.shadowColor = GOLD; ctx.shadowBlur = 14; ctx.stroke(); ctx.restore();
    }
  }
  NODES.forEach((n, i) => {
    const on = t >= times[i]; const pa = prog(t, times[i], times[i] + 0.3);
    const sc = on ? 1 + 0.28 * Math.sin(Math.PI * pa) : 0.9;
    ctx.save(); ctx.globalAlpha = ea; ctx.translate(xs[i], ty); ctx.scale(sc, sc);
    ctx.beginPath(); ctx.arc(0, 0, 66, 0, 7); ctx.fillStyle = on ? 'rgba(60,40,0,0.95)' : 'rgba(10,14,24,0.92)'; ctx.fill();
    if (on) { ctx.shadowColor = GOLD; ctx.shadowBlur = 30; }
    ctx.strokeStyle = on ? GOLD : 'rgba(255,255,255,0.3)'; ctx.lineWidth = 6; ctx.stroke(); ctx.shadowBlur = 0;
    icon(ctx, n.ic, 0, 0, 58, on ? GOLD : 'rgba(255,255,255,0.4)');
    ctx.restore();
    let fs = 38; while (measure(ctx, n.k, 'MBlack', fs) > 240) fs -= 2;
    txt(ctx, n.k, xs[i], ty + 112, { font: 'MBlack', size: fs, color: on ? '#fff' : 'rgba(255,255,255,0.4)', alpha: ea, stroke: 'rgba(0,0,0,0.7)', sw: 8 });
    if (on && i === 3) { const cp = prog(t, times[3] + 0.5, times[3] + 0.8); if (cp > 0) { ctx.save(); ctx.globalAlpha = ea; check(ctx, W - 70, ty - 70, 46 * eBack(cp), GREEN); ctx.restore(); } }
  });
}
// S7: plug anything -> orchestrate (hub and spoke)
function S7_plug(ctx, t) {
  const a = TT.c11, b = TT.c13; if (t < a || t > b) return;
  const ea = env(t, a + 0.05, b, 0.2, 0.15);
  botShade(ctx, ea, 780);
  const tp = at('pluga', 19.2) - 0.06, to = at('orquestra', 22.0) - 0.06;
  txt(ctx, 'PLUGA QUALQUER', W / 2, 975, { font: 'MBlack', size: 60, ls: 6, alpha: env(t, tp, to + 0.05, 0.15, 0.1), stroke: 'rgba(0,0,0,0.75)', sw: 10 });
  const oa = env(t, to, b, 0.06, 0.15);
  txt(ctx, 'ORQUESTRA TUDO', W / 2, 975, { font: 'Anton', size: 150, color: (c, s) => goldGrad(c, -s / 2, s / 2), glow: 'rgba(255,170,0,0.9)', blur: 40, stroke: 'rgba(0,0,0,0.6)', sw: 10, alpha: oa, scale: lerp(1.5, 1, eOut5(prog(t, to, to + 0.2))) });
  const hub = [W / 2, 1335];
  const chips = [['SKILL', 'skill', 19.9, 230, 1185], ['WORKFLOW', 'workflow', 20.4, 850, 1185], ['SISTEMA', 'sistema', 21.2, W / 2, 1590]];
  chips.forEach(([lab, w, after, x, y], i) => {
    const tc = at(w, after) - 0.06; if (t < tc) return;
    const lp = eOut(prog(t, tc + 0.1, tc + 0.4));
    ctx.save(); ctx.globalAlpha = ea; ctx.strokeStyle = t > to ? GOLD : 'rgba(255,197,49,0.7)'; ctx.lineWidth = 5; ctx.setLineDash([16, 10]); ctx.lineDashOffset = -t * 60;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(lerp(x, hub[0], lp), lerp(y, hub[1], lp)); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    if (t > to) { const ph = ((t - to) * 1.4 + i / 3) % 1; ctx.save(); ctx.globalAlpha = ea; ctx.fillStyle = '#FFF4C2'; ctx.shadowColor = GOLD; ctx.shadowBlur = 24; ctx.beginPath(); ctx.arc(lerp(hub[0], x, ph), lerp(hub[1], y, ph), 10, 0, 7); ctx.fill(); ctx.restore(); }
    pill(ctx, x, y, lab, { size: 46, h: 92, prefix: '+', alpha: ea, scale: lerp(0.3, 1, eBack(prog(t, tc, tc + 0.28))) });
  });
  const ha = env(t, tp + 0.2, b, 0.25, 0.15);
  const pulse = t > to ? 1 + 0.06 * Math.sin((t - to) * 14) : 1;
  ctx.save(); ctx.globalAlpha = ha; ctx.translate(hub[0], hub[1]); ctx.scale(pulse, pulse);
  ctx.beginPath(); ctx.arc(0, 0, 105, 0, 7); const hg = ctx.createRadialGradient(0, 0, 10, 0, 0, 105); hg.addColorStop(0, '#FFE27A'); hg.addColorStop(1, '#C97800'); ctx.fillStyle = hg;
  ctx.shadowColor = GOLD; ctx.shadowBlur = t > to ? 60 : 30; ctx.fill(); ctx.shadowBlur = 0;
  icon(ctx, 'bot', 0, -8, 92, '#1A1000');
  ctx.restore();
  txt(ctx, 'INEMACCBOT', hub[0], 1468, { font: 'MBlack', size: 34, ls: 3, alpha: ha, stroke: 'rgba(0,0,0,0.8)', sw: 8 });
  shock(ctx, t, to + 0.05, hub[0], hub[1], 110, 110, GOLD, 0.7);
}
// S8: realtime monitoring - push notifications + telegram
function S8_monitor(ctx, t) {
  const a = TT.c13, b = TT.c15; if (t < a || t > b) return;
  const N = [
    { y: 200, title: 'INEMACCBOT', msg: 'Fluxo promoavatar · aguardando aprovação', kind: 'dot', w: 'acompanha', after: 23.6, d: 0.0 },
    { y: 375, title: 'INEMACCBOT', msg: 'Job concluído · skill executada', kind: 'check', w: 'tempo', after: 25.0, d: -0.05 },
    { y: 550, title: 'INEMACCBOT', msg: '3 tarefas na fila · workers ativos', kind: 'play', w: 'telegram', after: 26.5, d: -0.05 },
  ];
  const ea = env(t, a, b, 0.1, 0.15);
  topShade(ctx, ea * 0.85, 760);
  N.forEach((n) => { const tn = at(n.w, n.after) + n.d; if (t < tn) return; notif(ctx, n.y, n.title, n.msg, n.kind, prog(t, tn, tn + 0.3), ea); });
  if (t >= TT.c14) {
    const tl = at('direto', 26.0) - 0.05;
    const la = env(t, Math.max(tl, TT.c14), b, 0.12, 0.15);
    botShade(ctx, la, 1150);
    const bw = 330, bx = W / 2 - bw / 2, by = 1440;
    ctx.save(); ctx.globalAlpha = la; rrect(ctx, bx, by - 34, bw, 68, 34); ctx.fillStyle = 'rgba(255,59,78,0.22)'; ctx.fill(); ctx.strokeStyle = RED; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.arc(bx + 44, by, 12, 0, 7); ctx.fillStyle = `rgba(255,59,78,${0.55 + 0.45 * Math.sin(t * 10)})`; ctx.fill(); ctx.restore();
    txt(ctx, 'TEMPO REAL', bx + 72, by + 2, { font: 'MBlack', size: 34, align: 'left', alpha: la });
    txt(ctx, 'DIRETO DO TELEGRAM', W / 2, 1560, { font: 'Anton', size: 112, color: '#fff', glow: 'rgba(34,211,238,0.9)', blur: 30, stroke: 'rgba(0,0,0,0.6)', sw: 10, alpha: la, scale: lerp(1.3, 1, eOut5(prog(t, TT.c14, TT.c14 + 0.2))) });
  }
}
// S9: course + videos + apps
function S9_course(ctx, t) {
  const a = TT.c15, b = TT.c16; if (t < a || t > b) return;
  const ea = env(t, a, b, 0.15, 0.15);
  ctx.save(); ctx.globalAlpha = ea; ctx.fillStyle = 'rgba(3,5,11,0.6)'; ctx.fillRect(0, 0, W, H); ctx.restore();
  const ta = at('ainda', 27.6) - 0.06;
  txt(ctx, 'E AINDA TEM', W / 2, 215, { font: 'MBlack', size: 50, ls: 10, color: CYAN, alpha: env(t, ta, b, 0.15, 0.15), glow: 'rgba(34,211,238,0.5)', blur: 14 });
  const p = eOut5(prog(t, a + 0.02, a + 0.45));
  imageCard(ctx, IMG.capa, W / 2, 560, 930, { alpha: ea * prog(t, a, a + 0.15), scale: lerp(0.7, 1, p), rot: lerp(0.08, 0, p), zoom: 1 + 0.05 * prog(t, a, b) });
  const rows = [['CURSO COMPLETO', 'curso', 28.0], ['VÍDEOS', 'vídeos', 29.0], ['INÚMEROS APPS INTEGRADOS', 'inúmeros', 29.5]];
  rows.forEach(([lab, w, after], i) => {
    const tr = at(w, after) - 0.06; if (t < tr) return;
    const pp = prog(t, tr, tr + 0.25); const y = 960 + i * 112;
    const x = lerp(-400, W / 2, eBack(pp));
    const pw = pill(ctx, x, y, lab, { size: 46, h: 92, prefix: '    ', alpha: ea });
    ctx.save(); ctx.globalAlpha = ea; check(ctx, x - pw / 2 + 34 + 16, y + 1, 34, GREEN); ctx.restore();
  });
  const tapps = at('apps', 30.0) - 0.08;
  const kinds = ['bot', 'fluxo', 'fila', 'worker', 'agente', 'skill'];
  kinds.forEach((k, i) => {
    const ti = tapps + i * 0.07; if (t < ti) return;
    const pp = eBack(prog(t, ti, ti + 0.25)); const x = W / 2 + (i - 2.5) * 152, y = 1335;
    ctx.save(); ctx.globalAlpha = ea; ctx.translate(x, y); ctx.scale(pp, pp);
    rrect(ctx, -58, -58, 116, 116, 28); const g = ctx.createLinearGradient(0, -58, 0, 58); g.addColorStop(0, i % 2 ? '#0E3A44' : '#3A2A06'); g.addColorStop(1, '#070A12'); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = i % 2 ? CYAN : GOLD; ctx.lineWidth = 3; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 16; ctx.stroke(); ctx.shadowBlur = 0;
    icon(ctx, k, 0, 0, 60, i % 2 ? CYAN : GOLD); ctx.restore();
  });
}
// S10: manual -> agentes toggle, MODO MANUAL stamped out
function S10_manual(ctx, t) {
  const a = TT.c16, b = TT.c17; if (t < a || t > b) return;
  const ea = env(t, a + 0.05, b, 0.2, 0.12);
  topShade(ctx, ea, 820);
  const tg = at('agentes', 32.9) - 0.06;
  const k = eInOut(prog(t, tg, tg + 0.3));
  const tw = 640, th = 140, tx = W / 2 - tw / 2, ty = 300;
  ctx.save(); ctx.globalAlpha = ea;
  rrect(ctx, tx, ty - th / 2, tw, th, th / 2); ctx.fillStyle = 'rgba(8,12,22,0.85)'; ctx.fill();
  ctx.strokeStyle = k > 0.5 ? GOLD : RED; ctx.lineWidth = 4; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 20; ctx.stroke(); ctx.shadowBlur = 0;
  const kx = lerp(tx + tw * 0.25, tx + tw * 0.75, k);
  rrect(ctx, kx - tw * 0.25 + 10, ty - th / 2 + 10, tw * 0.5 - 20, th - 20, (th - 20) / 2);
  const kg = ctx.createLinearGradient(0, ty - 60, 0, ty + 60);
  if (k > 0.5) { kg.addColorStop(0, '#FFE27A'); kg.addColorStop(1, '#E58A00'); } else { kg.addColorStop(0, '#FF6B7A'); kg.addColorStop(1, '#C2182E'); }
  ctx.fillStyle = kg; ctx.shadowColor = k > 0.5 ? GOLD : RED; ctx.shadowBlur = 30; ctx.fill(); ctx.shadowBlur = 0;
  ctx.restore();
  txt(ctx, 'MANUAL', tx + tw * 0.25, ty + 3, { font: 'MBlack', size: 44, color: k <= 0.5 ? '#fff' : 'rgba(255,255,255,0.4)', alpha: ea });
  txt(ctx, 'AGENTES', tx + tw * 0.75, ty + 3, { font: 'MBlack', size: 44, color: k > 0.5 ? '#1A1000' : 'rgba(255,255,255,0.4)', alpha: ea });
  txt(ctx, 'MODO', W / 2, 170, { font: 'MBlack', size: 40, ls: 14, alpha: ea, stroke: 'rgba(0,0,0,0.6)', sw: 8 });
  const tm = at('manual', 34.5) - 0.06;
  const ma = env(t, tm, b, 0.04, 0.12);
  if (ma > 0) {
    const sc = lerp(2.2, 1, eOut5(prog(t, tm, tm + 0.18)));
    ctx.save(); ctx.globalAlpha = ma; ctx.translate(W / 2, 560); ctx.rotate(-0.07); ctx.scale(sc, sc);
    rrect(ctx, -400, -95, 800, 190, 24); ctx.fillStyle = 'rgba(30,4,8,0.75)'; ctx.fill(); ctx.strokeStyle = RED; ctx.lineWidth = 9; ctx.shadowColor = RED; ctx.shadowBlur = 30; ctx.stroke(); ctx.shadowBlur = 0;
    ctx.font = '130px Anton'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = RED; ctx.fillText('MODO MANUAL', 0, 6);
    const lp = eOut(prog(t, tm + 0.12, tm + 0.3)); ctx.strokeStyle = '#fff'; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-370, 0); ctx.lineTo(lerp(-370, 370, lp), 0); ctx.stroke();
    ctx.restore();
  }
}
// S11: E REPITO: TUDO GRÁTIS!
function S11_free2(ctx, t) {
  const a = TT.c17, b = TT.c18; if (t < a || t > b) return;
  const ea = env(t, a, b, 0.12, 0.12);
  botShade(ctx, ea, 900);
  const tr = at('repito', 35.5) - 0.12, tt = at('tudo', 36.3) - 0.05, tg = at('grátis', 36.7) - 0.04;
  txt(ctx, 'E REPITO:', W / 2, 1110, { font: 'MBlack', size: 70, ls: 8, alpha: env(t, tr, b, 0.12, 0.12), stroke: 'rgba(0,0,0,0.8)', sw: 12 });
  txt(ctx, 'É TUDO', W / 2, 1265, { font: 'Anton', size: 150, color: '#fff', stroke: 'rgba(0,0,0,0.7)', sw: 10, glow: 'rgba(255,255,255,0.4)', blur: 20, alpha: env(t, tt, b, 0.08, 0.12), scale: lerp(1.4, 1, eOut5(prog(t, tt, tt + 0.16))) });
  const ga = env(t, tg, b, 0.03, 0.12);
  if (ga > 0) {
    const sc = lerp(2.4, 1, eOut5(prog(t, tg, tg + 0.18))) * (1 + 0.02 * Math.sin((t - tg) * 10));
    stampBox(ctx, W / 2, 1470, 900, 280, -0.05, sc, ga);
    txt(ctx, 'GRÁTIS!', W / 2, 1478, { font: 'Anton', size: 245, color: (c, s) => goldGrad(c, -s / 2, s / 2), glow: 'rgba(255,170,0,0.9)', blur: 35, alpha: ga, scale: sc, rot: -0.05 });
    shock(ctx, t, tg + 0.08, W / 2, 1470, 470, 160);
    confetti(ctx, t, tg, W / 2, 1470);
  }
}
// S12: biggest platform + languages (globe)
function S12_platform(ctx, t) {
  const a = TT.c18, b = TT.c19; if (t < a || t > b) return;
  topShade(ctx, env(t, a, b, 0.2, 0.12), 980);
  const tm = at('maior', 37.7) - 0.08, te = at('educação', 38.5) - 0.08, tb = at('brasil', 39.8) - 0.06;
  txt(ctx, 'NA MAIOR PLATAFORMA DE', W / 2, 230, { font: 'MBlack', size: 56, alpha: env(t, tm, b, 0.15, 0.12), stroke: 'rgba(0,0,0,0.75)', sw: 10 });
  txt(ctx, 'EDUCAÇÃO EM TECNOLOGIA', W / 2, 305, { font: 'MBlack', size: 56, alpha: env(t, te, b, 0.15, 0.12), stroke: 'rgba(0,0,0,0.75)', sw: 10 });
  txt(ctx, 'DO BRASIL', W / 2, 440, { font: 'Anton', size: 170, color: (c, s) => goldGrad(c, -s / 2, s / 2), glow: 'rgba(255,170,0,0.85)', blur: 35, stroke: 'rgba(0,0,0,0.75)', sw: 12, alpha: env(t, tb, b, 0.08, 0.12), scale: lerp(1.5, 1, eOut5(prog(t, tb, tb + 0.2))) });
  const langs = [['PT', 'PORTUGUÊS', 'português', 40.5], ['ES', 'ESPAÑOL', 'espanhol', 41.2], ['EN', 'ENGLISH', 'inglês', 41.8]];
  const xs = [W / 2 - 340, W / 2, W / 2 + 340];
  langs.forEach(([code, lab, w, after], i) => {
    const tl = at(w, after) - 0.08; const p = prog(t, tl, tl + 0.25);
    const al = t >= tl ? env(t, tl, b, 0.1, 0.12) : 0; if (al <= 0) return;
    ctx.save(); ctx.globalAlpha = al; ctx.translate(xs[i], 620); ctx.scale(lerp(0.4, 1, eBack(p)), lerp(0.4, 1, eBack(p)));
    rrect(ctx, -163, -52, 326, 104, 52); ctx.fillStyle = 'rgba(8,12,22,0.85)'; ctx.fill(); ctx.strokeStyle = CYAN; ctx.lineWidth = 3; ctx.shadowColor = CYAN; ctx.shadowBlur = 18; ctx.stroke(); ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(-113, 0, 36, 0, 7); ctx.fillStyle = CYAN; ctx.fill();
    ctx.font = '30px MBlack'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.letterSpacing = '0px'; ctx.fillStyle = '#04121A'; ctx.fillText(code, -113, 2);
    let fs = 34; while (measure(ctx, lab, 'MBlack', fs) > 205) fs -= 1;
    ctx.font = `${fs}px MBlack`; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(lab, -64, 2);
    ctx.restore();
  });
}
// S13: CORRE! INEMA.CLUB end card
function S13_end(ctx, t) {
  const a = TT.c19; if (t < a) return;
  const ea = prog(t, a, a + 0.15);
  gridBg(ctx, t, ea, true);
  const tc = at('corre', 42.8) - 0.05;
  const sh = (s) => (rnd(Math.floor(t * 30) * 7 + s) - 0.5) * 10 * (1 - prog(t, tc, tc + 0.6));
  glitchTxt(ctx, 'CORRE!', W / 2 + sh(1), 330 + sh(2), { font: 'Anton', size: 190, color: RED, stroke: 'rgba(0,0,0,0.8)', sw: 12, glow: 'rgba(255,40,70,0.9)', blur: 40, alpha: env(t, tc, 99, 0.05), scale: lerp(1.8, 1, eOut5(prog(t, tc, tc + 0.18))) }, 1 - prog(t, tc, tc + 0.45), Math.floor(t * 30) + 11);
  const ti = at('inema.club', 43.2) - 0.05;
  const ca = env(t, ti, 99, 0.05);
  if (ca > 0) {
    const oc = createCanvas(W, 320); const o = oc.getContext('2d');
    txt(o, 'INEMA.CLUB', W / 2, 165, { font: 'Anton', size: 215, color: (c, s) => goldGrad(c, -s / 2, s / 2), glow: 'rgba(255,170,0,0.95)', blur: 50 });
    const sp = prog(t, ti + 0.3, ti + 1.1);
    if (sp > 0 && sp < 1) { o.save(); o.globalCompositeOperation = 'source-atop'; const sx = lerp(-300, W + 300, sp); const g = o.createLinearGradient(sx - 160, 0, sx + 160, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)'); o.fillStyle = g; o.fillRect(0, 0, W, 320); o.restore(); }
    const sc = lerp(1.5, 1, eOut5(prog(t, ti, ti + 0.25))) * (1 + 0.02 * Math.sin((t - ti) * 3));
    ctx.save(); ctx.globalAlpha = ca; ctx.translate(W / 2, 560); ctx.scale(sc, sc); ctx.drawImage(oc, -W / 2, -165); ctx.restore();
  }
  txt(ctx, 'GRÁTIS · PORTUGUÊS · ESPAÑOL · ENGLISH', W / 2, 700, { font: 'MBlack', size: 34, ls: 2, color: CYAN, alpha: env(t, ti + 0.3, 99, 0.25) });
  const ph = eOut5(prog(t, ti + 0.45, ti + 0.95));
  imageCard(ctx, IMG.hero, W / 2, lerp(1150, 1010, ph), 900, { alpha: prog(t, ti + 0.45, ti + 0.7), scale: lerp(0.9, 1, ph), zoom: 1 + 0.04 * prog(t, ti + 0.5, DUR), glow: 'rgba(34,211,238,0.6)', border: 'rgba(34,211,238,0.85)' });
  txt(ctx, '+ CURSO INEMACCBOT, VÍDEOS E APPS', W / 2, 1335, { font: 'MXBold', size: 38, color: '#fff', alpha: env(t, ti + 0.9, 99, 0.3) });
  ctaButton(ctx, t, ti + 1.3, 'ACESSE AGORA  ›', W / 2, 1490);
  fadeOut(ctx, t, 0.35);
}

const FLASHES = [[TT.c1, 0.6], [4.64, 0.85], [TT.c4, 0.3], [TT.c6, 0.5], [TT.c7, 0.4], [TT.c11, 0.4], [TT.c13, 0.3], [TT.c15, 0.4], [32.98, 0.6], [36.92, 0.9], [TT.c18, 0.45], [TT.c19, 0.6]];
function drawFrame(ctx, t) {
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

  return { drawFrame, sfxCues };
};
