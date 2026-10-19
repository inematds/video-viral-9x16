// ---------- words / captions (v2) ----------
const WJ = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'v2', 'mg', 'words.json'), 'utf8'));
const WORDS = WJ.words.map((w) => ({ s: w.start, e: w.end, t: w.text }));
function at(word, after = 0) {
  const w = WORDS.find((x) => x.s >= after - 0.01 && x.t.toLowerCase().replace(/[^\p{L}\p{N}.]/gu, '').startsWith(word.toLowerCase()));
  if (!w) throw new Error('word not found: ' + word + ' after ' + after);
  return w.s;
}
const TT = {
  c1: 1.30, c2: 3.95, c3: 5.75, c4: 7.30, c5: 9.15, c6: 10.90, c7: 13.35, c8: 15.00, c9: 16.40, c10: 17.40,
  c11: 19.20, c12: 22.20, c13: 23.55, c14: 26.25, c15: 27.65, c16: 31.55, c17: 35.55, c18: 37.70, c19: 42.90,
};
const CAPTION_WINDOWS = [[TT.c3, TT.c4], [TT.c7, TT.c11], [TT.c13, TT.c14], [TT.c16, TT.c17]];
const DISPLAY_FIX = { 'ia': 'IA' };

function buildChunks() {
  const chunks = [];
  const GROUPS = [[2, 4], [3, 2, 3, 5, 3], [2, 2, 3], [2, 3, 3, 3]];
  CAPTION_WINDOWS.forEach(([a, b], wi) => {
    const ws = WORDS.filter((w) => w.s >= a - 0.05 && w.s < b - 0.05);
    const g = GROUPS[wi];
    if (g.reduce((x, y) => x + y, 0) !== ws.length) throw new Error(`caption group mismatch in window ${wi}: ${ws.length} words`);
    let k = 0;
    for (const n of g) {
      const cur = ws.slice(k, k + n).map((w) => ({ ...w, txt: (DISPLAY_FIX[w.t.toLowerCase().replace(/[,.:!?]+$/, '')] || w.t).toUpperCase().replace(/[,.:!?]+$/, '') }));
      chunks.push({ words: cur, win: [a, b], wid: a }); k += n;
    }
  });
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    c.start = Math.max(c.words[0].s - 0.06, c.win[0]);
    const lastEnd = c.words[c.words.length - 1].e;
    const next = chunks[i + 1];
    let end = lastEnd + 0.4;
    if (next && next.wid === c.wid && next.words[0].s - 0.06 < end + 0.25) end = next.words[0].s - 0.06;
    c.end = Math.min(end, c.win[1]);
  }
  return chunks;
}
const CHUNKS = buildChunks();
