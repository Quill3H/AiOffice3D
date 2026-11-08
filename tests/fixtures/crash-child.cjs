// Real process-crash fixture using the real CSV tool; no model is invoked.
const {Store}=require('../../src/store');
const {Engine}=require('../../src/engine');
const engine=new Engine({store:new Store(process.env.STUDIO_CRASH_DIR)});
let sent=false;
engine.on('change',()=>{const task=engine.snapshot().tasks[0];if(task?.status==='RUNNING'&&!sent){sent=true;process.send({id:task.id,status:task.status});}});
engine.create({brief:'Actual process crash during CSV analysis',kind:'data_analysis',input:{csv:'item,value\n'+Array.from({length:9000},(_,i)=>`row${i},${i}`).join('\n')}},'crash-real');
