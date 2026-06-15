// ---------------------------------------------------------------------------
// Scoring engine. All point values live in SCORING so they're easy to tweak.
// Group standings are computed from match scores; the knockout bracket is built
// automatically from those standings (see ../data/bracket.js) and the user just
// picks who advances, which propagates round by round to the final.
// ---------------------------------------------------------------------------
import { GROUP_MATCHES, GROUPS, KO_ROUNDS } from '../data/tournament.js';
import { resolveBracket, bestThirds } from '../data/bracket.js';

export const DEFAULT_SCORING = {
  match: { exact: 5, result: 3 },
  groupTable: { qualified: 10, position: 5 },
  thirdPlace: { advance: 10 },           // per correct best-third team (8 advance)
  knockout: {
    match: { exact: 5, result: 3 },      // predicted knockout scorelines
    advance: { R32: 20, R16: 20, QF: 40, SF: 60 }, // per correct winner
    matchup: 10,                          // per correct round matchup (both teams), all rounds
  },
  finals: { champion: 80, runnerUp: 50, third: 30, fourth: 20, inThirdPlaceMatch: 20, topScorer: 50 },
};

export const SCORING = structuredClone(DEFAULT_SCORING);

function applyScoring(target, defaults, partial) {
  for (const k of Object.keys(defaults)) {
    if (defaults[k] && typeof defaults[k] === 'object') {
      target[k] = target[k] || {};
      applyScoring(target[k], defaults[k], partial?.[k]);
    } else {
      const v = partial?.[k];
      target[k] = (v === '' || v == null || isNaN(v)) ? defaults[k] : Number(v);
    }
  }
}
// Overlay admin-configured point values on top of the defaults (mutates SCORING).
export function setScoring(partial) {
  applyScoring(SCORING, DEFAULT_SCORING, partial || {});
}

const num = (v) => (v === '' || v == null || isNaN(v) ? null : Number(v));

function outcome(hs, as) {
  hs = num(hs); as = num(as);
  if (hs == null || as == null) return null;
  if (hs > as) return 'H';
  if (hs < as) return 'A';
  return 'D';
}

export function scoreMatch(pred, act) {
  if (!pred || !act) return 0;
  const phs = num(pred.hs), pas = num(pred.as);
  const ahs = num(act.hs), aas = num(act.as);
  if (phs == null || pas == null || ahs == null || aas == null) return 0;
  if (phs === ahs && pas === aas) return SCORING.match.exact;
  if (outcome(phs, pas) === outcome(ahs, aas)) return SCORING.match.result;
  return 0;
}

// ---- Standings (league table) computed from match scores ------------------
export function computeStandings(group, scores) {
  const teams = GROUPS[group] || [];
  const row = {};
  for (const t of teams) row[t] = { team: t, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0 };
  for (const m of GROUP_MATCHES) {
    if (m.group !== group) continue;
    const s = scores?.[m.no];
    const hg = num(s?.home), ag = num(s?.away);
    if (hg == null || ag == null) continue;
    const H = row[m.home], A = row[m.away];
    if (!H || !A) continue;
    H.P++; A.P++; H.GF += hg; H.GA += ag; A.GF += ag; A.GA += hg;
    if (hg > ag) { H.W++; A.L++; H.Pts += 3; }
    else if (hg < ag) { A.W++; H.L++; A.Pts += 3; }
    else { H.D++; A.D++; H.Pts++; A.Pts++; }
  }
  const table = teams.map((t) => { const r = row[t]; r.GD = r.GF - r.GA; return r; });
  table.sort((x, y) => y.Pts - x.Pts || y.GD - x.GD || y.GF - x.GF || x.team.localeCompare(y.team, 'tr'));
  return table;
}

export function standingsAll(scores) {
  const out = {};
  for (const g of Object.keys(GROUPS)) out[g] = computeStandings(g, scores);
  return out;
}

// A team's group-stage form (oldest→newest) from the team's perspective: G/B/M.
export function teamForm(team, scores) {
  const out = [];
  for (const m of GROUP_MATCHES) {
    if (m.home !== team && m.away !== team) continue;
    const s = scores?.[m.no];
    const hs = num(s?.home), as = num(s?.away);
    if (hs == null || as == null) continue;
    const gf = m.home === team ? hs : as;
    const ga = m.home === team ? as : hs;
    out.push(gf > ga ? 'G' : gf < ga ? 'M' : 'B');
  }
  return out;
}

export function groupOrder(source, g) {
  const explicit = source?.groupTables?.[g];
  if (explicit && explicit.length === 4 && explicit.every(Boolean)) return explicit;
  return computeStandings(g, source?.groupMatches).map((r) => r.team);
}

export function groupComplete(source, g) {
  return GROUP_MATCHES.filter((m) => m.group === g).every((m) => {
    const s = source?.groupMatches?.[m.no];
    return num(s?.home) != null && num(s?.away) != null;
  });
}

export function allGroupsComplete(source) {
  return Object.keys(GROUPS).every((g) => groupComplete(source, g));
}

export function hasOrder(source, g) {
  const ex = source?.groupTables?.[g];
  if (ex && ex.length === 4 && ex.every(Boolean)) return true;
  return groupComplete(source, g);
}

export function thirdPlacedTeams(source) {
  return Object.keys(GROUPS).map((g) => ({ group: g, team: groupOrder(source, g)[2] }));
}

// ---- Group match predictions ---------------------------------------------
export function scoreGroupMatches(pred, actual) {
  let pts = 0;
  for (const m of GROUP_MATCHES) {
    const p = pred?.groupMatches?.[m.no];
    const a = actual.groupMatches?.[m.no];
    pts += scoreMatch(p ? { hs: p.home, as: p.away } : null, a ? { hs: a.home, as: a.away } : null);
  }
  return { pts };
}

// ---- Group table (qualified + exact position) ----------------------------
export function scoreGroupTables(pred, actual) {
  let pts = 0;
  for (const g of Object.keys(GROUPS)) {
    if (!hasOrder(actual, g) || !hasOrder(pred, g)) continue;
    const predicted = groupOrder(pred, g);
    const real = groupOrder(actual, g);
    const realTop2 = real.slice(0, 2);
    predicted.forEach((team, idx) => {
      if (!team) return;
      if (idx < 2 && realTop2.includes(team)) pts += SCORING.groupTable.qualified;
      if (real[idx] === team) pts += SCORING.groupTable.position;
    });
  }
  return { pts };
}

export const scoreMatchPair = scoreMatch;

// ---- Best third-placed teams (auto from standings) ------------------------
// 8 of the 12 third-placed teams advance. Both sides are derived from scores;
// only counts once the actual group stage is complete.
export function scoreThirds(predSource, actualSource) {
  if (!allGroupsComplete(actualSource) || !allGroupsComplete(predSource)) return { pts: 0, correct: 0 };
  const a = new Set(bestThirds(actualSource).teams.filter(Boolean));
  const p = bestThirds(predSource).teams.filter(Boolean);
  let correct = 0;
  for (const t of p) if (a.has(t)) correct++;
  return { pts: correct * SCORING.thirdPlace.advance, correct };
}

// ---- Knockout (bracket winners + predicted scorelines) -------------------
const KO_GROUPS = [['R32', 73, 88], ['R16', 89, 96], ['QF', 97, 100], ['SF', 101, 102]];
const KO_ALL = [[73, 88], [89, 96], [97, 100], [101, 102], [103, 103], [104, 104]];

function scoreKoPair(p, a) {
  // p/a = { hs, as }
  const phs = num(p?.hs), pas = num(p?.as), ahs = num(a?.hs), aas = num(a?.as);
  if (phs == null || pas == null || ahs == null || aas == null) return 0;
  if (phs === ahs && pas === aas) return SCORING.knockout.match.exact;
  if (outcome(phs, pas) === outcome(ahs, aas)) return SCORING.knockout.match.result;
  return 0;
}

export function scoreBracketKnockout(P, A, predKo = {}, actualKo = {}, opts = {}) {
  const r32Final = opts.r32Final !== false; // R32 pairings only settle once the group stage is done
  let advancePts = 0, scorePts = 0, matchupPts = 0, matchupHits = 0;
  const counts = { R32: 0, R16: 0, QF: 0, SF: 0 };
  let scored = 0, exact = 0, result = 0;

  // correct-winner (advance) points: R32 → SF
  for (const [id, from, to] of KO_GROUPS) {
    for (let no = from; no <= to; no++) {
      const aw = A.matches[no]?.winner;
      if (aw && P.matches[no]?.winner === aw) { advancePts += SCORING.knockout.advance[id]; counts[id]++; }
    }
  }
  // correct-matchup points: the two teams of a pairing are right — regardless of
  // home/away order AND regardless of which slot they land in within that round.
  const canon = (x, y) => [x, y].sort().join('|');
  for (const [from, to] of KO_ALL) {
    if (from === 73 && !r32Final) continue; // Son 32 eşleşmeleri grup aşaması bitene kadar puanlanmaz
    const actualPairs = new Set();
    for (let no = from; no <= to; no++) {
      const a = A.matches[no];
      if (a?.home && a?.away) actualPairs.add(canon(a.home, a.away));
    }
    const seen = new Set();
    for (let no = from; no <= to; no++) {
      const p = P.matches[no];
      if (!p?.home || !p?.away || p.home === p.away) continue;
      const key = canon(p.home, p.away);
      if (actualPairs.has(key) && !seen.has(key)) { seen.add(key); matchupPts += SCORING.knockout.matchup; matchupHits++; }
    }
  }
  // scoreline points: every knockout match (73–104)
  for (const [from, to] of KO_ALL) {
    for (let no = from; no <= to; no++) {
      const a = actualKo[no];
      if (num(a?.hs) == null || num(a?.as) == null) continue;
      scored++;
      const got = scoreKoPair(predKo[no], a);
      if (got === SCORING.knockout.match.exact) exact++;
      else if (got === SCORING.knockout.match.result) result++;
      scorePts += got;
    }
  }
  return { pts: advancePts + scorePts + matchupPts, advancePts, scorePts, matchupPts, matchupHits, counts, scored, exact, result };
}

// ---- Finals (champion / podium / top scorer), derived from the bracket ----
export function scoreBracketFinals(P, A, predTop, actualTop) {
  let pts = 0;
  const hit = { champion: false, runnerUp: false, third: false, fourth: false, topScorer: false };
  if (P.champion && P.champion === A.champion) { pts += SCORING.finals.champion; hit.champion = true; }
  if (P.runnerUp && P.runnerUp === A.runnerUp) { pts += SCORING.finals.runnerUp; hit.runnerUp = true; }
  if (P.third && P.third === A.third) { pts += SCORING.finals.third; hit.third = true; }
  if (P.fourth && P.fourth === A.fourth) { pts += SCORING.finals.fourth; hit.fourth = true; }
  const inMatch = [A.third, A.fourth].filter(Boolean);
  [P.third, P.fourth].filter(Boolean).forEach((t) => { if (inMatch.includes(t)) pts += SCORING.finals.inThirdPlaceMatch; });
  if (predTop && actualTop && predTop.trim() && predTop.trim().toLowerCase() === actualTop.trim().toLowerCase()) {
    pts += SCORING.finals.topScorer; hit.topScorer = true;
  }
  return { pts, hit };
}

// ---- Aggregate ------------------------------------------------------------
export function scoreUser(prediction, actual) {
  const gm = scoreGroupMatches(prediction, actual);
  const gt = scoreGroupTables(prediction, actual);
  const th = scoreThirds(prediction, actual);
  const P = resolveBracket(prediction, prediction?.ko || {});
  const A = resolveBracket(actual, actual?.ko || {});
  const ko = scoreBracketKnockout(P, A, prediction?.ko || {}, actual?.ko || {}, { r32Final: allGroupsComplete(actual) });
  const fn = scoreBracketFinals(P, A, prediction?.topScorer, actual?.topScorer);
  const total = gm.pts + gt.pts + th.pts + ko.pts + fn.pts;

  // group match stats
  let exact = 0, correctResult = 0, playedScored = 0;
  for (const m of GROUP_MATCHES) {
    const a = actual.groupMatches?.[m.no];
    if (!a || num(a.home) == null || num(a.away) == null) continue;
    playedScored++;
    const p = prediction?.groupMatches?.[m.no];
    const got = scoreMatch(p ? { hs: p.home, as: p.away } : null, { hs: a.home, as: a.away });
    if (got === SCORING.match.exact) exact++;
    else if (got === SCORING.match.result) correctResult++;
  }
  // group table stats
  let correctQualified = 0, correctPositions = 0, groupsFinal = 0;
  for (const g of Object.keys(GROUPS)) {
    if (!hasOrder(actual, g) || !hasOrder(prediction, g)) continue;
    groupsFinal++;
    const predicted = groupOrder(prediction, g);
    const real = groupOrder(actual, g);
    const realTop2 = real.slice(0, 2);
    predicted.slice(0, 2).forEach((t) => { if (t && realTop2.includes(t)) correctQualified++; });
    predicted.forEach((t, idx) => { if (t && real[idx] === t) correctPositions++; });
  }
  const finalsHits = Object.values(fn.hit).filter(Boolean).length;

  return {
    total,
    breakdown: { groupMatches: gm.pts, groupTables: gt.pts, thirds: th.pts, knockout: ko.pts, finals: fn.pts },
    bracket: { pred: P, actual: A },
    stats: {
      exact, correctResult, playedScored,
      groupMatchPoints: gm.pts,
      avgPerMatch: playedScored ? +((gm.pts) / playedScored).toFixed(2) : 0,
      correctQualified, correctPositions, groupsFinal, groupTablePoints: gt.pts,
      thirdsCorrect: th.correct, thirdsPoints: th.pts,
      koR32: ko.counts.R32, koR16: ko.counts.R16, koQF: ko.counts.QF, koSF: ko.counts.SF,
      koScored: ko.scored, koExact: ko.exact, koResult: ko.result,
      koAdvancePoints: ko.advancePts, koScorePoints: ko.scorePts, knockoutPoints: ko.pts,
      koMatchupHits: ko.matchupHits, koMatchupPoints: ko.matchupPts,
      finalsHits, finalsPoints: fn.pts, finalsHit: fn.hit,
    },
  };
}

export function leaderboard(lists, actual, getPrediction) {
  return lists
    .map((l) => ({ list: l, ...scoreUser(getPrediction(l.id), actual) }))
    .sort((a, b) => b.total - a.total);
}
