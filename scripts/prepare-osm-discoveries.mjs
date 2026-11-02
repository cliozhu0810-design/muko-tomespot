import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(!process.argv[2])throw Error('Pass the cached OSM candidate JSON; prepares local files only.');
const raw=fs.readFileSync(process.argv[2]),input=JSON.parse(raw);
const read=f=>JSON.parse(fs.readFileSync(path.join(root,'source/public',f)));
const existing=[...read('parking.json').places,...read('national-discoveries.json').places];
const regions=read('prefectures.json').prefectures;
const inRing=(x,y,r)=>{let inside=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
function prefecture(r){return regions.find(p=>p.polygons.some(g=>{const [w,s,e,n]=g.bounds;return r.lng>=w&&r.lng<=e&&r.lat>=s&&r.lat<=n&&inRing(r.lng,r.lat,g.rings[0])&&!g.rings.slice(1).some(a=>inRing(r.lng,r.lat,a));}))?.name;}
const normal=s=>String(s||'').normalize('NFKC').replace(/[\s・･]/g,'').toLowerCase();
const names=new Map();
function remember(p){if(!p.name||p.nameUnverified)return;const k=normal(p.name);if(!names.has(k))names.set(k,[]);names.get(k).push(p);}
existing.forEach(remember);
const near=(a,b)=>Math.hypot((a.lat-b.lat)*111320,(a.lng-b.lng)*111320*Math.cos(b.lat*Math.PI/180))<=35;
const decisions=[],places=[];
for(const r of [...input.records].sort((a,b)=>Number(!!b.name)-Number(!!a.name))){
 const hold=(status,extra={})=>decisions.push({candidateId:r.candidateId,status,...extra});
 const tags=r.rawTags||{};
 if(!['','yes','permissive','unknown'].includes(tags.access||'')||['no','private'].includes(tags.motorcycle)&&r.category!=='bicycle_parking'){hold('held_restricted_access');continue;}
 if(tags.disused==='yes'||tags.abandoned==='yes'||tags.demolished==='yes'||tags.construction==='yes'||tags.proposed==='yes'){hold('held_inactive_or_proposed');continue;}
 if(!Number.isFinite(r.lat)||!Number.isFinite(r.lng)){hold('held_invalid_coordinates');continue;}
 const pref=prefecture(r);if(!pref){hold('held_outside_simplified_prefecture_boundary');continue;}
 const duplicate=r.name&&(names.get(normal(r.name))||[]).find(p=>near(p,r));
 if(duplicate){hold('held_same_name_nearby_possible_duplicate',{existingId:duplicate.id});continue;}
 const hints=r.category==='bicycle_parking'?['bicycle']:['motorcycle'];
 if(r.category==='bicycle_parking'&&['yes','designated'].includes(tags.motorcycle))hints.push('motorcycle');
 const p={id:r.candidateId,name:r.name||'',nameUnverified:!r.name,ward:pref,address:r.address||'',lat:r.lat,lng:r.lng,status:'unknown',temporary:false,monthly:false,annual:false,price:null,hours:'',source:r.sourceURL,osmUrl:r.sourceURL,sourceLicense:'ODbL-1.0',discoveryOnly:true,nationalDiscovery:true,discoveryVehicleHints:hints,discoveredOn:input.checkedOn,positionPrecision:r.positionPrecision,entranceVerified:false,municipalityAssignment:'coordinate_prefecture_only',aliases:pref,candidateId:r.candidateId};
 places.push(p);remember(p);hold('prepared_unverified_name_and_position',{id:p.id,prefecture:pref,namePresent:!!r.name,vehicleHints:hints});
}
const counts=Object.fromEntries([...new Set(decisions.map(d=>d.status))].map(k=>[k,decisions.filter(d=>d.status===k).length]));
const license={name:'Open Database License 1.0',url:'https://opendatacommons.org/licenses/odbl/1-0/',attribution:'© OpenStreetMap contributors',source:'https://www.openstreetmap.org/copyright',sourceSnapshot:input.sourceSnapshot};
const summary={preparedOn:input.checkedOn,releaseStatus:'prepared_locally_not_deployed',candidateRows:input.records.length,addedDiscoveryRows:places.length,namedRows:places.filter(p=>!p.nameUnverified).length,unnamedRows:places.filter(p=>p.nameUnverified).length,motorcycleCategoryRows:places.filter(p=>p.discoveryVehicleHints.includes('motorcycle')).length,sourceSHA256:createHash('sha256').update(raw).digest('hex'),prefectures:[...new Set(places.map(p=>p.ward))].sort(),counts,license,note:'Complete cached Japan OSM query, not a complete real-world inventory. Separate ODbL collection; restricted sites held privately; names missing in source use a localized missing-name label, never a fabricated facility name.'};
fs.writeFileSync(path.join(root,'source/public/osm-discoveries.json'),JSON.stringify({preparedOn:summary.preparedOn,license,places})+'\n');
fs.writeFileSync(path.join(root,'source/data/osm-discovery-preparation.json'),JSON.stringify({...summary,decisions},null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
