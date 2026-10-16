import { admin, json, database, body, sameOrigin, cities, parseCity, connectionStatus } from '../../../lib/server';
export async function GET(request: Request) {
  if (!admin(request)) return json({error:'Acesso restrito.'},403);
  const pending = await database().prepare("SELECT id,username,comment,created_at FROM events WHERE status='pending' ORDER BY created_at LIMIT 100").all();
  return json({ pending:pending.results, connection:connectionStatus() });
}
export async function POST(request: Request) {
  if (!admin(request) || !sameOrigin(request)) return json({error:'Acesso restrito.'},403);
  try {
    const input = await body(request);
    if (input.action==='parse') return json({city:parseCity(String(input.text || '').slice(0,2200))});
    const city = cities.find(c=>c.id===Number(input.cityId));
    if (!city || typeof input.eventId !== 'string') return json({error:'Selecione uma cidade válida.'},400);
    const db = database();
    await db.batch([
      db.prepare("INSERT OR IGNORE INTO houses (username,actor,city_id,source,created_at) SELECT username,actor,?,'instagram',created_at FROM events WHERE id=? AND status='pending'").bind(city.id,input.eventId),
      db.prepare("UPDATE events SET status='accepted' WHERE id=? AND status='pending'").bind(input.eventId),
    ]);
    return json({ok:true});
  } catch { return json({error:'Não foi possível processar esse comentário.'},400); }
}
