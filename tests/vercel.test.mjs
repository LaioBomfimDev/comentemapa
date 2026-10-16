import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

mkdirSync('work', { recursive: true });
await build({ stdin: { contents: `export * from './lib/d1-http'; export * from './lib/platform'; export * as map from './app/api/map/route'; export * as houses from './app/api/houses/route';`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', outfile: 'work/test-vercel.mjs' });
const app = await import(pathToFileURL(path.resolve('work/test-vercel.mjs')));
const credentials = { accountId: 'account-test', databaseId: 'db-test', token: 'test-only-token' };
const ok = (results = [], changes = 0) => ({ success: true, results, meta: { changes } });
const response = result => Response.json({ success: true, result });

test('D1 HTTP preserves SQL parameters, first/all results and changes', async () => {
  const calls = [];
  const db = app.createD1HttpDatabase(credentials, async (url, options) => {
    calls.push({ url, ...options, input: JSON.parse(options.body) });
    return response([ok([{ username: 'test_resident', city_id: 2927408 }], 1)]);
  });
  const statement = db.prepare('SELECT username,city_id FROM houses WHERE city_id=?').bind(2927408);
  assert.equal((await statement.first()).username, 'test_resident');
  assert.equal((await statement.all()).results[0].city_id, 2927408);
  assert.equal((await statement.run()).meta.changes, 1);
  assert.deepEqual(calls[0].input.params, [2927408]);
  assert.equal(calls[0].headers.Authorization, 'Bearer test-only-token');
  assert.equal(calls[0].url, 'https://api.cloudflare.com/client/v4/accounts/account-test/d1/database/db-test/query');
  assert.equal(calls[0].cache, 'no-store');
  assert.equal(calls[0].redirect, 'error');
});
test('D1 batch is sent as one request, with separate parameter lists', async () => {
  let calls = 0;
  const db = app.createD1HttpDatabase(credentials, async (_, options) => {
    calls++;
    assert.deepEqual(JSON.parse(options.body), { batch: [{ sql: 'INSERT A VALUES (?)', params: ['x'] }, { sql: 'INSERT B VALUES (?)', params: [2] }] });
    return response([ok([], 1), ok([], 1)]);
  });
  const result = await db.batch([db.prepare('INSERT A VALUES (?)').bind('x'), db.prepare('INSERT B VALUES (?)').bind(2)]);
  assert.equal(calls, 1);
  assert.deepEqual(result.map(r => r.meta.changes), [1, 1]);
});
test('Empty query returns null and empty batch does not contact Cloudflare', async () => {
  let calls = 0;
  const db = app.createD1HttpDatabase(credentials, async () => { calls++; return response([ok()]); });
  assert.equal(await db.prepare('SELECT * FROM houses').first(), null);
  assert.deepEqual(await db.batch([]), []);
  assert.equal(calls, 1);
});
test('HTTP, API and incomplete batch failures never become successful writes', async () => {
  for (const result of [new Response('secret provider text', { status: 403 }), Response.json({ success: false, result: [ok()] }), response([{ success: false }]), response([])]) {
    const db = app.createD1HttpDatabase(credentials, async () => result);
    await assert.rejects(db.prepare('INSERT INTO houses VALUES (?)').bind('x').run(), error => !error.message.includes('secret') && /D1/.test(error.message));
  }
});
test('Vercel requires a strong bearer token and rejects forged Sites headers', () => {
  const previous = process.env.MAP_ADMIN_TOKEN;
  try {
    delete process.env.MAP_ADMIN_TOKEN;
    const forged = new Request('https://example.test/api/admin', { headers: { 'oai-authenticated-user-id': 'owner' } });
    assert.equal(app.admin(forged), false);
    process.env.MAP_ADMIN_TOKEN = 'short';
    assert.equal(app.admin(new Request(forged, { headers: { authorization: 'Bearer short' } })), false);
    process.env.MAP_ADMIN_TOKEN = 'test-only-admin-token-with-32-characters';
    assert.equal(app.admin(new Request(forged, { headers: { authorization: `Bearer ${process.env.MAP_ADMIN_TOKEN}` } })), true);
    assert.equal(app.admin(forged), false);
  } finally { if (previous === undefined) delete process.env.MAP_ADMIN_TOKEN; else process.env.MAP_ADMIN_TOKEN = previous; }
});
test('Fresh Vercel map opens as an explicit demo and rejects writes; partial setup returns 503', async () => {
  const keys = ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_D1_DATABASE_ID', 'CLOUDFLARE_D1_API_TOKEN'];
  const previous = keys.map(key => process.env[key]);
  try {
    for (const key of keys) delete process.env[key];
    const request = new Request('https://example.test/api/map');
    const result = await app.map.GET(request);
    assert.equal(result.status, 200);
    const data = await result.json();
    assert.deepEqual(data.houses, []);
    assert.equal(data.storage.mode, 'demo');
    assert.equal(data.canEdit, false);
    assert.equal(data.adminMode, 'api-token');
    assert.equal((await app.houses.POST(new Request('https://example.test/api/houses', { method: 'POST' }))).status, 403);
    process.env.CLOUDFLARE_ACCOUNT_ID = 'incomplete-test-config';
    assert.equal((await app.map.GET(request)).status, 503);
  } finally { keys.forEach((key, i) => { if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i]; }); }
});
