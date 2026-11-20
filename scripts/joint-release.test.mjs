import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const read=name=>JSON.parse(fs.readFileSync(process.env.TOMESPOT_JOINT_PREVIEW_DIRECTORY?path.join(process.env.TOMESPOT_JOINT_PREVIEW_DIRECTORY,'preview-'+name):new URL('../source/public/'+name,import.meta.url)));
const data=read('vehicle-data.json'),translations=read('data-locales.json');
const release=data.jointPublishedReviewRelease?.release;
const jointProfiles=Object.entries(data.reviewedProfiles).flatMap(([id,row])=>[
 ...Object.entries(row.reviewedCategories||{}).map(([vehicle,q])=>({id,vehicle,q})),
 {id,vehicle:'combinedMotorcycle',q:row.motorcycle}
]).filter(({q})=>q?.jointReviewRelease===release&&release);
const languages=['ja','zh-Hans','zh-Hant','en'];
const chinese=/核实|核查|自行车|摩托车|电动|滑板车|未确认|排量|车区|车种|仅|不扩|不把|待核|临停|证据|来源|原始|地图|场地|收费/;

test('joint publication keeps every released decision sourced, scoped and localized',{skip:!release},()=>{
 assert.ok(jointProfiles.length>0);
 for(const {id,vehicle,q}of jointProfiles){
  const label=id+' '+vehicle;
  assert.equal(q.entranceVerified,false,label);
  assert.equal(q.vehicleFitVerified,false,label);
  assert.equal(q.allEngineSizesAllowed,false,label);
  assert.match(q.checked,/^\d{4}-\d{2}-\d{2}$/,label);
  assert.ok(q.jointReviewId,label);
  assert.ok(q.sources.length,label);
  for(const source of q.sources)assert.match(source.url,/^https?:\/\//,label);
  for(const text of q.classesRaw)assert.ok(!chinese.test(text),label+' untranslated reviewer prose');
  for(const note of q.currentConditionsRaw){
   assert.ok(translations[note],label+' untranslated condition');
   for(const language of languages)assert.ok(translations[note][language],label+' '+language);
  }
  assert.equal(q.draftDisplay,undefined,label);
  assert.equal(q.mopedDefault,undefined,label);
  assert.equal(q.policyId,undefined,label);
 }
});

test('joint publication does not promote unresolved or suspended use modes',{skip:!release},()=>{
 for(const {id,vehicle,q}of jointProfiles){
  const raw=q.sourceModeStatuses||{},label=id+' '+vehicle;
  if(q.admissionStatus!=='confirmed'){
   assert.equal(q.temporaryStatus,'unverified',label);
   assert.equal(q.regularStatus,'unverified',label);
   assert.equal(q.tariffs.length,0,label);
  }
  if(/unverified|pending|scope_check|conflict|suspend|waitlist/.test(raw.temporary||''))assert.notEqual(q.temporaryStatus,'confirmed',label);
  if(/unverified|pending|scope_check|conflict|suspend|waitlist/.test(raw.regular||''))assert.notEqual(q.regularStatus,'confirmed_application_required',label);
  if(q.regularStatus==='confirmed_annual_registration_required')assert.equal(q.annualRegistrationStatus,'confirmed_application_required',label);
 }
});

test('joint publication excludes unresolved reference tariffs from usable prices',{skip:!release},()=>{
 for(const {id,vehicle,q}of jointProfiles)for(const tariff of q.tariffs||[]){
  const label=id+' '+vehicle;
  for(const [key,value]of Object.entries(tariff))if(/referenceOnly|notActualFacilityTariff|doNotPromoteCeiling/.test(key))assert.notEqual(value,true,label+' '+key);
  if(tariff.amountJPY!=null)assert.ok(Number.isFinite(tariff.amountJPY)&&tariff.amountJPY>=0,label);
 }
});

test('combined motorized acceptance does not manufacture either engine category',{skip:!release},()=>{
 const c=vm.createContext({});vm.runInContext(fs.readFileSync(new URL('../source/public/vehicle-categories.js',import.meta.url),'utf8'),c);
 let count=0;
 for(const [id,row]of Object.entries(data.reviewedProfiles)){
  if(row.motorcycle?.jointReviewRelease!==release||!release)continue;count++;
  const combined=c.TomespotVehicleCategories.combined(row);
  assert.equal(combined.admissionStatus,row.motorcycle.jointMotorcycleAdmissionStatus,id);
  assert.equal(combined.allEngineSizesAllowed,false,id);
  for(const kind of ['moped','motorcycle'])assert.notEqual(row.reviewedCategories[kind]?.admissionStatus,'confirmed',id+' '+kind+' should require specific class evidence');
 }
 assert.ok(count>0);
});
