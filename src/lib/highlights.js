// Maç özeti (TRT Spor) bulma & eşleştirme yardımcıları.
// Kota koruması: /api/highlight kenar-cache'li; bulunan video Firestore'da önbelleğe
// yazılır (maç başına en fazla birkaç arama, 1s/+1s artan tekrar).
import { shortName } from '../data/flags.js';

const HOUR = 3600 * 1000;
const MAX_TRIES = 8;

const norm = (s) => (s || '')
  .replace(/İ/g, 'i').replace(/I/g, 'i').replace(/ı/g, 'i')
  .toLowerCase()
  .replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// TRT başlıklarında geçen ada en yakın arama adı.
const TRT_NAME = {
  'Kore Cumhuriyeti': 'Güney Kore',
  'Amerika Birleşik Devletleri': 'Amerika',
  'Çek Cumhuriyeti': 'Çekya',
};
// Başlık eşleştirmede ek karşılıklar.
const ALIASES = {
  'Kore Cumhuriyeti': ['güney kore', 'g. kore', 'kore'],
  'Amerika Birleşik Devletleri': ['amerika', 'abd'],
  'Çek Cumhuriyeti': ['çekya', 'çek'],
  'Bosna Hersek': ['bosna'],
  'Birleşik Arap Emirlikleri': ['bae'],
};
// Yanlış turnuva/kategori başlıklarını ele (Kadınlar, gençlik, elemeler, hazırlık...).
const BAD = ['kadinlar', 'kadin', 'eleme', 'hazirlik', 'dostluk', 'u23', 'u21', 'u20', 'u19', 'u17', 'olimpiyat', 'efsaneler',
  'mac onu', 'mac oncesi', 'mac sonu', 'basin toplantisi', 'roportaj', 'yorumlar', 'degerlendirme', 'canli', 'ilk 11',
  'kadrolar', 'gol dakikalari sirali', 'taniyalim', 'tanitim', 'aciklamalar', 'kamp'];

const TR_MON = { oca: 0, sub: 1, mar: 2, nis: 3, may: 4, haz: 5, tem: 6, agu: 7, eyl: 8, eki: 9, kas: 10, ara: 11 };

const trtName = (team) => TRT_NAME[team] || team;

function candidates(team) {
  const list = [team, shortName(team), trtName(team), ...(ALIASES[team] || [])];
  const set = new Set(list.map(norm).filter((x) => x && x.length >= 3));
  return [...set];
}

// "Haz 14, 2026" + "23:00" -> ms (TR yerel ~UTC+3 kabul edip UTC'ye çevirir).
function matchStartMs(m) {
  try {
    const mo = norm(m.date).match(/([a-z]+) (\d+) (\d{4})/);
    if (!mo) return null;
    const mon = TR_MON[mo[1].slice(0, 3)];
    if (mon == null) return null;
    const [hh, mm] = (m.time || '00:00').split(':').map(Number);
    // TR saati -> UTC
    return Date.UTC(+mo[3], mon, +mo[2], (hh || 0) - 3, mm || 0);
  } catch { return null; }
}

export function buildQuery(m) {
  return `${trtName(m.home)} ${trtName(m.away)} 2026 Dünya Kupası`;
}

// Teşhis: bir maç için /api/highlight'ı çağırır; ham başlıkları ve seçimi döner.
export async function diagnoseHighlight(m, { base = '' } = {}) {
  const q = buildQuery(m);
  try {
    const r = await fetch(`${base}/api/highlight?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
    const j = await r.json().catch(() => null);
    if (!r.ok) return { q, ok: false, status: r.status, detail: j };
    const items = (j && j.items) || [];
    const pick = pickHighlight(m, items);
    return { q, ok: true, count: items.length, titles: items.map((x) => x.title), pick };
  } catch (e) {
    return { q, ok: false, error: String(e).slice(0, 120) };
  }
}

// Doğru videoyu seçer: iki takım + "dünya kupası" + (2026 veya grup) şart;
// Kadınlar/gençlik/eleme/hazırlık elenir; maçtan ÖNCE yüklenenler elenir.
export function pickHighlight(m, items) {
  const hc = candidates(m.home), ac = candidates(m.away);
  const start = matchStartMs(m);
  const grpTok = m.group ? norm(`${m.group} grubu`) : null;
  const KO_TOK = { R32: 'son 32', R16: 'son 16', QF: 'ceyrek final', SF: 'yari final', TP: 'ucuncoluk', F: 'final' };
  const roundTok = m.round ? norm(KO_TOK[m.round] || '') : null;
  let best = null, bestScore = -1;
  for (const it of items || []) {
    const t = norm(it.title);
    if (!hc.some((c) => t.includes(c))) continue;
    if (!ac.some((c) => t.includes(c))) continue;
    if (!t.includes('dunya kupasi')) continue;
    if (BAD.some((b) => t.includes(b))) continue;
    const has2026 = t.includes('2026');
    const hasGrp = grpTok ? t.includes(grpTok) : false;
    const hasRound = roundTok ? t.includes(roundTok) : false;
    if (!has2026 && !hasGrp && !hasRound) continue; // yanlış turnuva riskini ele

    // Tarih: özet maçtan sonra yüklenir. Yalnız SOFT ipucu olarak puanlanır (eleme yok).
    let pub = null;
    if (it.publishedAt) { const p = Date.parse(it.publishedAt); if (!Number.isNaN(p)) pub = p; }

    let score = 0;
    if (has2026) score += 3;
    if (hasGrp) score += 4;
    if (hasRound) score += 4;
    if (t.includes('ozet')) score += 3;
    if (t.includes('petrol ofisi')) score += 1;
    if (start && pub && pub >= start - 6 * HOUR && pub <= start + 7 * 24 * HOUR) score += 2;
    if (score > bestScore) { bestScore = score; best = it; }
  }
  if (best && bestScore >= 3) {
    return { videoId: best.videoId, url: `https://www.youtube.com/watch?v=${best.videoId}`, title: best.title };
  }
  return null;
}

// YouTube URL / kısa link / ham ID'den videoId çıkarır.
export function parseYouTubeId(input) {
  const s = (input || '').trim();
  if (!s) return null;
  if (/^[\w-]{11}$/.test(s)) return s; // ham ID
  const m = s.match(/(?:v=|\/shorts\/|youtu\.be\/|\/embed\/|\/live\/)([\w-]{11})/);
  if (m) return m[1];
  const last = s.split(/[/?&#]/).filter(Boolean).pop();
  return /^[\w-]{11}$/.test(last || '') ? last : null;
}

const inFlight = new Set();

// Bir maç için özet bulmayı dener. existingDoc: Firestore highlights/{no} (yoksa null).
// Döner: { action:'save', data } | { action:'tried', data } | { action:'error', detail } | { action:'skip' }
export async function attemptHighlight(m, existingDoc, { force = false, base = '' } = {}) {
  if (existingDoc?.videoId && !force) return { action: 'skip' };
  if (inFlight.has(m.no)) return { action: 'skip' };
  const now = Date.now();
  const tries = existingDoc?.tries || 0;

  if (!force) {
    if (tries >= MAX_TRIES) return { action: 'skip' };
    if (!existingDoc) {
      // İlk kez görüldü: ~1 saat bekle (TRT videoyu genelde maçtan 1+ saat sonra ekler).
      return { action: 'tried', data: { tries: 0, nextTry: now + HOUR } };
    }
    if (existingDoc.nextTry && now < existingDoc.nextTry) return { action: 'skip' };
  }

  inFlight.add(m.no);
  try {
    const q = buildQuery(m);
    const r = await fetch(`${base}/api/highlight?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
    const j = await r.json().catch(() => null);
    if (!r.ok) return { action: 'error', detail: j || { status: r.status } };
    const hit = pickHighlight(m, (j && j.items) || []);
    if (hit) return { action: 'save', data: hit };
    const nt = tries + 1;
    return { action: 'tried', data: { tries: nt, nextTry: now + nt * HOUR } };
  } catch (e) {
    return { action: 'skip' };
  } finally {
    inFlight.delete(m.no);
  }
}
