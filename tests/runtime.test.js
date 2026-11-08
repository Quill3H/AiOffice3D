const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Store } = require('../src/store');
const { Engine } = require('../src/engine');

const csv = 'product,revenue,cost\nA,120,50\nB,80,30\nC,100,40\n';
const brief = 'Phân tích tổng doanh thu và chi phí từ dữ liệu đã cung cấp';
function setup(t, options = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-runtime-'));
  const store = new Store(dir);
  const engine = new Engine({store, ...options});
  t.after(async () => { await engine.close(); fs.rmSync(dir,{recursive:true,force:true}); });
  return {dir,store,engine};
}
async function settled(engine, id) {
  for (let i=0;i<500;i++) {
    const task = engine.get(id);
    if (!['QUEUED','RUNNING'].includes(task.status)) return task;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error('Task did not settle');
}
test('real CSV tool → independent QC → explicit CEO approval with durable artifacts', async t => {
  const {engine} = setup(t);
  const created = engine.create({brief,kind:'data_analysis',input:{csv}}, 'create-1');
  const task = await settled(engine, created.id);
  assert.equal(task.status, 'AWAITING_APPROVAL');
  assert.equal(task.qc.verdict,'PASS');
  assert.equal(task.attempts[0].mode, 'DETERMINISTIC_TOOL');
  assert.equal(task.steps.every(s=>s.status==='DONE'),true);
  assert.ok(task.steps.some(s=>s.agentId==='finance'));
  assert.ok(task.steps.some(s=>s.agentId==='qc'));
  const report = engine.readArtifact(task.artifacts.find(a=>a.name==='analysis.json').id);
  assert.ok(report.content.toString().includes('300'));
  assert.ok(task.artifacts.every(a=>a.sha256.length===64));
  assert.equal(engine.review(task.id,{action:'approve',version:task.version}).status,'DONE');
  assert.ok(engine.get(task.id).approval.at);
});
test('missing input is BLOCKED and malformed CSV never DONE', async t => {
  const {engine} = setup(t);
  const missing = engine.create({brief,kind:'data_analysis',input:{}},'missing');
  assert.equal(missing.status,'BLOCKED');
  const bad = engine.create({brief,kind:'data_analysis',input:{csv:'a,b\n1,2,3'}},'bad');
  assert.equal((await settled(engine,bad.id)).status,'FAILED');
  assert.throws(()=>engine.review(bad.id,{action:'approve',version:1}));
});
test('idempotency is persistent, concurrent duplicate dispatch returns one task and changed body conflicts', async t=>{
  const {engine} = setup(t);
  const data = {brief,kind:'data_analysis',input:{csv}};
  const a=engine.create(data,'same'); const b=engine.create(data,'same');
  assert.equal(a.id,b.id);
  assert.throws(()=>engine.create({...data,brief:'different request'},'same'),/idempotency/i);
  await settled(engine,a.id);
  assert.equal(engine.get(a.id).attempts.length,1);
});
test('revision retains artifacts and new acceptance is bound to latest version', async t=>{
  const {engine} = setup(t);
  let task=await settled(engine,engine.create({brief,kind:'data_analysis',input:{csv}},'rev-create').id);
  const oldId=task.artifacts[0].id;
  assert.throws(()=>engine.review(task.id,{action:'revise',version:1,comment:''}));
  engine.review(task.id,{action:'revise',version:1,comment:'Đối chiếu lại toàn bộ số liệu trước khi gửi'});
  engine.retry(task.id,'rev-retry');
  engine.retry(task.id,'rev-retry');
  task=await settled(engine,task.id);
  assert.equal(task.version,2);
  assert.equal(task.attempts.length,2);
  assert.equal(task.attempts[0].qc.verdict,'PASS');
  assert.equal(task.attempts[1].qc.verdict,'PASS');
  assert.ok(engine.readArtifact(oldId).content.length);
  assert.equal(task.artifacts.length,4);
  assert.throws(()=>engine.review(task.id,{action:'approve',version:1}),/version/i);
  assert.equal(engine.review(task.id,{action:'approve',version:2}).status,'DONE');
});
test('approval rechecks missing/tampered artifact and never bypasses QC', async t=>{
  const {engine,dir} = setup(t);
  const task=await settled(engine,engine.create({brief,kind:'data_analysis',input:{csv}},'tamper').id);
  const artifact=engine.store.artifact(task.artifacts[0].id);
  fs.writeFileSync(path.join(dir,artifact.relativePath),'tampered');
  assert.throws(()=>engine.review(task.id,{action:'approve',version:1}),/integrity/i);
  assert.notEqual(engine.get(task.id).status,'DONE');
  assert.throws(()=>engine.readArtifact(artifact.id),/integrity/i);
});
test('registered artifact symlink cannot read outside workspace',async t=>{
  const {engine,dir} = setup(t);
  const task=await settled(engine,engine.create({brief,kind:'data_analysis',input:{csv}},'symlink').id);
  const artifact=engine.store.artifact(task.artifacts[0].id);
  const file=path.join(dir,artifact.relativePath);
  fs.unlinkSync(file); fs.symlinkSync('/etc/hosts',file);
  assert.throws(()=>engine.readArtifact(artifact.id),/scope|integrity/i);
  assert.throws(()=>engine.readArtifact('../../etc/hosts'),/found/i);
});
test('durable state and approvals survive store close/reopen, second writer rejected',async t=>{
  const {engine,dir} = setup(t);
  let task=await settled(engine,engine.create({brief,kind:'data_analysis',input:{csv}},'persist').id);
  engine.review(task.id,{action:'approve',version:1});
  assert.throws(()=>new Store(dir),/already|lock/i);
  await engine.close();
  const store2=new Store(dir); const engine2=new Engine({store:store2});
  t.after(()=>engine2.close());
  assert.equal(engine2.get(task.id).status,'DONE');
  assert.ok(store2.events(task.id).some(e=>e.type==='APPROVED'));
  assert.ok(engine2.readArtifact(task.artifacts[0].id).content.length);
  assert.equal(engine2.create({brief,kind:'data_analysis',input:{csv}},'persist').id,task.id);
});
test('concurrent different tasks keep unique outputs and bound active workers',async t=>{
  const {engine} = setup(t,{concurrency:2});
  const created=Array.from({length:5},(_,i)=>engine.create({brief,kind:'data_analysis',input:{csv}},'parallel-'+i));
  const tasks=await Promise.all(created.map(x=>settled(engine,x.id)));
  assert.equal(tasks.every(x=>x.status==='AWAITING_APPROVAL'),true);
  assert.equal(new Set(tasks.flatMap(x=>x.artifacts.map(a=>a.id))).size,10);
  assert.ok(engine.maxObservedActive<=2);
});
test('cancellation and timeout prevent late success (labelled executor test double)',async t=>{
  const waitTool=()=>new Promise(r=>setTimeout(()=>r({files:[{name:'report.md',mime:'text/markdown',content:'# Late result'}],evidence:{},mode:'TEST_DOUBLE'}),100));
  const {engine} = setup(t,{execute:waitTool,timeoutMs:20});
  const a=engine.create({brief:'Check local runtime',kind:'system_check',input:{}},'cancel');
  await new Promise(r=>setTimeout(r,5));
  engine.cancel(a.id);
  const b=engine.create({brief:'Check local runtime',kind:'system_check',input:{}},'timeout');
  assert.equal((await settled(engine,b.id)).status,'FAILED');
  await new Promise(r=>setTimeout(r,120));
  assert.equal(engine.get(a.id).status,'CANCELLED');
  assert.equal(engine.get(b.id).status,'FAILED');
  assert.equal(engine.get(a.id).artifacts.length,0);
});
test('recovery marks interrupted attempts honestly and retry preserves audit history', async t=>{
  const {engine,store,dir}=setup(t,{autoStart:false});
  let task=store.get(engine.create({brief,kind:'data_analysis',input:{csv}},'recovery').id);
  task.status='RUNNING';task.attempts=[{id:'prior',number:1,status:'RUNNING',startedAt:new Date().toISOString()}];task.version=1;
  store.save(task,{type:'ATTEMPT_STARTED',message:'Simulated crash state fixture',taskId:task.id});
  await engine.close();
  const engine2=new Engine({store:new Store(dir)});t.after(()=>engine2.close());
  assert.equal(engine2.get(task.id).status,'INTERRUPTED');
  assert.equal(engine2.get(task.id).attempts[0].status,'INTERRUPTED');
  task=await settled(engine2,engine2.retry(task.id,'recovery-retry').id);
  assert.equal(task.version,2);assert.equal(task.status,'AWAITING_APPROVAL');
});
test('unsupported providers and unsafe object inputs are rejected without execution',async t=>{
  const {engine}=setup(t);
  assert.equal(engine.create({brief:'Write a new launch copy',kind:'ai_draft',input:{context:'Product facts'}},'no-provider').status,'BLOCKED');
  assert.throws(()=>engine.create({brief,kind:'data_analysis',input:{csv},command:'rm -rf /'},'cmd'));
  assert.throws(()=>engine.create({brief,kind:'system_check',input:{path:'/etc/passwd'}},'path'));
  assert.throws(()=>engine.create({brief,kind:'unknown',input:{}},'unknown'));
});
test('shutdown marks active attempt INTERRUPTED and preserves it for explicit retry',async t=>{
 const {engine,dir}=setup(t,{execute:()=>new Promise(()=>{}),timeoutMs:10000});
 const created=engine.create({brief:'Kiểm tra hệ thống local',kind:'system_check',input:{}},'shutdown');
 await new Promise(r=>setTimeout(r,5));await engine.close();
 const next=new Engine({store:new Store(dir)});t.after(()=>next.close());
 assert.equal(next.get(created.id).status,'INTERRUPTED');
 assert.equal(next.get(created.id).attempts[0].status,'INTERRUPTED');
});
test('independent QC rejection blocks approval (labelled inspector test double)',async t=>{
 const {engine}=setup(t,{inspect:async()=>({verdict:'NEEDS_REVISION',checks:[{dimension:'data',status:'FAIL',detail:'Mismatch fixture'}],defects:['Mismatch fixture'],limitations:[],requiresApproval:true})});
 const task=await settled(engine,engine.create({brief,kind:'data_analysis',input:{csv}},'qc-reject').id);
 assert.equal(task.status,'NEEDS_REVISION');assert.equal(task.attempts[0].status,'QC_REJECTED');
 assert.throws(()=>engine.review(task.id,{action:'approve',version:1}));
});
test('SQLite scheduler ownership still rejects second writer if stale lock file was replaced',t=>{
 const {store,dir}=setup(t);fs.writeFileSync(path.join(dir,'runtime.lock'),JSON.stringify({pid:2147483647,id:'stale-fixture'}));
 let second;try{assert.throws(()=>{second=new Store(dir);},/locked|already/i);}finally{second?.close();}
 assert.ok(store.tasks());
});
test('queue and workspace limits reject excess work without duplicate loss',async t=>{
 const {engine}=setup(t,{autoStart:false,maxQueued:1,maxTasks:2});
 const payload={brief,kind:'data_analysis',input:{csv}};
 const one=engine.create(payload,'limit-1');
 assert.equal(engine.create(payload,'limit-1').id,one.id);
 assert.throws(()=>engine.create(payload,'limit-2'),/queue|limit/i);
 engine.cancel(one.id);
 engine.create(payload,'limit-3');
 assert.throws(()=>engine.create(payload,'limit-4'),/workspace|limit/i);
});
test('existing workspace permissions are private and database/sidecar symlinks are rejected',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'studio-permission-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 fs.chmodSync(dir,0o755);const store=new Store(dir);t.after(()=>store.close());
 assert.equal(fs.statSync(dir).mode&0o777,0o700);
 for(const name of ['studio.sqlite','studio.sqlite-wal','studio.sqlite-shm'])if(fs.existsSync(path.join(dir,name)))assert.equal(fs.statSync(path.join(dir,name)).mode&0o077,0);
 store.close();fs.unlinkSync(path.join(dir,'studio.sqlite'));
 fs.symlinkSync('/etc/hosts',path.join(dir,'studio.sqlite'));assert.throws(()=>new Store(dir),/symlink/i);
 fs.unlinkSync(path.join(dir,'studio.sqlite'));
 fs.symlinkSync('/etc/hosts',path.join(dir,'studio.sqlite-wal'));assert.throws(()=>new Store(dir),/symlink/i);
});
test('near-limit malformed HTML remains cancellable without blocking the event loop',async t=>{
 const {engine}=setup(t,{timeoutMs:30});
 const created=engine.create({brief:'Kiểm tra HTML đầu vào lỗi lớn trong worker',kind:'html_audit',input:{html:'<script>'.repeat(50000)}},'html-cpu');
 let timerFired=false;setTimeout(()=>{timerFired=true;},5);
 const start=Date.now(), task=await settled(engine,created.id);
 assert.equal(timerFired,true);assert.equal(task.status,'FAILED');assert.match(task.error,/timeout/);
 assert.ok(Date.now()-start<2000,'Main loop must stay responsive to the 30ms execution deadline');
});
test('artifact publication refuses a symlinked root before writing outside workspace',async t=>{
 const {engine,dir}=setup(t);const outside=fs.mkdtempSync(path.join(os.tmpdir(),'studio-outside-'));t.after(()=>fs.rmSync(outside,{recursive:true,force:true}));
 fs.symlinkSync(outside,path.join(dir,'artifacts'));
 const task=await settled(engine,engine.create({brief,kind:'data_analysis',input:{csv}},'outside-write').id);
 assert.equal(task.status,'FAILED');assert.deepEqual(fs.readdirSync(outside),[]);
});
test('snapshot revisions order task events so slow polling cannot overwrite newer SSE state',async t=>{
 const {engine}=setup(t);const before=engine.snapshot().revision;
 const task=await settled(engine,engine.create({brief,kind:'data_analysis',input:{csv}},'revision-order').id);
 const after=engine.snapshot().revision;assert.ok(Number.isSafeInteger(after)&&after>before);
 engine.review(task.id,{action:'approve',version:1});assert.ok(engine.snapshot().revision>after);
});
test('artifact quota reserves failed-attempt space before any output write',async t=>{
 const {engine,dir}=setup(t,{maxArtifactBytes:10});
 const task=await settled(engine,engine.create({brief,kind:'data_analysis',input:{csv}},'quota').id);
 assert.equal(task.status,'FAILED');assert.match(task.error,/storage limit/);
 assert.equal(task.artifacts.length,0);
 const attempt=task.attempts[0];const folder=path.join(dir,'artifacts',task.id,attempt.id);
 assert.deepEqual(fs.existsSync(folder)?fs.readdirSync(folder):[],[]);
});
test('missing output file prevents download and acceptance',async t=>{
 const {engine,dir}=setup(t);
 const task=await settled(engine,engine.create({brief,kind:'data_analysis',input:{csv}},'missing-file').id);
 const artifact=engine.store.artifact(task.artifacts[0].id);fs.unlinkSync(path.join(dir,artifact.relativePath));
 assert.throws(()=>engine.readArtifact(artifact.id),/integrity.*missing/i);
 assert.throws(()=>engine.review(task.id,{action:'approve',version:1}),/integrity.*missing/i);
 assert.equal(engine.get(task.id).status,'AWAITING_APPROVAL');
});
