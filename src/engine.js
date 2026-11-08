'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {EventEmitter}=require('node:events');
const {executeSafely,auditSafely}=require('./work');
const {LocalProvider}=require('./providers');
const {MAX_CONTEXT_BYTES}=require('./limits');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
const now=()=>new Date().toISOString();
function fail(message,code='INVALID_REQUEST',status=400) {const e=new Error(message);e.code=code;e.status=status;throw e;}
const CATALOG=[
 ['manager','Trưởng phòng điều phối','Điều phối','RULE_ENGINE',['route_brief','dependency_queue'],'Định tuyến theo dữ liệu được cung cấp; không nhận là suy luận AI.'],
 ['finance','Chuyên viên Dữ liệu & Tài chính','Dữ liệu','DETERMINISTIC_TOOL',['csv_statistics'],'Tính thống kê CSV thực; không dự báo hay tư vấn đầu tư.'],
 ['content','Chuyên viên Nội dung','Nội dung','DETERMINISTIC_TOOL',['evidence_report','ai_draft'],'Báo cáo từ dữ liệu; viết sáng tạo cần provider.'],
 ['seo','Chuyên viên SEO & AI Search','Tăng trưởng','DETERMINISTIC_TOOL',['html_audit','ai_draft'],'Kiểm tra HTML đã cung cấp; chưa crawl, đo Core Web Vitals hay audit toàn site.'],
 ['development','Chuyên viên Dev & Automation','Kỹ thuật','DETERMINISTIC_TOOL',['system_check','ai_draft'],'Đọc số liệu runtime; không chạy mã/lệnh do model sinh.'],
 ['qc','Kiểm soát chất lượng','Nghiệm thu','DETERMINISTIC_TOOL',['independent_audit'],'Đối chiếu kỹ thuật/dữ liệu; CEO xác nhận chất lượng nội dung.'],
 ['video','Chuyên viên Video & Media','Sáng tạo','AI_PROVIDER',['ai_draft'],'Chỉ soạn brief/kịch bản khi có model; chưa dựng hoặc xuất video.'],
 ['design','Chuyên viên Thiết kế','Sáng tạo','AI_PROVIDER',['ai_draft'],'Chỉ soạn brief khi có model; chưa sinh ảnh hoặc tệp thiết kế.'],
 ['advertising','Chuyên viên Quảng cáo','Tăng trưởng','AI_PROVIDER',['ai_draft'],'Chỉ soạn kế hoạch khi có model; chưa kết nối hoặc xuất bản quảng cáo.']
];
class Engine extends EventEmitter {
 constructor({store,provider,execute=executeSafely,inspect=auditSafely,concurrency=2,timeoutMs=120000,autoStart=true,maxQueued=50,maxTasks=500,maxArtifactBytes=100*1024*1024}) {
   super();this.store=store;this.provider=provider||new LocalProvider();this.execute=execute;this.inspect=inspect;
   this.concurrency=Math.min(4,Math.max(1,concurrency));this.timeoutMs=timeoutMs;this.autoStart=autoStart;
   this.maxQueued=maxQueued;this.maxTasks=maxTasks;this.maxArtifactBytes=maxArtifactBytes;
   this.active=new Map();this.maxObservedActive=0;this.closed=false;
   for(const saved of store.tasks()) if(saved.status==='RUNNING') {
     const task=store.get(saved.id);
     task.status='INTERRUPTED';task.error='Runtime stopped during execution. Retry explicitly to start a new attempt.';
     task.updatedAt=now();
     task.attempts.filter(a=>a.status==='RUNNING').forEach(a=>{a.status='INTERRUPTED';a.finishedAt=now();});
     task.steps.filter(s=>s.status==='RUNNING').forEach(s=>{s.status='INTERRUPTED';s.finishedAt=now();});
     store.save(task,{type:'RECOVERED',message:task.error});
   }
   this.schedule();
 }
 get(id){return this.publicTask(this.required(id));}
 required(id){const t=this.store.get(id);if(!t) fail('Task not found','NOT_FOUND',404);return t;}
 publicTask(t){return {...t,input:undefined,artifacts:t.artifacts.map(({relativePath,...a})=>a)};}
 change(task,type,message,extra={}){task.updatedAt=now();this.store.save(task,{type,message,...extra});this.emit('change');return task;}
 create(payload,key){
   if(this.closed) fail('Runtime shutting down','CLOSED',503);
   if(!payload||typeof payload!=='object'||Array.isArray(payload)) fail('Expected an object');
   if(Object.keys(payload).some(k=>!['brief','kind','input','providerId'].includes(k))) fail('Unknown task fields; commands and paths are not allowed');
   let {brief,kind='auto',input={},providerId}=payload;
   if(typeof brief!=='string'||brief.trim().length<8||brief.length>12000) fail('Brief must contain 8–12000 characters');
   if(!input||typeof input!=='object'||Array.isArray(input)) fail('Input must be an object');
   if(Object.keys(input).some(k=>!['csv','html','context','agentId'].includes(k))) fail('Unknown input field; file paths and URLs are not accepted');
   for(const [k,v] of Object.entries(input)) if(typeof v!=='string'||v.length>500000) fail('Input values must be bounded text: '+k);
   if(kind==='auto') kind=input.csv?'data_analysis':input.html?'html_audit':/\b(runtime|system check|health)\b|kiểm tra hệ thống/i.test(brief)?'system_check':'ai_draft';
   if(!['data_analysis','html_audit','system_check','ai_draft'].includes(kind)) fail('Unsupported task kind');
   if(kind==='ai_draft'&&typeof input.context==='string'&&Buffer.byteLength(input.context)>MAX_CONTEXT_BYTES)fail('Context exceeds UTF-8 byte size limit');
   if(providerId&&providerId!=='local-ai') fail('Unsupported provider');
   if(input.agentId&&!CATALOG.some(a=>a[0]===input.agentId&&a[0]!=='qc'&&a[0]!=='manager')) fail('Unsupported specialist');
   const request={brief:brief.trim(),kind,input,providerId:providerId||null};const fingerprint=hash(canonical(request));
   const previous=this.checkOperation(key,fingerprint);
   if(previous) return this.get(previous);
   if(this.store.count()>=this.maxTasks)fail('Workspace task limit reached; preserve a backup and use a new data directory','LIMIT',429);
   if(this.store.tasks().filter(t=>['QUEUED','RUNNING'].includes(t.status)).length>=this.maxQueued)fail('Queue limit reached; wait for active work to settle','LIMIT',429);
   const issues=[];
   if(kind==='data_analysis'&&!input.csv?.trim()) issues.push('Cần cung cấp CSV để tính số liệu.');
   if(kind==='html_audit'&&!input.html?.trim()) issues.push('Cần cung cấp HTML; ứng dụng không tự truy cập URL.');
   if(kind==='ai_draft'&&this.provider.status().status!=='CONNECTED') issues.push('Chưa có model local đã kết nối và xác minh.');
   if(kind==='ai_draft'&&!input.context?.trim())issues.push('Cần cung cấp ngữ cảnh và căn cứ để model viết bản nháp.');
   const t={id:'task-'+crypto.randomUUID(),...request,status:issues.length?'BLOCKED':'QUEUED',steps:[],attempts:[],artifacts:[],version:0,qc:null,approval:null,revision:null,error:issues.join(' ')||null,createdAt:now(),updatedAt:now()};
   this.store.save(t,{type:issues.length?'BLOCKED':'TASK_CREATED',message:issues.join(' ')||'CEO đã giao việc; kế hoạch theo rule engine sẽ chạy trong hàng đợi.',agentId:'manager'},{key,fingerprint});
   this.emit('change');this.schedule();return this.get(t.id);
 }
 checkOperation(key,fingerprint){
   if(typeof key!=='string'||key.length<1||key.length>160||!/^[a-zA-Z0-9:_-]+$/.test(key)) fail('A valid Idempotency-Key is required');
   const old=this.store.operation(key);
   if(old){if(old.fingerprint!==fingerprint) fail('Idempotency key reused with different request','IDEMPOTENCY_CONFLICT',409);return old.task_id;}
 }
 plan(t){
   const specialist={data_analysis:'finance',html_audit:'seo',system_check:'development',ai_draft:t.input.agentId||'content'}[t.kind];
   return [
     {id:'execute',agentId:specialist,title:{data_analysis:'Tính thống kê từ CSV',html_audit:'Kiểm tra HTML đã cung cấp',system_check:'Đọc thông tin runtime',ai_draft:'Soạn bản nháp bằng model local'}[t.kind],dependsOn:[],mode:t.kind==='ai_draft'?'AI_PROVIDER':'DETERMINISTIC_TOOL'},
     {id:'publish',agentId:'content',title:'Đóng gói báo cáo và bằng chứng',dependsOn:['execute'],mode:'DETERMINISTIC_TOOL'},
     {id:'qc',agentId:'qc',title:'Đối chiếu độc lập trước khi trình CEO',dependsOn:['publish'],mode:'DETERMINISTIC_TOOL'}
   ].map(s=>({...s,status:'QUEUED'}));
 }
 schedule(){if(!this.closed&&this.autoStart) queueMicrotask(()=>this.pump());}
 pump(){
   if(this.closed) return;
   while(this.active.size<this.concurrency){
     const task=this.store.tasks().reverse().find(t=>t.status==='QUEUED'&&!this.active.has(t.id));
     if(!task) break;
     const controller=new AbortController();
     const entry={controller};this.active.set(task.id,entry);this.maxObservedActive=Math.max(this.maxObservedActive,this.active.size);
     entry.promise=this.run(task.id,controller).catch(error=>{this.emit('runtimeError',error);}).finally(()=>{this.active.delete(task.id);this.schedule();});
   }
 }
 async run(id,controller){
   let task=this.required(id);if(task.status!=='QUEUED')return;
   task.version++;task.status='RUNNING';task.error=null;task.qc=null;task.approval=null;task.steps=this.plan(task);
   const attempt={id:'attempt-'+crypto.randomUUID(),number:task.version,status:'RUNNING',startedAt:now(),mode:task.kind==='ai_draft'?'AI_PROVIDER':'DETERMINISTIC_TOOL',provider:task.kind==='ai_draft'?'local-ai':null,model:task.kind==='ai_draft'?this.provider.status().model:null};
   task.attempts.push(attempt);this.change(task,'ATTEMPT_STARTED','Bắt đầu lượt thực thi '+task.version,{agentId:'manager'});
   let timer;
   const budget=new Promise((_,reject)=>{
     const abort=()=>reject(controller.signal.reason instanceof Error?controller.signal.reason:new Error('Execution cancelled'));
     controller.signal.addEventListener('abort',abort,{once:true});
     timer=setTimeout(()=>controller.abort(new Error('Execution timeout')),this.timeoutMs);timer.unref?.();
   });
   const assertActive=()=>{if(controller.signal.aborted||this.required(id).status!=='RUNNING')throw new Error('Execution cancelled');};
   const step=(index,status)=>{
     assertActive();task=this.required(id);const s=task.steps[index];s.status=status;s[status==='RUNNING'?'startedAt':'finishedAt']=now();
     this.change(task,'STEP_'+status,s.title,{agentId:s.agentId,stepId:s.id});
   };
   try {
     step(0,'RUNNING');
     const executedBrief=task.brief+(task.revision?'\nYêu cầu sửa từ CEO: '+task.revision.comment:'');
     const result=await Promise.race([this.execute({kind:task.kind,brief:executedBrief,input:task.input,provider:this.provider,signal:controller.signal,onEvent:event=>{if(!controller.signal.aborted&&this.required(id).status==='RUNNING')this.change(this.required(id),'TOOL_EVENT',String(event?.message||event).slice(0,2000),{agentId:task.steps[0].agentId});}}),budget]);
     assertActive();step(0,'DONE');step(1,'RUNNING');
     if(!result||!Array.isArray(result.files)||!result.files.length||result.files.length>10)throw new Error('Tool did not produce deliverable files');
     let directory=this.store.dir;
     for(const segment of ['artifacts',task.id,attempt.id]){
       directory=path.join(directory,segment);
       let stat;try{stat=fs.lstatSync(directory);}catch(error){if(error.code!=='ENOENT')throw error;}
       if(stat&&(!stat.isDirectory()||stat.isSymbolicLink()))throw new Error('Artifact publication root/parent outside scope: symlink or invalid directory');
       if(!stat)fs.mkdirSync(directory,{mode:0o700});
       if(fs.realpathSync(directory)!==directory)throw new Error('Artifact publication directory outside workspace scope');
     }
     const incomingBytes=result.files.reduce((sum,file)=>sum+Buffer.byteLength(file.content||''),0);
     this.store.reserveArtifacts(attempt.id,incomingBytes,this.maxArtifactBytes);
     const artifacts=[];
     for(const file of result.files){
       assertActive();
       if(!/^[a-zA-Z0-9_-]+\.(md|json|txt|csv)$/.test(file.name))throw new Error('Unsafe artifact filename');
       const content=Buffer.isBuffer(file.content)?file.content:Buffer.from(file.content||'');
       if(!content.length||content.length>2*1024*1024)throw new Error('Artifact empty or too large');
       const destination=path.join(directory,file.name);
       const fd=fs.openSync(destination,'wx',0o600);try{fs.writeFileSync(fd,content);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
       artifacts.push({id:'art-'+crypto.randomUUID(),taskId:id,attemptId:attempt.id,version:task.version,name:file.name,mime:file.mime||'text/plain',size:content.length,sha256:hash(content),relativePath:path.relative(this.store.dir,destination),createdAt:now()});
     }
     task=this.required(id);task.artifacts.push(...artifacts);
     const current=task.attempts.at(-1);current.mode=result.mode;current.provider=result.provider||null;current.model=result.model||null;current.usage=result.usage||null;current.evidence=result.evidence;
     this.change(task,'ARTIFACTS_CREATED','Đã lưu '+artifacts.length+' sản phẩm với mã SHA-256 theo phiên bản.',{agentId:'content'});
     step(1,'DONE');step(2,'RUNNING');
     const diskFiles=artifacts.map(a=>{const read=this.readArtifact(a.id);return {name:a.name,mime:a.mime,content:read.content.toString('utf8')};});
     const verdict=await Promise.race([this.inspect({kind:task.kind,brief:executedBrief,input:task.input,files:diskFiles,evidence:result.evidence,mode:result.mode,signal:controller.signal}),budget]);
     assertActive();step(2,'DONE');task=this.required(id);task.qc=verdict;
     if(!verdict||!Array.isArray(verdict.checks)||!['PASS','NEEDS_REVISION'].includes(verdict.verdict))throw new Error('Invalid QC verdict');
     task.status=verdict.verdict==='PASS'?'AWAITING_APPROVAL':'NEEDS_REVISION';
     task.attempts.at(-1).qc=verdict;
     task.attempts.at(-1).status=verdict.verdict==='PASS'?'SUCCEEDED':'QC_REJECTED';task.attempts.at(-1).finishedAt=now();
     this.change(task,verdict.verdict==='PASS'?'AWAITING_APPROVAL':'QC_REJECTED',verdict.verdict==='PASS'?'QC đã đối chiếu trong phạm vi công cụ. CEO cần xem sản phẩm để nghiệm thu.':'QC yêu cầu sửa; chưa được nghiệm thu.',{agentId:'qc'});
   } catch(error) {
     task=this.required(id);
     if(task.status==='RUNNING'){
       task.status='FAILED';task.error=String(error.message).slice(0,2000);task.attempts.at(-1).status='FAILED';task.attempts.at(-1).error=task.error;task.attempts.at(-1).finishedAt=now();
       task.steps.filter(s=>s.status==='RUNNING').forEach(s=>{s.status='FAILED';s.finishedAt=now();});
       this.change(task,'FAILED',task.error);
     }
   } finally {clearTimeout(timer);controller.abort(new Error('Attempt finished'));}
 }
 retry(id,key){
   const fingerprint=hash('retry:'+id);const previous=this.checkOperation(key,fingerprint);if(previous)return this.get(previous);
   const t=this.required(id);
   if(!['FAILED','INTERRUPTED','BLOCKED','NEEDS_REVISION'].includes(t.status))fail('Task cannot retry in current state','STATE_CONFLICT',409);
   if(t.attempts.length>=20)fail('Attempt limit reached','LIMIT',409);
   if(this.store.tasks().filter(t=>['QUEUED','RUNNING'].includes(t.status)).length>=this.maxQueued)fail('Queue limit reached','LIMIT',429);
   if(t.kind==='data_analysis'&&!t.input.csv?.trim()||t.kind==='html_audit'&&!t.input.html?.trim())fail('Missing input: create a new task with the required data');
   if(t.kind==='ai_draft'&&this.provider.status().status!=='CONNECTED')fail('Provider not connected','PROVIDER_UNAVAILABLE',409);
   if(t.kind==='ai_draft'&&!t.input.context?.trim())fail('Missing context: create a new task with source material');
   if(t.kind==='ai_draft'&&Buffer.byteLength(t.input.context)>MAX_CONTEXT_BYTES)fail('Context exceeds UTF-8 byte size limit');
   t.status='QUEUED';t.error=null;t.updatedAt=now();this.store.save(t,{type:'RETRY_QUEUED',message:'CEO đã yêu cầu lượt thực thi mới; giữ toàn bộ phiên bản cũ.',agentId:'manager'},{key,fingerprint});
   this.emit('change');this.schedule();return this.get(id);
 }
 cancel(id){
   const t=this.required(id);if(!['QUEUED','RUNNING','BLOCKED'].includes(t.status))fail('Task cannot cancel in current state','STATE_CONFLICT',409);
   t.status='CANCELLED';t.error='Cancelled by CEO';t.steps.filter(s=>['RUNNING','QUEUED'].includes(s.status)).forEach(s=>s.status='CANCELLED');
   if(t.attempts.at(-1)?.status==='RUNNING'){t.attempts.at(-1).status='CANCELLED';t.attempts.at(-1).finishedAt=now();}
   this.change(t,'CANCELLED','CEO đã hủy nhiệm vụ.');this.active.get(id)?.controller.abort(new Error('Cancelled by CEO'));return this.get(id);
 }
 review(id,{action,version,comment=''}){
   const t=this.required(id);
   if(t.status!=='AWAITING_APPROVAL')fail('Task is not awaiting approval','STATE_CONFLICT',409);
   if(version!==t.version)fail('Approval version is stale','VERSION_CONFLICT',409);
   if(!['approve','revise'].includes(action))fail('Invalid review action');
   if(typeof comment!=='string'||comment.length>8000||action==='revise'&&!comment.trim())fail('Revision requires a comment');
   if(action==='approve'){
     if(t.qc?.verdict!=='PASS')fail('QC has not passed','QC_REJECTED',409);
     const artifacts=t.artifacts.filter(a=>a.version===version);if(!artifacts.length)fail('No current artifacts','INTEGRITY_FAILED',409);
     for(const a of artifacts)this.readArtifact(a.id);
     t.status='DONE';t.approval={version,at:now(),comment,actor:'CEO'};
     this.change(t,'APPROVED','CEO đã nghiệm thu phiên bản '+version+'.');
   } else {t.status='NEEDS_REVISION';t.revision={version,at:now(),comment:comment.trim(),actor:'CEO'};this.change(t,'REVISION_REQUESTED','CEO yêu cầu sửa: '+comment.trim());}
   return this.get(id);
 }
 readArtifact(id){
   const artifact=this.store.artifact(id);if(!artifact)fail('Artifact not found','NOT_FOUND',404);
   const base=path.join(this.store.dir,'artifacts');const candidate=path.resolve(this.store.dir,artifact.relativePath);
   let real,stat;try{real=fs.realpathSync(candidate);stat=fs.statSync(real);}catch{fail('Artifact integrity: file missing','INTEGRITY_FAILED',409);}
   if(!real.startsWith(base+path.sep)||!stat.isFile()||stat.size>2*1024*1024)fail('Artifact outside scope or integrity invalid','INTEGRITY_FAILED',409);
   const fd=fs.openSync(candidate,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
   let content;try{content=fs.readFileSync(fd);}finally{fs.closeSync(fd);}
   if(content.length!==artifact.size||hash(content)!==artifact.sha256)fail('Artifact integrity hash mismatch','INTEGRITY_FAILED',409);
   const {relativePath,...publicArtifact}=artifact;return {...publicArtifact,content};
 }
 snapshot(){
   const tasks=this.store.tasks().map(t=>this.publicTask(t));const provider=this.provider.status();
   const agents=CATALOG.map(([id,name,department,mode,tools,description])=>({id,name,department,mode,tools,description,capabilities:tools,limitations:[description],status:tasks.some(t=>t.status==='RUNNING'&&t.steps.some(s=>s.agentId===id&&s.status==='RUNNING'))?'WORKING':mode==='AI_PROVIDER'&&provider.status!=='CONNECTED'?'UNAVAILABLE':'AVAILABLE'}));
   const events=this.store.events();
   return {version:'4.0.0',revision:events.at(-1)?.id||0,agents,tasks,artifacts:tasks.flatMap(t=>t.artifacts),events,providers:[provider,{id:'legacy-bridge',name:'ChatGPT Web Bridge (cũ)',kind:'LEGACY_WEB_BRIDGE',status:'DISABLED',error:'Chưa có adapter ghép cặp an toàn; không phải API chính thức.'}],connectors:[{id:'external-tools',name:'MCP / dịch vụ ngoài',status:'NOT_CONNECTED',detail:'Công cụ của phiên Codex không tự động được cấp cho ứng dụng.'}],metrics:{running:tasks.filter(t=>t.status==='RUNNING').length,queued:tasks.filter(t=>t.status==='QUEUED').length,awaitingApproval:tasks.filter(t=>t.status==='AWAITING_APPROVAL').length,done:tasks.filter(t=>t.status==='DONE').length,total:tasks.length}};
 }
 async close(){
   if(this.closed)return;this.closed=true;
   for(const [id,{controller}] of this.active){
     const t=this.required(id);
     if(t.status==='RUNNING'){
       t.status='INTERRUPTED';t.error='Runtime stopped. Retry explicitly; prior artifacts and attempts remain.';
       t.attempts.at(-1).status='INTERRUPTED';t.attempts.at(-1).finishedAt=now();
       t.steps.filter(s=>s.status==='RUNNING').forEach(s=>{s.status='INTERRUPTED';s.finishedAt=now();});
       this.change(t,'INTERRUPTED',t.error);
     }
     controller.abort(new Error('Runtime shutting down'));
   }
   await Promise.allSettled([...this.active.values()].map(x=>x.promise));this.store.close();
 }
}
module.exports={Engine,fail};
