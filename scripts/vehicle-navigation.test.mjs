import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const code=fs.readFileSync(new URL('../source/public/app.js',import.meta.url),'utf8').split("$('search').addEventListener")[0];
function setup(url='https://muko-tomespot.pages.dev/',saved='bicycle',entry){
 const location={href:url},heading={textContent:''},nodes=new Map(),elements={search:{value:'京都駅'},ward:{value:'京都府'},vehicle:{value:saved}};
 const history={state:null,entries:[{url,state:null}],index:0,replaceState(state,_,url){this.state=state;this.entries[this.index]={url,state};location.href=url;},pushState(state,_,url){this.entries.splice(++this.index);this.entries.push({url,state});this.state=state;location.href=url;},back(){const e=this.entries[--this.index];this.state=e.state;location.href=e.url;}};
 const document={title:'',getElementById:id=>elements[id],querySelector:s=>{if(s==='.category-heading')return heading;if(!nodes.has(s))nodes.set(s,{setAttribute(k,v){this[k]=v;}});return nodes.get(s);}};
 const c=vm.createContext({URL,location,window:{history,TOMESPOT_ENTRY:entry},document,localStorage:{getItem:k=>k==='tomespot:vehicle'?saved:null,setItem(){}}});vm.runInContext(code,c);vm.runInContext('closeDetail=()=>{};render=()=>syncVehiclePresentation();fitMap=()=>{};',c);return {c,location,history,heading,nodes,elements};
}
test('switching vehicles updates route, visible title and shareable filters without losing browser back state',()=>{
 const {c,location,history,heading,nodes}=setup();vm.runInContext('syncVehiclePresentation();state.vehicle="privateElectricScooter";locale="zh-Hant";updateVehicleUrl();syncVehiclePresentation();',c);
 let url=new URL(location.href);assert.equal(url.pathname,'/kickboard-parking');assert.equal(url.searchParams.get('q'),'京都駅');assert.equal(url.searchParams.get('ward'),'京都府');assert.equal(url.searchParams.get('lang'),'zh-Hant');assert.equal(heading.textContent,'電動滑板車停車場');assert.equal(nodes.get('link[rel="canonical"]').href,'https://muko-tomespot.pages.dev/kickboard-parking');
 vm.runInContext('state.vehicle="motorcycle";updateVehicleUrl();syncVehiclePresentation();',c);assert.equal(new URL(location.href).pathname,'/motorcycle-parking');assert.equal(heading.textContent,'機車停車場（含日本原付）');
 history.back();vm.runInContext('restoreVehicleFromUrl()',c);assert.equal(vm.runInContext('state.vehicle',c),'privateElectricScooter');assert.equal(heading.textContent,'電動滑板車停車場');
 history.back();vm.runInContext('restoreVehicleFromUrl()',c);assert.equal(new URL(location.href).pathname,'/');assert.equal(vm.runInContext('state.vehicle',c),'bicycle');assert.equal(heading.textContent,'自行車停車場');
});
test('dedicated entry defaults survive reload and all headings follow the selected language',()=>{
 const headings={bicycle:['自転車の駐輪場','自行车停车场','自行車停車場','Bicycle parking'],privateElectricScooter:['電動キックボードの駐輪場','电动滑板车停车场','電動滑板車停車場','Electric scooter parking'],motorcycle:['原付・バイクの駐車場','原付与摩托车停车场','機車停車場（含日本原付）','Moped and motorcycle parking']};
 for(const vehicle of Object.keys(headings)){const {c,heading}=setup('https://muko-tomespot.pages.dev/','bicycle',{vehicle});assert.equal(vm.runInContext('state.vehicle',c),vehicle);for(const [i,lang]of ['ja','zh-Hans','zh-Hant','en'].entries()){c.language=lang;vm.runInContext('locale=language;syncVehiclePresentation()',c);assert.equal(heading.textContent,headings[vehicle][i]);}}
});

test('map cards show known scoped amounts, free periods and original price caps',()=>{
 const {c}=setup();c.translations=JSON.parse(fs.readFileSync(new URL('../source/public/locales.json',import.meta.url),'utf8'));
 vm.runInContext('messages=translations;',c);
 c.profile={admissionStatus:'confirmed',tariffs:[{mode:'temporary',amountJPY:220,periodHours:24,freeMinutes:60,sourceVehicleClass:'原付125cc以下',feeRaw:'最初の1時間は無料、以降24時間毎に220円'}]};
 let text=vm.runInContext('cardTariffSummary(profile)',c);assert.match(text,/原付125cc以下/);assert.match(text,/1時間は無料/);assert.match(text,/24時間毎に220円/);
 c.profile={admissionStatus:'confirmed',tariffs:[],publishedFeesRaw:'60分220円。当日24hまで最大料金900円（繰り返し）。'};
 text=vm.runInContext('cardTariffSummary(profile)',c);assert.match(text,/60分220円/);assert.match(text,/当日24hまで最大料金900円/);assert.match(text,/繰り返し/);
 c.place={status:'confirmed',vehicleProfile:c.profile};assert.match(vm.runInContext('price(place)',c),/60分220円/);
});

test('fee cards do not quote unverified vehicle fees or mix temporary and permit modes',()=>{
 const {c}=setup();c.translations=JSON.parse(fs.readFileSync(new URL('../source/public/locales.json',import.meta.url),'utf8'));vm.runInContext('messages=translations;',c);
 c.profile={admissionStatus:'confirmed',tariffs:[],publishedFeesRaw:'自転車の料金は未確認。二輪の220円／60分を適用しないでください。'};
 assert.equal(vm.runInContext('cardTariffSummary(profile)',c),'');
 c.profile={admissionStatus:'confirmed',tariffs:[{mode:'regular',amountJPY:4000,periodMonths:1,sourceVehicleClass:'原付',eligibilityRaw:'一般'},{mode:'temporary',amountJPY:200,periodHours:24,sourceVehicleClass:'原付'}]};
 let text=vm.runInContext('state.mode="temporary";cardTariffSummary(profile)',c);assert.match(text,/200/);assert.doesNotMatch(text,/4,000/);
 text=vm.runInContext('state.mode="monthly";cardTariffSummary(profile)',c);assert.match(text,/4,000/);assert.match(text,/一般/);assert.doesNotMatch(text,/200/);
 c.place={status:'unknown',vehicleProfile:{...c.profile,admissionStatus:'unknown'}};
 assert.doesNotMatch(vm.runInContext('price(place)',c),/4,000|200/);
});

test('combined motorcycle profiles retain admitted class fees when original arrays are empty',()=>{
 const c=vm.createContext({});vm.runInContext(fs.readFileSync(new URL('../source/public/vehicle-categories.js',import.meta.url),'utf8'),c);
 c.row={motorcycle:{tariffs:[],sources:[],classesRaw:[]},reviewedCategories:{
  bicycle:{admissionStatus:'confirmed',tariffs:[{mode:'temporary',amountJPY:50,periodHours:24}]},
  moped:{admissionStatus:'confirmed',temporaryStatus:'confirmed',classesRaw:['50cc以下'],tariffs:[{mode:'temporary',amountJPY:200,periodHours:24}],sources:[{url:'https://example.com/moped'}]},
  motorcycle:{admissionStatus:'rejected',classesRaw:['大型'],tariffs:[{mode:'temporary',amountJPY:800,periodHours:24}]}
 }};
 const q=vm.runInContext('TomespotVehicleCategories.combined(row)',c);assert.equal(q.admissionStatus,'confirmed');assert.equal(q.tariffs.length,1);assert.equal(q.tariffs[0].amountJPY,200);assert.equal(q.tariffs[0].sourceVehicleClass,'50cc以下');assert.deepEqual(Array.from(q.classesRaw),['50cc以下']);assert.equal(q.sources[0].url,'https://example.com/moped');assert.equal(q.temporaryStatus,'confirmed');
});

test('joint combined admission does not grant either unresolved displacement class',()=>{
 const c=vm.createContext({});vm.runInContext(fs.readFileSync(new URL('../source/public/vehicle-categories.js',import.meta.url),'utf8'),c);
 c.row={motorcycle:{jointMotorcycleAdmissionStatus:'confirmed',classesRaw:['原付・バイク（具名区画のみ）'],temporaryStatus:'confirmed',regularStatus:'unverified',tariffs:[{mode:'temporary',amountJPY:150,periodHours:24,vehicleClassRaw:'原付小'}]},reviewedCategories:{moped:{admissionStatus:'unknown'},motorcycle:{admissionStatus:'unknown'}}};
 const q=vm.runInContext('TomespotVehicleCategories.combined(row)',c);assert.equal(q.admissionStatus,'confirmed');assert.equal(q.temporaryStatus,'confirmed');assert.equal(q.tariffs[0].vehicleClassRaw,'原付小');
 assert.equal(vm.runInContext('TomespotVehicleCategories.profiles(row).moped.admissionStatus',c),'unknown');assert.equal(vm.runInContext('TomespotVehicleCategories.profiles(row).motorcycle.admissionStatus',c),'unknown');
 c.row.motorcycle.jointMotorcycleAdmissionStatus='unknown';assert.equal(vm.runInContext('TomespotVehicleCategories.combined(row).admissionStatus',c),'unknown');
});

test('structured minute and day tariffs retain vehicle, floor and customer restrictions',()=>{
 const {c}=setup();c.translations=JSON.parse(fs.readFileSync(new URL('../source/public/locales.json',import.meta.url),'utf8'));vm.runInContext('messages=translations;',c);
 c.profile={admissionStatus:'confirmed',tariffs:[{mode:'temporary',amountJPY:100,periodMinutes:60,vehicleClassRaw:'125cc以下',floor:'原付平置区',userClass:'一般'}]};
 let text=vm.runInContext('cardTariffSummary(profile)',c);assert.match(text,/60分/);assert.match(text,/125cc以下/);assert.match(text,/原付平置区/);assert.match(text,/一般/);
 c.profile.tariffs[0]={...c.profile.tariffs[0],periodMinutes:undefined,billingUnit:'日ぎめ_not_assumed_rolling24h'};
 text=vm.runInContext('cardTariffSummary(profile)',c);assert.match(text,/日ぎめ（区切り要確認）/);assert.doesNotMatch(text,/24時間/);
});

test('top review notices retain localized current conditions when duplicate scope notes are compacted',()=>{
 const {c}=setup();c.profile={currentConditionsRaw:['明示的な許可は未確認です。']};c.noteTranslations={'明示的な許可は未確認です。':{'zh-Hans':'未明确确认允许。','zh-Hant':'未明確確認允許。',en:'Explicit permission is unconfirmed.'}};
 vm.runInContext('dataMessages=noteTranslations;locale="zh-Hans";',c);assert.equal(vm.runInContext('reviewNoticeHtml(profile)',c),'<p class="detail-note">未明确确认允许。</p>');
 vm.runInContext('locale="en";',c);assert.match(vm.runInContext('reviewNoticeHtml(profile)',c),/Explicit permission is unconfirmed/);
 c.profile.publishedScopeNotes=['明示的な許可は未確認です。'];assert.equal(vm.runInContext('reviewNoticeHtml(profile)',c).match(/detail-note/g).length,1);
});
