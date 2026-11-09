'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {Store}=require('../src/store'),{Engine}=require('../src/engine'),{createGateway}=require('../src/gateway-config');
async function main(){
 const args=process.argv.slice(2);
 if(args.length&&!(args.length===2&&args[0]==='--model'))throw new Error('Usage: node scripts/pilot-opencode.cjs [--model opencode/<free-model>]');
 const model=args[1]||'opencode/glm-5.3-flash-free';
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aioffice-opencode-live-'));
 const store=new Store(dir);let engine;
 try{
   // CEO explicitly authorized zero-cost Free-model trials. Pricing evidence is
   // public; remaining quota/account billing are not verified by this script.
   const provider=createGateway(store,{STUDIO_PROVIDER_ORDER:'opencode',STUDIO_OPENCODE_BINARY:process.env.STUDIO_OPENCODE_BINARY||'/Applications/OpenCode.app/Contents/Resources/opencode-cli',STUDIO_OPENCODE_MODEL:model,STUDIO_REMOTE_CALL_LIMIT:'4',STUDIO_OPENCODE_FREE_QUOTA_EVIDENCE_URL:'https://opencode.ai/docs/console/models/#free-models',STUDIO_OPENCODE_FREE_QUOTA_UNTIL:new Date(Date.now()+3600000).toISOString()});
   await provider.probe();
   engine=new Engine({store,provider});
   const request={kind:'sourced_brief',providerId:'opencode',brief:'Use exactly one specialist step to select the supplied synthetic evidence. Return the required strict JSON. Keep CEO approval explicit.',input:{sources:[{id:'s1',title:'Synthetic pilot fixture, not external research',url:'https://example.org/synthetic-pilot',text:'CEO approval must remain explicit. This is synthetic pilot evidence, not external research.'}]}};
   const created=engine.create(request,'opencode-live-pilot');
   const task=await new Promise((resolve,reject)=>{
     const timer=setTimeout(()=>{engine.off('change',check);reject(new Error('Pilot deadline exceeded'));},125000);
     function check(){const current=engine.get(created.id);if(!['QUEUED','RUNNING'].includes(current.status)){clearTimeout(timer);engine.off('change',check);resolve(current);}}
     engine.on('change',check);check();
   });
   const evidence={mode:'LIVE_INSTALLED_OPENCODE_NOT_A_TEST_DOUBLE',at:new Date().toISOString(),workspace:dir,requestedModel:model,provider:provider.status(),budget:provider.budget(),task,providerCalls:store.providerCalls(),generationSucceeded:task.status==='AWAITING_APPROVAL',reportedInferenceCost:task.attempts[0]?.handoffs?.reduce((sum,h)=>sum+(h.provenance.execution?.reportedCost||0),task.attempts[0]?.manager?.execution?.reportedCost||0)??null,billingVerifiedByApplication:false};
   if(provider.status().status==='RATE_LIMITED'){
     evidence.followupTask=engine.create(request,'opencode-after-quota'); // BLOCKED, no inference.
   }
   fs.writeFileSync(path.join(dir,'pilot-evidence.json'),JSON.stringify(evidence,null,2)+'\n',{flag:'wx',mode:0o600});
   console.log(JSON.stringify(evidence,null,2));
   if(!evidence.generationSucceeded)process.exitCode=2;
 }finally{if(engine)await engine.close();else store.close();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
