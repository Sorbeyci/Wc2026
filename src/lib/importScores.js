// Turns a list of finished fixtures (English team names + scores) into the
// app's actual-results shape, matched to our fixture list by team pair.
import { GROUP_MATCHES } from '../data/tournament.js';
import { resolveTeam } from '../data/teamAliases.js';

const pairKey = (a, b) => [a, b].sort().join(' :: ');

const PAIR_INDEX = (() => {
  const idx = {};
  for (const m of GROUP_MATCHES) idx[pairKey(m.home, m.away)] = m;
  return idx;
})();

// fixtures: [{ homeTeam, awayTeam, homeScore, awayScore, status? }]
// Returns { groupMatches: { [no]: { home, away } }, matched, unmatched: [...] }
export function mapFixturesToScores(fixtures = []) {
  const groupMatches = {};
  const unmatched = [];
  let matched = 0;
  for (const f of fixtures) {
    const hs = f.homeScore, as = f.awayScore;
    if (hs == null || as == null) continue; // not finished / no score
    const ht = resolveTeam(f.homeTeam);
    const at = resolveTeam(f.awayTeam);
    if (!ht || !at) { unmatched.push({ ...f, reason: 'isim eşleşmedi' }); continue; }
    const m = PAIR_INDEX[pairKey(ht, at)];
    if (!m) { unmatched.push({ ...f, reason: 'grup maçı bulunamadı' }); continue; }
    if (m.home === ht && m.away === at) groupMatches[m.no] = { home: String(hs), away: String(as) };
    else groupMatches[m.no] = { home: String(as), away: String(hs) };
    matched++;
  }
  return { groupMatches, matched, unmatched };
}

// Maps fixtures (with status) to live/finished scores per match no, keeping the
// status so the UI can flag in-play games. { [no]: { hs, as, status } }
export function mapLiveFixtures(fixtures = []) {
  const out = {};
  for (const f of fixtures) {
    const status = f.status || '';
    const hs = f.homeScore, as = f.awayScore;
    if (hs == null || as == null) continue;
    const ht = resolveTeam(f.homeTeam), at = resolveTeam(f.awayTeam);
    if (!ht || !at) continue;
    const m = PAIR_INDEX[pairKey(ht, at)];
    if (!m) continue;
    const oriented = (m.home === ht && m.away === at) ? { hs, as } : { hs: as, as: hs };
    out[m.no] = { hs: oriented.hs, as: oriented.as, status, minute: f.minute ?? null };
  }
  return out;
}

// Accepts either a pre-mapped payload ({ groupMatches, ko }) or raw fixtures.
export function normalizeScorePayload(data) {
  if (data && data.groupMatches && typeof data.groupMatches === 'object') {
    return { groupMatches: data.groupMatches, ko: data.ko || {}, matched: Object.keys(data.groupMatches).length, unmatched: [] };
  }
  const fixtures = Array.isArray(data) ? data : data?.fixtures || [];
  const res = mapFixturesToScores(fixtures);
  return { ...res, ko: {} };
}

// ---- Knockout import -------------------------------------------------------
// Matches finished knockout fixtures by team-pair against the *resolved* actual
// bracket (A = resolveBracket(actual, actual.ko)). Only KO slots whose pairing
// is already determined can match — so import R32 first, then R16, etc.
// Returns { ko: { [no]: { hs, as, winner? } }, matched, unmatched: [...] }
export function mapFixturesToKo(fixtures = [], A = { matches: {} }) {
  const idx = {};
  for (let no = 73; no <= 104; no++) {
    const m = A.matches?.[no];
    if (m?.home && m?.away) idx[pairKey(m.home, m.away)] = { no, home: m.home, away: m.away };
  }
  const ko = {};
  const unmatched = [];
  let matched = 0;
  for (const f of fixtures) {
    const hs = f.homeScore, as = f.awayScore;
    if (hs == null || as == null) continue;
    const ht = resolveTeam(f.homeTeam), at = resolveTeam(f.awayTeam);
    if (!ht || !at) { unmatched.push({ ...f, reason: 'isim eşleşmedi' }); continue; }
    const slot = idx[pairKey(ht, at)];
    if (!slot) { unmatched.push({ ...f, reason: 'eleme eşleşmesi henüz belli değil' }); continue; }
    const oriented = slot.home === ht ? { hs: String(hs), as: String(as) } : { hs: String(as), as: String(hs) };
    let winner = null;
    const w = String(f.winner || '').toUpperCase();
    if (w === 'HOME_TEAM') winner = ht;
    else if (w === 'AWAY_TEAM') winner = at;
    else if (Number(hs) > Number(as)) winner = ht;
    else if (Number(as) > Number(hs)) winner = at;
    ko[slot.no] = { ...oriented, ...(winner ? { winner } : {}) };
    matched++;
  }
  return { ko, matched, unmatched };
}

// Combined: group matches first, then knockout for the leftovers, against the
// resolved actual bracket A. Returns { groupMatches, ko, matched, unmatched }.
export function mapFixturesAll(fixtures = [], A = { matches: {} }) {
  const gm = mapFixturesToScores(fixtures);
  const leftovers = gm.unmatched.filter((u) => u.reason === 'grup maçı bulunamadı');
  const kk = mapFixturesToKo(leftovers, A);
  const nameMismatch = gm.unmatched.filter((u) => u.reason !== 'grup maçı bulunamadı');
  return {
    groupMatches: gm.groupMatches,
    ko: kk.ko,
    matched: gm.matched + kk.matched,
    koMatched: kk.matched,
    unmatched: [...nameMismatch, ...kk.unmatched],
  };
}
