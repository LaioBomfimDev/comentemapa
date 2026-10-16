import { env } from 'cloudflare:workers';
import { cities, parseCity, validUsername } from './cities';

export type BuildingType = 'chale' | 'vila' | 'prefeitura' | 'edificio' | 'metropole';
export type CityRole = 'mayor' | 'vice_mayor' | 'councillor' | 'architect' | 'citizen';

export const config = () => env as unknown as Record<string, string | undefined>;
export function database() { if (!env.DB) throw new Error('Banco indisponível'); return env.DB; }
export const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });

let actsTableReady = false;
export async function ensureActsTable() {
  const db = database();
  if (actsTableReady) return db;
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS city_acts (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      username text NOT NULL,
      city_id integer NOT NULL,
      act_type text NOT NULL,
      label text NOT NULL,
      points integer NOT NULL,
      ref_id text UNIQUE,
      created_at text NOT NULL
    )`).run();
    actsTableReady = true;
  } catch {
    // Ignore if already exists or read-only
  }
  return db;
}

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
  const db = await ensureActsTable();
  const now = new Date().toISOString();
  const result = await db.prepare('INSERT OR IGNORE INTO houses (username,actor,city_id,source,created_at) VALUES (?,?,?,?,?)')
    .bind(username, actor, cityId, source, now).run();
  return result.meta.changes;
}
export async function recordAct(username: string, cityId: number, actType: string, label: string, points: number, refId: string | null = null) {
  const db = await ensureActsTable();
  const now = new Date().toISOString();
  const res = await db.prepare(
    'INSERT OR IGNORE INTO city_acts (username,city_id,act_type,label,points,ref_id,created_at) VALUES (?,?,?,?,?,?,?)'
  ).bind(username, cityId, actType, label, points, refId, now).run();
  return res.meta.changes;
}
export async function ingestComment(event: { id:string; actor:string; username:string; text:string }) {
  const db = await ensureActsTable();
  const name = validUsername(event.username);
  if (!name || !event.id || !event.actor) return 'ignored';

  const alreadySeen = await db.prepare('SELECT status FROM events WHERE id=?').bind(event.id).first<{ status: string }>();
  if (alreadySeen) return alreadySeen.status;

  const now = new Date().toISOString();
  const mentions = (event.text.match(/@[\w.]+/g) || []).filter(m => validUsername(m) !== name).length;
  const mentionBonus = Math.min(75, mentions * 15);

  const existingHouse = await db.prepare('SELECT id,username,city_id FROM houses WHERE actor=? OR username=?')
    .bind(event.actor, name)
    .first<{ id: number; username: string; city_id: number }>();

  const city = parseCity(event.text);

  if (existingHouse) {

    // Resident already has a house: award engagement points for new comment / tagging friends!
    const pts = 30 + mentionBonus;
    const label = mentionBonus > 0
      ? `Comentou e marcou ${mentions} amigo(s) no Instagram (+${pts} pts)`
      : `Comentou apoiando a cidade no Instagram (+${pts} pts)`;
    await db.batch([
      db.prepare('INSERT OR IGNORE INTO events (id,actor,username,comment,status,created_at) VALUES (?,?,?,?,?,?)')
        .bind(event.id, event.actor, existingHouse.username, event.text.slice(0, 2200), 'accepted', now),
      db.prepare('INSERT OR IGNORE INTO city_acts (username,city_id,act_type,label,points,ref_id,created_at) VALUES (?,?,?,?,?,?,?)')
        .bind(existingHouse.username, existingHouse.city_id, 'instagram_comment', label, pts, 'ig_comment:' + event.id, now),
    ]);
    return 'accepted';
  }

  const statements = [
    db.prepare('INSERT OR IGNORE INTO events (id,actor,username,comment,status,created_at) VALUES (?,?,?,?,?,?)')
      .bind(event.id, event.actor, name, event.text.slice(0, 2200), city ? 'accepted' : 'pending', now),
  ];
  if (city) {
    statements.push(
      db.prepare(`INSERT OR IGNORE INTO houses (username,actor,city_id,source,created_at)
        SELECT username,actor,?,'instagram',created_at FROM events WHERE id=? AND status='accepted'`)
        .bind(city.id, event.id)
    );
    if (mentionBonus > 0) {
      statements.push(
        db.prepare('INSERT OR IGNORE INTO city_acts (username,city_id,act_type,label,points,ref_id,created_at) VALUES (?,?,?,?,?,?,?)')
          .bind(name, city.id, 'instagram_mention', `Marcou ${mentions} amigo(s) na chegada (+${mentionBonus} pts)`, mentionBonus, 'ig_mention:' + event.id, now)
      );
    }
  }
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
