'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {Store}=require('../src/store');
const {CloudProvider,ProviderGateway}=require('../src/gateway');
const {createGateway}=require('../src/gateway-config');
function workspace(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'studio-gateway-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;}
const call={taskId:'task-fixture',attemptId:'attempt-fixture',phase:'manager'};
const quota={model:'fixture-model',evidenceUrl:'https://example.org/free-quota-fixture',expiresAt:'2099-01-01T00:00:00Z'};
const freeQuota={muse:quota,kimi:quota};
// All fetch functions in this file are protocol doubles. No live API is called.
function adapter(id='muse',fetchImpl){return new CloudProvider({id,baseUrl:id==='muse'?'https://api.meta.ai/v1':'https://api.moonshot.ai/v1',model:'fixture-model',apiKey:'fixture-secret',fetchImpl:fetchImpl||(async url=>new Response(JSON.stringify(url.endsWith('/models')?{data:[{id:'fixture-model'}]}:{model:'fixture-model',choices:[{message:{content:'Fixture output'},finish_reason:'stop'}],usage:{total_tokens:12}})))});}
async function ready(...providers){await Promise.all(providers.map(p=>p.probe()));return providers;}
const args={brief:'Valid brief',context:'Source evidence',call};

test('cloud configuration rejects arbitrary endpoints and does not expose keys',async()=>{
 assert.throws(()=>new CloudProvider({id:'muse',baseUrl:'https://evil.example/v1',model:'x',apiKey:'secret'}),/endpoint/i);
 assert.throws(()=>new CloudProvider({id:'kimi',baseUrl:'https://api.meta.ai/v1',model:'x',apiKey:'secret'}),/endpoint/i);
 const p=adapter();assert.equal(p.status().status,'NOT_CONNECTED');await p.probe();assert.equal(p.status().status,'CONNECTED');
 assert.ok(!JSON.stringify(p.status()).includes('fixture-secret'));
});
test('unconfigured defaults never imply access or free quota',t=>{
 const store=new Store(workspace(t));t.after(()=>store.close());const gateway=createGateway(store,{});
 assert.equal(gateway.status().status,'NOT_CONFIGURED');assert.equal(gateway.budget().limit,0);
 assert.ok(gateway.statuses().some(p=>p.id==='muse'&&p.status==='NOT_CONFIGURED'));
});
test('advertised model does not bypass disabled generation budget',async t=>{
 const store=new Store(workspace(t));t.after(()=>store.close());const [p]=await ready(adapter());const gateway=new ProviderGateway({store,providers:[p]});
 await assert.rejects(()=>gateway.generate(args),/budget|quota/i);assert.equal(store.providerCalls().length,0);
});
test('cloud calls require expiring free-quota evidence as well as a call cap',async t=>{
 const store=new Store(workspace(t));t.after(()=>store.close());const [p]=await ready(adapter());
 const gateway=new ProviderGateway({store,providers:[p],remoteCallLimit:2});
 await assert.rejects(()=>gateway.generate(args),/quota/i);
 const expired=new ProviderGateway({store,providers:[p],remoteCallLimit:2,freeQuota:{muse:{...quota,expiresAt:'2000-01-01T00:00:00Z'}}});
 await assert.rejects(()=>expired.generate(args),/quota/i);
});
test('quota reservation and exact call identity survive restart',async t=>{
 const dir=workspace(t);let store=new Store(dir);const [p]=await ready(adapter());
 let gateway=new ProviderGateway({store,providers:[p],remoteCallLimit:1,freeQuota});
 const result=await gateway.generate(args);assert.equal(result.provider,'muse');assert.equal(result.usage.total_tokens,12);
 assert.equal(store.providerCalls()[0].status,'SUCCEEDED');store.close();store=new Store(dir);t.after(()=>store.close());
 gateway=new ProviderGateway({store,providers:[p],remoteCallLimit:1,freeQuota});
 await assert.rejects(()=>gateway.generate({...args,call:{...call,phase:'specialist'}}),/budget/i);
 assert.equal(store.providerCalls().length,1);
});
test('restart retains an ambiguous reservation and refuses duplicate dispatch',async t=>{
 const dir=workspace(t);let store=new Store(dir);
 store.reserveProviderCall({...call,providerId:'muse',model:'fixture-model'},3);store.close();store=new Store(dir);t.after(()=>store.close());
 assert.equal(store.providerCalls()[0].status,'UNKNOWN');
 const [p]=await ready(adapter());const gateway=new ProviderGateway({store,providers:[p],remoteCallLimit:3,freeQuota});
 await assert.rejects(()=>gateway.generate(args),/already|duplicate/i);assert.equal(store.providerCalls().length,1);
});
test('outage falls back once per route, conserving each attempted cloud call',async t=>{
 const store=new Store(workspace(t));t.after(()=>store.close());let broken=0;
 const first=adapter('muse',async url=>{if(url.endsWith('/models'))return new Response(JSON.stringify({data:[{id:'fixture-model'}]}));broken++;return new Response('secret provider body',{status:503});});
 const providers=await ready(first,adapter('kimi'));const gateway=new ProviderGateway({store,providers,remoteCallLimit:2,freeQuota});
 const result=await gateway.generate(args);assert.equal(result.provider,'kimi');assert.equal(broken,1);
 assert.deepEqual(store.providerCalls().map(c=>c.status),['FAILED','SUCCEEDED']);
});
test('caller cancellation never falls back and leaves healthy probe intact',async t=>{
 const store=new Store(workspace(t));t.after(()=>store.close());let fallback=0;
 const first=adapter('muse',async(url,{signal})=>{if(url.endsWith('/models'))return new Response(JSON.stringify({data:[{id:'fixture-model'}]}));return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));});
 const second=adapter('kimi',async()=>{fallback++;return new Response(JSON.stringify({data:[{id:'fixture-model'}]}));});
 await ready(first,second);fallback=0;const gateway=new ProviderGateway({store,providers:[first,second],remoteCallLimit:2,freeQuota});
 const controller=new AbortController(),pending=gateway.generate({...args,signal:controller.signal});controller.abort(new Error('CEO cancelled'));
 await assert.rejects(pending,/CEO cancelled/);assert.equal(fallback,0);assert.equal(first.status().status,'CONNECTED');
 assert.equal(store.providerCalls().length,1);
});
test('malformed successful response never silently falls back',async t=>{
 const store=new Store(workspace(t));t.after(()=>store.close());
 const first=adapter('muse',async url=>new Response(JSON.stringify(url.endsWith('/models')?{data:[{id:'fixture-model'}]}:{model:'other',choices:[{message:{content:'Wrong attribution'},finish_reason:'stop'}]})));
 const providers=await ready(first,adapter('kimi'));const gateway=new ProviderGateway({store,providers,remoteCallLimit:2,freeQuota});
 await assert.rejects(()=>gateway.generate(args),/model|protocol/i);assert.equal(store.providerCalls().length,1);
});
test('concurrent cloud calls cannot exceed the persisted dispatch cap',async t=>{
 const store=new Store(workspace(t));t.after(()=>store.close());const providers=await ready(adapter());
 const gateway=new ProviderGateway({store,providers,remoteCallLimit:1,freeQuota});
 const results=await Promise.allSettled([1,2,3].map(n=>gateway.generate({...args,call:{...call,phase:'phase-'+n}})));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(store.providerCalls().length,1);
});
test('timeout has bounded dispatch and sanitizes network errors',async t=>{
 const store=new Store(workspace(t));t.after(()=>store.close());
 const first=adapter('muse',async url=>{if(url.endsWith('/models'))return new Response(JSON.stringify({data:[{id:'fixture-model'}]}));throw Object.assign(new Error('fixture-secret leaked network details'),{name:'TimeoutError'});});
 await ready(first);const gateway=new ProviderGateway({store,providers:[first],remoteCallLimit:1,freeQuota});
 await assert.rejects(()=>gateway.generate(args),error=>!error.message.includes('fixture-secret'));
 assert.ok(!JSON.stringify(first.status()).includes('fixture-secret'));assert.equal(store.providerCalls()[0].status,'FAILED');
});

test('engine routes an explicitly selected configured provider and exposes all health states',async t=>{
 const {Engine}=require('../src/engine');
 const store=new Store(workspace(t));const providers=await ready(adapter('muse'),adapter('kimi'));
 const gateway=new ProviderGateway({store,providers,remoteCallLimit:1,freeQuota});
 const engine=new Engine({store,provider:gateway,autoStart:false});t.after(()=>engine.close());
 const task=engine.create({kind:'ai_draft',providerId:'kimi',brief:'Write a fixture draft',input:{context:'Submitted context'}},'gateway-engine');
 assert.equal(task.status,'QUEUED');assert.equal(engine.snapshot().providers.filter(p=>['muse','kimi'].includes(p.id)).length,2);
 engine.autoStart=true;const finished=new Promise(resolve=>{const check=()=>{const task=engine.get(engine.store.tasks()[0].id);if(!['QUEUED','RUNNING'].includes(task.status)){engine.off('change',check);resolve(task);}};engine.on('change',check);});engine.schedule();
 const done=await finished;assert.equal(done.status,'AWAITING_APPROVAL',done.error);
 assert.equal(done.attempts[0].provider,'kimi');assert.equal(store.providerCalls()[0].provider_id,'kimi');
});
test('cloud timeout uses an actual abort deadline without fallback loops',async t=>{
 const p=new CloudProvider({id:'muse',baseUrl:'https://api.meta.ai/v1',model:'fixture-model',apiKey:'fixture-secret',timeoutMs:10,fetchImpl:async(url,{signal})=>{
   if(url.endsWith('/models'))return new Response(JSON.stringify({data:[{id:'fixture-model'}]}));
   return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));
 }});
 await p.probe();
 const keepAlive=setTimeout(()=>{},1000);try{await assert.rejects(()=>p.generate(args),/timeout/i);}finally{clearTimeout(keepAlive);}
 assert.equal(p.status().status,'NOT_CONNECTED');
});
test('cloud protocol rejects truncation, tool calls, missing model, invalid JSON and oversized bodies',async()=>{
 const responses=[
   {model:'fixture-model',choices:[{message:{content:'Incomplete'},finish_reason:'length'}]},
   {model:'fixture-model',choices:[{message:{content:'Execute'},finish_reason:'tool_calls'}]},
   {choices:[{message:{content:'Unattributed'},finish_reason:'stop'}]},
   'not JSON',
   'x'.repeat(1024*1024+1)
 ];
 for(const response of responses){
   const p=adapter('muse',async url=>new Response(url.endsWith('/models')?JSON.stringify({data:[{id:'fixture-model'}]}):typeof response==='string'?response:JSON.stringify(response)));
   await p.probe();await assert.rejects(()=>p.generate(args),/protocol|model/i);
 }
});
test('missing API credential never attempts a model probe',async()=>{
 let requests=0;const p=new CloudProvider({id:'muse',baseUrl:'https://api.meta.ai/v1',model:'fixture-model',fetchImpl:async()=>{requests++;throw Error('Must not dispatch');}});
 assert.equal((await p.probe()).status,'NOT_CONFIGURED');assert.equal(requests,0);
});
