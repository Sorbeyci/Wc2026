import { useStore } from '../lib/store.jsx';
import Bracket from '../components/Bracket.jsx';

export default function Knockout({ listId }) {
  const { getPrediction, mergeKo, setTopScorer } = useStore();
  const pred = getPrediction(listId);
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink/60">
        Eşleşmeler grup tahminlerinden otomatik kurulur. Her maçta üste çıkacak takıma dokun;
        kazanan bir sonraki tura otomatik taşınır.
      </p>
      <Bracket source={pred} ko={pred.ko} onChange={(no, patch) => mergeKo(listId, no, patch)} />
      <div className="card p-3">
        <label className="label">Gol Kralı tahmini</label>
        <input
          className="field mt-1"
          placeholder="Oyuncu adı"
          value={pred.topScorer || ''}
          onChange={(e) => setTopScorer(listId, e.target.value)}
        />
      </div>
    </div>
  );
}
