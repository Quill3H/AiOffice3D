const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createStudio}=require('../src/http');

async function setup(t,options={}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'studio-http-'));
 const studio=createStudio({dataDir:dir,port:0,...options});await studio.listen();
 const base='http://127.0.0.1:'+studio.server.address().port;
 t.after(async()=>{await studio.close();fs.rmSync(dir,{recursive:true,force:true});});
 const admin=fs.readFileSync(path.join(dir,'access-token'),'utf8').trim();
 const reader=fs.readFileSync(path.join(dir,'read-token'),'utf8').trim();
 const call=(route,options={})=>fetch(base+route,{...options,headers:{Authorization:'Bearer '+admin,...options.headers}});
 return {studio,base,admin,reader,call};
}
test('anonymous business data is denied, security headers applied and bridge disabled',async t=>{
 const {base,call}=await setup(t);
 const unauth=await fetch(base+'/api/state');assert.equal(unauth.status,401);
 const page=await fetch(base+'/');assert.equal(page.status,200);
 assert.ok(page.headers.get('content-security-policy').includes("script-src 'self'"));
 assert.equal(page.headers.get('access-control-allow-origin'),null);
 const bridge=await call('/api/chatgpt-bridge/handshake',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(bridge.status,410);
 assert.equal((await fetch(base+'/api/health')).status,200);
});
test('reader token can read but cannot create/review/probe',async t=>{
 const {base,reader}=await setup(t);
 const headers={Authorization:'Bearer '+reader,'Content-Type':'application/json'};
 assert.equal((await fetch(base+'/api/state',{headers})).status,200);
 for(const route of ['/api/tasks','/api/providers/probe','/api/tasks/fake/review'])assert.equal((await fetch(base+route,{method:'POST',headers,body:'{}'})).status,403);
});
test('same-origin session requires CSRF on writes and rejects forged Origin',async t=>{
 const {base,admin}=await setup(t);
 const login=await fetch(base+'/api/session',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({token:admin})});
 assert.equal(login.status,200);const {csrfToken}=await login.json();
 const cookie=login.headers.get('set-cookie').split(';')[0];
 assert.ok(login.headers.get('set-cookie').includes('HttpOnly'));
 const data={brief:'Kiểm tra hệ thống local',kind:'system_check',input:{}};
 const headers={Cookie:cookie,'Content-Type':'application/json','Idempotency-Key':'csrf-1',Origin:base};
 assert.equal((await fetch(base+'/api/tasks',{method:'POST',headers,body:JSON.stringify(data)})).status,403);
 assert.equal((await fetch(base+'/api/tasks',{method:'POST',headers:{...headers,'X-CSRF-Token':csrfToken},body:JSON.stringify(data)})).status,202);
 assert.equal((await fetch(base+'/api/state',{headers:{Cookie:cookie,Origin:'https://evil.example'}})).status,403);
 assert.equal((await fetch(base+'/api/state',{headers:{Cookie:cookie,Origin:'null'}})).status,403);
});
test('request bounds/types, path traversal and injected input cannot reach a shell or filesystem',async t=>{
 const {call}=await setup(t);
 assert.equal((await call('/api/tasks',{method:'POST',headers:{'Content-Type':'text/plain'},body:'{}'})).status,415);
 assert.equal((await call('/api/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:'{invalid'})).status,400);
 assert.equal((await call('/api/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({brief:'x'.repeat(700000)})})).status,413);
 assert.equal((await call('/api/tasks',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':'injection'},body:JSON.stringify({brief:'$(touch /tmp/pwned) <script>alert(1)</script>',kind:'system_check',input:{path:'/etc/passwd'}})})).status,400);
 assert.equal((await call('/api/file-content?path=/etc/passwd')).status,410);
 assert.equal((await call('/api/artifacts/..%2F..%2Fetc%2Fpasswd')).status,404);
 assert.notEqual((await call('/%2e%2e%2fserver.js')).status,200);
});
test('actual HTTP workflow serves registered artifacts only and cannot auto-approve',async t=>{
 const {call}=await setup(t);
 const response=await call('/api/tasks',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':'http-flow'},body:JSON.stringify({brief:'Tính tổng doanh thu từ CSV đã cung cấp',kind:'data_analysis',input:{csv:'month,revenue\nJan,10\nFeb,25'}})});
 assert.equal(response.status,202);const created=await response.json();
 let task;
 for(let i=0;i<200;i++){task=(await (await call('/api/state')).json()).tasks.find(t=>t.id===created.id);if(task.status==='AWAITING_APPROVAL')break;await new Promise(r=>setTimeout(r,10));}
 assert.equal(task.status,'AWAITING_APPROVAL');
 const source=await call('/api/tasks/'+task.id+'/source');assert.equal(source.status,200);
 const sourceData=await source.json();assert.equal(sourceData.input.csv,'month,revenue\nJan,10\nFeb,25');assert.equal(sourceData.sha256.length,64);
 const history=await call('/api/tasks/'+task.id+'/history');assert.equal(history.status,200);
 const historic=await history.json();assert.ok(historic.events.some(e=>e.type==='TASK_CREATED'));assert.equal(historic.attempts[0].qc.verdict,'PASS');
 const artifact=task.artifacts[0];const file=await call('/api/artifacts/'+artifact.id+'?preview=1');
 assert.equal(file.status,200);assert.ok(file.headers.get('content-type').startsWith('text/plain'));assert.ok((await file.text()).includes('35'));
 assert.equal((await call('/api/tasks/'+task.id+'/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'approve',version:99})})).status,409);
 assert.equal((await call('/api/tasks/'+task.id+'/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'approve',version:1})})).status,200);
 const state=await (await call('/api/state')).json();assert.equal(state.tasks[0].status,'DONE');assert.ok(state.providers.every(p=>p.status!=='CONNECTED'));
});
test('forged Host and cross-site request metadata are rejected',async t=>{
 const {base,admin}=await setup(t);
 const {request}=require('node:http');
 const status=await new Promise((resolve,reject)=>{const req=request(base+'/api/state',{headers:{Host:'rebind.evil.example',Authorization:'Bearer '+admin}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end();});
 assert.equal(status,403);
 assert.equal((await fetch(base+'/api/state',{headers:{Authorization:'Bearer '+admin,'Sec-Fetch-Site':'cross-site'}})).status,403);
 const navigation=await new Promise((resolve,reject)=>{const req=request(base+'/',{headers:{'Sec-Fetch-Site':'cross-site','Sec-Fetch-Mode':'navigate','Sec-Fetch-Dest':'document'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end();});
 assert.equal(navigation,200,'Public login page supports navigation from another application');
});
test('SSE stream is revoked immediately on session logout',async t=>{
 const {base,admin}=await setup(t);
 const login=await fetch(base+'/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:admin})});
 const {csrfToken}=await login.json(),cookie=login.headers.get('set-cookie').split(';')[0];
 const stream=await fetch(base+'/api/events',{headers:{Cookie:cookie}});const reader=stream.body.getReader();
 assert.ok(Buffer.from((await reader.read()).value).toString().includes('event: state'));
 const next=reader.read();
 assert.equal((await fetch(base+'/api/session',{method:'DELETE',headers:{Cookie:cookie,'X-CSRF-Token':csrfToken}})).status,200);
 const ended=await Promise.race([next,new Promise(resolve=>setTimeout(()=>resolve({done:false}),100))]);
 assert.equal(ended.done,true);
 await reader.cancel();
 assert.equal((await fetch(base+'/api/state',{headers:{Cookie:cookie}})).status,401);
});
test('provider-only health change advances persisted snapshot revision (labelled provider double)',async t=>{
 let status='NOT_CONNECTED';const provider={status:()=>({id:'local-ai',status,model:'fixture'}),probe:async()=>{status='CONNECTED';}};
 const {call}=await setup(t,{provider});const before=await (await call('/api/state')).json();
 assert.equal((await call('/api/providers/probe',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,200);
 const after=await (await call('/api/state')).json();assert.ok(after.revision>before.revision);assert.equal(after.providers[0].status,'CONNECTED');
});
