'use strict';
const {LocalProvider,readBoundedJson,requireText}=require('./providers');
const {MAX_BRIEF_BYTES,MAX_CONTEXT_BYTES}=require('./limits');
const ENDPOINTS={muse:['https://api.meta.ai/v1'],kimi:['https://api.moonshot.ai/v1','https://api.moonshot.cn/v1']};
const error=(message,retryable=false)=>Object.assign(new Error(message),{retryable});
class CloudProvider extends LocalProvider {
 constructor({id,baseUrl,model='',apiKey='',fetchImpl=globalThis.fetch,nowMs=Date.now,timeoutMs=60000}={}){
   super({baseUrl:'',model:'',fetchImpl,nowMs});
   if(!ENDPOINTS[id]?.includes(baseUrl))throw new Error('Cloud provider endpoint is not allowlisted for this provider');
   if(typeof model!=='string'||model.length>200||/[\r\n\u0000]/.test(model))throw new Error('Invalid cloud model configuration');
   if(typeof apiKey!=='string'||/[\r\n\u0000]/.test(apiKey)||apiKey.length>8192)throw new Error('Invalid provider credential configuration');
   if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000)throw new Error('Invalid provider timeout');
   this.id=id;this._baseUrl=baseUrl;this._model=model.trim();this._key=apiKey;this.timeoutMs=timeoutMs;
 }
 status(){
   return {...super.status(),id:this.id,name:this.id==='muse'?'Meta Muse API':'Kimi Open Platform API',status:!this._key||!this._model?'NOT_CONFIGURED':this._hasFreshProbe()?'CONNECTED':'NOT_CONNECTED',error:this._error,remote:true,capabilities:['text_generation','explicit_model_probe']};
 }
 async probe(){if(!this._key||!this._model)return this.status();return super.probe();}
 async _request(endpoint,{method='GET',body,signal,timeoutMs}={}){
   signal?.throwIfAborted();
   const deadline=AbortSignal.timeout(Math.min(timeoutMs||this.timeoutMs,this.timeoutMs));
   const combined=signal?AbortSignal.any([signal,deadline]):deadline;
   try{
     const response=await this._fetch(this._baseUrl+endpoint,{method,redirect:'error',credentials:'omit',signal:combined,headers:{Accept:'application/json',Authorization:'Bearer '+this._key,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
     combined.throwIfAborted();
     if(!response?.ok)throw error('Provider HTTP '+(response?.status||'unknown'),[408,429].includes(response?.status)||response?.status>=500);
     // Local parser is protocol-only: same byte bounds, no provider body in errors.
     return await readBoundedJson(response);
   }catch(caught){
     if(signal?.aborted)throw signal.reason instanceof Error?signal.reason:new Error('Provider call cancelled');
     if(caught.retryable!==undefined)throw caught;
     if(deadline.aborted||caught.name==='TimeoutError')throw error('Provider request timeout',true);
     if(caught instanceof TypeError)throw error('Provider transport unavailable',true);
     throw error('Provider response protocol invalid');
   }
 }
 async generate(args){
   try{return {...await super.generate(args),provider:this.id};}
   catch(caught){
     if(args?.signal?.aborted)throw caught;
     // Parent validation errors contain only our fixed strings, never response bodies.
     const safe=caught.retryable!==undefined?caught:error('Provider model or completion protocol invalid');
     this._error=safe.message;throw safe;
   }
 }
}
class ProviderGateway {
 constructor({store,providers=[new LocalProvider()],remoteCallLimit=0,freeQuota={},nowMs=Date.now}={}){
   if(!store)throw new Error('Gateway requires persistent store');
   if(!Array.isArray(providers)||providers.length<1||providers.length>3)throw new Error('Gateway supports 1–3 configured providers');
   this.store=store;this.providers=new Map(providers.map(p=>[p.status().id,p]));
   if(this.providers.size!==providers.length)throw new Error('Duplicate provider identity');
   if(!Number.isSafeInteger(remoteCallLimit)||remoteCallLimit<0||remoteCallLimit>1000)throw new Error('Invalid remote call budget');
   this.remoteCallLimit=remoteCallLimit;this.freeQuota=freeQuota;this.nowMs=nowMs;
 }
 supports(id){return this.providers.has(id);}
 status(id){return (this.providers.get(id)||(!id?this.providers.values().next().value:null))?.status()||{id,status:'NOT_CONFIGURED',model:null};}
 statuses(){return [...this.providers.values()].map(p=>p.status());}
 budget(){const used=this.store.providerCalls().length;return {limit:this.remoteCallLimit,reserved:used,remaining:Math.max(0,this.remoteCallLimit-used),policy:'ZERO_SPEND_REQUIRES_OPERATOR_VERIFIED_FREE_QUOTA',billingVerifiedByApplication:false};}
 async probe(id){const provider=this.providers.get(id||this.providers.keys().next().value);if(!provider)throw new Error('Unknown provider');return provider.probe();}
 scope({providerId,call}={}){return {status:()=>this.status(providerId),generate:args=>this.generate({...args,providerId,call:{...call,phase:args.phase||call?.phase}})};}
 _freeEligible(providerId,model){
   const quota=this.freeQuota?.[providerId];
   try{const url=new URL(quota.evidenceUrl);return quota.model===model&&url.protocol==='https:'&&!url.username&&!url.password&&Number.isFinite(Date.parse(quota.expiresAt))&&Date.parse(quota.expiresAt)>this.nowMs();}catch{return false;}
 }
 async generate({brief,context,signal,providerId,call}={}){
   requireText(brief,'Brief',MAX_BRIEF_BYTES);requireText(context,'Context',MAX_CONTEXT_BYTES);signal?.throwIfAborted();
   if(providerId&&!this.supports(providerId))throw new Error('Unknown provider');
   const route=[...new Set([providerId,...this.providers.keys()].filter(Boolean))];
   let lastError;
   for(const id of route){
     signal?.throwIfAborted();const provider=this.providers.get(id),state=provider.status();
     if(state.status!=='CONNECTED')continue;
     let reservation;
     if(state.remote){
       if(!this._freeEligible(id,state.model))throw new Error('Verified free quota for this provider/model is required by zero-spend policy');
       reservation=this.store.reserveProviderCall({...call,providerId:id,model:state.model},this.remoteCallLimit);
     }
     try{
       const result=await provider.generate({brief,context,signal});
       signal?.throwIfAborted();if(reservation)this.store.finishProviderCall(reservation,'SUCCEEDED',result.usage);
       return result;
     }catch(caught){
       if(reservation)this.store.finishProviderCall(reservation,'FAILED');
       if(signal?.aborted||!caught.retryable)throw caught;
       lastError=caught;
     }
   }
   throw lastError||new Error('No connected provider with a fresh explicit model probe');
 }
}
module.exports={CloudProvider,ProviderGateway};
