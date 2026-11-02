import fs from 'node:fs';
import path from 'node:path';

// The indexed category URL opens the same map as the homepage. Its readable
// directory remains available below the map for visitors and search engines.
export function writeKickboardMap({output,siteUrl,title,description}) {
  return writeCategoryMap({output,siteUrl,title,description,slug:'kickboard-parking',vehicle:'privateElectricScooter',summary:'マイ電動キックボードの駐輪場一覧・利用ガイド',intro:`<p>駅名から探す：<a href="/kickboard-parking.html?q=${encodeURIComponent('目黒駅')}">目黒駅周辺のマイ電動キックボード駐輪場を地図で検索</a>。受入確認済み施設の有無は検索結果をご確認ください。</p>`});
}

export function writeMotorcycleMap({output,siteUrl}) {
  return writeCategoryMap({output,siteUrl,slug:'motorcycle-parking',vehicle:'motorcycle',title:'原付・バイクの駐車場・駐輪場を探す｜トメスポ',description:'原付・バイクの駐車場を地図で検索。一時利用・月極の料金や、施設ごとの排気量・車両サイズの利用条件、公式案内を確認できます。',summary:'原付・バイクの駐車場一覧・利用ガイド',intro:''});
}

function writeCategoryMap({output,siteUrl,title,description,slug,vehicle,summary,intro}) {
  const target=path.join(output,slug+'.html');
  const guide=fs.readFileSync(target,'utf8').match(/<main>([\s\S]*?)<\/main>/)?.[1];
  if(!guide)throw Error('Missing '+slug+' guide');
  const escape=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
  const canonical=siteUrl+'/'+slug+(siteUrl.endsWith('.pages.dev')?'':'.html');
  const entry={language:'ja',vehicle,title,description};
  let html=fs.readFileSync(path.join(output,'index.html'),'utf8');
  html=html.replace(/<title>[^<]*<\/title>/,`<title>${escape(title)}</title>`)
    .replace(/<meta name="description"[^>]*>/,`<meta name="description" content="${escape(description)}">`)
    .replace(/<meta property="og:title"[^>]*>/,`<meta property="og:title" content="${escape(title)}">`)
    .replace(/<meta property="og:description"[^>]*>/,`<meta property="og:description" content="${escape(description)}">`)
    .replace(/<link rel="canonical"[^>]*>/,`<link rel="canonical" href="${canonical}">`)
    .replace(/<meta property="og:url"[^>]*>/,`<meta property="og:url" content="${canonical}">`)
    .replace('<script src="config.js">',`<script>window.TOMESPOT_ENTRY=${JSON.stringify(entry).replaceAll('<','\\u003c')};</script><script src="config.js">`)
    .replace('</body>',`<details class="kickboard-guide"><summary>${summary}</summary>${intro}${guide.replace(/<h1>(.*?)<\/h1>/,'<h2>$1</h2>').replaceAll('東京の電動キックボード駐輪場','電動キックボードの駐輪場')}</details></body>`);
  if(vehicle==='motorcycle'||vehicle==='privateElectricScooter') {
    const heading=vehicle==='privateElectricScooter'?'<h1 class="category-heading"><span class="heading-ja">電動キックボードの駐輪場</span><span class="heading-zh-Hans">电动滑板车停车场</span><span class="heading-zh-Hant">電動滑板車停車場</span><span class="heading-en">Electric scooter parking</span></h1>':'<h1 class="category-heading"><span class="heading-ja">原付・バイクの駐輪場</span><span class="heading-zh-Hans">原付与摩托车停车场</span><span class="heading-zh-Hant">原付與機車停車場</span><span class="heading-en">Moped and motorcycle parking</span></h1>';
    if(!html.includes('<section class="filters"'))throw Error('Missing map filters for category heading');
    html=html.replace(/(<section class="filters"[^>]*>)/,'$1'+heading)
      .replace('</body>',"<script>(()=>{const titles={\"bicycle\":{\"ja\":\"自転車の駐輪場\",\"zh-Hans\":\"自行车停车场\",\"zh-Hant\":\"自行車停車場\",\"en\":\"Bicycle parking\"},\"privateElectricScooter\":{\"ja\":\"電動キックボードの駐輪場\",\"zh-Hans\":\"电动滑板车停车场\",\"zh-Hant\":\"電動滑板車停車場\",\"en\":\"Electric scooter parking\"},\"motorcycle\":{\"ja\":\"原付・バイクの駐輪場\",\"zh-Hans\":\"原付与摩托车停车场\",\"zh-Hant\":\"原付與機車停車場\",\"en\":\"Moped and motorcycle parking\"}};function update(){const picker=document.getElementById(\"vehicle\"),heading=document.querySelector(\".category-heading\");if(!picker||!heading)return;const labels=titles[picker.value];if(!labels)return;for(const [lang,text] of Object.entries(labels)){const span=heading.querySelector(\".heading-\"+lang);if(span)span.textContent=text;}}document.addEventListener(\"change\",event=>{if(event.target.id===\"vehicle\")update();});document.addEventListener(\"DOMContentLoaded\",update);})();</script></body>")
      .replace('</head>','<style>.category-heading{grid-column:1/-1;margin:0 0 8px;font-size:18px;line-height:1.5}.category-heading span{display:none}html[lang="ja"] .heading-ja,html[lang="zh-Hans"] .heading-zh-Hans,html[lang="zh-Hant"] .heading-zh-Hant,html[lang="en"] .heading-en{display:inline}</style></head>');
  }
  const schema={'@context':'https://schema.org','@type':'CollectionPage',name:title,description,url:canonical,inLanguage:'ja',isPartOf:{'@id':siteUrl+'/#website'}};
  html=html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g,'')
    .replace('</head>',`<script type="application/ld+json">${JSON.stringify(schema).replaceAll('<','\\u003c')}</script><style>.kickboard-guide{padding:24px;max-width:1100px;margin:auto;line-height:1.8}.kickboard-guide summary{cursor:pointer;font-weight:600}.kickboard-guide h2{margin-top:24px}.kickboard-guide nav{display:flex;flex-wrap:wrap;gap:12px}.kickboard-guide li{margin-bottom:12px}</style></head>`);
  fs.writeFileSync(target,html);
}
