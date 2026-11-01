/* Shared Sorphayahiran installment → weekly-plan linkage (browser-local preview).
   Links plans and readiness only. Does NOT overwrite contract payment, monthly
   S-Curve baseline, or manually recorded monthly actual progress. */
(function(){
'use strict';
const KEY='spy_weekly_links_v1';
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=v=>Math.min(100,Math.max(0,Number(v)||0));
function validDate(input){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(input||'')))return false;
 const [y,m,d]=input.split('-').map(Number);
 const v=new Date(Date.UTC(y,m-1,d));
 return v.getUTCFullYear()===y&&v.getUTCMonth()===m-1&&v.getUTCDate()===d;
}
function loadStages(){
 try{const data=JSON.parse(localStorage.getItem('spy_milestones')||'null');return Array.isArray(data)?data:[]}catch{return[]}
}
function records(){
 try{const data=JSON.parse(localStorage.getItem(KEY)||'null');return data&&typeof data==='object'?data:{}}catch{return{}}
}
function signature(stage){
 if(!stage||!Array.isArray(stage.groups))return '';
 return JSON.stringify(stage.groups.map(g=>[
  String(g.name||''),Number(g.weight)||0,
  (Array.isArray(g.tasks)?g.tasks:[]).map(t=>[
   String(t.id||''),String(t.name||''),String(t.start||''),
   String(t.end||''),Number(t.weight)||0
  ])
 ]));
}
function progress(stage){
 const groups=stage?.groups||[];
 const weight=g=>Math.max(0,Number(g.weight)||0);
 const groupProgress=g=>{
  const tasks=g.tasks||[],sum=tasks.reduce((s,t)=>s+weight(t),0);
  return sum?tasks.reduce((s,t)=>s+clamp(t.actual)*weight(t),0)/sum:0;
 };
 const sum=groups.reduce((s,g)=>s+weight(g),0);
 return sum?groups.reduce((s,g)=>s+groupProgress(g)*weight(g),0)/sum:0;
}
function status(index,provided){
 const stage=provided??loadStages()[index];
 const groups=stage?.groups||[];
 let total=0,scheduled=0,invalid=0;
 for(const g of groups)for(const t of g.tasks||[]){
  total++;
  const start=validDate(t.start),end=validDate(t.end);
  if(start&&end&&t.start<=t.end)scheduled++;
  else if((t.start||t.end)&&!(start&&end&&t.start<=t.end))invalid++;
 }
 const ready=total>0&&scheduled===total;
 const stored=records()[String(index+1)];
 const currentSignature=signature(stage);
 const linked=!!(stored&&currentSignature&&stored.signature===currentSignature&&ready);
 const outdated=!!stored&&!linked;
 return {number:index+1,total,scheduled,invalid,ready,linked,outdated,
  linkedAt:linked?stored.at:null,progress:progress(stage),signature:currentSignature};
}
function publish(index,stage){
 if(!Number.isInteger(index)||index<0||index>=13)return {ok:false,reason:'ไม่พบงวดงาน'};
 const current=status(index,stage);
 if(!current.ready)return {ok:false,reason:'กำหนดวันเริ่ม–สิ้นสุดให้ครบทุกงานก่อนเชื่อมแผนใหญ่ ('+current.scheduled+'/'+current.total+' งาน)'};
 const all=records();
 all[String(index+1)]={signature:current.signature,at:new Date().toISOString(),
  taskCount:current.total};
 try{localStorage.setItem(KEY,JSON.stringify(all))}catch(e){return{ok:false,reason:'บันทึกการเชื่อมแผนไม่ได้: '+e.message}}
 return {ok:true,status:status(index,stage)};
}
function label(info){
 if(info.linked)return 'เชื่อมแล้ว · จริง '+info.progress.toFixed(1)+'%';
 if(info.outdated)return 'มีแก้ไข · เชื่อมใหม่';
 if(info.ready)return 'วางแผนครบ · รอเชื่อม';
 return 'วางวันที่ '+info.scheduled+'/'+info.total+' งาน';
}
function masterCell(index){
 const s=status(index),klass=s.linked?'linked':s.outdated?'outdated':s.ready?'ready':'pending';
 const url='./weekly-plan.html?stage='+(index+1);
 return '<span class="spy-master-stage-link">'+
  '<a class="spy-master-stage-open" href="'+url+'" title="เปิดแผนย่อยรายสัปดาห์งวดที่ '+(index+1)+'">↗ แผนย่อยรายสัปดาห์</a>'+
  '<span class="spy-master-stage-status '+klass+'" title="สถานะเชื่อมแผนย่อย">'+escapeHTML(label(s))+'</span>'+
  '</span>';
}
function overall(){
 const stages=loadStages();
 const summaries=Array.from({length:13},(_,i)=>status(i,stages[i]));
 return {count:summaries.length,linked:summaries.filter(s=>s.linked).length,
  ready:summaries.filter(s=>s.ready).length,
  plannedTasks:summaries.reduce((sum,s)=>sum+s.scheduled,0),
  totalTasks:summaries.reduce((sum,s)=>sum+s.total,0),
  summaries};
}
window.SPY_STAGE_LINK={status,publish,masterCell,overall,label,loadStages};
})();
