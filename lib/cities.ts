import data from '../data/cities.json';
export type City = { id: number; name: string; uf: string; state: string; lat: number; lng: number };
export const cities: City[] = data;

export function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

type IndexedCity = {
  city: City;
  normName: string;
  normFull: string;
  normState: string;
  ufLower: string;
  paddedName: string;
  nameLen: number;
};

const indexedCities: IndexedCity[] = cities.map(city => {
  const normName = normalize(city.name);
  const ufLower = city.uf.toLowerCase();
  return {
    city,
    normName,
    normFull: `${normName} ${ufLower}`,
    normState: normalize(city.state),
    ufLower,
    paddedName: ` ${normName} `,
    nameLen: normName.length,
  };
});

const allUfs = new Set(indexedCities.map(c => c.ufLower));
const searchCache = new Map<string, City[]>();

export function searchCities(query: string, limit = 12) {
  const q = normalize(query);
  if (q.length < 2) return [];
  const cacheKey = `${q}:${limit}`;
  const cached = searchCache.get(cacheKey);
  if (cached) return cached;

  const matches: IndexedCity[] = [];
  for (let i = 0; i < indexedCities.length; i++) {
    const item = indexedCities[i];
    if (item.normFull.includes(q)) matches.push(item);
  }
  matches.sort((a, b) =>
    Number(b.normName.startsWith(q)) - Number(a.normName.startsWith(q)) ||
    a.city.name.localeCompare(b.city.name, 'pt-BR')
  );
  const result = matches.slice(0, limit).map(m => m.city);
  if (searchCache.size > 250) searchCache.clear();
  searchCache.set(cacheKey, result);
  return result;
}

export function parseCity(comment: string): City | null {
  const text = ' ' + normalize(comment.replace(/@[\w.]+/g, '')) + ' ';
  if (text.length <= 2) return null;

  let max = 0;
  const matches: IndexedCity[] = [];
  for (let i = 0; i < indexedCities.length; i++) {
    const item = indexedCities[i];
    if (text.includes(item.paddedName)) {
      matches.push(item);
      if (item.nameLen > max) max = item.nameLen;
    }
  }
  if (!matches.length) return null;

  const longest = matches.filter(c => c.nameLen === max);
  const qualified = longest.filter(c => text.includes(` ${c.ufLower} `) || text.includes(` ${c.normState} `));
  if (qualified.length === 1) return qualified[0].city;
  if (qualified.length > 1) return null;

  const words = normalize(comment).split(' ');
  if (words.some(w => allUfs.has(w))) return null;
  return longest.length === 1 ? longest[0].city : null;
}

export function validUsername(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const name = input.trim().replace(/^@/, '').toLowerCase();
  return /^[a-z0-9_](?:[a-z0-9_.]{0,28}[a-z0-9_])?$/.test(name) && !name.includes('..') ? name : null;
}
