import { admin, sameOrigin, body, database, insertHouse, cities, validUsername, json } from '../../../lib/server';
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
export async function DELETE(request: Request) {
  if (!admin(request) || !sameOrigin(request)) return json({error:'Acesso restrito ao administrador.'},403);
  try {
    const input = await body(request); const id = Number(input.id);
    if (!Number.isSafeInteger(id) || id < 1) return json({error:'Casa inválida.'},400);
    const found = await database().prepare('SELECT actor FROM houses WHERE id=?').bind(id).first<{actor:string}>();
    if (!found) return json({error:'Casa não encontrada.'},404);
    await database().batch([
      database().prepare("UPDATE events SET status='removed' WHERE actor=?").bind(found.actor),
      database().prepare('DELETE FROM houses WHERE id=?').bind(id),
    ]);
    return json({ok:true});
  } catch { return json({error:'Não foi possível remover a casa.'},400); }
}
