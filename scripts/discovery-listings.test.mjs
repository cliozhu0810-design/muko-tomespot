import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
const read=f=>JSON.parse(fs.readFileSync(new URL('../source/'+f,import.meta.url)));
const parking=read('public/parking.json'),audit=read('data/google-coverage-audit.json');
const code=f=>fs.readFileSync(new URL('../source/public/'+f,import.meta.url),'utf8');
function context(){const elements={search:{value:''},ward:{value:''},unknown:{checked:false}};
 const c=vm.createContext({URL,localStorage:{getItem:()=>null},document:{getElementById:id=>elements[id]}});
 for(const file of ['vehicle-categories.js','scooter-screening.js','discovery-listings.js'])vm.runInContext(code(file),c);
 vm.runInContext(code('app.js').split("$('search').addEventListener")[0],c);
 Object.assign(c,{parking,vehicles:read('public/vehicle-data.json'),locales:read('public/locales.json')});
 vm.runInContext('dataset=parking;vehicleData=vehicles;messages=locales;state.places=parking.places;',c);return c;}
test('Google discoveries preserve every existing record and remain unverified',()=>{
 const review=read('data/discovery-confirmation-review.json'),originalIds=new Set(audit.additions.map(a=>a.record.id)),before=new Map(review.appliedChanges.map(c=>[c.id,c.before]));
 const baseline=parking.places.filter(p=>!originalIds.has(p.id)).map(p=>before.get(p.id)||p),newRows=parking.places.filter(p=>p.discoveryOnly);
 assert.equal(parking.places.filter(p=>originalIds.has(p.id)&&!p.discoveryOnly).length,41);
 assert.equal(baseline.length,audit.baseline.records);
 assert.equal(createHash('sha256').update(JSON.stringify(baseline)).digest('hex'),audit.baseline.sha256);
 assert.equal(newRows.length,audit.summary.added-41);
 assert.equal(new Set(parking.places.map(p=>p.id)).size,parking.places.length);
 assert.equal(new Set(newRows.map(p=>p.googleMapsUrl.match(/!1s([^!]+)/)[1])).size,newRows.length);
 const vehicles=read('public/vehicle-data.json');
 for(const p of newRows){assert.equal(p.status,'unknown');assert.equal(p.price,null);assert.equal(p.hours,'');assert.equal(p.temporary,false);assert.equal(p.monthly,false);assert.equal(p.annual,false);assert.equal(vehicles.profiles[p.id],undefined);assert.ok(!p.discoveryVehicleHints.includes('privateElectricScooter'));assert.ok(!/LUUP|HELLO CYCLING|シェアサイクル|レンタサイクル/i.test(p.name));}
 assert.equal(audit.summary.observations,audit.summary.matched+audit.summary.added+audit.summary.pending+audit.summary.excluded);
 assert.equal(audit.runs.filter(r=>r.end?.reachedEnd).every(r=>!r.end.tail),true);
});
test('unverified category hints appear by default without leaking into scooter or confirmed modes',()=>{
 const c=context();const ids=(vehicle,mode='all')=>{Object.assign(c,{vehicle,mode});return JSON.parse(vm.runInContext('state.vehicle=vehicle;state.mode=mode;JSON.stringify(filtered().map(p=>p.id))',c));};
 const sets=Object.fromEntries(['bicycle','moped','motorcycle','privateElectricScooter'].map(v=>[v,new Set(ids(v))]));
 const current=read('public/vehicle-data.json');
 for(const p of parking.places.filter(p=>p.discoveryOnly))for(const [v,set] of Object.entries(sets)){const row=current.reviewedProfiles[p.id],reviewed=row?.publishedReview?.vehicles?.includes(v);const q=reviewed?(v==='motorcycle'?c.TomespotVehicleCategories.combined(row):c.TomespotVehicleCategories.profiles(row)[v]):null;assert.equal(set.has(p.id),p.displayEligible!==false&&(!q?.canonicalFacilityId||q.canonicalFacilityId===p.id)&&(reviewed?q.admissionStatus!=='rejected'&&(q.admissionStatus==='confirmed'||q.includeInVehicleResults):p.discoveryVehicleHints.some(h=>h===v||v==='motorcycle'&&h==='moped')),p.name+' '+v);}
 const confirmed=new Set(ids('bicycle','temporary'));for(const p of parking.places.filter(p=>p.discoveryOnly))assert.ok(!confirmed.has(p.id),'bicycle hints alone do not gain a use mode');
 for(const mode of ['temporary','monthly','annual']){
  const combined=new Set(ids('motorcycle',mode));
  for(const p of parking.places.filter(p=>p.discoveryOnly))if(combined.has(p.id)){const row=current.reviewedProfiles[p.id];assert.ok(row?.publishedReview?.vehicles?.includes('motorcycle'));const q=c.TomespotVehicleCategories.combined(row);assert.equal(q.admissionStatus,'confirmed');assert.ok(mode==='temporary'?q.temporaryStatus==='confirmed':mode==='annual'?q.annualRegistrationStatus==='confirmed_application_required':q.regularStatus==='confirmed_application_required'||q.annualRegistrationStatus==='confirmed_application_required');}
 }
 for(const p of parking.places.filter(p=>p.discoveryOnly&&p.discoveryVehicleHints.includes('moped'))){
  const q=c.TomespotDiscoveryListings.profile(p,'motorcycle');
  assert.equal(q.admissionStatus,'unknown');assert.equal(q.temporaryStatus,'unverified');assert.deepEqual([...q.tariffs],[]);
 }
 assert.ok(sets.privateElectricScooter.has('jks-00800'));
});
test('discovery cards and marker details expose exactly one safe Google Maps destination',()=>{
 const c=context();c.place=audit.additions[0].record;
 for(const fn of ['discoveryCardHtml','discoveryDetailHtml']){const html=vm.runInContext(fn+'(place)',c);assert.equal((html.match(/<a\b/g)||[]).length,1);assert.ok(html.includes('https://www.google.com/maps/place/'));assert.ok(!/data-open=|data-save=|comments-|tariff|verification|mailto:/.test(html));assert.ok(html.includes(vm.runInContext("t('pending')",c)));}
 const helper=c.TomespotDiscoveryListings;
 for(const url of ['javascript:alert(1)','https://google.com.evil.test/maps/place/x','https://www.google.com/url?q=x','http://www.google.com/maps/place/x'])assert.equal(helper.googleUrl({googleMapsUrl:url}),null);
 assert.ok(helper.googleUrl(c.place));
});
