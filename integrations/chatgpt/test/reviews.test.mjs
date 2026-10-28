import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalog} from '../src/catalog.mjs';
import {getReviews,prepareFeedback,submitConfirmedDraft} from '../src/reviews.mjs';
import {verifyDraft,signDraft,clientPseudonym} from '../src/feedback-crypto.mjs';
import {handleMcpFeedback} from '../backend-integration/mcp-feedback.mjs';
import {handle} from '../src/server.mjs';
const secret='test-feedback-signing-key-32-characters-only',id=catalog.places[0].id;
async function draft(){return prepareFeedback({id,vehicle:'bicycle',body:'入口の案内が分かりやすかったです。'},{secret,origin:'https://mcp.example',clientAddress:'192.0.2.1'});}
const token=d=>new URL(d.confirmationUrl).hash.slice(1);
test('only public comment fields return; existing website summary is used only on exact body match',async()=>{
  const commentId='test-approved-review',summary={source:'测试用原文',ja:'テスト用の要約'};const reviewedSummaries={[commentId]:summary};
  const raw={id:commentId,facilityId:id,vehicle:'motorcycle',legacyMotorcycle:true,createdAt:'2026-10-27',body:summary.source,email:'private@example.test',admin_note:'private-note',submission_hash:'private-hash',photos:['private-photo']};
  const fetcher=async(url,options)=>{assert.equal(options.redirect,'manual');assert.match(String(url),/\/api\/comments\?facility=/);return Response.json({comments:[raw,{...raw,id:'pending',status:'pending'},{...raw,id:'other',facilityId:'wrong'}],more:false});};
  const r=await getReviews({id,vehicle:'bicycle'},{fetcher,reviewedSummaries});assert.equal(r.comments.length,1);assert.equal(r.comments[0].body,summary.ja);assert.equal(r.comments[0].displayKind,'website_reviewed_summary');assert.equal(r.rating,null);assert.ok(r.comments[0].legacyMotorcycle);assert.ok(!JSON.stringify(r).includes('private-'));assert.ok(!JSON.stringify(r).includes('private@'));
  const changed=await getReviews({id},{reviewedSummaries,fetcher:async()=>Response.json({comments:[{...raw,body:'修正された原文'}],more:false})});assert.equal(changed.comments[0].body,'修正された原文');assert.equal(changed.comments[0].displayKind,'visitor_original');
});
test('empty/error/page metadata never fabricates ratings or a total count',async()=>{
  const r=await getReviews({id,offset:20},{fetcher:async()=>Response.json({comments:[],more:false})});assert.equal(r.returnedCount,0);assert.equal(r.rating,null);assert.equal(r.offset,20);assert.equal(r.totalCount,undefined);
  await assert.rejects(getReviews({id},{fetcher:async()=>new Response('error',{status:503})}));
});
test('draft creates no upstream request; uses expiring signed content and pseudonymous identity',async()=>{
  const d=await draft();assert.equal(d.submitted,false);const p=await verifyDraft(token(d),secret);assert.equal(p.facility,id);assert.equal(p.body,d.body);assert.ok(!JSON.stringify(p).includes('192.0.2.1'));
  await assert.rejects(verifyDraft(token(d)+'changed',secret));await assert.rejects(verifyDraft(token(d),secret,p.exp+1));
  const changed={...p,body:'改ざん'};await assert.rejects(verifyDraft((await signDraft(changed,'another-test-only-signing-key-at-least-32')),secret));
});
test('confirmation route blocks cross-origin/unchecked requests and missing or invalid token',async()=>{
  const d=await draft(),body=JSON.stringify({draft:token(d)});
  for(const headers of [{Origin:'https://evil.example','X-Tomespot-Confirm':'yes'},{Origin:'https://mcp.example'}])assert.equal((await handle(new Request('https://mcp.example/feedback',{method:'POST',headers,body}),{MCP_FEEDBACK_KEY:secret})).status,403);
  const invalid=await handle(new Request('https://mcp.example/feedback',{method:'POST',headers:{Origin:'https://mcp.example','X-Tomespot-Confirm':'yes'},body:JSON.stringify({draft:'bad'})}),{MCP_FEEDBACK_KEY:secret},{fetcher:()=>{throw Error('must not call upstream')}});assert.equal(invalid.status,400);
});
test('confirmed submission uses only dedicated bridge; returns pending, not published',async()=>{
  const d=await draft();let calls=0;const r=await submitConfirmedDraft(token(d),{secret,fetcher:async(url,options)=>{calls++;assert.equal(options.redirect,'manual');assert.ok(url.endsWith('/api/mcp-feedback'));assert.deepEqual(Object.keys(JSON.parse(options.body)),['draft']);assert.equal(options.headers.Authorization,undefined);return Response.json({status:'received'},{status:201});}});
  assert.equal(calls,1);assert.equal(r.moderation,'pending');assert.equal(r.published,false);
});
test('backend bridge enforces signature and delegates with stable replay ID and per-client rate identity',async()=>{
  const d=await draft(),settings={MCP_FEEDBACK_KEY:secret,FRONTEND_ORIGIN:catalog.origin};const seen=[];
  const existing=async(req)=>{const f=await req.formData();seen.push({id:f.get('id'),body:f.get('body'),hash:req.headers.get('x-forwarded-for')});assert.equal(req.headers.get('origin'),catalog.origin);assert.equal(req.headers.get('oai-authenticated-user-id'),null);assert.equal(f.getAll('photos').length,0);return Response.json({status:'received'});};
  const request=()=>new Request('https://project.supabase.co/functions/v1/tomespot/api/mcp-feedback',{method:'POST',body:JSON.stringify({draft:token(d)})});
  assert.equal((await handleMcpFeedback(request(),settings,existing)).status,200);assert.equal((await handleMcpFeedback(request(),settings,existing)).status,200);assert.deepEqual(seen[0],seen[1]);assert.ok(!seen[0].hash.includes('192.0.2.1'));
  const forged=new Request('https://project.supabase.co/tomespot/api/mcp-feedback',{method:'POST',body:JSON.stringify({draft:token(d)+'x'})});assert.equal((await handleMcpFeedback(forged,settings,()=>{throw Error('unauthorized')})).status,400);
});
test('bridge keeps admin routes untouched and propagates existing rate limits',async()=>{
  const d=await draft(),settings={MCP_FEEDBACK_KEY:secret,FRONTEND_ORIGIN:catalog.origin};
  assert.equal((await handleMcpFeedback(new Request('https://project.supabase.co/tomespot/api/admin/comments'),settings,async()=>new Response('auth required',{status:403}))).status,403);
  await assert.rejects(submitConfirmedDraft(token(d),{secret,fetcher:async()=>new Response('rate limit',{status:429})}),/rate_limit/);
});
test('local demo confirmation is clearly marked and never posts a production comment',async()=>{
  const d=await draft();const r=await handle(new Request('http://localhost/feedback',{method:'POST',headers:{Origin:'http://localhost','X-Tomespot-Confirm':'yes'},body:JSON.stringify({draft:token(d)})}),{MCP_FEEDBACK_KEY:secret,LOCAL_FEEDBACK_DEMO:'true'},{fetcher:()=>{throw Error('must not post')}});
  assert.equal((await r.json()).status,'demo_only');
});
test('confirmation uses browser pseudonym rather than shared ChatGPT transport identity',async()=>{
  const d=await draft(),original=await verifyDraft(token(d),secret),browser='198.51.100.20';
  await submitConfirmedDraft(token(d),{secret,clientAddress:browser,fetcher:async(url,options)=>{
    const forwarded=await verifyDraft(JSON.parse(options.body).draft,secret);assert.equal(forwarded.id,original.id);assert.equal(forwarded.client,await clientPseudonym(secret,browser));assert.notEqual(forwarded.client,original.client);assert.ok(!options.body.includes(browser));return Response.json({status:'received'});
  }});
});
