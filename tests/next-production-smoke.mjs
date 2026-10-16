import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const base = new URL(process.argv[2] || 'http://127.0.0.1:5178');
assert.equal(base.hostname, '127.0.0.1', 'Run against the local production build only');
const manifest = JSON.parse(readFileSync('.next/routes-manifest.json', 'utf8'));
assert.equal(manifest.version, 3);
const mapResponse = await fetch(new URL('/api/map', base));
assert.equal(mapResponse.status, 200);
const map = await mapResponse.json();
assert.deepEqual(map.houses, []);
assert.equal(map.storage.mode, 'demo');
assert.equal(map.canEdit, false);
assert.equal(map.adminMode, 'api-token');
assert.equal(map.connection.configured, false);
const cities = await (await fetch(new URL('/api/cities?q=Salvador', base))).json();
assert.equal(cities.some(c => c.id === 2927408), true);
const forgedHeaders = { 'oai-authenticated-user-id': 'owner' };
assert.equal((await fetch(new URL('/api/admin', base), { headers: forgedHeaders })).status, 403);
assert.equal((await fetch(new URL('/api/houses', base), { method: 'PATCH', headers: forgedHeaders, body: '{}' })).status, 403);
assert.equal((await fetch(new URL('/api/instagram/webhook', base), { method: 'POST', body: '{}' })).status, 503);
for (const route of ['/?cidade=salvador', '/modelos', '/brazil-geometry.json', '/models/prefeitura.glb', '/models/imoveis-3d.zip']) {
  const response = await fetch(new URL(route, base));
  assert.equal(response.status, 200, route);
  if (route.endsWith('.glb')) assert.equal(Buffer.from(await response.arrayBuffer()).subarray(0, 4).toString(), 'glTF');
  if (route.endsWith('.zip')) assert.equal(Buffer.from(await response.arrayBuffer()).readUInt32LE(), 0x04034b50);
}
console.log('Next.js production smoke passed: manifest, map demo, city search, authorization, disabled webhook, gallery and 3D downloads.');
