// Maps each (Turkish) team name to an ISO 3166 code used by flagcdn.com,
// plus a flag emoji fallback for use inside <select> options.

export const FLAG_CODE = {
  'Meksika': 'mx',
  'Kore Cumhuriyeti': 'kr',
  'Çek Cumhuriyeti': 'cz',
  'Güney Afrika': 'za',
  'İsviçre': 'ch',
  'Kanada': 'ca',
  'Katar': 'qa',
  'Bosna Hersek': 'ba',
  'Brezilya': 'br',
  'Fas': 'ma',
  'İskoçya': 'gb-sct',
  'Haiti': 'ht',
  'Amerika Birleşik Devletleri': 'us',
  'Türkiye': 'tr',
  'Avustralya': 'au',
  'Paraguay': 'py',
  'Almanya': 'de',
  'Ekvador': 'ec',
  'Fildişi Sahili': 'ci',
  'Curaçao': 'cw',
  'Hollanda': 'nl',
  'Japonya': 'jp',
  'İsveç': 'se',
  'Tunus': 'tn',
  'Belçika': 'be',
  'İran': 'ir',
  'Mısır': 'eg',
  'Yeni Zelanda': 'nz',
  'İspanya': 'es',
  'Uruguay': 'uy',
  'Suudi Arabistan': 'sa',
  'Yeşil Burun Adaları': 'cv',
  'Fransa': 'fr',
  'Senegal': 'sn',
  'Norveç': 'no',
  'Irak': 'iq',
  'Arjantin': 'ar',
  'Avusturya': 'at',
  'Cezayir': 'dz',
  'Ürdün': 'jo',
  'Portekiz': 'pt',
  'Kolombiya': 'co',
  'Kongo': 'cd',
  'Özbekistan': 'uz',
  'İngiltere': 'gb-eng',
  'Hırvatistan': 'hr',
  'Panama': 'pa',
  'Gana': 'gh',
};

export const flagUrl = (name, w = 40) => {
  const code = FLAG_CODE[name];
  return code ? `https://flagcdn.com/w${w}/${code}.png` : null;
};

const SPECIAL_EMOJI = {
  'gb-eng': '🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
  'gb-sct': '🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}',
};

export const flagEmoji = (name) => {
  const code = FLAG_CODE[name];
  if (!code) return '';
  if (SPECIAL_EMOJI[code]) return SPECIAL_EMOJI[code];
  return [...code.toUpperCase()].map((c) => String.fromCodePoint(127397 + c.charCodeAt(0))).join('');
};
