import config from '../data/comments-config.json' with {type:'json'};
import {catalog,detail,labels} from './catalog.mjs';
import {signDraft,clientPseudonym,verifyDraft} from './feedback-crypto.mjs';
export const reviewNotice='口コミは利用者の体験であり、公式の料金・受入条件・空き状況の確認には代用できません。大型バイクの駐車を目撃したという報告も、許可を意味しません。';
function target(id,vehicle){if(id==='__general__')return {id,name:'Tomespot 全体へのご意見',links:{facility:catalog.origin+'/'}};return detail(id,vehicle);}
export async function getReviews({id,vehicle='bicycle',offset=0},{fetcher=fetch,reviewedSummaries=catalog.reviewedSummaries}={}){
  const facility=target(id,vehicle),url=new URL(config.apiBase+'/api/comments');url.searchParams.set('facility',id);url.searchParams.set('offset',String(offset));
  let response;try{response=await fetcher(url,{headers:{apikey:config.publicKey},redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(15000)});}catch(cause){const error=Error('口コミを取得できません。未掲載や0件とは判断せず、施設ページで確認してください。');error.code='reviews_network';error.diagnostic=String(cause.message).replace(/https?:\/\/\S+/g,'[upstream]').slice(0,160);throw error;}
  if(!response.ok){const error=Error('口コミを取得できません。未掲載や0件とは判断せず、施設ページで確認してください。');error.code='reviews_http_'+response.status;throw error;}
  const data=await response.json();if(!Array.isArray(data.comments)||typeof data.more!=='boolean')throw Error('invalid_review_response');
  const comments=data.comments.slice(0,20).filter(c=>c.facilityId===id&&(!c.status||c.status==='approved')&&typeof c.body==='string').map(c=>{
    const reviewed=reviewedSummaries?.[c.id];const translated=reviewed?.source===c.body&&typeof reviewed.ja==='string';
    return {id:String(c.id),vehicle:c.vehicle,vehicleLabel:c.legacyMotorcycle?'旧「バイク」区分（排気量・種別は未確認）':labels[c.vehicle]||'車両区分未確認',legacyMotorcycle:!!c.legacyMotorcycle,createdAt:c.createdAt,body:translated?reviewed.ja:c.body,displayKind:translated?'website_reviewed_summary':'visitor_original',...(translated?{originalBody:c.body}:{}),region:typeof c.region==='string'?c.region:''};
  });
  return {facilityId:id,facilityName:facility.name,requestedVehicle:labels[vehicle],comments,returnedCount:comments.length,offset,more:data.more,nextOffset:data.more?offset+data.comments.length:null,scope:'公開済み口コミの1ページ（最新順、最大20件）。総件数・代表性・車両別適合を推定しない。',rating:null,summary:comments.length?'以下は公開済みの利用者の声です。人工整理済みの項目はサイトの日本語要約、それ以外は原文です。':'このページに公開済み口コミはありません。評価が高い・低いという意味ではありません。',source:facility.links.facility,retrievedAt:new Date().toISOString(),notice:reviewNotice};
}
export async function prepareFeedback({id,vehicle,body,region=''},{secret,origin,clientAddress='unknown'}={}){
  const facility=target(id,vehicle);body=body.trim();region=id==='__general__'?region.trim():'';
  if(!body||body.length>2000||region.length>80)throw Error('コメントは1〜2000文字、地域は80文字以内で入力してください。');
  const payload={v:1,id:crypto.randomUUID(),facility:id,facilityName:facility.name,vehicle,body,region,client:await clientPseudonym(secret,clientAddress),exp:Date.now()+15*60*1000};
  const token=await signDraft(payload,secret);await verifyDraft(token,secret);
  const url=new URL('/feedback',origin);url.hash=token;
  return {status:'draft_only',submitted:false,facilityName:facility.name,vehicle:labels[vehicle],body,region,confirmationUrl:url.href,expiresAt:new Date(payload.exp).toISOString(),message:'まだ送信していません。リンク先で内容・公開予定を確認し、本人が「確認して送信」を押すと審査待ちとして受け付けます。会話履歴や連絡先は送りません。'};
}
export async function submitConfirmedDraft(token,{secret,fetcher=fetch,clientAddress}={}){
  const payload=await verifyDraft(token,secret);target(payload.facility,payload.vehicle);
  // Browser confirmation supplies the client identity, not ChatGPT's shared MCP egress.
  if(clientAddress!==undefined)token=await signDraft({...payload,client:await clientPseudonym(secret,clientAddress)},secret);
  const response=await fetcher(config.apiBase+'/api/mcp-feedback',{method:'POST',headers:{apikey:config.publicKey,'Content-Type':'application/json'},body:JSON.stringify({draft:token}),redirect:'manual',signal:AbortSignal.timeout(15000)});
  if(!response.ok){if(response.status===429)throw Error('rate_limit');throw Error('submit_failed');}
  const result=await response.json();if(result.status!=='received')throw Error('submit_failed');
  return {status:'received',moderation:'pending',published:false,id:payload.id,message:'受け付けました。審査後に公開されます。審査中の内容は口コミ一覧に表示されません。'};
}
