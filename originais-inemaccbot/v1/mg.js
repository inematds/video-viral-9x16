// INEMACCBOT viral short - motion graphics overlay renderer (1080x1920, 30fps)
// Usage:
//   node mg.js frame <t> <out.png> [bg.png]   -> single preview frame
//   node mg.js stream                         -> raw RGBA frames to stdout
const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const F = (p) => path.join(__dirname, 'fonts', p);
GlobalFonts.registerFromPath(F('Anton-Regular.ttf'), 'Anton');
GlobalFonts.registerFromPath(F('Montserrat-Black.ttf'), 'MBlack');
GlobalFonts.registerFromPath(F('Montserrat-ExtraBold.ttf'), 'MXBold');
GlobalFonts.registerFromPath(F('Montserrat-Bold.ttf'), 'MBold');
GlobalFonts.registerFromPath(F('Montserrat-SemiBold.ttf'), 'MSemi');
GlobalFonts.registerFromPath(F('JetBrainsMono-Bold.ttf'), 'Mono');

const W = 1080, H = 1920, FPS = 30;
const DUR = 53.5;
const GOLD = '#FFC531', GOLD2 = '#FFB000', CYAN = '#22D3EE', RED = '#FF3B4E', GREEN = '#3DDC84';

// ---------- timing helpers ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const eOut = (x) => 1 - Math.pow(1 - x, 3);
const eOut5 = (x) => 1 - Math.pow(1 - x, 5);
const eIn = (x) => x * x * x;
const eInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const eBack = (x) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const lerp = (a, b, x) => a + (b - a) * x;
// visibility envelope: fade/scale in at a over di, out at b over dout
const env = (t, a, b, di = 0.18, dout = 0.15) => (t < a || t > b ? 0 : eOut(prog(t, a, a + di)) * (1 - eIn(prog(t, b - dout, b))));
function rnd(seed) { let s = seed >>> 0; s = (s + 0x6D2B79F5) >>> 0; let r = Math.imul(s ^ (s >>> 15), 1 | s); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }

// ---------- words / captions ----------
const WJ = JSON.parse(fs.readFileSync(path.join(__dirname, 'words.json'), 'utf8'));
const WORDS = WJ.words.map((w) => ({ s: w.start, e: w.end, t: w.text }));
function at(word, after = 0) {
  const w = WORDS.find((x) => x.s >= after - 0.01 && x.t.toLowerCase().replace(/[^\p{L}\p{N}.]/gu, '').startsWith(word.toLowerCase()));
  if (!w) throw new Error('word not found: ' + word + ' after ' + after);
  return w.s;
}
const TT = {
  cut1: 2.45, cut2: 6.15, cut3: 11.35, chainA: 18.7, chainB: 24.45, monA: 29.25, proofA: 33.95, leapA: 37.3, freeA: 41.15, endA: 48.4,
};
const CAPTION_WINDOWS = [[TT.cut3, TT.chainA], [TT.proofA, TT.freeA]];
const DISPLAY_FIX = { 'ccbot,': 'INEMACCBOT,', 'inema.club.': 'INEMA.CLUB' };

function buildChunks() {
  const chunks = [];
  const FUNC = new Set(['as', 'os', 'de', 'e', 'em', 'no', 'na', 'o', 'a', 'do', 'da', 'pros', 'um', 'uma', 'cada', 'que', 'seu']);
  for (const [a, b] of CAPTION_WINDOWS) {
    const ws = WORDS.filter((w) => w.s >= a - 0.05 && w.s < b - 0.05);
    let cur = [];
    const flush = () => { if (cur.length) { chunks.push({ words: cur, win: [a, b], wid: a }); cur = []; } };
    for (const w of ws) {
      const txt = (DISPLAY_FIX[w.t.toLowerCase()] || w.t).toUpperCase().replace(/[,.:]+$/, '');
      const chars = cur.reduce((n, x) => n + x.txt.length + 1, 0) + txt.length;
      const lastFunc = cur.length && FUNC.has(cur[cur.length - 1].t.toLowerCase());
      if (!lastFunc && (cur.length >= 3 || (cur.length && chars > 17))) flush();
      else if (lastFunc && (cur.length >= 5 || chars > 24)) flush();
      cur.push({ ...w, txt });
      if (/[,.?!:]$/.test(w.t)) flush();
    }
    flush();
  }
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    c.start = c.words[0].s - 0.06;
    const lastEnd = c.words[c.words.length - 1].e;
    const next = chunks[i + 1];
    let end = lastEnd + 0.4;
    if (next && next.wid === c.wid && next.words[0].s - 0.06 < end + 0.25) end = next.words[0].s - 0.06;
    c.end = Math.min(end, c.win[1]);
  }
  return chunks;
}
const CHUNKS = buildChunks();

// ---------- drawing helpers ----------
function goldGrad(ctx, y0, y1) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#FFF1B0'); g.addColorStop(0.45, GOLD); g.addColorStop(1, '#E58A00');
  return g;
}
function txt(ctx, s, x, y, o = {}) {
  const { font = 'MBlack', size = 60, color = '#fff', align = 'center', glow = null, blur = 30, stroke = null, sw = 0, alpha = 1, scale = 1, ls = 0, rot = 0, glowPasses = 1 } = o;
  if (alpha <= 0.001) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y); if (rot) ctx.rotate(rot); if (scale !== 1) ctx.scale(scale, scale);
  ctx.font = `${size}px ${font}`;
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.letterSpacing = ls ? `${ls}px` : '0px';
  const fill = typeof color === 'function' ? color(ctx, size) : color;
  if (stroke && sw) { ctx.lineJoin = 'round'; ctx.strokeStyle = stroke; ctx.lineWidth = sw; ctx.strokeText(s, 0, 0); }
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = blur; for (let i = 0; i < glowPasses; i++) { ctx.fillStyle = fill; ctx.fillText(s, 0, 0); } ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; }
  ctx.fillStyle = fill; ctx.fillText(s, 0, 0);
  ctx.restore();
}
function measure(ctx, s, font, size, ls = 0) { ctx.save(); ctx.font = `${size}px ${font}`; ctx.letterSpacing = ls ? `${ls}px` : '0px'; const w = ctx.measureText(s).width; ctx.restore(); return w; }
function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
// glitch title: RGB split copies while k>0
function glitchTxt(ctx, s, x, y, o, k, seed) {
  if (k > 0.01) {
    const dx = (rnd(seed) - 0.5) * 40 * k + 10 * k, dy = (rnd(seed + 7) - 0.5) * 14 * k;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    txt(ctx, s, x - dx, y + dy, { ...o, color: 'rgba(255,40,80,0.85)', glow: null, stroke: null, alpha: (o.alpha ?? 1) * k });
    txt(ctx, s, x + dx, y - dy, { ...o, color: 'rgba(30,220,255,0.85)', glow: null, stroke: null, alpha: (o.alpha ?? 1) * k });
    ctx.restore();
  }
  txt(ctx, s, x, y, o);
}
function topShade(ctx, a, y1 = 1050) { if (a <= 0) return; const g = ctx.createLinearGradient(0, 0, 0, y1); g.addColorStop(0, `rgba(0,0,0,${0.72 * a})`); g.addColorStop(0.6, `rgba(0,0,0,${0.35 * a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, y1); }
function botShade(ctx, a, y0 = 820) { if (a <= 0) return; const g = ctx.createLinearGradient(0, y0, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.3, `rgba(0,0,0,${0.55 * a})`); g.addColorStop(1, `rgba(0,0,0,${0.75 * a})`); ctx.fillStyle = g; ctx.fillRect(0, y0, W, H - y0); }
function capShade(ctx, a) { if (a <= 0) return; const g = ctx.createLinearGradient(0, 1120, 0, 1560); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, `rgba(0,0,0,${0.45 * a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 1120, W, 440); }
function vignette(ctx, a = 0.45) { const g = ctx.createRadialGradient(W / 2, H / 2, 500, W / 2, H / 2, 1200); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
function flash(ctx, t, times) { for (const [ft, strength, col] of times) { const p = (t - ft) / 0.22; if (p >= 0 && p <= 1) { ctx.save(); ctx.globalAlpha = strength * Math.pow(1 - p, 2); ctx.fillStyle = col || '#FFF6D8'; ctx.fillRect(0, 0, W, H); ctx.restore(); } } }
function gridBg(ctx, t, a = 1, opaque = false) {
  ctx.save(); ctx.globalAlpha = a;
  if (opaque) { ctx.fillStyle = '#04060C'; ctx.fillRect(0, 0, W, H); } else { ctx.fillStyle = 'rgba(3,5,11,0.88)'; ctx.fillRect(0, 0, W, H); }
  const rg = ctx.createRadialGradient(W / 2, 760, 50, W / 2, 760, 1000); rg.addColorStop(0, 'rgba(255,190,40,0.20)'); rg.addColorStop(0.5, 'rgba(34,211,238,0.06)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(34,211,238,0.07)'; ctx.lineWidth = 1.5;
  const off = (t * 30) % 90;
  for (let x = -90 + (off % 90); x < W + 90; x += 90) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = -90 + off; y < H + 90; y += 90) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  // drifting particles
  for (let i = 0; i < 60; i++) {
    const px = rnd(i * 13) * W, sp = 20 + rnd(i * 17) * 60, py = (rnd(i * 29) * H - t * sp + H * 10) % H;
    const r = 1.5 + rnd(i * 31) * 2.5; ctx.fillStyle = i % 3 ? 'rgba(255,197,49,0.45)' : 'rgba(34,211,238,0.45)';
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
function pill(ctx, cx, cy, label, o = {}) {
  const { size = 44, font = 'MBlack', padX = 34, h = 90, fill = 'rgba(8,12,22,0.78)', border = GOLD, color = '#fff', alpha = 1, scale = 1, glow = GOLD, prefix = null, prefixColor = GOLD, bw = 3 } = o;
  if (alpha <= 0.001) return 0;
  const pw = prefix ? measure(ctx, prefix, font, size) + 14 : 0;
  const w = measure(ctx, label, font, size) + padX * 2 + pw;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(cx, cy); ctx.scale(scale, scale);
  rrect(ctx, -w / 2, -h / 2, w, h, h / 2);
  ctx.fillStyle = fill; ctx.fill();
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 24; }
  ctx.strokeStyle = border; ctx.lineWidth = bw; ctx.stroke(); ctx.shadowBlur = 0;
  ctx.font = `${size}px ${font}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.letterSpacing = '0px';
  let x = -w / 2 + padX;
  if (prefix) { ctx.fillStyle = prefixColor; ctx.fillText(prefix, x, 2); x += pw; }
  ctx.fillStyle = color; ctx.fillText(label, x, 2);
  ctx.restore();
  return w;
}

// ---------- icons (for the 6-component chain) ----------
function icon(ctx, kind, cx, cy, s, col) {
  ctx.save(); ctx.translate(cx, cy); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = s * 0.11; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (kind === 'bot') { rrect(ctx, -s * 0.5, -s * 0.38, s, s * 0.62, s * 0.18); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-s * 0.2, s * 0.24); ctx.lineTo(-s * 0.32, s * 0.48); ctx.lineTo(0, s * 0.24); ctx.stroke(); for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(i * s * 0.22, -s * 0.07, s * 0.07, 0, 7); ctx.fill(); } }
  if (kind === 'fluxo') { const pts = [[-s * 0.42, 0], [s * 0.38, -s * 0.36], [s * 0.38, s * 0.36]]; ctx.beginPath(); ctx.moveTo(pts[0][0], 0); ctx.lineTo(0, 0); ctx.lineTo(pts[1][0], pts[1][1]); ctx.moveTo(0, 0); ctx.lineTo(pts[2][0], pts[2][1]); ctx.stroke(); for (const p of pts) { ctx.beginPath(); ctx.arc(p[0], p[1], s * 0.13, 0, 7); ctx.fill(); } }
  if (kind === 'fila') { for (let i = -1; i <= 1; i++) { rrect(ctx, -s * 0.45, i * s * 0.3 - s * 0.09, s * 0.9, s * 0.18, s * 0.09); ctx.fill(); } }
  if (kind === 'worker') { const n = 8; ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2; const r = i % 2 ? s * 0.34 : s * 0.48; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(0, 0, s * 0.16, 0, 7); ctx.fill(); }
  if (kind === 'agente') { ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 - Math.PI / 2; const r = i % 2 ? s * 0.14 : s * 0.5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); }
  if (kind === 'skill') { ctx.beginPath(); ctx.moveTo(s * 0.1, -s * 0.52); ctx.lineTo(-s * 0.32, s * 0.06); ctx.lineTo(-s * 0.02, s * 0.06); ctx.lineTo(-s * 0.12, s * 0.52); ctx.lineTo(s * 0.32, -s * 0.06); ctx.lineTo(s * 0.02, -s * 0.06); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
function check(ctx, x, y, s, col) { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = s * 0.22; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(x - s * 0.4, y); ctx.lineTo(x - s * 0.1, y + s * 0.3); ctx.lineTo(x + s * 0.45, y - s * 0.35); ctx.stroke(); ctx.restore(); }

// ---------- assets ----------
let IMG = {};
async function loadAssets() {
  IMG.capa = await loadImage(path.join(__dirname, '..', 'assets', 'capa-inemaccbot.jpg'));
  IMG.hero = await loadImage(path.join(__dirname, '..', 'assets', 'inema_hero.png'));
}
function imageCard(ctx, img, cx, cy, w, o = {}) {
  const { alpha = 1, scale = 1, rot = 0, border = GOLD, glow = GOLD, zoom = 1 } = o;
  if (alpha <= 0.001) return;
  const h = w * img.height / img.width;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(scale, scale);
  ctx.shadowColor = glow; ctx.shadowBlur = 50; rrect(ctx, -w / 2, -h / 2, w, h, 26); ctx.fillStyle = '#000'; ctx.fill(); ctx.shadowBlur = 0;
  ctx.save(); rrect(ctx, -w / 2, -h / 2, w, h, 26); ctx.clip();
  const zw = w * zoom, zh = h * zoom; ctx.drawImage(img, -zw / 2, -zh / 2, zw, zh); ctx.restore();
  rrect(ctx, -w / 2, -h / 2, w, h, 26); ctx.strokeStyle = border; ctx.lineWidth = 5; ctx.stroke();
  ctx.restore();
}

// ---------- sections ----------
function S1_hook(ctx, t) {
  const a = TT.cut1; if (t > a) return;
  botShade(ctx, 1, 780);
  const shake = (k) => (rnd(Math.floor(t * 30) * 3 + k) - 0.5) * 8;
  const out = 1 - prog(t, a - 0.12, a);
  txt(ctx, 'AINDA FAZ', W / 2, 1010, { font: 'MBlack', size: 66, ls: 6, alpha: env(t, 0.12, a, 0.2, 0.1), stroke: 'rgba(0,0,0,0.6)', sw: 10 });
  const p2 = prog(t, 0.82, 1.0);
  glitchTxt(ctx, '1 TAREFA', W / 2 + shake(1), 1190 + shake(2), { font: 'Anton', size: 220, color: RED, glow: 'rgba(255,40,70,0.9)', blur: 40, alpha: (t >= 0.82 ? 1 : 0) * out, scale: lerp(1.7, 1, eOut5(p2)) }, t < 1.15 ? 1 - prog(t, 0.82, 1.15) : 0.15, Math.floor(t * 30));
  const p3 = prog(t, 1.55, 1.73);
  glitchTxt(ctx, 'POR VEZ?', W / 2 + shake(3), 1405 + shake(4), { font: 'Anton', size: 220, color: '#fff', glow: 'rgba(255,255,255,0.5)', blur: 30, alpha: (t >= 1.55 ? 1 : 0) * out, scale: lerp(1.7, 1, eOut5(p3)) }, t < 1.9 ? 1 - prog(t, 1.55, 1.9) : 0.15, Math.floor(t * 30) + 99);
}
function S2_counter(ctx, t) {
  const a = TT.cut1, b = TT.cut2; if (t < a || t > b) return;
  botShade(ctx, 1, 760);
  txt(ctx, 'ENQUANTO ISSO...', W / 2, 960, { font: 'MBlack', size: 58, color: CYAN, ls: 4, glow: 'rgba(34,211,238,0.6)', blur: 20, alpha: env(t, a + 0.12, b, 0.2, 0.12), stroke: 'rgba(0,0,0,0.5)', sw: 8 });
  const t100 = at('100', 3.5);
  const n = Math.round(lerp(1, 100, eOut(prog(t, a + 0.75, t100 + 0.05))));
  const bump = 1 + 0.18 * Math.sin(Math.PI * prog(t, t100, t100 + 0.22));
  const ea = env(t, a + 0.55, b, 0.15, 0.12);
  txt(ctx, String(n), W / 2, 1135, { font: 'Anton', size: 300, color: (c, s) => goldGrad(c, -s / 2, s / 2), glow: 'rgba(255,180,0,0.85)', blur: 50, alpha: ea, scale: bump });
  const tt = at('tarefas', 4.0);
  txt(ctx, 'TAREFAS', W / 2, 1335, { font: 'Anton', size: 110, color: '#fff', glow: 'rgba(255,255,255,0.35)', blur: 20, alpha: env(t, tt - 0.05, b, 0.14, 0.12), scale: lerp(1.3, 1, eOut(prog(t, tt - 0.05, tt + 0.15))) });
  const tm = at('mesmo', 5.0) - 0.15;
  const ma = env(t, tm, b, 0.15, 0.12);
  if (ma > 0) {
    const w = measure(ctx, 'AO MESMO TEMPO', 'MBlack', 62) + 60;
    ctx.save(); ctx.globalAlpha = ma; ctx.fillStyle = GOLD; const ww = w * eOut(prog(t, tm, tm + 0.2)); rrect(ctx, W / 2 - ww / 2, 1455 - 48, ww, 96, 14); ctx.fill(); ctx.restore();
    txt(ctx, 'AO MESMO TEMPO', W / 2, 1458, { font: 'MBlack', size: 62, color: '#0A0A0A', alpha: ma * prog(t, tm + 0.08, tm + 0.2) });
  }
}
function S3_reveal(ctx, t) {
  const a = TT.cut2, b = TT.cut3; if (t < a || t > b) return;
  botShade(ctx, env(t, a, b, 0.2, 0.15), 780);
  txt(ctx, 'CONHEÇA O', W / 2, 960, { font: 'MBlack', size: 56, ls: 12, alpha: env(t, a + 0.12, 7.6, 0.2, 0.15), stroke: 'rgba(0,0,0,0.5)', sw: 8 });
  const ti = at('inema', 6.5) - 0.05;
  const pa = prog(t, ti, ti + 0.25);
  const ea = env(t, ti, b, 0.06, 0.15);
  if (ea > 0) {
    // title onto offscreen for light sweep
    const oc = createCanvas(W, 300); const o = oc.getContext('2d');
    txt(o, 'INEMACCBOT', W / 2, 160, { font: 'Anton', size: 190, color: (c, s) => goldGrad(c, -s / 2, s / 2), glow: 'rgba(255,170,0,0.9)', blur: 45 });
    const sp = prog(t, ti + 0.35, ti + 1.0);
    if (sp > 0 && sp < 1) { o.save(); o.globalCompositeOperation = 'source-atop'; const sx = lerp(-300, W + 300, sp); const g = o.createLinearGradient(sx - 160, 0, sx + 160, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)'); o.fillStyle = g; o.fillRect(0, 0, W, 300); o.restore(); }
    ctx.save(); ctx.globalAlpha = ea; const sc = lerp(1.35, 1, eOut5(pa)); ctx.translate(W / 2, 1110); ctx.scale(sc, sc);
    const gk = 1 - prog(t, ti, ti + 0.35);
    if (gk > 0) { const dx = 22 * gk * (rnd(Math.floor(t * 30)) + 0.3); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = ea * gk; ctx.drawImage(oc, -W / 2 - dx, -160 + 4); ctx.drawImage(oc, -W / 2 + dx, -160 - 4); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = ea; }
    ctx.drawImage(oc, -W / 2, -160); ctx.restore();
  }
  const ts = at('sistema', 8.0) - 0.1;
  txt(ctx, 'SISTEMA DE AGENTES DE IA', W / 2, 1250, { font: 'MBlack', size: 50, ls: 3, color: CYAN, glow: 'rgba(34,211,238,0.7)', blur: 18, alpha: env(t, ts, b, 0.2, 0.15), stroke: 'rgba(0,0,0,0.55)', sw: 8 });
  const tj = at('seu', 9.8) - 0.05;
  const ja = env(t, tj, b, 0.2, 0.15);
  if (ja > 0) {
    const cy = 1400, bw = 600, bh = 150, k = eOut(prog(t, tj, tj + 0.3)), ext = lerp(140, 0, k);
    ctx.save(); ctx.globalAlpha = ja; ctx.strokeStyle = CYAN; ctx.lineWidth = 7; ctx.shadowColor = CYAN; ctx.shadowBlur = 18;
    const L = 46, x0 = W / 2 - bw / 2 - ext, x1 = W / 2 + bw / 2 + ext, y0 = cy - bh / 2 - ext / 3, y1 = cy + bh / 2 + ext / 3;
    for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) { ctx.beginPath(); ctx.moveTo(x, y + sy * L); ctx.lineTo(x, y); ctx.lineTo(x + sx * L, y); ctx.stroke(); }
    ctx.restore();
    txt(ctx, 'SEU JARVIS', W / 2, cy + 4, { font: 'Anton', size: 124, color: '#fff', glow: 'rgba(34,211,238,0.8)', blur: 30, alpha: ja * prog(t, tj + 0.08, tj + 0.25) });
  }
}
const PIPE = [
  { k: 'FILAS', sub: 'organizam', w: 'filas' },
  { k: 'WORKERS', sub: 'processam', w: 'workers' },
  { k: 'AGENTES', sub: 'operam a IA', w: 'agentes' },
  { k: 'SKILLS', sub: 'executam', w: 'skill' },
];
function S4_pipeline(ctx, t) {
  const a = TT.cut3, b = TT.chainA; if (t < a || t > b) return;
  topShade(ctx, env(t, a, b, 0.2, 0.15) * 0.9, 900);
  const t0 = at('ele', 12.5) - 0.1;
  const ra = env(t, t0, b, 0.25, 0.15);
  if (ra <= 0) return;
  const cw = 228, ch = 132, gap = 22, x0 = (W - (cw * 4 + gap * 3)) / 2, cy = 360;
  const slide = lerp(-60, 0, eOut(prog(t, t0, t0 + 0.3)));
  txt(ctx, 'VOCÊ MANDA. ELE EXECUTA.', W / 2, 236 + slide, { font: 'MBlack', size: 40, ls: 3, alpha: ra, stroke: 'rgba(0,0,0,0.6)', sw: 8 });
  PIPE.forEach((p, i) => {
    const ta = at(p.w, 13.0 + i * 0.9) - 0.04;
    const on = t >= ta; const pa = prog(t, ta, ta + 0.25);
    const x = x0 + i * (cw + gap), y = cy - ch / 2 + slide;
    const sc = on ? 1 + 0.12 * Math.sin(Math.PI * pa) : 1;
    ctx.save(); ctx.globalAlpha = ra; ctx.translate(x + cw / 2, y + ch / 2); ctx.scale(sc, sc);
    rrect(ctx, -cw / 2, -ch / 2, cw, ch, 22);
    ctx.fillStyle = on ? 'rgba(255,197,49,0.20)' : 'rgba(6,10,20,0.70)'; ctx.fill();
    if (on) { ctx.shadowColor = GOLD; ctx.shadowBlur = 30 * (1 - 0.6 * prog(t, ta + 0.3, ta + 1.2)); }
    ctx.strokeStyle = on ? GOLD : 'rgba(255,255,255,0.30)'; ctx.lineWidth = on ? 4 : 2; ctx.stroke(); ctx.shadowBlur = 0;
    ctx.font = '40px MBlack'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.letterSpacing = '0px';
    let fs = 40; while (measure(ctx, p.k, 'MBlack', fs) > cw - 24) fs -= 2;
    ctx.font = `${fs}px MBlack`; ctx.fillStyle = on ? GOLD : 'rgba(255,255,255,0.55)'; ctx.fillText(p.k, 0, -16);
    ctx.font = '28px MSemi'; ctx.fillStyle = on ? '#fff' : 'rgba(255,255,255,0.4)'; ctx.fillText(p.sub, 0, 30);
    ctx.restore();
    if (i < 3) { // arrow + traveling spark
      const ax = x + cw + gap / 2, ay = cy + slide;
      ctx.save(); ctx.globalAlpha = ra; ctx.fillStyle = on ? GOLD : 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.moveTo(ax - 7, ay - 11); ctx.lineTo(ax + 8, ay); ctx.lineTo(ax - 7, ay + 11); ctx.closePath(); ctx.fill(); ctx.restore();
    }
  });
}
const CHAIN = [
  { k: 'BOT', sub: 'conecta você ao sistema', ic: 'bot', w: 'bot' },
  { k: 'FLUXO', sub: 'coordena', ic: 'fluxo', w: 'fluxo' },
  { k: 'FILA', sub: 'organiza', ic: 'fila', w: 'fila' },
  { k: 'WORKER', sub: 'processa', ic: 'worker', w: 'worker' },
  { k: 'AGENTE', sub: 'opera a IA', ic: 'agente', w: 'agente' },
  { k: 'SKILL', sub: 'executa', ic: 'skill', w: 'skill' },
];
function S5_chain(ctx, t) {
  const a = TT.chainA, b = TT.chainB; if (t < a || t > b) return;
  const ea = env(t, a, b, 0.12, 0.12);
  gridBg(ctx, t, ea);
  ctx.save(); ctx.globalAlpha = ea;
  txt(ctx, 'O MODELO MENTAL', W / 2, 290, { font: 'MBlack', size: 40, ls: 12, color: GOLD });
  txt(ctx, '6 PEÇAS. 1 SISTEMA.', W / 2, 395, { font: 'Anton', size: 108, color: '#fff', glow: 'rgba(255,255,255,0.25)', blur: 20 });
  const y0 = 560, step = 152, nx = 205;
  const times = CHAIN.map((c, i) => at(c.w, 18.6 + i * 0.4) - 0.05);
  const tAll = at('tudo', 21.7), tBrain = at('único', 23.0) - 0.08;
  // spine
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(nx, y0); ctx.lineTo(nx, y0 + step * 5); ctx.stroke();
  let litY = y0;
  for (let i = 1; i < 6; i++) { const p = eOut(prog(t, times[i] - 0.25, times[i])); if (t >= times[i - 1]) litY = Math.max(litY, y0 + step * (i - 1) + step * p); }
  ctx.save(); ctx.strokeStyle = GOLD; ctx.shadowColor = GOLD; ctx.shadowBlur = 20; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(nx, y0); ctx.lineTo(nx, litY); ctx.stroke(); ctx.restore();
  if (t > tAll) { // energy pulses running down
    for (let k = 0; k < 4; k++) { const ph = ((t - tAll) * 0.9 + k / 4) % 1; const py = y0 + ph * step * 5; ctx.save(); ctx.fillStyle = '#FFF4C2'; ctx.shadowColor = GOLD; ctx.shadowBlur = 30; ctx.beginPath(); ctx.arc(nx, py, 11, 0, 7); ctx.fill(); ctx.restore(); }
  }
  CHAIN.forEach((c, i) => {
    const y = y0 + i * step; const on = t >= times[i]; const pa = prog(t, times[i], times[i] + 0.3);
    const pulse = t > tAll ? 0.5 + 0.5 * Math.sin((t - tAll) * 9 - i * 0.9) : 0;
    const sc = on ? 1 + 0.25 * Math.sin(Math.PI * pa) : 0.9;
    ctx.save(); ctx.translate(nx, y); ctx.scale(sc, sc);
    ctx.beginPath(); ctx.arc(0, 0, 58, 0, 7); ctx.fillStyle = on ? 'rgba(255,197,49,0.18)' : 'rgba(10,14,24,0.9)'; ctx.fill();
    if (on) { ctx.shadowColor = GOLD; ctx.shadowBlur = 25 + 25 * pulse; }
    ctx.strokeStyle = on ? GOLD : 'rgba(255,255,255,0.25)'; ctx.lineWidth = 5; ctx.stroke(); ctx.shadowBlur = 0;
    icon(ctx, c.ic, 0, 0, 52, on ? GOLD : 'rgba(255,255,255,0.35)');
    ctx.restore();
    const tx = nx + 105;
    const sl = lerp(40, 0, eOut(pa));
    txt(ctx, c.k, tx + sl, y - 22, { font: 'Anton', size: 84, align: 'left', color: on ? '#fff' : 'rgba(255,255,255,0.18)', glow: on && pa < 1 ? 'rgba(255,197,49,0.8)' : null, blur: 25 });
    txt(ctx, c.sub, tx + sl, y + 40, { font: 'MBold', size: 36, align: 'left', color: on ? GOLD : 'rgba(255,255,255,0.12)' });
  });
  // brain finale
  const ba = env(t, tBrain, b, 0.15, 0.12);
  if (ba > 0) {
    const pr = eOut(prog(t, tBrain, tBrain + 0.6));
    ctx.save(); ctx.globalAlpha = ba * (1 - pr) * 0.9; ctx.strokeStyle = GOLD; ctx.lineWidth = 10; ctx.shadowColor = GOLD; ctx.shadowBlur = 30; ctx.beginPath(); ctx.arc(W / 2, 935, 200 + pr * 800, 0, 7); ctx.stroke(); ctx.restore();
    txt(ctx, 'UM ÚNICO CÉREBRO', W / 2, 1470, { font: 'Anton', size: 112, color: (c, s) => goldGrad(c, -s / 2, s / 2), glow: 'rgba(255,170,0,0.9)', blur: 40, alpha: ba, scale: lerp(1.3, 1, eOut5(prog(t, tBrain, tBrain + 0.25))) });
  }
  ctx.restore();
}
function S6_integrate(ctx, t) {
  const a = TT.chainB, b = TT.monA; if (t < a || t > b) return;
  botShade(ctx, env(t, a, b, 0.2, 0.15) * 0.95, 760);
  const tOrq = at('orquestra', 28.0) - 0.08;
  const la = env(t, a + 0.1, tOrq + 0.15, 0.2, 0.15);
  txt(ctx, 'INTEGRE QUALQUER', W / 2, 990, { font: 'MBlack', size: 50, ls: 6, alpha: la, stroke: 'rgba(0,0,0,0.6)', sw: 8 });
  const items = [['SKILL', 'skill', 25.4], ['WORKFLOW', 'workflow', 26.2], ['SISTEMA / APP', 'sistema', 27.1]];
  items.forEach(([lab, w, after], i) => {
    const ti = at(w, after) - 0.08; const p = prog(t, ti, ti + 0.3);
    const outp = eIn(prog(t, tOrq, tOrq + 0.25));
    const al = t >= ti ? 1 - outp : 0;
    const x = lerp(W + 300, W / 2, eBack(p)), y = 1110 + i * 118 - outp * 120;
    pill(ctx, x, y, lab, { size: 52, h: 98, prefix: '+', alpha: al, glow: p < 1 ? GOLD : 'rgba(255,197,49,0.4)' });
  });
  const oa = env(t, tOrq, b, 0.12, 0.15);
  if (oa > 0) {
    txt(ctx, 'ORQUESTRADOR', W / 2, 1180, { font: 'Anton', size: 158, color: (c, s) => goldGrad(c, -s / 2, s / 2), glow: 'rgba(255,170,0,0.9)', blur: 45, alpha: oa, scale: lerp(1.4, 1, eOut5(prog(t, tOrq, tOrq + 0.25))) });
    txt(ctx, 'AGENTES · APPS · WORKFLOWS', W / 2, 1305, { font: 'MBlack', size: 42, ls: 3, color: CYAN, alpha: oa * prog(t, tOrq + 0.15, tOrq + 0.35), stroke: 'rgba(0,0,0,0.55)', sw: 8 });
  }
}
function S7_monitor(ctx, t) {
  const a = TT.monA, b = TT.proofA; if (t < a || t > b) return;
  const ea = env(t, a + 0.02, b, 0.25, 0.15);
  if (ea <= 0) return;
  botShade(ctx, ea * 0.8, 760);
  const cx = 70, cw = W - 140, cy0 = 930, chh = 570;
  const sl = lerp(80, 0, eOut(prog(t, a, a + 0.3)));
  ctx.save(); ctx.globalAlpha = ea; ctx.translate(0, sl);
  ctx.shadowColor = 'rgba(34,211,238,0.5)'; ctx.shadowBlur = 40;
  rrect(ctx, cx, cy0, cw, chh, 38); ctx.fillStyle = 'rgba(8,12,22,0.86)'; ctx.fill(); ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(34,211,238,0.55)'; ctx.lineWidth = 3; ctx.stroke();
  // header
  const av = ctx.createLinearGradient(0, cy0 + 40, 0, cy0 + 120); av.addColorStop(0, '#FFE27A'); av.addColorStop(1, '#E58A00');
  ctx.beginPath(); ctx.arc(cx + 80, cy0 + 78, 40, 0, 7); ctx.fillStyle = av; ctx.fill();
  icon(ctx, 'bot', cx + 80, cy0 + 80, 44, '#141414');
  txt(ctx, 'INEMACCBOT', cx + 140, cy0 + 62, { font: 'MBlack', size: 40, align: 'left' });
  txt(ctx, 'online · Telegram', cx + 140, cy0 + 104, { font: 'MSemi', size: 26, align: 'left', color: GREEN });
  const blink = 0.55 + 0.45 * Math.sin(t * 10);
  ctx.save(); rrect(ctx, cx + cw - 230, cy0 + 50, 190, 58, 29); ctx.fillStyle = 'rgba(255,59,78,0.18)'; ctx.fill(); ctx.strokeStyle = RED; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx + cw - 196, cy0 + 79, 10, 0, 7); ctx.fillStyle = `rgba(255,59,78,${blink})`; ctx.fill(); ctx.restore();
  txt(ctx, 'AO VIVO', cx + cw - 172, cy0 + 81, { font: 'MBlack', size: 26, align: 'left', color: '#fff' });
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + 30, cy0 + 150); ctx.lineTo(cx + cw - 30, cy0 + 150); ctx.stroke();
  // messages
  const msgs = [
    { me: true, s: '/fluxos', w: 'fluxo', d: -0.15 },
    { me: false, s: 'promoavatar · aguardando aprovação', w: 'e', d: 0.0, ic: 'dot', col: GOLD },
    { me: true, s: '/jobs', w: 'job', d: -0.15 },
    { me: false, s: '12 concluídos · 3 em execução', w: 'tempo', d: 0.0, ic: 'check', col: GREEN },
  ];
  let after = 30.5;
  msgs.forEach((m, i) => {
    const tm = at(m.w, after) + m.d; after = tm + 0.1;
    if (t < tm) return;
    const p = eBack(prog(t, tm, tm + 0.22));
    const y = cy0 + 205 + i * 86;
    const font = m.me ? 'Mono' : 'MSemi', size = m.me ? 34 : 31;
    const tw = measure(ctx, m.s, font, size) + (m.ic ? 46 : 0);
    const bw2 = tw + 56, bh = 66;
    const bx = m.me ? cx + cw - 40 - bw2 : cx + 40;
    ctx.save(); ctx.translate(bx + (m.me ? bw2 : 0), y); ctx.scale(p, p); ctx.translate(-(m.me ? bw2 : 0), 0);
    rrect(ctx, 0, -bh / 2, bw2, bh, 22); ctx.fillStyle = m.me ? 'rgba(34,211,238,0.22)' : 'rgba(255,255,255,0.08)'; ctx.fill();
    ctx.strokeStyle = m.me ? 'rgba(34,211,238,0.7)' : 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2; ctx.stroke();
    let tx = 28;
    if (m.ic === 'check') { check(ctx, tx + 14, 2, 26, m.col); tx += 46; }
    if (m.ic === 'dot') { ctx.beginPath(); ctx.arc(tx + 12, 1, 10, 0, 7); ctx.fillStyle = m.col; ctx.fill(); tx += 46; }
    ctx.font = `${size}px ${font}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.letterSpacing = '0px'; ctx.fillStyle = m.me ? '#BFF6FF' : '#fff'; ctx.fillText(m.s, tx, 2);
    ctx.restore();
  });
  ctx.restore();
}
function S8_proof(ctx, t) {
  const a = TT.proofA, b = TT.leapA; if (t < a || t > b) return;
  const ea = env(t, a, b, 0.15, 0.15);
  ctx.save(); ctx.globalAlpha = ea; ctx.fillStyle = 'rgba(3,5,11,0.62)'; ctx.fillRect(0, 0, W, H); ctx.restore();
  txt(ctx, 'CURSO COMPLETO · 10 MÓDULOS', W / 2, 290, { font: 'MBlack', size: 42, ls: 3, color: GOLD, alpha: ea, glow: 'rgba(255,197,49,0.5)', blur: 16 });
  const p = eOut5(prog(t, a + 0.02, a + 0.45));
  imageCard(ctx, IMG.capa, W / 2, 610, 940, { alpha: ea * prog(t, a, a + 0.15), scale: lerp(0.75, 1, p), rot: lerp(-0.08, 0, p), zoom: 1 + 0.05 * prog(t, a, b) });
  const items = [['CURSOS', 'cursos', 34.2], ['VÍDEOS', 'vídeos', 34.8], ['APPS INTEGRADOS', 'inúmeros', 35.3]];
  // layout: two on first row, one on second row
  const pos = [[W / 2 - 200, 990], [W / 2 + 200, 990], [W / 2, 1105]];
  items.forEach(([lab, w, after], i) => {
    const ti = at(w, after) - 0.06; const pp = prog(t, ti, ti + 0.28);
    pill(ctx, pos[i][0], pos[i][1], lab, { size: 48, h: 96, prefix: '+', alpha: t >= ti ? ea : 0, scale: lerp(0.4, 1, eBack(pp)) });
  });
}
function S9_leap(ctx, t) {
  const a = TT.leapA, b = TT.freeA; if (t < a || t > b) return;
  topShade(ctx, env(t, a, b, 0.2, 0.15) * 0.9, 1100);
  const ea = env(t, a + 0.02, b, 0.18, 0.15);
  txt(ctx, 'UM VERDADEIRO', W / 2, 330, { font: 'MBlack', size: 62, ls: 6, alpha: ea, stroke: 'rgba(0,0,0,0.6)', sw: 8 });
  const ts = at('salto', 37.9) - 0.06;
  const sa = env(t, ts, b, 0.06, 0.15);
  txt(ctx, 'SALTO', W / 2, 565, { font: 'Anton', size: 280, color: (c, s) => goldGrad(c, -s / 2, s / 2), glow: 'rgba(255,170,0,0.95)', blur: 55, alpha: sa, scale: lerp(1.6, 1, eOut5(prog(t, ts, ts + 0.22))) });
  // rising chevrons
  if (sa > 0) {
    for (let k = 0; k < 3; k++) {
      const ph = ((t - ts) * 0.9 + k / 3) % 1; const y = 250 - ph * 90; const al = Math.sin(Math.PI * ph) * sa;
      ctx.save(); ctx.globalAlpha = al; ctx.strokeStyle = GOLD; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.shadowColor = GOLD; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.moveTo(W / 2 - 60, y + 30); ctx.lineTo(W / 2, y - 25); ctx.lineTo(W / 2 + 60, y + 30); ctx.stroke(); ctx.restore();
    }
  }
}
function S10_free(ctx, t) {
  const a = TT.freeA, b = TT.endA; if (t < a || t > b) return;
  topShade(ctx, env(t, a, b, 0.2, 0.1), 1250);
  const tm = at('melhor', 41.2) - 0.25;
  txt(ctx, 'E O MELHOR:', W / 2, 320, { font: 'MBlack', size: 60, ls: 6, alpha: env(t, tm, b, 0.18, 0.1), stroke: 'rgba(0,0,0,0.6)', sw: 8 });
  const tg = at('gratuito', 42.2) - 0.06;
  const ga = env(t, tg, b, 0.04, 0.1);
  if (ga > 0) {
    const p = eOut5(prog(t, tg, tg + 0.2)); const sc = lerp(2.2, 1, p);
    ctx.save(); ctx.globalAlpha = ga; ctx.translate(W / 2, 560); ctx.rotate(-0.05); ctx.scale(sc, sc);
    rrect(ctx, -400, -150, 800, 300, 34); ctx.fillStyle = 'rgba(10,8,2,0.75)'; ctx.fill();
    ctx.shadowColor = GOLD; ctx.shadowBlur = 40; ctx.strokeStyle = GOLD; ctx.lineWidth = 10; ctx.stroke(); ctx.shadowBlur = 0;
    ctx.restore();
    txt(ctx, '100%', W / 2, 480, { font: 'Anton', size: 100, color: '#fff', alpha: ga, scale: sc, rot: -0.05 });
    txt(ctx, 'GRATUITO', W / 2 + 8, 600, { font: 'Anton', size: 170, color: (c, s) => goldGrad(c, -s / 2, s / 2), glow: 'rgba(255,170,0,0.8)', blur: 30, alpha: ga, scale: sc, rot: -0.05 });
    // shockwave
    const sp = prog(t, tg + 0.12, tg + 0.7);
    if (sp > 0 && sp < 1) { ctx.save(); ctx.globalAlpha = (1 - sp) * 0.8; ctx.strokeStyle = GOLD; ctx.lineWidth = 8; ctx.beginPath(); ctx.ellipse(W / 2, 560, 420 + sp * 500, 170 + sp * 300, -0.05, 0, 7); ctx.stroke(); ctx.restore(); }
  }
  const tp = at('maior', 43.0) - 0.1, te = at('educação', 44.2) - 0.1, tb = at('brasil', 45.4) - 0.1;
  { const pa = env(t, tp, b, 0.25, 0.1); if (pa > 0) { const g = ctx.createRadialGradient(W / 2, 900, 60, W / 2, 900, 560); g.addColorStop(0, `rgba(0,0,0,${0.62 * pa})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 600, W, 700); } }
  txt(ctx, 'NA MAIOR PLATAFORMA DE', W / 2, 800, { font: 'MBlack', size: 52, alpha: env(t, tp, b, 0.18, 0.1), stroke: 'rgba(0,0,0,0.65)', sw: 10 });
  txt(ctx, 'EDUCAÇÃO EM TECNOLOGIA', W / 2, 870, { font: 'MBlack', size: 52, alpha: env(t, te, b, 0.18, 0.1), stroke: 'rgba(0,0,0,0.65)', sw: 10 });
  txt(ctx, 'DO BRASIL', W / 2, 965, { font: 'Anton', size: 104, color: (c, s) => goldGrad(c, -s / 2, s / 2), stroke: 'rgba(0,0,0,0.9)', sw: 16, glow: 'rgba(0,0,0,0.9)', blur: 30, alpha: env(t, tb, b, 0.12, 0.1), scale: lerp(1.3, 1, eOut5(prog(t, tb, tb + 0.2))) });
  const langs = [['PT', 'PORTUGUÊS', 'português', 46.3], ['ES', 'ESPAÑOL', 'espanhol', 46.9], ['EN', 'ENGLISH', 'inglês', 47.5]];
  const xs = [W / 2 - 340, W / 2, W / 2 + 340];
  langs.forEach(([code, lab, w, after], i) => {
    const tl = at(w, after) - 0.08; const p = prog(t, tl, tl + 0.25);
    const al = t >= tl ? env(t, tl, b, 0.1, 0.1) : 0; if (al <= 0) return;
    ctx.save(); ctx.globalAlpha = al; ctx.translate(xs[i], 1110); ctx.scale(lerp(0.4, 1, eBack(p)), lerp(0.4, 1, eBack(p)));
    rrect(ctx, -163, -52, 326, 104, 52); ctx.fillStyle = 'rgba(8,12,22,0.82)'; ctx.fill(); ctx.strokeStyle = CYAN; ctx.lineWidth = 3; ctx.shadowColor = CYAN; ctx.shadowBlur = 18; ctx.stroke(); ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(-113, 0, 36, 0, 7); ctx.fillStyle = CYAN; ctx.fill();
    ctx.font = '30px MBlack'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.letterSpacing = '0px'; ctx.fillStyle = '#04121A'; ctx.fillText(code, -113, 2);
    let fs = 34; while (measure(ctx, lab, 'MBlack', fs) > 205) fs -= 1;
    ctx.font = `${fs}px MBlack`; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(lab, -64, 2);
    ctx.restore();
  });
}
function S11_end(ctx, t) {
  const a = TT.endA; if (t < a) return;
  const ea = prog(t, a, a + 0.15);
  gridBg(ctx, t, ea, true);
  const ta = at('acesse', 48.3) - 0.05;
  txt(ctx, 'ACESSE AGORA', W / 2, 360, { font: 'MBlack', size: 54, ls: 14, alpha: env(t, ta, 99, 0.2) });
  const tc = at('inema.club', 49.0) - 0.05;
  const ca = env(t, tc, 99, 0.05);
  if (ca > 0) {
    const oc = createCanvas(W, 320); const o = oc.getContext('2d');
    txt(o, 'INEMA.CLUB', W / 2, 165, { font: 'Anton', size: 215, color: (c, s) => goldGrad(c, -s / 2, s / 2), glow: 'rgba(255,170,0,0.95)', blur: 50 });
    const sp = prog(t, tc + 0.3, tc + 1.1);
    if (sp > 0 && sp < 1) { o.save(); o.globalCompositeOperation = 'source-atop'; const sx = lerp(-300, W + 300, sp); const g = o.createLinearGradient(sx - 160, 0, sx + 160, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)'); o.fillStyle = g; o.fillRect(0, 0, W, 320); o.restore(); }
    const sc = lerp(1.5, 1, eOut5(prog(t, tc, tc + 0.25))) * (1 + 0.02 * Math.sin((t - tc) * 3));
    ctx.save(); ctx.globalAlpha = ca; ctx.translate(W / 2, 560); ctx.scale(sc, sc); ctx.drawImage(oc, -W / 2, -165); ctx.restore();
  }
  txt(ctx, 'GRÁTIS · PORTUGUÊS · ESPAÑOL · ENGLISH', W / 2, 700, { font: 'MBlack', size: 34, ls: 2, color: CYAN, alpha: env(t, tc + 0.35, 99, 0.25) });
  const ph = eOut5(prog(t, tc + 0.5, tc + 1.0));
  imageCard(ctx, IMG.hero, W / 2, lerp(1150, 1010, ph), 900, { alpha: prog(t, tc + 0.5, tc + 0.75), scale: lerp(0.9, 1, ph), zoom: 1 + 0.04 * prog(t, tc + 0.5, 54), glow: 'rgba(34,211,238,0.6)', border: 'rgba(34,211,238,0.85)' });
  txt(ctx, '+ CURSO INEMACCBOT E MUITO MAIS', W / 2, 1335, { font: 'MXBold', size: 38, color: '#fff', alpha: env(t, tc + 1.0, 99, 0.3) });
  // final fade out
  const fo = prog(t, DUR - 0.35, DUR);
  if (fo > 0) { ctx.save(); ctx.globalAlpha = fo; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}
function captions(ctx, t) {
  const c = CHUNKS.find((c) => t >= c.start && t < c.end);
  if (!c) return;
  const ca = env(t, c.start, c.end, 0.06, 0.06);
  capShade(ctx, 1);
  const pop = lerp(0.82, 1, eBack(prog(t, c.start, c.start + 0.14)));
  let size = 80; const font = 'MBlack';
  const full = c.words.map((w) => w.txt).join(' ');
  while (measure(ctx, full, font, size) > 960) size -= 2;
  const space = measure(ctx, ' ', font, size) + size * 0.14;
  const widths = c.words.map((w) => measure(ctx, w.txt, font, size));
  const total = widths.reduce((s, x) => s + x, 0) + space * (c.words.length - 1);
  const cy = 1335;
  ctx.save(); ctx.globalAlpha = ca; ctx.translate(W / 2, cy); ctx.scale(pop, pop);
  let x = -total / 2;
  c.words.forEach((w, i) => {
    const next = c.words[i + 1];
    const active = t >= w.s - 0.04 && (next ? t < next.s - 0.04 : true);
    const said = t >= w.s - 0.04;
    const sc = active ? 1 + 0.06 * Math.sin(Math.PI * prog(t, w.s - 0.04, w.s + 0.12)) : 1;
    ctx.save(); ctx.translate(x + widths[i] / 2, 0); ctx.scale(sc, sc);
    ctx.font = `${size}px ${font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.letterSpacing = '0px';
    ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(0,0,0,0.95)'; ctx.lineWidth = 14; ctx.strokeText(w.txt, 0, 0);
    ctx.shadowColor = active ? 'rgba(255,190,0,0.9)' : 'rgba(0,0,0,0.7)'; ctx.shadowBlur = active ? 26 : 10;
    ctx.fillStyle = active ? GOLD : said ? '#FFFFFF' : 'rgba(255,255,255,0.88)'; ctx.fillText(w.txt, 0, 0);
    ctx.restore();
    x += widths[i] + space;
  });
  ctx.restore();
}

const FLASHES = [[TT.cut1, 0.55], [TT.cut2, 0.8], [TT.chainA, 0.5], [TT.chainB, 0.5], [TT.proofA, 0.35], [TT.freeA, 0.45], [TT.endA, 0.6]];
function drawFrame(ctx, t) {
  ctx.clearRect(0, 0, W, H);
  if (t < TT.endA) vignette(ctx, 0.5);
  S1_hook(ctx, t); S2_counter(ctx, t); S3_reveal(ctx, t); S4_pipeline(ctx, t); S5_chain(ctx, t);
  S6_integrate(ctx, t); S7_monitor(ctx, t); S8_proof(ctx, t); S9_leap(ctx, t); S10_free(ctx, t);
  captions(ctx, t);
  S11_end(ctx, t);
  flash(ctx, t, FLASHES);
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
  if (mode === 'sfx') {
    const ev = [];
    const add = (t, k, g = 1) => ev.push({ t: +t.toFixed(3), k, g });
    add(0.0, 'impact', 0.9); add(0.80, 'glitch', 0.7); add(1.53, 'glitch', 0.6); add(TT.cut1 - 0.12, 'whoosh', 0.8);
    add(at('100', 3.5) - 0.02, 'pop', 0.9); add(at('mesmo', 5.0) - 0.15, 'pop', 0.6);
    add(TT.cut2 - 0.1, 'whoosh', 0.8); add(at('inema', 6.5) - 0.08, 'impact', 1.0); add(at('seu', 9.8) - 0.05, 'glitch', 0.45);
    add(TT.cut3 - 0.12, 'whoosh', 0.7);
    PIPE.forEach((p, i) => add(at(p.w, 13.0 + i * 0.9) - 0.04, 'pop', 0.75));
    add(TT.chainA - 0.12, 'whoosh', 0.8);
    CHAIN.forEach((c, i) => add(at(c.w, 18.6 + i * 0.4) - 0.05, 'pop', 0.7));
    add(at('único', 23.0) - 0.1, 'impact', 0.85);
    add(TT.chainB - 0.12, 'whoosh', 0.8);
    [['skill', 25.4], ['workflow', 26.2], ['sistema', 27.1]].forEach(([w, a]) => add(at(w, a) - 0.08, 'pop', 0.8));
    add(at('orquestra', 28.0) - 0.1, 'impact', 0.9);
    add(TT.monA - 0.1, 'whoosh', 0.7);
    add(at('fluxo', 30.5) - 0.15, 'pop', 0.6); add(at('e', 30.8), 'pop', 0.5); add(at('job', 31.0) - 0.15, 'pop', 0.6); add(at('tempo', 31.5), 'chime', 0.5);
    add(TT.proofA - 0.1, 'whoosh', 0.8);
    [['cursos', 34.2], ['vídeos', 34.8], ['inúmeros', 35.3]].forEach(([w, a]) => add(at(w, a) - 0.06, 'pop', 0.75));
    add(at('salto', 37.9) - 3.0, 'riser', 0.7); add(at('salto', 37.9) - 0.08, 'impact', 1.0);
    add(TT.freeA - 0.1, 'whoosh', 0.7); add(at('gratuito', 42.2) - 0.08, 'impact', 1.0);
    add(at('brasil', 45.4) - 0.1, 'pop', 0.6);
    [['português', 46.3], ['espanhol', 46.9], ['inglês', 47.5]].forEach(([w, a]) => add(at(w, a) - 0.08, 'pop', 0.7));
    add(TT.endA - 0.12, 'whoosh', 0.9); add(at('inema.club', 49.0) - 0.08, 'impact', 1.0); add(at('inema.club', 49.0) + 0.35, 'chime', 0.7);
    console.log(JSON.stringify(ev)); return;
  }
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
