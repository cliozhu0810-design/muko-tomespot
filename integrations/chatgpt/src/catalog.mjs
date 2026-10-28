import catalog from '../data/catalog.json' with {type:'json'};
export {catalog};
export const labels={bicycle:'自転車',privateElectricScooter:'電動キックボード',motorcycle:'原付・バイク'};
export const notice='リアルタイムの空き状況は提供していません。料金・車両条件は原資料の区分・期間・資格ごとに比較し、最新情報は公式案内で確認してください。未確認は利用可能を意味しません。';
const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[\s・･ー\-’']/g,'').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96)).replace(/(?:station|駅|えき)$/,'');
export function distance(a,b){const rad=Math.PI/180,dy=(b.lat-a.lat)*rad,dx=(b.lng-a.lng)*rad;return 6371000*2*Math.asin(Math.min(1,Math.sqrt(Math.sin(dy/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dx/2)**2)));}
const safeUrl=s=>{try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}};
function links(p,vehicle){
  const url=new URL('/',catalog.origin);url.searchParams.set('place',p.id);url.searchParams.set('vehicle',vehicle);
  const maps=new URL('https://www.google.com/maps/search/');maps.searchParams.set('api','1');maps.searchParams.set('query',`${p.address} ${p.name}`);
  return {facility:url.href,map:maps.href,official:safeUrl(p.source),category:catalog.origin+({bicycle:'/?vehicle=bicycle',privateElectricScooter:'/kickboard-parking',motorcycle:'/motorcycle-parking'}[vehicle])};
}
export function detail(id,vehicle='bicycle',engine_cc){
  const p=catalog.places.find(p=>p.id===id);if(!p)throw Error('施設IDが見つかりません。検索結果のIDを使用してください。');
  const profiles=vehicle==='motorcycle'?{moped:p.profiles.moped,motorcycle:p.profiles.motorcycle}:{[vehicle]:p.profiles[vehicle]};
  const resultProfiles=Object.fromEntries(Object.entries(profiles).map(([key,q])=>[key,{...q,tariffs:q.admissionStatus==='confirmed'?q.tariffs||[]:[],publishedFeesRaw:q.admissionStatus==='confirmed'?q.publishedFeesRaw||'':'',sources:(q.sources||[]).filter(s=>safeUrl(s.url)),statusLabel:{confirmed:'確認済み（記載車両区分・条件の範囲内）',rejected:'対象外',unknown:'未確認'}[q.admissionStatus]||'未確認'}]));
  return {id:p.id,name:p.name,address:p.address,area:p.ward,vehicle:labels[vehicle],profiles:resultProfiles,
    sourceVehicleRules:vehicle==='motorcycle'?p.motorcycleRules:undefined,
    requestedVehicleFit:engine_cc===undefined?undefined:{engineCC:engine_cc,status:'unverified',label:'未確認：排気量だけで適合を判定できません。原付種別・出力・寸法・区画等を公式案内で確認してください。'},
    location:{lat:p.lat??null,lng:p.lng??null,precision:p.positionPrecision||p.coordinateStatus||'unverified',distanceType:'直線距離。入口・徒歩経路は未確認'},
    links:links(p,vehicle),availability:{status:'not_provided',label:'空き状況は未提供'},snapshotRetrievedAt:catalog.retrievedAt,notice};
}
function admitted(p,vehicle,usage,includeUnknown){
  const rows=vehicle==='motorcycle'?[p.profiles.moped,p.profiles.motorcycle]:[p.profiles[vehicle]];
  return rows.some(q=>{
    if(q.admissionStatus==='rejected')return false;
    if(!includeUnknown&&q.admissionStatus!=='confirmed')return false;
    if(usage==='temporary')return q.admissionStatus==='confirmed'&&q.temporaryStatus==='confirmed';
    if(usage==='regular')return q.admissionStatus==='confirmed'&&['confirmed','confirmed_application_required','confirmed_annual_registration_required','not_monthly_annual_registration_only'].includes(q.regularStatus);
    return true;
  });
}
export function search({query='',vehicle,usage='any',latitude,longitude,radius_m=1200,include_unconfirmed=false,limit=5,engine_cc}={}){
  const q=norm(query),hasPoint=latitude!==undefined&&longitude!==undefined;
  if(!q&&!hasPoint)throw Error('駅名・住所・施設名、または緯度と経度が必要です。「近く」の場合は場所を確認してください。');
  const matches=hasPoint?[]:catalog.stations.filter(s=>s.keys.includes(q)||norm(s.name)===q||norm(s.kana)===q);
  if(matches.length>1)return {needsClarification:true,message:'同名の駅があります。地域または座標を指定してください。',stations:matches.map(s=>({name:s.name,area:s.area,lat:s.lat,lng:s.lng}))};
  const center=hasPoint?{lat:latitude,lng:longitude}:matches[0];
  const found=catalog.places.flatMap(p=>{
    if(!admitted(p,vehicle,usage,include_unconfirmed))return [];
    let meters;
    if(center){if(!Number.isFinite(p.lat)||!Number.isFinite(p.lng))return [];meters=distance(center,p);if(meters>radius_m)return [];}
    else if(!norm([p.name,p.address,p.ward].join(' ')).includes(q))return [];
    return [{p,meters}];
  }).sort((a,b)=>(a.meters??0)-(b.meters??0)||a.p.name.localeCompare(b.p.name,'ja'));
  return {query,vehicle:labels[vehicle],usage,center:center?{name:center.name||null,lat:center.lat,lng:center.lng}:null,radiusM:center?radius_m:null,
    total:found.length,returned:Math.min(limit,found.length),hasMore:found.length>limit,
    results:found.slice(0,limit).map(({p,meters})=>({...detail(p.id,vehicle,engine_cc),distanceM:meters===undefined?null:Math.round(meters)})),
    coverage:catalog.coverage,message:found.length?'料金は車両区分・利用方式・期間・資格ごとに比較してください。最安値の自動判定は行いません。':'条件に合う掲載施設がありません。当地に駐輪場が存在しないという意味ではありません。場所・車両・利用方式を確認してください。',notice};
}
