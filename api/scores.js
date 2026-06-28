// Vercel serverless function: returns World Cup fixtures with scores.
// Default source: football-data.org (set FOOTBALL_DATA_TOKEN in Vercel env).
// You can instead point the app's VITE_SCORES_URL at any endpoint that returns
// either { fixtures: [{homeTeam, awayTeam, homeScore, awayScore}] } or a
// pre-mapped { groupMatches: { [no]: {home, away} } }.
export default async function handler(req, res) {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'FOOTBALL_DATA_TOKEN tanımlı değil (Vercel ortam değişkeni).' });
    return;
  }
  const comp = process.env.FOOTBALL_DATA_COMPETITION || 'WC';
  try {
    const r = await fetch(`https://api.football-data.org/v4/competitions/${comp}/matches`, {
      headers: { 'X-Auth-Token': token },
    });
    if (!r.ok) {
      res.status(r.status).json({ error: `Kaynak hatası: ${r.status}` });
      return;
    }
    const data = await r.json();
    const fixtures = (data.matches || []).map((m) => ({
      homeTeam: m.homeTeam?.name || m.homeTeam?.shortName,
      awayTeam: m.awayTeam?.name || m.awayTeam?.shortName,
      homeScore: m.score?.fullTime?.home ?? null,
      awayScore: m.score?.fullTime?.away ?? null,
      winner: m.score?.winner ?? null, // HOME_TEAM | AWAY_TEAM | DRAW (penaltı dahil)
      status: m.status,
      stage: m.stage,
      minute: m.minute ?? null,
      utcDate: m.utcDate,
    }));
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    res.status(200).json({ fixtures, source: 'football-data.org', count: fixtures.length });
  } catch (e) {
    res.status(502).json({ error: 'İstek başarısız: ' + (e?.message || 'bilinmeyen') });
  }
}
