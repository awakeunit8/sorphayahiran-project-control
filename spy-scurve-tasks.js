(function(){
'use strict';
// Data is stored in the same browser-local WBS as the Sorphayahiran site app.
const D=window.SPY_CONTRACT_DATA,$=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const get=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){alert('บันทึกไม่สำเร็จ: '+e.message);return false}};
const pct=n=>Math.max(0,Math.min(100,Number(n)||0));
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const thaiDate=d=>d?new Date(d+'T12:00:00').toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'}):'ไม่ระบุ';
function category(name){
 if(/Shop Drawing|อนุมัติวัสดุ|แผนการ/.test(name))return 'เอกสารอนุมัติและส่งงวด';
 if(/ไฟฟ้า|สื่อสาร|Solar|Fire Alarm|หม้อแปลง|High-mast|เครื่องเสียง/.test(name))return 'ไฟฟ้าและสื่อสาร';
 if(/สุขาภิบาล|ประปา|ท่อน้ำ|ระบายน้ำ|สุขภัณฑ์|ถังบำบัด/.test(name))return 'สุขาภิบาลและท่อน้ำ';
 if(/ปรับอากาศ|ระบายอากาศ|ดับเพลิง/.test(name))return 'เครื่องกลและปรับอากาศ';
 if(/ฝ้า|ทาสี|ประตู|หน้าต่าง|Facade|ฟาซาด|ก่อ|ปูกระเบื้อง|ผิวพื้น|มุงหลังคา/.test(name))return 'สถาปัตยกรรมและตกแต่ง';
 if(/ถนน|ลานจอด|ทางเดิน|ภูมิทัศน์/.test(name))return 'งานภายนอก';
 if(/ครุภัณฑ์|ฝึกอบรม|BIM|AutoCAD|As-built|Commissioning|ส่งมอบ|อื่น ๆ|ทำความสะอาด/.test(name))return 'ครุภัณฑ์และส่งมอบ';
 return 'งานโครงสร้างและเตรียมการ';
}
function seedStage(i){
 const annex=D.installments[i],map=new Map();
 annex.items.forEach((item,j)=>{
  const group=category(item[0]);if(!map.has(group))map.set(group,[]);
  map.get(group).push({id:'spym'+(i+1)+'t'+(j+1),name:item[0],weight:1,owner:'',start:'',end:iso(thaiYear(milestones[i][1])),
   planned:0,actual:0,status:'ยังไม่เริ่ม',targetPercent:item[1],
   notes:'เกณฑ์ตรวจรับ: '+item[1]+'% (เอกสารแบ่งงวดหน้า '+annex.page+')'+(item[2]?' · '+item[2]:'')});
 });
 return {number:i+1,title:'งวดที่ '+(i+1),days:annex.days,percent:D.paymentPercent[i],
  sourcePage:annex.page,due:iso(thaiYear(milestones[i][1])),description:'เอกสารแบ่งงวดหน้า '+annex.page,
  groups:[...map].map(([name,tasks])=>({name,weight:tasks.length*100/annex.items.length,tasks}))};
}
let stages=get('spy_milestones',null),dirty=false;
if(!Array.isArray(stages)||stages.length!==13){stages=Array.from({length:13},(_,i)=>seedStage(i));dirty=true}
else for(let i=0;i<13;i++){
 if(!stages[i]?.groups?.length){stages[i]=seedStage(i);dirty=true}
 for(const g of stages[i].groups||[])for(const t of g.tasks||[])if(!t.id){t.id='scurve-'+i+'-'+Math.random().toString(36).slice(2);dirty=true}
}
if(dirty)save('spy_milestones',stages);
let expanded=new Set(get('spy_scurve_expanded',[0]).filter(i=>Number.isInteger(i)&&i>=0&&i<13));
let selected=null;
const persist=()=>save('spy_milestones',stages);
function groupProgress(g){
 let tasks=g.tasks||[],sum=tasks.reduce((a,t)=>a+(Number(t.weight)||0),0);
 return sum?tasks.reduce((a,t)=>a+pct(t.actual)*(Number(t.weight)||0),0)/sum:0;
}
function stageProgress(i){
 let groups=stages[i]?.groups||[],sum=groups.reduce((a,g)=>a+(Number(g.weight)||0),0);
 return sum?groups.reduce((a,g)=>a+groupProgress(g)*(Number(g.weight)||0),0)/sum:0;
}
window.spyStagePercent=stageProgress;
window.spyIsExpanded=i=>expanded.has(i);
window.spyToggleStage=i=>{
 if(expanded.has(i))expanded.delete(i);else expanded.add(i);
 save('spy_scurve_expanded',[...expanded]);render();
 $('spyActiveStageNotice').textContent='งวดที่ '+(i+1)+' · รายการตามแนบแบ่งงวดหน้า '+D.installments[i].page+
 ' · เงินงวด '+D.paymentPercent[i]+'% · ครบกำหนดภายใน '+D.installments[i].days+' วัน';
};
window.spyExpandAll=()=>{expanded=new Set(Array.from({length:13},(_,i)=>i));save('spy_scurve_expanded',[...expanded]);render()};
window.spyCollapseAll=()=>{expanded.clear();save('spy_scurve_expanded',[]);render()};
window.spyStageRows=(i,monthList)=>{
 if(!expanded.has(i)||!stages[i])return '';
 let text='';
 stages[i].groups.forEach((group,g)=>{
  text+='<tr class="spy-group-row"><td colspan="3">↳ '+esc(group.name)+' · '+group.tasks.length+' งานย่อย</td>'+
   monthList.map(()=>'<td></td>').join('')+'</tr>';
  group.tasks.forEach((task,j)=>{
   const a=task.start?new Date(task.start+'T12:00:00'):thaiYear(milestones[i][0]);
   const b=task.end?new Date(task.end+'T12:00:00'):thaiYear(milestones[i][1]);
   text+='<tr class="spy-subtask-row"><td class="no">↳</td>'+
    '<td class="desc"><button type="button" onclick="spyEditTask('+i+','+g+','+j+')" title="เปิดแก้ไขแผนงานย่อย">'+esc(task.name)+'</button></td>'+
    '<td>'+esc(task.targetPercent??100)+'% <span style="color:#1a9670">จริง '+pct(task.actual).toFixed(0)+'%</span></td>'+
    monthList.map(m=>{
     const end=new Date(m.getFullYear(),m.getMonth()+1,0),active=a<=end&&b>=m;
     return '<td class="task-time '+(active?(pct(task.actual)>=100?'actual-done':'active'):'')+'"></td>';
    }).join('')+'</tr>';
  });
 });
 return text;
};
function drawTask(){
 const el=$('spySubplanDetails');if(!selected){el.hidden=true;return}
 const info=selected,t=stages[info.i]?.groups[info.g]?.tasks[info.j],g=stages[info.i]?.groups[info.g];
 if(!t){selected=null;el.hidden=true;return}
 el.hidden=false;
 const stageStart=iso(thaiYear(milestones[info.i][0])),stageEnd=iso(thaiYear(milestones[info.i][1]));
 el.innerHTML='<h3>งวดที่ '+(info.i+1)+' › '+esc(g.name)+' › งานย่อย</h3>'+
  '<div class="spy-callout"><strong>'+esc(t.name)+'</strong><br>เกณฑ์รับงวด: '+esc(t.targetPercent??100)+
  '% · เอกสารอ้างอิงหน้า '+D.installments[info.i].page+' · กำหนดงวด '+thaiDate(stageEnd)+'</div>'+
  '<div class="spy-sub-form">'+
  '<label>รายการงานย่อย<input id="subName" value="'+esc(t.name)+'"></label>'+
  '<label>ผู้รับผิดชอบ<input id="subOwner" value="'+esc(t.owner||'')+'"></label>'+
  '<label>สถานะ<select id="subStatus">'+['ยังไม่เริ่ม','กำลังดำเนินการ','รอตรวจงาน','เสร็จแล้ว','ล่าช้า'].map(s=>'<option '+(t.status===s?'selected':'')+'>'+s+'</option>').join('')+'</select></label>'+
  '<label>วันที่เริ่ม<input id="subStart" type="date" value="'+esc(t.start||stageStart)+'"></label>'+
  '<label>วันที่เสร็จตามแผน<input id="subEnd" type="date" value="'+esc(t.end||stageEnd)+'"></label>'+
  '<label>น้ำหนักงาน<input id="subWeight" type="number" min="0" step=".01" value="'+esc(t.weight??1)+'"></label>'+
  '<label>แผน (%)<input id="subPlanned" type="number" min="0" max="100" step=".1" value="'+pct(t.planned)+'"></label>'+
  '<label>ผลงานจริง (%)<input id="subActual" type="number" min="0" max="100" step=".1" value="'+pct(t.actual)+'"></label>'+
  '<label class="wide">หมายเหตุ / เอกสารตรวจรับ<textarea id="subNotes">'+esc(t.notes||'')+'</textarea></label></div>'+
  '<div class="spy-sub-actions"><button onclick="spySaveTask()">💾 บันทึกงานย่อย</button>'+
  '<button class="ghost" onclick="spyTaskDocuments()">📑 ดู Shop Drawing / วัสดุ / ผลทดสอบ</button>'+
  '<button class="ghost" onclick="spyAddTask('+info.i+','+info.g+')">＋ เพิ่มงานย่อย</button></div>'+
  '<p class="spy-sensitive-warning">ข้อมูลทดลองจะบันทึกแผนย่อยในเบราว์เซอร์เดียวกับหน้าโครงการศรพญาหิรัญเท่านั้น</p>';
}
window.spyEditTask=(i,g,j)=>{selected={i,g,j};drawTask();$('spySubplanDetails').scrollIntoView({behavior:'smooth',block:'start'})};
window.spySaveTask=()=>{
 if(!selected)return;
 const t=stages[selected.i].groups[selected.g].tasks[selected.j];
 const name=$('subName').value.trim(),owner=$('subOwner').value.trim(),start=$('subStart').value,end=$('subEnd').value;
 const weight=Number($('subWeight').value),planned=Number($('subPlanned').value),actual=Number($('subActual').value);
 if(!name||!start||!end||start>end)return alert('กรุณาตรวจสอบชื่องานและวันที่เริ่ม–เสร็จ');
 if(![weight,planned,actual].every(Number.isFinite)||weight<0||planned<0||actual<0||planned>100||actual>100)return alert('น้ำหนักห้ามติดลบ และเปอร์เซ็นต์ต้องอยู่ระหว่าง 0–100');
 Object.assign(t,{name,owner,start,end,weight,planned,actual,status:$('subStatus').value,notes:$('subNotes').value});
 if(!persist())return;
 render();drawTask();$('spyActiveStageNotice').textContent='✅ บันทึกงวดที่ '+(selected.i+1)+' · '+name+' · งานจริง '+actual+'%';
};
window.spyAddTask=(i,g)=>{
 const name=prompt('เพิ่มชื่องานย่อยของงวดที่ '+(i+1));if(!name?.trim())return;
 stages[i].groups[g].tasks.push({id:'sub-'+Date.now(),name:name.trim(),owner:'',start:iso(thaiYear(milestones[i][0])),end:iso(thaiYear(milestones[i][1])),weight:1,planned:0,actual:0,status:'ยังไม่เริ่ม',notes:'เพิ่มเติมโดยผู้ใช้งาน',targetPercent:100});
 persist();expanded.add(i);save('spy_scurve_expanded',[...expanded]);render();
 window.spyEditTask(i,g,stages[i].groups[g].tasks.length-1);
};
window.spyTaskDocuments=()=>{
 if(!selected)return;
 const t=stages[selected.i].groups[selected.g].tasks[selected.j];
 try{sessionStorage.setItem('spy_scurve_jump',JSON.stringify({stage:selected.i,group:selected.g,taskId:t.id}))}catch{}
 location.href='./index.html?tab=plan';
};
window.spySyncSubplans=()=>{
 const result=D.paymentPercent.reduce((sum,weight,i)=>sum+weight*stageProgress(i)/100,0);
 const date=$('reportDate').value;if(!date)return alert('เลือกวันที่รายงานก่อน');
 if(!confirm('บันทึกผลงานจริงสะสมจากงานย่อย '+result.toFixed(2)+'% ลงในเดือน '+date.slice(0,7)+' (ทับเดือนเดิมหากมี) ใช่ไหม?'))return;
 if(actualMode==='money'){
  if(Object.keys(actual).length&&!confirm('มีข้อมูลยอดเงินจริงเดิม การเปลี่ยนเป็นเปอร์เซ็นต์จะล้างข้อมูลจริงรายเดือนเดิม ยืนยันหรือไม่?'))return;
  actual={};actualMode='percent';localStorage.setItem('spy-scurve-input-mode','percent');
 }
 actual[key(new Date(date+'T12:00:00'))]=Number(result.toFixed(2));
 localStorage.setItem('spy-scurve-money-v2',JSON.stringify(actual));makeEditor();setMode('compare');
 $('spyActiveStageNotice').textContent='✅ บันทึกผลงานจริงสะสม '+result.toFixed(2)+'% ณ '+date.slice(0,7)+' จากงานย่อยทั้ง 13 งวดแล้ว';
};
function boot(){
 let role=null;try{role=sessionStorage.getItem('spy_demo_role')}catch{}
 if(role!=='owner'&&role!=='admin')return;
 document.body.classList.add('spy-scurve-auth');
 if(role==='admin'){document.body.classList.add('spy-scurve-admin');if(actualMode==='money'){actualMode='percent';actual={};}makeEditor();const moneyOption=$('actualMode')?.querySelector('option[value="money"]');if(moneyOption)moneyOption.disabled=true;}
 render();
 window.addEventListener('storage',e=>{if(e.key==='spy_milestones'){const fresh=get('spy_milestones',null);if(Array.isArray(fresh)&&fresh.length===13){stages=fresh;render();drawTask()}}});
}
boot();
})();