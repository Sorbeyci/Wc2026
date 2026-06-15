import { GROUP_MATCHES } from '../data/tournament.js';

function Row({ label, value, hint }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-sm text-ink/70">{label}{hint && <span className="text-ink/35"> · {hint}</span>}</span>
      <span className="font-display text-lg text-ink tabular-nums">{value}</span>
    </div>
  );
}

function Group({ title, points, children }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between border-b border-black/5 pb-2 mb-1">
        <span className="font-display text-lg text-ink">{title}</span>
        <span className="chip bg-pitch/10 text-pitch">{points} puan</span>
      </div>
      {children}
    </div>
  );
}

// Full breakdown of every metric the scoring engine produces.
export default function FullStats({ result }) {
  const s = result.stats;
  return (
    <div className="space-y-3">
      <div className="card p-4 flex items-center justify-between">
        <span className="font-display text-xl text-ink">Toplam puan</span>
        <span className="font-display text-3xl text-pitch">{result.total}</span>
      </div>

      <Group title="Grup maçları" points={s.groupMatchPoints}>
        <Row label="Tam skor" hint="5 puan" value={s.exact} />
        <Row label="Doğru sonuç" hint="3 puan" value={s.correctResult} />
        <Row label="Puanlanan maç" hint={`/ ${GROUP_MATCHES.length}`} value={s.playedScored} />
        <Row label="Maç başına ortalama" value={s.avgPerMatch} />
      </Group>

      <Group title="Grup sıralamaları" points={s.groupTablePoints}>
        <Row label="Üst tura çıkan takım" hint="10 puan" value={s.correctQualified} />
        <Row label="Doğru sıra" hint="5 puan" value={s.correctPositions} />
        <Row label="Tamamlanan grup" hint="/ 12" value={s.groupsFinal} />
      </Group>

      <Group title="Üst tura çıkan 3.'ler" points={s.thirdsPoints}>
        <Row label="Doğru 3. takım" hint="10 puan · 8 takım" value={s.thirdsCorrect} />
      </Group>

      <Group title="Eleme turu" points={s.knockoutPoints}>
        <Row label="Doğru eşleşme (her tur)" hint="eşleşme başına" value={s.koMatchupHits} />
        <Row label="Tam skor (eleme)" hint="tam skor" value={s.koExact} />
        <Row label="Doğru sonuç (eleme)" hint="3 puan" value={s.koResult} />
        <Row label="Son 32 / 16 doğru kazanan" hint="20 / 20" value={`${s.koR32} / ${s.koR16}`} />
        <Row label="Çeyrek / Yarı doğru kazanan" hint="40 / 60" value={`${s.koQF} / ${s.koSF}`} />
        <Row label="Sonuçlanan maç" value={s.koScored} />
      </Group>

      <Group title="Final & podyum" points={s.finalsPoints}>
        <Row label="Doğru tahmin" hint="şampiyon, podyum, gol kralı" value={`${s.finalsHits} / 5`} />
      </Group>
    </div>
  );
}
