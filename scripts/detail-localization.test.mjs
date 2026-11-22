import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createMapListings} from './map-listings.mjs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const map=createMapListings(root),c=map.context;
test('untranslated research prose never leaks into another selected language',()=>{
 for(const [lang,raw] of [['ja','仅限自行车，车架尺寸待确认'],['zh-Hans','自転車専用、定期利用のみ'],['zh-Hant','原動機付自転車の料金'],['en','駐輪場の利用条件'],['ja','pre_use_inspection_required'],['zh-Hans','pre_use_inspection_required']]){
  Object.assign(c,{lang,raw});assert.equal(vm.runInContext('locale=lang;dt(raw)',c),map.locales.translationPending[lang]);
 }
 for(const lang of ['ja','zh-Hans','zh-Hant','en']){c.lang=lang;assert.equal(vm.runInContext("locale=lang;dt('¥100 / 24h')",c),'¥100 / 24h');}
});
test('all UI labels have all four language variants',()=>{
 for(const [key,row]of Object.entries(map.locales))for(const lang of ['ja','zh-Hans','zh-Hant','en'])assert.ok(row[lang],key+' '+lang);
});
test('provisional scooter decisions display their own label and never become official confirmations',()=>{
 const entries=Object.entries(map.vehicles.reviewedProfiles).filter(([,r])=>r.reviewedCategories?.privateElectricScooter?.provisionalAllowed);
 assert.equal(entries.length,179);
 for(const [id,row]of entries){const q=row.reviewedCategories.privateElectricScooter;assert.equal(q.admissionStatus,'unknown');assert.equal(q.officialPermissionConfirmed,false);assert.equal(q.temporaryStatus,'unverified');assert.equal(q.regularStatus,'unverified');
  for(const lang of ['ja','zh-Hans','zh-Hant','en']){Object.assign(c,{lang,place:map.places.find(p=>p.id===id)});const html=vm.runInContext('locale=lang;state.vehicle="privateElectricScooter";profileDetailHtml(profilePlace(place))',c);assert.ok(html.includes(map.locales.provisionalAllowed[lang]),id+' '+lang);}
 }
});
test('the close button uses the App sticky positioning within the detail scroller',()=>{
 const css=fs.readFileSync(new URL('../source/public/style.css',import.meta.url),'utf8');assert.match(css,/#detail \.detail-close\{position:sticky;top:0;right:auto;float:right;z-index:10/);
});

test('facility summary lists all vehicle classes without granting unknown admission',()=>{
 c.place=map.places.find(p=>p.name==='JR吹田駅前西自転車駐輪場');
 const html=vm.runInContext('locale="ja";state.vehicle="privateElectricScooter";profileDetailHtml(profilePlace(place),{compact:true})',c);
 assert.ok(html.indexOf('detail-price-first')<html.indexOf('facility-more'));
 assert.match(html,/自転車<\/strong><span class="vehicle-acceptance">未確認/);
 assert.match(html,/電動キックボード<\/strong><span class="vehicle-acceptance">利用可（条件あり）/);
 assert.doesNotMatch(html,/11792718288|roofPhoto/);
});
test('photo gallery counts only verified entrance, parking and exterior images',()=>{
 c.place={id:'gallery-test',name:'Test',photos:[{url:'https://example.com/entry.jpg',kind:'entrance',verified:true},{url:'https://example.com/bays.jpg',kind:'parking',verified:true},{url:'https://example.com/building.jpg',kind:'exterior',verified:true},{url:'https://example.com/roof.jpg',kind:'roof',verified:true}]};
 const html=vm.runInContext('locale="ja";facilityPhotoHtml(place)',c);assert.match(html,/1\/3/);assert.equal((html.match(/class="photo-slide"/g)||[]).length,3);assert.doesNotMatch(html,/roof.jpg/);
});
test('reservation-only facilities expose a direct booking action',()=>{
 c.place={name:'【予約制：akippa】Test',source:'https://www.akippa.com/parking/test'};
 const html=vm.runInContext('locale="ja";reservationHtml(place)',c);assert.match(html,/予約が必要です/);assert.match(html,/class="reservation-link" href="https:\/\/www.akippa.com\/parking\/test"/);
 c.place={name:'Test',source:'https://www.akippa.com/parking/test'};assert.equal(vm.runInContext('reservationHtml(place)',c),'');
});

test('official Nagai correction keeps class, free time and filter decisions consistent',()=>{
 const p=map.places.find(p=>p.id==='national-unverified-568b25663df487d3');c.place=p;
 const q=map.profile(p,'motorcycle');assert.equal(q.status,'confirmed');
 const row=map.vehicles.reviewedProfiles[p.id];assert.equal(row.reviewedCategories.moped.admissionStatus,'confirmed');assert.equal(row.reviewedCategories.motorcycle.admissionStatus,'rejected');
 Object.assign(c,{p:q});assert.equal(vm.runInContext('state.vehicle="motorcycle";engineMatches(p,"125")',c),false);assert.equal(vm.runInContext('engineMatches(p,"new")',c),true);assert.equal(vm.runInContext('engineMatches(p,"250")',c),false);
 const bike=row.reviewedCategories.bicycle;assert.deepEqual(bike.tariffs.filter(t=>t.mode==='temporary').map(t=>t.freeMinutes),[30,60]);
 Object.assign(c,{q:bike});const summary=vm.runInContext('locale="ja";state.mode="temporary";cardTariffSummary(q,true)',c);assert.match(summary,/30分無料/);assert.match(summary,/60分無料/);assert.match(summary,/区画④/);
 const html=vm.runInContext('tariffHtml({tariffs:[{mode:"temporary",amountJPY:100,periodHours:24,freeMinutes:0}]})',c);assert.match(html,/無料時間なし/);assert.doesNotMatch(html,/0分無料/);vm.runInContext('state.mode="all"',c);
});
test('Suita temporary acceptance is not contradicted by a monthly-only notice',()=>{
 c.place=map.places.find(p=>p.id==='national-unverified-998cee6942210f75');
 const html=vm.runInContext('locale="ja";state.vehicle="privateElectricScooter";profileDetailHtml(profilePlace(place))',c);assert.match(html,/一時利用可/);assert.doesNotMatch(html,/時間貸しの情報ではありません/);assert.match(html,/一時利用・定期利用可/);
});
test('engine filters require explicit engine evidence and respect power-limited 125cc classes',()=>{
 const check=(scope,choice)=>{Object.assign(c,{p:{vehicleProfile:{admissionStatus:'confirmed',classesRaw:[scope]}},choice});return vm.runInContext('state.vehicle="motorcycle";engineMatches(p,choice)',c);};
 assert.equal(check('125cc以下','125'),true);assert.equal(check('125cc以下','250'),false);assert.equal(check('50cc超のオートバイ','250'),true);assert.equal(check('50cc超のオートバイ','50'),false);assert.equal(check('バイク（排気量上限未確認）','250'),false);assert.equal(check('バイク（排気量上限未確認）','unknown'),true);assert.equal(check('排気量制限なし','400'),true);
});
test('same-name Nagai reference points have distinct visible labels and Japanese scope contains no reviewer Chinese',()=>{
 const places=map.places.filter(p=>p.name==='JR長居駅自転車駐車場');const names=places.map(place=>{c.place=place;return vm.runInContext('locale="ja";displayName(place)',c);});assert.equal(new Set(names).size,places.length);
 const p=map.places.find(p=>p.id==='24011');const html=map.detail(p,'motorcycle');assert.doesNotMatch(html,/燃油|新基准|按官方|原类/);
});
