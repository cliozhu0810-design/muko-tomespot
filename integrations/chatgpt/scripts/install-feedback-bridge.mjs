import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const target=process.argv[2];
if(!target)throw Error('Usage: node scripts/install-feedback-bridge.mjs <personal-repository-root>');
const base=path.resolve(target),buildFile=path.join(base,'scripts/build.mjs');
let build=await fs.readFile(buildFile,'utf8');
if(!build.includes("import {handleMcpFeedback}")){
  const replacements=[
    ["  const dest=path.join(root,'supabase/functions/tomespot');","  const dest=path.join(root,'supabase/functions/tomespot');\n  for(const file of ['mcp-feedback.mjs','feedback-crypto.mjs'])write(path.join(dest,file),read('supabase/'+file));"],
    ["const source=read('supabase/adapter.mjs')",`const source="import {handleMcpFeedback} from './mcp-feedback.mjs';\\n"+read('supabase/adapter.mjs')`],
    ["'FRONTEND_ORIGIN','COMMENT_HASH_SALT'","'FRONTEND_ORIGIN','COMMENT_HASH_SALT','MCP_FEEDBACK_KEY'"],
    ["Deno.serve(request=>handle(request,settings))","Deno.serve(request=>handleMcpFeedback(request,settings,handle))"]
  ];
  for(const [before,after]of replacements){if(!build.includes(before))throw Error('Backend generator differs from reviewed version; no changes applied');build=build.replace(before,after);}
}
const bridge=(await fs.readFile(new URL('../backend-integration/mcp-feedback.mjs',import.meta.url),'utf8')).replace("'../src/feedback-crypto.mjs'","'./feedback-crypto.mjs'");
await fs.writeFile(path.join(base,'supabase/mcp-feedback.mjs'),bridge);
await fs.copyFile(new URL('../src/feedback-crypto.mjs',import.meta.url),path.join(base,'supabase/feedback-crypto.mjs'));
await fs.writeFile(buildFile,build);
console.log('Bridge sources and backend generator updated. Run node scripts/build.mjs --backend-only, tests, then deploy the Supabase function after configuring MCP_FEEDBACK_KEY.');
