// 2026 World Cup knockout bracket engine.
// Builds the full bracket (Round of 32 → Final) automatically from the group
// standings, using the official FIFA slot template + the 495-combination table
// for assigning the eight best third-placed teams. Later rounds resolve from
// the winners the user (or admin) picks, propagating through the bracket.
import { GROUPS } from './tournament.js';
import { computeStandings } from '../lib/scoring.js';
import { THIRDS_TABLE } from './bracketThirds.js';

// Standings for a group, respecting a manual table override if the user/admin set one.
function orderedStandings(source, g) {
  const rows = computeStandings(g, source?.groupMatches);
  const ov = source?.groupTables?.[g];
  if (ov && ov.length === 4 && ov.every(Boolean)) {
    const byTeam = Object.fromEntries(rows.map((r) => [r.team, r]));
    const reordered = ov.map((t) => byTeam[t]).filter(Boolean);
    if (reordered.length === 4) return reordered;
  }
  return rows;
}

// Slot order used by THIRDS_TABLE values.
export const THIRD_SLOTS = ['A', 'B', 'D', 'E', 'G', 'I', 'K', 'L'];

// Round of 32 (matches 73–88). ref types: W=group winner, R=runner-up, T=3rd in slot.
const W = (g) => ({ t: 'W', g });
const R = (g) => ({ t: 'R', g });
const T = (slot) => ({ t: 'T', slot });

export const R32 = [
  { no: 73, home: R('A'), away: R('B') },
  { no: 74, home: W('E'), away: T('E') },
  { no: 75, home: W('F'), away: R('C') },
  { no: 76, home: W('C'), away: R('F') },
  { no: 77, home: W('I'), away: T('I') },
  { no: 78, home: R('E'), away: R('I') },
  { no: 79, home: W('A'), away: T('A') },
  { no: 80, home: W('L'), away: T('L') },
  { no: 81, home: W('D'), away: T('D') },
  { no: 82, home: W('G'), away: T('G') },
  { no: 83, home: R('K'), away: R('L') },
  { no: 84, home: W('H'), away: R('J') },
  { no: 85, home: W('B'), away: T('B') },
  { no: 86, home: W('J'), away: R('H') },
  { no: 87, home: W('K'), away: T('K') },
  { no: 88, home: R('D'), away: R('G') },
];

// Later rounds resolve from earlier match winners (Wn) / losers (Ln).
const Wm = (n) => ({ t: 'Wm', n });
const Lm = (n) => ({ t: 'Lm', n });

export const LATER = [
  { no: 89, round: 'R16', home: Wm(74), away: Wm(77) },
  { no: 90, round: 'R16', home: Wm(73), away: Wm(75) },
  { no: 91, round: 'R16', home: Wm(76), away: Wm(78) },
  { no: 92, round: 'R16', home: Wm(79), away: Wm(80) },
  { no: 93, round: 'R16', home: Wm(83), away: Wm(84) },
  { no: 94, round: 'R16', home: Wm(81), away: Wm(82) },
  { no: 95, round: 'R16', home: Wm(86), away: Wm(88) },
  { no: 96, round: 'R16', home: Wm(85), away: Wm(87) },
  { no: 97, round: 'QF', home: Wm(89), away: Wm(90) },
  { no: 98, round: 'QF', home: Wm(93), away: Wm(94) },
  { no: 99, round: 'QF', home: Wm(91), away: Wm(92) },
  { no: 100, round: 'QF', home: Wm(95), away: Wm(96) },
  { no: 101, round: 'SF', home: Wm(97), away: Wm(98) },
  { no: 102, round: 'SF', home: Wm(99), away: Wm(100) },
  { no: 103, round: 'TP', home: Lm(101), away: Lm(102) },
  { no: 104, round: 'F', home: Wm(101), away: Wm(102) },
];

export const KO_ORDER = [
  { id: 'R32', labelTr: 'Son 32', from: 73, to: 88 },
  { id: 'R16', labelTr: 'Son 16', from: 89, to: 96 },
  { id: 'QF', labelTr: 'Çeyrek Final', from: 97, to: 100 },
  { id: 'SF', labelTr: 'Yarı Final', from: 101, to: 102 },
  { id: 'TP', labelTr: 'Üçüncülük Maçı', from: 103, to: 103 },
  { id: 'F', labelTr: 'Final', from: 104, to: 104 },
];

// Eleme turu fikstür tarihleri (2026 takvimine yakın; gerekirse buradan düzenle).
// Saatler TR (yaklaşık). Tarih biçimi GROUP_MATCHES ile aynı: "Haz/Tem GG, 2026".
export const KO_DATES = {
  // Son 32 — 28 Haz – 3 Tem
  73: { date: 'Haz 28, 2026', time: '22:00' }, 74: { date: 'Haz 29, 2026', time: '23:30' },
  75: { date: 'Haz 30, 2026', time: '04:00' }, 76: { date: 'Haz 29, 2026', time: '20:00' },
  77: { date: 'Tem 1, 2026', time: '00:00' }, 78: { date: 'Haz 30, 2026', time: '20:00' },
  79: { date: 'Tem 1, 2026', time: '04:00' }, 80: { date: 'Tem 1, 2026', time: '19:00' },
  81: { date: 'Tem 2, 2026', time: '03:00' }, 82: { date: 'Tem 1, 2026', time: '23:00' },
  83: { date: 'Tem 3, 2026', time: '02:00' }, 84: { date: 'Tem 2, 2026', time: '22:00' },
  85: { date: 'Tem 3, 2026', time: '06:00' }, 86: { date: 'Tem 4, 2026', time: '01:00' },
  87: { date: 'Tem 4, 2026', time: '04:30' }, 88: { date: 'Tem 3, 2026', time: '21:00' },
  // Son 16 — 4–7 Tem
  89: { date: 'Tem 4, 2026', time: '20:00' }, 90: { date: 'Tem 4, 2026', time: '20:00' },
  91: { date: 'Tem 5, 2026', time: '20:00' }, 92: { date: 'Tem 5, 2026', time: '23:00' },
  93: { date: 'Tem 6, 2026', time: '20:00' }, 94: { date: 'Tem 6, 2026', time: '23:00' },
  95: { date: 'Tem 7, 2026', time: '20:00' }, 96: { date: 'Tem 7, 2026', time: '23:00' },
  // Çeyrek — 9 & 11 Tem
  97: { date: 'Tem 9, 2026', time: '20:00' }, 98: { date: 'Tem 9, 2026', time: '23:00' },
  99: { date: 'Tem 11, 2026', time: '20:00' }, 100: { date: 'Tem 11, 2026', time: '23:00' },
  // Yarı — 14 & 15 Tem
  101: { date: 'Tem 14, 2026', time: '22:00' }, 102: { date: 'Tem 15, 2026', time: '22:00' },
  // Üçüncülük & Final
  103: { date: 'Tem 18, 2026', time: '22:00' },
  104: { date: 'Tem 19, 2026', time: '22:00' },
};

const ALL = [...R32.map((m) => ({ ...m, round: 'R32' })), ...LATER];
export const MATCH_BY_NO = Object.fromEntries(ALL.map((m) => [m.no, m]));

// Rank the 12 third-placed teams (Pts, GD, GF, then group letter for determinism).
export function rankedThirds(source) {
  const rows = Object.keys(GROUPS).map((g) => {
    const r = orderedStandings(source, g)[2] || { team: '', Pts: 0, GD: 0, GF: 0 };
    return { group: g, team: r.team, Pts: r.Pts, GD: r.GD, GF: r.GF };
  });
  rows.sort((a, b) => b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF || a.group.localeCompare(b.group));
  return rows;
}

// The 8 best third-placed teams and which groups they come from.
export function bestThirds(source) {
  const ranked = rankedThirds(source);
  const top8 = ranked.slice(0, 8);
  const groups = top8.map((r) => r.group).sort();
  return { ranked, top8, groups, teams: top8.map((r) => r.team) };
}

// Map each third slot (A,B,D,E,G,I,K,L) to the group whose 3rd-placed team fills it.
export function assignThirds(source) {
  const { groups } = bestThirds(source);
  const key = groups.join('');
  const assignment = THIRDS_TABLE[key]; // 8 letters in THIRD_SLOTS order
  const bySlot = {};
  if (assignment) THIRD_SLOTS.forEach((slot, i) => { bySlot[slot] = assignment[i]; });
  return bySlot; // { A: 'E', B: 'J', ... } -> group letter
}

// Resolve the team that fills a Round-of-32 ref, using standings.
function resolveR32Ref(ref, standings, thirdSlotGroup) {
  if (ref.t === 'W') return standings[ref.g]?.[0]?.team || null;
  if (ref.t === 'R') return standings[ref.g]?.[1]?.team || null;
  if (ref.t === 'T') {
    const g = thirdSlotGroup[ref.slot];
    return g ? standings[g]?.[2]?.team || null : null;
  }
  return null;
}

// Build the entire bracket. `ko` = { [matchNo]: { winner } } picks.
// Returns { matches: { [no]: { no, round, home, away, winner, loser } }, champion, ... }
export function resolveBracket(source, ko = {}) {
  const standings = {};
  for (const g of Object.keys(GROUPS)) standings[g] = orderedStandings(source, g);
  const thirdSlotGroup = assignThirds(source);

  const matches = {};
  // Round of 32
  for (const m of R32) {
    matches[m.no] = {
      no: m.no, round: 'R32',
      home: resolveR32Ref(m.home, standings, thirdSlotGroup),
      away: resolveR32Ref(m.away, standings, thirdSlotGroup),
    };
  }
  // Later rounds (depend on picked winners)
  const winnerOf = (no) => {
    const w = ko[no]?.winner;
    const m = matches[no];
    if (!m) return null;
    return w && (w === m.home || w === m.away) ? w : null;
  };
  const loserOf = (no) => {
    const m = matches[no];
    const w = winnerOf(no);
    if (!m || !w || !m.home || !m.away) return null;
    return w === m.home ? m.away : m.home;
  };
  const resolveRef = (ref) => {
    if (ref.t === 'Wm') return winnerOf(ref.n);
    if (ref.t === 'Lm') return loserOf(ref.n);
    return null;
  };
  for (const m of LATER) {
    matches[m.no] = { no: m.no, round: m.round, home: resolveRef(m.home), away: resolveRef(m.away) };
  }
  // attach winner/loser to every match
  for (const no of Object.keys(matches)) {
    const m = matches[no];
    m.winner = winnerOf(+no);
    m.loser = m.winner ? (m.winner === m.home ? m.away : m.home) : null;
  }

  return {
    matches,
    thirdSlotGroup,
    champion: matches[104]?.winner || null,
    runnerUp: matches[104]?.loser || null,
    third: matches[103]?.winner || null,
    fourth: matches[103]?.loser || null,
  };
}
