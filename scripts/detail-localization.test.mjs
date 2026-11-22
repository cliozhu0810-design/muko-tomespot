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
 assert.match(html,/電動キックボード<\/strong><span class="vehicle-acceptance">確認済み/);
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
