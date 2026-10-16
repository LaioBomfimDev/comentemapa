import data from '../data/cities.json';
export type City = { id: number; name: string; uf: string; state: string; lat: number; lng: number };
export const cities: City[] = data;
export function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}
export function searchCities(query: string, limit = 12) {
  const q = normalize(query);
  if (q.length < 2) return [];
  return cities.filter(c => normalize(`${c.name} ${c.uf}`).includes(q)).sort((a,b) => Number(normalize(b.name).startsWith(q)) - Number(normalize(a.name).startsWith(q)) || a.name.localeCompare(b.name, 'pt-BR')).slice(0, limit);
}
export function parseCity(comment: string): City | null {
  const text = ' ' + normalize(comment.replace(/@[\w.]+/g, '')) + ' ';
  const matches = cities.filter(c => text.includes(' ' + normalize(c.name) + ' '));
  if (!matches.length) return null;
  const max = Math.max(...matches.map(c => normalize(c.name).length));
  const longest = matches.filter(c => normalize(c.name).length === max);
  const qualified = longest.filter(c => text.includes(' ' + c.uf.toLowerCase() + ' ') || text.includes(' ' + normalize(c.state) + ' '));
  if (qualified.length === 1) return qualified[0];
  if (qualified.length > 1) return null;
  const ufs = new Set(cities.map(c=>c.uf.toLowerCase()));
  const words = normalize(comment).split(' ');
  if (words.some(w=>ufs.has(w))) return null;
  return longest.length === 1 ? longest[0] : null;
}
export function validUsername(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const name = input.trim().replace(/^@/, '').toLowerCase();
  return /^[a-z0-9_](?:[a-z0-9_.]{0,28}[a-z0-9_])?$/.test(name) && !name.includes('..') ? name : null;
}
