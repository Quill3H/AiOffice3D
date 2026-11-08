'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {Engine}=require('../src/engine'),{Store}=require('../src/store');
const sources=[{id:'s1',title:'Protocol fixture source',url:'https://example.org/source-fixture',text:'The measured value is 42. This is a synthetic test source, not external research.'}];
const plan={steps:[{id:'extract',agentId:'content',title:'Select evidence',dependsOn:[]},{id:'check-context',agentId:'seo',title:'Select contextual evidence',dependsOn:['extract']}]};
const claims={claims:[{sourceId:'s1',quote:'The measured value is 42.'}]};
function provider(overrides={}){
 const calls=[];
 return {calls,status:()=>({id:'local-ai',status:'CONNECTED',model:'protocol-double-not-live'}),generate:async args=>{
   calls.push(args);const text=await (overrides.generate?overrides.generate(args,calls.length):JSON.stringify(args.phase==='manager'?plan:claims));
   return {text,provider:'local-ai',model:'protocol-double-not-live',usage:{total_tokens:10}};
 }};
}
function setup(t,p=provider(),options={}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'studio-sources-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const engine=new Engine({store:new Store(dir),provider:p,...options});t.after(()=>engine.close());return {engine,p,dir};
}
function settled(engine,id){return new Promise((resolve,reject)=>{
 const timer=setTimeout(()=>{engine.off('change',check);reject(new Error('Task did not settle'));},5000);
 function check(){const task=engine.get(id);if(!['QUEUED','RUNNING'].includes(task.status)){clearTimeout(timer);engine.off('change',check);resolve(task);}}
 engine.on('change',check);check();
});}
const payload=()=>({kind:'sourced_brief',brief:'Create a source-backed extractive brief for CEO review',input:{sources:structuredClone(sources)}});

test('model manager and specialists hand off to independent QC then wait for explicit CEO approval',async t=>{
 const {engine,p}=setup(t);const created=engine.create(payload(),'source-flow'),task=await settled(engine,created.id);
 assert.equal(task.status,'AWAITING_APPROVAL',task.error);assert.equal(task.approval,null);assert.equal(p.calls.length,3);
 assert.deepEqual(p.calls.map(c=>c.phase),['manager','specialist:extract','specialist:check-context']);
 assert.equal(JSON.parse(p.calls[2].context).previous.stepId,'extract');
 assert.equal(task.attempts[0].plan.steps[1].dependsOn[0],'extract');assert.equal(task.attempts[0].handoffs.length,2);
 assert.ok(task.steps.every(s=>s.status==='DONE'));assert.equal(task.steps[0].agentId,'manager');
 assert.equal(task.qc.checks.find(c=>c.dimension==='grounding').status,'PASS');
 assert.equal(task.qc.checks.find(c=>c.dimension==='factuality').status,'UNVERIFIED');
 assert.deepEqual(task.artifacts.map(a=>a.name),['plan.json','brief.json','report.md']);
 assert.throws(()=>engine.review(task.id,{action:'approve',version:9}),/stale/i);
 assert.equal(engine.review(task.id,{action:'approve',version:1}).status,'DONE');
});
test('duplicate task and retry keys never repeat inference; revision preserves prior artifacts',async t=>{
 const {engine,p}=setup(t);const created=engine.create(payload(),'source-idempotency');
 assert.equal(engine.create(payload(),'source-idempotency').id,created.id);
 let task=await settled(engine,created.id);assert.equal(p.calls.length,3);const old=task.artifacts.map(a=>({...a,bytes:engine.readArtifact(a.id).content.toString()}));
 engine.review(task.id,{action:'revise',version:1,comment:'Select the same evidence with clearer context.'});engine.retry(task.id,'source-retry');engine.retry(task.id,'source-retry');
 task=await settled(engine,task.id);assert.equal(task.version,2);assert.equal(task.status,'AWAITING_APPROVAL',task.error);assert.equal(p.calls.length,6);
 assert.ok(p.calls[3].brief.includes('clearer context'));assert.equal(task.artifacts.length,6);
 for(const artifact of old)assert.equal(engine.readArtifact(artifact.id).content.toString(),artifact.bytes);
});
test('malformed, cyclic and executable manager plans stop before any specialist call',async t=>{
 for(const invalid of [{steps:[{id:'a',agentId:'content',title:'Cycle',dependsOn:['a']}]},{steps:[{id:'a',agentId:'content',title:'Run code',dependsOn:[],command:'rm -rf /'}]},{steps:[{id:'a',agentId:'qc',title:'Self approve',dependsOn:[]}]}]){
   const p=provider({generate:()=>JSON.stringify(invalid)}),{engine}=setup(t,p);const task=await settled(engine,engine.create(payload(),'invalid-plan').id);
   assert.equal(task.status,'FAILED');assert.equal(p.calls.length,1);assert.equal(task.artifacts.length,0);
 }
});
test('fabricated quote and fabricated citation are both independently rejected',async t=>{
 for(const bad of [{sourceId:'s1',quote:'The measured value is 99.'},{sourceId:'nonexistent',quote:'The measured value is 42.'}]){
   const p=provider({generate:args=>JSON.stringify(args.phase==='manager'?plan:{claims:[bad]})}),{engine}=setup(t,p);
   const task=await settled(engine,engine.create(payload(),'fabricated').id);
   assert.equal(task.status,'NEEDS_REVISION',task.error);assert.equal(task.qc.checks.find(c=>c.dimension==='grounding').status,'FAIL');
   assert.throws(()=>engine.review(task.id,{action:'approve',version:1}),/awaiting/i);
 }
});
test('source and encoded-context limits reject before queuing or generation',t=>{
 const {engine,p}=setup(t);
 for(const bad of [[],[sources[0],sources[0]],[{...sources[0],url:'http://example.org'}],[{...sources[0],url:'https://user:secret@example.org'}],[{...sources[0],text:'x'.repeat(20001)}]]){
   assert.throws(()=>engine.create({...payload(),input:{sources:bad}},'bad-source'),/source|https|size|byte|unique/i);
 }
 assert.equal(engine.store.count(),0);assert.equal(p.calls.length,0);
});
test('CEO cancellation during planning makes zero specialist calls and persists cancellation',async t=>{
 let started;const entered=new Promise(resolve=>{started=resolve;});
 const p=provider({generate:args=>new Promise((_,reject)=>{started();args.signal.addEventListener('abort',()=>reject(args.signal.reason),{once:true});})}),{engine}=setup(t,p);
 const task=engine.create(payload(),'cancel-plan');await entered;engine.cancel(task.id);await engine.active.get(task.id).promise;
 assert.equal(engine.get(task.id).status,'CANCELLED');assert.equal(p.calls.length,1);assert.equal(engine.get(task.id).artifacts.length,0);
});
test('manager checkpoint is durable before the first specialist starts',async t=>{
 let specialistStarted,release;const entered=new Promise(resolve=>{specialistStarted=resolve;});
 const p=provider({generate:args=>args.phase==='manager'?JSON.stringify(plan):new Promise(resolve=>{specialistStarted();release=()=>resolve(JSON.stringify(claims));})}),{engine,dir}=setup(t,p);
 const task=engine.create(payload(),'checkpoint');await entered;
 const {DatabaseSync}=require('node:sqlite'),db=new DatabaseSync(path.join(dir,'studio.sqlite'));
 const stored=JSON.parse(db.prepare('SELECT body FROM tasks WHERE id=?').get(task.id).body);db.close();
 assert.deepEqual(stored.attempts[0].plan.steps,plan.steps);assert.equal(stored.steps[0].status,'DONE');
 engine.cancel(task.id);release();await engine.active.get(task.id).promise;
});
test('deterministic source QC detects a tampered report independently of producer evidence',async t=>{
 const {engine}=setup(t);const task=await settled(engine,engine.create(payload(),'tamper-qc').id);
 const files=task.artifacts.map(a=>({...a,content:engine.readArtifact(a.id).content.toString()}));
 files.find(f=>f.name==='report.md').content+='Invented conclusion.';
 const {audit}=require('../src/qc');const verdict=await audit({kind:'sourced_brief',brief:task.brief,input:{sources},files,evidence:task.attempts[0].evidence,mode:'AI_PROVIDER'});
 assert.equal(verdict.verdict,'NEEDS_REVISION');assert.equal(verdict.checks.find(c=>c.dimension==='content').status,'FAIL');
});
test('gateway records separate manager and specialist phases in a real engine run using cloud protocol double',async t=>{
 const {CloudProvider,ProviderGateway}=require('../src/gateway');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'studio-source-gateway-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const store=new Store(dir);
 const cloud=new CloudProvider({id:'muse',baseUrl:'https://api.meta.ai/v1',model:'protocol-double-not-live',apiKey:'fixture-secret',fetchImpl:async(url,options)=>{
   if(url.endsWith('/models'))return new Response(JSON.stringify({data:[{id:'protocol-double-not-live'}]}));
   const request=JSON.parse(options.body),isManager=request.messages[1].content.includes('MANAGER_PLAN:');
   return new Response(JSON.stringify({model:'protocol-double-not-live',choices:[{finish_reason:'stop',message:{content:JSON.stringify(isManager?plan:claims)}}]}));
 }});
 await cloud.probe();
 const gateway=new ProviderGateway({store,providers:[cloud],remoteCallLimit:3,freeQuota:{muse:{model:'protocol-double-not-live',evidenceUrl:'https://example.org/fixture-only',expiresAt:'2099-01-01'}}});
 const engine=new Engine({store,provider:gateway});t.after(()=>engine.close());
 const task=await settled(engine,engine.create({...payload(),providerId:'muse'},'source-cloud-fixture').id);
 assert.equal(task.status,'AWAITING_APPROVAL',task.error);
 assert.deepEqual(store.providerCalls().map(c=>c.phase),['manager','specialist:extract','specialist:check-context']);
 assert.ok(store.providerCalls().every(c=>c.status==='SUCCEEDED'));assert.equal(gateway.budget().remaining,0);
});
test('queued source task resumes once after startup and uses the same CEO gate',async t=>{
 const {engine,p,dir}=setup(t,provider(),{autoStart:false});const created=engine.create(payload(),'source-queued');
 await engine.close();assert.equal(p.calls.length,0);
 const restarted=new Engine({store:new Store(dir),provider:p});t.after(()=>restarted.close());
 const task=await settled(restarted,created.id);assert.equal(task.status,'AWAITING_APPROVAL',task.error);assert.equal(task.attempts.length,1);assert.equal(p.calls.length,3);
});
test('source planning deadline aborts bounded work without a handoff or approval',async t=>{
 const p=provider({generate:args=>new Promise((_,reject)=>args.signal.addEventListener('abort',()=>reject(args.signal.reason),{once:true}))});
 const {engine}=setup(t,p,{timeoutMs:10});const task=await settled(engine,engine.create(payload(),'source-deadline').id);
 assert.equal(task.status,'FAILED');assert.match(task.error,/timeout/i);assert.equal(p.calls.length,1);assert.equal(task.artifacts.length,0);assert.equal(task.approval,null);
});
