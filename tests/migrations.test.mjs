import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const original=readFileSync('drizzle/0000_parallel_patriot.sql','utf8');
const upgrade=readFileSync('drizzle/0001_kind_gertrude_yorkes.sql','utf8');

test('upgrading the published schema preserves residents and creates interaction indexes',()=>{
  const db=new DatabaseSync(':memory:');db.exec(original);
  db.exec("INSERT INTO houses(username,actor,city_id,source,created_at) VALUES('preservado','test:1',2927408,'manual','2026-10-01');");
  db.exec(upgrade);
  assert.equal(db.prepare('SELECT username FROM houses').get().username,'preservado');
  assert.equal(db.prepare('SELECT city_id FROM houses').get().city_id,2927408);
  const indexes=db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='city_acts'").all().map(r=>r.name);
  assert.ok(indexes.includes('city_acts_city_idx'));assert.ok(indexes.includes('city_acts_user_idx'));assert.ok(indexes.includes('city_acts_ref_id_unique'));
  db.close();
});

test('upgrading a local prototype that already created city_acts preserves its interactions',()=>{
  const db=new DatabaseSync(':memory:');db.exec(original);
  db.exec('CREATE TABLE city_acts(id integer PRIMARY KEY AUTOINCREMENT,username text NOT NULL,city_id integer NOT NULL,act_type text NOT NULL,label text NOT NULL,points integer NOT NULL,ref_id text UNIQUE,created_at text NOT NULL);');
  db.exec("INSERT INTO city_acts(username,city_id,act_type,label,points,ref_id,created_at) VALUES('preservado',2927408,'cheer','Teste',15,'fixture','2026-10-01');");
  db.exec(upgrade);db.exec(upgrade);
  assert.equal(db.prepare('SELECT SUM(points) AS points FROM city_acts').get().points,15);
  assert.throws(()=>db.exec("INSERT INTO city_acts(username,city_id,act_type,label,points,ref_id,created_at) VALUES('outro',2927408,'cheer','Duplicado',15,'fixture','2026-10-01');"),/UNIQUE/);
  db.close();
});
