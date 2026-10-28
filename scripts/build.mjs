import {unifyHeaders} from './shared-header.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {stripTypeScriptTypes} from 'node:module';
import {fileURLToPath} from 'node:url';
import {addRegionalPages} from './regional-pages.mjs';
import {addKawaguchiPages} from './kawaguchi-pages.mjs';
import {addToshimaPages} from './toshima-pages.mjs';
import {addScooterReferencePage} from './scooter-reference-pages.mjs';
import {addKantoPages} from './kanto-pages.mjs';
import {addRegionalMotorcyclePages} from './regional-motorcycle-pages.mjs';
import {addAreaPages} from './area-pages.mjs';
import {addVehicleCategoryPages} from './vehicle-category-pages.mjs';
import {writeKickboardMap,writeMotorcycleMap} from './kickboard-map-page.mjs';
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root,p), 'utf8');
const write = (p, value) => {fs.mkdirSync(path.dirname(p), {recursive:true});fs.writeFileSync(p,value);};
const oldOrigin = 'https://tomespot-test.nuttymink33.chatgpt.site';
const googleVerification='O9g-AXp8S9suP7xtGnB-7wRalOTTqR1gvUMuQ_fwiqo';
function aboutHTML(){
  const content={
    ja:{title:'トメスポについて',intro:'トメスポ（Tomespot）は、電動キックボード・自転車・バイクの駐輪場を探すための地図サービスです。株式会社MUKO が運営しています。',how:'駐輪場の探し方',steps:'車種を選び、駅・住所・施設名で検索できます。一時利用・定期利用で絞り込み、施設の料金・車両条件・公式案内を確認してください。年度・年期登録の施設は定期利用に含まれ、登録方法を個別に表示します。',coverage:'掲載地域と情報について',coverageText:'現在は東京都、および埼玉県・千葉県・神奈川県の一部施設を掲載しています。原付50cc・125cc・大型二輪の利用条件を施設別に確認してください。川崎市・千葉市・船橋市の施設一覧も掲載し、位置確認中の施設は地図に表示していません。地図の地域表示は地図中心の都道府県を示し、掲載範囲や現在地の取得状況を示すものではありません。利用可能な施設でも空きがあるとは限りません。リアルタイムの空き状況は提供していません。最新の料金・利用条件は各施設の公式案内をご確認ください。',browse:'車種・地域から探す',sources:'地図の地域表示',sourcesText:'都道府県はブラウザ内で境界データと照合します。境界・海岸付近では簡略化による判定誤差や未判定が生じる場合があります。',back:'地図に戻る'},
    'zh-Hans':{title:'关于 Tomespot',intro:'Tomespot 是查找电动滑板车、自行车和摩托车停车场的地图服务，由株式会社MUKO运营。',how:'如何查找停车场',steps:'选择车型，搜索车站、地址或设施名称，按临时或定期停车筛选，再查看费用、车辆条件和官方说明。年度、年期登记归入定期停车，并保留各自的登记标识。',coverage:'收录地区与信息',coverageText:'目前收录东京，以及埼玉县、千叶县、神奈川县的部分设施，按场所区分50cc、125cc及大型摩托车条件；另有川崎市、千叶市及船桥市的设施列表，位置待确认的设施不在地图标点。地图地区标签表示地图中心所在都道府县，不代表收录范围或已获取当前位置。网站不提供实时空位，请以设施最新官方费用和条件为准。',browse:'按车型和地区查找',sources:'地图地区显示',sourcesText:'网站在浏览器内匹配都道府县边界。边界及海岸附近可能因数据简化而存在误差或无法判断。',back:'返回地图'},
    'zh-Hant':{title:'關於 Tomespot',intro:'Tomespot 是尋找電動滑板車、自行車和機車停車場的地圖服務，由株式会社MUKO營運。',how:'如何尋找停車場',steps:'選擇車種，搜尋車站、地址或設施名稱，依臨時或定期停車篩選，再查看費用、車輛條件和官方說明。年度、年期登記歸入定期停車，並保留各自的登記標示。',coverage:'收錄地區與資訊',coverageText:'目前收錄東京，以及埼玉縣、千葉縣、神奈川縣的部分設施，依場所區分50cc、125cc及大型機車條件；另有川崎市、千葉市及船橋市的設施列表，位置待確認的設施不在地圖標點。地圖地區標籤表示地圖中心所在都道府縣，不代表收錄範圍或已取得目前位置。網站不提供即時空位，請以設施最新官方費用和條件為準。',browse:'依車種和地區尋找',sources:'地圖地區顯示',sourcesText:'網站在瀏覽器內比對都道府縣邊界。邊界及海岸附近可能因資料簡化而存在誤差或無法判斷。',back:'返回地圖'},
    en:{title:'About Tomespot',intro:'Tomespot is a parking map for privately owned electric scooters, bicycles and motorcycles, operated by 株式会社MUKO.',how:'Find a place to park',steps:'Select a vehicle and search by station, address or facility name. Filter by short-stay or permit parking, then check fees, vehicle conditions and official guidance. Annual registration facilities are included under permit parking and keep their own labels.',coverage:'Coverage and information',coverageText:'The directory covers Tokyo and selected facilities in Saitama, Chiba and Kanagawa. Check each facility’s 50cc, 125cc and larger motorcycle conditions. It also lists facilities in Kawasaki, Chiba and Funabashi; facilities awaiting location checks are not plotted on the map. The map label identifies the prefecture at the map centre; it does not indicate directory coverage or whether your location has been obtained. Live availability is not provided. Check the operator’s latest fees and conditions.',browse:'Browse by vehicle and area',sources:'Map region labels',sourcesText:'Prefecture boundaries are checked in your browser. Simplified boundaries can cause uncertain results near borders and coastlines.',back:'Back to map'}
  };
  const companyLabels={ja:{companyTitle:'運営会社・お問い合わせ',company:'運営会社',contactEmail:'お問い合わせメール'},'zh-Hans':{companyTitle:'运营公司与联系方式',company:'运营公司',contactEmail:'联系邮箱'},'zh-Hant':{companyTitle:'營運公司與聯絡方式',company:'營運公司',contactEmail:'聯絡信箱'},en:{companyTitle:'Company and contact',company:'Company',contactEmail:'Contact email'}};
  for(const [language,labels] of Object.entries(companyLabels))Object.assign(content[language],labels);
  const field=(key,tag)=>`<${tag} data-about="${key}">${content.ja[key]}</${tag}>`;
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>トメスポについて | Tomespot</title><meta name="description" content="トメスポの使い方、掲載地域、駐輪場情報の確認方法をご案内します。"><link rel="stylesheet" href="/search-pages.css"><link rel="icon" href="/icon.svg"></head><body><header><a href="/">トメスポ <small>Tomespot</small></a><nav><a href="/" data-about="back">地図に戻る</a> <select id="about-language" aria-label="Language"><option value="ja">日本語</option><option value="zh-Hans">简体中文</option><option value="zh-Hant">繁體中文</option><option value="en">English</option></select></nav></header><main>${field('title','h1')}${field('intro','p')}<section aria-labelledby="company-title"><h2 id="company-title" data-about="companyTitle">運営会社・お問い合わせ</h2><dl><dt data-about="company">運営会社</dt><dd>株式会社MUKO</dd><dt data-about="contactEmail">お問い合わせメール</dt><dd><a href="mailto:juju@jumel.co.jp">juju@jumel.co.jp</a></dd></dl></section>${field('how','h2')}${field('steps','p')}${field('browse','h2')}<nav class="ward-nav" aria-label="駐輪場一覧"><a href="/parking-directory.html">地域別の駐輪場一覧</a><a href="/kickboard-parking.html">電動キックボードの駐輪場</a><a href="/bicycle-parking.html">自転車駐輪場</a><a href="/motorcycle-parking.html">バイク・原付の駐輪場</a></nav>${field('coverage','h2')}${field('coverageText','p')}${field('sources','h2')}${field('sourcesText','p')}<p>境界データ：<a href="https://github.com/piuccio/open-data-jp-prefectures-geojson">open-data-jp-prefectures-geojson</a>（国土交通省・国土数値情報を加工） / <a href="/prefectures-license.txt">MIT License</a></p><p>駅名・よみ：<a href="https://github.com/Seo-4d696b75/station_database">station_database / Seo-4d696b75</a>（掲載地域向け抽出・駅名統合・別表記・ローマ字追加、2026-10-21） / <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>。駅から約1.2km以内の掲載施設を検索します。車種・お気に入り・最近見た施設（20件まで）はこのブラウザーに保存されます。ブラウザーのデータを削除すると消去され、別の端末とは同期されません。</p></main><script>const aboutContent=${JSON.stringify(content)};const language=document.getElementById('about-language');function showAbout(){const text=aboutContent[language.value];document.documentElement.lang=language.value;document.querySelectorAll('[data-about]').forEach(el=>el.textContent=text[el.dataset.about]);document.title=text.title+' | Tomespot';try{localStorage.setItem('tomespot:language',language.value)}catch{}}try{const saved=localStorage.getItem('tomespot:language');if(aboutContent[saved])language.value=saved}catch{}language.onchange=showAbout;showAbout();</script></body></html>`;
}
const searchPages = {
  'index.html': {
    title:'電動キックボード・自転車・バイクの駐輪場｜トメスポ',
    description:'電動キックボード・自転車・バイクの駐輪場を地図で検索。駅名・住所・施設名から停める場所を探し、一時利用・定期利用の料金、車両ごとの利用条件、公式案内を確認できます。'
  },
  'kickboard-parking.html': {
    title:'電動キックボードの駐輪場｜停める場所・料金を探す｜トメスポ',
    heading:'電動キックボードの駐輪場を探す',
    description:'マイ電動キックボードの駐輪場・駐車場を地図で検索。駅名・住所から停める場所を探し、一時利用・定期利用の料金、受入条件、公式案内を確認できます。',
    questions:[
      ['電動キックボードは駐輪場に停められますか？','電動キックボードの受入条件は施設ごとに異なります。自転車や原付が利用できる駐輪場でも、電動キックボードを停められるとは限りません。自分の車両区分、大きさ、指定区画、申請の要否を公式案内で確認してください。'],
      ['目黒駅など、駅の近くでマイ電動キックボードの駐輪場を探すには？','地図の検索欄に「目黒駅」など目的地の駅名・住所・施設名を入力してください。駅周辺の掲載施設を絞り込み、施設ごとの受入条件や料金を確認できます。駅によっては受入確認済みの施設が見つからない場合もあります。掲載範囲は「トメスポについて」でご案内しています。'],
      ['「キックボード駐車場」で探している場合も使えますか？','トメスポでは、個人所有の電動キックボードを停める場所を駐輪場として掲載しています。施設ごとの車両条件、指定区画、料金、申請の要否を確認できます。シェアサービスの返却ポートとは異なります。'],
      ['一時利用と定期利用はどう違いますか？','短時間の買い物などには一時利用、通勤など継続して利用する場合には定期利用の条件を確認してください。年度・年期登録の施設も定期利用から探せます。申請や登録シールが必要な場合があります。']
    ]
  },
  'bicycle-parking.html': {
    title:'東京・横浜市神奈川区の自転車駐輪場｜料金・定期利用｜トメスポ',
    heading:'東京・横浜市神奈川区の自転車駐輪場',
    description:'東京・横浜市神奈川区の自転車駐輪場を駅や地域から検索。一時利用、無料時間、定期利用の料金や利用条件を確認し、目的地近くで自転車を停める場所を探せます。',
    questions:[['自転車駐輪場の料金や無料時間はどこで確認できますか？','施設の詳細から一時利用・定期利用の料金と利用条件を確認できます。無料時間の設定や利用時間は施設によって異なります。最新の料金や募集状況は公式案内をご確認ください。']]
  },
  'motorcycle-parking.html': {
    title:'東京・横浜市神奈川区のバイク駐輪場・原付駐輪場｜トメスポ',
    heading:'東京・横浜市神奈川区のバイク駐輪場・原付駐輪場',
    description:'東京・横浜市神奈川区のバイク駐輪場・原付駐輪場を地域別に検索。排気量や車両区分の受入条件、一時利用・定期利用の料金を確認し、バイクを停める場所を探せます。',
    questions:[['原付を停められる駐輪場なら、どのバイクでも利用できますか？','原付対応の施設でも、すべてのバイクが利用できるとは限りません。排気量、車幅、車長、指定区画などの受入条件を施設ごとに確認してください。']]
  }
};
function searchHTML(html,file,siteUrl) {
  const escape=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const pretty=siteUrl.endsWith('.pages.dev');
  const publicPath=file==='index.html'?'/':'/'+(pretty?file.replace(/\.html$/,''):file);
  const canonical=siteUrl+publicPath;
  html=html.replace(/<link\s+rel="canonical"[^>]*>/g,'').replace(/<meta\s+property="og:url"[^>]*>/g,'');
  html=html.replace('</head>',`<link rel="canonical" href="${escape(canonical)}"><meta property="og:url" content="${escape(canonical)}"></head>`);
  // Structured data uses the same URLs as canonicals; ordinary links can keep .html for GitHub compatibility.
  html=html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,(_,data)=>{
    const obj=JSON.parse(data),visit=value=>typeof value==='string'&&pretty&&value.startsWith(siteUrl)?value.replace(/\.html(?=[#?]|$)/,''):Array.isArray(value)?value.map(visit):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,visit(v)])):value;
    return '<script type="application/ld+json">'+JSON.stringify(visit(obj)).replaceAll('<','\\u003c')+'</script>';
  });
  const page=searchPages[file];
  if(page){
    html=html.replace(/<title>[^<]*<\/title>/,`<title>${escape(page.title)}</title>`)
      .replace(/<meta name="description"[^>]*>/,`<meta name="description" content="${escape(page.description)}">`)
      .replace(/<meta property="og:title"[^>]*>/,`<meta property="og:title" content="${escape(page.title)}">`)
      .replace(/<meta property="og:description"[^>]*>/,`<meta property="og:description" content="${escape(page.description)}">`);
    if(file==='index.html'){
      html=html.replace(/(<h1 data-i18n="title">)[\s\S]*?(<\/h1>)/,'$1'+escape(page.title)+'$2').replace(/(<p data-i18n="description">)[\s\S]*?(<\/p>)/,'$1'+escape(page.description)+'$2');
      const website={'@context':'https://schema.org','@type':'WebSite','@id':siteUrl+'/#website',url:siteUrl+'/',name:'トメスポ',alternateName:['Tomespot','muko Tomespot'],description:page.description,inLanguage:['ja','zh-Hans','zh-Hant','en'],publisher:{'@type':'Organization',name:'muko'}};
      html=html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g,'').replace('</head>','<script type="application/ld+json">'+JSON.stringify(website)+'</script></head>');
    }else{
      html=html.replace(/<h1>[^<]*<\/h1><p>[^<]*<\/p>/,`<h1>${escape(page.heading)}</h1><p>${escape(page.description)}</p>`);
      if(file==='kickboard-parking.html'){
        html=html.replace('>この車種を地図で探す</a>','>電動キックボードの駐輪場を地図で探す</a>')
          .replace('<h2>地域別の駐車場・駐輪場 ','<h2>電動キックボードの受入条件を確認した駐輪場 ')
          .replace('東京の電動キックボード駐車場・停める場所</a>','電動キックボードの駐輪場</a>');
        html=html.replace('<h2>停める前に確認すること</h2>','<p>料金や受入条件は施設の詳細と公式案内をご確認ください。<a href="/about.html">掲載範囲・トメスポについて</a></p><h2>停める前に確認すること</h2>');
      }
      html=html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,(_,data)=>{
        const obj=JSON.parse(data);if(obj['@type']==='CollectionPage')Object.assign(obj,{name:page.heading,description:page.description,url:canonical});
        return '<script type="application/ld+json">'+JSON.stringify(obj).replaceAll('<','\\u003c')+'</script>';
      });
      html=html.replace(/<h2>(?:地域別の|電動キックボードの受入条件を確認した)/,match=>`<section aria-labelledby="parking-guide"><h2 id="parking-guide">駐輪場の探し方・よくある質問</h2>${page.questions.map(([q,a])=>`<h3>${escape(q)}</h3><p>${escape(a)}</p>`).join('')}</section>${match}`);
    }
  }
  return html;
}
function serializedHTML(source, marker) {
  const line = source.slice(source.indexOf(marker) + marker.length);
  const literal=line.trimStart().match(/^"(?:[^"\\]|\\.)*"/s);
  if(!literal)throw Error('Missing serialized HTML');
  return JSON.parse(literal[0]);
}
function tsBody(source) {
  return stripTypeScriptTypes(source.replace(/^import .*;\r?\n/gm,''), {mode:'strip'}).replace(/\bexport /g,'');
}
export function buildBackend() {
  const dest = path.join(root,'backend/generated');
  const common = read('source/comments.ts').replace(/import parking from .*;\r?\n/,'const parking = PARKING;\n')
    .replace("return request.headers.get('origin')===new URL(request.url).origin;", "const origin=request.headers.get('origin');return origin===new URL(request.url).origin||origin===env.FRONTEND_ORIGIN;");
  const routePaths = {comments:'api/comments',photos:'api/photos/[id]',session:'api/admin/session',queue:'api/admin/comments',moderate:'api/admin/comments/[id]',admin:'admin'};
  const handlers = Object.entries(routePaths).map(([name,p]) => {
    let source = read(`source/app/${p}/route.ts`);
    if (name==='admin') source=source.replace('/signin-with-chatgpt?return_to=%2Fadmin','/admin').replace('href=\\"/\\"', 'href=\\"'+JSON.parse(read('deploy-config.json')).siteUrl+'/\\"');
    const methods = [...source.matchAll(/export (?:async )?function (GET|POST|PATCH)/g)].map(m=>m[1]);
    return `${name}:(()=>{${tsBody(source)}\nreturn {${methods.join(',')}};})()`;
  });
  const facilities = JSON.parse(read('source/public/parking.json')).places.map(p=>({id:p.id,name:p.name}));
  const worker = `${read('backend/gateway.mjs')}\nconst PARKING=${JSON.stringify({places:facilities})};\nfunction makeRoutes(env){${tsBody(common)}\nreturn {${handlers.join(',\n')}};}\nexport default {fetch(request,env){return dispatch(request,env,makeRoutes(env));}};\n`;
  write(path.join(dest,'worker.mjs'), worker);
  for (const f of ['admin.js','comments.css','locales.json']) write(path.join(dest,'assets',f),read('source/public/'+f));
  return dest;
}
export function buildSupabaseBackend() {
  const dest=path.join(root,'supabase/functions/tomespot');
  for(const file of ['mcp-feedback.mjs','feedback-crypto.mjs'])write(path.join(dest,file),read('supabase/'+file));
  let common=read('source/comments.ts').replace(/import parking from .*;\r?\n/,'const parking = PARKING;\n')
    .replace("return request.headers.get('origin')===new URL(request.url).origin;", "const origin=request.headers.get('origin');return origin===env.FRONTEND_ORIGIN;");
  const paths={comments:'api/comments',photos:'api/photos/[id]',session:'api/admin/session',queue:'api/admin/comments',moderate:'api/admin/comments/[id]'};
  const handlers=Object.entries(paths).map(([name,p])=>{
    let source=read(`source/app/${p}/route.ts`).replace("(request.headers.get('cf-connecting-ip')||request.headers.get('oai-authenticated-user-id')||'anonymous')", "(request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'anonymous')");
    const methods=[...source.matchAll(/export (?:async )?function (GET|POST|PATCH)/g)].map(m=>m[1]);
    return `${name}:(()=>{${tsBody(source)}\nreturn {${methods.join(',')}};})()`;
  });
  let gateway=read('backend/gateway.mjs').slice(read('backend/gateway.mjs').indexOf('export function cors'))
    .replace('Administrator sign-in required. Open /admin through Cloudflare Access.','Administrator sign-in required.')
    .replaceAll("'GET, POST, OPTIONS'","'GET, POST, PATCH, OPTIONS'")
    .replaceAll("'Content-Type'", "'Content-Type, Authorization'")
    .replace("['GET','POST'].includes", "['GET','POST','PATCH'].includes")
    .replace('path = url.pathname;',"path = url.pathname.replace(/^\\/(?:functions\\/v1\\/)?tomespot(?=\\/|$)/,'');")
    .replace("else if ((path === '/admin' || path === '/admin/') && request.method === 'GET') result = routes.admin.GET();", "else if (path === '/admin' || path === '/admin/') result = new Response('Use the administrator page on GitHub Pages.', {status:404});")
    .replace("else if (['/admin.js','/comments.css','/locales.json'].includes(path) && request.method === 'GET') result = await env.ASSETS.fetch(request);",'');
  const places=JSON.parse(read('source/public/parking.json')).places.map(p=>({id:p.id,name:p.name}));
  const source="import {handleMcpFeedback} from './mcp-feedback.mjs';\n"+read('supabase/adapter.mjs')+'\nconst verifyAdmin=verifySupabaseAdmin;\n'+gateway+`\nconst PARKING=${JSON.stringify({places})};\nfunction makeRoutes(env){${tsBody(common)}\nreturn {${handlers.join(',\n')}};}\nexport function handle(request,settings){const env={...settings,...createStorage(settings)};return dispatch(request,env,makeRoutes(env));}\nif(typeof Deno!=='undefined'){const names=['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','ADMIN_EMAIL','FRONTEND_ORIGIN','COMMENT_HASH_SALT','MCP_FEEDBACK_KEY'];const settings=Object.fromEntries(names.map(k=>[k,Deno.env.get(k)]));Deno.serve(request=>handleMcpFeedback(request,settings,handle));}\n`;
  write(path.join(dest,'index.ts'),source);
  return dest;
}
export function buildFrontend({apiBase,siteUrl,output=path.join(root,'dist')}={}) {
  const config=JSON.parse(read('deploy-config.json'));
  apiBase=(apiBase||process.env.TOMESPOT_API_URL||config.apiBase||'').replace(/\/$/,'');
  siteUrl=(siteUrl||process.env.TOMESPOT_SITE_URL||config.siteUrl).replace(/\/$/,'');
  if (!/^https:\/\/[^/]+(?:\/functions\/v1\/tomespot)?$/.test(apiBase)) throw Error('Set TOMESPOT_API_URL to your deployed backend URL before publishing.');
  if (!/^https:\/\/[^/]+$/.test(siteUrl)) throw Error('Use the root repository cliozhu0810-design.github.io; siteUrl must be an HTTPS origin.');
  const isSupabase=apiBase.endsWith('/functions/v1/tomespot');
  const supabaseKey=process.env.TOMESPOT_SUPABASE_KEY||config.supabaseKey||'';
  if(isSupabase&&!supabaseKey)throw Error('Set TOMESPOT_SUPABASE_KEY to the public publishable/anon key. Never use service_role or a secret key.');
  if(supabaseKey.startsWith('sb_secret_'))throw Error('A secret key must never be published. Use the publishable key.');
  if(supabaseKey.split('.').length===3){try{if(JSON.parse(Buffer.from(supabaseKey.split('.')[1],'base64url')).role!=='anon')throw Error('Only an anon JWT key is allowed in public config.');}catch(e){throw Error('Invalid public Supabase key: '+e.message);}}
  const htmlPath=p => !p.startsWith('/')||p.split(/[?#]/)[0]==='/'||/\.[a-z0-9]+(?:[?#]|$)/i.test(p)||p.startsWith('//') ? p : p.replace(/^([^?#]*)(.*)$/, '$1.html$2');
  const standardizeTerms = text => text
    .replaceAll('電動キックボードの駐車場・停める場所','電動キックボードの駐輪場')
    .replaceAll('電動キックボード駐車場・停める場所','電動キックボード駐輪場')
    .replaceAll('自転車駐車場・駐輪場','自転車駐輪場')
    .replaceAll('駐車場・駐輪場','駐輪場')
    .replaceAll('目的地近くの駐車場','目的地近くの駐輪場')
    .replaceAll('バイク駐車場・原付の駐輪場','バイク・原付の駐輪場');
  const rewrite = text => text.replaceAll(oldOrigin,siteUrl)
    .replace(/<meta name="google-site-verification"[^>]*\/?\s*>/g,'')
    .replace(/(href=")([^"\s]+)(")/g,(_,a,p,b)=>a+htmlPath(p)+b)
    .replace(new RegExp(siteUrl.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(/[^"<\\s]*)','g'),(_,p)=>siteUrl+htmlPath(p));
  const allowed = /^(parking\/[^/]+\.html|vendor\/.+|(?:header\.css|header\.js|station-search\.js|scooter-screening\.js|vehicle-categories\.js|discovery-listings\.js|app\.js|comments\.js|comments\.css|data-locales\.json|icon\.svg|locales\.json|parking\.json|vehicle-data\.json|prefectures\.json|prefectures-license\.txt|style\.css|search-pages\.css|parking-directory\.html|kickboard-parking\.html|bicycle-parking\.html|motorcycle-parking\.html|robots\.txt|sitemap\.xml))$/;
  function copy(dir,relative='') {
    for(const item of fs.readdirSync(dir,{withFileTypes:true})) {
      const rel=relative+item.name, full=path.join(dir,item.name);
      if(item.isDirectory()) {copy(full,rel+'/');continue;}
      if(!allowed.test(rel)) continue;
      let body=fs.readFileSync(full);
      if(/\.(html|xml|txt|json|js|css)$/.test(rel)) {
        body=body.toString();
        if(rel.endsWith('.html')||rel==='locales.json') body=standardizeTerms(body);
        body=rewrite(body);
      }
      if(rel==='app.js') body=body.replace(/fetch\('\/api\/admin\/session'\)[\s\S]*$/,'');
      if(rel==='comments.js') body=body.replaceAll("fetch('/api/comments", "fetch(tomespotApi('/api/comments")
        .replace("+offset);", "+offset));")
        .replace("fetch(tomespotApi('/api/comments',{", "fetch(tomespotApi('/api/comments'),{")
        .replaceAll('a.href=url;', 'a.href=tomespotApi(url);').replaceAll('img.src=url;', 'img.src=tomespotApi(url);');
      if(rel.endsWith('.html'))body=searchHTML(body,rel,siteUrl);
      if(rel==='locales.json'){
        const messages=JSON.parse(body);
        messages.title.ja=searchPages['index.html'].title;
        messages.description.ja=searchPages['index.html'].description;
        body=JSON.stringify(messages);
      }
      if(rel==='sitemap.xml'&&siteUrl.endsWith('.pages.dev'))body=body.replace(/\.html(?=<\/loc>)/g,'');
      if(rel==='sitemap.xml')body=body.replace('</urlset>',`<url><loc>${siteUrl}/about${siteUrl.endsWith('.pages.dev')?'':'.html'}</loc></url></urlset>`);
      write(path.join(output,rel),body);
    }
  }
  copy(path.join(root,'source/public'));
  let html=rewrite(standardizeTerms(serializedHTML(read('source/app/map-html.ts'),'export const html = ')));
  html=html.replace('href="/admin.html" id="admin-link" hidden',`href="${isSupabase?'/admin.html':apiBase+'/admin'}" id="admin-link" hidden`)
    .replace('<script defer src="app.js"></script>','<script src="config.js"></script><script defer src="app.js"></script>');
  html=searchHTML(html,'index.html',siteUrl).replace('</head>',`<meta name="google-site-verification" content="${googleVerification}"></head>`);
  write(path.join(output,'index.html'),html);
  write(path.join(output,'about.html'),searchHTML(aboutHTML(),'about.html',siteUrl));
  addRegionalPages({root,output,siteUrl});
  addKawaguchiPages({root,output,siteUrl});
  addToshimaPages({root,output,siteUrl});
  addScooterReferencePage({root,output,siteUrl});
  addKantoPages({root,output,siteUrl});
  addRegionalMotorcyclePages({root,output,siteUrl});
  addAreaPages({root,output,siteUrl});
  addVehicleCategoryPages({root,output,siteUrl});
  unifyHeaders(output);
  write(path.join(output,'config.js'),`window.TOMESPOT_CONFIG=${JSON.stringify({apiBase,siteUrl,...(isSupabase?{supabaseUrl:apiBase.split('/functions/')[0],supabaseKey}:{})})};\nfunction tomespotApi(p){return /^(https?:|blob:)/.test(p)?p:window.TOMESPOT_CONFIG.apiBase+p;}\n`);
  if(isSupabase){
    let admin=serializedHTML(read('source/app/admin/route.ts'),'const html=');
    admin=admin.replace('/signin-with-chatgpt?return_to=%2Fadmin','#login')
      .replace('<script src="/admin.js" defer></script>','<script src="/config.js"></script><script src="/admin-auth.js" defer></script><script src="/admin.js" defer></script>')
      .replace('<h1 data-i18n="adminTitle">','<section id="login"><form id="admin-login"><label>Email<input name="email" type="email" autocomplete="username" required></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><button type="submit">ログイン / 登录 / Sign in</button><p id="login-status" role="status"></p></form><button id="admin-logout" type="button">ログアウト / 退出 / Sign out</button></section><h1 data-i18n="adminTitle">');
    admin=admin.replace('</head>','<meta name="robots" content="noindex,nofollow"></head>');
    write(path.join(output,'admin.html'),admin);
    let adminJS=read('source/public/admin.js').replace('function renderCards(){','function renderCards(){clearAdminPhotos();').replaceAll('link.href=url;', 'link.href="#";').replaceAll('img.src=url;', 'loadAdminPhoto(url,img,link);');
    write(path.join(output,'admin.js'),adminJS);
    write(path.join(output,'admin-auth.js'),read('supabase/admin-auth.js'));
  }
  write(path.join(output,'.nojekyll'),'');
  write(path.join(output,'404.html'),'<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Tomespot</title><p>ページが見つかりません / 页面不存在。</p><a href="/">Tomespot</a>');
  // Keep directions in Google Maps; position-accuracy prose is not part of facility UI.
  function cleanLocationProse(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory()){cleanLocationProse(file);continue;}if(!file.endsWith('.html'))continue;const before=fs.readFileSync(file,'utf8'),after=before.replace(/（[^（）]*(?:入口位置|バイク入口)[^（）]*(?:確認中|未確認)[^（）]*）/g,'').replace(/<div class="source-stamp">[^<]*<\/div>/g,'').replace(/(?:<br>\s*)?<strong>[^<]*(?:正確な入口|入口位置|施設の参考位置)[^<]*<\/strong>/g,'').replace(/<p(?:\s[^>]*)?>[^<]*(?:正確な入口|入口位置|施設の参考位置)[^<]*<\/p>/g,'');if(after!==before)fs.writeFileSync(file,after);}}
  cleanLocationProse(output);
  writeKickboardMap({output,siteUrl,...searchPages['kickboard-parking.html']});
  writeMotorcycleMap({output,siteUrl});
  return output;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  buildSupabaseBackend();
  if(!process.argv.includes('--backend-only')) buildFrontend();
  console.log('Build complete.');
}
