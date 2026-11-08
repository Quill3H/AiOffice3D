'use strict';
const path=require('node:path');
const {Worker}=require('node:worker_threads');
const {executeTool}=require('./tools');
function inWorker(action,payload,signal){
 signal?.throwIfAborted();
 return new Promise((resolve,reject)=>{
   const worker=new Worker(path.join(__dirname,'work-worker.js'),{workerData:{action,payload},resourceLimits:{maxOldGenerationSizeMb:96}});
   let done=false;
   const finish=(error,result)=>{if(done)return;done=true;signal?.removeEventListener('abort',abort);clearTimeout(timer);void worker.terminate();error?reject(error):resolve(result);};
   const abort=()=>finish(signal.reason instanceof Error?signal.reason:new Error('Worker cancelled'));
   const timer=setTimeout(()=>finish(new Error('Inspection worker timeout')),20000);timer.unref();
   signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
   worker.once('message',message=>finish(message.error?new Error(message.error):null,message.result));
   worker.once('error',error=>finish(error));worker.once('exit',code=>{if(!done)finish(new Error('Inspection worker exited: '+code));});
 });
}
function executeSafely(args){
 if(args.kind!=='html_audit')return executeTool(args);
 args.onEvent?.({message:'Kiểm tra HTML trong worker có giới hạn thời gian.'});
 return inWorker('execute',{kind:args.kind,brief:args.brief,input:args.input},args.signal);
}
function auditSafely({signal,...payload}){return inWorker('audit',payload,signal);}
module.exports={executeSafely,auditSafely};
