import fs from 'node:fs/promises';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {handle} from '../src/server.mjs';
const client=new Client({name:'tomespot-demo',version:'1.0.0'});
// Complete MCP handshake and tool calls using the production handler, without an LLM key.
await client.connect(new StreamableHTTPClientTransport(new URL(process.argv[2]||'http://localhost/mcp'),process.argv[2]?{}:{fetch:(url,init)=>handle(new Request(url,init))}));
const examples=[];
try{
  for(const args of [{query:'横浜駅',vehicle:'bicycle',usage:'temporary',limit:2},{query:'西東京市',vehicle:'privateElectricScooter',limit:2},{query:'目黒駅',vehicle:'privateElectricScooter',limit:2},{query:'西川口駅',vehicle:'motorcycle',engine_cc:750,limit:2},{query:'大阪駅',vehicle:'bicycle'}]){
    const r=await client.callTool({name:'search_parking',arguments:args});examples.push({input:args,output:r.structuredContent||r});
  }
  const first=examples.find(e=>e.output.results?.length)?.output.results[0];
  if(first)examples.push({input:{id:first.id,vehicle:'bicycle'},output:(await client.callTool({name:'get_parking',arguments:{id:first.id,vehicle:'bicycle'}})).structuredContent});
  await fs.writeFile(new URL('../demo-results.json',import.meta.url),JSON.stringify(examples,null,2));
  console.log(examples.map(e=>({input:e.input,total:e.output.total,names:e.output.results?.map(p=>p.name),detail:e.output.id})));
}finally{await client.close();}
