'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {spawn,execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),entry=path.join(root,'server.js');
const isStudioCommand=(command,node=process.execPath,script=entry)=>command.trim()===node+' '+script;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function owner(dir){
 try{
   const lock=JSON.parse(fs.readFileSync(path.join(dir,'runtime.lock'),'utf8'));
   if(!Number.isSafeInteger(lock.pid)||lock.pid<=1)return null;
   const command=execFileSync('/bin/ps',['-p',String(lock.pid),'-o','command='],{encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:2000}).trim();
   return isStudioCommand(command)?lock:null;
 }catch{return null;}
}
async function main(action){
 const dir=path.resolve(process.env.STUDIO_DATA_DIR||path.join(root,'.studio'));
 const existing=owner(dir);
 if(action==='stop'){
   if(!existing){console.log('Không có tiến trình Studio đã xác minh trong thư mục dữ liệu này.');return;}
   // Verify the same instance immediately before sending the graceful signal.
   if(owner(dir)?.id!==existing.id)throw new Error('Studio instance changed; no signal sent');
   process.kill(existing.pid,'SIGTERM');
   for(let i=0;i<50;i++){if(!owner(dir)){console.log('Đã dừng Studio an toàn; dữ liệu và lịch sử được giữ nguyên.');return;}await wait(100);}
   throw new Error('Studio đang dừng. Không dùng kill -9; xem log trước khi thử lại.');
 }
 if(action!=='start')throw new Error('Usage: node tools/lifecycle.js start|stop');
 if(existing){console.log('Studio đã chạy (PID '+existing.pid+'). Không khởi động đè hoặc dừng tiến trình khác.');return;}
 fs.mkdirSync(dir,{recursive:true,mode:0o700});
 const log=path.join(dir,'studio.log');
 if(fs.existsSync(log)&&fs.lstatSync(log).isSymbolicLink())throw new Error('Log must not be a symlink');
 const fd=fs.openSync(log,'a',0o600);
 const child=spawn(process.execPath,[entry],{cwd:root,env:{...process.env,STUDIO_DATA_DIR:dir},detached:true,stdio:['ignore',fd,fd]});
 let spawnError;child.on('error',error=>{spawnError=error;});child.unref();fs.closeSync(fd);
 for(let i=0;i<50;i++){
   if(spawnError)throw spawnError;
   const started=owner(dir);
   if(started?.pid===child.pid){
     // The server owns a workspace before listen; verify its public health URL too.
     try{const response=await fetch('http://127.0.0.1:'+(process.env.PORT||3333)+'/api/health',{signal:AbortSignal.timeout(500)});if(response.ok){console.log('Studio v4: http://127.0.0.1:'+(process.env.PORT||3333));console.log('Khóa CEO: '+path.join(dir,'access-token'));console.log('Log: '+log);return;}}catch{}
   }
   if(child.exitCode!==null)break;
   await wait(100);
 }
 throw new Error('Studio chưa khởi động được. Xem '+log+'. Không dừng dịch vụ đang dùng cổng.');
}
if(require.main===module)main(process.argv[2]).catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={isStudioCommand,main};
