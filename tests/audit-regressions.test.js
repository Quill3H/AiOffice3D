'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const http=require('node:http');
const {DatabaseSync}=require('node:sqlite');
const {Store}=require('../src/store');
const {createStudio}=require('../src/http');
const {Engine}=require('../src/engine');
const {LocalProvider}=require('../src/providers');
const {executeTool}=require('../src/tools');
const {audit}=require('../src/qc');
function temp(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'studio-audit-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;}

test('startup refuses a future database schema without downgrading it',t=>{
 const dir=temp(t);new Store(dir).close();
 const file=path.join(dir,'studio.sqlite');let db=new DatabaseSync(file);db.exec('PRAGMA user_version=99');db.close();
 let opened;
 try{assert.throws(()=>{opened=new Store(dir);},/schema|version|newer/i);}finally{opened?.close();}
 db=new DatabaseSync(file);assert.equal(db.prepare('PRAGMA user_version').get().user_version,99);db.close();
});

test('parallel login requests cannot each obtain a fresh rate-limit bucket',{timeout:5000},async t=>{
 const dir=temp(t),studio=createStudio({dataDir:dir,port:0});await studio.listen();t.after(()=>studio.close());
 const payload=JSON.stringify({token:'invalid-key'}),port=studio.server.address().port;
 const requests=[];let seen=0;let release;
 const allHeaders=new Promise(resolve=>{release=resolve;});
 studio.server.on('request',req=>{if(req.url==='/api/session'&&++seen===20)release();});
 const responses=Array.from({length:20},()=>new Promise((resolve,reject)=>{
   const request=http.request({host:'127.0.0.1',port,path:'/api/session',method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});
   request.on('error',reject);requests.push(request);request.flushHeaders();
 }));
 await allHeaders;requests.forEach(req=>req.end(payload));
 const statuses=await Promise.all(responses);
 assert.equal(statuses.filter(x=>x===401).length,10);
 assert.equal(statuses.filter(x=>x===429).length,10);
});

test('signed zero CSV passes independent JSON-statistics QC',async()=>{
 const input={csv:'value\n-0'},result=await executeTool({kind:'data_analysis',input});
 const verdict=await audit({kind:'data_analysis',input,...result});
 assert.equal(verdict.verdict,'PASS',JSON.stringify(verdict.defects));
});

test('HTML custom elements do not masquerade as standard tags',async()=>{
 const input={html:'<title-card>Not title</title-card><a-scene><a-box></a-box></a-scene><h1-card>Card</h1-card><meta-card name="description" content="Wrong"></meta-card>'};
 const result=await executeTool({kind:'html_audit',input}),data=JSON.parse(result.files[0].content);
 assert.equal(data.h1Count,0);assert.equal(data.linkCount,0);assert.equal(data.description,'');assert.equal(data.title,'');
 assert.equal((await audit({kind:'html_audit',input,...result})).verdict,'PASS');
 const wrong=structuredClone(result);const parsed=JSON.parse(wrong.files[0].content);parsed.h1Count=1;wrong.files[0].content=JSON.stringify(parsed);
 assert.equal((await audit({kind:'html_audit',input,...wrong})).verdict,'NEEDS_REVISION');
});

test('CEO cancellation preserves a fresh healthy provider probe',async()=>{
 const provider=new LocalProvider({baseUrl:'http://127.0.0.1:12345/v1',model:'fixture',fetchImpl:async(url,{signal})=>{
   if(url.endsWith('/models'))return new Response(JSON.stringify({data:[{id:'fixture'}]}));
   return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));
 }});
 await provider.probe();const controller=new AbortController();
 const pending=provider.generate({brief:'Valid brief',context:'Fixture context',signal:controller.signal});
 controller.abort(new Error('Cancelled by CEO'));await assert.rejects(pending,/Cancelled by CEO/);
 assert.equal(provider.status().status,'CONNECTED');
});

function settle(engine,id){return new Promise((resolve,reject)=>{
 const timer=setTimeout(()=>{engine.off('change',check);reject(new Error('Task did not settle'));},5000);
 function check(){const task=engine.get(id);if(!['RUNNING','QUEUED'].includes(task.status)){clearTimeout(timer);engine.off('change',check);resolve(task);}}
 engine.on('change',check);check();
});}
test('accepted long Unicode brief and CEO revision stay inside execution bounds',async t=>{
 let calls=0;
 // Protocol double: no real inference, no API expense.
 const provider={status:()=>({status:'CONNECTED',model:'fixture'}),generate:async()=>{calls++;return {text:'Fixture draft.',provider:'local-ai',model:'fixture'};}};
 const engine=new Engine({store:new Store(temp(t)),provider});t.after(()=>engine.close());
 let task=await settle(engine,engine.create({brief:'ý'.repeat(9000),kind:'ai_draft',input:{context:'Fixture context'}},'unicode-brief').id);
 assert.equal(task.status,'AWAITING_APPROVAL',task.error);
 engine.review(task.id,{action:'revise',version:1,comment:'s'.repeat(2000)});
 task=await settle(engine,engine.retry(task.id,'unicode-retry').id);
 assert.equal(task.status,'AWAITING_APPROVAL',task.error);assert.equal(calls,2);
 assert.throws(()=>engine.create({brief:'Another valid brief',kind:'ai_draft',input:{context:'ý'.repeat(60000)}},'oversize-context'),/context|size|byte/i);
});
