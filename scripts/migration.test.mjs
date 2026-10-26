import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {DatabaseSync} from 'node:sqlite';
import {buildBackend,buildFrontend,root} from './build.mjs';
import {referenceHTML} from './scooter-reference-pages.mjs';
buildBackend();
test('three-prefecture motorcycle import separates displacement, current fees, modes and pending vehicles',()=>{
 const r=JSON.parse(fs.readFileSync(path.join(root,'source/public/motorcycle-review.json'))),parking=JSON.parse(fs.readFileSync(path.join(root,'source/public/parking.json'))).places,v=JSON.parse(fs.readFileSync(path.join(root,'source/public/vehicle-data.json'))).profiles;
 const original=r.records.filter(p=>!p.expansionBatch);assert.equal(original.length,143);assert.equal(original.filter(p=>p.profiles.motorcycle.admissionStatus==='confirmed').length,142);assert.equal(original.filter(p=>p.mapReady).length,132);assert.deepEqual(Object.fromEntries(['埼玉県','千葉県','神奈川県'].map(pref=>[pref,original.filter(p=>p.prefecture===pref).length])),{'埼玉県':15,'千葉県':101,'神奈川県':27});
 const find=name=>r.records.find(x=>x.name===name);
 const shintoshin=find('市営さいたま新都心駅東口自転車等駐車場').profiles.motorcycle;
 assert.match(shintoshin.publishedFeesRaw,/125cc超[\s\S]*190円/);assert.match(shintoshin.currentConditionsRaw.join(' '),/125cc超.*一時利用のみ/);
 assert.match(find('橋本駅南口バイク駐車場（公社運営）').profiles.motorcycle.publishedFeesRaw,/3,900円/);
 assert.equal(find('橋本駅南口第2自転車駐車場').profiles.motorcycle.regularStatus,'not_offered');
 assert.equal(find('藤沢駅北口市役所前第1自転車等駐車場').profiles.motorcycle.temporaryStatus,'not_offered');
 assert.equal(find('妙典駅前月極バイク駐車場').profiles.motorcycle.admissionStatus,'unknown');
 const tobu=find('大宮公園駅駐輪場').profiles.motorcycle;assert.equal(tobu.announcedTariffChange.effectiveDate,'2026-11-01');assert.match(tobu.announcedTariffChange.currentTemporaryFeeRaw,/300円/);assert.match(tobu.announcedTariffChange.temporaryFeeRaw,/220円/);
 const chiba50=find('幕張本郷駅第2自転車駐車場'),chiba125=find('幕張本郷駅第1自転車駐車場');assert.equal(chiba50.motorcycleScope,'upTo50');assert.equal(chiba125.motorcycleScope,'upTo125');
 assert.match(chiba125.profiles.motorcycle.publishedFeesRaw,/220円/);
 for(const x of original){assert.deepEqual(v[x.id],x.profiles);if(x.mapReady){assert.equal(parking.filter(p=>p.id===x.id).length,1);assert.ok(x.mapSource.startsWith('https://'));assert.ok(x.lat>34.8&&x.lat<36.6&&x.lng>138.4&&x.lng<141);assert.equal(x.profiles.motorcycle.admissionStatus,'confirmed');}if(!x.id.startsWith('kanto-')){assert.equal(x.profiles.bicycle.admissionStatus,'unknown');assert.equal(x.profiles.privateElectricScooter.admissionStatus,'unknown');}}
 assert.ok(!JSON.stringify(r).includes('AIza'));assert.ok(r.researchQueue.length>200);assert.equal(new Set(parking.map(p=>p.id)).size,parking.length);
});

test('station suggestions rank kana, Chinese variants and typos without changing vehicle evidence',()=>{
 const context=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,'source/public/station-search.js'),'utf8'),context);
 const engine=context.TomespotStationSearch;
 for(const [query,name] of [['ikebukuro','池袋'],['Ikebukuro Station','池袋'],['nakameguro','中目黒'],['nakameg','中目黒'],['tokyo','東京'],['Tōkyō','東京'],['toukyou','東京'],['shinjuku','新宿'],['sinjuku','新宿'],['nishi kawaguchi','西川口'],['yokohama','横浜'],['chiba','千葉'],['omiya','大宮'],['ikebukro','池袋']])assert.equal(engine.suggest(query)[0].name,name,query);
 for(const query of ['いけぶくろ','イケブクロ','ｲｹﾌﾞｸﾛ','池袋站','池袋车站','池袋車站','いけぶく','いけぶくろう'])assert.equal(engine.suggest(query)[0].name,'池袋',query);
 for(const [query,name] of [['にしかわぐち','西川口'],['练马','練馬'],['練馬','練馬'],['涩谷','渋谷'],['澀谷','渋谷'],['横滨','横浜'],['橫濱','横浜'],['所泽','所沢'],['东川口','東川口'],['東京','東京']])assert.equal(engine.suggest(query)[0].name,name,query);
 assert.equal(engine.normalize('霞ヶ関'),engine.normalize('霞ケ関'));
 assert.equal(engine.suggest('').length,0);assert.equal(engine.suggest('完全に存在しない駅名XYZ').length,0);assert.ok(engine.suggest('いけ').length<=6);
 const ike=engine.suggest('池袋')[0],nishi=engine.suggest('西川口')[0];assert.equal(engine.nearby({lat:ike.lat,lng:ike.lng},ike),true);assert.equal(engine.nearby({lat:nishi.lat,lng:nishi.lng},ike),false);
 assert.ok(engine.stations.length>600);assert.ok(engine.stations.every(s=>s.kana&&s.lat&&s.lng));
 const app=fs.readFileSync(path.join(root,'source/public/app.js'),'utf8'),elements={search:{value:'いけぶくろ'},ward:{value:''},unknown:{checked:false}};
 context.document={getElementById:id=>elements[id]};context.localStorage={getItem:()=>null};
 vm.runInContext(app.split("$('search').addEventListener")[0],context);
 context.fixture=[{id:'near',name:'施設A',lat:ike.lat,lng:ike.lng,status:'confirmed',temporary:true},{id:'far',name:'施設B',lat:nishi.lat,lng:nishi.lng,status:'confirmed',temporary:true},{id:'rejected',name:'施設C',lat:ike.lat,lng:ike.lng,status:'rejected'}];
 vm.runInContext('state.places=fixture',context);assert.equal(vm.runInContext('filtered().map(p=>p.id).join(",")',context),'near');
 elements.search.value='にしかわぐち';assert.equal(vm.runInContext('filtered().map(p=>p.id).join(",")',context),'far');
 const meguro=engine.suggest('目黒駅')[0];assert.equal(meguro.name,'目黒');
 context.fixture=[{id:'meguro-near',name:'駅前施設',ward:'品川区',lat:meguro.lat,lng:meguro.lng,status:'confirmed',temporary:true},{id:'meguro-ward-far',name:'遠い施設',ward:'目黒区',address:'東京都目黒区',lat:meguro.lat+0.05,lng:meguro.lng,status:'confirmed',temporary:true}];
 vm.runInContext('state.places=fixture',context);elements.search.value='目黒駅';
 assert.equal(vm.runInContext('filtered().map(p=>p.id).join(",")',context),'meguro-near');
});

test('vehicle and recent facility history survive reload, deduplicate and limit local records',()=>{
 const app=fs.readFileSync(path.join(root,'source/public/app.js'),'utf8').split("$('search').addEventListener")[0];
 const values=new Map([['tomespot:vehicle','motorcycle']]);const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const run=()=>{const c=vm.createContext({localStorage:storage,document:{getElementById:()=>null},URL});vm.runInContext(app,c);return c;};
 const c=run();assert.equal(vm.runInContext('state.vehicle',c),'motorcycle');
 vm.runInContext('for(let i=0;i<25;i++)rememberVisit("place-"+i);rememberVisit("place-10")',c);
 const visits=JSON.parse(values.get('tomespot:history'));assert.equal(visits.length,20);assert.equal(visits[0].id,'place-10');assert.equal(visits.filter(e=>e.id==='place-10').length,1);assert.equal(visits[0].vehicle,'motorcycle');
 vm.runInContext('state.vehicle="bicycle";rememberVehicle()',c);const reopened=run();assert.equal(vm.runInContext('state.vehicle',reopened),'bicycle');assert.equal(vm.runInContext('state.history[0].id',reopened),'place-10');
 values.set('tomespot:vehicle','not-a-vehicle');values.set('tomespot:history','invalid JSON');assert.equal(vm.runInContext('state.vehicle',run()),'privateElectricScooter');
});

test('kickboard search entry overrides saved language and vehicle without replacing preferences',()=>{
 const app=fs.readFileSync(path.join(root,'source/public/app.js'),'utf8').split("$('search').addEventListener")[0];
 const values=new Map([['tomespot:vehicle','motorcycle'],['tomespot:language','zh-Hans']]);
 const c=vm.createContext({window:{TOMESPOT_ENTRY:{vehicle:'privateElectricScooter',language:'ja'}},localStorage:{getItem:k=>values.get(k)||null},document:{getElementById:()=>null}});
 vm.runInContext(app,c);
 assert.equal(vm.runInContext('state.vehicle',c),'privateElectricScooter');
 assert.equal(vm.runInContext('locale',c),'ja');
 assert.equal(values.get('tomespot:vehicle'),'motorcycle');
 assert.equal(values.get('tomespot:language'),'zh-Hans');
});

test('persisted motorcycle choice renders real profiles and keeps admission and closure rules',()=>{
 const app=fs.readFileSync(path.join(root,'source/public/app.js'),'utf8').split("$('search').addEventListener")[0],elements={search:{value:''},ward:{value:''},unknown:{checked:false}};
 const c=vm.createContext({localStorage:{getItem:k=>k==='tomespot:vehicle'?'motorcycle':null},document:{getElementById:id=>elements[id]},URL});vm.runInContext(app,c);
 c.parking=JSON.parse(fs.readFileSync(path.join(root,'source/public/parking.json')));c.profiles=JSON.parse(fs.readFileSync(path.join(root,'source/public/vehicle-data.json')));
 vm.runInContext('dataset=parking;vehicleData=profiles;state.places=parking.places',c);
 assert.ok(vm.runInContext('filtered().length',c)>100);assert.equal(vm.runInContext('closureActive({})',c),false);
 assert.equal(vm.runInContext('closureActive({temporaryClosureNotice:{startDate:"2026-10-01",endDateInclusive:"2026-10-31"}},new Date("2026-10-21T12:00:00Z"))',c),true);
 const detail=vm.runInContext('profileDetailHtml(filtered().find(p=>p.vehicleProfile))',c);assert.match(detail,/google.com\/maps/);assert.ok(!detail.includes('source-stamp'));assert.ok(!detail.includes('正確な入口'));
});

test('touch station tap survives input blur while scrolling does not select a candidate',()=>{
 const handlers=new Map();const make=id=>({value:'',hidden:false,innerHTML:'',checked:false,classList:{add(){},remove(){},toggle(){}},setAttribute(){},removeAttribute(){},contains:()=>false,addEventListener:(type,handler)=>handlers.set(id+':'+type,handler)});
 const elements=new Map();const element=id=>{if(!elements.has(id))elements.set(id,make(id));return elements.get(id);};
 const document={getElementById:element,querySelectorAll:()=>[],addEventListener:(type,h)=>handlers.set('document:'+type,h),activeElement:element('search')};
 const context=vm.createContext({document,localStorage:{getItem:()=>null},URL});const app=fs.readFileSync(path.join(root,'source/public/app.js'),'utf8').replace(/^boot\(\);$/m,'').replace(/fetch\('\/api\/admin\/session'\)[\s\S]*$/,'');vm.runInContext(app,context);
 vm.runInContext('let selections=[];chooseStation=(...args)=>selections.push(args)',context);
 const option={dataset:{stationOption:'0'}};const event=(more={})=>({pointerId:1,pointerType:'touch',isPrimary:true,button:0,clientX:50,clientY:60,target:{closest:()=>option},preventDefault(){this.prevented=true;},...more});
 const down=event();handlers.get('station-suggestions:pointerdown')(down);assert.ok(!down.prevented);
 handlers.get('search:blur')({relatedTarget:null});assert.equal(element('station-suggestions').hidden,false);
 handlers.get('station-suggestions:pointerup')(event());assert.equal(vm.runInContext('selections.length',context),1);assert.equal(vm.runInContext('selections[0][1]',context),false);
 handlers.get('station-suggestions:pointerdown')(event());handlers.get('station-suggestions:pointermove')(event({clientY:100}));handlers.get('station-suggestions:pointerup')(event({clientY:100}));handlers.get('station-suggestions:click')(event({detail:1}));assert.equal(vm.runInContext('selections.length',context),1);
 handlers.get('station-suggestions:pointerdown')(event());handlers.get('search:blur')({relatedTarget:null});handlers.get('station-suggestions:pointercancel')(event());assert.equal(element('station-suggestions').hidden,false);
 const mouse=event({pointerType:'mouse'});handlers.get('station-suggestions:pointerdown')(mouse);assert.equal(mouse.prevented,true);handlers.get('station-suggestions:pointerup')(event({pointerType:'mouse'}));assert.equal(vm.runInContext('selections[1][1]',context),true);
});
test('device favorites survive reload and render separate heart markers with comparison bounds',()=>{
 const app=fs.readFileSync(path.join(root,'source/public/app.js'),'utf8').split("$('search').addEventListener")[0];
 const values=new Map([['park-tokyo:favorites','["a","b"]']]);
 const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const context=vm.createContext({localStorage:storage,document:{getElementById:()=>null},URL});
 vm.runInContext(app,context);
 assert.equal(vm.runInContext('state.favorites.size',context),2);
 vm.runInContext('render=()=>{};notify=()=>{};toggleFavorite("c")',context);
 assert.deepEqual(JSON.parse(values.get('park-tokyo:favorites')),['a','b','c']);
 const reopened=vm.createContext({localStorage:storage,document:{getElementById:()=>null},URL});
 vm.runInContext(app,reopened);assert.equal(vm.runInContext('state.favorites.has("c")',reopened),true);
 vm.runInContext(`
 const normal=[],hearts=[];
 state.layer={clearLayers(){normal.length=0},addLayer:m=>normal.push(m)};
 state.savedLayer={clearLayers(){hearts.length=0},addLayer:m=>hearts.push(m)};
 const L={divIcon:o=>o,marker:(coords,options)=>({coords,options,bindTooltip(){},on(){}}),latLngBounds:points=>points};
 state.visible=[{id:'a',lat:35,lng:139,name:'A',status:'confirmed',temporary:true},{id:'b',lat:36,lng:140,name:'B',status:'confirmed',temporary:false},{id:'other',lat:40,lng:145,name:'Other',status:'confirmed',temporary:true}];
 renderMarkers();`,context);
 assert.equal(vm.runInContext('hearts.length',context),2);assert.equal(vm.runInContext('normal.length',context),1);
 assert.match(vm.runInContext('hearts[0].options.icon.html',context),/<svg/);
 assert.match(vm.runInContext('normal[0].options.icon.html',context),/<span>P/);
 vm.runInContext('let fitted;state.map={fitBounds:b=>fitted=b};fitMap(true)',context);
 assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(fitted)',context)),[[35,139],[36,140]]);
 storage.setItem=()=>{throw Error('storage blocked')};
 vm.runInContext('toggleFavorite("d")',context);assert.equal(vm.runInContext('state.favoriteStorage',context),false);assert.equal(vm.runInContext('state.favorites.has("d")',context),true);
});
const {default:worker}=await import('../backend/generated/worker.mjs');
const {verifyAdmin}=await import('../backend/gateway.mjs');
const frontend='https://cliozhu0810-design.github.io', backend='https://tomespot-api.example.workers.dev';
const db=new DatabaseSync(':memory:');
db.exec(fs.readFileSync(path.join(root,'backend/schema.sql'),'utf8'));
const DB={prepare(sql){let values=[];const q={bind(...v){values=v;return q;},async all(){return {results:db.prepare(sql).all(...values)};},async first(){return db.prepare(sql).get(...values)||null;},async run(){return db.prepare(sql).run(...values);}};return q;}};
const objects=new Map();
const BUCKET={async put(k,v,opts){objects.set(k,{body:v,httpMetadata:opts.httpMetadata});},async get(k){return objects.get(k);},async delete(k){objects.delete(k);}};
const env={DB,BUCKET,FRONTEND_ORIGIN:frontend,ADMIN_EMAIL:'owner@example.com',ACCESS_TEAM_DOMAIN:'https://tomespot-test.cloudflareaccess.com',ACCESS_AUD:'test-audience',COMMENT_HASH_SALT:'local-test-only-salt',ASSETS:{fetch:async()=>new Response('asset')}};
const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',keys.publicKey),kid:'test-key'};
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,...rest)=>String(url)===env.ACCESS_TEAM_DOMAIN+'/cdn-cgi/access/certs'?Response.json({keys:[jwk]}):originalFetch(url,...rest);
async function token(overrides={}) {
  const now=Math.floor(Date.now()/1000),encode=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned=encode({alg:'RS256',kid:'test-key'})+'.'+encode({iss:env.ACCESS_TEAM_DOMAIN,type:'app',aud:[env.ACCESS_AUD],sub:'owner-id',email:env.ADMIN_EMAIL,iat:now,nbf:now-1,exp:now+3600,...overrides});
  return unsigned+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(unsigned))).toString('base64url');
}
const facility=JSON.parse(fs.readFileSync(path.join(root,'source/public/parking.json'))).places[0].id;

test('Kanto import preserves scooter mode restrictions, current dedicated fees and official map provenance',()=>{
 const r=JSON.parse(fs.readFileSync(path.join(root,'source/public/kanto-review.json'))),v=JSON.parse(fs.readFileSync(path.join(root,'source/public/vehicle-data.json'))).profiles;
 assert.equal(r.records.length,189);assert.equal(r.records.filter(x=>x.mapReady).length,r.stats.mapReady);
 const find=name=>r.records.find(x=>x.name===name);
 const east1=find('所沢駅東口第1自転車駐車場'),east2=find('所沢駅東口第2自転車駐車場');
 assert.equal(east1.profiles.privateElectricScooter.temporaryStatus,'not_offered');assert.equal(east1.profiles.privateElectricScooter.regularStatus,'confirmed_application_required');
 assert.equal(east2.profiles.privateElectricScooter.temporaryStatus,'confirmed');assert.match(east2.profiles.privateElectricScooter.publishedFeesRaw,/24時間160円/);
 assert.equal(find('新所沢駅東口第1自転車駐車場').profiles.privateElectricScooter.temporaryStatus,'not_offered');
 for(const x of r.records.filter(x=>x.id.startsWith('tokorozawa-'))){assert.ok(x.mapSource.includes('rs=3857'));assert.ok(x.lat>35.7&&x.lat<35.9&&x.lng>139.3&&x.lng<139.6);assert.deepEqual(v[x.id],x.profiles);}
 assert.match(find('千葉駅東口第5自転車駐車場').profiles.privateElectricScooter.publishedFeesRaw,/1か月750円/);
 assert.match(find('船橋駅第14自転車等駐車場').profiles.privateElectricScooter.publishedFeesRaw,/660円／月/);
 assert.ok(r.anomalies.some(x=>x.station==='川崎大師駅'));assert.ok(!r.records.some(x=>x.station==='川崎大師駅'&&x.name.includes('川崎新町')));
});
test('scooter references retain uncertainty, separate shared ports and monthly listings, and escape third-party text',()=>{
 const report=JSON.parse(fs.readFileSync(path.join(root,'source/public/ikebukuro-scooter-references.json')));
 const profiles=JSON.parse(fs.readFileSync(path.join(root,'source/public/vehicle-data.json'))).profiles;
 assert.equal(report.entries.length,8);assert.equal(report.googleReviewChecks.length,6);
 for(const e of report.entries){assert.equal(e.admissionConfirmed,e.id==='municipal-council-reference');assert.ok(e.sources.length);assert.equal(e.checked,'2026-10-21');for(const id of e.facilityIds||[])assert.equal(profiles[id].privateElectricScooter.admissionStatus,e.admissionConfirmed?'confirmed':'unknown');}
 const listing=report.entries.find(e=>e.kind==='listing');assert.match(listing.summary,/月極契約.*時間貸しではありません/);assert.match(listing.details.join(' '),/満車・空き待ち/);
 assert.match(report.entries.find(e=>e.id==='seibu-minami-ikebukuro').summary,/私有車.*確認できません/);assert.match(report.entries.find(e=>e.id==='outside-area-lock-experience').summary,/池袋.*ではありません/);assert.match(profiles['16055'].bicycle.publishedFeesRaw,/5時間ごと110円/);
 const port=report.entries.find(e=>e.kind==='shared_port');assert.equal(port.excludedAsPrivateParkingEvidence,true);assert.ok(!port.sources.some(s=>s.url.includes('luup.sc')));
 const html=referenceHTML({referenceEvidence:[{label:'参考',summary:'<img src=x onerror=alert(1)>',checked:'2026-10-21',sources:[{url:'javascript:alert(1)',label:'bad'},{url:'https://example.com/',label:'source'}]}]});
 assert.ok(!html.includes('<img'));assert.ok(!html.includes('href="javascript:'));assert.ok(html.includes('&lt;img'));assert.ok(html.includes('href="https://example.com/"'));
 const app=fs.readFileSync(path.join(root,'source/public/app.js'),'utf8'),context=vm.createContext({URL,localStorage:{getItem:()=>null},document:{getElementById:()=>null}});
 vm.runInContext(app.slice(0,app.indexOf("$('search').addEventListener")),context);context.profile=profiles['16037'].privateElectricScooter;
 assert.match(vm.runInContext('referenceEvidenceHtml(profile)',context),/参考・料金情報に相違/);
});
test('Toshima review separates classes, current operator fees, registration, duplicates and disputed positions',()=>{
 const parking=JSON.parse(fs.readFileSync(path.join(root,'source/public/parking.json'))).places;
 const profiles=JSON.parse(fs.readFileSync(path.join(root,'source/public/vehicle-data.json'))).profiles;
 const report=JSON.parse(fs.readFileSync(path.join(root,'source/public/toshima-review.json')));
 assert.equal(new Set(parking.map(p=>p.id)).size,parking.length);
 assert.equal(report.records.length,71);assert.equal(report.records.filter(r=>r.category==='added').length,15);
 assert.equal(report.googleComparisons.length,52);assert.equal(report.googleComparisons.filter(r=>r.facilityId).length,29);
 for(const r of report.records){assert.ok(profiles[r.id]);for(const q of Object.values(profiles[r.id]))assert.equal(q.checked,report.checked);}
 assert.match(profiles['toshima-sunshine-west'].motorcycle.publishedFeesRaw,/2時間400円/);
 assert.match(profiles['toshima-sunshine-north'].bicycle.publishedFeesRaw,/2時間150円/);
 assert.equal(profiles['toshima-sunshine-east'].motorcycle.admissionStatus,'rejected');
 assert.equal(profiles['16041'].motorcycle.publishedFeesRaw,'1時間100円');
 assert.match(profiles['toshima-times-station-bike'].motorcycle.publishedFeesRaw,/60分100円/);
 assert.match(profiles['toshima-times-higashi13-bike'].motorcycle.publishedFeesRaw,/60分220円/);
 assert.match(profiles['16004'].motorcycle.classesRaw.join(' '),/4\.0kW.*白ナンバー/);
 assert.equal(profiles['toshima-higashi-registration'].motorcycle.regularStatus,'confirmed_annual_registration_required');
 assert.equal(profiles['toshima-higashi-registration'].motorcycle.temporaryStatus,'not_offered');
 assert.equal(profiles['16040'].bicycle.temporaryStatus,'confirmed');assert.equal(profiles['16040'].bicycle.regularStatus,'confirmed_application_required');
 assert.equal(parking.find(p=>p.id==='toshima-civic-center').accessScope,'facility_users_only');
 for(const id of ['16004','16005']){assert.equal(parking.find(p=>p.id===id).displayEligible,false);assert.equal(parking.find(p=>p.id===id).coordinateStatus,'official_google_location_conflict');}
 for(const [alias,canonical]of [['repark-8240','16041'],['repark-11931','16048']]){const p=parking.find(p=>p.id===alias);assert.equal(p.displayEligible,false);assert.equal(p.canonicalFacilityId,canonical);}
 for(const r of report.records)assert.equal(profiles[r.id].privateElectricScooter.admissionStatus,['16004','16018','16031'].includes(r.id)?'confirmed':'unknown');
 for(const id of ['16004','16018','16031']){assert.equal(profiles[id].privateElectricScooter.temporaryStatus,'unverified');assert.equal(profiles[id].privateElectricScooter.publishedFeesRaw,'');}
 const app=fs.readFileSync(path.join(root,'source/public/app.js'),'utf8'),context=vm.createContext({localStorage:{getItem:()=>null},document:{getElementById:()=>null}});
 vm.runInContext(app.slice(0,app.indexOf("$('search').addEventListener")),context);
 context.places=parking;vm.runInContext('state.places=places',context);
 // The resolver is defined after the listener section, so evaluate that function alone.
 vm.runInContext(app.match(/function canonicalPlaceId\(id\)\{[^\n]+\}/)[0],context);
 assert.equal(vm.runInContext('canonicalPlaceId("repark-8240")',context),'16041');
});
const call=(p,options={})=>worker.fetch(new Request(backend+p,options),env);
test('rejects forged identity, wrong JWT signature, audience, email and expired JWT',async()=>{
  assert.equal((await call('/api/admin/comments',{headers:{'oai-authenticated-user-id':'fake','oai-authenticated-user-email':env.ADMIN_EMAIL}})).status,403);
  for(const claims of [{aud:['wrong']},{email:'other@example.com'},{exp:1},{iss:'https://other.cloudflareaccess.com'}]) assert.equal(await verifyAdmin(new Request(backend,{headers:{'Cf-Access-Jwt-Assertion':await token(claims)}}),env),null);
  const signed=await token(),parts=signed.split('.');parts[2]=Buffer.alloc(256).toString('base64url');
  assert.equal(await verifyAdmin(new Request(backend,{headers:{'Cf-Access-Jwt-Assertion':parts.join('.')}}),env),null);
  assert.equal((await call('/api/admin/session',{headers:{'Cf-Access-Jwt-Assertion':signed}})).status,200);
});
test('CORS allows configured frontend and rejects unrelated submission origins',async()=>{
  const allowed=await call('/api/comments',{method:'OPTIONS',headers:{Origin:frontend,'Access-Control-Request-Method':'POST'}});
  assert.equal(allowed.status,204);assert.equal(allowed.headers.get('Access-Control-Allow-Origin'),frontend);
  assert.equal((await call('/api/comments',{method:'OPTIONS',headers:{Origin:'https://evil.example','Access-Control-Request-Method':'POST'}})).status,403);
  assert.equal((await call('/api/comments',{method:'POST',headers:{Origin:'https://evil.example'}})).status,403);
});
test('anonymous comment/photo stays private, moderator can approve it, public can then read it',async()=>{
  const id=crypto.randomUUID(),data=new FormData();
  for(const [k,v] of Object.entries({id,facility,vehicle:'bicycle',body:'Local migration test'}))data.set(k,v);
  data.set('photos',new Blob([new Uint8Array([137,80,78,71,13,10,26,10,0,0])],{type:'image/png'}),'photo.png');
  const submit=()=>call('/api/comments',{method:'POST',headers:{Origin:frontend,'cf-connecting-ip':'192.0.2.1'},body:data});
  assert.equal((await submit()).status,201);assert.equal((await submit()).status,200);
  assert.equal((await (await call('/api/comments?facility='+facility)).json()).comments.length,0);
  assert.equal((await call('/api/photos/'+id+'?index=0')).status,404);
  const auth={'Cf-Access-Jwt-Assertion':await token()};
  assert.equal((await call('/api/photos/'+id+'?index=0',{headers:auth})).status,200);
  assert.equal((await call('/api/admin/comments/'+id,{method:'PATCH',headers:{...auth,Origin:backend,'Content-Type':'application/json'},body:JSON.stringify({status:'approved',note:'checked'})})).status,200);
  const published=(await (await call('/api/comments?facility='+facility)).json()).comments;
  assert.equal(published.length,1);assert.equal(published[0].body,'Local migration test');assert.equal(published[0].adminNote,undefined);
  assert.equal((await call(published[0].photos[0])).status,200);
  assert.equal((await call('/api/photos/'+id+'?index=3')).status,404);
});
test('rate limit remains in place after migration',async()=>{
  for(let i=0;i<6;i++) {
    const data=new FormData();for(const [k,v] of Object.entries({id:crypto.randomUUID(),facility,vehicle:'bicycle',body:'Test '+i}))data.set(k,v);
    const response=await call('/api/comments',{method:'POST',headers:{Origin:frontend,'cf-connecting-ip':'192.0.2.20'},body:data});
    assert.equal(response.status,i<5?201:429);
  }
});
test('static build preserves data and all local HTML links resolve on Pages',()=>{
  const out=fs.mkdtempSync(path.join(os.tmpdir(),'tomespot-migration-'));
  try {
    buildFrontend({apiBase:backend,output:out});
    const index=fs.readFileSync(path.join(out,'index.html'),'utf8');
    assert.ok(!index.includes('class="side-footer"'));
    assert.ok(!index.includes('class="edition"'));
    assert.ok(!index.includes('class="search-about"'));
    assert.match(index,/href="\/about.html"/);
    assert.match(index,/name="google-site-verification"/);
    assert.match(index,/config\.js/);assert.match(index,/href="https:\/\/tomespot-api\.example\.workers\.dev\/admin"/);
    const kickboard=fs.readFileSync(path.join(out,'kickboard-parking.html'),'utf8');
    assert.match(kickboard,/class="workspace"/);
    assert.match(kickboard,/window.TOMESPOT_ENTRY=\{"language":"ja","vehicle":"privateElectricScooter"/);
    assert.match(kickboard,/<title>電動キックボードの駐輪場｜/);
    assert.ok(!kickboard.match(/<title>[^<]*東京/));
    assert.match(kickboard,/目黒駅周辺のマイ電動キックボード駐輪場を地図で検索/);
    assert.match(kickboard,/class="kickboard-guide"/);
    const motorcycle=fs.readFileSync(path.join(out,'motorcycle-parking.html'),'utf8');
    assert.match(motorcycle,/class="workspace"/);
    assert.match(motorcycle,/window.TOMESPOT_ENTRY=\{"language":"ja","vehicle":"motorcycle"/);
    assert.match(motorcycle,/<title>原付・バイクの駐車場・駐輪場を探す｜トメスポ<\/title>/);
    assert.match(motorcycle,/rel="canonical" href="https:\/\/muko-tomespot.pages.dev\/motorcycle-parking"/);
    assert.match(motorcycle,/<summary>原付・バイクの駐車場一覧・利用ガイド<\/summary>/);
    assert.match(motorcycle,/すべての排気量のバイクが利用できるわけではありません/);
    const cityReports=['kawaguchi','toshima','kanto','motorcycle'].map(city=>JSON.parse(fs.readFileSync(path.join(root,'source/public/'+city+'-review.json'),'utf8')));
    const expectedFacilities=new Set(['fk-ikebukuro2','seibu-minami-ikebukuro',...fs.readdirSync(path.join(root,'source/public/parking')).map(f=>f.replace(/\.html$/,'')),...cityReports.flatMap(r=>r.records.map(x=>x.id))]);
    const coverage=JSON.parse(fs.readFileSync(path.join(out,'area-coverage.json'),'utf8'));
    assert.equal(coverage.prefectures.length,4);
    assert.ok(coverage.pages.every(p=>p.count>=3));
    for(const page of coverage.pages){const html=fs.readFileSync(path.join(out,page.path+'.html'),'utf8');for(const [,id] of html.matchAll(/href="\/parking\/([^"/]+)\.html"/g))expectedFacilities.add(id);}
    assert.deepEqual(new Set(fs.readdirSync(path.join(out,'parking')).map(f=>f.replace(/\.html$/,''))),expectedFacilities);
    assert.equal(fs.readFileSync(path.join(out,'parking.json'),'utf8'),fs.readFileSync(path.join(root,'source/public/parking.json'),'utf8'));
    const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(path.join(dir,x.name)):[path.join(dir,x.name)]);
    for(const file of walk(out)) {
      if(file.endsWith('.js')) new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});
      if(!file.endsWith('.html'))continue;
      const html=fs.readFileSync(file,'utf8');assert.ok(!html.includes('tomespot-test.nuttymink33.chatgpt.site'));
      for(const [,href] of html.matchAll(/(?:href|src)="([^"\s]+)"/g)) {
        if(/^(?:https?:|data:|blob:|mailto:|tel:|#|\/\/)/.test(href))continue;
        const url=new URL(href,new URL(path.relative(out,file).replaceAll('\\','/'),frontend+'/'));
        const local=decodeURIComponent(url.pathname);
        assert.ok(fs.existsSync(path.join(out,local==='/'?'index.html':local)),file+' missing '+local);
      }
    }
    assert.ok(!fs.existsSync(path.join(out,'ikebukuro-kickboard-parking.html')));
    assert.equal(fs.readFileSync(path.join(out,'ikebukuro-scooter-references.json'),'utf8'),fs.readFileSync(path.join(root,'source/public/ikebukuro-scooter-references.json'),'utf8'));
    assert.match(fs.readFileSync(path.join(out,'_redirects'),'utf8'),/\/ikebukuro-kickboard-parking \/toshima-parking 301/);
    assert.ok(!fs.readFileSync(path.join(out,'app.js'),'utf8').includes('scooter-reference-guide'));
    for(const id of ['16037','16041','toshima-sunshine-west','fk-ikebukuro2','seibu-minami-ikebukuro'])assert.ok(fs.readFileSync(path.join(out,'parking',id+'.html'),'utf8').includes('class="reference-evidence"'));
    assert.ok(!fs.existsSync(path.join(out,'admin.js')));
    assert.ok(!fs.existsSync(path.join(out,'batch-09-review.html')));
    assert.ok(!fs.readFileSync(path.join(out,'sitemap.xml'),'utf8').includes('<loc>'+frontend+'/parking/kanagawa-no-such-place'));
    const sitemap=fs.readFileSync(path.join(out,'sitemap.xml'),'utf8');
    assert.ok(!sitemap.includes('.html</loc>'));
    const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
    assert.equal(new Set(urls).size,urls.length,'sitemap must not contain duplicate canonical URLs');
    const originalXML=fs.readFileSync(path.join(root,'source/public/sitemap.xml'),'utf8');
    const expectedPaths=new Set([...originalXML.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>new URL(m[1]).pathname.replace(/\.html$/,'')));
    for(const p of ['/about','/kawaguchi-parking','/toshima-parking','/kanto-parking','/regional-motorcycle-parking','/parking/fk-ikebukuro2','/parking/seibu-minami-ikebukuro',...cityReports.flatMap(r=>r.records.map(x=>'/parking/'+x.id))])expectedPaths.add(p);
    for(const p of ['/areas/index','/areas/tokyo','/areas/saitama','/areas/chiba-prefecture','/areas/kanagawa',...coverage.pages.map(p=>p.path),...Array.from(expectedFacilities,id=>'/parking/'+id)])expectedPaths.add(p);
    assert.deepEqual(new Set(urls.map(u=>new URL(u).pathname)),expectedPaths);
    for(const url of urls){
      assert.equal(new URL(url).origin,'https://muko-tomespot.pages.dev');
      const p=new URL(url).pathname;
      const file=p==='/'?'index.html':p.slice(1)+'.html';
      assert.ok(fs.existsSync(path.join(out,file)),url+' has no output');
      assert.ok(fs.readFileSync(path.join(out,file),'utf8').includes('rel="canonical" href="'+url+'"'),url+' canonical differs');
    }
    for(const [file,term] of [['kickboard-parking.html','キックボード駐車場'],['bicycle-parking.html','自転車駐輪場'],['motorcycle-parking.html','バイク駐輪場']]){
      const page=fs.readFileSync(path.join(out,file),'utf8');
      assert.ok(page.includes(term));
      for(const [,data]of page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g))JSON.parse(data);
    }
  } finally {fs.rmSync(out,{recursive:true,force:true});}
});
test('map regions identify prefectures locally and do not infer another region for the sea',()=>{
  const app=fs.readFileSync(path.join(root,'source/public/app.js'),'utf8');
  const context=vm.createContext({localStorage:{getItem:()=>null},document:{getElementById:()=>null}});
  vm.runInContext(app.slice(0,app.indexOf("$('search').addEventListener")),context);
  const regions=JSON.parse(fs.readFileSync(path.join(root,'source/public/prefectures.json'),'utf8')).prefectures;
  assert.equal(regions.length,47);context.regions=regions;
  vm.runInContext('prefectureRegions=regions',context);
  for(const [lat,lng,name]of [[35.6895,139.6917,'東京都'],[35.4437,139.638,'神奈川県'],[35.8617,139.6455,'埼玉県'],[43.0618,141.3545,'北海道'],[26.2124,127.6809,'沖縄県'],[34.6937,135.5023,'大阪府'],[0,0,'']]){
    assert.equal(vm.runInContext(`prefectureAt({lat:${lat},lng:${lng}})`,context),name);
  }
  assert.match(app,/on\('moveend',updateMapRegion\)/);
  const heading={hidden:false,toggleAttribute(name,enabled){this.ready=enabled;}};
  const label={textContent:'',closest:()=>heading};
  context.document.getElementById=()=>label;
  context.mapCenter={lat:35.6895,lng:139.6917};
  vm.runInContext('state.map={getCenter:()=>mapCenter};updateMapRegion()',context);
  assert.equal(label.textContent,'東京都');assert.equal(heading.hidden,false);assert.equal(heading.ready,true);
  context.mapCenter={lat:0,lng:0};
  vm.runInContext('updateMapRegion()',context);
  assert.equal(label.textContent,'');assert.equal(heading.hidden,true);assert.equal(heading.ready,false);
});

test('Maps trial keeps disputed addresses and separates bicycle, motorcycle and scooter evidence',()=>{
  const parking=JSON.parse(fs.readFileSync(path.join(root,'source/public/parking.json'),'utf8'));
  const vehicles=JSON.parse(fs.readFileSync(path.join(root,'source/public/vehicle-data.json'),'utf8'));
  const bay=parking.places.find(p=>p.id==='yk-14102-bayquarter');
  assert.equal(bay.displayEligible,true);assert.ok(Number.isFinite(bay.lat)&&Number.isFinite(bay.lng));
  assert.ok(bay.locationNotice);assert.equal(bay.positionPrecision,'facility-point');
  assert.equal(vehicles.profiles[bay.id].bicycle.admissionStatus,'confirmed');
  assert.equal(vehicles.profiles[bay.id].motorcycle.admissionStatus,'confirmed');
  assert.equal(vehicles.profiles[bay.id].privateElectricScooter.admissionStatus,'unknown');
  assert.match(vehicles.profiles[bay.id].bicycle.publishedFeesRaw,/3時間/);
  assert.match(vehicles.profiles[bay.id].motorcycle.publishedFeesRaw,/2時間/);
  const disputed=parking.places.find(p=>p.id==='yk-14102-cyca-949');
  assert.match(disputed.address,/亀住町/);assert.ok(!disputed.address.includes('緑園'));
});

test('Nishikawaguchi adds motorcycle facilities without applying time-based fees to monthly spaces',async()=>{
  const parking=JSON.parse(fs.readFileSync(path.join(root,'source/public/parking.json'),'utf8'));
  const vehicles=JSON.parse(fs.readFileSync(path.join(root,'source/public/vehicle-data.json'),'utf8'));
  const places=parking.places.filter(p=>p.regionalBatch==='nishikawaguchi-2026-10-20');
  assert.equal(places.length,4);
  for(const p of places){
    assert.equal(p.ward,'埼玉県川口市');assert.ok(Number.isFinite(p.lat)&&Number.isFinite(p.lng));
    const profiles=vehicles.profiles[p.id];assert.equal(profiles.motorcycle.admissionStatus,'confirmed');
    assert.equal(profiles.privateElectricScooter.admissionStatus,'unknown');
    assert.equal((await call('/api/comments?facility='+p.id)).status,200);
  }
  assert.equal(vehicles.profiles['nishi-east-coin'].motorcycle.temporaryStatus,'confirmed');
  assert.match(vehicles.profiles['nishi-east-coin'].motorcycle.classesRaw.join(' '),/原付限定/);
  for(const id of ['nishi-shiinoki-monthly','nishi-bikepark-30250','nishi-npc-341470']){
    assert.equal(vehicles.profiles[id].motorcycle.temporaryStatus,'not_offered');
    assert.equal(vehicles.profiles[id].motorcycle.regularStatus,'confirmed_application_required');
  }
  assert.ok(!places.some(p=>p.name==='西川口自転車駐車場'));
});

test('Kawaguchi audit separates current fees, annual permits, vehicle classes and unlocated facilities',async()=>{
 const parking=JSON.parse(fs.readFileSync(path.join(root,'source/public/parking.json'),'utf8'));
 const vehicles=JSON.parse(fs.readFileSync(path.join(root,'source/public/vehicle-data.json'),'utf8'));
 const report=JSON.parse(fs.readFileSync(path.join(root,'source/public/kawaguchi-review.json'),'utf8'));
 const batch=parking.places.filter(p=>p.regionalBatch==='kawaguchi-2026-10-20');
 assert.equal(batch.length,57);assert.equal(report.records.length,61);
 assert.equal(new Set(parking.places.map(p=>p.id)).size,parking.places.length);
 assert.equal(batch.filter(p=>p.researchCategory==='municipal-managed').length,16);
 const annual=batch.filter(p=>p.researchCategory==='municipal-annual');assert.equal(annual.length,18);
 assert.equal(annual.filter(p=>vehicles.profiles[p.id].motorcycle.admissionStatus==='confirmed').length,11);
 assert.equal(batch.filter(p=>!p.displayEligible).length,8);
 for(const p of batch){
  if(p.displayEligible)assert.ok(p.lat>35.7&&p.lat<35.95&&p.lng>139.6&&p.lng<139.85);
  else {assert.equal(p.lat,null);assert.equal(p.lng,null);}
  assert.equal((await call('/api/comments?facility='+p.id)).status,200);
 }
 assert.ok(!batch.some(p=>p.name==='西川口自転車駐車場'));
 assert.match(vehicles.profiles['kawaguchi-city-50990'].motorcycle.publishedFeesRaw,/300円/);
 assert.match(vehicles.profiles['kawaguchi-city-51002'].motorcycle.classesRaw.join(' '),/白ナンバー/);
 assert.equal(vehicles.profiles['kawaguchi-city-51001'].bicycle.temporaryStatus,'not_offered');
 assert.equal(vehicles.profiles['kawaguchi-city-50996'].motorcycle.regularStatus,'not_offered');
 assert.equal(vehicles.profiles['kawaguchi-city-51003'].motorcycle.admissionStatus,'unknown');
 assert.equal(vehicles.profiles['kawaguchi-city-51002'].privateElectricScooter.admissionStatus,'confirmed');
 assert.equal(vehicles.profiles['kawaguchi-kspit-moto'].privateElectricScooter.admissionStatus,'unknown');
 assert.match(vehicles.profiles['kawaguchi-kspit-moto'].motorcycle.publishedFeesRaw,/126cc以上.*600円/);
 assert.equal(vehicles.profiles['kawaguchi-kspit-moto'].motorcycle.feeEffectiveDate,'2026-10-01');
 for(const p of annual){const q=vehicles.profiles[p.id].motorcycle;if(q.admissionStatus==='confirmed'){assert.equal(q.temporaryStatus,'not_offered');assert.equal(q.regularStatus,'confirmed_annual_registration_required');assert.equal(q.registrationPeriod.end,'2027-09-30');}}
 assert.ok(report.historicalMapRows.some(r=>r.status==='outside_kawaguchi'));
 assert.ok(report.historicalMapRows.some(r=>r.sourceDate==='2018-09'));
 assert.equal(report.candidates.filter(r=>r.status==='same_name_google_position_conflicts_with_operator').length,5);
 const repark=parking.places.find(p=>p.id==='kawaguchi-repark-15139');
 assert.ok(Math.abs(repark.lat-35.831816667)<0.00001);
 assert.equal(repark.coordinateStatus,'operator_published_reference_point_not_entrance_surveyed');
});

test('eastern Chiba and Saitama expansion keeps annual fees, motorcycle classes and airport rates separate',async()=>{
 const report=JSON.parse(fs.readFileSync(path.join(root,'source/public/motorcycle-review.json'))),records=report.records.filter(r=>r.expansionBatch==='east-2026-10-21'),parking=JSON.parse(fs.readFileSync(path.join(root,'source/public/parking.json'))).places,v=JSON.parse(fs.readFileSync(path.join(root,'source/public/vehicle-data.json'))).profiles;
 assert.equal(records.length,41);assert.equal(records.filter(r=>r.mapReady).length,37);const prior=report.records.filter(r=>!r.expansionBatch||r.expansionBatch==='east-2026-10-21');assert.equal(prior.length,184);assert.equal(prior.filter(r=>r.profiles.motorcycle.admissionStatus==='confirmed').length,183);assert.equal(prior.filter(r=>r.mapReady).length,169);
 for(const [city,count] of [['千葉県印西市',6],['千葉県成田市',15],['千葉県木更津市',4],['埼玉県越谷市',9]])assert.equal(records.filter(r=>r.city===city).length,count);
 const find=name=>records.find(r=>r.name===name),q=id=>records.find(r=>r.id===id).profiles.motorcycle;
 for(const r of records){assert.deepEqual(v[r.id],r.profiles);assert.equal(r.profiles.bicycle.admissionStatus,r.id.startsWith('inzai-cyca-')?'confirmed':'unknown');assert.equal(r.profiles.privateElectricScooter.admissionStatus,'unknown');if(r.mapReady){assert.equal(parking.filter(p=>p.id===r.id).length,1);assert.ok(Number.isFinite(r.lat)&&Number.isFinite(r.lng));assert.equal((await call('/api/comments?facility='+r.id)).status,200);}else assert.ok(!parking.some(p=>p.id===r.id));}
 for(const r of records.filter(r=>r.city==='千葉県印西市')){const p=r.profiles.motorcycle;assert.equal(r.motorcycleScope,'upTo125');assert.equal(p.regularStatus,'confirmed_annual_registration_required');assert.match(p.publishedFeesRaw,/200円／24時間/);assert.match(p.publishedFeesRaw,/7,700円/);assert.equal(p.registrationPeriod.end,'2027-03-31');}
 const narita=find('JR成田駅西口駐輪場').profiles.motorcycle;assert.equal(narita.temporaryStatus,'not_offered');assert.deepEqual(narita.annualApplicationFees['10'],['2,610円','1,300円','5,230円','2,610円']);assert.match(narita.publishedFeesRaw,/郵送料110円/);
 const free=find('成田駅西口 無料第1駐輪場');assert.equal(free.motorcycleScope,'upTo50');assert.equal(free.profiles.motorcycle.temporaryStatus,'confirmed');assert.match(free.profiles.motorcycle.publishedFeesRaw,/無料/);
 const west2=find('木更津駅西口第2自転車駐車場').profiles.motorcycle;assert.equal(west2.temporaryStatus,'not_offered');assert.equal(west2.regularStatus,'confirmed_annual_registration_required');assert.match(west2.publishedFeesRaw,/市内1,750円、市外2,000円/);
 assert.equal(q('koshigaya-cycle-11222016').temporaryStatus,'not_offered');assert.match(q('koshigaya-cycle-11222016').publishedFeesRaw,/3,930円/);assert.match(q('koshigaya-cycle-11222032').publishedFeesRaw,/200円\/16時間/);
 for(const id of ['narita-airport-p1','narita-airport-p2']){const p=q(id);assert.match(p.publishedFeesRaw,/80円／30分/);assert.match(p.publishedFeesRaw,/630円/);assert.ok(!p.publishedFeesRaw.includes('2,100'));assert.ok(!p.publishedFeesRaw.includes('無料'));assert.match(p.currentConditionsRaw.join(' '),/有人料金所/);}
 assert.match(q('kasukabe-tobu-754').publishedFeesRaw,/1日・当日/);assert.match(q('kasukabe-tobu-900').publishedFeesRaw,/5,500円/);
 assert.equal(new Set(parking.map(p=>p.id)).size,parking.length);
});

test('north Chiba and Saitama audit keeps current Matsudo tariffs, Kashiwa annual permits and explicit Kuki scooter admission',async()=>{
 const report=JSON.parse(fs.readFileSync(path.join(root,'source/public/motorcycle-review.json'))),records=report.records.filter(r=>r.expansionBatch==='north-2026-10-21'),parking=JSON.parse(fs.readFileSync(path.join(root,'source/public/parking.json'))).places,v=JSON.parse(fs.readFileSync(path.join(root,'source/public/vehicle-data.json'))).profiles;
 assert.equal(records.length,34);assert.equal(records.filter(r=>r.mapReady).length,28);
 for(const [city,count] of [['千葉県松戸市',24],['千葉県柏市',3],['埼玉県上尾市',3],['埼玉県久喜市',4]])assert.equal(records.filter(r=>r.city===city).length,count);
 for(const r of records){assert.deepEqual(v[r.id],r.profiles);assert.equal(r.profiles.motorcycle.admissionStatus,'confirmed');assert.equal(r.profiles.bicycle.admissionStatus,'unknown');if(r.mapReady){assert.equal(parking.filter(p=>p.id===r.id).length,1);assert.equal((await call('/api/comments?facility='+r.id)).status,200);}else assert.ok(!parking.some(p=>p.id===r.id));}
 const city=c=>records.filter(r=>r.city===c),find=name=>records.find(r=>r.name===name).profiles.motorcycle;
 const matsudo=city('千葉県松戸市');assert.equal(matsudo.filter(r=>/無料。/.test(r.profiles.motorcycle.publishedFeesRaw)).length,4);assert.equal(matsudo.filter(r=>r.profiles.motorcycle.publishedFeesRaw.includes('24時間ごと150円')).length,3);
 for(const r of matsudo){assert.equal(r.motorcycleScope,'upTo125');assert.equal(r.profiles.motorcycle.regularStatus,'unverified');assert.ok(!r.profiles.motorcycle.publishedFeesRaw.includes('200円'));assert.equal(r.profiles.privateElectricScooter.admissionStatus,'unknown');}
 assert.match(find('北小金駅南口第2自転車駐車場').currentConditionsRaw.join(' '),/回数券のみ/);
 const south=find('豊四季駅南口第一駐輪場');assert.equal(south.temporaryStatus,'not_offered');assert.equal(south.regularStatus,'confirmed_annual_registration_required');assert.match(south.publishedFeesRaw,/14,640円、.*17,040円/);
 const north=find('豊四季駅北口第一駐輪場');assert.match(north.publishedFeesRaw,/18,360円、.*21,960円/);assert.equal(north.registrationPeriod.end,'2027-03-31');
 assert.match(find('上尾西駐輪場').publishedFeesRaw,/125cc超460円/);assert.match(find('上尾西駐輪場').publishedFeesRaw,/4,700円/);assert.equal(find('あげおサイクルポート東').temporaryStatus,'unverified');assert.match(find('あげおサイクルポート西').currentConditionsRaw.join(' '),/新規受付中止/);
 for(const r of city('埼玉県久喜市')){const q=r.profiles.privateElectricScooter;assert.equal(q.admissionStatus,'confirmed');assert.equal(q.regularStatus,'confirmed_application_required');assert.ok(!q.publishedFeesRaw.includes('370円'));assert.ok(!q.publishedFeesRaw.includes('バイク大'));assert.equal(r.coordinateStatus,'operator_published_facility_point');}
 assert.equal(v['kuki-cycle-11232002'].privateElectricScooter.temporaryStatus,'not_offered');assert.match(v['kuki-cycle-11462001'].privateElectricScooter.publishedFeesRaw,/310円/);assert.match(v['kuki-cycle-11462001'].motorcycle.publishedFeesRaw,/370円/);
 assert.equal(report.stats.records,report.records.length);assert.equal(report.stats.mapped,report.records.filter(r=>r.mapReady).length);assert.equal(new Set(parking.map(p=>p.id)).size,parking.length);assert.ok(!JSON.stringify(records).includes('AIza'));
});

test('Musashisakai restores current 125cc temporary spaces and retains disputed fees without reviving old monthly modes',async()=>{
 const report=JSON.parse(fs.readFileSync(path.join(root,'source/public/motorcycle-review.json'))),rows=report.records.filter(r=>r.expansionBatch==='musashisakai-2026-10-21'),places=JSON.parse(fs.readFileSync(path.join(root,'source/public/parking.json'))).places,v=JSON.parse(fs.readFileSync(path.join(root,'source/public/vehicle-data.json'))).profiles;
 assert.equal(rows.length,6);const find=id=>rows.find(r=>r.id===id),profile=id=>v[id].motorcycle;
 for(const r of rows){const p=places.find(p=>p.id===r.id);assert.ok(p);assert.equal(p.displayEligible,true);assert.ok(p.lat>35.69&&p.lat<35.72&&p.lng>139.53&&p.lng<139.56);assert.deepEqual(r.profiles,v[r.id]);assert.equal((await call('/api/comments?facility='+r.id)).status,200);}
 for(const id of ['cpc-13203041','cpc-13203043','cpc-13203046']){const q=profile(id);assert.equal(q.admissionStatus,'confirmed');assert.equal(q.facilityMatched,true);assert.equal(q.temporaryStatus,'confirmed');assert.equal(q.regularStatus,'not_offered');assert.match(q.classesRaw.join(' '),/125cc以下/);assert.equal(v[id].privateElectricScooter.admissionStatus,'unknown');}
 const dispute=profile('cpc-13203041');assert.equal(dispute.feeStatus,'source_difference_requires_reconciliation');assert.equal(dispute.feeDiscrepancy.cityPeriodHours,12);assert.equal(dispute.feeDiscrepancy.operatorPeriodHours,6);assert.match(dispute.publishedFeesRaw,/未確定/);assert.ok(!dispute.publishedFeesRaw.includes('150円'));assert.match(dispute.currentConditionsRaw.join(' '),/2,300mm以下.*700mm以下/);
 for(const id of ['cpc-13203043','cpc-13203046'])assert.match(profile(id).publishedFeesRaw,/2時間まで無料、以降12時間ごとに200円/);
 const smile=profile('musashisakai-smile-h645');assert.match(smile.publishedFeesRaw,/現金220円、交通系電子マネー200円/);assert.equal(smile.regularStatus,'not_offered');
 assert.match(profile('27024').publishedFeesRaw,/無料.*7日以上/);assert.match(profile('27024').classesRaw.join(' '),/第一種/);assert.equal(v['27024'].bicycle.admissionStatus,'confirmed');
 const monthly=profile('musashisakai-bike-p-570');assert.equal(monthly.temporaryStatus,'not_offered');assert.equal(monthly.regularStatus,'confirmed_application_required');assert.match(monthly.publishedFeesRaw,/4,000円.*未確認/);assert.match(monthly.currentConditionsRaw.join(' '),/満車/);assert.equal(monthly.hoursStatus,'unverified');assert.equal(find('musashisakai-bike-p-570').motorcycleScope,'unspecified');assert.ok(monthly.sources.some(s=>s.url==='http://www.bike-p.co.jp/parking_detail.html?id=570'));
 const generator=fs.readFileSync(path.join(root,'scripts/regional-motorcycle-pages.mjs'),'utf8');assert.ok(generator.includes('<option>東京都</option>'));
 assert.equal(new Set(places.map(p=>p.id)).size,places.length);
});

test('Musashisakai follow-up separates current monthly and reserved parking from Google review references',()=>{
 const report=JSON.parse(fs.readFileSync(path.join(root,'source/public/motorcycle-review.json'))),rows=report.records.filter(r=>r.expansionBatch==='musashisakai-followup-2026-10-21'),places=JSON.parse(fs.readFileSync(path.join(root,'source/public/parking.json'))).places;
 assert.equal(rows.length,9);assert.equal(rows.filter(r=>r.mapReady).length,7);assert.equal(rows.filter(r=>r.profiles.motorcycle.admissionStatus==='confirmed').length,6);
 const row=id=>rows.find(r=>r.id===id),q=id=>row(id).profiles.motorcycle;
 assert.match(q('musashisakai-tokup-310041135').publishedFeesRaw,/400円.*24時間.*予約必須/);assert.equal(q('musashisakai-tokup-310041135').regularStatus,'not_offered');
 assert.match(q('musashisakai-place-moped').classesRaw.join(' '),/125cc.*500mm/);assert.match(q('musashisakai-place-moped').currentConditionsRaw.join(' '),/施設利用者/);
 assert.equal(q('musashisakai-tfas').admissionStatus,'unknown');assert.equal(q('musashisakai-tfas').feeDiscrepancy.photoFreeMinutes,30);assert.equal(q('musashisakai-tfas').feeDiscrepancy.secondaryFreeMinutes,60);assert.ok(q('musashisakai-tfas').referenceEvidence[0].sources.length>=2);
 assert.equal(row('musashisakai-times-buk004534901').mapReady,false);assert.ok(!places.some(p=>p.id==='musashisakai-times-buk004534901'));
 assert.equal(q('musashisakai-tomy').hours,'24時間');assert.equal(q('musashisakai-tobu-1078').temporaryStatus,'not_offered');
 for(const r of rows)assert.equal(r.profiles.privateElectricScooter.admissionStatus,'unknown');
});

test('Ukimafunado scooter reference is visible without claiming official acceptance or bicycle fees',()=>{
 const parking=JSON.parse(fs.readFileSync(path.join(root,'source/public/parking.json'))).places,profiles=JSON.parse(fs.readFileSync(path.join(root,'source/public/vehicle-data.json'))).profiles,locales=JSON.parse(fs.readFileSync(path.join(root,'source/public/locales.json'))),dataLocales=JSON.parse(fs.readFileSync(path.join(root,'source/public/data-locales.json'))),place=parking.find(p=>p.id==='jks-00800'),q=profiles[place.id].privateElectricScooter;
 assert.equal(q.admissionStatus,'unknown');assert.equal(q.temporaryStatus,'unverified');assert.equal(q.includeInVehicleResults,true);assert.equal(q.referenceTemporaryUse,true);assert.equal(q.tariffs.length,0);assert.match(profiles[place.id].motorcycle.publishedFeesRaw,/200円.*3,000円.*9,000円/);
 const el={search:{value:''},ward:{value:''},unknown:{checked:false}},c=vm.createContext({URL,localStorage:{getItem:()=>null},document:{getElementById:id=>el[id]}});vm.runInContext(fs.readFileSync(path.join(root,'source/public/app.js'),'utf8').split("$('search').addEventListener")[0],c);c.fixture=place;c.profiles=profiles;c.l=locales;c.d=dataLocales;
 vm.runInContext('state.places=[fixture];state.vehicle="privateElectricScooter";vehicleData={profiles};messages=l;dataMessages=d;',c);
 assert.equal(vm.runInContext('filtered().map(p=>p.id).join(",")',c),'jks-00800');assert.equal(vm.runInContext('filtered()[0].status',c),'unknown');vm.runInContext('state.mode="temporary"',c);assert.equal(vm.runInContext('filtered().length',c),1);
 for(const lang of ['ja','zh-Hans','zh-Hant','en']){c.lang=lang;vm.runInContext('locale=lang',c);const html=vm.runInContext('referenceEvidenceHtml(profiles[fixture.id].privateElectricScooter)',c);assert.ok(html.includes(dataLocales[q.referenceEvidence[0].summary][lang]));assert.ok(html.includes('lang="'+lang+'"'));assert.ok(!html.includes('undefined'));assert.equal(vm.runInContext('statusText(filtered()[0])',c),locales.reportedUse[lang]);}
});

test('moped defaults include scooter candidates without inventing official admission, fees or user reviews',()=>{
 const v=JSON.parse(fs.readFileSync(path.join(root,'source/public/vehicle-data.json'))),l=JSON.parse(fs.readFileSync(path.join(root,'source/public/locales.json')));
 const elements={search:{value:''},ward:{value:''},unknown:{checked:false}};
 const c=vm.createContext({URL,localStorage:{getItem:()=>null},document:{getElementById:id=>elements[id]}});
 vm.runInContext(fs.readFileSync(path.join(root,'source/public/app.js'),'utf8').split("$('search').addEventListener")[0],c);
 const m={admissionStatus:'confirmed',facilityMatched:true,classesRaw:['原付50cc以下'],temporaryStatus:'confirmed',regularStatus:'confirmed_application_required',checked:'2026-10-22',publishedFeesRaw:'100円',sources:[{url:'https://example.com/moped'}]};
 const q={admissionStatus:'unknown',facilityMatched:true,temporaryStatus:'unverified',regularStatus:'unverified',tariffs:[],sources:[]};
 c.rows={candidate:{motorcycle:m,privateElectricScooter:q},rejected:{motorcycle:m,privateElectricScooter:{...q,admissionStatus:'rejected'}},unmatched:{motorcycle:{...m,facilityMatched:false},privateElectricScooter:q},bikeOnly:{motorcycle:{...m,classesRaw:['自動二輪125cc超のみ']},privateElectricScooter:q},closed:{motorcycle:{...m,temporaryClosureNotice:{startDate:'2020-01-01',endDateInclusive:'2099-12-31'}},privateElectricScooter:q},explicitBan:{motorcycle:m,privateElectricScooter:{...q,currentConditionsRaw:['電動キックボードは駐車できません']}},annual:{motorcycle:{...m,temporaryStatus:'not_offered',regularStatus:'confirmed_annual_registration_required'},privateElectricScooter:q}};
 c.messagesFixture=l;c.policy=v.scooterDefaultPolicy;
 vm.runInContext('dataset={source:"https://example.com/"};vehicleData={profiles:rows,scooterDefaultPolicy:policy};messages=messagesFixture;state.vehicle="privateElectricScooter";state.places=Object.keys(rows).map(id=>({id,name:id,displayEligible:true}));',c);
 assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(filtered().map(p=>p.id).sort())',c)),['annual','candidate']);
 const derived=JSON.parse(vm.runInContext('JSON.stringify(mopedDefaultProfile(rows.candidate))',c));assert.equal(derived.admissionStatus,'unknown');assert.equal(derived.publishedFeesRaw,undefined);assert.deepEqual(derived.tariffs,[]);assert.equal(derived.referenceEvidence,undefined);
 for(const lang of ['ja','zh-Hans','zh-Hant','en']){c.lang=lang;assert.equal(vm.runInContext('locale=lang;statusText(profilePlace(state.places[0]))',c),l.mopedAvailable[lang]);}
 assert.equal(vm.runInContext('state.mode="temporary";filtered().map(p=>p.id).join(",")',c),'candidate');
 assert.deepEqual(JSON.parse(vm.runInContext('state.mode="monthly";JSON.stringify(filtered().map(p=>p.id).sort())',c)),['annual','candidate']);
 assert.equal(vm.runInContext('state.mode="annual";filtered().map(p=>p.id).join(",")',c),'annual');
 assert.equal(q.admissionStatus,'unknown');assert.equal(q.includeInVehicleResults,undefined);
});

test('priority motorcycle batch keeps large bay dimensions, current fees, suspended reservations and moped-only modes separate',()=>{
 const report=JSON.parse(fs.readFileSync(path.join(root,'source/public/motorcycle-review.json'))),v=JSON.parse(fs.readFileSync(path.join(root,'source/public/vehicle-data.json'))).profiles,parking=JSON.parse(fs.readFileSync(path.join(root,'source/public/parking.json'))).places;
 const rows=report.records.filter(r=>r.expansionBatch==='shimbashi-uchisaiwaicho-karasuyama-2026-10-22');assert.equal(rows.length,11);assert.equal(rows.filter(r=>r.mapReady).length,8);
 for(const r of rows){assert.deepEqual(r.profiles,v[r.id]);assert.equal(parking.filter(p=>p.id===r.id).length,r.mapReady?1:0);}
 const q=id=>v[id].motorcycle;
 assert.match(q('tokyopublic-shimbashi3-51').publishedFeesRaw,/60分200円/);assert.match(q('tokyopublic-shimbashi3-51').classesRaw.join(' '),/2.5m/);
 assert.equal(q('tokyopublic-higashishimbashi1-53').newRegularApplications,'suspended');assert.match(q('tokyopublic-higashishimbashi1-53').classesRaw.join(' '),/50cc以下.*不可/);
 assert.match(q('times-hibiya-buk0048641').classesRaw.join(' '),/2,000mm/);assert.match(q('times-hibiya-buk0048641').publishedFeesRaw,/17,500円/);assert.ok(!q('times-hibiya-buk0048641').publishedFeesRaw.includes('15,710'));
 assert.match(q('karasuyama-nirin1745').publishedFeesRaw,/8,800円.*11,000円.*4,400円/);assert.match(q('bikepark-karasuyama200333').classesRaw.join(' '),/大型.*2,200mm/);
 assert.equal(q('12014').regularStatus,'not_offered');assert.equal(q('12014').temporaryStatus,'confirmed');assert.match(q('12014').publishedFeesRaw,/4時間以内100円.*24時間以内400円/);
 assert.equal(v['bikepark-karasuyama200284'].bicycle.admissionStatus,'unknown');assert.equal(v['bikepark-karasuyama200284'].privateElectricScooter.admissionStatus,'unknown');
});

test('motorcycle category preparation respects negative clauses, restricted mopeds and class-specific modes',async()=>{
 const {classifyMotorcycle}=await import('./motorcycle-classification.mjs');
 const make=classesRaw=>classifyMotorcycle({admissionStatus:'confirmed',facilityMatched:true,classesRaw,temporaryStatus:'confirmed',regularStatus:'confirmed_application_required',publishedFeesRaw:'原付100円／自動二輪200円'});
 for(const text of ['原動機付自転車50cc以下。公式の50cc超125cc以下欄は○ではない。','第一種原付：125cc以下かつ最高出力4.0kW以下・白ナンバー。','原動機付自転車（新基準125cc以下・最高出力4kW以下を含む。全125ccではない）']){const c=make([text]);assert.equal(c.disposition,'moped');assert.equal(c.groups.motorcycle.status,'unknown');assert.equal(c.mopedData.publishedFeesRaw,'');}
 assert.equal(make(['125cc以下のミニバイク。125cc超は対象外。']).disposition,'mixed');
 assert.equal(make(['自動二輪車125cc超。原付不可。']).disposition,'motorcycle');
 assert.equal(make(['バイク（排気量上限は未確認）']).disposition,'unspecified');
 const mixed=make(['原付50cc以下・普通自動二輪50cc超125cc以下']);assert.equal(mixed.mopedData.regularStatus,'unverified');assert.equal(mixed.mopedData.temporaryStatus,'unverified');
 const structured=classifyMotorcycle({admissionStatus:'confirmed',classes:[{classCode:'原',scope:'50cc以下／新基准原付',admissionStatus:'confirmed',temporaryStatus:'confirmed',regularStatus:'not_offered',tariffs:[{sourceVehicle:'原',temporary:{amountJPY:100,status:'confirmed'}}]},{classCode:'大',scope:'125cc以上',admissionStatus:'confirmed',temporaryStatus:'confirmed',regularStatus:'confirmed_application_required',tariffs:[{sourceVehicle:'大',temporary:{amountJPY:300,status:'confirmed'}}]}]});
 assert.equal(structured.disposition,'mixed');assert.equal(structured.mopedData.regularStatus,'not_offered');assert.equal(structured.mopedData.tariffs.length,1);assert.equal(structured.mopedData.tariffs[0].temporary.amountJPY,100);
});

test('stored moped fallbacks preserve official scooter status and render fees only as moped references in four languages',()=>{
 const v=JSON.parse(fs.readFileSync(path.join(root,'source/public/vehicle-data.json'))),l=JSON.parse(fs.readFileSync(path.join(root,'source/public/locales.json'))),d=JSON.parse(fs.readFileSync(path.join(root,'source/public/data-locales.json')));
 const c=vm.createContext({URL,localStorage:{getItem:()=>null},document:{getElementById:()=>null}});vm.runInContext(fs.readFileSync(path.join(root,'source/public/app.js'),'utf8').split("$('search').addEventListener")[0],c);c.v=v;c.l=l;c.d=d;
 vm.runInContext('vehicleData=v;messages=l;dataMessages=d;dataset={source:"https://example.com"};state.vehicle="privateElectricScooter";',c);
 for(const [id,row] of Object.entries(v.profiles)){if(!row.privateElectricScooter?.mopedFallback)continue;assert.equal(row.privateElectricScooter.admissionStatus,'unknown');assert.equal(row.motorcycle.categoryClassification.groups.moped.status,'confirmed');const fees=row.motorcycle.categoryClassification.mopedData.publishedFeesRaw;if(fees)for(const lang of ['ja','zh-Hans','zh-Hant','en'])assert.ok(d[fees]?.[lang],id);}
 c.place={id:'12014',name:'烏山中央自転車等駐車場',address:'東京都世田谷区南烏山5-17-23',ward:'世田谷区'};
 for(const lang of ['ja','zh-Hans','zh-Hant','en']){c.lang=lang;const html=vm.runInContext('locale=lang;profileDetailHtml(profilePlace(place),{compact:true})',c);assert.ok(html.includes(l.mopedFees[lang]));assert.ok(html.includes(d[v.profiles['12014'].motorcycle.publishedFeesRaw][lang]));assert.ok(html.includes(l.mopedAvailable[lang]));assert.ok(!html.includes('undefined'));}
 assert.ok(JSON.stringify(v.profiles['jks-00800'].privateElectricScooter).includes('user_supplied_review_text'));
});
