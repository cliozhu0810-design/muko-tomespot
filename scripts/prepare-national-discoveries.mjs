import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const input=process.argv[2];
if(!input)throw Error('Pass the national candidate JSON path; this command prepares local files only.');
const raw=fs.readFileSync(input), candidates=JSON.parse(raw).records;
const baseRaw=fs.readFileSync(path.join(root,'source/public/parking.json'));
const baseline=JSON.parse(baseRaw).places;
const regions=JSON.parse(fs.readFileSync(path.join(root,'source/public/prefectures.json'))).prefectures;
const normal=s=>String(s||'').normalize('NFKC').replace(/[\s・･]/g,'').toLowerCase();
const placeKey=url=>String(url||'').match(/!1s([^!]+)/)?.[1];
const distance=(a,b)=>{const rad=Math.PI/180,dy=(a.lat-b.lat)*rad,dx=(a.lng-b.lng)*rad;return 6371000*2*Math.asin(Math.sqrt(Math.sin(dy/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dx/2)**2));};
const inRing=(x,y,r)=>{let inside=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
function prefecture(r){return regions.find(p=>p.polygons.some(g=>{const [w,s,e,n]=g.bounds;return r.lng>=w&&r.lng<=e&&r.lat>=s&&r.lat<=n&&inRing(r.lng,r.lat,g.rings[0])&&!g.rings.slice(1).some(a=>inRing(r.lng,r.lat,a));}))?.name;}
const seenKeys=new Map(),seenNames=new Map(),places=[],decisions=[];
function remember(p){const key=placeKey(p.googleMapsUrl||p.source);if(key)seenKeys.set(key,p);const name=normal(p.name);if(!seenNames.has(name))seenNames.set(name,[]);seenNames.get(name).push(p);}
for(const p of baseline)remember(p);
const record=(r,status,extra={})=>decisions.push({candidateId:r.candidateId,name:r.name,status,...extra});
// Prefer government names and coordinates; retain every other candidate's disposition in the audit.
for(const r of [...candidates].sort((a,b)=>Number(!!a.sourceId)-Number(!!b.sourceId)).reverse()){
 if(r.candidateType==='excluded_unrelated_sponsored_listing'||r.motorcycleReview?.excludedFromMotorcycleQueue){record(r,'held_unrelated_listing');continue;}
 const category=[r.name,r.sourceCategory,r.discoveredCategory].filter(Boolean).join(' ');
 if(!r.sourceId&&r.candidateType==='parking_purpose_requires_review'){record(r,'held_two_wheeler_purpose_unresolved');continue;}
 if(r.candidateType==='excluded_from_motorcycle_car_parking'){record(r,'held_motorcycle_explicitly_prohibited');continue;}
 if(!String(r.name||'').trim()){record(r,'held_missing_name');continue;}
 if(!Number.isFinite(r.lat)||!Number.isFinite(r.lng)||r.lat<20||r.lat>46||r.lng<122||r.lng>154){record(r,'held_missing_or_invalid_coordinates');continue;}
 const pref=prefecture(r);
 if(!pref){record(r,'held_outside_prefecture_boundary_requires_review');continue;}
 const key=placeKey(r.sourceURL),sameKey=key&&seenKeys.get(key);
 const sameName=(seenNames.get(normal(r.name))||[]).find(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&distance(p,r)<=35);
 if(sameKey||sameName){record(r,sameKey?'matched_existing_map_identity':'held_same_name_nearby_possible_duplicate',{existingId:(sameKey||sameName).id});continue;}
 const hints=new Set();
 if(/自転車|サイクル/.test(category)||/駐輪/.test(category)&&!/バイク|自動二輪|オートバイ|原付|原動機付/.test(category))hints.add('bicycle');
 if(/バイク|自動二輪|オートバイ/.test(category))hints.add('motorcycle');
 if(/原付|原動機付/.test(category))hints.add('moped');
 for(const v of ['bicycle','moped','motorcycle'])if(/^explicitly_listed/.test(r.vehicleAdmission?.[v]||''))hints.add(v);
 const review=r.motorcycleReview;
 if(review?.motorcycleAvailable===false||['bicycle_only_not_motorcycle','motorcycle_explicitly_prohibited'].includes(review?.reviewStatus)){hints.delete('motorcycle');hints.delete('moped');}
 if(!hints.size){record(r,'held_vehicle_category_unresolved');continue;}
 // Category hints select discovery results only. They never set admission, fees, hours, or use modes.
 const city=r.municipality||r.searchCities?.[0]||'';
 const address=r.address||r.addressFragment||'';
 const googleMapsUrl=r.source==='google_maps_search'?r.sourceURL:'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(r.lat+','+r.lng);
 const p={id:'national-unverified-'+createHash('sha256').update(key||r.candidateId).digest('hex').slice(0,16),name:r.name.trim(),ward:pref,address,lat:r.lat,lng:r.lng,status:'unknown',temporary:false,monthly:false,annual:false,price:null,hours:'',source:r.sourceURL,googleMapsUrl,discoveryOnly:true,nationalDiscovery:true,discoveryVehicleHints:[...hints],discoveredOn:r.observedOn||r.checkedOn||'2026-11-02',positionPrecision:r.sourceId?'government_reference_point':'google_listing',entranceVerified:false,municipalityAssignment:r.sourceId?'government_listing':'search_target_unverified',aliases:[city,pref].filter(Boolean).join(' '),candidateId:r.candidateId};
 places.push(p);remember(p);record(r,'prepared_unverified_name_and_position',{id:p.id,prefecture:pref,vehicleHints:p.discoveryVehicleHints});
}
if(new Set([...baseline,...places].map(p=>p.id)).size!==baseline.length+places.length)throw Error('ID collision');
const counts=Object.fromEntries([...new Set(decisions.map(d=>d.status))].map(s=>[s,decisions.filter(d=>d.status===s).length]));
const summary={preparedOn:'2026-11-02',releaseStatus:'prepared_locally_not_deployed',candidateRows:candidates.length,addedDiscoveryRows:places.length,baselineRows:baseline.length,baselineSHA256:createHash('sha256').update(baseRaw).digest('hex'),sourceSHA256:createHash('sha256').update(raw).digest('hex'),prefectures:[...new Set(places.map(p=>p.ward))].sort(),counts,note:'Representative-city candidates across Japan; not an exhaustive national inventory. All additions remain unverified. Existing records and private review evidence remain unchanged.'};
fs.writeFileSync(path.join(root,'source/public/national-discoveries.json'),JSON.stringify({preparedOn:summary.preparedOn,places},null,2)+'\n');
fs.writeFileSync(path.join(root,'source/data/national-discovery-preparation.json'),JSON.stringify({...summary,decisions},null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
