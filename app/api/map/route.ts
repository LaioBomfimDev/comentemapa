import { ensureActsTable, json, connectionStatus, cities, admin, type BuildingType, type CityRole } from '../../../lib/server';

const cityById = new Map(cities.map(c => [c.id, c]));

function resolveBuilding(role: CityRole, points: number): { building: BuildingType; buildingTitle: string } {
  if (role === 'mayor' && points >= 320) return { building: 'metropole', buildingTitle: 'Castelo Metrópole' };
  if (role === 'mayor' || points >= 280) return { building: 'prefeitura', buildingTitle: 'Palácio da Prefeitura' };
  if (role === 'vice_mayor' || points >= 210) return { building: 'edificio', buildingTitle: 'Edifício Solar' };
  if (role === 'councillor' || role === 'architect' || points >= 145) return { building: 'vila', buildingTitle: 'Vila Florida' };
  return { building: 'chale', buildingTitle: 'Chalé Aconchegante' };
}

function resolveRole(rank: number, points: number): { role: CityRole; roleTitle: string } {
  if (rank === 1) return { role: 'mayor', roleTitle: 'Prefeito(a)' };
  if (rank === 2) return { role: 'vice_mayor', roleTitle: 'Vice-Prefeito(a)' };
  if (rank === 3) return { role: 'councillor', roleTitle: 'Vereador(a)' };
  if (rank <= 5 || points >= 180) return { role: 'architect', roleTitle: 'Mestre de Obras' };
  return { role: 'citizen', roleTitle: 'Cidadão(ã)' };
}

export async function GET(request: Request) {
  try {
    const db = await ensureActsTable();
    const rows = await db.prepare('SELECT id,username,city_id,source,created_at FROM houses ORDER BY id').all();
    const actTotals = await db.prepare('SELECT username, COALESCE(SUM(points),0) AS extra_points, COUNT(*) AS acts_count, COALESCE(MAX(id),0) AS max_id FROM city_acts GROUP BY username').all();
    const recentActsRows = await db.prepare('SELECT id,username,city_id,act_type,label,points,created_at FROM city_acts ORDER BY id DESC LIMIT 40').all();

    const canEdit = admin(request);
    const connection = connectionStatus();
    const rawResults = rows.results;
    const rawActs = actTotals.results;

    let totalActsCount = 0;
    let maxActId = 0;
    const userStats = new Map<string, { extraPoints: number; actsCount: number }>();
    for (const a of rawActs) {
      const ep = Number(a.extra_points || 0);
      const ac = Number(a.acts_count || 0);
      const mid = Number(a.max_id || 0);
      totalActsCount += ac;
      if (mid > maxActId) maxActId = mid;
      userStats.set(String(a.username), { extraPoints: ep, actsCount: ac });
    }

    const lastId = rawResults.length ? rawResults[rawResults.length - 1].id : 0;
    const firstId = rawResults.length ? rawResults[0].id : 0;
    const etag = `W/"${rawResults.length}-${firstId}-${lastId}-${totalActsCount}-${maxActId}-${canEdit ? 1 : 0}-${connection.configured ? 1 : 0}"`;
    if (request.headers.get('if-none-match') === etag) {
      return new Response(null, { status: 304, headers: { ETag: etag, 'Cache-Control': 'no-store' } });
    }

    const occupied = new Set<number>();
    const prelimHouses = rawResults.map(r => {
      const cityId = r.city_id as number;
      const city = cityById.get(cityId);
      const founder = !occupied.has(cityId);
      occupied.add(cityId);
      const uname = String(r.username);
      const stat = userStats.get(uname);
      const basePoints = founder ? 150 : 100;
      const points = basePoints + (stat?.extraPoints || 0);
      const actsCount = 1 + (stat?.actsCount || 0);
      return {
        id: Number(r.id),
        username: uname,
        city,
        founder,
        source: String(r.source),
        createdAt: String(r.created_at),
        points,
        actsCount,
      };
    }).filter(h => h.city);

    // Group by city to compute Hall of Fame ranking (points DESC, id ASC)
    const byCity = new Map<number, typeof prelimHouses>();
    for (const h of prelimHouses) {
      const cid = h.city!.id;
      if (!byCity.has(cid)) byCity.set(cid, []);
      byCity.get(cid)!.push(h);
    }

    const roleByHouseId = new Map<number, { rank: number; role: CityRole; roleTitle: string; building: BuildingType; buildingTitle: string }>();
    for (const list of byCity.values()) {
      const sorted = [...list].sort((a, b) => b.points - a.points || a.id - b.id);
      sorted.forEach((item, idx) => {
        const rank = idx + 1;
        const { role, roleTitle } = resolveRole(rank, item.points);
        const { building, buildingTitle } = resolveBuilding(role, item.points);
        roleByHouseId.set(item.id, { rank, role, roleTitle, building, buildingTitle });
      });
    }

    const houses = prelimHouses.map(h => {
      const meta = roleByHouseId.get(h.id)!;
      return { ...h, ...meta };
    });

    const recentActs = recentActsRows.results.map(a => ({
      id: Number(a.id),
      username: String(a.username),
      cityId: Number(a.city_id),
      actType: String(a.act_type),
      label: String(a.label),
      points: Number(a.points),
      createdAt: String(a.created_at),
    }));

    return Response.json(
      { houses, recentActs, totalCities: cities.length, connection, canEdit },
      { headers: { ETag: etag, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } }
    );
  } catch {
    return json({ error: 'Não foi possível carregar as casas. Tente novamente.' }, 503);
  }
}
