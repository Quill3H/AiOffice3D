const {test}=require('node:test');
const assert=require('node:assert/strict');
const {isStudioCommand}=require('../tools/lifecycle');
test('lifecycle verifies exact process command, not arbitrary listener or substring',()=>{
 const node='/usr/local/bin/node',entry='/project with spaces/server.js';
 assert.equal(isStudioCommand(node+' '+entry,node,entry),true);
 for(const cmd of ['python server.py','node other.js','/usr/local/bin/node '+entry+' other.js','sh -c '+node+' '+entry,node+' '+entry+'.bak'])assert.equal(isStudioCommand(cmd,node,entry),false);
});
