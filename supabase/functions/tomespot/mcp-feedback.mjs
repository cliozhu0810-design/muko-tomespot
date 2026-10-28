// Additive bridge. Uses a dedicated signing secret, never an administrator credential.
// The existing handler still validates facilities, rate limits, UUID replay and pending moderation.
import {verifyDraft} from './feedback-crypto.mjs';
export async function handleMcpFeedback(request,settings,existingHandle){
  const url=new URL(request.url);
  if(!/^\/(?:functions\/v1\/)?tomespot\/api\/mcp-feedback$/.test(url.pathname))return existingHandle(request,settings);
  const fail=(error,status)=>Response.json({error},{status,headers:{'Cache-Control':'no-store'}});
  if(request.method!=='POST')return fail('method_not_allowed',405);
  if(!settings.MCP_FEEDBACK_KEY||settings.MCP_FEEDBACK_KEY.length<32)return fail('unavailable',503);
  try{
    if(Number(request.headers.get('content-length')||0)>18000)return fail('too_large',413);
    const reader=request.body?.getReader();if(!reader)return fail('invalid',400);
    let text='',size=0;const decoder=new TextDecoder();
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>18000){await reader.cancel();return fail('too_large',413);}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();
    const {draft}=JSON.parse(text),p=await verifyDraft(draft,settings.MCP_FEEDBACK_KEY);
    const form=new FormData();for(const [k,v]of Object.entries({id:p.id,facility:p.facility,vehicle:p.vehicle,body:p.body,region:p.region,website:''}))form.set(k,v);
    url.pathname=url.pathname.replace('/api/mcp-feedback','/api/comments');
    // Authenticated bridge supplies only a pseudonym to the existing rate limiter.
    // It never forwards client IPs or administrator identity headers.
    return existingHandle(new Request(url,{method:'POST',headers:{Origin:settings.FRONTEND_ORIGIN,'x-forwarded-for':'mcp:'+p.client},body:form}),settings);
  }catch{return fail('invalid_or_expired_draft',400);}
}
