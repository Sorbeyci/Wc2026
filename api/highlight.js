// TRT Spor YouTube kanalında bir maçın özet videosunu arar (YouTube Data API v3).
// Env: YOUTUBE_API_KEY (zorunlu), TRT_CHANNEL_ID (opsiyonel; verilmezse handle'dan çözülür).
// Kota: arama (search.list) = 100 birim. Kenar cache (s-maxage) ile aynı sorgu tekrar maliyetsiz.
let CHANNEL_ID = null;

async function resolveChannelId(key) {
  if (CHANNEL_ID) return CHANNEL_ID;
  if (process.env.TRT_CHANNEL_ID) { CHANNEL_ID = process.env.TRT_CHANNEL_ID; return CHANNEL_ID; }
  // handle -> channelId (1 birim)
  const url = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=trtspor&key=${key}`;
  const r = await fetch(url);
  const j = await r.json();
  CHANNEL_ID = j?.items?.[0]?.id || null;
  return CHANNEL_ID;
}

export default async function handler(req, res) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) { res.status(500).json({ error: 'no_api_key' }); return; }
  const q = (req.query.q || '').toString().trim();
  if (!q) { res.status(400).json({ error: 'no_query' }); return; }
  try {
    const channelId = await resolveChannelId(key);
    if (!channelId) { res.status(502).json({ error: 'no_channel' }); return; }
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}`
      + `&q=${encodeURIComponent(q)}&type=video&maxResults=8&order=relevance&key=${key}`;
    const r = await fetch(url);
    if (!r.ok) {
      const t = await r.text();
      res.status(502).json({ error: 'yt_error', detail: t.slice(0, 300) });
      return;
    }
    const j = await r.json();
    const items = (j.items || []).map((it) => ({
      videoId: it.id?.videoId,
      title: it.snippet?.title || '',
      publishedAt: it.snippet?.publishedAt || '',
    })).filter((x) => x.videoId);
    // Sonuç ~1 saat sabit; aynı sorgu için tekrar arama yapılmaz (kota korunur).
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({ channelId, items });
  } catch (e) {
    res.status(500).json({ error: 'exception', detail: String(e).slice(0, 200) });
  }
}
