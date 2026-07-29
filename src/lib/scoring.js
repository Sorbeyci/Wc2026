// ---------------------------------------------------------------------------
// Scoring engine. All point values live in SCORING so they're easy to tweak.
// Group standings are computed from match scores; the knockout bracket is built
// automatically from those standings (see ../data/bracket.js) and the user just
// picks who advances, which propagates round by round to the final.
// ---------------------------------------------------------------------------
import { GROUP_MATCHES, GROUPS, KO_ROUNDS } from '../data/tournament.js';
import { resolveBracket, bestThirds, KO_DATES, MATCH_BY_NO } from '../data/bracket.js';

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

// Üst tura çıkan takımlar: her grubun ilk 2'si + en iyi 8 üçüncü.
// Bir takım hangi yolla çıkarsa çıksın (1./2./3.) "üst tura çıkan" sayılır.
export function advancingTeams(source, projection = false) {
  const set = new Set();
  for (const g of Object.keys(GROUPS)) {
    const ex = source?.groupTables?.[g];
    const explicit = Array.isArray(ex) && ex.length === 4 && ex.every(Boolean);
    const started = GROUP_MATCHES.some((m) => m.group === g && num(source?.groupMatches?.[m.no]?.home) != null);
    const include = projection ? (started || explicit) : hasOrder(source, g);
    if (!include) continue;
    const o = groupOrder(source, g);
    if (o[0]) set.add(o[0]);
    if (o[1]) set.add(o[1]);
  }
  if (projection || allGroupsComplete(source)) {
    for (const t of bestThirds(source).teams) if (t) set.add(t);
  }
  return set;
}

// ---- Group table (qualified + exact position) ----------------------------
export function scoreGroupTables(pred, actual, projection = false) {
  let pts = 0;
  const adv = advancingTeams(actual, projection); // gerçekte üst tura çıkanlar
  for (const g of Object.keys(GROUPS)) {
    if (projection) {
      const started = GROUP_MATCHES.some((m) => m.group === g && num(actual?.groupMatches?.[m.no]?.home) != null);
      if (!started) continue;
    } else if (!hasOrder(actual, g) || !hasOrder(pred, g)) {
      continue;
    }
    const predicted = groupOrder(pred, g);
    const real = groupOrder(actual, g);
    predicted.forEach((team, idx) => {
      if (!team) return;
      // İlk 2'ye yazdığın takım gerçekte üst tura çıktıysa (1./2./3. fark etmez) +10.
      if (idx < 2 && adv.has(team)) pts += SCORING.groupTable.qualified;
      // Tam sıra bonusu (değişmedi).
      if (real[idx] === team) pts += SCORING.groupTable.position;
    });
  }
  return { pts };
}

export const scoreMatchPair = scoreMatch;

// ---- Best third-placed teams (auto from standings) ------------------------
// 8 of the 12 third-placed teams advance. Both sides are derived from scores;
// only counts once the actual group stage is complete.
export function scoreThirds(predSource, actualSource, projection = false) {
  if (!projection && (!allGroupsComplete(actualSource) || !allGroupsComplete(predSource))) return { pts: 0, correct: 0 };
  // En iyi-3. olarak tahmin ettiğin takım gerçekte üst tura çıktıysa (ister 1./2. ister 3.) +10.
  const adv = advancingTeams(actualSource, projection);
  const p = bestThirds(predSource).teams.filter(Boolean);
  let correct = 0;
  for (const t of p) if (adv.has(t)) correct++;
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
  const canon = (x, y) => [x, y].sort().join('|');

  // Tur atlatma (advance) puanları: R32 → SF. EŞLEŞMEDEN BAĞIMSIZ, takım bazlı —
  // bir turda kullanıcının tur atlatan seçtiği takım gerçekten tur atladıysa +puan
  // (hangi slotta/eşleşmede olduğuna bakılmaz).
  for (const [id, from, to] of KO_GROUPS) {
    const actualWinners = new Set();
    for (let no = from; no <= to; no++) { const w = A.matches[no]?.winner; if (w) actualWinners.add(w); }
    const predWinners = new Set();
    for (let no = from; no <= to; no++) { const w = P.matches[no]?.winner; if (w) predWinners.add(w); }
    for (const t of predWinners) {
      if (actualWinners.has(t)) { advancePts += SCORING.knockout.advance[id]; counts[id]++; }
    }
  }
  // correct-matchup points: the two teams of a pairing are right — regardless of
  // home/away order AND regardless of which slot they land in within that round.
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
  // scoreline points: EŞLEŞME bazlı (slottan bağımsız). Kullanıcı bir turda o iki
  // takımın eşleşmesini (farklı slotta olsa da) tahmin ettiyse, kendi skor tahmini
  // gerçek maça göre yönlendirilip puanlanır. 5 = tam skor, 3 = doğru sonuç (galip).
  for (const [from, to] of KO_ALL) {
    const predByPair = new Map();
    for (let no = from; no <= to; no++) {
      const pm = P.matches[no];
      const pk = predKo[no];
      if (pm?.home && pm?.away && num(pk?.hs) != null && num(pk?.as) != null) {
        const key = canon(pm.home, pm.away);
        if (!predByPair.has(key)) predByPair.set(key, { pm, pk });
      }
    }
    for (let no = from; no <= to; no++) {
      const a = actualKo[no];
      if (num(a?.hs) == null || num(a?.as) == null) continue;
      const am = A.matches[no];
      if (!am?.home || !am?.away) continue;
      scored++;
      const hit = predByPair.get(canon(am.home, am.away));
      if (!hit) continue; // bu eşleşmeyi (skorlu) tahmin etmemiş → puan yok
      const oriented = hit.pm.home === am.home ? { hs: hit.pk.hs, as: hit.pk.as } : { hs: hit.pk.as, as: hit.pk.hs };
      const got = scoreKoPair(oriented, a, hit.pm.winner, am.winner);
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
export function scoreUser(prediction, actual, opts = {}) {
  const proj = !!opts.projection;
  const gm = scoreGroupMatches(prediction, actual);
  const gt = scoreGroupTables(prediction, actual, proj);
  const th = scoreThirds(prediction, actual, proj);
  const P = resolveBracket(prediction, prediction?.ko || {});
  const A = resolveBracket(actual, actual?.ko || {});
  const ko = scoreBracketKnockout(P, A, prediction?.ko || {}, actual?.ko || {}, { r32Final: proj || allGroupsComplete(actual) });
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
  const advForStats = advancingTeams(actual, proj);
  for (const g of Object.keys(GROUPS)) {
    if (!hasOrder(actual, g) || !hasOrder(prediction, g)) continue;
    groupsFinal++;
    const predicted = groupOrder(prediction, g);
    const real = groupOrder(actual, g);
    predicted.slice(0, 2).forEach((t) => { if (t && advForStats.has(t)) correctQualified++; });
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

// ---------------------------------------------------------------------------
// Puan Detayı motoru: bir kullanıcının HER puanını madde madde döndürür.
// scoreUser ile birebir aynı mantık (slot-bağımsız KO dahil); toplamları eşittir.
// entry: { phase:'group'|'ko'|'final', kind, no?, date, label, detail?, tag?,
//          team?, teams?, pts }
// ---------------------------------------------------------------------------
const _TR_MON_IDX = { Oca: 0, 'Şub': 1, Mar: 2, Nis: 3, May: 4, Haz: 5, Tem: 6, 'Ağu': 7, Eyl: 8, Eki: 9, Kas: 10, Ara: 11 };
export function logDateKey(d) {
  const m = String(d || '').match(/(\S+)\s+(\d+),\s*(\d+)/);
  if (!m) return 0;
  return new Date(+m[3], _TR_MON_IDX[m[1]] ?? 0, +m[2]).getTime();
}
export const KO_ROUND_TR_MAP = { R32: 'Son 32', R16: 'Son 16', QF: 'Çeyrek Final', SF: 'Yarı Final', TP: 'Üçüncülük', F: 'Final' };

export function scoreLog(prediction, actual) {
  const entries = [];
  const canon = (x, y) => [x, y].sort().join('|');
  const P = resolveBracket(prediction, prediction?.ko || {});
  const A = resolveBracket(actual, actual?.ko || {});
  const r32Final = allGroupsComplete(actual);
  const KO_GROUPS_L = [['R32', 73, 88], ['R16', 89, 96], ['QF', 97, 100], ['SF', 101, 102]];
  const KO_ALL_L = [[73, 88], [89, 96], [97, 100], [101, 102], [103, 103], [104, 104]];
  const roundOf = (no) => MATCH_BY_NO[no]?.round;

  // 1) Grup maçları (+5 tam skor / +3 doğru sonuç)
  for (const m of GROUP_MATCHES) {
    const a = actual.groupMatches?.[m.no];
    if (!a || num(a.home) == null || num(a.away) == null) continue;
    const p = prediction?.groupMatches?.[m.no];
    const got = scoreMatch(p ? { hs: p.home, as: p.away } : null, { hs: a.home, as: a.away });
    if (got <= 0) continue;
    entries.push({
      phase: 'group', kind: 'match', no: m.no, date: m.date,
      label: `${m.home} - ${m.away}`,
      detail: `sen ${p.home}-${p.away} · sonuç ${a.home}-${a.away}`,
      tag: got === SCORING.match.exact ? 'Tam skor' : 'Doğru sonuç', pts: got,
    });
  }

  // 2) Grup sıralaması (takım başına +10 üst tura çıkan, +5 doğru sıra)
  const adv = advancingTeams(actual, false);
  const lastDateByGroup = {};
  for (const m of GROUP_MATCHES) {
    if (!lastDateByGroup[m.group] || logDateKey(m.date) > logDateKey(lastDateByGroup[m.group])) lastDateByGroup[m.group] = m.date;
  }
  for (const g of Object.keys(GROUPS)) {
    if (!hasOrder(actual, g) || !hasOrder(prediction, g)) continue;
    const predicted = groupOrder(prediction, g);
    const real = groupOrder(actual, g);
    const teams = []; let pts = 0;
    predicted.forEach((t, idx) => {
      if (!t) return;
      if (idx < 2 && adv.has(t)) { teams.push({ team: t, why: 'üst tura çıktı', pts: SCORING.groupTable.qualified }); pts += SCORING.groupTable.qualified; }
      if (real[idx] === t) { teams.push({ team: t, why: `doğru sıra (${idx + 1}.)`, pts: SCORING.groupTable.position }); pts += SCORING.groupTable.position; }
    });
    if (pts > 0) entries.push({ phase: 'group', kind: 'table', date: lastDateByGroup[g], label: `${g} Grubu sıralaması`, detail: `${teams.length} isabet`, teams, pts });
  }

  // 3) En iyi 3.'ler (+10/takım)
  if (allGroupsComplete(actual) && allGroupsComplete(prediction)) {
    const teams = [];
    for (const t of bestThirds(prediction).teams.filter(Boolean)) {
      if (adv.has(t)) teams.push({ team: t, why: 'üst tura çıktı', pts: SCORING.thirdPlace.advance });
    }
    if (teams.length) {
      const endG = Object.values(lastDateByGroup).sort((a, b) => logDateKey(b) - logDateKey(a))[0];
      entries.push({ phase: 'group', kind: 'thirds', date: endG, label: "En iyi 3.'ler", detail: `${teams.length} doğru`, teams, pts: teams.length * SCORING.thirdPlace.advance });
    }
  }

  // 4a) Eleme — tur atlatanlar (takım bazlı, eşleşmeden bağımsız)
  for (const [id, from, to] of KO_GROUPS_L) {
    const winnerMatch = {};
    for (let no = from; no <= to; no++) { const w = A.matches[no]?.winner; if (w) winnerMatch[w] = no; }
    const predWinners = new Set();
    for (let no = from; no <= to; no++) { const w = P.matches[no]?.winner; if (w) predWinners.add(w); }
    for (const t of predWinners) {
      const no = winnerMatch[t];
      if (no == null) continue;
      entries.push({
        phase: 'ko', kind: 'ko-adv', no, date: KO_DATES[no]?.date, team: t,
        label: shortNameTeam(t), detail: 'turu geçti', tag: KO_ROUND_TR_MAP[id], pts: SCORING.knockout.advance[id],
      });
    }
  }

  // 4b) Eleme — doğru eşleşmeler (+10, tur içinde slottan bağımsız)
  for (const [from, to] of KO_ALL_L) {
    if (from === 73 && !r32Final) continue;
    const actualPairNo = new Map();
    for (let no = from; no <= to; no++) { const a = A.matches[no]; if (a?.home && a?.away) actualPairNo.set(canon(a.home, a.away), no); }
    const seen = new Set();
    for (let no = from; no <= to; no++) {
      const p = P.matches[no];
      if (!p?.home || !p?.away || p.home === p.away) continue;
      const key = canon(p.home, p.away);
      if (actualPairNo.has(key) && !seen.has(key)) {
        seen.add(key);
        const ano = actualPairNo.get(key);
        const am = A.matches[ano];
        entries.push({
          phase: 'ko', kind: 'ko-matchup', no: ano, date: KO_DATES[ano]?.date,
          label: `${am.home} - ${am.away}`, detail: 'eşleşmeyi tutturdun', tag: KO_ROUND_TR_MAP[roundOf(ano)] || 'Eleme', pts: SCORING.knockout.matchup,
        });
      }
    }
  }

  // 4c) Eleme — skorlar (+5 tam / +3 doğru sonuç, eşleşme bazlı)
  const predKo = prediction?.ko || {}, actualKo = actual?.ko || {};
  for (const [from, to] of KO_ALL_L) {
    const predByPair = new Map();
    for (let no = from; no <= to; no++) {
      const pm = P.matches[no], pk = predKo[no];
      if (pm?.home && pm?.away && num(pk?.hs) != null && num(pk?.as) != null) {
        const key = canon(pm.home, pm.away);
        if (!predByPair.has(key)) predByPair.set(key, { pm, pk });
      }
    }
    for (let no = from; no <= to; no++) {
      const a = actualKo[no];
      if (num(a?.hs) == null || num(a?.as) == null) continue;
      const am = A.matches[no];
      if (!am?.home || !am?.away) continue;
      const hit = predByPair.get(canon(am.home, am.away));
      if (!hit) continue;
      const oriented = hit.pm.home === am.home ? { hs: hit.pk.hs, as: hit.pk.as } : { hs: hit.pk.as, as: hit.pk.hs };
      const got = scoreKoPair(oriented, a, hit.pm.winner, am.winner);
      if (got <= 0) continue;
      entries.push({
        phase: 'ko', kind: 'ko-score', no, date: KO_DATES[no]?.date,
        label: `${am.home} - ${am.away}`,
        detail: `sen ${oriented.hs}-${oriented.as} · sonuç ${a.hs}-${a.as}`,
        tag: got === SCORING.knockout.match.exact ? 'Tam skor' : 'Doğru sonuç', pts: got,
      });
    }
  }

  // 5) Finaller
  const fDate = KO_DATES[104]?.date, tpDate = KO_DATES[103]?.date;
  const pushF = (cond, label, team, pts, date) => { if (cond) entries.push({ phase: 'final', kind: 'finals', date, label, team, detail: team ? shortNameTeam(team) : '', pts }); };
  pushF(P.champion && P.champion === A.champion, '🏆 Şampiyon', A.champion, SCORING.finals.champion, fDate);
  pushF(P.runnerUp && P.runnerUp === A.runnerUp, '🥈 Finalist (2.)', A.runnerUp, SCORING.finals.runnerUp, fDate);
  pushF(P.third && P.third === A.third, '🥉 Üçüncü', A.third, SCORING.finals.third, tpDate);
  pushF(P.fourth && P.fourth === A.fourth, '4.’lük', A.fourth, SCORING.finals.fourth, tpDate);
  const inMatch = [A.third, A.fourth].filter(Boolean);
  [P.third, P.fourth].filter(Boolean).forEach((t) => {
    if (inMatch.includes(t)) entries.push({ phase: 'final', kind: 'finals', date: tpDate, label: 'Üçüncülük maçında', team: t, detail: shortNameTeam(t), pts: SCORING.finals.inThirdPlaceMatch });
  });
  const pTop = (prediction?.topScorer || '').trim(), aTop = (actual?.topScorer || '').trim();
  pushF(pTop && aTop && pTop.toLowerCase() === aTop.toLowerCase(), '⚽ Gol kralı', null, SCORING.finals.topScorer, fDate);
  if (pTop && aTop && pTop.toLowerCase() === aTop.toLowerCase()) entries[entries.length - 1].detail = actual.topScorer;

  entries.sort((a, b) => logDateKey(a.date) - logDateKey(b.date) || (a.no || 9999) - (b.no || 9999));
  const total = entries.reduce((s, e) => s + e.pts, 0);
  return { entries, total };
}
function shortNameTeam(t) { return t; }

// Turnuva tamamlandı mı: final + üçüncülük galipleri ve gol kralı girilmiş.
export function tournamentComplete(actual) {
  return !!(actual?.ko?.[104]?.winner && actual?.ko?.[103]?.winner && (actual?.topScorer || '').trim());
}
