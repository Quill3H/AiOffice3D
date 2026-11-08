'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

class Store {
  constructor(dataDir) {
    fs.mkdirSync(dataDir, {recursive:true,mode:0o700});
    this.dir=fs.realpathSync(dataDir);
    const rootStat=fs.statSync(this.dir);
    if(process.getuid&&rootStat.uid!==process.getuid())throw new Error('Workspace must be owned by the current user');
    fs.chmodSync(this.dir,0o700);
    this.lockPath=path.join(this.dir,'runtime.lock');
    this.lockId=crypto.randomUUID();
    try {
      const dbFile=path.join(this.dir,'studio.sqlite');
      for(const name of ['studio.sqlite','studio.sqlite-wal','studio.sqlite-shm','runtime.lock']){
        const file=path.join(this.dir,name);
        let stat;try{stat=fs.lstatSync(file);}catch(error){if(error.code!=='ENOENT')throw error;}
        if(stat&&(!stat.isFile()||stat.isSymbolicLink()||stat.nlink>1))throw new Error('Workspace database/lock must be a regular file, not a symlink or hardlink');
        if(stat)fs.chmodSync(file,0o600);
      }
      this.db=new DatabaseSync(dbFile);
      this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=3000;
        CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY, body TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY AUTOINCREMENT, task_id TEXT, body TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS operations(key TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, task_id TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS runtime_owner(singleton INTEGER PRIMARY KEY CHECK(singleton=1), pid INTEGER NOT NULL, id TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS artifact_reservations(attempt_id TEXT PRIMARY KEY, bytes INTEGER NOT NULL);
        PRAGMA user_version=1;`);
      this.acquire();
      this.db.exec("INSERT OR IGNORE INTO artifact_reservations(attempt_id,bytes) SELECT '_baseline',coalesce(sum(json_extract(a.value,'$.size')),0) FROM tasks t,json_each(t.body,'$.artifacts') a");
      for(const name of ['studio.sqlite','studio.sqlite-wal','studio.sqlite-shm'])if(fs.existsSync(path.join(this.dir,name)))fs.chmodSync(path.join(this.dir,name),0o600);
    } catch(error) { this.release();this.db?.close();throw error; }
  }
  acquire() {
    // SQLite's write transaction, not the advisory PID file, serializes takeover.
    this.transaction(()=>{
      const owner=this.db.prepare('SELECT pid,id FROM runtime_owner WHERE singleton=1').get();
      if(owner){let alive=true;try{process.kill(owner.pid,0);}catch(error){if(error.code==='ESRCH')alive=false;}
        if(alive)throw new Error('Workspace already locked by another runtime');}
      this.db.prepare('INSERT INTO runtime_owner(singleton,pid,id) VALUES(1,?,?) ON CONFLICT(singleton) DO UPDATE SET pid=excluded.pid,id=excluded.id').run(process.pid,this.lockId);
    });
    this.ownsLock=true;
    if(fs.existsSync(this.lockPath)&&fs.lstatSync(this.lockPath).isSymbolicLink())throw new Error('Runtime lock must not be a symlink');
    fs.writeFileSync(this.lockPath,JSON.stringify({pid:process.pid,id:this.lockId}),{mode:0o600});
  }
  transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const value=fn(); this.db.exec('COMMIT'); return value; }
    catch(error) { this.db.exec('ROLLBACK'); throw error; }
  }
  get(id) { const row=this.db.prepare('SELECT body FROM tasks WHERE id=?').get(id); return row?JSON.parse(row.body):null; }
  tasks() { return this.db.prepare("SELECT json_remove(body,'$.input') AS body FROM tasks ORDER BY rowid DESC").all().map(r=>JSON.parse(r.body)); }
  count(){return this.db.prepare('SELECT count(*) AS n FROM tasks').get().n;}
  reserveArtifacts(attemptId,bytes,limit){
    this.transaction(()=>{
      const reserved=this.db.prepare('SELECT coalesce(sum(bytes),0) AS n FROM artifact_reservations').get().n;
      if(reserved+bytes>limit)throw new Error('Workspace artifact storage limit reached; preserve existing outputs before using a new data directory');
      this.db.prepare('INSERT INTO artifact_reservations(attempt_id,bytes) VALUES(?,?)').run(attemptId,bytes);
    });
  }
  operation(key) { return this.db.prepare('SELECT fingerprint,task_id FROM operations WHERE key=?').get(key); }
  save(task,event,operation) {
    return this.transaction(()=>{
      this.db.prepare('INSERT INTO tasks(id,body) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body').run(task.id,JSON.stringify(task));
      if(operation) this.db.prepare('INSERT INTO operations(key,fingerprint,task_id) VALUES(?,?,?)').run(operation.key,operation.fingerprint,task.id);
      if(event) {
        const body={...event,taskId:task.id,at:new Date().toISOString()};
        const saved=this.db.prepare('INSERT INTO events(task_id,body) VALUES(?,?)').run(task.id,JSON.stringify(body));
        return {...body,id:Number(saved.lastInsertRowid)};
      }
    });
  }
  events(taskId,limit=300) {
    const rows=taskId?this.db.prepare('SELECT id,body FROM events WHERE task_id=? ORDER BY id DESC LIMIT ?').all(taskId,limit):this.db.prepare('SELECT id,body FROM events ORDER BY id DESC LIMIT ?').all(limit);
    return rows.reverse().map(r=>({...JSON.parse(r.body),id:r.id}));
  }
  recordEvent(event){
    const body={...event,taskId:null,at:new Date().toISOString()};
    this.db.prepare('INSERT INTO events(task_id,body) VALUES(NULL,?)').run(JSON.stringify(body));
  }
  artifact(id) {
    // IDs never turn into filesystem paths; only persisted registry entries may resolve.
    if(typeof id!=='string'||!/^art-[a-f0-9-]{36}$/.test(id)) return null;
    const row=this.db.prepare("SELECT a.value AS body FROM tasks t,json_each(t.body,'$.artifacts') a WHERE json_extract(a.value,'$.id')=? LIMIT 1").get(id);
    return row?JSON.parse(row.body):null;
  }
  release() {
    if(this.ownsLock){try{this.db.prepare('DELETE FROM runtime_owner WHERE singleton=1 AND id=?').run(this.lockId);}catch{}this.ownsLock=false;}
    try { if(JSON.parse(fs.readFileSync(this.lockPath,'utf8')).id===this.lockId) fs.unlinkSync(this.lockPath); } catch {}
  }
  close() { if(this.closed) return; this.closed=true;try{this.release();}finally{this.db.close();} }
}
module.exports={Store};
