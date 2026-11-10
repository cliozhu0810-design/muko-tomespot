import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
const read=f=>JSON.parse(fs.readFileSync(new URL('../source/'+f,import.meta.url)));
const national=read('public/national-discoveries.json'),base=read('public/parking.json'),audit=read('data/national-discovery-preparation.json');
const code=f=>fs.readFileSync(new URL('../source/public/'+f,import.meta.url),'utf8');
const osm=read('public/osm-discoveries.json'),osmAudit=read('data/osm-discovery-preparation.json');
function context(){const elements={search:{value:''},ward:{value:''}};const c=vm.createContext({URL,localStorage:{getItem:()=>null},document:{getElementById:id=>elements[id]}});for(const f of ['vehicle-categories.js','scooter-screening.js','discovery-listings.js'])vm.runInContext(code(f),c);vm.runInContext(code('app.js').split("$('search').addEventListener")[0],c);Object.assign(c,{base,national,vehicles:read('public/vehicle-data.json'),locales:read('public/locales.json')});vm.runInContext('dataset=base;vehicleData=vehicles;messages=locales;state.places=TomespotDiscoveryListings.mergePlaces(base.places,national.places);',c);return {c,elements};}
test('national release preparation preserves baseline and unverified-only fields',()=>{
 assert.equal(createHash('sha256').update(fs.readFileSync(new URL('../source/public/parking.json',import.meta.url))).digest('hex'),audit.baselineSHA256);
 assert.equal(audit.prefectures.length,47);assert.equal(national.places.length,audit.addedDiscoveryRows);
 assert.equal(new Set([...base.places,...national.places].map(p=>p.id)).size,base.places.length+national.places.length);
 assert.equal(Object.values(audit.counts).reduce((a,b)=>a+b,0),audit.candidateRows);
 for(const p of national.places){assert.ok(p.name);assert.ok(Number.isFinite(p.lat)&&Number.isFinite(p.lng));assert.equal(p.status,'unknown');assert.equal(p.discoveryOnly,true);assert.equal(p.price,null);assert.equal(p.hours,'');assert.equal(p.entranceVerified,false);for(const k of ['temporary','monthly','annual'])assert.equal(p[k],false);assert.ok(!p.discoveryVehicleHints.includes('privateElectricScooter'));}
 for(const id of ['maps-japan-00983','maps-japan-00099'])assert.ok(!national.places.some(p=>p.candidateId===id));
 assert.ok(!national.places.some(p=>p.candidateId==='kansai-1358'),'missing coordinates must not become invented map pins');
});
test('national candidates appear in relevant all-results and never confirmed use-mode filters',()=>{
 const {c,elements}=context();const rows=(vehicle,mode='all')=>{Object.assign(c,{vehicle,mode});return JSON.parse(vm.runInContext('state.vehicle=vehicle;state.mode=mode;JSON.stringify(filtered().filter(p=>p.nationalDiscovery))',c));};
 assert.ok(rows('motorcycle').length>200);assert.ok(rows('bicycle').length>500);
 for(const v of ['bicycle','motorcycle'])for(const mode of ['temporary','monthly','annual'])for(const p of rows(v,mode)){assert.equal(p.discoveryOnly,false);assert.equal(p.status,'confirmed');assert.ok(c.vehicles.reviewedProfiles[p.id]?.publishedReview.vehicles.includes(v));}
 assert.ok(rows('privateElectricScooter').length>0);for(const p of rows('privateElectricScooter')){assert.ok(c.vehicles.reviewedProfiles[p.id]?.publishedReview.vehicles.includes('privateElectricScooter'));if(p.status==='unknown'){assert.equal(p.temporary,false);assert.equal(p.monthly,false);assert.equal(p.vehicleProfile.mopedDefault,undefined);}}
 elements.ward.value='沖縄県';assert.ok(rows('bicycle').length>0);assert.ok(rows('bicycle').every(p=>p.ward==='沖縄県'));
 elements.ward.value='';elements.search.value='札幌';assert.ok(rows('motorcycle').length>0);
});
test('name-and-location cards retain localized unverified labels and safe map links',()=>{
 const {c}=context();c.place=national.places[0];
 for(const lang of ['ja','zh-Hans','zh-Hant','en']){c.lang=lang;vm.runInContext('locale=lang',c);for(const fn of ['discoveryCardHtml','discoveryDetailHtml']){const html=vm.runInContext(fn+'(place)',c);assert.ok(html.includes(c.locales.pending[lang]));assert.ok(html.includes(c.locales.discoveryPositionNote[lang]));assert.equal((html.match(/<a\b/g)||[]).length,1);assert.ok(!/¥|料金無料|data-save|comments-/.test(html));}}
 const merged=c.TomespotDiscoveryListings.mergePlaces(base.places,[national.places[0],national.places[0],base.places[0]]);assert.equal(merged.length,base.places.length+1);
});

test('national OSM collection preserves license, missing names, identity and unknown access',()=>{
 assert.equal(osm.places.length,osmAudit.addedDiscoveryRows);
 assert.equal(osmAudit.prefectures.length,47);
 assert.equal(Object.values(osmAudit.counts).reduce((a,b)=>a+b,0),osmAudit.candidateRows);
 assert.equal(osm.license.name,'Open Database License 1.0');
 assert.ok(osm.license.attribution.includes('OpenStreetMap'));
 const all=[...base.places,...national.places,...osm.places];assert.equal(new Set(all.map(p=>p.id)).size,all.length);
 for(const p of osm.places){assert.equal(p.status,'unknown');assert.equal(p.price,null);assert.equal(p.hours,'');assert.equal(p.entranceVerified,false);assert.equal(p.nameUnverified,!p.name);assert.equal(p.sourceLicense,'ODbL-1.0');assert.ok(/^https:\/\/www.openstreetmap.org\/(node|way|relation)\/\d+$/.test(p.osmUrl));for(const k of ['temporary','monthly','annual'])assert.equal(p[k],false);assert.ok(!p.discoveryVehicleHints.includes('privateElectricScooter'));}
});

test('OSM category hints stay unverified and unnamed cards use the selected language',()=>{
 const {c}=context();c.osm=osm;
 vm.runInContext('state.places=TomespotDiscoveryListings.mergePlaces(state.places,osm.places)',c);
 for(const v of ['bicycle','motorcycle']){c.vehicle=v;assert.ok(vm.runInContext("state.vehicle=vehicle;state.mode='all';filtered().some(p=>p.osmUrl)",c));for(const mode of ['temporary','monthly','annual']){c.mode=mode;for(const p of JSON.parse(vm.runInContext('state.mode=mode;JSON.stringify(filtered().filter(p=>p.osmUrl))',c))){assert.equal(p.status,'confirmed');assert.ok(c.vehicles.reviewedProfiles[p.id]?.publishedReview.vehicles.includes(v));}}}
 assert.equal(vm.runInContext("state.vehicle='privateElectricScooter';state.mode='all';filtered().some(p=>p.osmUrl)",c),false);
 for(const p of [osm.places.find(p=>p.name),osm.places.find(p=>p.nameUnverified)]){c.place=p;for(const lang of ['ja','zh-Hans','zh-Hant','en']){c.lang=lang;vm.runInContext('locale=lang',c);const html=vm.runInContext('discoveryDetailHtml(place)',c);assert.ok(html.includes(c.locales.pending[lang]));assert.ok(html.includes(p.osmUrl));if(p.nameUnverified)assert.ok(html.includes(c.locales[p.discoveryVehicleHints.includes('motorcycle')?'unnamedMotorcycleParking':'unnamedBicycleParking'][lang]));}}
 for(const osmUrl of ['javascript:alert(1)','https://www.openstreetmap.org.evil.test/node/1','https://www.openstreetmap.org/user/name','http://www.openstreetmap.org/node/1'])assert.equal(c.TomespotDiscoveryListings.destination({osmUrl}),null);
});
