// Deliberately fetch only these four public, static assets. No Supabase requests.
import fs from 'node:fs/promises';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root = new URL('../', import.meta.url);
const origin = 'https://muko-tomespot.pages.dev';
export const profileFields = ['admissionStatus','checked','facilityMatched','temporaryStatus','regularStatus','annualRegistrationStatus','classesRaw','classes','tariffs','sources','operatingRestrictions','currentConditionsRaw','hours','hoursStatus','feeStatus','publishedFeesRaw','scope','usageRestriction','availabilityNotice','temporaryClosureNotice','currentlyUsable','vehicleFitStatus','priceNotice','eligibilityNotice','operatorClassNotices','temporaryEntryExitRestriction','serviceScopeNotice','overnightHoursNotice','modeScopeNotice','futurePartialClosure','applicationWindow','newRegularApplications','regularNotice','modeNotice','engineCcMax','feeDiscrepancy','feeEffectiveDate','registrationPeriod','announcedTariffChange','annualApplicationFees','reservationRequired','scopeAudit','sourcePriceDate','hoursNotice','modeNotice','rejectionReason','source','sourceScopeCheck','sourcePriceDate','identityStatus','identityScope'];
const pick = (obj, keys) => Object.fromEntries(keys.filter(k => obj?.[k] !== undefined).map(k => [k,obj[k]]));
export function createSnapshot(assets) {
  const parking = JSON.parse(assets['parking.json']);
  const vehicles = JSON.parse(assets['vehicle-data.json']);
  const summariesSource=assets['comments.js'];
  const summaryMatch=summariesSource?.match(/const reviewedCommentSummaries\s*=\s*([\s\S]*?);\s*function commentDisplayBody/);
  let reviewedSummaries={};
  if(summariesSource&&!summaryMatch)throw Error('Public comment summary format changed; review conversion before deploying');
  if(summaryMatch){const raw=vm.runInNewContext('('+summaryMatch[1]+')',{}, {timeout:1000});reviewedSummaries=Object.fromEntries(Object.entries(raw).filter(([id,s])=>typeof s.source==='string'&&typeof s.ja==='string').map(([id,s])=>[id,{source:s.source,ja:s.ja}]));}
  if(!Array.isArray(parking.places)||!parking.places.length||!vehicles.profiles||typeof vehicles.profiles!=='object')throw Error('Invalid or empty public source data');
  const ids=parking.places.map(p=>p.id);
  if(ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length)throw Error('Invalid or duplicate facility IDs');
  const context = vm.createContext({});
  for (const file of ['vehicle-categories.js','station-search.js']) vm.runInContext(assets[file],context,{timeout:3000});
  const places = parking.places.filter(p => p.displayEligible !== false && (!p.canonicalFacilityId || p.canonicalFacilityId === p.id) && p.status !== 'rejected').map(p => {
    const row = vehicles.reviewedProfiles?.[p.id] || vehicles.profiles[p.id];
    const categories = context.TomespotVehicleCategories.profiles(row);
    const profiles = Object.fromEntries(['bicycle','privateElectricScooter','moped','motorcycle'].map(k => {
      let q = categories[k];
      if(p.discoveryOnly) q = {admissionStatus:'unknown',temporaryStatus:'unverified',regularStatus:'unverified',tariffs:[],sources:[]};
      // No moped-to-kickboard inference: only explicit, matched vehicle evidence.
      if(q.facilityMatched === false) q = {...q,admissionStatus:'unknown'};
      return [k,pick(q,profileFields)];
    }));
    // Preserve original vehicle classes (including dimensions) alongside derived categories.
    const motorcycleRules=pick(row?.motorcycle,['classesRaw','classes','scope','scopeAudit','engineCcMax','currentConditionsRaw','usageRestriction','operatingRestrictions','checked','sources']);
    return {...pick(p,['id','name','address','ward','lat','lng','source','checked','coordinateStatus','positionPrecision','discoveryOnly','googleMapsUrl']),profiles,motorcycleRules};
  });
  if(!places.length)throw Error('No displayable facilities in source');
  const hashes=Object.fromEntries(['parking.json','vehicle-data.json','vehicle-categories.js','station-search.js',...(summariesSource?['comments.js']:[])].map(f=>[f,crypto.createHash('sha256').update(assets[f]).digest('hex')]));
  const sourceFingerprint=crypto.createHash('sha256').update(JSON.stringify(hashes)).digest('hex');
  return {schemaVersion:1,origin,retrievedAt:new Date().toISOString(),sourceFingerprint,sourceHashes:hashes,reviewedSummaries,sourceUpdated:parking.sourceUpdated,vehicleChecked:vehicles.checked,coverage:[...new Set(places.map(p=>p.address?.match(/^(東京都|北海道|(?:京都|大阪)府|.{2,3}県)/)?.[1]).filter(Boolean))],places,stations:context.TomespotStationSearch.stations.map(s=>pick(s,['id','name','kana','lat','lng','area','keys']))};
}
export async function fetchSnapshot(fetcher=fetch){
  const files = ['parking.json','vehicle-data.json','vehicle-categories.js','station-search.js','comments.js'];
  const entries = await Promise.all(files.map(async file => {
    const r=await fetcher(`${origin}/${file}`,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(30000)});
    if(!r.ok)throw Error(`${file}: HTTP ${r.status}`);
    return [file,await r.text()];
  }));
  return createSnapshot(Object.fromEntries(entries));
}
export async function saveSnapshot(snapshot){
  const hashes=snapshot.sourceHashes;
  // Do not change the deployable snapshot unless every fetch and conversion passed.
  const file=new URL('data/catalog.json',root),temporary=new URL('data/catalog.next.json',root);
  await fs.writeFile(temporary,JSON.stringify(snapshot));
  await fs.rename(temporary,file);
  await fs.writeFile(new URL('data/provenance.json',root),JSON.stringify({retrievedAt:snapshot.retrievedAt,origin,sourceFingerprint:snapshot.sourceFingerprint,sha256:hashes,sourceUpdated:snapshot.sourceUpdated,vehicleChecked:snapshot.vehicleChecked,places:snapshot.places.length,coverage:snapshot.coverage},null,2));
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const snapshot=await fetchSnapshot();await saveSnapshot(snapshot);
  console.log(JSON.stringify({places:snapshot.places.length,sourceFingerprint:snapshot.sourceFingerprint,coverage:snapshot.coverage,sha256:snapshot.sourceHashes},null,2));
}
