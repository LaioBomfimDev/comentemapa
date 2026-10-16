import { env } from 'cloudflare:workers';
import { cities, parseCity, validUsername } from './cities';
export const config = () => env as unknown as Record<string, string | undefined>;
export function database() { if (!env.DB) throw new Error('Banco indisponível'); return env.DB; }
export const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
export function admin(request: Request) {
  const user = request.headers.get('oai-authenticated-user-id');
  const owner = config().MAP_ADMIN_USER_ID;
  // Without an explicit owner, the Sites owner-private boundary authorizes editing.
  return !!user && (owner ? user === owner : true);
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}
export async function body(request: Request) {
  if (Number(request.headers.get('content-length') || 0) > 32768) throw new Error('Corpo muito grande');
  const raw = await request.text();
  if (raw.length > 32768) throw new Error('Corpo muito grande');
  return JSON.parse(raw);
}
export function connectionStatus() {
  const e = config();
  const required = ['INSTAGRAM_APP_SECRET','INSTAGRAM_VERIFY_TOKEN','INSTAGRAM_ACCOUNT_ID','INSTAGRAM_MEDIA_IDS'];
  return { configured: required.every(key=>!!e[key]), missing: required.filter(key=>!e[key]), profile: e.INSTAGRAM_PROFILE || null, callback: '/api/instagram/webhook' };
}
export async function insertHouse(username: string, cityId: number, actor: string, source: string) {
  const db = database();
  const result = await db.prepare('INSERT OR IGNORE INTO houses (username,actor,city_id,source,created_at) VALUES (?,?,?,?,?)')
    .bind(username, actor, cityId, source, new Date().toISOString()).run();
  return result.meta.changes;
}
export async function ingestComment(event: { id:string; actor:string; username:string; text:string }) {
  const db = database();
  const name = validUsername(event.username);
  if (!name || !event.id || !event.actor) return 'ignored';
  const city = parseCity(event.text);
  const statements = [db.prepare('INSERT OR IGNORE INTO events (id,actor,username,comment,status,created_at) VALUES (?,?,?,?,?,?)')
    .bind(event.id,event.actor,name,event.text.slice(0,2200),city ? 'accepted' : 'pending',new Date().toISOString())];
  if (city) statements.push(db.prepare(`INSERT OR IGNORE INTO houses (username,actor,city_id,source,created_at)
    SELECT username,actor,?,'instagram',created_at FROM events WHERE id=? AND status='accepted'`).bind(city.id,event.id));
  await db.batch(statements);
  return city ? 'accepted' : 'pending';
}
export async function verifySignature(raw: string, signature: string | null, secret: string) {
  if (!signature || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  const key = await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  const bytes = Uint8Array.from(signature.slice(7).match(/../g)!,h=>parseInt(h,16));
  return crypto.subtle.verify('HMAC',key,bytes,new TextEncoder().encode(raw));
}
export { cities, validUsername, parseCity };
