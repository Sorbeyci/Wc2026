// Excel (xlsx) import/export for predictions, using SheetJS.
import * as XLSX from 'xlsx';
import { GROUP_MATCHES } from '../data/tournament.js';
import { resolveBracket, bestThirds, R32, LATER } from '../data/bracket.js';
import { resolveTeam } from '../data/teamAliases.js';

const R32_BY_NO = Object.fromEntries(R32.map((m) => [m.no, m]));
const LATER_BY_NO = Object.fromEntries(LATER.map((m) => [m.no, m]));

// Positional origin of a knockout slot, mirroring the app bracket logic.
function originLabel(no, side, thirdSlotGroup) {
  const m32 = R32_BY_NO[no];
  if (m32) {
    const ref = m32[side];
    if (ref.t === 'W') return `1${ref.g}`;
    if (ref.t === 'R') return `2${ref.g}`;
    if (ref.t === 'T') { const g = thirdSlotGroup?.[ref.slot]; return g ? `3.(${g})` : `3.(${ref.slot})`; }
  }
  const ml = LATER_BY_NO[no];
  if (ml) {
    const ref = ml[side];
    if (ref.t === 'Wm') return `${ref.n}. maç galibi`;
    if (ref.t === 'Lm') return `${ref.n}. maç mağlubu`;
  }
  return '';
}

const GROUP_SHEET = 'Grup Maclari';
const KO_SHEET = 'Eleme';
const MISC_SHEET = 'Diger';

const koLabel = (no) =>
  no <= 88 ? 'Son 32' : no <= 96 ? 'Son 16' : no <= 100 ? 'Çeyrek Final' : no <= 102 ? 'Yarı Final' : no === 103 ? 'Üçüncülük' : 'Final';

const numOrBlank = (v) => (v === '' || v == null || isNaN(v) ? '' : Number(v));
const safe = (s) => (s || 'tahmin').toString().replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 40);

function findCol(header, ...names) {
  const norm = (s) => String(s || '').toLowerCase().trim();
  const want = names.map(norm);
  return header.findIndex((h) => want.includes(norm(h)));
}

// ---- Export ----------------------------------------------------------------
export function buildPredictionWorkbook(pred, { blankKoTeams = false } = {}) {
  const b = resolveBracket(pred, pred.ko || {});

  const g = [['No', 'Tarih', 'Saat', 'Grup', 'Ev', 'Deplasman', 'Ev Skor', 'Dep Skor']];
  for (const m of GROUP_MATCHES) {
    const s = pred.groupMatches?.[m.no] || {};
    g.push([m.no, m.date, m.time, m.group, m.home, m.away, numOrBlank(s.home), numOrBlank(s.away)]);
  }

  const k = [['No', 'Tur', 'Ev (kaynak)', 'Ev', 'Deplasman', 'Dep (kaynak)', 'Ev Skor', 'Dep Skor', 'Kazanan']];
  for (let no = 73; no <= 104; no++) {
    const mm = b.matches[no] || {};
    const s = pred.ko?.[no] || {};
    k.push([
      no, koLabel(no),
      originLabel(no, 'home', b.thirdSlotGroup),
      blankKoTeams ? '' : (mm.home || ''),
      blankKoTeams ? '' : (mm.away || ''),
      originLabel(no, 'away', b.thirdSlotGroup),
      numOrBlank(s.hs), numOrBlank(s.as),
      s.winner || (blankKoTeams ? '' : mm.winner || ''),
    ]);
  }

  // Best-8 third-placed teams, auto-derived from the group scores (like the app).
  const thirds = bestThirds(pred);
  const t = [['Sıra', 'Grup', 'Takım', 'Puan', 'Averaj', 'Attığı gol']];
  thirds.top8.forEach((r, i) => t.push([i + 1, r.group, r.team, r.Pts, r.GD, r.GF]));

  const d = [['Alan', 'Değer'], ['Gol Kralı', pred.topScorer || '']];

  const wb = XLSX.utils.book_new();
  const gs = XLSX.utils.aoa_to_sheet(g);
  gs['!cols'] = [{ wch: 4 }, { wch: 14 }, { wch: 7 }, { wch: 6 }, { wch: 22 }, { wch: 22 }, { wch: 8 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, gs, GROUP_SHEET);
  const ks = XLSX.utils.aoa_to_sheet(k);
  ks['!cols'] = [{ wch: 4 }, { wch: 13 }, { wch: 13 }, { wch: 20 }, { wch: 20 }, { wch: 13 }, { wch: 8 }, { wch: 8 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ks, KO_SHEET);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(t), '3. Takimlar');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(d), MISC_SHEET);
  return wb;
}

export function exportPredictionXlsx(name, pred) {
  XLSX.writeFile(buildPredictionWorkbook(pred), `${safe(name)}-tahmin.xlsx`);
}

// Blank, fillable template for collecting predictions.
export function downloadTemplateXlsx() {
  const empty = { groupMatches: {}, groupTables: {}, ko: {}, topScorer: '' };
  XLSX.writeFile(buildPredictionWorkbook(empty, { blankKoTeams: true }), 'tahmin-sablonu.xlsx');
}

// ---- Import ----------------------------------------------------------------
export async function parsePredictionFile(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const pred = { groupMatches: {}, groupTables: {}, ko: {}, topScorer: '' };

  const groupWs = wb.Sheets[GROUP_SHEET] || wb.Sheets[wb.SheetNames[0]];
  if (groupWs) {
    const rows = XLSX.utils.sheet_to_json(groupWs, { header: 1, blankrows: false });
    if (rows.length) {
      const h = rows[0];
      const cNo = findCol(h, 'no');
      const cHs = findCol(h, 'ev skor', 'evskor', 'home');
      const cAs = findCol(h, 'dep skor', 'depskor', 'away');
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i]; if (!r) continue;
        const no = Number(r[cNo]); if (!no) continue;
        const hs = r[cHs], as = r[cAs];
        if (hs === '' || hs == null || as === '' || as == null || isNaN(hs) || isNaN(as)) continue;
        pred.groupMatches[no] = { home: String(Number(hs)), away: String(Number(as)) };
      }
    }
  }

  const koWs = wb.Sheets[KO_SHEET];
  if (koWs) {
    const rows = XLSX.utils.sheet_to_json(koWs, { header: 1, blankrows: false });
    if (rows.length) {
      const h = rows[0];
      const cNo = findCol(h, 'no');
      const cHs = findCol(h, 'ev skor', 'home');
      const cAs = findCol(h, 'dep skor', 'away');
      const cWin = findCol(h, 'kazanan', 'winner');
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i]; if (!r) continue;
        const no = Number(r[cNo]); if (!no || no < 73 || no > 104) continue;
        const entry = {};
        if (cHs >= 0 && r[cHs] !== '' && r[cHs] != null && !isNaN(r[cHs])) entry.hs = String(Number(r[cHs]));
        if (cAs >= 0 && r[cAs] !== '' && r[cAs] != null && !isNaN(r[cAs])) entry.as = String(Number(r[cAs]));
        if (cWin >= 0 && r[cWin]) entry.winner = resolveTeam(r[cWin]) || String(r[cWin]).trim();
        if (Object.keys(entry).length) pred.ko[no] = entry;
      }
    }
  }

  const miscWs = wb.Sheets[MISC_SHEET];
  if (miscWs) {
    const rows = XLSX.utils.sheet_to_json(miscWs, { header: 1, blankrows: false });
    for (const r of rows) {
      if (r && String(r[0]).toLowerCase().includes('gol')) pred.topScorer = String(r[1] || '').trim();
    }
  }

  const counts = {
    groups: Object.keys(pred.groupMatches).length,
    ko: Object.keys(pred.ko).length,
  };
  return { pred, counts };
}
