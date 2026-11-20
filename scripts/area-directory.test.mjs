import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {addAreaPages} from './area-pages.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));

test('national area directories retain vehicle choice through title, URL and facility links',()=>{
 const output=fs.mkdtempSync(path.join(os.tmpdir(),'tomespot-areas-'));
 try{
  fs.writeFileSync(path.join(output,'sitemap.xml'),'<urlset></urlset>');
  addAreaPages({root,output,siteUrl:'https://muko-tomespot.pages.dev'});
  const coverage=JSON.parse(fs.readFileSync(path.join(output,'area-coverage.json')));
  assert.equal(coverage.prefectures.length,47);
  for(const slug of ['osaka','kyoto','nara','kobe','nagoya','fukuoka'])assert.ok(coverage.pages.some(p=>p.path==='/areas/'+slug));
  const area=fs.readFileSync(path.join(output,'areas/ikebukuro.html'),'utf8');
  assert.match(area,/\?vehicle=motorcycle/);assert.match(area,/池袋駅の原付・バイク駐輪場/);
  const scripts=[...area.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  const detail={href:'https://muko-tomespot.pages.dev/parking/1.html?vehicle=bicycle#bicycle'},map={href:'https://muko-tomespot.pages.dev/?vehicle=bicycle&place=1'};
  const card={dataset:{search:'池袋',confirmed:'motorcycle',unknown:'bicycle'},querySelectorAll:s=>s==='[data-detail-place]'?[detail]:s==='[data-map-place]'?[map]:[]};
  const nodes={'area-vehicle':{value:''},'area-search':{value:''},'area-unknown':{checked:true},'area-count':{}};
  const heading={},canonical={},document={title:'',getElementById:id=>nodes[id],querySelectorAll:()=>[card],querySelector:s=>s==='h1'?heading:canonical};
  const location={href:'https://muko-tomespot.pages.dev/areas/ikebukuro?vehicle=motorcycle'};
  vm.runInNewContext(scripts.at(-1),{document,location,URL,history:{replaceState(){}},localStorage:{setItem(){}}});
  assert.equal(heading.textContent,'池袋駅の原付・バイク駐輪場');assert.equal(document.title,'池袋駅の原付・バイク駐輪場 | トメスポ');assert.equal(new URL(canonical.href).searchParams.get('vehicle'),'motorcycle');
  assert.equal(new URL(detail.href).hash,'#motorcycle');assert.equal(new URL(detail.href).searchParams.get('vehicle'),'motorcycle');assert.equal(new URL(map.href).searchParams.get('vehicle'),'motorcycle');assert.equal(card.hidden,false);
  const file=fs.readdirSync(path.join(output,'parking')).find(f=>fs.readFileSync(path.join(output,'parking',f),'utf8').includes('id="vehicle-sections"'));
  assert.ok(file);const html=fs.readFileSync(path.join(output,'parking',file),'utf8');
  const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1],order=[];
  const vehicleNodes={bicycle:{id:'bicycle'},motorcycle:{id:'motorcycle'},privateElectricScooter:{id:'privateElectricScooter'},'vehicle-sections':{prepend:s=>order.unshift(s.id)}};
  vm.runInNewContext(script,{URL,location:{href:'https://muko-tomespot.pages.dev/parking/x.html?vehicle=motorcycle#motorcycle'},document:{getElementById:id=>vehicleNodes[id],querySelectorAll:()=>[]}});
  assert.equal(order[0],'motorcycle');
 }finally{fs.rmSync(output,{recursive:true,force:true});}
});
