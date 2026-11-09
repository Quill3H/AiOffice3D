'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {OpenCodeWorker,parseRun}=require('../src/opencode-worker');
const model='opencode/glm-5.3-flash-free';
function workspace(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'studio-opencode-test-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;}
const events=({cost=0,reason='stop',text='{"claims":[{"sourceId":"s1","quote":"Fixture evidence."}]}'}={})=>[
 {type:'step_start',sessionID:'ses_fixture',part:{type:'step-start'}},
 {type:'text',sessionID:'ses_fixture',part:{type:'text',text}},
 {type:'step_finish',sessionID:'ses_fixture',part:{type:'step-finish',reason,cost,tokens:{input:10,output:8}}}
].map(e=>JSON.stringify(e)).join('\n')+'\n';
test('CLI parser requires completed free text and refuses tools, cost, truncation and mixed sessions',()=>{
 assert.equal(parseRun(events(),0).text.includes('Fixture evidence'),true);
 for(const raw of [events({cost:0.1}),events({reason:'length'}),events({text:''}),events()+JSON.stringify({type:'tool_use'}),events().replace(/ses_fixture/,'ses_other')])assert.throws(()=>parseRun(raw,0),/cost|stop|text|tool|session|protocol/i);
});
test('observed free-limit event classifies without output or billing success',()=>{
 const raw=JSON.stringify({type:'error',sessionID:'ses_quota',error:{type:'provider.free-limit',status:429,message:'secret must not return',retryAfterMs:10000}});
 assert.throws(()=>parseRun(raw,1),e=>e.code==='PROVIDER_QUOTA'&&e.retryable===true&&e.retryAfterMs===10000&&!e.message.includes('secret'));
 assert.throws(()=>parseRun(events(),1),/exit/i);
});
function fixture(t,body,{extraConfig=false}={}){
 const dir=workspace(t),binary=path.join(dir,'cli');
 const discovery=`
if(process.argv.includes('--version')){console.log('opencode v2.2.6');process.exit(0);}
if(process.argv.includes('debug')&&process.argv.includes('config')){
 const sources=[{type:'directory',path:process.env.OPENCODE_CONFIG_DIR},{type:'document',info:JSON.parse(process.env.OPENCODE_CONFIG_CONTENT||'{}')}];
 if(${extraConfig})sources.push({type:'document',path:'/outside/managed.json',info:{agents:{'aioffice-worker':{steps:5}}}});
 console.log(JSON.stringify(sources));process.exit(0);
}
`;
 fs.writeFileSync(binary,'#!'+process.execPath+'\n'+discovery+body,{mode:0o700});return {binary,dir};
}
const goodBody=`const fs=require('node:fs');if(process.argv.includes('models'))console.log('opencode/glm-5.3-flash-free');else {const c=JSON.parse(fs.readFileSync('opencode.json'));if(c.agents['aioffice-worker'].steps!==1||!c.policies.some(p=>p.action==='tool.use'&&p.effect==='deny'))process.exit(3);console.log(${JSON.stringify(events())});}`;
test('worker executes real child with private config and CLI-selected provenance',async t=>{
 const {binary,dir}=fixture(t,goodBody),worker=new OpenCodeWorker({binary,workspaceRoot:dir,model});
 assert.equal(worker.status().status,'NOT_CONNECTED');await worker.probe();assert.equal(worker.status().status,'CONNECTED');
 const result=await worker.generate({brief:'Select fixture evidence',context:'Fixture evidence.',responseMode:'json'});
 assert.equal(result.provider,'opencode');assert.equal(result.model,model);assert.equal(result.execution.modelVerification,'CLI_SELECTED_ONLY');assert.equal(result.execution.reportedCost,0);
 assert.equal(result.execution.cliVersion,'2.2.6');assert.ok(fs.existsSync(path.join(dir,result.execution.traceId,'stdout.jsonl')));assert.equal(JSON.parse(result.text).claims[0].sourceId,'s1');
});
test('worker refuses paid or unadvertised model before inference',async t=>{
 const {binary,dir}=fixture(t,goodBody);
 assert.throws(()=>new OpenCodeWorker({binary,workspaceRoot:dir,model:'opencode/paid-model'}),/free/i);
 const worker=new OpenCodeWorker({binary,workspaceRoot:dir,model:'opencode/mimo-v2.6-flash-free'});await worker.probe();assert.equal(worker.status().status,'NOT_CONNECTED');
 await assert.rejects(()=>worker.generate({brief:'Fixture brief',context:'Evidence'}),/probe/i);
});
test('quota cooldown blocks another dispatch and persists across worker restart',async t=>{
 const body=`if(process.argv.includes('models'))console.log('opencode/glm-5.3-flash-free');else{console.log(JSON.stringify({type:'error',sessionID:'ses_quota',error:{type:'provider.free-limit',status:429,retryAfterMs:60000}}));process.exitCode=1;}`;
 const {binary,dir}=fixture(t,body),worker=new OpenCodeWorker({binary,workspaceRoot:dir,model});await worker.probe();
 await assert.rejects(()=>worker.generate({brief:'Fixture brief',context:'Evidence'}),e=>e.code==='PROVIDER_QUOTA');
 assert.equal(worker.status().status,'RATE_LIMITED');const before=fs.readdirSync(dir).length;
 await assert.rejects(()=>worker.generate({brief:'Fixture brief',context:'Evidence'}),e=>e.code==='PROVIDER_QUOTA');assert.equal(fs.readdirSync(dir).length,before);
 const restarted=new OpenCodeWorker({binary,workspaceRoot:dir,model});assert.equal((await restarted.probe()).status,'RATE_LIMITED');
 assert.match(restarted.status().error,/quota/i);
 const {Store}=require('../src/store'),{Engine}=require('../src/engine');
 const engine=new Engine({store:new Store(path.join(dir,'studio')),provider:restarted,autoStart:false});
 try{
   const blocked=engine.create({kind:'ai_draft',providerId:'opencode',brief:'Fixture brief',input:{context:'Evidence'}},'quota-blocked');
   assert.equal(blocked.status,'BLOCKED');
   assert.match(blocked.error,/hạn mức/);
   assert.ok(blocked.error.includes(restarted.status().retryAt));
 }finally{await engine.close();}
});
test('worker deadline and cancellation terminate bounded child process',async t=>{
 const {binary,dir}=fixture(t,`if(process.argv.includes('models'))console.log('opencode/glm-5.3-flash-free');else setInterval(()=>{},1000);`);
 const worker=new OpenCodeWorker({binary,workspaceRoot:dir,model,timeoutMs:200});await worker.probe();
 await assert.rejects(()=>worker.generate({brief:'Fixture brief',context:'Evidence'}),/timeout/i);
 await worker.probe();const controller=new AbortController();const pending=worker.generate({brief:'Fixture brief',context:'Evidence',signal:controller.signal});controller.abort(new Error('CEO cancelled'));
 await assert.rejects(pending,/CEO cancelled/);assert.equal(worker.status().status,'CONNECTED');
});
test('worker bounds process output and preserves traces in a fresh call directory',async t=>{
 const {binary,dir}=fixture(t,`if(process.argv.includes('models'))console.log('opencode/glm-5.3-flash-free');else process.stdout.write('x'.repeat(2*1024*1024));`);
 const worker=new OpenCodeWorker({binary,workspaceRoot:dir,model});await worker.probe();
 await assert.rejects(()=>worker.generate({brief:'Fixture brief',context:'Evidence'}),/size|output/i);
 assert.ok(fs.readdirSync(dir).some(name=>name.startsWith('call-')));
});
test('unsupported CLI version cannot enable the worker or dispatch model requests',async t=>{
 const dir=workspace(t),binary=path.join(dir,'old-cli');fs.writeFileSync(binary,'#!'+process.execPath+'\nconsole.log("opencode v1.2.3");',{mode:0o700});
 const worker=new OpenCodeWorker({binary,workspaceRoot:dir,model});assert.equal((await worker.probe()).status,'NOT_CONNECTED');assert.match(worker.status().error,/version/i);
});
test('worker isolates inherited OpenCode overrides and keeps the existing data profile',async t=>{
 const overrides={OPENCODE_CONFIG_CONTENT:'{"agents":{"aioffice-worker":{"steps":5}}}',OPENCODE_CONFIG:'/outside/config.json',OPENCODE_DISABLE_PROJECT_CONFIG:'0',OPENCODE_DB:'/existing/opencode.db'};
 const previous=Object.fromEntries(Object.keys(overrides).map(k=>[k,process.env[k]]));
 Object.assign(process.env,overrides);
 t.after(()=>{for(const [k,v] of Object.entries(previous)){if(v===undefined)delete process.env[k];else process.env[k]=v;}});
 const body=`if(process.argv.includes('models'))console.log('${model}');else {
   const config=JSON.parse(process.env.OPENCODE_CONFIG_CONTENT||'{}');
   if(config.agents?.['aioffice-worker']?.steps!==1||process.env.OPENCODE_CONFIG||process.env.OPENCODE_DISABLE_PROJECT_CONFIG!=='1'||process.env.OPENCODE_DB!=='/existing/opencode.db'||!process.env.XDG_CONFIG_HOME?.startsWith(process.cwd()+'/'))process.exit(4);
   console.log(${JSON.stringify(events())});
 }`;
 const {binary,dir}=fixture(t,body),worker=new OpenCodeWorker({binary,workspaceRoot:dir,model});
 assert.equal((await worker.probe()).status,'CONNECTED');
 assert.match((await worker.generate({brief:'Fixture brief',context:'Evidence'})).text,/Fixture evidence/);
});
test('extra configuration sources fail closed before generation',async t=>{
 const {binary,dir}=fixture(t,goodBody,{extraConfig:true}),worker=new OpenCodeWorker({binary,workspaceRoot:dir,model});
 assert.equal((await worker.probe()).status,'NOT_CONNECTED');assert.match(worker.status().error,/config/i);
 await assert.rejects(()=>worker.generate({brief:'Fixture brief',context:'Evidence'}),/probe/i);
});
test('opt-in gateway drives manager and specialist through process fixture and waits for CEO',async t=>{
 const {Store}=require('../src/store'),{Engine}=require('../src/engine'),{createGateway}=require('../src/gateway-config');
 const plan={steps:[{id:'extract',agentId:'content',title:'Extract supplied evidence',dependsOn:[]}]};
 const body=`if(process.argv.includes('models'))console.log('${model}');else {const prompt=process.argv.at(-1);const result=prompt.includes('MANAGER_PLAN:')?${JSON.stringify(plan)}:{claims:[{sourceId:'s1',quote:'Fixture evidence.'}]};const records=${JSON.stringify(events().trim().split('\n').map(JSON.parse))};records[1].part.text=JSON.stringify(result);console.log(records.map(r=>JSON.stringify(r)).join('\\n'));}`;
 const {binary,dir}=fixture(t,body),store=new Store(path.join(dir,'studio'));
 const provider=createGateway(store,{STUDIO_PROVIDER_ORDER:'opencode',STUDIO_OPENCODE_BINARY:binary,STUDIO_OPENCODE_MODEL:model,STUDIO_REMOTE_CALL_LIMIT:'2',STUDIO_OPENCODE_FREE_QUOTA_EVIDENCE_URL:'https://example.org/fixture-free',STUDIO_OPENCODE_FREE_QUOTA_UNTIL:'2099-01-01'});
 await provider.probe();const engine=new Engine({store,provider});t.after(()=>engine.close());
 const created=engine.create({kind:'sourced_brief',providerId:'opencode',brief:'Extract evidence for CEO fixture review',input:{sources:[{id:'s1',title:'Synthetic fixture',url:'https://example.org/fixture',text:'Fixture evidence.'}]}},'opencode-fixture');
 const task=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Fixture timeout')),5000);function check(){const task=engine.get(created.id);if(!['QUEUED','RUNNING'].includes(task.status)){clearTimeout(timer);engine.off('change',check);resolve(task);}}engine.on('change',check);check();});
 assert.equal(task.status,'AWAITING_APPROVAL',task.error);assert.equal(task.approval,null);assert.equal(task.qc.verdict,'PASS');
 assert.equal(task.attempts[0].manager.execution.modelVerification,'CLI_SELECTED_ONLY');assert.equal(task.attempts[0].handoffs[0].provenance.execution.reportedCost,0);assert.equal(store.providerCalls().length,2);
});
