const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {fork}=require('node:child_process');
const {once}=require('node:events');
const {Store}=require('../src/store');
const {Engine}=require('../src/engine');
test('real SIGKILL process crash recovers SQLite and retries same task without overwriting artifacts',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'studio-crash-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const child=fork(path.join(__dirname,'fixtures','crash-child.cjs'),[],{env:{...process.env,STUDIO_CRASH_DIR:dir},execArgv:[],stdio:['ignore','ignore','pipe','ipc']});
 t.after(()=>{if(child.exitCode===null)child.kill('SIGKILL');});
 const [message]=await once(child,'message');assert.equal(message.status,'RUNNING');
 const exit=once(child,'exit');child.kill('SIGKILL');await exit;
 const engine=new Engine({store:new Store(dir)});t.after(()=>engine.close());
 assert.equal(engine.get(message.id).status,'INTERRUPTED');
 assert.equal(engine.get(message.id).attempts[0].status,'INTERRUPTED');
 engine.retry(message.id,'recover-real');
 let task;
 for(let i=0;i<500;i++){task=engine.get(message.id);if(task.status==='AWAITING_APPROVAL')break;await new Promise(r=>setTimeout(r,10));}
 assert.equal(task.status,'AWAITING_APPROVAL');assert.equal(task.version,2);assert.equal(task.attempts.length,2);
 assert.ok(task.artifacts.every(a=>a.version===2));
 assert.equal(engine.review(message.id,{action:'approve',version:2}).status,'DONE');
 await engine.close();
 const final=new Engine({store:new Store(dir)});t.after(()=>final.close());
 assert.equal(final.get(message.id).status,'DONE');assert.ok(final.readArtifact(task.artifacts[0].id).content.length);
});
