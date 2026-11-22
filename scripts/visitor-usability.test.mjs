import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {createMapListings} from './map-listings.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const map=createMapListings(root),c=map.context;
function run(code,vars={}){Object.assign(c,vars);return vm.runInContext(code,c);}
test('critical fee periods, repeated cap and vehicle dimensions are translated without changing amounts',()=>{
 const raw='50cc超のオートバイ、長さ2.5m以内・幅1.0m以内';
 for(const lang of ['zh-Hans','zh-Hant','en']){const s=run('locale=lang;dt(raw)',{lang,raw});assert.ok(!/[ぁ-んァ-ヶ]/.test(s));for(const n of ['50','2.5','1.0'])assert.ok(s.includes(n));}
 assert.match(run('locale="en";dt(raw)',{raw:'60分100円、24時間最大700円（繰返し）。'}),/100.*60.*700.*24.*repeatedly/);
 assert.equal(run('locale="en";dt(raw)',{raw:'最初2時間無料、以降10時間ごと100円。'}),'First 2 hours free; ¥100 per 10 hours thereafter.');
});
test('unknown prose is labelled, with original source retained, not advertised as a known fee',()=>{
 const q={classesRaw:['複雑な車両制限の未翻訳テスト'],publishedFeesRaw:'会員のみ特殊条件で100円。',tariffs:[]};
 assert.equal(run('locale="en";knownFee(q)',{q}),false);
 const html=run('originalSourceHtml(q)',{q});assert.match(html,/Original source text/);assert.match(html,/lang="ja"/);assert.match(html,/会員のみ/);
 assert.equal(run('locale="en";dt("24時間")'),'24 hours');
});
test('cards put the source vehicle restrictions before navigation, with no admission mutation',()=>{
 const place=map.places.find(p=>p.name==='TOKYO PUBLIC 渋谷東（オートバイ）駐車場');assert.ok(place);
 const p=map.profile(place,'motorcycle');assert.equal(p.status,'confirmed');
 const html=run('locale="en";cardRequirements(p)',{p});assert.match(html,/Motorcycles over 50cc/);assert.match(html,/2.5 m/);
});
test('known fee and free-period filters cannot promote unknown candidates',()=>{
 run('locale="ja";state.vehicle="bicycle";state.knownFeesOnly=true');
 const fees=run('filtered()');assert.ok(fees.length>0);assert.ok(fees.every(p=>p.status==='confirmed'));
 run('state.knownFeesOnly=false;state.freeTimeOnly=true');const free=run('filtered()');assert.ok(free.length>0);assert.ok(free.every(p=>p.status==='confirmed'));
 run('state.freeTimeOnly=false;state.verifiedOnly=true');assert.ok(run('filtered()').every(p=>p.status==='confirmed'));run('state.verifiedOnly=false');
});
test('geographic labels and Taiwan interface terms are consistent',()=>{
 assert.equal(run('TomespotVisitorI18n.normalizeArea("千葉県鎌ヶ谷市")'),'千葉県鎌ケ谷市');
 assert.equal(run('TomespotVisitorI18n.areaName("東京都渋谷区","en")'),'Tokyo, Shibuya Ward');
 assert.equal(run('TomespotVisitorI18n.stationName({name:"渋谷",romaji:"shibuya"},"en")'),'Shibuya Station（渋谷駅）');
 for(const [key,row] of Object.entries(map.locales)){for(const lang of ['ja','zh-Hans','zh-Hant','en'])assert.ok(row[lang],key);assert.doesNotMatch(row['zh-Hant'],/未覈實|搜索|定期停車|用戶/);}
});
