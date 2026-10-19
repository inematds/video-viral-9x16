// mg_core.js - reusable motion-graphics overlay engine for vertical (9:16) shorts.
// Renders a transparent overlay (titles, word-synced captions, stickers, HUDs, end card) that is
// composited over the B-roll base track by render.py.
//
// Usage (from the project folder):
//   node engine/mg_core.js project.json frame <t> <out.png> [bg.png]  -> one preview frame (optionally over a background)
//   node engine/mg_core.js project.json stream                         -> raw RGBA frames on stdout (used by render.py)
//   node engine/mg_core.js project.json sfx                            -> SFX cue list JSON (used by mix_audio.py)
//   node engine/mg_core.js project.json chunks                         -> caption chunks with timings
//   node engine/mg_core.js project.json words                          -> numbered word list with timings (for authoring)
//
// The project-specific part lives in the scenes file (project.json -> "scenes"), which must export:
//   module.exports = (K) => ({ drawFrame(ctx, t), sfxCues() })
// where K is the toolkit object built below (constants, easing, drawing helpers, components, at(), TT, IMG, captions...).
'use strict';
const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const projPath = path.resolve(process.argv[2] || 'project.json');
if (!fs.existsSync(projPath)) { console.error('project.json not found: ' + projPath); process.exit(1); }
const P = JSON.parse(fs.readFileSync(projPath, 'utf8'));
const ROOT = path.dirname(projPath);
const R = (p) => path.resolve(ROOT, p);

// ---------- fonts ----------
const FONT_DIR = path.join(__dirname, 'fonts');
const DEFAULT_FONTS = {
  Anton: 'Anton-Regular.ttf', MBlack: 'Montserrat-Black.ttf', MXBold: 'Montserrat-ExtraBold.ttf',
  MBold: 'Montserrat-Bold.ttf', MSemi: 'Montserrat-SemiBold.ttf', Mono: 'JetBrainsMono-Bold.ttf',
};
for (const [name, file] of Object.entries(DEFAULT_FONTS)) { const f = path.join(FONT_DIR, file); if (fs.existsSync(f)) GlobalFonts.registerFromPath(f, name); }
for (const [name, file] of Object.entries(P.fonts || {})) GlobalFonts.registerFromPath(R(file), name);

// ---------- constants ----------
const V = P.video || {};
const W = V.width || 1080, H = V.height || 1920, FPS = V.fps || 30;
const DUR = P.duration;
if (!DUR) { console.error('project.json: "duration" (seconds) is required'); process.exit(1); }
const B = P.brand || {};
const GOLD = B.primary || '#FFC531', GOLD2 = B.primary2 || '#FFB000', CYAN = B.accent || '#22D3EE', RED = B.alert || '#FF3B4E', GREEN = B.ok || '#3DDC84';
const GRAD = B.gradient || ['#FFF1B0', GOLD, '#E58A00'];
const BG = B.background || '#04060C';

// ---------- timing helpers ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const eOut = (x) => 1 - Math.pow(1 - x, 3);
const eOut5 = (x) => 1 - Math.pow(1 - x, 5);
const eIn = (x) => x * x * x;
const eInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const eBack = (x) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const lerp = (a, b, x) => a + (b - a) * x;
// visibility envelope: fades in at a over di, fades out ending at b over dout
const env = (t, a, b, di = 0.18, dout = 0.15) => (t < a || t > b ? 0 : eOut(prog(t, a, a + di)) * (1 - eIn(prog(t, b - dout, b))));
function rnd(seed) { let s = seed >>> 0; s = (s + 0x6D2B79F5) >>> 0; let r = Math.imul(s ^ (s >>> 15), 1 | s); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }

// ---------- words / timeline ----------
const WJ = JSON.parse(fs.readFileSync(R(P.words), 'utf8'));
const WORDS = (WJ.words || WJ).map((w) => ({ s: w.start, e: w.end, t: w.text }));
const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}.]/gu, '').replace(/\.+$/, '');
// start time of the first word that starts with `word` at or after `after` seconds
function at(word, after = 0) {
  const k = norm(word);
  const w = WORDS.find((x) => x.s >= after - 0.01 && norm(x.t).startsWith(k));
  if (!w) throw new Error(`word not found: "${word}" after ${after}s (run: node engine/mg_core.js project.json words)`);
  return w.s;
}
function atEnd(word, after = 0) { const s = at(word, after); return WORDS.find((x) => x.s === s).e; }
// like at(), but returns `fallback` (seconds) when the word is not in the narration - handy for starter templates
function atOr(word, after, fallback) { try { return at(word, after); } catch (e) { return fallback; } }
// first occurrence of `word` starting inside [a, b); otherwise `fallback` (defaults to a + 0.3) - safest for section-bound pops
function atIn(word, a, b, fallback) { const k = norm(word); const w = WORDS.find((x) => x.s >= a - 0.01 && x.s < b && norm(x.t).startsWith(k)); return w ? w.s : (fallback ?? a + 0.3); }
const TT = P.timeline || {};
const tv = (v) => (typeof v === 'string' ? (v in TT ? TT[v] : (() => { throw new Error('timeline key not found: ' + v); })()) : v);

// ---------- captions (word-synced karaoke) ----------
const CAP = P.captions || {};
const CAP_WINDOWS = (CAP.windows || []).map(([a, b]) => [tv(a), tv(b)]);
const DISPLAY_FIX = CAP.displayFix || {};
const FUNC = new Set(CAP.glueWords || ['as', 'os', 'de', 'e', 'em', 'no', 'na', 'o', 'a', 'do', 'da', 'pros', 'pro', 'um', 'uma', 'que', 'seu', 'com', 'the', 'a', 'an', 'of', 'to', 'and', 'in', 'el', 'la', 'los', 'las', 'y', 'en']);
const clean = (w) => (DISPLAY_FIX[w.toLowerCase().replace(/[,.:!?]+$/, '')] || w).toUpperCase().replace(/[,.:!?;]+$/, '');
function buildChunks() {
  const chunks = [];
  CAP_WINDOWS.forEach(([a, b], wi) => {
    const ws = WORDS.filter((w) => w.s >= a - 0.05 && w.s < b - 0.05);
    const g = CAP.groups && CAP.groups[wi];
    if (g) { // explicit grouping: list of word counts per chunk
      const sum = g.reduce((x, y) => x + y, 0);
      if (sum !== ws.length) throw new Error(`caption groups for window ${wi} sum to ${sum}, but window has ${ws.length} words: ${ws.map((w) => w.t).join(' ')}`);
      let k = 0;
      for (const n of g) { chunks.push({ words: ws.slice(k, k + n).map((w) => ({ ...w, txt: clean(w.t) })), win: [a, b], wid: wi }); k += n; }
      return;
    }
    // automatic grouping: max ~3 words / 17 chars, never end a chunk on a glue word, break on punctuation
    let cur = [];
    const flush = () => { if (cur.length) { chunks.push({ words: cur, win: [a, b], wid: wi }); cur = []; } };
    for (const w of ws) {
      const txt = clean(w.t);
      const chars = cur.reduce((n, x) => n + x.txt.length + 1, 0) + txt.length;
      const lastGlue = cur.length && FUNC.has(cur[cur.length - 1].t.toLowerCase());
      if (!lastGlue && (cur.length >= 3 || (cur.length && chars > 17))) flush();
      else if (lastGlue && (cur.length >= 5 || chars > 24)) flush();
      cur.push({ ...w, txt });
      if (/[,.?!:;]$/.test(w.t)) flush();
    }
    flush();
  });
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    c.start = Math.max(c.words[0].s - 0.06, c.win[0]);
    const next = chunks[i + 1];
    let end = c.words[c.words.length - 1].e + 0.4;
    if (next && next.wid === c.wid && next.words[0].s - 0.06 < end + 0.25) end = next.words[0].s - 0.06;
    c.end = Math.min(end, c.win[1]);
  }
  return chunks;
}
const CHUNKS = buildChunks();

// ---------- drawing helpers ----------
function goldGrad(ctx, y0, y1) { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, GRAD[0]); g.addColorStop(0.45, GRAD[1]); g.addColorStop(1, GRAD[2]); return g; }
const brandGrad = goldGrad;
const gradFill = (c, s) => goldGrad(c, -s / 2, s / 2); // use as txt({color: gradFill}) - gradient relative to the text origin
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
// largest font size (<= size) so that s fits in maxW
function fitSize(ctx, s, font, size, maxW, ls = 0) { while (size > 10 && measure(ctx, s, font, size, ls) > maxW) size -= 2; return size; }
function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
// title with RGB-split glitch copies while k > 0
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
function capShade(ctx, a, cy = 1335) { if (a <= 0) return; const y0 = cy - 215; const g = ctx.createLinearGradient(0, y0, 0, y0 + 440); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, `rgba(0,0,0,${0.45 * a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, y0, W, 440); }
function vignette(ctx, a = 0.45) { const g = ctx.createRadialGradient(W / 2, H / 2, 500, W / 2, H / 2, 1200); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
// times: [[t, strength, color?], ...] -> short white flash on cuts / drops
function flash(ctx, t, times) { for (const [ft, strength, col] of times) { const p = (t - ft) / 0.22; if (p >= 0 && p <= 1) { ctx.save(); ctx.globalAlpha = strength * Math.pow(1 - p, 2); ctx.fillStyle = col || '#FFF6D8'; ctx.fillRect(0, 0, W, H); ctx.restore(); } } }
// animated tech grid background (opaque=true for end cards)
function gridBg(ctx, t, a = 1, opaque = false) {
  ctx.save(); ctx.globalAlpha = a;
  if (opaque) { ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H); } else { ctx.fillStyle = 'rgba(3,5,11,0.88)'; ctx.fillRect(0, 0, W, H); }
  const rg = ctx.createRadialGradient(W / 2, 760, 50, W / 2, 760, 1000); rg.addColorStop(0, 'rgba(255,190,40,0.20)'); rg.addColorStop(0.5, 'rgba(34,211,238,0.06)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(34,211,238,0.07)'; ctx.lineWidth = 1.5;
  const off = (t * 30) % 90;
  for (let x = -90 + (off % 90); x < W + 90; x += 90) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = -90 + off; y < H + 90; y += 90) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  for (let i = 0; i < 60; i++) {
    const px = rnd(i * 13) * W, sp = 20 + rnd(i * 17) * 60, py = (rnd(i * 29) * H - t * sp + H * 10) % H;
    const r = 1.5 + rnd(i * 31) * 2.5; ctx.fillStyle = i % 3 ? 'rgba(255,197,49,0.45)' : 'rgba(34,211,238,0.45)';
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
// rounded label chip; returns its width
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
// vector icons (no emoji/unicode glyphs needed): bot, fluxo, fila, worker, agente, skill, play, bell, globe, bolt
function icon(ctx, kind, cx, cy, s, col) {
  ctx.save(); ctx.translate(cx, cy); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = s * 0.11; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (kind === 'bot') { rrect(ctx, -s * 0.5, -s * 0.38, s, s * 0.62, s * 0.18); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-s * 0.2, s * 0.24); ctx.lineTo(-s * 0.32, s * 0.48); ctx.lineTo(0, s * 0.24); ctx.stroke(); for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(i * s * 0.22, -s * 0.07, s * 0.07, 0, 7); ctx.fill(); } }
  if (kind === 'fluxo') { const pts = [[-s * 0.42, 0], [s * 0.38, -s * 0.36], [s * 0.38, s * 0.36]]; ctx.beginPath(); ctx.moveTo(pts[0][0], 0); ctx.lineTo(0, 0); ctx.lineTo(pts[1][0], pts[1][1]); ctx.moveTo(0, 0); ctx.lineTo(pts[2][0], pts[2][1]); ctx.stroke(); for (const p of pts) { ctx.beginPath(); ctx.arc(p[0], p[1], s * 0.13, 0, 7); ctx.fill(); } }
  if (kind === 'fila') { for (let i = -1; i <= 1; i++) { rrect(ctx, -s * 0.45, i * s * 0.3 - s * 0.09, s * 0.9, s * 0.18, s * 0.09); ctx.fill(); } }
  if (kind === 'worker') { const n = 8; ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2; const r = i % 2 ? s * 0.34 : s * 0.48; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(0, 0, s * 0.16, 0, 7); ctx.fill(); }
  if (kind === 'agente') { ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 - Math.PI / 2; const r = i % 2 ? s * 0.14 : s * 0.5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); }
  if (kind === 'skill' || kind === 'bolt') { ctx.beginPath(); ctx.moveTo(s * 0.1, -s * 0.52); ctx.lineTo(-s * 0.32, s * 0.06); ctx.lineTo(-s * 0.02, s * 0.06); ctx.lineTo(-s * 0.12, s * 0.52); ctx.lineTo(s * 0.32, -s * 0.06); ctx.lineTo(s * 0.02, -s * 0.06); ctx.closePath(); ctx.fill(); }
  if (kind === 'play') { ctx.beginPath(); ctx.moveTo(-s * 0.3, -s * 0.4); ctx.lineTo(s * 0.42, 0); ctx.lineTo(-s * 0.3, s * 0.4); ctx.closePath(); ctx.fill(); }
  if (kind === 'bell') { ctx.beginPath(); ctx.moveTo(-s * 0.38, s * 0.22); ctx.quadraticCurveTo(-s * 0.32, -s * 0.42, 0, -s * 0.42); ctx.quadraticCurveTo(s * 0.32, -s * 0.42, s * 0.38, s * 0.22); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.arc(0, s * 0.34, s * 0.1, 0, 7); ctx.fill(); }
  if (kind === 'globe') { ctx.beginPath(); ctx.arc(0, 0, s * 0.46, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, 0, s * 0.2, s * 0.46, 0, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-s * 0.46, 0); ctx.lineTo(s * 0.46, 0); ctx.stroke(); }
  ctx.restore();
}
function check(ctx, x, y, s, col) { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = s * 0.22; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(x - s * 0.4, y); ctx.lineTo(x - s * 0.1, y + s * 0.3); ctx.lineTo(x + s * 0.45, y - s * 0.35); ctx.stroke(); ctx.restore(); }
// rounded image card with glow border and optional zoom (Ken Burns)
function imageCard(ctx, img, cx, cy, w, o = {}) {
  const { alpha = 1, scale = 1, rot = 0, border = GOLD, glow = GOLD, zoom = 1 } = o;
  if (!img || alpha <= 0.001) return;
  const h = w * img.height / img.width;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(scale, scale);
  ctx.shadowColor = glow; ctx.shadowBlur = 50; rrect(ctx, -w / 2, -h / 2, w, h, 26); ctx.fillStyle = '#000'; ctx.fill(); ctx.shadowBlur = 0;
  ctx.save(); rrect(ctx, -w / 2, -h / 2, w, h, 26); ctx.clip();
  const zw = w * zoom, zh = h * zoom; ctx.drawImage(img, -zw / 2, -zh / 2, zw, zh); ctx.restore();
  rrect(ctx, -w / 2, -h / 2, w, h, 26); ctx.strokeStyle = border; ctx.lineWidth = 5; ctx.stroke();
  ctx.restore();
}

// ---------- reusable components ----------
// pulsing red alert border (pattern-interrupt hooks)
function alertBorder(ctx, t, a, col = '255,30,60') {
  if (a <= 0) return;
  const p = a * (0.55 + 0.45 * Math.abs(Math.sin(t * 9)));
  const d = 170;
  const mk = (x0, y0, x1, y1) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, `rgba(${col},${0.75 * p})`); g.addColorStop(1, `rgba(${col},0)`); return g; };
  ctx.save();
  ctx.fillStyle = mk(0, 0, 0, d); ctx.fillRect(0, 0, W, d);
  ctx.fillStyle = mk(0, H, 0, H - d); ctx.fillRect(0, H - d, W, d);
  ctx.fillStyle = mk(0, 0, d, 0); ctx.fillRect(0, 0, d, H);
  ctx.fillStyle = mk(W, 0, W - d, 0); ctx.fillRect(W - d, 0, d, H);
  ctx.restore();
}
// row of words that pop in one by one: items = [[label, time], ...]
function wordRow(ctx, t, items, y, o = {}) {
  const { font = 'MBlack', size = 70, color = '#fff', gap = 0.32 } = o;
  const widths = items.map(([s]) => measure(ctx, s, font, size));
  const sp = size * gap;
  const total = widths.reduce((a, b) => a + b, 0) + sp * (items.length - 1);
  let x = W / 2 - total / 2;
  items.forEach(([s, tm], i) => {
    const p = prog(t, tm, tm + 0.16);
    if (t >= tm) txt(ctx, s, x + widths[i] / 2, y, { font, size, color, alpha: o.alpha ?? 1, scale: lerp(1.5, 1, eOut5(p)), stroke: 'rgba(0,0,0,0.85)', sw: 12 });
    x += widths[i] + sp;
  });
}
// framed "stamp" box behind a big keyword (DE GRAÇA / GRÁTIS)
function stampBox(ctx, cx, cy, w, h, rot, sc, a, col = GOLD) {
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(sc, sc);
  rrect(ctx, -w / 2, -h / 2, w, h, 30); ctx.fillStyle = 'rgba(10,8,2,0.78)'; ctx.fill();
  ctx.shadowColor = col; ctx.shadowBlur = 45; ctx.strokeStyle = col; ctx.lineWidth = 11; ctx.stroke(); ctx.shadowBlur = 0;
  rrect(ctx, -w / 2 + 16, -h / 2 + 16, w - 32, h - 32, 20); ctx.strokeStyle = col; ctx.globalAlpha *= 0.5; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();
}
// big keyword stamped in a box: slams from 2.4x to 1x at t0, with shockwave
function stampWord(ctx, t, t0, tEnd, word, cx, cy, o = {}) {
  const { w = 920, h = 270, size = 210, rot = -0.05, col = GOLD } = o;
  const a = env(t, t0, tEnd, 0.03, 0.12); if (a <= 0) return 0;
  const sc = lerp(2.4, 1, eOut5(prog(t, t0, t0 + 0.18)));
  stampBox(ctx, cx, cy, w, h, rot, sc, a, col);
  txt(ctx, word, cx, cy + 5, { font: 'Anton', size: fitSize(ctx, word, 'Anton', size, w - 80), color: gradFill, glow: 'rgba(255,170,0,0.85)', blur: 30, alpha: a, scale: sc, rot });
  shock(ctx, t, t0 + 0.1, cx, cy, w / 2, h / 2, col);
  return a;
}
// expanding ring shockwave
function shock(ctx, t, t0, cx, cy, rx, ry, col = GOLD, dur = 0.6) {
  const sp = prog(t, t0, t0 + dur); if (sp <= 0 || sp >= 1) return;
  ctx.save(); ctx.globalAlpha = (1 - sp) * 0.85; ctx.strokeStyle = col; ctx.lineWidth = 9; ctx.shadowColor = col; ctx.shadowBlur = 20;
  ctx.beginPath(); ctx.ellipse(cx, cy, rx + sp * 520, ry + sp * 320, -0.05, 0, 7); ctx.stroke(); ctx.restore();
}
// starburst price sticker (R$0, -50%, NOVO...)
function starSticker(ctx, cx, cy, r, rot, sc, a, label) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(sc, sc);
  ctx.beginPath(); const n = 16; for (let i = 0; i < n * 2; i++) { const ang = (i / (n * 2)) * Math.PI * 2; const rr = i % 2 ? r * 0.84 : r; ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr); } ctx.closePath();
  const g = ctx.createLinearGradient(0, -r, 0, r); g.addColorStop(0, '#FFE680'); g.addColorStop(1, '#F29A00'); ctx.fillStyle = g;
  ctx.shadowColor = 'rgba(255,170,0,0.9)'; ctx.shadowBlur = 35; ctx.fill(); ctx.shadowBlur = 0;
  ctx.font = `${Math.round(r * 0.62)}px Anton`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#1A1000'; ctx.fillText(label, 0, 4);
  ctx.restore();
}
// confetti burst from (cx, cy) starting at t0
function confetti(ctx, t, t0, cx, cy, n = 90) {
  const dt = t - t0; if (dt < 0 || dt > 2.4) return;
  const cols = [GOLD, '#FFF1B0', CYAN, '#FFFFFF', '#FF9F1C'];
  for (let i = 0; i < n; i++) {
    const ang = rnd(i * 7 + 3) * Math.PI * 2, sp = 700 + rnd(i * 11) * 1100;
    const vx = Math.cos(ang) * sp, vy = Math.sin(ang) * sp - 500;
    const x = cx + vx * dt * Math.exp(-dt * 1.2), y = cy + vy * dt * Math.exp(-dt * 1.2) + 900 * dt * dt;
    const a = 1 - prog(dt, 1.4, 2.4);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(dt * (4 + rnd(i) * 8) + i);
    ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(-9, -5, 18, 10); ctx.restore();
  }
}
// thin progress bar at the top (retention)
function progressBar(ctx, t) {
  const p = clamp(t / DUR);
  ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(0, 0, W, 12);
  const g = ctx.createLinearGradient(0, 0, W * p, 0); g.addColorStop(0, GRAD[2]); g.addColorStop(1, '#FFE27A');
  ctx.shadowColor = GOLD; ctx.shadowBlur = 16; ctx.fillStyle = g; ctx.fillRect(0, 0, W * p, 12); ctx.restore();
}
// phone-style push notification sliding down (p = 0..1 entrance progress); kind: 'check' | 'dot' | 'play' | null
function notif(ctx, y, title, msg, kind, p, a, o = {}) {
  const { avatarIcon = 'bot', time = 'agora' } = o;
  const x = 70, w = W - 140, h = 150;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(0, lerp(-260, 0, eBack(p)));
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 30; rrect(ctx, x, y - h / 2, w, h, 34); ctx.fillStyle = 'rgba(16,20,32,0.93)'; ctx.fill(); ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(34,211,238,0.5)'; ctx.lineWidth = 2.5; ctx.stroke();
  const av = ctx.createLinearGradient(0, y - 40, 0, y + 40); av.addColorStop(0, '#FFE27A'); av.addColorStop(1, '#E58A00');
  ctx.beginPath(); ctx.arc(x + 82, y, 44, 0, 7); ctx.fillStyle = av; ctx.fill(); icon(ctx, avatarIcon, x + 82, y + 2, 50, '#141414');
  txt(ctx, title, x + 150, y - 30, { font: 'MBlack', size: 32, align: 'left' });
  txt(ctx, time, x + w - 40, y - 30, { font: 'MSemi', size: 26, align: 'right', color: 'rgba(255,255,255,0.55)' });
  let mx = x + 150;
  if (kind === 'check') { check(ctx, mx + 14, y + 30, 26, GREEN); mx += 44; }
  if (kind === 'dot') { ctx.beginPath(); ctx.arc(mx + 11, y + 29, 10, 0, 7); ctx.fillStyle = GOLD; ctx.fill(); mx += 40; }
  if (kind === 'play') { ctx.beginPath(); ctx.moveTo(mx + 2, y + 16); ctx.lineTo(mx + 24, y + 29); ctx.lineTo(mx + 2, y + 42); ctx.closePath(); ctx.fillStyle = CYAN; ctx.fill(); mx += 40; }
  txt(ctx, msg, mx, y + 30, { font: 'MSemi', size: fitSize(ctx, msg, 'MSemi', 31, x + w - 40 - mx), align: 'left', color: '#fff' });
  ctx.restore();
}
// rotating HUD rings ("Jarvis" scan) centered on (cx, cy), born at t0
function hudRings(ctx, t, t0, cx, cy, a, col = CYAN) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 14; ctx.lineCap = 'butt';
  const grow = eOut5(prog(t, t0, t0 + 0.5));
  [[300, 6, 0.9, 5], [365, 3, -0.5, 9], [430, 10, 0.3, 3]].forEach(([r, lw, spd, segs], ri) => {
    ctx.lineWidth = lw; const rr = r * lerp(0.6, 1, grow);
    for (let s = 0; s < segs; s++) { const a0 = (s / segs) * Math.PI * 2 + t * spd + ri; ctx.beginPath(); ctx.arc(cx, cy, rr, a0, a0 + (Math.PI * 2 / segs) * 0.62); ctx.stroke(); }
  });
  ctx.lineWidth = 3; for (let i = 0; i < 72; i++) { const ang = (i / 72) * Math.PI * 2 - t * 0.2; const r0 = 470 * lerp(0.6, 1, grow), r1 = r0 + (i % 6 ? 12 : 28); ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0); ctx.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1); ctx.stroke(); }
  const sy = cy - 430 + ((t - t0) * 520) % 860; ctx.globalAlpha = a * 0.5; ctx.fillStyle = col; ctx.fillRect(cx - 430, sy, 860, 3);
  ctx.restore();
}
// glowing CTA button with optional animated tap cursor (born at t0)
function ctaButton(ctx, t, t0, label, cx, cy, o = {}) {
  const { w = 620, h = 120, size = 50, tap = true } = o;
  const ba = env(t, t0, 1e9, 0.25); if (ba <= 0) return;
  const pulse = 1 + 0.04 * Math.sin((t - t0) * 7);
  const sc = pulse * lerp(0.6, 1, eBack(prog(t, t0, t0 + 0.3)));
  ctx.save(); ctx.globalAlpha = ba; ctx.translate(cx, cy); ctx.scale(sc, sc);
  rrect(ctx, -w / 2, -h / 2, w, h, h / 2); const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, '#FFE27A'); g.addColorStop(1, GRAD[2]); ctx.fillStyle = g; ctx.shadowColor = GOLD; ctx.shadowBlur = 40; ctx.fill(); ctx.shadowBlur = 0;
  ctx.font = `${fitSize(ctx, label, 'MBlack', size, w - 60, 2)}px MBlack`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.letterSpacing = '2px'; ctx.fillStyle = '#1A1000'; ctx.fillText(label, 0, 3);
  ctx.restore();
  if (!tap) return;
  const tt = t0 + 0.9, tp = prog(t, tt - 0.4, tt), tx = cx + w * 0.27, ty = cy + 25;
  if (t > tt - 0.4) {
    const px = lerp(900, tx, eOut(tp)), py = lerp(cy + 230, ty, eOut(tp));
    const k = t > tt ? 1 - 0.15 * Math.sin(Math.PI * prog(t, tt, tt + 0.2)) : 1;
    ctx.save(); ctx.globalAlpha = ba; ctx.translate(px, py); ctx.scale(k, k);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 74); ctx.lineTo(20, 56); ctx.lineTo(34, 88); ctx.lineTo(48, 82); ctx.lineTo(34, 50); ctx.lineTo(60, 50); ctx.closePath();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.fill(); ctx.stroke(); ctx.restore();
    if (t > tt) { const rp = prog(t, tt, tt + 0.5); ctx.save(); ctx.globalAlpha = (1 - rp) * ba; ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(tx, ty, 20 + rp * 70, 0, 7); ctx.stroke(); ctx.restore(); }
  }
}
// fade to black over the last `d` seconds
function fadeOut(ctx, t, d = 0.35) { const fo = prog(t, DUR - d, DUR); if (fo > 0) { ctx.save(); ctx.globalAlpha = fo; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); } }

// karaoke captions: active word highlighted in the brand color
function captions(ctx, t, o = {}) {
  const c = CHUNKS.find((c) => t >= c.start && t < c.end);
  if (!c) return;
  const cy = o.y ?? CAP.y ?? 1335, maxW = o.maxWidth ?? CAP.maxWidth ?? 960, font = o.font ?? CAP.font ?? 'MBlack';
  const ca = env(t, c.start, c.end, 0.06, 0.06);
  capShade(ctx, 1, cy);
  const pop = lerp(0.82, 1, eBack(prog(t, c.start, c.start + 0.14)));
  const full = c.words.map((w) => w.txt).join(' ');
  const size = fitSize(ctx, full, font, o.size ?? CAP.size ?? 80, maxW);
  const space = measure(ctx, ' ', font, size) + size * 0.14;
  const widths = c.words.map((w) => measure(ctx, w.txt, font, size));
  const total = widths.reduce((s, x) => s + x, 0) + space * (c.words.length - 1);
  const activeCol = o.activeColor ?? CAP.activeColor ?? GOLD;
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
    ctx.fillStyle = active ? activeCol : said ? '#FFFFFF' : 'rgba(255,255,255,0.88)'; ctx.fillText(w.txt, 0, 0);
    ctx.restore();
    x += widths[i] + space;
  });
  ctx.restore();
}

// ---------- assets ----------
const IMG = {};
async function loadAssets() { for (const [k, p] of Object.entries(P.images || {})) IMG[k] = await loadImage(R(p)); }

// ---------- toolkit for scenes ----------
const K = {
  P, ROOT, R, W, H, FPS, DUR, GOLD, GOLD2, CYAN, RED, GREEN, GRAD, BG,
  clamp, prog, eOut, eOut5, eIn, eInOut, eBack, lerp, env, rnd,
  WORDS, at, atEnd, atOr, atIn, TT, tv, CHUNKS, IMG, createCanvas, loadImage,
  goldGrad, brandGrad, gradFill, txt, measure, fitSize, rrect, glitchTxt, topShade, botShade, capShade, vignette, flash, gridBg,
  pill, icon, check, imageCard, alertBorder, wordRow, stampBox, stampWord, shock, starSticker, confetti, progressBar, notif, hudRings, ctaButton, fadeOut, captions,
};
module.exports = K;

async function main() {
  const mode = process.argv[3];
  if (mode === 'words') { WORDS.forEach((w, i) => console.log(String(i).padStart(3), w.s.toFixed(2).padStart(6), w.e.toFixed(2).padStart(6), w.t)); return; }
  if (mode === 'chunks') { for (const c of CHUNKS) console.log(c.start.toFixed(2), c.end.toFixed(2), c.words.map((w) => w.txt).join(' ')); return; }
  const S = require(R(P.scenes || 'scenes.js'))(K);
  if (mode === 'sfx') { console.log(JSON.stringify(S.sfxCues ? S.sfxCues() : [])); return; }
  await loadAssets();
  const canvas = createCanvas(W, H); const ctx = canvas.getContext('2d');
  if (mode === 'frame') {
    const t = parseFloat(process.argv[4]); const out = process.argv[5]; const bg = process.argv[6];
    ctx.clearRect(0, 0, W, H); S.drawFrame(ctx, t);
    if (bg) { const c2 = createCanvas(W, H); const x2 = c2.getContext('2d'); x2.drawImage(await loadImage(fs.readFileSync(path.resolve(bg))), 0, 0, W, H); x2.drawImage(canvas, 0, 0); fs.writeFileSync(out, c2.toBuffer('image/png')); }
    else fs.writeFileSync(out, canvas.toBuffer('image/png'));
    return;
  }
  if (mode === 'stream') {
    const n = Math.round(DUR * FPS);
    for (let i = 0; i < n; i++) {
      const t = i / FPS; ctx.clearRect(0, 0, W, H); S.drawFrame(ctx, t);
      const buf = Buffer.from(ctx.getImageData(0, 0, W, H).data.buffer);
      if (!process.stdout.write(buf)) await new Promise((r) => process.stdout.once('drain', r));
      if (i % 150 === 0) process.stderr.write(`overlay frame ${i}/${n}\n`);
    }
    process.stdout.end();
    return;
  }
  console.error('unknown mode: ' + mode + ' (use frame | stream | sfx | chunks | words)'); process.exit(1);
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
