import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createMapListings} from './map-listings.mjs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const map=createMapListings(root),c=map.context;
test('untranslated research prose never leaks into another selected language',()=>{
 for(const [lang,raw] of [['ja','仅限自行车，车架尺寸待确认'],['zh-Hans','自転車専用、定期利用のみ'],['zh-Hant','原動機付自転車の料金'],['en','駐輪場の利用条件']]){
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
