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
 vm.runInContext('state.vehicle="motorcycle";updateVehicleUrl();syncVehiclePresentation();',c);assert.equal(new URL(location.href).pathname,'/motorcycle-parking');assert.equal(heading.textContent,'原付與機車停車場');
 history.back();vm.runInContext('restoreVehicleFromUrl()',c);assert.equal(vm.runInContext('state.vehicle',c),'privateElectricScooter');assert.equal(heading.textContent,'電動滑板車停車場');
 history.back();vm.runInContext('restoreVehicleFromUrl()',c);assert.equal(new URL(location.href).pathname,'/');assert.equal(vm.runInContext('state.vehicle',c),'bicycle');assert.equal(heading.textContent,'自行車停車場');
});
test('dedicated entry defaults survive reload and all headings follow the selected language',()=>{
 const headings={bicycle:['自転車の駐輪場','自行车停车场','自行車停車場','Bicycle parking'],privateElectricScooter:['電動キックボードの駐輪場','电动滑板车停车场','電動滑板車停車場','Electric scooter parking'],motorcycle:['原付・バイクの駐輪場','原付与摩托车停车场','原付與機車停車場','Moped and motorcycle parking']};
 for(const vehicle of Object.keys(headings)){const {c,heading}=setup('https://muko-tomespot.pages.dev/','bicycle',{vehicle});assert.equal(vm.runInContext('state.vehicle',c),vehicle);for(const [i,lang]of ['ja','zh-Hans','zh-Hant','en'].entries()){c.language=lang;vm.runInContext('locale=language;syncVehiclePresentation()',c);assert.equal(heading.textContent,headings[vehicle][i]);}}
});
