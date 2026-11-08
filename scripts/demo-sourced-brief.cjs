'use strict';
// Offline protocol demonstration, explicitly not a model-quality test.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {Engine}=require('../src/engine'),{Store}=require('../src/store');
async function main(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aioffice-sourced-demo-'));
 const plan={steps:[{id:'extract',agentId:'content',title:'Select synthetic evidence',dependsOn:[]}]};
 const provider={status:()=>({id:'local-ai',status:'CONNECTED',model:'OFFLINE_PROTOCOL_DOUBLE'}),generate:async({phase})=>({provider:'local-ai',model:'OFFLINE_PROTOCOL_DOUBLE',text:JSON.stringify(phase==='manager'?plan:{claims:[{sourceId:'s1',quote:'This synthetic fixture has value 42.'}]})})};
 const engine=new Engine({store:new Store(dir),provider});
 try{
   const created=engine.create({kind:'sourced_brief',brief:'Select excerpts from the synthetic fixture for CEO inspection',input:{sources:[{id:'s1',title:'Synthetic demonstration fixture; not external research',url:'https://example.org/synthetic-fixture',text:'This synthetic fixture has value 42. No real model is used.'}]}},'offline-demo');
   const task=await new Promise((resolve,reject)=>{
     const timer=setTimeout(()=>{engine.off('change',check);reject(new Error('Demo deadline exceeded'));},10000);
     function check(){const current=engine.get(created.id);if(!['QUEUED','RUNNING'].includes(current.status)){clearTimeout(timer);engine.off('change',check);resolve(current);}}
     engine.on('change',check);check();
   });
   const evidence={mode:'OFFLINE_PROTOCOL_DOUBLE_NOT_LIVE',workspace:dir,taskId:task.id,status:task.status,approval:task.approval,steps:task.steps,qc:task.qc,artifacts:task.artifacts.map(a=>({...a,path:path.join(dir,'artifacts',task.id,a.attemptId,a.name)}))};
   fs.writeFileSync(path.join(dir,'demo-evidence.json'),JSON.stringify(evidence,null,2)+'\n',{flag:'wx',mode:0o600});
   console.log(JSON.stringify(evidence,null,2));
   if(task.status!=='AWAITING_APPROVAL')process.exitCode=1;
 }finally{await engine.close();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
