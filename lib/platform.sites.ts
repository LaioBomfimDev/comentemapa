import { env } from 'cloudflare:workers';
import type { MapDatabase } from './database-contract';

export const config = () => env as unknown as Record<string, string | undefined>;
export const adminMode = 'sites';
export const storageStatus = () => ({ configured: !!env.DB, mode: env.DB ? 'ready' : 'incomplete' });
export function database(): MapDatabase {
  if (!env.DB) throw new Error('Banco indisponível');
  return env.DB as unknown as MapDatabase;
}
export function admin(request: Request) {
  const user = request.headers.get('oai-authenticated-user-id');
  const owner = config().MAP_ADMIN_USER_ID;
  // Only this adapter runs behind Sites' trusted authentication boundary.
  return !!user && (owner ? user === owner : true);
}
