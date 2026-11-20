import fs from 'node:fs';
import path from 'node:path';
import {createMapListings} from './map-listings.mjs';

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const categories=[['motorcycle','原付・バイク'],['privateElectricScooter','電動キックボード']];
const slugs={motorcycle:'motorcycle',privateElectricScooter:'kickboard'};

export function addVehicleCategoryPages({root,output,siteUrl}) {
  const map=createMapListings(root);
  const coverage=[];
  const suffix=siteUrl.endsWith('.pages.dev')?'':'.html';
  const navigation='<nav class="ward-nav" aria-label="車種別の駐輪場"><a href="/bicycle-parking.html">自転車の駐輪場</a>'+categories.map(([kind,label])=>`<a href="/${slugs[kind]}-parking.html">${label}の駐輪場</a>`).join('')+'</nav>';
  const urls=[];
  for(const [kind,label] of categories) {
    const slug=slugs[kind];
    const canonical=siteUrl+'/'+slug+'-parking'+suffix;
    const title=label+'の駐車場・駐輪場を探す｜トメスポ';
    const description=label+'の駐輪場を地図で検索。一時利用・定期利用の料金や、施設ごとの車両サイズ・指定区画の利用条件、公式案内を確認できます。';
    const places=map.listings(kind);
    coverage.push({vehicle:kind,path:'/'+slug+'-parking',total:places.length,confirmed:places.filter(p=>p.status==='confirmed').length,unconfirmed:places.filter(p=>p.status!=='confirmed').length,ids:places.map(p=>p.id)});
    const wards=[...new Set(places.map(p=>p.ward))].sort((a,b)=>a.localeCompare(b,'ja'));
    const groups=wards.map((ward,i)=>`<section id="area-${i}"><h2>${escape(ward)}</h2><ul>${places.filter(p=>p.ward===ward).map(p=>`<li data-place="${escape(p.id)}"><a href="${fs.existsSync(path.join(output,'parking',p.id+'.html'))?'/parking/'+escape(p.id)+'.html?vehicle='+kind+'#'+kind:'/'+slug+'-parking'+suffix+'?place='+encodeURIComponent(p.id)}">${escape(p.name||'名称未確認の駐輪場')}</a><p>${escape(p.address)}</p><p>${p.status==='confirmed'?'受入確認済み':'受入未確認・候補'}</p><a href="/${slug}-parking${suffix}?place=${encodeURIComponent(p.id)}">${label}の料金・利用条件を地図で確認</a></li>`).join('')}</ul></section>`).join('');
    const scope=kind==='motorcycle'?'原付のみ対応の施設も含むため、すべての排気量のバイクが利用できるわけではありません。施設ごとの排気量・車幅・車長・指定区画をご確認ください。':'個人所有の電動キックボードの情報です。施設ごとの指定区画・設備・契約条件をご確認ください。';
    const schema={'@context':'https://schema.org','@type':'CollectionPage',name:label+'の駐輪場',description,url:canonical};
    const html=`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title><meta name="description" content="${escape(description)}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${escape(canonical)}"><link rel="canonical" href="${escape(canonical)}"><link rel="stylesheet" href="/search-pages.css"><link rel="icon" href="/icon.svg"><script type="application/ld+json">${JSON.stringify(schema).replaceAll('<','\\u003c')}</script></head><body><header><a href="/">トメスポ</a><nav><a href="/areas/index.html">地域・駅から探す</a><a href="/about.html">トメスポについて</a></nav></header><main><h1>${label}の駐輪場</h1><p>${escape(description)}</p><p>${scope}</p><p><a href="/?vehicle=${kind}">${label}の駐輪場を地図で探す</a></p>${navigation}<h2>地域別の駐輪場 ${places.length}施設</h2><p>現在の空き状況は提供していません。出発前に各施設の最新の公式案内をご確認ください。</p><nav class="ward-nav" aria-label="地域別の駐輪場">${wards.map((ward,i)=>`<a href="#area-${i}">${escape(ward)}</a>`).join('')}</nav>${groups}${navigation}</main></body></html>`;
    fs.writeFileSync(path.join(output,slug+'-parking.html'),html);
    if(kind==='motorcycle')fs.writeFileSync(path.join(output,'moped-parking.html'),html);
    urls.push(canonical);
  }
  fs.writeFileSync(path.join(output,'vehicle-directory-coverage.json'),JSON.stringify({sameEligibilityAsMap:true,categories:coverage},null,2));
  // Preserve old links while offering one public category.
  function updateLinks(dir) {
    for(const item of fs.readdirSync(dir,{withFileTypes:true})) {
      const file=path.join(dir,item.name);
      if(item.isDirectory()){updateLinks(file);continue;}
      if(!file.endsWith('.html'))continue;
      const before=fs.readFileSync(file,'utf8');
      const after=before.replace(/<a\b[^>]*href="\/(?:moped|motorcycle)-parking(?:\.html)?"[^>]*>[^<]*<\/a>/g,'<a href="/motorcycle-parking.html">原付・バイクの駐輪場</a>').replace(/(<a href="\/motorcycle-parking.html">原付・バイクの駐輪場<\/a>)\s*\1/g,'$1');
      if(after!==before)fs.writeFileSync(file,after);
    }
  }
  updateLinks(output);
  const sitemap=path.join(output,'sitemap.xml');
  const xml=fs.readFileSync(sitemap,'utf8').replace(/<url>\s*<loc>[^<]*\/moped-parking(?:\.html)?<\/loc>[\s\S]*?<\/url>/g,'');
  const existing=new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]));
  fs.writeFileSync(sitemap,xml.replace('</urlset>',urls.filter(u=>!existing.has(u)).map(u=>`<url><loc>${escape(u)}</loc></url>`).join('')+'</urlset>'));
  if(siteUrl.endsWith('.pages.dev')){
    const redirects=path.join(output,'_redirects');
    const before=fs.existsSync(redirects)?fs.readFileSync(redirects,'utf8'):'';
    if(!before.includes('/moped-parking /motorcycle-parking 301'))fs.writeFileSync(redirects,before+'\n/moped-parking /motorcycle-parking 301\n/moped-parking.html /motorcycle-parking 301\n');
  }
}
