import { timingSafeEqual } from 'node:crypto';
import { createD1HttpDatabase } from './d1-http';

export const config = () => process.env;
const databaseKeys = ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_D1_DATABASE_ID', 'CLOUDFLARE_D1_API_TOKEN'] as const;
export function storageStatus() {
  const present = databaseKeys.filter(key => !!config()[key]);
  return { configured: present.length === databaseKeys.length, mode: present.length === 0 ? 'demo' : present.length === databaseKeys.length ? 'ready' : 'incomplete' };
}
export function database() {
  if (!storageStatus().configured) throw new Error('Configure o banco D1 nas variáveis de ambiente.');
  const e = config();
  return createD1HttpDatabase({ accountId: e.CLOUDFLARE_ACCOUNT_ID!, databaseId: e.CLOUDFLARE_D1_DATABASE_ID!, token: e.CLOUDFLARE_D1_API_TOKEN! });
}
export const adminMode = 'api-token';
export function admin(request: Request) {
  const token = config().MAP_ADMIN_TOKEN;
  // Sites identity headers are untrusted input on a public Vercel deployment.
  if (!token || token.length < 32) return false;
  const provided = Buffer.from(request.headers.get('authorization') || '');
  const expected = Buffer.from(`Bearer ${token}`);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
