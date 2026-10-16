import { database, json, connectionStatus, cities, admin } from '../../../lib/server';
const cityById = new Map(cities.map(c=>[c.id,c]));
export async function GET(request: Request) {
  try {
    const rows = await database().prepare('SELECT id,username,city_id,source,created_at FROM houses ORDER BY id').all();
    const occupied = new Set<number>();
    const houses = rows.results.map(r=>{
      const city = cityById.get(r.city_id as number);
      const founder = !occupied.has(r.city_id as number); occupied.add(r.city_id as number);
      return { id:r.id,username:r.username,city,founder,source:r.source,createdAt:r.created_at };
    }).filter(h=>h.city);
    return json({ houses, totalCities:cities.length, connection:connectionStatus(), canEdit:admin(request) });
  } catch { return json({error:'Não foi possível carregar as casas. Tente novamente.'},503); }
}
