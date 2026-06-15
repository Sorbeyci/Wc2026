// Maps app team names (Turkish) to the English variants returned by football
// data providers, so auto-fetched results can be matched to our fixtures.
export const TEAM_ALIASES = {
  'Meksika': ['Mexico'],
  'Kore Cumhuriyeti': ['Korea Republic', 'South Korea', 'Republic of Korea', 'Korea'],
  'Çek Cumhuriyeti': ['Czech Republic', 'Czechia'],
  'Güney Afrika': ['South Africa'],
  'İsviçre': ['Switzerland'],
  'Kanada': ['Canada'],
  'Katar': ['Qatar'],
  'Bosna Hersek': ['Bosnia and Herzegovina', 'Bosnia', 'Bosnia-Herzegovina'],
  'Brezilya': ['Brazil'],
  'Fas': ['Morocco'],
  'İskoçya': ['Scotland'],
  'Haiti': ['Haiti'],
  'Amerika Birleşik Devletleri': ['United States', 'USA', 'United States of America', 'US'],
  'Türkiye': ['Türkiye', 'Turkey', 'Turkiye'],
  'Avustralya': ['Australia'],
  'Paraguay': ['Paraguay'],
  'Almanya': ['Germany'],
  'Ekvador': ['Ecuador'],
  'Fildişi Sahili': ["Côte d'Ivoire", 'Ivory Coast', 'Cote d Ivoire'],
  'Curaçao': ['Curaçao', 'Curacao'],
  'Hollanda': ['Netherlands', 'Holland'],
  'Japonya': ['Japan'],
  'İsveç': ['Sweden'],
  'Tunus': ['Tunisia'],
  'Belçika': ['Belgium'],
  'İran': ['Iran', 'IR Iran'],
  'Mısır': ['Egypt'],
  'Yeni Zelanda': ['New Zealand'],
  'İspanya': ['Spain'],
  'Uruguay': ['Uruguay'],
  'Suudi Arabistan': ['Saudi Arabia'],
  'Yeşil Burun Adaları': ['Cape Verde', 'Cabo Verde'],
  'Fransa': ['France'],
  'Senegal': ['Senegal'],
  'Norveç': ['Norway'],
  'Irak': ['Iraq'],
  'Arjantin': ['Argentina'],
  'Avusturya': ['Austria'],
  'Cezayir': ['Algeria'],
  'Ürdün': ['Jordan'],
  'Portekiz': ['Portugal'],
  'Kolombiya': ['Colombia'],
  'Kongo': ['Congo', 'DR Congo', 'Congo DR', 'Democratic Republic of the Congo'],
  'Özbekistan': ['Uzbekistan'],
  'İngiltere': ['England'],
  'Hırvatistan': ['Croatia'],
  'Panama': ['Panama'],
  'Gana': ['Ghana'],
};

export function normalizeName(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// normalized alias -> app (Turkish) team name
export const ALIAS_TO_TR = (() => {
  const o = {};
  for (const [tr, aliases] of Object.entries(TEAM_ALIASES)) {
    o[normalizeName(tr)] = tr;
    for (const a of aliases) o[normalizeName(a)] = tr;
  }
  return o;
})();

export function resolveTeam(name) {
  return ALIAS_TO_TR[normalizeName(name)] || null;
}
