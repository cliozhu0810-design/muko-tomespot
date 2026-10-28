const encoder=new TextEncoder();
const b64=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const unb64=s=>Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
async function key(secret){if(typeof secret!=='string'||secret.length<32)throw Error('feedback_unavailable');return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function clientPseudonym(secret,address){return b64(new Uint8Array(await crypto.subtle.sign('HMAC',await key(secret),encoder.encode('client|'+address))));}
export async function signDraft(payload,secret){const body=b64(encoder.encode(JSON.stringify(payload)));const signature=b64(new Uint8Array(await crypto.subtle.sign('HMAC',await key(secret),encoder.encode('draft|'+body))));return body+'.'+signature;}
export async function verifyDraft(token,secret,now=Date.now()){
  try{
    if(typeof token!=='string'||token.length>16000)throw Error();
    const parts=token.split('.');if(parts.length!==2||!parts.every(p=>/^[A-Za-z0-9_-]+$/.test(p)))throw Error();
    if(!await crypto.subtle.verify('HMAC',await key(secret),unb64(parts[1]),encoder.encode('draft|'+parts[0])))throw Error();
    const p=JSON.parse(new TextDecoder().decode(unb64(parts[0])));
    if(p.v!==1||!Number.isFinite(p.exp)||p.exp<now||p.exp>now+16*60*1000||!/^[-a-f0-9]{36}$/.test(p.id)||!/^[-_A-Za-z0-9]{43}$/.test(p.client)||typeof p.facility!=='string'||!p.facility||p.facility.length>100||!['bicycle','privateElectricScooter','motorcycle'].includes(p.vehicle)||typeof p.body!=='string'||!p.body.trim()||p.body.length>2000||typeof p.region!=='string'||p.region.length>80||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(p.body)||/[\u0000-\u001f]/.test(p.region))throw Error();
    return p;
  }catch{throw Error('invalid_or_expired_draft');}
}
