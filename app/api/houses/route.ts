import { admin, sameOrigin, body, database, insertHouse, recordAct, cities, validUsername, json } from '../../../lib/server';

const ACT_CATALOG: Record<string, { points: number; label: string }> = {
  cheer: { points: 15, label: 'Recebeu aplausos para Prefeito no mapa (+15 pts)' },
  build: { points: 25, label: 'Mutirão de obras para evoluir prédio (+25 pts)' },
  invite: { points: 20, label: 'Compartilhou convite da cidade (+20 pts)' },
};

export async function POST(request: Request) {
  if (!admin(request) || !sameOrigin(request)) return json({error:'Entre como administrador para adicionar casas.'},403);
  try {
    const input = await body(request); const username = validUsername(input.username);
    const city = cities.find(c=>c.id===Number(input.cityId));
    if (!username || !city) return json({error:'Informe um @ válido e selecione uma cidade da lista.'},400);
    const added = await insertHouse(username,city.id,'manual:'+username,'manual');
    if (!added) return json({error:'Esse perfil já tem uma casa no mapa.'},409);
    return json({ok:true},201);
  } catch { return json({error:'Não foi possível salvar a casa. Tente novamente.'},400); }
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'Origem não autorizada.' }, 403);
  try {
    const input = await body(request);
    const actKey = String(input.actType || 'cheer');
    const actDef = ACT_CATALOG[actKey];
    if (!actDef) return json({ error: 'Ato inválido.' }, 400);

    const db = database();
    let target: { id: number; username: string; city_id: number } | null = null;
    if (input.id) {
      target = await db.prepare('SELECT id,username,city_id FROM houses WHERE id=?').bind(Number(input.id)).first();
    } else if (input.cityId) {
      target = await db.prepare('SELECT id,username,city_id FROM houses WHERE city_id=? ORDER BY id LIMIT 1').bind(Number(input.cityId)).first();
    }
    if (!target) return json({ error: 'Morador não encontrado.' }, 404);

    await recordAct(target.username, target.city_id, actKey, actDef.label, actDef.points, null);
    return json({ ok: true, pointsAdded: actDef.points, username: target.username, actType: actKey });
  } catch {
    return json({ error: 'Não foi possível registrar a interação.' }, 400);
  }
}

export async function DELETE(request: Request) {
  if (!admin(request) || !sameOrigin(request)) return json({error:'Acesso restrito ao administrador.'},403);
  try {
    const input = await body(request); const id = Number(input.id);
    if (!Number.isSafeInteger(id) || id < 1) return json({error:'Casa inválida.'},400);
    const db = database();
    const found = await db.prepare('SELECT actor,username FROM houses WHERE id=?').bind(id).first<{actor:string;username:string}>();
    if (!found) return json({error:'Casa não encontrada.'},404);
    await db.batch([
      db.prepare("UPDATE events SET status='removed' WHERE actor=?").bind(found.actor),
      db.prepare('DELETE FROM city_acts WHERE username=?').bind(found.username),
      db.prepare('DELETE FROM houses WHERE id=?').bind(id),
    ]);
    return json({ok:true});
  } catch { return json({error:'Não foi possível remover a casa.'},400); }
}
