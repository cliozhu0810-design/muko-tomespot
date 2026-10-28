import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {fetchSnapshot,saveSnapshot} from './snapshot.mjs';

export async function needsDeployment(snapshot,{endpoint,force=false,fetcher=fetch}={}){
  if(force)return true;
  if(!endpoint)throw Error('Set repository variable TOMESPOT_MCP_URL to the deployed HTTPS /mcp URL, or run manually with force_deploy.');
  const url=new URL(endpoint);
  if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/mcp'||url.search||url.hash)throw Error('TOMESPOT_MCP_URL must be an HTTPS /mcp URL without credentials or query.');
  url.pathname='/health';
  const response=await fetcher(url,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error(`Current MCP health unavailable: HTTP ${response.status}. Existing deployment retained.`);
  const health=await response.json();
  if(health.name!=='tomespot'||!(health.readOnly===true||health.catalogReadOnly===true))throw Error('Unexpected MCP service. Existing deployment retained.');
  return health.sourceFingerprint!==snapshot.sourceFingerprint;
}
async function main(){
  const snapshot=await fetchSnapshot();
  const changed=await needsDeployment(snapshot,{endpoint:process.env.TOMESPOT_MCP_URL,force:process.env.FORCE_DEPLOY==='true'});
  if(changed)await saveSnapshot(snapshot);
  const summary={checkedAt:new Date().toISOString(),changed,sourceFingerprint:snapshot.sourceFingerprint,places:snapshot.places.length};
  console.log(JSON.stringify(summary,null,2));
  if(process.env.GITHUB_OUTPUT)await fs.appendFile(process.env.GITHUB_OUTPUT,`changed=${changed}\n`);
  if(process.env.GITHUB_STEP_SUMMARY)await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,`### Tomespot public data check\n\nChecked: ${summary.checkedAt}\n\nFacilities: ${summary.places}\n\n${changed?'Change detected; deployment follows only after tests and build pass.':'No source change; existing deployment retained.'}\n`);
}
if(process.argv[1]===fileURLToPath(import.meta.url))await main();
