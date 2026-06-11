import { useStore } from '../lib/store.jsx';
import Standings from '../components/Standings.jsx';

export default function GroupRankings({ listId }) {
  const { getPrediction } = useStore();
  const pred = getPrediction(listId);
  return (
    <div className="space-y-3">
      <div className="card p-3 text-sm text-ink/70">
        Grup sıralaması, <b>Maçlar</b> sekmesinde girdiğin skorlardan otomatik oluşur.
        <div className="mt-1 text-xs text-ink/45">Üst tura çıkan takım = 10 puan · doğru sıra = 5 puan</div>
      </div>
      <Standings scores={pred.groupMatches} />
    </div>
  );
}
