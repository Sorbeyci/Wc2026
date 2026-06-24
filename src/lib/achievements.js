// Derives a rich set of achievement badges from a scored result + extra context.
// Each badge: { id, icon, title, desc, earned, progress? }
export function achievements(result, { rank = 0, bestDay = 0, quizWins = 0, activeDays = 0, online = false, latched = [] } = {}) {
  const s = result?.stats || {};
  const fh = s.finalsHit || {};
  const n = (k) => s[k] || 0;
  const lock = latched instanceof Set ? latched : new Set(latched || []);
  // earned: ya şu an koşul sağlanıyor ya da daha önce kazanılıp kilitlenmiş.
  const A = (id, icon, title, desc, earned, progress) => ({ id, icon, title, desc, earned: !!earned || lock.has(id), progress });

  const list = [
    // --- Tahmin: grup maçları ---
    A('first', '🩸', 'İlk kan', 'İlk maç puanını al', n('groupMatchPoints') > 0),
    A('sniper1', '🎯', 'Keskin nişancı', '1 tam skor bil', n('exact') >= 1, `${n('exact')}/1`),
    A('triple', '🔥', 'Üçleme', '3 tam skor bil', n('exact') >= 3, `${n('exact')}/3`),
    A('sniper5', '🏹', 'Snayper', '5 tam skor bil', n('exact') >= 5, `${n('exact')}/5`),
    A('oracle', '🔮', 'Kâhin', '10 tam skor bil', n('exact') >= 10, `${n('exact')}/10`),
    A('exact15', '💎', 'Kusursuz göz', '15 tam skor bil', n('exact') >= 15, `${n('exact')}/15`),
    A('marathon', '🏁', 'Maraton', '72 maça tahmin gir', n('playedScored') >= 72, `${n('playedScored')}/72`),
    // --- Tahmin: gruplar & 3.'ler ---
    A('tableguru', '📊', 'Sıralama gurusu', '10 doğru grup sırası', n('correctPositions') >= 10, `${n('correctPositions')}/10`),
    A('qualall', '✅', 'Üst tur kâhini', '20 doğru üst-tur takımı', n('correctQualified') >= 20, `${n('correctQualified')}/20`),
    A('thirds1', '🥉', 'Üçüncü göz', 'En az 1 doğru 3. takım', n('thirdsCorrect') >= 1),
    A('thirds8', '🎰', 'Sekizde sekiz', '8 doğru 3. takım', n('thirdsCorrect') >= 8, `${n('thirdsCorrect')}/8`),
    // --- Tahmin: eleme ---
    A('bracket8', '🧩', 'Eleme kralı', '8 doğru eşleşme', n('koMatchupHits') >= 8, `${n('koMatchupHits')}/8`),
    A('bracket16', '🧠', 'Bracket dehası', '16 doğru eşleşme', n('koMatchupHits') >= 16, `${n('koMatchupHits')}/16`),
    A('koexact', '🎱', 'Eleme nişancısı', 'Eleme turunda tam skor bil', n('koExact') >= 1),
    A('deep', '⚔️', 'Derin tahminci', 'Bir çeyrek/yarı kazananı bil', (n('koQF') + n('koSF')) >= 1),
    // --- Tahmin: final & podyum ---
    A('champ', '👑', 'Şampiyon kâhini', 'Şampiyonu doğru bil', !!fh.champion),
    A('podium', '🏆', 'Podyum ustası', 'Tüm podyumu doğru bil', n('finalsHits') >= 4, `${n('finalsHits')}/5`),
    A('scorer', '⚽', 'Gol kralı avcısı', 'Gol kralını doğru bil', !!fh.topScorer),
    A('combo', '🌟', 'İkili vuruş', 'Şampiyon + gol kralını bil', !!fh.champion && !!fh.topScorer),
    // --- Günlük performans ---
    A('day20', '💥', 'İyi gün', 'Tek günde 20+ puan', bestDay >= 20, `${bestDay}/20`),
    A('day30', '🌋', 'Müthiş gün', 'Tek günde 30+ puan', bestDay >= 30, `${bestDay}/30`),
    // --- Sıralama ---
    A('leader', '🥇', 'Lider', '1. sırada ol', rank === 1),
    A('top3', '🚀', 'Zirve yarışı', 'İlk 3’te ol', rank >= 1 && rank <= 3),
    // --- Günlük quiz ---
    A('quiz1', '🧠', 'Bilgiç', 'İlk günlük quizi kazan', quizWins >= 1, `${quizWins}/1`),
    A('quiz5', '🎓', 'Quiz ustası', '5 günlük quiz kazan', quizWins >= 5, `${quizWins}/5`),
    A('quiz15', '🏅', 'Quiz şampiyonu', '15 günlük quiz kazan', quizWins >= 15, `${quizWins}/15`),
    A('quiz40', '🧙', 'Quiz efsanesi', '40 günlük quiz kazan', quizWins >= 40, `${quizWins}/40`),
    // --- Site aktifliği ---
    A('visit1', '👋', 'Merhaba', 'Siteye giriş yap', activeDays >= 1),
    A('visit3', '📅', 'Düzenli ziyaretçi', '3 farklı gün uğra', activeDays >= 3, `${activeDays}/3`),
    A('visit7', '🔁', 'Sadık taraftar', '7 farklı gün uğra', activeDays >= 7, `${activeDays}/7`),
    A('visit30', '🏟️', 'Müdavim', '30 farklı gün uğra', activeDays >= 30, `${activeDays}/30`),
    A('onlinenow', '🟢', 'Sahada', 'Şu an çevrimiçi ol', !!online),
  ];
  // earned first, then by original order
  return list.map((a, i) => ({ ...a, _i: i })).sort((x, y) => (y.earned - x.earned) || (x._i - y._i));
}

// En etkileyici kazanılmış rozetten en sadeye doğru öncelik (isim yanına koymak için).
const TOP_PRIORITY = [
  'leader', 'champ', 'podium', 'quiz40', 'oracle', 'exact15', 'bracket16', 'visit30',
  'combo', 'scorer', 'quiz15', 'top3', 'sniper5', 'bracket8', 'thirds8', 'qualall',
  'day30', 'quiz5', 'visit7', 'koexact', 'deep', 'triple', 'day20', 'tableguru',
  'marathon', 'quiz1', 'visit3', 'sniper1', 'thirds1', 'visit1', 'first', 'onlinenow',
];

// Kullanıcının kazandığı en üst seviye rozeti döndürür (isim yanına koymak için).
export function topAchievement(result, ctx = {}) {
  const all = achievements(result, ctx);
  const earned = new Set(all.filter((a) => a.earned).map((a) => a.id));
  for (const id of TOP_PRIORITY) {
    if (earned.has(id)) return all.find((a) => a.id === id) || null;
  }
  return null;
}
