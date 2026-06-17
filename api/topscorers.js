// Vercel serverless function: returns the top 3 World Cup scorers.
// Uses football-data.org (free tier). Set FOOTBALL_DATA_TOKEN in Vercel env
// (the same token already used by api/scores.js). Optionally override the
// competition with FOOTBALL_DATA_COMPETITION (default "WC").
//
// Called server-side, so the API key stays secret and there is no CORS issue.
// The app fetches /api/topscorers (or VITE_TOPSCORERS_URL if you prefer n8n).
export default async function handler(req, res) {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    res.status(500).json({ scorers: [], error: 'FOOTBALL_DATA_TOKEN tanımlı değil (Vercel ortam değişkeni).' });
    return;
  }
  const comp = process.env.FOOTBALL_DATA_COMPETITION || 'WC';
  try {
    const r = await fetch(`https://api.football-data.org/v4/competitions/${comp}/scorers?limit=3`, {
      headers: { 'X-Auth-Token': token },
    });
    if (!r.ok) {
      res.status(r.status).json({ scorers: [], error: `Kaynak hatası: ${r.status}` });
      return;
    }
    const data = await r.json();
    const scorers = (data.scorers || []).slice(0, 3).map((s) => ({
      name: s.player?.name || '—',
      team: s.team?.name || s.team?.shortName || '',
      goals: s.goals ?? s.numberOfGoals ?? 0,
      assists: s.assists ?? null,
    }));
    // Cache at the edge so we stay well within the free-tier rate limit.
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');
    res.status(200).json({ scorers, source: 'football-data.org', updated: new Date().toISOString() });
  } catch (e) {
    res.status(502).json({ scorers: [], error: 'İstek başarısız: ' + (e?.message || 'bilinmeyen') });
  }
}
