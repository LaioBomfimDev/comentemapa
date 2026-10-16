import { config, json, verifySignature, ingestComment, connectionStatus } from '../../../../lib/server';
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const token = config().INSTAGRAM_VERIFY_TOKEN;
  if (token && query.get('hub.mode') === 'subscribe' && query.get('hub.verify_token') === token)
    return new Response(query.get('hub.challenge') || '',{headers:{'Cache-Control':'no-store'}});
  return json({error:'Verificação não autorizada.'},403);
}
export async function POST(request: Request) {
  const e = config();
  if (!connectionStatus().configured) return json({error:'Integração ainda não configurada.'},503);
  if (Number(request.headers.get('content-length') || 0)>262144) return json({error:'Limite excedido.'},413);
  const raw = await request.text();
  if (raw.length>262144) return json({error:'Limite excedido.'},413);
  if (!await verifySignature(raw,request.headers.get('x-hub-signature-256'),e.INSTAGRAM_APP_SECRET!)) return json({error:'Assinatura inválida.'},401);
  let payload;
  try { payload = JSON.parse(raw); } catch { return json({error:'JSON inválido.'},400); }
  if (payload.object !== 'instagram' || !Array.isArray(payload.entry)) return json({received:true});
  const media = new Set(e.INSTAGRAM_MEDIA_IDS!.split(',').map(s=>s.trim()).filter(Boolean));
  try {
    for (const entry of payload.entry) {
      if (String(entry.id)!==e.INSTAGRAM_ACCOUNT_ID || !Array.isArray(entry.changes)) continue;
      for (const change of entry.changes) {
        if (change.field!=='comments') continue;
        const v = change.value;
        if (!v || !media.has(String(v.media?.id)) || v.parent_id || v.verb==='remove' || v.verb==='delete') continue;
        if (typeof v.text!=='string' || !v.id || !v.from?.id || typeof v.from?.username!=='string') continue;
        await ingestComment({id:String(v.id),actor:'instagram:'+String(v.from.id),username:v.from.username,text:v.text});
      }
    }
    return json({received:true});
  } catch { return json({error:'Falha temporária ao salvar o evento.'},503); }
}
