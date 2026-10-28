import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {handle} from '../src/server.mjs';
import {catalog,detail,search} from '../src/catalog.mjs';
async function client(){const c=new Client({name:'integration-test',version:'1.0.0'});await c.connect(new StreamableHTTPClientTransport(new URL('http://localhost/mcp'),{fetch:(url,init)=>handle(new Request(url,init))}));return c;}
test('official MCP client initializes, lists and calls both read-only tools',async()=>{
  const c=await client();try{
    const tools=await c.listTools();assert.deepEqual(tools.tools.map(t=>t.name),['search_parking','get_parking','get_parking_reviews','prepare_parking_feedback']);
    for(const t of tools.tools){assert.equal(t.annotations.readOnlyHint,true);assert.equal(t.annotations.destructiveHint,false);}
    const r=await c.callTool({name:'search_parking',arguments:{query:'横浜駅',vehicle:'bicycle'}});
    assert.ok(!r.isError);assert.ok(r.structuredContent.total>0);
    const d=await c.callTool({name:'get_parking',arguments:{id:r.structuredContent.results[0].id,vehicle:'bicycle'}});
    assert.equal(d.structuredContent.id,r.structuredContent.results[0].id);assert.equal(d.structuredContent.availability.status,'not_provided');
  }finally{await c.close();}
});
test('place clarification, invalid coordinates, limits, unknown ID and write tools',async()=>{
  const c=await client();try{
    for(const args of [{vehicle:'bicycle'},{vehicle:'bicycle',latitude:35},{vehicle:'bicycle',query:'横浜',limit:100},{vehicle:'bicycle',latitude:100,longitude:139}]){
      const r=await c.callTool({name:'search_parking',arguments:args});assert.equal(r.isError,true);
    }
    assert.equal((await c.callTool({name:'get_parking',arguments:{id:'../admin',vehicle:'motorcycle'}})).isError,true);
    assert.equal((await c.callTool({name:'delete_comment',arguments:{}})).isError,true);
  }finally{await c.close();}
});
test('moped-only evidence never grants larger motorcycle admission; no kickboard fallback',()=>{
  const p=catalog.places.find(p=>p.profiles.moped.admissionStatus==='confirmed'&&p.profiles.motorcycle.admissionStatus!=='confirmed');assert.ok(p);
  const d=detail(p.id,'motorcycle',750);assert.notEqual(d.profiles.motorcycle.admissionStatus,'confirmed');assert.equal(d.requestedVehicleFit.status,'unverified');
  const r=search({query:p.name,vehicle:'privateElectricScooter',limit:10});
  if(p.profiles.privateElectricScooter.admissionStatus!=='confirmed')assert.ok(!r.results.some(r=>r.id===p.id));
});
test('usage remains scoped to admitted class; tariff conditions are unchanged',()=>{
  const r=search({query:'目黒駅',vehicle:'privateElectricScooter',usage:'temporary',limit:10});
  for(const p of r.results)assert.equal(p.profiles.privateElectricScooter.temporaryStatus,'confirmed');
  const p=catalog.places.find(p=>p.profiles.bicycle.admissionStatus==='confirmed'&&p.profiles.bicycle.tariffs?.some(t=>t.freeMinutes&&t.periodHours));assert.ok(p);
  assert.deepEqual(detail(p.id,'bicycle').profiles.bicycle.tariffs,p.profiles.bicycle.tariffs);
});
test('coordinates use bounded straight-line distances; all coverage remains available',()=>{
  const r=search({latitude:35.730256,longitude:139.711086,vehicle:'bicycle',radius_m:1200,limit:10});
  assert.ok(r.total>0);assert.ok(r.results.every(p=>p.distanceM<=1200));
  assert.equal(search({query:'大阪駅',vehicle:'bicycle'}).total,0);
  assert.ok(catalog.coverage.includes('埼玉県'));assert.ok(catalog.coverage.includes('千葉県'));assert.ok(search({query:'横浜駅',vehicle:'bicycle'}).total>0);
});
test('unconfirmed/discovery records never expose claimed tariffs; URLs preserve vehicle entries',()=>{
  for(const p of catalog.places){
    for(const vehicle of ['bicycle','privateElectricScooter','motorcycle']){
      const d=detail(p.id,vehicle);for(const q of Object.values(d.profiles))if(q.admissionStatus!=='confirmed'){assert.deepEqual(q.tariffs,[]);assert.equal(q.publishedFeesRaw,'');}
      assert.ok(d.links.facility.startsWith(catalog.origin+'/?place='));
      if(vehicle==='motorcycle')assert.ok(d.links.category.endsWith('/motorcycle-parking'));
      if(vehicle==='privateElectricScooter')assert.ok(d.links.category.endsWith('/kickboard-parking'));
    }
  }
});
test('HTTP boundaries reject admin paths, foreign origins, oversized payloads and writes',async()=>{
  assert.equal((await handle(new Request('http://localhost/admin'))).status,404);
  assert.equal((await handle(new Request('http://localhost/mcp',{method:'POST',headers:{Origin:'https://evil.example'}}))).status,403);
  assert.equal((await handle(new Request('http://localhost/mcp',{method:'DELETE'}))).status,405);
  const r=await handle(new Request('http://localhost/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',method:'initialize',id:1,params:{padding:'x'.repeat(20000)}})}));assert.equal(r.status,413);
});
