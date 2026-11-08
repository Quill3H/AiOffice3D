'use strict';
// Protocol doubles only. Parent SIGKILLs this disposable workspace mid-call.
const {Store}=require('../../src/store'),{Engine}=require('../../src/engine');
const {CloudProvider,ProviderGateway}=require('../../src/gateway');
let engine;
const cloud=new CloudProvider({id:'muse',baseUrl:'https://api.meta.ai/v1',model:'crash-protocol-double',apiKey:'fixture-secret',fetchImpl:async(url,options)=>{
 if(url.endsWith('/models'))return new Response(JSON.stringify({data:[{id:'crash-protocol-double'}]}));
 const body=JSON.parse(options.body);
 if(body.messages[1].content.includes('MANAGER_PLAN:'))return new Response(JSON.stringify({model:'crash-protocol-double',choices:[{finish_reason:'stop',message:{content:JSON.stringify({steps:[{id:'extract',agentId:'content',title:'Extract evidence',dependsOn:[]}]})}}]}));
 const task=engine.store.tasks()[0];process.send({id:task.id,status:task.status,plan:task.attempts[0].plan,calls:engine.store.providerCalls().map(c=>c.status)});
 return new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true}));
}});
(async()=>{
 await cloud.probe();const store=new Store(process.env.STUDIO_CRASH_DIR);
 const provider=new ProviderGateway({store,providers:[cloud],remoteCallLimit:10,freeQuota:{muse:{model:'crash-protocol-double',evidenceUrl:'https://example.org/fixture-free-quota',expiresAt:'2099-01-01'}}});
 engine=new Engine({store,provider});
 engine.create({kind:'sourced_brief',brief:'Extract the provided source for a crash fixture',input:{sources:[{id:'s1',title:'Fixture',url:'https://example.org/fixture',text:'Disposable crash test source.'}]}},'crash-source');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
