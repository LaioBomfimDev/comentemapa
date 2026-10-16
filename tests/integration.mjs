import { build } from 'esbuild';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { createHmac, randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

mkdirSync('work',{recursive:true});
const vercel = process.argv.includes('--vercel');
const bundle = `work/test-bundle-${vercel ? 'vercel' : 'sites'}.mjs`;
await build({stdin:{contents:`export * as map from './app/api/map/route'; export * as houses from './app/api/houses/route'; export * as admin from './app/api/admin/route'; export * as webhook from './app/api/instagram/webhook/route'; export * from './lib/cities';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',outfile:bundle,plugins:vercel?[]:[{name:'test-env',setup(b){b.onResolve({filter:/^@\/lib\/platform$/},()=>({path:path.resolve('lib/platform.sites.ts')}));b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const env = globalThis.__mapTestEnv;'}));}}]});
const sqlite=new DatabaseSync(':memory:');
for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort()) sqlite.exec(readFileSync('drizzle/'+file,'utf8'));
class Statement {
  constructor(sql,args=[]){this.sql=sql;this.args=args;}
  bind(...args){return new Statement(this.sql,args);}
  async run(){const result=sqlite.prepare(this.sql).run(...this.args);return {meta:{changes:Number(result.changes)}};}
  async all(){return {results:sqlite.prepare(this.sql).all(...this.args)};}
  async first(){return sqlite.prepare(this.sql).get(...this.args)||null;}
}
const db={prepare(sql){return new Statement(sql);},async batch(statements){sqlite.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
const secret=randomBytes(32).toString('hex');
globalThis.__mapTestEnv={DB:db,INSTAGRAM_APP_SECRET:secret,INSTAGRAM_VERIFY_TOKEN:randomBytes(24).toString('hex'),INSTAGRAM_ACCOUNT_ID:'account-test',INSTAGRAM_MEDIA_IDS:'media-test'};
const adminToken = randomBytes(32).toString('hex');
if (vercel) {
  Object.assign(process.env, Object.fromEntries(Object.entries(globalThis.__mapTestEnv).filter(([, value]) => typeof value === 'string')), {
    MAP_ADMIN_TOKEN: adminToken, CLOUDFLARE_ACCOUNT_ID: 'account-test', CLOUDFLARE_D1_DATABASE_ID: 'db-test', CLOUDFLARE_D1_API_TOKEN: 'isolated-test-token',
  });
  // Exercise the actual Node/D1 HTTP adapter; every query stays in isolated SQLite.
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.cloudflare.com/client/v4/accounts/account-test/d1/database/db-test/query');
    assert.equal(options.headers.Authorization, 'Bearer isolated-test-token');
    const input = JSON.parse(options.body), queries = input.batch || [input];
    sqlite.exec('BEGIN');
    try {
      const result = queries.map(({ sql, params }) => {
        const statement = sqlite.prepare(sql);
        if (/^\s*SELECT\b/i.test(sql)) return { success: true, results: statement.all(...params), meta: { changes: 0 } };
        const result = statement.run(...params);
        return { success: true, results: [], meta: { changes: Number(result.changes) } };
      });
      sqlite.exec('COMMIT');
      return Response.json({ success: true, result });
    } catch {
      sqlite.exec('ROLLBACK');
      return Response.json({ success: false, result: [] }, { status: 400 });
    }
  };
}
const app=await import(pathToFileURL(path.resolve(bundle)));
let checks=0;
const check=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);checks++;};
const req=(url,method='GET',body,auth=true)=>new Request('https://map.test'+url,{method,headers:{...(auth?(vercel?{authorization:`Bearer ${adminToken}`}:{'oai-authenticated-user-id':'owner'}):{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
check((await (await app.map.GET(req('/api/map'))).json()).houses.length,0,'Map starts empty');
check(app.parseCity('@alguem São Paulo SP')?.id,3550308,'Accent and profile handling');
check(app.parseCity('sao paulo sp')?.id,3550308,'No-accent city');
check(app.parseCity('Bauru SP')?.name,'Bauru','City with UF');
check(app.parseCity('Bom Jesus'),null,'Ambiguous town stays pending');
check(app.parseCity('Bauru RJ'),null,'Contradictory UF rejected');
check(app.parseCity('nenhuma cidade aqui'),null,'Unrecognized comment stays pending');
check(app.validUsername('<script>'),null,'Invalid username rejected');
check(app.validUsername('@Teste.Casa'),'teste.casa','Username normalization');
check((await app.houses.POST(req('/api/houses','POST',{username:'test_a',cityId:3550308},false))).status,403,'Anonymous writes rejected');
check((await app.houses.POST(new Request('https://map.test/api/houses',{method:'POST',headers:{...Object.fromEntries(req('/api/houses').headers),origin:'https://other.test'},body:'{}'}))).status,403,'Cross-origin authenticated write rejected');
check((await app.houses.PATCH(req('/api/houses','PATCH',{id:1,actType:'build'},false))).status,403,'Anonymous points rejected');
check((await app.houses.POST(req('/api/houses','POST',{username:'test_a',cityId:0}))).status,400,'Invalid city rejected');
check((await app.houses.POST(req('/api/houses','POST',{username:'test_a',cityId:3550308}))).status,201,'Manual house persisted');
check((await app.houses.POST(req('/api/houses','POST',{username:'TEST_A',cityId:3304557}))).status,409,'Duplicate profile rejected');
await app.houses.POST(req('/api/houses','POST',{username:'test_b',cityId:3550308}));
let snapshot=await (await app.map.GET(req('/api/map'))).json();
check(snapshot.houses.map(h=>h.founder),[true,false],'Exactly one founder per city');
check(snapshot.houses.map(h=>h.role),['mayor','vice_mayor'],'Founder starts as Mayor, 2nd as Vice-Mayor');
check(snapshot.houses.map(h=>h.points),[150,100],'Founder starts with 150 pts, citizen with 100 pts');
await app.houses.PATCH(req('/api/houses','PATCH',{id:snapshot.houses[1].id,actType:'build'},true));
await app.houses.PATCH(req('/api/houses','PATCH',{id:snapshot.houses[1].id,actType:'build'},true));
await app.houses.PATCH(req('/api/houses','PATCH',{id:snapshot.houses[1].id,actType:'cheer'},true));
snapshot=await (await app.map.GET(req('/api/map'))).json();
check(snapshot.houses.find(h=>h.username==='test_b').points,165,'Map interactions (build + cheer) sum points');
check(snapshot.houses.find(h=>h.username==='test_b').role,'mayor','Higher points overtake Mayor role in City Hall');
check(snapshot.houses.find(h=>h.username==='test_a').founder,true,'Historical founder title remains with 1st resident');
const payload=(id='comment-a',text='Curitiba PR',user='ig_test',actor='123')=>({object:'instagram',entry:[{id:'account-test',changes:[{field:'comments',value:{id,text,from:{id:actor,username:user},media:{id:'media-test'}}}]}]});
const signed=(data,valid=true)=>{const raw=JSON.stringify(data);return new Request('https://map.test/api/instagram/webhook',{method:'POST',headers:{'x-hub-signature-256':'sha256='+createHmac('sha256',valid?secret:'wrong').update(raw).digest('hex')},body:raw});};
check((await app.webhook.POST(signed(payload(),false))).status,401,'Forged webhook rejected');
check((await app.webhook.POST(signed(payload()))).status,200,'Signed webhook accepted');
for(let i=0;i<5;i++)await app.webhook.POST(signed(payload()));
snapshot=await (await app.map.GET(req('/api/map'))).json();
check(snapshot.houses.length,3,'Repeated webhook creates only one house');
check(snapshot.houses[2].city.name,'Curitiba','Real city coordinates attached');
await app.webhook.POST(signed(payload('comment-b','Recife PE @amigo1 @amigo2','ig_changed','123')));
const afterSecondComment=await (await app.map.GET(req('/api/map'))).json();
check(afterSecondComment.houses.length,3,'Stable actor prevents renamed account duplicates');
check(afterSecondComment.houses.find(h=>h.username==='ig_test').points,210,'Second comment + tagged friends add +60 pts to existing resident');
check(afterSecondComment.houses.find(h=>h.username==='ig_test').building,'prefeitura','Mayor unlocks Prefeitura building');

await app.webhook.POST(signed(payload('comment-duplicates','@amigo1 @AMIGO1 @amigo1','ig_changed','123')));
snapshot=await (await app.map.GET(req('/api/map'))).json();
check(snapshot.houses.find(h=>h.username==='ig_test').points,255,'Repeated mention in one comment counts once');
const other=payload('comment-other');other.entry[0].changes[0].value.media.id='unselected-post';
await app.webhook.POST(signed(other));
check(sqlite.prepare("SELECT COUNT(*) AS n FROM events WHERE id='comment-other'").get().n,0,'Unselected post ignored');
const stranger=payload('other-account');stranger.entry[0].id='other';await app.webhook.POST(signed(stranger));
check(sqlite.prepare("SELECT COUNT(*) AS n FROM events WHERE id='other-account'").get().n,0,'Unselected account ignored');
await app.webhook.POST(signed(payload('unclear','Bom Jesus','ig_pending','999')));
let pending=await (await app.admin.GET(req('/api/admin'))).json();
check(pending.pending.length,1,'Ambiguous city queued');
check((await app.admin.POST(req('/api/admin','POST',{eventId:'unclear',cityId:2211001}))).status,200,'Admin can resolve pending city');
check((await (await app.admin.GET(req('/api/admin'))).json()).pending.length,0,'Resolved event removed from pending');
check((await app.admin.GET(req('/api/admin','GET',undefined,false))).status,403,'Private comments protected');
const igHouse=(await (await app.map.GET(req('/api/map'))).json()).houses.find(h=>h.username==='ig_test');
await app.houses.DELETE(req('/api/houses','DELETE',{id:igHouse.id}));await app.webhook.POST(signed(payload()));
check((await (await app.map.GET(req('/api/map'))).json()).houses.some(h=>h.username==='ig_test'),false,'Removed comment does not resurrect on webhook retry');
await app.houses.DELETE(req('/api/houses','DELETE',{id:snapshot.houses[0].id}));
check((await (await app.map.GET(req('/api/map'))).json()).houses.find(h=>h.username==='test_b').founder,true,'Founder transfers after deletion');
check((await app.webhook.GET(new Request('https://map.test/api/instagram/webhook?hub.mode=subscribe&hub.verify_token='+globalThis.__mapTestEnv.INSTAGRAM_VERIFY_TOKEN+'&hub.challenge=1234'))).status,200,'Meta challenge accepted');
check((await app.webhook.GET(req('/api/instagram/webhook?hub.mode=subscribe&hub.verify_token=wrong'))).status,403,'Invalid challenge denied');
const mapRes = await app.map.GET(req('/api/map'));
const etag = mapRes.headers.get('etag');
check(Boolean(etag), true, 'Map response includes ETag');
const notModifiedRes = await app.map.GET(new Request(req('/api/map'), { headers: { ...Object.fromEntries(req('/api/map').headers), 'if-none-match': etag } }));
check(notModifiedRes.status, 304, 'Unchanged map returns 304 Not Modified');
const t0 = performance.now();
for (let i = 0; i < 100; i++) app.searchCities('curitiba');
check(performance.now() - t0 < 50, true, '100 cached/indexed searches run in under 50ms');
delete globalThis.__mapTestEnv.INSTAGRAM_APP_SECRET;
if (vercel) delete process.env.INSTAGRAM_APP_SECRET;
check((await app.webhook.POST(signed(payload()))).status, 503, 'Unconfigured integration remains off');
sqlite.close();
console.log(`${checks} integration checks passed (${vercel ? 'Vercel + D1 HTTP' : 'Sites binding'}); isolated SQLite database; no production records created.`);
