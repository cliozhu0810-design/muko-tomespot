import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const [local,remote]=process.argv.slice(2);
if(!local||!remote)throw Error('Usage: node scripts/reconcile.mjs <existing-clone> <fresh-remote-clone>');
const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
const normalized=p=>fs.readFileSync(p,'utf8').replaceAll('\r\n','\n');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const tracked=git(remote,'ls-files').split('\n');
const differences=[];
for(const file of tracked){const a=path.join(local,file),b=path.join(remote,file);if(!fs.existsSync(a)){differences.push({file,kind:'only_in_remote'});continue;}if(normalized(a)!==normalized(b))differences.push({file,kind:'content_differs'});}
const provenance=JSON.parse(fs.readFileSync(new URL('../data/provenance.json',import.meta.url)));
const publicAssets=Object.entries(provenance.sha256).map(([file,online])=>({file,online,remote:hash(path.join(remote,'source/public',file)),existing:hash(path.join(local,'source/public',file))}));
const report={checkedAt:new Date().toISOString(),existingHEAD:git(local,'rev-parse','HEAD'),remoteHEAD:git(remote,'rev-parse','HEAD'),remoteOrigin:git(remote,'remote','get-url','origin'),existingStatus:git(local,'status','--short').split('\n'),differences,publicAssets,decision:'Use verified public live assets in an independent package. Existing checkout, website routes, comments and backend remain untouched.'};
fs.writeFileSync(new URL('../reconciliation-report.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify({remoteHEAD:report.remoteHEAD,differences,publicAssetsMatch:publicAssets.every(a=>a.online===a.remote&&a.online===a.existing)},null,2));
