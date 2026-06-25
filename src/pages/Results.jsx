import { useStore } from '../lib/store.jsx';
import { SectionTitle, BrandHeader } from '../components/ui.jsx';
import Standings from '../components/Standings.jsx';

export default function Results({ goHome }) {
  const { actual } = useStore();
  return (
    <div className="space-y-4">
      <BrandHeader onClick={goHome} />
      <SectionTitle title="Gerçek Sonuçlar" />
      <p className="text-xs text-ink/55 px-1 leading-relaxed">
        Girilen skorlara göre güncel grup puan durumu. Her grupta ilk 2 takım üst tura çıkar;
        12 grubun 3.’sünden en iyi 8’i de eleme turuna kalır.
      </p>
      <Standings scores={actual} />
    </div>
  );
}
