// Excel (xlsx) import/export for predictions, using SheetJS.
import * as XLSX from 'xlsx';
import { GROUP_MATCHES } from '../data/tournament.js';
import { resolveBracket } from '../data/bracket.js';
import { resolveTeam } from '../data/teamAliases.js';

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

  const k = [['No', 'Tur', 'Ev', 'Deplasman', 'Ev Skor', 'Dep Skor', 'Kazanan']];
  for (let no = 73; no <= 104; no++) {
    const mm = b.matches[no] || {};
    const s = pred.ko?.[no] || {};
    k.push([
      no, koLabel(no),
      blankKoTeams ? '' : (mm.home || ''),
      blankKoTeams ? '' : (mm.away || ''),
      numOrBlank(s.hs), numOrBlank(s.as),
      s.winner || (blankKoTeams ? '' : mm.winner || ''),
    ]);
  }

  const d = [['Alan', 'Değer'], ['Gol Kralı', pred.topScorer || '']];

  const wb = XLSX.utils.book_new();
  const gs = XLSX.utils.aoa_to_sheet(g);
  gs['!cols'] = [{ wch: 4 }, { wch: 14 }, { wch: 7 }, { wch: 6 }, { wch: 22 }, { wch: 22 }, { wch: 8 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, gs, GROUP_SHEET);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(k), KO_SHEET);
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
