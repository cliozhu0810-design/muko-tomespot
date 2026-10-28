import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createSnapshot,fetchSnapshot} from '../scripts/snapshot.mjs';
import {needsDeployment} from '../scripts/sync.mjs';
import YAML from 'yaml';
import {handle} from '../src/server.mjs';
const endpoint='https://tomespot.example.workers.dev/mcp';
const assets=()=>({'parking.json':JSON.stringify({places:[{id:'p',name:'公開施設',address:'東京都'}]}),'vehicle-data.json':JSON.stringify({profiles:{p:{bicycle:{admissionStatus:'confirmed',tariffs:[{amountJPY:100}]}}}}),'vehicle-categories.js':'globalThis.TomespotVehicleCategories={profiles:r=>({bicycle:r.bicycle,privateElectricScooter:{},moped:{},motorcycle:{}})}','station-search.js':'globalThis.TomespotStationSearch={stations:[]}'});
test('fingerprint changes with source price edits but not retrieval time',()=>{
  const a=assets(),first=createSnapshot(a),same=createSnapshot(a);assert.equal(first.sourceFingerprint,same.sourceFingerprint);
  a['vehicle-data.json']=a['vehicle-data.json'].replace('100','200');assert.notEqual(first.sourceFingerprint,createSnapshot(a).sourceFingerprint);
});
test('same source skips deployment; changed or old service triggers deployment',async()=>{
  const snapshot={sourceFingerprint:'new'};
  for(const [fingerprint,expected]of [['new',false],['old',true],[undefined,true]]){
    const fetcher=async(url)=>{assert.equal(String(url),'https://tomespot.example.workers.dev/health');return Response.json({name:'tomespot',readOnly:true,sourceFingerprint:fingerprint});};
    assert.equal(await needsDeployment(snapshot,{endpoint,fetcher}),expected);
  }
});
test('health failure or wrong service stops sync rather than replacing deployment',async()=>{
  for(const response of [new Response('unavailable',{status:503}),Response.json({name:'other-service'})])await assert.rejects(needsDeployment({sourceFingerprint:'new'},{endpoint,fetcher:async()=>response}));
  await assert.rejects(needsDeployment({},{endpoint:'http://insecure.example/mcp'}));
  await assert.rejects(needsDeployment({},{}));
});
test('manual force permits first deployment without an existing endpoint',async()=>{
  assert.equal(await needsDeployment({},{force:true,fetcher:()=>{throw Error('must not call health')}}),true);
});
test('scheduled fetch uses only five fixed public assets; failure preserves local snapshot',async()=>{
  const fixture={...assets(),'comments.js':'const reviewedCommentSummaries = {}; function commentDisplayBody(){}'},seen=[];
  const snapshot=await fetchSnapshot(async(url)=>{seen.push(url);const key=new URL(url).pathname.slice(1);return new Response(fixture[key]);});
  assert.equal(snapshot.places.length,1);assert.equal(seen.length,5);assert.ok(seen.every(u=>u.startsWith('https://muko-tomespot.pages.dev/')));
  const file=new URL('../data/catalog.json',import.meta.url),before=await fs.readFile(file);
  await assert.rejects(fetchSnapshot(async()=>new Response('error',{status:503})));
  assert.deepEqual(await fs.readFile(file),before);
});
test('empty, malformed and duplicate source data cannot become a candidate',()=>{
  for(const places of [[],[{id:'same'},{id:'same'}],[{id:null}]]){const a=assets();a['parking.json']=JSON.stringify({places});assert.throws(()=>createSnapshot(a));}
  const a=assets();a['vehicle-data.json']='invalid JSON';assert.throws(()=>createSnapshot(a));
});
test('scheduled workflow parses and exposes Cloudflare credentials only at deployment',async()=>{
  const document=YAML.parseDocument(await fs.readFile(new URL('../deployment/tomespot-sync.yml',import.meta.url),'utf8'));
  assert.deepEqual(document.errors,[]);const workflow=document.toJS();assert.ok(workflow.on.schedule.length);assert.equal(workflow.permissions.contents,'read');
  const steps=workflow.jobs.sync.steps,deploy=steps.find(s=>s.name==='Deploy validated candidate');assert.ok(deploy);
  assert.ok(deploy.env.CLOUDFLARE_API_TOKEN.includes('secrets.CLOUDFLARE_API_TOKEN'));
  for(const step of steps.filter(s=>s!==deploy))assert.ok(!JSON.stringify(step.env||{}).includes('secrets.'));
});
test('health endpoint exposes current snapshot fingerprint and prevents stale caching',async()=>{
  const response=await handle(new Request('http://localhost/health')),health=await response.json();
  assert.match(health.sourceFingerprint,/^[a-f0-9]{64}$/);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(health.catalogReadOnly,true);assert.equal(health.readOnly,false);
});
