'use strict';
const {LocalProvider}=require('./providers');
const {CloudProvider,ProviderGateway}=require('./gateway');
const {OpenCodeWorker}=require('./opencode-worker');
const path=require('node:path');
// Config is operator-owned environment only. Task payloads never select endpoints
// or contain API secrets. No default model is asserted to be account-accessible.
function createGateway(store,env=process.env){
 const providers={
   'local-ai':new LocalProvider({baseUrl:env.STUDIO_AI_BASE_URL||'',model:env.STUDIO_AI_MODEL||''}),
   muse:new CloudProvider({id:'muse',baseUrl:'https://api.meta.ai/v1',model:env.STUDIO_MUSE_MODEL||'',apiKey:env.META_MODEL_API_KEY||''}),
   kimi:new CloudProvider({id:'kimi',baseUrl:env.STUDIO_KIMI_BASE_URL||'https://api.moonshot.ai/v1',model:env.STUDIO_KIMI_MODEL||'',apiKey:env.MOONSHOT_API_KEY||''})
 };
 if(env.STUDIO_OPENCODE_BINARY)providers.opencode=new OpenCodeWorker({binary:env.STUDIO_OPENCODE_BINARY,model:env.STUDIO_OPENCODE_MODEL||'opencode/glm-5.3-flash-free',workspaceRoot:path.join(store.dir,'opencode-worker')});
 const order=(env.STUDIO_PROVIDER_ORDER||'local-ai,muse,kimi').split(',').map(id=>id.trim());
 if(!order.length||order.length>3||new Set(order).size!==order.length||order.some(id=>!providers[id]))throw new Error('Invalid configured provider route');
 const freeQuota={};
 for(const id of ['muse','kimi','opencode'].filter(id=>providers[id]))freeQuota[id]={model:providers[id].status().model,evidenceUrl:env['STUDIO_'+id.toUpperCase()+'_FREE_QUOTA_EVIDENCE_URL'],expiresAt:env['STUDIO_'+id.toUpperCase()+'_FREE_QUOTA_UNTIL']};
 return new ProviderGateway({store,providers:order.map(id=>providers[id]),remoteCallLimit:Number(env.STUDIO_REMOTE_CALL_LIMIT||0),freeQuota});
}
module.exports={createGateway};
