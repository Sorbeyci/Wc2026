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

// Shorter display labels for long names so match rows stay readable and aligned.
// The underlying team value is unchanged (scoring/flags still use full names).
export const SHORT_NAME = {
  'Amerika Birleşik Devletleri': 'ABD',
  'Kore Cumhuriyeti': 'G. Kore',
  'Çek Cumhuriyeti': 'Çekya',
  'Bosna Hersek': 'Bosna',
  'Suudi Arabistan': 'S. Arabistan',
  'Yeşil Burun Adaları': 'Yeşil Burun',
  'Güney Afrika': 'G. Afrika',
  'Yeni Zelanda': 'Y. Zelanda',
  'Fildişi Sahili': 'Fildişi',
};

export const shortName = (name) => SHORT_NAME[name] || name;

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

// Representative identity color per team (approx. primary flag color).
// Falls back to a deterministic pleasant hue derived from the name.
const TEAM_COLOR = {
  'Brezilya': '#0a9d4a', 'Arjantin': '#5aa9e6', 'Fransa': '#1b3a8c', 'İspanya': '#c60b1e',
  'Almanya': '#111111', 'İngiltere': '#1b3a8c', 'Hollanda': '#ec6608', 'Portekiz': '#0a7d3b',
  'Belçika': '#c8102e', 'İtalya': '#1b6ca8', 'Hırvatistan': '#c8102e', 'Uruguay': '#3aa1d8',
  'Meksika': '#0a7d3b', 'Amerika Birleşik Devletleri': '#1b3a8c', 'Kanada': '#d52b1e',
  'Japonya': '#bc002d', 'Kore Cumhuriyeti': '#0047a0', 'Avustralya': '#0a7d3b',
  'Fas': '#c1272d', 'Senegal': '#00853f', 'Fildişi Sahili': '#ff8200', 'Gana': '#006b3f',
  'Tunus': '#e70013', 'Mısır': '#c8102e', 'Nijerya': '#008751', 'Cezayir': '#006233',
  'Türkiye': '#e30a17', 'İsviçre': '#d52b1e', 'İsveç': '#fecb00', 'Norveç': '#ba0c2f',
  'Danimarka': '#c8102e', 'Polonya': '#dc143c', 'İran': '#239f40', 'Suudi Arabistan': '#006c35',
  'Katar': '#8a1538', 'Ekvador': '#ffd100', 'Kolombiya': '#fcd116', 'Paraguay': '#d52b1e',
  'Güney Afrika': '#007a4d', 'Yeni Zelanda': '#1b3a8c', 'İskoçya': '#0065bf',
  'Yeşil Burun Adaları': '#003893', 'Haiti': '#00209f', 'Curaçao': '#002b7f',
  'Bosna Hersek': '#002395', 'Çek Cumhuriyeti': '#11457e', 'Irak': '#007a3d',
  'Panama': '#005293', 'Jamaika': '#009b3a', 'Özbekistan': '#1eb53a', 'Ürdün': '#007a3d',
  'Yeni Kaledonya': '#ed1c24',
};

function hashHue(s) {
  let h = 0;
  for (let i = 0; i < (s || '').length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

export const teamColor = (name) => {
  if (!name) return '#64748b';
  if (TEAM_COLOR[name]) return TEAM_COLOR[name];
  return `hsl(${hashHue(name)}, 55%, 42%)`;
};
