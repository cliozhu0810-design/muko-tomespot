import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const read=p=>JSON.parse(fs.readFileSync(new URL('../source/'+p,import.meta.url)));
const review=read('data/discovery-confirmation-review.json'),parking=read('public/parking.json'),vehicles=read('public/vehicle-data.json');
const byId=new Map(parking.places.map(p=>[p.id,p]));
test('published confirmations retain evidence, separate vehicle classes and never imply official scooter acceptance',()=>{
 const c=vm.createContext({});vm.runInContext(fs.readFileSync(new URL('../source/public/vehicle-categories.js',import.meta.url),'utf8'),c);
 const released=read('data/joint-release-baseline.json').publishedDecisions;
 for(const d of review.decisions.filter(d=>d.status==='confirmed_facility')){
  const p=byId.get(d.id),row=vehicles.reviewedProfiles[d.id],views=c.TomespotVehicleCategories.profiles(row);
  assert.equal(p.discoveryOnly,false);assert.equal(p.entranceVerified,false);
  const decision=v=>released.find(x=>x.id===d.id&&x.vehicle===v);
  assert.equal(views.privateElectricScooter.admissionStatus,decision('privateElectricScooter')?.status||'unknown');
  for(const k of ['bicycle','moped','motorcycle']){
   const newer=decision(k==='moped'?'motorcycle':k);
   if(newer&&k!=='bicycle'){
    assert.equal(c.TomespotVehicleCategories.combined(row).admissionStatus,newer.status);
    if(views[k].admissionStatus==='confirmed')assert.equal(d.vehicleFacts[k]?.admission,'confirmed','a combined update cannot invent an engine class');
   }else assert.equal(views[k].admissionStatus,newer?.status||(d.excludedVehicles?.includes(k)?'rejected':d.vehicleFacts[k]?.admission||'unknown'));
   assert.ok(views[k].sources.length);
  }
 }

 const times=vehicles.reviewedProfiles['gmaps-unverified-d0ddf7d5bcde'].reviewedCategories;assert.equal(times.bicycle.publishedFeesRaw,'');assert.equal(times.motorcycle.admissionStatus,'rejected');
 assert.equal(byId.get('36001').displayEligible,false);
 assert.equal(parking.places.filter(p=>p.discoveryOnly&&p.displayEligible!==false).length,481);
});
