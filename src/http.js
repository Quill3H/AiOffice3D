'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {Store}=require('./store');
const {Engine,fail}=require('./engine');
const ROOT=path.resolve(__dirname,'..');
const secureEqual=(a,b)=>{if(typeof a!=='string'||typeof b!=='string')return false;const left=Buffer.from(a),right=Buffer.from(b);return left.length===right.length&&crypto.timingSafeEqual(left,right);};
function tokenFile(dir,name){
 const file=path.join(dir,name);
 if(!fs.existsSync(file))fs.writeFileSync(file,crypto.randomBytes(32).toString('hex')+'\n',{flag:'wx',mode:0o600});
 if(fs.lstatSync(file).isSymbolicLink())throw new Error('Credential file must not be symlinked');
 fs.chmodSync(file,0o600);const token=fs.readFileSync(file,'utf8').trim();
 if(token.length<32)throw new Error('Local credential is too short');return token;
}
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));}
async function body(req){
 if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))fail('Use application/json','CONTENT_TYPE',415);
 let size=0;const chunks=[];
 for await(const chunk of req){size+=chunk.length;if(size>600*1024){req.resume();fail('Request body too large','BODY_TOO_LARGE',413);}chunks.push(chunk);}
 try {const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!data||typeof data!=='object'||Array.isArray(data))fail('JSON object required');return data;}
 catch(error){if(error.code)throw error;fail('Malformed JSON');}
}
function discoverSkills(){
 const base=path.join(require('node:os').homedir(),'.agents','skills');
 try{return fs.readdirSync(base,{withFileTypes:true}).flatMap(entry=>{
   const present=fs.existsSync(path.join(base,entry.name,'SKILL.md'));
   return present?[{id:entry.name,name:entry.name,status:'DISCOVERED',enabled:false,detail:'Có hướng dẫn trên máy; chưa cấp quyền thực thi trong Studio.'}]:[];
 });}catch{return [];}
}
function createStudio({dataDir=process.env.STUDIO_DATA_DIR||path.join(ROOT,'.studio'),port=process.env.PORT||3333,provider,...engineOptions}={}){
 const store=new Store(dataDir);
 let engine,adminToken,readerToken;
 try{adminToken=tokenFile(store.dir,'access-token');readerToken=tokenFile(store.dir,'read-token');engine=new Engine({store,provider,...engineOptions});}
 catch(error){store.close();throw error;}
 const sessions=new Map();const loginAttempts=new Map();const clients=new Set();const skills=discoverSkills();
 const legacyFiles={
   'task-board':{name:'Task Board phiên bản cũ (chưa tái xác minh)',file:path.join(ROOT,'..','00_QUY_TAC_VA_DIEU_PHOI','TASK_BOARD.md')},
   'memory':{name:'Tài liệu kiến thức dùng chung (chỉ đọc)',file:path.join(ROOT,'..','00_QUY_TAC_VA_DIEU_PHOI','BO_NHO_CHUNG.md')}
 };
 function snapshot(){return {...engine.snapshot(),skills,legacy:Object.entries(legacyFiles).map(([key,x])=>({key,name:x.name,available:fs.existsSync(x.file),readOnly:true,verified:false}))};}
 function authority(req){
   const address=server.address();const currentPort=address?.port||port;
   const allowedHosts=new Set(['localhost:'+currentPort,'127.0.0.1:'+currentPort,'[::1]:'+currentPort]);
   if(!allowedHosts.has(req.headers.host))fail('Host not allowed','HOST_DENIED',403);
   const origin=req.headers.origin;
   if(origin&&origin!=='http://'+req.headers.host)fail('Origin not allowed','ORIGIN_DENIED',403);
   const publicNavigation=req.method==='GET'&&['/','/index.html'].includes(req.url)&&req.headers['sec-fetch-mode']==='navigate'&&req.headers['sec-fetch-dest']==='document';
   if(req.headers['sec-fetch-site']==='cross-site'&&!publicNavigation)fail('Cross-site requests denied','ORIGIN_DENIED',403);
 }
 function auth(req){
   const bearer=req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
   if(bearer){if(secureEqual(bearer,adminToken))return {role:'admin',bearer:true};if(secureEqual(bearer,readerToken))return {role:'reader',bearer:true};}
   const sid=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('studio_session='))?.slice(15);
   const session=sessions.get(sid);
   if(session&&session.expires>Date.now())return {...session,sid};
   if(session)sessions.delete(sid);
   fail('Sign in with a local Studio key','UNAUTHORIZED',401);
 }
 function mutation(req,session){
   if(session.role!=='admin')fail('Read-only key cannot change Studio data','FORBIDDEN',403);
   if(!session.bearer&&!secureEqual(req.headers['x-csrf-token'],session.csrfToken))fail('CSRF token required','CSRF_DENIED',403);
 }
 const server=http.createServer(async(req,res)=>{
   res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');
   res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
   res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
   try{
     authority(req);
     const url=new URL(req.url,'http://'+req.headers.host);let pathname;
     try{pathname=decodeURIComponent(url.pathname);}catch{fail('Malformed path');}
     if(req.method==='OPTIONS')fail('Cross-origin access is not enabled','ORIGIN_DENIED',403);
     if(pathname==='/api/health'&&req.method==='GET'){json(res,200,{status:'ok',version:'4.0.0'});return;}
     if(pathname==='/api/session'&&req.method==='POST'){
       const address=req.socket.remoteAddress;const hits=loginAttempts.get(address)||{count:0,since:Date.now()};
       if(Date.now()-hits.since>60000){hits.count=0;hits.since=Date.now();}
       if(hits.count>=10)fail('Too many sign-in attempts. Retry in one minute.','RATE_LIMIT',429);
       // Reserve synchronously, including requests whose body is still pending.
       hits.count++;loginAttempts.set(address,hits);
       const {token}=await body(req);const role=secureEqual(token,adminToken)?'admin':secureEqual(token,readerToken)?'reader':null;
       if(!role)fail('Invalid local key','UNAUTHORIZED',401);
       // Bounded memory; signing in does not grant a durable capability across restarts.
       for(const [id,s] of sessions)if(s.expires<Date.now())sessions.delete(id);
       if(sessions.size>=100)fail('Session limit reached','RATE_LIMIT',429);
       const sid=crypto.randomBytes(32).toString('hex');const csrfToken=crypto.randomBytes(32).toString('hex');
       sessions.set(sid,{role,csrfToken,expires:Date.now()+12*3600000});
       res.setHeader('Set-Cookie',`studio_session=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200`);
       json(res,200,{role,csrfToken});return;
     }
     if(pathname.startsWith('/api/')){
       const session=auth(req);
       if(pathname==='/api/session'&&req.method==='GET'){json(res,200,{role:session.role,csrfToken:session.csrfToken||null});return;}
       if(pathname==='/api/session'&&req.method==='DELETE'){
         if(!session.bearer&&!secureEqual(req.headers['x-csrf-token'],session.csrfToken))fail('CSRF token required','CSRF_DENIED',403);
         sessions.delete(session.sid);for(const client of clients)if(client.sid===session.sid){client.res.end();clients.delete(client);}
         res.setHeader('Set-Cookie','studio_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');json(res,200,{ok:true});return;
       }
       if(req.method!=='GET')mutation(req,session);
       if(pathname==='/api/state'&&req.method==='GET'){json(res,200,snapshot());return;}
       if(pathname==='/api/events'&&req.method==='GET'){
         if(clients.size>=30)fail('Live connection limit reached','LIMIT',429);
         res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Connection':'keep-alive'});
         res.write(`event: state\ndata: ${JSON.stringify(snapshot())}\n\n`);const client={res,sid:session.sid,expires:session.expires||Date.now()+12*3600000};clients.add(client);
         req.on('close',()=>clients.delete(client));return;
       }
       if(pathname==='/api/tasks'&&req.method==='POST'){json(res,202,engine.create(await body(req),req.headers['idempotency-key']));return;}
       const sourceMatch=pathname.match(/^\/api\/tasks\/(task-[a-f0-9-]{36})\/source$/);
       if(sourceMatch&&req.method==='GET'){
         const task=engine.required(sourceMatch[1]);const source={brief:task.brief,kind:task.kind,input:task.input};
         json(res,200,{...source,sha256:crypto.createHash('sha256').update(JSON.stringify(source)).digest('hex')});return;
       }
       const historyMatch=pathname.match(/^\/api\/tasks\/(task-[a-f0-9-]{36})\/history$/);
       if(historyMatch&&req.method==='GET'){
         const task=engine.required(historyMatch[1]);
         json(res,200,{events:store.events(task.id,1000),attempts:task.attempts});return;
       }
       const taskMatch=pathname.match(/^\/api\/tasks\/(task-[a-f0-9-]{36})\/(retry|cancel|review)$/);
       if(taskMatch&&req.method==='POST'){
         const data=await body(req);const [,id,action]=taskMatch;
         const result=action==='review'?engine.review(id,data):action==='cancel'?engine.cancel(id):engine.retry(id,req.headers['idempotency-key']);
         json(res,200,result);return;
       }
       if(pathname==='/api/providers/probe'&&req.method==='POST'){
         await body(req);await engine.provider.probe();const health=engine.provider.status();
         store.recordEvent({type:'PROVIDER_PROBED',message:'Kiểm tra provider: '+health.status,provider:health});
         engine.emit('change');json(res,200,health);return;
       }
       const artifactMatch=pathname.match(/^\/api\/artifacts\/([^/]+)$/);
       if(artifactMatch&&req.method==='GET'){
         const artifact=engine.readArtifact(artifactMatch[1]);
         res.writeHead(200,{'Content-Type':url.searchParams.get('preview')==='1'?'text/plain; charset=utf-8':'application/octet-stream','Content-Disposition':`${url.searchParams.get('preview')==='1'?'inline':'attachment'}; filename="${artifact.name}"`,'Content-Length':artifact.size});res.end(artifact.content);return;
       }
       const legacy=pathname.match(/^\/api\/legacy\/([a-z-]+)$/);
       if(legacy&&req.method==='GET'){
         const entry=legacyFiles[legacy[1]];if(!entry)fail('Legacy reference not found','NOT_FOUND',404);
         const base=fs.realpathSync(path.join(ROOT,'..','00_QUY_TAC_VA_DIEU_PHOI'));let real;
         try{real=fs.realpathSync(entry.file);}catch{fail('Legacy reference unavailable','NOT_FOUND',404);}
         if(!real.startsWith(base+path.sep)||fs.lstatSync(entry.file).isSymbolicLink())fail('Legacy reference outside scope','FORBIDDEN',403);
         const stat=fs.statSync(real);if(!stat.isFile()||stat.size>2*1024*1024)fail('Legacy reference too large','LIMIT',413);
         res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'});res.end(fs.readFileSync(real));return;
       }
       if(/^\/api\/(chatgpt-bridge|agent|boss-dispatch|deliverable|file-content|stream-video|stream-image|scrape-video|memory|benchmark|live-stream)/.test(pathname))fail('Legacy endpoint disabled. Use the authenticated v4 API.','LEGACY_DISABLED',410);
       fail('API route not found','NOT_FOUND',404);
     }
     const files={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/style.css':'style.css'};
     if(req.method!=='GET'||!files[pathname])fail('Page not found','NOT_FOUND',404);
     const file=path.join(ROOT,'public',files[pathname]);
     const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'}[path.extname(file)];
     const content=await fs.promises.readFile(file);res.writeHead(200,{'Content-Type':mime});res.end(content);
   }catch(error){if(!res.headersSent)json(res,error.status||500,{error:error.status?error.message:'Internal operation failed',code:error.code||'INTERNAL_ERROR'});else res.end();}
 });
 server.requestTimeout=15000;server.headersTimeout=10000;server.maxHeadersCount=60;
 const broadcast=()=>{
   if(!clients.size)return;
   const message=`event: state\ndata: ${JSON.stringify(snapshot())}\n\n`;
   for(const client of clients){if(Date.now()>client.expires||client.res.writableLength>1024*1024){client.res.end();clients.delete(client);}else client.res.write(message);}
 };
 engine.on('change',broadcast);
 const heartbeat=setInterval(()=>{for(const client of clients){if(Date.now()>client.expires){client.res.end();clients.delete(client);}else client.res.write(': keepalive\n\n');}},20000);heartbeat.unref();
 let closing;
 return {server,engine,store,snapshot,listen:()=>new Promise((resolve,reject)=>{server.once('error',reject);server.listen(Number(port),'127.0.0.1',()=>{server.removeListener('error',reject);resolve(server.address());});}),close(){
   if(closing)return closing;
   closing=(async()=>{clearInterval(heartbeat);engine.removeListener('change',broadcast);for(const {res}of clients)res.end();clients.clear();await engine.close();if(server.listening)await new Promise(resolve=>{server.close(resolve);server.closeIdleConnections();});})();return closing;
 }};
}
module.exports={createStudio};
