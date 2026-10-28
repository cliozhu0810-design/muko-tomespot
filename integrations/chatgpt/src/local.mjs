import http from 'node:http';
import {Readable} from 'node:stream';
import {handle} from './server.mjs';
import fs from 'node:fs/promises';
const port=Number(process.env.PORT||8787);
http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,`http://127.0.0.1:${port}`);
    if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(req.headers.host)){res.writeHead(403).end();return;}
    if(url.pathname==='/demo'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(await fs.readFile(new URL('../demo.html',import.meta.url)));return;}
    const request=new Request(url,{method:req.method,headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Readable.toWeb(req),duplex:'half'})});
    // Local feedback is a clearly labelled simulation: never write test reviews to production.
    const response=await handle(request,{MCP_FEEDBACK_KEY:'local-demo-only-key-not-valid-in-production',LOCAL_FEEDBACK_DEMO:'true'});res.writeHead(response.status,Object.fromEntries(response.headers));
    if(response.body)Readable.fromWeb(response.body).pipe(res);else res.end();
  }catch{res.writeHead(500).end('Internal error');}
}).listen(port,'127.0.0.1',()=>console.log(`Tomespot MCP: http://127.0.0.1:${port}/mcp`));
