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

// Accepts either a pre-mapped payload ({ groupMatches, ko }) or raw fixtures.
export function normalizeScorePayload(data) {
  if (data && data.groupMatches && typeof data.groupMatches === 'object') {
    return { groupMatches: data.groupMatches, ko: data.ko || {}, matched: Object.keys(data.groupMatches).length, unmatched: [] };
  }
  const fixtures = Array.isArray(data) ? data : data?.fixtures || [];
  const res = mapFixturesToScores(fixtures);
  return { ...res, ko: {} };
}
