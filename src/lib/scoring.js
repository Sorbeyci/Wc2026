// ---------------------------------------------------------------------------
// Scoring engine — all point values live in SCORING so they're easy to tweak.
// ---------------------------------------------------------------------------
import { GROUP_MATCHES, GROUPS, KO_ROUNDS } from '../data/tournament.js';

export const SCORING = {
  match: { exact: 5, result: 3 },        // group + knockout match score
  groupTable: { qualified: 10, position: 5 },
  knockout: {
    matchup: 10,
    // points for correctly predicting which team advances out of a tie
    advance: { R32: 20, R16: 20, QF: 40, SF: 60, F: 0, TP: 0 },
  },
  finals: {
    champion: 80,
    runnerUp: 50,
    third: 30,
    fourth: 20,
    inThirdPlaceMatch: 20, // per correct team that appears in the 3rd-place match
    topScorer: 50,
  },
  // 8 of the 12 third-placed teams advance to the Round of 32
  thirdPlace: { advance: 10 }, // per correctly predicted advancing 3rd-placed team
};

const num = (v) => (v === '' || v == null || isNaN(v) ? null : Number(v));

// result of a score: 'H' home win, 'A' away win, 'D' draw, or null if incomplete
function outcome(hs, as) {
  hs = num(hs); as = num(as);
  if (hs == null || as == null) return null;
  if (hs > as) return 'H';
  if (hs < as) return 'A';
  return 'D';
}

// Score one predicted result vs the actual result (used for all matches).
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
// scores: { [matchNo]: { home, away } }. Returns a sorted table for one group:
// [{ team, P, W, D, L, GF, GA, GD, Pts }] using 3/1/0 and GD then GF tiebreaks.
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

// A group's finishing order: an explicit manual ranking if set, otherwise the
// order implied by the entered match scores. This makes "group ranking = the
// standings from the match scores" by default, while still allowing overrides.
export function groupOrder(source, g) {
  const explicit = source?.groupTables?.[g];
  if (explicit && explicit.length === 4 && explicit.every(Boolean)) return explicit;
  return computeStandings(g, source?.groupMatches).map((r) => r.team);
}

// True once every match in the group has a valid score (table is final).
export function groupComplete(source, g) {
  return GROUP_MATCHES.filter((m) => m.group === g).every((m) => {
    const s = source?.groupMatches?.[m.no];
    return num(s?.home) != null && num(s?.away) != null;
  });
}

// A group order is "ready" if there's an explicit manual table, or all of the
// group's matches have scores (so the standings are determined).
export function hasOrder(source, g) {
  const ex = source?.groupTables?.[g];
  if (ex && ex.length === 4 && ex.every(Boolean)) return true;
  return groupComplete(source, g);
}

// The team finishing 3rd in each group (per the entered scores / manual table).
export function thirdPlacedTeams(source) {
  return Object.keys(GROUPS).map((g) => ({ group: g, team: groupOrder(source, g)[2] }));
}

// Best-third-placed predictions: which of the 12 third-placed teams advance.
// pred.thirds / actual.thirds are arrays of team names (up to 8).
export function scoreThirds(pred, actual) {
  const a = actual?.thirds || [];
  const p = pred?.thirds || [];
  if (!a.length) return { pts: 0, correct: 0 };
  const aset = new Set(a);
  let correct = 0;
  for (const t of p) if (aset.has(t)) correct++;
  return { pts: correct * SCORING.thirdPlace.advance, correct };
}

// ---- Group match predictions ---------------------------------------------
export function scoreGroupMatches(pred, actual) {
  let pts = 0;
  const detail = [];
  for (const m of GROUP_MATCHES) {
    const p = pred?.groupMatches?.[m.no];
    const a = actual.groupMatches?.[m.no];
    // predictions store { home, away }; map to the generic { hs, as } the scorer expects
    const got = scoreMatch(p ? { hs: p.home, as: p.away } : null, a ? { hs: a.home, as: a.away } : null);
    if (a) detail.push({ no: m.no, home: m.home, away: m.away, got });
    pts += got;
  }
  return { pts, detail };
}

// ---- Group table predictions ---------------------------------------------
// predicted ranking: array of 4 teams in order [1st,2nd,3rd,4th].
// 10 pts per team correctly placed in the top-2 (qualified), 5 pts per exact position.
export function scoreGroupTables(pred, actual) {
  let pts = 0;
  const detail = [];
  for (const g of Object.keys(GROUPS)) {
    // score a group only when both sides have a determined order
    if (!hasOrder(actual, g) || !hasOrder(pred, g)) continue;
    const predicted = groupOrder(pred, g);
    const real = groupOrder(actual, g);
    if (!predicted || !real) continue;
    const realTop2 = real.slice(0, 2);
    let gPts = 0;
    predicted.forEach((team, idx) => {
      if (!team) return;
      if (idx < 2 && realTop2.includes(team)) gPts += SCORING.groupTable.qualified;
      if (real[idx] === team) gPts += SCORING.groupTable.position;
    });
    pts += gPts;
    detail.push({ group: g, got: gPts });
  }
  return { pts, detail };
}

// ---- Knockout predictions -------------------------------------------------
// For each round, predictions/actual are arrays of { home, away, hs, as, advancer }.
// - matchup: both predicted teams equal both actual teams (order independent)
// - score:   standard match score rule (only credited if matchup is right)
// - advance: predicted advancer equals actual advancer
function teamsMatch(p, a) {
  if (!p || !a) return false;
  const ps = [p.home, p.away].filter(Boolean).sort();
  const as = [a.home, a.away].filter(Boolean).sort();
  return ps.length === 2 && as.length === 2 && ps[0] === as[0] && ps[1] === as[1];
}

export function scoreKnockout(pred, actual) {
  let pts = 0;
  const detail = [];
  for (const round of KO_ROUNDS) {
    const pRound = pred?.knockout?.[round.id] || [];
    const aRound = actual.knockout?.[round.id] || [];
    let rPts = 0;
    aRound.forEach((a, i) => {
      const p = pRound[i];
      if (!p) return;
      const matched = teamsMatch(p, a);
      if (matched) {
        rPts += SCORING.knockout.matchup;
        rPts += scoreMatch({ hs: p.hs, as: p.as }, { hs: a.hs, as: a.as });
      }
      const advPts = SCORING.knockout.advance[round.id] || 0;
      if (advPts && p.advancer && a.advancer && p.advancer === a.advancer) {
        rPts += advPts;
      }
    });
    if (aRound.length) detail.push({ round: round.label, got: rPts });
    pts += rPts;
  }
  return { pts, detail };
}

// ---- Finals (champion / podium / top scorer) ------------------------------
export function scoreFinals(pred, actual) {
  const p = pred?.finals || {};
  const a = actual.finals || {};
  let pts = 0;
  const detail = [];
  const add = (label, ok, value) => { if (ok) { pts += value; detail.push({ label, got: value }); } };

  add('Champion', p.champion && p.champion === a.champion, SCORING.finals.champion);
  add('Runner-up', p.runnerUp && p.runnerUp === a.runnerUp, SCORING.finals.runnerUp);
  add('Third place', p.third && p.third === a.third, SCORING.finals.third);
  add('Fourth place', p.fourth && p.fourth === a.fourth, SCORING.finals.fourth);

  // teams that appear in the actual 3rd-place match (third + fourth)
  const inMatch = [a.third, a.fourth].filter(Boolean);
  [p.third, p.fourth].filter(Boolean).forEach((t) => {
    if (inMatch.includes(t)) { pts += SCORING.finals.inThirdPlaceMatch; }
  });
  add('Top scorer', p.topScorer && p.topScorer === a.topScorer, SCORING.finals.topScorer);

  return { pts, detail };
}

// ---- Aggregate ------------------------------------------------------------
export function scoreUser(prediction, actual) {
  const gm = scoreGroupMatches(prediction, actual);
  const gt = scoreGroupTables(prediction, actual);
  const th = scoreThirds(prediction, actual);
  const ko = scoreKnockout(prediction, actual);
  const fn = scoreFinals(prediction, actual);
  const total = gm.pts + gt.pts + th.pts + ko.pts + fn.pts;

  // ---- stats: group matches ----
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

  // ---- stats: group tables (qualified + exact positions) ----
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

  // ---- stats: knockout (matchups, advancers, score hits) ----
  let koMatchups = 0, koAdvancers = 0, koExact = 0, koResult = 0, koScored = 0;
  for (const round of KO_ROUNDS) {
    const pRound = prediction?.knockout?.[round.id] || [];
    const aRound = actual.knockout?.[round.id] || [];
    aRound.forEach((a, i) => {
      if (!a || (!a.home && !a.away)) return;
      koScored++;
      const p = pRound[i];
      if (!p) return;
      if (teamsMatch(p, a)) {
        koMatchups++;
        const s = scoreMatch({ hs: p.hs, as: p.as }, { hs: a.hs, as: a.as });
        if (s === SCORING.match.exact) koExact++;
        else if (s === SCORING.match.result) koResult++;
      }
      if (p.advancer && a.advancer && p.advancer === a.advancer) koAdvancers++;
    });
  }

  // ---- stats: finals ----
  const pf = prediction?.finals || {}, af = actual.finals || {};
  const finalsHits = ['champion', 'runnerUp', 'third', 'fourth', 'topScorer']
    .filter((k) => pf[k] && pf[k] === af[k]).length;

  return {
    total,
    breakdown: { groupMatches: gm.pts, groupTables: gt.pts, thirds: th.pts, knockout: ko.pts, finals: fn.pts },
    detail: { gm, gt, th, ko, fn },
    stats: {
      exact,
      correctResult,
      playedScored,
      groupMatchPoints: gm.pts,
      avgPerMatch: playedScored ? +((gm.pts) / playedScored).toFixed(2) : 0,
      correctQualified,
      correctPositions,
      groupsFinal,
      groupTablePoints: gt.pts,
      thirdsCorrect: th.correct,
      thirdsPoints: th.pts,
      koMatchups,
      koAdvancers,
      koExact,
      koResult,
      koScored,
      knockoutPoints: ko.pts,
      finalsHits,
      finalsPoints: fn.pts,
    },
  };
}

export function leaderboard(users, predictions, actual) {
  return users
    .map((u) => ({ user: u, ...scoreUser(predictions[u.id], actual) }))
    .sort((a, b) => b.total - a.total);
}
