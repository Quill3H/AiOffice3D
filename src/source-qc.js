'use strict';
const {createHash}=require('node:crypto');
const {isDeepStrictEqual:same}=require('node:util');
const digest=value=>createHash('sha256').update(value).digest('hex');
// Independent implementation: never import producer validators/report builders.
function inspectSourcedBrief({brief,input,files,evidence,mode}){
 const checks=[],defects=[],limitations=['Checks compare submitted text only. URLs were not fetched; source authenticity, truth, relevance and completeness require human review.'];
 const check=(dimension,passed,detail)=>{checks.push({dimension,status:passed?'PASS':'FAIL',detail});if(!passed)defects.push(detail);};
 const fields=(o,names)=>o&&typeof o==='object'&&!Array.isArray(o)&&same(Object.keys(o).sort(),[...names].sort());
 const identifier=s=>typeof s==='string'&&/^[a-z][a-z0-9_-]{0,39}$/.test(s);
 const provenance=p=>p&&typeof p.provider==='string'&&p.provider.length>0&&p.provider.length<=200&&typeof p.model==='string'&&p.model.length>0&&p.model.length<=200&&/^[a-f0-9]{64}$/.test(p.outputHash)&&/^[a-f0-9]{64}$/.test(p.contentHash);
 const names=['plan.json','brief.json','report.md'];
 const technical=Array.isArray(files)&&files.length===3&&new Set(files.map(f=>f.name)).size===3&&files.every(f=>names.includes(f.name)&&(typeof f.content==='string'||Buffer.isBuffer(f.content))&&Buffer.byteLength(f.content)>0&&Buffer.byteLength(f.content)<=2*1024*1024&&f.mime===(f.name.endsWith('.json')?'application/json':'text/markdown'));
 check('technical',technical,'Three bounded named artifacts with correct MIME and nonempty contents are required.');
 let plan,output,report,format=false,source=false,grounding=false,content=false,dependency=false;
 try{
   if(!technical)throw new Error('Invalid artifact set');
   const read=name=>{const file=files.find(f=>f.name===name);return Buffer.isBuffer(file.content)?file.content.toString('utf8'):file.content;};
   plan=JSON.parse(read('plan.json'));output=JSON.parse(read('brief.json'));report=read('report.md');
   format=fields(plan,['schemaVersion','kind','steps','manager'])&&fields(output,['schemaVersion','kind','sources','handoffs'])&&plan.schemaVersion===1&&output.schemaVersion===1&&plan.kind==='sourced_brief'&&output.kind==='sourced_brief'&&provenance(plan.manager);
   if(!format)throw new Error('Malformed source-brief schema');
   const sources=input?.sources;
   if(!Array.isArray(sources)||sources.length<1||sources.length>5||new Set(sources.map(s=>s.id)).size!==sources.length)throw new Error('Invalid source set');
   let sourceBytes=0;
   const manifest=sources.map(s=>{
     const url=new URL(s.url);
     if(!fields(s,['id','title','url','text'])||!identifier(s.id)||typeof s.title!=='string'||!s.title.trim()||s.title.length>200||/[\u0000-\u001f]/.test(s.title)||typeof s.url!=='string'||s.url.length>2048||url.protocol!=='https:'||url.username||url.password||/[\u0000-\u0020]/.test(s.url)||typeof s.text!=='string'||!s.text.trim()||Buffer.byteLength(s.text)>20000)throw new Error('Invalid source fields');
     sourceBytes+=Buffer.byteLength(s.text);return {id:s.id,title:s.title,url:s.url,sha256:digest(s.text),bytes:Buffer.byteLength(s.text)};
   });
   source=sourceBytes<=60000&&Buffer.byteLength(JSON.stringify(sources))<=70000&&mode==='AI_PROVIDER'&&evidence?.tool==='sourced-brief-v1'&&evidence.briefHash===digest(brief)&&same(output.sources,manifest)&&same(evidence.sources,manifest)&&same(plan.manager,evidence.manager);
   const steps=plan.steps,seen=new Set(['manager_plan','publish','qc']);
   dependency=Array.isArray(steps)&&steps.length>=1&&steps.length<=3&&Buffer.byteLength(JSON.stringify({steps}))<=4000;
   if(dependency)for(let i=0;i<steps.length;i++){
     const s=steps[i];
     if(!fields(s,['id','agentId','title','dependsOn'])||!identifier(s.id)||seen.has(s.id)||!['content','seo','development'].includes(s.agentId)||typeof s.title!=='string'||!s.title.trim()||s.title.length>160||/[\u0000-\u001f]/.test(s.title)||!same(s.dependsOn,i?[steps[i-1].id]:[])){dependency=false;break;}seen.add(s.id);
   }
   dependency=dependency&&plan.manager.contentHash===digest(JSON.stringify({steps}));
   grounding=dependency&&Array.isArray(output.handoffs)&&output.handoffs.length===steps.length&&same(output.handoffs,evidence.handoffs);
   if(grounding)for(let i=0;i<output.handoffs.length;i++){
     const h=output.handoffs[i],claims=h.claims;
     if(!fields(h,['stepId','agentId','claims','provenance'])||h.stepId!==steps[i].id||h.agentId!==steps[i].agentId||!provenance(h.provenance)||!Array.isArray(claims)||claims.length<1||claims.length>8||Buffer.byteLength(JSON.stringify({claims}))>20000||h.provenance.contentHash!==digest(JSON.stringify({claims}))){grounding=false;break;}
     for(const claim of claims){const src=sources.find(s=>s.id===claim.sourceId);if(!fields(claim,['sourceId','quote'])||!identifier(claim.sourceId)||!src||typeof claim.quote!=='string'||!claim.quote.trim()||Buffer.byteLength(claim.quote)>2000||!src.text.includes(claim.quote)){grounding=false;break;}}
   }
   let expected='# Source-backed extractive brief\n\nVerbatim excerpts from supplied source text; URLs were recorded, not fetched.\n';
   if(Array.isArray(output.handoffs))for(const h of output.handoffs){
     expected+='\n## '+h.stepId+' ('+h.agentId+')\n';
     for(const claim of h.claims){const s=manifest.find(s=>s.id===claim.sourceId);expected+='\nSource '+claim.sourceId+': '+(s?s.title+' — '+s.url:'UNKNOWN SOURCE')+'\n\n'+claim.quote.split('\n').map(line=>'> '+line).join('\n')+'\n';}
   }
   expected+='\nLimitations: exact excerpt grounding only. Source authenticity, factual truth, relevance, completeness and suitability are UNVERIFIED. CEO review and explicit version approval are required.\n';
   content=report===expected;
 }catch(caught){limitations.push(caught.message);}
 check('format',format,'Manager plan and extractive brief must have the independent QC schema.');
 check('source',source,'Recorded source metadata/hashes, mode and brief hash must match supplied evidence.');
 check('dependencies',dependency,'Manager must produce a valid 1–3 step chain with bound specialist roles and provenance.');
 check('grounding',grounding,'Every specialist handoff must reference a known source and an exact nonempty excerpt.');
 check('content',content,'Report must reproduce the structured excerpts and required scope limitations exactly.');
 for(const [dimension,detail] of [['factuality','Submitted source authenticity and factual truth were not independently verified.'],['relevance','Relevance, selection bias, completeness and suitability need human review.'],['aesthetic','Presentation quality needs human review.'],['approval','Only explicit current-version CEO approval can complete this task.']])checks.push({dimension,status:'UNVERIFIED',detail});
 return {verdict:defects.length?'NEEDS_REVISION':'PASS',checks,defects,limitations,requiresApproval:true};
}
module.exports={inspectSourcedBrief};
