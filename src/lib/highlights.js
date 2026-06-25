// Maç özeti (TRT Spor) bulma & eşleştirme yardımcıları.
// Kota koruması: /api/highlight kenar-cache'li; ayrıca bulunan video Firestore'da
// önbelleğe yazılır (maç başına en fazla birkaç arama, 1s/+1s artan tekrar).
import { shortName } from '../data/flags.js';

const HOUR = 3600 * 1000;
const MAX_TRIES = 8;

const norm = (s) => (s || '').toLocaleLowerCase('tr').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

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

const trtName = (team) => TRT_NAME[team] || team;

function candidates(team) {
  const list = [team, shortName(team), trtName(team), ...(ALIASES[team] || [])];
  const set = new Set(list.map(norm).filter((x) => x && x.length >= 3));
  return [...set];
}

export function buildQuery(m) {
  return `${trtName(m.home)} ${trtName(m.away)} Dünya Kupası`;
}

export function pickHighlight(m, items) {
  const hc = candidates(m.home), ac = candidates(m.away);
  for (const it of items || []) {
    const t = norm(it.title);
    const homeHit = hc.some((c) => t.includes(c));
    const awayHit = ac.some((c) => t.includes(c));
    if (homeHit && awayHit) {
      return { videoId: it.videoId, url: `https://www.youtube.com/watch?v=${it.videoId}`, title: it.title };
    }
  }
  return null;
}

const inFlight = new Set();

// Bir maç için özet bulmayı dener. existingDoc: Firestore highlights/{no} (yoksa null).
// Döner: { action:'save', data } | { action:'tried', data } | { action:'skip' }
export async function attemptHighlight(m, existingDoc, { force = false, base = '' } = {}) {
  if (existingDoc?.videoId) return { action: 'skip' };
  if (inFlight.has(m.no)) return { action: 'skip' };
  const now = Date.now();
  const tries = existingDoc?.tries || 0;

  if (!force) {
    if (tries >= MAX_TRIES) return { action: 'skip' };
    if (!existingDoc) {
      // İlk kez görüldü: ~1 saat bekle (TRT videoyu genelde maçtan 1 saat sonra ekler).
      return { action: 'tried', data: { tries: 0, nextTry: now + HOUR } };
    }
    if (existingDoc.nextTry && now < existingDoc.nextTry) return { action: 'skip' };
  }

  inFlight.add(m.no);
  try {
    const q = buildQuery(m);
    const r = await fetch(`${base}/api/highlight?q=${encodeURIComponent(q)}`);
    if (!r.ok) return { action: 'skip' };
    const j = await r.json();
    const hit = pickHighlight(m, j.items || []);
    if (hit) return { action: 'save', data: hit };
    const nt = tries + 1;
    return { action: 'tried', data: { tries: nt, nextTry: now + nt * HOUR } };
  } catch (e) {
    return { action: 'skip' };
  } finally {
    inFlight.delete(m.no);
  }
}
