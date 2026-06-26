// TRT Spor YouTube kanalında bir maçın özet videosunu arar (YouTube Data API v3).
// Env: YOUTUBE_API_KEY (zorunlu), TRT_CHANNEL_ID (opsiyonel; verilmezse handle'dan çözülür).
// Kota: search.list = 100 birim. Kenar cache (s-maxage) ile aynı sorgu tekrar maliyetsiz.
let CHANNEL_ID = null;

async function ytGet(url) {
  const r = await fetch(url);
  let body = null;
  try { body = await r.json(); } catch { body = null; }
  const err = body?.error;
  return {
    ok: r.ok,
    status: r.status,
    body,
    reason: err?.errors?.[0]?.reason || (err ? 'unknown' : null),
    message: err?.message || null,
  };
}

const looksLikeId = (s) => /^UC[\w-]{20,}$/.test(s || '');
function extractHandle(s) {
  if (!s) return 'trtspor';
  const at = s.match(/@([A-Za-z0-9_.\-]+)/);
  if (at) return at[1];
  if (/^https?:/i.test(s)) {
    const seg = s.replace(/[/?#].*$/, '').replace(/\/+$/, '').split('/').pop();
    return (seg || 'trtspor').replace(/^@/, '');
  }
  return s.replace(/^@/, '');
}

async function resolveChannelId(key) {
  if (CHANNEL_ID) return { id: CHANNEL_ID };
  const env = process.env.TRT_CHANNEL_ID;
  if (env && looksLikeId(env)) { CHANNEL_ID = env; return { id: CHANNEL_ID }; }
  const handle = extractHandle(env);
  const res = await ytGet(`https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(handle)}&key=${key}`);
  if (!res.ok) return { error: res };
  CHANNEL_ID = res.body?.items?.[0]?.id || null;
  return { id: CHANNEL_ID, raw: res };
}

export default async function handler(req, res) {
  const key = process.env.YOUTUBE_API_KEY;
  const debug = req.query.debug === '1';
  if (!key) { res.status(500).json({ error: 'no_api_key', hint: 'Vercel ortam değişkeni YOUTUBE_API_KEY tanımlı değil.' }); return; }

  try {
    const ch = await resolveChannelId(key);
    if (ch.error) {
      // En sık sebep: anahtarda HTTP-referrer kısıtı (sunucu çağrısında referrer yok) veya API kapalı.
      res.status(502).json({
        error: 'yt_channels_failed',
        status: ch.error.status,
        reason: ch.error.reason,      // örn: ipRefererBlocked / API_KEY_HTTP_REFERRER_BLOCKED / accessNotConfigured / quotaExceeded
        message: ch.error.message,
      });
      return;
    }
    const channelId = ch.id;
    if (!channelId) { res.status(502).json({ error: 'no_channel', hint: '@trtspor handle çözülemedi; TRT_CHANNEL_ID env verin.' }); return; }

    if (debug && !req.query.q) {
      res.status(200).json({ ok: true, channelId, hasKey: true });
      return;
    }

    const q = (req.query.q || '').toString().trim();
    if (!q) { res.status(400).json({ error: 'no_query' }); return; }

    const sres = await ytGet(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}`
      + `&q=${encodeURIComponent(q)}&type=video&maxResults=25&order=date&key=${key}`);
    if (!sres.ok) {
      res.status(502).json({ error: 'yt_search_failed', status: sres.status, reason: sres.reason, message: sres.message });
      return;
    }
    const items = (sres.body?.items || []).map((it) => ({
      videoId: it.id?.videoId,
      title: it.snippet?.title || '',
      publishedAt: it.snippet?.publishedAt || '',
    })).filter((x) => x.videoId);

    // Boş sonucu uzun cache'leme (video henüz yoksa kısa sürede tekrar denensin).
    if (items.length) res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    else res.setHeader('Cache-Control', 's-maxage=120');
    res.status(200).json({ channelId, items });
  } catch (e) {
    res.status(500).json({ error: 'exception', detail: String(e).slice(0, 200) });
  }
}
