// Derives a rich set of achievement badges from a scored result.
// Each badge: { id, icon, title, desc, earned, progress? }
export function achievements(result, { rank = 0, bestDay = 0 } = {}) {
  const s = result?.stats || {};
  const fh = s.finalsHit || {};
  const n = (k) => s[k] || 0;
  const A = (id, icon, title, desc, earned, progress) => ({ id, icon, title, desc, earned: !!earned, progress });

  const list = [
    A('first', '🩸', 'İlk kan', 'İlk maç puanını al', n('groupMatchPoints') > 0),
    A('sniper1', '🎯', 'Keskin nişancı', '1 tam skor bil', n('exact') >= 1, `${n('exact')}/1`),
    A('triple', '🔥', 'Üçleme', '3 tam skor bil', n('exact') >= 3, `${n('exact')}/3`),
    A('sniper5', '🏹', 'Snayper', '5 tam skor bil', n('exact') >= 5, `${n('exact')}/5`),
    A('oracle', '🔮', 'Kâhin', '10 tam skor bil', n('exact') >= 10, `${n('exact')}/10`),
    A('tableguru', '📊', 'Sıralama gurusu', '10 doğru grup sırası', n('correctPositions') >= 10, `${n('correctPositions')}/10`),
    A('thirds1', '🥉', 'Üçüncü göz', 'En az 1 doğru 3. takım', n('thirdsCorrect') >= 1),
    A('thirds8', '🎰', 'Sekizde sekiz', '8 doğru 3. takım', n('thirdsCorrect') >= 8, `${n('thirdsCorrect')}/8`),
    A('bracket8', '🧩', 'Eleme kralı', '8 doğru eşleşme', n('koMatchupHits') >= 8, `${n('koMatchupHits')}/8`),
    A('bracket16', '🧠', 'Bracket dehası', '16 doğru eşleşme', n('koMatchupHits') >= 16, `${n('koMatchupHits')}/16`),
    A('deep', '⚔️', 'Derin tahminci', 'Bir çeyrek/yarı kazananı bil', (n('koQF') + n('koSF')) >= 1),
    A('champ', '👑', 'Şampiyon kâhini', 'Şampiyonu doğru bil', !!fh.champion),
    A('podium', '🏆', 'Podyum ustası', 'Tüm podyumu doğru bil', n('finalsHits') >= 4, `${n('finalsHits')}/5`),
    A('scorer', '⚽', 'Gol kralı avcısı', 'Gol kralını doğru bil', !!fh.topScorer),
    A('marathon', '🏁', 'Maraton', '72 maça tahmin gir', n('playedScored') >= 72, `${n('playedScored')}/72`),
    A('day20', '💥', 'İyi gün', 'Tek günde 20+ puan', bestDay >= 20, `${bestDay}/20`),
    A('day30', '🌋', 'Müthiş gün', 'Tek günde 30+ puan', bestDay >= 30, `${bestDay}/30`),
    A('leader', '🥇', 'Lider', '1. sırada ol', rank === 1),
    A('top3', '🚀', 'Zirve yarışı', 'İlk 3’te ol', rank >= 1 && rank <= 3),
  ];
  // earned first, then by original order
  return list.map((a, i) => ({ ...a, _i: i })).sort((x, y) => (y.earned - x.earned) || (x._i - y._i));
}
