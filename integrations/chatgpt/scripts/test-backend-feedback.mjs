// Integration test against an isolated copy of the real generated Supabase handler.
// All database/network calls below are simulated; no production comments are written.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve(process.argv[2]||'');if(!process.argv[2])throw Error('Pass the isolated personal repository root');
const {buildSupabaseBackend}=await import(pathToFileURL(path.join(root,'scripts/build.mjs')));buildSupabaseBackend();
const {handle}=await import(pathToFileURL(process.argv[3]?path.resolve(process.argv[3]):path.join(root,'supabase/functions/tomespot/index.ts')));
const {handleMcpFeedback}=await import(pathToFileURL(process.argv[3]?path.resolve(process.argv[3]):path.join(root,'supabase/functions/tomespot/mcp-feedback.mjs')));
const {signDraft}=await import('../src/feedback-crypto.mjs');
const facility=JSON.parse(await fs.readFile(path.join(root,'source/public/parking.json'),'utf8')).places[0].id;
const settings={SUPABASE_URL:'https://project.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-only-storage-key',COMMENT_HASH_SALT:'test-only-salt',MCP_FEEDBACK_KEY:'test-only-feedback-key-at-least-32-characters',FRONTEND_ORIGIN:'https://muko-tomespot.pages.dev'};
const rows=new Map(),limits=new Map(),originalFetch=globalThis.fetch;
globalThis.fetch=async(input,options={})=>{
  const u=new URL(input);assert.equal(u.origin,settings.SUPABASE_URL);assert.equal(options.headers.apikey,settings.SUPABASE_SERVICE_ROLE_KEY);
  if(u.pathname==='/rest/v1/rpc/tomespot_rate_limit'){const {p_key}=JSON.parse(options.body),count=(limits.get(p_key)||0)+1;limits.set(p_key,count);return Response.json({count});}
  if(u.pathname!=='/rest/v1/comments')throw Error('Unexpected route '+u.pathname);
  if(options.method==='POST'){const p=JSON.parse(options.body);rows.set(p.id,p);return Response.json({});}
  let result=[...rows.values()];for(const k of ['id','facility_id','status'])if(u.searchParams.has(k))result=result.filter(r=>r[k]===u.searchParams.get(k).slice(3));
  return Response.json(result.slice(Number(u.searchParams.get('offset')||0),Number(u.searchParams.get('offset')||0)+Number(u.searchParams.get('limit')||result.length)));
};
const call=(p,options={})=>handleMcpFeedback(new Request(settings.SUPABASE_URL+'/functions/v1/tomespot'+p,options),settings,handle);
const draft=async()=>signDraft({v:1,id:crypto.randomUUID(),facility,vehicle:'motorcycle',body:'SIMULATED integration test, no live submission',region:'',client:'A'.repeat(43),exp:Date.now()+900000},settings.MCP_FEEDBACK_KEY);
try{
  const signed=await draft(),request={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({draft:signed})};
  assert.equal((await call('/api/mcp-feedback',request)).status,201);
  assert.equal(rows.size,1);assert.equal([...rows.values()][0].status,'pending');assert.equal([...rows.values()][0].vehicle,'motorcycleV2');
  assert.equal((await call('/api/mcp-feedback',request)).status,200);assert.equal(rows.size,1);assert.equal([...limits.values()][0],1);
  assert.deepEqual((await (await call('/api/comments?facility='+facility)).json()).comments,[]);
  [...rows.values()][0].status='approved';
  const approved=(await (await call('/api/comments?facility='+facility)).json()).comments;assert.equal(approved.length,1);assert.equal(approved[0].vehicle,'motorcycle');assert.equal(approved[0].legacyMotorcycle,false);assert.equal(approved[0].submission_hash,undefined);
  for(let i=0;i<5;i++){const r=await call('/api/mcp-feedback',{method:'POST',body:JSON.stringify({draft:await draft()})});assert.equal(r.status,i===4?429:201);}
  assert.equal((await call('/api/admin/comments')).status,403);
  console.log('PASS: real backend bridge -> pending queue -> approved-only reads; UUID retry, merged motorcycle category, per-client limit and admin isolation. All upstream calls simulated.');
}finally{globalThis.fetch=originalFetch;}
