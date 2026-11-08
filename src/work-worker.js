'use strict';
const {parentPort,workerData}=require('node:worker_threads');
async function run(){
 const result=workerData.action==='execute'?await require('./tools').executeTool(workerData.payload):await require('./qc').audit(workerData.payload);
 parentPort.postMessage({result});
}
run().catch(error=>parentPort.postMessage({error:error.message}));
